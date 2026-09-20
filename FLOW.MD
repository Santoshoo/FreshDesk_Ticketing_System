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
   ├── Executes raw SQL via prisma.$queryRaw`:
   │   SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as dateStr, COUNT(id) as count
   │   FROM tickets WHERE created_at >= startDate ... GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
   └── Maps MySQL 7-row aggregate result directly to date keys
   │
6. Return HTTP 200 OK with summary numbers, recent tickets, and 7-day trend array
```

---

## 3. Core File Responsibility Matrix

| File Path | Primary Responsibility | Key Functions |
| :--- | :--- | :--- |
| [`backend/app.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/app.js) | Express app setup & global middleware | Middleware attachment, route mounting, global error handler |
| [`backend/config/database.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/config/database.js) | Prisma client instance & BigInt handling | Exports `prisma`, configures `BigInt.prototype.toJSON` |
| [`backend/utils/ticketNumber.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/utils/ticketNumber.js) | Atomic ticket sequence generation | `generateNextTicketNumber(tx)` using `SELECT FOR UPDATE` |
| [`backend/services/ticketService.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/services/ticketService.js) | Ticket business rules & lifecycle logic | `createTicket`, `listTickets`, `updateTicket`, `updateStatus` |
| [`backend/repositories/ticketRepository.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/repositories/ticketRepository.js) | Ticket database query builder | `findMany`, `count`, `findById`, `updateTicket`, `addComment` |
| [`backend/repositories/dashboardRepository.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/repositories/dashboardRepository.js) | Dashboard metrics & DB aggregation | `getStatusSummary`, `getRecentTickets`, `getTrend` (raw SQL) |
| [`backend/services/notificationService.js`](file:///c:/Users/KIIT/Desktop/FreshDesk_Ticketing_System/backend/services/notificationService.js) | Async email notification dispatcher | `sendTicketCreatedNotifications`, `sendTicketClosedNotifications` |
