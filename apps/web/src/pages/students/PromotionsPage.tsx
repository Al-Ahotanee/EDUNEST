import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, GraduationCap, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsApi, classesApi } from '../../services/api';
import { Button, Badge, DataTable, PageLoader, Modal, Select, Card } from '../../components/ui';

type PromoStatus = 'PENDING' | 'PROMOTED' | 'REPEATED' | 'GRADUATED';

interface PromotionRow {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassName: string;
  currentClassId: string;
  averageScore: number;
  status: PromoStatus;
}

const PROMOTION_STATUSES: PromoStatus[] = ['PENDING', 'PROMOTED', 'REPEATED', 'GRADUATED'];

// Defensive helpers — never let an undefined value crash .map()
function safeArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && Array.isArray(value.data)) return value.data as T[];
  if (value && Array.isArray(value.data?.data)) return value.data.data as T[];
  return [];
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [decisionModal, setDecisionModal] = useState<{ student: any; action: PromoStatus } | null>(null);

  // Fetch classes (used for filter + promotion target)
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list().then((r) => r.data?.data || r.data || []),
    retry: false,
  });
  const classes = safeArray<any>(classesData);

  // Fetch students (we'll derive promotion candidates from them)
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', 'all-for-promotion', classFilter],
    queryFn: () =>
      studentsApi
        .list({ page: 1, limit: 500, classId: classFilter || undefined })
        .then((r) => r.data)
        .catch(() => ({ data: [], meta: { total: 0 } })),
    retry: false,
  });
  const students = safeArray<any>(studentsData?.data);

  // Fetch results to compute average score per student
  const { data: resultsData } = useQuery({
    queryKey: ['promotion-results'],
    queryFn: () =>
      studentsApi
        .promotionResults()
        .then((r) => {
          const d = r?.data;
          if (Array.isArray(d)) return d;
          if (d && Array.isArray(d.data)) return d.data;
          return [];
        })
        .catch(() => []),
    retry: false,
  });
  const results = safeArray<any>(resultsData);

  const resultsByStudent = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    results.forEach((r: any) => {
      if (!r || !r.studentId) return;
      if (!m[r.studentId]) m[r.studentId] = { total: 0, count: 0 };
      m[r.studentId].total += Number(r.totalScore) || 0;
      m[r.studentId].count += 1;
    });
    return m;
  }, [results]);

  // Build promotion candidate rows
  const promotionRows: PromotionRow[] = useMemo(() => {
    return students
      .filter((s: any) => s && s.status === 'ACTIVE')
      .map((s: any) => {
        const cls = s.classEnrollments?.[0]?.class;
        const avgData = resultsByStudent[s.id];
        const avg = avgData && avgData.count > 0 ? avgData.total / avgData.count : 0;
        return {
          id: s.id,
          firstName: s.firstName || '',
          lastName: s.lastName || '',
          admissionNumber: s.admissionNumber || '—',
          currentClassName: cls?.name || '—',
          currentClassId: cls?.id || '',
          averageScore: Math.round(avg * 100) / 100,
          status: (s.promotionStatus as PromoStatus) || 'PENDING',
        };
      })
      .filter((row) => (statusFilter ? row.status === statusFilter : true));
  }, [students, resultsByStudent, statusFilter]);

  const promotionMutation = useMutation({
    mutationFn: async (vars: { studentId: string; action: PromoStatus; targetClassId?: string }) => {
      return studentsApi.update(vars.studentId, {
        status: vars.action === 'GRADUATED' ? 'GRADUATED' : 'ACTIVE',
        promotionStatus: vars.action,
        targetClassId: vars.targetClassId,
      } as any);
    },
    onSuccess: (_d, vars) => {
      const verb = vars.action === 'PROMOTED' ? 'promoted' : vars.action === 'REPEATED' ? 'held back' : 'graduated';
      toast.success(`Student ${verb} successfully`);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDecisionModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Promotion action failed'),
  });

  const columns = [
    {
      key: 'student',
      header: 'STUDENT',
      render: (r: PromotionRow) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
            {(r.firstName?.[0] || '?')}{(r.lastName?.[0] || '')}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-slate-500 font-mono">{r.admissionNumber}</p>
          </div>
        </div>
      ),
    },
    { key: 'currentClassName', header: 'CURRENT CLASS', render: (r: PromotionRow) => <span className="text-sm">{r.currentClassName}</span> },
    {
      key: 'averageScore',
      header: 'AVERAGE SCORE',
      render: (r: PromotionRow) => (
        <span className={`text-sm font-semibold ${r.averageScore >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {r.averageScore || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'PROMOTION STATUS',
      render: (r: PromotionRow) => {
        const map: Record<PromoStatus, string> = {
          PENDING: 'badge-yellow',
          PROMOTED: 'badge-green',
          REPEATED: 'badge-red',
          GRADUATED: 'badge-blue',
        };
        return <Badge className={map[r.status]}>{r.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      render: (r: PromotionRow) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" icon={<ArrowUpCircle size={14} className="text-emerald-600" />}
            onClick={() => setDecisionModal({ student: r, action: 'PROMOTED' })}>
            Promote
          </Button>
          <Button size="sm" variant="ghost" icon={<ArrowDownCircle size={14} className="text-amber-600" />}
            onClick={() => setDecisionModal({ student: r, action: 'REPEATED' })}>
            Hold Back
          </Button>
          <Button size="sm" variant="ghost" icon={<GraduationCap size={14} className="text-blue-600" />}
            onClick={() => setDecisionModal({ student: r, action: 'GRADUATED' })}>
            Graduate
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Award size={20} /> Student Promotions</h1>
          <p className="page-subtitle">Promote, hold back, or graduate students for the next academic session</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Pending Decision</div>
          <div className="text-2xl font-bold text-amber-600">
            {promotionRows.filter(r => r.status === 'PENDING').length}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Promoted</div>
          <div className="text-2xl font-bold text-emerald-600">
            {promotionRows.filter(r => r.status === 'PROMOTED').length}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Held Back</div>
          <div className="text-2xl font-bold text-rose-600">
            {promotionRows.filter(r => r.status === 'REPEATED').length}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Graduated</div>
          <div className="text-2xl font-bold text-blue-600">
            {promotionRows.filter(r => r.status === 'GRADUATED').length}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <Select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Classes</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All Status</option>
            {PROMOTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      <DataTable
        data={promotionRows}
        columns={columns}
        emptyMessage="No students match the current filters. Adjust filters or ensure students are enrolled in classes."
      />

      {/* Decision confirmation modal */}
      {decisionModal && (
        <Modal
          open
          onClose={() => setDecisionModal(null)}
          title={`${decisionModal.action.charAt(0) + decisionModal.action.slice(1).toLowerCase()} — ${decisionModal.student.firstName} ${decisionModal.student.lastName}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              {decisionModal.action === 'PROMOTED' && 'This student will be moved up to the next class in the academic hierarchy.'}
              {decisionModal.action === 'REPEATED' && 'This student will repeat the current class for another session.'}
              {decisionModal.action === 'GRADUATED' && 'This student will be marked as graduated and removed from the active roll.'}
            </p>
            <div className="text-xs text-slate-500 grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
              <div><span className="font-semibold">Admission #:</span> {decisionModal.student.admissionNumber}</div>
              <div><span className="font-semibold">Current Class:</span> {decisionModal.student.currentClassName}</div>
              <div><span className="font-semibold">Avg Score:</span> {decisionModal.student.averageScore || '—'}</div>
              <div><span className="font-semibold">Decision:</span> {decisionModal.action}</div>
            </div>
            {decisionModal.action === 'PROMOTED' && (
              <Select
                label="Target Class (next class)"
                onChange={() => {}}
              >
                {classes
                  .filter((c: any) => c.id !== decisionModal.student.currentClassId)
                  .map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDecisionModal(null)}>Cancel</Button>
              <Button
                variant={decisionModal.action === 'PROMOTED' ? 'primary' : decisionModal.action === 'GRADUATED' ? 'primary' : 'danger'}
                icon={
                  decisionModal.action === 'PROMOTED' ? <CheckCircle2 size={14} /> :
                  decisionModal.action === 'GRADUATED' ? <GraduationCap size={14} /> :
                  <XCircle size={14} />
                }
                loading={promotionMutation.isPending}
                onClick={() => promotionMutation.mutate({
                  studentId: decisionModal.student.id,
                  action: decisionModal.action,
                })}
              >
                Confirm {decisionModal.action.charAt(0) + decisionModal.action.slice(1).toLowerCase()}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
