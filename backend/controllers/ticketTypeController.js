import ticketTypeService from '../services/ticketTypeService.js';

export class TicketTypeController {
  async list(req, res, next) {
    try {
      const { page, limit, search, status } = req.query;
      const result = await ticketTypeService.listTicketTypes({ page, limit, search, status });
      res.json({ success: true, data: result.ticketTypes, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const ticketTypes = await ticketTypeService.searchTicketTypes(q, limit);
      res.json({ success: true, data: ticketTypes });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const ticketType = await ticketTypeService.createTicketType(req.body);
      res.status(201).json({ success: true, data: ticketType });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreate(req, res, next) {
    try {
      const { types } = req.body;
      const result = await ticketTypeService.bulkCreateTicketTypes(types);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const ticketType = await ticketTypeService.updateTicketType(req.params.id, req.body);
      res.json({ success: true, data: ticketType });
    } catch (error) {
      next(error);
    }
  }
}

export default new TicketTypeController();
