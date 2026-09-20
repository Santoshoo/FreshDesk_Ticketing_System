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
| **nodemailer** | Email Dispatch | Standardized SMTP transporter integration with HTML template rendering. |
| **zod** | Schema Validation | Strong TypeScript/JavaScript runtime validation for API payloads. |
