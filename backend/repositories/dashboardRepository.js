import { Prisma } from '@prisma/client';
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

  async getRecentTickets(where = {}, limit = 8) {
    return prisma.ticket.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
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

    // Build day map for the past N days
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - ((days - 1) - i));
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap[key] = { date: key, label, created: 0, resolved: 0 };
    }

    const agentIdFilter = where.agentId ? Prisma.sql`AND agent_id = ${where.agentId}` : Prisma.empty;
    const groupIdFilter = where.groupId ? Prisma.sql`AND group_id = ${where.groupId}` : Prisma.empty;
    const contactIdFilter = where.contactId ? Prisma.sql`AND contact_id = ${where.contactId}` : Prisma.empty;

    const [createdStats, resolvedStats] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as dateStr, COUNT(id) as count
        FROM tickets
        WHERE created_at >= ${startDate} ${agentIdFilter} ${groupIdFilter} ${contactIdFilter}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      `,
      prisma.$queryRaw`
        SELECT DATE_FORMAT(resolved_at, '%Y-%m-%d') as dateStr, COUNT(id) as count
        FROM tickets
        WHERE resolved_at >= ${startDate} ${agentIdFilter} ${groupIdFilter} ${contactIdFilter}
        GROUP BY DATE_FORMAT(resolved_at, '%Y-%m-%d')
      `,
    ]);

    createdStats.forEach((r) => {
      if (r.dateStr && dayMap[r.dateStr]) {
        dayMap[r.dateStr].created = Number(r.count);
      }
    });

    resolvedStats.forEach((r) => {
      if (r.dateStr && dayMap[r.dateStr]) {
        dayMap[r.dateStr].resolved = Number(r.count);
      }
    });

    return Object.values(dayMap);
  }
}

export default new DashboardRepository();
