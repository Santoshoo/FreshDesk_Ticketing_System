import bcrypt from 'bcryptjs';
import userRepository from '../repositories/userRepository.js';
import departmentRepository from '../repositories/departmentRepository.js';
import employeeEmailRepository from '../repositories/employeeEmailRepository.js';

export class UserService {
  async listUsers({ page = 1, limit = 50, search = '', role = '', departmentId = null, sortBy = 'id', sortOrder = 'asc' } = {}) {
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

    const validSortFields = ['id', 'name', 'email', 'employeeId', 'createdAt', 'status'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    const orderBy = { [safeSortBy]: safeSortOrder };

    const [users, total] = await Promise.all([
      userRepository.findMany({ skip, take, where, orderBy }),
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

  async bulkUploadUsers(records = []) {
    if (!Array.isArray(records) || records.length === 0) {
      const err = new Error('No user records provided for bulk import');
      err.statusCode = 400;
      throw err;
    }

    if (records.length > 10000) {
      const err = new Error('Maximum 10,000 users allowed per bulk import batch');
      err.statusCode = 400;
      throw err;
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Fetch departments and roles for fast O(1) in-memory resolution
    const [depts, roles] = await Promise.all([
      departmentRepository.findMany({ take: 1000 }),
      userRepository.findRoles(),
    ]);

    const deptMap = new Map();
    let itDepartmentId = null;

    for (const d of depts) {
      const clean = (d.name || '').trim().toLowerCase();
      deptMap.set(clean, d.id);
      deptMap.set(String(d.id), d.id);
      if (
        !itDepartmentId &&
        (clean === 'it department' ||
          clean === 'it dept.' ||
          clean === 'it' ||
          clean === 'information technology' ||
          clean.startsWith('it ') ||
          clean.startsWith('it-'))
      ) {
        itDepartmentId = d.id;
      }
    }
    if (!itDepartmentId && depts.length > 0) {
      itDepartmentId = depts[0].id;
    }

    const roleMap = new Map();
    let agentRoleId = null;
    let employeeRoleId = null;

    for (const r of roles) {
      const upper = (r.name || '').trim().toUpperCase();
      roleMap.set(upper, r.id);
      roleMap.set(String(r.id), r.id);
      if (upper === 'AGENT') agentRoleId = r.id;
      if (upper === 'EMPLOYEE') employeeRoleId = r.id;
    }

    // Default password hash (pre-computed once for maximum throughput)
    const defaultPasswordHash = await bcrypt.hash('Kims@123', 10);

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    const processedUsers = [];

    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      const rowNum = index + 1;

      const rawName = row.name || row.Name || row['employee_name'] || row['Employee Name'] || '';
      const rawEmail = row.email || row.Email || row.emailid || row['emailid'] || row['Email ID'] || row['Email'] || '';
      const rawEmpId = row.empid || row.empId || row.employeeId || row.EmployeeId || row['Employee ID'] || row['Emp ID'] || row['empid'] || '';
      const rawDept = row.dept || row.deptName || row['dept name'] || row.department || row['Department'] || row['Department Name'] || '';
      const rawRole = row.role || row.Role || row['role'] || row['Role Name'] || '';
      const rawStatus = row.status !== undefined ? row.status : (row.Status !== undefined ? row.Status : 'ACTIVE');
      const rawMobile = row.mobile || row.Mobile || row.phone || row['Phone Number'] || null;

      const trimmedEmail = typeof rawEmail === 'string' ? rawEmail.trim() : '';
      const trimmedEmpId = typeof rawEmpId === 'string' ? rawEmpId.trim() : (rawEmpId ? String(rawEmpId).trim() : '');
      const trimmedName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : (trimmedEmail ? trimmedEmail.split('@')[0] : '');

      if (!trimmedEmail) {
        errors.push({ row: rowNum, name: trimmedName, email: '', error: 'Email address is missing' });
        continue;
      }

      if (!EMAIL_REGEX.test(trimmedEmail)) {
        errors.push({ row: rowNum, name: trimmedName, email: trimmedEmail, error: 'Invalid email address format' });
        continue;
      }

      if (!trimmedEmpId) {
        errors.push({ row: rowNum, name: trimmedName, email: trimmedEmail, error: 'Employee ID (empid) is missing' });
        continue;
      }

      const normalizedEmail = trimmedEmail.toLowerCase();
      const normalizedEmpId = trimmedEmpId.toUpperCase();

      // Resolve department
      let departmentId = itDepartmentId;
      if (typeof rawDept === 'string' && rawDept.trim()) {
        const cleanDept = rawDept.trim().toLowerCase();
        if (deptMap.has(cleanDept)) {
          departmentId = deptMap.get(cleanDept);
        } else if (deptMap.has(String(rawDept).trim())) {
          departmentId = deptMap.get(String(rawDept).trim());
        }
      } else if (typeof rawDept === 'number' && deptMap.has(String(rawDept))) {
        departmentId = deptMap.get(String(rawDept));
      }

      // Resolve role
      let roleId = null;
      if (typeof rawRole === 'string' && rawRole.trim()) {
        const cleanRole = rawRole.trim().toUpperCase();
        if (roleMap.has(cleanRole)) {
          roleId = roleMap.get(cleanRole);
        }
      } else if (typeof rawRole === 'number' && roleMap.has(String(rawRole))) {
        roleId = roleMap.get(String(rawRole));
      }

      // Default role logic: if department is IT Department or user has AGENT in name/role, default to AGENT, else EMPLOYEE
      if (!roleId) {
        if (departmentId === itDepartmentId) {
          roleId = agentRoleId || employeeRoleId;
        } else {
          roleId = employeeRoleId || agentRoleId;
        }
      }

      // Resolve status
      let finalStatus = 'ACTIVE';
      if (typeof rawStatus === 'string') {
        const upperStatus = rawStatus.trim().toUpperCase();
        if (upperStatus === 'INACTIVE' || upperStatus === 'FALSE' || upperStatus === 'DISABLED') {
          finalStatus = 'INACTIVE';
        }
      } else if (rawStatus === false) {
        finalStatus = 'INACTIVE';
      }

      try {
        // Check if user exists by email or employeeId
        let existingUser = await userRepository.findByEmail(normalizedEmail);
        if (!existingUser) {
          existingUser = await userRepository.findByEmployeeId(normalizedEmpId);
        }

        if (existingUser) {
          // Update existing user
          const updated = await userRepository.update(existingUser.id, {
            name: trimmedName,
            email: normalizedEmail,
            employeeId: normalizedEmpId,
            departmentId: departmentId,
            roleId: roleId,
            status: finalStatus,
            mobile: rawMobile ? String(rawMobile).trim() : existingUser.mobile,
          });
          updatedCount++;
          processedUsers.push({ id: updated.id, email: updated.email, name: updated.name, action: 'UPDATED' });
        } else {
          // Create new user
          const created = await userRepository.create({
            name: trimmedName,
            email: normalizedEmail,
            employeeId: normalizedEmpId,
            departmentId: departmentId,
            roleId: roleId,
            status: finalStatus,
            passwordHash: defaultPasswordHash,
            mobile: rawMobile ? String(rawMobile).trim() : null,
          });
          createdCount++;
          processedUsers.push({ id: created.id, email: created.email, name: created.name, action: 'CREATED' });
        }

        // Sync to EmployeeEmailMaster
        try {
          const existingEmpEmail = await employeeEmailRepository.findByNormalizedEmail(normalizedEmail, { includeDeleted: true });
          if (!existingEmpEmail) {
            await employeeEmailRepository.create({
              email: trimmedEmail,
              normalizedEmail,
              departmentId,
              isActive: finalStatus === 'ACTIVE',
            });
          } else if (existingEmpEmail.deletedAt !== null || !existingEmpEmail.isActive) {
            await employeeEmailRepository.update(existingEmpEmail.id, {
              deletedAt: null,
              isActive: finalStatus === 'ACTIVE',
              departmentId: departmentId || existingEmpEmail.departmentId,
            });
          }
        } catch (syncErr) {
          console.warn('Sync email error during bulk user upload:', syncErr.message);
        }
      } catch (rowErr) {
        console.error(`Row ${rowNum} bulk upload error:`, rowErr.message);
        errors.push({
          row: rowNum,
          name: trimmedName,
          email: trimmedEmail,
          error: rowErr.message || 'Database error processing user row',
        });
      }
    }

    return {
      total: records.length,
      created: createdCount,
      updated: updatedCount,
      failed: errors.length,
      errors,
      processed: processedUsers,
    };
  }
}

export default new UserService();
