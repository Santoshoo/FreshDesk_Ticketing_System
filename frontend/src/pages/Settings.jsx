import React, { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  Bell,
  Sun,
  Moon,
  Laptop,
  Globe,
  Check,
  Shield,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  Building,
  Briefcase,
  Volume2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import authApi from '../services/authApi.js';
import { getSavedTheme, setTheme as setAppTheme } from '../utils/theme.js';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'password' | 'notifications' | 'theme' | 'language'

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Sync profile state with user
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setMobile(user.mobile || '');
    }
  }, [user]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notification state
  const notifStorageKey = user?.id ? `kims_notifications_${user.id}` : 'kims_notifications_default';
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);
  const [notifyEmailAlerts, setNotifyEmailAlerts] = useState(true);
  const [notifySoundAlerts, setNotifySoundAlerts] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Load saved notifications on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(notifStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.notifyOnCreate !== undefined) setNotifyOnCreate(parsed.notifyOnCreate);
        if (parsed.notifyOnStatusChange !== undefined) setNotifyOnStatusChange(parsed.notifyOnStatusChange);
        if (parsed.notifyOnComment !== undefined) setNotifyOnComment(parsed.notifyOnComment);
        if (parsed.notifyEmailAlerts !== undefined) setNotifyEmailAlerts(parsed.notifyEmailAlerts);
        if (parsed.notifySoundAlerts !== undefined) setNotifySoundAlerts(parsed.notifySoundAlerts);
      }
    } catch {
      // ignore
    }
  }, [notifStorageKey]);

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState(() => getSavedTheme());

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name.', 'error');
      return;
    }

    try {
      setProfileLoading(true);
      setProfileSuccess(false);

      const res = await authApi.updateProfile({
        name: name.trim(),
        mobile: mobile ? mobile.trim() : null,
      });

      if (res.success && res.data) {
        updateUser(res.data);
        setProfileSuccess(true);
        showToast('Profile updated successfully!', 'success');
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Profile update error:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      showToast('Current password is required.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      showToast('New passwords do not match!', 'error');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPasswordSuccess(true);
        showToast('Password updated successfully! Use your new password next time.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Password change error:', err);
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to update password';
      setPasswordError(msg);
      showToast(msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Notification Preferences Save
  const handleSaveNotifications = (e) => {
    if (e) e.preventDefault();
    setSavingNotifs(true);
    const prefs = {
      notifyOnCreate,
      notifyOnStatusChange,
      notifyOnComment,
      notifyEmailAlerts,
      notifySoundAlerts,
    };
    try {
      localStorage.setItem(notifStorageKey, JSON.stringify(prefs));
      setTimeout(() => {
        setSavingNotifs(false);
        showToast('Notification preferences saved successfully!', 'success');
      }, 300);
    } catch {
      setSavingNotifs(false);
      showToast('Could not save preferences to storage.', 'error');
    }
  };

  // Handle Theme Change
  const handleThemeChange = (t) => {
    setSelectedTheme(t);
    setAppTheme(t);
    showToast(`Theme set to ${t.toUpperCase()}`, 'success');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your user profile, security credentials, notification rules, and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Settings Sidebar */}
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Profile
            </p>

            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                activeSection === 'profile'
                  ? 'bg-white shadow-2xs border border-slate-200/80 ring-2 ring-indigo-500/10'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className={`w-4 h-4 ${activeSection === 'profile' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${activeSection === 'profile' ? 'text-indigo-900' : 'text-slate-800'}`}>
                  My Profile
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                View and update your profile information
              </p>
            </button>

            <button
              onClick={() => setActiveSection('password')}
              className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                activeSection === 'password'
                  ? 'bg-white shadow-2xs border border-slate-200/80 ring-2 ring-indigo-500/10'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className={`w-4 h-4 ${activeSection === 'password' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${activeSection === 'password' ? 'text-indigo-900' : 'text-slate-800'}`}>
                  Change Password
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                Update your account password
              </p>
            </button>

            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                activeSection === 'notifications'
                  ? 'bg-white shadow-2xs border border-slate-200/80 ring-2 ring-indigo-500/10'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className={`w-4 h-4 ${activeSection === 'notifications' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${activeSection === 'notifications' ? 'text-indigo-900' : 'text-slate-800'}`}>
                  Notification Preferences
                </span>
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
              className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                activeSection === 'theme'
                  ? 'bg-white shadow-2xs border border-slate-200/80 ring-2 ring-indigo-500/10'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className={`w-4 h-4 ${activeSection === 'theme' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${activeSection === 'theme' ? 'text-indigo-900' : 'text-slate-800'}`}>
                  Theme
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                Light / Dark / System
              </p>
            </button>

            <button
              onClick={() => setActiveSection('language')}
              className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                activeSection === 'language'
                  ? 'bg-white shadow-2xs border border-slate-200/80 ring-2 ring-indigo-500/10'
                  : 'hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className={`w-4 h-4 ${activeSection === 'language' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${activeSection === 'language' ? 'text-indigo-900' : 'text-slate-800'}`}>
                  Language
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                English (Default)
              </p>
            </button>
          </div>
        </div>

        {/* Right Settings Form Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
          {/* TAB 1: MY PROFILE */}
          {activeSection === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">My Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your personal information and contact details.</p>
                </div>
                {profileSuccess && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
              </div>

              {/* Avatar Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {name ? name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{name || user?.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {user?.role || 'EMPLOYEE'}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      ID: {user?.employeeId || 'KIMS001'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. John Doe"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Displayed on ticket responses and activity logs.</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mobile / Contact Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Used for urgent SMS/WhatsApp notifications.</p>
                </div>

                {/* Read-Only Hospital Master Identity Fields */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-500 font-semibold">Email Address</label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Primary ID
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed select-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Managed via Employee Email Master.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-500 font-semibold">Employee ID</label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> KIMS Master
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={user?.employeeId || 'KIMS001'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-500 cursor-not-allowed select-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Official hospital employee code.</p>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-500 font-semibold">Department</label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Building className="w-2.5 h-2.5" /> Org Unit
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={user?.departmentName || user?.department?.name || 'IT Department'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Department assignment is governed by Admin Master Data.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={profileLoading || !name.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeSection === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ensure your account uses a secure, modern password.</p>
              </div>

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password updated successfully! Your new password is now active.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must contain at least 6 characters.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-300 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFICATION PREFERENCES */}
          {activeSection === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
                <p className="text-xs text-slate-500 mt-0.5">Control how and when you receive ticket notifications and alerts.</p>
              </div>

              <div className="space-y-3 pt-1">
                {/* 1. New Ticket Creation */}
                <div
                  onClick={() => setNotifyOnCreate(!notifyOnCreate)}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">New Ticket Assignments</p>
                    <p className="text-[11px] text-slate-400">Receive alerts when a ticket is assigned to you or your group</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      notifyOnCreate ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        notifyOnCreate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Status Updates */}
                <div
                  onClick={() => setNotifyOnStatusChange(!notifyOnStatusChange)}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">Ticket Status Changes</p>
                    <p className="text-[11px] text-slate-400">Receive alerts when ticket status changes to Resolved, Closed, or Pending</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      notifyOnStatusChange ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        notifyOnStatusChange ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 3. New Comments & Notes */}
                <div
                  onClick={() => setNotifyOnComment(!notifyOnComment)}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">Replies & Internal Notes</p>
                    <p className="text-[11px] text-slate-400">Receive alerts when requesters or team members add comments</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      notifyOnComment ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        notifyOnComment ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 4. Email Alert Delivery */}
                <div
                  onClick={() => setNotifyEmailAlerts(!notifyEmailAlerts)}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Notifications
                    </p>
                    <p className="text-[11px] text-slate-400">Dispatch email notifications for urgent priority issues</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      notifyEmailAlerts ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        notifyEmailAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 5. Sound Alerts */}
                <div
                  onClick={() => setNotifySoundAlerts(!notifySoundAlerts)}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> Audio Alerts
                    </p>
                    <p className="text-[11px] text-slate-400">Play a subtle audio chime when urgent tickets arrive</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      notifySoundAlerts ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        notifySoundAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  disabled={savingNotifs}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {savingNotifs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Notification Preferences</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: THEME */}
          {activeSection === 'theme' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Theme Preferences</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose your preferred visual appearance. Your preference is automatically remembered.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {[
                  {
                    id: 'light',
                    title: 'Light',
                    desc: 'Clean & crisp for standard daytime operation',
                    icon: Sun,
                    bgPreview: 'bg-slate-100 border-slate-200',
                  },
                  {
                    id: 'dark',
                    title: 'Dark',
                    desc: 'Reduced eye strain for night shifts & low light',
                    icon: Moon,
                    bgPreview: 'bg-slate-800 border-slate-700',
                  },
                  {
                    id: 'system',
                    title: 'System',
                    desc: 'Automatically synchronizes with your device settings',
                    icon: Laptop,
                    bgPreview: 'bg-gradient-to-r from-slate-100 to-slate-800 border-slate-300',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedTheme === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleThemeChange(item.id)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 mb-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2.5">
                <span className="font-semibold text-slate-800">Current Active Mode:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase text-[10px]">
                  {selectedTheme}
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: LANGUAGE */}
          {activeSection === 'language' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Language</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official operating language for the KIMS ICT Service Desk.
                </p>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      EN
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">English</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                          Official System Language
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Standard operational language for all tickets, comments, master data, and notifications.
                      </p>
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>Single Standardized Language Policy</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  To ensure clinical accuracy and seamless technical support coordination across all KIMS Hospital departments, English is maintained as the single unified language.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
