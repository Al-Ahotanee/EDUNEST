import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, Building2, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { EduNestLogo } from '../../components/common/EduNestLogo';

const DEMO_PRESETS = [
  { label: 'School Admin', email: 'admin@demo.school', pass: 'Admin@123' },
  { label: 'Teacher', email: 'teacher@demo.school', pass: 'Teacher@123' },
  { label: 'Accountant', email: 'bursar@demo.school', pass: 'Bursar@123' },
  { label: 'Student', email: 'student@demo.school', pass: 'Student@123' },
];

export default function LoginPage() {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const slugFromQuery = searchParams.get('school') || tenantSlug || '';
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load school branding if slug is known
  const { data: school } = useQuery({
    queryKey: ['login-school', slugFromQuery],
    queryFn: () => api.get(`/saas/school/${slugFromQuery}`).then(r => r.data.data),
    enabled: !!slugFromQuery,
    retry: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        ...form,
        ...(slugFromQuery && { tenantSlug: slugFromQuery }),
      });
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);

      if (user.isSuperAdmin) {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/app/dashboard');
      }
      toast.success(`Welcome back, ${user.firstName || 'User'}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const applyDemo = (email: string, pass: string) => {
    setForm({ email, password: pass });
    toast.success(`Pre-filled credentials for ${email}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased text-slate-800">
      {/* Top minimal bar */}
      <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <EduNestLogo size="sm" subtext="School OS" />
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/saas/register" className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
            Register Institution
          </Link>
          <Link to="/super-admin/login" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
            <Shield size={13} /> Platform Admin
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-5 bg-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Subtle background graphic */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-slate-800 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-900 rounded-full blur-3xl opacity-30" />

            <div className="relative z-10">
              {school?.logo ? (
                <div className="mb-6 bg-white/10 border border-white/10 p-2.5 rounded-xl inline-block">
                  <img src={school.logo} alt={school.name} className="w-12 h-12 object-contain rounded-lg" />
                </div>
              ) : (
                <div className="mb-6">
                  <EduNestLogo size="md" variant="light" subtext="Unified Institutional Portal" />
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                {school?.name || 'Academic Portal Sign In'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {school?.motto ? `"${school.motto}"` : 'Sign in to access student dossiers, continuous assessment broadsheets, bursary logs, and exams.'}
              </p>
            </div>

            <div className="relative z-10 mt-8 space-y-4 pt-6 border-t border-slate-800">
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                  <span>Real-time offline & online synchronisation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                  <span>Continuous Assessment (CA) auto-ranking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                  <span>Paystack & Bank bursary reconciliation</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>NDPR Compliant</span>
                <span>·</span>
                <span>ISO 27001 Standard</span>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Portal Authentication</h3>
                <p className="text-xs text-slate-500 mt-1">Please enter your institutional credentials to continue</p>
              </div>

              {/* Demo auto-fill credentials pill bar */}
              <div className="mb-6 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-2">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Quick Demo Credentials</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyDemo(p.email, p.pass)}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-slate-400 hover:bg-slate-100 transition-colors text-[11px]"
                    >
                      <span className="font-semibold text-slate-800 block truncate">{p.label}</span>
                      <span className="text-slate-400 font-mono text-[10px] block truncate">{p.email}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="name@institution.edu.ng"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <a href="mailto:support@edunest.ng?subject=Password%20Reset%20Request" className="text-xs text-slate-500 hover:text-slate-900">
                      Forgot password?
                    </a>
                  </div>
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
                      <span>Sign in to Institution</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <Link to="/parent-portal" className="hover:text-slate-900 font-medium transition-colors">
                  Parent Portal Access →
                </Link>
                <Link to="/marketer/login" className="hover:text-slate-900 font-medium transition-colors">
                  Marketer Portal →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-200/60 bg-white text-center flex items-center justify-center text-xs text-slate-500 px-4">
        <span>© {new Date().getFullYear()} EduNest Institutional OS. Engineered for Excellence.</span>
      </footer>
    </div>
  );
}
