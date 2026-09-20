import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import dashboardApi from '../services/dashboardApi.js';
import { Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from '../components/ui/index.jsx';

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
        dashboardApi.getRecentTickets(null, 5),
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

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Welcome Banner matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's what's happening with your tickets today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayFormatted} (Today)</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            title="Refresh metrics"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 KPI Metric Cards matching reference Freshdesk design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Tickets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-semibold text-slate-500">Total Tickets</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {loading ? '-' : summary.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Real-time database count</p>
        </div>

        {/* Open */}
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-semibold text-emerald-800">Open</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {loading ? '-' : summary.open}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">Awaiting response</p>
        </div>

        {/* Pending */}
        <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs font-semibold text-amber-800">Pending</span>
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {loading ? '-' : summary.pending}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-1 font-medium">Under investigation</p>
        </div>

        {/* Resolved */}
        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-semibold text-blue-800">Resolved</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {loading ? '-' : summary.resolved}
          </div>
          <p className="text-[11px] text-blue-600/80 mt-1 font-medium">Completed actions</p>
        </div>

        {/* Closed */}
        <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-xs font-semibold text-rose-800">Closed</span>
          </div>
          <div className="text-2xl font-bold text-rose-900">
            {loading ? '-' : summary.closed}
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1 font-medium">Finalized tickets</p>
        </div>
      </div>

      {/* Recent Tickets Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent Tickets</h3>
            <p className="text-xs text-slate-400">Latest tickets logged into the service desk</p>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                Create First Ticket
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Group</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-blue-600">#{t.ticketNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{t.subject}</td>
                    <td className="px-5 py-3.5 text-slate-600">{t.group?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{t.ticketType?.name || '-'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(t.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
