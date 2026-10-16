import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Calendar, School, Check, Layers } from 'lucide-react';
import {
  Button, Modal, Input, Select, StatCard, Badge, Card,
} from '../../components/ui';
import { academicApi } from '../../services/api';
import { formatDate } from '../../lib/utils';

export default function AcademicPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'sessions' | 'classes' | 'subjects'>('sessions');
  const [sessionModal, setSessionModal] = useState(false);
  const [termModal, setTermModal] = useState<any>(null);
  const [classModal, setClassModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'], queryFn: () => academicApi.sessions().then(r => r.data.data || []),
  });
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ['classes'], queryFn: () => academicApi.classes().then(r => r.data.data || []),
  });
  const { data: subjectsData, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'], queryFn: () => academicApi.subjects().then(r => r.data.data || []),
  });

  const sessionForm = useForm({ defaultValues: { name: '', startDate: '', endDate: '' } });
  const termForm = useForm({ defaultValues: { name: '', startDate: '', endDate: '' } });
  const classForm = useForm({ defaultValues: { name: '', level: 1, section: '', capacity: 40 } });
  const subjectForm = useForm({ defaultValues: { name: '', code: '', description: '', isCore: true } });

  const createSessionMutation = useMutation({
    mutationFn: (d: any) => academicApi.createSession(d),
    onSuccess: () => { toast.success('Session created!'); queryClient.invalidateQueries({ queryKey: ['sessions'] }); setSessionModal(false); sessionForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createTermMutation = useMutation({
    mutationFn: ({ sessionId, data }: any) => academicApi.createTerm(sessionId, data),
    onSuccess: () => { toast.success('Term created!'); queryClient.invalidateQueries({ queryKey: ['sessions'] }); setTermModal(null); termForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createClassMutation = useMutation({
    mutationFn: (d: any) => academicApi.createClass(d),
    onSuccess: () => { toast.success('Class created!'); queryClient.invalidateQueries({ queryKey: ['classes'] }); setClassModal(false); classForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (d: any) => academicApi.createSubject(d),
    onSuccess: () => { toast.success('Subject created!'); queryClient.invalidateQueries({ queryKey: ['subjects'] }); setSubjectModal(false); subjectForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Management</h1>
          <p className="page-subtitle">Sessions, terms, classes and subjects</p>
        </div>
        <div className="flex gap-2">
          {tab === 'sessions' && <Button icon={<Plus size={16} />} onClick={() => setSessionModal(true)}>New Session</Button>}
          {tab === 'classes' && <Button icon={<Plus size={16} />} onClick={() => setClassModal(true)}>New Class</Button>}
          {tab === 'subjects' && <Button icon={<Plus size={16} />} onClick={() => setSubjectModal(true)}>New Subject</Button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Sessions" value={(sessionsData || []).length} icon={<Calendar size={20} />} color="blue" />
        <StatCard title="Classes" value={(classesData || []).length} icon={<School size={20} />} color="green" />
        <StatCard title="Subjects" value={(subjectsData || []).length} icon={<BookOpen size={20} />} color="purple" />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['sessions', 'classes', 'subjects'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          {loadingSessions ? (
            <div className="card p-8 text-center text-slate-400">Loading...</div>
          ) : !(sessionsData || []).length ? (
            <div className="card p-12 text-center">
              <Calendar size={40} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-600">No sessions yet</h3>
              <p className="text-sm text-slate-400 mt-1">Create your first academic session</p>
            </div>
          ) : (sessionsData || []).map((session: any) => (
            <div key={session.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Calendar size={18} /></div>
                  <div>
                    <h3 className="font-bold text-slate-900">{session.name}</h3>
                    <p className="text-xs text-slate-400">{formatDate(session.startDate)} — {formatDate(session.endDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.isCurrent && <Badge status="ACTIVE" label="Current" />}
                  <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setTermModal(session)}>
                    Add Term
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {(session.terms || []).length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-400">No terms added yet</p>
                ) : (session.terms || []).map((term: any) => (
                  <div key={term.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="font-medium text-slate-800">{term.name}</span>
                      <span className="text-xs text-slate-400">{formatDate(term.startDate)} — {formatDate(term.endDate)}</span>
                    </div>
                    {term.isCurrent && <Badge status="ACTIVE" label="Current" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Classes */}
      {tab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loadingClasses ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)
          ) : (classesData || []).map((cls: any) => (
            <div key={cls.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><School size={18} /></div>
                <span className="text-xs text-slate-400">Level {cls.level}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg">{cls.name}</h3>
              {cls.section && <p className="text-sm text-slate-500">Section: {cls.section}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">Capacity: {cls.capacity}</span>
                <Button size="sm" variant="ghost">Manage</Button>
              </div>
            </div>
          ))}
          <button onClick={() => setClassModal(true)}
            className="card p-5 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-all cursor-pointer min-h-[130px]">
            <Plus size={24} />
            <span className="text-sm font-medium">Add Class</span>
          </button>
        </div>
      )}

      {/* Subjects */}
      {tab === 'subjects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingSubjects ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)
          ) : (subjectsData || []).map((subj: any) => (
            <div key={subj.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><BookOpen size={16} /></div>
                <div className="flex gap-1">
                  <Badge status={subj.isCore ? 'ACTIVE' : 'INACTIVE'} label={subj.isCore ? 'Core' : 'Elective'} />
                </div>
              </div>
              <h3 className="font-bold text-slate-900">{subj.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{subj.code}</p>
              {subj.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{subj.description}</p>}
            </div>
          ))}
          <button onClick={() => setSubjectModal(true)}
            className="card p-5 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-purple-600 hover:border-purple-300 transition-all cursor-pointer min-h-[120px]">
            <Plus size={24} />
            <span className="text-sm font-medium">Add Subject</span>
          </button>
        </div>
      )}

      {/* Session Modal */}
      <Modal open={sessionModal} onClose={() => { setSessionModal(false); sessionForm.reset(); }} title="Create Academic Session" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSessionModal(false); sessionForm.reset(); }}>Cancel</Button>
            <Button loading={createSessionMutation.isPending} onClick={sessionForm.handleSubmit(d => createSessionMutation.mutate(d))}>
              Create Session
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Session Name" {...sessionForm.register('name', { required: true })} placeholder="e.g. 2024/2025 Academic Session" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...sessionForm.register('startDate', { required: true })} />
            <Input label="End Date" type="date" {...sessionForm.register('endDate', { required: true })} />
          </div>
        </div>
      </Modal>

      {/* Term Modal */}
      <Modal open={!!termModal} onClose={() => { setTermModal(null); termForm.reset(); }} title={`Add Term — ${termModal?.name}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setTermModal(null); termForm.reset(); }}>Cancel</Button>
            <Button loading={createTermMutation.isPending} onClick={termForm.handleSubmit(d => createTermMutation.mutate({ sessionId: termModal?.id, data: d }))}>
              Add Term
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Select label="Term Name" {...termForm.register('name', { required: true })}
            options={['First Term', 'Second Term', 'Third Term'].map(v => ({ value: v, label: v }))}
            placeholder="Select term" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...termForm.register('startDate', { required: true })} />
            <Input label="End Date" type="date" {...termForm.register('endDate', { required: true })} />
          </div>
        </div>
      </Modal>

      {/* Class Modal */}
      <Modal open={classModal} onClose={() => { setClassModal(false); classForm.reset(); }} title="Create New Class" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setClassModal(false); classForm.reset(); }}>Cancel</Button>
            <Button loading={createClassMutation.isPending} onClick={classForm.handleSubmit(d => createClassMutation.mutate({ ...d, level: Number(d.level), capacity: Number(d.capacity) }))}>
              Create Class
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Class Name" {...classForm.register('name', { required: true })} placeholder="e.g. JSS 1, Primary 3" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Level" type="number" {...classForm.register('level', { required: true })} min={1} max={12} />
            <Input label="Section" {...classForm.register('section')} placeholder="e.g. A, B, Gold" />
          </div>
          <Input label="Capacity" type="number" {...classForm.register('capacity')} min={10} max={100} />
        </div>
      </Modal>

      {/* Subject Modal */}
      <Modal open={subjectModal} onClose={() => { setSubjectModal(false); subjectForm.reset(); }} title="Create New Subject" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSubjectModal(false); subjectForm.reset(); }}>Cancel</Button>
            <Button loading={createSubjectMutation.isPending} onClick={subjectForm.handleSubmit(d => createSubjectMutation.mutate(d))}>
              Create Subject
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Subject Name" {...subjectForm.register('name', { required: true })} placeholder="e.g. Mathematics" />
          <Input label="Subject Code" {...subjectForm.register('code', { required: true })} placeholder="e.g. MTH101" />
          <Input label="Description" {...subjectForm.register('description')} placeholder="Optional description" />
          <Select label="Subject Type" {...subjectForm.register('isCore')}
            options={[{ value: 'true', label: 'Core Subject' }, { value: 'false', label: 'Elective Subject' }]} />
        </div>
      </Modal>
    </div>
  );
}
