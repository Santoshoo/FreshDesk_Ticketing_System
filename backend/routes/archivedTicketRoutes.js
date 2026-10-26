import { Router } from 'express';
import archivedTicketController from '../controllers/archivedTicketController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import { archiveUpload } from '../middleware/archiveUploadMiddleware.js';

const router = Router();

// Protect all archived ticket routes with JWT authentication and restrict strictly to Admins and Super Admins
router.use(authMiddleware);
router.use(isAdmin);

// Multipart streaming upload endpoint
router.post('/upload', archiveUpload.single('file'), archivedTicketController.upload.bind(archivedTicketController));
router.get('/upload-status/:jobId', archivedTicketController.getUploadStatus.bind(archivedTicketController));

// Export streaming endpoints
router.get('/export-count', archivedTicketController.exportCount.bind(archivedTicketController));
router.get('/export', archivedTicketController.export.bind(archivedTicketController));

router.get('/filter-options', archivedTicketController.getFilterOptions.bind(archivedTicketController));
router.get('/', archivedTicketController.list.bind(archivedTicketController));
router.get('/:id', archivedTicketController.getById.bind(archivedTicketController));

export default router;
