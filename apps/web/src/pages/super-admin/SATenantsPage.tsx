import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Building2, CheckCircle2, XCircle, Eye, RefreshCw, 
  AlertTriangle, Filter, RotateCcw, ChevronLeft, ChevronRight,
  FileText, ShieldCheck, Mail, Phone, MapPin, Award, Layers,
  ExternalLink, Check, AlertOctagon, UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/utils';

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  ACTIVE: { 
    label: 'Licensed & Active', 
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
    dot: 'bg-emerald-500' 
  },
  PENDING_APPROVAL: { 
    label: 'Awaiting Accreditation', 
    badge: 'bg-amber-50 text-amber-800 border-amber-200', 
    dot: 'bg-amber-500' 
  },
  SUSPENDED: { 
    label: 'Suspended / Revoked', 
    badge: 'bg-rose-50 text-rose-800 border-rose-200', 
    dot: 'bg-rose-500' 
  },
  EXPIRED: { 
    label: 'License Expired', 
    badge: 'bg-slate-100 text-slate-700 border-slate-300', 
    dot: 'bg-slate-400' 
  },
};

const PLAN_BADGES: Record<string, string> = {
  BASIC: 'bg-slate-100 text-slate-700 border-slate-200',
  STANDARD: 'bg-blue-50 text-blue-700 border-blue-200',
  PREMIUM: 'bg-purple-50 text-purple-700 border-purple-200',
  ENTERPRISE: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
};

