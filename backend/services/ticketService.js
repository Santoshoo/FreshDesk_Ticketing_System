import { prisma } from '../config/database.js';
import { generateNextTicketNumber } from '../utils/ticketNumber.js';
import ticketRepository from '../repositories/ticketRepository.js';
import userRepository from '../repositories/userRepository.js';
import employeeEmailRepository from '../repositories/employeeEmailRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import ticketTypeRepository from '../repositories/ticketTypeRepository.js';
import agentRepository from '../repositories/agentRepository.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

export class TicketService {
  async createTicket(creatorUser, {
    contactId,
    contactSource = 'USER',
    employeeEmailId,
    contactEmail,
    contactName,
    subject,
    ticketTypeId,
    priority = 'MEDIUM',
    status = 'OPEN',
    groupId,
    agentId = null,
    description,
    attachments = [],
  }) {
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

    // 1. Resolve and validate Contact from either User Master or Employee Email Master
    let cleanContactId = null;
    let cleanEmployeeEmailId = null;
    let resolvedContactEmail = contactEmail || null;
    let resolvedContactName = contactName || null;
    let finalContactSource = 'USER';

    if (contactSource === 'EMPLOYEE_EMAIL_MASTER' || (!contactId && employeeEmailId)) {
      if (!employeeEmailId) {
        const err = new Error('Contact from Employee Email Master is required');
        err.statusCode = 400;
        throw err;
      }
      cleanEmployeeEmailId = parseInt(employeeEmailId, 10);
      const employeeEmail = await employeeEmailRepository.findById(cleanEmployeeEmailId);
      if (!employeeEmail || !employeeEmail.isActive || employeeEmail.deletedAt !== null) {
        const err = new Error('Selected contact from Employee Email Master is inactive or no longer exists');
        err.statusCode = 400;
        throw err;
      }
      finalContactSource = 'EMPLOYEE_EMAIL_MASTER';
      resolvedContactEmail = employeeEmail.email;
      resolvedContactName = employeeEmail.email.split('@')[0];
    } else {
      if (!contactId) {
        const err = new Error('Contact requester is required');
        err.statusCode = 400;
        throw err;
      }
      cleanContactId = parseInt(contactId, 10);
      const contact = await userRepository.findById(cleanContactId);
      if (!contact || contact.status !== 'ACTIVE') {
        const err = new Error('Selected contact not found in User Master or is inactive');
        err.statusCode = 400;
        throw err;
      }
      finalContactSource = 'USER';
      resolvedContactEmail = contact.email;
      resolvedContactName = contact.name;
    }

    const cleanTicketTypeId = parseInt(ticketTypeId, 10);
    const cleanGroupId = parseInt(groupId, 10);
    const cleanAgentId = agentId ? parseInt(agentId, 10) : null;

    // 2. Validate Ticket Type
    const ticketType = await ticketTypeRepository.findById(cleanTicketTypeId);
    if (!ticketType || ticketType.status !== 'ACTIVE') {
      const err = new Error('Selected ticket type is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    // 3. Validate Group
    const group = await groupRepository.findById(cleanGroupId);
    if (!group || group.status !== 'ACTIVE') {
      const err = new Error('Selected group is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    // 4. Validate Selected Agent belongs to Group
    if (cleanAgentId) {
      const isAgentInGroup = await agentRepository.isUserInGroup(cleanAgentId, cleanGroupId);
      if (!isAgentInGroup) {
        const err = new Error('The selected agent does not belong to the chosen group');
        err.statusCode = 400;
        throw err;
      }
    }

    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const finalPriority = allowedPriorities.includes(priority) ? priority : 'MEDIUM';

    const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
    const finalStatus = allowedStatuses.includes(status) ? status : 'OPEN';

    // Atomic Database Transaction
    const createdTicket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateNextTicketNumber(tx);

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          contactId: cleanContactId,
          employeeEmailId: cleanEmployeeEmailId,
          contactSource: finalContactSource,
          contactEmail: resolvedContactEmail,
          contactName: resolvedContactName,
          subject: subject.trim(),
          ticketTypeId: cleanTicketTypeId,
          priority: finalPriority,
          status: finalStatus,
          groupId: cleanGroupId,
          agentId: cleanAgentId,
          createdBy: creatorUser.id,
          description: description.trim(),
          attachments: Array.isArray(attachments) && attachments.length > 0 ? attachments : null,
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

    // TRIGGER TICKET CREATED NOTIFICATIONS (Requirements 2, 13, 14, 20):
    // Sent asynchronously strictly AFTER successful DB transaction commit
    notificationService.sendTicketCreatedNotifications(createdTicket.id).catch((err) => {
      logger.error({
        msg: 'Background ticket created notification error',
        ticketId: String(createdTicket.id),
        error: err.message,
      });
    });

    return createdTicket;
  }

  async listTickets(user, {
    page = 1,
    limit = 50,
    search = '',
    status = '',
    priority = '',
    groupId = null,
    agentId = null,
    scope = 'all',
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where = {};

    if (search && search.trim()) {
      const cleanSearch = search.replace(/^#/, '').trim();
      const isTicketNumberFormat = /^\d+$/.test(cleanSearch);

      if (isTicketNumberFormat) {
        const paddedTicketNum = cleanSearch.padStart(5, '0');
        where.OR = [
          { ticketNumber: cleanSearch },
          { ticketNumber: paddedTicketNum },
          { ticketNumber: { contains: cleanSearch } },
        ];
      } else {
        where.OR = [
          { ticketNumber: { contains: cleanSearch } },
          { subject: { contains: cleanSearch } },
          { contactEmail: { contains: cleanSearch } },
          { contactName: { contains: cleanSearch } },
          { contact: { name: { contains: cleanSearch } } },
          { contact: { email: { contains: cleanSearch } } },
          { contact: { employeeId: { contains: cleanSearch } } },
          { employeeEmail: { email: { contains: cleanSearch } } },
          { employeeEmail: { normalizedEmail: { contains: cleanSearch } } },
        ];
      }
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (groupId) {
      where.groupId = parseInt(groupId, 10);
    }

    if (agentId) {
      where.agentId = parseInt(agentId, 10);
    }

    if (scope === 'my') {
      const scopeOr = [
        { contactId: user.id },
        { agentId: user.id },
        { createdBy: user.id },
      ];
      if (where.OR) {
        // Combine search filter AND scope filter so both constraints are respected
        where.AND = [{ OR: where.OR }, { OR: scopeOr }];
        delete where.OR;
      } else {
        where.OR = scopeOr;
      }
    } else if (user.role === 'EMPLOYEE') {
      const employeeOr = [
        { contactId: user.id },
        { createdBy: user.id },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: employeeOr }];
        delete where.OR;
      } else {
        where.OR = employeeOr;
      }
    }

    const [tickets, total] = await Promise.all([
      ticketRepository.findMany({ skip, take, where }),
      ticketRepository.count(where),
    ]);

    return {
      tickets,
      pagination: {
        page: pageNum,
        pageSize: take,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
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

  async updateTicket(user, ticketId, { subject, description, ticketTypeId, groupId, agentId, priority, status, attachments }) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    // Role check: Employees cannot edit tickets
    if (user.role === 'EMPLOYEE') {
      const err = new Error('Forbidden: Only support agents and administrators can modify ticket records');
      err.statusCode = 403;
      throw err;
    }

    // TICKET EDIT BUSINESS RULE (Requirements 7, 8, 9):
    // Ticket is editable when status = OPEN or status = PENDING.
    // When ticket status = CLOSED, editing content is rejected unless explicitly reopening to OPEN or PENDING.
    if (ticket.status === 'CLOSED') {
      if (status === 'OPEN' || status === 'PENDING') {
        // Explicitly reopening ticket to OPEN or PENDING is allowed
      } else {
        const err = new Error('Cannot edit a closed ticket. Please reopen the ticket first to OPEN or PENDING.');
        err.statusCode = 400;
        throw err;
      }
    } else if (ticket.status !== 'OPEN' && ticket.status !== 'PENDING') {
      if (status === 'OPEN' || status === 'PENDING') {
        // Switching back to OPEN or PENDING is allowed
      } else {
        const err = new Error('Ticket can only be edited when status is OPEN or PENDING.');
        err.statusCode = 400;
        throw err;
      }
    }

    const updateData = {};
    if (subject) updateData.subject = subject.trim();
    if (description) updateData.description = description.trim();
    if (ticketTypeId) updateData.ticketTypeId = parseInt(ticketTypeId, 10);
    if (groupId) updateData.groupId = parseInt(groupId, 10);
    if (agentId !== undefined) {
      updateData.agentId = agentId ? parseInt(agentId, 10) : null;
    }

    if (priority) {
      const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (allowedPriorities.includes(priority)) {
        updateData.priority = priority;
      }
    }

    if (attachments !== undefined) {
      updateData.attachments = Array.isArray(attachments) && attachments.length > 0 ? attachments : null;
    }

    if (status) {
      const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
      if (allowedStatuses.includes(status)) {
        updateData.status = status;
        if (status === 'RESOLVED') updateData.resolvedAt = new Date();
        if (status === 'CLOSED') updateData.closedAt = new Date();
      }
    }

    const previousStatus = ticket.status;
    const updated = await ticketRepository.updateTicket(ticketId, updateData);

    // TRIGGER TICKET CLOSED NOTIFICATIONS (Requirements 3, 14, 21):
    // Only when status actually transitions to CLOSED from another status
    if (updateData.status === 'CLOSED' && previousStatus !== 'CLOSED') {
      notificationService.sendTicketClosedNotifications(ticketId).catch((err) => {
        logger.error({
          msg: 'Background ticket closed notification error from updateTicket',
          ticketId: String(ticketId),
          error: err.message,
        });
      });
    }

    return updated;
  }

  async deleteTicket(user, ticketId) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    // TICKET DELETE BUSINESS RULE (Requirements 10, 11, 12):
    // Only the AGENT currently assigned to that ticket can delete the ticket (ticket.agentId === user.id).
    // SUPER_ADMIN and ADMIN retain their delete permissions.
    // EMPLOYEE cannot delete tickets.
    const isSuperOrAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    const isAssignedAgent = user.role === 'AGENT' && ticket.agentId === user.id;

    if (!isSuperOrAdmin && !isAssignedAgent) {
      const err = new Error('Forbidden: Only the support agent currently assigned to this ticket can delete it');
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

    const previousStatus = ticket.status;
    const updated = await ticketRepository.updateStatus({
      ticketId,
      newStatus,
      changedBy: user.id,
      oldStatus: previousStatus,
    });

    // TRIGGER TICKET CLOSED NOTIFICATIONS (Requirements 3, 14, 21):
    // Only when status actually transitions to CLOSED from another status
    if (newStatus === 'CLOSED' && previousStatus !== 'CLOSED') {
      notificationService.sendTicketClosedNotifications(ticketId).catch((err) => {
        logger.error({
          msg: 'Background ticket closed notification error from updateStatus',
          ticketId: String(ticketId),
          error: err.message,
        });
      });
    }

    return updated;
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
