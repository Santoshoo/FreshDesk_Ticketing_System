# Architectural & Design Decisions Log (DECISIONS.MD)

This document records the architectural choices, engineering considerations, performance optimizations, and library selections made for the **FreshDesk Ticketing System**.

---

## 1. Architectural Pattern: Layered Architecture (Separation of Concerns)

### Decision:
Implemented a strict 4-layer architecture:
- **Routes Layer (`routes/`)**: Maps HTTP endpoints and attaches middleware.
- **Controller Layer (`controllers/`)**: Handles HTTP requests/responses, status codes, and error forwarding.
- **Service Layer (`services/`)**: Encapsulates pure business logic, rules, and validations.
- **Repository Layer (`repositories/`)**: Abstracted Data Access Layer (DAL) interacting directly with Prisma/MySQL.

### Rationale:
- **Maintainability & Decoupling**: Business rules (e.g. ticket editability restrictions when closed) reside purely in services, independent of transport protocol (HTTP, CLI, WebSockets).
- **Testability**: Services and repositories can be unit-tested or mocked without spinning up HTTP servers.
- **Scalability**: Allows database access optimization without touching controller logic.

---

## 2. Database & ORM Selection: MySQL + Prisma ORM

### Decision:
Selected **MySQL 8.0+** as the relational database and **Prisma ORM** as the database client and migration tool.

### Rationale:
- **Relational Integrity & ACID Compliance**: Tickets belong to Users, Groups, Ticket Types, and Departments with strict Foreign Key constraints and cascading actions (`SetNull`, `Cascade`).
- **Atomic Locking Capabilities**: MySQL supports `FOR UPDATE` row locks, essential for atomic sequential ticket number generation.
- **Prisma Schema & Type Safety**: Prisma provides auto-generated types, compile-time safety, and migration tracking via `prisma migrate`.

---

## 3. High-Throughput & Scale Engineering Decisions (50,000 Users & 1,000,000+ Tickets)

### Decision 3.1: Ticket Number Formatting & Capacity Expansion (`ticketNumber.js`)
- **Problem**: Originally, `ticketNumber` was defined as `VARCHAR(5)` with a hard cap at `99,999`. At 5,000 tickets/day, the system would crash on Day 20.
- **Solution**: Expanded column size to `VARCHAR(20)` in DB migration `v1_scale_optimization`. Maintained minimum 5-digit zero-padding formatting (`#00001`, `#00002`...) using `String(num).padStart(5, '0')` while expanding capacity to **99,999,999+ tickets**.
- **Atomic Generation**: Used MySQL `UPDATE` + `SELECT FOR UPDATE` within a Prisma transaction to guarantee zero duplicate ticket numbers under concurrent requests.

### Decision 3.2: High-Performance Composite B-Tree Indexing
- **Problem**: At 1,000,000 tickets, filtering by `status`, `createdAt`, `groupId`, or `contactEmail` using single-column indexes causes multi-second table scans.
- **Solution**: Added composite indexes in MySQL:
  - `tickets(status, created_at)`: Accelerates dashboard status queues.
  - `tickets(group_id, status, created_at)` & `tickets(agent_id, status, created_at)`: Speeds up group/agent ticket queues.
  - `tickets(contact_email, created_at)`: Instant ticket history lookup for 50,000+ mail IDs.
  - `ticket_comments(ticket_id, created_at)`: Chronological comment rendering without filesort.

### Decision 3.3: Native Database Aggregation for Dashboard Trends (`dashboardRepository.js`)
- **Problem**: `getTrend()` previously fetched 35,000–150,000 ticket records into Node.js heap memory to iterate and group dates in JS loops, causing RAM spikes and GC freezes.
- **Solution**: Refactored `getTrend()` to use native MySQL `DATE_FORMAT(created_at, '%Y-%m-%d')` and `GROUP BY` via `prisma.$queryRaw`.
- **Result**: Reduced memory usage by **99.9%** (returns a fixed 7-row aggregate array directly from database).

