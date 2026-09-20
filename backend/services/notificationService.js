import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import { getTransporter } from '../config/mail.js';
import logger from '../utils/logger.js';
import notificationLogRepository from '../repositories/notificationLogRepository.js';
import { generateTicketEmail } from '../templates/ticketNotificationTemplate.js';

export class NotificationService {
  /**
   * Triggers the two distinct emails when a ticket is created.
   * 1. Email #1: Assigned Agent (only)
   * 2. Email #2: All active agents mapped to the ticket's group (including assigned agent if mapped)
   */
  async sendTicketCreatedNotifications(ticketId) {
    try {
      const data = await this._fetchTicketNotificationData(ticketId);
      if (!data) {
        logger.warn({ msg: 'Ticket not found for created notification', ticketId: String(ticketId) });
        return;
      }

      const { ticket, groupName, ticketTypeName, assignedAgent, groupAgents, ticketUrl } = data;

      // Concurrently dispatch Email #1 and Email #2 (Requirements 2, 9, 13)
      const tasks = [];

      if (assignedAgent && assignedAgent.email) {
        tasks.push(
          this._sendAssignedAgentNotification({
            ticket,
            assignedAgent,
            groupName,
            ticketTypeName,
            ticketUrl,
            event: 'CREATED',
          })
        );
      } else {
        logger.info({
          msg: 'No assigned agent with valid email to send Email #1',
          ticketId: String(ticket.id),
        });
      }

      if (groupAgents && groupAgents.length > 0) {
        tasks.push(
          this._sendGroupNotification({
            ticket,
            groupAgents,
            groupName,
            ticketTypeName,
            ticketUrl,
            event: 'CREATED',
          })
        );
      } else {
        logger.info({
          msg: 'No active agents found in group to send Email #2',
          ticketId: String(ticket.id),
          groupId: ticket.groupId,
        });
      }

      await Promise.allSettled(tasks);
    } catch (error) {
      logger.error({
        msg: 'Unexpected error in sendTicketCreatedNotifications',
        ticketId: String(ticketId),
        error: error.message,
      });
    }
  }

  /**
   * Triggers the two distinct emails when a ticket is closed.
   * Only called on actual transition to CLOSED.
   * 1. Email #1: Assigned Agent (only)
   * 2. Email #2: All active agents mapped to the ticket's group
   */
  async sendTicketClosedNotifications(ticketId) {
    try {
      const data = await this._fetchTicketNotificationData(ticketId);
      if (!data) {
        logger.warn({ msg: 'Ticket not found for closed notification', ticketId: String(ticketId) });
        return;
      }

      const { ticket, groupName, ticketTypeName, assignedAgent, groupAgents, ticketUrl } = data;

      // Concurrently dispatch Email #1 and Email #2 on close (Requirements 3, 9, 13)
      const tasks = [];

      if (assignedAgent && assignedAgent.email) {
        tasks.push(
          this._sendAssignedAgentNotification({
            ticket,
            assignedAgent,
            groupName,
            ticketTypeName,
            ticketUrl,
            event: 'CLOSED',
          })
        );
      }

      if (groupAgents && groupAgents.length > 0) {
        tasks.push(
          this._sendGroupNotification({
            ticket,
            groupAgents,
            groupName,
            ticketTypeName,
            ticketUrl,
            event: 'CLOSED',
          })
        );
      }

      await Promise.allSettled(tasks);
    } catch (error) {
      logger.error({
        msg: 'Unexpected error in sendTicketClosedNotifications',
        ticketId: String(ticketId),
        error: error.message,
      });
    }
  }

