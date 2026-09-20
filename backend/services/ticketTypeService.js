import ticketTypeRepository from '../repositories/ticketTypeRepository.js';

export class TicketTypeService {
  async listTicketTypes({ page = 1, limit = 50, search = '', status = '' } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

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

    const [ticketTypes, total] = await Promise.all([
      ticketTypeRepository.findMany({ skip, take, where }),
      ticketTypeRepository.count(where),
    ]);

    return {
      ticketTypes,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async searchTicketTypes(query, limit = 20) {
    if (!query || query.trim() === '') {
      return ticketTypeRepository.findMany({ take: Math.min(50, parseInt(limit, 10)), where: { status: 'ACTIVE' } });
    }
    return ticketTypeRepository.search(query.trim(), { take: Math.min(50, parseInt(limit, 10)) });
  }

  async createTicketType({ name, description, status = 'ACTIVE' }) {
    if (!name || name.trim() === '') {
      const err = new Error('Ticket type name is required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await ticketTypeRepository.findByName(name.trim());
    if (existing) {
      const err = new Error('Ticket type with this name already exists');
      err.statusCode = 409;
      throw err;
    }

    return ticketTypeRepository.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      status: status || 'ACTIVE',
    });
  }

  async updateTicketType(id, { name, description, status }) {
    const existing = await ticketTypeRepository.findById(parseInt(id, 10));
    if (!existing) {
      const err = new Error('Ticket type not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
      const duplicate = await ticketTypeRepository.findByName(name.trim());
      if (duplicate && duplicate.id !== existing.id) {
        const err = new Error('Another ticket type already exists with this name');
        err.statusCode = 409;
        throw err;
      }
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;

    return ticketTypeRepository.update(parseInt(id, 10), updateData);
  }
}

export default new TicketTypeService();
