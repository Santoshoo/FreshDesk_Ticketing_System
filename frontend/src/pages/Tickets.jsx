import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Ticket as TicketIcon,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ticketApi from '../services/ticketApi.js';
import groupApi from '../services/groupApi.js';
import dashboardApi from '../services/dashboardApi.js';
import { EmptyState } from '../components/ui/index.jsx';

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, pending: 0, resolved: 0, closed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const groupId = searchParams.get('groupId') || '';
  const priority = searchParams.get('priority') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const [ticketsRes, sumRes] = await Promise.all([
        ticketApi.list({
          page,
          limit: 10,
          search,
          status,
          groupId,
          priority,
        }),
        dashboardApi.getSummary(),
      ]);

      if (ticketsRes.success) {
        setTickets(ticketsRes.data || []);
        if (ticketsRes.pagination) setPagination(ticketsRes.pagination);
      }
      if (sumRes.success) {
        setSummary(sumRes.data || {});
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    groupApi.list({ limit: 100, status: 'ACTIVE' }).then((res) => {
      if (res.success) setGroups(res.data || []);
    });
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [search, status, groupId, priority, page]);

  const updateFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleExportCSV = () => {
    if (!tickets || tickets.length === 0) return;
    const headers = ['Ticket Number', 'Subject', 'Group', 'Priority', 'Status', 'Assigned To', 'Created At'];
    const rows = tickets.map((t) => [
      `#${t.ticketNumber}`,
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      `"${t.group?.name || 'General'}"`,
      t.priority || 'MEDIUM',
      t.status,
      `"${t.agent?.name || 'Unassigned'}"`,
      new Date(t.createdAt).toLocaleDateString(),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tickets_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = summary.total || pagination.total || 0;
  const openCount = summary.open || 0;
  const pendingCount = (summary.pending || 0) + (summary.inProgress || 0);
  const resolvedCount = summary.resolved || 0;
  const closedCount = summary.closed || 0;

  const statusTabs = [
    { label: `All (${totalCount})`, value: '' },
    { label: `Open (${openCount})`, value: 'OPEN' },
    { label: `Pending (${pendingCount})`, value: 'PENDING' },
    { label: `Resolved (${resolvedCount})`, value: 'RESOLVED' },
    { label: `Closed (${closedCount})`, value: 'CLOSED' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">All Tickets</h2>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export</span>
        </button>
      </div>

      {/* Status Counter Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold text-slate-500 overflow-x-auto">
        {statusTabs.map((tab) => {
          const isActive = status === tab.value;
          return (
            <button
              key={tab.label}
              onClick={() => updateFilter('status', tab.value)}
              className={`pb-2.5 transition-colors relative whitespace-nowrap ${
                isActive ? 'text-[#0284c7] font-bold' : 'hover:text-slate-800'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284c7] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search on subject or ticket number..."
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Group Filter */}
        <select
          value={groupId}
          onChange={(e) => updateFilter('groupId', e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700 font-medium"
        >
          <option value="">Group: All</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700 font-medium"
        >
          <option value="">Status: All</option>
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700 font-medium"
        >
          <option value="">Priority: All</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Reset */}
        {(search || status || groupId || priority) && (
          <button
            onClick={handleReset}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors px-1"
          >
            Reset
          </button>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets found"
            description="No tickets match the selected filters."
            action={
              <button
                onClick={() => navigate('/tickets/create')}
                className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
              >
                Create New Ticket
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Group</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned To</th>
                  <th className="px-5 py-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const p = t.priority || 'MEDIUM';
                  const isHigh = p === 'HIGH' || p === 'URGENT';
                  const isLow = p === 'LOW';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-sky-600">#{t.ticketNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{t.group?.name || 'EMR Support'}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHigh
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : isLow
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}
                        >
                          {isHigh ? 'High' : isLow ? 'Low' : 'Medium'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : t.status === 'PENDING' || t.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : t.status === 'RESOLVED'
                              ? 'bg-sky-50 text-sky-600 border border-sky-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {t.status === 'IN_PROGRESS'
                            ? 'In Progress'
                            : t.status === 'RESOLVED'
                            ? 'Resolved'
                            : t.status === 'CLOSED'
                            ? 'Closed'
                            : t.status === 'PENDING'
                            ? 'Pending'
                            : 'Open'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {t.agent?.name || 'Unassigned'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            {/* Numbered Pagination */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => updateFilter('page', String(page - 1))}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => updateFilter('page', String(pNum))}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                    page === pNum
                      ? 'bg-[#0284c7] text-white shadow-xs'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              {pagination.totalPages > 5 && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    onClick={() => updateFilter('page', String(pagination.totalPages))}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                      page === pagination.totalPages
                        ? 'bg-[#0284c7] text-white'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => updateFilter('page', String(page + 1))}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span>
              Showing {Math.min((page - 1) * pagination.limit + 1, pagination.total)}-
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
