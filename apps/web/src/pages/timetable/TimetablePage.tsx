import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, Trash2, Calendar, Download } from 'lucide-react';
import { Button, Modal, Input, Select, StatCard } from '../../components/ui';
import { api, academicApi } from '../../services/api';
import { cn } from '../../lib/utils';

const tapi = {
  byClass: (classId: string) => api.get(`/timetable/class/${classId}`),
  byStaff: (staffId: string) => api.get(`/timetable/staff/${staffId}`),
  create: (d: any) => api.post('/timetable', d),
  delete: (id: string) => api.delete(`/timetable/${id}`),
  school: () => api.get('/timetable/school'),
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-rose-50 border-rose-200 text-rose-800',
];
const DAY_HEADER_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
];

const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00',
];

export default function TimetablePage() {
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [modal, setModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => academicApi.classes().then(r => r.data.data || []) });
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => academicApi.subjects().then(r => r.data.data || []) });
  const { data: staffData } = useQuery({ queryKey: ['staff-list'], queryFn: () => api.get('/hr/staff', { params: { limit: 100 } }).then(r => r.data.data || []) });

  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['timetable-class', selectedClass],
    queryFn: () => tapi.byClass(selectedClass).then(r => r.data.data),
    enabled: !!selectedClass,
  });

  const form = useForm({
    defaultValues: { classId: '', subjectId: '', staffId: '', dayOfWeek: '1', startTime: '08:00', endTime: '09:00', room: '' },
  });

  const createMut = useMutation({
    mutationFn: (d: any) => tapi.create({ ...d, dayOfWeek: Number(d.dayOfWeek) }),
    onSuccess: () => {
      toast.success('Slot added to timetable');
      qc.invalidateQueries({ queryKey: ['timetable-class'] });
      setModal(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add slot'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tapi.delete(id),
    onSuccess: () => {
      toast.success('Slot removed');
      qc.invalidateQueries({ queryKey: ['timetable-class'] });
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openAddModal = () => {
    if (selectedClass) form.setValue('classId', selectedClass);
    setModal(true);
  };

  const classes: any[] = classesData || [];
  const subjects: any[] = subjectsData || [];
  const staff: any[] = staffData || [];
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '';

  // Count slots per class
  const totalSlots = timetableData ? DAYS.reduce((s, d) => s + (timetableData[d]?.length || 0), 0) : 0;
  const subjectsCovered = timetableData ? new Set(DAYS.flatMap(d => (timetableData[d] || []).map((s: any) => s.subjectId))).size : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable Management</h1>
          <p className="page-subtitle">Weekly class schedules, teacher and room assignments</p>
        </div>
        <div className="flex gap-2">
          {selectedClass && (
            <Button variant="secondary" icon={<Download size={16} />}
              onClick={() => { window.print(); }} title="Print timetable">
              Print
            </Button>
          )}
          <Button icon={<Plus size={16} />} onClick={openAddModal} disabled={!selectedClass}>
            Add Slot
          </Button>
        </div>
      </div>

      {/* Class + View selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="input w-60 py-2 text-sm"
        >
          <option value="">— Select class to view timetable —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
        </select>
        {selectedClass && (
          <>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['grid', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{v}</button>
              ))}
            </div>
            {totalSlots > 0 && (
              <div className="flex gap-4 text-sm text-slate-500">
                <span><strong className="text-slate-800">{totalSlots}</strong> slots</span>
                <span><strong className="text-slate-800">{subjectsCovered}</strong> subjects covered</span>
              </div>
            )}
          </>
        )}
      </div>

      {!selectedClass ? (
        <div className="card p-16 text-center">
          <Calendar size={56} className="text-slate-200 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 text-lg">Select a Class</h3>
          <p className="text-slate-400 text-sm mt-2">Choose a class from the dropdown above to view and manage its weekly schedule</p>
        </div>
      ) : isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading timetable…</div>
      ) : (
        <>
          {/* GRID VIEW */}
          {view === 'grid' && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{selectedClassName} — Weekly Schedule</h3>
                <span className="text-xs text-slate-400">{totalSlots} scheduled periods</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="w-20 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      {DAYS.map((day, i) => (
                        <th key={day} className="px-3 py-3 text-left">
                          <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', DAY_HEADER_COLORS[i])}>{day}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((time, ti) => (
                      <tr key={time} className={cn('border-b border-slate-50', ti % 2 === 0 ? '' : 'bg-slate-50/30')}>
                        <td className="px-4 py-2 text-xs font-mono text-slate-400 font-semibold whitespace-nowrap">{time}</td>
                        {DAYS.map((day, di) => {
                          const daySlots: any[] = timetableData ? (timetableData[day] || []) : [];
                          const slot = daySlots.find((s: any) => s.startTime === time);
                          if (!slot) return <td key={day} className="px-2 py-1.5 min-w-[130px]" />;
                          return (
                            <td key={day} className="px-2 py-1.5 min-w-[130px]">
                              <div className={cn('p-2 rounded-xl border text-xs group relative', DAY_COLORS[di])}>
                                <p className="font-bold truncate">{slot.subject?.name}</p>
                                {slot.staff && <p className="opacity-70 truncate">{slot.staff.firstName} {slot.staff.lastName}</p>}
                                <p className="opacity-60 mt-0.5">{slot.startTime}–{slot.endTime}</p>
                                {slot.room && <p className="opacity-60 truncate">📍 {slot.room}</p>}
                                <button
                                  onClick={() => setDeleteConfirm(slot)}
                                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded text-xs items-center justify-center opacity-0 group-hover:opacity-100 flex transition-opacity"
                                  title="Remove slot"
                                >×</button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {view === 'list' && (
            <div className="space-y-4">
              {DAYS.map((day, di) => {
                const daySlots: any[] = timetableData ? (timetableData[day] || []) : [];
                if (!daySlots.length) return null;
                return (
                  <div key={day} className="card overflow-hidden">
                    <div className={cn('px-6 py-3 font-bold text-sm', DAY_HEADER_COLORS[di])}>{day} — {daySlots.length} period{daySlots.length !== 1 ? 's' : ''}</div>
                    <div className="divide-y divide-slate-50">
                      {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot: any) => (
                        <div key={slot.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 group">
                          <span className="text-sm font-mono text-slate-500 w-28 flex-shrink-0">{slot.startTime} – {slot.endTime}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{slot.subject?.name}</p>
                            <p className="text-xs text-slate-400 truncate">{slot.staff ? `${slot.staff.firstName} ${slot.staff.lastName}` : 'No teacher assigned'}</p>
                          </div>
                          {slot.room && <span className="badge-gray text-xs flex-shrink-0">📍 {slot.room}</span>}
                          <button onClick={() => setDeleteConfirm(slot)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {DAYS.every(day => !(timetableData?.[day]?.length)) && (
                <div className="card p-12 text-center">
                  <ClipboardList size={48} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No periods added yet for <strong>{selectedClassName}</strong></p>
                  <p className="text-sm text-slate-400 mt-1">Click "Add Slot" to start building the timetable</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Slot Modal */}
      <Modal open={modal} onClose={() => { setModal(false); form.reset(); }} title="Add Timetable Slot" size="md"
        footer={<><Button variant="secondary" onClick={() => { setModal(false); form.reset(); }}>Cancel</Button><Button loading={createMut.isPending} onClick={form.handleSubmit(d => createMut.mutate(d))}>Add Slot</Button></>}>
        <div className="space-y-4">
          <Select label="Class *" {...form.register('classId', { required: true })}
            options={[{ value: '', label: '— Select class —' }, ...classes.map(c => ({ value: c.id, label: `${c.name}${c.section ? ` (${c.section})` : ''}` }))]} />
          <Select label="Subject *" {...form.register('subjectId', { required: true })}
            options={[{ value: '', label: '— Select subject —' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]} />
          <Select label="Teacher / Staff" {...form.register('staffId')}
            options={[{ value: '', label: '— Assign teacher (optional) —' }, ...staff.map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))]} />
          <Select label="Day of Week *" {...form.register('dayOfWeek', { required: true })}
            options={DAYS.map((d, i) => ({ value: String(i + 1), label: d }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Start Time *" {...form.register('startTime', { required: true })}
              options={TIME_SLOTS.map(t => ({ value: t, label: t }))} />
            <Select label="End Time *" {...form.register('endTime', { required: true })}
              options={TIME_SLOTS.map(t => ({ value: t, label: t }))} />
          </div>
          <Input label="Room / Location" {...form.register('room')} placeholder="e.g. Block A Room 5, Science Lab" />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Slot" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteConfirm.id)}>Remove</Button></>}>
        <p>Remove <strong>{deleteConfirm?.subject?.name}</strong> on <strong>{DAYS[(deleteConfirm?.dayOfWeek || 1) - 1]}</strong> at <strong>{deleteConfirm?.startTime}</strong> from the timetable?</p>
      </Modal>
    </div>
  );
}
