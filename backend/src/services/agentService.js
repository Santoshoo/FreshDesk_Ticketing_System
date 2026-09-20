import agentRepository from '../repositories/agentRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import userRepository from '../repositories/userRepository.js';

export class AgentService {
  async listAgents({ page = 1, limit = 50, search = '' } = {}) {
    return agentRepository.listAgents({ page, limit, search });
  }

  async getMyGroups(user) {
    const assigned = await agentRepository.getAgentGroups(user.id);
    if (assigned.length > 0) {
      return assigned;
    }

    // If Admin/SuperAdmin has no specific group assigned, provide active groups for flexibility
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      const allActive = await groupRepository.findMany({ where: { status: 'ACTIVE' }, take: 100 });
      return allActive;
    }

    // For AGENT or EMPLOYEE without groups, return empty array
    return [];
  }

  async updateAgentGroups(userId, groupIds, assignAgentRole = true) {
    const targetUserId = parseInt(userId, 10);
    const user = await userRepository.findById(targetUserId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    // If assignAgentRole is true, promote to AGENT if user is currently EMPLOYEE
    const updated = await agentRepository.updateAgentGroups(targetUserId, groupIds, assignAgentRole);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      employeeId: updated.employeeId,
      role: updated.role.name,
      groups: updated.agentGroups.map((ag) => ag.group),
    };
  }
}

export default new AgentService();
