# System Execution Flow Documentation (FLOW.MD)

This document maps out step-by-step how execution travels between files, functions, services, repositories, and database modules across key workflows in the **FreshDesk Ticketing System**.

---

## 1. High-Level Architecture Component Map

```
Client (Browser / API)
       │
       ▼
 [HTTP Request]
       │
       ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Express App (app.js)                                         │
 │  ├── Global Middleware (helmet, cors, pino-http, express.json)│
 │  └── Router Registry (routes/*.routes.js)                  │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Authentication & Middleware Layer (middleware/authMiddleware.js)│
 │  └── Token Verification & User Context Attachment (req.user) │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Controller Layer (controllers/*.controller.js)               │
 │  └── Extract req.body / req.query / req.params & HTTP Res   │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Service Layer (services/*.service.js)                        │
 │  └── Business Rules, Validations, Transporters & Async Tasks│
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Repository Layer (repositories/*.repository.js)              │
 │  └── Data Access Queries, Filters, Index-Optimized Queries   │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Prisma ORM & Database Layer (config/database.js & MySQL)    │
 │  └── Atomic Transactions, Row Locking & SQL Execution       │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Execution Flow Details by Feature

### Workflow A: User Authentication & Login Flow

```
1. Client POST /api/auth/login with { email, password }
   │
2. routes/authRoutes.js
   └── Rate limiter middleware triggers -> passes to authController.login()
   │
3. controllers/authController.js :: login(req, res, next)
   └── Extracts identifier & password -> calls authService.login(identifier, password)
   │
4. services/authService.js :: login(identifier, password)
   ├── userRepository.findByEmail(cleanInput)
   ├── userRepository.findByEmployeeId(cleanInput) [Fallback]
   ├── Verifies user.status === 'ACTIVE'
   ├── bcrypt.compare(password, user.passwordHash)
   ├── Validates allowed roles ['SUPER_ADMIN', 'ADMIN', 'AGENT']
   └── jwt.sign({ userId, email, role }, accessSecret, { expiresIn })
   │
5. Return JSON payload to Controller -> Client receives Access Token & User Object
```

---

### Workflow B: End-to-End Ticket Creation Flow

```
1. Client POST /api/tickets with { contactId, subject, ticketTypeId, groupId, description }
   │
2. routes/ticketRoutes.js
   └── authMiddleware.authenticateJwt -> attaches req.user -> ticketController.createTicket()
   │
3. controllers/ticketController.js :: createTicket(req, res, next)
   └── Extracts ticket fields -> calls ticketService.createTicket(req.user, payload)
   │
4. services/ticketService.js :: createTicket(user, data)
   ├── Validates required fields (subject, ticketTypeId, groupId, description)
   ├── Resolves Contact Requester (User Master vs Employee Email Master)
   ├── Validates TicketType status === 'ACTIVE'
   ├── Validates Group status === 'ACTIVE'
   ├── Validates Agent mapping in Group (if agent assigned)
   │
   └── Launches Atomic Database Transaction (prisma.$transaction):
       │
       ├── utils/ticketNumber.js :: generateNextTicketNumber(tx)
       │   ├── UPDATE ticket_sequences SET current_number = current_number + 1 WHERE id = 1
       │   ├── SELECT current_number FROM ticket_sequences WHERE id = 1 FOR UPDATE
       │   └── Returns "00002" (padded 5-digit number)
       │
       ├── tx.ticket.create(...)                -> Creates Ticket record
       ├── tx.ticketComment.create(...)         -> Creates initial description comment
       ├── tx.ticketStatusHistory.create(...)   -> Logs initial status OPEN
       └── tx.ticketAssignmentHistory.create(...) -> Logs initial Group/Agent assignment
   │
5. DB Transaction Commits Successfully
   │
6. Asynchronous Notification Dispatch (Non-Blocking):
   └── notificationService.sendTicketCreatedNotifications(ticket.id)
       ├── _fetchTicketNotificationData(ticketId)
       ├── _sendAssignedAgentNotification(...) -> Sends Email #1 via Nodemailer
       ├── _sendGroupNotification(...)         -> Sends Email #2 via Nodemailer
       └── notificationLogRepository.create(...) -> Logs status SENT/FAILED
   │
7. Return HTTP 201 Created with Ticket Object -> Client receives ticket #00002
```

---

### Workflow C: Ticket Listing & Fast-Path Search Flow

```
1. Client GET /api/tickets?search=#00002&status=OPEN&page=1&limit=20
   │
2. routes/ticketRoutes.js -> authMiddleware.authenticateJwt -> ticketController.listTickets()
   │
3. controllers/ticketController.js :: listTickets(req, res, next)
   └── Forward query params to ticketService.listTickets(req.user, params)
   │
