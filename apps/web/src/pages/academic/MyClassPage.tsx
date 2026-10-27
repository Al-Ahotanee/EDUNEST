import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users, ClipboardCheck, Calendar, BookOpen, Award,
  DollarSign, Check, X, Clock, AlertTriangle, Phone,
  Search, Save, CheckCircle2, ChevronRight, ShieldCheck,
  FileSpreadsheet, HelpCircle, UserCheck, Eye, RefreshCw,
} from 'lucide-react';
import { Button, Modal, StatCard, Badge, Avatar, PageLoader, Select, Input } from '../../components/ui';
import { teacherApi, attendanceApi, resultsApi, financeApi } from '../../services/api';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { ClassBroadsheet } from '../../components/results/ClassBroadsheet';

type MyClassTab = 'roster' | 'attendance' | 'broadsheet' | 'endorse' | 'timetable' | 'finance';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', short: 'P', color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  { value: 'ABSENT', label: 'Absent', short: 'A', color: 'bg-rose-600 text-white hover:bg-rose-700' },
  { value: 'LATE', label: 'Late', short: 'L', color: 'bg-amber-600 text-white hover:bg-amber-700' },
  { value: 'EXCUSED', label: 'Excused', short: 'E', color: 'bg-blue-600 text-white hover:bg-blue-700' },
];

