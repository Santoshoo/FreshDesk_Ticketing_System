import { Router } from 'express';
import tagController from '../controllers/tagController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', tagController.search.bind(tagController));
router.get('/', tagController.list.bind(tagController));
router.post('/', isAdmin, tagController.create.bind(tagController));
router.put('/:id', isAdmin, tagController.update.bind(tagController));

export default router;
