import ticketService from '../services/ticketService.js';

export class TicketController {
  async create(req, res, next) {
    try {
      const ticket = await ticketService.createTicket(req.user, req.body);
      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { page, limit, search, status, priority, groupId, agentId } = req.query;
      const result = await ticketService.listTickets(req.user, {
        page,
        limit,
        search,
        status,
        priority,
        groupId,
        agentId,
        scope: 'all',
      });
      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async listMy(req, res, next) {
    try {
      const { page, limit, search, status, priority, groupId } = req.query;
      const result = await ticketService.listTickets(req.user, {
        page,
        limit,
        search,
        status,
        priority,
        groupId,
        scope: 'my',
      });
      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ticket = await ticketService.getTicketById(req.user, req.params.id);
      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const comment = await ticketService.addComment(req.user, req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await ticketService.updateStatus(req.user, req.params.id, status);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAssignment(req, res, next) {
    try {
      const { groupId, agentId } = req.body;
      const result = await ticketService.updateAssignment(req.user, req.params.id, { groupId, agentId });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const result = await ticketService.updateTicket(req.user, req.params.id, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await ticketService.deleteTicket(req.user, req.params.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req, res, next) {
    try {
      const { search, page, limit } = req.query;
      const logs = await ticketService.getLogs(req.user, { search, page, limit });
      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TicketController();
