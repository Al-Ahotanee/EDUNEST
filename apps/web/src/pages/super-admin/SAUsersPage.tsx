import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserPlus, Search, Shield, Trash2, Mail, Phone, Calendar, 
  Key, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle,
  RotateCcw, Lock
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/utils';

export default function SAUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sa-users', search],
    queryFn: () => api.get('/super-admin/users', { params: { search } }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/super-admin/users', d),
    onSuccess: () => {
      toast.success('Platform SuperAdministrator commissioned successfully!');
      qc.invalidateQueries({ queryKey: ['sa-users'] });
      setShowAddModal(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to appoint user'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/super-admin/users/${id}`),
    onSuccess: () => {
      toast.success('SuperAdministrator privileges revoked');
      qc.invalidateQueries({ queryKey: ['sa-users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Revocation failed'),
  });

  const users = data?.data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(form);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Confirm revocation of Platform SuperAdministrator governance access for "${name}"?`)) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              <ShieldCheck size={13} /> Root Governance Roster
            </span>
            <span className="text-xs text-slate-500 font-medium">
              SaaS Central Authority & Identity Management
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Platform Staff & SuperAdministrators
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage authorized system operators holding omni-tenant cross-institutional administrative credentials.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
        >
          <UserPlus size={15} /> Appoint Platform SuperAdmin
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Search roster by administrator name, email, or telephone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Enterprise Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Authorized Administrator</th>
                <th className="px-6 py-3.5">Governance Level</th>
                <th className="px-6 py-3.5">Verified Contact</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Commissioned Date</th>
                <th className="px-6 py-3.5 text-right">Revocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="inline-block w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-semibold">Accessing Root Operator Directory...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Shield size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No Administrators Found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No platform administrators matched your search query.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-black flex-shrink-0 shadow-2xs">
                          {u.firstName?.[0]}
                          {u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <ShieldCheck size={13} /> Platform SuperAdmin
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      <p className="flex items-center gap-1 font-medium">
                        <Phone size={12} className="text-slate-400" />
                        {u.phone || 'Direct line not supplied'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Active Commission
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(u.id, `${u.firstName} ${u.lastName}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                        title="Revoke SuperAdmin Credentials"
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formal Appointment of Platform SuperAdmin Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  STATUTORY APPOINTMENT DOCKET
                </span>
                <h3 className="font-bold text-slate-900 text-lg mt-1 flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-600" />
                  Appoint Platform SuperAdministrator
                </h3>
                <p className="text-xs text-slate-500">Commission root cross-tenant governance authority</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* SECTION 1: APPOINTEE BIODATA */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={13} className="text-blue-600" /> SECTION 1: APPOINTEE LEGAL IDENTIFICATION
                </legend>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      First / Given Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                      placeholder="e.g. Samuel"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Surname / Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                      placeholder="e.g. Adeyemi"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Official Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                    placeholder="governance@schoolerp.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Direct Contact Telephone
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                    placeholder="+234 800 000 0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </fieldset>

              {/* SECTION 2: ACCESS CREDENTIALS */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={13} className="text-purple-600" /> SECTION 2: SECURITY & CRYPTOGRAPHIC ACCESS
                </legend>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Initial Master Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Appointee will be prompted to establish two-factor authentication upon initial login.
                  </span>
                </div>
              </fieldset>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {createMut.isPending ? 'Commissioning...' : 'Issue Warrant & Appoint Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
