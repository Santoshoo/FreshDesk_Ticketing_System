import { Router } from 'express';
import agentController from '../controllers/agentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/me/groups', agentController.getMyGroups.bind(agentController));
router.get('/', isAdmin, agentController.list.bind(agentController));
router.put('/:id/groups', isAdmin, agentController.updateAgentGroups.bind(agentController));

export default router;
