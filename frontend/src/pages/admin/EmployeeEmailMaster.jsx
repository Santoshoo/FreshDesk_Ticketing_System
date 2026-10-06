import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Upload,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import employeeEmailApi from '../../services/employeeEmailApi.js';
import departmentApi from '../../services/departmentApi.js';
import { Card, Modal, EmptyState } from '../../components/ui/index.jsx';
import BulkEmailUploadModal from '../../components/modals/BulkEmailUploadModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';

// Searchable Department Combobox for Modal Form
function SearchableDepartmentSelect({ value, onChange, departments = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selectedDepartment = departments.find((d) => String(d.id) === String(value));

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase().trim();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchQuery('');
        }}
        className={`w-full px-3 py-2 text-xs border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer bg-white ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2
            className={`w-3.5 h-3.5 shrink-0 ${selectedDepartment ? 'text-blue-600' : 'text-slate-400'}`}
          />
          {selectedDepartment ? (
            <span className="font-semibold text-slate-800 truncate">
              {selectedDepartment.name}
            </span>
          ) : (
            <span className="text-slate-400 italic">-- No Department Assigned --</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedDepartment && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear department"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search department (e.g. IT, Accounts, Cardio)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>{filteredDepartments.length} departments available</span>
              {searchQuery && <span>Filtered by &ldquo;{searchQuery}&rdquo;</span>}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                !value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="italic text-slate-500">-- No Department Assigned --</span>
              {!value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            </button>

            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((dept) => {
                const isSelected = String(dept.id) === String(value);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      onChange(dept.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <span className="truncate pr-2">{dept.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No departments found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Searchable Department Filter for Table Header
function SearchableDepartmentFilter({ value, onChange, departments = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selectedDepartment = departments.find((d) => String(d.id) === String(value));

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase().trim();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  let label = 'All Departments';
  if (value === 'unassigned') {
    label = '⚠️ Without Dept (Unassigned)';
  } else if (selectedDepartment) {
    label = selectedDepartment.name;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchQuery('');
        }}
        className={`text-xs bg-slate-50 border rounded-xl px-3 py-1.5 flex items-center gap-2 font-medium transition-colors cursor-pointer max-w-[220px] truncate ${
          isOpen
            ? 'border-blue-500 bg-white ring-2 ring-blue-500/20'
            : 'border-slate-200 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{label}</span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors ml-auto cursor-pointer"
            title="Clear filter"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search department filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                !value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              <span>All Departments</span>
              {!value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => {
                onChange('unassigned');
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                value === 'unassigned'
                  ? 'bg-amber-50 text-amber-800 font-bold'
                  : 'text-amber-700 hover:bg-amber-50 font-medium'
              }`}
            >
              <span>⚠️ Without Dept (Unassigned)</span>
              {value === 'unassigned' && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            </button>

            {filteredDepartments.map((dept) => {
              const isSelected = String(dept.id) === String(value);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    onChange(dept.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100/80 font-medium'
                  }`}
                >
                  <span className="truncate pr-2">{dept.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
    name: '',
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

  // Bulk Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Fetch all active departments on mount (sorted alphabetically)
  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await departmentApi.list({ limit: 1000, status: 'ACTIVE' });
        if (res.success && res.data) {
          const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name));
          setDepartments(sorted);
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
      name: '',
      email: '',
      departmentId: '',
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emailItem) => {
    setEditingEmail(emailItem);
    setFormData({
      name: emailItem.name || '',
      email: emailItem.email,
      departmentId: emailItem.departmentId ? String(emailItem.departmentId) : '',
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

      const cleanDeptId = formData.departmentId ? parseInt(formData.departmentId, 10) : null;
      const selectedDeptObj = cleanDeptId ? departments.find((d) => d.id === cleanDeptId) : null;

      if (editingEmail) {
        await employeeEmailApi.update(editingEmail.id, {
          name: formData.name.trim() || null,
          email: formData.email.trim(),
          departmentId: cleanDeptId,
          isActive: formData.isActive,
        });

        // Optimistically update the UI row immediately
        setEmails((prev) =>
          prev.map((item) =>
            item.id === editingEmail.id
              ? {
                  ...item,
                  name: formData.name.trim() || null,
                  email: formData.email.trim(),
                  departmentId: cleanDeptId,
                  department: selectedDeptObj
                    ? { id: selectedDeptObj.id, name: selectedDeptObj.name }
                    : null,
                  isActive: formData.isActive,
                }
              : item
          )
        );

        showToast(
          cleanDeptId
            ? `Assigned to ${selectedDeptObj?.name} and updated successfully!`
            : 'Employee email updated successfully!',
          'success'
        );
      } else {
        await employeeEmailApi.create({
          name: formData.name.trim() || null,
          email: formData.email.trim(),
          departmentId: cleanDeptId,
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

  const getInitials = (name) => {
    if (!name) return 'E';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const avatarColorMap = [
    'bg-cyan-100 text-cyan-800',
    'bg-purple-100 text-purple-800',
    'bg-blue-100 text-blue-800',
    'bg-rose-100 text-rose-800',
    'bg-amber-100 text-amber-800',
    'bg-emerald-100 text-emerald-800',
  ];

  const getAvatarColor = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return avatarColorMap[Math.abs(hash) % avatarColorMap.length];
  };

  const deptColorMap = [
    'bg-[#fee2e2] text-[#ef4444]',
    'bg-[#fef3c7] text-[#d97706]',
    'bg-[#cffafe] text-[#0891b2]',
    'bg-[#dcfce7] text-[#15803d]',
    'bg-[#f3e8ff] text-[#7e22ce]',
    'bg-[#e0f2fe] text-[#0284c7]',
  ];

  const getDepartmentColor = (name = '') => {
    if (!name) return 'bg-slate-100 text-slate-600';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return deptColorMap[Math.abs(hash) % deptColorMap.length];
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header matching User Master styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Employee Email Master</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage official hospital staff emails for unified ticket contact search and creation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEmails(pagination.page)}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
            title="Bulk upload employee emails via Excel (.xlsx) or CSV"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Upload</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Employee Email</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, email or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Searchable Department Filter */}
          <SearchableDepartmentFilter
            value={selectedDept}
            onChange={(deptId) => setSelectedDept(deptId)}
            departments={departments}
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table matching User Master styling */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400 font-medium">Loading employee emails...</p>
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
                className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Add First Email
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/70 text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">#</th>
                    <th className="px-5 py-3.5">Employee Name</th>
                    <th className="px-5 py-3.5">Email Address</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emails.map((item, idx) => {
                    const rowNumber = (pagination.page - 1) * pagination.pageSize + idx + 1;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">{rowNumber}</td>
                        {/* Employee Name with Avatar Initials */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${getAvatarColor(
                                item.name || item.email
                              )}`}
                            >
                              {getInitials(item.name || item.email)}
                            </div>
                            <span className="font-bold text-slate-800">
                              {item.name || <span className="text-slate-400 font-normal italic">Not specified</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">{item.email}</td>
                        {/* Department Soft Pill Badge or Quick Assign Button */}
                        <td className="px-5 py-3.5">
                          {item.department ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Click to edit/reassign department"
                              className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold cursor-pointer hover:opacity-85 transition-opacity ${getDepartmentColor(
                                item.department.name
                              )}`}
                            >
                              {item.department.name}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs transition-all cursor-pointer active:scale-95 group"
                              title="No department assigned. Click to assign a department."
                            >
                              <Building2 className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform" />
                              <span>+ Assign Dept</span>
                            </button>
                          )}
                        </td>
                        {/* Status Soft Pill Badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold ${
                              item.isActive
                                ? 'bg-[#dcfce7] text-[#15803d]'
                                : 'bg-[#f1f5f9] text-[#64748b]'
                            }`}
                          >
                            {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate / Deactivate Button */}
                            <button
                              onClick={() => setStatusTarget(item)}
                              title={item.isActive ? 'Deactivate Email' : 'Activate Email'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteTarget(item)}
                              title="Delete Record"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
              Employee Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Ramesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. employee@kims.hospital"
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
            <SearchableDepartmentSelect
              value={formData.departmentId}
              onChange={(deptId) => setFormData({ ...formData, departmentId: deptId })}
              departments={departments}
            />
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
              className={`px-4 py-1.5 text-white rounded-lg text-xs font-semibold disabled:opacity-50 ${statusTarget?.isActive
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

      {/* Bulk Email Upload Modal */}
      <BulkEmailUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => fetchEmails(1)}
      />
    </div>
  );
}
