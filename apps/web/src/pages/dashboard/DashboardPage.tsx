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
  const classes = teaching.classes || [];
  const todayLessons = teaching.todayLessons || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* School / Teacher Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {roles.isClassMaster && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Class Master &bull; {classMaster?.className} {classMaster?.section ? `(${classMaster.section})` : ''}
                </span>
              )}
              {roles.isSubjectTeacher && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Subject Teacher &bull; {teaching.assignmentsCount || classes.length} Teaching Assignment{classes.length === 1 ? '' : 's'}
                </span>
              )}
              <span className="text-xs text-slate-400 ml-1">
                {academicState.sessionName} &bull; {academicState.termName}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Good {getGreeting()}, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Welcome to your faculty dashboard at {user?.school?.name || 'EduNest School Portal'}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {roles.isClassMaster && (
              <Link to="/app/my-class">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<School size={16} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  My Class Hub
                </Button>
              </Link>
            )}
            {roles.isSubjectTeacher && (
              <Link to="/app/teaching">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Calendar size={16} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  My Schedule
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.isClassMaster && classMaster && (
          <>
            <StatCard
              title="Class Enrolled"
              value={(classMaster.enrolledCount || 0).toLocaleString()}
              subtitle={`${classMaster.className} ${classMaster.section ? `(${classMaster.section})` : ''}`}
              icon={<GraduationCap size={22} />}
              color="blue"
            />
            <StatCard
              title="Today's Attendance"
              value={`${classMaster.todayAttendance?.attendanceRate || 0}%`}
              subtitle={`${classMaster.todayAttendance?.present || 0} Present / ${classMaster.todayAttendance?.absent || 0} Absent`}
              icon={<ClipboardCheck size={22} />}
              color="green"
            />
          </>
        )}

        {roles.isSubjectTeacher && (
          <>
            <StatCard
              title="Assigned Classes"
              value={classes.length.toString()}
              subtitle="Active teaching classes"
              icon={<BookOpen size={22} />}
              color="purple"
            />
            <StatCard
              title="Today's Lessons"
              value={todayLessons.length.toString()}
              subtitle="Scheduled periods today"
              icon={<Clock size={22} />}
              color="indigo"
            />
          </>
        )}
      </div>

      {/* ─── SECTION 1: CLASS MASTER HUB (If assigned) ────────────────────── */}
      {roles.isClassMaster && classMaster && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <School size={18} />
                </span>
                <h2 className="text-lg font-bold text-slate-800">
                  Class Master Workspace &bull; {classMaster.className} {classMaster.section ? `(${classMaster.section})` : ''}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Oversee daily attendance, holistic report card endorsements, broadsheet, and student records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/app/my-class">
                <Button variant="primary" size="sm" icon={<ClipboardCheck size={16} />}>
                  Take Today's Attendance
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Attendance Progress Snapshot */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Today's Attendance Status
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {classMaster.todayAttendance?.attendanceRate || 0}% Present
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
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
                  <p className="text-slate-500 text-[11px]">Present</p>
                </div>
                <div>
                  <p className="font-bold text-amber-700">{classMaster.todayAttendance?.late || 0}</p>
                  <p className="text-slate-500 text-[11px]">Late</p>
                </div>
                <div>
                  <p className="font-bold text-rose-700">{classMaster.todayAttendance?.absent || 0}</p>
                  <p className="text-slate-500 text-[11px]">Absent</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600">{classMaster.todayAttendance?.unmarked || 0}</p>
                  <p className="text-slate-500 text-[11px]">Unmarked</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/app/my-class"
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Class Roster</p>
                    <p className="text-xs text-slate-500">{classMaster.enrolledCount} enrolled students</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/app/results"
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Class Broadsheet</p>
                    <p className="text-xs text-slate-500">Monitor all subjects</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/app/my-class"
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Report Card Endorsement</p>
                    <p className="text-xs text-slate-500">Remarks & behavioral ratings</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {classMaster.allowCashCollection ? (
                <Link
                  to="/app/finance/class-master"
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Class Cash Collection</p>
                      <p className="text-xs text-slate-500">Authorized by school policy</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Cash Collection Disabled</p>
                    <p className="text-[11px] text-slate-400">Strictly handled by School Accountant</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: SUBJECT TEACHER HUB ───────────────────────────────── */}
      {roles.isSubjectTeacher && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Teaching Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                Today's Teaching Schedule
              </h3>
              <span className="text-xs text-slate-500 font-semibold">{todayLessons.length} lessons</span>
            </div>

            <div className="space-y-3">
              {todayLessons.map((lesson: any, i: number) => (
                <div
                  key={lesson.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        {lesson.startTime} - {lesson.endTime}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 bg-slate-200/60 px-1.5 py-0.2 rounded">
                        {lesson.className}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{lesson.subjectName}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={12} /> {lesson.room}
                    </p>
                  </div>
                  <Link
                    to="/app/teaching"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View
                  </Link>
                </div>
              ))}

              {todayLessons.length === 0 && (
                <div className="py-8 text-center text-slate-400 italic text-sm">
                  No classes scheduled for you today.
                </div>
              )}
            </div>

            <Link to="/app/teaching" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full justify-center">
                View Full Weekly Timetable
              </Button>
            </Link>
          </div>

          {/* Assigned Classes & Gradebook Matrix */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-600" />
                Assigned Classes & Gradebook Matrix
              </h3>
              <Link to="/app/results" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                Open Gradebook Hub &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Scholars</th>
                    <th className="py-2.5 px-3">Score Entry Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {classes.map((c: any) => (
                    <tr key={c.assignmentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {c.subjectName}
                        <span className="ml-1 text-xs text-slate-400 font-normal">({c.subjectCode})</span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {c.className} {c.section ? `(${c.section})` : ''}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs font-mono font-bold">
                        {c.studentCount}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-semibold',
                            c.resultStatus === 'PUBLISHED' && 'bg-emerald-100 text-emerald-800',
                            c.resultStatus === 'APPROVED' && 'bg-blue-100 text-blue-800',
                            c.resultStatus === 'SUBMITTED' && 'bg-amber-100 text-amber-800',
                            c.resultStatus === 'DRAFT' && 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {c.resultStatus || 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/app/results?classId=${c.classId}&subjectId=${c.subjectId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Enter Scores
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {classes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No subject assignments found for your account.
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
