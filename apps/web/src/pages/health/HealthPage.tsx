import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Heart, Plus, Edit, Trash2, Calendar, AlertCircle, ClipboardList, Eye, ChevronLeft } from 'lucide-react';
import { DataTable, Button, Modal, Input, StatCard } from '../../components/ui';
import { api } from '../../services/api';
import { formatDate, formatDateTime } from '../../lib/utils';

const hapi = {
  list: (p?: any) => api.get('/health', { params: p }),
  create: (d: any) => api.post('/health', d),
  update: (id: string, d: any) => api.put(`/health/${id}`, d),
  delete: (id: string) => api.delete(`/health/${id}`),
  getOne: (id: string) => api.get(`/health/${id}`),
  stats: () => api.get('/health/stats'),
  followUps: () => api.get('/health/follow-ups'),
  studentHistory: (id: string) => api.get(`/health/student/${id}`),
};

export default function HealthPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'records' | 'followups'>('records');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['health', page, search, fromDate, toDate],
    queryFn: () => hapi.list({ page, limit: 20, search, fromDate, toDate }).then(r => r.data),
    placeholderData: (prev) => prev,
    enabled: tab === 'records',
  });
  const { data: followUps, isLoading: fuLoading } = useQuery({
    queryKey: ['health-fu'],
    queryFn: () => hapi.followUps().then(r => r.data.data || []),
    enabled: tab === 'followups',
  });
  const { data: stats } = useQuery({ queryKey: ['health-stats'], queryFn: () => hapi.stats().then(r => r.data.data) });

  const form = useForm({
    defaultValues: { studentAdmNo: '', complaint: '', diagnosis: '', treatment: '', prescription: '', attendedBy: '', visitDate: new Date().toISOString().split('T')[0], followUpDate: '' },
  });

  const createMut = useMutation({
    mutationFn: (d: any) => editing ? hapi.update(editing.id, d) : hapi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Record updated' : 'Health record saved');
      qc.invalidateQueries({ queryKey: ['health'] });
      qc.invalidateQueries({ queryKey: ['health-stats'] });
      qc.invalidateQueries({ queryKey: ['health-fu'] });
      setModal(false);
      setEditing(null);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => hapi.delete(id),
    onSuccess: () => {
      toast.success('Record deleted');
      qc.invalidateQueries({ queryKey: ['health'] });
      qc.invalidateQueries({ queryKey: ['health-stats'] });
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openEdit = (r: any) => {
    setEditing(r);
    form.reset({
      studentAdmNo: r.student?.admissionNumber || '',
      complaint: r.complaint,
      diagnosis: r.diagnosis || '',
      treatment: r.treatment || '',
      prescription: r.prescription || '',
      attendedBy: r.attendedBy || '',
      visitDate: r.visitDate ? r.visitDate.split('T')[0] : new Date().toISOString().split('T')[0],
      followUpDate: r.followUpDate ? r.followUpDate.split('T')[0] : '',
    });
    setModal(true);
  };

  const records: any[] = data?.data || [];
  const fuList: any[] = followUps || [];

  const columns = [
    {
      key: 'student', header: 'Patient',
      render: (r: any) => (
        <div>
          <p className="font-semibold text-slate-900">{r.student?.firstName} {r.student?.lastName}</p>
          <p className="text-xs font-mono text-slate-400">{r.student?.admissionNumber}</p>
        </div>
      ),
    },
    { key: 'visitDate', header: 'Visit Date', render: (r: any) => <span className="text-sm">{formatDate(r.visitDate)}</span> },
    {
      key: 'complaint', header: 'Complaint',
      render: (r: any) => <span className="text-sm text-slate-600 max-w-xs truncate block">{r.complaint}</span>,
    },
    { key: 'diagnosis', header: 'Diagnosis', render: (r: any) => <span className="text-sm">{r.diagnosis || '—'}</span> },
    { key: 'attendedBy', header: 'Attended By', render: (r: any) => <span className="text-sm">{r.attendedBy || '—'}</span> },
    {
      key: 'followUpDate', header: 'Follow-up',
      render: (r: any) => {
        if (!r.followUpDate) return <span className="text-slate-400">—</span>;
        const isPast = new Date(r.followUpDate) < new Date();
        const isNear = !isPast && new Date(r.followUpDate) < new Date(Date.now() + 3 * 86400000);
        return (
          <span className={isPast ? 'text-red-500 font-semibold text-sm' : isNear ? 'text-amber-600 font-semibold text-sm' : 'text-emerald-600 text-sm'}>
            {formatDate(r.followUpDate)}{isPast ? ' ⚠️' : ''}
          </span>
        );
      },
    },
    {
      key: 'actions', header: '',
      render: (r: any) => (
        <div className="flex gap-1">
          <button onClick={() => setViewing(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="View full record"><Eye size={14} /></button>
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50" title="Edit"><Edit size={14} /></button>
          <button onClick={() => setDeleteConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Records</h1>
          <p className="page-subtitle">Student clinic visits, diagnoses and prescriptions</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); form.reset({ visitDate: new Date().toISOString().split('T')[0] }); setModal(true); }}>
          New Visit Record
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={stats?.total || 0} icon={<Heart size={20} />} color="red" />
        <StatCard title="Today's Visits" value={stats?.todayVisits || 0} icon={<Calendar size={20} />} color="blue" />
        <StatCard title="This Month" value={stats?.thisMonthVisits || 0} icon={<ClipboardList size={20} />} color="purple" />
        <StatCard title="Pending Follow-ups" value={stats?.pendingFollowUps || 0} icon={<AlertCircle size={20} />} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['records', 'followups'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'followups' ? `Follow-ups ${stats?.pendingFollowUps ? `(${stats.pendingFollowUps})` : ''}` : 'All Records'}
          </button>
        ))}
      </div>

      {/* Date filters for records tab */}
      {tab === 'records' && (
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">From:</label>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input py-2 text-sm w-40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">To:</label>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input py-2 text-sm w-40" />
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-sm text-blue-600 hover:underline">Clear dates</button>
          )}
        </div>
      )}

      {/* All Records Tab */}
      {tab === 'records' && (
        <DataTable
          data={records}
          columns={columns}
          loading={isLoading}
          onSearch={q => { setSearch(q); setPage(1); }}
          searchPlaceholder="Search by student name or admission number..."
          pagination={data?.meta ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
          emptyMessage="No health records found."
        />
      )}

      {/* Follow-ups Tab */}
      {tab === 'followups' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50">
            <h3 className="font-bold text-amber-800">Upcoming & Overdue Follow-ups</h3>
          </div>
          {fuLoading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : !fuList.length ? (
            <div className="p-12 text-center">
              <AlertCircle size={48} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No pending follow-ups</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {fuList.map((r: any) => {
                const isOverdue = new Date(r.followUpDate) < new Date();
                return (
                  <div key={r.id} className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <AlertCircle size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{r.student?.firstName} {r.student?.lastName}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.student?.admissionNumber}</p>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-1">{r.complaint}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                        {formatDate(r.followUpDate)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{isOverdue ? 'OVERDUE' : 'Scheduled'}</p>
                    </div>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 flex-shrink-0" title="Edit">
                      <Edit size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); form.reset(); }}
        title={editing ? 'Edit Health Record' : 'New Clinic Visit Record'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModal(false); setEditing(null); form.reset(); }}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={form.handleSubmit(d => createMut.mutate(d))}>
              {editing ? 'Update Record' : 'Save Record'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student Admission Number *"
              {...form.register('studentAdmNo', { required: true })}
              placeholder="e.g. BF/25/001"
              disabled={!!editing}
            />
            <Input label="Visit Date *" type="date" {...form.register('visitDate', { required: true })} />
          </div>
          <div>
            <label className="label">Complaint / Symptoms *</label>
            <textarea {...form.register('complaint', { required: true })} rows={2} className="input resize-none" placeholder="Describe the presenting complaint..." />
          </div>
          <div>
            <label className="label">Diagnosis</label>
            <textarea {...form.register('diagnosis')} rows={2} className="input resize-none" placeholder="Doctor's diagnosis..." />
          </div>
          <div>
            <label className="label">Treatment Administered</label>
            <textarea {...form.register('treatment')} rows={2} className="input resize-none" placeholder="Treatment given at clinic..." />
          </div>
          <div>
            <label className="label">Prescription / Medications</label>
            <textarea {...form.register('prescription')} rows={2} className="input resize-none" placeholder="Medications prescribed..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Attended By (Doctor/Nurse)" {...form.register('attendedBy')} placeholder="Name of attending staff" />
            <Input label="Follow-up Date" type="date" {...form.register('followUpDate')} />
          </div>
        </div>
      </Modal>

      {/* View Record Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Health Record Details" size="md"
        footer={<><Button variant="secondary" onClick={() => { openEdit(viewing); setViewing(null); }} icon={<Edit size={15} />}>Edit</Button><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button></>}>
        {viewing && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="font-bold text-slate-900">{viewing.student?.firstName} {viewing.student?.lastName}</p>
              <p className="text-sm text-slate-400 font-mono">{viewing.student?.admissionNumber} • {viewing.student?.gender}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Visit Date', formatDate(viewing.visitDate)],
                ['Attended By', viewing.attendedBy || '—'],
                ['Follow-up', viewing.followUpDate ? formatDate(viewing.followUpDate) : 'None'],
              ].map(([k, v]) => (
                <div key={k}><p className="text-slate-400 text-xs">{k}</p><p className="font-semibold text-slate-800">{v}</p></div>
              ))}
            </div>
            {[
              ['Complaint', viewing.complaint],
              ['Diagnosis', viewing.diagnosis],
              ['Treatment', viewing.treatment],
              ['Prescription', viewing.prescription],
            ].filter(([_, v]) => v).map(([k, v]) => (
              <div key={k} className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{k}</p>
                <p className="text-sm text-slate-700">{v}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Record" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteConfirm.id)}>Delete</Button></>}>
        <p>Delete the health record for <strong>{deleteConfirm?.student?.firstName} {deleteConfirm?.student?.lastName}</strong> dated {formatDate(deleteConfirm?.visitDate)}? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
