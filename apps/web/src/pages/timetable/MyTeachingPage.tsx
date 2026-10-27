import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar, BookOpen, Clock, Users, Award, ChevronRight,
  School, CheckCircle2, AlertCircle, FileSpreadsheet, Eye,
  MapPin, Filter, ArrowUpRight,
} from 'lucide-react';
import { Button, Badge, Card, PageLoader } from '../../components/ui';
import { teacherApi } from '../../services/api';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

type TeachingTab = 'classes' | 'schedule';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function MyTeachingPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TeachingTab>('classes');
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const jsDay = new Date().getDay();
    const dayIndex = jsDay === 0 ? 0 : Math.min(jsDay - 1, 4);
    return DAYS[dayIndex];
  });

  const { data: dashboardData, isLoading: loadingDash } = useQuery({
    queryKey: ['teacher-dashboard-summary'],
    queryFn: () => teacherApi.getDashboard().then((r) => r.data?.data || r.data),
  });

  const { data: scheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ['teacher-my-schedule'],
    queryFn: () => teacherApi.getMySchedule().then((r) => r.data?.data || r.data),
  });

  const isLoading = loadingDash || loadingSchedule;
  if (isLoading) return <PageLoader />;

  const teaching = dashboardData?.teaching || {};
  const classes: any[] = teaching.classes || [];
  const weeklySchedule: any = scheduleData?.weekly || {};
  const academicState = dashboardData?.academicState || {};
  const daySlots = weeklySchedule[selectedDay] || [];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Enterprise Header */}
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <span>Subject Teacher Operations</span>
              <span>&bull;</span>
              <span>{academicState.sessionName || '2026/2027'}</span>
              <span>&bull;</span>
              <span className="text-blue-400">{academicState.termName || 'Current Term'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Faculty Schedule & Gradebook
              </h1>
              <span className="text-xs text-slate-400 font-medium">
                Instructor: <strong className="text-white">{user?.firstName} {user?.lastName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/results">
              <Button
                variant="secondary"
                size="sm"
                icon={<Award size={15} />}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              >
                Gradebook & Results
              </Button>
            </Link>
          </div>
        </div>

        {/* High-density Data KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Teaching Assignments
            </span>
            <p className="text-lg font-bold text-white">{classes.length}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Weekly Lessons
            </span>
            <p className="text-lg font-bold text-blue-400">{scheduleData?.totalWeeklySlots || 0}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Today's Periods
            </span>
            <p className="text-lg font-bold text-emerald-400">{teaching.todayLessons?.length || 0}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Enrolled Scholars
            </span>
            <p className="text-lg font-bold text-white">
              {classes.reduce((sum: number, c: any) => sum + (c.studentCount || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('classes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <BookOpen size={15} />
          Assigned Classes & Gradebook ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === 'schedule'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Calendar size={15} />
          Weekly Schedule Grid
        </button>
      </div>

      {/* ─── TAB 1: ASSIGNED CLASSES & GRADEBOOK ────────────────────────────── */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-3">Enrolled Scholars</th>
                    <th className="py-2.5 px-4">Score Entry Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {classes.map((c: any) => (
                    <tr key={c.assignmentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {c.subjectName}
                        <span className="ml-1 text-[11px] text-slate-400 font-normal">
                          ({c.subjectCode})
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {c.className} {c.section ? `(${c.section})` : ''}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-700">
                        {c.studentCount}
                      </td>

                      <td className="py-3 px-4">
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

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/app/results?classId=${c.classId}&tab=broadsheet`}
                            className="text-slate-600 hover:text-slate-900 font-semibold text-xs"
                          >
                            Broadsheet
                          </Link>
                          <Link
                            to={`/app/results?classId=${c.classId}&subjectId=${c.subjectId}`}
                          >
                            <Button
                              variant="primary"
                              size="xs"
                              icon={<ArrowUpRight size={13} />}
                            >
                              Enter Scores
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {classes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                        No subject assignments found for your account in the current term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: WEEKLY SCHEDULE ────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200">
            {DAYS.map((day) => {
              const count = (weeklySchedule[day] || []).length;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {day}
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Day Schedule Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-40">Period Time</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-3">Assigned Room</th>
                    <th className="py-2.5 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {daySlots.map((slot: any) => (
                    <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {slot.subject?.name}
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({slot.subject?.code})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {slot.class?.name} {slot.class?.section ? `(${slot.class.section})` : ''}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {slot.room || 'Classroom'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/app/results?classId=${slot.class?.id}&subjectId=${slot.subject?.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          Scores &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {daySlots.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                        No teaching periods scheduled on {selectedDay}.
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
