import { prisma } from '../config/database.js';
import { generateNextTicketNumber } from '../utils/ticketNumber.js';
import ticketRepository from '../repositories/ticketRepository.js';
import userRepository from '../repositories/userRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import ticketTypeRepository from '../repositories/ticketTypeRepository.js';
import agentRepository from '../repositories/agentRepository.js';

export class TicketService {
  async createTicket(creatorUser, {
    contactId,
    subject,
    ticketTypeId,
    status = 'OPEN',
    groupId,
    agentId = null,
    description,
  }) {
    if (!contactId) {
      const err = new Error('Contact is required');
      err.statusCode = 400;
      throw err;
    }
    if (!subject || subject.trim() === '') {
      const err = new Error('Subject is required');
      err.statusCode = 400;
      throw err;
    }
    if (!ticketTypeId) {
      const err = new Error('Ticket Type is required');
      err.statusCode = 400;
      throw err;
    }
    if (!groupId) {
      const err = new Error('Group is required');
      err.statusCode = 400;
      throw err;
    }
    if (!description || description.trim() === '') {
      const err = new Error('Description is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanContactId = parseInt(contactId, 10);
    const cleanTicketTypeId = parseInt(ticketTypeId, 10);
    const cleanGroupId = parseInt(groupId, 10);
    const cleanAgentId = agentId ? parseInt(agentId, 10) : null;

    // Validate Contact
    const contact = await userRepository.findById(cleanContactId);
    if (!contact) {
      const err = new Error('Selected contact not found in User Master');
      err.statusCode = 400;
      throw err;
    }

    // Contact verified in User Master

    // Validate Ticket Type
    const ticketType = await ticketTypeRepository.findById(cleanTicketTypeId);
    if (!ticketType || ticketType.status !== 'ACTIVE') {
      const err = new Error('Selected ticket type is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    // Validate Group
    const group = await groupRepository.findById(cleanGroupId);
    if (!group || group.status !== 'ACTIVE') {
      const err = new Error('Selected group is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    // Validate Selected Agent belongs to Group
    if (cleanAgentId) {
      const isAgentInGroup = await agentRepository.isUserInGroup(cleanAgentId, cleanGroupId);
      if (!isAgentInGroup) {
        const err = new Error('The selected agent does not belong to the chosen group');
        err.statusCode = 400;
        throw err;
      }
    }

    const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
    const finalStatus = allowedStatuses.includes(status) ? status : 'OPEN';

    // Atomic Database Transaction
    return prisma.$transaction(async (tx) => {
      const ticketNumber = await generateNextTicketNumber(tx);

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          contactId: cleanContactId,
          subject: subject.trim(),
          ticketTypeId: cleanTicketTypeId,
          status: finalStatus,
          groupId: cleanGroupId,
          agentId: cleanAgentId,
          createdBy: creatorUser.id,
          description: description.trim(),
        },
      });

      await tx.ticketComment.create({
        data: {
          ticketId: ticket.id,
          userId: creatorUser.id,
          commentType: 'REPLY',
          body: description.trim(),
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          oldStatus: finalStatus,
          newStatus: finalStatus,
          changedBy: creatorUser.id,
        },
      });

      await tx.ticketAssignmentHistory.create({
        data: {
          ticketId: ticket.id,
          oldGroupId: null,
          newGroupId: cleanGroupId,
          oldAgentId: null,
          newAgentId: cleanAgentId,
          changedBy: creatorUser.id,
        },
      });

      return ticket;
    });
  }

  async listTickets(user, { page = 1, limit = 50, search = '', status = '', groupId = '', agentId = '', scope = 'all' } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {};

    if (search) {
      const cleanSearch = search.replace(/^#/, '').trim();
      where.OR = [
        { ticketNumber: { contains: cleanSearch } },
        { subject: { contains: search.trim() } },
        { contact: { name: { contains: search.trim() } } },
        { contact: { email: { contains: search.trim() } } },
        { contact: { employeeId: { contains: search.trim() } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (groupId) {
      where.groupId = parseInt(groupId, 10);
    }

    if (agentId) {
      where.agentId = parseInt(agentId, 10);
    }

    if (scope === 'my') {
      where.OR = [
        { contactId: user.id },
        { agentId: user.id },
        { createdBy: user.id },
      ];
    } else if (user.role === 'EMPLOYEE') {
      where.OR = [
        { contactId: user.id },
        { createdBy: user.id },
      ];
    }

    const [tickets, total] = await Promise.all([
      ticketRepository.findMany({ skip, take, where }),
      ticketRepository.count(where),
    ]);

    return {
      tickets,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getTicketById(user, id) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'EMPLOYEE' && ticket.contactId !== user.id && ticket.createdBy !== user.id) {
      const err = new Error('Forbidden: You do not have permission to view this ticket');
      err.statusCode = 403;
      throw err;
    }

    return ticket;
  }

  async updateTicket(user, ticketId, { subject, description, ticketTypeId, groupId, agentId, status }) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    // Role check: Agents, Admins, Super Admins can access update
    if (user.role === 'EMPLOYEE') {
      const err = new Error('Forbidden: Only support agents and administrators can modify ticket records');
      err.statusCode = 403;
      throw err;
    }

    // Agent constraint: Agents can ONLY modify ticket status, not subject, description, type, or assignment
    if (user.role === 'AGENT' && (subject || description || ticketTypeId || groupId || agentId !== undefined)) {
      const err = new Error('Forbidden: Support Agents are only authorized to update ticket status. Other ticket modifications require Administrator privileges.');
      err.statusCode = 403;
      throw err;
    }

    const updateData = {};
    if (user.role !== 'AGENT') {
      if (subject) updateData.subject = subject.trim();
      if (description) updateData.description = description.trim();
      if (ticketTypeId) updateData.ticketTypeId = parseInt(ticketTypeId, 10);
      if (groupId) updateData.groupId = parseInt(groupId, 10);
      if (agentId !== undefined) {
        updateData.agentId = agentId ? parseInt(agentId, 10) : null;
      }
    }

    if (status) {
      const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
      if (allowedStatuses.includes(status)) {
        updateData.status = status;
        if (status === 'RESOLVED') updateData.resolvedAt = new Date();
        if (status === 'CLOSED') updateData.closedAt = new Date();
      }
    }

    return ticketRepository.updateTicket(ticketId, updateData);
  }

  async deleteTicket(user, ticketId) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    // Role rules:
    // Super Admin & Admin can delete any ticket.
    // Agent can ONLY delete tickets created by them!
    const isSuperOrAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    const isOwnerAgent = user.role === 'AGENT' && ticket.createdBy === user.id;

    if (!isSuperOrAdmin && !isOwnerAgent) {
      const err = new Error('Forbidden: You can only delete tickets that were created by you.');
      err.statusCode = 403;
      throw err;
    }

    return ticketRepository.deleteTicket(ticketId);
  }

  async addComment(user, ticketId, { commentType = 'REPLY', body }) {
    if (!body || body.trim() === '') {
      const err = new Error('Comment body is required');
      err.statusCode = 400;
      throw err;
    }

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    if (commentType === 'INTERNAL_NOTE' && user.role === 'EMPLOYEE') {
      const err = new Error('Forbidden: Only support agents or admins can post internal notes');
      err.statusCode = 403;
      throw err;
    }

    return ticketRepository.addComment({
      ticketId,
      userId: user.id,
      commentType,
      body: body.trim(),
    });
  }

  async updateStatus(user, ticketId, newStatus) {
    const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
    if (!allowedStatuses.includes(newStatus)) {
      const err = new Error(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'EMPLOYEE') {
      const err = new Error('Forbidden: Only agents or admins can update ticket status');
      err.statusCode = 403;
      throw err;
    }

    return ticketRepository.updateStatus({
      ticketId,
      newStatus,
      changedBy: user.id,
      oldStatus: ticket.status,
    });
  }

  async updateAssignment(user, ticketId, { groupId, agentId }) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'EMPLOYEE') {
      const err = new Error('Forbidden: Only agents or admins can assign tickets');
      err.statusCode = 403;
      throw err;
    }

    const targetGroupId = groupId ? parseInt(groupId, 10) : ticket.groupId;
    const targetAgentId = agentId ? parseInt(agentId, 10) : null;

    if (targetAgentId) {
      const isMapped = await agentRepository.isUserInGroup(targetAgentId, targetGroupId);
      if (!isMapped) {
        const err = new Error('The selected agent does not belong to the target group');
        err.statusCode = 400;
        throw err;
      }
    }

    return ticketRepository.updateAssignment({
      ticketId,
      newGroupId: targetGroupId,
      newAgentId: targetAgentId,
      changedBy: user.id,
      oldGroupId: ticket.groupId,
      oldAgentId: ticket.agentId,
    });
  }

  async getLogs(user, { search = '', page = 1, limit = 50 } = {}) {
    // All Agents, Admins, and SuperAdmins have access to ticket history/logs
    if (user.role === 'EMPLOYEE') {
      const err = new Error('Forbidden: History logs are accessible to support agents and admins.');
      err.statusCode = 403;
      throw err;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    return ticketRepository.getGlobalLogs({ skip, take, search });
  }
}

export default new TicketService();
