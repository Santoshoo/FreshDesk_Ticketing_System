import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', authController.login.bind(authController));

router.post('/logout', authController.logout.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));
router.put('/profile', authMiddleware, authController.updateProfile.bind(authController));
router.put('/change-password', authMiddleware, authController.changePassword.bind(authController));

export default router;
