import groupService from '../services/groupService.js';

export class GroupController {
  async list(req, res, next) {
    try {
      const { page, limit, search, status } = req.query;
      const result = await groupService.listGroups({ page, limit, search, status });
      res.json({ success: true, data: result.groups, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const groups = await groupService.searchGroups(q, limit);
      res.json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const group = await groupService.createGroup(req.body);
      res.status(201).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreate(req, res, next) {
    try {
      const { groups } = req.body;
      const result = await groupService.bulkCreateGroups(groups);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const group = await groupService.updateGroup(req.params.id, req.body);
      res.json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async getAgentsByGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const { search, page, limit } = req.query;
      const result = await groupService.getAgentsByGroup(groupId, { search, page, limit });
      res.json({ success: true, data: result.agents, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
}

export default new GroupController();
