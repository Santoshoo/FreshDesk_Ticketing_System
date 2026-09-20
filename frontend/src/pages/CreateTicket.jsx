import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Check,
  AlertCircle,
  FolderKanban,
  Tag as TagIcon,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import userApi from '../services/userApi.js';
import contactApi from '../services/contactApi.js';
import ticketTypeApi from '../services/ticketTypeApi.js';
import agentApi from '../services/agentApi.js';
import groupApi from '../services/groupApi.js';
import ticketApi from '../services/ticketApi.js';
import { Card, CardContent } from '../components/ui/index.jsx';

export default function CreateTicket() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isAgentOrAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'AGENT';

  // Form State - strictly requested business fields only!
  const [contactId, setContactId] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchingContacts, setSearchingContacts] = useState(false);

  const [subject, setSubject] = useState('');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [groupId, setGroupId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [description, setDescription] = useState('');

  // Master Data Dropdowns from MySQL
  const [ticketTypes, setTicketTypes] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [agentSearch, setAgentSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch initial Master Data (Types, All Active Master Groups for all roles)
  useEffect(() => {
    async function loadMasterData() {
      try {
        setInitialLoading(true);
        const [typesRes, groupsRes] = await Promise.all([
          ticketTypeApi.list({ limit: 100, status: 'ACTIVE' }),
          groupApi.list({ limit: 100, status: 'ACTIVE' }),
        ]);

        if (typesRes.success) setTicketTypes(typesRes.data || []);
        if (groupsRes.success) setAvailableGroups(groupsRes.data || []);
      } catch (err) {
        console.error('Failed to load master data:', err);
        setError('Failed to load required master data from database.');
      } finally {
        setInitialLoading(false);
      }
    }
    loadMasterData();
  }, []);

  // Live Group search via API when typing in groupSearch
  useEffect(() => {
    if (!groupSearch || groupSearch.trim().length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await groupApi.search(groupSearch.trim(), 50);
        if (res.success && res.data) {
          setAvailableGroups((prev) => {
            const map = new Map(prev.map((g) => [g.id, g]));
            res.data.forEach((g) => map.set(g.id, g));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error('Group API search error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [groupSearch]);

  // 2. Search Contacts across BOTH User Master and Employee Email Master (Union Search)
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
      setAgentSearch('');
      return;
    }

    async function loadGroupAgents() {
      try {
        setLoadingAgents(true);
        const res = await groupApi.getAgentsByGroup(groupId, { limit: 100 });
        if (res.success) {
          setAvailableAgents(res.data || []);
          setAgentId(''); // Reset selected agent on group change
          setAgentSearch('');
        }
      } catch (err) {
        console.error('Failed to load agents for group:', err);
      } finally {
        setLoadingAgents(false);
      }
    }

    loadGroupAgents();
  }, [groupId]);

  // Dynamic filtered lists for search
  const filteredGroups = availableGroups.filter((g) => {
    if (!groupSearch) return true;
    const q = groupSearch.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  });

  const filteredAgents = availableAgents.filter((ag) => {
    if (!agentSearch) return true;
    const q = agentSearch.toLowerCase();
    return (
      (ag.name && ag.name.toLowerCase().includes(q)) ||
      (ag.email && ag.email.toLowerCase().includes(q)) ||
      (ag.employeeId && ag.employeeId.toLowerCase().includes(q))
    );
  });

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContact) {
      setError('Please select a valid contact (from User Master or Employee Email Master).');
      showToast('Please select a contact requester.', 'error');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a ticket subject.');
      showToast('Please enter a ticket subject.', 'error');
      return;
    }
    if (!ticketTypeId) {
      setError('Please select a Ticket Type.');
      showToast('Please select a ticket type.', 'error');
      return;
    }
    if (!groupId) {
      setError('Please select an assigned Support Group.');
      showToast('Please select a support group.', 'error');
      return;
    }
    if (!description.trim()) {
      setError('Please enter the ticket description.');
      showToast('Please enter ticket description.', 'error');
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
        status,
        groupId: parseInt(groupId, 10),
        agentId: agentId ? parseInt(agentId, 10) : null,
        description: description.trim(),
      };

      const res = await ticketApi.create(payload);
      if (res.success && res.data) {
        showToast('Ticket created successfully!', 'success');
        navigate(`/tickets/${res.data.id}`);
      }
    } catch (err) {
      console.error('Create ticket error:', err);
      const errMsg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to create ticket. Please check master data configurations.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-medium text-slate-500">Loading Master Data from MySQL...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-200/80 rounded-lg text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create New Ticket</h2>
          <p className="text-xs text-slate-500">
            Submit a service request or incident using real master data.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Warning if no groups or types exist in Master Data */}
      {availableGroups.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <p className="font-semibold">No assigned support groups found.</p>
          <p className="mt-0.5">
            You have not been mapped to any support group in Master Data, or no groups exist. Contact
            an administrator to configure Group Master and Agent Group assignments.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Contact Field (Permission based on user role) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Contact / Requester <span className="text-rose-500">*</span>
                </label>
                {isAgentOrAdmin ? (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Agent Privilege: Can raise on behalf of other staff
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Self Requester
                  </span>
                )}
              </div>

              {selectedContact ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {selectedContact.name ? selectedContact.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">{selectedContact.name}</p>
                        {selectedContact.source === 'EMPLOYEE_EMAIL_MASTER' ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                            Employee Email Master
                          </span>
                        ) : (
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-300">
                            User Master
                          </span>
                        )}
                        {selectedContact.id === user?.id && selectedContact.source === 'USER' && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {selectedContact.email}
                        {selectedContact.employeeId ? ` • ID: ${selectedContact.employeeId}` : ''}
                        {selectedContact.department ? ` • ${selectedContact.department}` : ''}
                      </p>
                    </div>
                  </div>

                  {isAgentOrAdmin ? (
                    <div className="flex items-center gap-2">
                      {selectedContact.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContact({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              employeeId: user.employeeId,
                              department: user.departmentName || user.department,
                              source: 'USER',
                            });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded border border-blue-200 shadow-2xs transition-colors"
                        >
                          Set as Myself
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContact(null);
                          setContactSearch('');
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-white px-2 py-1 rounded border border-rose-200 shadow-2xs transition-colors"
                      >
                        Change Contact
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Self</span>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search contact by email, name, or employee ID (searches Users + Employee Emails)..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {contactResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 max-h-56 overflow-y-auto z-20 divide-y divide-slate-100">
                      {contactResults.map((u) => (
                        <div
                          key={`${u.source}-${u.id}-${u.email}`}
                          onClick={() => {
                            setSelectedContact(u);
                            setContactSearch('');
                            setContactResults([]);
                          }}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-800">{u.name}</p>
                              {u.source === 'EMPLOYEE_EMAIL_MASTER' ? (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                  Employee Email Master
                                </span>
                              ) : (
                                <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                  User Master
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {u.email} {u.employeeId ? `• EMP: ${u.employeeId}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {u.department || 'General'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchingContacts && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Searching User Master and Employee Email Master...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 2. Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of the issue or request..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* 3. Type & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type Field from MySQL ticket_types */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={ticketTypeId}
                  onChange={(e) => setTicketTypeId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="">-- Select Ticket Type --</option>
                  {ticketTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {ticketTypes.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    No ticket types found in database. Create them in Admin &gt; Ticket Types.
                  </p>
                )}
              </div>

              {/* Status Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="OPEN">Open (Default)</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            {/* 4. Group & Agent Dynamic Cascade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Group Field from Master Data with Search */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                    Group <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Master Data ({availableGroups.length})
                  </span>
                </div>

                {/* Group Search Bar */}
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search group by name or keyword..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                  {groupSearch && (
                    <button
                      type="button"
                      onClick={() => setGroupSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Group Dropdown */}
                <select
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-800"
                >
                  <option value="">-- Select Master Group --</option>
                  {filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.description ? `(${g.description})` : ''}
                    </option>
                  ))}
                </select>

                {filteredGroups.length === 0 && availableGroups.length > 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No group matching "{groupSearch}"</p>
                )}
              </div>

              {/* Agent Field dynamically populated by selected Group */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Agent <span className="text-rose-500">*</span>
                  </label>
                  {groupId && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {loadingAgents ? 'Loading...' : `Mapped Agents (${availableAgents.length})`}
                    </span>
                  )}
                </div>

                {/* Agent Search Filter */}
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    disabled={!groupId || loadingAgents}
                    placeholder={
                      !groupId
                        ? 'Select a group first...'
                        : 'Filter mapped agents by name, email, or EMP ID...'
                    }
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 disabled:opacity-50"
                  />
                  {agentSearch && (
                    <button
                      type="button"
                      onClick={() => setAgentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Agent Dropdown */}
                <select
                  required
                  disabled={!groupId || loadingAgents}
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400 font-medium text-slate-800"
                >
                  <option value="">
                    {!groupId
                      ? '-- Select Group First to View Mapped Agents --'
                      : loadingAgents
                      ? 'Loading mapped agents...'
                      : availableAgents.length === 0
                      ? 'No agents mapped to this group in Master Config'
                      : '-- Select Mapped Agent --'}
                  </option>
                  {filteredAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.email}) {ag.employeeId ? `• EMP: ${ag.employeeId}` : ''}
                    </option>
                  ))}
                </select>

                {groupId && !loadingAgents && availableAgents.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    ⚠️ No agent is currently mapped to this group in Master Config.
                  </p>
                )}
                {groupId && agentSearch && filteredAgents.length === 0 && availableAgents.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">No mapped agent matches "{agentSearch}"</p>
                )}
              </div>
            </div>

            {/* 5. Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                placeholder="Provide detailed information regarding the issue or inquiry..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || availableGroups.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Ticket...</span>
                  </>
                ) : (
                  <span>Create Ticket</span>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
