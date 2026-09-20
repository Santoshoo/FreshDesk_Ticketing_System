import { Router } from 'express';
import ticketController from '../controllers/ticketController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/logs', ticketController.getLogs.bind(ticketController));
router.get('/my', ticketController.listMy.bind(ticketController));
router.get('/', ticketController.list.bind(ticketController));
router.post('/', ticketController.create.bind(ticketController));
router.get('/:id', ticketController.getById.bind(ticketController));
router.put('/:id', ticketController.update.bind(ticketController));
router.delete('/:id', ticketController.delete.bind(ticketController));
router.post('/:id/comments', ticketController.addComment.bind(ticketController));
router.put('/:id/status', ticketController.updateStatus.bind(ticketController));
router.put('/:id/assign', ticketController.updateAssignment.bind(ticketController));

export default router;
