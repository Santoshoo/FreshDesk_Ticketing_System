import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  RefreshCw,
  Bookmark,
  ExternalLink,
  Clock,
  User,
  FolderKanban,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import ticketApi from '../services/ticketApi.js';
import { StatusBadge, EmptyState } from '../components/ui/index.jsx';

export default function TicketLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await ticketApi.getLogs({ search });
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load ticket logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      setUpdatingId(ticketId);
      await ticketApi.updateStatus(ticketId, newStatus);
      await fetchLogs();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Ticket History & Audit Logs
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time lifecycle tracking of all hospital IT support tickets, status updates, and group assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition-colors shadow-2xs"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket # (e.g. #00001), subject, requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Logs Stream */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading ticket activity history...</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity logs found"
            description={
              search
                ? `No ticket logs match "${search}". Try searching another ticket number.`
                : 'No ticket lifecycle actions recorded yet.'
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  {/* Top line with bookmark badge and timestamp */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Bookmark Ticket Badge */}
                    <button
                      onClick={() => navigate(`/tickets/${log.ticketId}`)}
                      title="Open Ticket Preview"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200/80 transition-all shadow-2xs group"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-blue-600 fill-blue-600 group-hover:scale-110 transition-transform" />
                      <span>#{log.ticketNumber}</span>
                      <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-700 ml-0.5" />
                    </button>

                    <span className="text-slate-300">•</span>

                    <span className="text-xs font-medium text-slate-700 max-w-md truncate">
                      {log.subject}
                    </span>

                    <span className="text-slate-300">•</span>

                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Professional Formatted Sentence */}
                  <div className="text-xs sm:text-sm text-slate-800 font-medium bg-slate-50/80 border border-slate-200/60 p-2.5 rounded-lg">
                    {log.sentence}
                  </div>

                  {/* Context chips: Requester, Type, Group */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      <User className="w-3 h-3 text-slate-400" />
                      Requester: <strong className="font-semibold">{log.contactName || 'N/A'}</strong>
                    </span>

                    {log.typeName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        <Tag className="w-3 h-3 text-slate-400" />
                        Type: <strong className="font-semibold">{log.typeName}</strong>
                      </span>
                    )}

                    {log.groupName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        <FolderKanban className="w-3 h-3 text-slate-400" />
                        Group: <strong className="font-semibold">{log.groupName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions for Agent / Admin: View preview & change status */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => navigate(`/tickets/${log.ticketId}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                  >
                    <span>View Ticket</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