export default function SATenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sa-tenants', search, status, plan, page, limit],
    queryFn: () => 
      api.get('/super-admin/tenants', { 
        params: { search, status, plan, page, limit } 
      }).then(r => r.data),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/tenants/${id}/approve`),
    onSuccess: () => { 
      toast.success('Institution cleared and operating license activated!'); 
      qc.invalidateQueries({ queryKey: ['sa-tenants'] }); 
      setSelected(null); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Accreditation approval failed'),
  });

  const suspendMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/tenants/${id}/suspend`),
    onSuccess: () => { 
      toast.success('School license suspended'); 
      qc.invalidateQueries({ queryKey: ['sa-tenants'] }); 
      setSelected(null); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Suspension failed'),
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.patch(`/super-admin/tenants/${id}/reactivate`),
    onSuccess: () => { 
      toast.success('School license restored to active standing'); 
      qc.invalidateQueries({ queryKey: ['sa-tenants'] }); 
      setSelected(null); 
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Reactivation failed'),
  });

  const tenants = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1, hasNextPage: false };

  const hasActiveFilters = Boolean(search || status || plan);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPlan('');
    setPage(1);
  };

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, meta.total);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              <Building2 size={13} /> Institutional Registry
            </span>
            <span className="text-xs text-slate-500 font-medium">
              National Accreditation & Multi-Tenant Partitioning
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Accredited Educational Institutions
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Maintain regulatory oversight, license standing, quota enforcement, and statutory records across all schools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Entities</span>
            <span className="text-xl font-black text-slate-900">{meta.total} Registered</span>
          </div>
        </div>
      </div>

      {/* Multi-Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              placeholder="Search by school name, slug, administrator email, state..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pl-1">
              <Filter size={14} /> Filter:
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by accreditation status"
              className="bg-slate-50 hover:bg-white border border-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Accreditation Statuses</option>
              <option value="ACTIVE">Licensed & Active</option>
              <option value="PENDING_APPROVAL">Pending Clearance</option>
              <option value="SUSPENDED">Suspended / Probation</option>
            </select>

            <select
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by subscription tier"
              className="bg-slate-50 hover:bg-white border border-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Licensing Tiers</option>
              <option value="BASIC">Basic Tier</option>
              <option value="STANDARD">Standard Tier</option>
              <option value="PREMIUM">Premium Tier</option>
              <option value="ENTERPRISE">Enterprise Tier</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                title="Reset all search filters"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-600">Active Criteria:</span>
            {search && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                Search: "{search}"
              </span>
            )}
            {status && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                Status: {status}
              </span>
            )}
            {plan && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                Tier: {plan}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Enterprise Institutional Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Educational Entity</th>
                <th className="px-6 py-3.5">Principal Administrator</th>
                <th className="px-6 py-3.5">Licensing Tier</th>
                <th className="px-6 py-3.5">Accreditation Status</th>
                <th className="px-6 py-3.5">Incorporation Date</th>
                <th className="px-6 py-3.5 text-right">Official Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="inline-block w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-semibold">Accessing Institutional Registry...</p>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Building2 size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No Educational Institutions Found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasActiveFilters 
                        ? 'No schools match the specified search parameters. Try resetting your filters.'
                        : 'No school registrations have been submitted to the platform yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <RotateCcw size={12} /> Clear Filter Criteria
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                tenants.map((t: any) => {
                  const statusCfg = STATUS_CONFIG[t.subscriptionStatus] || STATUS_CONFIG.ACTIVE;
                  const adminUser = t.users?.[0];
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* School Name & Slug */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-sm flex-shrink-0 shadow-2xs">
                            {t.name ? t.name[0] : 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{t.name}</p>
                            <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="text-slate-400">slug:</span> /{t.slug}
                              {t.state && (
                                <span className="text-slate-400 font-sans ml-1">· {t.state}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Principal Administrator */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : (t.adminName || 'Designated School Admin')}
                        </p>
                        <p className="text-xs text-slate-500">{adminUser?.email || t.adminEmail || '—'}</p>
                      </td>

                      {/* Subscription Plan Tier */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs border ${PLAN_BADGES[t.subscriptionPlan] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {t.subscriptionPlan}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {formatDate(t.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelected(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
                            title="Inspect Institutional Dossier"
                          >
                            <Eye size={13} /> Dossier
                          </button>

                          {t.subscriptionStatus === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => approveMut.mutate(t.id)}
                              disabled={approveMut.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors disabled:opacity-50"
                              title="Accredit Institution"
                            >
                              <CheckCircle2 size={13} /> Clear
                            </button>
                          )}

                          {t.subscriptionStatus === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                if (confirm(`Confirm suspension of operating license for "${t.name}"?`)) {
                                  suspendMut.mutate(t.id);
                                }
                              }}
                              disabled={suspendMut.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                              title="Suspend License"
                            >
                              <XCircle size={13} /> Suspend
                            </button>
                          )}

                          {t.subscriptionStatus === 'SUSPENDED' && (
                            <button
                              onClick={() => reactivateMut.mutate(t.id)}
                              disabled={reactivateMut.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                              title="Restore Operating License"
                            >
                              <RefreshCw size={13} /> Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900">{meta.total > 0 ? startRecord : 0}</strong> to{' '}
              <strong className="text-slate-900">{endRecord}</strong> of{' '}
              <strong className="text-slate-900">{meta.total}</strong> registered institutions
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-slate-500">Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Results per page"
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Numbered Jump Buttons */}
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {Array.from({ length: meta.totalPages || 1 }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-colors ${
                        page === p
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              disabled={!meta.hasNextPage && page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Official Institutional Accreditation Dossier Modal */}
      {selected && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" 
          onClick={() => setSelected(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-300 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6 animate-in fade-in zoom-in-95 duration-150" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-xl shadow-2xs">
                  {selected.name ? selected.name[0] : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      OFFICIAL DOSSIER #SCH-{selected.id?.slice(0, 8)?.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_CONFIG[selected.subscriptionStatus]?.badge}`}>
                      {STATUS_CONFIG[selected.subscriptionStatus]?.label}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">{selected.name}</h3>
                  <p className="text-xs text-slate-500">
                    Tenant Identification: <span className="font-mono font-semibold text-slate-700">/{selected.slug}</span> · Registration Date: {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelected(null)} 
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Formal Fieldset Form Layout */}
            <div className="space-y-4">
              {/* SECTION 1: INSTITUTIONAL BIODATA */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-600" /> SECTION 1: INSTITUTIONAL BIODATA
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Formal Legal Name</label>
                    <p className="font-bold text-slate-900 mt-0.5">{selected.name}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Institutional Motto</label>
                    <p className="font-medium text-slate-800 italic mt-0.5">{selected.motto || '“Excellence in Learning & Character”'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">State / Territory</label>
                    <p className="font-semibold text-slate-800 mt-0.5">{selected.state || 'Federal Capital Territory / Not Specified'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">City / Municipality</label>
                    <p className="font-semibold text-slate-800 mt-0.5">{selected.city || 'Central Area'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Physical Campus Address</label>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" />
                      {selected.address || 'Standard Registered Campus Premises'}
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* SECTION 2: ADMINISTRATIVE APPOINTMENT & CONTACT */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={13} className="text-indigo-600" /> SECTION 2: PRINCIPAL APPOINTMENT & GOVERNANCE
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Designated Administrator</label>
                    <p className="font-bold text-slate-900 mt-0.5">{selected.adminName || selected.users?.[0]?.firstName ? `${selected.users?.[0]?.firstName} ${selected.users?.[0]?.lastName}` : 'Institutional Principal'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Administrative Email</label>
                    <p className="font-medium text-blue-700 mt-0.5 flex items-center gap-1">
                      <Mail size={12} /> {selected.adminEmail || selected.users?.[0]?.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Official Telephone</label>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                      <Phone size={12} /> {selected.phone || 'Direct line not supplied'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block uppercase">Onboarding Partner / Marketer</label>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selected.marketer ? `${selected.marketer.firstName} ${selected.marketer.lastName} (Code: ${selected.marketer.referralCode})` : 'Direct Ministry / Platform Channel'}
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* SECTION 3: ACCREDITATION & STATUTORY DOCUMENTATION */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-emerald-600" /> SECTION 3: STATUTORY CLEARANCE & VERIFICATION
                </legend>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Ministry of Education Clearance Letter</p>
                        <p className="text-[11px] text-slate-500">Official state / federal operating permit document</p>
                      </div>
                    </div>
                    {selected.ministryApprovalDoc ? (
                      <a 
                        href={selected.ministryApprovalDoc} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100"
                      >
                        Inspect Document <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Submitted Offline / In Review
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-purple-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Corporate Affairs (CAC) Certificate</p>
                        <p className="text-[11px] text-slate-500">Legal entity business / trustees incorporation proof</p>
                      </div>
                    </div>
                    {selected.cacDocument ? (
                      <a 
                        href={selected.cacDocument} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100"
                      >
                        Inspect Document <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Submitted Offline / In Review
                      </span>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* SECTION 4: LICENSING PACKAGE & ENFORCEMENT */}
              <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-600" /> SECTION 4: LICENSING PACKAGE & CAPACITY CAPS
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Licensing Tier</span>
                    <span className="font-extrabold text-blue-700 text-sm">{selected.subscriptionPlan}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Student Quota</span>
                    <span className="font-bold text-slate-900 text-sm">Standard Cap</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Staff Quota</span>
                    <span className="font-bold text-slate-900 text-sm">Included</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">SMS Engine</span>
                    <span className="font-bold text-emerald-700 text-sm">Enabled</span>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Dossier Regulatory Action Strip */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Authorized Platform Administrator Signature Required
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selected.subscriptionStatus === 'PENDING_APPROVAL' && (
                  <button
                    onClick={() => approveMut.mutate(selected.id)}
                    disabled={approveMut.isPending}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Accredit & Activate License
                  </button>
                )}

                {selected.subscriptionStatus === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      if (confirm(`Confirm suspension of operating license for "${selected.name}"?`)) {
                        suspendMut.mutate(selected.id);
                      }
                    }}
                    disabled={suspendMut.isPending}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} /> Suspend License
                  </button>
                )}

                {selected.subscriptionStatus === 'SUSPENDED' && (
                  <button
                    onClick={() => reactivateMut.mutate(selected.id)}
                    disabled={reactivateMut.isPending}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} /> Reactivate License
                  </button>
                )}

                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
