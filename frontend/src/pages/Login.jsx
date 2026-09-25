import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import kimsLogo from '../assets/kims-logo.png';
import ResetPasswordModal from '../components/modals/ResetPasswordModal.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [savedEmpId, setSavedEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Restore saved Email and/or Employee ID if user previously opted for "Remember Me"
  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem('kims_remember_email') || '';
      const storedEmpId = localStorage.getItem('kims_remember_empid') || '';
      const legacy = localStorage.getItem('kims_remember_identifier') || '';
      const lastChoice = localStorage.getItem('kims_last_login_choice') || '';

      if (storedEmail) setSavedEmail(storedEmail);
      if (storedEmpId) setSavedEmpId(storedEmpId);

      if (storedEmail || storedEmpId || legacy) {
        setRememberMe(true);
        if (lastChoice === 'empid' && storedEmpId) {
          setEmail(storedEmpId);
        } else if (storedEmail) {
          setEmail(storedEmail);
        } else if (storedEmpId) {
          setEmail(storedEmpId);
        } else if (legacy) {
          setEmail(legacy);
          if (legacy.includes('@')) {
            setSavedEmail(legacy);
          } else {
            setSavedEmpId(legacy);
          }
        }
      }
    } catch {
      // Ignore localStorage access errors if blocked
    }
  }, []);

  const persistRemembered = (identifier, isEnabled) => {
    try {
      if (!isEnabled) {
        localStorage.removeItem('kims_remember_email');
        localStorage.removeItem('kims_remember_empid');
        localStorage.removeItem('kims_remember_identifier');
        localStorage.removeItem('kims_last_login_choice');
        setSavedEmail('');
        setSavedEmpId('');
        return;
      }

      if (!identifier || !identifier.trim()) return;
      const clean = identifier.trim();

      if (clean.includes('@')) {
        localStorage.setItem('kims_remember_email', clean);
        localStorage.setItem('kims_last_login_choice', 'email');
        localStorage.setItem('kims_remember_identifier', clean);
        setSavedEmail(clean);
      } else {
        localStorage.setItem('kims_remember_empid', clean.toUpperCase());
        localStorage.setItem('kims_last_login_choice', 'empid');
        localStorage.setItem('kims_remember_identifier', clean.toUpperCase());
        setSavedEmpId(clean.toUpperCase());
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleToggleRemember = () => {
    const nextVal = !rememberMe;
    setRememberMe(nextVal);
    persistRemembered(email, nextVal);
  };

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email ID or employee ID and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password);

      // Persist or clear Remember Me identifier on successful authentication
      persistRemembered(email, rememberMe);

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Invalid credentials. Please check your email/ID and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (identifier, pass) => {
    setEmail(identifier);
    setPassword(pass);
    setError('');
    if (rememberMe) {
      persistRemembered(identifier, true);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden font-['Inter',sans-serif] relative"
      style={{
        background:
          'radial-gradient(ellipse at 85% 15%, #d8b4fe 0%, #ede9fe 25%, #f1f5f9 65%), radial-gradient(ellipse at 15% 85%, #a5f3fc 0%, #e0f2fe 30%, #f8fafc 70%)',
      }}
    >
      {/* Dynamic Aurora Light Orbs for Rich Glassmorphism Reflection */}
      <div className="absolute -top-24 -right-24 w-[540px] h-[540px] rounded-full bg-purple-400/35 blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[580px] h-[580px] rounded-full bg-cyan-300/35 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[420px] h-[420px] rounded-full bg-indigo-300/25 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[440px] h-[440px] rounded-full bg-pink-300/20 blur-[100px] pointer-events-none" />

      {/* Radiant Glowing Ambient Halo directly behind the card */}
      <div className="absolute w-[460px] h-[580px] bg-gradient-to-tr from-purple-400/25 via-indigo-300/20 to-cyan-300/30 rounded-[48px] blur-3xl pointer-events-none -z-0" />

      {/* ── Option 3 Exact Login Popup Card with Glassmorphism ── */}
      <div
        className="w-full max-w-[420px] sm:max-w-[440px] p-8 sm:p-9 rounded-[32px] relative z-10 overflow-hidden transition-all duration-300"
        style={{
          background:
            'linear-gradient(145deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.58) 100%)',
          backdropFilter: 'blur(30px) saturate(190%)',
          WebkitBackdropFilter: 'blur(30px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.9)',
          boxShadow:
            '0 25px 60px -12px rgba(139, 92, 246, 0.2), 0 12px 28px -6px rgba(6, 182, 212, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04), inset 0 2px 2px rgba(255, 255, 255, 1)',
        }}
      >
        {/* Top Specular Sheen across the glass curve */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-[32px]" />

        {/* Official KIMS Institution Emblem */}
        <div className="flex flex-col items-center justify-center mx-auto mb-4 relative z-10">
          <div className="w-24 h-24 p-1.5 rounded-2xl bg-white/95 border border-white/80 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.08),0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-center backdrop-blur-md transition-transform hover:scale-[1.03] duration-300">
            <img
              src={kimsLogo}
              alt="Kalinga Institute of Medical Sciences - Bhubaneswar"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Heading: Welcome to KIMS Service Desk */}
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight text-center mb-6 relative z-10">
          Welcome to KIMS Service Desk
        </h2>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 shadow-2xs relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleStandardLogin} className="space-y-4 relative z-10">
          {/* Saved Identifiers Switcher (Email / Employee ID) */}
          {rememberMe && (savedEmail || savedEmpId) && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 text-xs animate-in fade-in duration-200">
              <span className="text-slate-400 font-semibold px-1 text-[10px] uppercase tracking-wider">
                Saved:
              </span>
              {savedEmail && (
                <button
                  type="button"
                  onClick={() => setEmail(savedEmail)}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                    email.toLowerCase() === savedEmail.toLowerCase()
                      ? 'bg-white shadow-2xs text-indigo-600 font-bold border border-indigo-200/70'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Use saved Email: ${savedEmail}`}
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{savedEmail}</span>
                </button>
              )}
              {savedEmpId && (
                <button
                  type="button"
                  onClick={() => setEmail(savedEmpId)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    email.toUpperCase() === savedEmpId.toUpperCase()
                      ? 'bg-white shadow-2xs text-sky-700 font-bold border border-sky-200/70'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Use saved Employee ID: ${savedEmpId}`}
                >
                  <User className="w-3 h-3 shrink-0 text-sky-600" />
                  <span>ID: {savedEmpId}</span>
                </button>
              )}
            </div>
          )}

          {/* Email or Employee ID Field */}
          <div className="relative">
            {email.includes('@') ? (
              <Mail className="w-4 h-4 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
            ) : email.trim().length > 0 ? (
              <User className="w-4 h-4 text-sky-600 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
            ) : (
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
            )}
            <input
              type="text"
              required
              placeholder="Email or Employee ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-2xl transition-all placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/80"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1.5px solid rgba(199, 210, 254, 0.8)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            />
          </div>

          {/* Password Field with Lock Icon & Eye Toggle */}
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm rounded-2xl transition-all placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/80"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1.5px solid rgba(199, 210, 254, 0.8)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Row: Remember Me Toggle & Forgot Password Link */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <button
              type="button"
              role="switch"
              aria-checked={rememberMe}
              onClick={handleToggleRemember}
              className="flex items-center gap-2 cursor-pointer select-none group text-left"
            >
              <div
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                  rememberMe ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    rememberMe ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                Remember Me <span className="text-[10px] text-slate-400 font-normal">(Email / Employee ID)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors text-xs cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Quick-fill test role section */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-500 mb-2 text-left">
              Quick-fill test role
            </p>
            <div className="flex items-center gap-3">
              {/* Admin Pill */}
              <button
                type="button"
                onClick={() => fillCredentials('211210', 'Kims@123')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e0f2fe]/90 hover:bg-[#bae6fd] text-sky-900 text-xs font-semibold border border-sky-300/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Access Portal CTA Button with Radiant Purple-Cyan Bloom */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 px-6 rounded-2xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(90deg, #9333ea 0%, #6366f1 45%, #06b6d4 100%)',
                boxShadow:
                  '0 12px 28px -4px rgba(147, 51, 234, 0.45), 0 4px 14px rgba(6, 182, 212, 0.3), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.4)',
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Access Portal</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <ResetPasswordModal
          isOpen={showResetModal}
          initialIdentifier={email}
          onClose={() => setShowResetModal(false)}
          onResetSuccess={(resetEmail) => {
            setEmail(resetEmail);
            setPassword('');
          }}
        />
      )}
    </div>
  );
}
