import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.get('/google/url', authController.getGoogleUrl.bind(authController));
router.get('/google/callback', authController.googleCallback.bind(authController));
router.post('/google', authController.googleLogin.bind(authController));
router.post('/logout', authMiddleware, authController.logout.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));

export default router;
