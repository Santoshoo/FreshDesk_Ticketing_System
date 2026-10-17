import dashboardRepository from '../repositories/dashboardRepository.js';
import { prisma } from '../config/database.js';

export class DashboardService {
  _buildFilter(user, scope = 'global') {
    if (scope === 'my' || user.role === 'EMPLOYEE') {
      return {
        OR: [
          { contactId: user.id },
          { agentId: user.id },
          { createdBy: user.id },
        ],
      };
    }
    return {};
  }

  async _buildReportFilter(user, scope = 'all', agentId = null) {
    const isAgent = user.role === 'AGENT';
    const isEmployee = user.role === 'EMPLOYEE';

    // 1. Hard enforcement for AGENT role:
    // Agents CANNOT download other employees' or agents' reports.
    // They are strictly limited to tickets assigned to them or created by them.
    if (isAgent) {
      return {
        filter: {
          OR: [
            { agentId: user.id },
            { createdBy: user.id },
          ],
        },
        scopeType: 'AGENT_SELF',
        scopeLabel: `My Agent Records (${user.name})`,
      };
    }

    // 2. Hard enforcement for EMPLOYEE role:
    if (isEmployee) {
      return {
        filter: {
          OR: [
            { contactId: user.id },
            { createdBy: user.id },
          ],
        },
        scopeType: 'EMPLOYEE_SELF',
        scopeLabel: `My Records (${user.name})`,
      };
    }

    // 3. ADMIN & SUPER_ADMIN flexibility:
    // a) 'my': Only their own records
    if (scope === 'my') {
      return {
        filter: {
          OR: [
            { contactId: user.id },
            { agentId: user.id },
            { createdBy: user.id },
          ],
        },
        scopeType: 'MY_RECORDS',
        scopeLabel: `My Records Only (${user.name})`,
      };
    }

    // b) 'agent': Specific Agent / Staff
    if ((scope === 'agent' || scope === 'specific') && agentId) {
      const parsedAgentId = parseInt(agentId, 10);
      let agentLabel = `Agent #${parsedAgentId}`;
      if (!isNaN(parsedAgentId)) {
        try {
          const targetAgent = await prisma.user.findUnique({
            where: { id: parsedAgentId },
            select: { name: true, employeeId: true },
          });
          if (targetAgent) {
            agentLabel = `${targetAgent.name} (${targetAgent.employeeId})`;
          }
        } catch {
          // ignore lookup failure
        }
      }

      return {
        filter: {
          OR: [
            { agentId: parsedAgentId },
            { createdBy: parsedAgentId },
          ],
        },
        scopeType: 'SPECIFIC_AGENT',
        scopeLabel: `Agent: ${agentLabel}`,
      };
    }

    // c) 'all' / default: All Employees & Agents (Full system view)
    return {
      filter: {},
      scopeType: 'ALL',
      scopeLabel: 'All Employees & Agents (Entire Organization)',
    };
  }

  async getSummary(user, scope) {
    const where = this._buildFilter(user, scope);
    return dashboardRepository.getStatusSummary(where);
  }

  async getRecentTickets(user, scope, limit = 5) {
    const where = this._buildFilter(user, scope);
    return dashboardRepository.getRecentTickets(where, parseInt(limit, 10));
  }

  async getTrend(user, scope, days = 7) {
    const where = this._buildFilter(user, scope);
    return dashboardRepository.getTrend(where, parseInt(days, 10));
  }

  async getCategoryReport(user, scope) {
    const where = this._buildFilter(user, scope);
    return dashboardRepository.getCategoryReport(where);
  }

  async getGroupReport(user, scope) {
    const where = this._buildFilter(user, scope);
    return dashboardRepository.getGroupReport(where);
  }

  async getAgentReport(user, scope) {
    const where = this._buildFilter(user, scope);
    return dashboardRepository.getAgentReport(where);
  }

  async getReportExport(user, { periodType = 'month', date, year, month, startDate, endDate, scope = 'all', agentId = null, status } = {}) {
    const { filter: userFilter, scopeType, scopeLabel } = await this._buildReportFilter(user, scope, agentId);
    const where = { ...userFilter };

    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        where.status = { in: ['PENDING', 'ON_HOLD'] };
      } else {
        where.status = status;
      }
    }

    let parsedStart = null;
    let parsedEnd = null;

    if (periodType === 'day' || periodType === 'custom') {
      if (startDate && endDate) {
        parsedStart = new Date(`${startDate}T00:00:00.000`);
        parsedEnd = new Date(`${endDate}T23:59:59.999`);
      } else {
        const targetDateStr = date || startDate || new Date().toISOString().slice(0, 10);
        parsedStart = new Date(`${targetDateStr}T00:00:00.000`);
        parsedEnd = new Date(`${targetDateStr}T23:59:59.999`);
      }
    } else if (periodType === 'week') {
      if (startDate && endDate) {
        parsedStart = new Date(`${startDate}T00:00:00.000`);
        parsedEnd = new Date(`${endDate}T23:59:59.999`);
      } else {
        const refDate = date ? new Date(`${date}T12:00:00`) : new Date();
        const dayOfWeek = refDate.getDay();
        const diff = refDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        parsedStart = new Date(refDate.getFullYear(), refDate.getMonth(), diff, 0, 0, 0, 0);
        parsedEnd = new Date(refDate.getFullYear(), refDate.getMonth(), diff + 6, 23, 59, 59, 999);
      }
    } else if (periodType === 'month') {
      const now = new Date();
      const targetYear = parseInt(year, 10) || now.getFullYear();
      const targetMonth = parseInt(month, 10) || (now.getMonth() + 1); // 1-indexed
      parsedStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
      parsedEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    } else if (periodType === 'custom') {
      if (startDate) parsedStart = new Date(`${startDate}T00:00:00.000`);
      if (endDate) parsedEnd = new Date(`${endDate}T23:59:59.999`);
    } else if (periodType === 'all') {
      parsedStart = null;
      parsedEnd = null;
    }

    const data = await dashboardRepository.getReportExportData(where, parsedStart, parsedEnd);
    return {
      ...data,
      metadata: {
        periodType,
        startDate: parsedStart ? parsedStart.toISOString() : null,
        endDate: parsedEnd ? parsedEnd.toISOString() : null,
        totalTickets: data.tickets.length,
        scope: scopeType,
        scopeLabel,
        userRole: user.role,
      },
    };
  }
}

export default new DashboardService();
