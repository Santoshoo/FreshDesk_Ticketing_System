import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED_OR_INVALID', message: 'Authentication token is invalid or expired' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_INACTIVE_OR_NOT_FOUND', message: 'User account is not active or no longer exists' },
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      mobile: user.mobile,
      role: user.role.name,
      roleId: user.roleId,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export default authMiddleware;
