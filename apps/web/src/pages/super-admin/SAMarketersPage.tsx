import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Users, ToggleLeft, ToggleRight, Copy, 
  Briefcase, Percent, DollarSign, Award, CheckCircle2,
  Phone, Mail, ShieldCheck, UserCheck, Lock
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function SAMarketersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    password: '', 
    commissionRate: '5' 
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sa-marketers', search],
    queryFn: () => api.get('/super-admin/marketers', { params: { search } }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/super-admin/marketers', d),
    onSuccess: () => { 
      toast.success('Marketing Partner commissioned successfully!'); 
      qc.invalidateQueries({ queryKey: ['sa-marketers'] }); 
      setShowAdd(false); 
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', commissionRate: '5' }); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create marketer'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/marketers/${id}/toggle`),
    onSuccess: () => { 
      toast.success('Partner status updated'); 
      qc.invalidateQueries({ queryKey: ['sa-marketers'] }); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Status toggle failed'),
  });

  const marketers = data?.data || [];

  const copyCode = (code: string) => { 
    navigator.clipboard.writeText(code); 
    toast.success(`Referral token "${code}" copied to clipboard!`); 
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ ...form, commissionRate: parseFloat(form.commissionRate) });
  };

  return (
    <div className="space-y-6">
      {/* Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              <Briefcase size={13} /> Acquisition Network
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Commercial Partners & Institutional Referral Channels
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Marketing Partners & Agency Roster
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage authorized educational acquisition agents, statutory referral tokens, and commission entitlement schedules.
          </p>
        </div>

        <button 
          onClick={() => setShowAdd(true)} 
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
        >
          <Plus size={15} /> Commission Marketing Partner
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Search partners by name, email, or token..."
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Enterprise Partners Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Acquisition Partner</th>
                <th className="px-6 py-3.5">Referral Token</th>
                <th className="px-6 py-3.5">Commission Tariff</th>
                <th className="px-6 py-3.5">Accredited Referrals</th>
                <th className="px-6 py-3.5">Cumulative Remitted</th>
                <th className="px-6 py-3.5">Partner Standing</th>
                <th className="px-6 py-3.5 text-right">Commission Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <div className="inline-block w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-semibold">Accessing Agency Partner Roster...</p>
                  </td>
                </tr>
              ) : marketers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <Users size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No Acquisition Partners Found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No commercial partners match your search query.
                    </p>
                  </td>
                </tr>
              ) : marketers.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 text-xs font-black shadow-2xs">
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-slate-500">{m.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                      <code className="text-xs font-mono font-bold text-blue-700">{m.referralCode}</code>
                      <button 
                        onClick={() => copyCode(m.referralCode)} 
                        className="text-slate-400 hover:text-blue-700 transition-colors"
                        title="Copy Token"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                      {m.commissionRate}% Per Billing
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 text-sm">{m.totalReferrals || 0}</span>
                    <span className="text-xs text-slate-500 ml-1">institutions</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-black text-slate-900 text-sm">
                      ₦{(m.totalEarnings || 0).toLocaleString()}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      m.isActive 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      {m.isActive ? 'Active License' : 'Deactivated'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleMut.mutate(m.id)} 
                      className="text-slate-400 hover:text-slate-800 transition-colors"
                      title={m.isActive ? 'Deactivate Partner' : 'Activate Partner'}
                    >
                      {m.isActive ? (
                        <ToggleRight size={26} className="text-emerald-600 inline-block" />
                      ) : (
                        <ToggleLeft size={26} className="text-slate-400 inline-block" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formal Marketing Agency Commission Agreement Modal */}
      {showAdd && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" 
          onClick={() => setShowAdd(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-300 w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                  STATUTORY AGENCY APPOINTMENT
                </span>
                <h3 className="font-bold text-slate-900 text-lg mt-1 flex items-center gap-2">
                  <Briefcase size={18} className="text-purple-600" />
                  Commission Marketing Partner
                </h3>
                <p className="text-xs text-slate-500">Create agency profile and issue unique referral clearance token</p>
              </div>
              <button 
                onClick={() => setShowAdd(false)} 
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* SECTION 1: PARTNER BIODATA */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={13} className="text-blue-600" /> SECTION 1: PARTNER BIODATA
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" 
                      placeholder="e.g. Femi"
                      value={form.firstName} 
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" 
                      placeholder="e.g. Alabi"
                      value={form.lastName} 
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    required 
                    type="email" 
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" 
                    placeholder="partner@agency.com"
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Telephone Contact
                  </label>
                  <input 
                    type="tel" 
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" 
                    placeholder="+234..."
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                  />
                </div>
              </fieldset>

              {/* SECTION 2: COMMISSION TARIFF & CREDENTIALS */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent size={13} className="text-emerald-600" /> SECTION 2: TARIFF & CREDENTIALS
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Commission Rate (%) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="50" 
                      step="0.5" 
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold" 
                      value={form.commissionRate} 
                      onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} 
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: 5.0%</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      type="password" 
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" 
                      placeholder="••••••••"
                      value={form.password} 
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                    />
                  </div>
                </div>
              </fieldset>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={createMut.isPending} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {createMut.isPending ? 'Commissioning...' : 'Commission Marketing Partner'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAdd(false)} 
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
