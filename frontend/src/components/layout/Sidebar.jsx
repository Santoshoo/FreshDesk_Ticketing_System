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
    `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
      isActive
        ? 'bg-indigo-600/20 text-white'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
    }`;

  const adminNavClass = ({ isActive }) =>
    `relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
    }`;

  const NavItem = ({ to, end, icon: Icon, label, onClick }) => (
    <NavLink to={to} end={end} className={navClass} onClick={onClick}>
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
              style={{ background: '#818cf8' }}
            />
          )}
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(175deg, #0f172a 0%, #1a1560 55%, #0f172a 100%)',
          borderRight: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        {/* Brand Header */}
        <div
          className="h-16 flex items-center gap-3 px-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-white text-base leading-none"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 0 16px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            +
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-sm tracking-tight truncate leading-tight flex items-center gap-1.5">
              <span>KIMS</span>
              <span style={{ color: '#818cf8' }}>ICT</span>
            </h1>
            <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: '#94a3b8' }}>
              Service Desk
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
          <NavItem to="/tickets/my" icon={Inbox} label="My Tickets" onClick={onClose} />
          <NavItem to="/tickets" end icon={Ticket} label="All Tickets" onClick={onClose} />
          <NavItem to="/tickets/create" icon={PlusCircle} label="Create Ticket" onClick={onClose} />
          <NavItem to="/reports" icon={BarChart3} label="Reports" onClick={onClose} />
          <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} />

          {(user?.role === 'AGENT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <NavItem to="/tickets/logs" icon={History} label="Ticket Logs" onClick={onClose} />
          )}

          {/* Master Data Section */}
          {isAdmin && (
            <div className="pt-4 mt-3" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-slate-200"
                style={{ color: '#6366f1' }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Master Data</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
                  >
                    ADMIN
                  </span>
                </div>
                {adminMenuOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                }
              </button>

              {adminMenuOpen && (
                <div className="space-y-0.5 pl-1 mt-1">
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

        {/* User Footer */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
          <div
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
            style={{
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 0 10px rgba(99,102,241,0.4)',
                }}
              >
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.name || 'Staff User'}
                </p>
                <p className="text-[10px] truncate font-medium" style={{ color: '#818cf8' }}>
                  {user?.role || 'EMPLOYEE'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-all shrink-0 text-slate-500 hover:text-rose-400"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
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