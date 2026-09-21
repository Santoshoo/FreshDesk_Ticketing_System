import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import dashboardApi from '../services/dashboardApi.js';
import { EmptyState } from '../components/ui/index.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    inProgress: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumRes, recentRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getRecentTickets(null, 6),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (recentRes.success) setRecentTickets(recentRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard metrics from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  const totalCount = summary.total || 0;
  const openCount = summary.open || 0;
  const pendingCount = (summary.pending || 0) + (summary.inProgress || 0);
  const resolvedCount = summary.resolved || 0;
  const closedCount = summary.closed || 0;

  // Donut chart calculations
  const myTotal = Math.max(1, openCount + pendingCount + resolvedCount + closedCount);
  const openDeg = (openCount / myTotal) * 360;
  const pendingDeg = (pendingCount / myTotal) * 360;
  const resolvedDeg = (resolvedCount / myTotal) * 360;
  const closedDeg = (closedCount / myTotal) * 360;

  const donutGradient = `conic-gradient(
    #10b981 0deg ${openDeg}deg,
    #f59e0b ${openDeg}deg ${openDeg + pendingDeg}deg,
    #0284c7 ${openDeg + pendingDeg}deg ${openDeg + pendingDeg + resolvedDeg}deg,
    #ef4444 ${openDeg + pendingDeg + resolvedDeg}deg 360deg
  )`;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Welcome Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0b1d3a] to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-sky-200 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>KIMS Health ICT Helpdesk System</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Santosh'}! 👋
          </h2>
          <p className="text-xs text-slate-300">
            Real-time support operations, queue management, and resolution metrics.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-xs font-semibold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-sky-300" />
            <span>{todayFormatted}</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            title="Refresh metrics"
            className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>+ Create Ticket</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 KPI Metric Cards with Modern Gradient Top Borders */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Tickets */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-700 to-slate-900" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tickets</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <span className="text-sm font-black">#</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {loading ? '-' : totalCount}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-2">
            <span className="inline-flex items-center text-emerald-600 font-bold">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
            <span>from last week</span>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Open</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {loading ? '-' : openCount}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
              Active
            </span>
            <span>Needs attention</span>
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="text-xs font-bold">⏳</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {loading ? '-' : pendingCount}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-2">
            <span className="inline-flex items-center text-amber-600 font-bold">
              <ArrowDownRight className="w-3 h-3" /> In Progress
            </span>
          </div>
        </div>

        {/* Resolved Tickets */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <span className="text-xs font-bold">✓</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {loading ? '-' : resolvedCount}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-2">
            <span className="inline-flex items-center text-sky-600 font-bold">
              <ArrowUpRight className="w-3 h-3" /> Solved
            </span>
          </div>
        </div>

        {/* Closed Tickets */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Closed</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <span className="text-xs font-bold">🔒</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {loading ? '-' : closedCount}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-2">
            <span className="text-slate-400 text-[10px]">Archived</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Ticket Trend & My Tickets by Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket Trend Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Ticket Trend</h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-sky-500 rounded"></span>
                <span className="text-slate-500">Created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-400 rounded"></span>
                <span className="text-slate-500">Resolved</span>
              </div>
            </div>
          </div>

          {/* SVG Trend Lines */}
          <div className="h-52 w-full relative flex flex-col justify-end pt-2">
            <svg viewBox="0 0 500 150" className="w-full h-44 overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="createdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="resolvedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="0" x2="500" y2="0" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="35" x2="500" y2="35" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="105" x2="500" y2="105" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />

              {/* Created Line & Area */}
              <path
                d="M 0 110 C 80 125, 140 70, 200 80 C 270 90, 320 40, 400 45 C 450 50, 480 75, 500 70 L 500 140 L 0 140 Z"
                fill="url(#createdGrad)"
              />
              <path
                d="M 0 110 C 80 125, 140 70, 200 80 C 270 90, 320 40, 400 45 C 450 50, 480 75, 500 70"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Resolved Line & Area */}
              <path
                d="M 0 130 C 70 110, 130 95, 200 110 C 260 125, 330 80, 400 90 C 450 95, 480 60, 500 55 L 500 140 L 0 140 Z"
                fill="url(#resolvedGrad)"
              />
              <path
                d="M 0 130 C 70 110, 130 95, 200 110 C 260 125, 330 80, 400 90 C 450 95, 480 60, 500 55"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              <circle cx="200" cy="80" r="3" fill="#0284c7" />
              <circle cx="400" cy="45" r="3" fill="#0284c7" />
              <circle cx="500" cy="70" r="3" fill="#0284c7" />
              <circle cx="200" cy="110" r="3" fill="#14b8a6" />
              <circle cx="400" cy="90" r="3" fill="#14b8a6" />
              <circle cx="500" cy="55" r="3" fill="#14b8a6" />
            </svg>

            {/* X-axis Labels */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 px-1">
              <span>Sep 11</span>
              <span>Sep 12</span>
              <span>Sep 13</span>
              <span>Sep 14</span>
              <span>Sep 15</span>
              <span>Sep 16</span>
              <span>Sep 17</span>
            </div>
          </div>
        </div>

        {/* My Tickets by Status Donut (1/3 width) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-800 mb-2">My Tickets by Status</h3>

          <div className="flex items-center justify-center my-auto py-2">
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center relative shadow-inner"
              style={{ background: donutGradient }}
            >
              <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-xs">
                <span className="text-xl font-extrabold text-slate-900 leading-tight">
                  {totalCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">My Tickets</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-slate-600">Open {openCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-slate-600">Pending {pendingCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
              <span className="text-slate-600">Resolved {resolvedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="text-slate-600">Closed {closedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Tickets */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Recent Ticket Queue</h3>
            <p className="text-[11px] text-slate-400">Latest active incidents and service requests across departments</p>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
          >
            <span>View All Tickets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <EmptyState
            title="No tickets found"
            description="The ticket database is currently empty. Click Create Ticket to submit your first ticket."
            action={
              <button
                onClick={() => navigate('/tickets/create')}
                className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-sky-600/20"
              >
                + Create First Ticket
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Ticket #</th>
                  <th className="px-5 py-3.5">Subject & Requester</th>
                  <th className="px-5 py-3.5">Support Group</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => {
                  const priority = t.priority || 'MEDIUM';
                  const isHigh = priority === 'HIGH' || priority === 'URGENT';
                  const isLow = priority === 'LOW';

                  const priorityBg = isHigh
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isLow
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  const priorityDot = isHigh
                    ? 'bg-rose-500'
                    : isLow
                    ? 'bg-emerald-500'
                    : 'bg-amber-500';

                  const statusConfig =
                    t.status === 'OPEN'
                      ? { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Open' }
                      : t.status === 'PENDING'
                      ? { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pending' }
                      : t.status === 'IN_PROGRESS'
                      ? { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'In Progress' }
                      : t.status === 'RESOLVED'
                      ? { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', label: 'Resolved' }
                      : { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: 'Closed' };

                  const requesterName = t.contact?.name || t.creator?.name || 'Staff User';
                  const initial = requesterName[0]?.toUpperCase() || 'U';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-bold font-mono text-sky-600 group-hover:text-sky-700">
                        #{t.ticketNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-black text-[11px] shrink-0">
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block truncate max-w-xs group-hover:text-sky-600 transition-colors">
                              {t.subject}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {requesterName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 text-[11px]">
                          {t.group?.name || 'General Support'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityDot}`} />
                          {priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(t.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
