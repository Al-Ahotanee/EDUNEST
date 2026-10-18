import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Download, RefreshCw, Search, Phone, Mail,
} from 'lucide-react';
import { Button, StatCard, PageLoader } from '../../components/ui';
import { financeApi, academicApi } from '../../services/api';
import { formatCurrency, cn } from '../../lib/utils';

/**
 * OutstandingFeesReportPage — debtor report showing all students with
 * unpaid or partially-paid invoices.
 *
 * Shows per-student:
 *   - Invoice number, total, paid, balance
 *   - Guardian name + phone (for follow-up contact)
 *   - Overdue flag (due date passed + balance > 0)
 *
 * Filters: class, session, minimum amount
 * Export: CSV download
 */
export default function OutstandingFeesReportPage() {
  const [classFilter, setClassFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['classes-outstanding-report'],
    queryFn: () => academicApi.classes().then(r => r.data?.data || r.data || []),
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['outstanding-fees', classFilter, minAmount],
    queryFn: () => financeApi.getOutstandingFees({
      classId: classFilter || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
    }).then(r => r.data?.data || r.data),
  });

  const report = (data?.students || []);
  const summary = data?.summary || {};

  const handleExportCSV = () => {
    if (report.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Invoice No', 'Student', 'Admission No', 'Class', 'Guardian', 'Phone', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', 'Overdue'];
    const rows = report.map((r: any) => [
      r.invoiceNo,
      `"${r.studentName}"`,
      r.admissionNumber,
      r.className,
      `"${r.guardianName}"`,
      r.guardianPhone,
      r.total,
      r.amountPaid,
      r.balance,
      r.status,
      r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
      r.isOverdue ? 'YES' : 'NO',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding-fees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Exported ${report.length} records to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <AlertTriangle size={24} className="text-red-500" /> Outstanding Fees Report
          </h1>
          <p className="page-subtitle">
            Students with unpaid or partially-paid invoices — sorted by outstanding amount
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => refetch()}>Refresh</Button>
          <Button variant="secondary" icon={<Download size={15} />} onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Debtors"
          value={summary.totalStudents || 0}
          subtitle="students with outstanding fees"
          icon={<AlertTriangle size={20} />}
          color="red"
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(summary.totalOutstanding || 0)}
          icon={<AlertTriangle size={20} />}
          color="amber"
        />
        <StatCard
          title="Average Outstanding"
          value={formatCurrency(summary.averageOutstanding || 0)}
          subtitle="per debtor"
          icon={<AlertTriangle size={20} />}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="input w-48 py-2 text-sm"
        >
          <option value="">All Classes</option>
          {classes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={minAmount}
          onChange={e => setMinAmount(e.target.value)}
          placeholder="Min amount (₦)"
          className="input w-40 py-2 text-sm"
        />
      </div>

      {/* Report table */}
      <div className="card border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : report.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle size={40} className="mx-auto text-emerald-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No outstanding fees</p>
            <p className="text-xs text-slate-400 mt-1">All students are fully paid up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Guardian</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Outstanding</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.map((r: any) => (
                  <tr key={r.invoiceId} className={cn('hover:bg-slate-50', r.isOverdue && 'bg-red-50/30')}>
                    <td className="p-3 font-mono text-slate-600 text-[10px]">{r.invoiceNo}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{r.studentName}</div>
                      <div className="text-slate-400 font-mono text-[10px]">{r.admissionNumber}</div>
                    </td>
                    <td className="p-3 text-slate-600">{r.className}</td>
                    <td className="p-3 text-slate-600">{r.guardianName}</td>
                    <td className="p-3">
                      {r.guardianPhone !== '—' && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Phone size={10} /> {r.guardianPhone}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-600">{formatCurrency(r.total)}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">{formatCurrency(r.amountPaid)}</td>
                    <td className="p-3 text-right text-red-500 font-bold">{formatCurrency(r.balance)}</td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        r.isOverdue ? 'bg-red-100 text-red-700' :
                        r.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {r.isOverdue ? 'OVERDUE' : r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={7} className="p-3 text-right font-bold text-slate-900">Total Outstanding:</td>
                  <td className="p-3 text-right font-black text-red-600 text-sm">{formatCurrency(summary.totalOutstanding || 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
