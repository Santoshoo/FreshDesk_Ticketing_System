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
}

export default new DashboardService();
