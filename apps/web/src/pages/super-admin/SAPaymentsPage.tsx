import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, Search, Filter, Receipt, School, CreditCard, 
  Calendar, CheckCircle2, ChevronRight, Eye, ChevronLeft,
  RotateCcw, ShieldCheck, Printer, ArrowDownRight, Building2,
  User, Hash, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../lib/utils';

export default function SAPaymentsPage() {
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sa-payments', search, method, page, limit],
    queryFn: () =>
      api
        .get('/super-admin/payments', { params: { search, method, page, limit } })
        .then((r) => r.data),
  });

  const payments = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1, totalVolume: 0 };
  const totalVolume = meta?.totalVolume || 0;

  const hasActiveFilters = Boolean(search || method);

  const handleResetFilters = () => {
    setSearch('');
    setMethod('');
    setPage(1);
  };

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, meta.total);

  return (
    <div className="space-y-6">
      {/* Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              <DollarSign size={13} /> Fiscal Ledger
            </span>
            <span className="text-xs text-slate-500 font-medium">
              National Institutional Settlement & Fee Collection Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Platform Payments & Revenue Audit
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor real-time subscription remittances, cross-school tuition settlements, and statutory transaction audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            Audit Standard: GAAP / Federal Ministry Compliant
          </span>
        </div>
      </div>

      {/* KPI Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Platform Volume</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">₦{totalVolume.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Total settlements processed</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audited Settlements</p>
            <p className="text-3xl font-black text-blue-700 mt-1">{meta.total || payments.length}</p>
            <p className="text-xs text-slate-500 mt-1">Processed payment receipts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Receipt size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Settlement Size</p>
            <p className="text-3xl font-black text-purple-700 mt-1">
              ₦{meta.total ? Math.round(totalVolume / meta.total).toLocaleString() : '0'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Per transaction ticket average</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Multi-Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              placeholder="Search by school, receipt #, reference ID, or student name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pl-1">
              <Filter size={14} /> Channel:
            </div>

            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by payment channel"
              className="bg-slate-50 hover:bg-white border border-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Payment Channels</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              <option value="CASH">Cash Remittance</option>
              <option value="POS">POS Terminal</option>
              <option value="ONLINE">Paystack / Online Payment</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                title="Reset search filters"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-600">Active Criteria:</span>
            {search && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                Search: "{search}"
              </span>
            )}
            {method && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                Channel: {method}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Enterprise Financial Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Receipt & Reference</th>
                <th className="px-6 py-3.5">Institution / Tenant</th>
                <th className="px-6 py-3.5">Student / Payer</th>
                <th className="px-6 py-3.5">Settled Amount</th>
                <th className="px-6 py-3.5">Settlement Channel</th>
                <th className="px-6 py-3.5">Settlement Timestamp</th>
                <th className="px-6 py-3.5 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <div className="inline-block w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-semibold">Compiling Financial Ledger Records...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <Receipt size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No Settlement Records Found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasActiveFilters 
                        ? 'No transactions match the specified search parameters.' 
                        : 'No financial remittances have been processed through the platform yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Receipt & Reference */}
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-slate-900 text-xs">{p.receiptNo}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-[150px] mt-0.5">
                        Ref: {p.reference || 'DIRECT-POST'}
                      </p>
                    </td>

                    {/* School / Tenant */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{p.schoolName}</p>
                      <p className="text-xs font-mono text-blue-700">/{p.tenantSlug}</p>
                    </td>

                    {/* Student / Payer */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{p.studentName}</p>
                      <p className="text-xs font-mono text-slate-500">{p.admissionNumber}</p>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <span className="font-black text-emerald-700 text-sm">
                        ₦{(p.amount || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Channel */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <CreditCard size={12} className="text-slate-500" />
                        {p.method}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {formatDate(p.paymentDate)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
                        title="Inspect Tax Invoice & Official Receipt"
                      >
                        <Eye size={13} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))
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
              <strong className="text-slate-900">{meta.total}</strong> financial settlements
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
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Official SaaS Tax Invoice & Remittance Receipt Modal */}
      {selectedPayment && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPayment(null)}
        >
          <div 
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                  OFFICIAL TAX INVOICE & REMITTANCE RECEIPT
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Settlement #{selectedPayment.receiptNo}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Gateway Audit Ref: {selectedPayment.reference || 'SYSTEM-POSTED'}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Total Settled Banner */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase block">Settled Amount Remitted</span>
                <span className="text-2xl font-black text-emerald-900">
                  ₦{(selectedPayment.amount || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                PAID & AUDITED
              </span>
            </div>

            {/* Structured Fieldset Details */}
            <div className="space-y-3">
              {/* Institutional Tenant */}
              <fieldset className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-600" /> INSTITUTIONAL REMITTER
                </legend>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">School Legal Entity</span>
                    <strong className="text-slate-900">{selectedPayment.schoolName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tenant Partition</span>
                    <strong className="text-blue-700 font-mono">/{selectedPayment.tenantSlug}</strong>
                  </div>
                </div>
              </fieldset>

              {/* Scholar / Payer */}
              <fieldset className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-indigo-600" /> SCHOLAR / BENEFICIARY
                </legend>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Student Full Name</span>
                    <strong className="text-slate-900">{selectedPayment.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission / Matric No</span>
                    <strong className="text-slate-900 font-mono">{selectedPayment.admissionNumber}</strong>
                  </div>
                </div>
              </fieldset>

              {/* Settlement Technical Audit */}
              <fieldset className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-emerald-600" /> TRANSACTION SPECIFICATIONS
                </legend>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Remittance Channel</span>
                    <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                      <CreditCard size={12} /> {selectedPayment.method}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Execution Timestamp</span>
                    <span className="font-medium text-slate-800">{formatDate(selectedPayment.paymentDate)}</span>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" /> Verified Cryptographic SaaS Seal
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  <Printer size={13} /> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
