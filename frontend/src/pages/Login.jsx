import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  FileText,
  Search,
  Users,
  CheckCircle2,
  Laptop,
  Headphones,
  AlertCircle,
  Coffee,
  Check,
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
      setError('Please enter your email ID and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f0f4fa] font-['Inter',sans-serif]">
      {/* ================= LEFT PANEL: Deep Royal Blue Showcase ================= */}
      <div className="lg:w-1/2 bg-gradient-to-b from-[#0055d4] via-[#0047b8] to-[#003896] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden shadow-2xl">
        {/* Soft radial glow in background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-400/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24"></div>

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-black text-2xl tracking-tight text-white">KIMS</span>
            <span className="font-light text-2xl text-sky-300">Helpdesk</span>
          </div>
          <p className="text-xs text-blue-200/80 tracking-wide font-medium">Raise. Track. Resolve.</p>

          {/* Hero Heading */}
          <div className="mt-8 lg:mt-12 max-w-lg">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Your Support,
              <br />
              Our Priority
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
              Get quick IT support, track your requests, and stay updated — all in one place.
            </p>
          </div>

          {/* 4 Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-7 max-w-2xl">
            {/* Raise Tickets */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mb-2.5">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-bold leading-tight text-white">Raise Tickets</h4>
              <p className="text-[10px] text-blue-100/75 mt-1 leading-tight">Report issues easily</p>
            </div>

            {/* Track Status */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mb-2.5">
                <Search className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-bold leading-tight text-white">Track Status</h4>
              <p className="text-[10px] text-blue-100/75 mt-1 leading-tight">Stay updated in real time</p>
            </div>

            {/* Collaboration */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mb-2.5">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-bold leading-tight text-white">Collaboration</h4>
              <p className="text-[10px] text-blue-100/75 mt-1 leading-tight">Work together for faster resolution</p>
            </div>

            {/* Quick Resolution */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-bold leading-tight text-white">Quick Resolution</h4>
              <p className="text-[10px] text-blue-100/75 mt-1 leading-tight">Reliable support for a better tomorrow</p>
            </div>
          </div>
        </div>

        {/* Center 3D/Vector Desk Setup Illustration */}
        <div className="my-6 hidden sm:flex items-center justify-center relative z-10">
          <div className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 flex flex-col items-center justify-center text-center relative shadow-inner">
            {/* Table Surface with Laptop and Headset */}
            <div className="relative w-72 h-44 flex items-center justify-center">
              {/* Laptop base */}
              <div className="w-56 h-36 bg-[#002f80] rounded-2xl border-2 border-sky-400/40 shadow-2xl p-2.5 flex flex-col justify-between relative transform -rotate-1">
                {/* Screen */}
                <div className="w-full h-24 bg-[#001f5c] rounded-xl border border-sky-300/30 flex items-center justify-center relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
                    <Headphones className="w-7 h-7 text-sky-200 animate-pulse" />
                  </div>
                </div>
                {/* Keyboard area */}
                <div className="w-full h-4 bg-sky-950/60 rounded-md border border-sky-500/20"></div>
              </div>

              {/* Coffee Mug */}
              <div className="absolute -right-2 top-8 w-14 h-16 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col items-center justify-center p-1 transform rotate-6">
                <span className="text-[10px] font-black text-[#0055d4]">KIMS</span>
                <div className="w-3 h-0.5 bg-blue-200 rounded mt-0.5"></div>
              </div>

              {/* Notebook & Pen */}
              <div className="absolute -left-3 bottom-0 w-16 h-12 bg-sky-200/90 rounded-lg shadow-md border border-white/40 transform -rotate-12 flex items-center justify-center">
                <div className="w-10 h-0.5 bg-sky-400/60 rounded"></div>
              </div>
            </div>

            <p className="text-[11px] font-bold text-sky-200 tracking-wider uppercase mt-2">
              Hospital ICT Helpdesk System
            </p>
          </div>
        </div>

        {/* Bottom Hospital Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/15 pt-5 gap-3 text-xs text-blue-100/80 relative z-10">
          <div>
            <p className="font-extrabold text-white text-sm">KIMS</p>
            <p className="text-[11px]">Institute of Medical Sciences</p>
          </div>
          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/15 sm:pl-4 pt-2 sm:pt-0">
            <p className="font-bold text-white">IT Department</p>
            <p className="text-[11px]">Supporting a Smarter Tomorrow</p>
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL: Sign In Card ================= */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-[#f0f4fa]">
        {/* Top Need Help link */}
        <div className="flex justify-end text-xs text-slate-500">
          <span>Need help?&nbsp;</span>
          <a
            href="mailto:ithelpdesk@kims.hospital"
            className="text-[#0055d4] font-bold hover:underline"
          >
            Contact IT Support
          </a>
        </div>

        {/* Floating White Card */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/70">
            {/* Logo */}
            <div className="text-center mb-6">
              <span className="text-3xl font-black text-[#0055d4] tracking-tight block">
                KIMS
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block -mt-1">
                Helpdesk
              </span>

              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-4 tracking-tight">
                Sign in to your account
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Access your helpdesk to raise and manage tickets.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStandardLogin} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your email ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0055d4] transition-all placeholder:text-slate-400 text-slate-800"
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
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0055d4] transition-all placeholder:text-slate-400 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#0055d4] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0055d4] hover:bg-[#0047b8] active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/25 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          © 2026 KIMS. All rights reserved.
        </div>
      </div>
    </div>
  );
}
