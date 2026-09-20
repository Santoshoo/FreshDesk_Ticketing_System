/**
 * Atomically generates the next sequential ticket number (e.g. "00001", "00002")
 * within an active Prisma transaction. Formats with at least 5 digits.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @returns {Promise<string>} e.g. "00001", "00002"
 */
export async function generateNextTicketNumber(tx) {
  // 1. Atomically update and increment the sequence row
  await tx.$executeRaw`
    UPDATE ticket_sequences 
    SET current_number = current_number + 1, 
        updated_at = NOW() 
    WHERE id = 1
  `;

  // 2. Fetch the locked updated sequence number
  const result = await tx.$queryRaw`
    SELECT current_number 
    FROM ticket_sequences 
    WHERE id = 1 
    FOR UPDATE
  `;

  if (!result || result.length === 0) {
    // If not found, attempt initialization
    await tx.$executeRaw`
      INSERT INTO ticket_sequences (id, current_number, updated_at) 
      VALUES (1, 1, NOW()) 
      ON DUPLICATE KEY UPDATE current_number = current_number + 1
    `;
    const initResult = await tx.$queryRaw`
      SELECT current_number 
      FROM ticket_sequences 
      WHERE id = 1 
      FOR UPDATE
    `;
    const num = Number(initResult[0].current_number);
    return String(num).padStart(5, '0');
  }

  const current = Number(result[0].current_number);
  return String(current).padStart(5, '0');
}
