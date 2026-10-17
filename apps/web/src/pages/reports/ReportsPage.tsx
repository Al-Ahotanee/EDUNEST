import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, Download, RefreshCw, TrendingUp, Users, DollarSign, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatCard, Button, PageLoader, Select } from '../../components/ui';
import { reportsApi, financeApi, studentsApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'overview' | 'enrollment' | 'finance' | 'attendance'>('overview');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: studentStats } = useQuery({ queryKey: ['student-stats'], queryFn: () => studentsApi.stats().then(r => r.data.data) });
  const { data: finStats } = useQuery({ queryKey: ['finance-dashboard'], queryFn: () => financeApi.dashboard().then(r => r.data.data) });
  const { data: monthlyTrend } = useQuery({ queryKey: ['monthly-trend', year], queryFn: () => financeApi.monthlyTrend(year).then(r => r.data.data) });

  const genderData = [
    { name: 'Male', value: studentStats?.male || 0 },
    { name: 'Female', value: studentStats?.female || 0 },
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: String(y), label: String(y) };
  });

  const handleExport = (format: 'csv' | 'json') => {
    const summary = {
      reportYear: year,
      generatedAt: new Date().toISOString(),
      summary: {
        totalStudents: studentStats?.total || 0,
        activeStudents: studentStats?.active || 0,
        male: studentStats?.male || 0,
        female: studentStats?.female || 0,
        totalRevenue: finStats?.totalCollected || 0,
        outstandingBalance: finStats?.totalBalance || 0,
        collectionRate: finStats?.collectionRate || 0,
      },
      monthlyTrend: monthlyTrend || [],
    };

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const rows = (monthlyTrend || []).map((m: any) => ({
        Month: m.month || m.label || '',
        Revenue: m.revenue || m.collected || 0,
        Outstanding: m.outstanding || 0,
        Transactions: m.transactions || 0,
      }));
      const csv = toCsv(rows.length ? rows : [{ Note: 'No monthly data available' }]);
      downloadBlob(csv, `edunest-reports-${stamp}.csv`, 'text/csv;charset=utf-8');
      toast.success(`Exported CSV (${rows.length} rows)`);
    } else {
      downloadBlob(JSON.stringify(summary, null, 2), `edunest-reports-${stamp}.json`, 'application/json');
      toast.success('Exported JSON report');
    }
  };

  const handlePrint = () => {
    toast.success('Opening print dialog for PDF export…');
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">School performance insights and data exports</p>
        </div>
        <div className="flex gap-2">
          <Select options={years} value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-28 py-2 text-sm" />
          <Button variant="secondary" icon={<Download size={16} />} onClick={handlePrint}>Export PDF</Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => handleExport('csv')}>Export CSV</Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => handleExport('json')}>Export JSON</Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={(studentStats?.total || 0).toLocaleString()} icon={<Users size={20} />} color="blue" />
        <StatCard title="Total Revenue" value={formatCurrency(finStats?.totalCollected || 0)} icon={<DollarSign size={20} />} color="green" />
        <StatCard title="Collection Rate" value={`${finStats?.collectionRate || 0}%`} icon={<TrendingUp size={20} />} color="purple" />
        <StatCard title="Outstanding" value={formatCurrency(finStats?.totalBalance || 0)} icon={<ClipboardCheck size={20} />} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['overview', 'enrollment', 'finance', 'attendance'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue trend */}
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-6">Revenue Trend {year}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyTrend || []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [formatCurrency(v), 'Collected']} />
                  <Area type="monotone" dataKey="collected" stroke="#3b82f6" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gender Distribution */}
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-6">Student Gender Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={4} dataKey="value">
                    {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transactions bar */}
          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-6">Monthly Transaction Volume {year}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend || []} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="transactions" name="Transactions" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'enrollment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <p className="text-5xl font-black text-blue-600">{studentStats?.total || 0}</p>
              <p className="text-slate-500 mt-2 font-medium">Total Enrolled Students</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-5xl font-black text-emerald-600">{studentStats?.active || 0}</p>
              <p className="text-slate-500 mt-2 font-medium">Currently Active</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-5xl font-black text-purple-600">
                {studentStats?.total ? Math.round((studentStats.female / studentStats.total) * 100) : 0}%
              </p>
              <p className="text-slate-500 mt-2 font-medium">Female Ratio</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-6">Enrollment by Class</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(studentStats?.byClass || []).map((b: any) => ({ class: b.classId, count: b._count.studentId }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="class" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Invoiced', value: formatCurrency(finStats?.totalInvoiced || 0), color: 'text-blue-600' },
              { label: 'Total Collected', value: formatCurrency(finStats?.totalCollected || 0), color: 'text-emerald-600' },
              { label: 'Total Outstanding', value: formatCurrency(finStats?.totalBalance || 0), color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="card p-6 text-center">
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 mt-2 font-medium text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-6">Revenue vs Outstanding — Monthly {year}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrend || []} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card p-8 text-center">
          <ClipboardCheck size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 text-lg">Attendance Reports</h3>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            Select a class and term from the Attendance module to view detailed attendance analytics and trends.
          </p>
          <Button className="mt-6" onClick={() => window.location.href = '/attendance'}>
            Go to Attendance
          </Button>
        </div>
      )}
    </div>
  );
}
