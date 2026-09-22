import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Ticket as TicketIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ticketApi from '../services/ticketApi.js';
import { EmptyState } from '../components/ui/index.jsx';

export default function MyTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('created'); // 'created' | 'assigned'
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ created: 0, assigned: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const res = await ticketApi.listMy({
        page,
        limit: 10,
        search,
        status,
        priority,
        scope: activeTab === 'created' ? 'created' : 'assigned',
      });

      if (res.success) {
        setTickets(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
          setCounts((prev) => ({
            ...prev,
            [activeTab]: res.pagination.total,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load my tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [activeTab, search, status, priority, page]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Tickets</h2>

      {/* Sub Tabs: Created by Me vs Assigned to Me */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold text-slate-500">
        <button
          onClick={() => {
            setActiveTab('created');
            setPage(1);
          }}
          className={`pb-2.5 transition-colors relative ${
            activeTab === 'created' ? 'text-[#6366f1] font-bold' : 'hover:text-slate-800'
          }`}
        >
          Created by Me ({counts.created || pagination.total})
          {activeTab === 'created' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6366f1] rounded-full"></span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('assigned');
            setPage(1);
          }}
          className={`pb-2.5 transition-colors relative ${
            activeTab === 'assigned' ? 'text-[#6366f1] font-bold' : 'hover:text-slate-800'
          }`}
        >
          Assigned to Me ({counts.assigned || 0})
          {activeTab === 'assigned' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6366f1] rounded-full"></span>
          )}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search my tickets..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
        >
          <option value="">Status: All</option>
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
        >
          <option value="">Priority: All</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading your tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets found"
            description="You currently have no tickets matching this view."
            action={
              <button
                onClick={() => navigate('/tickets/create')}
                className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
              >
                Create New Ticket
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
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const p = t.priority || 'MEDIUM';
                  const isHigh = p === 'HIGH' || p === 'URGENT';
                  const isLow = p === 'LOW';
                  const stripeBg = isHigh
                    ? 'bg-rose-500'
                    : isLow
                    ? 'bg-emerald-500'
                    : 'bg-amber-500';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900 text-xs">
                        #{t.ticketNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-1 h-5 rounded-full shrink-0 ${stripeBg}`} />
                          <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {t.subject}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold ${
                            isHigh
                              ? 'bg-[#fee2e2] text-[#ef4444]'
                              : isLow
                              ? 'bg-[#dcfce7] text-[#15803d]'
                              : 'bg-[#fef3c7] text-[#d97706]'
                          }`}
                        >
                          {isHigh ? 'High' : isLow ? 'Low' : 'Medium'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold ${
                            t.status === 'OPEN'
                              ? 'bg-[#dbeafe] text-[#1d4ed8]'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-[#fef3c7] text-[#b45309]'
                              : t.status === 'RESOLVED'
                              ? 'bg-[#dcfce7] text-[#15803d]'
                              : t.status === 'CLOSED'
                              ? 'bg-[#f1f5f9] text-[#64748b]'
                              : 'bg-[#f1f5f9] text-[#475569]'
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
                        {new Date(t.createdAt).toLocaleDateString('en-US', {
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

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                    page === pNum
                      ? 'bg-[#6366f1] text-white'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span>
              Showing {Math.min((page - 1) * pagination.limit + 1, pagination.total)}-
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
