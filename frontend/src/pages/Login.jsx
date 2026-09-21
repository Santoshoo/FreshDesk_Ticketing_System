import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import authApi from '../services/authApi.js';
import { Modal } from '../components/ui/index.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam) {
      setError(decodeURIComponent(errParam));
    }
  }, [searchParams]);

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email/employee ID and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f0f4f9] font-['Inter',sans-serif]">
      {/* LEFT PANEL: Blue Branding Showcase */}
      <div className="lg:w-1/2 bg-gradient-to-br from-[#0d59cf] via-[#0b51c1] to-[#0842a0] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Top Branding */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-2xl tracking-tight">KIMS</span>
            <span className="font-light text-2xl text-blue-200">Helpdesk</span>
          </div>
          <p className="text-xs text-blue-200 tracking-wider">Raise. Track. Resolve.</p>

          <div className="mt-10 lg:mt-14 max-w-lg">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
              Your Support,
              <br />
              Our Priority
            </h2>
            <p className="mt-3 text-sm text-blue-100/90 leading-relaxed font-normal">
              Get quick IT support, track your requests, and stay updated — all in one place.
            </p>
          </div>

          {/* 4 Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8 max-w-xl">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-semibold leading-tight">Raise Tickets</h4>
              <p className="text-[10px] text-blue-100/80 mt-0.5 leading-tight">Report issues easily</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <Search className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-semibold leading-tight">Track Status</h4>
              <p className="text-[10px] text-blue-100/80 mt-0.5 leading-tight">Stay updated in real time</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-semibold leading-tight">Collaboration</h4>
              <p className="text-[10px] text-blue-100/80 mt-0.5 leading-tight">Work together for faster resolution</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-semibold leading-tight">Quick Resolution</h4>
              <p className="text-[10px] text-blue-100/80 mt-0.5 leading-tight">Reliable support for tomorrow</p>
            </div>
          </div>
        </div>

        {/* Center Minimal Workspace Illustration Graphic */}
        <div className="my-8 hidden sm:flex items-center justify-center">
          <div className="w-full max-w-sm bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-white/20 p-6 flex items-center gap-5 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 border border-white/30 flex items-center justify-center shadow-lg">
              <Laptop className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Headphones className="w-3.5 h-3.5 text-blue-300" />
                24/7 ICT Helpdesk Desk
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Hospital Information Systems & Support Portal
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Hospital Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/20 pt-6 gap-4 text-xs text-blue-100/80">
          <div>
            <p className="font-bold text-white">KIMS</p>
            <p className="text-[11px]">Institute of Medical Sciences</p>
          </div>
          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/20 sm:pl-4 pt-2 sm:pt-0">
            <p className="font-semibold text-white">IT Department</p>
            <p className="text-[11px]">Supporting a Smarter Tomorrow</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Sign In Card */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Top Help Link */}
        <div className="flex justify-end text-xs text-slate-500">
          <span>Need help?&nbsp;</span>
          <a
            href="mailto:ithelpdesk@kims.hospital"
            className="text-blue-600 font-medium hover:underline"
          >
            Contact IT Support
          </a>
        </div>

        {/* Center Login Box */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-2">
              <span className="text-3xl font-black text-[#0d59cf] tracking-tight">KIMS</span>
            </div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest -mt-1">
              Helpdesk
            </p>
            <h3 className="text-xl font-bold text-slate-800 mt-4">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-1">
              Access your helpdesk to raise and manage tickets.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            {/* Email or Employee ID Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email ID or Employee ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Enter your email ID or employee ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0d59cf] hover:bg-[#0b51c1] active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-lg shadow-md shadow-blue-500/25 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} KIMS. All rights reserved.
        </div>
      </div>
    </div>
  );
}
