import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, Download, RefreshCw, TrendingUp, Users, DollarSign, ClipboardCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatCard, Button, PageLoader, Select } from '../../components/ui';
import { reportsApi, financeApi, studentsApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function downloadBlob(content: BlobPart, filename: string, mime: string) {
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

// ─── Excel export (single-sheet .xls via HTML table, opens natively in Excel) ──
// Renders the report data as an HTML <table> with Excel-compatible styling
// and Excel mime type. Excel and LibreOffice open this natively without needing
// a third-party library (no jsPDF/SheetJS dependency, no bundle bloat).
function toExcelHtml(sheets: { name: string; headers: string[]; rows: any[][] }[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined || v === '') return '';
    const s = String(v);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const htmlSheets = sheets.map(sheet => `
    <table border="1" style="border-collapse:collapse;font-family:Calibri;font-size:11pt;">
      <thead>
        <tr style="background:#1e3a8a;color:#fff;font-weight:bold;">
          ${sheet.headers.map(h => `<th style="padding:6px 10px;border:1px solid #cbd5e1;">${escape(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${sheet.rows.map(row => `
          <tr>
            ${row.map(cell => `<td style="padding:6px 10px;border:1px solid #e2e8f0;">${escape(cell)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>`).join('<br/>');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
${sheets.map(s => `<x:ExcelWorksheet><x:Name>${s.name}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`).join('')}
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>${htmlSheets}</body></html>`;
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

  const handleExport = (format: 'csv' | 'json' | 'excel') => {
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
      byClass: studentStats?.byClass || [],
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
    } else if (format === 'excel') {
      // P0 fix: real Excel .xls export with 2 sheets — Summary + Monthly Trend
      const monthlyRows = (monthlyTrend || []).map((m: any) => [
        m.month || m.label || '',
        m.revenue || m.collected || 0,
        m.outstanding || 0,
        m.transactions || 0,
      ]);
      const summaryRows = [
        ['Total Students', studentStats?.total || 0],
        ['Active Students', studentStats?.active || 0],
        ['Male', studentStats?.male || 0],
        ['Female', studentStats?.female || 0],
        ['Total Revenue', formatCurrency(finStats?.totalCollected || 0)],
        ['Outstanding Balance', formatCurrency(finStats?.totalBalance || 0)],
        ['Collection Rate', `${finStats?.collectionRate || 0}%`],
        ['Report Year', year],
        ['Generated At', new Date().toLocaleString()],
      ];
      const html = toExcelHtml([
        { name: 'Summary', headers: ['Metric', 'Value'], rows: summaryRows },
        { name: 'Monthly Trend', headers: ['Month', 'Revenue', 'Outstanding', 'Transactions'], rows: monthlyRows.length ? monthlyRows : [['—', '—', '—', '—']] },
      ]);
      downloadBlob(html, `edunest-reports-${stamp}.xls`, 'application/vnd.ms-excel');
      toast.success(`Exported Excel workbook (2 sheets)`);
    } else {
      downloadBlob(JSON.stringify(summary, null, 2), `edunest-reports-${stamp}.json`, 'application/json');
      toast.success('Exported JSON report');
    }
  };

  // P0 fix: PDF export — opens a print-optimized report view in a new window,
  // then triggers the browser's native print-to-PDF dialog. Includes the
  // summary KPIs + monthly trend table + class enrollment breakdown, so the
  // printed document is a complete snapshot (not just the on-screen dashboard).
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site and try again.');
      return;
    }
    const stamp = new Date().toLocaleString();
    const monthlyRows = (monthlyTrend || []).map((m: any) => `
      <tr>
        <td>${m.month || m.label || '—'}</td>
        <td style="text-align:right;">${formatCurrency(m.revenue || m.collected || 0)}</td>
        <td style="text-align:right;">${formatCurrency(m.outstanding || 0)}</td>
        <td style="text-align:right;">${m.transactions || 0}</td>
      </tr>`).join('');
    const classRows = (studentStats?.byClass || []).map((b: any) => `
      <tr>
        <td>${b.className || b.classId?.slice(0, 8) || '—'}</td>
        <td style="text-align:right;">${b._count?.studentId || b._count || 0}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head>
<title>Reports — ${year}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 24px; }
  h1 { font-size: 22pt; margin: 0 0 4px; }
  h2 { font-size: 14pt; margin: 24px 0 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; }
  .meta { color: #64748b; font-size: 10pt; margin-bottom: 16px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
  .kpi .label { font-size: 8pt; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .kpi .value { font-size: 16pt; font-weight: 700; color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
  th { background: #1e3a8a; color: white; text-align: left; }
  tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #cbd5e1; color: #94a3b8; font-size: 9pt; text-align: center; }
  @media print { body { margin: 0; } }
</style>
</head><body>
  <h1>School Performance Report</h1>
  <div class="meta">Academic Year: ${year} · Generated: ${stamp}</div>

  <div class="kpis">
    <div class="kpi"><div class="label">Total Students</div><div class="value">${(studentStats?.total || 0).toLocaleString()}</div></div>
    <div class="kpi"><div class="label">Active</div><div class="value">${(studentStats?.active || 0).toLocaleString()}</div></div>
    <div class="kpi"><div class="label">Total Revenue</div><div class="value">${formatCurrency(finStats?.totalCollected || 0)}</div></div>
    <div class="kpi"><div class="label">Collection Rate</div><div class="value">${finStats?.collectionRate || 0}%</div></div>
  </div>

  <h2>Monthly Revenue Trend</h2>
  <table>
    <thead><tr><th>Month</th><th style="text-align:right;">Revenue</th><th style="text-align:right;">Outstanding</th><th style="text-align:right;">Transactions</th></tr></thead>
    <tbody>${monthlyRows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No monthly data available</td></tr>'}</tbody>
  </table>

  <h2>Enrollment by Class</h2>
  <table>
    <thead><tr><th>Class</th><th style="text-align:right;">Students</th></tr></thead>
    <tbody>${classRows || '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No enrollment data available</td></tr>'}</tbody>
  </table>

  <div class="footer">Confidential — Generated by EduNest Reports module</div>
</body></html>`);
    win.document.close();
    // Give the new window a moment to render before firing print.
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
    toast.success('Opening print dialog for PDF export…');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">School performance insights and data exports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select options={years} value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-28 py-2 text-sm" />
          <Button variant="secondary" icon={<FileText size={16} />} onClick={handlePrint}>Export PDF</Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => handleExport('excel')}>Export Excel</Button>
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
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
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
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
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
              <BarChart data={(studentStats?.byClass || []).map((b: any) => ({ class: b.className || b.classId?.slice(0,8) || '—', count: b._count?.studentId || b._count || 0 }))}>
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
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
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
