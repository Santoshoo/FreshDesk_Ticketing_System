import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
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
      role: user.role.name,
      department: user.department?.name || null,
      departmentId: user.departmentId,
      status: user.status,
      groups: user.agentGroups?.map((ag) => ag.group) || [],
    };
  }
}

export default new AuthService();
