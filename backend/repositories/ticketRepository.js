import { prisma } from '../config/database.js';

export class TicketRepository {
  async findMany({ skip = 0, take = 50, where = {} } = {}) {
    return prisma.ticket.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: { id: true, name: true, email: true, employeeId: true, mobile: true, department: { select: { name: true } } },
        },
        ticketType: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
        agent: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        creator: {
          select: { id: true, name: true, employeeId: true },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.ticket.count({ where });
  }

  async findById(id) {
    const numericId = typeof id === 'string' && /^\d+$/.test(id) ? BigInt(id) : id;
    return prisma.ticket.findUnique({
      where: { id: numericId },
      include: {
        contact: {
          select: { id: true, name: true, email: true, employeeId: true, mobile: true, department: { select: { name: true } } },
        },
        ticketType: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
        agent: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        creator: {
          select: { id: true, name: true, employeeId: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, email: true, employeeId: true, role: true },
            },
          },
        },
        statusHistories: {
          orderBy: { changedAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, employeeId: true },
            },
          },
        },
        assignmentHistories: {
          orderBy: { changedAt: 'desc' },
          include: {
            changer: {
              select: { id: true, name: true, employeeId: true },
            },
            oldGroup: { select: { id: true, name: true } },
            newGroup: { select: { id: true, name: true } },
            oldAgent: { select: { id: true, name: true } },
            newAgent: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findByTicketNumber(ticketNumber) {
    const cleanNumber = ticketNumber.replace(/^#/, '').trim();
    return prisma.ticket.findUnique({
      where: { ticketNumber: cleanNumber },
      include: {
        contact: {
          select: { id: true, name: true, email: true, employeeId: true, department: { select: { name: true } } },
        },
        ticketType: true,
        group: true,
        agent: true,
        creator: true,
      },
    });
  }

  async updateTicket(id, data) {
    const numericId = typeof id === 'string' && /^\d+$/.test(id) ? BigInt(id) : id;
    return prisma.ticket.update({
      where: { id: numericId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        contact: {
          select: { id: true, name: true, email: true, employeeId: true, department: { select: { name: true } } },
        },
        ticketType: true,
        group: true,
        agent: true,
      },
    });
  }

  async deleteTicket(id) {
    const numericId = typeof id === 'string' && /^\d+$/.test(id) ? BigInt(id) : id;
    return prisma.ticket.delete({
      where: { id: numericId },
    });
  }

  async addComment({ ticketId, userId, commentType = 'REPLY', body }) {
    const numericTicketId = typeof ticketId === 'string' ? BigInt(ticketId) : ticketId;
    return prisma.ticketComment.create({
      data: {
        ticketId: numericTicketId,
        userId,
        commentType,
        body,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async updateStatus({ ticketId, newStatus, changedBy, oldStatus }) {
    const numericTicketId = typeof ticketId === 'string' ? BigInt(ticketId) : ticketId;
    return prisma.$transaction(async (tx) => {
      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
      };
      if (newStatus === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      } else if (newStatus === 'CLOSED') {
        updateData.closedAt = new Date();
      }

      const updatedTicket = await tx.ticket.update({
        where: { id: numericTicketId },
        data: updateData,
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: numericTicketId,
          oldStatus,
          newStatus,
          changedBy,
        },
      });

      return updatedTicket;
    });
  }

  async updateAssignment({ ticketId, newGroupId, newAgentId, changedBy, oldGroupId, oldAgentId }) {
    const numericTicketId = typeof ticketId === 'string' ? BigInt(ticketId) : ticketId;
    return prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: numericTicketId },
        data: {
          groupId: newGroupId,
          agentId: newAgentId,
          updatedAt: new Date(),
        },
      });

      await tx.ticketAssignmentHistory.create({
        data: {
          ticketId: numericTicketId,
          oldGroupId,
          newGroupId,
          oldAgentId,
          newAgentId,
          changedBy,
        },
      });

      return updatedTicket;
    });
  }

  async getGlobalLogs({ skip = 0, take = 50, search = '' } = {}) {
    const whereTicket = {};
    if (search) {
      const clean = search.replace(/^#/, '').trim();
      whereTicket.ticket = {
        OR: [
          { ticketNumber: { contains: clean } },
          { subject: { contains: clean } },
        ],
      };
    }

    const [statusLogs, assignmentLogs] = await Promise.all([
      prisma.ticketStatusHistory.findMany({
        where: whereTicket,
        take: 50,
        orderBy: { changedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              subject: true,
              contact: { select: { id: true, name: true } },
              ticketType: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.ticketAssignmentHistory.findMany({
        where: whereTicket,
        take: 50,
        orderBy: { changedAt: 'desc' },
        include: {
          changer: { select: { id: true, name: true, role: true } },
          oldGroup: { select: { id: true, name: true } },
          newGroup: { select: { id: true, name: true } },
          oldAgent: { select: { id: true, name: true } },
          newAgent: { select: { id: true, name: true } },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              subject: true,
              contact: { select: { id: true, name: true } },
              ticketType: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    // Format into clean, professional sentence structures
    const formattedStatusLogs = statusLogs.map((log) => ({
      id: `status-${log.id}`,
      ticketId: log.ticket?.id,
      ticketNumber: log.ticket?.ticketNumber,
      subject: log.ticket?.subject,
      contactName: log.ticket?.contact?.name,
      typeName: log.ticket?.ticketType?.name,
      groupName: log.ticket?.group?.name,
      actorName: log.user?.name || 'System',
      actorRole: log.user?.role?.name || 'USER',
      timestamp: log.changedAt,
      type: 'STATUS_CHANGE',
      sentence:
        log.oldStatus === log.newStatus
          ? `${log.user?.name || 'Agent'} created Ticket #${log.ticket?.ticketNumber} for ${log.ticket?.contact?.name || 'Requester'} under ${log.ticket?.ticketType?.name || 'General'} / ${log.ticket?.group?.name || 'Support'} with initial status ${log.newStatus}`
          : `${log.user?.name || 'Agent'} updated status of Ticket #${log.ticket?.ticketNumber} from ${log.oldStatus} to ${log.newStatus}`,
    }));

    const formattedAssignmentLogs = assignmentLogs.map((log) => ({
      id: `assign-${log.id}`,
      ticketId: log.ticket?.id,
      ticketNumber: log.ticket?.ticketNumber,
      subject: log.ticket?.subject,
      contactName: log.ticket?.contact?.name,
      typeName: log.ticket?.ticketType?.name,
      groupName: log.ticket?.group?.name,
      actorName: log.changer?.name || 'System',
      actorRole: log.changer?.role?.name || 'USER',
      timestamp: log.changedAt,
      type: 'ASSIGNMENT_CHANGE',
      sentence:
        !log.oldGroupId && log.newGroupId
          ? `${log.changer?.name || 'Agent'} assigned Ticket #${log.ticket?.ticketNumber} to ${log.newGroup?.name || 'Support Group'}${log.newAgent ? ` (${log.newAgent.name})` : ''}`
          : `${log.changer?.name || 'Agent'} reassigned Ticket #${log.ticket?.ticketNumber} to ${log.newGroup?.name || 'Support Group'}${log.newAgent ? ` (Agent: ${log.newAgent.name})` : ''}`,
    }));

    const combined = [...formattedStatusLogs, ...formattedAssignmentLogs].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return combined.slice(skip, skip + take);
  }
}

export default new TicketRepository();
