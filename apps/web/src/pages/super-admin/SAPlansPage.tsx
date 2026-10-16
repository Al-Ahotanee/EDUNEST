import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, Check, Edit2, Users, School, Sparkles, DollarSign, 
  Building, ShieldCheck, Layers, FileSpreadsheet, AlertCircle,
  HelpCircle, ArrowUpRight
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

export default function SAPlansPage() {
  const qc = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    pricePerTerm: 0,
    pricePerYear: 0,
    maxStudents: 0,
    maxStaff: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sa-plans'],
    queryFn: () => api.get('/super-admin/plans').then((r) => r.data.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ plan, body }: { plan: string; body: any }) =>
      api.patch(`/super-admin/plans/${plan}`, body),
    onSuccess: () => {
      toast.success('Licensing tariff and quota limits successfully updated!');
      qc.invalidateQueries({ queryKey: ['sa-plans'] });
      setEditingPlan(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Tariff update failed'),
  });

  const plans = data || [];

  const handleOpenEdit = (p: any) => {
    setEditingPlan(p);
    setEditForm({
      pricePerTerm: p.pricePerTerm,
      pricePerYear: p.pricePerYear,
      maxStudents: p.maxStudents,
      maxStaff: p.maxStaff,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updateMut.mutate({
      plan: editingPlan.plan,
      body: editForm,
    });
  };

  const totalSubscribers = plans.reduce((acc: number, p: any) => acc + (p.activeSubscribers || 0), 0);
  const totalARR = plans.reduce((acc: number, p: any) => acc + (p.estimatedAnnualRevenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              <Layers size={13} /> Tariff Schedule
            </span>
            <span className="text-xs text-slate-500 font-medium">
              National Institutional Licensing Specifications
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            SaaS Licensing Packages & Tariff Schedule
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure institutional operating tiers, scholar capacity ceilings, billing tariffs, and entitlement modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            Currency: Nigerian Naira (NGN ₦)
          </span>
        </div>
      </div>

      {/* KPI Performance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subscribed Institutions</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalSubscribers}</p>
            <p className="text-xs text-slate-500 mt-1">Across all licensing tiers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <School size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contracted ARR Run-Rate</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">₦{totalARR.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Annual recurring license volume</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tier Options</p>
            <p className="text-3xl font-black text-purple-700 mt-1">4 Packages</p>
            <p className="text-xs text-slate-500 mt-1">Basic, Standard, Premium, Enterprise</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-600">Loading Tariff Registry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((p: any) => {
            const isEnterprise = p.plan === 'ENTERPRISE';
            return (
              <div
                key={p.plan}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isEnterprise
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-6">
                  {/* Badge & Edit Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        p.plan === 'BASIC'
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : p.plan === 'STANDARD'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : p.plan === 'PREMIUM'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {p.plan} TIER
                    </span>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Adjust Tariff Rates & Quotas"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[34px] leading-relaxed">{p.tagline}</p>

                  {/* Pricing Rate Box */}
                  <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        ₦{(p.pricePerYear || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ year</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1.5 flex justify-between pt-2 border-t border-slate-200">
                      <span>Per Academic Term:</span>
                      <strong className="text-slate-900">
                        ₦{(p.pricePerTerm || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Quota Limits */}
                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Student Capacity:</span>
                      <strong className="text-slate-900">
                        {p.maxStudents >= 999999 ? 'Unlimited Scholars' : `Up to ${p.maxStudents.toLocaleString()}`}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Staff Accounts:</span>
                      <strong className="text-slate-900">
                        {p.maxStaff >= 999999 ? 'Unlimited Staff' : `Up to ${p.maxStaff.toLocaleString()}`}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Subscribed Schools:</span>
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        {p.activeSubscribers} {p.activeSubscribers === 1 ? 'school' : 'schools'}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Entitlement Modules:
                    </p>
                    {p.features?.map((f: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors shadow-2xs"
                  >
                    Adjust Rates & Limits
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formal Tariff Revision Form Modal */}
      {editingPlan && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setEditingPlan(null)}
        >
          <div 
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  OFFICIAL TARIFF AMENDMENT
                </span>
                <h3 className="font-bold text-slate-900 text-lg mt-1">
                  Adjust {editingPlan.name} ({editingPlan.plan} Tier)
                </h3>
                <p className="text-xs text-slate-500">Update official licensing fees and institutional capacity quotas</p>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* SECTION 1: PRICING TARIF */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={13} className="text-emerald-600" /> SECTION 1: STATUTORY TARIFF RATES
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Annual License Rate (₦ / Year) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                      value={editForm.pricePerYear}
                      onChange={(e) =>
                        setEditForm({ ...editForm, pricePerYear: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">Applies to 12-month billing</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Termly Rate (₦ / Term) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                      value={editForm.pricePerTerm}
                      onChange={(e) =>
                        setEditForm({ ...editForm, pricePerTerm: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">Calculated per academic term (3 terms/yr)</span>
                  </div>
                </div>
              </fieldset>

              {/* SECTION 2: QUOTA CAPS */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={13} className="text-blue-600" /> SECTION 2: INSTITUTIONAL QUOTA CEILINGS
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Max Student Quota <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                      value={editForm.maxStudents}
                      onChange={(e) =>
                        setEditForm({ ...editForm, maxStudents: parseInt(e.target.value, 10) || 0 })
                      }
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">Use 999999 for unlimited</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Max Staff Quota <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                      value={editForm.maxStaff}
                      onChange={(e) =>
                        setEditForm({ ...editForm, maxStaff: parseInt(e.target.value, 10) || 0 })
                      }
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">Use 999999 for unlimited</span>
                  </div>
                </div>
              </fieldset>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {updateMut.isPending ? 'Updating Tariff...' : 'Confirm & Save Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
