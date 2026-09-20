import { prisma } from '../config/database.js';

export class GroupRepository {
  async findMany({ skip = 0, take = 50, where = {} } = {}) {
    return prisma.group.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            agentGroups: true,
            tickets: true,
          },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.group.count({ where });
  }

  async findById(id) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        agentGroups: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findByName(name) {
    return prisma.group.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.group.create({ data });
  }

  async upsertGroup({ name, description, status = 'ACTIVE' }) {
    return prisma.group.upsert({
      where: { name },
      update: {
        description: description !== undefined ? description : undefined,
        status: status || 'ACTIVE',
      },
      create: {
        name,
        description: description || null,
        status: status || 'ACTIVE',
      },
    });
  }

  async update(id, data) {
    return prisma.group.update({
      where: { id },
      data,
    });
  }

  async search(query, { take = 20 } = {}) {
    return prisma.group.findMany({
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

  async findAgentsByGroupId(groupId, { search = '', skip = 0, take = 50 } = {}) {
    const whereUser = {
      status: 'ACTIVE',
    };
    if (search) {
      whereUser.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const agentMappings = await prisma.agentGroup.findMany({
      where: {
        groupId,
        user: whereUser,
      },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            mobile: true,
            department: { select: { id: true, name: true } },
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: {
        user: { name: 'asc' },
      },
    });

    const total = await prisma.agentGroup.count({
      where: {
        groupId,
        user: whereUser,
      },
    });

    return {
      agents: agentMappings.map((m) => m.user),
      total,
    };
  }
}

export default new GroupRepository();
