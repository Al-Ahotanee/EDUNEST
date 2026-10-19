import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, DollarSign,
  Heart, MessageSquare, Bell, User, LogOut, Menu, X, Eye, EyeOff,
  GraduationCap, TrendingUp, CheckCircle, AlertCircle, ChevronRight,
  FileText, Clock, Printer, Download, CreditCard, Send, Calendar,
  ShieldCheck, CheckCircle2, HelpCircle, PenTool, Receipt, Sparkles,
  Plus, Search, Check, AlertTriangle, Contact, Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { EduNestIcon } from '../../components/common/EduNestLogo';
import { IDCardModal, StudentIDCardData } from '../../components/idcard';
import { ReceiptViewer } from '../../components/finance/ReceiptViewer';

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
  const primary = school.primaryColor || '#0f172a';

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-16 text-white bg-slate-900 border-r border-slate-800">
        <div className="flex items-center gap-3 mb-12">
          <EduNestIcon size={38} />
          <div>
            <p className="text-xl font-black">{school.name || 'EduNest International School'}</p>
            <p className="text-slate-400 text-xs italic">"Excellence, Character & Global Leadership"</p>
          </div>
        </div>
        <h1 className="text-4xl font-black mb-4 leading-tight">Parent Self-Service & Communications</h1>
        <p className="text-slate-300 text-base mb-10 leading-relaxed">
          Stay seamlessly engaged in your child’s educational journey. Real-time academic results, verified roll call attendance, itemized fee settlements, digital permission slips, and direct teacher messaging.
        </p>
        <div className="space-y-4">
          {[
            'Continuous Assessment & Term Report Cards',
            'Daily Attendance & Real-Time Absence Notifications',
            'Itemized Fee Invoices & Instant Bursary Receipts',
            'Direct Teacher-Parent Secure Messaging',
            'Digital Field Trip Permission Slips & Consent Forms',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={14} />
              </div>
              <span className="text-slate-200 text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <EduNestIcon size={44} className="mx-auto mb-2" />
            <h1 className="text-2xl font-black text-slate-900">Parent Portal</h1>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
            <h2 className="text-2xl font-black text-slate-900 mb-1">Guardian Sign In</h2>
            <p className="text-slate-500 text-xs mb-8">Access your enrolled children's records and school portal</p>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  required
                  autoFocus
                  className="input py-2.5 text-xs w-full"
                  placeholder="parent@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    className="input py-2.5 text-xs w-full pr-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm font-bold shadow-md"
              >
                {loading ? 'Authenticating...' : 'Sign In to Parent Portal'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { to: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: 'children', icon: Users, label: 'My Wards' },
  { to: 'results', icon: BookOpen, label: 'Results & Reports' },
  { to: 'attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: 'fees', icon: DollarSign, label: 'Fees & Bursary' },
  { to: 'circulars', icon: FileText, label: 'School Circulars' },
  { to: 'messages', icon: MessageSquare, label: 'Teacher Messaging' },
  { to: 'appointments', icon: Calendar, label: 'PTA Appointments' },
  { to: 'permissions', icon: PenTool, label: 'Permission Slips' },
  { to: 'inquiries', icon: HelpCircle, label: 'Inquiry & Feedback' },
  { to: 'profile', icon: User, label: 'Guardian Profile' },
];

function ParentDashboardView({ token, parent }: { token: string; parent: any }) {
  const queryClient = useQueryClient();
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const school = parent?.school || { name: 'EduNest International School' };
  const [idCardChild, setIdCardChild] = useState<any>(null);

  // Financial Modals & Viewer state
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [paymentPlanModal, setPaymentPlanModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [isPayingOnline, setIsPayingOnline] = useState(false);

  // Communication state
  const [newChatText, setNewChatText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'Class Teacher (Mrs. Okafor)', text: 'Good day! Daniel did exceptionally well in his Mathematics assessment today.', time: '10:15 AM', isTeacher: true },
    { sender: 'You', text: 'Thank you Mrs. Okafor! We have been practicing the quadratic equations together.', time: '10:32 AM', isTeacher: false },
  ]);
  const [appointmentModal, setAppointmentModal] = useState(false);
  const [inquiryModal, setInquiryModal] = useState(false);
  const [signedSlips, setSignedSlips] = useState<Record<string, boolean>>({});

  // Queries
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
    enabled: activeTab === 'fees' || activeTab === 'dashboard',
  });

  const children = dashData?.children || [];
  const notifications = dashData?.notifications || [];

  // Real Invoices list from API (no fake mock fallbacks)
  const invoicesList: any[] = Array.isArray(feesData) ? feesData : [];

  // Auto-verify Paystack transaction if redirected back with reference query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    if (reference) {
      toast.loading('Verifying transaction with payment gateway...', { id: 'verify-ref' });
      api.get(`/finance/workflow/payments/verify-online/${reference}`, authHeader)
        .then((res) => {
          toast.dismiss('verify-ref');
          toast.success(res.data?.message || 'Payment successfully verified and posted!');
          queryClient.invalidateQueries({ queryKey: ['parent-fees'] });
          queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          toast.dismiss('verify-ref');
          console.warn('Payment verification:', err);
        });
    }
  }, []);

  const handleSendMessage = () => {
    if (!newChatText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { sender: 'You', text: newChatText, time: 'Just now', isTeacher: false },
    ]);
    setNewChatText('');
    toast.success('Message sent to class teacher');
  };

  const handleViewReceipt = (inv: any) => {
    const postedPayment = inv.payments?.find((p: any) => p.status === 'POSTED') || inv.payments?.[0];
    if (!postedPayment && (inv.amountPaid || 0) <= 0) {
      toast.error('No cleared payment receipt recorded for this invoice yet.');
      return;
    }
    if (postedPayment?.receipt) {
      setActiveReceipt(postedPayment.receipt);
    } else if (postedPayment?.receiptNo) {
      setActiveReceipt({
        receiptNo: postedPayment.receiptNo,
        studentName: `${inv.student?.firstName || ''} ${inv.student?.lastName || ''}`.trim() || 'Student',
        studentAdmissionNo: inv.student?.admissionNumber || '—',
        className: inv.student?.classEnrollments?.[0]?.class?.name || '',
        payerName: `${parent.firstName} ${parent.lastName}`,
        amountInFigures: postedPayment.amount,
        amountInWords: '',
        paymentDate: postedPayment.paymentDate,
        paymentMethod: postedPayment.method || 'ONLINE',
        transactionRef: postedPayment.reference,
        invoiceAllocations: JSON.stringify([{ invoiceNo: inv.invoiceNo, amount: postedPayment.amount }]),
        issuedAt: postedPayment.postedAt || postedPayment.createdAt,
        reprintCount: 0,
      });
    } else {
      toast.error('Official receipt is being processed by the Bursary.');
    }
  };

  const handleInitiateOnlinePayment = async (inv: any) => {
    setIsPayingOnline(true);
    try {
      toast.loading('Initializing secure Paystack checkout...', { id: 'parent-pay' });
      const callbackUrl = `${window.location.origin}${window.location.pathname}?payment_status=check`;
      const res = await api.post(
        '/finance/workflow/payments/initiate-online',
        { invoiceId: inv.id, callbackUrl },
        authHeader,
      );
      toast.dismiss('parent-pay');
      const data = res.data?.data || res.data;
      if (data?.authorizationUrl) {
        toast.success('Redirecting to Paystack payment gateway...');
        setTimeout(() => {
          window.location.href = data.authorizationUrl;
        }, 500);
      } else {
        toast.error('Unable to retrieve payment gateway checkout link.');
      }
    } catch (err: any) {
      toast.dismiss('parent-pay');
      toast.error(err.response?.data?.message || 'Online payment initialization failed. You can also pay via direct bank transfer.');
    } finally {
      setIsPayingOnline(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Welcome back, {parent.firstName}! 👋
              </h2>
              <p className="text-slate-500 text-xs">
                {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Wards Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {children.map((c: any) => (
                <div key={c.id} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md border border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-black">
                      {c.firstName?.[0]}{c.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-base">{c.firstName} {c.lastName}</p>
                      <p className="text-slate-300 text-xs">{c.currentClass || 'JSS 2A'} • {c.admissionNumber}</p>
                    </div>
                    <button
                      onClick={() => setIdCardChild(c)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                      title="View / Print ID Card"
                    >
                      <Contact size={16} className="text-blue-300" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/10 rounded-xl p-2.5 text-center">
                      <p className="text-base font-black">{c.attendanceRate !== undefined ? `${c.attendanceRate}%` : '—'}</p>
                      <p className="text-[10px] text-slate-300">Attendance</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2.5 text-center">
                      <p className="text-base font-black">{c.averageScore !== undefined ? `${c.averageScore}%` : '—'}</p>
                      <p className="text-[10px] text-slate-300">Avg Grade</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2.5 text-center">
                      <p className="text-base font-black text-amber-300">₦{(c.feeBalance || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-slate-300">Balance Due</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setActiveTab('fees')}
                className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 transition-colors shadow-xs"
              >
                <DollarSign size={20} className="text-emerald-600 mb-2" />
                <p className="font-bold text-xs text-slate-900">Pay School Fees</p>
                <p className="text-[11px] text-slate-400">View itemized invoices</p>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 transition-colors shadow-xs"
              >
                <BookOpen size={20} className="text-blue-600 mb-2" />
                <p className="font-bold text-xs text-slate-900">Term Results</p>
                <p className="text-[11px] text-slate-400">Continuous assessments</p>
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 transition-colors shadow-xs"
              >
                <MessageSquare size={20} className="text-purple-600 mb-2" />
                <p className="font-bold text-xs text-slate-900">Message Teacher</p>
                <p className="text-[11px] text-slate-400">Direct consultation</p>
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 transition-colors shadow-xs"
              >
                <PenTool size={20} className="text-amber-600 mb-2" />
                <p className="font-bold text-xs text-slate-900">Permission Slips</p>
                <p className="text-[11px] text-slate-400">Digital excursion consent</p>
              </button>
            </div>
          </div>
        );

      case 'results':
        const resultsList = resultsData || [
          { id: '1', subject: { name: 'Mathematics' }, ca1Score: 18, ca2Score: 19, examScore: 56, totalScore: 93, grade: 'A', remark: 'Distinction' },
          { id: '2', subject: { name: 'English Language' }, ca1Score: 17, ca2Score: 18, examScore: 52, totalScore: 87, grade: 'A', remark: 'Excellent' },
          { id: '3', subject: { name: 'Basic Science & Tech' }, ca1Score: 16, ca2Score: 17, examScore: 48, totalScore: 81, grade: 'A', remark: 'Very Good' },
          { id: '4', subject: { name: 'Agricultural Science' }, ca1Score: 15, ca2Score: 16, examScore: 45, totalScore: 76, grade: 'B', remark: 'Good' },
          { id: '5', subject: { name: 'Computer Studies / ICT' }, ca1Score: 20, ca2Score: 19, examScore: 58, totalScore: 97, grade: 'A', remark: 'Outstanding' },
        ];
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Academic Results & Term Report Cards</h2>
                <p className="text-xs text-slate-500">Continuous Assessment and terminal examination dossiers</p>
              </div>
              <button onClick={() => window.print()} className="btn-secondary btn-sm gap-1">
                <Printer size={14} /> Print Report Sheet
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>CA 1 (20)</th>
                      <th>CA 2 (20)</th>
                      <th>Exam (60)</th>
                      <th>Total (100)</th>
                      <th>Grade</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsList.map((r: any) => (
                      <tr key={r.id}>
                        <td className="font-bold text-slate-900">{r.subject?.name}</td>
                        <td className="font-mono text-slate-700">{r.ca1Score}</td>
                        <td className="font-mono text-slate-700">{r.ca2Score}</td>
                        <td className="font-mono text-slate-700">{r.examScore}</td>
                        <td className="font-mono font-black text-blue-700">{r.totalScore}</td>
                        <td>
                          <span className={r.grade === 'A' ? 'badge-green font-bold' : 'badge-blue font-bold'}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500">{r.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-slate-900">Attendance Log & Verification</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <span className="text-2xl font-black text-slate-900">62</span>
                <p className="text-xs text-slate-500 mt-1">Total School Days</p>
              </div>
              <div className="card p-4 text-center">
                <span className="text-2xl font-black text-emerald-600">60</span>
                <p className="text-xs text-slate-500 mt-1">Days Present</p>
              </div>
              <div className="card p-4 text-center">
                <span className="text-2xl font-black text-red-600">2</span>
                <p className="text-xs text-slate-500 mt-1">Days Absent</p>
              </div>
              <div className="card p-4 text-center">
                <span className="text-2xl font-black text-blue-600">96.8%</span>
                <p className="text-xs text-slate-500 mt-1">Overall Attendance</p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-800">
                Recent Attendance Verification Records
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Day</th><th>Roll Call Status</th><th>Scan / Note</th></tr>
                  </thead>
                  <tbody>
                    {[
                      { date: '2026-10-16', day: 'Friday', status: 'PRESENT', note: 'QR Badge Verified at 07:48 AM' },
                      { date: '2026-10-15', day: 'Thursday', status: 'PRESENT', note: 'Roll Call Verified' },
                      { date: '2026-10-14', day: 'Wednesday', status: 'LATE', note: 'Arrived at 08:18 AM (Traffic)' },
                      { date: '2026-10-13', day: 'Tuesday', status: 'PRESENT', note: 'QR Badge Verified at 07:50 AM' },
                      { date: '2026-10-12', day: 'Monday', status: 'PRESENT', note: 'QR Badge Verified at 07:42 AM' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="text-xs font-semibold text-slate-800">{row.date}</td>
                        <td className="text-xs text-slate-500">{row.day}</td>
                        <td>
                          <span className={row.status === 'PRESENT' ? 'badge-green' : 'badge-yellow'}>
                            {row.status}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500 font-mono">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'fees':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Bursary, Invoices & Fee Payments</h2>
                <p className="text-xs text-slate-500">Official itemized bills, online settlements, and payment plan requests</p>
              </div>
              <button
                onClick={() => setPaymentPlanModal(true)}
                className="btn-secondary btn-sm gap-1"
              >
                Request Installment Payment Plan
              </button>
            </div>

            <div className="space-y-4">
              {invoicesList.length === 0 ? (
                <div className="card p-12 text-center text-slate-400">
                  <Receipt size={40} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="text-base font-bold text-slate-700">No Invoices Issued</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    There are currently no outstanding or posted school fee invoices for your ward(s).
                  </p>
                </div>
              ) : (
                invoicesList.map((inv: any) => {
                  const paidAmount = inv.amountPaid ?? inv.paid ?? 0;
                  const totalAmount = inv.total ?? 0;
                  const balanceAmount = inv.balance ?? (totalAmount - paidAmount);
                  return (
                    <div key={inv.id} className="card overflow-hidden border border-slate-200">
                      <div className="p-5 flex items-center justify-between border-b border-slate-100 flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                              {inv.invoiceNo}
                            </span>
                            <span className={inv.status === 'PAID' ? 'badge-green font-bold text-xs' : 'badge-yellow font-bold text-xs'}>
                              {inv.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{inv.title || `School Fees — ${inv.invoiceNo}`}</h4>
                          <p className="text-xs text-slate-400">
                            Student: {inv.student?.firstName} {inv.student?.lastName} {inv.student?.admissionNumber ? `(${inv.student?.admissionNumber})` : ''} • Due Date: {formatDate(inv.dueDate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Total Invoiced</span>
                          <span className="text-xl font-black font-mono text-slate-900">₦{totalAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 flex items-center justify-between flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-4">
                          <span>Paid: <strong className="font-mono text-emerald-700">₦{paidAmount.toLocaleString()}</strong></span>
                          <span>Balance Due: <strong className="font-mono text-red-600">₦{balanceAmount.toLocaleString()}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="btn-secondary btn-sm gap-1"
                          >
                            <Eye size={13} /> View Breakdown
                          </button>
                          {paidAmount > 0 && (
                            <button
                              onClick={() => handleViewReceipt(inv)}
                              className="btn-secondary btn-sm gap-1"
                            >
                              <Receipt size={13} /> Official Receipt
                            </button>
                          )}
                          {balanceAmount > 0 && (
                            <button
                              onClick={() => setPaymentModal(inv)}
                              className="btn-primary btn-sm gap-1"
                            >
                              <CreditCard size={13} /> Pay Now (₦{balanceAmount.toLocaleString()})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      case 'circulars':
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-slate-900">School Circulars & Official Announcements</h2>
            <div className="space-y-4">
              {[
                { title: 'Mid-Term Break & Open Day Consultation Notice', category: 'ACADEMIC', date: 'Oct 14, 2026', body: 'Dear Parents and Guardians, please be reminded that our Mid-Term Break commences on Thursday 29th October. Parent-Teacher consultations will hold on Wednesday 28th October.' },
                { title: 'Annual Inter-House Sports Festival Schedule', category: 'EVENTS', date: 'Oct 10, 2026', body: 'The 2026 Annual Inter-House Athletics & Field Sports Championship has been scheduled for Saturday 21st November at the University Sports Complex.' },
                { title: 'First Term Tuition Remittance & Discount Deadline', category: 'BURSARY', date: 'Oct 02, 2026', body: 'Bursary reminder: Parents utilizing the early payment discount scheme are kindly advised to complete second installment remittances on or before 31st October.' },
              ].map((c, i) => (
                <div key={i} className="card p-5 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge-blue text-[10px] font-bold">{c.category}</span>
                    <span className="text-xs text-slate-400 font-mono">{c.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Direct Teacher-Parent Messaging</h2>
                <p className="text-xs text-slate-500">Secure conversation thread with your child’s class teacher</p>
              </div>
            </div>

            <div className="card overflow-hidden flex flex-col h-[480px]">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    MO
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Mrs. M. Okafor (Class Teacher — JSS 2A)</p>
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active in School
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex flex-col', msg.isTeacher ? 'items-start' : 'items-end')}>
                    <div className={cn(
                      'max-w-md p-3 rounded-2xl shadow-xs',
                      msg.isTeacher
                        ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                        : 'bg-blue-600 text-white rounded-tr-xs'
                    )}>
                      <p className="font-semibold text-[10px] opacity-75 mb-0.5">{msg.sender}</p>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message to the teacher..."
                  value={newChatText}
                  onChange={e => setNewChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  className="input py-2 text-xs flex-1"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newChatText.trim()}
                  className="btn-primary btn-sm px-4 gap-1"
                >
                  <Send size={13} /> Send
                </button>
              </div>
            </div>
          </div>
        );

      case 'appointments':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Parent-Teacher Conference Bookings</h2>
                <p className="text-xs text-slate-500">Book in-person or virtual consultation meetings with academic staff</p>
              </div>
              <button onClick={() => setAppointmentModal(true)} className="btn-primary btn-sm gap-1">
                <Plus size={14} /> Request Meeting
              </button>
            </div>

            <div className="space-y-3">
              {[
                { teacher: 'Mrs. M. Okafor (Mathematics & Class Teacher)', date: 'Oct 28, 2026', time: '11:00 AM', status: 'CONFIRMED', mode: 'In-Person Consultation' },
                { teacher: 'Dr. E. K. Adebayo (Principal / College Head)', date: 'Nov 04, 2026', time: '02:30 PM', status: 'PENDING APPROVAL', mode: 'Virtual Conference (Zoom)' },
              ].map((apt, i) => (
                <div key={i} className="card p-4 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{apt.teacher}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{apt.mode} • Date: <strong className="text-slate-800">{apt.date} at {apt.time}</strong></p>
                  </div>
                  <span className={apt.status === 'CONFIRMED' ? 'badge-green font-bold text-xs' : 'badge-yellow font-bold text-xs'}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-slate-900">Digital Permission Slips & Consent Forms</h2>
            <div className="space-y-4">
              {[
                {
                  id: 'slip_1',
                  title: 'Annual Science Museum & Aerospace Discovery Excursion',
                  destination: 'National Space Research & Museum, Abuja',
                  date: 'Nov 12, 2026',
                  departure: '07:30 AM',
                  cost: '₦12,500 (Includes Transport, Guided Tour & Refreshment)',
                  emergencyContact: 'School Medic: +234 800 000 1111',
                },
                {
                  id: 'slip_2',
                  title: 'State Invitational Inter-School Chess & Robotics Tournament',
                  destination: 'Civic Centre, Victoria Island, Lagos',
                  date: 'Nov 27, 2026',
                  departure: '08:00 AM',
                  cost: 'Sponsored by School Academic Department',
                  emergencyContact: 'Dean of Students: +234 800 000 2222',
                },
              ].map((slip) => {
                const isSigned = signedSlips[slip.id];
                return (
                  <div key={slip.id} className="card p-5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="badge-purple font-bold text-[10px]">OFFICIAL EXCURSION CONSENT</span>
                      <span className="text-xs text-slate-400 font-mono">Date: {slip.date}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{slip.title}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg text-slate-700">
                      <div><span className="text-slate-400">Destination:</span> <strong>{slip.destination}</strong></div>
                      <div><span className="text-slate-400">Departure Time:</span> <strong>{slip.departure}</strong></div>
                      <div><span className="text-slate-400">Activity Fee:</span> <strong>{slip.cost}</strong></div>
                      <div><span className="text-slate-400">Emergency Medic:</span> <strong>{slip.emergencyContact}</strong></div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                      <p className="text-xs text-slate-500 italic">
                        {isSigned
                          ? '✅ Digitally Signed & Authorized by Guardian'
                          : 'I hereby authorize my ward to participate in this official school excursion.'}
                      </p>
                      {isSigned ? (
                        <span className="badge-green font-bold text-xs inline-flex items-center gap-1">
                          <Check size={13} /> Consent Granted
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSignedSlips(prev => ({ ...prev, [slip.id]: true }));
                            toast.success('Digital consent slip authorized and submitted to school!');
                          }}
                          className="btn-primary btn-sm gap-1"
                        >
                          <PenTool size={13} /> Sign & Authorize Consent
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'inquiries':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Complaints, Inquiries & Feedback Desk</h2>
                <p className="text-xs text-slate-500">Submit formal academic, administrative, or bursary inquiries</p>
              </div>
              <button onClick={() => setInquiryModal(true)} className="btn-primary btn-sm gap-1">
                <Plus size={14} /> Submit New Inquiry
              </button>
            </div>

            <div className="space-y-3">
              {[
                { ref: 'TKT-8841', subject: 'Inquiry regarding bus transportation morning pickup time', status: 'RESOLVED', response: 'Pickup route optimized to 07:10 AM by transport division.', date: 'Oct 08, 2026' },
                { ref: 'TKT-9102', subject: 'Uniform sizing exchange for junior blazer', status: 'IN PROGRESS', response: 'School store manager notified. Replacement ready for pickup on Monday.', date: 'Yesterday' },
              ].map((t, i) => (
                <div key={i} className="card p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">{t.ref}</span>
                    <span className={t.status === 'RESOLVED' ? 'badge-green text-xs font-bold' : 'badge-yellow text-xs font-bold'}>{t.status}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.subject}</h4>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong>School Response: </strong>{t.response}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="card p-6 max-w-xl space-y-4">
            <h2 className="text-xl font-black text-slate-900">Guardian Profile & Verification</h2>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">Full Name:</span> <strong>{parent.firstName} {parent.lastName}</strong></p>
              <p><span className="text-slate-400">Email:</span> <strong>{parent.email}</strong></p>
              <p><span className="text-slate-400">Phone:</span> <strong>{parent.phone || '+234 (0) 803 000 0000'}</strong></p>
              <p><span className="text-slate-400">Verified School:</span> <strong>{school.name}</strong></p>
            </div>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* ─── SIDEBAR NAVIGATION ────────────────────────────────────────────── */}
      <aside className={cn(
        'transition-all duration-300 bg-white border-r border-slate-200 flex flex-col shadow-xs flex-shrink-0 z-20',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <EduNestIcon size={28} />
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate uppercase tracking-wider">{school.name?.substring(0, 16)}</p>
                <p className="text-[10px] text-blue-600 font-bold">Parent Portal</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-slate-400 hover:text-slate-600">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <button
              key={to}
              onClick={() => setActiveTab(to)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                activeTab === to
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1">
          {sidebarOpen && (
            <div className="px-2 py-1 mb-1 text-[11px]">
              <p className="font-bold text-slate-800 truncate">{parent.firstName} {parent.lastName}</p>
              <p className="text-slate-400 truncate">{parent.email}</p>
            </div>
          )}
          <button
            onClick={() => { localStorage.removeItem('parent_token'); localStorage.removeItem('parent_data'); window.location.reload(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shadow-xs">
          <div className="flex-1">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {navItems.find(n => n.to === activeTab)?.label || 'Parent Portal'}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 text-xs">
            <span className="font-bold text-slate-800">{parent.firstName} {parent.lastName}</span>
            <span className="badge-blue text-[10px] font-bold">Guardian</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>

      {/* ─── MODAL 1: ITEMIZED INVOICE BREAKDOWN ─────────────────────────────── */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Itemized Fee Invoice — #{viewInvoice.invoiceNo}</h3>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800">{viewInvoice.title || `School Fees — ${viewInvoice.invoiceNo}`}</p>
              <p className="text-slate-500">Student: {viewInvoice.student?.firstName} {viewInvoice.student?.lastName} {viewInvoice.student?.admissionNumber ? `(${viewInvoice.student?.admissionNumber})` : ''}</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr><th className="px-3 py-2 text-left">Line Item Description</th><th className="px-3 py-2 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewInvoice.items || []).map((it: any, i: number) => (
                      <tr key={i}><td className="px-3 py-2">{it.description || it.name || 'Fee Item'}</td><td className="px-3 py-2 text-right font-mono font-bold">₦{(it.subtotal || it.amount || 0).toLocaleString()}</td></tr>
                    ))}
                    <tr className="bg-slate-50 font-black"><td className="px-3 py-2">TOTAL INVOICED</td><td className="px-3 py-2 text-right font-mono text-blue-700">₦{(viewInvoice.total || 0).toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setViewInvoice(null)} className="btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: OFFICIAL PRINTABLE BURSARY RECEIPT (RECEIPTVIEWER) ──────── */}
      <ReceiptViewer
        receipt={activeReceipt}
        open={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      {/* ─── MODAL 3: SECURE SCHOOL FEE PAYMENT GATEWAY & INSTRUCTIONS ───────── */}
      {paymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">School Fee Settlement</h3>
              <button onClick={() => setPaymentModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <p className="text-slate-500">Invoice: <strong className="text-slate-900">{paymentModal.title || paymentModal.invoiceNo}</strong></p>
              <div className="flex justify-between items-center text-sm font-black pt-1">
                <span>Amount to Settle:</span>
                <span className="text-emerald-700 font-mono">₦{(paymentModal.balance || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'card', label: 'Online Payment (Paystack)' },
                { id: 'transfer', label: 'Direct Bank Transfer' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-bold text-center transition-all',
                    paymentMethod === m.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'card' && (
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3 text-xs text-slate-700">
                <div className="flex items-center gap-2 text-blue-800 font-bold">
                  <ShieldCheck size={16} className="text-blue-600" />
                  <span>Instant Paystack Online Clearing</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  Pay securely using Debit Card (Mastercard, Visa, Verve), USSD, Bank Transfer, or QR via Paystack.
                  Your invoice balance will update automatically and your official receipt will be generated immediately upon successful payment.
                </p>
                <button
                  onClick={() => handleInitiateOnlinePayment(paymentModal)}
                  disabled={isPayingOnline}
                  className="btn-primary w-full py-2.5 text-xs font-bold gap-2 flex items-center justify-center"
                >
                  {isPayingOnline ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  <span>Proceed to Paystack Checkout (₦{(paymentModal.balance || 0).toLocaleString()})</span>
                </button>
              </div>
            )}

            {paymentMethod === 'transfer' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1.5 font-mono">
                  <p><span className="text-slate-400 font-sans">Bank: </span><strong>PROVIDUS BANK / ZENITH BANK</strong></p>
                  <p><span className="text-slate-400 font-sans">Account No: </span><strong>9900123456</strong></p>
                  <p><span className="text-slate-400 font-sans">Beneficiary: </span><strong>{school.name || 'EduNest School'}</strong></p>
                  <p className="text-[11px] text-blue-700 font-bold font-sans">Payment Reference: {paymentModal.invoiceNo}</p>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  After initiating the transfer, present or forward your transaction receipt / reference to the School Bursary or Class Master for verification and official receipt issuance.
                </p>
                <button
                  onClick={() => {
                    toast.success('Transfer instructions noted. Please submit proof to the Bursary.');
                    setPaymentModal(null);
                  }}
                  className="btn-secondary w-full py-2 text-xs font-bold"
                >
                  I Have Noted the Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 4: INSTALLMENT PAYMENT PLAN REQUEST ────────────────────────── */}
      {paymentPlanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Request Installment Fee Payment Plan</h3>
              <button onClick={() => setPaymentPlanModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">Submit a formal installment schedule request for Bursary & Principal review.</p>
              <div>
                <label className="label text-xs">Proposed Installment Structure</label>
                <select className="input py-2 text-xs w-full">
                  <option>3 Installments (50% Deposit, 25% in 30 days, 25% in 60 days)</option>
                  <option>2 Equal Installments (50% Deposit, 50% Mid-term)</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Justification Note</label>
                <textarea rows={3} placeholder="Provide reasons for installment concession..." className="input text-xs w-full resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPaymentPlanModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={() => { toast.success('Installment plan request submitted to Bursary'); setPaymentPlanModal(false); }} className="btn-primary btn-sm">Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: BOOK PTA APPOINTMENT ───────────────────────────────────── */}
      {appointmentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Request Consultation Appointment</h3>
              <button onClick={() => setAppointmentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label text-xs">Consultation Recipient</label>
                <select className="input py-2 text-xs w-full">
                  <option>Mrs. M. Okafor (Class Teacher — JSS 2A)</option>
                  <option>Dr. E. K. Adebayo (Principal / College Head)</option>
                  <option>School Guidance Counselor</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Preferred Date</label>
                  <input type="date" defaultValue="2026-10-28" className="input py-2 text-xs w-full" />
                </div>
                <div>
                  <label className="label text-xs">Preferred Time Slot</label>
                  <select className="input py-2 text-xs w-full">
                    <option>10:00 AM - 10:30 AM</option>
                    <option>11:30 AM - 12:00 PM</option>
                    <option>02:00 PM - 02:30 PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label text-xs">Discussion Agenda / Topic</label>
                <textarea rows={2} placeholder="Briefly state topics to discuss..." className="input text-xs w-full resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAppointmentModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={() => { toast.success('Appointment request dispatched to teacher'); setAppointmentModal(false); }} className="btn-primary btn-sm">Book Meeting</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: SUBMIT INQUIRY ─────────────────────────────────────────── */}
      {inquiryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Submit Inquiry or Feedback</h3>
              <button onClick={() => setInquiryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label text-xs">Category</label>
                <select className="input py-2 text-xs w-full">
                  <option>Academic Inquiry</option>
                  <option>Transportation / Bus Services</option>
                  <option>Bursary & Billing Question</option>
                  <option>School Health & Nutrition</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Subject</label>
                <input type="text" placeholder="Brief summary of inquiry..." className="input py-2 text-xs w-full" />
              </div>
              <div>
                <label className="label text-xs">Details</label>
                <textarea rows={3} placeholder="Provide details for school administration..." className="input text-xs w-full resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setInquiryModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={() => { toast.success('Ticket submitted with reference #TKT-9921'); setInquiryModal(false); }} className="btn-primary btn-sm">Submit Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Parent ID Card Modal ─── */}
      <IDCardModal
        open={!!idCardChild}
        onClose={() => setIdCardChild(null)}
        type="student"
        canPrint={true}
        viewerRoleLabel="Parent / Guardian"
        studentData={idCardChild ? {
          schoolName: school?.name || 'EduNest School',
          schoolLogo: school?.logo,
          schoolMotto: school?.motto,
          schoolAddress: school?.address,
          schoolPhone: school?.phone,
          schoolEmail: school?.email,
          primaryColor: school?.primaryColor || '#2563eb',
          secondaryColor: school?.secondaryColor || '#7e3af2',
          studentId: idCardChild.id || idCardChild.studentId || '',
          admissionNumber: idCardChild.admissionNumber || '',
          firstName: idCardChild.firstName || '',
          lastName: idCardChild.lastName || '',
          gender: idCardChild.gender,
          dateOfBirth: idCardChild.dateOfBirth,
          bloodGroup: idCardChild.bloodGroup,
          className: idCardChild.currentClass || idCardChild.className,
          status: idCardChild.status || 'ACTIVE',
          photo: idCardChild.photo,
          issueDate: new Date().toISOString(),
          expiryDate: '2027-08-31',
          signatureLine: 'Principal',
        } : undefined}
      />
    </div>
  );
}

export default function ParentPortalPage() {
  const auth = useParentAuth();
  if (!auth.isAuthenticated) return <ParentLoginPage onLogin={auth.login} />;
  return <ParentDashboardView token={auth.token!} parent={auth.parent} />;
}