4. services/ticketService.js :: listTickets(user, params)
   ├── Checks search parameter pattern: /^\d+$/ or /^#?\d+$/
   ├── Fast-Path Triggered: query matches ticket number format (#00002)
   │   └── Applies indexed B-Tree filter: { OR: [{ ticketNumber: '00002' }, ...] }
   ├── Applies status & role-based visibility scoping (EMPLOYEE vs AGENT/ADMIN)
   │
   └── Calls ticketRepository.findMany({ skip, take, where })
       ├── Executed SQL: SELECT ... FROM tickets WHERE ticket_number = '00002' ... (Index Scan <1ms)
       └── Maps results with normalizeTicketContact()
   │
5. Return JSON payload { tickets: [...], pagination: { page, limit, total } }
```

---

### Workflow D: Ticket Status Update & Closed Transition Flow

```
1. Client PATCH /api/tickets/:id/status with { status: "CLOSED" }
   │
2. routes/ticketRoutes.js -> authMiddleware.authenticateJwt -> ticketController.updateStatus()
   │
3. controllers/ticketController.js :: updateStatus(req, res, next)
   └── Invokes ticketService.updateStatus(user, id, newStatus)
   │
4. services/ticketService.js :: updateStatus(user, id, newStatus)
   ├── Validates allowed status values
   ├── Verifies user.role !== 'EMPLOYEE' (Only Agents/Admins can change status)
   ├── Calls ticketRepository.updateStatus(...)
   │   ├── Updates ticket.status = 'CLOSED', closedAt = NOW()
   │   └── Creates ticket_status_history record
   │
   └── Checks transition: (newStatus === 'CLOSED' && oldStatus !== 'CLOSED')
       └── Triggers Async Notification: notificationService.sendTicketClosedNotifications(ticketId)
   │
5. Return HTTP 200 OK with updated ticket record
```

---

### Workflow E: Dashboard Metrics & Trend Aggregation Flow

```
1. Client GET /api/dashboard/stats
   │
2. routes/dashboardRoutes.js -> authMiddleware.authenticateJwt -> dashboardController.getStats()
   │
3. controllers/dashboardController.js :: getStats(req, res, next)
   └── Calls dashboardService.getDashboardData(req.user)
   │
4. services/dashboardService.js :: getDashboardData(user)
   ├── Applies role scoping (Agent/Group filters if applicable)
   └── Calls concurrently via Promise.all:
       ├── dashboardRepository.getStatusSummary(where)
       ├── dashboardRepository.getRecentTickets(where, 5)
       └── dashboardRepository.getTrend(where, 7)
   │
5. repositories/dashboardRepository.js :: getTrend(where, 7)
   ├── Executes raw SQL via prisma.$queryRaw:
   │   SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as dateStr, COUNT(id) as count
   │   FROM tickets WHERE created_at >= startDate ... GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
   └── Maps MySQL 7-row aggregate result directly to date keys
   │
6. Return HTTP 200 OK with summary numbers, recent tickets, and 7-day trend array
```

---

### Workflow F: Forgot Password & 6-Digit OTP Verification Flow

```
[Phase 1: OTP Generation & Dispatch]
1. User clicks "Forgot Password?" on Login.jsx -> opens 2-step modal
   │
2. Client POST /api/auth/forgot-password with { identifier } (Email or Employee ID)
   │
3. routes/authRoutes.js
   └── Rate limiter middleware (5 req/15min) -> authController.forgotPassword()
   │
4. controllers/authController.js :: forgotPassword(req, res, next)
   └── Sanitizes input -> calls authService.forgotPassword(identifier)
   │
5. services/authService.js :: forgotPassword(identifier)
   ├── userRepository.findByEmail(cleanInput) || userRepository.findByEmployeeId(cleanInput)
   ├── Verifies user exists and status === 'ACTIVE'
   ├── Invalidate any existing unused tokens:
   │   UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = user.id AND used_at IS NULL
   ├── Generates cryptographically secure 6-digit OTP (e.g. "849201")
   ├── Hashes OTP: bcrypt.hash(otp, 10)
   ├── Persists token record to DB:
   │   INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
   │   VALUES (user.id, tokenHash, NOW() + INTERVAL 15 MINUTE)
   │
   └── Dispatches Non-Blocking Email:
       notificationService.sendPasswordResetOtpEmail({ to: user.email, name: user.name, otp })
   │
6. Return HTTP 200 { success: true, message: "Verification code sent to registered email" }
   └── Frontend renders Step 2 (6-digit input boxes + 60s cooldown resend timer)

─────────────────────────────────────────────────────────────────────────────

[Phase 2: OTP Verification & Password Reset]
1. User enters 6-digit OTP + new password -> clicks "Reset Password"
   │
2. Client POST /api/auth/reset-password with { identifier, otp, newPassword }
   │
3. routes/authRoutes.js
   └── Rate limiter middleware -> authController.resetPassword()
   │
4. controllers/authController.js :: resetPassword(req, res, next)
   └── Validates password complexity (min 8 chars) -> calls authService.resetPassword(...)
   │
5. services/authService.js :: resetPassword(identifier, otp, newPassword)
   ├── Resolves user via Email or Employee ID
   ├── Fetches latest active token from password_reset_tokens where user_id = user.id, used_at IS NULL, expires_at > NOW()
   ├── Compares OTP: bcrypt.compare(otp, token.tokenHash)
   │   └── If mismatch: throws 400 "Invalid or expired verification code"
   │
   └── Executes Atomic Database Transaction:
       ├── tx.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hash(newPassword, 10) } })
       └── tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: NOW() } })
   │
