import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardCheck, Save, Users, TrendingDown, ChevronLeft, ChevronRight,
  Calendar, Download, Printer, CheckCircle2, Clock, Check, X
} from 'lucide-react';
import { StatCard, Button, Select, PageLoader, Badge } from '../../components/ui';
import { attendanceApi, academicApi, studentsApi } from '../../services/api';
import { formatDate, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; short: string; color: string }[] = [
  { value: 'PRESENT', label: 'Present', short: 'P', color: 'bg-emerald-500 text-white' },
  { value: 'ABSENT', label: 'Absent', short: 'A', color: 'bg-red-500 text-white' },
  { value: 'LATE', label: 'Late', short: 'L', color: 'bg-amber-500 text-white' },
  { value: 'EXCUSED', label: 'Excused', short: 'E', color: 'bg-blue-500 text-white' },
];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: 'EduNest' };

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
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
      const initialRemarks: Record<string, string> = {};
      studentsInClass.forEach((s: any) => {
        initial[s.id] = 'PRESENT';
        initialRemarks[s.id] = '';
      });
      setAttendance(initial);
      setRemarks(initialRemarks);
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

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleExportAttendance = () => {
    const list = historyData || [];
    if (!list.length) { toast.error('No attendance records to export'); return; }
    const headers = ['Student Name', 'Admission No', 'Date', 'Status', 'Remarks'];
    const rows = list.map((r: any) => [
      `"${r.student?.firstName || ''} ${r.student?.lastName || ''}"`,
      `"${r.student?.admissionNumber || ''}"`,
      `"${formatDate(r.date)}"`,
      `"${r.status || ''}"`,
      `"${r.remarks || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance records exported as CSV');
  };

  const handleSave = () => {
    if (!selectedClass) { toast.error('Please select a class'); return; }
    if (!Object.keys(attendance).length) { toast.error('No students found'); return; }

    const records = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status,
      remarks: remarks[studentId] || undefined,
      termId: selectedTerm || currentTerm?.id,
      date,
    }));
    bulkMarkMutation.mutate({ records });
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    (studentsInClass || []).forEach((s: any) => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const lateCount = Object.values(attendance).filter(s => s === 'LATE').length;
  const excusedCount = Object.values(attendance).filter(s => s === 'EXCUSED').length;
  const total = Object.keys(attendance).length;
  const presentPct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance & Roll Call</h1>
          <p className="page-subtitle">Daily roll call registers, student presence tracking, and institutional attendance reports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tab === 'history' && (
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={handleExportAttendance}
            >
              Export CSV
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<Printer size={16} />}
            onClick={() => window.print()}
          >
            Print Register
          </Button>
          {tab === 'mark' && (
            <Button
              icon={<Save size={16} />}
              onClick={handleSave}
              loading={bulkMarkMutation.isPending}
              disabled={!selectedClass || !total}
            >
              Save Attendance
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Present Today" value={presentCount} subtitle={`${presentPct}% presence`} icon={<ClipboardCheck size={20} />} color="green" />
        <StatCard title="Absent" value={absentCount} icon={<Users size={20} />} color="red" />
        <StatCard title="Late Arrivals" value={lateCount} icon={<Clock size={20} />} color="amber" />
        <StatCard title="Excused" value={excusedCount} icon={<CheckCircle2 size={20} />} color="blue" />
        <StatCard title="Total Enrolled" value={total} icon={<Users size={20} />} color="purple" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 pb-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['mark', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all whitespace-nowrap',
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t === 'mark' ? 'Daily Roll Call' : 'Attendance History'}
            </button>
          ))}
        </div>

        {/* Date Navigator Controls */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
          <button
            onClick={handlePrevDay}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Today
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-2 py-0.5 text-xs font-medium bg-transparent border-none text-slate-800 focus:outline-none"
          />
          <button
            onClick={handleNextDay}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Class & Term Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          options={(classesData || []).map((c: any) => ({ value: c.id, label: c.name }))}
          placeholder="Select Class *"
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="w-56 py-2 text-sm"
        />
        <Select
          options={(termsData || []).map((t: any) => ({ value: t.id, label: t.name }))}
          placeholder="Select Term"
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
          className="w-52 py-2 text-sm"
        />
        {selectedClass && (
          <span className="text-xs text-slate-500 font-medium px-3 py-1.5 bg-slate-100 rounded-lg">
            Date: <strong className="text-slate-800">{formatDate(date)}</strong>
          </span>
        )}
      </div>

      {/* ─── 1. DAILY ROLL CALL TAB ─────────────────────────────────────────────── */}
      {tab === 'mark' && selectedClass && (
        <div className="card overflow-hidden">
          {/* Quick Bulk Actions Toolbar */}
          <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Quick Bulk:</span>
              <button
                onClick={() => markAll('PRESENT')}
                className="btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-1"
              >
                <Check size={13} />
                All Present
              </button>
              <button
                onClick={() => markAll('ABSENT')}
                className="btn-sm bg-red-600 text-white hover:bg-red-700 gap-1"
              >
                <X size={13} />
                All Absent
              </button>
              <button
                onClick={() => markAll('LATE')}
                className="btn-sm bg-amber-500 text-white hover:bg-amber-600 gap-1"
              >
                <Clock size={13} />
                All Late
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="font-semibold">{presentCount} of {total} present</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">{presentPct}%</span>
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-12 text-center text-slate-400">Loading student roster...</div>
          ) : !studentsInClass?.length ? (
            <div className="p-12 text-center text-slate-400">No students enrolled in this class</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studentsInClass.map((student: any, i: number) => {
                const currentStatus = attendance[student.id] || 'PRESENT';
                return (
                  <div key={student.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors flex-wrap sm:flex-nowrap">
                    <span className="text-xs font-mono text-slate-400 w-6 text-center">{i + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <p className="font-semibold text-slate-900 leading-tight">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs font-mono text-slate-400">{student.admissionNumber}</p>
                    </div>

                    {/* Status Pill Toggle Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setStatus(student.id, opt.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1',
                            currentStatus === opt.value
                              ? `${opt.color} shadow-sm scale-105`
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          )}
                        >
                          <span>{opt.short}</span>
                          <span className="hidden md:inline">{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Absence Remarks / Note */}
                    <div className="w-full sm:w-48 flex-shrink-0">
                      <input
                        type="text"
                        placeholder="Remarks / Note..."
                        value={remarks[student.id] || ''}
                        onChange={e => setRemarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                        className="input py-1 text-xs px-2.5 w-full bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 2. ATTENDANCE HISTORY TAB ──────────────────────────────────────────── */}
      {tab === 'history' && selectedClass && (
        <div className="card overflow-hidden">
          {loadingHistory ? (
            <div className="p-12 text-center text-slate-400">Loading attendance history...</div>
          ) : !historyData?.length ? (
            <div className="p-12 text-center text-slate-400">No attendance records found for this selection</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-medium text-slate-900">
                        {r.student?.firstName} {r.student?.lastName}
                      </td>
                      <td className="text-sm text-slate-600">{formatDate(r.date)}</td>
                      <td>
                        <Badge status={r.status} />
                      </td>
                      <td className="text-sm text-slate-500">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedClass && (
        <div className="card p-12 text-center">
          <ClipboardCheck size={44} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">Select a Class to Begin Roll Call</h3>
          <p className="text-sm text-slate-400 mt-1">Choose a class from the dropdown above to load the student attendance roster</p>
        </div>
      )}
    </div>
  );
}
