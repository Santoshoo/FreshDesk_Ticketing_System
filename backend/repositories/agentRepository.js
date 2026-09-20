import { prisma } from '../config/database.js';

export class AgentRepository {
  async listAgents({ page = 1, limit = 50, search = '' } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {
      role: {
        name: { in: ['AGENT', 'ADMIN', 'SUPER_ADMIN'] },
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
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
          agentGroups: {
            select: {
              group: {
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      agents: agents.map((agent) => ({
        ...agent,
        groups: agent.agentGroups.map((ag) => ag.group),
      })),
      total,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getAgentGroups(userId) {
    const mappings = await prisma.agentGroup.findMany({
      where: {
        userId,
        group: { status: 'ACTIVE' },
      },
      include: {
        group: true,
      },
      orderBy: {
        group: { name: 'asc' },
      },
    });

    return mappings.map((m) => m.group);
  }

  async isUserInGroup(userId, groupId) {
    const mapping = await prisma.agentGroup.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });
    return !!mapping;
  }

  async updateAgentGroups(userId, groupIds, makeAgent = true) {
    return prisma.$transaction(async (tx) => {
      // 1. Optionally ensure user has AGENT role if not ADMIN/SUPER_ADMIN
      if (makeAgent) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { role: true },
        });
        if (user && user.role.name === 'EMPLOYEE') {
          const agentRole = await tx.role.findUnique({ where: { name: 'AGENT' } });
          if (agentRole) {
            await tx.user.update({
              where: { id: userId },
              data: { roleId: agentRole.id },
            });
          }
        }
      }

      // 2. Remove all existing group mappings for user
      await tx.agentGroup.deleteMany({
        where: { userId },
      });

      // 3. Insert new group mappings
      if (groupIds && groupIds.length > 0) {
        const data = groupIds.map((groupId) => ({
          userId,
          groupId: parseInt(groupId, 10),
        }));

        await tx.agentGroup.createMany({
          data,
          skipDuplicates: true,
        });
      }

      // Return updated agent with groups
      return tx.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          department: true,
          agentGroups: {
            include: { group: true },
          },
        },
      });
    });
  }
}

export default new AgentRepository();
