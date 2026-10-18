import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FileText, CheckCircle, XCircle, Clock, Eye, Users,
  TrendingUp, RefreshCw, AlertCircle, ChevronRight, Printer, Download,
  ShieldCheck, Award, Mail, Phone, Calendar, GraduationCap
} from 'lucide-react';
import {
  DataTable, Button, Modal, StatCard, Badge, PageLoader,
} from '../../components/ui';
import { api } from '../../services/api';
import { formatDate, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { schoolsApi } from '../../services/api';
import { EduNestIcon } from '../../components/common/EduNestLogo';

const admissionsApi = {
  list: (params?: any) => api.get('/admissions', { params }),
  getOne: (id: string) => api.get(`/admissions/${id}`),
  stats: () => api.get('/admissions/stats'),
  approve: (id: string, classId?: string) => api.patch(`/admissions/${id}/approve`, classId ? { classId } : {}),
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

  // EDN-006 fix: Fetch real school data to get the actual slug
  const { data: schoolData } = useQuery({
    queryKey: ['current-school-admissions'],
    queryFn: async () => {
      const res = await schoolsApi.current();
      return res.data?.data || res.data;
    },
  });
  const school = schoolData || user?.tenant || user?.school || { name: 'School', slug: 'demo-school' };
  const schoolSlug = school?.slug || user?.tenant?.slug || 'demo-school';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [admissionLetter, setAdmissionLetter] = useState<any>(null);
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
      if (selected?.id === id) {
        setAdmissionLetter(selected);
        setSelected(null);
      }
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

  const handleExportAdmissions = () => {
    const list = data?.data || [];
    if (!list.length) { toast.error('No admissions to export'); return; }
    const headers = ['Application #', 'Applicant Name', 'Gender', 'Class Applied', 'Parent Name', 'Parent Phone', 'Email', 'Date Applied', 'Status'];
    const rows = list.map((a: any) => [
      `"${a.applicationNo || ''}"`,
      `"${a.firstName || ''} ${a.lastName || ''}"`,
      `"${a.gender || ''}"`,
      `"${a.applyingForClass || ''}"`,
      `"${a.parentName || ''}"`,
      `"${a.parentPhone || ''}"`,
      `"${a.email || ''}"`,
      `"${formatDate(a.createdAt)}"`,
      `"${a.status || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Admissions_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Admissions register exported as CSV');
  };

  const columns = [
    {
      key: 'applicationNo', header: 'Application #',
      render: (r: any) => <span className="font-mono text-blue-600 text-sm font-bold">{r.applicationNo}</span>,
    },
    {
      key: 'name', header: 'Applicant',
      render: (r: any) => (
        <div>
          <p className="font-semibold text-slate-900 leading-tight">{r.firstName} {r.lastName}</p>
          <p className="text-xs text-slate-400">{r.gender} • DOB: {formatDate(r.dateOfBirth)}</p>
        </div>
      ),
    },
    { key: 'applyingForClass', header: 'Class Applied', render: (r: any) => <span className="badge-blue font-semibold">{r.applyingForClass}</span> },
    {
      key: 'parentName', header: 'Parent / Guardian',
      render: (r: any) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{r.parentName}</p>
          <p className="text-xs text-slate-400 font-mono">{r.parentPhone}</p>
        </div>
      ),
    },
    { key: 'createdAt', header: 'Applied On', render: (r: any) => <span className="text-sm text-slate-500">{formatDate(r.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSelected(r)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all" title="View Application">
            <Eye size={15} />
          </button>
          {(r.status === 'APPROVED' || r.status === 'ENROLLED') && (
            <button
              onClick={() => setAdmissionLetter(r)}
              className="btn-secondary btn-sm gap-1"
              title="Print Admission Letter"
            >
              <Printer size={13} />
              Letter
            </button>
          )}
          {(r.status === 'PENDING' || r.status === 'SCREENING') && (
            <>
              <button
                onClick={() => approveMutation.mutate(r.id)}
                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
                title="Approve & Enroll Student"
                disabled={approveMutation.isPending}
              >
                <CheckCircle size={15} />
              </button>
              <button
                onClick={() => setRejectModal(r)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                title="Reject Application"
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

  // EDN-006 fix: schoolSlug is now resolved from the fetched school data above

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions Management</h1>
          <p className="page-subtitle">Review, process and admit prospective student candidates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => refetch()}>Refresh</Button>
          <Button variant="secondary" icon={<Download size={15} />} onClick={handleExportAdmissions}>Export CSV</Button>
          <a
            href={`/admissions/${schoolSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <FileText size={15} /> Public Portal
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Enrolled Students" value={stats?.enrolledStudents || 0} icon={<GraduationCap size={18} />} color="green" />
        <StatCard title="Total Applications" value={stats?.total || 0} icon={<FileText size={18} />} color="blue" />
        <StatCard title="Pending" value={stats?.pending || 0} icon={<Clock size={18} />} color="amber" />
        <StatCard title="Screening" value={stats?.screening || 0} icon={<Eye size={18} />} color="cyan" />
        <StatCard title="Approved" value={stats?.approved || 0} icon={<CheckCircle size={18} />} color="green" />
        <StatCard title="Rejected" value={stats?.rejected || 0} icon={<XCircle size={18} />} color="red" />
      </div>

      {/* Portal Link Banner */}
      <div className="card p-5 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600 flex-shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <p className="font-bold text-slate-900">Public Admissions Portal</p>
            <p className="text-sm text-slate-600">Share this direct link with prospective parents to apply online:</p>
            <p className="text-xs font-mono text-blue-700 mt-1 bg-white px-2.5 py-1 rounded border border-blue-200 inline-block break-all">
              {window.location.origin}/admissions/{schoolSlug}
            </p>
          </div>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/admissions/${schoolSlug}`); toast.success('Admissions link copied!'); }}
          className="btn-primary btn-sm whitespace-nowrap flex-shrink-0"
        >
          Copy Link
        </button>
      </div>

      {/* Pipeline Status Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: '', label: 'All Applications', count: stats?.total || 0 },
            { id: 'PENDING', label: 'Pending', count: stats?.pending || 0 },
            { id: 'SCREENING', label: 'Screening', count: stats?.screening || 0 },
            { id: 'APPROVED', label: 'Approved', count: stats?.approved || 0 },
            { id: 'REJECTED', label: 'Rejected', count: stats?.rejected || 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === tab.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
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

      {/* Official Provisional Offer of Admission Letter Modal */}
      <Modal
        open={!!admissionLetter}
        onClose={() => setAdmissionLetter(null)}
        title="Official Provisional Offer of Admission"
        size="2xl"
        footer={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Ref: EDN/ADM/{new Date().getFullYear()}/{admissionLetter?.applicationNo}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setAdmissionLetter(null)}>Close</Button>
              <Button icon={<Printer size={15} />} onClick={() => window.print()}>
                Print Official Letter
              </Button>
            </div>
          </div>
        }
      >
        {admissionLetter && (
          <div id="printable-admission-letter" className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none font-serif text-slate-900 leading-relaxed text-sm">
            {/* Letterhead */}
            <div className="text-center pb-5 border-b-2 border-slate-900">
              <div className="flex items-center justify-center gap-3 mb-2">
                <EduNestIcon size={38} />
                <h1 className="text-2xl font-black font-sans uppercase tracking-wider text-slate-900">
                  {school?.name || 'EduNest International College'}
                </h1>
              </div>
              <p className="text-xs italic font-serif text-slate-600">
                {(school as any)?.motto || 'Excellence in Leadership, Academics & Character'}
              </p>
              <p className="text-xs font-sans text-slate-500 mt-1">
                {(school as any)?.address || '12 Academy Boulevard, Victoria Island'} • Tel: {(school as any)?.phone || '+234 (0) 800-EDUNEST'} • Email: {(school as any)?.email || 'admissions@edunest.edu'}
              </p>
              <p className="text-[11px] font-sans text-slate-400 mt-0.5">
                Approved by Ministry of Education & National Examinations Council
              </p>
            </div>

            {/* Letter Meta Reference */}
            <div className="flex justify-between items-center my-4 font-sans text-xs text-slate-700">
              <div>
                <span className="font-bold">Our Ref: </span>
                <span className="font-mono">EDN/ADM/{new Date().getFullYear()}/{admissionLetter.applicationNo}</span>
              </div>
              <div>
                <span className="font-bold">Date: </span>
                <span>{formatDate(admissionLetter.createdAt || new Date())}</span>
              </div>
            </div>

            {/* Addressee */}
            <div className="mb-4 font-sans text-xs space-y-0.5">
              <p className="font-bold text-slate-900 text-sm">To: Mr. / Mrs. {admissionLetter.parentName}</p>
              <p className="text-slate-600">Parent / Guardian to Candidate: {admissionLetter.firstName} {admissionLetter.lastName}</p>
              <p className="text-slate-500 font-mono">Contact: {admissionLetter.parentPhone}</p>
            </div>

            {/* Letter Subject */}
            <div className="text-center my-5 py-2 px-3 bg-slate-100 rounded border border-slate-300 font-sans">
              <p className="font-black text-slate-900 text-sm tracking-wide uppercase">
                PROVISIONAL OFFER OF ADMISSION INTO {admissionLetter.applyingForClass?.toUpperCase()}
              </p>
              <p className="text-xs font-semibold text-slate-600">FOR THE 2026/2027 ACADEMIC SESSION</p>
            </div>

            {/* Letter Body */}
            <div className="space-y-3 text-justify">
              <p>
                Dear <strong className="font-sans">{admissionLetter.parentName}</strong>,
              </p>
              <p>
                Following the review of your ward’s application and evaluation of the entrance assessment portfolio,
                the Board of Governors and the Admissions Committee are pleased to inform you that{' '}
                <strong className="font-sans text-slate-900">{admissionLetter.firstName} {admissionLetter.lastName}</strong>{' '}
                has been granted <strong className="underline">Provisional Admission</strong> into{' '}
                <strong className="font-sans text-blue-900">{admissionLetter.applyingForClass}</strong> for the upcoming academic session.
              </p>

              {/* Placement Details Table */}
              <div className="my-3 font-sans text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-700 uppercase tracking-wider mb-2 text-[11px]">Candidate Placement Summary</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-500">Applicant ID:</span> <span className="font-mono font-bold">{admissionLetter.applicationNo}</span></div>
                  <div><span className="text-slate-500">Admitted Class:</span> <span className="font-bold text-slate-900">{admissionLetter.applyingForClass}</span></div>
                  <div><span className="text-slate-500">Gender / DOB:</span> <span className="font-semibold">{admissionLetter.gender} • {formatDate(admissionLetter.dateOfBirth)}</span></div>
                  <div><span className="text-slate-500">Assessment Status:</span> <span className="font-semibold text-emerald-700">{admissionLetter.examScore ? `Score: ${admissionLetter.examScore}% (Merit Pass)` : 'Qualified on Review'}</span></div>
                </div>
              </div>

              <p>
                This provisional offer is contingent upon fulfillment of the following registration prerequisites:
              </p>
              <ol className="list-decimal pl-5 space-y-1 font-sans text-xs text-slate-700">
                <li>Payment of the non-refundable Acceptance Fee and First Term Tuition within <strong>fourteen (14) calendar days</strong> of this notice.</li>
                <li>Submission of two (2) certified photocopies of the candidate’s birth certificate and cumulative report sheet from the previous school.</li>
                <li>Submission of the certified Medical Fitness Report and completed Student Health Profile.</li>
                <li>Adherence to the institution's Code of Conduct, Student Charter, and Boarding Regulations (if applicable).</li>
              </ol>

              <p className="pt-1">
                Please accept our sincere congratulations. We look forward to partnering with your family to nurture your child’s academic and moral excellence.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-8 pt-4 font-sans text-xs">
              <div>
                <div className="border-b border-slate-400 w-44 h-8 mb-1 flex items-end">
                  <span className="font-serif italic text-blue-900 text-sm">M. Adeyemi</span>
                </div>
                <p className="font-bold text-slate-900">Registrar & Admissions Officer</p>
                <p className="text-slate-500">EduNest Academic Registry</p>
              </div>
              <div className="text-right">
                <div className="border-b border-slate-400 w-44 h-8 mb-1 ml-auto flex items-end justify-end">
                  <span className="font-serif italic text-blue-900 text-sm">Dr. E. K. Okafor</span>
                </div>
                <p className="font-bold text-slate-900">Principal / Head of College</p>
                <p className="text-slate-500">Official Seal Validated</p>
              </div>
            </div>

            {/* Perforated Acceptance Slip */}
            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300 font-sans text-xs">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                  DETACHABLE ADMISSION ACCEPTANCE SLIP (RETURN TO BURSARY / ADMISSIONS DESK)
                </p>
                <span className="text-[10px] font-mono text-slate-400">APP #{admissionLetter.applicationNo}</span>
              </div>
              <p className="text-slate-600 mb-3 text-[11px]">
                I, <span className="border-b border-slate-400 inline-block w-48 px-1 font-bold text-slate-900">{admissionLetter.parentName}</span>, hereby accept the provisional offer of admission for my ward <span className="border-b border-slate-400 inline-block w-48 px-1 font-bold text-slate-900">{admissionLetter.firstName} {admissionLetter.lastName}</span> into {admissionLetter.applyingForClass}.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">Parent/Guardian Signature</span>
                  <div className="border-b border-slate-400 h-6"></div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Date</span>
                  <div className="border-b border-slate-400 h-6"></div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Emergency Phone Number</span>
                  <div className="border-b border-slate-400 h-6">{admissionLetter.parentPhone}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
