import employeeEmailService from '../services/employeeEmailService.js';

export class EmployeeEmailController {
  async list(req, res, next) {
    try {
      const { page, limit, search, departmentId, status } = req.query;
      const result = await employeeEmailService.listEmails({
        page,
        limit,
        search,
        departmentId,
        status,
      });
      res.json({
        success: true,
        data: result.emails,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const email = await employeeEmailService.getEmailById(req.params.id);
      res.json({
        success: true,
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const email = await employeeEmailService.createEmail(req.body);
      res.status(201).json({
        success: true,
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const email = await employeeEmailService.updateEmail(req.params.id, req.body);
      res.json({
        success: true,
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  async setStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const email = await employeeEmailService.setStatus(req.params.id, isActive);
      res.json({
        success: true,
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await employeeEmailService.deleteEmail(req.params.id);
      res.json({
        success: true,
        message: 'Employee email deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpload(req, res, next) {
    try {
      const { records } = req.body;
      const result = await employeeEmailService.bulkUpload(records);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeEmailController();
