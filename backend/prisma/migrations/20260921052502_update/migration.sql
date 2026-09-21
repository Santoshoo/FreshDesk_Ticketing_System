/*
  Warnings:

  - You are about to alter the column `ticket_number` on the `tickets` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `VarChar(5)`.

*/
-- DropIndex
DROP INDEX `ticket_comments_ticket_id_created_at_idx` ON `ticket_comments`;

-- DropIndex
DROP INDEX `tickets_agent_id_status_created_at_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_contact_email_created_at_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_group_id_status_created_at_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_status_closed_at_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_status_created_at_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_status_resolved_at_idx` ON `tickets`;

-- AlterTable
ALTER TABLE `tickets` MODIFY `ticket_number` VARCHAR(5) NOT NULL;
