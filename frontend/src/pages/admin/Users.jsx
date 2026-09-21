import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Users as UsersIcon,
  Edit2,
  Trash2,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';
import userApi from '../../services/userApi.js';
import departmentApi from '../../services/departmentApi.js';
import employeeEmailApi from '../../services/employeeEmailApi.js';
import { Card, Modal, EmptyState } from '../../components/ui/index.jsx';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employeeEmails, setEmployeeEmails] = useState([]);
  const [isCustomEmailMode, setIsCustomEmailMode] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // 3-dot dropdown action state
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    mobile: '',
    departmentId: '',
    roleId: '',
    status: 'ACTIVE',
    password: '',
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes, rolesRes, empEmailsRes] = await Promise.all([
        userApi.list({ search, limit: 100 }),
        departmentApi.list({ limit: 100, status: 'ACTIVE' }),
        userApi.getRoles(),
        employeeEmailApi.list({ limit: 500, status: 'ACTIVE' }),
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (deptsRes.success) setDepartments(deptsRes.data || []);
      if (rolesRes.success) setRoles(rolesRes.data || []);
      if (empEmailsRes.success) setEmployeeEmails(empEmailsRes.data || []);
    } catch (err) {
      console.error('Failed to load users data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingUser(null);
    setIsCustomEmailMode(false);
    setFormData({
      name: '',
      email: '',
      employeeId: '',
      mobile: '',
      departmentId: departments[0]?.id || '',
      roleId: roles.find((r) => r.name === 'EMPLOYEE')?.id || roles[0]?.id || '',
      status: 'ACTIVE',
      password: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user) => {
    setActiveDropdownId(null);
    setEditingUser(user);
    setIsCustomEmailMode(false);
    setFormData({
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      mobile: user.mobile || '',
      departmentId: user.departmentId || '',
      roleId: user.roleId || '',
      status: user.status || 'ACTIVE',
      password: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (user) => {
    setActiveDropdownId(null);
    setUserToDelete(user);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      setDeleteError('');
      await userApi.delete(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.error?.message || err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      setError('');

      if (editingUser) {
        await userApi.update(editingUser.id, formData);
      } else {
        await userApi.create(formData);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Master</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage hospital staff, accounts, and assign roles.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3.5 rounded-lg shadow-sm text-xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-visible" ref={dropdownRef}>
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading users from database...</p>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="The User Master currently contains no users matching this query."
            action={
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                Add First User
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Employee ID</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{u.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{u.employeeId}</td>
                    <td className="px-5 py-3.5 text-slate-600">{u.department?.name || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {u.role?.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right relative">
                      {/* 3-Dot Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === u.id ? null : u.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* 3-Dot Dropdown Menu */}
                      {activeDropdownId === u.id && (
                        <div className="absolute right-5 top-10 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-left divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              <span>Edit User</span>
                            </button>
                          </div>
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => openDeleteModal(u)}
                              className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete User</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sidhanta Barik"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomEmailMode(!isCustomEmailMode);
                    if (!isCustomEmailMode) {
                      setFormData((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  {isCustomEmailMode ? 'Select from Email Master' : '+ Add / Type Custom Email'}
                </button>
              </div>

              {isCustomEmailMode ? (
                <input
                  type="email"
                  required
                  placeholder="enter.new.email@kims.hospital"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              ) : (
                <select
                  required
                  value={formData.email}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomEmailMode(true);
                      setFormData((prev) => ({ ...prev, email: '' }));
                      return;
                    }
                    const selectedEmail = e.target.value;
                    const selectedEmpObj = employeeEmails.find((emp) => emp.email === selectedEmail);
                    setFormData((prev) => ({
                      ...prev,
                      email: selectedEmail,
                      departmentId: selectedEmpObj?.departmentId || prev.departmentId,
                    }));
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select Email from Master --</option>
                  {formData.email && !employeeEmails.some((emp) => emp.email === formData.email) && (
                    <option value={formData.email}>{formData.email}</option>
                  )}
                  {employeeEmails.map((emp) => (
                    <option key={emp.id} value={emp.email}>
                      {emp.email} {emp.department?.name ? `(${emp.department.name})` : ''}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Type a new Email...</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KIMS001"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password {editingUser && <span className="text-slate-400">(Leave blank to keep unchanged)</span>}
            </label>
            <input
              type="password"
              placeholder={editingUser ? '••••••••' : 'Initial password (default: Kims@123)'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
              disabled={formLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        maxWidth="max-w-md"
      >
        {deleteError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        {userToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
              <p className="text-xs font-bold text-rose-900">
                Are you sure you want to delete this user?
              </p>
              <div className="mt-2 text-xs text-slate-700 space-y-1">
                <p><strong>Name:</strong> {userToDelete.name}</p>
                <p><strong>Email:</strong> {userToDelete.email}</p>
                <p><strong>Employee ID:</strong> {userToDelete.employeeId}</p>
                <p><strong>Role:</strong> {userToDelete.role?.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              This action cannot be undone. Any active sessions, password tokens, and group mappings for this user will be removed.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
