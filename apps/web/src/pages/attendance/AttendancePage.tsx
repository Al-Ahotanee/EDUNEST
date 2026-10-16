import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ClipboardCheck, Save, Users, TrendingDown } from 'lucide-react';
import { StatCard, Button, Select, PageLoader, Badge } from '../../components/ui';
import { attendanceApi, academicApi, studentsApi } from '../../services/api';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'PRESENT', label: 'P', color: 'bg-emerald-500 text-white' },
  { value: 'ABSENT', label: 'A', color: 'bg-red-500 text-white' },
  { value: 'LATE', label: 'L', color: 'bg-amber-500 text-white' },
  { value: 'EXCUSED', label: 'E', color: 'bg-blue-400 text-white' },
];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [tab, setTab] = useState<'mark' | 'history'>('mark');

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => academicApi.classes().then(r => r.data.data || []) });
  const { data: sessionsData } = useQuery({ queryKey: ['sessions'], queryFn: () => academicApi.sessions().then(r => r.data.data || []) });
  const currentSession = sessionsData?.find((s: any) => s.isCurrent) || sessionsData?.[0];
  const { data: termsData } = useQuery({
    queryKey: ['terms', currentSession?.id],
    queryFn: () => academicApi.terms(currentSession.id).then(r => r.data.data || []),
    enabled: !!currentSession?.id,
  });
  const currentTerm = termsData?.find((t: any) => t.isCurrent) || termsData?.[0];

  const { data: studentsInClass, isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students-in-class', selectedClass],
    queryFn: () => studentsApi.list({ classId: selectedClass, limit: 200 }).then(r => r.data.data || []),
    enabled: !!selectedClass,
  });

  useEffect(() => {
    if (studentsInClass && studentsInClass.length > 0) {
      const initial: Record<string, AttendanceStatus> = {};
      studentsInClass.forEach((s: any) => { initial[s.id] = 'PRESENT'; });
      setAttendance(initial);
    }
  }, [studentsInClass]);

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance-history', selectedClass, selectedTerm || currentTerm?.id],
    queryFn: () => attendanceApi.list({ classId: selectedClass, termId: selectedTerm || currentTerm?.id, limit: 100 }).then(r => r.data.data || []),
    enabled: tab === 'history' && !!selectedClass,
  });

  const { data: statsData } = useQuery({
    queryKey: ['attendance-stats', selectedClass, selectedTerm || currentTerm?.id],
    queryFn: () => attendanceApi.stats({ classId: selectedClass, termId: selectedTerm || currentTerm?.id }).then(r => r.data.data),
    enabled: !!selectedClass && !!(selectedTerm || currentTerm?.id),
  });

  const bulkMarkMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.bulkMark(data),
    onSuccess: () => {
      toast.success('Attendance recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save attendance'),
  });

  const handleSave = () => {
    if (!selectedClass) { toast.error('Please select a class'); return; }
    if (!Object.keys(attendance).length) { toast.error('No students found'); return; }

    const records = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status,
      termId: selectedTerm || currentTerm?.id,
      date,
    }));
    bulkMarkMutation.mutate({ records });
  };

  const toggleStatus = (studentId: string) => {
    const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    const current = attendance[studentId] || 'PRESENT';
    const nextIdx = (statuses.indexOf(current) + 1) % statuses.length;
    setAttendance(prev => ({ ...prev, [studentId]: statuses[nextIdx] }));
  };

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    (studentsInClass || []).forEach((s: any) => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const lateCount = Object.values(attendance).filter(s => s === 'LATE').length;
  const total = Object.keys(attendance).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Management</h1>
          <p className="page-subtitle">Mark and track student attendance</p>
        </div>
        {tab === 'mark' && (
          <Button icon={<Save size={16} />} onClick={handleSave} loading={bulkMarkMutation.isPending} disabled={!selectedClass || !total}>
            Save Attendance
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Present Today" value={presentCount} icon={<ClipboardCheck size={20} />} color="green" />
        <StatCard title="Absent" value={absentCount} icon={<Users size={20} />} color="red" />
        <StatCard title="Late" value={lateCount} icon={<TrendingDown size={20} />} color="amber" />
        <StatCard title="Total Students" value={total} icon={<Users size={20} />} color="blue" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['mark', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'mark' ? 'Mark Attendance' : 'History'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          options={(classesData || []).map((c: any) => ({ value: c.id, label: c.name }))}
          placeholder="Select Class" value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)} className="w-44 py-2 text-sm" />
        <Select
          options={(termsData || []).map((t: any) => ({ value: t.id, label: t.name }))}
          placeholder="Current Term" value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)} className="w-48 py-2 text-sm" />
        {tab === 'mark' && (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="input w-44 py-2 text-sm" />
        )}
      </div>

      {/* Mark Attendance Tab */}
      {tab === 'mark' && selectedClass && (
        <div className="card overflow-hidden">
          {/* Quick actions */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-600">Mark all as:</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => markAll(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${s.color} opacity-80 hover:opacity-100`}>
                {s.value}
              </button>
            ))}
            <span className="ml-auto text-sm text-slate-500">
              {presentCount}/{total} present • Attendance: {total ? Math.round((presentCount / total) * 100) : 0}%
            </span>
          </div>

          {loadingStudents ? (
            <div className="p-8 text-center text-slate-400">Loading students...</div>
          ) : !studentsInClass?.length ? (
            <div className="p-8 text-center text-slate-400">No students in this class</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {studentsInClass.map((student: any, i: number) => {
                const status = attendance[student.id] || 'PRESENT';
                const statusOpt = STATUS_OPTIONS.find(s => s.value === status)!;
                return (
                  <div key={student.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-400 w-7 text-center">{i + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-slate-400">{student.admissionNumber}</p>
                    </div>
                    <button
                      onClick={() => toggleStatus(student.id)}
                      className={cn('w-24 py-2 rounded-xl text-sm font-bold transition-all', statusOpt.color)}
                    >
                      {status}
                    </button>
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map(s => (
                        <button key={s.value}
                          onClick={() => setAttendance(prev => ({ ...prev, [student.id]: s.value }))}
                          className={cn('w-8 h-8 rounded-lg text-xs font-bold transition-all',
                            status === s.value ? s.color : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="card overflow-hidden">
          {loadingHistory ? (
            <div className="p-8 text-center text-slate-400">Loading history...</div>
          ) : !historyData?.length ? (
            <div className="p-8 text-center text-slate-400">No attendance records found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyData.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{r.student?.firstName} {r.student?.lastName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selectedClass && (
        <div className="card p-12 text-center">
          <ClipboardCheck size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600">Select a Class to Continue</h3>
          <p className="text-sm text-slate-400 mt-1">Choose a class from the dropdown above to mark or view attendance</p>
        </div>
      )}
    </div>
  );
}