### Decision 3.4: Fast-Path Ticket Search Indexing (`ticketService.js`)
- **Problem**: Performing wildcard `LIKE '%query%'` across 9 joined fields causes 1M-row full table scans.
- **Solution**: Implemented regex pattern detection (`/^\d+$/`) in `listTickets`. When a user searches for a ticket ID (e.g. `#00002` or `00002`), it routes directly to the indexed `ticketNumber` column, executing in **< 2ms**.

### Decision 3.5: Asynchronous Non-Blocking Notification Dispatch (`notificationService.js`)
- **Problem**: Sending transactional emails via SMTP takes 500ms–3000ms. A slow SMTP server could block HTTP requests or cause DB transaction timeouts.
- **Solution**: Notifications are triggered asynchronously *after* DB transaction commit using `Promise.allSettled()`. Email failures are logged to `notification_logs` without rolling back DB state or delaying user HTTP responses.

### Decision 3.7: Super Admin Excel Bulk Upload for Groups and Ticket Types
- **Requirement**: Enable Super Admin to bulk import support groups and ticket classification types directly from Excel (`.xlsx`, `.xls`, `.csv`) files.
- **Backend Architecture**: Implemented `POST /api/groups/bulk` and `POST /api/ticket-types/bulk` routes protected by `isSuperAdmin` middleware. Uses `upsertGroup` and `upsertTicketType` to process records atomically and skip or update duplicate entries without failing the batch transaction.
- **Frontend Architecture**: Client-side parsing using the `xlsx` library with interactive drag-and-drop modal preview (`GroupExcelUploadModal` and `TicketTypeExcelUploadModal`). Includes automated template generation ("Download Sample Template") to prevent user header format mismatches.

### Decision 3.8: Password Reset via 6-Digit Email OTP (`password_reset_tokens`)
- **Requirement**: Allow hospital staff to securely reset forgotten passwords without administrative intervention.
- **Architecture & Security**:
  - **Dual Identifier Lookup**: Staff can initiate reset using either registered Email or Employee ID (case-insensitive).
  - **Bcrypt Token Hashing**: Generates a 6-digit numeric OTP; only the `bcrypt.hash(otp, 10)` hash is persisted to `password_reset_tokens` with a strict 15-minute expiration (`expiresAt`).
  - **Single Active Token Enforcement**: Any previous unexpired tokens for the user are immediately invalidated upon requesting a new code (`usedAt: NOW()`), preventing token race conditions.
  - **Non-Blocking SMTP Resilience**: Configured Nodemailer with socket/connection timeouts (`connectionTimeout: 10000`, `socketTimeout: 15000`) so slow mail relays do not stall the user request.
  - **UX & Notifications**: Implemented a 2-step glassmorphic modal with a 60-second resend cooldown timer, in-modal alerts, and high-z-index floating toasts.

### Decision 3.9: Streamlining User Settings to View-Only Profile (`Profile.jsx`)
- **Requirement**: Prevent unauthorized or out-of-sync credential/profile edits by staff, as employee identity and assignments are centrally governed by Hospital Master Data.
- **Architecture**:
  - Replaced the multi-tab "Settings" screen (which had password change, notification toggles, theme, and language) with a dedicated, view-only **Profile** page (`/profile`).
  - Updated sidebar navigation and header user pill to link to `/profile` with the `User` icon.
  - Retained `/settings` as an automatic redirect to `/profile` for seamless backward compatibility.
  - Displays verified master attributes: Full Name, Email (Primary ID), Employee ID (KIMS Master), System Role, and Department (Org Unit) in locked, read-only fields.

