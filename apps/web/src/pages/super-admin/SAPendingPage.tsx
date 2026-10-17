import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle2, XCircle, FileText, Eye, Clock, ShieldCheck, 
  Building2, ExternalLink, AlertTriangle, ArrowRight, UserCheck, 
  MapPin, Mail, Phone, Calendar, CheckSquare, Layers, Award,
  Sparkles, Search, Filter
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/utils';

export default function SAPendingPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [clearanceModalSchool, setClearanceModalSchool] = useState<any>(null);
  const [rejectModalSchool, setRejectModalSchool] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [certifyCompliance, setCertifyCompliance] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sa-pending-list'],
    queryFn: () => api.get('/super-admin/tenants/pending').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/tenants/${id}/approve`),
    onSuccess: () => { 
      toast.success('Accreditation granted! School license activated successfully.'); 
      qc.invalidateQueries({ queryKey: ['sa-pending-list'] }); 
      setClearanceModalSchool(null);
      setCertifyCompliance(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Accreditation action failed'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      api.patch(`/super-admin/tenants/${id}/suspend`),
    onSuccess: () => { 
      toast.success('Application docket rejected and archived'); 
      qc.invalidateQueries({ queryKey: ['sa-pending-list'] }); 
      setRejectModalSchool(null);
      setRejectionReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Action failed'),
  });

  const pendingList = (data || []).filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.slug?.toLowerCase().includes(q) ||
      t.adminEmail?.toLowerCase().includes(q) ||
      t.state?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Official Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
              <Clock size={13} /> Accreditation & KYC Desk
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Statutory Documentation Verification Desk
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Accreditation Review Docket
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Audit newly submitted school registrations, inspect educational permits, verify CAC filings, and sanction operational licenses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Pending Adjudication
            </span>
            <span className="text-xl font-black text-amber-900">
              {pendingList.length} {pendingList.length === 1 ? 'Application' : 'Applications'}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar for Pending Applications */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Filter docket by school name, state, or applicant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Review Queue */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-600">Accessing Accreditation Docket...</p>
        </div>
      ) : pendingList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-xs">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Accreditation Docket Cleared</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
            All submitted school applications have been reviewed and adjudicated. New registrations will automatically appear here for statutory clearance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingList.map((t: any) => (
            <div 
              key={t.id} 
              className="bg-white rounded-2xl border border-amber-200 shadow-xs hover:shadow-md transition-all overflow-hidden"
            >
              {/* Header Strip */}
              <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    DOCKET #ACC-{t.id?.slice(0, 8)?.toUpperCase()}
                  </span>
                  <span className="text-slate-500">
                    Application Filed: <strong className="text-slate-700">{formatDate(t.createdAt)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    Requested Tier: {t.subscriptionPlan || 'STANDARD'}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Pending Clearance
                  </span>
                </div>
              </div>

              {/* Main Content Body */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left: School & Administrator Identity */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-2xl flex-shrink-0 shadow-xs">
                      {t.name ? t.name[0] : 'S'}
                    </div>
                    <div className="space-y-3 flex-1">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{t.name}</h2>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Assigned Portal Tenant ID: <strong className="text-slate-800">/{t.slug}</strong>
                        </p>
                      </div>

                      {/* Structured Biodata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Principal Applicant</span>
                          <span className="font-bold text-slate-800">{t.adminName || 'Designated Administrator'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Official Email</span>
                          <span className="font-semibold text-blue-700 truncate block">{t.adminEmail}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Contact Telephone</span>
                          <span className="font-semibold text-slate-800">{t.phone || 'Not Recorded'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">State / Territory</span>
                          <span className="font-semibold text-slate-800">{t.state || 'Unspecified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">City / LGA</span>
                          <span className="font-semibold text-slate-800">{t.city || 'Central Area'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Referring Agent</span>
                          <span className="font-semibold text-slate-800">
                            {t.marketer ? `${t.marketer.firstName} (${t.marketer.referralCode})` : 'Direct Portal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Adjudication Decision Buttons */}
                  <div className="flex flex-col gap-2.5 w-full lg:w-48 flex-shrink-0">
                    <button
                      onClick={() => setClearanceModalSchool(t)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
                    >
                      <CheckCircle2 size={15} /> Grant Accreditation
                    </button>

                    <button
                      onClick={() => setRejectModalSchool(t)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <XCircle size={15} /> Reject / Query
                    </button>
                  </div>
                </div>

                {/* Submitted KYC Credentials Verification Bar */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-blue-600" />
                    Statutory Clearance Verification Checklist
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Ministry Approval Letter */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Ministry Approval</p>
                          <p className="text-[10px] text-slate-500">Government Operating Permit</p>
                        </div>
                      </div>
                      {t.ministryApprovalDoc ? (
                        <a
                          href={t.ministryApprovalDoc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Inspect <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                          Not Provided
                        </span>
                      )}
                    </div>

                    {/* CAC Certificate */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-purple-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">CAC Certificate</p>
                          <p className="text-[10px] text-slate-500">Corporate Incorporation</p>
                        </div>
                      </div>
                      {t.cacDocument ? (
                        <a
                          href={t.cacDocument}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Inspect <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                          Not Provided
                        </span>
                      )}
                    </div>

                    {/* Proof of Address */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Campus Inspection</p>
                          <p className="text-[10px] text-slate-500">Physical Verification</p>
                        </div>
                      </div>
                      {t.proofOfAddress ? (
                        <a
                          href={t.proofOfAddress}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Inspect <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                          Not Provided
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grant Formal Accreditation Modal */}
      {clearanceModalSchool && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" 
          onClick={() => setClearanceModalSchool(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-300 w-full max-w-lg shadow-2xl space-y-5 p-6 animate-in fade-in zoom-in-95 duration-150" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Sanction Operating Accreditation</h3>
                  <p className="text-xs text-slate-500">{clearanceModalSchool.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setClearanceModalSchool(null)} 
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Formal Certificate Preview Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200 font-semibold">
                <span className="text-slate-500">Institution:</span>
                <span className="text-slate-900">{clearanceModalSchool.name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 font-semibold">
                <span className="text-slate-500">Subscribed Tier:</span>
                <span className="text-blue-700 font-bold">{clearanceModalSchool.subscriptionPlan || 'STANDARD'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 font-semibold">
                <span className="text-slate-500">Principal Signatory:</span>
                <span className="text-slate-900">{clearanceModalSchool.adminEmail}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">License Status After Clearance:</span>
                <span className="text-emerald-700 font-bold">ACTIVE & LICENSED</span>
              </div>
            </div>

            {/* Statutory Compliance Checkbox */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="certify"
                checked={certifyCompliance}
                onChange={(e) => setCertifyCompliance(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="certify" className="text-xs text-slate-700 font-medium cursor-pointer">
                <strong>Statutory Adjudication Confirmation:</strong> I confirm that the submitted identity, institutional credentials, and regulatory permits have been duly reviewed and validated in accordance with SaaS Platform Governance Guidelines.
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={!certifyCompliance || approveMut.isPending}
                onClick={() => approveMut.mutate(clearanceModalSchool.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                {approveMut.isPending ? 'Activating License...' : 'Confirm & Issue Operating License'}
              </button>

              <button
                type="button"
                onClick={() => setClearanceModalSchool(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectModalSchool && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" 
          onClick={() => setRejectModalSchool(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-300 w-full max-w-md shadow-2xl space-y-4 p-6 animate-in fade-in zoom-in-95 duration-150" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Reject Accreditation Docket</h3>
                  <p className="text-xs text-slate-500">{rejectModalSchool.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setRejectModalSchool(null)} 
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Statutory Reason for Rejection / Formal Query
              </label>
              <textarea
                rows={3}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                placeholder="Specify regulatory non-compliance, missing Ministry permit, or illegible CAC documentation..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={rejectMut.isPending}
                onClick={() => rejectMut.mutate({ id: rejectModalSchool.id, reason: rejectionReason })}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <XCircle size={14} />
                {rejectMut.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                type="button"
                onClick={() => setRejectModalSchool(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
