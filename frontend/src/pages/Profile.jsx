import React from 'react';
import {
  User,
  Mail,
  Building,
  Lock,
  Shield,
  Briefcase,
  IdCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user } = useAuth();

  const name = user?.name || 'Staff User';
  const email = user?.email || '—';
  const employeeId = user?.employeeId || '—';
  const role = user?.role || 'EMPLOYEE';
  const departmentName = user?.departmentName || user?.department?.name || 'IT Department';
  const initial = name ? name[0].toUpperCase() : 'U';

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          View your personal profile information and hospital credentials.
        </p>
      </div>

      {/* Main Profile Card (View-Only) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
        <div className="space-y-6">
          {/* Card Top Title */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your verified account identity and credentials across KIMS Ticketing System.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Lock className="w-3 h-3 text-slate-400" />
              View Only
            </span>
          </div>

          {/* User Avatar & Identity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white shadow-md shadow-indigo-600/15 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
            >
              {initial}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-slate-900">{name}</h4>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  <Shield className="w-3 h-3 text-indigo-500" />
                  {role}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  ID: {employeeId}
                </span>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{email}</span>
              </p>
            </div>
          </div>

          {/* View-Only Identity Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-500 font-semibold">Full Name</label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <User className="w-2.5 h-2.5" /> Identity
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={name}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Displayed on ticket responses and activity logs.</p>
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-500 font-semibold">Email Address</label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Primary ID
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Managed via Employee Email Master.</p>
            </div>

            {/* Employee ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-500 font-semibold">Employee ID</label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> KIMS Master
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={employeeId}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 font-medium cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Official hospital employee code.</p>
            </div>

            {/* Assigned Role */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-500 font-semibold">System Role</label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> Access Level
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={role}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Role privileges assigned by System Administrator.</p>
            </div>

            {/* Department */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-500 font-semibold">Department</label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Building className="w-2.5 h-2.5" /> Org Unit
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={departmentName}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Department assignment is governed by Admin Master Data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
