import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Monitor, Plus, Play, Pause, Trash2, Edit, BarChart2,
  BookOpen, Clock, CheckCircle, List, ChevronLeft, Users, Award,
} from 'lucide-react';
import { DataTable, Button, Modal, Input, Select, StatCard } from '../../components/ui';
import { api, academicApi } from '../../services/api';
import { formatDate, formatDateTime, cn } from '../../lib/utils';

const cbtApi = {
  exams: (p?: any) => api.get('/cbt/examinations', { params: p }),
  create: (d: any) => api.post('/cbt/examinations', d),
  update: (id: string, d: any) => api.put(`/cbt/examinations/${id}`, d),
  delete: (id: string) => api.delete(`/cbt/examinations/${id}`),
  publish: (id: string) => api.patch(`/cbt/examinations/${id}/publish`),
  unpublish: (id: string) => api.patch(`/cbt/examinations/${id}/unpublish`),
  questions: (id: string) => api.get(`/cbt/examinations/${id}/questions`),
  addQ: (id: string, d: any) => api.post(`/cbt/examinations/${id}/questions`, d),
  updateQ: (id: string, qId: string, d: any) => api.put(`/cbt/examinations/${id}/questions/${qId}`, d),
  deleteQ: (id: string, qId: string) => api.delete(`/cbt/examinations/${id}/questions/${qId}`),
  attempts: (id: string) => api.get(`/cbt/examinations/${id}/attempts`),
  stats: (id: string) => api.get(`/cbt/examinations/${id}/stats`),
};

const QTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice (A–D)' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'FILL_BLANK', label: 'Fill in the Blank' },
];

type Tab = 'exams' | 'questions' | 'results';