6. Return HTTP 200 { success: true, message: "Password reset successfully. Please log in with your new password." }
   └── Frontend displays success toast alert, closes modal, and refocuses login email input
```

---

### Workflow G: Bulk Freshdesk Ticket Migration Flow (2,00,000 Tickets)

```
[Ingestion Entry Points]
Interface Option A: Super Admin Web UI (frontend/src/pages/BulkTicketImport.jsx)
   └── Parses Excel/CSV into client chunks of 1,000 rows -> iterates sequential HTTP POSTs
Interface Option B: Standalone Node.js CLI (backend/scripts/migrate_freshdesk.js)
   └── Streams file rows via xlsx/csv-parser with --max-old-space-size=4096 directly into API

─────────────────────────────────────────────────────────────────────────────

[Backend Chunk Processing Pipeline]
1. Client POST /api/tickets/bulk-freshdesk with { rows: [1000 items], isFinalChunk: boolean }
   │
2. routes/ticketRoutes.js
   ├── authMiddleware.authenticateJwt
   └── authMiddleware.requireRole(['SUPER_ADMIN']) -> bulkImportController.importFreshdeskChunk()
   │
3. controllers/bulkImportController.js :: importFreshdeskChunk(req, res, next)
   └── Validates payload format -> calls bulkImportService.processChunk(req.user, req.body)
   │
