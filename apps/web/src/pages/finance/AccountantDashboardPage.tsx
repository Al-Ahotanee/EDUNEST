import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DollarSign, Clock, CheckCircle2, XCircle, AlertTriangle, TrendingUp,
  RefreshCw, Check, X, ArrowLeft, Eye, Printer, FileText, BarChart3,
} from 'lucide-react';
import { Button, Modal, StatCard, Badge, Avatar } from '../../components/ui';
import { financeApi } from '../../services/api';
import { formatCurrency, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

/**
 * AccountantDashboardPage — the School Accountant's financial command center.
 *
 * Shows:
 *   - Pending approval queue (Class Master cash submissions + bank transfer verifications)
 *   - Collection stats (total invoiced, collected, outstanding, collection rate)
 *   - Payment method breakdown
 *   - Recent posted payments
 *   - Exceptions (rejected, reversed, overdue)
 *
 * The accountant can approve/reject pending payments directly from this page.
 */
export default function AccountantDashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [rejectModal, setRejectModal] = useState<{ id: string; studentName: string; amount: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [receiptModal, setReceiptModal] = useState<any>(null);

  // Fetch accountant dashboard data
  const { data: dashData, isLoading, refetch } = useQuery({
    queryKey: ['accountant-dashboard'],
    queryFn: () => financeApi.getAccountantDashboard().then(r => r.data?.data || r.data),
    refetchInterval: 30000, // auto-refresh every 30s for pending approvals
  });

  // Fetch pending payments queue
  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => financeApi.getPendingPayments().then(r => r.data?.data || r.data || []),
    refetchInterval: 30000,
  });
  const pendingPayments = Array.isArray(pendingData) ? pendingData : [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => financeApi.approvePayment(id),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Payment approved and posted');
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to approve payment'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      financeApi.rejectPayment(id, reason),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Payment rejected');
      setRejectModal(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reject payment'),
  });

  // Reverse mutation
  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      financeApi.reversePayment(id, reason),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Payment reversed');
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reverse payment'),
  });

  const d = dashData || {};
  const totals = d.totals || {};
  const pending = d.pending || {};
  const exceptions = d.exceptions || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign size={24} /> School Accountant Dashboard
          </h1>
          <p className="page-subtitle">
            Pending approvals, verified collections, and financial exceptions
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => { refetch(); refetchPending(); }}>
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(totals.totalInvoiced || 0)}
          icon={<FileText size={20} />}
          color="blue"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(totals.totalCollected || 0)}
          subtitle={`${totals.collectionRate || 0}% collection rate`}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(totals.totalOutstanding || 0)}
          icon={<AlertTriangle size={20} />}
          color="red"
        />
        <StatCard
          title="Pending Approvals"
          value={pending.pendingApprovalCount || 0}
          subtitle={formatCurrency(pending.pendingApprovalAmount || 0)}
          icon={<Clock size={20} />}
          color="amber"
        />
      </div>

      {/* Pending Payments Queue */}
      <div className="card border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Pending Approval Queue
              {pendingPayments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  {pendingPayments.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Class Master cash submissions and bank transfer verifications awaiting your action
            </p>
          </div>
        </div>

        {pendingPayments.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No pending payments</p>
            <p className="text-xs text-slate-400 mt-1">All submissions have been reviewed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Submitted By</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">
                        {p.invoice?.student ? `${p.invoice.student.firstName} ${p.invoice.student.lastName}` : '—'}
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        {p.invoice?.student?.admissionNumber || '—'}
                      </div>
                      {p.isClassMasterSubmission && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold">
                          CLASS MASTER
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="p-3">
                      <Badge
                        status={p.method === 'CASH' ? 'ACTIVE' : p.method === 'BANK_TRANSFER' ? 'PENDING' : 'INACTIVE'}
                        label={p.method?.replace('_', ' ') || '—'}
                      />
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[10px]">{p.reference || '—'}</td>
                    <td className="p-3 text-slate-600">
                      {p.isClassMasterSubmission ? 'Class Master' : 'Parent / Staff'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => approveMutation.mutate(p.id)}
                          disabled={approveMutation.isPending}
                          title="Approve & Post"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: p.id, studentName: p.invoice?.student ? `${p.invoice.student.firstName} ${p.invoice.student.lastName}` : 'Unknown', amount: p.amount })}
                          title="Reject"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Method Breakdown + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <div className="card p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" /> Payment Method Breakdown
          </h3>
          {(d.paymentMethodBreakdown || []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No posted payments yet</p>
          ) : (
            <div className="space-y-3">
              {(d.paymentMethodBreakdown || []).map((m: any) => {
                const total = (d.paymentMethodBreakdown || []).reduce((s: number, x: any) => s + (x.totalAmount || 0), 0);
                const pct = total ? Math.round((m.totalAmount / total) * 100) : 0;
                return (
                  <div key={m.method}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{m.method?.replace('_', ' ')}</span>
                      <span className="text-slate-500">{formatCurrency(m.totalAmount)} ({m.count} txns)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" /> Recent Posted Payments
          </h3>
          {(d.recentPayments || []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No recent payments</p>
          ) : (
            <div className="space-y-2">
              {(d.recentPayments || []).slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      p.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600' :
                      p.status === 'PENDING_ACCOUNTANT_APPROVAL' ? 'bg-amber-50 text-amber-600' :
                      'bg-slate-50 text-slate-400'
                    )}>
                      {p.status === 'POSTED' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{p.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.receiptNo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{formatCurrency(p.amount)}</p>
                    <p className="text-[10px] text-slate-400">{p.method?.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exceptions */}
      <div className="card p-6 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" /> Financial Exceptions
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-2xl font-black text-red-600">{exceptions.rejectedCount || 0}</p>
            <p className="text-xs text-red-700 font-semibold mt-1">Rejected</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <p className="text-2xl font-black text-amber-600">{exceptions.reversedCount || 0}</p>
            <p className="text-xs text-amber-700 font-semibold mt-1">Reversed</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-2xl font-black text-orange-600">{exceptions.overdueCount || 0}</p>
            <p className="text-xs text-orange-700 font-semibold mt-1">Overdue Invoices</p>
          </div>
        </div>
      </div>

      {/* Class Collection Performance */}
      {(d.classCollectionPerformance || []).length > 0 && (
        <div className="card p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-600" /> Class Collection Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-2.5">Class</th>
                  <th className="p-2.5 text-center">Students</th>
                  <th className="p-2.5 text-right">Invoiced</th>
                  <th className="p-2.5 text-right">Collected</th>
                  <th className="p-2.5 text-right">Outstanding</th>
                  <th className="p-2.5 text-center">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(d.classCollectionPerformance || []).map((c: any) => (
                  <tr key={c.classId} className="hover:bg-slate-50">
                    <td className="p-2.5 font-semibold text-slate-900">{c.className}</td>
                    <td className="p-2.5 text-center text-slate-600">{c.studentCount}</td>
                    <td className="p-2.5 text-right text-slate-700">{formatCurrency(c.totalInvoiced)}</td>
                    <td className="p-2.5 text-right text-emerald-600 font-semibold">{formatCurrency(c.totalCollected)}</td>
                    <td className="p-2.5 text-right text-red-500 font-semibold">{formatCurrency(c.totalOutstanding)}</td>
                    <td className="p-2.5 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        c.collectionRate >= 80 ? 'bg-emerald-50 text-emerald-700' :
                        c.collectionRate >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        {c.collectionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal
          open={!!rejectModal}
          onClose={() => { setRejectModal(null); setRejectReason(''); }}
          title="Reject Payment"
          className="max-w-md"
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-semibold text-red-900">
                Rejecting ₦{rejectModal.amount.toLocaleString()} from {rejectModal.studentName}
              </p>
              <p className="text-xs text-red-700 mt-1">
                The original submission will be preserved in the audit trail with your rejection reason.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Rejection Reason (required, min 5 characters) *
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                className="input w-full resize-none"
                placeholder="e.g. Amount does not match the receipt presented by the parent..."
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<X size={14} />}
                disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                loading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason.trim() })}
              >
                Reject Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
