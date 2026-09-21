import userRepository from '../repositories/userRepository.js';
import employeeEmailRepository from '../repositories/employeeEmailRepository.js';

export class ContactService {
  async searchContacts(query = '', pageSize = 20) {
    const limit = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20));
    const cleanQuery = (query || '').trim();

    // Query both sources concurrently
    const [users, employeeEmails] = await Promise.all([
      userRepository.searchActiveUsers(cleanQuery, limit),
      employeeEmailRepository.searchActive(cleanQuery, limit),
    ]);

    // Map and normalize contacts
    // Priority: USER takes precedence over EMPLOYEE_EMAIL_MASTER
    const contactMap = new Map();

    // 1. Insert User Master contacts first (priority)
    for (const u of users) {
      const normalizedEmail = (u.email || '').toLowerCase().trim();
      if (!normalizedEmail) continue;

      contactMap.set(normalizedEmail, {
        id: u.id,
        email: u.email,
        name: u.name,
        employeeId: u.employeeId || null,
        department: u.department?.name || null,
        departmentId: u.department?.id || null,
        source: 'USER',
      });
    }

    // 2. Insert Employee Email Master contacts only if not already present
    for (const ee of employeeEmails) {
      const normalizedEmail = (ee.normalizedEmail || ee.email || '').toLowerCase().trim();
      if (!normalizedEmail) continue;

      if (!contactMap.has(normalizedEmail)) {
        contactMap.set(normalizedEmail, {
          id: ee.id,
          email: ee.email,
          name: ee.name || ee.email.split('@')[0],
          employeeId: null,
          department: ee.department?.name || null,
          departmentId: ee.departmentId || null,
          source: 'EMPLOYEE_EMAIL_MASTER',
        });
      }
    }

    const merged = Array.from(contactMap.values());

    return merged.slice(0, limit);
  }
}

export default new ContactService();
