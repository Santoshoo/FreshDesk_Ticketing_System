import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import archivedTicketRepository from '../repositories/archivedTicketRepository.js';
import { prismaArchive } from '../config/archiveDatabase.js';

// In-memory job tracker for asynchronous background uploads
const activeJobs = new Map();

function pruneOldJobs() {
  const now = Date.now();
  for (const [id, job] of activeJobs.entries()) {
    if (now - job.updatedAt > 15 * 60 * 1000) {
      activeJobs.delete(id);
    }
  }
}

/**
 * Normalizes varied Excel / CSV header keys
 */
function normalizeHeaderKey(key) {
  if (!key) return '';
  return key.trim().toLowerCase().replace(/[\s_\-]+/g, '');
}

/**
 * Smart Date Parser
 * Handles Excel serial numbers, DD/MM/YYYY, YYYY-MM-DD, AM/PM timestamps, and ISO strings.
 */
function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // 1. Numeric Excel Serial Date (e.g. 44927.4583)
  if (typeof val === 'number' || (/^\d+(\.\d+)?$/.test(String(val).trim()) && !isNaN(Number(val)))) {
    const num = Number(val);
    if (num > 20000 && num < 70000) {
      const dateMs = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(dateMs);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str === '-') return null;

  // 2. Direct Date constructor check (handles ISO, standard formats)
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime()) && directDate.getFullYear() > 1990 && directDate.getFullYear() < 2100) {
    if (!/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(str)) {
      return directDate;
    }
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY format with optional time
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    let hour = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const min = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const sec = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const meridiem = ddmmyyyyMatch[7] ? ddmmyyyyMatch[7].toUpperCase() : null;

    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    const parsed = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (!isNaN(directDate.getTime())) return directDate;
  return null;
}

/**
 * Maps raw input row object to Prisma ArchivedTicket schema
 */
function mapRowToArchivedTicket(raw) {
  const lookup = {};
  for (const [key, val] of Object.entries(raw)) {
    lookup[normalizeHeaderKey(key)] = val;
  }

  const getVal = (...variants) => {
    for (const v of variants) {
      const normalized = normalizeHeaderKey(v);
      if (lookup[normalized] !== undefined && lookup[normalized] !== null) {
        return lookup[normalized];
      }
    }
    return null;
  };

  const rawTicketId = getVal('ticketid', 'ticket_id', 'ticket id', 'id');
  if (!rawTicketId && rawTicketId !== 0) return null;

  const ticketIdStr = String(rawTicketId).trim();
  if (!ticketIdStr) return null;

  let subject = getVal('subject', 'title');
  let description = getVal('description', 'desc', 'details');
  let status = getVal('status', 'state');
  let priority = getVal('priority');
  let source = getVal('source', 'channel');
  let ticketType = getVal('type', 'tickettype', 'ticket_type', 'ticket type');
  let agent = getVal('agent', 'agentname', 'assignee', 'responder');
  let group = getVal('group', 'groupname', 'department', 'team');

  let createdTime = parseDate(getVal('createdtime', 'created_time', 'createdat', 'created at', 'created'));
  let resolvedTime = parseDate(getVal('resolvedtime', 'resolved_time', 'resolvedat', 'resolved at', 'resolved'));
  let closedTime = parseDate(getVal('closedtime', 'closed_time', 'closedat', 'closed at', 'closed'));
  let lastUpdateTime = parseDate(getVal('lastupdatetime', 'last_update_time', 'updatedat', 'updated at', 'updated'));

  // Smart Column-Shift Recovery:
  // Detect if Description was omitted in an export segment (causing Description to hold status and Status to hold priority)
  const KNOWN_STATUSES = ['closed', 'open', 'resolved', 'pending', 'in progress', 'on hold'];
  const KNOWN_PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical'];
  const descStr = String(description || '').trim().toLowerCase();
  const statStr = String(status || '').trim().toLowerCase();

  if (KNOWN_STATUSES.includes(descStr) && KNOWN_PRIORITIES.includes(statStr)) {
    const rawGroup = getVal('group', 'groupname', 'department', 'team');
    const rawCreatedTime = getVal('createdtime', 'created_time', 'createdat', 'created at', 'created');
    const rawResolvedTime = getVal('resolvedtime', 'resolved_time', 'resolvedat', 'resolved at', 'resolved');
    const rawClosedTime = getVal('closedtime', 'closed_time', 'closedat', 'closed at', 'closed');

    status = description;
    priority = getVal('status', 'state');
    source = getVal('priority');
    ticketType = getVal('source', 'channel');
    agent = getVal('type', 'tickettype', 'ticket_type', 'ticket type');
    group = getVal('agent', 'agentname', 'assignee', 'responder');

    createdTime = parseDate(rawGroup);
    resolvedTime = parseDate(rawCreatedTime);
    closedTime = parseDate(rawResolvedTime);
    lastUpdateTime = parseDate(rawClosedTime);

    description = null;
  }

  return {
    ticketId: ticketIdStr.substring(0, 50),
    subject: subject ? String(subject).trim().substring(0, 500) : null,
    description: description ? String(description).trim() : null,
    status: status ? String(status).trim().substring(0, 50) : null,
    priority: priority ? String(priority).trim().substring(0, 50) : null,
    source: source ? String(source).trim().substring(0, 50) : null,
    ticketType: ticketType ? String(ticketType).trim().substring(0, 100) : null,
    agent: agent ? String(agent).trim().substring(0, 150) : null,
    group: group ? String(group).trim().substring(0, 150) : null,
    createdTime,
    resolvedTime,
    closedTime,
    lastUpdateTime,
  };
}

