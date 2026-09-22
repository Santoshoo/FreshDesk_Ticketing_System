import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Check,
  AlertCircle,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  List,
  RotateCcw,
  RotateCw,
  ChevronDown,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import contactApi from '../services/contactApi.js';
import ticketTypeApi from '../services/ticketTypeApi.js';
import groupApi from '../services/groupApi.js';
import ticketApi from '../services/ticketApi.js';
import TicketSuccessModal from '../components/modals/TicketSuccessModal.jsx';

export default function CreateTicket() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const isAgentOrAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'AGENT';

  // Form State
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  const [subject, setSubject] = useState('');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [priority, setPriority] = useState('');
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState('OPEN'); // Default to OPEN as requested
  const [description, setDescription] = useState('');
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Tiptap Rich Text Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline hover:text-indigo-800',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setDescription(editor.isEmpty ? '' : html);
    },
  });

  // Toolbar action helpers
  const handleToggleLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const getCurrentHeading = () => {
    if (!editor) return 'Paragraph';
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    return 'Paragraph';
  };

  // Master Data Dropdowns
  const [ticketTypes, setTicketTypes] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Initial Master Data
  useEffect(() => {
    async function loadMasterData() {
      try {
        setInitialLoading(true);
        const [typesRes, groupsRes] = await Promise.all([
          ticketTypeApi.list({ limit: 100, status: 'ACTIVE' }),
          groupApi.list({ limit: 100, status: 'ACTIVE' }),
        ]);

        if (typesRes.success) {
          setTicketTypes(typesRes.data || []);
        }
        if (groupsRes.success) {
          setAvailableGroups(groupsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load master data:', err);
        setError('Failed to load required master data from database.');
      } finally {
        setInitialLoading(false);
      }
    }
    loadMasterData();
  }, [user]);

  // 2. Search Contacts
  useEffect(() => {
    if (!contactSearch || contactSearch.trim().length < 2) {
      setContactResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingContacts(true);
        const res = await contactApi.search(contactSearch.trim(), 20);
        if (res.success) {
          setContactResults(res.data || []);
        }
      } catch (err) {
        console.error('Unified contact search error:', err);
      } finally {
        setSearchingContacts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [contactSearch]);

  // 3. Dynamic Agents dropdown when Group changes
  useEffect(() => {
    if (!groupId) {
      setAvailableAgents([]);
      setAgentId('');
      return;
    }

    async function loadGroupAgents() {
      try {
        const res = await groupApi.getAgentsByGroup(groupId, { limit: 100 });
        if (res.success) {
          setAvailableAgents(res.data || []);
          setAgentId('');
        }
      } catch (err) {
        console.error('Failed to load agents for group:', err);
      }
    }

    loadGroupAgents();
  }, [groupId]);

  // File drop handler
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((f) => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
      type: f.type,
      file: f,
    }));
    setAttachments([...attachments, ...newFiles]);
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContact) {
      setError('Please select a valid contact requester.');
      showToast('Please select a contact requester.', 'error');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a ticket subject.');
      showToast('Please enter a ticket subject.', 'error');
      return;
    }
    if (!groupId) {
      setError('Please assign an authorized Support Group.');
      showToast('Please select a group.', 'error');
      return;
    }
    if (!ticketTypeId) {
      setError('Please select a Ticket Type.');
      showToast('Please select a ticket type.', 'error');
      return;
    }
    if (!priority) {
      setError('Please select a Priority.');
      showToast('Please select a priority.', 'error');
      return;
    }

    const finalStatus = status || 'OPEN';

    const finalDescription = editor ? editor.getHTML() : description;
    const isDescriptionEmpty =
      !finalDescription ||
      finalDescription === '<p></p>' ||
      (editor && editor.isEmpty);

    if (isDescriptionEmpty) {
      setError('Please provide a description of the issue.');
      showToast('Please enter a description.', 'error');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        contactId: selectedContact.source === 'USER' ? selectedContact.id : null,
        employeeEmailId: selectedContact.source === 'EMPLOYEE_EMAIL_MASTER' ? selectedContact.id : null,
        contactSource: selectedContact.source || 'USER',
        contactEmail: selectedContact.email,
        contactName: selectedContact.name,
        subject: subject.trim(),
        ticketTypeId: parseInt(ticketTypeId, 10),
        groupId: parseInt(groupId, 10),
        agentId: agentId ? parseInt(agentId, 10) : null,
        priority: priority,
        status: finalStatus,
        description: finalDescription.trim(),
        attachments: attachments.map((a) => ({
          name: a.name,
          size: a.size,
          type: a.type,
        })),
      };

      const res = await ticketApi.create(payload);

      if (res.success) {
        showToast(`Ticket #${res.data?.ticketNumber || ''} created successfully!`, 'success');
        if (createAnother) {
          setSelectedContact(null);
          setContactSearch('');
          setSubject('');
          setDescription('');
          if (editor) editor.commands.setContent('');
          setAttachments([]);
          setTicketTypeId('');
          setGroupId('');
          setPriority('');
          setAgentId('');
          setStatus('OPEN');
        } else {
          setCreatedTicket(res.data);
          setShowSuccessModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create ticket';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Link to="/dashboard" className="hover:text-slate-600 transition-colors">
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className="text-slate-700 font-semibold">Create Ticket</span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create New Ticket</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Fill in the details below to create a new support ticket.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Ticket Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contact / Requester Pill */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Contact / Requester <span className="text-rose-500">*</span>
              </label>
              {selectedContact && (
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-sky-800"
                >
                  Change Contact
                </button>
              )}
            </div>

            {selectedContact ? (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                    {selectedContact.name ? selectedContact.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{selectedContact.name}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({selectedContact.email})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contact by name or email..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                {contactResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                    {contactResults.map((u) => (
                      <div
                        key={`${u.source}-${u.id}-${u.email}`}
                        onClick={() => {
                          setSelectedContact(u);
                          setContactSearch('');
                          setContactResults([]);
                        }}
                        className="p-2.5 hover:bg-sky-50/60 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1. Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Plan Update for EMR"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* 2. Three-column row: Type, Group, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={ticketTypeId}
                onChange={(e) => setTicketTypeId(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  !ticketTypeId ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'
                }`}
              >
                <option value="" disabled>
                  Select Type
                </option>
                {ticketTypes.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-800 font-normal">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Group <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  !groupId ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'
                }`}
              >
                <option value="" disabled>
                  Select Group
                </option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id} className="text-slate-800 font-normal">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  !priority ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'
                }`}
              >
                <option value="" disabled>
                  Select Priority
                </option>
                <option value="HIGH" className="text-slate-800 font-normal">🔴 High</option>
                <option value="MEDIUM" className="text-slate-800 font-normal">🟡 Medium</option>
                <option value="LOW" className="text-slate-800 font-normal">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* 3. Two-column row: Assign To, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Assign To */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assign To
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={!groupId}
                className={`w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  !agentId ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'
                } ${!groupId ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
              >
                <option value="">
                  {!groupId ? 'Select Group first' : 'Select Agent (Optional / Unassigned)'}
                </option>
                {availableAgents.map((ag) => (
                  <option key={ag.id} value={ag.id} className="text-slate-800 font-normal">
                    {ag.name} ({ag.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-slate-800 font-medium"
              >
                <option value="OPEN" className="text-slate-800 font-normal">🟢 Open (Default)</option>
                <option value="PENDING" className="text-slate-800 font-normal">🟡 Pending</option>
                <option value="IN_PROGRESS" className="text-slate-800 font-normal">🔵 In Progress</option>
                <option value="RESOLVED" className="text-slate-800 font-normal">✅ Resolved</option>
                <option value="CLOSED" className="text-slate-800 font-normal">⚪ Closed</option>
              </select>
            </div>
          </div>

          {/* 4. Description with Active Rich Formatting Toolbar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description <span className="text-rose-500">*</span>
            </label>

            <div className="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all bg-white">
              {/* Toolbar */}
              <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 text-slate-600 flex-wrap relative">
                {/* Paragraph / Heading Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                    className="px-2 py-1 hover:bg-slate-200/80 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{getCurrentHeading()}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {formatDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setFormatDropdownOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            editor?.chain().focus().setParagraph().run();
                            setFormatDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                            editor?.isActive('paragraph') ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'
                          }`}
                        >
                          Paragraph
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            editor?.chain().focus().toggleHeading({ level: 1 }).run();
                            setFormatDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sm font-bold cursor-pointer ${
                            editor?.isActive('heading', { level: 1 }) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                          }`}
                        >
                          Heading 1
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            editor?.chain().focus().toggleHeading({ level: 2 }).run();
                            setFormatDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-bold cursor-pointer ${
                            editor?.isActive('heading', { level: 2 }) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                          }`}
                        >
                          Heading 2
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            editor?.chain().focus().toggleHeading({ level: 3 }).run();
                            setFormatDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold cursor-pointer ${
                            editor?.isActive('heading', { level: 3 }) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                          }`}
                        >
                          Heading 3
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <span className="w-px h-3.5 bg-slate-300 mx-1"></span>

                {/* Bold */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('bold')
                      ? 'bg-indigo-100 text-indigo-700 font-bold'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('italic')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('underline')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                {/* Strikethrough */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('strike')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-3.5 bg-slate-300 mx-1"></span>

                {/* Code */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('code')
                      ? 'bg-indigo-100 text-indigo-700 font-mono'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Code"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>

                {/* Link */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleToggleLink}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('link')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>

                {/* Bullet List */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor?.isActive('bulletList')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-3.5 bg-slate-300 mx-1"></span>

                {/* Undo */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Redo */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tiptap Active Editor Content Area */}
              <div
                onClick={() => editor?.commands.focus()}
                className="relative min-h-[140px] p-3.5 text-xs text-slate-800 bg-white cursor-text"
              >
                {editor && editor.isEmpty && (
                  <span className="absolute top-3.5 left-3.5 text-xs text-slate-400 pointer-events-none select-none">
                    Provide a detailed description of the issue or request...
                  </span>
                )}
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* 5. Attachments Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attachments
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-sky-50/30 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-sky-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Drag and drop files here, or <span className="text-indigo-600 underline">click to browse</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (Max 10 MB each)
              </p>
            </div>

            {/* Attached File Chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mt-3">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-semibold">{file.name}</span>
                    <span className="text-[10px] text-slate-400">{file.size}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Footer Checkbox & Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span>Create another ticket after this one</span>
            </label>

            <div className="flex items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#6366f1] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Ticket Creation Success Celebration Modal */}
      <TicketSuccessModal
        isOpen={showSuccessModal}
        ticket={createdTicket}
        onClose={() => setShowSuccessModal(false)}
        onViewTicket={() => {
          setShowSuccessModal(false);
          if (createdTicket?.id) {
            navigate(`/tickets/${createdTicket.id}`);
          }
        }}
        onCreateAnother={() => {
          setShowSuccessModal(false);
          setCreatedTicket(null);
          setSelectedContact(null);
          setContactSearch('');
          setSubject('');
          setDescription('');
          setAttachments([]);
          setTicketTypeId('');
          setGroupId('');
          setPriority('');
          setAgentId('');
          setStatus('');
        }}
        onBackToDashboard={() => {
          setShowSuccessModal(false);
          navigate('/dashboard');
        }}
      />
    </div>
  );
}
