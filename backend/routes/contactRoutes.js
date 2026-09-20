import { Router } from 'express';
import contactController from '../controllers/contactController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', contactController.search.bind(contactController));

export default router;
