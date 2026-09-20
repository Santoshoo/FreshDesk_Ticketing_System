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

  getGoogleAuthUrl() {
    if (!config.google.clientId) {
      return null;
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: config.google.redirectUri,
      client_id: config.google.clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  async handleGoogleCallback(code) {
    if (!code) {
      const err = new Error('Authorization code is missing from Google callback');
      err.statusCode = 400;
      throw err;
    }

    // Exchange authorization code for tokens with Google OAuth
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      const err = new Error(tokenData.error_description || 'Failed to exchange token with Google');
      err.statusCode = 400;
      throw err;
    }

    // Fetch user profile info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await userRes.json();
    if (!profile.email) {
      const err = new Error('Unable to retrieve email from Google profile');
      err.statusCode = 400;
      throw err;
    }

    return this.loginOrProvisionGoogleUser(profile.email, profile.name);
  }

  async loginOrProvisionGoogleUser(credentialEmail, name) {
    const email = credentialEmail.toLowerCase().trim();
    let user = await userRepository.findByEmail(email);

    if (!user) {
      // Auto-provision standard employee if not existing in User Master
      const employeeRole = await userRepository.findRoleByName('EMPLOYEE');
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await userRepository.create({
        name: name || email.split('@')[0],
        email,
        employeeId: 'EMP' + Math.floor(1000 + Math.random() * 9000),
        passwordHash: dummyPassword,
        roleId: employeeRole.id,
        status: 'ACTIVE',
      });
    }

    if (user.status !== 'ACTIVE') {
      const err = new Error('Your account is inactive. Please contact ICT admin.');
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
