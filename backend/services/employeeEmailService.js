import { prisma } from '../config/database.js';
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
        { name: { contains: cleanSearch } },
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

  async createEmail({ name, email, departmentId, isActive = true }) {
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
    const trimmedName = name && typeof name === 'string' && name.trim() ? name.trim() : null;

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
      name: trimmedName,
      email: trimmedEmail,
      normalizedEmail,
      departmentId: cleanDepartmentId,
      isActive: Boolean(isActive),
    });
  }

  async updateEmail(id, { name, email, departmentId, isActive }) {
    const existing = await this.getEmailById(id);

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name && typeof name === 'string' && name.trim() ? name.trim() : null;
    }

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

  async bulkUpload(records = []) {
    if (!Array.isArray(records) || records.length === 0) {
      const err = new Error('No records provided for bulk upload');
      err.statusCode = 400;
      throw err;
    }

    if (records.length > 50000) {
      const err = new Error('Maximum 50,000 records allowed per bulk upload');
      err.statusCode = 400;
      throw err;
    }

    // 1. Load active departments once for fast in-memory name matching
    const depts = await departmentRepository.findMany({ take: 1000 });
    const deptMap = new Map();
    for (const d of depts) {
      deptMap.set(d.name.trim().toLowerCase(), d.id);
    }

    // 2. Validate rows in memory
    const validRows = [];
    const errors = [];

    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      const rowNum = index + 1;

      const rawName = row.name || row.Name || row['Employee Name'] || row.employee_name || '';
      const rawEmail = row.emailid || row.email || row.emailId || row['emailid'] || row['Email ID'] || row['Email'] || '';
      const rawDept = row['dept name'] || row.departmentName || row.deptName || row['Department Name'] || row['Department'] || row['dept anem'] || row.dept || '';
      const rawStatus = row.status !== undefined ? row.status : (row['status'] !== undefined ? row['status'] : (row['Status'] !== undefined ? row['Status'] : true));

      const trimmedName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null;
      const trimmedEmail = typeof rawEmail === 'string' ? rawEmail.trim() : '';

      if (!trimmedEmail) {
        errors.push({ row: rowNum, email: '', error: 'Email address is missing' });
        continue;
      }

      if (!EMAIL_REGEX.test(trimmedEmail)) {
        errors.push({ row: rowNum, email: trimmedEmail, error: 'Invalid email address format' });
        continue;
      }

      const normalizedEmail = trimmedEmail.toLowerCase();

      // Resolve department
      let departmentId = null;
      if (row.departmentId) {
        departmentId = parseInt(row.departmentId, 10);
      } else if (typeof rawDept === 'string' && rawDept.trim()) {
        const cleanDeptName = rawDept.trim();
        const lowerDept = cleanDeptName.toLowerCase();
        if (deptMap.has(lowerDept)) {
          departmentId = deptMap.get(lowerDept);
        } else {
          try {
            const newDept = await departmentRepository.create({
              name: cleanDeptName,
              status: 'ACTIVE',
            });
            departmentId = newDept.id;
            deptMap.set(lowerDept, departmentId);
          } catch (deptErr) {
            const existingDept = await departmentRepository.findByName(cleanDeptName);
            if (existingDept) {
              departmentId = existingDept.id;
              deptMap.set(lowerDept, departmentId);
            }
          }
        }
      }

      // Determine active status
      let isActive = true;
      if (typeof rawStatus === 'boolean') {
        isActive = rawStatus;
      } else if (typeof rawStatus === 'string') {
        const lower = rawStatus.trim().toLowerCase();
        if (['inactive', 'false', '0', 'disabled', 'no'].includes(lower)) {
          isActive = false;
        }
      } else if (rawStatus === 0) {
        isActive = false;
      }

      validRows.push({
        rowNum,
        name: trimmedName,
        email: trimmedEmail,
        normalizedEmail,
        departmentId,
        isActive,
      });
    }

    // 3. Batch query existing records from DB in chunks of 1000
    const normalizedEmailList = Array.from(new Set(validRows.map((r) => r.normalizedEmail)));
    const existingMap = new Map();
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < normalizedEmailList.length; i += CHUNK_SIZE) {
      const emailChunk = normalizedEmailList.slice(i, i + CHUNK_SIZE);
      const existingRecords = await prisma.employeeEmail.findMany({
        where: { normalizedEmail: { in: emailChunk } },
        select: { id: true, name: true, normalizedEmail: true, departmentId: true, isActive: true },
      });
      for (const rec of existingRecords) {
        existingMap.set(rec.normalizedEmail, rec);
      }
    }

    // 4. Classify into toCreate and toUpdate (deduplicating within the batch)
    const toCreate = [];
    const toUpdate = [];
    const processedInBatch = new Set();

    for (const item of validRows) {
      if (processedInBatch.has(item.normalizedEmail)) {
        continue;
      }
      processedInBatch.add(item.normalizedEmail);

      const existing = existingMap.get(item.normalizedEmail);
      if (existing) {
        toUpdate.push({
          id: existing.id,
          data: {
            name: item.name || existing.name,
            email: item.email,
            departmentId: item.departmentId !== null ? item.departmentId : existing.departmentId,
            isActive: item.isActive,
            deletedAt: null,
            updatedAt: new Date(),
          },
        });
      } else {
        toCreate.push({
          name: item.name,
          email: item.email,
          normalizedEmail: item.normalizedEmail,
          departmentId: item.departmentId,
          isActive: item.isActive,
        });
      }
    }

    // 5. Execute batch creation with createMany (ultra fast in MySQL)
    let createdCount = 0;
    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        const createChunk = toCreate.slice(i, i + CHUNK_SIZE);
        await prisma.employeeEmail.createMany({
          data: createChunk,
          skipDuplicates: true,
        });
      }
      createdCount = toCreate.length;
    }

    // 6. Execute updates in concurrent batches of 50
    let updatedCount = 0;
    if (toUpdate.length > 0) {
      const UPDATE_BATCH = 50;
      for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
        const updateChunk = toUpdate.slice(i, i + UPDATE_BATCH);
        await Promise.all(
          updateChunk.map((u) =>
            prisma.employeeEmail.update({
              where: { id: u.id },
              data: u.data,
            })
          )
        );
      }
      updatedCount = toUpdate.length;
    }

    return {
      total: records.length,
      created: createdCount,
      updated: updatedCount,
      failed: errors.length,
      errors,
    };
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