export default function CbtPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('exams');
  const [exam, setExam] = useState<any>(null);
  const [examModal, setExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [qModal, setQModal] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data: examsData, isLoading } = useQuery({ queryKey: ['cbt-exams', page], queryFn: () => cbtApi.exams({ page, limit: 20 }).then(r => r.data) });
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => academicApi.subjects().then(r => r.data.data || []) });
  const { data: questionsData, isLoading: qLoading } = useQuery({ queryKey: ['cbt-q', exam?.id], queryFn: () => cbtApi.questions(exam!.id).then(r => r.data.data || []), enabled: !!exam?.id && tab === 'questions' });
  const { data: attemptsData } = useQuery({ queryKey: ['cbt-attempts', exam?.id], queryFn: () => cbtApi.attempts(exam!.id).then(r => r.data.data || []), enabled: !!exam?.id && tab === 'results' });
  const { data: statsData } = useQuery({ queryKey: ['cbt-stats', exam?.id], queryFn: () => cbtApi.stats(exam!.id).then(r => r.data.data), enabled: !!exam?.id && tab === 'results' });

  const examForm = useForm({ defaultValues: { title: '', description: '', duration: 60, totalMarks: 100, passMark: 50, startTime: '', endTime: '', isRandomized: true } });
  const qForm = useForm({ defaultValues: { type: 'MULTIPLE_CHOICE', subjectId: '', content: '', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], answer: '', explanation: '', marks: 1 } });
  const { fields: optFields } = useFieldArray({ control: qForm.control, name: 'options' });
  const qType = qForm.watch('type');

  const createExamMut = useMutation({ mutationFn: (d: any) => editingExam ? cbtApi.update(editingExam.id, d) : cbtApi.create(d), onSuccess: () => { toast.success(editingExam ? 'Exam updated' : 'Exam created'); qc.invalidateQueries({ queryKey: ['cbt-exams'] }); setExamModal(false); setEditingExam(null); examForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const deleteExamMut = useMutation({ mutationFn: (id: string) => cbtApi.delete(id), onSuccess: () => { toast.success('Exam deleted'); qc.invalidateQueries({ queryKey: ['cbt-exams'] }); setDeleteConfirm(null); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const publishMut = useMutation({ mutationFn: ({ id, pub }: any) => pub ? cbtApi.publish(id) : cbtApi.unpublish(id), onSuccess: (_, v) => { toast.success(v.pub ? 'Exam published!' : 'Exam unpublished'); qc.invalidateQueries({ queryKey: ['cbt-exams'] }); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const addQMut = useMutation({ mutationFn: (d: any) => editingQ ? cbtApi.updateQ(exam.id, editingQ.id, d) : cbtApi.addQ(exam.id, d), onSuccess: () => { toast.success(editingQ ? 'Question updated' : 'Question added'); qc.invalidateQueries({ queryKey: ['cbt-q', exam?.id] }); setQModal(false); setEditingQ(null); qForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const deleteQMut = useMutation({ mutationFn: (qId: string) => cbtApi.deleteQ(exam.id, qId), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['cbt-q', exam?.id] }); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });

  const openEditExam = (e: any) => { setEditingExam(e); examForm.reset({ title: e.title, description: e.description || '', duration: e.duration, totalMarks: e.totalMarks, passMark: e.passMark, startTime: e.startTime ? e.startTime.slice(0, 16) : '', endTime: e.endTime ? e.endTime.slice(0, 16) : '', isRandomized: e.isRandomized }); setExamModal(true); };
  const openEditQ = (q: any) => {
    setEditingQ(q);
    let opts = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
    if (q.options) { try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch {} }
    qForm.reset({ type: q.type, subjectId: q.subjectId || '', content: q.content, options: opts, answer: q.answer, explanation: q.explanation || '', marks: q.marks });
    setQModal(true);
  };

  const submitQ = (d: any) => {
    const payload: any = { ...d, marks: Number(d.marks) };
    if (d.type === 'MULTIPLE_CHOICE') payload.options = JSON.stringify(d.options);
    else delete payload.options;
    addQMut.mutate(payload);
  };

  const exCols = [
    { key: 'title', header: 'Exam', render: (r: any) => <div><p className="font-semibold text-slate-900">{r.title}</p>{r.description && <p className="text-xs text-slate-400 truncate max-w-xs">{r.description}</p>}</div> },
    { key: 'duration', header: 'Duration', render: (r: any) => <span className="text-sm">{r.duration} min</span> },
    { key: 'marks', header: 'Marks', render: (r: any) => <span className="text-sm">{r.passMark}/{r.totalMarks}</span> },
    { key: 'q', header: 'Questions', render: (r: any) => <span className="badge-blue">{r._count?.questions || 0}</span> },
    { key: 'attempts', header: 'Attempts', render: (r: any) => <span className="badge-gray">{r._count?.attempts || 0}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <span className={r.isPublished ? 'badge-green' : 'badge-yellow'}>{r.isPublished ? '● Live' : '○ Draft'}</span> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={() => { setExam(r); setTab('questions'); }} title="Questions" className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><List size={14} /></button>
        <button onClick={() => { setExam(r); setTab('results'); }} title="Results" className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50"><BarChart2 size={14} /></button>
        <button onClick={() => openEditExam(r)} title="Edit" className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50"><Edit size={14} /></button>
        <button onClick={() => publishMut.mutate({ id: r.id, pub: !r.isPublished })} title={r.isPublished ? 'Unpublish' : 'Publish'} className={`p-1.5 rounded-lg ${r.isPublished ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}>{r.isPublished ? <Pause size={14} /> : <Play size={14} />}</button>
        <button onClick={() => setDeleteConfirm(r)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    ) },
  ];

  const qs: any[] = questionsData || [];
  const attempts: any[] = attemptsData || [];
  const exams: any[] = examsData?.data || [];
  const totalExams = examsData?.meta?.total || 0;
  const published = exams.filter((e: any) => e.isPublished).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">CBT Examinations</h1><p className="page-subtitle">Create and manage computer-based tests</p></div>
        <div className="flex gap-2">
          {tab !== 'exams' && <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => setTab('exams')}>All Exams</Button>}
          {tab === 'exams' && <Button icon={<Plus size={16} />} onClick={() => { setEditingExam(null); examForm.reset(); setExamModal(true); }}>New Exam</Button>}
          {tab === 'questions' && exam && <Button icon={<Plus size={16} />} onClick={() => { setEditingQ(null); qForm.reset(); setQModal(true); }}>Add Question</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Exams" value={totalExams} icon={<Monitor size={20} />} color="blue" />
        <StatCard title="Published" value={published} icon={<Play size={20} />} color="green" />
        <StatCard title="Drafts" value={totalExams - published} icon={<Clock size={20} />} color="amber" />
        {tab === 'questions' && exam && <StatCard title="Questions" value={qs.length} icon={<BookOpen size={20} />} color="purple" />}
        {tab === 'results' && statsData && <StatCard title="Pass Rate" value={`${statsData.passRate}%`} icon={<Award size={20} />} color="green" />}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['exams', 'questions', 'results'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'questions' && exam ? `Questions — ${exam.title}` : t}
          </button>
        ))}
      </div>

      {/* EXAMS TAB */}
      {tab === 'exams' && (
        <DataTable data={exams} columns={exCols} loading={isLoading}
          pagination={examsData?.meta ? { page: examsData.meta.page, limit: examsData.meta.limit, total: examsData.meta.total, totalPages: examsData.meta.totalPages, onPageChange: setPage } : undefined}
          emptyMessage="No exams yet. Click 'New Exam' to create one." />
      )}

      {/* QUESTIONS TAB */}
      {tab === 'questions' && (
        !exam ? (
          <div className="card p-12 text-center"><Monitor size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Select an exam from the Exams tab first</p></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div><h3 className="font-bold">{exam.title}</h3><p className="text-xs text-slate-400">{exam.duration} min • {exam.totalMarks} marks • Pass: {exam.passMark}</p></div>
              <span className={exam.isPublished ? 'badge-green' : 'badge-yellow'}>{exam.isPublished ? 'Published' : 'Draft'}</span>
            </div>
            {qLoading ? <div className="p-8 text-center text-slate-400">Loading…</div>
              : !qs.length ? <div className="p-12 text-center"><BookOpen size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No questions yet. Click "Add Question" to start.</p></div>
              : (
                <div className="divide-y divide-slate-50">
                  {qs.map((q: any, i: number) => {
                    let opts: any[] = [];
                    if (q.options) { try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch {} }
                    return (
                      <div key={q.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex gap-2 mb-1.5">
                              <span className="badge-blue text-xs">{q.type.replace('_', ' ')}</span>
                              <span className="badge-gray text-xs">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                              {q.subject && <span className="text-xs text-slate-400">{q.subject.name}</span>}
                            </div>
                            <p className="font-medium text-slate-800 mb-2">{q.content}</p>
                            {opts.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5">
                                {opts.map((o: any, j: number) => (
                                  <div key={j} className={cn('text-sm px-3 py-1.5 rounded-lg border', String(j) === q.answer || o.text === q.answer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600')}>
                                    {String.fromCharCode(65 + j)}. {o.text}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === 'TRUE_FALSE' && <p className="text-sm text-emerald-700 font-semibold mt-1">Answer: {q.answer}</p>}
                            {q.type === 'FILL_BLANK' && <p className="text-sm text-emerald-700 font-semibold mt-1">Answer: {q.answer}</p>}
                            {q.explanation && <p className="text-xs text-slate-400 mt-2 italic">💡 {q.explanation}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEditQ(q)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50"><Edit size={13} /></button>
                            <button onClick={() => deleteQMut.mutate(q.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )
      )}

      {/* RESULTS TAB */}
      {tab === 'results' && (
        !exam ? (
          <div className="card p-12 text-center"><BarChart2 size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Select an exam first</p></div>
        ) : (
          <div className="space-y-4">
            {statsData && (
              <div className="grid grid-cols-4 gap-4">
                <StatCard title="Attempts" value={statsData.total} icon={<Users size={20} />} color="blue" />
                <StatCard title="Passed" value={statsData.passed} icon={<CheckCircle size={20} />} color="green" />
                <StatCard title="Failed" value={statsData.failed} icon={<Monitor size={20} />} color="red" />
                <StatCard title="Avg Score" value={`${statsData.averageScore}`} icon={<Award size={20} />} color="purple" />
              </div>
            )}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold">Attempt Records — {exam.title}</h3></div>
              {!attempts.length ? <div className="p-8 text-center text-slate-400">No attempts yet</div> : (
                <table className="w-full">
                  <thead><tr className="border-b border-slate-100 bg-slate-50">{['Student', 'Admission No.', 'Started', 'Submitted', 'Score', 'Result'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {attempts.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{a.student?.firstName} {a.student?.lastName}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{a.student?.admissionNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(a.startedAt)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{a.submittedAt ? formatDateTime(a.submittedAt) : '—'}</td>
                        <td className="px-4 py-3 font-bold">{a.score !== null ? `${a.score}/${exam.totalMarks}` : '—'}</td>
                        <td className="px-4 py-3">{a.isPassed !== null && <span className={a.isPassed ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{a.isPassed ? '✓ Pass' : '✗ Fail'}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      )}

      {/* Create / Edit Exam Modal */}
      <Modal open={examModal} onClose={() => { setExamModal(false); setEditingExam(null); examForm.reset(); }} title={editingExam ? 'Edit Exam' : 'Create New Exam'} size="lg"
        footer={<><Button variant="secondary" onClick={() => { setExamModal(false); setEditingExam(null); examForm.reset(); }}>Cancel</Button><Button loading={createExamMut.isPending} onClick={examForm.handleSubmit(d => createExamMut.mutate(d))}>{editingExam ? 'Update' : 'Create Exam'}</Button></>}>
        <div className="space-y-4">
          <Input label="Exam Title *" {...examForm.register('title', { required: true })} placeholder="e.g. First Term Mathematics Exam" />
          <Input label="Description" {...examForm.register('description')} placeholder="Optional description" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Duration (minutes) *" type="number" {...examForm.register('duration', { valueAsNumber: true })} min={10} max={300} />
            <Input label="Total Marks *" type="number" {...examForm.register('totalMarks', { valueAsNumber: true })} />
            <Input label="Pass Mark *" type="number" {...examForm.register('passMark', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="datetime-local" {...examForm.register('startTime')} />
            <Input label="End Time" type="datetime-local" {...examForm.register('endTime')} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl">
            <input type="checkbox" {...examForm.register('isRandomized')} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm font-medium">Randomize question order per student</span>
          </label>
        </div>
      </Modal>

      {/* Add / Edit Question Modal */}
      <Modal open={qModal} onClose={() => { setQModal(false); setEditingQ(null); qForm.reset(); }} title={editingQ ? 'Edit Question' : 'Add Question'} size="lg"
        footer={<><Button variant="secondary" onClick={() => { setQModal(false); setEditingQ(null); qForm.reset(); }}>Cancel</Button><Button loading={addQMut.isPending} onClick={qForm.handleSubmit(submitQ)}>{editingQ ? 'Update' : 'Add Question'}</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Select label="Question Type" {...qForm.register('type')} options={QTypes} />
            <Select label="Subject" {...qForm.register('subjectId')} options={[{ value: '', label: '— Select subject —' }, ...(subjectsData || []).map((s: any) => ({ value: s.id, label: s.name }))]} />
            <Input label="Marks" type="number" {...qForm.register('marks', { valueAsNumber: true })} min={1} />
          </div>
          <div>
            <label className="label">Question Text *</label>
            <textarea {...qForm.register('content', { required: true })} rows={3} className="input resize-none" placeholder="Type the question..." />
          </div>
          {qType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              <label className="label">Options (select the correct answer)</label>
              {optFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                  <input {...qForm.register(`options.${i}.text`)} className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  <input type="radio" value={String(i)} {...qForm.register('answer')} className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-400 w-12">Correct</span>
                </div>
              ))}
            </div>
          )}
          {qType === 'TRUE_FALSE' && (
            <div>
              <label className="label">Correct Answer</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="True" {...qForm.register('answer')} className="w-4 h-4 text-blue-600" /><span className="font-medium">True</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="False" {...qForm.register('answer')} className="w-4 h-4 text-blue-600" /><span className="font-medium">False</span></label>
              </div>
            </div>
          )}
          {qType === 'FILL_BLANK' && <Input label="Correct Answer *" {...qForm.register('answer', { required: true })} placeholder="The exact expected answer" />}
          <Input label="Explanation (optional)" {...qForm.register('explanation')} placeholder="Why is this the correct answer?" />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Exam" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" loading={deleteExamMut.isPending} onClick={() => deleteExamMut.mutate(deleteConfirm.id)}>Delete Permanently</Button></>}>
        <p className="text-slate-600">Are you sure you want to delete <strong>"{deleteConfirm?.title}"</strong>? All questions and attempt records will also be deleted. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
