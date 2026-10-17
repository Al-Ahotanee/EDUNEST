import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Package, Plus, Edit, Trash2, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
import { DataTable, Button, Modal, Input, Select, StatCard } from '../../components/ui';
import { api } from '../../services/api';
import { formatCurrency, cn } from '../../lib/utils';

const iapi = {
  list: (p?: any) => api.get('/inventory', { params: p }),
  create: (d: any) => api.post('/inventory', d),
  update: (id: string, d: any) => api.put(`/inventory/${id}`, d),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  adjust: (id: string, d: any) => api.patch(`/inventory/${id}/stock`, d),
  stats: () => api.get('/inventory/stats'),
};

const CATEGORIES = [
  'Furniture', 'Electronics', 'Books & Stationery', 'Sports Equipment',
  'Laboratory Equipment', 'Kitchen & Catering', 'Cleaning Supplies',
  'Medical Supplies', 'Office Equipment', 'Vehicles & Transport', 'Others',
];

export default function InventoryPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, search, catFilter],
    queryFn: () => iapi.list({ page, limit: 20, search, category: catFilter }).then(r => r.data),
    placeholderData: (prev) => prev,
  });
  const { data: stats } = useQuery({ queryKey: ['inv-stats'], queryFn: () => iapi.stats().then(r => r.data.data) });

  const form = useForm({
    defaultValues: { name: '', category: '', quantity: 0, unit: 'pieces', unitPrice: '', reorderLevel: '', location: '' },
  });
  const adjustForm = useForm({ defaultValues: { quantity: 1, type: 'ADD', notes: '' } });

  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? iapi.update(editing.id, d) : iapi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Item updated' : 'Item added');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inv-stats'] });
      setModal(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => iapi.delete(id),
    onSuccess: () => {
      toast.success('Item deleted');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inv-stats'] });
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const adjustMut = useMutation({
    mutationFn: ({ id, d }: any) => iapi.adjust(id, d),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inv-stats'] });
      setAdjustModal(null); adjustForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openEdit = (item: any) => {
    setEditing(item);
    form.reset({
      name: item.name, category: item.category || '', quantity: item.quantity,
      unit: item.unit || 'pieces', unitPrice: item.unitPrice || '',
      reorderLevel: item.reorderLevel || '', location: item.location || '',
    });
    setModal(true);
  };

  const items: any[] = data?.data || [];

  const columns = [
    {
      key: 'name', header: 'Item',
      render: (r: any) => (
        <div>
          <p className="font-semibold text-slate-900">{r.name}</p>
          {r.location && <p className="text-xs text-slate-400">📍 {r.location}</p>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r: any) => r.category ? <span className="badge-blue">{r.category}</span> : <span className="text-slate-400">—</span> },
    {
      key: 'quantity', header: 'Qty',
      render: (r: any) => {
        const isLow = r.reorderLevel && r.quantity <= r.reorderLevel;
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn('font-bold text-lg', isLow ? 'text-red-500' : 'text-slate-900')}>{r.quantity}</span>
            <span className="text-xs text-slate-400">{r.unit}</span>
            {isLow && <AlertTriangle size={13} className="text-red-500" />}
          </div>
        );
      },
    },
    {
      key: 'reorderLevel', header: 'Reorder At',
      render: (r: any) => r.reorderLevel
        ? <span className={cn('text-sm', r.quantity <= r.reorderLevel ? 'text-red-500 font-bold' : 'text-slate-400')}>{r.reorderLevel}</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      key: 'unitPrice', header: 'Unit Price',
      render: (r: any) => r.unitPrice ? <span className="text-sm">{formatCurrency(r.unitPrice)}</span> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'value', header: 'Total Value',
      render: (r: any) => r.unitPrice
        ? <span className="text-sm font-medium">{formatCurrency(r.unitPrice * r.quantity)}</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      key: 'actions', header: '',
      render: (r: any) => (
        <div className="flex gap-1">
          <button onClick={() => { setAdjustModal(r); adjustForm.reset({ quantity: 1, type: 'ADD', notes: '' }); }} title="Adjust Stock" className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><BarChart3 size={14} /></button>
          <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50"><Edit size={14} /></button>
          <button onClick={() => setDeleteConfirm(r)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const catStats: any[] = stats?.categories || [];
  const adjustType = adjustForm.watch('type');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Inventory & Assets</h1><p className="page-subtitle">Track school assets, equipment and supplies</p></div>
        <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); form.reset({ quantity: 0, unit: 'pieces' }); setModal(true); }}>Add Item</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={stats?.totalItems || 0} icon={<Package size={20} />} color="blue" />
        <StatCard title="Total Quantity" value={(stats?.totalQuantity || 0).toLocaleString()} icon={<BarChart3 size={20} />} color="green" />
        <StatCard title="Low Stock" value={stats?.lowStock || 0} icon={<AlertTriangle size={20} />} color="red" />
        <StatCard title="Categories" value={catStats.length} icon={<Package size={20} />} color="purple" />
      </div>

      {/* Category breakdown */}
      {catStats.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3 text-sm">Items by Category</h3>
          <div className="flex flex-wrap gap-2">
            {catStats.map((c: any) => (
              <button key={c.name} onClick={() => setCatFilter(catFilter === c.name ? '' : c.name)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all', catFilter === c.name ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300')}>
                {c.name} <span className="ml-1 opacity-70">({c.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} className="input w-52 py-2 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {catFilter && <button onClick={() => setCatFilter('')} className="text-sm text-blue-600 hover:underline">Clear filter</button>}
      </div>

      <DataTable
        data={items} columns={columns} loading={isLoading}
        onSearch={q => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search items, category..."
        pagination={data?.meta ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
        emptyMessage="No inventory items found."
      />

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); form.reset(); }}
        title={editing ? 'Edit Inventory Item' : 'Add New Item'}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => { setModal(false); setEditing(null); form.reset(); }}>Cancel</Button><Button loading={saveMut.isPending} onClick={form.handleSubmit(d => saveMut.mutate(d))}>{editing ? 'Update' : 'Add Item'}</Button></>}>
        <div className="space-y-4">
          <Input label="Item Name *" {...form.register('name', { required: true })} placeholder="e.g. Student Desk, Projector" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category *" {...form.register('category', { required: true })}
              options={[{ value: '', label: '— Select category —' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
            <Input label="Unit of Measurement" {...form.register('unit')} placeholder="pieces, kg, litres..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Current Quantity *" type="number" {...form.register('quantity', { valueAsNumber: true, required: true })} min={0} />
            <Input label="Unit Price (₦)" type="number" {...form.register('unitPrice')} min={0} placeholder="Optional" />
            <Input label="Reorder Level" type="number" {...form.register('reorderLevel')} min={0} placeholder="Alert threshold" />
          </div>
          <Input label="Storage Location" {...form.register('location')} placeholder="e.g. Store Room A, Staff Block" />
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!adjustModal} onClose={() => { setAdjustModal(null); adjustForm.reset(); }}
        title={`Adjust Stock — ${adjustModal?.name}`}
        size="sm"
        footer={<><Button variant="secondary" onClick={() => { setAdjustModal(null); adjustForm.reset(); }}>Cancel</Button><Button loading={adjustMut.isPending} onClick={adjustForm.handleSubmit(d => adjustMut.mutate({ id: adjustModal.id, d }))}> Confirm Adjustment</Button></>}>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl flex justify-between text-sm border border-slate-200">
            <div><p className="text-slate-400">Current Stock</p><p className="font-bold text-2xl text-slate-900">{adjustModal?.quantity} <span className="text-sm font-normal text-slate-500">{adjustModal?.unit}</span></p></div>
            {adjustModal?.reorderLevel && <div className="text-right"><p className="text-slate-400">Reorder At</p><p className={cn('font-bold text-lg', adjustModal.quantity <= adjustModal.reorderLevel ? 'text-red-500' : 'text-slate-600')}>{adjustModal.reorderLevel}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => adjustForm.setValue('type', 'ADD')} className={cn('py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all', adjustType === 'ADD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500')}>
              <TrendingUp size={14} /> Add Stock
            </button>
            <button onClick={() => adjustForm.setValue('type', 'REMOVE')} className={cn('py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all', adjustType === 'REMOVE' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500')}>
              <TrendingDown size={14} /> Remove Stock
            </button>
          </div>
          <Input label="Quantity *" type="number" {...adjustForm.register('quantity', { valueAsNumber: true, required: true })} min={1} />
          <div>
            <label className="label">Notes (optional)</label>
            <input {...adjustForm.register('notes')} className="input" placeholder="Reason for adjustment..." />
          </div>
          {adjustType === 'REMOVE' && adjustModal && (
            <p className="text-xs text-slate-500">New quantity will be: <span className="font-bold text-slate-800">{Math.max(0, (adjustModal.quantity || 0) - (adjustForm.watch('quantity') || 0))} {adjustModal.unit}</span></p>
          )}
          {adjustType === 'ADD' && adjustModal && (
            <p className="text-xs text-slate-500">New quantity will be: <span className="font-bold text-slate-800">{(adjustModal.quantity || 0) + (adjustForm.watch('quantity') || 0)} {adjustModal.unit}</span></p>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Item" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteConfirm.id)}>Delete</Button></>}>
        <p>Delete <strong>"{deleteConfirm?.name}"</strong> from inventory? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
