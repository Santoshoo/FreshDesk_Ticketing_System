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
  ChevronDown,
  Bold,
  Italic,
  List,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ticketApi from '../services/ticketApi.js';
import groupApi from '../services/groupApi.js';
import ticketTypeApi from '../services/ticketTypeApi.js';
import { Modal, EmptyState } from '../components/ui/index.jsx';
import TicketCloseModal from '../components/modals/TicketCloseModal.jsx';
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
  const [ticketTypes, setTicketTypes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('conversation'); // 'conversation' | 'history'

  // Comment & Composer State
  const [composerMode, setComposerMode] = useState('REPLY'); // 'REPLY' | 'INTERNAL_NOTE'
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Update Ticket Properties Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('OPEN');
  const [updatePriority, setUpdatePriority] = useState('MEDIUM');
  const [updateGroupId, setUpdateGroupId] = useState('');
  const [updateTicketTypeId, setUpdateTicketTypeId] = useState('');
  const [updateAgentId, setUpdateAgentId] = useState('');
  const [updateComment, setUpdateComment] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Close / Resolve Confirmation Modal State
  const [closeModalConfig, setCloseModalConfig] = useState({
    isOpen: false,
    targetStatus: 'RESOLVED',
  });
  const [closeModalLoading, setCloseModalLoading] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await ticketApi.getById(id);
      if (res.success && res.data) {
        setTicket(res.data);
        setUpdateStatus(res.data.status);
        setUpdatePriority(res.data.priority || 'MEDIUM');
        setUpdateGroupId(res.data.groupId ? String(res.data.groupId) : '');
        setUpdateTicketTypeId(res.data.ticketTypeId ? String(res.data.ticketTypeId) : '');
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
      Promise.all([
        groupApi.list({ limit: 100, status: 'ACTIVE' }),
        ticketTypeApi.list({ limit: 100, status: 'ACTIVE' }),
      ]).then(([groupsRes, typesRes]) => {
        if (groupsRes.success) setGroups(groupsRes.data || []);
        if (typesRes.success) setTicketTypes(typesRes.data || []);
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

  const openEditPropertiesModal = () => {
    if (!ticket) return;
    setUpdateStatus(ticket.status);
    setUpdatePriority(ticket.priority || 'MEDIUM');
    setUpdateGroupId(ticket.groupId ? String(ticket.groupId) : '');
    setUpdateTicketTypeId(ticket.ticketTypeId ? String(ticket.ticketTypeId) : '');
    setUpdateAgentId(ticket.agentId ? String(ticket.agentId) : '');
    setUpdateComment('');
    setUpdateError('');
    if (ticket.groupId) {
      groupApi.getAgentsByGroup(ticket.groupId, { limit: 100 }).then((res) => {
        if (res.success) setAgents(res.data || []);
      });
    }
    setIsUpdateModalOpen(true);
  };

  const handleGroupChange = async (newGroupId) => {
    setUpdateGroupId(newGroupId);
    if (!newGroupId) {
      setAgents([]);
      setUpdateAgentId('');
      return;
    }
    try {
      const res = await groupApi.getAgentsByGroup(newGroupId, { limit: 100 });
      if (res.success) {
        const groupAgents = res.data || [];
        setAgents(groupAgents);
        const stillValid = groupAgents.some((a) => String(a.id) === String(updateAgentId));
        if (!stillValid) {
          setUpdateAgentId('');
        }
      }
    } catch (err) {
      console.error('Failed to load group agents:', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await ticketApi.addComment(id, {
        commentType: composerMode,
        body: commentText.trim(),
      });

      if (res.success) {
        setCommentText('');
        showToast(
          composerMode === 'INTERNAL_NOTE'
            ? 'Internal note added successfully!'
            : 'Reply sent successfully!',
          'success'
        );
        fetchTicket();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to post message';
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

      await ticketApi.update(id, {
        status: updateStatus,
        priority: updatePriority,
        groupId: updateGroupId ? parseInt(updateGroupId, 10) : undefined,
        ticketTypeId: updateTicketTypeId ? parseInt(updateTicketTypeId, 10) : undefined,
        agentId: updateAgentId ? parseInt(updateAgentId, 10) : null,
      });

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

  const handleOpenCloseModal = (targetStatus) => {
    setCloseModalConfig({
      isOpen: true,
      targetStatus,
    });
  };

  const handleConfirmCloseResolve = async (remark) => {
    try {
      setCloseModalLoading(true);
      const targetStatus = closeModalConfig.targetStatus;
      await ticketApi.updateStatus(id, targetStatus);
      if (remark) {
        await ticketApi.addComment(id, {
          commentType: targetStatus === 'RESOLVED' ? 'REPLY' : 'INTERNAL_NOTE',
          body: `[${targetStatus === 'RESOLVED' ? 'Resolution Summary' : 'Closure Note'}]: ${remark}`,
        });
      }
      showToast(`Ticket #${ticket.ticketNumber} marked as ${targetStatus.toLowerCase()} successfully!`, 'success');
      setCloseModalConfig((prev) => ({ ...prev, isOpen: false }));
      fetchTicket();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update ticket status', 'error');
    } finally {
      setCloseModalLoading(false);
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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
          className="mt-3 inline-flex items-center gap-1.5 font-semibold hover:underline" style={{ color: '#6366f1' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Tickets
        </button>
      </div>
    );
  }

  const priority = ticket.priority || 'MEDIUM';
  const isHigh = priority === 'HIGH' || priority === 'URGENT';
  const isLow = priority === 'LOW';

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* ── Breadcrumb matching Screenshot 2 ── */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link to="/tickets" className="hover:text-slate-700 transition-colors">
          Tickets
        </Link>
        <span>&gt;</span>
        <span className="font-mono text-slate-700 font-bold">#{ticket.ticketNumber}</span>
        <span>&gt;</span>
        <span className="text-slate-500 truncate max-w-xs">{ticket.subject}</span>
      </div>

      {/* ── Top Header Row (Title, Badges & Action Buttons matching Screenshot 2) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                isHigh
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isLow
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {priority}
            </span>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                ticket.status === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : ticket.status === 'PENDING'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : ticket.status === 'IN_PROGRESS'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : ticket.status === 'RESOLVED'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Action Buttons: Edit Status (dark navy), Resolve, Close, Delete */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {canEditTicket(user, ticket) && (
            <button
              type="button"
              onClick={openEditPropertiesModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer hover:opacity-95 active:scale-95"
              style={{ background: '#1e1b4b' }}
              title="Edit ticket status, type, group, and agent"
            >
              <span>Edit Status</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          )}

          {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && canEditTicket(user, ticket) && (
            <button
              type="button"
              onClick={() => handleOpenCloseModal('RESOLVED')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <span>Resolve</span>
            </button>
          )}

          {ticket.status !== 'CLOSED' && canEditTicket(user, ticket) && (
            <button
              type="button"
              onClick={() => handleOpenCloseModal('CLOSED')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span>Close</span>
            </button>
          )}

          {canDeleteTicket(user, ticket) && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Delete Ticket"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Two-Column Split Layout matching Screenshot 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left Column: Conversation Thread & Composer (approx 66% width) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card 1: Original Ticket Message (Requester) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {ticket.contact?.name?.[0]?.toUpperCase() || ticket.creator?.name?.[0]?.toUpperCase() || 'R'}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {ticket.contact?.name || ticket.creator?.name || 'Requester'}
                  </p>
                  <span className="text-[11px] text-slate-300">·</span>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {formatRelativeTime(ticket.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-1">
              {ticket.description}
            </p>

            {/* Attachments */}
            {ticket.attachments && Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100">
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

          {/* Cards 2..N: Comments Thread */}
          {ticket.comments && ticket.comments.map((c) => {
            const isAgentComment =
              c.user?.role === 'AGENT' ||
              c.user?.role === 'ADMIN' ||
              c.user?.role === 'SUPER_ADMIN';
            const isInternal = c.commentType === 'INTERNAL_NOTE';

            // Agent card = blue tinted card (matching Screenshot 2), Internal = amber, User = white
            const cardStyle = isInternal
              ? { background: '#fffbeb', border: '1px solid #fde68a' }
              : isAgentComment
              ? { background: '#f0f7ff', border: '1px solid #bfdbfe' }
              : { background: '#ffffff', border: '1px solid #e2e8f0' };

            const avatarBg = isInternal
              ? 'bg-amber-100 text-amber-800'
              : isAgentComment
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-white';

            return (
              <div
                key={c.id}
                className="rounded-2xl p-5 shadow-2xs space-y-2.5 transition-all"
                style={cardStyle}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarBg}`}>
                      {c.user?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {c.user?.name || 'Staff User'}
                        </p>
                        <span className="text-[11px] text-slate-300">·</span>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {formatRelativeTime(c.createdAt)}
                        </p>
                        {isInternal && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200/70 text-amber-800 ml-1">
                            Internal Note
                          </span>
                        )}
                      </div>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-1">
                  {c.body}
                </p>
              </div>
            );
          })}

          {/* Composer Box (Matching Screenshot 2) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3">
            {/* Formatting Toolbar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1 text-slate-500">
                <button
                  type="button"
                  onClick={() => setCommentText((prev) => prev + '**bold**')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-xs cursor-pointer"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCommentText((prev) => prev + '*italic*')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 italic text-xs cursor-pointer"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCommentText((prev) => prev + '\n- ')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 text-xs cursor-pointer"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode Selector: Reply vs Internal Note */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setComposerMode('REPLY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    composerMode === 'REPLY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode('INTERNAL_NOTE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    composerMode === 'INTERNAL_NOTE'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Internal Note
                </button>
              </div>
            </div>

            <form onSubmit={handleSendReply}>
              <textarea
                rows={3}
                placeholder={
                  composerMode === 'INTERNAL_NOTE'
                    ? 'Write an internal note (only visible to staff & agents)...'
                    : 'Type a reply to the requester...'
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full text-xs text-slate-800 placeholder:text-slate-400 border-0 focus:outline-none resize-none p-1 bg-transparent min-h-[70px]"
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                  <button type="button" className="p-1.5 hover:text-slate-600 rounded-lg cursor-pointer" title="Attach file">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-600 rounded-lg cursor-pointer" title="Add link">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-600 rounded-lg cursor-pointer" title="Emoji">
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer text-white hover:opacity-95 active:scale-95"
                  style={{
                    background: composerMode === 'INTERNAL_NOTE' ? '#d97706' : '#1e1b4b',
                  }}
                >
                  <span>{composerMode === 'INTERNAL_NOTE' ? 'Add Note' : 'Add Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right Column: Properties Panel (Ticket Info, Requester, Activity Timeline) ── */}
        <div className="space-y-4">
          {/* Card 1: Ticket Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Ticket Info
            </h3>
            <div className="space-y-2.5 divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 font-medium">ID</span>
                <span className="font-mono font-bold text-slate-800">#{ticket.ticketNumber}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400 font-medium">Type</span>
                <span className="font-semibold text-slate-800">
                  {ticket.ticketType?.name || 'Support'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400 font-medium">Priority</span>
                <span
                  className={`font-bold ${
                    isHigh ? 'text-rose-600' : isLow ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {priority}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400 font-medium">Assigned Agent</span>
                <span className="font-semibold text-slate-800">
                  {ticket.agent?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-400 font-medium">Group</span>
                <span className="font-semibold text-slate-800">
                  {ticket.group?.name || 'Clinical Systems Support'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Requester */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Requester
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                {ticket.contact?.name?.[0]?.toUpperCase() || ticket.creator?.name?.[0]?.toUpperCase() || 'R'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {ticket.contact?.name || ticket.creator?.name || 'Staff User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {ticket.contactEmail || ticket.contact?.email || ticket.creator?.email || 'user@hospital.org'}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Department</span>
              <span className="font-semibold text-slate-800">
                {ticket.contact?.department?.name || ticket.creator?.department?.name || 'General'}
              </span>
            </div>
          </div>

          {/* Card 3: Activity Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Activity Timeline
            </h3>
            <div className="space-y-3 text-xs relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {/* Event 1: Created */}
              <div className="flex items-start gap-3 relative">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0 ring-4 ring-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium">Created by the ticket</p>
                  <p className="text-[10px] text-slate-400">
                    {formatRelativeTime(ticket.createdAt)}
                  </p>
                </div>
              </div>

              {/* Event 2: Agent Assignment */}
              {ticket.agent && (
                <div className="flex items-start gap-3 relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0 ring-4 ring-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium">
                      Assigned {ticket.agent.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatRelativeTime(ticket.updatedAt || ticket.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Status History Events */}
              {ticket.statusHistories && ticket.statusHistories.length > 0 ? (
                ticket.statusHistories.slice(0, 3).map((h) => (
                  <div key={h.id} className="flex items-start gap-3 relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-white" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium">
                        Status changed the ticket
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatRelativeTime(h.changedAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium">
                      Status changed the ticket
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatRelativeTime(ticket.updatedAt || ticket.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Priority updated */}
              <div className="flex items-start gap-3 relative">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0 ring-4 ring-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium">
                    Priority updated the ticket
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatRelativeTime(ticket.updatedAt || ticket.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen 6: Edit Ticket Properties Modal with Logic-based Group/Agent Selection */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Edit Ticket Properties"
        maxWidth="max-w-md"
      >
        {updateError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{updateError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateTicketSubmit} className="space-y-4">
          {/* 1. Status Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none transition-all"
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <option value="OPEN">🟢 Open</option>
              <option value="PENDING">🟡 Pending</option>
              <option value="IN_PROGRESS">🔵 In Progress</option>
              <option value="RESOLVED">✅ Resolved</option>
              <option value="CLOSED">⚪ Closed</option>
            </select>
          </div>

          {/* 2. Ticket Type Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ticket Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={updateTicketTypeId}
              onChange={(e) => setUpdateTicketTypeId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none transition-all"
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <option value="">Select Type</option>
              {ticketTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Support Group Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Support Group <span className="text-rose-500">*</span>
            </label>
            <select
              value={updateGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Changing group automatically updates the agent list</span>
          </div>

          {/* 4. Agent Name Dropdown (Filtered by selected group based on logic) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Agent Name
            </label>
            <select
              value={updateAgentId}
              onChange={(e) => setUpdateAgentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
            >
              <option value="">Unassigned</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Priority Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={updatePriority}
              onChange={(e) => setUpdatePriority(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none transition-all"
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <option value="HIGH">🔴 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
              <option value="URGENT">🔥 Urgent</option>
            </select>
          </div>

          {/* 6. Optional Internal Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason / Internal Note <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Reassigned to HR specialist for approval..."
              value={updateComment}
              onChange={(e) => setUpdateComment(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingTicket}
              className="px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              {updatingTicket ? 'Updating...' : 'Submit'}
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

      {/* Ticket Close / Resolve Confirmation Modal */}
      <TicketCloseModal
        isOpen={closeModalConfig.isOpen}
        targetStatus={closeModalConfig.targetStatus}
        ticket={ticket}
        onClose={() => setCloseModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmCloseResolve}
        loading={closeModalLoading}
      />
    </div>
  );
}
