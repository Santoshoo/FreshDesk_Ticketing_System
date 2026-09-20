import groupRepository from '../repositories/groupRepository.js';

export class GroupService {
  async listGroups({ page = 1, limit = 50, search = '', status = '' } = {}) {
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

    const [groups, total] = await Promise.all([
      groupRepository.findMany({ skip, take, where }),
      groupRepository.count(where),
    ]);

    return {
      groups,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async searchGroups(query, limit = 20) {
    if (!query || query.trim() === '') {
      return groupRepository.findMany({ take: Math.min(50, parseInt(limit, 10)), where: { status: 'ACTIVE' } });
    }
    return groupRepository.search(query.trim(), { take: Math.min(50, parseInt(limit, 10)) });
  }

  async createGroup({ name, description, status = 'ACTIVE' }) {
    if (!name || name.trim() === '') {
      const err = new Error('Group name is required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await groupRepository.findByName(name.trim());
    if (existing) {
      const err = new Error('Group with this name already exists');
      err.statusCode = 409;
      throw err;
    }

    return groupRepository.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      status: status || 'ACTIVE',
    });
  }

  async bulkCreateGroups(groupsList = []) {
    if (!Array.isArray(groupsList) || groupsList.length === 0) {
      const err = new Error('No valid group records provided for bulk import');
      err.statusCode = 400;
      throw err;
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < groupsList.length; i++) {
      const item = groupsList[i];
      const rawName = item.name || item['Group Name'] || item['group_name'] || item['Name'];

      if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
        errors.push({ row: i + 1, error: 'Group name is missing or invalid' });
        continue;
      }

      const name = rawName.trim();
      const rawDesc = item.description || item['Description'] || item['desc'] || '';
      const description = typeof rawDesc === 'string' ? rawDesc.trim() : null;
      const rawStatus = (item.status || item['Status'] || 'ACTIVE').toUpperCase().trim();
      const status = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

      try {
        const saved = await groupRepository.upsertGroup({ name, description, status });
        results.push(saved);
      } catch (err) {
        errors.push({ row: i + 1, group: name, error: err.message });
      }
    }

    return {
      importedCount: results.length,
      errorCount: errors.length,
      importedGroups: results,
      errors,
    };
  }

  async updateGroup(id, { name, description, status }) {
    const existing = await groupRepository.findById(parseInt(id, 10));
    if (!existing) {
      const err = new Error('Group not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
      const duplicate = await groupRepository.findByName(name.trim());
      if (duplicate && duplicate.id !== existing.id) {
        const err = new Error('Another group already exists with this name');
        err.statusCode = 409;
        throw err;
      }
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;

    return groupRepository.update(parseInt(id, 10), updateData);
  }

  async getAgentsByGroup(groupId, { search = '', page = 1, limit = 50 } = {}) {
    const group = await groupRepository.findById(parseInt(groupId, 10));
    if (!group) {
      const err = new Error('Group not found');
      err.statusCode = 404;
      throw err;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const { agents, total } = await groupRepository.findAgentsByGroupId(parseInt(groupId, 10), {
      search,
      skip,
      take,
    });

    return {
      agents,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}

export default new GroupService();
