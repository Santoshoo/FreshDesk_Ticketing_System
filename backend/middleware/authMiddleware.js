import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';

/**
 * Authentication / Context Middleware
 * Operates without login / password flow. Extracts current user context from:
 * 1. 'x-user-id' request header (set by frontend role/user switcher)
 * 2. Optional legacy Bearer token if provided
 * 3. Default active system administrator account from database
 * Always verifies the user in MySQL and loads their authentic role from the database.
 */
export async function authMiddleware(req, res, next) {
  try {
    let targetUserId = null;

    // 1. Check Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.accessSecret);
        if (decoded && decoded.userId) {
          targetUserId = decoded.userId;
        }
      } catch (tokenErr) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Session expired or invalid token. Please log in again.',
          },
        });
      }
    }

    // 2. Check internal context header (x-user-id) if no bearer token
    if (!targetUserId) {
      const headerUserId = req.headers['x-user-id'] || req.headers['x-kims-user-id'];
      if (headerUserId && /^\d+$/.test(String(headerUserId).trim())) {
        targetUserId = parseInt(String(headerUserId).trim(), 10);
      }
    }

    // 3. If no identifier provided, reject unauthorized
    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
    }

    // 4. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found or inactive.',
        },
      });
    }

    // 5. Restrict access to Super Admin, Admin, and Support Agent roles
    const userRole = user.role?.name;
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'AGENT'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Only Super Admin, Admin, and Support Agents are authorized.',
        },
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      mobile: user.mobile,
      role: userRole,
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
