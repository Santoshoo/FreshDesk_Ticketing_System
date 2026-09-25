import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  FolderKanban,
  Tag,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Award,
  Layers,
  UserCheck,
  Percent,
  Download,
} from 'lucide-react';
import dashboardApi from '../services/dashboardApi.js';
import ReportDownloadModal from '../components/modals/ReportDownloadModal.jsx';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('trends'); // 'trends' | 'category' | 'group' | 'agent'
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [groupData, setGroupData] = useState([]);
  const [agentData, setAgentData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filters for tables
  const [searchCategory, setSearchCategory] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [sumRes, catRes, grpRes, agRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getCategoryReport(),
        dashboardApi.getGroupReport(),
        dashboardApi.getAgentReport(),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (catRes.success) setCategoryData(catRes.data || []);
      if (grpRes.success) setGroupData(grpRes.data || []);
      if (agRes.success) setAgentData(agRes.data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Trends KPIs
  const total = summary?.total || 0;
  const open = summary?.open || 0;
  const pending = (summary?.pending || 0) + (summary?.inProgress || 0);
  const resolved = summary?.resolved || 0;
  const closed = summary?.closed || 0;

  const openPct = Math.round((open / (total || 1)) * 100);
  const pendingPct = Math.round((pending / (total || 1)) * 100);
  const resolvedPct = Math.round((resolved / (total || 1)) * 100);
  const closedPct = Math.max(0, 100 - openPct - pendingPct - resolvedPct);

  const donutGradient = `conic-gradient(
    #10b981 0deg ${openPct * 3.6}deg,
    #f59e0b ${openPct * 3.6}deg ${(openPct + pendingPct) * 3.6}deg,
    #6366f1 ${(openPct + pendingPct) * 3.6}deg ${(openPct + pendingPct + resolvedPct) * 3.6}deg,
    #ef4444 ${(openPct + pendingPct + resolvedPct) * 3.6}deg 360deg
  )`;

  // Category Tab Calculations
  const activeCategories = useMemo(
    () => categoryData.filter((c) => c.total > 0),
    [categoryData]
  );
  const filteredCategories = useMemo(() => {
    if (!searchCategory) return categoryData;
    return categoryData.filter((c) =>
      c.name.toLowerCase().includes(searchCategory.toLowerCase())
    );
  }, [categoryData, searchCategory]);

  const topCategory = activeCategories.length > 0 ? activeCategories[0] : null;

  // Group Tab Calculations
  const activeGroups = useMemo(
    () => groupData.filter((g) => g.total > 0),
    [groupData]
  );
  const filteredGroups = useMemo(() => {
    if (!searchGroup) return groupData;
    return groupData.filter((g) =>
      g.name.toLowerCase().includes(searchGroup.toLowerCase())
    );
  }, [groupData, searchGroup]);

  const topGroup = activeGroups.length > 0 ? activeGroups[0] : null;
  const highestResolutionGroup = useMemo(() => {
    const withRes = activeGroups.filter((g) => g.resolutionRate > 0);
    if (withRes.length === 0) return null;
    return [...withRes].sort((a, b) => b.resolutionRate - a.resolutionRate)[0];
  }, [activeGroups]);

  // Agent Tab Calculations
  const activeAgents = useMemo(
    () => agentData.filter((a) => a.id !== null && a.total > 0),
    [agentData]
  );
  const unassignedQueue = useMemo(
    () => agentData.find((a) => a.id === null) || { total: 0, open: 0 },
    [agentData]
  );
  const topAgent = useMemo(() => {
    if (activeAgents.length === 0) return null;
    return [...activeAgents].sort((a, b) => (b.resolved + b.closed) - (a.resolved + a.closed))[0];
  }, [activeAgents]);

  const filteredAgents = useMemo(() => {
    if (!searchAgent) return agentData;
    const query = searchAgent.toLowerCase();
    return agentData.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        (a.employeeId && a.employeeId.toLowerCase().includes(query)) ||
        (a.email && a.email.toLowerCase().includes(query))
    );
  }, [agentData, searchAgent]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational metrics, ticket distributions, and service performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDownloadModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
            title="Download Reports (Month-wise, Week-wise, Day-wise)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>All-Time Real-Time Data</span>
          </div>

          <button
            onClick={fetchReports}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 shadow-2xs transition-colors cursor-pointer"
            title="Refresh reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold text-slate-500 overflow-x-auto">
        {[
          { id: 'trends', label: 'Ticket Trends', icon: TrendingUp },
          { id: 'category', label: 'Category Wise', icon: Tag },
          { id: 'group', label: 'Group Wise', icon: FolderKanban },
          { id: 'agent', label: 'Agent Wise', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 flex items-center gap-1.5 transition-colors relative whitespace-nowrap cursor-pointer ${
                isActive ? 'text-[#6366f1] font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#6366f1]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6366f1] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: TICKET TRENDS ================= */}
      {activeTab === 'trends' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Total Tickets</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-xs font-semibold text-emerald-600">Open</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{open}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-xs font-semibold text-amber-600">Pending</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{pending}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-xs font-semibold text-indigo-600">Resolved</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">{resolved}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-xs font-semibold text-rose-600">Closed</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1">{closed}</p>
            </div>
          </div>

          {/* Top Chart: Tickets Over Time Area Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
              <span>Tickets Over Time</span>
              <span className="text-xs font-normal text-slate-400">Past Months Activity</span>
            </h3>

            <div className="h-48 w-full relative flex flex-col justify-end">
              <svg viewBox="0 0 600 130" className="w-full h-40 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                <line x1="0" y1="0" x2="600" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="60" x2="600" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                <path
                  d="M 0 100 C 60 110, 120 70, 180 85 C 240 100, 300 40, 360 45 C 420 50, 480 80, 540 60 L 600 30 L 600 120 L 0 120 Z"
                  fill="url(#areaGrad)"
                />
                <path
                  d="M 0 100 C 60 110, 120 70, 180 85 C 240 100, 300 40, 360 45 C 420 50, 480 80, 540 60 L 600 30"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data points */}
                <circle cx="180" cy="85" r="3.5" fill="#6366f1" />
                <circle cx="360" cy="45" r="3.5" fill="#6366f1" />
                <circle cx="540" cy="60" r="3.5" fill="#6366f1" />
                <circle cx="600" cy="30" r="3.5" fill="#6366f1" />
              </svg>

              {/* Month Labels */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 px-1">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Tickets by Status & Tickets by Group */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tickets by Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Tickets by Status</h3>

              <div className="flex items-center justify-around py-4">
                <div
                  className="w-36 h-36 rounded-full flex items-center justify-center relative shadow-inner shrink-0"
                  style={{ background: donutGradient }}
                >
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-xs">
                    <span className="text-xl font-extrabold text-slate-900 leading-tight">
                      {total}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">Tickets</span>
                  </div>
                </div>

                {/* Legend with percentages */}
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-700">Open {open} ({openPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-700">Pending {pending} ({pendingPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="text-slate-700">Resolved {resolved} ({resolvedPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-slate-700">Closed {closed} ({closedPct}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets by Group Bar Chart with Real Data */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Tickets by Group</h3>
                <span className="text-[11px] text-slate-400 font-medium">Top Active Groups</span>
              </div>

              {activeGroups.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No group ticket data available</div>
              ) : (
                <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4">
                  {activeGroups.slice(0, 5).map((grp, idx) => {
                    const maxVal = Math.max(...activeGroups.map((g) => g.total), 1);
                    const heightPct = Math.max(15, Math.round((grp.total / maxVal) * 95));
                    const colors = [
                      'bg-indigo-600',
                      'bg-indigo-500',
                      'bg-sky-500',
                      'bg-amber-500',
                      'bg-emerald-500',
                    ];
                    return (
                      <div key={grp.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[11px] font-bold text-slate-700">{grp.total}</span>
                        <div
                          className={`w-full max-w-[36px] rounded-t-lg transition-all ${colors[idx % colors.length]}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${grp.name}: ${grp.total} tickets`}
                        />
                        <span
                          className="text-[9px] text-slate-500 text-center font-semibold truncate max-w-[65px]"
                          title={grp.name}
                        >
                          {grp.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CATEGORY WISE ================= */}
      {activeTab === 'category' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Category KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Categories</span>
                <Tag className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{activeCategories.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Out of {categoryData.length} defined types</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600">Top Category</span>
                <Award className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2 truncate" title={topCategory?.name || 'None'}>
                {topCategory ? topCategory.name : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {topCategory ? `${topCategory.total} tickets (${topCategory.percentage}%)` : 'No tickets'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600">Resolved / Closed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                {categoryData.reduce((acc, c) => acc + c.resolved + c.closed, 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Across all categories</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-600">Active Open/Pending</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">
                {categoryData.reduce((acc, c) => acc + c.open + c.inProgress + c.pending, 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">In flight triage</p>
            </div>
          </div>

          {/* Visual Distribution of Top Categories */}
          {activeCategories.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Volume Distribution by Category</h3>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                {activeCategories.map((cat, idx) => {
                  const palette = ['bg-indigo-600', 'bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'];
                  return (
                    <div
                      key={cat.id}
                      style={{ width: `${Math.max(2, cat.percentage)}%` }}
                      className={`h-full ${palette[idx % palette.length]} transition-all`}
                      title={`${cat.name}: ${cat.total} tickets (${cat.percentage}%)`}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                {activeCategories.map((cat, idx) => {
                  const dots = ['bg-indigo-600', 'bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'];
                  return (
                    <div key={cat.id} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${dots[idx % dots.length]}`} />
                      <span className="font-medium text-slate-700">{cat.name}</span>
                      <span className="text-slate-400 font-semibold">({cat.total} • {cat.percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Category Breakdown Table</h3>
                <p className="text-xs text-slate-400 mt-0.5">Detailed metrics by ticket type</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search category..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-3 text-center">Total Tickets</th>
                    <th className="py-3 px-3 text-center">Open</th>
                    <th className="py-3 px-3 text-center">In Progress</th>
                    <th className="py-3 px-3 text-center">Pending</th>
                    <th className="py-3 px-3 text-center">Resolved</th>
                    <th className="py-3 px-3 text-center">Closed</th>
                    <th className="py-3 px-4 text-right">Share of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No categories found matching "{searchCategory}"
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cat.total > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {cat.total}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${cat.open > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'text-slate-400'}`}>
                            {cat.open}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${cat.inProgress > 0 ? 'bg-sky-50 text-sky-700 border border-sky-200/60' : 'text-slate-400'}`}>
                            {cat.inProgress}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${cat.pending > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'text-slate-400'}`}>
                            {cat.pending}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${cat.resolved > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'text-slate-400'}`}>
                            {cat.resolved}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${cat.closed > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'text-slate-400'}`}>
                            {cat.closed}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 min-w-[32px]">{cat.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: GROUP WISE ================= */}
      {activeTab === 'group' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Group KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Groups</span>
                <FolderKanban className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{activeGroups.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Out of {groupData.length} defined groups</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600">Most Loaded Group</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2 truncate" title={topGroup?.name || 'None'}>
                {topGroup ? topGroup.name : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {topGroup ? `${topGroup.total} tickets (${topGroup.percentage}%)` : 'No tickets'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600">Best Resolution Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-emerald-600 mt-2 truncate" title={highestResolutionGroup?.name || 'None'}>
                {highestResolutionGroup ? highestResolutionGroup.name : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {highestResolutionGroup ? `${highestResolutionGroup.resolutionRate}% resolution` : 'No completions'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Group Tickets</span>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">
                {groupData.reduce((acc, g) => acc + g.total, 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Assigned to team groups</p>
            </div>
          </div>

          {/* Group Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Support Group Performance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ticket volumes and resolution rates per support group</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search group..."
                  value={searchGroup}
                  onChange={(e) => setSearchGroup(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Group Name</th>
                    <th className="py-3 px-3 text-center">Total Assigned</th>
                    <th className="py-3 px-3 text-center">Open</th>
                    <th className="py-3 px-3 text-center">In Progress</th>
                    <th className="py-3 px-3 text-center">Pending</th>
                    <th className="py-3 px-3 text-center">Resolved</th>
                    <th className="py-3 px-3 text-center">Closed</th>
                    <th className="py-3 px-4 text-center">Resolution Rate</th>
                    <th className="py-3 px-4 text-right">Volume Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No support groups found matching "{searchGroup}"
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((grp) => (
                      <tr key={grp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${grp.total > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                            <span>{grp.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {grp.total}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${grp.open > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'text-slate-400'}`}>
                            {grp.open}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${grp.inProgress > 0 ? 'bg-sky-50 text-sky-700 border border-sky-200/60' : 'text-slate-400'}`}>
                            {grp.inProgress}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${grp.pending > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'text-slate-400'}`}>
                            {grp.pending}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${grp.resolved > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'text-slate-400'}`}>
                            {grp.resolved}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${grp.closed > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'text-slate-400'}`}>
                            {grp.closed}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                              grp.resolutionRate >= 50
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : grp.resolutionRate > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                                : 'bg-slate-50 text-slate-500 border-slate-200/60'
                            }`}
                          >
                            {grp.resolutionRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${grp.percentage}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 min-w-[32px]">{grp.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: AGENT PERFORMANCE ================= */}
      {activeTab === 'agent' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Agent KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Agents</span>
                <UserCheck className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{activeAgents.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">With assigned workload</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600">Top Resolver</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2 truncate" title={topAgent?.name || 'None'}>
                {topAgent ? topAgent.name : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {topAgent ? `${topAgent.resolved + topAgent.closed} resolved (${topAgent.resolutionRate}%)` : 'No resolutions'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-600">Unassigned Backlog</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-extrabold text-rose-600 mt-2">{unassignedQueue.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting agent assignment</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600">Overall Resolution</span>
                <Percent className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-600 mt-2">
                {total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{resolved + closed} completed out of {total}</p>
            </div>
          </div>

          {/* Agent Wise Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Agent Wise Leaderboard</h3>
                <p className="text-xs text-slate-400 mt-0.5">Individual productivity, open backlog, and resolution efficiency</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search agent / employee ID..."
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-3">Employee ID</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-center">Total Assigned</th>
                    <th className="py-3 px-3 text-center">Open</th>
                    <th className="py-3 px-3 text-center">In Progress</th>
                    <th className="py-3 px-3 text-center">Resolved</th>
                    <th className="py-3 px-3 text-center">Closed</th>
                    <th className="py-3 px-4 text-center">Resolution Rate</th>
                    <th className="py-3 px-4 text-center">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No agents found matching "{searchAgent}"
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((ag) => {
                      const isUnassigned = ag.id === null;
                      return (
                        <tr key={ag.id || 'unassigned'} className={`transition-colors ${isUnassigned ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isUnassigned ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {isUnassigned ? '?' : ag.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-900 truncate">{ag.name}</span>
                                <span className="text-[10px] text-slate-400 truncate">{ag.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600 font-medium">
                            {ag.employeeId}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                              ag.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : ag.role === 'ADMIN'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : ag.role === 'QUEUE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {ag.role}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-bold text-slate-900">
                            {ag.total}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${ag.open > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'text-slate-400'}`}>
                              {ag.open}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${ag.inProgress > 0 ? 'bg-sky-50 text-sky-700 border border-sky-200/60' : 'text-slate-400'}`}>
                              {ag.inProgress}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${ag.resolved > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'text-slate-400'}`}>
                              {ag.resolved}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${ag.closed > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'text-slate-400'}`}>
                              {ag.closed}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                                ag.resolutionRate >= 50
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                  : ag.resolutionRate > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                                  : 'bg-slate-50 text-slate-500 border-slate-200/60'
                              }`}
                            >
                              {ag.resolutionRate}%
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isUnassigned ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px]">
                                Unassigned Queue
                              </span>
                            ) : ag.total >= 5 ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[10px]">
                                High Load
                              </span>
                            ) : ag.total > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium text-[10px]">
                                Available
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Report Download Modal */}
      {showDownloadModal && (
        <ReportDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
}
