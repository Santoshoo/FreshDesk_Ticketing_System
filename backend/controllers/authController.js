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

  async forgotPassword(req, res, next) {
    try {
      const { identifier, email, employeeId } = req.body;
      const targetIdentifier = identifier || email || employeeId;
      const result = await authService.requestPasswordReset(targetIdentifier);
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { identifier, email, employeeId, otp, code, newPassword } = req.body;
      const targetIdentifier = identifier || email || employeeId;
      const targetOtp = otp || code;
      const result = await authService.resetPasswordWithOtp({
        identifier: targetIdentifier,
        otp: targetOtp,
        newPassword,
      });
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
