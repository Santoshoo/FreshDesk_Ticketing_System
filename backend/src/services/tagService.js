import tagRepository from '../repositories/tagRepository.js';

export class TagService {
  async listTags({ page = 1, limit = 50, search = '' } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {};
    if (search) {
      where.name = { contains: search };
    }

    const [tags, total] = await Promise.all([
      tagRepository.findMany({ skip, take, where }),
      tagRepository.count(where),
    ]);

    return {
      tags,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async searchTags(query, limit = 20) {
    if (!query || query.trim() === '') {
      return tagRepository.findMany({ take: Math.min(50, parseInt(limit, 10)) });
    }
    return tagRepository.search(query.trim(), { take: Math.min(50, parseInt(limit, 10)) });
  }

  async createTag({ name }) {
    if (!name || name.trim() === '') {
      const err = new Error('Tag name is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanName = name.trim().toUpperCase();
    const existing = await tagRepository.findByName(cleanName);
    if (existing) {
      const err = new Error('Tag with this name already exists');
      err.statusCode = 409;
      throw err;
    }

    return tagRepository.create({
      name: cleanName,
    });
  }

  async updateTag(id, { name }) {
    const existing = await tagRepository.findById(parseInt(id, 10));
    if (!existing) {
      const err = new Error('Tag not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (name !== undefined) {
      const cleanName = name.trim().toUpperCase();
      const duplicate = await tagRepository.findByName(cleanName);
      if (duplicate && duplicate.id !== existing.id) {
        const err = new Error('Another tag already exists with this name');
        err.statusCode = 409;
        throw err;
      }
      updateData.name = cleanName;
    }

    return tagRepository.update(parseInt(id, 10), updateData);
  }
}

export default new TagService();
