import { prismaArchive } from '../config/archiveDatabase.js';

const ARCHIVE_LIST_SELECT = {
  id: true,
  ticketId: true,
  subject: true,
  status: true,
  priority: true,
  source: true,
  ticketType: true,
  agent: true,
  group: true,
  createdTime: true,
  resolvedTime: true,
  closedTime: true,
  lastUpdateTime: true,
  importedAt: true,
  // description intentionally omitted from list queries to keep RAM and transfer fast across 200k+ rows
};

export class ArchivedTicketRepository {
  /**
   * Find paginated list of archived tickets
   */
  async findMany({ skip = 0, take = 25, where = {}, orderBy = { createdTime: 'desc' }, select = ARCHIVE_LIST_SELECT } = {}) {
    return prismaArchive.archivedTicket.findMany({
      skip,
      take,
      where,
      orderBy,
      select,
    });
  }

  /**
   * Count archived tickets matching conditions
   */
  async count(where = {}) {
    return prismaArchive.archivedTicket.count({ where });
  }

  /**
   * Find archived ticket by ID (BigInt) with full description
   */
  async findById(id) {
    const numericId = typeof id === 'bigint' ? id : BigInt(id);
    return prismaArchive.archivedTicket.findUnique({
      where: { id: numericId },
    });
  }

  /**
   * Find archived ticket by Ticket ID string (e.g. HIST-10001)
   */
  async findByTicketId(ticketId) {
    return prismaArchive.archivedTicket.findFirst({
      where: { ticketId },
    });
  }

  /**
   * Retrieve distinct filter values for dropdown selectors
   */
  async getFilterOptions() {
    const [statusRows, agentRows, groupRows, typeRows] = await Promise.all([
      prismaArchive.archivedTicket.findMany({
        select: { status: true },
        distinct: ['status'],
        where: { status: { not: null } },
        take: 100,
        orderBy: { status: 'asc' },
      }),
      prismaArchive.archivedTicket.findMany({
        select: { agent: true },
        distinct: ['agent'],
        where: { agent: { not: null } },
        take: 200,
        orderBy: { agent: 'asc' },
      }),
      prismaArchive.archivedTicket.findMany({
        select: { group: true },
        distinct: ['group'],
        where: { group: { not: null } },
        take: 100,
        orderBy: { group: 'asc' },
      }),
      prismaArchive.archivedTicket.findMany({
        select: { ticketType: true },
        distinct: ['ticketType'],
        where: { ticketType: { not: null } },
        take: 100,
        orderBy: { ticketType: 'asc' },
      }),
    ]);

    // Ensure values are clean names and not raw timestamps or artifacts
    const isValidFilterItem = (val) => {
      if (!val || typeof val !== 'string') return false;
      const s = val.trim();
      if (s.length === 0 || s.length > 60) return false;
      if (s.includes('GMT') || s.includes('Standard Time') || /^\d{4}-\d{2}-\d{2}/.test(s)) return false;
      return true;
    };

    return {
      statuses: statusRows.map((r) => r.status).filter(isValidFilterItem),
      agents: agentRows.map((r) => r.agent).filter(isValidFilterItem),
      groups: groupRows.map((r) => r.group).filter(isValidFilterItem),
      ticketTypes: typeRows.map((r) => r.ticketType).filter(isValidFilterItem),
    };
  }
}

export const archivedTicketRepository = new ArchivedTicketRepository();
export default archivedTicketRepository;
