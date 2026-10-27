import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar, BookOpen, Clock, Users, Award, ChevronRight,
  School, CheckCircle2, AlertCircle, FileSpreadsheet, Eye,
  Layers, MapPin, Sparkles, Filter,
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
  const classes = teaching.classes || [];
  const weeklySchedule = scheduleData?.weekly || {};
  const academicState = dashboardData?.academicState || {};

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* School / Subject Teacher Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
                Subject Teacher Portal
              </span>
              <span className="text-xs text-slate-400">
                {academicState.sessionName} &bull; {academicState.termName}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Teaching Assignments & Schedule
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Instructor: <span className="font-semibold text-white">{user?.firstName} {user?.lastName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/app/results">
              <Button
                variant="secondary"
                size="sm"
                icon={<Award size={16} />}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Score Entry Matrix
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div>
            <p className="text-xs text-slate-400">Assigned Classes</p>
            <p className="text-xl font-bold text-white">{classes.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Weekly Lessons</p>
            <p className="text-xl font-bold text-indigo-400">{scheduleData?.totalWeeklySlots || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Today's Periods</p>
            <p className="text-xl font-bold text-emerald-400">{teaching.todayLessons?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Enrolled Scholars</p>
            <p className="text-xl font-bold text-white">
              {classes.reduce((sum: number, c: any) => sum + (c.studentCount || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('classes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'classes'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <BookOpen size={16} />
          My Assigned Classes & Gradebook ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all',
            activeTab === 'schedule'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Calendar size={16} />
          Weekly Teaching Timetable ({scheduleData?.totalWeeklySlots || 0} periods)
        </button>
      </div>

      {/* ─── TAB 1: CLASSES & GRADEBOOK ────────────────────────────────────── */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls: any) => {
              const statusColor =
                cls.resultStatus === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : cls.resultStatus === 'APPROVED'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : cls.resultStatus === 'SUBMITTED'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div
                  key={cls.assignmentId}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {cls.subjectCode || 'SUBJ'}
                      </span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold border', statusColor)}>
                        {cls.resultStatus || 'DRAFT'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800">
                      {cls.subjectName}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <School size={16} className="text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {cls.className} {cls.section ? `(${cls.section})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Enrolled Students:</span>
                      <span className="font-bold text-slate-800">{cls.studentCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Entered Scores:</span>
                      <span className="font-bold text-slate-800">{cls.recordedCount} / {cls.studentCount}</span>
                    </div>

                    <Link
                      to={`/app/results?classId=${cls.classId}&subjectId=${cls.subjectId}`}
                      className="block"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-center bg-indigo-600 hover:bg-indigo-700"
                        icon={<FileSpreadsheet size={15} />}
                      >
                        Open Gradebook Matrix
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}

            {classes.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic">
                No teaching assignments found. Please contact your school administrator to allocate subjects and classes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: WEEKLY TIMETABLE ───────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {DAYS.map((day) => {
              const daySlots = weeklySchedule[day] || [];
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border',
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <span>{day}</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.2 rounded-full font-mono',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {daySlots.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Schedule Table for Selected Day */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                {selectedDay} Schedule
              </h3>
              <span className="text-xs text-slate-500">
                {(weeklySchedule[selectedDay] || []).length} lessons scheduled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Period Time</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(weeklySchedule[selectedDay] || []).map((slot: any) => (
                    <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-700">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {slot.subject?.name}
                        <span className="ml-1.5 text-xs text-slate-400 font-normal">
                          ({slot.subject?.code})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {slot.class?.name} {slot.class?.section ? `(${slot.class?.section})` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 flex items-center gap-1 pt-4">
                        <MapPin size={13} className="text-slate-400" />
                        {slot.room || 'General Classroom'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/app/results?classId=${slot.classId}&subjectId=${slot.subjectId}`}
                          className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium gap-1"
                        >
                          Gradebook <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {(weeklySchedule[selectedDay] || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                        No lessons scheduled on {selectedDay}. Enjoy your prep period!
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
