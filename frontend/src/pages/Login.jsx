import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Headphones,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email ID or employee ID and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Invalid credentials. Please check your email/ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (identifier, pass) => {
    setEmail(identifier);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] font-['Inter',sans-serif]">
      {/* ================= LEFT PANEL: Deep Navy Healthcare IT Showcase ================= */}
      <div className="lg:w-1/2 text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 40%, #1a1060 70%, #0f172a 100%)' }}>
        {/* Soft Radial Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24" />

        {/* Top Header & Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-md" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}>
              K
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-white">KIMS</span>
              <span className="font-light text-2xl ml-1.5" style={{ color: '#a5b4fc' }}>Helpdesk</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 tracking-wide font-medium">ICT Service Desk System</p>

          {/* Hero Headline */}
          <div className="mt-10 lg:mt-14 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold mb-4" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
              <span>Enterprise Support Platform</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Fast, Reliable
              <br />
              Healthcare IT Support
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal max-w-md">
              Raise IT tickets, track resolution status in real time, and collaborate seamlessly with dedicated support engineers.
            </p>
          </div>

          {/* 3 Modern Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-10 max-w-xl">
            {/* 1. Instant Resolution */}
            <div className="bg-white/5 hover:bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-white">Instant Triage</h4>
              <p className="text-[11px] text-slate-300/80 mt-1 leading-snug">Rapid response for patient-critical ICT needs</p>
            </div>

            {/* 2. 24/7 Service Desk */}
            <div className="bg-white/5 hover:bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm transition-all">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-sky-400/30 flex items-center justify-center mb-3">
                <Headphones className="w-5 h-5 text-indigo-400" />
              </div>
              <h4 className="text-xs font-bold text-white">24/7 Desk</h4>
              <p className="text-[11px] text-slate-300/80 mt-1 leading-snug">Continuous support across all hospital blocks</p>
            </div>

            {/* 3. Enterprise Security */}
            <div className="bg-white/5 hover:bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm transition-all">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white">Security</h4>
              <p className="text-[11px] text-slate-300/80 mt-1 leading-snug">Encrypted access and comprehensive audit trails</p>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/10 pt-5 gap-3 text-xs text-slate-400 relative z-10 mt-8">
          <div>
            <p className="font-extrabold text-white text-sm">KIMS Hospital</p>
            <p className="text-[11px]">Institute of Medical Sciences</p>
          </div>
          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-4 pt-2 sm:pt-0">
            <p className="font-bold text-white">ICT Department</p>
            <p className="text-[11px]">Supporting a Smarter Tomorrow</p>
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL: Clean Sign In Card ================= */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-[#f8fafc]">
        {/* Top IT Support link */}
        <div className="flex justify-end text-xs text-slate-500">
          <span>Need IT assistance?&nbsp;</span>
          <a
            href="mailto:eus@kims.ac.in"
            className="text-[#0055d4] font-bold hover:underline"
          >
            Contact IT Desk
          </a>
        </div>

        {/* Centered White Sign-In Card */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/80">
            {/* Header / Logo */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-2xl font-black text-[#0055d4] tracking-tight">KIMS</span>
                <span className="text-2xl font-light text-slate-400">ICT</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Sign in to your account
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access tickets and manage requests.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleStandardLogin} className="space-y-4">
              {/* Email / Employee ID Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email ID or Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin@kims.hospital or 211210"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400 text-slate-800" style={{ '--tw-ring-color': 'rgba(99,102,241,0.2)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold hover:underline" style={{ color: '#6366f1' }}
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Quick Fill Demo Credentials Pill */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-2">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Quick-fill test account:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin@kims.hospital', 'Kims@123')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-semibold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>👑 Super Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('211210', 'Kims@123')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-semibold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>👤 Admin (211210)</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          © 2026 KIMS ICT Service Desk. All rights reserved.
        </div>
      </div>
    </div>
  );
}
