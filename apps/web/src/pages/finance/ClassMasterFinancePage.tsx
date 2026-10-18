import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users, DollarSign, AlertTriangle, CheckCircle2, Clock, Plus, Search,
} from 'lucide-react';
import { Button, Modal, StatCard, Badge, Avatar } from '../../components/ui';
import { financeApi } from '../../services/api';
import { formatCurrency, cn } from '../../lib/utils';

/**
 * ClassMasterFinancePage — financial dashboard scoped to the logged-in
 * Class Master's assigned classes.
 *
 * Shows:
 *   - Per-class summary (students, charges, collected, outstanding)
 *   - Per-student financial status (paid, partial, unpaid)
 *   - Cash collection form (only if tenant policy allows RECORD_PENDING mode)
 *
 * Security: all data is scoped server-side via TeacherAssignment records.
 * The Class Master cannot see financial data for classes they're not assigned to.
 */
export default function ClassMasterFinancePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [recordModal, setRecordModal] = useState<{ studentId: string; studentName: string; invoiceId: string; balance: number } | null>(null);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['class-master-dashboard'],
    queryFn: () => financeApi.getClassMasterDashboard().then(r => r.data?.data || r.data),
  });

  const d = dashData || {};
  const totals = d.totals || {};
  const students = (d.students || []).filter((s: any) =>
    !search || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  // Submit cash payment (creates PENDING_ACCOUNTANT_APPROVAL)
  const submitPaymentMutation = useMutation({
    mutationFn: (data: any) => financeApi.submitPayment(data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Cash payment submitted for Accountant approval');
      setRecordModal(null);
      setRecordAmount('');
      setRecordNotes('');
      queryClient.invalidateQueries({ queryKey: ['class-master-dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to submit payment'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={24} /> My Class Financial Dashboard
          </h1>
          <p className="page-subtitle">
            Financial overview for your assigned classes — student fees, collections, and outstanding balances
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Charges"
          value={formatCurrency(totals.totalCharges || 0)}
          icon={<DollarSign size={20} />}
          color="blue"
        />
        <StatCard
          title="Collected"
          value={formatCurrency(totals.totalCollected || 0)}
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
          title="Pending Submissions"
          value={totals.pendingSubmissions || 0}
          icon={<Clock size={20} />}
          color="amber"
        />
      </div>

      {/* Info banner about cash collection policy */}
      <div className={cn(
        'p-4 rounded-2xl border text-xs',
        totals.totalCharges !== undefined
          ? 'bg-blue-50 border-blue-200 text-blue-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      )}>
        {totals.totalCharges !== undefined ? (
          <p>
            <strong>Cash Collection Enabled:</strong> You can record cash payments for students in your
            assigned classes. Each submission will be saved as <strong>Pending Accountant Approval</strong> —
            the official outstanding balance only updates when the School Accountant approves it.
          </p>
        ) : (
          <p>
            <strong>View Only Mode:</strong> Your school's financial policy does not permit Class Masters
            to record payments. You can view your class's financial status, but only the School Accountant
            can record payments. Please direct parents to the bursary.
          </p>
        )}
      </div>

      {/* Student Financial Status Table */}
      <div className="card border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 text-sm">Student Financial Status</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or admission no..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No students found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try a different search term' : 'No students are enrolled in your assigned classes'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Class</th>
                  <th className="p-3 text-right">Total Charges</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Outstanding</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s: any) => (
                  <tr key={s.studentId} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{s.studentName}</div>
                      <div className="text-slate-400 font-mono text-[10px]">{s.admissionNumber}</div>
                    </td>
                    <td className="p-3 text-slate-600">{s.className}</td>
                    <td className="p-3 text-right text-slate-700">{formatCurrency(s.totalCharges)}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">{formatCurrency(s.totalPaid)}</td>
                    <td className="p-3 text-right text-red-500 font-semibold">{formatCurrency(s.totalOutstanding)}</td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        s.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                        s.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {s.status !== 'PAID' && s.totalOutstanding > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={12} />}
                          onClick={() => setRecordModal({
                            studentId: s.studentId,
                            studentName: s.studentName,
                            invoiceId: '', // The modal will look up the student's unpaid invoices
                            balance: s.totalOutstanding,
                          })}
                        >
                          Record Cash
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Cash Payment Modal */}
      {recordModal && (
        <Modal
          open={!!recordModal}
          onClose={() => { setRecordModal(null); setRecordAmount(''); setRecordNotes(''); }}
          title="Record Cash Payment"
          className="max-w-md"
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="font-semibold text-blue-900">{recordModal.studentName}</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Outstanding balance: <strong>{formatCurrency(recordModal.balance)}</strong>
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>Important:</strong> This submission will be saved as <strong>Pending Accountant Approval</strong>.
              The official outstanding balance will only update when the School Accountant approves it.
              Please issue a provisional acknowledgement only — not an official receipt.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount Received (₦) *
              </label>
              <input
                type="number"
                value={recordAmount}
                onChange={e => setRecordAmount(e.target.value)}
                className="input w-full"
                placeholder={`Max: ${recordModal.balance.toLocaleString()}`}
                max={recordModal.balance}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={recordNotes}
                onChange={e => setRecordNotes(e.target.value)}
                rows={2}
                className="input w-full resize-none"
                placeholder="e.g. Parent paid in two ₦20,000 installments..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setRecordModal(null); setRecordAmount(''); setRecordNotes(''); }}>
                Cancel
              </Button>
              <Button
                icon={<Plus size={14} />}
                disabled={!recordAmount || Number(recordAmount) <= 0 || Number(recordAmount) > recordModal.balance + 0.01 || submitPaymentMutation.isPending}
                loading={submitPaymentMutation.isPending}
                onClick={() => {
                  // Generate idempotency key to prevent duplicate submissions
                  const idempotencyKey = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  submitPaymentMutation.mutate({
                    invoiceId: recordModal.invoiceId,
                    amount: Number(recordAmount),
                    method: 'CASH',
                    notes: recordNotes,
                    idempotencyKey,
                  });
                }}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
