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
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Santosh'}!
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Here's what's happening with your tickets today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayFormatted} (Today)</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            title="Refresh metrics"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-900"></div>
            <span className="text-xs font-semibold text-slate-500">Total Tickets</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {loading ? '-' : totalCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>12% from last week</span>
          </div>
        </div>

        {/* Open */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-semibold text-slate-500">Open</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {loading ? '-' : openCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>5% (0.7%)</span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs font-semibold text-slate-500">Pending</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {loading ? '-' : pendingCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 mt-1">
            <ArrowDownRight className="w-3 h-3" />
            <span>10% (10%)</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-sky-500"></div>
            <span className="text-xs font-semibold text-slate-500">Resolved</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {loading ? '-' : resolvedCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>20% (12%)</span>
          </div>
        </div>

        {/* Closed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-xs font-semibold text-slate-500">Closed</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {loading ? '-' : closedCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>15% (12%)</span>
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
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Recent Tickets</h3>
          <Link
            to="/tickets"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>View All</span>
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
                className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                Create First Ticket
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
                  <th className="px-5 py-3">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => {
                  const priority = t.priority || 'MEDIUM';
                  const isHigh = priority === 'HIGH' || priority === 'URGENT';
                  const isLow = priority === 'LOW';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-sky-600">#{t.ticketNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{t.subject}</td>
                      <td className="px-5 py-3.5 text-slate-600">{t.group?.name || 'General Support'}</td>
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
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(t.updatedAt).toLocaleDateString('en-US', {
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
      </div>
    </div>
  );
}
