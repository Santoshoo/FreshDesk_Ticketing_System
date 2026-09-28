import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Plus,
  History,
  Bookmark,
  ExternalLink,
  Clock,
  User,
  FolderKanban,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import dashboardApi from '../services/dashboardApi.js';
import ticketApi from '../services/ticketApi.js';
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
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError('');

      const [sumRes, logsRes] = await Promise.all([
        dashboardApi.getSummary(),
        ticketApi.getLogs({ limit: 3 }),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (logsRes.success) setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (!isSilent) {
        setError(
          err.response?.data?.error?.message ||
            'Failed to load dashboard metrics from database.'
        );
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-update every 10 seconds for real-time live activity
    const intervalId = setInterval(() => {
      fetchDashboardData(true);
    }, 10000);

    // Auto-refresh when tab gains focus
    const handleFocus = () => fetchDashboardData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
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

  // Priority Theme Helper (High = Red, Medium = Yellow, Low = Green) with Soft 3D Glass & Light Glow
  const getPriorityTheme = (priority = 'MEDIUM') => {
    const p = String(priority || 'MEDIUM').toUpperCase();

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

  const formatLogTime = (dateInput) => {
    if (!dateInput) return '';
    try {
      return new Date(dateInput).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Stat Card 3D Configs
  const statCardConfigs = [
    {
      key: 'open',
      label: 'Open',
      value: openCount,
      link: '/tickets?status=OPEN',
      bg: 'linear-gradient(145deg, #dbeafe 0%, #bfdbfe 40%, #93c5fd 100%)',
      border: '1.5px solid rgba(255, 255, 255, 0.8)',
      boxShadow:
        '0 12px 30px -4px rgba(59, 130, 246, 0.25), 0 4px 10px rgba(59, 130, 246, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(29, 78, 216, 0.12)',
      hoverShadow:
        '0 18px 36px -4px rgba(59, 130, 246, 0.38), 0 8px 16px rgba(59, 130, 246, 0.18), inset 0 2px 2px rgba(255, 255, 255, 1)',
      labelColor: 'text-blue-950 font-bold',
      numColor: 'text-slate-900',
      orb: 'rgba(59, 130, 246, 0.3)',
      isDark: false,
    },
    {
      key: 'pending',
      label: 'Pending',
      value: pendingCount + onHoldCount,
      link: '/tickets?status=PENDING',
      bg: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 40%, #fda4af 100%)',
      border: '1.5px solid rgba(255, 255, 255, 0.8)',
      boxShadow:
        '0 12px 30px -4px rgba(239, 68, 68, 0.25), 0 4px 10px rgba(239, 68, 68, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(185, 28, 28, 0.12)',
      hoverShadow:
        '0 18px 36px -4px rgba(239, 68, 68, 0.38), 0 8px 16px rgba(239, 68, 68, 0.18), inset 0 2px 2px rgba(255, 255, 255, 1)',
      labelColor: 'text-rose-950 font-bold',
      numColor: 'text-slate-900',
      orb: 'rgba(239, 68, 68, 0.3)',
      isDark: false,
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      value: inProgressCount,
      link: '/tickets?status=IN_PROGRESS',
      bg: 'linear-gradient(145deg, #f3e8ff 0%, #e9d5ff 40%, #d8b4fe 100%)',
      border: '1.5px solid rgba(255, 255, 255, 0.8)',
      boxShadow:
        '0 12px 30px -4px rgba(168, 85, 247, 0.25), 0 4px 10px rgba(168, 85, 247, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(107, 33, 168, 0.12)',
      hoverShadow:
        '0 18px 36px -4px rgba(168, 85, 247, 0.38), 0 8px 16px rgba(168, 85, 247, 0.18), inset 0 2px 2px rgba(255, 255, 255, 1)',
      labelColor: 'text-purple-950 font-bold',
      numColor: 'text-slate-900',
      orb: 'rgba(168, 85, 247, 0.3)',
      isDark: false,
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: resolvedCount,
      link: '/tickets?status=RESOLVED',
      bg: 'linear-gradient(145deg, #ffedd5 0%, #fed7aa 40%, #fdba74 100%)',
      border: '1.5px solid rgba(255, 255, 255, 0.8)',
      boxShadow:
        '0 12px 30px -4px rgba(249, 115, 22, 0.25), 0 4px 10px rgba(249, 115, 22, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(194, 65, 12, 0.12)',
      hoverShadow:
        '0 18px 36px -4px rgba(249, 115, 22, 0.38), 0 8px 16px rgba(249, 115, 22, 0.18), inset 0 2px 2px rgba(255, 255, 255, 1)',
      labelColor: 'text-orange-950 font-bold',
      numColor: 'text-slate-900',
      orb: 'rgba(249, 115, 22, 0.3)',
      isDark: false,
    },
    {
      key: 'closed',
      label: 'Closed',
      value: closedCount,
      link: '/tickets?status=CLOSED',
      bg: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 40%, #86efac 100%)',
      border: '1.5px solid rgba(255, 255, 255, 0.9)',
      boxShadow:
        '0 12px 30px -4px rgba(34, 197, 94, 0.25), 0 4px 10px rgba(34, 197, 94, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(22, 101, 52, 0.12)',
      hoverShadow:
        '0 18px 36px -4px rgba(34, 197, 94, 0.38), 0 8px 16px rgba(34, 197, 94, 0.18), inset 0 2px 2px rgba(255, 255, 255, 1)',
      labelColor: 'text-emerald-950 font-bold',
      numColor: 'text-slate-900',
      orb: 'rgba(34, 197, 94, 0.3)',
      isDark: false,
    },
    {
      key: 'total',
      label: 'Total',
      value: totalCount,
      link: '/tickets',
      bg: 'linear-gradient(145deg, #2e1065 0%, #1e1b4b 50%, #0f172a 100%)',
      border: '1.5px solid rgba(167, 139, 250, 0.35)',
      boxShadow:
        '0 14px 34px -4px rgba(15, 23, 42, 0.5), 0 6px 14px rgba(15, 23, 42, 0.3), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.35), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
      hoverShadow:
        '0 20px 42px -4px rgba(15, 23, 42, 0.65), 0 10px 20px rgba(99, 102, 241, 0.3), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.5)',
      labelColor: 'text-purple-200 font-semibold',
      numColor: 'text-white',
      orb: 'rgba(168, 85, 247, 0.4)',
      isDark: true,
    },
  ];

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-150">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Calendar pill */}
          <div
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 rounded-xl"
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

          {/* Refresh button */}
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={loading}
            title="Refresh Dashboard"
            className="p-2.5 text-slate-600 hover:text-slate-900 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 1px #fff',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
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

      {/* ── Ticket Activity Logs (In place of Recent Tickets, with Priority Color Coding) ── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-2xs border border-indigo-100/60">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Ticket Activity Logs
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isRefreshing ? 'scale-125' : 'animate-pulse'}`}></span>
                  Live Updates
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Real-time stream of ticket assignments, transfers, and status updates
              </p>
            </div>
          </div>

          <Link
            to="/tickets/logs"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline transition-all bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50"
          >
            <span>View All Logs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {logs.length === 0 ? (
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
              icon={History}
              title="No activity logs yet"
              description="Ticket assignments, status updates, and lifecycle actions will automatically appear here in real time."
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
          <div className="space-y-3.5">
            {logs.slice(0, 3).map((log) => {
              const theme = getPriorityTheme(log.priority);
              const formattedTime = formatLogTime(log.timestamp);

              return (
                <div
                  key={log.id}
                  onClick={() => navigate(`/tickets/${log.ticketId}`)}
                  className="p-4 sm:p-5 hover:-translate-y-0.5 hover:scale-[1.006] transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
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
                  {/* Glowing vertical accent bar on left */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 pointer-events-none rounded-l-[20px]"
                    style={{
                      background: theme.lineColor,
                      boxShadow: theme.neonBarGlow,
                    }}
                  />

                  {/* Top specular reflection */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-[20px] opacity-70" />

                  {/* Subtle orb in top right */}
                  <div
                    className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-lg pointer-events-none opacity-60"
                    style={{ background: theme.orbColor }}
                  />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Top line with bookmark badge, subject, timestamp, priority badge */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Bookmark Ticket Badge */}
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 hover:bg-white text-indigo-700 font-mono font-bold text-xs rounded-lg border border-slate-200/80 shadow-2xs group-hover:border-indigo-300 transition-colors"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                          <span>#{log.ticketNumber}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 ml-0.5" />
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="text-xs font-bold text-slate-800 truncate max-w-sm">
                          {log.subject}
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formattedTime}
                        </span>

                        {/* Priority Pill Badge */}
                        <span
                          className="ml-auto md:ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white tracking-wide shadow-2xs shrink-0"
                          style={{
                            background: theme.pillBg,
                            boxShadow: theme.pillShadow,
                          }}
                        >
                          {theme.badgeText}
                        </span>
                      </div>

                      {/* Main action sentence */}
                      <div className="text-xs sm:text-sm text-slate-900 font-semibold bg-white/70 backdrop-blur-sm border border-slate-200/60 p-2.5 rounded-xl shadow-2xs leading-snug">
                        {log.sentence}
                      </div>

                      {/* Context chips: Requester, Type, Group */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 rounded-md border border-slate-200/60 text-slate-700">
                          <User className="w-3 h-3 text-slate-400" />
                          Requester: <strong className="font-semibold text-slate-900">{log.contactName || 'N/A'}</strong>
                        </span>

                        {log.typeName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 rounded-md border border-slate-200/60 text-slate-700">
                            <Tag className="w-3 h-3 text-slate-400" />
                            Type: <strong className="font-semibold text-slate-900">{log.typeName}</strong>
                          </span>
                        )}

                        {log.groupName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 rounded-md border border-slate-200/60 text-slate-700">
                            <FolderKanban className="w-3 h-3 text-slate-400" />
                            Group: <strong className="font-semibold text-slate-900">{log.groupName}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right action button */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200/90 rounded-xl shadow-2xs group-hover:border-indigo-300 group-hover:text-indigo-700 transition-all">
                        <span>View Ticket</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
