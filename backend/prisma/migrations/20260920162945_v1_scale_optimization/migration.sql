-- Migration: v1_scale_optimization
-- Purpose: Expand ticket_number to VARCHAR(20) for 5000+/day throughput & add performance indexes for 30,000+ mail IDs

-- 1. Expand Ticket Number Column length
ALTER TABLE `tickets` MODIFY `ticket_number` VARCHAR(20) NOT NULL;

-- 2. Add Composite Performance Indexes for High-Volume Queries
CREATE INDEX `tickets_status_created_at_idx` ON `tickets`(`status`, `created_at`);
CREATE INDEX `tickets_group_id_status_created_at_idx` ON `tickets`(`group_id`, `status`, `created_at`);
CREATE INDEX `tickets_agent_id_status_created_at_idx` ON `tickets`(`agent_id`, `status`, `created_at`);
CREATE INDEX `tickets_contact_email_created_at_idx` ON `tickets`(`contact_email`, `created_at`);
CREATE INDEX `tickets_status_closed_at_idx` ON `tickets`(`status`, `closed_at`);
CREATE INDEX `tickets_status_resolved_at_idx` ON `tickets`(`status`, `resolved_at`);

-- 3. Comment Thread Performance Indexing
CREATE INDEX `ticket_comments_ticket_id_created_at_idx` ON `ticket_comments`(`ticket_id`, `created_at`);