import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  Plus, DollarSign, AlertCircle, TrendingUp, CreditCard, Eye,
  Download, Trash2, Printer, ShieldCheck, CheckCircle2, FileText
} from 'lucide-react';
import {
  StatCard, DataTable, Button, Modal, Input, Select, Badge, PageLoader,
} from '../../components/ui';
import { financeApi, studentsApi, academicApi } from '../../services/api';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { EduNestIcon } from '../../components/common/EduNestLogo';

export default function FinancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: user?.school?.name || 'School' };

  const [invoiceModal, setInvoiceModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [feeModal, setFeeModal] = useState(false);
  const [selectedClassForFees, setSelectedClassForFees] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'overview' | 'invoices' | 'fees'>('overview');

  const { data: dashStats, isLoading } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeApi.dashboard().then((r) => r.data.data),
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => financeApi.monthlyTrend().then((r) => r.data.data),
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', page, search, statusFilter],
    queryFn: () => financeApi.invoices({ page, limit: 20, search, status: statusFilter }).then((r) => r.data),
    placeholderData: (prev) => prev,
    enabled: tab === 'invoices',
  });

  const { data: feesData } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => financeApi.feeStructures().then((r) => r.data),
    enabled: tab === 'fees',
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentsApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: invoiceModal,
  });

  // Invoice form
  const invoiceForm = useForm<{
    studentId: string;
    dueDate: string;
    discount: number;
    notes: string;
    items: { description: string; amount: number; quantity: number }[];
  }>({
    defaultValues: {
      studentId: '',
      dueDate: '',
      discount: 0,
      notes: '',
      items: [{ description: '', amount: 0, quantity: 1 }],
    },
  });

  const { fields: feeItems, append: appendFeeItem, remove: removeFeeItem } = useFieldArray({
    control: invoiceForm.control,
    name: 'items',
  });
  // Payment form
  const paymentForm = useForm({ defaultValues: { amount: 0, method: 'CASH', reference: '', notes: '' } });
  // Fee form
  const feeForm = useForm({ defaultValues: { name: '', amount: 0, description: '', termBased: true, classId: '', feeType: 'TERM', status: 'DRAFT' } });

  // Fetch classes for fee structure dropdown
  const { data: classesData } = useQuery({
    queryKey: ['classes-for-fees'],
    queryFn: () => academicApi.classes().then((r) => r.data?.data || r.data || []),
    enabled: tab === 'fees',
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => financeApi.createInvoice(data),
    onSuccess: () => {
      toast.success('Invoice created!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      setInvoiceModal(false);
      invoiceForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.recordPayment(id, data),
    onSuccess: () => {
      toast.success('Payment recorded!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      setPaymentModal(null);
      paymentForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createFeeMutation = useMutation({
    mutationFn: (data: any) => financeApi.createFeeStructure(data),
    onSuccess: () => {
      toast.success('Fee structure created!');
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setFeeModal(false);
      feeForm.reset({ name: '', amount: 0, description: '', termBased: true, classId: '', feeType: 'TERM', status: 'DRAFT' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const publishFeeMutation = useMutation({
    mutationFn: (id: string) => financeApi.publishFeeStructure(id),
    onSuccess: () => {
      toast.success('Fee structure published — now visible to parents');
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to publish'),
  });

  const generateInvoicesMutation = useMutation({
    mutationFn: (classId: string) => financeApi.generateInvoicesFromClass(classId),
    onSuccess: (resp: any) => {
      const data = resp.data?.data || resp.data;
      toast.success(`Generated ${data.invoicesCreated} invoice(s) from ${data.feeItems} fee item(s). Skipped ${data.duplicatesSkipped} duplicates.`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to generate invoices'),
  });

  const handleExportInvoices = () => {
    const list = invoicesData?.data || [];
    if (!list.length) { toast.error('No invoices to export'); return; }
    const headers = ['Invoice #', 'Student Name', 'Admission No', 'Total Invoiced (NGN)', 'Amount Paid (NGN)', 'Balance Due (NGN)', 'Due Date', 'Status'];
    const rows = list.map((inv: any) => [
      `"${inv.invoiceNo || ''}"`,
      `"${inv.student?.firstName || ''} ${inv.student?.lastName || ''}"`,
      `"${inv.student?.admissionNumber || ''}"`,
      `"${inv.total || 0}"`,
      `"${inv.amountPaid || 0}"`,
      `"${inv.balance || 0}"`,
      `"${formatDate(inv.dueDate)}"`,
      `"${inv.status || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduNest_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices exported as CSV');
  };

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice #', sortable: true },
    {
      key: 'student', header: 'Student',
      render: (r: any) => (
        <div>
          <p className="font-semibold text-slate-900 leading-tight">{r.student?.firstName} {r.student?.lastName}</p>
          <p className="text-xs text-slate-400 font-mono">{r.student?.admissionNumber}</p>
        </div>
      ),
    },
    { key: 'total', header: 'Total Invoiced', render: (r: any) => <span className="font-bold text-slate-900">{formatCurrency(r.total)}</span> },
    { key: 'amountPaid', header: 'Amount Paid', render: (r: any) => <span className="text-emerald-600 font-semibold">{formatCurrency(r.amountPaid)}</span> },
    { key: 'balance', header: 'Balance Due', render: (r: any) => <span className={r.balance > 0 ? 'text-red-500 font-bold' : 'text-slate-400'}>{formatCurrency(r.balance)}</span> },
    { key: 'dueDate', header: 'Due Date', render: (r: any) => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', render: (r: any) => <Badge status={r.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-1.5">
          {r.balance > 0 && (
            <button
              onClick={() => { setPaymentModal(r); paymentForm.setValue('amount', r.balance); }}
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
              title="Record Payment"
            >
              <CreditCard size={15} />
            </button>
          )}
          <button
            onClick={() => setSelectedInvoice(r)}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
            title="View Official Receipt"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => { setSelectedInvoice(r); setTimeout(() => window.print(), 300); }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
            title="Print Receipt"
          >
            <Printer size={15} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance & Bursary Management</h1>
          <p className="page-subtitle">Itemized school fee invoices, official bursary receipts, and financial analytics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportInvoices}>
            Export CSV
          </Button>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setFeeModal(true)}>
            Fee Structure
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setInvoiceModal(true)}>
            Create Invoice
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Invoiced" value={formatCurrency(dashStats?.totalInvoiced || 0)} icon={<DollarSign size={20} />} color="blue" />
        <StatCard title="Total Collected" value={formatCurrency(dashStats?.totalCollected || 0)} subtitle={`${dashStats?.collectionRate || 0}% rate`} icon={<TrendingUp size={20} />} color="green" />
        <StatCard title="Outstanding" value={formatCurrency(dashStats?.totalBalance || 0)} subtitle={`${dashStats?.unpaidCount || 0} invoices`} icon={<AlertCircle size={20} />} color="red" />
        <StatCard title="This Month" value={formatCurrency(dashStats?.monthlyCollected || 0)} icon={<CreditCard size={20} />} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['overview', 'invoices', 'fees'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-6">Monthly Revenue Collection</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData || []}>
                <defs>
                  <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(v), 'Collected']} />
                <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.5} fill="url(#colorFin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Payments */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900">Recent Payments</div>
            <div className="divide-y divide-slate-50">
              {(dashStats?.recentPayments || []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <DollarSign size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {p.invoice?.student?.firstName} {p.invoice?.student?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{p.receiptNo} • {formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-slate-400">{p.method}</p>
                  </div>
                </div>
              ))}
              {!dashStats?.recentPayments?.length && (
                <p className="text-center py-10 text-slate-400 text-sm">No payments recorded yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input w-40 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <DataTable
            data={invoicesData?.data || []}
            columns={invoiceColumns}
            loading={loadingInvoices}
            onSearch={(q) => { setSearch(q); setPage(1); }}
            searchPlaceholder="Search by invoice # or student name..."
            pagination={invoicesData?.meta ? {
              page: invoicesData.meta.page,
              limit: invoicesData.meta.limit,
              total: invoicesData.meta.total,
              totalPages: invoicesData.meta.totalPages,
              onPageChange: setPage,
            } : undefined}
          />
        </div>
      )}

      {/* Fee Structures Tab — Comprehensive Class-Based Fee Management */}
      {tab === 'fees' && (
        <div className="space-y-4">
          {/* Class filter + Add button */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <select
                value={selectedClassForFees}
                onChange={(e) => setSelectedClassForFees(e.target.value)}
                className="input w-56 py-2 text-sm"
              >
                <option value="">All Classes</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Button icon={<Plus size={15} />} onClick={() => setFeeModal(true)}>
              Add Fee Item
            </Button>
          </div>

          {/* Fee Items Table */}
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fee Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(feesData?.data || [])
                    .filter((fee: any) => !selectedClassForFees || fee.classId === selectedClassForFees)
                    .map((fee: any) => (
                      <tr key={fee.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 text-sm">{fee.name}</div>
                          {fee.description && <div className="text-xs text-slate-400">{fee.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fee.class?.name || 'All Classes'}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 text-sm">{formatCurrency(fee.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${fee.feeType === 'ONE_TIME' ? 'badge-purple' : fee.feeType === 'ANNUAL' ? 'badge-blue' : 'badge-green'}`}>
                            {fee.feeType || 'TERM'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${fee.status === 'PUBLISHED' ? 'badge-green' : 'badge-yellow'}`}>
                            {fee.status || 'DRAFT'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fee.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => publishFeeMutation.mutate(fee.id)}
                              disabled={publishFeeMutation.isPending}
                              className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold transition-colors"
                            >
                              Publish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {(feesData?.data || []).filter((fee: any) => !selectedClassForFees || fee.classId === selectedClassForFees).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                        No fee structures yet. Click "Add Fee Item" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
                {(feesData?.data || []).length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={2} className="px-4 py-3 font-bold text-slate-900 text-sm">Total (all items):</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">
                        {formatCurrency((feesData?.data || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Fee Breakdown Preview by Class */}
          {selectedClassForFees && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Fee Breakdown — {classes.find((c: any) => c.id === selectedClassForFees)?.name || 'Selected Class'}
              </h3>
              <div className="space-y-2">
                {(feesData?.data || [])
                  .filter((fee: any) => fee.classId === selectedClassForFees || (!fee.classId && fee.status === 'PUBLISHED'))
                  .map((fee: any) => (
                    <div key={fee.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                      <div>
                        <span className="text-sm font-medium text-slate-700">{fee.name}</span>
                        <span className="ml-2 text-xs text-slate-400">({fee.feeType || 'TERM'})</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(fee.amount)}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between py-3 mt-2 border-t-2 border-slate-200">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-blue-600 text-lg">
                    {formatCurrency(
                      (feesData?.data || [])
                        .filter((fee: any) => fee.classId === selectedClassForFees || (!fee.classId && fee.status === 'PUBLISHED'))
                        .reduce((sum: number, f: any) => sum + (f.amount || 0), 0)
                    )}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                This breakdown is what parents of students in this class will see in their portal.
                Only PUBLISHED fee items are visible to parents.
              </p>
              <Button
                size="sm"
                variant="primary"
                className="mt-3"
                loading={generateInvoicesMutation.isPending}
                onClick={() => generateInvoicesMutation.mutate(selectedClassForFees)}
              >
                Generate Invoices for This Class
              </Button>
              <p className="text-xs text-slate-400 mt-1">
                Creates invoices for all active students in this class from published fee items.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Invoice Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="Create Invoice" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInvoiceModal(false)}>Cancel</Button>
            <Button loading={createInvoiceMutation.isPending}
              onClick={invoiceForm.handleSubmit((d) => createInvoiceMutation.mutate(d))}>
              Create Invoice
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Select label="Student" {...invoiceForm.register('studentId')}
            options={(studentsData || []).map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.admissionNumber})` }))}
            placeholder="Select student" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" {...invoiceForm.register('dueDate')} />
            <Input label="Discount (₦)" type="number" {...invoiceForm.register('discount', { valueAsNumber: true })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Fee Items</label>
              <button
                type="button"
                onClick={() => appendFeeItem({ description: '', amount: 0, quantity: 1 })}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {feeItems.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Description (e.g. Tuition)"
                    {...invoiceForm.register(`items.${i}.description` as const, { required: true })}
                  />
                  <input
                    className="input w-28"
                    placeholder="Amount (₦)"
                    type="number"
                    {...invoiceForm.register(`items.${i}.amount` as const, { valueAsNumber: true, required: true })}
                  />
                  <input
                    className="input w-16"
                    placeholder="Qty"
                    type="number"
                    min="1"
                    {...invoiceForm.register(`items.${i}.quantity` as const, { valueAsNumber: true, required: true })}
                  />
                  {feeItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeeItem(i)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Input label="Notes (optional)" {...invoiceForm.register('notes')} placeholder="Additional notes" />
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title={`Record Payment — ${paymentModal?.invoiceNo}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button loading={recordPaymentMutation.isPending}
              onClick={paymentForm.handleSubmit((d) => recordPaymentMutation.mutate({ id: paymentModal.id, data: d }))}>
              Record Payment
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">{formatCurrency(paymentModal?.total || 0)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-bold text-emerald-600">{formatCurrency(paymentModal?.amountPaid || 0)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-slate-500">Balance</span><span className="font-bold text-red-500">{formatCurrency(paymentModal?.balance || 0)}</span></div>
          </div>
          <Input label="Amount (₦)" type="number" {...paymentForm.register('amount', { valueAsNumber: true })} />
          <Select label="Payment Method" {...paymentForm.register('method')}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'POS', label: 'POS' },
              { value: 'ONLINE', label: 'Online' },
            ]} />
          <Input label="Reference / Transaction ID" {...paymentForm.register('reference')} placeholder="Optional" />
        </div>
      </Modal>

      {/* Fee Structure Modal — Enhanced with class scoping and fee type */}
      <Modal open={feeModal} onClose={() => setFeeModal(false)} title="Add Fee Item" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFeeModal(false)}>Cancel</Button>
            <Button loading={createFeeMutation.isPending}
              onClick={feeForm.handleSubmit((d) => createFeeMutation.mutate(d))}>
              Create Fee Item
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Fee Name" {...feeForm.register('name')} placeholder="e.g. Tuition, Uniform, Books" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₦)" type="number" {...feeForm.register('amount', { valueAsNumber: true })} />
            <div className="form-group">
              <label className="label">Fee Type</label>
              <select {...feeForm.register('feeType')} className="input">
                <option value="TERM">Per Term</option>
                <option value="ONE_TIME">One-Time</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Applicable Class</label>
            <select {...feeForm.register('classId')} className="input">
              <option value="">All Classes (applies to every class)</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">If a specific class is selected, this fee only applies to students in that class.</p>
          </div>
          <Input label="Description" {...feeForm.register('description')} placeholder="Optional description" />
        </div>
      </Modal>

      {/* ─── OFFICIAL INSTITUTIONAL INVOICE & RECEIPT MODAL ───────────────────────── */}
      <Modal
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Official Student Fee Invoice & Bursary Receipt"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">Formal Institutional Bursary Document</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>Close</Button>
              {selectedInvoice?.balance > 0 && (
                <Button
                  variant="secondary"
                  icon={<CreditCard size={15} />}
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    setPaymentModal(inv);
                    paymentForm.setValue('amount', inv.balance);
                  }}
                >
                  Record Payment
                </Button>
              )}
              <Button icon={<Printer size={16} />} onClick={() => window.print()}>
                Print / Save PDF
              </Button>
            </div>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Header with School Crest */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                {school.logo ? (
                  <img src={school.logo} alt="School Logo" className="w-14 h-14 object-contain rounded-xl" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <EduNestIcon size={32} />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{school.name}</h2>
                  <p className="text-xs text-slate-500">{school.address || 'Bursary & Accounts Division'}</p>
                  <p className="text-xs text-slate-500">{school.phone && `Tel: ${school.phone}`} {school.email && `| Email: ${school.email}`}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  'px-3 py-1 font-bold text-xs rounded-full uppercase',
                  selectedInvoice.balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                )}>
                  {selectedInvoice.status || (selectedInvoice.balance <= 0 ? 'PAID' : 'PAYMENT DUE')}
                </span>
                <p className="text-xs font-mono font-bold text-blue-600 mt-1">{selectedInvoice.invoiceNo}</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Official Student Fee Invoice & Clearance Receipt
              </h3>
            </div>

            {/* Student & Invoice Particulars */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Information</p>
                <div className="flex justify-between"><span className="text-slate-500">Student Name:</span><span className="font-bold text-slate-900">{selectedInvoice.student?.firstName} {selectedInvoice.student?.lastName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Admission No:</span><span className="font-mono font-bold text-blue-600">{selectedInvoice.student?.admissionNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Class:</span><span className="font-semibold text-slate-800">{selectedInvoice.student?.classEnrollments?.[0]?.class?.name || selectedInvoice.student?.className || '—'}</span></div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Reference</p>
                <div className="flex justify-between"><span className="text-slate-500">Invoice Number:</span><span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Due Date:</span><span className="font-semibold text-slate-800">{formatDate(selectedInvoice.dueDate)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Issued On:</span><span className="font-semibold text-slate-800">{formatDate(selectedInvoice.createdAt || new Date())}</span></div>
              </div>
            </div>

            {/* Itemized Fee Breakdown Table */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Itemized Fee Breakdown</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-left">#</th>
                      <th className="py-2.5 px-4 text-left">Description</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedInvoice.items || [{ description: 'Institutional Tuition & Term Fees', amount: selectedInvoice.total, quantity: 1 }]).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{item.description}</td>
                        <td className="py-2.5 px-4 text-right text-slate-600">{formatCurrency(item.amount)}</td>
                        <td className="py-2.5 px-4 text-center text-slate-600">{item.quantity || 1}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.amount * (item.quantity || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Gross Total:</span><span className="font-bold text-slate-800">{formatCurrency(selectedInvoice.total + (selectedInvoice.discount || 0))}</span></div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Institutional Discount:</span><span>-{formatCurrency(selectedInvoice.discount)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                  <span>Net Invoiced Total:</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Total Amount Paid:</span>
                  <span>{formatCurrency(selectedInvoice.amountPaid || 0)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-slate-900 pt-2 font-black text-base">
                  <span className={selectedInvoice.balance > 0 ? 'text-red-600' : 'text-slate-900'}>Balance Due:</span>
                  <span className={selectedInvoice.balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {selectedInvoice.balance > 0 ? formatCurrency(selectedInvoice.balance) : '₦0 (CLEARED)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History Log */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verified Payment Audit Trail</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-left">Receipt #</th>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-left">Method</th>
                        <th className="py-2 px-3 text-left">Ref</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono text-blue-600">{p.receiptNo}</td>
                          <td className="py-2 px-3">{formatDate(p.paymentDate)}</td>
                          <td className="py-2 px-3 font-semibold">{p.method}</td>
                          <td className="py-2 px-3 text-slate-400 font-mono">{p.reference || '—'}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signatures & Official Stamp */}
            <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-200">
              <div className="text-center">
                <div className="border-b border-slate-400 h-10 mb-1" />
                <p className="text-xs font-bold text-slate-800">Authorized Bursar / Accounts Officer</p>
                <p className="text-[10px] text-slate-400">Signature & Official Stamp</p>
              </div>
              <div className="p-3 border border-dashed border-slate-300 rounded-xl text-center flex flex-col items-center justify-center">
                <ShieldCheck size={20} className="text-emerald-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">EduNest Official Bursary Seal</p>
                <p className="text-[10px] text-slate-400">Secured Digital Verification Ledger</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
