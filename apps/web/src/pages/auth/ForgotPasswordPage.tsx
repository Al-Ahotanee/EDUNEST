import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle, KeyRound } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      // Demo/dev only: backend returns resetUrl so we can display it inline.
      // In production this would be sent via email only.
      setResetUrl(res.data?.resetUrl || null);
      setSent(true);
      toast.success('Reset link generated. Check your email (or see below for demo).');
    } catch (err: any) {
      // Even on error, show success message to prevent email enumeration
      setSent(true);
      toast.success('If that email is registered, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8">
          {!sent ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <KeyRound size={26} className="text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reset your password</h1>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Enter your account email and we'll send you a secure link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@institution.edu.ng"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Send size={14} /> Send Reset Link</>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Check your email</h1>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                If an account exists for <strong className="text-slate-700">{email}</strong>,
                we've sent a password reset link. The link expires in 30 minutes.
              </p>

              {/* Demo/dev only: backend returns the reset URL inline since SMTP isn't configured */}
              {resetUrl && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Demo Mode — SMTP not configured
                  </p>
                  <p className="text-xs text-amber-700 mb-2">
                    In production, this link would be sent via email. For now, click below to continue:
                  </p>
                  <Link
                    to={resetUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline"
                  >
                    <KeyRound size={12} /> Open reset page →
                  </Link>
                </div>
              )}

              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
