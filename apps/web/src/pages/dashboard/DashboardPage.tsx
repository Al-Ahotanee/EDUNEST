import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  GraduationCap, DollarSign, Users, ClipboardCheck,
  TrendingUp, AlertCircle, BookOpen, Award, School,
  Calendar, Clock, CheckCircle2, ChevronRight, FileSpreadsheet,
  MapPin, ShieldCheck,
} from 'lucide-react';
import { StatCard, Card, PageLoader, Badge, Button } from '../../components/ui';
import { studentsApi, financeApi, teacherApi } from '../../services/api';
import { formatCurrency, formatDate, getStatusBadge, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const userRoles = (user?.roles || []).map((r) => (r.name || '').toLowerCase());
  const isPrivileged =
    isSuperAdmin ||
    userRoles.some((n) =>
      ['admin', 'school admin', 'principal', 'proprietor', 'director', 'head of school'].some((t) =>
        n.includes(t)
      )
    );
  const isAccountant = userRoles.some((n) => n === 'accountant') && !isPrivileged;
  const isTeacher = userRoles.some((n) => n === 'teacher') && !isPrivileged && !isAccountant;

  // ─── TEACHER VIEW ──────────────────────────────────────────────────────────
  if (isTeacher) {
    return <TeacherDashboardView user={user} />;
  }

  // ─── ADMINISTRATIVE VIEW (Super Admin, Principal, School Admin) ────────────
  return <AdminDashboardView user={user} />;
}

