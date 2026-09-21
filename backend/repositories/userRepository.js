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

  async searchActiveUsers(query, limit = 20) {
    const clean = (query || '').trim();
    const where = {
      status: 'ACTIVE',
    };

    if (clean) {
      where.OR = [
        { name: { contains: clean } },
        { email: { contains: clean } },
        { employeeId: { contains: clean } },
      ];
    }

    return prisma.user.findMany({
      where,
      take: Math.min(50, Math.max(1, limit)),
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: {
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

  async deleteUser(id) {
    const userId = parseInt(id, 10);
    // Check if user has dependent tickets or comments
    const [createdTicketsCount, contactTicketsCount, assignedTicketsCount, commentsCount] = await Promise.all([
      prisma.ticket.count({ where: { createdBy: userId } }),
      prisma.ticket.count({ where: { contactId: userId } }),
      prisma.ticket.count({ where: { agentId: userId } }),
      prisma.ticketComment.count({ where: { userId } }),
    ]);

    if (createdTicketsCount > 0 || commentsCount > 0) {
      const err = new Error(
        `Cannot delete user because they have authored ${createdTicketsCount} ticket(s) and ${commentsCount} comment(s). You can change their status to INACTIVE instead.`
      );
      err.statusCode = 400;
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      // Unlink any tickets where user is contact or assigned agent
      if (contactTicketsCount > 0) {
        await tx.ticket.updateMany({
          where: { contactId: userId },
          data: { contactId: null },
        });
      }
      if (assignedTicketsCount > 0) {
        await tx.ticket.updateMany({
          where: { agentId: userId },
          data: { agentId: null },
        });
      }

      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.agentGroup.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } }).catch(() => {});
      return tx.user.delete({ where: { id: userId } });
    });
  }
}

export default new UserRepository();