async function insertBatch(batch) {
  if (!batch || batch.length === 0) return 0;
  const result = await prismaArchive.archivedTicket.createMany({
    data: batch,
    skipDuplicates: true,
  });
  return result.count;
}

function formatExportDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch {
    return '';
  }
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildWhereClause(queryParams = {}) {
  const where = {};

  if (queryParams.scope === 'all') {
    if (queryParams.dateFrom || queryParams.dateTo) {
      where.createdTime = {};
      if (queryParams.dateFrom) {
        const from = new Date(queryParams.dateFrom);
        if (!isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0);
          where.createdTime.gte = from;
        }
      }
      if (queryParams.dateTo) {
        const to = new Date(queryParams.dateTo);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          where.createdTime.lte = to;
        }
      }
    }
    return where;
  }

  // Exact or partial ticket ID search
  if (queryParams.ticketId && queryParams.ticketId.trim()) {
    where.ticketId = { contains: queryParams.ticketId.trim() };
  }

  // Full-text / keyword search across ticket ID, subject, and description
  if (queryParams.search && queryParams.search.trim()) {
    const term = queryParams.search.trim();
    where.OR = [
      { ticketId: { contains: term } },
      { subject: { contains: term } },
      { description: { contains: term } },
    ];
  }

  // Status filter
  if (queryParams.status && queryParams.status.trim() && queryParams.status !== 'ALL') {
    where.status = queryParams.status.trim();
  }

  // Priority filter
  if (queryParams.priority && queryParams.priority.trim() && queryParams.priority !== 'ALL') {
    where.priority = queryParams.priority.trim();
  }

  // Agent filter
  if (queryParams.agent && queryParams.agent.trim() && queryParams.agent !== 'ALL') {
    where.agent = { contains: queryParams.agent.trim() };
  }

  // Group filter
  if (queryParams.group && queryParams.group.trim() && queryParams.group !== 'ALL') {
    where.group = { contains: queryParams.group.trim() };
  }

  // Ticket Type filter
  if (queryParams.ticketType && queryParams.ticketType.trim() && queryParams.ticketType !== 'ALL') {
    where.ticketType = queryParams.ticketType.trim();
  }

  // Date range filter on createdTime
  if (queryParams.dateFrom || queryParams.dateTo) {
    where.createdTime = {};
    if (queryParams.dateFrom) {
      const from = new Date(queryParams.dateFrom);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        where.createdTime.gte = from;
      }
    }
    if (queryParams.dateTo) {
      const to = new Date(queryParams.dateTo);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        where.createdTime.lte = to;
      }
    }
  }

  return where;
}

