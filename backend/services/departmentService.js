import departmentRepository from '../repositories/departmentRepository.js';

export class DepartmentService {
  async listDepartments({ page = 1, limit = 50, search = '', status = '' } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(1000, Math.max(1, parseInt(limit, 10)));

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [departments, total] = await Promise.all([
      departmentRepository.findMany({ skip, take, where }),
      departmentRepository.count(where),
    ]);

    return {
      departments,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async searchDepartments(query, limit = 20) {
    if (!query || query.trim() === '') {
      return departmentRepository.findMany({ take: Math.min(50, parseInt(limit, 10)), where: { status: 'ACTIVE' } });
    }
    return departmentRepository.search(query.trim(), { take: Math.min(50, parseInt(limit, 10)) });
  }

  async createDepartment({ name, description, status = 'ACTIVE' }) {
    if (!name || name.trim() === '') {
      const err = new Error('Department name is required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await departmentRepository.findByName(name.trim());
    if (existing) {
      const err = new Error('Department with this name already exists');
      err.statusCode = 409;
      throw err;
    }

    return departmentRepository.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      status: status || 'ACTIVE',
    });
  }

  async updateDepartment(id, { name, description, status }) {
    const existing = await departmentRepository.findById(parseInt(id, 10));
    if (!existing) {
      const err = new Error('Department not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
      const duplicate = await departmentRepository.findByName(name.trim());
      if (duplicate && duplicate.id !== existing.id) {
        const err = new Error('Another department already exists with this name');
        err.statusCode = 409;
        throw err;
      }
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;

    return departmentRepository.update(parseInt(id, 10), updateData);
  }
}

export default new DepartmentService();
