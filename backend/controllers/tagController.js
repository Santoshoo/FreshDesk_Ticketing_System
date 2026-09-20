import tagService from '../services/tagService.js';

export class TagController {
  async list(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const result = await tagService.listTags({ page, limit, search });
      res.json({ success: true, data: result.tags, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const tags = await tagService.searchTags(q, limit);
      res.json({ success: true, data: tags });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const tag = await tagService.createTag(req.body);
      res.status(201).json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const tag = await tagService.updateTag(req.params.id, req.body);
      res.json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }
}

export default new TagController();
