import { prisma } from '../config/database.js';

export class TicketTypeRepository {
  async findMany({ skip = 0, take = 50, where = {} } = {}) {
    return prisma.ticketType.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.ticketType.count({ where });
  }

  async findById(id) {
    return prisma.ticketType.findUnique({
      where: { id },
    });
  }

  async findByName(name) {
    return prisma.ticketType.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.ticketType.create({ data });
  }

  async update(id, data) {
    return prisma.ticketType.update({
      where: { id },
      data,
    });
  }

  async search(query, { take = 20 } = {}) {
    return prisma.ticketType.findMany({
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

export default new TicketTypeRepository();
