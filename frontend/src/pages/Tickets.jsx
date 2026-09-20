import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ticket as TicketIcon,
  Bookmark,
  Edit2,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ticketApi from '../services/ticketApi.js';
import groupApi from '../services/groupApi.js';
import ticketTypeApi from '../services/ticketTypeApi.js';
import { Modal, EmptyState } from '../components/ui/index.jsx';
import { canEditTicket, canDeleteTicket } from '../utils/ticketPermissions.js';

export default function Tickets({ isMyScope = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [tickets, setTickets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subject: '',
    description: '',
    ticketTypeId: '',
    groupId: '',
    status: 'OPEN',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Confirmation Modal State
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const groupId = searchParams.get('groupId') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        search,
        status,
        groupId,
      };

      const res = isMyScope
        ? await ticketApi.listMy(params)
        : await ticketApi.list(params);

      if (res.success) {
        setTickets(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load groups and ticket types for dropdowns
    groupApi.list({ limit: 100, status: 'ACTIVE' }).then((res) => {
      if (res.success) setGroups(res.data || []);
    });
    ticketTypeApi.list({ limit: 100, status: 'ACTIVE' }).then((res) => {
      if (res.success) setTicketTypes(res.data || []);
    });
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [search, status, groupId, page, isMyScope]);

  const updateFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  // Inline Status Change from Dropdown
  const handleInlineStatusChange = async (ticketId, newStatus) => {
    try {
      setStatusUpdatingId(ticketId);
      await ticketApi.updateStatus(ticketId, newStatus);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
      showToast(`Ticket status updated to ${newStatus} successfully!`, 'success');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update ticket status';
      showToast(msg, 'error');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Open Edit Modal (Admin only)
  const openEditModal = (e, t) => {
    e.stopPropagation();
    setEditingTicket(t);
    setEditFormData({
      subject: t.subject,
      description: t.description || '',
      ticketTypeId: t.ticketTypeId ? String(t.ticketTypeId) : '',
      groupId: t.groupId ? String(t.groupId) : '',
      status: t.status,
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit (Admin only)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;

    try {
      setEditLoading(true);
      setEditError('');
      const res = await ticketApi.update(editingTicket.id, editFormData);
      if (res.success) {
        setIsEditModalOpen(false);
        showToast(`Ticket #${editingTicket.ticketNumber} updated successfully!`, 'success');
        fetchTickets();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update ticket';
      setEditError(msg);
      showToast(msg, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Confirmation
  const openDeleteModal = (e, t) => {
    e.stopPropagation();
    setTicketToDelete(t);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    try {
      setDeleteLoading(true);
      await ticketApi.delete(ticketToDelete.id);
      setTickets((prev) => prev.filter((t) => t.id !== ticketToDelete.id));
      showToast(`Ticket #${ticketToDelete.ticketNumber} deleted successfully!`, 'success');
      setTicketToDelete(null);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete ticket';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusSelectStyle = (curStatus) => {
    switch (curStatus) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-800 border-blue-300 font-semibold';
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'ON_HOLD':
        return 'bg-purple-50 text-purple-800 border-purple-300 font-semibold';
      case 'RESOLVED':
        return 'bg-teal-50 text-teal-800 border-teal-300 font-semibold';
      case 'CLOSED':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isMyScope ? 'My Tickets' : 'All Tickets'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isMyScope
              ? 'Tickets requested by you or assigned to you'
              : 'Complete view of all hospital IT support tickets'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/tickets/create')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3.5 rounded-lg shadow-sm text-xs transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket # (e.g. #00001), subject, contact..."
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING">Pending</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={groupId}
            onChange={(e) => updateFilter('groupId', e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading tickets from database...</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets found"
            description={
              search || status || groupId
                ? 'No tickets match the selected filter criteria.'
                : 'The database currently contains no ticket records.'
            }
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/60">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Group</th>
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const canDelete = canDeleteTicket(t);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Bookmark Ticket Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${t.id}`);
                            }}
                            title="Open ticket details"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200 transition-all shadow-2xs group"
                          >
                            <Bookmark className="w-3.5 h-3.5 text-blue-600 fill-blue-600 group-hover:scale-110 transition-transform" />
                            <span>#{t.ticketNumber}</span>
                          </button>
                        </td>

                        <td className="px-5 py-3.5 font-medium text-slate-900 max-w-xs truncate">
                          {t.subject}
                        </td>

                        <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                          {t.contact?.name || 'Unknown'}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                          {t.group?.name || '-'}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                          {t.agent?.name ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                              {t.agent.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Interactive Status Dropdown (Image 2 Requirement) */}
                        <td
                          className="px-5 py-3.5 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={t.status}
                            disabled={statusUpdatingId === t.id}
                            onChange={(e) => handleInlineStatusChange(t.id, e.target.value)}
                            className={`px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs ${getStatusSelectStyle(
                              t.status
                            )}`}
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="PENDING">Pending</option>
                            <option value="ON_HOLD">On Hold</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions (Modify & Delete) */}
                        <td
                          className="px-5 py-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {canEditTicket(t, user) && (
                              <button
                                onClick={(e) => openEditModal(e, t)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit Ticket Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDeleteTicket(t, user) && (
                              <button
                                onClick={(e) => openDeleteModal(e, t)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete Ticket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <span>
                Showing {tickets.length} of {pagination.total} tickets
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => updateFilter('page', String(pagination.page - 1))}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  {pagination.page} / {pagination.totalPages || 1}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateFilter('page', String(pagination.page + 1))}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Ticket Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingTicket ? `Edit Ticket #${editingTicket.ticketNumber}` : 'Edit Ticket'}
      >
        {editError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.subject}
              onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Type</label>
              <select
                value={editFormData.ticketTypeId}
                onChange={(e) => setEditFormData({ ...editFormData, ticketTypeId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- Select Type --</option>
                {ticketTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Group</label>
              <select
                value={editFormData.groupId}
                onChange={(e) => setEditFormData({ ...editFormData, groupId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- Select Group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={4}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(ticketToDelete)}
        onClose={() => setTicketToDelete(null)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete Ticket{' '}
            <strong className="text-slate-900">#{ticketToDelete?.ticketNumber}</strong> ({ticketToDelete?.subject})?
          </p>
          <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            This action cannot be undone. All associated comments, status history, and assignment history will be removed.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTicketToDelete(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              No
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
