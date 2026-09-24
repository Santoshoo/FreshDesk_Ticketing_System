import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Ticket as TicketIcon,
  Plus,
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
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
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
          limit: pagination.limit || 10,
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
  }, [search, status, groupId, priority, page, pagination.limit]);

  const updateFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleExportCSV = () => {
    if (!tickets || tickets.length === 0) return;
    const headers = [
      'Ticket Number',
      'Subject',
      'Requester',
      'Group',
      'Priority',
      'Status',
      'Assigned To',
      'Created At',
    ];
    const rows = tickets.map((t) => [
      `#${t.ticketNumber}`,
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      `"${t.contact?.name || t.creator?.name || 'Staff User'}"`,
      `"${t.group?.name || 'General'}"`,
      t.priority || 'MEDIUM',
      t.status,
      `"${t.agent?.name || 'Unassigned'}"`,
      new Date(t.createdAt).toLocaleDateString(),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Tickets_Export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = summary.total || pagination.total || 0;
  const openCount = summary.open || 0;
  const pendingCount = summary.pending || 0;
  const inProgressCount = summary.inProgress || 0;
  const resolvedCount = summary.resolved || 0;
  const closedCount = summary.closed || 0;

  // Filter Pill Tabs matching Screenshot 1
  const statusTabs = [
    { label: 'All', count: totalCount, value: '' },
    { label: 'Open', count: openCount, value: 'OPEN' },
    { label: 'Pending', count: pendingCount, value: 'PENDING' },
    { label: 'In Progress', count: inProgressCount, value: 'IN_PROGRESS' },
    { label: 'Resolved', count: resolvedCount, value: 'RESOLVED' },
    { label: 'Closed', count: closedCount, value: 'CLOSED' },
  ];

  // Helper for priority badges in table matching Screenshot 1
  const getPriorityStyle = (p = 'MEDIUM') => {
    const pr = p?.toUpperCase();
    if (pr === 'HIGH' || pr === 'URGENT') {
      return {
        label: pr === 'URGENT' ? 'Urgent' : 'High',
        stripeBg: 'bg-rose-500',
        badgeClass: 'bg-[#fee2e2] text-[#ef4444]',
      };
    }
    if (pr === 'LOW') {
      return {
        label: 'Low',
        stripeBg: 'bg-emerald-500',
        badgeClass: 'bg-[#dcfce7] text-[#15803d]',
      };
    }
    return {
      label: 'Medium',
      stripeBg: 'bg-amber-500',
      badgeClass: 'bg-[#fef3c7] text-[#d97706]',
    };
  };

  const getStatusBadge = (st = 'OPEN') => {
    switch (st?.toUpperCase()) {
      case 'OPEN':
        return {
          label: 'Open',
          badgeClass: 'bg-[#dbeafe] text-[#1d4ed8]',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          badgeClass: 'bg-[#fef3c7] text-[#b45309]',
        };
      case 'PENDING':
        return {
          label: 'Pending',
          badgeClass: 'bg-[#f1f5f9] text-[#475569]',
        };
      case 'RESOLVED':
        return {
          label: 'Resolved',
          badgeClass: 'bg-[#dcfce7] text-[#15803d]',
        };
      case 'CLOSED':
      default:
        return {
          label: 'Closed',
          badgeClass: 'bg-[#f1f5f9] text-[#64748b]',
        };
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const avatarColorMap = [
    'bg-cyan-100 text-cyan-800',
    'bg-purple-100 text-purple-800',
    'bg-blue-100 text-blue-800',
    'bg-rose-100 text-rose-800',
    'bg-amber-100 text-amber-800',
    'bg-emerald-100 text-emerald-800',
  ];

  const getAvatarColor = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return avatarColorMap[Math.abs(hash) % avatarColorMap.length];
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Title & Subtitle matching Screenshot 1 ── */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          All Tickets
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Viewing all customer support requests
        </p>
      </div>

      {/* ── Filter Pill Tabs Row with Create Ticket Button (Matching Screenshot 1) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Pills row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {statusTabs.map((tab) => {
            const isActive = status === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => updateFilter('status', tab.value)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-[#1e40af] hover:opacity-90'
                }`}
                style={
                  isActive
                    ? { background: '#2563eb' }
                    : { background: '#dbeafe' }
                }
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-[#1e40af] text-white' : 'bg-[#1d4ed8] text-white'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* + Create Ticket Button on the Right (Matching Screenshot 1) */}
        <button
          onClick={() => navigate('/tickets/create')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 cursor-pointer hover:opacity-95 active:scale-95"
          style={{ background: '#2563eb' }}
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Create Ticket</span>
        </button>
      </div>

      {/* ── Priority-Striped Tickets Table Card (Matching Screenshot 1) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Sleek integrated table toolbar: Search, Filters, Refresh, Export */}
        <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tickets by subject or #ID..."
                value={search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={groupId}
              onChange={(e) => updateFilter('groupId', e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">Group: All</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">Priority: All</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {(search || status || groupId || priority) && (
              <button
                onClick={handleReset}
                className="text-xs font-bold text-blue-600 hover:underline px-1.5 cursor-pointer"
              >
                Reset
              </button>
            )}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={fetchTickets}
              disabled={loading}
              title="Refresh tickets"
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              title="Export CSV"
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-20 text-center">
            <div
              className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }}
            ></div>
            <p className="text-xs text-slate-400 font-medium">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets found"
            description="No tickets match the selected filters."
            action={
              <button
                onClick={() => navigate('/tickets/create')}
                className="inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                style={{ background: '#2563eb' }}
              >
                Create New Ticket
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/70 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">#ID</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Requester</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Agent</th>
                  <th className="px-5 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const priorityConfig = getPriorityStyle(t.priority);
                  const statusConfig = getStatusBadge(t.status);

                  const requesterName =
                    t.contact?.name || t.creator?.name || 'Staff User';
                  const requesterInitials = getInitials(requesterName);
                  const requesterColor = getAvatarColor(requesterName);

                  const agentName = t.agent?.name || 'Unassigned';
                  const agentInitials = getInitials(agentName);
                  const agentColor = getAvatarColor(agentName);

                  const departmentName =
                    t.contact?.department?.name ||
                    t.creator?.department?.name ||
                    t.group?.name ||
                    'General';

                  const createdDate = new Date(t.createdAt).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  );

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* #ID */}
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900 text-xs">
                        #{t.ticketNumber}
                      </td>

                      {/* Subject with Vertical Priority Stripe */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {/* Priority Stripe */}
                          <span
                            className={`w-1 h-5 rounded-full shrink-0 ${priorityConfig.stripeBg}`}
                          />
                          <span className="font-bold text-slate-800 max-w-xs sm:max-w-sm truncate block group-hover:text-blue-600 transition-colors">
                            {t.subject}
                          </span>
                        </div>
                      </td>

                      {/* Requester with Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${requesterColor}`}
                          >
                            {requesterInitials}
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[120px]">
                            {requesterName}
                          </span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {departmentName}
                      </td>

                      {/* Priority Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold ${priorityConfig.badgeClass}`}
                        >
                          {priorityConfig.label}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.badgeClass}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Agent with Avatar */}
                      <td className="px-5 py-3.5">
                        {t.agent ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${agentColor}`}
                              title={agentName}
                            >
                              {agentInitials}
                            </div>
                            <span className="font-medium text-slate-700 truncate max-w-[100px] hidden xl:inline">
                              {agentName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {createdDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer matching Screenshot 1 ── */}
        {pagination.total > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            {/* Left: Showing count */}
            <span className="font-medium text-slate-500">
              Showing {Math.min((page - 1) * pagination.limit + 1, pagination.total)}-
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} tickets
            </span>

            {/* Right: Controls (Prev, Page Numbers, Next, Page Size) */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => updateFilter('page', String(page - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-semibold text-slate-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  Prev
                </button>

                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(
                  (pNum) => (
                    <button
                      key={pNum}
                      onClick={() => updateFilter('page', String(pNum))}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        page === pNum
                          ? 'text-white shadow-xs'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                      style={page === pNum ? { background: '#2563eb' } : {}}
                    >
                      {pNum}
                    </button>
                  )
                )}

                {pagination.totalPages > 5 && (
                  <>
                    <span className="px-1 text-slate-400 font-bold">...</span>
                    <button
                      onClick={() => updateFilter('page', String(pagination.totalPages))}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        page === pagination.totalPages
                          ? 'text-white'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                      style={page === pagination.totalPages ? { background: '#2563eb' } : {}}
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}

                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => updateFilter('page', String(page + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-semibold text-slate-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>

              {/* Rows Per Page dropdown */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }));
                    updateFilter('page', '1');
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value={10}>10/page</option>
                  <option value={25}>25/page</option>
                  <option value={50}>50/page</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