export default function MyClassPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MyClassTab>('roster');
  const [search, setSearch] = useState('');

  // Attendance state for today
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; remarks: string }>>({});
  const [isAttendanceDirty, setIsAttendanceDirty] = useState(false);

  // Endorsement Modal State
  const [endorseStudent, setEndorseStudent] = useState<any>(null);
  const [endorseForm, setEndorseForm] = useState({
    classTeacherRemark: '',
    attendanceDaysTotal: 65,
    attendanceDaysPresent: 60,
    attendanceDaysAbsent: 5,
    promotionStatus: 'PROMOTED',
    nextTermResumption: '',
    affectiveRatings: {
      punctuality: 4,
      neatness: 5,
      politeness: 5,
      honesty: 4,
      leadership: 4,
      attentiveness: 4,
      cooperation: 5,
      emotionalStability: 4,
    },
    psychomotorRatings: {
      handwriting: 4,
      sports: 4,
      crafts: 4,
      publicSpeaking: 4,
      toolsHandling: 4,
    },
  });

  // Cash Collection Modal State
  const [cashModal, setCashModal] = useState<{ studentId: string; studentName: string } | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');

  // Fetch Class Master Data
  const { data: myClassData, isLoading, refetch } = useQuery({
    queryKey: ['my-class-data'],
    queryFn: () => teacherApi.getMyClass().then((r) => r.data?.data || r.data),
  });

  const cls = myClassData?.class || {};
  const students = (myClassData?.students || []).filter((s: any) =>
    !search ||
    (s.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.admissionNumber || '').toLowerCase().includes(search.toLowerCase())
  );
  const timetableSlots = myClassData?.timetableSlots || [];
  const session = myClassData?.session || {};
  const term = myClassData?.term || {};

  // Initialize attendance roster from fetched student todayAttendance
  React.useEffect(() => {
    if (myClassData?.students && !isAttendanceDirty) {
      const initial: Record<string, { status: string; remarks: string }> = {};
      myClassData.students.forEach((s: any) => {
        initial[s.id] = {
          status: s.todayAttendance?.status || 'UNMARKED',
          remarks: s.todayAttendance?.remarks || '',
        };
      });
      setAttendanceRecords(initial);
    }
  }, [myClassData, isAttendanceDirty]);

  // Bulk Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: (records: any[]) =>
      attendanceApi.bulkMark({ records }),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'Attendance records saved successfully!');
      setIsAttendanceDirty(false);
      queryClient.invalidateQueries({ queryKey: ['my-class-data'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard-summary'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to save attendance');
    },
  });

  const handleMarkStatus = (studentId: string, status: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setIsAttendanceDirty(true);
  };

  const handleMarkAll = (status: string) => {
    const updated: Record<string, { status: string; remarks: string }> = {};
    (myClassData?.students || []).forEach((s: any) => {
      updated[s.id] = {
        status,
        remarks: attendanceRecords[s.id]?.remarks || '',
      };
    });
    setAttendanceRecords(updated);
    setIsAttendanceDirty(true);
    toast.success(`Marked all ${myClassData?.students?.length || 0} students as ${status}`);
  };

  const handleSaveAttendance = () => {
    const records = Object.entries(attendanceRecords)
      .filter(([_, val]) => val.status !== 'UNMARKED')
      .map(([studentId, val]) => ({
        studentId,
        termId: term.id,
        date: attendanceDate,
        status: val.status,
        remarks: val.remarks || null,
      }));

    if (records.length === 0) {
      toast.error('No marked students to save. Select a status for at least one student.');
      return;
    }

    saveAttendanceMutation.mutate(records);
  };

  // Endorse Report Card Mutation
  const endorseMutation = useMutation({
    mutationFn: (data: any) => resultsApi.endorseReportCard(data),
    onSuccess: () => {
      toast.success('Report card remarks and holistic ratings submitted!');
      setEndorseStudent(null);
      queryClient.invalidateQueries({ queryKey: ['my-class-data'] });
      queryClient.invalidateQueries({ queryKey: ['class-broadsheet'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to save remarks');
    },
  });

  const handleOpenEndorse = (student: any) => {
    setEndorseStudent(student);
    setEndorseForm({
      classTeacherRemark: student.classTeacherRemark || 'Good performance, disciplined and attentive in class.',
      attendanceDaysTotal: 65,
      attendanceDaysPresent: 62,
      attendanceDaysAbsent: 3,
      promotionStatus: 'PROMOTED',
      nextTermResumption: '',
      affectiveRatings: {
        punctuality: 5,
        neatness: 5,
        politeness: 5,
        honesty: 4,
        leadership: 4,
        attentiveness: 5,
        cooperation: 5,
        emotionalStability: 4,
      },
      psychomotorRatings: {
        handwriting: 4,
        sports: 4,
        crafts: 4,
        publicSpeaking: 4,
        toolsHandling: 4,
      },
    });
  };

  const handleSubmitEndorse = () => {
    if (!endorseStudent) return;
    endorseMutation.mutate({
      studentId: endorseStudent.id,
      termId: term.id,
      classId: cls.id,
      ...endorseForm,
    });
  };

  // Submit Cash Collection Mutation
  const submitCashMutation = useMutation({
    mutationFn: (data: any) => financeApi.submitPayment(data),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'Cash payment submitted to Accountant for verification');
      setCashModal(null);
      setCashAmount('');
      setCashNotes('');
      queryClient.invalidateQueries({ queryKey: ['my-class-data'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to submit cash collection'),
  });

  if (isLoading) return <PageLoader />;

  if (!cls?.id) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
        <ShieldCheck className="mx-auto text-slate-400" size={48} />
        <h2 className="text-xl font-bold text-slate-800">No Assigned Class Master Role Found</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          You are currently not designated as a Class Master for any class. If you believe this is an error, please contact the School Principal or Administrator.
        </p>
      </div>
    );
  }

  // Attendance metrics today
  const markedList = Object.values(attendanceRecords);
  const totalPresent = markedList.filter((r) => r.status === 'PRESENT').length;
  const totalAbsent = markedList.filter((r) => r.status === 'ABSENT').length;
  const totalLate = markedList.filter((r) => r.status === 'LATE').length;
  const totalUnmarked = markedList.filter((r) => r.status === 'UNMARKED').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* School / Class Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                Class Master Portal
              </span>
              <span className="text-xs text-slate-400">
                {session?.name || '2026/2027'} &bull; {term?.name || 'First Term'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              {cls.name} {cls.section ? `(${cls.section})` : ''}
              <span className="text-sm font-normal text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-lg">
                Level {cls.level || 1}
              </span>
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Class Master: <span className="font-semibold text-white">{user?.firstName} {user?.lastName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('attendance')}
              icon={<ClipboardCheck size={16} />}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Take Attendance
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('broadsheet')}
              icon={<FileSpreadsheet size={16} />}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Class Broadsheet
            </Button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div>
            <p className="text-xs text-slate-400">Enrolled Students</p>
            <p className="text-xl font-bold text-white">{students.length} <span className="text-xs font-normal text-slate-400">/ {cls.capacity || 40}</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Present Today</p>
            <p className="text-xl font-bold text-emerald-400">{totalPresent}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Absent Today</p>
            <p className="text-xl font-bold text-rose-400">{totalAbsent}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Unmarked</p>
            <p className="text-xl font-bold text-amber-400">{totalUnmarked}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('roster')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'roster'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Users size={16} />
          Student Roster ({students.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <ClipboardCheck size={16} />
          Daily Attendance
          {isAttendanceDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </button>

        <button
          onClick={() => setActiveTab('broadsheet')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'broadsheet'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <FileSpreadsheet size={16} />
          Academic Broadsheet
        </button>

        <button
          onClick={() => setActiveTab('endorse')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'endorse'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Award size={16} />
          Report Card Endorsements
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'timetable'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Calendar size={16} />
          Class Timetable
        </button>

        <Link
          to="/app/finance/class-master"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-t-lg border-b-2 border-transparent hover:border-slate-300 ml-auto"
        >
          <DollarSign size={16} />
          Class Fees & Cash
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* ─── TAB 1: STUDENT ROSTER ─────────────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search students by name or admission number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing {students.length} enrolled student{students.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Adm Number</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Parent / Guardian Contact</th>
                    <th className="py-3 px-4">Today's Attendance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s: any) => {
                    const todayStatus = attendanceRecords[s.id]?.status || s.todayAttendance?.status || 'UNMARKED';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={s.fullName} src={s.photo} size="sm" />
                            <div>
                              <p className="font-semibold text-slate-800">{s.fullName}</p>
                              <p className="text-xs text-slate-400">Class: {cls.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 font-medium">
                          {s.admissionNumber}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={s.gender === 'MALE' ? 'blue' : 'purple'}>
                            {s.gender}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {s.guardianPhone ? (
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-700 flex items-center gap-1">
                                <Phone size={12} className="text-slate-400" />
                                {s.guardianPhone}
                              </p>
                              <p className="text-slate-400">{s.guardianName} ({s.guardianRelationship || 'Guardian'})</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No contact registered</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                              todayStatus === 'PRESENT' && 'bg-emerald-100 text-emerald-800',
                              todayStatus === 'ABSENT' && 'bg-rose-100 text-rose-800',
                              todayStatus === 'LATE' && 'bg-amber-100 text-amber-800',
                              todayStatus === 'EXCUSED' && 'bg-blue-100 text-blue-800',
                              todayStatus === 'UNMARKED' && 'bg-slate-100 text-slate-600'
                            )}
                          >
                            {todayStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenEndorse(s)}
                              icon={<Award size={13} />}
                            >
                              Endorse
                            </Button>
                            <Link to={`/app/results?classId=${cls.id}&studentId=${s.id}`}>
                              <Button variant="secondary" size="xs" icon={<Eye size={13} />}>
                                Results
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No students enrolled in this class matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: DAILY ATTENDANCE ───────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-44">
                <Input
                  label="Date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
              </div>
              <div className="pt-5 flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleMarkAll('PRESENT')}
                  className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                >
                  Mark All Present
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleMarkAll('ABSENT')}
                  className="text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                >
                  Mark All Absent
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 sm:pt-0">
              <Button
                variant="primary"
                onClick={handleSaveAttendance}
                isLoading={saveAttendanceMutation.isPending}
                icon={<Save size={16} />}
                disabled={!isAttendanceDirty}
              >
                Save Attendance Register
              </Button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Adm No</th>
                    <th className="py-3 px-4 text-center">Status Toggle</th>
                    <th className="py-3 px-4">Remarks (Optional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s: any) => {
                    const rec = attendanceRecords[s.id] || { status: 'UNMARKED', remarks: '' };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.fullName} src={s.photo} size="xs" />
                            <span className="font-medium text-slate-800">{s.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {s.admissionNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleMarkStatus(s.id, opt.value)}
                                className={cn(
                                  'w-8 h-8 rounded-lg text-xs font-bold transition-all border',
                                  rec.status === opt.value
                                    ? `${opt.color} shadow-xs scale-105 border-transparent`
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200'
                                )}
                                title={opt.label}
                              >
                                {opt.short}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Add reason or remark..."
                            value={rec.remarks}
                            onChange={(e) => {
                              setAttendanceRecords((prev) => ({
                                ...prev,
                                [s.id]: {
                                  ...prev[s.id],
                                  remarks: e.target.value,
                                },
                              }));
                              setIsAttendanceDirty(true);
                            }}
                            className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: ACADEMIC BROADSHEET ────────────────────────────────────── */}
      {activeTab === 'broadsheet' && (
        <div className="space-y-4">
          <ClassBroadsheet
            classId={cls.id}
            termId={term?.id}
            hideFilters={true}
          />
        </div>
      )}

      {/* ─── TAB 4: REPORT CARD ENDORSEMENT ─────────────────────────────────── */}
      {activeTab === 'endorse' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Class Master Report Card Endorsement</h3>
            <p className="text-sm text-slate-500 mb-4">
              Provide formal teacher remarks, behavioral observations, and psychomotor ratings for students in {cls.name} for {term.name}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((s: any) => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm transition-all space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.fullName} src={s.photo} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{s.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.admissionNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">Holistic Ratings</span>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleOpenEndorse(s)}
                      icon={<Award size={13} />}
                    >
                      Endorse Remarks
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: CLASS TIMETABLE ────────────────────────────────────────── */}
      {activeTab === 'timetable' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Weekly Schedule for {cls.name}</h3>
            <span className="text-xs text-slate-500">{timetableSlots.length} allocated periods</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {timetableSlots.map((slot: any) => {
                  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  return (
                    <tr key={slot.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {dayNames[slot.dayOfWeek - 1] || `Day ${slot.dayOfWeek}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {slot.subject?.name} <span className="text-xs text-slate-400">({slot.subject?.code})</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {slot.staff ? `${slot.staff.firstName} ${slot.staff.lastName}` : 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {slot.room || 'Main Hall'}
                      </td>
                    </tr>
                  );
                })}
                {timetableSlots.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No timetable slots configured for this class yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: ENDORSE REPORT CARD ────────────────────────────────────── */}
      {endorseStudent && (
        <Modal
          isOpen={Boolean(endorseStudent)}
          onClose={() => setEndorseStudent(null)}
          title={`Endorse Report Card: ${endorseStudent.fullName}`}
          size="lg"
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Teacher's Formal Remark
              </label>
              <textarea
                rows={3}
                value={endorseForm.classTeacherRemark}
                onChange={(e) => setEndorseForm({ ...endorseForm, classTeacherRemark: e.target.value })}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                placeholder="Enter comprehensive academic, behavioral, and moral assessment..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Days Opened</label>
                <input
                  type="number"
                  value={endorseForm.attendanceDaysTotal}
                  onChange={(e) => setEndorseForm({ ...endorseForm, attendanceDaysTotal: Number(e.target.value) })}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Days Present</label>
                <input
                  type="number"
                  value={endorseForm.attendanceDaysPresent}
                  onChange={(e) => setEndorseForm({ ...endorseForm, attendanceDaysPresent: Number(e.target.value) })}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Days Absent</label>
                <input
                  type="number"
                  value={endorseForm.attendanceDaysAbsent}
                  onChange={(e) => setEndorseForm({ ...endorseForm, attendanceDaysAbsent: Number(e.target.value) })}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Affective Ratings (Scale 1 - 5) */}
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Affective Domain (Behavioral & Attitudinal Ratings, 1 - 5)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(endorseForm.affectiveRatings).map(([trait, rating]) => (
                  <div key={trait} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="capitalize text-slate-600 block mb-1">{trait}</span>
                    <select
                      value={rating}
                      onChange={(e) =>
                        setEndorseForm({
                          ...endorseForm,
                          affectiveRatings: {
                            ...endorseForm.affectiveRatings,
                            [trait]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                    >
                      {[5, 4, 3, 2, 1].map((val) => (
                        <option key={val} value={val}>
                          {val} - {val === 5 ? 'Excellent' : val === 4 ? 'Good' : val === 3 ? 'Fair' : val === 2 ? 'Poor' : 'Very Poor'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setEndorseStudent(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitEndorse}
                isLoading={endorseMutation.isPending}
                icon={<Save size={16} />}
              >
                Save Endorsement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
