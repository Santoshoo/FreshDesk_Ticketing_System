import userService from '../services/userService.js';

export class UserController {
  async list(req, res, next) {
    try {
      const { page, limit, search, role, departmentId } = req.query;
      const result = await userService.listUsers({ page, limit, search, role, departmentId });
      res.json({ success: true, data: result.users, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const users = await userService.searchUsers(q, limit);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await userService.getRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