// ─── TEACHER DASHBOARD VIEW COMPONENT ─────────────────────────────────────────
function TeacherDashboardView({ user }: { user: any }) {
  const { data: dashData, isLoading } = useQuery({
    queryKey: ['teacher-dashboard-summary'],
    queryFn: () => teacherApi.getDashboard().then((r) => r.data?.data || r.data),
  });

  if (isLoading) return <PageLoader />;

  const classMaster = dashData?.classMaster;
  const teaching = dashData?.teaching || {};
  const roles = dashData?.roles || {};
  const academicState = dashData?.academicState || {};
  const classes = Array.isArray(teaching.classes) ? teaching.classes : [];
  const todayLessons = Array.isArray(teaching.todayLessons) ? teaching.todayLessons : [];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Enterprise Faculty Header */}
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <span>Faculty Portal</span>
              <span>&bull;</span>
              <span>{academicState.sessionName || '2026/2027'}</span>
              <span>&bull;</span>
              <span className="text-blue-400">{academicState.termName || 'Current Term'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">
                {user?.firstName} {user?.lastName}
              </h1>
              {roles.isClassMaster && classMaster && (
                <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded">
                  Class Master &bull; {classMaster.className} {classMaster.section ? `(${classMaster.section})` : ''}
                </span>
              )}
              {roles.isSubjectTeacher && (
                <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded">
                  Subject Teacher &bull; {classes.length} Class{classes.length === 1 ? '' : 'es'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {roles.isClassMaster && (
              <Link to="/app/my-class">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<School size={15} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  My Class
                </Button>
              </Link>
            )}
            {roles.isSubjectTeacher && (
              <Link to="/app/teaching">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Calendar size={15} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  My Schedule
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* High-density Data KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          {roles.isClassMaster && classMaster && (
            <>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Enrolled in {classMaster.className}
                </span>
                <p className="text-lg font-bold text-white">
                  {(classMaster.enrolledCount || 0).toLocaleString()} scholars
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Attendance Today
                </span>
                <p className="text-lg font-bold text-emerald-400">
                  {classMaster.todayAttendance?.attendanceRate || 0}%{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({classMaster.todayAttendance?.present || 0} present)
                  </span>
                </p>
              </div>
            </>
          )}

          {roles.isSubjectTeacher && (
            <>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Teaching Classes
                </span>
                <p className="text-lg font-bold text-white">{classes.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Today's Periods
                </span>
                <p className="text-lg font-bold text-blue-400">{todayLessons.length} lessons</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── SECTION 1: CLASS MASTER WORKSPACE (If assigned) ────────────────── */}
      {roles.isClassMaster && classMaster && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <School size={16} className="text-blue-600" />
                Class Master Workspace &bull; {classMaster.className} {classMaster.section ? `(${classMaster.section})` : ''}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage student records, holistic report card endorsements, and daily attendance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/app/my-class">
                <Button variant="primary" size="xs" icon={<ClipboardCheck size={14} />}>
                  Take Today's Attendance
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Attendance Progress Snapshot */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Today's Attendance Rate
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {classMaster.todayAttendance?.attendanceRate || 0}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${classMaster.enrolledCount ? (classMaster.todayAttendance.present / classMaster.enrolledCount) * 100 : 0}%` }}
                  className="bg-emerald-500 h-full"
                  title="Present"
                />
                <div
                  style={{ width: `${classMaster.enrolledCount ? (classMaster.todayAttendance.late / classMaster.enrolledCount) * 100 : 0}%` }}
                  className="bg-amber-500 h-full"
                  title="Late"
                />
                <div
                  style={{ width: `${classMaster.enrolledCount ? (classMaster.todayAttendance.absent / classMaster.enrolledCount) * 100 : 0}%` }}
                  className="bg-rose-500 h-full"
                  title="Absent"
                />
              </div>

              <div className="grid grid-cols-4 text-center text-xs pt-1">
                <div>
                  <p className="font-bold text-emerald-700">{classMaster.todayAttendance?.present || 0}</p>
                  <p className="text-slate-500 text-[10px]">Present</p>
                </div>
                <div>
                  <p className="font-bold text-amber-700">{classMaster.todayAttendance?.late || 0}</p>
                  <p className="text-slate-500 text-[10px]">Late</p>
                </div>
                <div>
                  <p className="font-bold text-rose-700">{classMaster.todayAttendance?.absent || 0}</p>
                  <p className="text-slate-500 text-[10px]">Absent</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600">{classMaster.todayAttendance?.unmarked || 0}</p>
                  <p className="text-slate-500 text-[10px]">Unmarked</p>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/app/my-class"
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Users size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Student Roster</span>
                </div>
                <p className="text-[11px] text-slate-500">{classMaster.enrolledCount} enrolled scholars</p>
              </Link>

              <Link
                to="/app/my-class"
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileSpreadsheet size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Class Broadsheet</span>
                </div>
                <p className="text-[11px] text-slate-500">Cumulative grades matrix</p>
              </Link>

              <Link
                to="/app/my-class"
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Award size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Endorsements</span>
                </div>
                <p className="text-[11px] text-slate-500">Report card evaluation</p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: SUBJECT TEACHER WORKSPACE ───────────────────────────── */}
      {roles.isSubjectTeacher && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Today's Teaching Schedule */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock size={15} className="text-blue-600" />
                Today's Schedule
              </h3>
              <span className="text-xs text-slate-500 font-semibold">{todayLessons.length} lessons</span>
            </div>

            <div className="space-y-2">
              {todayLessons.map((lesson: any) => (
                <div
                  key={lesson.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {lesson.startTime} - {lesson.endTime}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-200/80 px-1.5 py-0.2 rounded">
                        {lesson.className}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{lesson.subjectName}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin size={11} /> {lesson.room || 'Classroom'}
                    </p>
                  </div>
                  <Link
                    to="/app/teaching"
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </div>
              ))}

              {todayLessons.length === 0 && (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  No teaching periods scheduled for you today.
                </div>
              )}
            </div>

            <Link to="/app/teaching" className="block pt-1">
              <Button variant="secondary" size="xs" className="w-full justify-center">
                View Weekly Timetable
              </Button>
            </Link>
          </div>

          {/* Assigned Classes & Gradebook Matrix */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={15} className="text-blue-600" />
                Assigned Classes & Gradebook
              </h3>
              <Link to="/app/results" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
                Open Gradebook Hub &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3">Class</th>
                    <th className="py-2 px-3">Scholars</th>
                    <th className="py-2 px-3">Score Entry Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {classes.map((c: any) => (
                    <tr key={c.assignmentId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {c.subjectName}
                        <span className="ml-1 text-[11px] text-slate-400 font-normal">({c.subjectCode})</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {c.className} {c.section ? `(${c.section})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono font-bold">
                        {c.studentCount}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            c.resultStatus === 'PUBLISHED' && 'bg-emerald-100 text-emerald-800',
                            c.resultStatus === 'APPROVED' && 'bg-blue-100 text-blue-800',
                            c.resultStatus === 'SUBMITTED' && 'bg-amber-100 text-amber-800',
                            c.resultStatus === 'DRAFT' && 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {c.resultStatus || 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={`/app/results?classId=${c.classId}&subjectId=${c.subjectId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                        >
                          Enter Scores
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {classes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic text-xs">
                        No subject assignments found for your account in the active term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMINISTRATIVE DASHBOARD VIEW (Unchanged for Admins) ────────────────────
function AdminDashboardView({ user }: { user: any }) {
  const { data: studentStats, isLoading: loadingStudents } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => studentsApi.stats().then((r) => r.data.data),
  });

  const { data: financeStats, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeApi.dashboard().then((r) => r.data.data),
  });

  const { data: monthlyTrend } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => financeApi.monthlyTrend().then((r) => r.data.data),
  });

  const isLoading = loadingStudents || loadingFinance;
  if (isLoading) return <PageLoader />;

  const genderData = [
    { name: 'Male', value: studentStats?.male || 0 },
    { name: 'Female', value: studentStats?.female || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">
          Good {getGreeting()}, {user?.firstName}
        </h1>
        <p className="page-subtitle">
          Here's what's happening at {user?.school?.name || 'your school'} today
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={(studentStats?.total || 0).toLocaleString()}
          subtitle={`${studentStats?.active || 0} active`}
          icon={<GraduationCap size={22} />}
          color="blue"
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(Math.max(0, financeStats?.totalCollected || 0))}
          subtitle={`${Math.min(100, Math.max(0, financeStats?.collectionRate || 0))}% collection rate`}
          icon={<DollarSign size={22} />}
          color="green"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(Math.max(0, financeStats?.totalBalance || 0))}
          subtitle={`${financeStats?.unpaidCount || 0} unpaid invoices`}
          icon={<AlertCircle size={22} />}
          color="red"
        />
        <StatCard
          title="Monthly Collection"
          value={formatCurrency(Math.max(0, financeStats?.monthlyCollected || 0))}
          subtitle="This month"
          icon={<TrendingUp size={22} />}
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Monthly Revenue Collection</h2>
              <p className="text-xs text-slate-400 mt-0.5">Payment trend for the current academic year</p>
            </div>
            <span className="badge badge-blue">This Year</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend || []}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₦${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" name="Collected" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">Gender Distribution</h2>
            <p className="text-xs text-slate-400 mt-0.5">Enrolled student demographics</p>
          </div>
          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-center">
            <div>
              <p className="text-xs text-slate-400">Male Students</p>
              <p className="text-lg font-bold text-blue-600">{studentStats?.male || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Female Students</p>
              <p className="text-lg font-bold text-emerald-600">{studentStats?.female || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
