import dashboardService from '../services/dashboardService.js';

export class DashboardController {
  async getSummary(req, res, next) {
    try {
      const { scope } = req.query;
      const data = await dashboardService.getSummary(req.user, scope);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getRecentTickets(req, res, next) {
    try {
      const { scope, limit } = req.query;
      const data = await dashboardService.getRecentTickets(req.user, scope, limit);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTrend(req, res, next) {
    try {
      const { scope, days } = req.query;
      const data = await dashboardService.getTrend(req.user, scope, days);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController();
