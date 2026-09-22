import React, { useState, useEffect } from 'react';
import { Plus, Search, Tag, Edit2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import ticketTypeApi from '../../services/ticketTypeApi.js';
import { Card, Modal, EmptyState } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import TicketTypeExcelUploadModal from '../../components/TicketTypeExcelUploadModal.jsx';

export default function TicketTypes() {
  const { isSuperAdmin } = useAuth();
  const [types, setTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
  });

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await ticketTypeApi.list({ search, limit: 100 });
      if (res.success) {
        setTypes(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load ticket types:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, [search]);

  const openCreateModal = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', status: 'ACTIVE' });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (typeItem) => {
    setEditingType(typeItem);
    setFormData({
      name: typeItem.name,
      description: typeItem.description || '',
      status: typeItem.status,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setFormLoading(true);
      setError('');

      if (editingType) {
        await ticketTypeApi.update(editingType.id, formData);
      } else {
        await ticketTypeApi.create(formData);
      }

      setIsModalOpen(false);
      fetchTypes();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const typeColorMap = [
    'bg-[#fee2e2] text-[#ef4444]',
    'bg-[#fef3c7] text-[#d97706]',
    'bg-[#cffafe] text-[#0891b2]',
    'bg-[#dcfce7] text-[#15803d]',
    'bg-[#f3e8ff] text-[#7e22ce]',
    'bg-[#e0f2fe] text-[#0284c7]',
  ];

  const getTypeColor = (name = '') => {
    if (!name) return 'bg-slate-100 text-slate-600';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return typeColorMap[Math.abs(hash) % typeColorMap.length];
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header matching User Master */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ticket Type Master</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure ticket classification types (e.g. Incident, Service Request, Problem, Access Request).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isSuperAdmin && (
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Upload Ticket Types (Excel)</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Ticket Type</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticket types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Ticket Types Table matching User Master */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400 font-medium">Loading ticket types...</p>
          </div>
        ) : types.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No ticket types found"
            description="No ticket types have been defined in MySQL yet."
            action={
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Add First Ticket Type
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/70 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Type Name</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Associated Tickets</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Type Name with pastel badge icon */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${getTypeColor(
                            t.name
                          )}`}
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-800">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{t.description || '-'}</td>
                    {/* Associated Tickets count */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#e0f2fe] text-[#0284c7]">
                        {t._count?.tickets ?? 0} tickets
                      </span>
                    </td>
                    {/* Status Soft Pill Badge */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold ${
                          t.status === 'ACTIVE'
                            ? 'bg-[#dcfce7] text-[#15803d]'
                            : 'bg-[#f1f5f9] text-[#64748b]'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Ticket Type"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingType ? 'Edit Ticket Type' : 'Create Ticket Type'}
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
              Type Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Incident, Service Request"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
              {formLoading ? 'Saving...' : editingType ? 'Update Type' : 'Create Type'}
            </button>
          </div>
        </form>
      </Modal>

      <TicketTypeExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => fetchTypes()}
      />
    </div>
  );
}
