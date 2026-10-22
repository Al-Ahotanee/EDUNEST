import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, Building2, CheckCircle, ArrowRight, Sparkles, Server, Settings, AlertCircle, RefreshCw, X, CheckCircle2, GraduationCap, Lock, BookOpen, Award, Users, KeyRound } from 'lucide-react';
import { api, resolveApiBase } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { applyThemeColors } from '../../hooks/useTenantTheme';

const DEMO_PRESETS = [
  { label: 'School Admin', email: 'admin@demo.com', pass: 'password123' },
  { label: 'Subject Teacher', email: 'teacher.math@demo.com', pass: 'password123' },
  { label: 'Class Master', email: 'classmaster.jss1@demo.com', pass: 'password123' },
  { label: 'Super Admin', email: 'superadmin@schoolerp.com', pass: 'password123' },
];

export default function LoginPage() {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();

  const detectSubdomain = () => {
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname.toLowerCase();
    // Exclude cloud hosting domains, IP addresses, and reserved hostnames
    if (
      host.endsWith('.onrender.com') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.netlify.app') ||
      host.endsWith('.railway.app') ||
      host.endsWith('.pages.dev') ||
      host.endsWith('.herokuapp.com') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return '';
    }
    const parts = host.split('.');
    if (parts.length >= 2) {
      const firstPart = parts[0];
      if (!['www', 'api', 'app', 'localhost', '127.0.0.1', 'admin'].includes(firstPart)) {
        if (host.includes('localhost') && parts.length === 2) return firstPart;
        if (parts.length >= 3) return firstPart;
      }
    }
    return '';
  };

  const activeSlug = searchParams.get('school') || tenantSlug || detectSubdomain();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState(() => resolveApiBase());
  const [apiTesting, setApiTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Fetch school branding when slug is known
  const { data: school } = useQuery({
    queryKey: ['login-school', activeSlug],
    queryFn: () => api.get(`/saas/school/${activeSlug}`).then(r => r.data.data || r.data),
    enabled: !!activeSlug,
    retry: false,
  });

  const schoolName = school?.name || 'EduNest';
  const schoolLogo = school?.logo;
  const schoolMotto = school?.motto;
  const primaryColor = school?.primaryColor || '#1a56db';
  const secondaryColor = school?.secondaryColor || '#7e3af2';
  const hasSchoolBranding = !!school;
  const [logoError, setLogoError] = useState(false);

  React.useEffect(() => {
    if (school) {
      applyThemeColors({
        primaryColor: school.primaryColor,
        secondaryColor: school.secondaryColor,
        name: school.name,
        logo: school.logo,
      });
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        ...form,
        ...(hasSchoolBranding && school?.slug ? { tenantSlug: school.slug } : {}),
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
      if (!err.response && (err.message === 'Network Error' || err.code === 'ERR_NETWORK')) {
        toast.error(`Cannot connect to backend. Please configure your API URL.`, { duration: 6000 });
        setShowApiModal(true);
      } else {
        toast.error(err.response?.data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    setApiTesting(true);
    setTestResult('idle');
    setTestMessage('');
    const cleanUrl = apiEndpoint.trim().replace(/\/+$/, '');
    try {
      const probeUrl = cleanUrl.endsWith('/api/v1') ? `${cleanUrl}/ping` : `${cleanUrl}/api/v1/ping`;
      const res = await fetch(probeUrl, { method: 'GET' });
      if (res.ok) {
        setTestResult('success');
        setTestMessage('Connection successful! Status 200 OK.');
      } else {
        setTestResult('failed');
        setTestMessage(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e: any) {
      setTestResult('failed');
      setTestMessage(e.message || 'Connection refused or host unreachable');
    } finally {
      setApiTesting(false);
    }
  };

  const handleSaveApi = () => {
    const cleanUrl = apiEndpoint.trim().replace(/\/+$/, '');
    localStorage.setItem('EDUNEST_API_URL', cleanUrl);
    toast.success('API Endpoint saved! Reloading...');
    setTimeout(() => window.location.reload(), 500);
  };

  const handleResetApi = () => {
    localStorage.removeItem('EDUNEST_API_URL');
    toast.success('Reset to default! Reloading...');
    setTimeout(() => window.location.reload(), 500);
  };

  const applyDemo = (email: string, pass: string) => {
    setForm({ email, password: pass });
    toast.success(`Pre-filled credentials for ${email}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased text-slate-800">
      {/* Top bar — school-branded, no EduNest mentions */}
      <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between">
        <Link to={activeSlug ? `/school/${activeSlug}` : '/'} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          {schoolLogo && !logoError ? (
            <img src={schoolLogo} alt={schoolName} onError={() => setLogoError(true)} className="w-8 h-8 object-contain rounded-lg" />
          ) : hasSchoolBranding ? (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: primaryColor }}>
              {schoolName?.[0] || 'S'}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
              <GraduationCap size={18} className="text-white" />
            </div>
          )}
          <span className="font-bold text-slate-900 text-sm">{schoolName}</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/saas/register" className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
            Register Institution
          </Link>
          <Link to="/super-admin/login" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
            <Shield size={13} /> Platform Admin
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-5xl 2xl:max-w-6xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">

          {/* Left Hero Column — school-branded */}
          <div className="lg:col-span-5 p-10 sm:p-12 flex flex-col justify-between relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              {schoolLogo && !logoError ? (
                <div className="mb-6 bg-white/10 border border-white/10 p-2.5 rounded-xl inline-block">
                  <img src={schoolLogo} alt={schoolName} onError={() => setLogoError(true)} className="w-12 h-12 object-contain rounded-lg" />
                </div>
              ) : (
                <div className="mb-6 w-14 h-14 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <GraduationCap size={28} className="text-white" />
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                {schoolName}
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                {schoolMotto ? `"${schoolMotto}"` : 'Sign in to access student records, results, attendance, and more.'}
              </p>
            </div>

            <div className="relative z-10 mt-8 space-y-4 pt-6 border-t border-white/10">
              <div className="space-y-2 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-300 flex-shrink-0" />
                  <span>Academic portal & continuous assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-300 flex-shrink-0" />
                  <span>Attendance tracking & report cards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-300 flex-shrink-0" />
                  <span>Fee management & bursary</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Portal Sign In</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your credentials to continue</p>
              </div>

              {/* Demo credentials — only show when no school branding */}
              {!hasSchoolBranding && (
                <div className="mb-6 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-2">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Quick Demo Credentials</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEMO_PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => applyDemo(p.email, p.pass)}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-slate-400 hover:bg-slate-100 transition-colors text-[11px]">
                        <span className="font-semibold text-slate-800 block truncate">{p.label}</span>
                        <span className="text-slate-400 font-mono text-[10px] block truncate">{p.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Institutional Email
                  </label>
                  <input type="email" required autoFocus value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="name@institution.edu.ng"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                    <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                      <KeyRound size={11} /> Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} required value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••••••"
                      className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-mono" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-11 mt-2 rounded-xl text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: hasSchoolBranding ? primaryColor : '#0f172a' }}>
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><span>Sign In</span><ArrowRight size={14} /></>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                {activeSlug && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-blue-600">
                    <Link to={`/school/${activeSlug}`} className="hover:underline">← Back to School Website</Link>
                    <Link to={`/school/${activeSlug}/apply`} className="hover:underline">Apply for Admission →</Link>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Link to="/parent-portal" className="hover:text-slate-900 font-medium transition-colors">Parent Portal →</Link>
                  <Link to="/marketer/login" className="hover:text-slate-900 font-medium transition-colors">Marketer Portal →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — school-branded, no EduNest */}
      <footer className="h-14 border-t border-slate-200/60 bg-white text-center flex items-center justify-between text-xs text-slate-500 px-6">
        <span>© {new Date().getFullYear()} {schoolName}. All rights reserved.</span>
        <button type="button" onClick={() => setShowApiModal(true)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 font-mono text-[11px] transition-colors">
          <Server size={12} /><span>Server Settings</span>
        </button>
      </footer>

      {/* API Settings Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Server size={16} /></div>
                <div><h4 className="text-sm font-bold text-slate-900">API Server Endpoint</h4><p className="text-[11px] text-slate-500">Configure backend host</p></div>
              </div>
              <button type="button" onClick={() => setShowApiModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Target API Base URL</label>
                <input type="text" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://your-api.onrender.com/api/v1"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" />
              </div>
              {testResult !== 'idle' && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${testResult === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {testResult === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{testMessage}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button type="button" disabled={apiTesting} onClick={testApiConnection}
                  className="flex-1 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {apiTesting ? <RefreshCw size={13} className="animate-spin text-slate-500" /> : <RefreshCw size={13} className="text-slate-500" />}
                  <span>Test Connection</span>
                </button>
                <button type="button" onClick={handleSaveApi}
                  className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs">Save & Connect</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