4. services/bulkImportService.js :: processChunk(adminUser, { rows, isFinalChunk })
   │
   ├── Step 4.1: Reference Map Pre-Loading (In-Memory Cache)
   │   ├── Pre-loads Groups: Map<lowerName, id>
   │   ├── Pre-loads Ticket Types: Map<lowerName, id>
   │   ├── Pre-loads Agents: Map<lowerEmailOrName, id>
   │   └── Pre-loads Tags: Map<lowerName, id>
   │
   ├── Step 4.2: Missing Entity Auto-Creation
   │   ├── Detects unseen Groups from rows -> creates in bulk (status: 'ACTIVE') -> updates Map
   │   ├── Detects unseen Ticket Types -> creates in bulk (status: 'ACTIVE') -> updates Map
   │   └── Detects unseen Tags -> creates in bulk -> updates Map
   │
   ├── Step 4.3: Row Normalization & Field Mapping
   │   ├── ticketNumber = String(row['Ticket ID']).trim() (supports up to #230191)
   │   ├── contactName = row['Full name'] || 'Unknown Requester'
   │   ├── subject = truncate(row['Subject'] || 'No Subject', 255)
   │   ├── description = row['Description'] || ''
   │   ├── status = normalizeStatus(row['Status']) -> OPEN | PENDING | RESOLVED | CLOSED
   │   ├── priority = normalizePriority(row['Priority']) -> LOW | MEDIUM | HIGH | URGENT
   │   ├── timestamps: parses 'Created time', 'Resolved time', 'Closed time', 'Last update time'
   │   ├── resolves groupId via Group Map (fallback: "General Support")
   │   ├── resolves ticketTypeId via Type Map (fallback: "Incident")
   │   └── resolves agentId via Agent Map (fallback: null)
   │
   ├── Step 4.4: Chunk Database Ingestion (Two 500-Row Atomic Batches)
   │   └── Inside prisma.$transaction:
   │       ├── bulkImportRepository.createTicketsBatch(tx, normalizedTickets, { skipDuplicates: true })
   │       ├── bulkImportRepository.createStatusHistoriesBatch(tx, statusHistories)
   │       │   └── Sets changed_at = ticket.created_at (preserves Freshdesk audit timeline)
   │       └── bulkImportRepository.createTicketTagsBatch(tx, ticketTagAssociations)
   │
   ├── Step 4.5: Total Notification Suppression
   │   └── notificationService is COMPLETELY BYPASSED (0 emails dispatched for all 200,000 tickets)
   │
   └── Step 4.6: Sequence Realignment (On Final Chunk)
       └── If isFinalChunk === true:
           UPDATE ticket_sequences SET current_number = GREATEST(current_number, 230191) WHERE id = 1
           (Guarantees next fresh live ticket created in the system starts at #230192)
   │
5. Return HTTP 200 OK:
   {
     success: true,
     chunkSummary: { processed: 1000, inserted: 998, skippedDuplicates: 2, errors: [] },
     isFinalChunk
   }
   └── Frontend updates progress bar / CLI script advances to next 1,000-row batch
```

---

## 3. Core File Responsibility Matrix

| File Path | Primary Responsibility | Key Functions |
| :--- | :--- | :--- |
| [`backend/app.js`](file:///m:/FreshDesk_Ticketing_System/backend/app.js) | Express app setup & global middleware | Middleware attachment, route mounting, global error handler |
| [`backend/config/database.js`](file:///m:/FreshDesk_Ticketing_System/backend/config/database.js) | Prisma client instance & BigInt handling | Exports `prisma`, configures `BigInt.prototype.toJSON` |
| [`backend/utils/ticketNumber.js`](file:///m:/FreshDesk_Ticketing_System/backend/utils/ticketNumber.js) | Atomic ticket sequence generation | `generateNextTicketNumber(tx)` using `SELECT FOR UPDATE` |
| [`backend/services/authService.js`](file:///m:/FreshDesk_Ticketing_System/backend/services/authService.js) | Authentication, session & OTP reset logic | `login`, `forgotPassword` (OTP generation & hashing), `resetPassword` |
| [`backend/controllers/authController.js`](file:///m:/FreshDesk_Ticketing_System/backend/controllers/authController.js) | Auth HTTP request & response handlers | `login`, `forgotPassword`, `resetPassword`, `getProfile` |
| [`backend/services/ticketService.js`](file:///m:/FreshDesk_Ticketing_System/backend/services/ticketService.js) | Ticket business rules & lifecycle logic | `createTicket`, `listTickets`, `updateTicket`, `updateStatus` |
| [`backend/repositories/ticketRepository.js`](file:///m:/FreshDesk_Ticketing_System/backend/repositories/ticketRepository.js) | Ticket database query builder | `findMany`, `count`, `findById`, `updateTicket`, `addComment` |
| [`backend/services/bulkImportService.js`](file:///m:/FreshDesk_Ticketing_System/backend/services/bulkImportService.js) | Bulk Freshdesk migration orchestrator | `processChunk`, reference map caching, missing entity auto-creation, sequence advancement |
| [`backend/repositories/bulkImportRepository.js`](file:///m:/FreshDesk_Ticketing_System/backend/repositories/bulkImportRepository.js) | High-throughput batch ticket DAL | `createTicketsBatch`, `createStatusHistoriesBatch`, `advanceSequenceToMax` |
| [`backend/controllers/bulkImportController.js`](file:///m:/FreshDesk_Ticketing_System/backend/controllers/bulkImportController.js) | Bulk migration HTTP endpoints | `importFreshdeskChunk`, `resetTicketDatabaseForMigration` |
| [`backend/scripts/migrate_freshdesk.js`](file:///m:/FreshDesk_Ticketing_System/backend/scripts/migrate_freshdesk.js) | High-scale CLI migration runner (4GB heap) | Direct XLSX/CSV streaming to API, progress bar, error log generation |
| [`backend/repositories/dashboardRepository.js`](file:///m:/FreshDesk_Ticketing_System/backend/repositories/dashboardRepository.js) | Dashboard metrics & DB aggregation | `getStatusSummary`, `getRecentTickets`, `getTrend` (raw SQL) |
| [`backend/services/notificationService.js`](file:///m:/FreshDesk_Ticketing_System/backend/services/notificationService.js) | Async email notification dispatcher | `sendTicketCreatedNotifications`, `sendTicketClosedNotifications`, `sendPasswordResetOtpEmail` |
| [`frontend/src/pages/BulkTicketImport.jsx`](file:///m:/FreshDesk_Ticketing_System/frontend/src/pages/BulkTicketImport.jsx) | Super Admin 4-step bulk migration UI | File dropzone, 17-column validator, chunking dispatcher, error CSV exporter |
| [`frontend/src/pages/Profile.jsx`](file:///m:/FreshDesk_Ticketing_System/frontend/src/pages/Profile.jsx) | Read-only hospital staff profile view | Displays locked Master attributes (Employee ID, Org Unit, Role) |
