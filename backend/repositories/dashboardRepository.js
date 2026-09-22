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

  async getCategoryReport(where = {}) {
    const [categoryStats, ticketTypes, totalTickets] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['ticketTypeId', 'status'],
        where,
        _count: { id: true },
      }),
      prisma.ticketType.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      prisma.ticket.count({ where }),
    ]);

    const map = {};
    ticketTypes.forEach((tt) => {
      map[tt.id] = {
        id: tt.id,
        name: tt.name,
        description: tt.description,
        total: 0,
        open: 0,
        inProgress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        percentage: 0,
      };
    });

    categoryStats.forEach((row) => {
      const item = map[row.ticketTypeId];
      if (item) {
        const count = Number(row._count.id);
        item.total += count;
        if (row.status === 'OPEN') item.open += count;
        else if (row.status === 'IN_PROGRESS') item.inProgress += count;
        else if (row.status === 'PENDING' || row.status === 'ON_HOLD') item.pending += count;
        else if (row.status === 'RESOLVED') item.resolved += count;
        else if (row.status === 'CLOSED') item.closed += count;
      }
    });

    return Object.values(map)
      .map((cat) => ({
        ...cat,
        percentage: totalTickets > 0 ? Math.round((cat.total / totalTickets) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getGroupReport(where = {}) {
    const [groupStats, groups, totalTickets] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['groupId', 'status'],
        where,
        _count: { id: true },
      }),
      prisma.group.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      prisma.ticket.count({ where }),
    ]);

    const map = {};
    groups.forEach((g) => {
      map[g.id] = {
        id: g.id,
        name: g.name,
        description: g.description,
        total: 0,
        open: 0,
        inProgress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        resolutionRate: 0,
        percentage: 0,
      };
    });

    groupStats.forEach((row) => {
      const item = map[row.groupId];
      if (item) {
        const count = Number(row._count.id);
        item.total += count;
        if (row.status === 'OPEN') item.open += count;
        else if (row.status === 'IN_PROGRESS') item.inProgress += count;
        else if (row.status === 'PENDING' || row.status === 'ON_HOLD') item.pending += count;
        else if (row.status === 'RESOLVED') item.resolved += count;
        else if (row.status === 'CLOSED') item.closed += count;
      }
    });

    return Object.values(map)
      .map((grp) => {
        const completed = grp.resolved + grp.closed;
        const resolutionRate = grp.total > 0 ? Math.round((completed / grp.total) * 100) : 0;
        const percentage = totalTickets > 0 ? Math.round((grp.total / totalTickets) * 100) : 0;
        return {
          ...grp,
          resolutionRate,
          percentage,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  async getAgentReport(where = {}) {
    const [agentStats, agents] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['agentId', 'status'],
        where,
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: {
          role: { name: { in: ['AGENT', 'ADMIN', 'SUPER_ADMIN'] } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          role: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const map = {};
    agents.forEach((ag) => {
      map[ag.id] = {
        id: ag.id,
        name: ag.name,
        email: ag.email,
        employeeId: ag.employeeId,
        role: ag.role?.name || 'AGENT',
        total: 0,
        open: 0,
        inProgress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        resolutionRate: 0,
      };
    });

    const unassigned = {
      id: null,
      name: 'Unassigned',
      email: '-',
      employeeId: '-',
      role: 'QUEUE',
      total: 0,
      open: 0,
      inProgress: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
      resolutionRate: 0,
    };

    agentStats.forEach((row) => {
      const count = Number(row._count.id);
      if (row.agentId === null) {
        unassigned.total += count;
        if (row.status === 'OPEN') unassigned.open += count;
        else if (row.status === 'IN_PROGRESS') unassigned.inProgress += count;
        else if (row.status === 'PENDING' || row.status === 'ON_HOLD') unassigned.pending += count;
        else if (row.status === 'RESOLVED') unassigned.resolved += count;
        else if (row.status === 'CLOSED') unassigned.closed += count;
      } else if (map[row.agentId]) {
        const item = map[row.agentId];
        item.total += count;
        if (row.status === 'OPEN') item.open += count;
        else if (row.status === 'IN_PROGRESS') item.inProgress += count;
        else if (row.status === 'PENDING' || row.status === 'ON_HOLD') item.pending += count;
        else if (row.status === 'RESOLVED') item.resolved += count;
        else if (row.status === 'CLOSED') item.closed += count;
      }
    });

    const result = Object.values(map).map((ag) => {
      const completed = ag.resolved + ag.closed;
      const resolutionRate = ag.total > 0 ? Math.round((completed / ag.total) * 100) : 0;
      return {
        ...ag,
        resolutionRate,
      };
    });

    if (unassigned.total > 0) {
      const completed = unassigned.resolved + unassigned.closed;
      unassigned.resolutionRate = unassigned.total > 0 ? Math.round((completed / unassigned.total) * 100) : 0;
      result.push(unassigned);
    }

    return result.sort((a, b) => b.total - a.total);
  }
}

export default new DashboardRepository();
