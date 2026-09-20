import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Check, FolderKanban, AlertCircle, Shield } from 'lucide-react';
import agentApi from '../../services/agentApi.js';
import userApi from '../../services/userApi.js';
import groupApi from '../../services/groupApi.js';
import { Card, Modal, EmptyState } from '../../components/ui/index.jsx';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State for assigning groups to an agent/user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsRes, groupsRes, usersRes] = await Promise.all([
        agentApi.list({ search, limit: 100 }),
        groupApi.list({ limit: 100, status: 'ACTIVE' }),
        userApi.list({ limit: 100 }),
      ]);

      if (agentsRes.success) setAgents(agentsRes.data || []);
      if (groupsRes.success) setAllGroups(groupsRes.data || []);
      if (usersRes.success) setAllUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load agent configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openConfigModal = (userItem) => {
    setSelectedUser(userItem);
    // Pre-populate already assigned group IDs
    const currentGroupIds = userItem.groups?.map((g) => g.id) || [];
    setSelectedGroupIds(currentGroupIds);
    setError('');
    setIsModalOpen(true);
  };

  const toggleGroup = (groupId) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  const handleSaveAssignments = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError('');
      await agentApi.updateAgentGroups(selectedUser.id, selectedGroupIds, true);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update groups');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Agent Group Mapping</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Designate users as support agents and map them to their authorized support groups.
          </p>
        </div>

        {/* Quick Assign New User Button */}
        <button
          onClick={() => {
            const firstAvailable = allUsers[0];
            if (firstAvailable) openConfigModal(firstAvailable);
          }}
          disabled={allUsers.length === 0}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3.5 rounded-lg shadow-sm text-xs transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <UserCheck className="w-4 h-4" />
          <span>Configure Agent</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agents by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No agents found"
            description="No users have been configured as support agents yet. Click Configure Agent to assign groups to a user."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-3">Agent Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Assigned Groups</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{a.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{a.email}</td>
                    <td className="px-5 py-3.5 text-slate-600">{a.department?.name || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {a.role?.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {a.groups && a.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {a.groups.map((g) => (
                            <span
                              key={g.id}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No groups assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openConfigModal(a)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Manage Groups
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to configure groups */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agent Group Configuration"
        maxWidth="max-w-xl"
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveAssignments} className="space-y-4">
          {/* User selector if adding a new mapping */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select User</label>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const found = allUsers.find((u) => u.id === parseInt(e.target.value, 10));
                if (found) {
                  setSelectedUser(found);
                  setSelectedGroupIds(found.groups?.map((g) => g.id) || []);
                }
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role?.name || 'EMPLOYEE'}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-600">
            <p className="font-semibold text-blue-900">
              Role Promotion & Multi-Group Mapping:
            </p>
            <p className="mt-0.5">
              Saving will ensure this user has the <strong>AGENT</strong> role and authorize them to
              respond and raise tickets exclusively for the checked groups below.
            </p>
          </div>

          {/* Group Checklist (Supports 1, 2, 7, 20... any number of groups) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Assigned Groups ({selectedGroupIds.length} selected)
            </label>

            {allGroups.length === 0 ? (
              <p className="text-xs text-amber-600">
                No groups exist in Group Master. Please create groups first under Admin &gt; Groups.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {allGroups.map((group) => {
                  const isChecked = selectedGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        isChecked ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleGroup(group.id)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{group.name}</p>
                          {group.description && (
                            <p className="text-[11px] text-slate-400">{group.description}</p>
                          )}
                        </div>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-blue-600" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || allGroups.length === 0}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Group Assignments'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
