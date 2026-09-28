import * as XLSX from 'xlsx-js-style';

/**
 * Utility to strip HTML tags for clean spreadsheet output
 */
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats a Date or timestamp string strictly into "dd-mm-yyyy hh:mm:ss" (24-hour time)
 */
function formatDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Resolves the actual latest update timestamp of the ticket.
 * - If never updated after creation (timestamps within 1000ms), returns formatDateTime(createdAt).
 * - If updated later (status changes, assignment transfers, or content edits), returns the newest update timestamp.
 */
function getLastUpdateDateTime(t) {
  if (!t) return '';
  const createdTs = t.createdAt ? new Date(t.createdAt).getTime() : NaN;
  const candidateTimestamps = [];

  if (t.updatedAt) {
    const ts = new Date(t.updatedAt).getTime();
    if (!isNaN(ts)) candidateTimestamps.push(ts);
  }
  if (Array.isArray(t.statusHistories)) {
    for (const sh of t.statusHistories) {
      if (sh?.changedAt) {
        const ts = new Date(sh.changedAt).getTime();
        if (!isNaN(ts)) candidateTimestamps.push(ts);
      }
    }
  }
  if (Array.isArray(t.assignmentHistories)) {
    for (const ah of t.assignmentHistories) {
      if (ah?.changedAt) {
        const ts = new Date(ah.changedAt).getTime();
        if (!isNaN(ts)) candidateTimestamps.push(ts);
      }
    }
  }
  if (t.resolvedAt) {
    const ts = new Date(t.resolvedAt).getTime();
    if (!isNaN(ts)) candidateTimestamps.push(ts);
  }
  if (t.closedAt) {
    const ts = new Date(t.closedAt).getTime();
    if (!isNaN(ts)) candidateTimestamps.push(ts);
  }

  if (candidateTimestamps.length === 0) {
    return t.createdAt ? formatDateTime(t.createdAt) : '';
  }

  const maxTs = Math.max(...candidateTimestamps);
  if (!isNaN(createdTs) && maxTs - createdTs <= 1000) {
    return formatDateTime(t.createdAt);
  }
  return formatDateTime(new Date(maxTs));
}

/**
 * Calculates Turn Around Time (TAT) strictly when Closed DateTime exists.
 * Formula: Closed DateTime - Ticket Created DateTime
 * Formatted as [hh]:mm:ss without 24-hour wrap-around (e.g. 30:00:00).
 * Empty string for non-closed tickets.
 */
