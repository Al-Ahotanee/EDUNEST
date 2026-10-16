import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Plus, Award, CheckCircle, FileText, TrendingUp, Upload } from 'lucide-react';
import {
  StatCard, DataTable, Button, Modal, Select, PageLoader, Card, Badge,
} from '../../components/ui';
import { resultsApi, academicApi, studentsApi } from '../../services/api';
import { getGradeColor, formatDate } from '../../lib/utils';

const GRADE_COLORS: Record<string, string> = {
  'A+': '#059669', A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444',
};

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'entry' | 'analytics' | 'reportcard'>('entry');
  const [scoreModal, setScoreModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportCard, setReportCard] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => academicApi.classes().then(r => r.data.data || []) });
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => academicApi.subjects().then(r => r.data.data || []) });

  const { data: sessionsData } = useQuery({ queryKey: ['sessions'], queryFn: () => academicApi.sessions().then(r => r.data.data || []) });
  const currentSession = sessionsData?.find((s: any) => s.isCurrent) || sessionsData?.[0];

  const { data: termsData } = useQuery({
    queryKey: ['terms', currentSession?.id],
    queryFn: () => academicApi.terms(currentSession.id).then(r => r.data.data || []),
    enabled: !!currentSession?.id,
  });
  const currentTerm = termsData?.find((t: any) => t.isCurrent) || termsData?.[0];

  const { data: classResults, isLoading: loadingResults } = useQuery({
    queryKey: ['class-results', selectedClass, selectedTerm || currentTerm?.id],
    queryFn: () => resultsApi.classResults(selectedClass, selectedTerm || currentTerm?.id).then(r => r.data.data),
    enabled: !!(selectedClass && (selectedTerm || currentTerm?.id)),
  });

  const { data: resultStats } = useQuery({
    queryKey: ['result-stats', selectedTerm || currentTerm?.id],
    queryFn: () => resultsApi.stats(selectedTerm || currentTerm?.id).then(r => r.data.data),
    enabled: !!(selectedTerm || currentTerm?.id),
  });

  const { data: studentsData } = useQuery({ queryKey: ['students-for-results'], queryFn: () => studentsApi.list({ limit: 200 }).then(r => r.data.data || []), enabled: scoreModal });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: { studentId: '', termId: '', scores: [{ subjectId: '', ca1Score: 0, ca2Score: 0, examScore: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'scores' });

  const enterScoreMutation = useMutation({
    mutationFn: (data: any) => {
      const scores = data.scores.map((s: any) => ({ ...s, studentId: data.studentId, termId: data.termId || currentTerm?.id }));
      return resultsApi.bulkScores(scores);
    },
    onSuccess: () => {
      toast.success('Scores entered successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-results'] });
      queryClient.invalidateQueries({ queryKey: ['result-stats'] });
      setScoreModal(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to enter scores'),
  });

  const approveMutation = useMutation({
    mutationFn: (termId: string) => resultsApi.approve(termId),
    onSuccess: () => { toast.success('Results approved!'); queryClient.invalidateQueries({ queryKey: ['class-results'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const loadReportCard = async () => {
    if (!selectedStudent || !(selectedTerm || currentTerm?.id)) {
      toast.error('Select a student and term');
      return;
    }
    setReportLoading(true);
    try {
      const res = await resultsApi.reportCard(selectedStudent, selectedTerm || currentTerm?.id);
      setReportCard(res.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load report card');
    } finally {
      setReportLoading(false);
    }
  };

  const resultColumns = [
    { key: 'position', header: '#', render: (r: any) => <span className="font-bold text-slate-900 w-8 text-center inline-block">{r.position}</span> },
    { key: 'name', header: 'Student', render: (r: any) => <span className="font-semibold">{r.name}</span> },
    { key: 'admissionNumber', header: 'Adm. No.', render: (r: any) => <span className="text-slate-500">{r.admissionNumber}</span> },
    { key: 'subjects', header: 'Subjects', render: (r: any) => <span>{r.subjects?.length || 0}</span> },
    { key: 'totalScore', header: 'Total', render: (r: any) => <span className="font-bold">{r.totalScore?.toFixed(1)}</span> },
    { key: 'averageScore', header: 'Average', render: (r: any) => <span className="font-bold">{r.averageScore?.toFixed(1)}%</span> },
    { key: 'grade', header: 'Grade', render: (r: any) => <span className={`font-bold text-base ${getGradeColor(r.grade)}`}>{r.grade}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Results Management</h1>
          <p className="page-subtitle">Score entry, report cards & performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<CheckCircle size={16} />}
            onClick={() => approveMutation.mutate(selectedTerm || currentTerm?.id)}
            loading={approveMutation.isPending}
            disabled={!(selectedTerm || currentTerm?.id)}>
            Approve Results
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setScoreModal(true)}>
            Enter Scores
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Entries" value={(resultStats?.total || 0).toLocaleString()} icon={<FileText size={20} />} color="blue" />
        <StatCard title="Passed" value={(resultStats?.passed || 0).toLocaleString()} subtitle={`${resultStats?.passRate || 0}% pass rate`} icon={<CheckCircle size={20} />} color="green" />
        <StatCard title="Failed" value={(resultStats?.failed || 0).toLocaleString()} icon={<Award size={20} />} color="red" />
        <StatCard title="Avg Score" value={`${resultStats?.averageScore || 0}%`} icon={<TrendingUp size={20} />} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['entry', 'analytics', 'reportcard'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'reportcard' ? 'Report Card' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={(classesData || []).map((c: any) => ({ value: c.id, label: c.name }))}
          placeholder="Select Class"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-44 py-2 text-sm"
        />
        <Select
          options={(termsData || []).map((t: any) => ({ value: t.id, label: `${t.name} — ${currentSession?.name}` }))}
          placeholder="Select Term"
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="w-56 py-2 text-sm"
        />
      </div>

      {/* Score Entry Tab */}
      {tab === 'entry' && (
        <DataTable
          data={classResults || []}
          columns={resultColumns}
          loading={loadingResults}
          emptyMessage="Select a class and term to view results, or enter scores."
        />
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-6">Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={resultStats?.gradeDistribution || []} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="grade" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                  {(resultStats?.gradeDistribution || []).map((entry: any) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-slate-900">Performance Summary</h3>
            {(resultStats?.gradeDistribution || []).map((g: any) => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className={`w-8 text-sm font-bold ${getGradeColor(g.grade)}`}>{g.grade}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: resultStats?.total ? `${(g.count / resultStats.total) * 100}%` : '0%',
                      backgroundColor: GRADE_COLORS[g.grade] || '#94a3b8',
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-8 text-right">{g.count}</span>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-xl font-bold text-emerald-600">{resultStats?.passRate || 0}%</p>
                <p className="text-slate-500 text-xs">Pass Rate</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-xl font-bold text-blue-600">{resultStats?.averageScore || 0}%</p>
                <p className="text-slate-500 text-xs">Class Average</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Card Tab */}
      {tab === 'reportcard' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <Select
              options={(studentsData || []).map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.admissionNumber})` }))}
              placeholder="Select Student"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-72 py-2 text-sm"
            />
            <Button onClick={loadReportCard} loading={reportLoading} icon={<FileText size={16} />}>
              Generate Report Card
            </Button>
          </div>

          {reportCard && (
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{reportCard.student?.firstName} {reportCard.student?.lastName}</h2>
                    <p className="text-blue-200 text-sm mt-1">{reportCard.student?.admissionNumber} • Class: {reportCard.student?.class || '—'}</p>
                    <p className="text-blue-200 text-sm">{reportCard.term?.name} — {reportCard.term?.session}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-black ${reportCard.summary.grade === 'F' ? 'text-red-300' : 'text-white'}`}>
                      {reportCard.summary.grade}
                    </div>
                    <p className="text-blue-200 text-sm mt-1">{reportCard.summary.remark}</p>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                {[
                  { label: 'Total Score', value: reportCard.summary.totalScore?.toFixed(1) },
                  { label: 'Average', value: `${reportCard.summary.averageScore?.toFixed(1)}%` },
                  { label: 'Position', value: reportCard.summary.position ? `${reportCard.summary.position}/${reportCard.summary.classSize}` : '—' },
                  { label: 'Subjects', value: reportCard.summary.totalSubjects },
                ].map((s) => (
                  <div key={s.label} className="p-4 text-center">
                    <p className="text-lg font-bold text-slate-900">{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Scores Table */}
              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Subject Scores</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">CA1</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">CA2</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Exam</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Remark</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Pos.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportCard.results.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-medium text-slate-800">{r.subject?.name}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{r.ca1Score ?? '—'}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{r.ca2Score ?? '—'}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{r.examScore ?? '—'}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">{r.totalScore?.toFixed(1)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold ${getGradeColor(r.grade)}`}>{r.grade}</span>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-500">{r.remark}</td>
                        <td className="py-3 px-3 text-center text-slate-500">{r.position ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 pb-6 flex justify-end">
                <Button variant="secondary" icon={<FileText size={16} />} onClick={() => window.print()}>
                  Print Report Card
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score Entry Modal */}
      <Modal open={scoreModal} onClose={() => { setScoreModal(false); reset(); }} title="Enter Student Scores" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setScoreModal(false); reset(); }}>Cancel</Button>
            <Button loading={enterScoreMutation.isPending} onClick={handleSubmit((d) => enterScoreMutation.mutate(d))}>
              Save Scores
            </Button>
          </>
        }>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Student" {...register('studentId', { required: 'Required' })}
              options={(studentsData || []).map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))}
              placeholder="Select student" error={errors.studentId?.message} />
            <Select label="Term" {...register('termId')}
              options={(termsData || []).map((t: any) => ({ value: t.id, label: t.name }))}
              placeholder="Current term" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Subject Scores</label>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />}
                onClick={() => append({ subjectId: '', ca1Score: 0, ca2Score: 0, examScore: 0 })}>
                Add Subject
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-2">
                    <select className="input text-sm py-2" {...register(`scores.${i}.subjectId`)}>
                      <option value="">Subject</option>
                      {(subjectsData || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <input className="input text-sm py-2 text-center" type="number" placeholder="CA1" {...register(`scores.${i}.ca1Score`, { valueAsNumber: true })} min={0} max={30} />
                  <input className="input text-sm py-2 text-center" type="number" placeholder="CA2" {...register(`scores.${i}.ca2Score`, { valueAsNumber: true })} min={0} max={30} />
                  <div className="flex gap-2">
                    <input className="input text-sm py-2 text-center flex-1" type="number" placeholder="Exam" {...register(`scores.${i}.examScore`, { valueAsNumber: true })} min={0} max={40} />
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">CA1 (30) + CA2 (30) + Exam (40) = 100</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
