import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No reset token found. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      toast.success('Password reset successful!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Reset failed. The link may be expired or invalid.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Password Reset</h1>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                Your password has been updated successfully. All active sessions have been revoked.
                Redirecting you to sign in…
              </p>
              <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                Go to Sign In →
              </Link>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <Lock size={26} className="text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Set a new password</h1>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Choose a strong password (minimum 8 characters) for your account.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full h-11 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <p className="text-xs text-slate-400 mt-4 text-center">
                All active sessions will be revoked after reset for security.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