  /**
   * Optimized single-pass query to fetch ticket and group agents (Requirements 8 & 12).
   */
  async _fetchTicketNotificationData(ticketId) {
    const numericTicketId = typeof ticketId === 'string' || typeof ticketId === 'number'
      ? BigInt(ticketId)
      : ticketId;

    const ticket = await prisma.ticket.findUnique({
      where: { id: numericTicketId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) return null;

    // Single optimized query to retrieve all active agents mapped to ticket.groupId
    const agentGroupMappings = await prisma.agentGroup.findMany({
      where: {
        groupId: ticket.groupId,
        user: {
          status: 'ACTIVE',
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    // Deduplicate within the group list (Requirement 16)
    const seenEmails = new Set();
    const groupAgents = [];

    for (const mapping of agentGroupMappings) {
      const u = mapping.user;
      if (u && u.email && u.email.trim()) {
        const normEmail = u.email.trim().toLowerCase();
        if (!seenEmails.has(normEmail)) {
          seenEmails.add(normEmail);
          groupAgents.push({
            id: u.id,
            name: u.name,
            email: normEmail,
          });
        }
      }
    }

    const frontendBase = (config.frontendBaseUrl || 'http://localhost:5173').replace(/\/+$/, '');
    const ticketUrl = `${frontendBase}/tickets/${ticket.id}`;

    return {
      ticket,
      groupName: ticket.group?.name || 'N/A',
      ticketTypeName: ticket.ticketType?.name || 'N/A',
      assignedAgent: ticket.agent && ticket.agent.status === 'ACTIVE' ? ticket.agent : null,
      groupAgents,
      ticketUrl,
    };
  }

  /**
   * Internal worker: Send Email #1 to Assigned Agent only
   */
  async _sendAssignedAgentNotification({
    ticket,
    assignedAgent,
    groupName,
    ticketTypeName,
    ticketUrl,
    event,
  }) {
    const recipientEmail = assignedAgent.email.trim().toLowerCase();
    const notificationType = event === 'CREATED' ? 'TICKET_CREATED' : 'TICKET_CLOSED';

    try {
      const transporter = getTransporter();
      const { html, text } = generateTicketEmail({
        event,
        recipientType: 'ASSIGNED_AGENT',
        ticket,
        groupName,
        ticketTypeName,
        ticketUrl,
      });

      // EXACT SUBJECT REQUIREMENT (Requirement 4):
      // Must be EXACTLY ticket.subject with NO prefixes, suffixes, or ticket numbers.
      const mailOptions = {
        from: config.smtp.from,
        to: recipientEmail,
        subject: ticket.subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);

      logger.info({
        msg: `Assigned agent notification sent (${event})`,
        ticketId: String(ticket.id),
        messageId: info.messageId,
        to: recipientEmail,
        subject: ticket.subject,
      });

      // Log success in database
      await notificationLogRepository.createLog({
        ticketId: ticket.id,
        notificationType,
        recipientType: 'ASSIGNED_AGENT',
        recipientEmail,
        status: 'SENT',
        sentAt: new Date(),
      });
    } catch (err) {
      logger.error({
        msg: `Failed to send assigned agent notification (${event})`,
        ticketId: String(ticket.id),
        to: recipientEmail,
        error: err.message,
      });

      // Log failure in database
      await notificationLogRepository.createLog({
        ticketId: ticket.id,
        notificationType,
        recipientType: 'ASSIGNED_AGENT',
        recipientEmail,
        status: 'FAILED',
        errorMessage: err.message,
      });
    }
  }

  /**
   * Internal worker: Send Email #2 to Group Active Agents
   */
  async _sendGroupNotification({
    ticket,
    groupAgents,
    groupName,
    ticketTypeName,
    ticketUrl,
    event,
  }) {
    const recipientEmails = groupAgents.map((a) => a.email);
    if (recipientEmails.length === 0) return;

    const notificationType = event === 'CREATED' ? 'TICKET_CREATED' : 'TICKET_CLOSED';
    const recipientListString = recipientEmails.join(', ');

    try {
      const transporter = getTransporter();
      const { html, text } = generateTicketEmail({
        event,
        recipientType: 'GROUP',
        ticket,
        groupName,
        ticketTypeName,
        ticketUrl,
      });

      // EXACT SUBJECT REQUIREMENT (Requirement 4):
      // Must be EXACTLY ticket.subject with NO prefixes, suffixes, or ticket numbers.
      const mailOptions = {
        from: config.smtp.from,
        to: recipientEmails, // Array of recipient emails or comma-delimited string
        subject: ticket.subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);

      logger.info({
        msg: `Group notification sent (${event})`,
        ticketId: String(ticket.id),
        messageId: info.messageId,
        toCount: recipientEmails.length,
        recipients: recipientEmails,
        subject: ticket.subject,
      });

      // Log success in database for each recipient (or as consolidated group)
      for (const email of recipientEmails) {
        await notificationLogRepository.createLog({
          ticketId: ticket.id,
          notificationType,
          recipientType: 'GROUP',
          recipientEmail: email,
          status: 'SENT',
          sentAt: new Date(),
        });
      }
    } catch (err) {
      logger.error({
        msg: `Failed to send group notification (${event})`,
        ticketId: String(ticket.id),
        recipients: recipientListString,
        error: err.message,
      });

      for (const email of recipientEmails) {
        await notificationLogRepository.createLog({
          ticketId: ticket.id,
          notificationType,
          recipientType: 'GROUP',
          recipientEmail: email,
          status: 'FAILED',
          errorMessage: err.message,
        });
      }
    }
  }
}

export default new NotificationService();
