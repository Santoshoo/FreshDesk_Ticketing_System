import { Router } from 'express';
import employeeEmailController from '../controllers/employeeEmailController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// Enforce authentication context and Admin-only authorization for all Employee Email Master routes
router.use(authMiddleware);
router.use(isAdmin);

router.get('/', employeeEmailController.list.bind(employeeEmailController));
router.post('/', employeeEmailController.create.bind(employeeEmailController));
router.get('/:id', employeeEmailController.getById.bind(employeeEmailController));
router.patch('/:id', employeeEmailController.update.bind(employeeEmailController));
router.patch('/:id/status', employeeEmailController.setStatus.bind(employeeEmailController));
router.delete('/:id', employeeEmailController.delete.bind(employeeEmailController));

export default router;
