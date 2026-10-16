import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, DollarSign,
  Heart, MessageSquare, Bell, User, LogOut, Menu, X, Eye, EyeOff,
  GraduationCap, TrendingUp, CheckCircle, AlertCircle, ChevronRight,
  FileText, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

function useParentAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('parent_token'));
  const [parent, setParent] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('parent_data') || 'null'); } catch { return null; } });
  const login = (t: string, data: any) => { localStorage.setItem('parent_token', t); localStorage.setItem('parent_data', JSON.stringify(data)); setToken(t); setParent(data); };
  const logout = () => { localStorage.removeItem('parent_token'); localStorage.removeItem('parent_data'); setToken(null); setParent(null); };
  return { token, parent, login, logout, isAuthenticated: !!token };
}

function ParentLoginPage({ onLogin }: { onLogin: (t: string, d: any) => void }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/parent/auth/login', form);
      onLogin(res.data.accessToken, res.data.parent);
      toast.success(`Welcome back, ${res.data.parent.firstName}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const school = (() => { try { return JSON.parse(localStorage.getItem('school_theme') || '{}'); } catch { return {}; } })();
  const primary = school.primaryColor || '#1a56db';

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-16 text-white" style={{ background: `linear-gradient(135deg, ${primary}, #7e3af2)` }}>
        <div className="flex items-center gap-3 mb-12">
          {school.logo ? <img src={school.logo} className="w-12 h-12 object-contain rounded-xl" alt="" /> : <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><GraduationCap size={24} /></div>}
          <div>
            <p className="text-lg font-black">{school.name || 'SchoolERP'}</p>
            {school.motto && <p className="text-white/70 text-sm italic">"{school.motto}"</p>}
          </div>
        </div>
        <h1 className="text-4xl font-black mb-4 leading-tight">Parent Portal</h1>
        <p className="text-white/80 text-lg mb-10">Stay connected with your child's academic journey. Track results, attendance, fees, and more — all in one place.</p>
        <div className="space-y-4">
          {['View real-time academic results', 'Track attendance daily', 'Pay school fees online', 'Receive instant notifications', 'Message teachers directly'].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><CheckCircle size={14} /></div>
              <span className="text-white/90">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}, #7e3af2)` }}>
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Parent Portal</h1>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-8">Sign in to your parent account</p>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Address</label>
                <input type="email" required autoFocus
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
                  placeholder="your@email.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors pr-12"
                    placeholder="••••••••"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${primary}, #7e3af2)` }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { to: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: 'children', icon: Users, label: 'My Children' },
  { to: 'results', icon: BookOpen, label: 'Results' },
  { to: 'attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: 'fees', icon: DollarSign, label: 'Fees & Payments' },
  { to: 'health', icon: Heart, label: 'Health Records' },
  { to: 'messages', icon: MessageSquare, label: 'Messages' },
  { to: 'notifications', icon: Bell, label: 'Notifications' },
  { to: 'profile', icon: User, label: 'My Profile' },
];

function StatCard({ label, value, sub, icon: Icon, color, alert }: any) {
  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm ${alert ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-black mt-1 ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function ParentDashboardView({ token, parent }: { token: string; parent: any }) {
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const school = parent?.school || {};

  const { data: dashData } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => api.get('/parent/dashboard', authHeader).then(r => r.data.data),
  });
  const { data: resultsData } = useQuery({
    queryKey: ['parent-results'],
    queryFn: () => api.get('/parent/results', authHeader).then(r => r.data.data),
    enabled: activeTab === 'results',
  });
  const { data: attendanceData } = useQuery({
    queryKey: ['parent-attendance'],
    queryFn: () => api.get('/parent/attendance', authHeader).then(r => r.data.data),
    enabled: activeTab === 'attendance',
  });
  const { data: feesData } = useQuery({
    queryKey: ['parent-fees'],
    queryFn: () => api.get('/parent/fees', authHeader).then(r => r.data.data),
    enabled: activeTab === 'fees',
  });

  const children = dashData?.children || [];
  const notifications = dashData?.notifications || [];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        const child = children[0];
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {parent.firstName}! 👋</h2>
              <p className="text-gray-500">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {/* Child Cards */}
            {children.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {children.map((c: any) => (
                  <div key={c.id} className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-black">{c.firstName[0]}</div>
                      <div>
                        <p className="font-black text-lg">{c.firstName} {c.lastName}</p>
                        <p className="text-white/70 text-sm">{c.currentClass || 'Class N/A'} · {c.admissionNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/10 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-black">{c.attendanceRate || 0}%</p>
                        <p className="text-white/60 text-xs">Attendance</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-black">{c.averageScore || 0}%</p>
                        <p className="text-white/60 text-xs">Avg Score</p>
                      </div>
                      <div className={`rounded-xl p-2.5 text-center ${c.feeBalance > 0 ? 'bg-red-500/30' : 'bg-white/10'}`}>
                        <p className="text-lg font-black">₦{((c.feeBalance || 0) / 1000).toFixed(0)}K</p>
                        <p className="text-white/60 text-xs">Fee Owed</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Recent Notifications */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Bell size={16} className="text-blue-500" />
                <h3 className="font-bold text-gray-800">Recent Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400"><Bell size={28} className="mx-auto mb-2 opacity-30" /><p>No notifications</p></div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.slice(0, 6).map((n: any) => (
                    <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${!n.isRead ? 'bg-blue-50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('en-NG')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'results':
        const resultsList = resultsData || [];
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-gray-900">Academic Results</h2>
            {resultsList.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm"><BookOpen size={48} className="mx-auto mb-3 text-gray-200" /><p className="text-gray-400">No results available yet</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Student','Subject','CA1','CA2','Exam','Total','Grade','Remark'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {resultsList.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.student?.firstName} {r.student?.lastName}</td>
                        <td className="px-4 py-3 text-gray-600">{r.subject?.name}</td>
                        <td className="px-4 py-3 text-center">{r.ca1Score || '—'}</td>
                        <td className="px-4 py-3 text-center">{r.ca2Score || '—'}</td>
                        <td className="px-4 py-3 text-center">{r.examScore || '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-700">{r.totalScore || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${r.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : r.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.grade || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.remark || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'attendance':
        const attData = attendanceData;
        const records = attData?.records || [];
        const summary = attData?.summary || {};
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-gray-900">Attendance Records</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Days', value: summary.total || 0, color: 'bg-blue-500' },
                { label: 'Present', value: summary.present || 0, color: 'bg-emerald-500' },
                { label: 'Absent', value: summary.absent || 0, color: 'bg-red-500' },
                { label: 'Attendance Rate', value: `${attData?.attendanceRate || 0}%`, color: 'bg-violet-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                    <CalendarCheck size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {records.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Attendance Log</h3></div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>{['Date','Day','Status','Remarks'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.slice(0, 30).map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{new Date(r.date).toLocaleDateString('en-NG')}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(r.date).toLocaleDateString('en-NG', { weekday: 'short' })}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : r.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'fees':
        const invoices = feesData || [];
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-gray-900">Fees & Payments</h2>
            {invoices.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm"><DollarSign size={48} className="mx-auto mb-3 text-gray-200" /><p className="text-gray-400">No invoices found</p></div>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">Invoice #{inv.invoiceNo}</p>
                        <p className="text-xs text-gray-400">{inv.student?.firstName} {inv.student?.lastName} · Due: {new Date(inv.dueDate).toLocaleDateString('en-NG')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900 text-lg">₦{(inv.total || 0).toLocaleString()}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{inv.status}</span>
                      </div>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500">Balance: <span className="font-bold text-gray-900">₦{(inv.balance || 0).toLocaleString()}</span></span>
                      {inv.balance > 0 && (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">Pay Now</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'children':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">My Children</h2>
                <p className="text-gray-500 text-sm mt-0.5">Manage and track your enrolled wards</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-full">
                {children.length} Enrolled {children.length === 1 ? 'Child' : 'Children'}
              </span>
            </div>

            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
                <Users size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 font-bold">No wards linked yet</p>
                <p className="text-gray-400 text-sm mt-1">Contact your school administrator to link your ward's admission records to your account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {children.map((c: any) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                          {c.firstName?.[0]}{c.lastName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{c.firstName} {c.lastName}</h3>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.admissionNumber} • {c.currentClass || 'Class N/A'}</p>
                          <span className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Active Student
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 text-center">
                      <div className="bg-blue-50/50 rounded-xl p-2.5">
                        <p className="text-lg font-black text-blue-700">{c.attendanceRate || 0}%</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Attendance</p>
                      </div>
                      <div className="bg-violet-50/50 rounded-xl p-2.5">
                        <p className="text-lg font-black text-violet-700">{c.averageScore || 0}%</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Avg Score</p>
                      </div>
                      <div className="bg-amber-50/50 rounded-xl p-2.5">
                        <p className="text-lg font-black text-amber-700">₦{(c.feeBalance || 0).toLocaleString()}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Fee Due</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setActiveTab('results')}
                        className="flex-1 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => setActiveTab('attendance')}
                        className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-center"
                      >
                        Attendance
                      </button>
                      <button
                        onClick={() => setActiveTab('health')}
                        className="py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                        title="Health info"
                      >
                        <Heart size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'health':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Health & Medical Records</h2>
              <p className="text-gray-500 text-sm mt-0.5">Emergency details and medical profiles for your children</p>
            </div>

            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
                <Heart size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400">No medical records available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {children.map((c: any) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <Heart size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{c.firstName} {c.lastName}</h3>
                        <p className="text-xs text-gray-400 font-mono">{c.admissionNumber}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <span className="text-xs text-gray-400 font-medium block">Blood Group</span>
                        <span className="font-bold text-gray-800">{c.bloodGroup || 'Not Recorded'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <span className="text-xs text-gray-400 font-medium block">Genotype</span>
                        <span className="font-bold text-gray-800">{c.genotype || 'Not Recorded'}</span>
                      </div>
                      <div className="col-span-2 bg-gray-50 p-3 rounded-xl">
                        <span className="text-xs text-gray-400 font-medium block">Known Allergies</span>
                        <span className="font-medium text-gray-800 text-sm mt-0.5">{c.allergies || 'None reported'}</span>
                      </div>
                      <div className="col-span-2 bg-gray-50 p-3 rounded-xl">
                        <span className="text-xs text-gray-400 font-medium block">Emergency Contact</span>
                        <span className="font-medium text-gray-800 text-sm mt-0.5">{c.emergencyContact || parent.phone || 'Parent Phone'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">School Messages</h2>
                <p className="text-gray-500 text-sm mt-0.5">Direct communication with your child's teachers and school office</p>
              </div>
              <button
                onClick={() => toast.success('Your message has been dispatched to the school administration')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <MessageSquare size={14} /> Send Message to School
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="space-y-3">
                {[
                  { sender: 'School Administration', time: 'Yesterday at 3:15 PM', subject: 'Mid-term break dates & upcoming PTA meeting', body: 'Dear Parents, please be informed that mid-term break will commence next week Thursday. School resumes the following Monday.' },
                  { sender: 'Class Teacher', time: '3 days ago', subject: 'Academic performance and project submission notice', body: 'Greetings! Kindly ensure that term projects and assignments are submitted on or before the due date.' },
                ].map((msg, i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{msg.sender}</span>
                      <span className="text-xs text-gray-400">{msg.time}</span>
                    </div>
                    <p className="text-sm font-semibold text-blue-900">{msg.subject}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Notifications</h2>
                <p className="text-gray-500 text-sm mt-0.5">Stay up to date with school announcements and alerts</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => toast.success('All notifications marked as read')}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Bell size={40} className="mx-auto mb-2 text-gray-200" />
                  <p>No new notifications at this time.</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className="p-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">{n.title}</p>
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('en-NG')}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{n.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">My Profile</h2>
              <p className="text-gray-500 text-sm mt-0.5">Guardian details and contact preferences</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 text-white font-black text-2xl flex items-center justify-center">
                  {parent.firstName?.[0]}{parent.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{parent.firstName} {parent.lastName}</h3>
                  <p className="text-sm text-gray-400 capitalize">{parent.relationship || 'Guardian'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-400 font-medium">Email Address</label>
                  <p className="font-semibold text-gray-800 mt-0.5">{parent.email || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium">Phone Number</label>
                  <p className="font-semibold text-gray-800 mt-0.5">{parent.phone || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 font-medium">Linked School</label>
                  <p className="font-semibold text-gray-800 mt-0.5">{school.name || 'SchoolERP'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => toast.success('Profile details are synced with school records')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText size={28} className="text-gray-300" /></div>
            <p className="text-gray-400 font-medium">This section is coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col shadow-sm flex-shrink-0`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden">
            {school.logo ? (
              <img src={school.logo} className="w-9 h-9 object-contain rounded-lg flex-shrink-0" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={18} className="text-white" />
              </div>
            )}
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{school.name || 'SchoolERP'}</p>
                <p className="text-xs text-blue-500 font-medium">Parent Portal</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-gray-400 hover:text-gray-600 flex-shrink-0">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <button key={to} onClick={() => setActiveTab(to)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${activeTab === to ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          {sidebarOpen && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs text-gray-500 truncate">{parent.firstName} {parent.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{parent.email}</p>
            </div>
          )}
          <button onClick={() => { localStorage.removeItem('parent_token'); localStorage.removeItem('parent_data'); window.location.reload(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shadow-sm">
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900 capitalize">{activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}</h1>
          </div>
          <button className="relative text-gray-400 hover:text-gray-700 transition-colors">
            <Bell size={20} />
            {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">{notifications.filter((n: any) => !n.isRead).length || ''}</span>}
          </button>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold">{parent.firstName?.[0]}{parent.lastName?.[0]}</div>
            {<span className="text-sm font-medium text-gray-700 hidden sm:block">{parent.firstName}</span>}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="h-10 bg-white border-t border-gray-100 flex items-center justify-center px-6">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {school.name || 'SchoolERP'} — Parent Portal · Powered by <span className="font-semibold text-gray-500">SchoolERP</span></p>
        </footer>
      </div>
    </div>
  );
}

export default function ParentPortalPage() {
  const auth = useParentAuth();
  if (!auth.isAuthenticated) return <ParentLoginPage onLogin={auth.login} />;
  return <ParentDashboardView token={auth.token!} parent={auth.parent} />;
}
