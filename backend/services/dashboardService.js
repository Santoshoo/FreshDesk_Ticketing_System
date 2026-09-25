import dashboardRepository from '../repositories/dashboardRepository.js';

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

  async getReportExport(user, { periodType = 'month', date, year, month, startDate, endDate, scope } = {}) {
    const where = this._buildFilter(user, scope);
    let parsedStart = null;
    let parsedEnd = null;

    if (periodType === 'day') {
      const targetDateStr = date || new Date().toISOString().slice(0, 10);
      parsedStart = new Date(`${targetDateStr}T00:00:00.000`);
      parsedEnd = new Date(`${targetDateStr}T23:59:59.999`);
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
    }

    const data = await dashboardRepository.getReportExportData(where, parsedStart, parsedEnd);
    return {
      ...data,
      metadata: {
        periodType,
        startDate: parsedStart ? parsedStart.toISOString() : null,
        endDate: parsedEnd ? parsedEnd.toISOString() : null,
        totalTickets: data.tickets.length,
      },
    };
  }
}

export default new DashboardService();
