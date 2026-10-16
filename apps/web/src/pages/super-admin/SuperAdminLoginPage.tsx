import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { EduNestLogo } from '../../components/common/EduNestLogo';

export default function SuperAdminLoginPage() {
  const [form, setForm] = useState({ email: 'admin@schoolerp.com', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      const { user, accessToken, refreshToken } = res.data;
      if (!user.isSuperAdmin) {
        toast.error('Access denied. This portal requires platform root authority.');
        return;
      }
      setAuth(user, accessToken, refreshToken);
      toast.success('Root authority verified. Welcome, Platform Admin.');
      navigate('/super-admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid administrator credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setForm({ email: 'admin@schoolerp.com', password: 'password123' });
    toast.success('SuperAdmin credentials filled');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased text-slate-800">
      {/* Top minimal header */}
      <header className="h-16 border-b border-slate-200/80 bg-white px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <EduNestLogo size="sm" subtext="Platform Governance" />
        </Link>
        <Link
          to="/login"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Institutional School Portal
        </Link>
      </header>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10">
          
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 shadow-xs">
              <Shield size={22} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Root Platform Governance</h1>
            <p className="text-xs text-slate-500 mt-1">Multi-tenant operations, tariff plans, and platform telemetry</p>
          </div>

          {/* Demo Admin Preset Pill */}
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Demo SuperAdmin</span>
              </p>
              <p className="text-[11px] text-slate-500 font-mono">admin@schoolerp.com</p>
            </div>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              Fill Credentials
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Root Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="root@edunest.ng"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Security Passkey
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
                  <Lock size={14} />
                  <span>Verify Authority & Enter Console</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Restricted to authorized EduNest root administrators. All access sessions are cryptographically logged.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-200/60 bg-white text-center flex items-center justify-center text-xs text-slate-500 px-4">
        <span>EduNest SaaS Operations Console · NDPR & ISO 27001 Certified Security</span>
      </footer>
    </div>
  );
}
