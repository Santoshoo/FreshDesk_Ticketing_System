import { prisma } from '../config/database.js';

export class EmployeeEmailRepository {
  async findMany({ skip = 0, take = 20, where = {} } = {}) {
    return prisma.employeeEmail.findMany({
      where,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.employeeEmail.count({ where });
  }

  async findById(id) {
    const numericId = parseInt(id, 10);
    return prisma.employeeEmail.findUnique({
      where: { id: numericId },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findByNormalizedEmail(normalizedEmail, { includeDeleted = false } = {}) {
    const where = { normalizedEmail };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return prisma.employeeEmail.findFirst({
      where,
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async create(data) {
    return prisma.employeeEmail.create({
      data,
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(id, data) {
    const numericId = parseInt(id, 10);
    return prisma.employeeEmail.update({
      where: { id: numericId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async softDelete(id) {
    const numericId = parseInt(id, 10);
    return prisma.employeeEmail.update({
      where: { id: numericId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async searchActive(query = '', limit = 20) {
    const cleanQuery = query.trim().toLowerCase();
    const where = {
      isActive: true,
      deletedAt: null,
    };

    if (cleanQuery) {
      where.OR = [
        { name: { contains: cleanQuery } },
        { normalizedEmail: { contains: cleanQuery } },
        { department: { name: { contains: cleanQuery } } },
      ];
    }

    return prisma.employeeEmail.findMany({
      where,
      take: Math.min(50, Math.max(1, limit)),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        normalizedEmail: true,
        departmentId: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }
}

export default new EmployeeEmailRepository();
