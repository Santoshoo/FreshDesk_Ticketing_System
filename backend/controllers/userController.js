import userService from '../services/userService.js';
import userRepository from '../repositories/userRepository.js';

export class UserController {
  async list(req, res, next) {
    try {
      const { page, limit, search, role, departmentId, sortBy, sortOrder } = req.query;
      const result = await userService.listUsers({ page, limit, search, role, departmentId, sortBy, sortOrder });
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

  async getMe(req, res, next) {
    try {
      res.json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveUsers(req, res, next) {
    try {
      const users = await userRepository.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
      });
      res.json({
        success: true,
        data: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role?.name,
          department: u.department?.name,
          departmentId: u.departmentId,
        })),
      });
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

  async delete(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpload(req, res, next) {
    try {
      const { records, users } = req.body;
      const list = records || users || [];
      const result = await userService.bulkUploadUsers(list);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
