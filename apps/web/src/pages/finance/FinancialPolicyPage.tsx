import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Settings, Shield, Save, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { Button, StatCard } from '../../components/ui';
import { financeApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

/**
 * FinancialPolicyPage — School Admin configures the tenant's financial policy.
 *
 * Controls:
 *   - Class Master collection mode (View Only vs. Record + Approve)
 *   - Class Master cash limit
 *   - Online payments toggle
 *   - Transfer reference submission
 *   - Refund approval requirements
 *   - Due date + overdue thresholds
 */
export default function FinancialPolicyPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<any>({});
  const [loaded, setLoaded] = useState(false);

  const { data: policyData, isLoading } = useQuery({
    queryKey: ['financial-policy'],
    queryFn: () => financeApi.getPolicy().then(r => r.data?.data || r.data),
    onSuccess: (data) => {
      if (data && !loaded) {
        setForm(data);
        setLoaded(true);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => financeApi.updatePolicy(data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Financial policy updated');
      setForm(res.data?.data || form);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update policy'),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  if (isLoading && !loaded) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings size={24} /> Financial Policy & Settings
          </h1>
          <p className="page-subtitle">
            Configure how your school handles fee collection, Class Master permissions, and payment approvals
          </p>
        </div>
      </div>

      {/* Class Master Collection Policy */}
      <div className="card p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-900">Class Master Collection Policy</h3>
        </div>
        <p className="text-xs text-slate-500">
          Controls whether Class Masters can record cash payments from parents, or only view financial information
          for their assigned classes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className={`
            flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
            ${form.classMasterCollectionMode === 'VIEW_ONLY'
              ? 'border-blue-600 bg-blue-50/70' : 'border-slate-200 hover:border-slate-300'}
          `}>
            <input
              type="radio"
              name="collectionMode"
              checked={form.classMasterCollectionMode === 'VIEW_ONLY'}
              onChange={() => set('classMasterCollectionMode', 'VIEW_ONLY')}
              className="mt-1 text-blue-600"
            />
            <div>
              <p className="font-bold text-sm text-slate-900">View Only</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Class Masters can view their class's financial records but cannot record or submit
                payment transactions. Only the School Accountant can record payments.
              </p>
            </div>
          </label>

          <label className={`
            flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
            ${form.classMasterCollectionMode === 'RECORD_PENDING'
              ? 'border-blue-600 bg-blue-50/70' : 'border-slate-200 hover:border-slate-300'}
          `}>
            <input
              type="radio"
              name="collectionMode"
              checked={form.classMasterCollectionMode === 'RECORD_PENDING'}
              onChange={() => set('classMasterCollectionMode', 'RECORD_PENDING')}
              className="mt-1 text-blue-600"
            />
            <div>
              <p className="font-bold text-sm text-slate-900">Record Cash Payments (Accountant Approval Required)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Class Masters can record cash received from parents. Each submission is saved as
                <strong> Pending Accountant Approval</strong> — the official balance only updates
                when the School Accountant approves it.
              </p>
            </div>
          </label>
        </div>

        {/* Cash Limit (only relevant if RECORD_PENDING) */}
        {form.classMasterCollectionMode === 'RECORD_PENDING' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              Class Master Cash Limit (₦)
            </label>
            <p className="text-xs text-amber-700 mb-2">
              Maximum cash payment a Class Master can record without escalation. Set to 0 for no limit.
            </p>
            <input
              type="number"
              value={form.classMasterCashLimit || 0}
              onChange={e => set('classMasterCashLimit', Number(e.target.value))}
              className="input w-48"
              placeholder="0 = no limit"
            />
          </div>
        )}
      </div>

      {/* Payment Channels */}
      <div className="card p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={18} className="text-emerald-600" />
          <h3 className="font-bold text-slate-900">Payment Channels</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
            <div>
              <p className="font-semibold text-sm text-slate-900">Online Payments (Paystack)</p>
              <p className="text-xs text-slate-500">
                Allow parents to pay online via Paystack. Requires PAYSTACK_SECRET_KEY + PAYSTACK_PUBLIC_KEY env vars.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.onlinePaymentsEnabled || false}
              onChange={e => set('onlinePaymentsEnabled', e.target.checked)}
              className="w-5 h-5 rounded text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
            <div>
              <p className="font-semibold text-sm text-slate-900">Bank Transfer Reference Submission</p>
              <p className="text-xs text-slate-500">
                Allow parents to submit bank transfer references for manual verification by the School Accountant.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.allowTransferReferenceSubmission ?? true}
              onChange={e => set('allowTransferReferenceSubmission', e.target.checked)}
              className="w-5 h-5 rounded text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
            <div>
              <p className="font-semibold text-sm text-slate-900">Provisional Acknowledgements</p>
              <p className="text-xs text-slate-500">
                Allow Class Masters to issue provisional payment acknowledgements (not official receipts).
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.allowProvisionalAcknowledgement || false}
              onChange={e => set('allowProvisionalAcknowledgement', e.target.checked)}
              className="w-5 h-5 rounded text-blue-600"
            />
          </label>
        </div>
      </div>

      {/* Invoice & Due Date Settings */}
      <div className="card p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-purple-600" />
          <h3 className="font-bold text-slate-900">Invoice & Due Date Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Default Due Date (days from issue)
            </label>
            <input
              type="number"
              value={form.defaultDueDateDays ?? 30}
              onChange={e => set('defaultDueDateDays', Number(e.target.value))}
              className="input w-full"
              min={1}
              max={365}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Overdue Threshold (days past due)
            </label>
            <input
              type="number"
              value={form.overdueThresholdDays ?? 7}
              onChange={e => set('overdueThresholdDays', Number(e.target.value))}
              className="input w-full"
              min={0}
              max={90}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Refund Approval
            </label>
            <select
              value={form.refundsRequirePrincipalApproval ? 'yes' : 'no'}
              onChange={e => set('refundsRequirePrincipalApproval', e.target.value === 'yes')}
              className="input w-full"
            >
              <option value="yes">Principal approval required</option>
              <option value="no">Accountant can approve</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          icon={<Save size={16} />}
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate({
            classMasterCollectionMode: form.classMasterCollectionMode,
            allowProvisionalAcknowledgement: form.allowProvisionalAcknowledgement,
            onlinePaymentsEnabled: form.onlinePaymentsEnabled,
            allowTransferReferenceSubmission: form.allowTransferReferenceSubmission,
            defaultDueDateDays: form.defaultDueDateDays,
            overdueThresholdDays: form.overdueThresholdDays,
            refundsRequirePrincipalApproval: form.refundsRequirePrincipalApproval,
            classMasterCashLimit: form.classMasterCashLimit,
          })}
        >
          Save Financial Policy
        </Button>
      </div>
    </div>
  );
}
