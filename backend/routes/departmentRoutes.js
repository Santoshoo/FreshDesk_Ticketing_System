import { Router } from 'express';
import departmentController from '../controllers/departmentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', departmentController.search.bind(departmentController));
router.get('/', departmentController.list.bind(departmentController));
router.post('/', isAdmin, departmentController.create.bind(departmentController));
router.put('/:id', isAdmin, departmentController.update.bind(departmentController));

export default router;
