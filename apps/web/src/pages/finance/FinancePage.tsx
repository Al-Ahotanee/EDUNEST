import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { Plus, DollarSign, AlertCircle, TrendingUp, CreditCard, Eye, Download, Trash2 } from 'lucide-react';
import {
  StatCard, DataTable, Button, Modal, Input, Select, Badge, PageLoader,
} from '../../components/ui';
import { financeApi, studentsApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [feeModal, setFeeModal] = useState(false);
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
  const feeForm = useForm({ defaultValues: { name: '', amount: 0, description: '', termBased: true } });

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
      feeForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice #', sortable: true },
    {
      key: 'student', header: 'Student',
      render: (r: any) => (
        <div>
          <p className="font-medium">{r.student?.firstName} {r.student?.lastName}</p>
          <p className="text-xs text-slate-400">{r.student?.admissionNumber}</p>
        </div>
      ),
    },
    { key: 'total', header: 'Total', render: (r: any) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
    { key: 'amountPaid', header: 'Paid', render: (r: any) => <span className="text-emerald-600 font-medium">{formatCurrency(r.amountPaid)}</span> },
    { key: 'balance', header: 'Balance', render: (r: any) => <span className={r.balance > 0 ? 'text-red-500 font-medium' : 'text-slate-400'}>{formatCurrency(r.balance)}</span> },
    { key: 'dueDate', header: 'Due Date', render: (r: any) => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', render: (r: any) => <Badge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r: any) => (
        <div className="flex gap-1">
          {r.balance > 0 && (
            <button onClick={() => { setPaymentModal(r); paymentForm.setValue('amount', r.balance); }}
              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all" title="Record Payment">
              <CreditCard size={15} />
            </button>
          )}
          <button className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-all" title="View">
            <Eye size={15} />
          </button>
          <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all" title="Download">
            <Download size={15} />
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
          <h1 className="page-title">Finance Management</h1>
          <p className="page-subtitle">Fees, invoices, payments and financial analytics</p>
        </div>
        <div className="flex gap-2">
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
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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

      {/* Fee Structures Tab */}
      {tab === 'fees' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(feesData?.data || []).map((fee: any) => (
            <div key={fee.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><DollarSign size={18} /></div>
                <Badge status={fee.termBased ? 'ACTIVE' : 'INACTIVE'} label={fee.termBased ? 'Per Term' : 'One-time'} />
              </div>
              <h3 className="font-bold text-slate-900">{fee.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(fee.amount)}</p>
              {fee.description && <p className="text-xs text-slate-500 mt-1">{fee.description}</p>}
            </div>
          ))}
          <button onClick={() => setFeeModal(true)}
            className="card p-5 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer min-h-[140px]">
            <Plus size={24} />
            <span className="text-sm font-medium">Add Fee Structure</span>
          </button>
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

      {/* Fee Structure Modal */}
      <Modal open={feeModal} onClose={() => setFeeModal(false)} title="Add Fee Structure" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFeeModal(false)}>Cancel</Button>
            <Button loading={createFeeMutation.isPending}
              onClick={feeForm.handleSubmit((d) => createFeeMutation.mutate(d))}>
              Create Fee
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Fee Name" {...feeForm.register('name')} placeholder="e.g. School Fees, PTA Levy" />
          <Input label="Amount (₦)" type="number" {...feeForm.register('amount', { valueAsNumber: true })} />
          <Input label="Description" {...feeForm.register('description')} placeholder="Optional description" />
          <Select label="Billing Type" {...feeForm.register('termBased')}
            options={[{ value: 'true', label: 'Per Term' }, { value: 'false', label: 'One-time' }]} />
        </div>
      </Modal>
    </div>
  );
}
