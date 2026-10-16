import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { EduNestLogo } from '../../components/common/EduNestLogo';

export default function MarketerLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/marketer/auth/login', form);
      localStorage.setItem('marketer_token', res.data.accessToken);
      localStorage.setItem('marketer_data', JSON.stringify(res.data.marketer));
      toast.success(`Welcome, ${res.data.marketer.firstName}!`);
      navigate('/marketer/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid partner credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased text-slate-800">
      {/* Header */}
      <header className="h-16 border-b border-slate-200/80 bg-white px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <EduNestLogo size="sm" subtext="Affiliate Network" />
        </Link>
        <Link
          to="/login"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Main Institutional Portal
        </Link>
      </header>

      {/* Main Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 shadow-xs">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Affiliate Partner Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Track referrals, commissions, and registered institutions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Partner Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="partner@example.com"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••••••"
                  className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Partner Portal</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Interested in becoming an EduNest Regional Partner?{' '}
              <a href="mailto:partners@edunest.ng" className="text-blue-600 font-semibold hover:underline">
                Apply here
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-200/60 bg-white text-center flex items-center justify-center text-xs text-slate-500 px-4">
        <span>© {new Date().getFullYear()} EduNest Affiliate Ecosystem</span>
      </footer>
    </div>
  );
}
