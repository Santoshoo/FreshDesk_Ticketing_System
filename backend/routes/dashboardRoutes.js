import { Router } from 'express';
import dashboardController from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary.bind(dashboardController));
router.get('/recent-tickets', dashboardController.getRecentTickets.bind(dashboardController));
router.get('/trend', dashboardController.getTrend.bind(dashboardController));
router.get('/reports/category-wise', dashboardController.getCategoryReport.bind(dashboardController));
router.get('/reports/group-wise', dashboardController.getGroupReport.bind(dashboardController));
router.get('/reports/agent-wise', dashboardController.getAgentReport.bind(dashboardController));

export default router;
