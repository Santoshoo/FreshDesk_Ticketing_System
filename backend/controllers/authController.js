import authService from '../services/authService.js';
import { config } from '../config/env.js';

export class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getGoogleUrl(req, res, next) {
    try {
      const url = authService.getGoogleAuthUrl();
      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  }

  async googleCallback(req, res, next) {
    try {
      const { code } = req.query;
      const result = await authService.handleGoogleCallback(code);
      // Redirect to frontend with token
      const frontendUrl = config.corsOrigin || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard?token=${result.accessToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`);
    } catch (error) {
      const frontendUrl = config.corsOrigin || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Google Authentication failed')}`);
    }
  }

  async googleLogin(req, res, next) {
    try {
      const { email, name } = req.body;
      const result = await authService.loginOrProvisionGoogleUser(email, name);
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

  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

export default new AuthController();
