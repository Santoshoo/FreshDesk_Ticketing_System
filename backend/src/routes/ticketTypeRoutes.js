import { Router } from 'express';
import ticketTypeController from '../controllers/ticketTypeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', ticketTypeController.search.bind(ticketTypeController));
router.get('/', ticketTypeController.list.bind(ticketTypeController));
router.post('/', isAdmin, ticketTypeController.create.bind(ticketTypeController));
router.put('/:id', isAdmin, ticketTypeController.update.bind(ticketTypeController));

export default router;
