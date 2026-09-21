import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  History,
  MessageSquare,
  AlertCircle,
  Edit2,
  Trash2,
  FileText,
  Paperclip,
  Smile,
  Link2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ticketApi from '../services/ticketApi.js';
import groupApi from '../services/groupApi.js';
import ticketTypeApi from '../services/ticketTypeApi.js';
import { Modal, EmptyState } from '../components/ui/index.jsx';
import { canEditTicket, canDeleteTicket } from '../utils/ticketPermissions.js';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isAgentOrAdmin = isAdmin || user?.role === 'AGENT';

  const [ticket, setTicket] = useState(null);
  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('conversation'); // 'conversation' | 'history'

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('OPEN');
  const [updatePriority, setUpdatePriority] = useState('MEDIUM');
  const [updateAgentId, setUpdateAgentId] = useState('');
  const [updateComment, setUpdateComment] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await ticketApi.getById(id);
      if (res.success && res.data) {
        setTicket(res.data);
        setUpdateStatus(res.data.status);
        setUpdatePriority(res.data.priority || 'MEDIUM');
        setUpdateAgentId(res.data.agentId ? String(res.data.agentId) : '');
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
      setError(err.response?.data?.error?.message || 'Ticket not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    if (isAgentOrAdmin) {
      groupApi.list({ limit: 100, status: 'ACTIVE' }).then((res) => {
        if (res.success) setGroups(res.data || []);
      });
    }
  }, [id]);

  useEffect(() => {
    if (ticket?.groupId && isAgentOrAdmin) {
      groupApi.getAgentsByGroup(ticket.groupId, { limit: 100 }).then((res) => {
        if (res.success) setAgents(res.data || []);
      });
    }
  }, [ticket?.groupId, isAgentOrAdmin]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await ticketApi.addComment(id, {
        commentType: 'REPLY',
        body: commentText.trim(),
      });

      if (res.success) {
        setCommentText('');
        showToast('Reply sent successfully!', 'success');
        fetchTicket();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to send reply';
      showToast(msg, 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdatingTicket(true);
      setUpdateError('');

      // 1. Update status if changed
      if (updateStatus !== ticket.status) {
        await ticketApi.updateStatus(id, updateStatus);
      }

      // 2. Update assignment or priority
      await ticketApi.update(id, {
        priority: updatePriority,
        agentId: updateAgentId ? parseInt(updateAgentId, 10) : null,
      });

      // 3. Add comment note if provided
      if (updateComment.trim()) {
        await ticketApi.addComment(id, {
          commentType: 'INTERNAL_NOTE',
          body: updateComment.trim(),
        });
      }

      showToast('Ticket updated successfully!', 'success');
      setIsUpdateModalOpen(false);
      setUpdateComment('');
      fetchTicket();
    } catch (err) {
      setUpdateError(err.response?.data?.error?.message || err.message || 'Failed to update ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleQuickClose = async () => {
    if (window.confirm('Are you sure you want to close this ticket?')) {
      try {
        await ticketApi.updateStatus(id, 'CLOSED');
        showToast('Ticket closed successfully.', 'success');
        fetchTicket();
      } catch (err) {
        showToast(err.response?.data?.error?.message || 'Failed to close ticket', 'error');
      }
    }
  };

  const handleDeleteTicket = async () => {
    try {
      setDeleteLoading(true);
      await ticketApi.delete(id);
      showToast('Ticket deleted successfully.', 'success');
      navigate('/tickets');
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete ticket', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !ticket) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-slate-400">Loading ticket #{id}...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
        <p className="font-bold">Error loading ticket</p>
        <p className="mt-1">{error || 'Ticket not found.'}</p>
        <button
          onClick={() => navigate('/tickets')}
          className="mt-3 inline-flex items-center gap-1.5 font-semibold text-sky-600 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Tickets
        </button>
      </div>
    );
  }

  const priority = ticket.priority || 'MEDIUM';
  const isHigh = priority === 'HIGH' || priority === 'URGENT';
  const isLow = priority === 'LOW';

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Link to="/tickets" className="hover:text-slate-600 transition-colors">
          All Tickets
        </Link>
        <span>&gt;</span>
        <span className="text-slate-700 font-semibold">#{ticket.ticketNumber}</span>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            #{ticket.ticketNumber} {ticket.subject}
          </h2>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              ticket.status === 'OPEN'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : ticket.status === 'PENDING' || ticket.status === 'IN_PROGRESS'
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : ticket.status === 'RESOLVED'
                ? 'bg-sky-50 text-sky-600 border border-sky-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {ticket.status === 'OPEN'
              ? '🟢 Open'
              : ticket.status === 'PENDING'
              ? '🟡 Pending'
              : ticket.status === 'IN_PROGRESS'
              ? '🔵 In Progress'
              : ticket.status === 'RESOLVED'
              ? '✅ Resolved'
              : '⚪ Closed'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canEditTicket(user, ticket) && (
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit</span>
            </button>
          )}

          {ticket.status !== 'CLOSED' && canEditTicket(user, ticket) && (
            <button
              onClick={handleQuickClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Close</span>
            </button>
          )}

          {canDeleteTicket(user, ticket) && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Ticket"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Metadata Panel, Right Conversation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Metadata Panel (1/3) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4 text-xs">
            <div className="space-y-3 divide-y divide-slate-100">
              {/* Type */}
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Type</span>
                <span className="font-semibold text-slate-800">
                  {ticket.ticketType?.name || 'Support'}
                </span>
              </div>

              {/* Group */}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Group</span>
                <span className="font-semibold text-slate-800">
                  {ticket.group?.name || 'EMR Support'}
                </span>
              </div>

              {/* Priority */}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Priority</span>
                <span className="font-bold flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-rose-500' : isLow ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className={isHigh ? 'text-rose-600' : isLow ? 'text-emerald-600' : 'text-amber-600'}>
                    {isHigh ? 'High' : isLow ? 'Low' : 'Medium'}
                  </span>
                </span>
              </div>

              {/* Assigned To */}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Assigned To</span>
                <span className="font-semibold text-slate-800">
                  {ticket.agent?.name || 'Unassigned'}
                </span>
              </div>

              {/* Created By */}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Created By</span>
                <span className="font-semibold text-slate-800">
                  {ticket.creator?.name || ticket.contact?.name || 'Staff User'}
                </span>
              </div>

              {/* Created At */}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Created At</span>
                <span className="font-mono text-slate-600">
                  {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Updated At */}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Updated At</span>
                <span className="font-mono text-slate-600">
                  {new Date(ticket.updatedAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Conversation Panel (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sub Tabs: Conversation vs History */}
          <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold text-slate-500">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`pb-2 transition-colors relative ${
                activeTab === 'conversation' ? 'text-[#0284c7] font-bold' : 'hover:text-slate-800'
              }`}
            >
              Conversation
              {activeTab === 'conversation' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284c7] rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 transition-colors relative ${
                activeTab === 'history' ? 'text-[#0284c7] font-bold' : 'hover:text-slate-800'
              }`}
            >
              History
              {activeTab === 'history' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284c7] rounded-full"></span>
              )}
            </button>
          </div>

          {activeTab === 'conversation' ? (
            <div className="space-y-4">
              {/* Initial Ticket Description Message */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {ticket.contact?.name?.[0] || ticket.creator?.name?.[0] || 'R'}
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800">
                        {ticket.contact?.name || ticket.creator?.name || 'Requester'}
                      </p>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {ticket.description}
                    </p>

                    {/* Dynamic Attachments from Ticket (only if files were uploaded) */}
                    {ticket.attachments && Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {ticket.attachments.map((file, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-semibold">{file.name}</span>
                            {file.size && <span className="text-[10px] text-slate-400">{file.size}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Threaded Comments */}
              {ticket.comments && ticket.comments.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {c.user?.name?.[0] || 'S'}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">{c.user?.name || 'Agent'}</p>
                          {c.commentType === 'INTERNAL_NOTE' && (
                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded">
                              Internal Note
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Reply Composer Box */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3">
                <form onSubmit={handleSendReply}>
                  <textarea
                    rows={3}
                    placeholder="Type a reply..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full text-xs text-slate-800 placeholder:text-slate-400 border-0 focus:outline-none resize-none p-1"
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400">
                      <button type="button" className="p-1 hover:text-slate-600 rounded" title="Attach file">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-slate-600 rounded" title="Add link">
                        <Link2 className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-slate-600 rounded" title="Emoji">
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0284c7] hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-40"
                    >
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* History Timeline Tab */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-800">Status & Assignment History</h4>
              {(!ticket.statusHistories || ticket.statusHistories.length === 0) && (
                <p className="text-xs text-slate-400 italic">No previous status history logged.</p>
              )}
              <div className="space-y-3">
                {ticket.statusHistories && ticket.statusHistories.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Status changed to <span className="text-sky-600">{h.newStatus}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">By {h.user?.name || 'Staff'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.changedAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screen 6: Update Ticket / Reassign Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Ticket"
        maxWidth="max-w-md"
      >
        {updateError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{updateError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateTicketSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={updatePriority}
              onChange={(e) => setUpdatePriority(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="HIGH">🔴 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assign To
            </label>
            <select
              value={updateAgentId}
              onChange={(e) => setUpdateAgentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="">Unassigned</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Add a comment (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Waiting for vendor response."
              value={updateComment}
              onChange={(e) => setUpdateComment(e.target.value)}
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingTicket}
              className="px-5 py-2 bg-[#0284c7] hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {updatingTicket ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Ticket"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700">
            Are you sure you want to permanently delete ticket <strong>#{ticket.ticketNumber}</strong>?
          </p>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteTicket}
              disabled={deleteLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