function calculateTAT(createdAt, closedAt) {
  if (!closedAt || !createdAt) return '';
  const createdDate = new Date(createdAt);
  const closedDate = new Date(closedAt);
  const diffMs = closedDate.getTime() - createdDate.getTime();
  if (isNaN(diffMs) || diffMs < 0) return '';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Exports report data to Excel (.xlsx) with styled 16-column format
 * or to CSV (.csv) with the exact same columns and values.
 */
export function exportReportData({
  data,
  format = 'xlsx',
  periodLabel = 'Report',
  filenamePrefix = 'KIMS_Report',
}) {
  if (!data) return;

  const { tickets = [], summary = {}, categoryReport = [], groupReport = [], agentReport = [] } = data;
  const safeLabel = periodLabel.replace(/[/\\?%*:|"<>]/g, '_');
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10);
  const baseFilename = `${filenamePrefix}_${safeLabel}_${dateStamp}`;

  const total = summary.total || 0;
  const completed = (summary.resolved || 0) + (summary.closed || 0);
  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 1. Exact 16 Headers in Specified Order
  const ticketHeaders = [
    'Ticket No',
    'Subject',
    'Description',
    'Requester Name',
    'Requester Email',
    'Department',
    'Category (Ticket Type)',
    'Support Group',
    'Assigned Agent',
    'Priority',
    'Status',
    'Ticket Created DateTime',
    'Resolve DateTime',
    'Closed DateTime',
    'Last Update DateTime',
    'TAT',
  ];

  // 2. Map Ticket Data Rows
  const ticketRows = tickets.map((t) => {
    const ticketNo = t.ticketNumber != null
      ? (String(t.ticketNumber).startsWith('#') ? String(t.ticketNumber) : `#${t.ticketNumber}`)
      : '';

    const subject = t.subject || '';
    const description = stripHtml(t.description || '');

    const requesterName =
      t.contact?.name ||
      t.contactName ||
      (t.employeeEmail?.email ? t.employeeEmail.email.split('@')[0] : 'Staff User');

    const requesterEmail =
      t.contact?.email ||
      t.contactEmail ||
      t.employeeEmail?.email ||
      '';

    const department =
      t.contact?.department?.name ||
      t.employeeEmail?.department?.name ||
      '';

    const category = t.ticketType?.name || '';
    const supportGroup = t.group?.name || 'Unassigned';
    const assignedAgent = t.agent?.name || 'Unassigned';
    const priority = t.priority || 'MEDIUM';
    const status = t.status || 'OPEN';

    const createdDateTime = formatDateTime(t.createdAt);
    const resolveDateTime = t.resolvedAt ? formatDateTime(t.resolvedAt) : '';
    const closedDateTime = t.closedAt ? formatDateTime(t.closedAt) : '';
    const lastUpdateDateTime = getLastUpdateDateTime(t);
    const tat = calculateTAT(t.createdAt, t.closedAt);

    return [
      ticketNo,
      subject,
      description,
      requesterName,
      requesterEmail,
      department,
      category,
      supportGroup,
      assignedAgent,
      priority,
      status,
      createdDateTime,
      resolveDateTime,
      closedDateTime,
      lastUpdateDateTime,
      tat,
    ];
  });

  // CSV Export Option
  if (format === 'csv') {
    const csvRows = [
      ticketHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...ticketRows.map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${baseFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Excel (.xlsx) Multi-Sheet Export Option
  const wb = XLSX.utils.book_new();

  // --- SHEET 1: DETAILED TICKETS LOG (Primary active sheet) ---
  const wsTickets = XLSX.utils.aoa_to_sheet([ticketHeaders, ...ticketRows]);

  // Set Column Widths for Optimal Readability
  wsTickets['!cols'] = [
    { wch: 16 }, // Ticket No
    { wch: 35 }, // Subject
    { wch: 45 }, // Description
    { wch: 24 }, // Requester Name
    { wch: 30 }, // Requester Email
    { wch: 22 }, // Department
    { wch: 24 }, // Category (Ticket Type)
    { wch: 24 }, // Support Group
    { wch: 24 }, // Assigned Agent
    { wch: 16 }, // Priority
    { wch: 16 }, // Status
    { wch: 26 }, // Ticket Created DateTime
    { wch: 26 }, // Resolve DateTime
    { wch: 26 }, // Closed DateTime
    { wch: 26 }, // Last Update DateTime
    { wch: 18 }, // TAT
  ];

  // Set Row Heights: Header 38pt, Data rows 22pt
  wsTickets['!rows'] = [
    { hpt: 38 },
    ...ticketRows.map(() => ({ hpt: 22 })),
  ];

  // Header Style: BLACK, BOLD, Size 18, Horizontally & Vertically CENTER aligned
  const headerStyle = {
    font: {
      name: 'Calibri',
      sz: 18,
      bold: true,
      color: { rgb: '000000' },
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true,
    },
  };

  // Data Cell Style: Size 12, Horizontally & Vertically CENTER aligned
  const dataStyle = {
    font: {
      name: 'Calibri',
      sz: 12,
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true,
    },
  };

  // Apply Styles to All Cells
  const range = XLSX.utils.decode_range(wsTickets['!ref'] || 'A1:P1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsTickets[cellAddress]) {
        wsTickets[cellAddress] = { t: 's', v: '' };
      }
      wsTickets[cellAddress].s = R === 0 ? headerStyle : dataStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets_Data');

  // --- SHEET 2: EXECUTIVE SUMMARY & DISTRIBUTION ---
  const activeCategories = categoryReport.filter((c) => c.total > 0);
  const activeGroups = groupReport.filter((g) => g.total > 0);
  const activeAgents = agentReport.filter((a) => a.total > 0);

  const summarySheetData = [
    ['KIMS ICT SERVICE DESK - PERFORMANCE REPORT'],
    ['Report Period:', periodLabel],
    ['Generated On:', now.toLocaleString()],
    [''],
    ['--- 1. OVERALL STATUS SUMMARY ---'],
    ['Metric', 'Ticket Count', 'Share (%)'],
    ['Total Tickets', total, '100%'],
    ['Open', summary.open || 0, total > 0 ? `${Math.round(((summary.open || 0) / total) * 100)}%` : '0%'],
    ['In Progress', summary.inProgress || 0, total > 0 ? `${Math.round(((summary.inProgress || 0) / total) * 100)}%` : '0%'],
    ['Pending / On Hold', (summary.pending || 0) + (summary.onHold || 0), total > 0 ? `${Math.round((((summary.pending || 0) + (summary.onHold || 0)) / total) * 100)}%` : '0%'],
    ['Resolved', summary.resolved || 0, total > 0 ? `${Math.round(((summary.resolved || 0) / total) * 100)}%` : '0%'],
    ['Closed', summary.closed || 0, total > 0 ? `${Math.round(((summary.closed || 0) / total) * 100)}%` : '0%'],
    ['Overall Resolution Rate', `${resolutionRate}%`, ''],
    [''],
    ['--- 2. CATEGORY-WISE BREAKDOWN ---'],
    ['Category', 'Total', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Share (%)'],
    ...(activeCategories.length > 0
      ? activeCategories.map((c) => [
          c.name,
          c.total,
          c.open,
          c.inProgress,
          c.pending,
          c.resolved,
          c.closed,
          `${c.percentage || 0}%`,
        ])
      : [['No tickets recorded in this period', 0, 0, 0, 0, 0, 0, '0%']]),
    [''],
    ['--- 3. SUPPORT GROUP BREAKDOWN ---'],
    ['Support Group', 'Total', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Resolution Rate (%)'],
    ...(activeGroups.length > 0
      ? activeGroups.map((g) => [
          g.name,
          g.total,
          g.open,
          g.inProgress,
          g.pending,
          g.resolved,
          g.closed,
          `${g.resolutionRate || 0}%`,
        ])
      : [['No group activity recorded in this period', 0, 0, 0, 0, 0, 0, '0%']]),
    [''],
    ['--- 4. AGENT PERFORMANCE ---'],
    ['Agent Name', 'Email', 'Role', 'Total Assigned', 'Open', 'In Progress', 'Resolved', 'Closed', 'Resolution Rate (%)'],
    ...(activeAgents.length > 0
      ? activeAgents.map((a) => [
          a.name,
          a.email || '-',
          a.role || 'AGENT',
          a.total,
          a.open,
          a.inProgress,
          a.resolved,
          a.closed,
          `${a.resolutionRate || 0}%`,
        ])
      : [['No agent activity recorded in this period', '-', '-', 0, 0, 0, 0, 0, '0%']]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  wsSummary['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive_Summary');

  // Trigger browser download
  XLSX.writeFile(wb, `${baseFilename}.xlsx`);
}

export default {
  exportReportData,
};
