import agentService from '../services/agentService.js';

export class AgentController {
  async list(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const result = await agentService.listAgents({ page, limit, search });
      res.json({ success: true, data: result.agents, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getMyGroups(req, res, next) {
    try {
      const groups = await agentService.getMyGroups(req.user);
      res.json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }

  async updateAgentGroups(req, res, next) {
    try {
      const { id } = req.params;
      const { groupIds, assignAgentRole } = req.body;
      const updated = await agentService.updateAgentGroups(id, groupIds, assignAgentRole);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export default new AgentController();
