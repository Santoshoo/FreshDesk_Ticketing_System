import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import authApi from '../../services/authApi.js';

export default function ResetPasswordModal({ isOpen, onClose, initialIdentifier = '', onResetSuccess }) {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Verify & Reset
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Sync initial identifier when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentifier(initialIdentifier || '');
      setMaskedEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
      setCountdown(0);
    }
  }, [isOpen, initialIdentifier]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // Step 1: Request 6-digit verification code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your registered Email or Employee ID.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await authApi.forgotPassword(identifier.trim());
      if (res.success) {
        setMaskedEmail(res.data?.maskedEmail || 'your registered email');
        setStep(2);
        setCountdown(60); // 60 seconds cooldown for resend
      }
    } catch (err) {
      let message = 'Failed to send verification code. Please check your Email / Employee ID.';
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (typeof err.response?.data === 'string' && (err.response.data.includes('ECONNREFUSED') || err.response.data.includes('proxy error'))) {
        message = 'Server is currently restarting. Please try again in a few seconds.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend code handler
  const handleResendCode = async () => {
    if (countdown > 0 || resending) return;
    try {
      setResending(true);
      setError('');
      const res = await authApi.forgotPassword(identifier.trim());
      if (res.success) {
        setCountdown(60);
      }
    } catch (err) {
      let message = 'Failed to resend verification code. Please try again.';
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP and Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('Verification code must be exactly 6 digits.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await authApi.resetPassword({
        identifier: identifier.trim(),
        otp: cleanOtp,
        newPassword,
      });

      if (res.success) {
        setSuccessMsg('Password has been reset successfully! Redirecting to login...');
        if (onResetSuccess) {
          onResetSuccess(res.data?.email || identifier.trim());
        }
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err) {
      let message = 'Failed to reset password. Please verify the code and try again.';
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-overlay-in">
      <div
        className="w-full max-w-[420px] rounded-[32px] p-6 sm:p-7 relative overflow-hidden animate-modal-in transition-all"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.8) 100%)',
          backdropFilter: 'blur(30px) saturate(190%)',
          WebkitBackdropFilter: 'blur(30px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 25px 60px -12px rgba(99, 102, 241, 0.25), 0 12px 28px -6px rgba(0, 0, 0, 0.1), inset 0 2px 2px #fff',
        }}
      >
        {/* Top Specular Sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-[32px]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-colors cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <KeyRound className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              {step === 1 ? 'Reset Password' : 'Verify & Set Password'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 1
                ? 'Enter your account details to receive an OTP'
                : `Enter the code sent to ${maskedEmail}`}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150 relative z-10">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Account Identifier Input */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Email or Employee ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 211210 or user@kims.ac.in"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl transition-all placeholder:text-slate-400 text-slate-800 bg-white/90 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/80 shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                A 6-digit verification code will be sent to the email registered with this ID.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              }}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP Code & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-3.5 relative z-10">
            {/* OTP Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  6-Digit Verification Code <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || resending || loading}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resending
                    ? 'Sending...'
                    : countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Resend Code'}
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 text-center text-lg font-mono font-bold tracking-[6px] rounded-2xl transition-all placeholder:text-slate-300 text-indigo-900 bg-white/90 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/80 shadow-2xs"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl transition-all placeholder:text-slate-400 text-slate-800 bg-white/90 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/80 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl transition-all placeholder:text-slate-400 text-slate-800 bg-white/90 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/80 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                disabled={loading}
                className="py-2.5 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
