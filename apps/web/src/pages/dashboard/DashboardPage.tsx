import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  GraduationCap, DollarSign, Users, ClipboardCheck,
  TrendingUp, AlertCircle, BookOpen, Award,
} from 'lucide-react';
import { StatCard, Card, PageLoader, Badge } from '../../components/ui';
import { studentsApi, financeApi, attendanceApi } from '../../services/api';
import { formatCurrency, formatDate, getStatusBadge } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: studentStats, isLoading: loadingStudents } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => studentsApi.stats().then((r) => r.data.data),
  });

  const { data: financeStats, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeApi.dashboard().then((r) => r.data.data),
  });

  const { data: monthlyTrend } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => financeApi.monthlyTrend().then((r) => r.data.data),
  });

  const isLoading = loadingStudents || loadingFinance;

  if (isLoading) return <PageLoader />;

  const genderData = [
    { name: 'Male', value: studentStats?.male || 0 },
    { name: 'Female', value: studentStats?.female || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">
          Good {getGreeting()}, {user?.firstName} 👋
        </h1>
        <p className="page-subtitle">
          Here's what's happening at {user?.school?.name || 'your school'} today
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={(studentStats?.total || 0).toLocaleString()}
          subtitle={`${studentStats?.active || 0} active`}
          icon={<GraduationCap size={22} />}
          color="blue"
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(Math.max(0, financeStats?.totalCollected || 0))}
          subtitle={`${Math.min(100, Math.max(0, financeStats?.collectionRate || 0))}% collection rate`}
          icon={<DollarSign size={22} />}
          color="green"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(Math.max(0, financeStats?.totalBalance || 0))}
          subtitle={`${financeStats?.unpaidCount || 0} unpaid invoices`}
          icon={<AlertCircle size={22} />}
          color="red"
        />
        <StatCard
          title="Monthly Collection"
          value={formatCurrency(Math.max(0, financeStats?.monthlyCollected || 0))}
          subtitle="This month"
          icon={<TrendingUp size={22} />}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Revenue Collection Trend</h3>
              <p className="text-sm text-slate-500 mt-0.5">Monthly fee collections this year</p>
            </div>
            <span className="badge-blue">2024/2025</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="collected" name="Collected" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Distribution */}
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Student Demographics</h3>
            <p className="text-sm text-slate-500 mt-0.5">Gender distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {genderData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend formatter={(v) => <span className="text-sm text-slate-600">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xl font-bold text-blue-600">{studentStats?.male || 0}</p>
              <p className="text-xs text-slate-500">Male</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-xl font-bold text-purple-600">{studentStats?.female || 0}</p>
              <p className="text-xs text-slate-500">Female</p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Transactions Volume</h3>
              <p className="text-sm text-slate-500 mt-0.5">Number of payment transactions per month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend || []} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="transactions" name="Transactions" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-slate-900">Quick Overview</h3>
          {[
            { label: 'Total Invoiced', value: formatCurrency(financeStats?.totalInvoiced || 0), icon: <DollarSign size={16} />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Overdue Invoices', value: financeStats?.overdueCount || 0, icon: <AlertCircle size={16} />, color: 'text-red-600 bg-red-50' },
            { label: 'Yearly Collection', value: formatCurrency(financeStats?.yearlyCollected || 0), icon: <TrendingUp size={16} />, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Active Students', value: (studentStats?.active || 0).toLocaleString(), icon: <GraduationCap size={16} />, color: 'text-purple-600 bg-purple-50' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className={`p-2 rounded-lg ${item.color}`}>{item.icon}</div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="font-bold text-slate-900 text-sm">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Recent Payments</h3>
            <a href="/finance/invoices" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-slate-50">
            {(financeStats?.recentPayments || []).slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <DollarSign size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {p.invoice?.student?.firstName} {p.invoice?.student?.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{p.invoice?.student?.admissionNumber} • {formatDate(p.paymentDate)}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {(!financeStats?.recentPayments?.length) && (
              <p className="text-center text-slate-400 text-sm py-8">No payments yet</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Register Student', href: '/app/students?action=new', icon: <GraduationCap size={20} />, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'Create Invoice', href: '/app/finance/invoices?action=new', icon: <DollarSign size={20} />, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
              { label: 'Mark Attendance', href: '/app/attendance', icon: <ClipboardCheck size={20} />, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
              { label: 'Enter Results', href: '/app/results', icon: <Award size={20} />, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
              { label: 'Add Staff', href: '/app/hr/staff?action=new', icon: <Users size={20} />, color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
              { label: 'View Reports', href: '/app/reports', icon: <BookOpen size={20} />, color: 'bg-red-50 text-red-600 hover:bg-red-100' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer ${action.color}`}
              >
                {action.icon}
                <span className="text-sm font-semibold">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
