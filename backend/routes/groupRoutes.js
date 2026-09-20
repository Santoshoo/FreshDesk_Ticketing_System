import { Router } from 'express';
import groupController from '../controllers/groupController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin, isSuperAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', groupController.search.bind(groupController));
router.get('/:groupId/agents', groupController.getAgentsByGroup.bind(groupController));
router.get('/', groupController.list.bind(groupController));
router.post('/bulk', isSuperAdmin, groupController.bulkCreate.bind(groupController));
router.post('/', isAdmin, groupController.create.bind(groupController));
router.put('/:id', isAdmin, groupController.update.bind(groupController));

export default router;