export class ArchivedTicketService {
  /**
   * List archived tickets with search, filtering, and pagination
   */
  async listArchivedTickets(queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const where = buildWhereClause(queryParams);

    // Sorting
    const allowedSortFields = ['createdTime', 'ticketId', 'status', 'priority', 'lastUpdateTime', 'resolvedTime'];
    const sortBy = allowedSortFields.includes(queryParams.sortBy) ? queryParams.sortBy : 'createdTime';
    const sortOrder = queryParams.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = { [sortBy]: sortOrder };

    const [total, tickets] = await Promise.all([
      archivedTicketRepository.count(where),
      archivedTicketRepository.findMany({ skip, take: limit, where, orderBy }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Count archived tickets matching filter query (for export previews)
   */
  async countArchivedTickets(queryParams = {}) {
    const where = buildWhereClause(queryParams);
    const count = await archivedTicketRepository.count(where);
    return { count };
  }

  /**
   * Stream export of archived tickets directly to response
   */
  async streamExport(res, queryParams = {}) {
    const where = buildWhereClause(queryParams);
    const format = (queryParams.format || 'csv').toLowerCase();
    const includeDescription = queryParams.includeDescription !== 'false' && queryParams.includeDescription !== false;
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);
    const count = await archivedTicketRepository.count(where);
    const userLimit = queryParams.limit ? parseInt(queryParams.limit, 10) : null;
    const effectiveLimit = userLimit && userLimit > 0 ? Math.min(count, userLimit) : count;

    const EXPORT_SELECT = {
      ticketId: true,
      subject: true,
      description: includeDescription,
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
    };

    // If format is xlsx and effectiveLimit <= 50,000, build Excel workbook
    if (format === 'xlsx' && effectiveLimit <= 50000) {
      const rows = await archivedTicketRepository.findMany({
        skip: 0,
        take: effectiveLimit,
        where,
        orderBy: { createdTime: 'desc' },
        select: EXPORT_SELECT,
      });

      const excelData = rows.map((r) => ({
        'Ticket ID': r.ticketId || '',
        'Subject': r.subject || '',
        'Description': r.description || '',
        'Status': r.status || '',
        'Priority': r.priority || '',
        'Source': r.source || '',
        'Type': r.ticketType || '',
        'Agent': r.agent || '',
        'Group': r.group || '',
        'Created time': formatExportDate(r.createdTime),
        'Resolved time': formatExportDate(r.resolvedTime),
        'Closed time': formatExportDate(r.closedTime),
        'Last update time': formatExportDate(r.lastUpdateTime),
      }));

      const ws = xlsx.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 50 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 20 },
        { wch: 25 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
      ];
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Archived Tickets');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="archived_tickets_${dateStamp}.xlsx"`);
      return res.send(buffer);
    }

    // Default & High-volume (>50k): Fast streaming CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="archived_tickets_${dateStamp}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    if (format === 'xlsx' && effectiveLimit > 50000) {
      res.setHeader('X-Export-Notice', 'Large dataset (>50k rows) streamed as CSV for optimal speed and memory stability');
    }

    // UTF-8 BOM so Excel opens Hindi/Gujarati/special characters properly
    res.write('\uFEFF');

    // CSV Header row
    const headers = [
      'Ticket ID',
      'Subject',
      'Description',
      'Status',
      'Priority',
      'Source',
      'Type',
      'Agent',
      'Group',
      'Created time',
      'Resolved time',
      'Closed time',
      'Last update time',
    ];
    res.write(headers.join(',') + '\r\n');

    const BATCH_SIZE = 5000;
    let page = 0;
    let exportedCount = 0;

    while (exportedCount < effectiveLimit) {
      const takeCount = Math.min(BATCH_SIZE, effectiveLimit - exportedCount);
      const rows = await archivedTicketRepository.findMany({
        skip: page * BATCH_SIZE,
        take: takeCount,
        where,
        orderBy: { createdTime: 'desc' },
        select: EXPORT_SELECT,
      });

      if (!rows || rows.length === 0) break;
      exportedCount += rows.length;

      const lines = rows.map((r) => [
        escapeCsvCell(r.ticketId),
        escapeCsvCell(r.subject),
        escapeCsvCell(r.description),
        escapeCsvCell(r.status),
        escapeCsvCell(r.priority),
        escapeCsvCell(r.source),
        escapeCsvCell(r.ticketType),
        escapeCsvCell(r.agent),
        escapeCsvCell(r.group),
        escapeCsvCell(formatExportDate(r.createdTime)),
        escapeCsvCell(formatExportDate(r.resolvedTime)),
        escapeCsvCell(formatExportDate(r.closedTime)),
        escapeCsvCell(formatExportDate(r.lastUpdateTime)),
      ].join(',')).join('\r\n') + '\r\n';

      const ok = res.write(lines);
      if (!ok) {
        await new Promise((resolve) => res.once('drain', resolve));
      }

      page++;
      if (rows.length < BATCH_SIZE) break;
    }

    res.end();
  }

  /**
   * Get single archived ticket detail with full description
   */
  async getArchivedTicketById(id) {
    if (!id) {
      const error = new Error('Ticket ID parameter is required');
      error.statusCode = 400;
      throw error;
    }

    let ticket;
    if (/^\d+$/.test(String(id))) {
      ticket = await archivedTicketRepository.findById(id);
    } else {
      ticket = await archivedTicketRepository.findByTicketId(String(id));
    }

    if (!ticket) {
      const error = new Error(`Archived ticket '${id}' not found`);
      error.statusCode = 404;
      error.code = 'ARCHIVED_TICKET_NOT_FOUND';
      throw error;
    }

    return ticket;
  }

  /**
   * Get distinct dropdown options for filters
   */
  async getFilterOptions() {
    return archivedTicketRepository.getFilterOptions();
  }

  /**
   * High-Performance Streaming Ingestion for uploaded file (CSV / XLSX / XLS)
   * Directly ingests into kims_freshdesk_archive in 2,000-row chunks
   */
  async ingestFile({ filePath, originalName = 'upload', shouldTruncate = false, batchSize = 2000, onProgress = null }) {
    if (!fs.existsSync(filePath)) {
      const error = new Error(`Uploaded file not found at ${filePath}`);
      error.statusCode = 400;
      throw error;
    }

    const startTime = Date.now();
    const BATCH_SIZE = Math.max(100, parseInt(batchSize, 10) || 2000);

    // Optional truncation of existing archive records
    if (shouldTruncate) {
      await prismaArchive.$executeRawUnsafe('TRUNCATE TABLE archived_tickets;');
    }

    let totalProcessed = 0;
    let totalInserted = 0;
    let currentBatch = [];

    const ext = path.extname(originalName || filePath).toLowerCase();

    try {
      if (ext === '.csv' || ext === '.tsv' || ext === '.txt') {
        const separator = ext === '.tsv' ? '\t' : ',';
        const readStream = fs.createReadStream(filePath);
        const parser = csvParser({ separator });

        for await (const row of readStream.pipe(parser)) {
          totalProcessed++;
          const item = mapRowToArchivedTicket(row);
          if (item) {
            currentBatch.push(item);
          }

          if (currentBatch.length >= BATCH_SIZE) {
            const count = await insertBatch(currentBatch);
            totalInserted += count;
            currentBatch = []; // Release memory immediately
            if (onProgress) {
              onProgress({ processed: totalProcessed, inserted: totalInserted, total: null });
            }
          }
        }

        if (currentBatch.length > 0) {
          const count = await insertBatch(currentBatch);
          totalInserted += count;
          currentBatch = [];
          if (onProgress) {
            onProgress({ processed: totalProcessed, inserted: totalInserted, total: totalProcessed });
          }
        }
      } else if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.readFile(filePath, { dense: true, cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
        const total = rows.length;

        for (const row of rows) {
          totalProcessed++;
          const item = mapRowToArchivedTicket(row);
          if (item) {
            currentBatch.push(item);
          }

          if (currentBatch.length >= BATCH_SIZE) {
            const count = await insertBatch(currentBatch);
            totalInserted += count;
            currentBatch = [];
            if (onProgress) {
              onProgress({ processed: totalProcessed, inserted: totalInserted, total });
            }
          }
        }

        if (currentBatch.length > 0) {
          const count = await insertBatch(currentBatch);
          totalInserted += count;
          currentBatch = [];
          if (onProgress) {
            onProgress({ processed: totalProcessed, inserted: totalInserted, total });
          }
        }
      } else {
        const error = new Error(`Unsupported file type '${ext}'. Please upload .csv or .xlsx.`);
        error.statusCode = 400;
        throw error;
      }
    } finally {
      // Clean up uploaded temporary file from disk
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (cleanupErr) {
        console.warn('Could not remove temporary uploaded file:', cleanupErr.message);
      }
    }

    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const throughput = Math.round(totalInserted / (Math.max(1, durationSeconds)));
    const totalInArchive = await prismaArchive.archivedTicket.count();

    return {
      fileName: originalName,
      totalProcessed,
      totalInserted,
      durationSeconds,
      throughput,
      totalInArchive: Number(totalInArchive),
    };
  }

  /**
   * Start an asynchronous ingestion job in the background
   * Returns immediately with a jobId so the client never experiences network timeouts
   */
  createIngestJob({ filePath, originalName, shouldTruncate = false, batchSize = 2000 }) {
    pruneOldJobs();
    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      fileName: originalName,
      status: 'processing', // 'processing' | 'completed' | 'failed'
      processed: 0,
      inserted: 0,
      total: null,
      percent: 0,
      durationSeconds: 0,
      result: null,
      error: null,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    activeJobs.set(jobId, job);

    // Asynchronously run ingestion in background
    (async () => {
      try {
        const result = await this.ingestFile({
          filePath,
          originalName,
          shouldTruncate,
          batchSize,
          onProgress: ({ processed, inserted, total }) => {
            job.processed = processed;
            job.inserted = inserted;
            job.total = total;
            job.percent = total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 50;
            job.updatedAt = Date.now();
          },
        });

        job.status = 'completed';
        job.percent = 100;
        job.processed = result.totalProcessed;
        job.inserted = result.totalInserted;
        job.durationSeconds = result.durationSeconds;
        job.result = result;
        job.updatedAt = Date.now();
      } catch (err) {
        console.error(`Ingest job ${jobId} failed:`, err);
        job.status = 'failed';
        job.error = err.message || 'Ingestion failed on server';
        job.updatedAt = Date.now();
      }
    })();

    return jobId;
  }

  /**
   * Retrieve current progress/status of an active or recent ingestion job
   */
  getJobStatus(jobId) {
    return activeJobs.get(jobId) || null;
  }
}

export const archivedTicketService = new ArchivedTicketService();
export default archivedTicketService;
