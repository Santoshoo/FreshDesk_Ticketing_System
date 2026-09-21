import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Inbox,
  PlusCircle,
  BarChart3,
  Settings,
  Users,
  Building2,
  FolderKanban,
  UserCheck,
  Tag,
  Mail,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-[#0284c7] text-white shadow-md shadow-sky-500/25'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    }`;

  const adminNavClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'bg-sky-500/20 text-sky-400 font-semibold'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0b1528] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-[#15243d] lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[#15243d]">
          <div className="w-8 h-8 rounded-full bg-[#0284c7] text-white flex items-center justify-center font-extrabold shadow-md shadow-sky-500/30 shrink-0">
            <span className="text-base leading-none">+</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm tracking-tight truncate">
              KIMS Helpdesk
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              ICT Service Desk
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          <NavLink to="/dashboard" className={navClass} onClick={onClose}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/tickets/my" className={navClass} onClick={onClose}>
            <Inbox className="w-4 h-4 shrink-0" />
            <span>My Tickets</span>
          </NavLink>

          <NavLink to="/tickets" end className={navClass} onClick={onClose}>
            <Ticket className="w-4 h-4 shrink-0" />
            <span>All Tickets</span>
          </NavLink>

          <NavLink to="/tickets/create" className={navClass} onClick={onClose}>
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Create Ticket</span>
          </NavLink>

          <NavLink to="/reports" className={navClass} onClick={onClose}>
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Reports</span>
          </NavLink>

          <NavLink to="/settings" className={navClass} onClick={onClose}>
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </NavLink>

          {/* Ticket Logs for Agents & Admins */}
          {(user?.role === 'AGENT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <NavLink to="/tickets/logs" className={navClass} onClick={onClose}>
              <History className="w-4 h-4 shrink-0" />
              <span>Ticket Logs</span>
            </NavLink>
          )}

          {/* Master Data Collapsible Section for Admins */}
          {isAdmin && (
            <div className="pt-4 border-t border-[#15243d] mt-4">
              <button
                type="button"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Master Data</span>
                </div>
                {adminMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {adminMenuOpen && (
                <div className="space-y-1 pl-1 mt-1">
                  <NavLink to="/admin/employee-emails" className={adminNavClass} onClick={onClose}>
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Employee Emails</span>
                  </NavLink>

                  <NavLink to="/admin/users" className={adminNavClass} onClick={onClose}>
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>User Master</span>
                  </NavLink>

                  <NavLink to="/admin/departments" className={adminNavClass} onClick={onClose}>
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Departments</span>
                  </NavLink>

                  <NavLink to="/admin/groups" className={adminNavClass} onClick={onClose}>
                    <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                    <span>Support Groups</span>
                  </NavLink>

                  <NavLink to="/admin/agents" className={adminNavClass} onClick={onClose}>
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Agent Groups</span>
                  </NavLink>

                  <NavLink to="/admin/ticket-types" className={adminNavClass} onClick={onClose}>
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>Ticket Types</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-[#15243d] bg-[#08101f]">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sky-600/30 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.name || 'Staff User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.role || 'EMPLOYEE'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
