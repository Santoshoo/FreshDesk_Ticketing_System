import { Router } from 'express';
import userController from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', userController.getMe.bind(userController));
router.get('/active-context', userController.getActiveUsers.bind(userController));
router.get('/search', userController.search.bind(userController));
router.get('/roles', userController.getRoles.bind(userController));
router.get('/', isAdmin, userController.list.bind(userController));
router.post('/', isAdmin, userController.create.bind(userController));
router.get('/:id', userController.getById.bind(userController));
router.put('/:id', isAdmin, userController.update.bind(userController));

export default router;
