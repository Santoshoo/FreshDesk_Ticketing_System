import React, { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  Search,
  Filter,
  X,
  RefreshCw,
  Eye,
  Calendar,
  User,
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Tag,
  Upload,
  Shield,
  Download,
} from 'lucide-react';
import archivedTicketApi from '../services/archivedTicketApi.js';
import ArchiveTicketUploadModal from '../components/modals/ArchiveTicketUploadModal.jsx';
import ArchiveExportModal from '../components/modals/ArchiveExportModal.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ArchivedTickets() {
  const { showToast } = useToast();

  // State
  const [tickets, setTickets] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    agents: [],
    groups: [],
    ticketTypes: [],
  });

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [agent, setAgent] = useState('ALL');
  const [group, setGroup] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Ticket Detail Drawer State
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load distinct filter options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await archivedTicketApi.getFilterOptions();
        if (res?.success && res?.data) {
          setFilterOptions(res.data);
        }
      } catch (err) {
        console.error('Failed to load archive filter options:', err);
      }
    };
    loadOptions();
  }, []);

  // Fetch paginated tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: status !== 'ALL' ? status : undefined,
        agent: agent !== 'ALL' ? agent : undefined,
        group: group !== 'ALL' ? group : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const res = await archivedTicketApi.list(params);
      if (res?.success) {
        setTickets(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch archived tickets:', err);
      showToast(err.response?.data?.message || 'Failed to load archived tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, status, agent, group, priority, dateFrom, dateTo, showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Load detail ticket
  const openDetailDrawer = async (id) => {
    try {
      setSelectedTicketId(id);
      setDetailLoading(true);
      setDetailTicket(null);
      const res = await archivedTicketApi.getById(id);
      if (res?.success && res?.data) {
        setDetailTicket(res.data);
      }
    } catch (err) {
      console.error('Failed to load archived ticket detail:', err);
      showToast('Could not load ticket details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailDrawer = () => {
    setSelectedTicketId(null);
    setDetailTicket(null);
  };

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeDetailDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('ALL');
    setAgent('ALL');
    setGroup('ALL');
    setPriority('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleCopyTicketId = (ticketId) => {
    navigator.clipboard.writeText(ticketId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    showToast(`Ticket ID ${ticketId} copied to clipboard`, 'success');
  };

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (status !== 'ALL' ? 1 : 0) +
    (agent !== 'ALL' ? 1 : 0) +
    (group !== 'ALL' ? 1 : 0) +
    (priority !== 'ALL' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  // Status badge matching Tickets.jsx
  const getStatusBadge = (stat) => {
    const s = (stat || '').toUpperCase();
    if (s.includes('CLOSED')) {
      return 'bg-[#dcfce7] text-[#15803d] border border-green-200';
    }
    if (s.includes('RESOLVED')) {
      return 'bg-[#ffedd5] text-[#c2410c] border border-orange-200';
    }
    if (s.includes('IN_PROGRESS') || s.includes('PROGRESS')) {
      return 'bg-[#f3e8ff] text-[#7e22ce] border border-purple-200';
    }
    if (s.includes('PENDING') || s.includes('HOLD')) {
      return 'bg-[#ffe4e6] text-[#b91c1c] border border-rose-200';
    }
    if (s.includes('OPEN')) {
      return 'bg-[#dbeafe] text-[#1d4ed8] border border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  // Priority badge matching Tickets.jsx
  const getPriorityBadge = (prio) => {
    const p = (prio || '').toUpperCase();
    if (p.includes('URGENT') || p.includes('CRITICAL')) {
      return 'bg-[#ffe4e6] text-[#b91c1c] border border-rose-200';
    }
    if (p.includes('HIGH')) {
      return 'bg-[#ffedd5] text-[#c2410c] border border-orange-200';
    }
    if (p.includes('MEDIUM')) {
      return 'bg-[#fef3c7] text-[#b45309] border border-amber-200';
    }
    if (p.includes('LOW')) {
      return 'bg-[#dcfce7] text-[#15803d] border border-green-200';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Title & Actions Header (Matches KIMS ICT Design System) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Archived Tickets
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Shield className="w-3 h-3 text-indigo-600" />
              Master Data • Admin Only
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
              <Database className="w-3 h-3 text-blue-600" />
              Separate Schema (kims_freshdesk_archive)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Search and view 200,000+ historical support requests isolated from live tickets
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition hover:border-slate-300 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export / Download</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition hover:opacity-95 cursor-pointer"
            style={{ background: '#2563eb' }}
          >
            <Upload className="w-4 h-4" />
            Upload Tickets
          </button>
          <button
            type="button"
            onClick={() => fetchTickets()}
            disabled={loading}
            title="Refresh tickets"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Architecture Info Notice ── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
          <Database className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="font-bold text-slate-900">Physical Database Isolation:</span>{' '}
          All 200,000+ historical records are stored entirely inside{' '}
          <code className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-700 font-mono text-[11px] font-semibold">
            kims_freshdesk_archive
          </code>
          . High-volume searching and imports run completely independent of live hospital operations.
        </div>
      </div>

      {/* ── Search and Filter Controls Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        {/* Search Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Ticket ID (e.g. HIST-10001), Subject, or Description..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Status: All</option>
              {filterOptions.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Priority: All</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Agent
            </label>
            <select
              value={agent}
              onChange={(e) => {
                setAgent(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Agent: All</option>
              {filterOptions.agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Group
            </label>
            <select
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Group: All</option>
              {filterOptions.groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Created From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Created To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Reset Filter Action */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Filtered by <strong>{activeFilterCount}</strong> active criteria
            </span>
            <button
              onClick={resetFilters}
              className="font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Main Data Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Info Bar */}
        <div className="px-5 py-3 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 text-xs">
          <div className="text-slate-600 font-medium">
            {loading ? (
              <span>Searching historical archive...</span>
            ) : (
              <span>
                Found <strong className="text-slate-900 font-bold">{pagination.total.toLocaleString()}</strong> historical tickets
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/70 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Created Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2.5">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-xs font-medium text-slate-500">Loading historical tickets...</span>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Archive className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">No historical tickets found</p>
                      <p className="text-xs text-slate-500">
                        Try modifying your search terms or clearing active filters.
                      </p>
                      {activeFilterCount > 0 ? (
                        <button
                          onClick={resetFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition cursor-pointer text-xs"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-lg font-bold transition hover:opacity-95 cursor-pointer text-xs"
                          style={{ background: '#2563eb' }}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Historical Tickets
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openDetailDrawer(t.id)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    {/* Ticket ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        {t.ticketId}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-4 max-w-md">
                      <p className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition">
                        {t.subject || '—'}
                      </p>
                      {t.ticketType && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          {t.ticketType}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status || '—'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(
                          t.priority
                        )}`}
                      >
                        {t.priority || '—'}
                      </span>
                    </td>

                    {/* Agent */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{t.agent || 'Unassigned'}</span>
                      </div>
                    </td>

                    {/* Group */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{t.group || '—'}</span>
                      </div>
                    </td>

                    {/* Created Time */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {formatDate(t.createdTime)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailDrawer(t.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 text-xs">
          <div className="text-slate-600 font-medium">
            Page <strong className="text-slate-900 font-bold">{pagination.page}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{pagination.totalPages.toLocaleString()}</strong> ({pagination.total.toLocaleString()} total rows)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold">
              {pagination.page}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition shadow-2xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide-over Ticket Detail Drawer (Light Theme) ── */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeDetailDrawer}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-2xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    {detailTicket?.ticketId || 'Loading...'}
                  </span>
                  {detailTicket && (
                    <button
                      type="button"
                      onClick={() => handleCopyTicketId(detailTicket.ticketId)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                      title="Copy Ticket ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeDetailDrawer}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Historical Reference Only • Archived Record (Read-Only)</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
              {detailLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <p className="text-xs font-medium">Loading ticket details...</p>
                </div>
              ) : detailTicket ? (
                <>
                  {/* Subject */}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {detailTicket.subject || 'No Subject Provided'}
                    </h2>
                  </div>

                  {/* Metadata Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Status
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(
                          detailTicket.status
                        )}`}
                      >
                        {detailTicket.status || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Priority
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getPriorityBadge(
                          detailTicket.priority
                        )}`}
                      >
                        {detailTicket.priority || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Source
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {detailTicket.source || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Type
                      </span>
                      <span className="text-xs font-bold text-slate-700 truncate block">
                        {detailTicket.ticketType || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Assignment Information */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assignment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Assigned Agent</p>
                          <p className="font-bold text-slate-800">
                            {detailTicket.agent || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Support Group</p>
                          <p className="font-bold text-slate-800">
                            {detailTicket.group || 'No Group'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4-Field Lifecycle Timestamps */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lifecycle Timestamps</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 uppercase">
                          <Clock className="w-3 h-3" /> Created Time
                        </p>
                        <p className="font-bold text-slate-700 mt-0.5">
                          {formatDate(detailTicket.createdTime)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 uppercase">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved Time
                        </p>
                        <p className="font-bold text-slate-700 mt-0.5">
                          {formatDate(detailTicket.resolvedTime)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 uppercase">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" /> Closed Time
                        </p>
                        <p className="font-bold text-slate-700 mt-0.5">
                          {formatDate(detailTicket.closedTime)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 uppercase">
                          <Clock className="w-3 h-3" /> Last Update Time
                        </p>
                        <p className="font-bold text-slate-700 mt-0.5">
                          {formatDate(detailTicket.lastUpdateTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full Description */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Original Issue Description
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                      {detailTicket.description || (
                        <span className="italic text-slate-400">No description recorded for this legacy ticket.</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Ticket information unavailable.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                Database: kims_freshdesk_archive
              </span>
              <button
                type="button"
                onClick={closeDetailDrawer}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Historical Tickets Modal */}
      <ArchiveTicketUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchTickets();
        }}
      />

      {/* Export / Download Historical Tickets Modal */}
      <ArchiveExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentFilters={{
          search,
          status,
          priority,
          agent,
          group,
          dateFrom,
          dateTo,
        }}
        filterOptions={filterOptions}
        totalArchivedCount={pagination.total}
      />
    </div>
  );
}
