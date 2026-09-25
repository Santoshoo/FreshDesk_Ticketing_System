import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Calendar,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import dashboardApi from '../../services/dashboardApi.js';
import { exportReportData } from '../../utils/reportExporter.js';

export default function ReportDownloadModal({ isOpen, onClose }) {
  const [periodType, setPeriodType] = useState('month'); // 'month' | 'week' | 'day'
  const [format, setFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Default dates
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []); // 1-12

  // Inputs
  const [selectedDate, setSelectedDate] = useState(todayStr); // for day-wise
  const [selectedWeekDate, setSelectedWeekDate] = useState(todayStr); // for week-wise reference
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Month Names Helper
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Calculate Week bounds for display
  const weekRange = useMemo(() => {
    try {
      const ref = new Date(`${selectedWeekDate}T12:00:00`);
      const day = ref.getDay();
      const diff = ref.getDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(ref.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const monStr = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const sunStr = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return {
        label: `${monStr} — ${sunStr}`,
        startDate: mon.toISOString().slice(0, 10),
        endDate: sun.toISOString().slice(0, 10),
      };
    } catch {
      return { label: '', startDate: '', endDate: '' };
    }
  }, [selectedWeekDate]);

  // Quick preset handlers
  const handlePresetToday = () => {
    setSelectedDate(todayStr);
  };

  const handlePresetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handlePresetThisWeek = () => {
    setSelectedWeekDate(todayStr);
  };

  const handlePresetLastWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setSelectedWeekDate(d.toISOString().slice(0, 10));
  };

  const handlePresetThisMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const handlePresetLastMonth = () => {
    if (currentMonth === 1) {
      setSelectedYear(currentYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth - 1);
    }
  };

  // Human readable active period description
  const activePeriodLabel = useMemo(() => {
    if (periodType === 'day') {
      const d = new Date(`${selectedDate}T12:00:00`);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (periodType === 'week') {
      return weekRange.label;
    }
    if (periodType === 'month') {
      const monthObj = months.find((m) => m.value === Number(selectedMonth));
      return `${monthObj ? monthObj.label : ''} ${selectedYear}`;
    }
    return '';
  }, [periodType, selectedDate, weekRange, selectedMonth, selectedYear]);

  // Execute Download
  const handleDownload = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const params = { periodType };

      if (periodType === 'day') {
        params.date = selectedDate;
      } else if (periodType === 'week') {
        params.startDate = weekRange.startDate;
        params.endDate = weekRange.endDate;
      } else if (periodType === 'month') {
        params.year = selectedYear;
        params.month = selectedMonth;
      }

      const res = await dashboardApi.getReportExport(params);

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to fetch report data.');
      }

      const reportData = res.data;
      const count = reportData.tickets?.length || 0;

      // Trigger export utility
      exportReportData({
        data: reportData,
        format,
        periodLabel: activePeriodLabel,
        filenamePrefix: `KIMS_Tickets_${periodType.toUpperCase()}`,
      });

      setSuccessMsg(`Successfully generated ${format.toUpperCase()} report (${count} tickets included).`);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Download report error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-overlay-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-7 relative overflow-hidden animate-modal-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 shadow-2xs">
            <Download className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Download Performance Report
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Export operational metrics & ticket records by custom time interval
            </p>
          </div>
        </div>

        {/* Period Type Selection Tabs */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select Time Interval
          </label>
          <div className="grid grid-cols-3 gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setPeriodType('month')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                periodType === 'month'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Month-wise</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriodType('week')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                periodType === 'week'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Week-wise</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriodType('day')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                periodType === 'day'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Day-wise</span>
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on Period Type */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 mb-5 space-y-3">
          {/* TAB 1: MONTH-WISE */}
          {periodType === 'month' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600">Select Month & Year:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePresetThisMonth}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetLastMonth}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    Last Month
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEEK-WISE */}
          {periodType === 'week' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600">Select Date in Week:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePresetThisWeek}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    Current Week
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetLastWeek}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    Last Week
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={selectedWeekDate}
                onChange={(e) => setSelectedWeekDate(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              />
              <div className="mt-2 text-[11px] font-medium text-slate-500 flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200/60">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Selected Week: <strong>{weekRange.label}</strong></span>
              </div>
            </div>
          )}

          {/* TAB 3: DAY-WISE */}
          {periodType === 'day' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600">Select Specific Day:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePresetToday}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetYesterday}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              />
            </div>
          )}

          {/* Selected Scope Badge */}
          <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Coverage Target:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/80">
              {activePeriodLabel}
            </span>
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select Download Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Excel (.xlsx) Option */}
            <div
              onClick={() => setFormat('xlsx')}
              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                format === 'xlsx'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  format === 'xlsx' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">Excel (.xlsx)</p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Multi-sheet: Summary KPIs + Tickets Log
                </p>
              </div>
            </div>

            {/* CSV (.csv) Option */}
            <div
              onClick={() => setFormat('csv')}
              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                format === 'csv'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  format === 'csv' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">CSV (.csv)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Raw tickets data for spreadsheet imports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-700 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Report ({format.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
