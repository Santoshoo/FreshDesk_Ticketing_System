import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Plus,
  BarChart2,
  ChevronDown,
  ChevronUp,
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
    inProgress: 0,
    onHold: 0,
    resolved: 0,
    closed: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumRes, recentRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getRecentTickets(null, 8),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (recentRes.success) setRecentTickets(recentRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(
        err.response?.data?.error?.message ||
          'Failed to load dashboard metrics from database.'
      );
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
  const pendingCount = summary.pending || 0;
  const inProgressCount = summary.inProgress || 0;
  const onHoldCount = summary.onHold || 0;
  const resolvedCount = summary.resolved || 0;
  const closedCount = summary.closed || 0;
  const activeQueueCount = openCount + pendingCount + inProgressCount + onHoldCount;

  // Donut chart calculations for collapsible analytics view
  const myTotal = Math.max(1, openCount + pendingCount + resolvedCount + closedCount);
  const openDeg = (openCount / myTotal) * 360;
  const pendingDeg = (pendingCount / myTotal) * 360;
  const resolvedDeg = (resolvedCount / myTotal) * 360;
  const closedDeg = (closedCount / myTotal) * 360;

  const donutGradient = `conic-gradient(
    #10b981 0deg ${openDeg}deg,
    #f59e0b ${openDeg}deg ${openDeg + pendingDeg}deg,
    #6366f1 ${openDeg + pendingDeg}deg ${openDeg + pendingDeg + resolvedDeg}deg,
    #ef4444 ${openDeg + pendingDeg + resolvedDeg}deg 360deg
  )`;

  // Priority Theme Helper (High = Red, Medium = Yellow, Low = Green) with Soft 3D Glass & Light Glow
  const getPriorityTheme = (priority = 'MEDIUM') => {
    const p = priority?.toUpperCase();

    // High or Urgent -> Soft Red 3D Glass, Light Red glow, Red pill
    if (p === 'HIGH' || p === 'URGENT') {
      return {
        badgeText: p === 'URGENT' ? 'Urgent' : 'High',
        pillBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        pillShadow: '0 2px 8px rgba(239, 68, 68, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
        lineColor: '#ef4444',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        glowShadow:
          '0 8px 22px -4px rgba(239, 68, 68, 0.14), 0 3px 8px rgba(239, 68, 68, 0.06), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(239, 68, 68, 0.08)',
        hoverGlow:
          '0 12px 26px -4px rgba(239, 68, 68, 0.24), 0 5px 12px rgba(239, 68, 68, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
        bgWash:
          'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(254, 242, 242, 0.75) 45%, rgba(254, 226, 226, 0.85) 100%)',
        neonBarGlow: '0 0 8px 1px rgba(239, 68, 68, 0.4)',
        orbColor: 'rgba(239, 68, 68, 0.12)',
      };
    }

    // Low -> Soft Green 3D Glass, Light Green glow, Green pill
    if (p === 'LOW') {
      return {
        badgeText: 'Low',
        pillBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        pillShadow: '0 2px 8px rgba(16, 185, 129, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
        lineColor: '#10b981',
        borderColor: 'rgba(16, 185, 129, 0.4)',
        glowShadow:
          '0 8px 22px -4px rgba(16, 185, 129, 0.14), 0 3px 8px rgba(16, 185, 129, 0.06), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(16, 185, 129, 0.08)',
        hoverGlow:
          '0 12px 26px -4px rgba(16, 185, 129, 0.24), 0 5px 12px rgba(16, 185, 129, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
        bgWash:
          'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 253, 244, 0.75) 45%, rgba(209, 250, 229, 0.85) 100%)',
        neonBarGlow: '0 0 8px 1px rgba(16, 185, 129, 0.4)',
        orbColor: 'rgba(16, 185, 129, 0.12)',
      };
    }

    // Default: Medium -> Soft Yellow 3D Glass, Light Yellow glow, Yellow pill
    return {
      badgeText: 'Medium',
      pillBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      pillShadow: '0 2px 8px rgba(245, 158, 11, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
      lineColor: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      glowShadow:
        '0 8px 22px -4px rgba(245, 158, 11, 0.14), 0 3px 8px rgba(245, 158, 11, 0.06), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(245, 158, 11, 0.08)',
      hoverGlow:
        '0 12px 26px -4px rgba(245, 158, 11, 0.24), 0 5px 12px rgba(245, 158, 11, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
      bgWash:
        'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(254, 252, 232, 0.75) 45%, rgba(254, 243, 199, 0.85) 100%)',
      neonBarGlow: '0 0 8px 1px rgba(245, 158, 11, 0.4)',
      orbColor: 'rgba(245, 158, 11, 0.12)',
    };
  };

  // Status formatter helper: Open, In Progress, Pending, Resolved, Closed
  const formatStatus = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'Open';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'PENDING':
        return 'Pending';
      case 'ON_HOLD':
        return 'On Hold';
      case 'RESOLVED':
        return 'Resolved';
      case 'CLOSED':
        return 'Closed';
      default:
        return status || 'Open';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'text-emerald-600';
      case 'IN_PROGRESS':
        return 'text-purple-600';
      case 'PENDING':
        return 'text-amber-600';
      case 'ON_HOLD':
        return 'text-cyan-600';
      case 'RESOLVED':
        return 'text-blue-600';
      case 'CLOSED':
        return 'text-slate-500';
      default:
        return 'text-slate-700';
    }
  };

  // 3D Glowing Glass Card Configuration for Top 8 Metrics (Refined Light Glow)
  const statCardConfigs = [
    {
      key: 'open',
      label: 'Open',
      value: openCount,
      link: '/tickets?status=OPEN',
      bg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(209, 250, 229, 0.72) 42%, rgba(167, 243, 208, 0.85) 100%)',
      border: '1.5px solid rgba(52, 211, 153, 0.5)',
      boxShadow:
        '0 10px 24px -4px rgba(16, 185, 129, 0.16), 0 4px 10px rgba(16, 185, 129, 0.08), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(16, 185, 129, 0.08)',
      hoverShadow:
        '0 14px 30px -4px rgba(16, 185, 129, 0.26), 0 6px 14px rgba(16, 185, 129, 0.14), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
      orb: 'rgba(52, 211, 153, 0.16)',
      labelColor: 'text-emerald-950 font-bold',
      numColor: 'text-slate-900',
    },
    {
      key: 'pending',
      label: 'Pending',
      value: pendingCount,
      link: '/tickets?status=PENDING',
      bg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 243, 199, 0.72) 42%, rgba(253, 230, 138, 0.85) 100%)',
      border: '1.5px solid rgba(251, 191, 36, 0.5)',
      boxShadow:
        '0 10px 24px -4px rgba(245, 158, 11, 0.16), 0 4px 10px rgba(245, 158, 11, 0.08), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(245, 158, 11, 0.08)',
      hoverShadow:
        '0 14px 30px -4px rgba(245, 158, 11, 0.26), 0 6px 14px rgba(245, 158, 11, 0.14), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
      orb: 'rgba(251, 191, 36, 0.16)',
      labelColor: 'text-amber-950 font-bold',
      numColor: 'text-slate-900',
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      value: inProgressCount,
      link: '/tickets?status=IN_PROGRESS',
      bg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.72) 42%, rgba(233, 213, 255, 0.85) 100%)',
      border: '1.5px solid rgba(192, 132, 252, 0.5)',
      boxShadow:
        '0 10px 24px -4px rgba(168, 85, 247, 0.16), 0 4px 10px rgba(168, 85, 247, 0.08), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(168, 85, 247, 0.08)',
      hoverShadow:
        '0 14px 30px -4px rgba(168, 85, 247, 0.26), 0 6px 14px rgba(168, 85, 247, 0.14), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
      orb: 'rgba(192, 132, 252, 0.16)',
      labelColor: 'text-purple-950 font-bold',
      numColor: 'text-slate-900',
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: resolvedCount,
      link: '/tickets?status=RESOLVED',
      bg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(224, 231, 255, 0.72) 42%, rgba(199, 210, 254, 0.85) 100%)',
      border: '1.5px solid rgba(129, 140, 248, 0.5)',
      boxShadow:
        '0 10px 24px -4px rgba(79, 70, 229, 0.16), 0 4px 10px rgba(79, 70, 229, 0.08), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(79, 70, 229, 0.08)',
      hoverShadow:
        '0 14px 30px -4px rgba(79, 70, 229, 0.26), 0 6px 14px rgba(79, 70, 229, 0.14), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
      orb: 'rgba(129, 140, 248, 0.16)',
      labelColor: 'text-indigo-950 font-bold',
      numColor: 'text-slate-900',
    },
    {
      key: 'closed',
      label: 'Closed',
      value: closedCount,
      link: '/tickets?status=CLOSED',
      bg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.72) 42%, rgba(226, 232, 240, 0.85) 100%)',
      border: '1.5px solid rgba(148, 163, 184, 0.5)',
      boxShadow:
        '0 10px 24px -4px rgba(100, 116, 139, 0.14), 0 4px 10px rgba(100, 116, 139, 0.06), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.95)',
      hoverShadow:
        '0 14px 30px -4px rgba(100, 116, 139, 0.22), 0 6px 14px rgba(100, 116, 139, 0.1), inset 0 1.5px 1.5px rgba(255, 255, 255, 1)',
      orb: 'rgba(148, 163, 184, 0.14)',
      labelColor: 'text-slate-800 font-bold',
      numColor: 'text-slate-900',
    },
    {
      key: 'total',
      label: 'Total',
      value: totalCount,
      link: '/tickets',
      bg: 'linear-gradient(145deg, #1e1b4b 0%, #2e1065 40%, #4338ca 100%)',
      border: '1.5px solid rgba(199, 210, 254, 0.55)',
      boxShadow:
        '0 14px 30px -4px rgba(79, 70, 229, 0.42), 0 6px 14px -2px rgba(124, 58, 237, 0.25), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.4), inset 0 -1.5px 3px rgba(0, 0, 0, 0.4)',
      hoverShadow:
        '0 18px 36px -4px rgba(79, 70, 229, 0.55), 0 8px 18px rgba(124, 58, 237, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55)',
      orb: 'rgba(124, 58, 237, 0.3)',
      labelColor: 'text-indigo-200 font-bold',
      numColor: 'text-white',
      isDark: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Dashboard Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 shadow-2xs"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px #fff',
            }}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{todayFormatted}</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            title="Refresh metrics"
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px #fff',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl text-white transition-all duration-200 active:scale-[0.98] cursor-pointer hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow:
                '0 10px 24px -4px rgba(99, 102, 241, 0.5), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.4)',
            }}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create Ticket</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 6 Stat Boxes with 3D Depth, Luminous Glow & Specular Glassmorphism ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {statCardConfigs.map((c) => (
          <div
            key={c.key}
            onClick={() => navigate(c.link)}
            className="rounded-2xl p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1.5 hover:scale-[1.02]"
            style={{
              background: c.bg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: c.border,
              boxShadow: c.boxShadow,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = c.hoverShadow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = c.boxShadow;
            }}
          >
            {/* Top specular curved glass reflection */}
            <div
              className={`absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl ${
                c.isDark
                  ? 'bg-gradient-to-b from-white/20 to-transparent'
                  : 'bg-gradient-to-b from-white/55 to-transparent'
              }`}
            />

            {/* Subtle light glowing colored orb in top-right */}
            <div
              className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-lg pointer-events-none opacity-60"
              style={{ background: c.orb }}
            />

            <span className={`text-sm tracking-tight relative z-10 ${c.labelColor}`}>
              {c.label}
            </span>

            <div
              className={`text-3xl sm:text-4xl font-black tracking-tight mt-2.5 relative z-10 ${c.numColor}`}
              style={{
                textShadow: c.isDark
                  ? '0 2px 8px rgba(129, 140, 248, 0.35)'
                  : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              {loading ? '-' : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent tickets section (4-column Grid with 3D Neon Glassmorphism) ── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Recent tickets
          </h2>
          <Link
            to="/tickets"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline transition-all"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
            }}
          >
            <EmptyState
              title="No tickets found"
              description="The ticket database is currently empty. Click Create Ticket to submit your first ticket."
              action={
                <button
                  onClick={() => navigate('/tickets/create')}
                  className="inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  + Create First Ticket
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentTickets.map((t) => {
              const theme = getPriorityTheme(t.priority);
              const ticketDate = new Date(t.updatedAt || t.createdAt).toLocaleDateString(
                'en-GB',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }
              );

              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="p-5 hover:-translate-y-1.5 hover:scale-[1.015] transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  style={{
                    background: theme.bgWash,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1.5px solid ${theme.borderColor}`,
                    borderLeft: `5px solid ${theme.lineColor}`,
                    boxShadow: theme.glowShadow,
                    borderRadius: '20px',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = theme.hoverGlow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = theme.glowShadow;
                  }}
                >
                  {/* Subtle glowing vertical accent bar on left */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 pointer-events-none rounded-l-[20px]"
                    style={{
                      background: theme.lineColor,
                      boxShadow: theme.neonBarGlow,
                    }}
                  />

                  {/* Top specular curved glass reflection */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-[20px] opacity-70" />

                  {/* Subtle light glowing colored orb in top-right */}
                  <div
                    className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-lg pointer-events-none opacity-60"
                    style={{ background: theme.orbColor }}
                  />

                  {/* Top: Priority on left, 3D Glowing pill badge on right */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
                    <span className="text-xs font-bold text-slate-700">Priority</span>
                    <span
                      className="px-3 py-0.5 rounded-full text-[11px] font-bold text-white tracking-wide"
                      style={{
                        background: theme.pillBg,
                        boxShadow: theme.pillShadow,
                      }}
                    >
                      {theme.badgeText}
                    </span>
                  </div>

                  {/* Middle: Subject title */}
                  <div className="my-2 flex-1 relative z-10">
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                      {t.subject}
                    </h3>
                  </div>

                  {/* Bottom: Status: [Open / Closed / Pending / Resolved / In Progress] */}
                  <div className="pt-2.5 flex items-center justify-between text-xs border-t border-slate-200/60 relative z-10">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <span>Status:</span>
                      <span className={`font-bold ${getStatusColor(t.status)}`}>
                        {formatStatus(t.status)}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {ticketDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Collapsible Analytics View (Optional) ── */}
      <div className="pt-3 border-t border-slate-200/60">
        <button
          type="button"
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all font-bold text-xs shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span>
              {showAnalytics
                ? 'Hide Performance Trends & Chart Analytics'
                : 'View Performance Trends & Chart Analytics'}
            </span>
          </div>
          {showAnalytics ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 animate-in fade-in duration-200">
            {/* Ticket Trend Chart */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Ticket Trend</h3>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-indigo-500 rounded"></span>
                    <span className="text-slate-500">Created</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-teal-400 rounded"></span>
                    <span className="text-slate-500">Resolved</span>
                  </div>
                </div>
              </div>

              <div className="h-52 w-full relative flex flex-col justify-end pt-2">
                <svg viewBox="0 0 500 150" className="w-full h-44 overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="createdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="0" x2="500" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="35" x2="500" y2="35" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="70" x2="500" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="105" x2="500" y2="105" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                  <path
                    d="M 0 110 C 80 125, 140 70, 200 80 C 270 90, 320 40, 400 45 C 450 50, 480 75, 500 70 L 500 140 L 0 140 Z"
                    fill="url(#createdGrad)"
                  />
                  <path
                    d="M 0 110 C 80 125, 140 70, 200 80 C 270 90, 320 40, 400 45 C 450 50, 480 75, 500 70"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
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
                  <circle cx="200" cy="80" r="3" fill="#6366f1" />
                  <circle cx="400" cy="45" r="3" fill="#6366f1" />
                  <circle cx="500" cy="70" r="3" fill="#6366f1" />
                  <circle cx="200" cy="110" r="3" fill="#14b8a6" />
                  <circle cx="400" cy="90" r="3" fill="#14b8a6" />
                  <circle cx="500" cy="55" r="3" fill="#14b8a6" />
                </svg>

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

            {/* My Tickets by Status Donut */}
            <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
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
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="text-slate-600">Resolved {resolvedCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                  <span className="text-slate-600">Closed {closedCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
