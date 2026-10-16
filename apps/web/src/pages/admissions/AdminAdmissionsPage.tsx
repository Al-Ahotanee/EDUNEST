import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FileText, CheckCircle, XCircle, Clock, Eye, Users,
  TrendingUp, RefreshCw, AlertCircle, ChevronRight,
} from 'lucide-react';
import {
  DataTable, Button, Modal, StatCard, Badge, PageLoader,
} from '../../components/ui';
import { api } from '../../services/api';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const admissionsApi = {
  list: (params?: any) => api.get('/admissions', { params }),
  getOne: (id: string) => api.get(`/admissions/${id}`),
  stats: () => api.get('/admissions/stats'),
  approve: (id: string) => api.patch(`/admissions/${id}/approve`),
  reject: (id: string, reason?: string) => api.patch(`/admissions/${id}/reject`, { reason }),
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    PENDING:   { cls: 'badge-yellow', icon: <Clock size={11} />, label: 'Pending' },
    SCREENING: { cls: 'badge-blue',   icon: <Eye size={11} />, label: 'Screening' },
    APPROVED:  { cls: 'badge-green',  icon: <CheckCircle size={11} />, label: 'Approved' },
    REJECTED:  { cls: 'badge-red',    icon: <XCircle size={11} />, label: 'Rejected' },
    ENROLLED:  { cls: 'badge-purple', icon: <CheckCircle size={11} />, label: 'Enrolled' },
  };
  const cfg = map[status] || map.PENDING;
  return <span className={`${cfg.cls} inline-flex items-center gap-1`}>{cfg.icon} {cfg.label}</span>;
}

