import bcrypt from 'bcryptjs';
import userRepository from '../repositories/userRepository.js';
import employeeEmailRepository from '../repositories/employeeEmailRepository.js';

export class UserService {
  async listUsers({ page = 1, limit = 50, search = '', role = '', departmentId = null } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }
    if (role) {
      where.role = { name: role };
    }
    if (departmentId) {
      where.departmentId = parseInt(departmentId, 10);
    }

    const [users, total] = await Promise.all([
      userRepository.findMany({ skip, take, where }),
      userRepository.count(where),
    ]);

    return {
      users,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async searchUsers(query, limit = 20) {
    if (!query || query.trim() === '') {
      return [];
    }
    return userRepository.search(query.trim(), { take: Math.min(50, parseInt(limit, 10)) });
  }

  async getUserById(id) {
    const user = await userRepository.findById(parseInt(id, 10));
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  async createUser({ name, email, employeeId, mobile, departmentId, roleId, roleName, password, status = 'ACTIVE' }) {
    if (!name || !email || !employeeId) {
      const err = new Error('Name, Email, and Employee ID are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.trim();
    const normalizedEmail = cleanEmail.toLowerCase();
    const cleanDeptId = departmentId ? parseInt(departmentId, 10) : null;

    let finalRoleId = roleId ? parseInt(roleId, 10) : null;
    if (!finalRoleId && roleName) {
      const roleObj = await userRepository.findRoleByName(roleName);
      if (roleObj) finalRoleId = roleObj.id;
    }
    if (!finalRoleId) {
      const defaultRole = await userRepository.findRoleByName('EMPLOYEE');
      finalRoleId = defaultRole.id;
    }

    const initialPassword = password || 'Kims@123';
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const createdUser = await userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      employeeId: employeeId.trim().toUpperCase(),
      mobile: mobile ? mobile.trim() : null,
      departmentId: cleanDeptId,
      roleId: finalRoleId,
      passwordHash,
      status: status || 'ACTIVE',
    });

    // Auto-create/sync email in Employee Email Master so all user emails exist in Employee Email Master
    try {
      const existingEmpEmail = await employeeEmailRepository.findByNormalizedEmail(normalizedEmail, { includeDeleted: true });
      if (!existingEmpEmail) {
        await employeeEmailRepository.create({
          email: cleanEmail,
          normalizedEmail,
          departmentId: cleanDeptId,
          isActive: true,
        });
      } else if (existingEmpEmail.deletedAt !== null || !existingEmpEmail.isActive) {
        await employeeEmailRepository.update(existingEmpEmail.id, {
          deletedAt: null,
          isActive: true,
          departmentId: cleanDeptId || existingEmpEmail.departmentId,
        });
      }
    } catch (syncErr) {
      console.warn('Syncing user email to Employee Email Master warning:', syncErr.message);
    }

    return createdUser;
  }

  async updateUser(id, { name, email, employeeId, mobile, departmentId, roleId, roleName, password, status }) {
    const existing = await userRepository.findById(parseInt(id, 10));
    if (!existing) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    const cleanDeptId = departmentId !== undefined ? (departmentId ? parseInt(departmentId, 10) : null) : existing.departmentId;

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (employeeId !== undefined) updateData.employeeId = employeeId.trim().toUpperCase();
    if (mobile !== undefined) updateData.mobile = mobile ? mobile.trim() : null;
    if (departmentId !== undefined) updateData.departmentId = cleanDeptId;
    if (status !== undefined) updateData.status = status;

    if (roleId) {
      updateData.roleId = parseInt(roleId, 10);
    } else if (roleName) {
      const roleObj = await userRepository.findRoleByName(roleName);
      if (roleObj) updateData.roleId = roleObj.id;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await userRepository.update(parseInt(id, 10), updateData);

    if (updateData.email) {
      try {
        const cleanEmail = updateData.email;
        const normalizedEmail = cleanEmail.toLowerCase();
        const existingEmpEmail = await employeeEmailRepository.findByNormalizedEmail(normalizedEmail, { includeDeleted: true });
        if (!existingEmpEmail) {
          await employeeEmailRepository.create({
            email: cleanEmail,
            normalizedEmail,
            departmentId: cleanDeptId,
            isActive: true,
          });
        } else if (existingEmpEmail.deletedAt !== null || !existingEmpEmail.isActive) {
          await employeeEmailRepository.update(existingEmpEmail.id, {
            deletedAt: null,
            isActive: true,
            departmentId: cleanDeptId || existingEmpEmail.departmentId,
          });
        }
      } catch (syncErr) {
        console.warn('Syncing user email to Employee Email Master warning:', syncErr.message);
      }
    }

    return updatedUser;
  }

  async getRoles() {
    return userRepository.findRoles();
  }

  async deleteUser(id) {
    const userId = parseInt(id, 10);
    const existing = await userRepository.findById(userId);
    if (!existing) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return userRepository.deleteUser(userId);
  }
}

export default new UserService();
