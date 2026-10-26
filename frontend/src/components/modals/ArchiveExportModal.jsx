import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Layers,
  Database,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';
import archivedTicketApi from '../../services/archivedTicketApi.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function ArchiveExportModal({
  isOpen,
  onClose,
  currentFilters = {},
  filterOptions = { statuses: [], agents: [], groups: [], ticketTypes: [] },
  totalArchivedCount = 0,
}) {
  const { showToast } = useToast();

  // Scope: 'filtered' | 'custom_range' | 'all'
  const [scope, setScope] = useState('filtered');

  // Format: 'csv' | 'xlsx'
  const [format, setFormat] = useState('csv');

  // Include description
  const [includeDescription, setIncludeDescription] = useState(true);

  // Local filter states for export customization
  const [search, setSearch] = useState(currentFilters.search || '');
  const [status, setStatus] = useState(currentFilters.status || 'ALL');
  const [priority, setPriority] = useState(currentFilters.priority || 'ALL');
  const [agent, setAgent] = useState(currentFilters.agent || 'ALL');
  const [group, setGroup] = useState(currentFilters.group || 'ALL');
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(currentFilters.dateTo || '');

  // Estimated matching count state
  const [estimatedCount, setEstimatedCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgressText, setDownloadProgressText] = useState('');

  // Sync with currentFilters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch(currentFilters.search || '');
      setStatus(currentFilters.status || 'ALL');
      setPriority(currentFilters.priority || 'ALL');
      setAgent(currentFilters.agent || 'ALL');
      setGroup(currentFilters.group || 'ALL');
      setDateFrom(currentFilters.dateFrom || '');
      setDateTo(currentFilters.dateTo || '');
      setScope('filtered');
    }
  }, [isOpen, currentFilters]);

  // Construct query parameters object
  const getExportParams = () => {
    const params = {
      scope,
      format,
      includeDescription: String(includeDescription),
    };

    if (scope === 'all') {
      return params;
    }

    if (search.trim()) params.search = search.trim();
    if (status !== 'ALL') params.status = status;
    if (priority !== 'ALL') params.priority = priority;
    if (agent !== 'ALL') params.agent = agent;
    if (group !== 'ALL') params.group = group;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    return params;
  };

  // Fetch estimated count on filter changes
  useEffect(() => {
    if (!isOpen) return;

    if (scope === 'all') {
      setEstimatedCount(totalArchivedCount);
      return;
    }

    let isMounted = true;
    const fetchCount = async () => {
      try {
        setLoadingCount(true);
        const params = getExportParams();
        const res = await archivedTicketApi.getExportCount(params);
        if (isMounted && res?.success && res?.data) {
          setEstimatedCount(res.data.count);
        }
      } catch (err) {
        console.warn('Could not estimate export count:', err.message);
      } finally {
        if (isMounted) setLoadingCount(false);
      }
    };

    const timer = setTimeout(fetchCount, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, scope, search, status, priority, agent, group, dateFrom, dateTo, totalArchivedCount]);

  // Quick Date Range Presets
  const setQuickRange = (preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setDateTo(toStr(now));

    if (preset === '7days') {
      const from = new Date();
      from.setDate(now.getDate() - 7);
      setDateFrom(toStr(from));
    } else if (preset === '30days') {
      const from = new Date();
      from.setDate(now.getDate() - 30);
      setDateFrom(toStr(from));
    } else if (preset === 'thisYear') {
      const from = new Date(now.getFullYear(), 0, 1);
      setDateFrom(toStr(from));
    } else if (preset === 'lastYear') {
      const from = new Date(now.getFullYear() - 1, 0, 1);
      const to = new Date(now.getFullYear() - 1, 11, 31);
      setDateFrom(toStr(from));
      setDateTo(toStr(to));
    }
  };

  // Trigger Download
  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDownloadProgressText('Preparing and streaming export...');

      const params = getExportParams();
      const result = await archivedTicketApi.downloadExport(params);

      showToast(`Export downloaded: ${result.filename}`, 'success');
      onClose();
    } catch (err) {
      console.error('Export download error:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to download export file';
      showToast(msg, 'error');
    } finally {
      setDownloading(false);
      setDownloadProgressText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs"
              style={{ background: '#2563eb' }}
            >
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Export Archived Tickets
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Download historical records from <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono text-[11px]">kims_freshdesk_archive</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Scope Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Select Export Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option A: Filtered View */}
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'filtered'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Filter className={`w-4 h-4 ${scope === 'filtered' ? 'text-blue-600' : 'text-slate-500'}`} />
                  {scope === 'filtered' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="font-bold text-xs text-slate-900">Current Filters</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Matches current search & screen filters
                </div>
              </button>

              {/* Option B: Custom Date Range */}
              <button
                type="button"
                onClick={() => setScope('custom_range')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'custom_range'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Calendar className={`w-4 h-4 ${scope === 'custom_range' ? 'text-blue-600' : 'text-slate-500'}`} />
                  {scope === 'custom_range' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="font-bold text-xs text-slate-900">Custom Date Range</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Specify start and end creation dates
                </div>
              </button>

              {/* Option C: Full Archive */}
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Database className={`w-4 h-4 ${scope === 'all' ? 'text-blue-600' : 'text-slate-500'}`} />
                  {scope === 'all' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="font-bold text-xs text-slate-900">Full Archive</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  All {totalArchivedCount?.toLocaleString() || '173k+'} historical tickets
                </div>
              </button>
            </div>
          </div>

          {/* 2. Filter Adjustments (if not full archive) */}
          {scope !== 'all' && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  Filter Parameters
                </span>
                {scope === 'custom_range' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setQuickRange('30days')}
                      className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 rounded font-semibold text-slate-600 transition"
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange('thisYear')}
                      className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 rounded font-semibold text-slate-600 transition"
                    >
                      This Year
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange('lastYear')}
                      className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 rounded font-semibold text-slate-600 transition"
                    >
                      Last Year
                    </button>
                  </div>
                )}
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Created From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Created To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Optional filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    {filterOptions.statuses?.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Agent</label>
                  <select
                    value={agent}
                    onChange={(e) => setAgent(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Agents</option>
                    {filterOptions.agents?.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Group</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Groups</option>
                    {filterOptions.groups?.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. Choose File Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* CSV */}
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${format === 'csv' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="font-bold text-xs text-slate-900">CSV Spreadsheet (.csv)</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Fastest streaming download. Supports up to 200,000+ records seamlessly.
                </p>
              </button>

              {/* Excel */}
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'xlsx'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className={`w-4 h-4 ${format === 'xlsx' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="font-bold text-xs text-slate-900">Microsoft Excel (.xlsx)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Formatted spreadsheet with styled column widths (best for up to 50k rows).
                </p>
              </button>
            </div>
          </div>

          {/* 4. Column Preview & Options */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Canonical 13 Excel Fields</span>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={includeDescription}
                  onChange={(e) => setIncludeDescription(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                Include Full Description
              </label>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
              Ticket ID, Subject, Description, Status, Priority, Source, Type, Agent, Group, Created time, Resolved time, Closed time, Last update time
            </p>
          </div>

          {/* 5. Matching Record Counter */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
            <span className="text-blue-900 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Estimated export volume:
            </span>
            <span className="font-bold text-blue-700 flex items-center gap-1.5">
              {loadingCount ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  Calculating...
                </>
              ) : (
                `${estimatedCount !== null ? estimatedCount.toLocaleString() : '—'} records`
              )}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            {downloading && (
              <span className="flex items-center gap-2 text-blue-600 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {downloadProgressText || 'Downloading...'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || (estimatedCount === 0)}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition hover:opacity-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#2563eb' }}
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Streaming Export...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