export default function AdmissionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admissions', page, search, statusFilter],
    queryFn: () => admissionsApi.list({ page, limit: 20, search, status: statusFilter }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ['admission-stats'],
    queryFn: () => admissionsApi.stats().then(r => r.data.data),
  });

  const { data: detailData } = useQuery({
    queryKey: ['admission-detail', selected?.id],
    queryFn: () => admissionsApi.getOne(selected.id).then(r => r.data.data),
    enabled: !!selected?.id,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => admissionsApi.approve(id),
    onSuccess: (_, id) => {
      toast.success('Application approved! Student record created.');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (selected?.id === id) setSelected(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => admissionsApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Application rejected');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
      setRejectModal(null);
      setRejectReason('');
      if (selected) setSelected(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Rejection failed'),
  });

  const columns = [
    {
      key: 'applicationNo', header: 'Application #',
      render: (r: any) => <span className="font-mono text-blue-600 text-sm font-bold">{r.applicationNo}</span>,
    },
    {
      key: 'name', header: 'Applicant',
      render: (r: any) => (
        <div>
          <p className="font-semibold text-slate-900">{r.firstName} {r.lastName}</p>
          <p className="text-xs text-slate-400">{r.gender} • DOB: {formatDate(r.dateOfBirth)}</p>
        </div>
      ),
    },
    { key: 'applyingForClass', header: 'Class', render: (r: any) => <span className="badge-blue">{r.applyingForClass}</span> },
    {
      key: 'parentName', header: 'Parent/Guardian',
      render: (r: any) => (
        <div>
          <p className="text-sm font-medium">{r.parentName}</p>
          <p className="text-xs text-slate-400">{r.parentPhone}</p>
        </div>
      ),
    },
    { key: 'createdAt', header: 'Applied', render: (r: any) => <span className="text-sm text-slate-500">{formatDate(r.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r: any) => (
        <div className="flex gap-1">
          <button onClick={() => setSelected(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-all" title="View">
            <Eye size={15} />
          </button>
          {(r.status === 'PENDING' || r.status === 'SCREENING') && (
            <>
              <button
                onClick={() => approveMutation.mutate(r.id)}
                className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all" title="Approve"
                disabled={approveMutation.isPending}
              >
                <CheckCircle size={15} />
              </button>
              <button
                onClick={() => setRejectModal(r)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all" title="Reject"
              >
                <XCircle size={15} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Parse extra data from notes field
  const getExtraData = (admission: any) => {
    if (!admission?.notes) return {};
    try { return JSON.parse(admission.notes); } catch { return {}; }
  };

  const schoolSlug = user?.tenant?.slug || 'your-school';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions Management</h1>
          <p className="page-subtitle">Review and process student applications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => refetch()}>Refresh</Button>
          <a
            href={`/admissions/${schoolSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <FileText size={16} /> View Public Portal
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Applications" value={stats?.total || 0} icon={<FileText size={18} />} color="blue" />
        <StatCard title="Pending" value={stats?.pending || 0} icon={<Clock size={18} />} color="amber" />
        <StatCard title="Screening" value={stats?.screening || 0} icon={<Eye size={18} />} color="cyan" />
        <StatCard title="Approved" value={stats?.approved || 0} icon={<CheckCircle size={18} />} color="green" />
        <StatCard title="Rejected" value={stats?.rejected || 0} icon={<XCircle size={18} />} color="red" />
      </div>

      {/* Portal Link Banner */}
      <div className="card p-5 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-100 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-xl text-blue-600 flex-shrink-0">
          <FileText size={22} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-900">Public Admissions Portal</p>
          <p className="text-sm text-slate-600 mt-0.5">
            Share this link with prospective parents to apply online:
          </p>
          <p className="text-sm font-mono text-blue-600 mt-1 bg-white px-3 py-1 rounded-lg border border-blue-100 inline-block">
            {window.location.origin}/admissions/{schoolSlug}
          </p>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/admissions/${schoolSlug}`); toast.success('Link copied!'); }}
          className="btn-primary btn-sm flex-shrink-0"
        >
          Copy Link
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input w-44 py-2 text-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="SCREENING">Screening</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        onSearch={q => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by name, app number, or parent..."
        pagination={data?.meta ? {
          page: data.meta.page, limit: data.meta.limit,
          total: data.meta.total, totalPages: data.meta.totalPages,
          onPageChange: setPage,
        } : undefined}
        emptyMessage="No applications found."
      />

      {/* Application Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Application — ${selected?.applicationNo}`}
        size="lg"
        footer={
          selected && (selected.status === 'PENDING' || selected.status === 'SCREENING') ? (
            <div className="flex gap-2 w-full">
              <Button variant="danger" icon={<XCircle size={15} />} onClick={() => { setRejectModal(selected); setSelected(null); }}>
                Reject
              </Button>
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              <Button icon={<CheckCircle size={15} />} loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate(selected.id)}>
                Approve & Create Student Record
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} />
              <span className="text-sm text-slate-400">Applied: {formatDate(selected.createdAt)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Student Info */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Details</p>
                {[
                  ['Full Name', `${selected.firstName} ${selected.otherName || ''} ${selected.lastName}`],
                  ['Gender', selected.gender],
                  ['Date of Birth', formatDate(selected.dateOfBirth)],
                  ['Class Applied', selected.applyingForClass],
                  ['State of Origin', getExtraData(detailData || selected).stateOfOrigin || '—'],
                  ['LGA', getExtraData(detailData || selected).lga || '—'],
                  ['Religion', getExtraData(detailData || selected).religion || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-slate-400 w-32 flex-shrink-0">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>

              {/* Parent Info */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent / Guardian</p>
                {[
                  ['Name', selected.parentName],
                  ['Relationship', getExtraData(detailData || selected).parentRelationship || '—'],
                  ['Phone', selected.parentPhone],
                  ['Email', selected.email || '—'],
                  ['Occupation', getExtraData(detailData || selected).parentOccupation || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-slate-400 w-32 flex-shrink-0">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="p-4 bg-slate-50 rounded-xl text-sm">
              <span className="text-slate-400">Home Address: </span>
              <span className="font-medium">{getExtraData(detailData || selected).address || '—'}</span>
            </div>

            {/* Previous school */}
            {getExtraData(detailData || selected).previousSchool && (
              <div className="p-4 bg-amber-50 rounded-xl text-sm border border-amber-100">
                <span className="text-amber-700 font-medium">Previous School: </span>
                <span>{getExtraData(detailData || selected).previousSchool}</span>
              </div>
            )}

            {selected.examScore && (
              <div className="p-4 bg-blue-50 rounded-xl text-sm border border-blue-100">
                <span className="text-blue-700 font-medium">Entrance Exam Score: </span>
                <span className="text-xl font-black text-blue-600">{selected.examScore}/100</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(''); }}
        title="Reject Application"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="danger" loading={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl flex gap-3 border border-red-100">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <strong>Rejecting: {rejectModal?.firstName} {rejectModal?.lastName}</strong>
              <p className="mt-0.5 text-red-600">The parent will be notified via email/SMS. This action can be reversed.</p>
            </div>
          </div>
          <div>
            <label className="label">Reason for Rejection (optional)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="e.g. Class is full, does not meet entry requirements..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
