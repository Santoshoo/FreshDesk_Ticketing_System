import { prisma } from '../config/database.js';

export class NotificationLogRepository {
  async createLog({
    ticketId,
    notificationType,
    recipientType,
    recipientEmail,
    status,
    errorMessage = null,
    sentAt = null,
  }) {
    const numericTicketId = typeof ticketId === 'string' || typeof ticketId === 'number'
      ? BigInt(ticketId)
      : ticketId;

    try {
      return await prisma.notificationLog.create({
        data: {
          ticketId: numericTicketId,
          notificationType,
          recipientType,
          recipientEmail: String(recipientEmail).trim().toLowerCase(),
          status,
          errorMessage: errorMessage ? String(errorMessage).slice(0, 1000) : null,
          sentAt: sentAt || (status === 'SENT' ? new Date() : null),
        },
      });
    } catch (err) {
      if (err.code === 'P2003') {
        // Ticket was deleted concurrently before log write completed
        return null;
      }
      throw err;
    }
  }

  async getLogsByTicketId(ticketId) {
    const numericTicketId = typeof ticketId === 'string' || typeof ticketId === 'number'
      ? BigInt(ticketId)
      : ticketId;

    return prisma.notificationLog.findMany({
      where: { ticketId: numericTicketId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new NotificationLogRepository();
