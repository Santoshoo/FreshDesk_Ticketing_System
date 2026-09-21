import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, BarChart3, TrendingUp, Users, FolderKanban } from 'lucide-react';
import dashboardApi from '../services/dashboardApi.js';
import groupApi from '../services/groupApi.js';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('trends'); // 'trends' | 'category' | 'group' | 'agent'
  const [summary, setSummary] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [sumRes, groupsRes] = await Promise.all([
        dashboardApi.getSummary(),
        groupApi.list({ limit: 10, status: 'ACTIVE' }),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (groupsRes.success) setGroups(groupsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const total = summary?.total || 124;
  const open = summary?.open || 18;
  const pending = (summary?.pending || 0) + (summary?.inProgress || 0) || 9;
  const resolved = summary?.resolved || 87;
  const closed = summary?.closed || 10;

  const openPct = Math.round((open / (total || 1)) * 100);
  const pendingPct = Math.round((pending / (total || 1)) * 100);
  const resolvedPct = Math.round((resolved / (total || 1)) * 100);
  const closedPct = Math.max(0, 100 - openPct - pendingPct - resolvedPct);

  const donutGradient = `conic-gradient(
    #10b981 0deg ${openPct * 3.6}deg,
    #f59e0b ${openPct * 3.6}deg ${(openPct + pendingPct) * 3.6}deg,
    #0284c7 ${(openPct + pendingPct) * 3.6}deg ${(openPct + pendingPct + resolvedPct) * 3.6}deg,
    #ef4444 ${(openPct + pendingPct + resolvedPct) * 3.6}deg 360deg
  )`;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports</h2>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Jan 1, 2026 - Sep 20, 2026</span>
          </div>

          <button
            onClick={fetchReports}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 shadow-2xs"
            title="Refresh reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold text-slate-500 overflow-x-auto">
        {[
          { id: 'trends', label: 'Ticket Trends' },
          { id: 'category', label: 'Category Wise' },
          { id: 'group', label: 'Group Wise' },
          { id: 'agent', label: 'Agent Performance' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-[#0284c7] font-bold' : 'hover:text-slate-800'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284c7] rounded-full"></span>
            )}
          </button>
        ))}
      </div>

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
          <p className="text-xs font-semibold text-sky-600">Resolved</p>
          <p className="text-2xl font-extrabold text-sky-600 mt-1">{resolved}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-rose-600">Closed</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{closed}</p>
        </div>
      </div>

      {/* Top Chart: Tickets Over Time Area Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Tickets Over Time</h3>

        <div className="h-48 w-full relative flex flex-col justify-end">
          <svg viewBox="0 0 600 130" className="w-full h-40 overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
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
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Data points */}
            <circle cx="180" cy="85" r="3.5" fill="#0284c7" />
            <circle cx="360" cy="45" r="3.5" fill="#0284c7" />
            <circle cx="540" cy="60" r="3.5" fill="#0284c7" />
            <circle cx="600" cy="30" r="3.5" fill="#0284c7" />
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
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="text-slate-700">Resolved {resolved} ({resolvedPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-700">Closed {closed} ({closedPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets by Group Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Tickets by Group</h3>

          <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4">
            {[
              { name: 'EMR Support', val: 40, height: '90%', color: 'bg-sky-600' },
              { name: 'Desktop', val: 28, height: '65%', color: 'bg-sky-500' },
              { name: 'Radiology', val: 20, height: '48%', color: 'bg-sky-400' },
              { name: 'Helpdesk', val: 24, height: '55%', color: 'bg-amber-400' },
              { name: 'IT Infra', val: 12, height: '30%', color: 'bg-emerald-400' },
            ].map((bar) => (
              <div key={bar.name} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-bold text-slate-600">{bar.val}</span>
                <div className={`w-full max-w-[36px] rounded-t-lg transition-all ${bar.color}`} style={{ height: bar.height }}></div>
                <span className="text-[9px] text-slate-400 text-center font-medium truncate max-w-[60px]" title={bar.name}>
                  {bar.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
