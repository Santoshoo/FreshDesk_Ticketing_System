/**
 * Atomically generates the next sequential ticket number (e.g. "0000001", "0000043")
 * within an active Prisma transaction. Formats with 7 digits.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @returns {Promise<string>} e.g. "0000001", "0000043"
 */
export async function generateNextTicketNumber(tx) {
  // 1. Determine current highest numeric ticket number in tickets table
  const maxStats = await tx.$queryRaw`
    SELECT COALESCE(MAX(CAST(ticket_number AS UNSIGNED)), 0) AS maxNum 
    FROM tickets
  `;
  const maxInTable = maxStats && maxStats.length > 0 ? Number(maxStats[0].maxNum) : 0;

  // 2. Ensure sequence row exists and is synchronized with MAX(ticket_number)
  await tx.$executeRaw`
    INSERT INTO ticket_sequences (id, current_number, updated_at) 
    VALUES (1, ${maxInTable}, NOW()) 
    ON DUPLICATE KEY UPDATE 
      current_number = GREATEST(current_number, ${maxInTable}),
      updated_at = NOW()
  `;

  // 3. Atomically update and increment the sequence row
  await tx.$executeRaw`
    UPDATE ticket_sequences 
    SET current_number = current_number + 1, 
        updated_at = NOW() 
    WHERE id = 1
  `;

  // 4. Fetch the locked updated sequence number
  const result = await tx.$queryRaw`
    SELECT current_number 
    FROM ticket_sequences 
    WHERE id = 1 
    FOR UPDATE
  `;

  const current = Number(result[0].current_number);
  return String(current).padStart(7, '0');
}
