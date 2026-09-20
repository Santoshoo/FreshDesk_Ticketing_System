import { prisma } from '../config/database.js';

export class DepartmentRepository {
  async findMany({ skip = 0, take = 50, where = {} } = {}) {
    return prisma.department.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.department.count({ where });
  }

  async findById(id) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findByName(name) {
    return prisma.department.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.department.create({ data });
  }

  async update(id, data) {
    return prisma.department.update({
      where: { id },
      data,
    });
  }

  async search(query, { take = 20 } = {}) {
    return prisma.department.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });
  }
}

export default new DepartmentRepository();
