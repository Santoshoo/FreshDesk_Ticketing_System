import * as XLSX from 'xlsx';

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
 * Exports report data to Excel (.xlsx) with multi-sheet formatting
 * or to CSV (.csv) for raw ticket data.
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

  // 1. Prepare Detailed Tickets Log
  const ticketHeaders = [
    'Ticket Number',
    'Subject',
    'Requester Name',
    'Requester Email',
    'Department',
    'Category (Ticket Type)',
    'Support Group',
    'Assigned Agent',
    'Priority',
    'Status',
    'Created At',
    'Resolved At',
    'Closed At',
    'Description',
  ];

  const ticketRows = tickets.map((t) => [
    `#${t.ticketNumber}`,
    t.subject || '',
    t.contact?.name || t.contactName || t.employeeEmail?.email || 'Staff User',
    t.contact?.email || t.contactEmail || t.employeeEmail?.email || '',
    t.contact?.department?.name || t.employeeEmail?.department?.name || 'General',
    t.ticketType?.name || 'General',
    t.group?.name || 'Unassigned',
    t.agent?.name || 'Unassigned',
    t.priority || 'MEDIUM',
    t.status || 'OPEN',
    t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
    t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : '-',
    t.closedAt ? new Date(t.closedAt).toLocaleString() : '-',
    stripHtml(t.description || ''),
  ]);

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

  // --- SHEET 1: EXECUTIVE SUMMARY & DISTRIBUTION ---
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

  // --- SHEET 2: DETAILED TICKETS LOG ---
  const wsTickets = XLSX.utils.aoa_to_sheet([ticketHeaders, ...ticketRows]);
  wsTickets['!cols'] = [
    { wch: 15 }, // Ticket Number
    { wch: 35 }, // Subject
    { wch: 22 }, // Requester
    { wch: 28 }, // Email
    { wch: 20 }, // Department
    { wch: 22 }, // Category
    { wch: 24 }, // Group
    { wch: 20 }, // Agent
    { wch: 12 }, // Priority
    { wch: 14 }, // Status
    { wch: 22 }, // Created At
    { wch: 22 }, // Resolved At
    { wch: 22 }, // Closed At
    { wch: 45 }, // Description
  ];
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets_Data');

  // Trigger browser download
  XLSX.writeFile(wb, `${baseFilename}.xlsx`);
}

export default {
  exportReportData,
};
