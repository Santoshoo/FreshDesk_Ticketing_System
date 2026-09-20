import { prisma } from '../config/database.js';

export class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        department: true,
      },
    });
  }

  async findByEmployeeId(employeeId) {
    return prisma.user.findUnique({
      where: { employeeId },
      include: {
        role: true,
        department: true,
      },
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        department: true,
        agentGroups: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.user.create({
      data,
      include: {
        role: true,
        department: true,
      },
    });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        department: true,
      },
    });
  }

  async findMany({ skip = 0, take = 50, where = {} } = {}) {
    return prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        mobile: true,
        status: true,
        departmentId: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: { id: true, name: true },
        },
        role: {
          select: { id: true, name: true, description: true },
        },
        agentGroups: {
          select: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.user.count({ where });
  }

  async search(query, { take = 20 } = {}) {
    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { employeeId: { contains: query } },
        ],
      },
      take,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        mobile: true,
        status: true,
        department: {
          select: { id: true, name: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findRoles() {
    return prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findRoleByName(name) {
    return prisma.role.findUnique({
      where: { name },
    });
  }
}

export default new UserRepository();
