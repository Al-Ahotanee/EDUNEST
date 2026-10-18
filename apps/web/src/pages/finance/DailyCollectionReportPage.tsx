import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calendar, Download, RefreshCw, DollarSign, BarChart3 } from 'lucide-react';
import { Button, StatCard } from '../../components/ui';
import { financeApi } from '../../services/api';
import { formatCurrency, cn } from '../../lib/utils';

/**
 * DailyCollectionReportPage — shows all POSTED payments for a specific date.
 * Includes payment method breakdown and per-payment details with receipt numbers.
 */
export default function DailyCollectionReportPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-collection', date],
    queryFn: () => financeApi.getDailyCollection(date).then(r => r.data?.data || r.data),
  });

  const payments = (data?.payments || []);
  const summary = data?.summary || {};

  const handleExportCSV = () => {
    if (payments.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Receipt No', 'Student', 'Admission No', 'Amount', 'Method', 'Reference', 'Posted At'];
    const rows = payments.map((p: any) => [
      p.receiptNo,
      `"${p.studentName}"`,
      p.admissionNumber,
      p.amount,
      p.method,
      p.reference || '',
      p.postedAt ? new Date(p.postedAt).toLocaleString('en-GB') : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-collection-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Exported ${payments.length} payments to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar size={24} /> Daily Collection Report
          </h1>
          <p className="page-subtitle">All verified and posted payments for the selected date</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => refetch()}>Refresh</Button>
          <Button variant="secondary" icon={<Download size={15} />} onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Collection Date:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="input w-48 py-2 text-sm"
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Payments"
          value={summary.totalPayments || 0}
          subtitle="transactions posted"
          icon={<DollarSign size={20} />}
          color="blue"
        />
        <StatCard
          title="Grand Total Collected"
          value={formatCurrency(summary.grandTotal || 0)}
          icon={<DollarSign size={20} />}
          color="green"
        />
        <StatCard
          title="Cash"
          value={formatCurrency((summary.byMethod || []).find((m: any) => m.method === 'CASH')?.total || 0)}
          subtitle={`${(summary.byMethod || []).find((m: any) => m.method === 'CASH')?.count || 0} txn(s)`}
          icon={<DollarSign size={20} />}
          color="amber"
        />
        <StatCard
          title="Bank Transfer + POS"
          value={formatCurrency(
            ((summary.byMethod || []).find((m: any) => m.method === 'BANK_TRANSFER')?.total || 0) +
            ((summary.byMethod || []).find((m: any) => m.method === 'POS')?.total || 0)
          )}
          subtitle="electronic payments"
          icon={<DollarSign size={20} />}
          color="purple"
        />
      </div>

      {/* Method breakdown bars */}
      {(summary.byMethod || []).length > 0 && (
        <div className="card p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" /> Payment Method Breakdown
          </h3>
          <div className="space-y-3">
            {(summary.byMethod || []).map((m: any) => {
              const total = summary.grandTotal || 1;
              const pct = Math.round((m.total / total) * 100);
              return (
                <div key={m.method}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{m.method.replace('_', ' ')}</span>
                    <span className="text-slate-500">{formatCurrency(m.total)} ({m.count} txn, {pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn(
                      'h-full rounded-full transition-all',
                      m.method === 'CASH' ? 'bg-amber-500' :
                      m.method === 'BANK_TRANSFER' ? 'bg-blue-500' :
                      m.method === 'POS' ? 'bg-purple-500' :
                      m.method === 'ONLINE' ? 'bg-emerald-500' :
                      'bg-slate-400'
                    )} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="card border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No payments posted on {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting a different date</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Posted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-blue-600 text-[10px]">{p.receiptNo}</td>
                    <td className="p-3 font-semibold text-slate-900">{p.studentName}</td>
                    <td className="p-3 font-mono text-slate-500 text-[10px]">{p.admissionNumber}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="p-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        p.method === 'CASH' ? 'bg-amber-50 text-amber-700' :
                        p.method === 'BANK_TRANSFER' ? 'bg-blue-50 text-blue-700' :
                        p.method === 'POS' ? 'bg-purple-50 text-purple-700' :
                        p.method === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-slate-50 text-slate-700'
                      )}>
                        {p.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[10px]">{p.reference || '—'}</td>
                    <td className="p-3 text-slate-500 text-[10px]">
                      {p.postedAt ? new Date(p.postedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="p-3 text-right font-bold text-slate-900">Grand Total:</td>
                  <td className="p-3 text-right font-black text-emerald-600 text-sm">{formatCurrency(summary.grandTotal || 0)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
