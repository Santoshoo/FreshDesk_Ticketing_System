import employeeEmailRepository from '../repositories/employeeEmailRepository.js';
import userRepository from '../repositories/userRepository.js';
import departmentRepository from '../repositories/departmentRepository.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmployeeEmailService {
  async listEmails({ page = 1, limit = 20, search = '', departmentId = '', status = '' } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where = {
      deletedAt: null,
    };

    if (search && search.trim()) {
      const cleanSearch = search.trim().toLowerCase();
      where.OR = [
        { email: { contains: cleanSearch } },
        { normalizedEmail: { contains: cleanSearch } },
        { department: { name: { contains: cleanSearch } } },
      ];
    }

    if (departmentId) {
      where.departmentId = parseInt(departmentId, 10);
    }

    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    const [emails, total] = await Promise.all([
      employeeEmailRepository.findMany({ skip, take: pageSize, where }),
      employeeEmailRepository.count(where),
    ]);

    return {
      emails,
      pagination: {
        page: pageNum,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async getEmailById(id) {
    const email = await employeeEmailRepository.findById(id);
    if (!email || email.deletedAt !== null) {
      const err = new Error('Employee email not found');
      err.statusCode = 404;
      throw err;
    }
    return email;
  }

  async createEmail({ email, departmentId, isActive = true }) {
    if (!email || !email.trim()) {
      const err = new Error('Email address is required');
      err.statusCode = 400;
      throw err;
    }

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const err = new Error('Invalid email address format');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = trimmedEmail.toLowerCase();



    // 2. Check if email already exists in Employee Email Master (active or non-deleted)
    const existingEmail = await employeeEmailRepository.findByNormalizedEmail(normalizedEmail);
    if (existingEmail) {
      const err = new Error('The email is already created in Employee Email Master');
      err.statusCode = 409;
      throw err;
    }

    // 3. Validate department if provided
    let cleanDepartmentId = null;
    if (departmentId) {
      cleanDepartmentId = parseInt(departmentId, 10);
      const dept = await departmentRepository.findById(cleanDepartmentId);
      if (!dept) {
        const err = new Error('Selected department does not exist');
        err.statusCode = 400;
        throw err;
      }
    }

    return employeeEmailRepository.create({
      email: trimmedEmail,
      normalizedEmail,
      departmentId: cleanDepartmentId,
      isActive: Boolean(isActive),
    });
  }

  async updateEmail(id, { email, departmentId, isActive }) {
    const existing = await this.getEmailById(id);

    const updateData = {};

    if (email !== undefined) {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        const err = new Error('Email cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        const err = new Error('Invalid email format');
        err.statusCode = 400;
        throw err;
      }

      const normalized = trimmedEmail.toLowerCase();
      if (normalized !== existing.normalizedEmail) {
        // Check User Master conflict
        const existingUser = await userRepository.findByEmail(normalized);
        if (existingUser) {
          const err = new Error('The email is already registered in the system (already exists in User Master)');
          err.statusCode = 409;
          throw err;
        }

        // Check Employee Email Master duplicate
        const duplicate = await employeeEmailRepository.findByNormalizedEmail(normalized);
        if (duplicate && duplicate.id !== existing.id) {
          const err = new Error('The email is already registered in Employee Email Master');
          err.statusCode = 409;
          throw err;
        }

        updateData.email = trimmedEmail;
        updateData.normalizedEmail = normalized;
      }
    }

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === '') {
        updateData.departmentId = null;
      } else {
        const cleanDeptId = parseInt(departmentId, 10);
        const dept = await departmentRepository.findById(cleanDeptId);
        if (!dept) {
          const err = new Error('Selected department does not exist');
          err.statusCode = 400;
          throw err;
        }
        updateData.departmentId = cleanDeptId;
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    return employeeEmailRepository.update(id, updateData);
  }

  async setStatus(id, isActive) {
    await this.getEmailById(id);
    return employeeEmailRepository.update(id, {
      isActive: Boolean(isActive),
    });
  }

  async deleteEmail(id) {
    await this.getEmailById(id);
    return employeeEmailRepository.softDelete(id);
  }
}

export default new EmployeeEmailService();
