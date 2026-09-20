import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Clock,
  Send,
  Lock,
  Building2,
  FolderKanban,
  CheckCircle2,
  History,
  MessageSquare,
  AlertCircle,
  Bookmark,
  Edit2,
  Trash2,
  UserCheck,
  Tag,
  Share2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ticketApi from '../services/ticketApi.js';
import groupApi from '../services/groupApi.js';
import ticketTypeApi from '../services/ticketTypeApi.js';
import { StatusBadge, Card, CardHeader, CardTitle, CardContent, Modal } from '../components/ui/index.jsx';

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
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment Form State
  const [commentType, setCommentType] = useState('REPLY');
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status & Assignment update
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    subject: '',
    description: '',
    ticketTypeId: '',
    groupId: '',
    status: 'OPEN',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await ticketApi.getById(id);
      if (res.success && res.data) {
        setTicket(res.data);
        setSelectedStatus(res.data.status);
        setSelectedGroupId(String(res.data.groupId));
        setSelectedAgentId(res.data.agentId ? String(res.data.agentId) : '');
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
      ticketTypeApi.list({ limit: 100, status: 'ACTIVE' }).then((res) => {
        if (res.success) setTicketTypes(res.data || []);
      });
    }
  }, [id]);

  useEffect(() => {
    if (selectedGroupId && isAgentOrAdmin) {
      groupApi.getAgentsByGroup(selectedGroupId, { limit: 100 }).then((res) => {
        if (res.success) setAgents(res.data || []);
      });
    }
  }, [selectedGroupId, isAgentOrAdmin]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await ticketApi.updateStatus(id, newStatus);
      if (res.success) {
        setSelectedStatus(newStatus);
        showToast(`Ticket status updated to ${newStatus} successfully!`, 'success');
        fetchTicket();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update status';
      showToast(msg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignmentChange = async () => {
    try {
      setUpdatingAssignment(true);
      const res = await ticketApi.updateAssignment(id, {
        groupId: parseInt(selectedGroupId, 10),
        agentId: selectedAgentId ? parseInt(selectedAgentId, 10) : null,
      });
      if (res.success) {
        showToast('Ticket assignment updated successfully!', 'success');
        fetchTicket();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update assignment';
      showToast(msg, 'error');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await ticketApi.addComment(id, {
        commentType,
        body: commentBody.trim(),
      });
      if (res.success) {
        setCommentBody('');
        showToast(
          commentType === 'INTERNAL_NOTE' ? 'Internal note added!' : 'Reply posted successfully!',
          'success'
        );
        fetchTicket();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to add comment';
      showToast(msg, 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Open Edit Modal (Admin only)
  const openEditModal = () => {
    if (!ticket) return;
    setEditFormData({
      subject: ticket.subject,
      description: ticket.description || '',
      ticketTypeId: ticket.ticketTypeId ? String(ticket.ticketTypeId) : '',
      groupId: ticket.groupId ? String(ticket.groupId) : '',
      status: ticket.status,
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  // Submit Edit (Admin only)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      setEditError('');
      const res = await ticketApi.update(id, editFormData);
      if (res.success) {
        setIsEditModalOpen(false);
        showToast('Ticket details updated successfully!', 'success');
        fetchTicket();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update ticket';
      setEditError(msg);
      showToast(msg, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Check Delete Permission:
  // Super Admin & Admin can delete any ticket.
  // Agent can ONLY delete tickets created by themselves (createdBy === user.id).
  const canDeleteTicket = () => {
    if (!user || !ticket) return false;
    if (isAdmin) return true;
    if (user.role === 'AGENT' && ticket.createdBy === user.id) return true;
    return false;
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await ticketApi.delete(id);
      showToast(`Ticket #${ticket.ticketNumber} deleted successfully!`, 'success');
      navigate('/tickets');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete ticket';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Unable to Load Ticket</h3>
        <p className="text-xs text-slate-500">{error || 'Ticket not found.'}</p>
        <button
          onClick={() => navigate('/tickets')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          Return to Tickets
        </button>
      </div>
    );
  }

  // Combine and format history logs into professional sentences
  const statusLogs = (ticket.statusHistories || []).map((h) => ({
    id: `status-${h.id}`,
    timestamp: h.changedAt,
    actor: h.user?.name || 'Staff',
    role: h.user?.role?.name || 'USER',
    sentence:
      h.oldStatus === h.newStatus
        ? `${h.user?.name || 'Agent'} created Ticket #${ticket.ticketNumber} for ${ticket.contact?.name || 'Requester'} under ${ticket.ticketType?.name || 'Support'} / ${ticket.group?.name || 'Helpdesk'} with status ${h.newStatus}`
        : `${h.user?.name || 'Agent'} changed status of Ticket #${ticket.ticketNumber} from ${h.oldStatus} to ${h.newStatus}`,
  }));

  const assignmentLogs = (ticket.assignmentHistories || []).map((a) => ({
    id: `assign-${a.id}`,
    timestamp: a.changedAt,
    actor: a.changer?.name || 'Staff',
    role: a.changer?.role?.name || 'USER',
    sentence:
      !a.oldGroupId && a.newGroupId
        ? `${a.changer?.name || 'Agent'} assigned Ticket #${ticket.ticketNumber} to ${a.newGroup?.name || 'Support Group'}${a.newAgent ? ` (${a.newAgent.name})` : ''}`
        : `${a.changer?.name || 'Agent'} reassigned Ticket #${ticket.ticketNumber} to ${a.newGroup?.name || 'Support Group'}${a.newAgent ? ` (Agent: ${a.newAgent.name})` : ''}`,
  }));

  const combinedLogs = [...statusLogs, ...assignmentLogs].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-6xl mx-auto">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tickets')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to Tickets"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Bookmark Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-sm rounded-lg border border-blue-200 shadow-2xs">
            <Bookmark className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span>#{ticket.ticketNumber}</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {ticket.subject}
            </h2>
            <p className="text-xs text-slate-500">
              Requester: <strong className="text-slate-700">{ticket.contact?.name}</strong> • Dept:{' '}
              {ticket.contact?.department?.name || 'General'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <StatusBadge status={ticket.status} />

          {isAdmin && (
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit</span>
            </button>
          )}

          {canDeleteTicket() && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Details & Conversation Thread */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Card */}
          <Card>
            <CardHeader className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  Submitted on{' '}
                  {new Date(ticket.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                Type: {ticket.ticketType?.name || 'Standard'}
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          {/* Activity / Lifecycle Sentence Logs Stream */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Ticket Lifecycle History & Audit Logs</span>
              </CardTitle>
              <span className="text-[11px] text-slate-400 font-medium">
                {combinedLogs.length} events logged
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {combinedLogs.length === 0 ? (
                <p className="text-xs text-slate-400">No activity logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {combinedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60 flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-800 font-medium">{log.sentence}</p>
                        <span className="text-[10px] text-slate-400 mt-0.5 inline-block">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation & Replies Thread */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>Comments & Communication ({ticket.comments?.length || 0})</span>
            </h3>

            {ticket.comments?.map((comment) => {
              const isInternal = comment.commentType === 'INTERNAL_NOTE';
              return (
                <div
                  key={comment.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isInternal
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-white border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {comment.user?.name?.[0] || 'U'}
                      </div>
                      <span className="text-xs font-bold text-slate-800">{comment.user?.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({comment.user?.role?.name || 'Staff'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInternal && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/60 text-amber-800 border border-amber-300">
                          <Lock className="w-2.5 h-2.5" /> Internal Note
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {comment.body}
                  </div>
                </div>
              );
            })}

            {/* Comment Form */}
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleAddComment} className="space-y-3">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() => setCommentType('REPLY')}
                      className={`text-xs font-semibold pb-1 border-b-2 transition-all ${
                        commentType === 'REPLY'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Public Reply
                    </button>
                    {isAgentOrAdmin && (
                      <button
                        type="button"
                        onClick={() => setCommentType('INTERNAL_NOTE')}
                        className={`text-xs font-semibold pb-1 border-b-2 transition-all flex items-center gap-1 ${
                          commentType === 'INTERNAL_NOTE'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>Internal Note (Private)</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      commentType === 'INTERNAL_NOTE'
                        ? 'Write a private note visible only to support agents and admins...'
                        : 'Write a response to the requester...'
                    }
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !commentBody.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{submittingComment ? 'Sending...' : 'Send Message'}</span>
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right 1 Column: Metadata & Assignment Panel */}
        <div className="space-y-6">
          {/* Requester Profile */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Requester Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {ticket.contact?.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{ticket.contact?.name}</p>
                  <p className="text-[11px] text-slate-500">{ticket.contact?.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Employee ID:</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {ticket.contact?.employeeId || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-slate-700 font-medium">
                    {ticket.contact?.department?.name || 'General'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Status & Assignment Control */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ticket Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Quick Status Select */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ticket Status
                </label>
                {isAgentOrAdmin ? (
                  <select
                    value={selectedStatus}
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                ) : (
                  <div className="mt-1">
                    <StatusBadge status={ticket.status} />
                  </div>
                )}
              </div>

              {/* Assignment Control for Agents/Admins */}
              {isAgentOrAdmin ? (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Support Group
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assigned Agent
                    </label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Unassigned --</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={updatingAssignment}
                    onClick={handleAssignmentChange}
                    className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {updatingAssignment ? 'Reassigning...' : 'Update Assignment'}
                  </button>
                </div>
              ) : (
                <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
                  <p>
                    <span className="text-slate-400">Group:</span>{' '}
                    <strong className="text-slate-800">{ticket.group?.name || 'Unassigned'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Agent:</span>{' '}
                    <strong className="text-slate-800">{ticket.agent?.name || 'Unassigned'}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Ticket #${ticket?.ticketNumber}`}
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Confirm Delete Ticket #${ticket?.ticketNumber}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to permanently delete Ticket{' '}
            <strong className="text-slate-900">#{ticket?.ticketNumber}</strong> ({ticket?.subject})?
          </p>
          <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            This action cannot be undone. All associated comments, status history, and assignment history will be removed.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Ticket'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
