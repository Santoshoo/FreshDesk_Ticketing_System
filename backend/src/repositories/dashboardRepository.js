import { prisma } from '../config/database.js';

export class DashboardRepository {
  async getStatusSummary(where = {}) {
    const counts = await prisma.ticket.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    const summary = {
      total: 0,
      open: 0,
      inProgress: 0,
      pending: 0,
      onHold: 0,
      resolved: 0,
      closed: 0,
    };

    counts.forEach((item) => {
      const count = Number(item._count.id);
      summary.total += count;
      if (item.status === 'OPEN') summary.open = count;
      else if (item.status === 'IN_PROGRESS') summary.inProgress = count;
      else if (item.status === 'PENDING') summary.pending = count;
      else if (item.status === 'ON_HOLD') summary.onHold = count;
      else if (item.status === 'RESOLVED') summary.resolved = count;
      else if (item.status === 'CLOSED') summary.closed = count;
    });

    return summary;
  }

  async getRecentTickets(where = {}, limit = 5) {
    return prisma.ticket.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        contact: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { id: true, name: true },
        },
        agent: {
          select: { id: true, name: true },
        },
        ticketType: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getTrend(where = {}, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const trendWhere = {
      ...where,
      createdAt: {
        gte: startDate,
      },
    };

    const tickets = await prisma.ticket.findMany({
      where: trendWhere,
      select: {
        createdAt: true,
        resolvedAt: true,
        status: true,
      },
    });

    // Build day map for the past 7 days
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - ((days - 1) - i));
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap[key] = { date: key, label, created: 0, resolved: 0 };
    }

    tickets.forEach((t) => {
      const createdKey = t.createdAt.toISOString().split('T')[0];
      if (dayMap[createdKey]) {
        dayMap[createdKey].created += 1;
      }
      if (t.resolvedAt) {
        const resolvedKey = t.resolvedAt.toISOString().split('T')[0];
        if (dayMap[resolvedKey]) {
          dayMap[resolvedKey].resolved += 1;
        }
      }
    });

    return Object.values(dayMap);
  }
}

export default new DashboardRepository();
