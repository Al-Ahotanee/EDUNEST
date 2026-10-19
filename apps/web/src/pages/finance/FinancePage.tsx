import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  Plus, DollarSign, AlertCircle, TrendingUp, CreditCard, Eye,
  Download, Trash2, Printer, ShieldCheck, CheckCircle2, FileText, User
} from 'lucide-react';
import {
  DataTable, Button, Modal, Input, Select, StatCard, Badge, Avatar, PageLoader, Card,
} from '../../components/ui';
import { ReceiptViewer } from '../../components/finance/ReceiptViewer';
import { EduNestIcon } from '../../components/common/EduNestLogo';
import { financeApi, studentsApi, academicApi } from '../../services/api';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export default function FinancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: user?.school?.name || 'School' };

  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedClassForFees, setSelectedClassForFees] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  // P5: receipt viewer state — when set, shows the ReceiptViewer modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'overview' | 'invoices' | 'fees' | 'create-invoice' | 'create-fee'>('overview');

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
    enabled: tab === 'fees' || tab === 'create-invoice',
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentsApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: tab === 'create-invoice' || tab === 'invoices',
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
  const feeForm = useForm({
    defaultValues: {
      name: '',
      amount: 0,
      description: '',
      termBased: true,
      classId: '',
      feeType: 'TERM',
      applicableTo: 'ALL',
      isCompulsory: true,
      category: 'TUITION',
      status: 'PUBLISHED',
    },
  });

  // Fetch classes for fee structure dropdown
  const { data: classesData } = useQuery({
    queryKey: ['classes-for-fees'],
    queryFn: () => academicApi.classes().then((r) => r.data?.data || r.data || []),
    enabled: tab === 'fees' || tab === 'create-fee' || tab === 'create-invoice',
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // Fetch fee catalogue
  const { data: catalogueData } = useQuery({
    queryKey: ['fee-catalogue'],
    queryFn: () => financeApi.getFeeCatalogue().then((r) => r.data?.data || r.data || []),
    enabled: tab === 'create-fee' || tab === 'fees',
  });
  const catalogue: any[] = Array.isArray(catalogueData) ? catalogueData : [];

  const [generationCategory, setGenerationCategory] = useState<'ALL' | 'NEW_STUDENT' | 'RETURNING_STUDENT'>('ALL');

  const selectedStudentId = invoiceForm.watch('studentId');
  const selectedStudent = (studentsData || []).find((s: any) => s.id === selectedStudentId);
  const studentClass = selectedStudent?.classEnrollments?.[0]?.class;
  const watchedItems = invoiceForm.watch('items') || [];
  const watchedDiscount = invoiceForm.watch('discount') || 0;
  const subtotal = watchedItems.reduce((acc, it) => acc + (Number(it.amount || 0) * Number(it.quantity || 1)), 0);
  const netTotal = Math.max(0, subtotal - Number(watchedDiscount || 0));

  const handleLoadClassFees = async () => {
    if (!studentClass?.id) {
      toast.error('Selected student does not have an active class enrollment');
      return;
    }
    try {
      const res = await financeApi.getFeeStructuresByClass(studentClass.id);
      const feeList = res.data?.data || res.data || [];
      if (!feeList.length) {
        toast.error(`No published fee items found for ${studentClass.name}`);
        return;
      }
      invoiceForm.setValue('items', feeList.map((f: any) => ({
        description: f.name,
        amount: f.amount,
        quantity: 1,
      })));
      toast.success(`Loaded ${feeList.length} fee item(s) for ${studentClass.name}`);
    } catch {
      toast.error('Failed to load class fee structures');
    }
  };

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => financeApi.createInvoice(data),
    onSuccess: () => {
      toast.success('Invoice created and published successfully!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      setTab('invoices');
      invoiceForm.reset({
        studentId: '',
        dueDate: '',
        discount: 0,
        notes: '',
        items: [{ description: '', amount: 0, quantity: 1 }],
      });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.submitPayment({
      invoiceId: id,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      idempotencyKey: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Payment recorded and posted!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      setPaymentModal(null);
      paymentForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record payment'),
  });

  const createFeeMutation = useMutation({
    mutationFn: (data: any) => financeApi.createFeeStructure(data),
    onSuccess: () => {
      toast.success('Fee structure created and published!');
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setTab('fees');
      feeForm.reset({
        name: '', amount: 0, description: '', termBased: true, classId: '', feeType: 'TERM',
        applicableTo: 'ALL', isCompulsory: true, category: 'TUITION', status: 'PUBLISHED',
      });
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
    mutationFn: ({ classId, studentCategory }: { classId: string; studentCategory?: string }) =>
      financeApi.generateInvoicesFromClass(classId, { studentCategory }),
    onSuccess: (resp: any) => {
      const data = resp.data?.data || resp.data;
      toast.success(`Generated ${data.invoicesCreated} invoice(s) from ${data.feeItems} fee item(s). Skipped ${data.duplicatesSkipped} duplicates.`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
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
          {/* P5: View Receipt for invoices with payments */}
          {r.amountPaid > 0 && (
            <button
              onClick={async () => {
                try {
                  const invoice = await financeApi.getInvoice(r.id);
                  const payments = invoice.data?.data?.payments || invoice.data?.payments || [];
                  if (payments.length === 0) {
                    toast.info('No payments recorded for this invoice yet');
                    return;
                  }
                  const postedPayment = payments.find((p: any) => p.status === 'POSTED') || payments[0];
                  if (postedPayment?.receiptNo) {
                    setReceiptData({
                      receiptNo: postedPayment.receiptNo,
                      studentName: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || 'Student',
                      studentAdmissionNo: r.student?.admissionNumber || '—',
                      amountInFigures: postedPayment.amount,
                      amountInWords: '',
                      paymentDate: postedPayment.paymentDate,
                      paymentMethod: postedPayment.method || 'CASH',
                      transactionRef: postedPayment.reference,
                      invoiceAllocations: JSON.stringify([{ invoiceNo: r.invoiceNo, amount: postedPayment.amount }]),
                      issuedAt: postedPayment.postedAt || postedPayment.createdAt,
                      reprintCount: 0,
                    });
                  } else {
                    toast.info('Payment is pending approval. Receipt will be available once approved.');
                  }
                } catch {
                  toast.error('Failed to load receipt');
                }
              }}
              className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-all"
              title="View Receipt"
            >
              <FileText size={15} />
            </button>
          )}
          {/* P6: Pay Online via Paystack — only show for unpaid invoices with balance > 0 */}
          {r.balance > 0 && (
            <button
              onClick={async () => {
                try {
                  toast.loading('Initializing online payment...', { id: 'pay-online' });
                  const res = await financeApi.initiateOnlinePayment({
                    invoiceId: r.id,
                    callbackUrl: `${window.location.origin}/app/finance/invoices?verify=success`,
                  });
                  toast.dismiss('pay-online');
                  const data = res.data?.data || res.data;
                  if (data?.authorizationUrl) {
                    toast.success('Redirecting to Paystack...');
                    setTimeout(() => {
                      window.location.href = data.authorizationUrl;
                    }, 800);
                  } else {
                    toast.error('Failed to initialize payment. Please try again.');
                  }
                } catch (e: any) {
                  toast.dismiss('pay-online');
                  toast.error(e.response?.data?.message || 'Online payments not available. Please pay at the bursary.');
                }
              }}
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
              title="Pay Online via Paystack"
            >
              <CreditCard size={15} />
            </button>
          )}
          <button
            onClick={() => setSelectedInvoice(r)}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
            title="View Invoice"
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
          <Button
            variant={tab === 'create-fee' ? 'primary' : 'secondary'}
            icon={<Plus size={16} />}
            onClick={() => setTab('create-fee')}
          >
            Fee Structure Builder
          </Button>
          <Button
            variant={tab === 'create-invoice' ? 'primary' : 'default'}
            icon={<Plus size={16} />}
            onClick={() => setTab('create-invoice')}
          >
            Create Invoice Studio
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
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'invoices', label: 'Invoices' },
          { id: 'fees', label: 'Fee Structures' },
          ...(tab === 'create-invoice' ? [{ id: 'create-invoice', label: '⚡ New Invoice Studio' }] : []),
          ...(tab === 'create-fee' ? [{ id: 'create-fee', label: '⚡ Fee Item Builder' }] : []),
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
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
            <Button icon={<Plus size={15} />} onClick={() => setTab('create-fee')}>
              Add Fee Item
            </Button>
          </div>

          {/* Fee Items Table */}
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fee Name & Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Class Scope</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Applicable To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Billing Frequency</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unit Amount</th>
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
                          {fee.category && <div className="text-[11px] text-blue-600 font-mono uppercase">{fee.category}</div>}
                          {fee.description && <div className="text-xs text-slate-400">{fee.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fee.class?.name || 'All Classes (School-wide)'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            fee.applicableTo === 'NEW_STUDENT'
                              ? 'bg-amber-100 text-amber-800'
                              : fee.applicableTo === 'RETURNING_STUDENT'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {fee.applicableTo === 'NEW_STUDENT' ? 'New Students Only' : fee.applicableTo === 'RETURNING_STUDENT' ? 'Returning Only' : 'All Students'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${fee.feeType === 'ONE_TIME' ? 'badge-purple' : fee.feeType === 'ANNUAL' ? 'badge-blue' : 'badge-green'}`}>
                            {fee.feeType === 'ONE_TIME' ? 'One-Time' : fee.feeType === 'ANNUAL' ? 'Annual (Term 1)' : 'Per Term'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 text-sm">{formatCurrency(fee.amount)}</td>
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
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                        No fee structures defined yet. Click "Add Fee Item" to configure charges.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fee Breakdown & Automated Bulk Invoicing Card */}
          {selectedClassForFees && (() => {
            const classFees = (feesData?.data || []).filter((fee: any) => fee.classId === selectedClassForFees || (!fee.classId && fee.status === 'PUBLISHED'));
            const newStudentTotal = classFees
              .filter((f: any) => f.applicableTo === 'ALL' || f.applicableTo === 'NEW_STUDENT')
              .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
            const returningStudentTotal = classFees
              .filter((f: any) => (f.applicableTo === 'ALL' || f.applicableTo === 'RETURNING_STUDENT') && f.feeType !== 'ONE_TIME')
              .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

            return (
              <div className="card p-6 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <FileText size={20} className="text-blue-600" />
                      Class Fee Schedule & Automated Billing — {classes.find((c: any) => c.id === selectedClassForFees)?.name || 'Selected Class'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      The system automatically computes distinct charges for new vs. returning students and generates invoices idempotently.
                    </p>
                  </div>
                </div>

                {/* Two Calculated Cards: New vs Returning */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">New Students Schedule (Term 1)</p>
                    <p className="text-3xl font-black text-amber-900 mt-1">{formatCurrency(newStudentTotal)}</p>
                    <p className="text-xs text-amber-700 mt-2">
                      Includes tuition, registration/admission fee, uniforms, sports kit, lab, textbooks, and termly levies.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Returning Students Schedule</p>
                    <p className="text-3xl font-black text-blue-900 mt-1">{formatCurrency(returningStudentTotal)}</p>
                    <p className="text-xs text-blue-700 mt-2">
                      Excludes one-time admission, registration, and uniform pack fees. Includes recurring tuition and termly levies.
                    </p>
                  </div>
                </div>

                {/* Invoice Generation Trigger */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">⚡ Class-Wide Automated Invoicing</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Generate itemized invoices for all active enrolled students in this class. Existing invoices for the current term will not be duplicated.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Target Student Cohort</label>
                      <select
                        value={generationCategory}
                        onChange={(e) => setGenerationCategory(e.target.value as any)}
                        className="input w-full py-2 text-xs"
                      >
                        <option value="ALL">All Eligible Students (Automatic New vs. Returning)</option>
                        <option value="NEW_STUDENT">New Students Only ({formatCurrency(newStudentTotal)})</option>
                        <option value="RETURNING_STUDENT">Returning Students Only ({formatCurrency(returningStudentTotal)})</option>
                      </select>
                    </div>

                    <div className="pt-5">
                      <Button
                        variant="primary"
                        loading={generateInvoicesMutation.isPending}
                        onClick={() => generateInvoicesMutation.mutate({
                          classId: selectedClassForFees,
                          studentCategory: generationCategory,
                        })}
                      >
                        ⚡ Generate Invoices for {classes.find((c: any) => c.id === selectedClassForFees)?.name || 'Class'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── TAB: INVOICE CREATION STUDIO ─────────────────────────────────── */}
      {tab === 'create-invoice' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Student Fee Invoicing Studio</h2>
              <p className="text-xs text-slate-500">Configure itemized tuition, levies, and auxiliary fees with live balance calculation.</p>
            </div>
            <Button variant="secondary" onClick={() => setTab('invoices')}>
              Cancel & Return to Invoices
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Fields & Fee Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Student Selection & Class Card */}
              <div className="card p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  Target Student & Class Assignment
                </h3>

                <div>
                  <label className="label">Select Student *</label>
                  <select
                    className="input w-full"
                    {...invoiceForm.register('studentId', { required: true })}
                  >
                    <option value="">-- Choose Student --</option>
                    {(studentsData || []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.admissionNumber}) {s.classEnrollments?.[0]?.class?.name ? `— ${s.classEnrollments[0].class.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStudent && (
                  <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                        {selectedStudent.firstName?.[0]}{selectedStudent.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                        <p className="text-xs text-slate-500 font-mono">Admission No: {selectedStudent.admissionNumber}</p>
                        <p className="text-xs text-blue-700 font-semibold">
                          Assigned Class: {studentClass?.name || 'No Active Class Enrollment'}
                        </p>
                      </div>
                    </div>

                    {studentClass?.id && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleLoadClassFees}
                      >
                        ⚡ Load Class Fee Template ({studentClass.name})
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="label">Due Date *</label>
                    <input
                      type="date"
                      className="input w-full"
                      {...invoiceForm.register('dueDate', { required: true })}
                    />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 14);
                          invoiceForm.setValue('dueDate', d.toISOString().slice(0, 10));
                        }}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        +14 Days
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 30);
                          invoiceForm.setValue('dueDate', d.toISOString().slice(0, 10));
                        }}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        +30 Days
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                          invoiceForm.setValue('dueDate', d.toISOString().slice(0, 10));
                        }}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        End of Month
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Invoice Notes / Memo</label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="e.g. First Term Tuition & Levies"
                      {...invoiceForm.register('notes')}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Line Items Studio Table */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    Itemized Billing Breakdown
                  </h3>
                  <button
                    type="button"
                    onClick={() => appendFeeItem({ description: '', amount: 0, quantity: 1 })}
                    className="btn-secondary btn-sm gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="table-container border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                        <th className="px-4 py-3 text-left">Fee Item Description</th>
                        <th className="px-4 py-3 text-right w-36">Unit Amount (₦)</th>
                        <th className="px-4 py-3 text-center w-24">Qty</th>
                        <th className="px-4 py-3 text-right w-36">Line Total (₦)</th>
                        <th className="px-3 py-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {feeItems.map((item, i) => {
                        const lineAmount = invoiceForm.watch(`items.${i}.amount`) || 0;
                        const lineQty = invoiceForm.watch(`items.${i}.quantity`) || 1;
                        const lineSubtotal = Number(lineAmount) * Number(lineQty);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5">
                              <input
                                className="input w-full py-1.5 text-xs"
                                placeholder="Description (e.g. Tuition Fee, Books, Uniform)"
                                {...invoiceForm.register(`items.${i}.description` as const, { required: true })}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <input
                                className="input w-full py-1.5 text-xs text-right font-mono"
                                type="number"
                                min="0"
                                placeholder="0"
                                {...invoiceForm.register(`items.${i}.amount` as const, { valueAsNumber: true, required: true })}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                className="input w-full py-1.5 text-xs text-center font-mono"
                                type="number"
                                min="1"
                                {...invoiceForm.register(`items.${i}.quantity` as const, { valueAsNumber: true, required: true })}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">
                              {formatCurrency(lineSubtotal)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {feeItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFeeItem(i)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Col: Live Calculation & Issue Actions */}
            <div className="space-y-6">
              <div className="card p-6 space-y-5 sticky top-6">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CreditCard size={16} className="text-emerald-600" />
                  Live Financial Calculation
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                  </div>

                  <div>
                    <label className="label text-xs">Applicable Discount (₦)</label>
                    <input
                      type="number"
                      min="0"
                      className="input w-full font-mono text-sm py-1.5"
                      placeholder="0"
                      {...invoiceForm.register('discount', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="border-t-2 border-slate-200 pt-3 flex justify-between items-center text-base font-black">
                    <span className="text-slate-900">Net Invoiced:</span>
                    <span className="font-mono text-blue-700 text-lg">{formatCurrency(netTotal)}</span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertCircle size={13} /> Idempotent Invoicing Rules
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-700">
                      Once created, the invoice is published immediately to the Parent Portal and Student Financial Ledger. Initial balance will be {formatCurrency(netTotal)}.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full justify-center"
                    loading={createInvoiceMutation.isPending}
                    onClick={invoiceForm.handleSubmit((d) => createInvoiceMutation.mutate(d))}
                    disabled={!selectedStudentId || subtotal <= 0}
                  >
                    Issue & Publish Invoice ({formatCurrency(netTotal)})
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => setTab('invoices')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: FEE STRUCTURE BUILDER ───────────────────────────────────── */}
      {tab === 'create-fee' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Fee Structure Builder</h2>
              <p className="text-xs text-slate-500">Define school fee schedules, class-specific levies, and billing cycle frequencies.</p>
            </div>
            <Button variant="secondary" onClick={() => setTab('fees')}>
              Cancel & Return to Fees
            </Button>
          </div>

          <div className="card p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Standard Catalogue Preset Dropdown */}
              {catalogue.length > 0 && (
                <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="label text-xs font-bold text-slate-700">⚡ Autofill from Standard School Fee Catalogue</label>
                  <select
                    className="input w-full text-xs"
                    onChange={(e) => {
                      const item = catalogue.find(c => c.name === e.target.value);
                      if (item) {
                        feeForm.setValue('name', item.name);
                        feeForm.setValue('category', item.category);
                        feeForm.setValue('feeType', item.defaultFrequency || 'TERM');
                        feeForm.setValue('applicableTo', item.applicableTo || 'ALL');
                        if (item.description) feeForm.setValue('description', item.description);
                      }
                    }}
                  >
                    <option value="">-- Choose Catalogue Preset (e.g. Tuition, Uniform, Books, Lab, PE Kit) --</option>
                    {catalogue.map((cat: any) => (
                      <option key={cat.category} value={cat.name}>
                        {cat.name} ({cat.applicableTo === 'NEW_STUDENT' ? 'New Students Only' : 'All Students'}, {cat.defaultFrequency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="label">Fee Item Name *</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. First Term Tuition Fee, ICT & STEM Levy, Science Lab Consumables"
                  {...feeForm.register('name', { required: true })}
                />
              </div>

              <div>
                <label className="label">Base Amount (₦) *</label>
                <input
                  type="number"
                  min="0"
                  className="input w-full font-mono font-bold"
                  placeholder="0"
                  {...feeForm.register('amount', { valueAsNumber: true, required: true })}
                />
              </div>

              <div>
                <label className="label">Target Class Scope *</label>
                <select className="input w-full" {...feeForm.register('classId')}>
                  <option value="">All Classes (General Institutional Levy)</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  If set to "All Classes", every active student in the school will be charged this item upon bulk invoice generation.
                </p>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="label">Student Cohort Applicability *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'ALL', label: 'All Students', desc: 'Applies to both newly admitted and returning students.' },
                    { id: 'NEW_STUDENT', label: 'New Students Only', desc: 'Charged strictly on initial admission/enrollment (e.g. Uniform, Registration).' },
                    { id: 'RETURNING_STUDENT', label: 'Returning Only', desc: 'Charged strictly to continuing/promoted students.' },
                  ].map((cohort) => {
                    const currentCohort = feeForm.watch('applicableTo');
                    const isSelected = currentCohort === cohort.id;
                    return (
                      <div
                        key={cohort.id}
                        onClick={() => feeForm.setValue('applicableTo', cohort.id)}
                        className={cn(
                          'p-4 rounded-xl border cursor-pointer transition-all space-y-1',
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        )}
                      >
                        <p className="font-bold text-sm">{cohort.label}</p>
                        <p className="text-xs text-slate-500 leading-normal">{cohort.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="label">Billing Frequency & Lifecycle</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'TERM',
                      label: 'Per Term',
                      desc: 'Billed every academic term (e.g. Tuition, Exam levy, Sports).',
                    },
                    {
                      id: 'ONE_TIME',
                      label: 'One-Time',
                      desc: 'New entrants only upon admission (e.g. Registration, Uniform pack). Excluded for returning students.',
                    },
                    {
                      id: 'ANNUAL',
                      label: 'Annual',
                      desc: 'Billed once per academic session (e.g. Development levy, Student insurance).',
                    },
                  ].map((freq) => {
                    const currentType = feeForm.watch('feeType');
                    const isSelected = currentType === freq.id;
                    return (
                      <div
                        key={freq.id}
                        onClick={() => feeForm.setValue('feeType', freq.id)}
                        className={cn(
                          'p-4 rounded-xl border cursor-pointer transition-all space-y-1',
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        )}
                      >
                        <p className="font-bold text-sm">{freq.label}</p>
                        <p className="text-xs text-slate-500 leading-normal">{freq.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Publication Status</label>
                <select className="input w-full" {...feeForm.register('status')}>
                  <option value="PUBLISHED">Published (Active immediately for billing & visible to parents)</option>
                  <option value="DRAFT">Draft (Save internally for review before billing)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Description / Accounting Remarks (Optional)</label>
                <textarea
                  rows={3}
                  className="input w-full resize-none text-xs"
                  placeholder="Additional context, expenditure code, or fee justification..."
                  {...feeForm.register('description')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setTab('fees')}>
                Cancel
              </Button>
              <Button
                loading={createFeeMutation.isPending}
                onClick={feeForm.handleSubmit((d) => createFeeMutation.mutate(d))}
              >
                Save & Register Fee Structure
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal — Simple 3-field quick action */}
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

      {/* P5: Receipt Viewer — shows official receipt for posted payments */}
      <ReceiptViewer
        receipt={receiptData}
        open={!!receiptData}
        onClose={() => setReceiptData(null)}
      />
    </div>
  );
}
