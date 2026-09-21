import React, { useState } from 'react';
import {
  User,
  KeyRound,
  Bell,
  Sun,
  Globe,
  Check,
  Shield,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'password' | 'notifications' | 'theme' | 'language'

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification state
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      setPasswordLoading(true);
      // Simulate/call change password API
      setTimeout(() => {
        showToast('Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordLoading(false);
      }, 500);
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Settings Sidebar */}
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Profile
            </p>

            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                activeSection === 'profile'
                  ? 'bg-white shadow-2xs border border-slate-200/80'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className={`w-4 h-4 ${activeSection === 'profile' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800">My Profile</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                View and update your profile information
              </p>
            </button>

            <button
              onClick={() => setActiveSection('password')}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                activeSection === 'password'
                  ? 'bg-white shadow-2xs border border-slate-200/80'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className={`w-4 h-4 ${activeSection === 'password' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800">Change Password</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                Update your account password
              </p>
            </button>

            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                activeSection === 'notifications'
                  ? 'bg-white shadow-2xs border border-slate-200/80'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className={`w-4 h-4 ${activeSection === 'notifications' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800">Notification Preferences</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                Manage email and in-app notifications
              </p>
            </button>
          </div>

          {/* General Section */}
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              General
            </p>

            <button
              onClick={() => setActiveSection('theme')}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                activeSection === 'theme'
                  ? 'bg-white shadow-2xs border border-slate-200/80'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className={`w-4 h-4 ${activeSection === 'theme' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800">Theme</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                Light / Dark / System
              </p>
            </button>

            <button
              onClick={() => setActiveSection('language')}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                activeSection === 'language'
                  ? 'bg-white shadow-2xs border border-slate-200/80'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className={`w-4 h-4 ${activeSection === 'language' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800">Language</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                English (Default)
              </p>
            </button>
          </div>
        </div>

        {/* Right Settings Form Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">My Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage your user details and preferences.</p>
              </div>

              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {user?.name?.[0] || 'S'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{user?.name}</h4>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    {user?.role || 'EMPLOYEE'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    disabled
                    value={user?.name || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Employee ID</label>
                  <input
                    type="text"
                    disabled
                    value={user?.employeeId || 'KIMS001'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    disabled
                    value={user?.departmentName || user?.department?.name || 'IT Department'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ensure your account uses a secure password.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2 bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
                <p className="text-xs text-slate-500 mt-0.5">Control how and when you receive ticket notifications.</p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">New Ticket Creation</p>
                    <p className="text-[11px] text-slate-400">Receive alerts when a ticket is assigned to you</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnCreate}
                    onChange={(e) => setNotifyOnCreate(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Status Updates</p>
                    <p className="text-[11px] text-slate-400">Receive alerts when ticket status changes (Resolved/Closed)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnStatusChange}
                    onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">New Comments & Notes</p>
                    <p className="text-[11px] text-slate-400">Receive alerts on new replies and notes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnComment}
                    onChange={(e) => setNotifyOnComment(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Theme Preferences</h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose your preferred visual theme.</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTheme(t);
                      showToast(`Theme set to ${t}`, 'success');
                    }}
                    className={`p-4 rounded-xl border text-center text-xs font-bold capitalize transition-all ${
                      selectedTheme === t
                        ? 'border-sky-500 bg-sky-50/50 text-sky-700 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Language</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select interface language.</p>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                {[
                  { id: 'en', label: 'English (Default)' },
                  { id: 'hi', label: 'Hindi (हिंदी)' },
                  { id: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
                ].map((lang) => (
                  <label
                    key={lang.id}
                    onClick={() => {
                      setSelectedLanguage(lang.id);
                      showToast(`Language set to ${lang.label}`, 'success');
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer ${
                      selectedLanguage === lang.id
                        ? 'border-sky-500 bg-sky-50/50 text-sky-800 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{lang.label}</span>
                    {selectedLanguage === lang.id && <Check className="w-4 h-4 text-sky-600" />}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
