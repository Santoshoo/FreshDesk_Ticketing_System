import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Header({ onToggleSidebar }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const initial = user?.name ? user.name[0].toUpperCase() : 'S';

  return (
    <header className="h-16 bg-white sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6"
      style={{
        borderBottom: '1px solid #e8eaf0',
        boxShadow: '0 1px 8px rgba(79,70,229,0.04)',
      }}
    >
      {/* Left: Hamburger + Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search tickets by ID, subject, requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-20 py-2 text-xs border rounded-full transition-all outline-none"
            style={{
              background: '#f8faff',
              borderColor: '#e2e8f0',
              color: '#1e293b',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
              e.currentTarget.style.background = '#fff';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = '#f8faff';
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">Ctrl</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">K</kbd>
          </div>
        </form>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2.5">
        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => navigate('/tickets/logs')}
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          title="Ticket Logs"
        >
          <Bell className="w-5 h-5" />
          <span
            className="absolute top-1 right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center badge-pulse"
            style={{ background: '#f43f5e', border: '2px solid white' }}
          >
            !
          </span>
        </button>

        {/* User Pill */}
        <div
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 pl-2 pr-3.5 py-1 rounded-full cursor-pointer transition-all"
          style={{
            border: '1px solid #e8eaf0',
            background: '#fff',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e8eaf0'; }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 0 8px rgba(99,102,241,0.35)',
            }}
          >
            {initial}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {user?.name || 'Staff User'}
            </p>
            <p className="text-[10px] font-medium" style={{ color: '#6366f1' }}>
              {user?.departmentName || user?.department?.name || 'IT Department'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

