import contactService from '../services/contactService.js';

export class ContactController {
  async search(req, res, next) {
    try {
      const { q, pageSize } = req.query;
      const contacts = await contactService.searchContacts(q, pageSize);
      res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ContactController();
