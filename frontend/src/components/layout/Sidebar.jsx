import React from 'react';
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
  Tags,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111c2d] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800/60 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30">
            <span className="text-lg">+</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight tracking-tight">
              KIMS Helpdesk
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">ICT SERVICE DESK</p>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 pb-2">
          <button
            onClick={() => {
              navigate('/tickets/create');
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg shadow-md shadow-blue-600/20 transition-all text-sm active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Ticket</span>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tickets
            </div>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/tickets" end className={navClass} onClick={onClose}>
                <Ticket className="w-4 h-4" />
                <span>All Tickets</span>
              </NavLink>

              <NavLink to="/tickets/my" className={navClass} onClick={onClose}>
                <Inbox className="w-4 h-4" />
                <span>My Tickets</span>
              </NavLink>

              {(user?.role === 'AGENT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <NavLink to="/tickets/logs" className={navClass} onClick={onClose}>
                  <BarChart3 className="w-4 h-4" />
                  <span>Ticket Logs / History</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Master Data Management (Admin only) */}
          {isAdmin && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Master Data
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/users" className={navClass} onClick={onClose}>
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </NavLink>

                <NavLink to="/admin/departments" className={navClass} onClick={onClose}>
                  <Building2 className="w-4 h-4" />
                  <span>Departments</span>
                </NavLink>

                <NavLink to="/admin/groups" className={navClass} onClick={onClose}>
                  <FolderKanban className="w-4 h-4" />
                  <span>Groups</span>
                </NavLink>

                <NavLink to="/admin/agents" className={navClass} onClick={onClose}>
                  <UserCheck className="w-4 h-4" />
                  <span>Agents</span>
                </NavLink>

                <NavLink to="/admin/ticket-types" className={navClass} onClick={onClose}>
                  <Tag className="w-4 h-4" />
                  <span>Ticket Types</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Analytics & System */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              General
            </div>
            <nav className="space-y-1">
              <NavLink to="/reports" className={navClass} onClick={onClose}>
                <BarChart3 className="w-4 h-4" />
                <span>Reports</span>
              </NavLink>

              <NavLink to="/settings" className={navClass} onClick={onClose}>
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* User Account Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0d1624]">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'KI'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-slate-800 text-blue-400 border border-slate-700">
                  {user?.role || 'User'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