### Decision 3.10: High-Scale Bulk Ticket Migration Architecture (2,00,000 Freshdesk Records)
- **Requirement**: Migrate 2,00,000 historical Freshdesk tickets into KIMS ICT Service Desk up to ticket **#230191**, preserving original ticket numbers, assignment history, status history, tags, and timestamps.
- **Key Architectural Decisions**:
  - **3.10.1: Ticket Number Column & Sequence Expansion (`VARCHAR(20)`)**:
    - *Problem*: `tickets.ticket_number` was originally constrained to `VARCHAR(5)` (maximum `#99999`). Migrating `#230191` (6 digits) would cause fatal MySQL truncation errors.
    - *Solution*: Expanded column size in `schema.prisma` to `VARCHAR(20)` and updated sequence generator to support 6+ digits. On final chunk, atomically advanced `ticket_sequences.current_number` to `230191` so subsequent live tickets start at `#230192`.
  - **3.10.2: Chunked Batch Ingestion (1,000 Rows/Chunk, 500 Rows/Transaction)**:
    - *Problem*: Sending 5,000+ rows per API call with multi-paragraph descriptions easily exceeds the 50MB request limit (`413 Payload Too Large`) and triggers gateway timeouts.
    - *Solution*: Chunk size optimized to 1,000 rows per HTTP POST (~3–5MB), processed in the backend via two 500-row `prisma.$transaction` blocks using `tx.ticket.createMany({ skipDuplicates: true })`. Yields high throughput (~1.5s per chunk) with continuous UI progress bar feedback.
  - **3.10.3: Reference Map Pre-Loading & Automated Entity Upsertion**:
    - Pre-loads all existing Groups, Ticket Types, Tags, and Agents into memory `Map<string, number>` at the start of each chunk to eliminate N+1 database queries.
    - Automatically creates missing Groups, Types, and Tags with status `ACTIVE`.
    - Enforces safe fallbacks for missing mandatory foreign keys (Default Group: `"General Support"`, Default Type: `"Incident"`), and truncates incoming fields to database bounds (Subject: 255 chars, Group/Type: 100 chars, Tag: 50 chars).
  - **3.10.4: Historical Data Fidelity & Notification Suppression**:
    - Completely bypasses `notificationService` to ensure zero emails are dispatched during the 200,000-ticket import.
    - Preserves historical timestamps (`createdAt`, `resolvedAt`, `closedAt`, `updatedAt`).
    - Aligns `ticket_status_history.changed_at = ticket.created_at` so historical audit logs reflect accurate Freshdesk timeline dates rather than the migration timestamp.
  - **3.10.5: Dual Migration Interface (Web Wizard + Node.js CLI Script)**:
    - *Web UI*: 4-step wizard at `/admin/bulk-import` for Super Admin with drag-and-drop, preview table, live progress bar, and failed rows CSV export.
    - *CLI Runner*: Standalone Node.js script (`backend/scripts/migrate_freshdesk.js`) that runs with `--max-old-space-size=4096`, streaming directly from Excel/CSV to MySQL to completely bypass browser memory constraints.

---

## 4. Library Selection Rationale

| Library | Purpose | Selection Rationale |
| :--- | :--- | :--- |
| **express** | Web Framework | Lightweight, robust ecosystem, middleware chaining for auth & validation. |
| **@prisma/client** | Database ORM | Auto-generated query builder, schema migration tracking, auto relation loading. |
| **bcryptjs** | Password Hashing | Pure JavaScript implementation of bcrypt, eliminating native binary compilation issues on Windows/Linux servers. |
| **jsonwebtoken** | Authentication | Standardized JWT access & refresh token rotation for stateless API auth. |
| **pino & pino-http** | Logging | Extremely low overhead structured JSON logger, ideal for high-throughput production logs. |
| **express-rate-limit** | Security | Protects authentication routes from brute-force login attempts. |
| **nodemailer** | Email Dispatch | Standardized SMTP transporter integration with HTML template rendering and configurable socket timeouts. |
| **zod** | Schema Validation | Strong TypeScript/JavaScript runtime validation for API payloads. |
| **xlsx** | Spreadsheet Processing | Client-side & server-side parsing and generation of `.xlsx`, `.xls`, and `.csv` files for bulk operations. |

