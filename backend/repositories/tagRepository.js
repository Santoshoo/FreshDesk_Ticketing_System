import { prisma } from '../config/database.js';

export class TagRepository {
  async findMany({ skip = 0, take = 50, where = {} } = {}) {
    return prisma.tag.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { ticketTags: true },
        },
      },
    });
  }

  async count(where = {}) {
    return prisma.tag.count({ where });
  }

  async findById(id) {
    return prisma.tag.findUnique({
      where: { id },
    });
  }

  async findByName(name) {
    return prisma.tag.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.tag.create({ data });
  }

  async update(id, data) {
    return prisma.tag.update({
      where: { id },
      data,
    });
  }

  async search(query, { take = 20 } = {}) {
    return prisma.tag.findMany({
      where: {
        name: { contains: query },
      },
      take,
      orderBy: { name: 'asc' },
    });
  }
}

export default new TagRepository();
