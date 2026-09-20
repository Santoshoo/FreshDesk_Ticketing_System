import departmentService from '../services/departmentService.js';

export class DepartmentController {
  async list(req, res, next) {
    try {
      const { page, limit, search, status } = req.query;
      const result = await departmentService.listDepartments({ page, limit, search, status });
      res.json({ success: true, data: result.departments, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const departments = await departmentService.searchDepartments(q, limit);
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body);
      res.json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }
}

export default new DepartmentController();
