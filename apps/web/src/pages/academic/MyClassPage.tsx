import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users, ClipboardCheck, Calendar, BookOpen, Award,
  Check, X, Clock, Phone, Mail, Search, Save,
  ChevronRight, ShieldCheck, FileSpreadsheet,
  Eye, RefreshCw, FileText, UserCheck, Filter,
  Printer, ArrowUpRight,
} from 'lucide-react';
import { Button, Modal, Badge, Avatar, PageLoader, Select, Input } from '../../components/ui';
import { teacherApi, attendanceApi, resultsApi, financeApi, schoolsApi } from '../../services/api';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { ClassBroadsheet } from '../../components/results/ClassBroadsheet';
import { Student360Modal } from '../../components/students/Student360Modal';
import { StudentDocumentModal } from '../../components/documents/StudentDocumentModal';

type MyClassTab = 'roster' | 'attendance' | 'broadsheet' | 'endorse' | 'timetable';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', short: 'P', activeClass: 'bg-emerald-600 text-white font-bold shadow-xs', idleClass: 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700' },
  { value: 'ABSENT', label: 'Absent', short: 'A', activeClass: 'bg-rose-600 text-white font-bold shadow-xs', idleClass: 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700' },
  { value: 'LATE', label: 'Late', short: 'L', activeClass: 'bg-amber-600 text-white font-bold shadow-xs', idleClass: 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700' },
  { value: 'EXCUSED', label: 'Excused', short: 'E', activeClass: 'bg-blue-600 text-white font-bold shadow-xs', idleClass: 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700' },
];

export default function MyClassPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MyClassTab>('roster');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [attendanceFilter, setAttendanceFilter] = useState('ALL');

  // Student 360 & Document Modals
  const [selectedStudent360, setSelectedStudent360] = useState<any>(null);
  const [docModal, setDocModal] = useState<{
    open: boolean;
    student: any;
    docType: 'admission' | 'enrollment';
  }>({
    open: false,
    student: null,
    docType: 'admission',
  });

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

  // Fetch School Branding
  const { data: schoolBranding } = useQuery({
    queryKey: ['current-school-branding'],
    queryFn: () => schoolsApi.current().then((r) => r.data?.data || r.data).catch(() => user?.school || user?.tenant || {}),
  });

  // Fetch Class Master Data
  const { data: myClassData, isLoading, refetch } = useQuery({
    queryKey: ['my-class-data'],
    queryFn: () => teacherApi.getMyClass().then((r) => r.data?.data || r.data),
  });

  const cls = myClassData?.class || {};
  const rawStudents = myClassData?.students || [];
  const timetableSlots = myClassData?.timetableSlots || [];
  const session = myClassData?.session || {};
  const term = myClassData?.term || {};

  // Initialize attendance roster from fetched student todayAttendance
  React.useEffect(() => {
    if (rawStudents.length > 0 && !isAttendanceDirty) {
      const initial: Record<string, { status: string; remarks: string }> = {};
      rawStudents.forEach((s: any) => {
        initial[s.id] = {
          status: s.todayAttendance?.status || 'UNMARKED',
          remarks: s.todayAttendance?.remarks || '',
        };
      });
      setAttendanceRecords(initial);
    }
  }, [rawStudents, isAttendanceDirty]);

  // Bulk Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: (records: any[]) => attendanceApi.bulkMark({ records }),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'Attendance saved successfully!');
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
    rawStudents.forEach((s: any) => {
      updated[s.id] = {
        status,
        remarks: attendanceRecords[s.id]?.remarks || '',
      };
    });
    setAttendanceRecords(updated);
    setIsAttendanceDirty(true);
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
      toast.error('No marked students to save. Mark attendance for at least one student.');
      return;
    }

    saveAttendanceMutation.mutate(records);
  };

  // Endorse Report Card Mutation
  const endorseMutation = useMutation({
    mutationFn: (data: any) => resultsApi.endorseReportCard(data),
    onSuccess: () => {
      toast.success('Report card remarks and holistic ratings saved successfully!');
      setEndorseStudent(null);
      queryClient.invalidateQueries({ queryKey: ['my-class-data'] });
      queryClient.invalidateQueries({ queryKey: ['class-broadsheet'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to save endorsement');
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

  const handleOpenAdmissionLetter = (student: any) => {
    setDocModal({
      open: true,
      student: { ...student, className: cls.name },
      docType: 'admission',
    });
  };

  if (isLoading) return <PageLoader />;

  if (!cls?.id) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <ShieldCheck className="mx-auto text-slate-400" size={48} />
        <h2 className="text-xl font-bold text-slate-800">No Assigned Class Master Role</h2>
        <p className="text-sm text-slate-500">
          You are currently not designated as a Class Master for any active class. If you require class assignment, please contact the School Administrator.
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

  // Filtered students for roster
  const filteredStudents = rawStudents.filter((s: any) => {
    const matchesSearch =
      !search ||
      (s.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.admissionNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
    const currentStatus = attendanceRecords[s.id]?.status || s.todayAttendance?.status || 'UNMARKED';
    const matchesAttendance = attendanceFilter === 'ALL' || currentStatus === attendanceFilter;
    return matchesSearch && matchesGender && matchesAttendance;
  });

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Enterprise Header */}
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <span>Class Master Operations</span>
              <span>&bull;</span>
              <span>{session?.name || '2026/2027'}</span>
              <span>&bull;</span>
              <span className="text-blue-400">{term?.name || 'Current Term'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">
                {cls.name} {cls.section ? `(${cls.section})` : ''}
              </h1>
              <span className="text-xs font-semibold bg-white/10 text-slate-300 border border-white/10 px-2.5 py-0.5 rounded">
                Level {cls.level || 1}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Master: <strong className="text-white">{user?.firstName} {user?.lastName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('attendance')}
              icon={<ClipboardCheck size={15} />}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              Take Attendance
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('broadsheet')}
              icon={<FileSpreadsheet size={15} />}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              Class Broadsheet
            </Button>
          </div>
        </div>

        {/* High-density Data KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Enrolled Scholars
            </span>
            <p className="text-lg font-bold text-white">
              {rawStudents.length}{' '}
              <span className="text-xs font-normal text-slate-400">/ {cls.capacity || 40} cap</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Present Today
            </span>
            <p className="text-lg font-bold text-emerald-400">{totalPresent}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Absent Today
            </span>
            <p className="text-lg font-bold text-rose-400">{totalAbsent}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Pending / Unmarked
            </span>
            <p className="text-lg font-bold text-amber-400">{totalUnmarked}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('roster')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'roster'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Users size={15} />
          Student Roster ({rawStudents.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <ClipboardCheck size={15} />
          Daily Attendance
          {isAttendanceDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </button>

        <button
          onClick={() => setActiveTab('broadsheet')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'broadsheet'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <FileSpreadsheet size={15} />
          Academic Broadsheet
        </button>

        <button
          onClick={() => setActiveTab('endorse')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'endorse'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Award size={15} />
          Report Endorsements
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'timetable'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Calendar size={15} />
          Class Timetable
        </button>
      </div>

      {/* ─── TAB 1: STUDENT ROSTER ─────────────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Roster Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search scholars by name or admission number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                aria-label="Filter by gender"
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>

              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                aria-label="Filter by today's attendance"
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Attendance</option>
                <option value="PRESENT">Present Today</option>
                <option value="ABSENT">Absent Today</option>
                <option value="LATE">Late Today</option>
                <option value="UNMARKED">Unmarked</option>
              </select>

              <div className="text-xs text-slate-500 font-medium pl-1">
                Showing {filteredStudents.length} of {rawStudents.length}
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Student Scholar</th>
                    <th className="py-2.5 px-3">Admission No.</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">Primary Guardian</th>
                    <th className="py-2.5 px-3">Today</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.map((s: any) => {
                    const todayStatus = attendanceRecords[s.id]?.status || s.todayAttendance?.status || 'UNMARKED';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setSelectedStudent360(s)}
                          >
                            <Avatar name={s.fullName} src={s.photo} size="sm" className="rounded-lg" />
                            <div>
                              <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                                {s.fullName}
                                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                              </p>
                              <p className="text-[11px] text-slate-400">Class: {cls.name}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {s.admissionNumber}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                              s.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                            )}
                          >
                            {s.gender || '—'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {s.guardianPhone ? (
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800">{s.guardianName}</p>
                              <a
                                href={`tel:${s.guardianPhone}`}
                                className="font-mono text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Phone size={11} />
                                {s.guardianPhone}
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No contact registered</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
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
                              onClick={() => setSelectedStudent360(s)}
                              icon={<Users size={12} />}
                              className="text-slate-700 font-semibold text-[11px]"
                            >
                              360° Profile
                            </Button>

                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenAdmissionLetter(s)}
                              icon={<FileText size={12} />}
                              className="text-slate-700 font-semibold text-[11px]"
                              title="Print / View Admission Letter"
                            >
                              Admission Letter
                            </Button>

                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenEndorse(s)}
                              icon={<Award size={12} />}
                              className="text-slate-700 font-semibold text-[11px]"
                            >
                              Endorse
                            </Button>

                            <Link to={`/app/results?classId=${cls.id}&studentId=${s.id}`}>
                              <Button
                                variant="secondary"
                                size="xs"
                                icon={<Eye size={12} />}
                                className="text-slate-700 font-semibold text-[11px]"
                              >
                                Results
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                        No students match the specified search or filter criteria.
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
          {/* Action & Batch Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-40">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleMarkAll('ABSENT')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  Mark All Absent
                </button>
                <button
                  onClick={() => handleMarkAll('UNMARKED')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAttendanceDirty && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
              <Button
                variant="primary"
                size="sm"
                loading={saveAttendanceMutation.isPending}
                onClick={handleSaveAttendance}
                icon={<Save size={15} />}
              >
                Save Attendance Records
              </Button>
            </div>
          </div>

          {/* Attendance Marking Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Student Scholar</th>
                    <th className="py-2.5 px-3">Admission No.</th>
                    <th className="py-2.5 px-4 text-center">Attendance Status</th>
                    <th className="py-2.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rawStudents.map((s: any, idx: number) => {
                    const record = attendanceRecords[s.id] || { status: 'UNMARKED', remarks: '' };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.fullName} src={s.photo} size="sm" className="rounded-lg" />
                            <div>
                              <p className="font-bold text-slate-800">{s.fullName}</p>
                              <p className="text-[10px] text-slate-400">{s.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                          {s.admissionNumber}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {STATUS_OPTIONS.map((opt) => {
                              const isActive = record.status === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleMarkStatus(s.id, opt.value)}
                                  className={cn(
                                    'w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center select-none',
                                    isActive ? opt.activeClass : opt.idleClass
                                  )}
                                  title={opt.label}
                                >
                                  {opt.short}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="Optional remark..."
                            value={record.remarks || ''}
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
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
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
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Class Academic Broadsheet &bull; {cls.name}
              </h2>
              <p className="text-xs text-slate-500">
                Cumulative multi-subject evaluation matrix for the current term.
              </p>
            </div>
            <Link to={`/app/results?classId=${cls.id}&tab=broadsheet`}>
              <Button variant="secondary" size="xs" icon={<ExternalLink size={13} />}>
                Open in Full Results Hub
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <ClassBroadsheet
              classId={cls.id}
              termId={term?.id}
              hideFilters={true}
            />
          </div>
        </div>
      )}

      {/* ─── TAB 4: REPORT ENDORSEMENTS ────────────────────────────────────── */}
      {activeTab === 'endorse' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">
              Class Master Report Card Endorsements
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and submit class teacher remarks, attendance days, and affective/psychomotor evaluations.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Student Scholar</th>
                    <th className="py-2.5 px-3">Admission No.</th>
                    <th className="py-2.5 px-4">Class Teacher Remarks</th>
                    <th className="py-2.5 px-3">Promotion Recommendation</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rawStudents.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.fullName} src={s.photo} size="sm" className="rounded-lg" />
                          <p className="font-bold text-slate-800">{s.fullName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-600">
                        {s.admissionNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic">
                        {s.classTeacherRemark || 'Pending endorsement'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {s.promotionStatus || 'PROMOTED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenEndorse(s)}
                          icon={<Award size={13} />}
                        >
                          Endorse
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: CLASS TIMETABLE ────────────────────────────────────────── */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">
              Weekly Class Schedule &bull; {cls.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled academic subjects, period times, and assigned subject instructors.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Day</th>
                    <th className="py-2.5 px-4">Time Interval</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Assigned Instructor</th>
                    <th className="py-2.5 px-3">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {timetableSlots.map((slot: any) => {
                    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    const dayName = days[slot.dayOfWeek - 1] || `Day ${slot.dayOfWeek}`;
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-800">{dayName}</td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-600">
                          {slot.startTime} - {slot.endTime}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {slot.subject?.name}
                          <span className="text-slate-400 font-normal ml-1">({slot.subject?.code})</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {slot.staff ? `${slot.staff.firstName} ${slot.staff.lastName}` : 'Unassigned'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{slot.room || 'Classroom'}</td>
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
        </div>
      )}

      {/* ─── MODAL 1: STUDENT 360° PROFILE ─────────────────────────────────── */}
      <Student360Modal
        open={Boolean(selectedStudent360)}
        onClose={() => setSelectedStudent360(null)}
        student={selectedStudent360}
        school={schoolBranding}
        classInfo={cls}
        sessionInfo={session}
        termInfo={term}
        onOpenAdmissionLetter={(s) => {
          setSelectedStudent360(null);
          handleOpenAdmissionLetter(s);
        }}
        onOpenEndorsement={(s) => {
          setSelectedStudent360(null);
          handleOpenEndorse(s);
        }}
      />

      {/* ─── MODAL 2: OFFICIAL ADMISSION LETTER & ENROLLMENT FORM ───────────── */}
      <StudentDocumentModal
        open={docModal.open}
        onClose={() => setDocModal({ open: false, student: null, docType: 'admission' })}
        student={docModal.student}
        school={schoolBranding}
        defaultDocType={docModal.docType}
      />

      {/* ─── MODAL 3: REPORT CARD ENDORSEMENT DIALOG ───────────────────────── */}
      {endorseStudent && (
        <Modal
          open={Boolean(endorseStudent)}
          onClose={() => setEndorseStudent(null)}
          title={`Endorse Report Card — ${endorseStudent.fullName}`}
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" size="sm" onClick={() => setEndorseStudent(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={endorseMutation.isPending}
                onClick={handleSubmitEndorse}
                icon={<Award size={15} />}
              >
                Submit Endorsement
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Class Teacher Official Remark
              </label>
              <textarea
                rows={3}
                value={endorseForm.classTeacherRemark}
                onChange={(e) => setEndorseForm({ ...endorseForm, classTeacherRemark: e.target.value })}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                placeholder="Enter formal academic and behavioral evaluation..."
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Total Days</label>
                <input
                  type="number"
                  value={endorseForm.attendanceDaysTotal}
                  onChange={(e) => setEndorseForm({ ...endorseForm, attendanceDaysTotal: Number(e.target.value) })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Days Present</label>
                <input
                  type="number"
                  value={endorseForm.attendanceDaysPresent}
                  onChange={(e) => setEndorseForm({ ...endorseForm, attendanceDaysPresent: Number(e.target.value) })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Days Absent</label>
                <input
                  type="number"
                  value={endorseForm.attendanceDaysAbsent}
                  onChange={(e) => setEndorseForm({ ...endorseForm, attendanceDaysAbsent: Number(e.target.value) })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Promotion Status</label>
                <select
                  value={endorseForm.promotionStatus}
                  onChange={(e) => setEndorseForm({ ...endorseForm, promotionStatus: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="PROMOTED">PROMOTED</option>
                  <option value="REPEATED">REPEATED</option>
                  <option value="RECOMMENDED_FOR_EXPULSION">EXPELLED</option>
                </select>
              </div>
            </div>

            {/* Affective Domain Ratings */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Affective Domain Assessment (Scale 1 to 5)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(endorseForm.affectiveRatings).map(([trait, rating]) => (
                  <div key={trait} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-600 capitalize block mb-1">
                      {trait}
                    </span>
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
                      className="w-full text-xs p-1 bg-white border border-slate-200 rounded font-bold text-slate-800"
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={3}>3 - Good</option>
                      <option value={2}>2 - Fair</option>
                      <option value={1}>1 - Poor</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Psychomotor Domain Ratings */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Psychomotor Domain Assessment (Scale 1 to 5)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {Object.entries(endorseForm.psychomotorRatings).map(([skill, rating]) => (
                  <div key={skill} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-600 capitalize block mb-1">
                      {skill}
                    </span>
                    <select
                      value={rating}
                      onChange={(e) =>
                        setEndorseForm({
                          ...endorseForm,
                          psychomotorRatings: {
                            ...endorseForm.psychomotorRatings,
                            [skill]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full text-xs p-1 bg-white border border-slate-200 rounded font-bold text-slate-800"
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={3}>3 - Good</option>
                      <option value={2}>2 - Fair</option>
                      <option value={1}>1 - Poor</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
