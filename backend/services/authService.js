import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';
import { getTransporter } from '../config/mail.js';
import logger from '../utils/logger.js';
import userRepository from '../repositories/userRepository.js';

export class AuthService {
  async login(identifier, password) {
    if (!identifier || !password) {
      const err = new Error('Email or Employee ID and password are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanInput = identifier.trim();

    // 1. Find user by email (case-insensitive)
    let user = await userRepository.findByEmail(cleanInput.toLowerCase());

    // 2. If not found, find user by employeeId (case-insensitive / uppercase)
    if (!user) {
      user = await userRepository.findByEmployeeId(cleanInput);
    }
    if (!user) {
      user = await userRepository.findByEmployeeId(cleanInput.toUpperCase());
    }

    if (!user) {
      const err = new Error('Invalid email/employee ID or password');
      err.statusCode = 401;
      throw err;
    }

    if (user.status !== 'ACTIVE') {
      const err = new Error('Your account is inactive. Please contact the administrator.');
      err.statusCode = 403;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const err = new Error('Invalid email/employee ID or password');
      err.statusCode = 401;
      throw err;
    }

    // Role check: Only SUPER_ADMIN, ADMIN, and AGENT are authorized to log in
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'AGENT'];
    const userRole = user.role?.name;
    if (!allowedRoles.includes(userRole)) {
      const err = new Error('Access denied: Only Super Admin, Admin, and Support Agents are authorized to log in.');
      err.statusCode = 403;
      throw err;
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role.name,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        mobile: user.mobile,
        role: user.role.name,
        department: user.department?.name || null,
        departmentId: user.departmentId,
      },
    };
  }



  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      mobile: user.mobile,
      role: user.role?.name || null,
      department: user.department?.name || null,
      departmentId: user.departmentId,
      status: user.status,
      groups: user.agentGroups?.map((ag) => ag.group) || [],
    };
  }

  async updateProfile(userId, { name, mobile }) {
    if (!name || !name.trim()) {
      const err = new Error('Full Name is required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await userRepository.findById(parseInt(userId, 10));
    if (!existing) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {
      name: name.trim(),
    };
    if (mobile !== undefined) {
      updateData.mobile = mobile ? mobile.trim() : null;
    }

    const updated = await userRepository.update(existing.id, updateData);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      employeeId: updated.employeeId,
      mobile: updated.mobile,
      role: updated.role?.name || null,
      department: updated.department?.name || null,
      departmentId: updated.departmentId,
      status: updated.status,
    };
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      const err = new Error('Current password and new password are required');
      err.statusCode = 400;
      throw err;
    }

    if (newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }

    const user = await userRepository.findById(parseInt(userId, 10));
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      const err = new Error('Current password is incorrect');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.update(user.id, { passwordHash });

    return { message: 'Password updated successfully' };
  }

  async _findUserByIdentifier(identifier) {
    if (!identifier || !identifier.trim()) return null;
    const cleanInput = identifier.trim();
    let user = await userRepository.findByEmail(cleanInput.toLowerCase());
    if (!user) user = await userRepository.findByEmployeeId(cleanInput);
    if (!user) user = await userRepository.findByEmployeeId(cleanInput.toUpperCase());
    return user;
  }

  async requestPasswordReset(identifier) {
    if (!identifier || !identifier.trim()) {
      const err = new Error('Email or Employee ID is required');
      err.statusCode = 400;
      throw err;
    }

    const user = await this._findUserByIdentifier(identifier);
    if (!user) {
      const err = new Error('No user account found with that Email or Employee ID');
      err.statusCode = 404;
      throw err;
    }

    if (user.status !== 'ACTIVE') {
      const err = new Error('Your account is currently inactive. Please contact the administrator.');
      err.statusCode = 403;
      throw err;
    }

    // Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any previous unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Save token in password_reset_tokens
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send verification code via Email
    try {
      const transporter = getTransporter();
      const mailOptions = {
        from: config.smtp.from,
        to: user.email,
        subject: 'Password Reset Verification Code - KIMS ICT Service Desk',
        text: `Hi ${user.name},\n\nYour 6-digit verification code to reset your password is: ${otp}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this password reset, please ignore this email or contact ICT support.\n\nKIMS ICT Service Desk`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7fb; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e5e9f2;">
          <tr>
            <td style="background-color: #0d59cf; padding: 22px 28px;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">KIMS ICT Service Desk</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 28px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0; font-size: 15px;">Hi <strong>${user.name}</strong>,</p>
              <p style="margin: 0 0 20px 0; color: #475569;">We received a request to reset your password. Use the following 6-digit verification code:</p>
              
              <div style="background-color: #eff6ff; border: 1.5px dashed #3b82f6; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0d59cf; font-family: monospace;">${otp}</span>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b;">
                ⏱️ This verification code is valid for <strong>15 minutes</strong>.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #94a3b8;">
                If you did not request a password reset, please disregard this email. Your password will remain unchanged.
              </p>

              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #334155;">KIMS ICT Service Desk</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      };

      await transporter.sendMail(mailOptions);
      logger.info({ msg: 'Password reset code sent via email', userId: user.id, email: user.email });
    } catch (mailError) {
      logger.error({ msg: 'Failed to send password reset email', error: mailError.message, userId: user.id });
      console.log(`\n========================================\n[DEV BACKUP] Password Reset Code for ${user.email} is: ${otp}\n========================================\n`);
    }

    // Mask the email for user privacy display
    const parts = user.email.split('@');
    const localPart = parts[0];
    const maskedLocal = localPart.length <= 2 
      ? localPart + '***' 
      : localPart[0] + '***' + localPart[localPart.length - 1];
    const maskedEmail = `${maskedLocal}@${parts[1] || ''}`;

    return {
      message: 'Verification code sent to registered email',
      maskedEmail,
    };
  }

  async resetPasswordWithOtp({ identifier, otp, newPassword }) {
    if (!identifier || !identifier.trim()) {
      const err = new Error('Email or Employee ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (!otp || !otp.trim()) {
      const err = new Error('6-digit verification code is required');
      err.statusCode = 400;
      throw err;
    }

    if (!newPassword || newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }

    const user = await this._findUserByIdentifier(identifier);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    // Find unexpired, unused reset tokens for this user
    const validTokens = await prisma.passwordResetToken.findMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!validTokens || validTokens.length === 0) {
      const err = new Error('Verification code has expired or is invalid. Please request a new code.');
      err.statusCode = 400;
      throw err;
    }

    // Find matching token
    const cleanOtp = otp.trim();
    let matchedToken = null;
    for (const tokenRecord of validTokens) {
      const isMatch = await bcrypt.compare(cleanOtp, tokenRecord.tokenHash);
      if (isMatch) {
        matchedToken = tokenRecord;
        break;
      }
    }

    if (!matchedToken) {
      const err = new Error('Invalid verification code. Please check and try again.');
      err.statusCode = 400;
      throw err;
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: matchedToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info({ msg: 'Password successfully reset with OTP', userId: user.id, email: user.email });

    return {
      message: 'Password reset successfully. You can now log in with your new password.',
      email: user.email,
    };
  }
}

export default new AuthService();
