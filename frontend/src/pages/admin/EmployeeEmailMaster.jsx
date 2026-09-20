import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import employeeEmailApi from '../../services/employeeEmailApi.js';
import departmentApi from '../../services/departmentApi.js';
import { Card, Modal, EmptyState } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function EmployeeEmailMaster() {
  const { showToast } = useToast();

  const [emails, setEmails] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    departmentId: '',
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status Change Confirmation Modal State
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Fetch departments on mount
  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await departmentApi.list({ limit: 100, status: 'ACTIVE' });
        if (res.success && res.data) {
          setDepartments(res.data);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    }
    loadDepartments();
  }, []);

  // Fetch paginated emails with debounced search
  const fetchEmails = async (page = pagination.page) => {
    try {
      setLoading(true);
      const res = await employeeEmailApi.list({
        page,
        limit: pagination.pageSize,
        search: search.trim(),
        departmentId: selectedDept || undefined,
        status: statusFilter || undefined,
      });

      if (res.success) {
        setEmails(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load employee emails:', err);
      showToast(err.response?.data?.error?.message || 'Failed to load employee email records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmails(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedDept, statusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchEmails(newPage);
    }
  };

  const openCreateModal = () => {
    setEditingEmail(null);
    setFormData({
      email: '',
      departmentId: departments[0]?.id || '',
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emailItem) => {
    setEditingEmail(emailItem);
    setFormData({
      email: emailItem.email,
      departmentId: emailItem.departmentId || '',
      isActive: emailItem.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      setFormError('');

      if (editingEmail) {
        await employeeEmailApi.update(editingEmail.id, {
          email: formData.email.trim(),
          departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : null,
          isActive: formData.isActive,
        });
        showToast('Employee email updated successfully!', 'success');
      } else {
        await employeeEmailApi.create({
          email: formData.email.trim(),
          departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : null,
          isActive: formData.isActive,
        });
        showToast('Employee email registered successfully!', 'success');
      }

      setIsModalOpen(false);
      fetchEmails(editingEmail ? pagination.page : 1);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Operation failed';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Status toggle handler
  const confirmStatusToggle = async () => {
    if (!statusTarget) return;
    try {
      setStatusLoading(true);
      const newStatus = !statusTarget.isActive;
      await employeeEmailApi.setStatus(statusTarget.id, newStatus);
      showToast(
        `Email ${statusTarget.email} ${newStatus ? 'activated' : 'deactivated'} successfully!`,
        'success'
      );
      setStatusTarget(null);
      fetchEmails(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update status';
      showToast(msg, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await employeeEmailApi.delete(deleteTarget.id);
      showToast(`Email ${deleteTarget.email} deleted successfully!`, 'success');
      setDeleteTarget(null);
      fetchEmails(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete record';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Employee Email Master</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Admin Master Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage official hospital staff emails for unified ticket contact search and creation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEmails(pagination.page)}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3.5 rounded-lg shadow-sm text-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee Email</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email address or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading employee emails from database...</p>
          </div>
        ) : emails.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No employee emails found"
            description={
              search || selectedDept || statusFilter
                ? 'No employee email matches the filter criteria.'
                : 'No employee emails have been added to Employee Email Master yet.'
            }
            action={
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                Add First Email
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
                    <th className="px-5 py-3">Email Address</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emails.map((item, idx) => {
                    const rowNumber = (pagination.page - 1) * pagination.pageSize + idx + 1;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 text-slate-400 font-mono text-[11px]">{rowNumber}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{item.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {item.department ? (
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{item.department.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate / Deactivate Button */}
                            <button
                              onClick={() => setStatusTarget(item)}
                              title={item.isActive ? 'Deactivate Email' : 'Activate Email'}
                              className={`p-1 rounded transition-colors ${
                                item.isActive
                                  ? 'text-amber-500 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {item.isActive ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(item)}
                              title="Edit Email"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteTarget(item)}
                              title="Delete Record"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <span>
                Showing {emails.length} of {pagination.total} records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  {pagination.page} / {pagination.totalPages || 1}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmail ? 'Edit Employee Email' : 'Add New Employee Email'}
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. employee@kims.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Emails are automatically normalized to lowercase and checked against duplicates.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- No Department Assigned --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'ACTIVE' })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ACTIVE">ACTIVE (Searchable for Tickets)</option>
              <option value="INACTIVE">INACTIVE (Hidden from Search)</option>
            </select>
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
              {formLoading ? 'Saving...' : editingEmail ? 'Save Changes' : 'Add Email'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Toggle Confirmation Modal */}
      <Modal
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.isActive ? 'Deactivate Employee Email' : 'Activate Employee Email'}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to {statusTarget?.isActive ? 'deactivate' : 'activate'}{' '}
            <strong className="text-slate-900">{statusTarget?.email}</strong>?
          </p>
          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {statusTarget?.isActive
              ? 'Deactivated emails will immediately stop appearing in Contact Search during ticket creation.'
              : 'Activated emails will immediately be available for selection during ticket creation.'}
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              No, Cancel
            </button>
            <button
              type="button"
              disabled={statusLoading}
              onClick={confirmStatusToggle}
              className={`px-4 py-1.5 text-white rounded-lg text-xs font-semibold disabled:opacity-50 ${
                statusTarget?.isActive
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {statusLoading ? 'Updating...' : statusTarget?.isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete email record{' '}
            <strong className="text-slate-900">{deleteTarget?.email}</strong>?
          </p>
          <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            This will soft-delete the record and remove it from Contact Search. Historical tickets referencing this contact will remain preserved.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              No
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={confirmDelete}
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
