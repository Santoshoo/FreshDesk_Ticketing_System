import authService from '../services/authService.js';
import { invalidateUserCache } from '../middleware/authMiddleware.js';

export class AuthController {
  async login(req, res, next) {
    try {
      const { email, password, emailOrEmployeeId, username, identifier } = req.body;
      const loginIdentifier = email || emailOrEmployeeId || username || identifier;
      const result = await authService.login(loginIdentifier, password);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const result = await authService.getCurrentUser(req.user.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, mobile } = req.body;
      const result = await authService.updateProfile(req.user.id, { name, mobile });
      invalidateUserCache(req.user.id);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      invalidateUserCache(req.user.id);
      res.json({
        success: true,
        message: 'Password updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

export default new AuthController();
