import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Award,
  CheckCircle,
  FileText,
  TrendingUp,
  Table,
  Layers,
  ShieldCheck,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { StatCard, Button, Modal, Select, PageLoader, Card } from '../../components/ui';
import { resultsApi, academicApi, studentsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { ScoreEntrySpreadsheet } from '../../components/results/ScoreEntrySpreadsheet';
import { ClassBroadsheet } from '../../components/results/ClassBroadsheet';
import { ApprovalPipelineTab } from '../../components/results/ApprovalPipelineTab';
import { OfficialReportSheet } from '../../components/results/OfficialReportSheet';
import { TeacherAssignmentsTab } from '../../components/results/TeacherAssignmentsTab';

const GRADE_COLORS: Record<string, string> = {
  A1: '#059669',
  B2: '#10b981',
  B3: '#3b82f6',
  C4: '#0ea5e9',
  C5: '#f59e0b',
  C6: '#f97316',
  D7: '#eab308',
  E8: '#fb923c',
  F9: '#ef4444',
  'A+': '#059669',
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.isSuperAdmin;
  const userRoles = (user?.roles || []).map((r) => r.name.toLowerCase());
  const isSchoolAdmin =
    isSuperAdmin ||
    userRoles.some((n) =>
      ['admin', 'school admin', 'principal', 'proprietor', 'director', 'head of school'].some((t) =>
        n.includes(t),
      ),
    );

  const [tab, setTab] = useState<'analytics' | 'matrix' | 'broadsheet' | 'pipeline' | 'reportcard' | 'assignments'>(
    'matrix',
  );

  // Common filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  // Endorsement Modal State
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [endorseForm, setEndorseForm] = useState<any>({
    classTeacherRemark: '',
    principalRemark: '',
    attendanceDaysTotal: 110,
    attendanceDaysPresent: 106,
    attendanceDaysAbsent: 4,
    nextTermResumption: '',
    promotionStatus: 'PROMOTED',
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

  // Queries
  const { data: classesData = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => academicApi.classes().then((r) => r.data.data || []),
  });

  const { data: subjectsData = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => academicApi.subjects().then((r) => r.data.data || []),
  });

  const { data: sessionsData = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => academicApi.sessions().then((r) => r.data.data || []),
  });
  const currentSession = sessionsData.find((s: any) => s.isCurrent) || sessionsData[0];

  const { data: termsData = [] } = useQuery({
    queryKey: ['terms', currentSession?.id],
    queryFn: () => academicApi.terms(currentSession.id).then((r) => r.data.data || []),
    enabled: !!currentSession?.id,
  });
  const currentTerm = termsData.find((t: any) => t.isCurrent) || termsData[0];

  // Auto-select defaults
  React.useEffect(() => {
    if (!selectedTerm && currentTerm?.id) setSelectedTerm(currentTerm.id);
    if (!selectedClass && classesData[0]?.id) setSelectedClass(classesData[0].id);
    if (!selectedSubject && subjectsData[0]?.id) setSelectedSubject(subjectsData[0].id);
  }, [currentTerm, classesData, subjectsData, selectedTerm, selectedClass, selectedSubject]);

  // Overall Statistics Query
  const { data: resultStats } = useQuery({
    queryKey: ['result-stats', selectedTerm || currentTerm?.id],
    queryFn: () => resultsApi.stats(selectedTerm || currentTerm?.id).then((r) => r.data.data),
    enabled: !!(selectedTerm || currentTerm?.id),
  });

  // Students in selected class (for report card student selector)
  const { data: classEnrollments = [] } = useQuery({
    queryKey: ['class-enrollments', selectedClass],
    queryFn: () =>
      resultsApi
        .matrix({ classId: selectedClass, subjectId: selectedSubject || subjectsData[0]?.id || '', termId: selectedTerm || currentTerm?.id })
        .then((r) => r.data.data?.students || []),
    enabled: !!(selectedClass && (selectedTerm || currentTerm?.id)),
  });

  // Auto-select student for report card
  React.useEffect(() => {
    if (classEnrollments.length > 0 && !selectedStudent) {
      setSelectedStudent(classEnrollments[0].studentId);
    }
  }, [classEnrollments, selectedStudent]);

  // Report Card Query
  const { data: reportCardData, isLoading: loadingReportCard, refetch: refetchReportCard } = useQuery({
    queryKey: ['report-card', selectedStudent, selectedTerm || currentTerm?.id],
    queryFn: () =>
      resultsApi
        .reportCard(selectedStudent, selectedTerm || currentTerm?.id)
        .then((r) => r.data.data),
    enabled: !!(selectedStudent && (selectedTerm || currentTerm?.id)),
  });

  // Populate Endorse Form when report card loads
  const handleOpenEndorse = () => {
    if (reportCardData) {
      setEndorseForm({
        classTeacherRemark: reportCardData.endorsements?.classTeacherRemark || '',
        principalRemark: reportCardData.endorsements?.principalRemark || '',
        attendanceDaysTotal: reportCardData.attendance?.daysOpened || 110,
        attendanceDaysPresent: reportCardData.attendance?.daysPresent || 106,
        attendanceDaysAbsent: reportCardData.attendance?.daysAbsent || 4,
        nextTermResumption: reportCardData.endorsements?.nextTermResumption || '',
        promotionStatus: reportCardData.academicSummary?.promotionStatus || 'PROMOTED',
        affectiveRatings: reportCardData.affectiveDomain || {
          punctuality: 5,
          neatness: 5,
          politeness: 5,
          honesty: 4,
          leadership: 4,
          attentiveness: 5,
          cooperation: 5,
          emotionalStability: 4,
        },
        psychomotorRatings: reportCardData.psychomotorDomain || {
          handwriting: 4,
          sports: 4,
          crafts: 4,
          publicSpeaking: 4,
          toolsHandling: 4,
        },
      });
    }
    setEndorseModalOpen(true);
  };

  // Endorse Mutation
  const endorseMutation = useMutation({
    mutationFn: (data: any) =>
      resultsApi.endorseReportCard({
        studentId: selectedStudent,
        termId: selectedTerm || currentTerm?.id,
        classId: selectedClass,
        ...data,
      }),
    onSuccess: () => {
      toast.success('Report card remarks and holistic ratings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['report-card', selectedStudent] });
      queryClient.invalidateQueries({ queryKey: ['class-broadsheet'] });
      setEndorseModalOpen(false);
      refetchReportCard();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save endorsements'),
  });

  // Quick Student Navigation in Report Card view
  const currentStudentIndex = classEnrollments.findIndex((s: any) => s.studentId === selectedStudent);
  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setSelectedStudent(classEnrollments[currentStudentIndex - 1].studentId);
    }
  };
  const handleNextStudent = () => {
    if (currentStudentIndex < classEnrollments.length - 1) {
      setSelectedStudent(classEnrollments[currentStudentIndex + 1].studentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="text-blue-600" size={28} />
            Result Management & Terminal Broadsheets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional examination grading, approval pipeline, master broadsheets, and official printable report cards.
          </p>
        </div>

        {/* Global Term Badge */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500 font-medium">Session:</span>
          <span className="font-bold text-slate-800">{currentSession?.name || '—'}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium">Term:</span>
          <span className="font-bold text-slate-800">{currentTerm?.name || '—'}</span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <button
          onClick={() => setTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'matrix' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Table size={15} />
          Score Entry Grid
        </button>

        <button
          onClick={() => setTab('broadsheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'broadsheet' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={15} />
          Class Broadsheet
        </button>

        <button
          onClick={() => setTab('reportcard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'reportcard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={15} />
          Official Report Sheet
        </button>

        {isSchoolAdmin && (
          <button
            onClick={() => setTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'pipeline' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={15} />
            Approval Pipeline
          </button>
        )}

        <button
          onClick={() => setTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'analytics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={15} />
          Analytics & Distribution
        </button>

        {isSchoolAdmin && (
          <button
            onClick={() => setTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'assignments' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck size={15} />
            Teacher Assignments
          </button>
        )}
      </div>

      {/* ─── TAB 1: SPREADSHEET MATRIX SCORE ENTRY ────────────────────────────── */}
      {tab === 'matrix' && (
        <ScoreEntrySpreadsheet
          classes={classesData}
          subjects={subjectsData}
          terms={termsData}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          selectedTerm={selectedTerm}
          onClassChange={setSelectedClass}
          onSubjectChange={setSelectedSubject}
          onTermChange={setSelectedTerm}
          isPrivileged={isSchoolAdmin}
        />
      )}

      {/* ─── TAB 2: CLASS BROADSHEET ──────────────────────────────────────────── */}
      {tab === 'broadsheet' && (
        <ClassBroadsheet
          classes={classesData}
          terms={termsData}
          selectedClass={selectedClass}
          selectedTerm={selectedTerm}
          onClassChange={setSelectedClass}
          onTermChange={setSelectedTerm}
        />
      )}

      {/* ─── TAB 3: OFFICIAL REPORT CARD ──────────────────────────────────────── */}
      {tab === 'reportcard' && (
        <div className="space-y-4">
          {/* Student Selector Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <Select
                  label="Class"
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedStudent('');
                  }}
                  options={classesData.map((c: any) => ({
                    value: c.id,
                    label: `${c.name} ${c.section ? `(${c.section})` : ''}`,
                  }))}
                />
              </div>

              <div className="w-44">
                <Select
                  label="Term"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  options={termsData.map((t: any) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
              </div>

              <div className="w-64">
                <Select
                  label="Select Student"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  options={classEnrollments.map((s: any) => ({
                    value: s.studentId,
                    label: `${s.name} (${s.admissionNumber})`,
                  }))}
                  placeholder="Select Student..."
                />
              </div>
            </div>

            {/* Prev / Next Student Pagination Buttons */}
            {classEnrollments.length > 0 && (
              <div className="flex items-center gap-1.5 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentStudentIndex <= 0}
                  onClick={handlePrevStudent}
                  icon={<ChevronLeft size={14} />}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500 font-mono px-2">
                  {currentStudentIndex + 1} / {classEnrollments.length}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentStudentIndex >= classEnrollments.length - 1}
                  onClick={handleNextStudent}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>

          {!selectedStudent ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic">
              Please select a class and student to generate their official report card.
            </div>
          ) : loadingReportCard ? (
            <PageLoader />
          ) : (
            <OfficialReportSheet
              data={reportCardData}
              canEndorse={isSchoolAdmin}
              onEndorse={handleOpenEndorse}
            />
          )}
        </div>
      )}

      {/* ─── TAB 4: APPROVAL PIPELINE ─────────────────────────────────────────── */}
      {tab === 'pipeline' && isSchoolAdmin && (
        <ApprovalPipelineTab
          terms={termsData}
          selectedTerm={selectedTerm}
          onTermChange={setSelectedTerm}
          onViewBroadsheet={(clsId) => {
            setSelectedClass(clsId);
            setTab('broadsheet');
          }}
        />
      )}

      {/* ─── TAB 5: ANALYTICS & GRADE DISTRIBUTION ────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Recorded Scores"
              value={resultStats?.total?.toLocaleString() ?? 0}
              icon={<Award size={20} />}
              color="blue"
            />
            <StatCard
              title="Overall Pass Rate"
              value={`${resultStats?.passRate ?? 0}%`}
              icon={<CheckCircle size={20} />}
              color="green"
            />
            <StatCard
              title="Average School Mark"
              value={`${resultStats?.averageScore ?? 0}%`}
              icon={<TrendingUp size={20} />}
              color="purple"
            />
            <StatCard
              title="Passed Students"
              value={resultStats?.passed?.toLocaleString() ?? 0}
              subtitle={`${resultStats?.failed ?? 0} students below 50%`}
              icon={<FileText size={20} />}
              color="orange"
            />
          </div>

          {/* Grade Distribution Rechart */}
          <Card title="Grade Distribution Analysis" subtitle="Standard letter grade frequency across all subjects">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resultStats?.gradeDistribution || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="grade" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: any) => [`${v} students`, 'Count']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(resultStats?.gradeDistribution || []).map((entry: any) => (
                      <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 6: TEACHER ASSIGNMENTS ───────────────────────────────────────── */}
      {tab === 'assignments' && isSchoolAdmin && (
        <TeacherAssignmentsTab classes={classesData} subjects={subjectsData} />
      )}

      {/* ─── ENDORSEMENT MODAL (REMARKS & HOLISTIC RATINGS) ───────────────────── */}
      {endorseModalOpen && (
        <Modal
          open={endorseModalOpen}
          onClose={() => setEndorseModalOpen(false)}
          title={`Endorse Report Card: ${reportCardData?.student?.fullName}`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEndorseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={endorseMutation.isPending}
                onClick={() => endorseMutation.mutate(endorseForm)}
              >
                Save Endorsements
              </Button>
            </>
          }
        >
          <div className="space-y-5 text-xs text-slate-800 max-h-[70vh] overflow-y-auto pr-1">
            {/* Remarks Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b pb-1">
                Formal Remarks & Decision
              </h4>

              <div>
                <label className="label">Class Master&apos;s Remark</label>
                <textarea
                  rows={2}
                  className="input text-xs w-full p-2"
                  value={endorseForm.classTeacherRemark}
                  onChange={(e) =>
                    setEndorseForm({ ...endorseForm, classTeacherRemark: e.target.value })
                  }
                  placeholder="e.g. Excellent conduct and focused academic diligence."
                />
              </div>

              {isSchoolAdmin && (
                <div>
                  <label className="label">Principal / Head of School&apos;s Remark</label>
                  <textarea
                    rows={2}
                    className="input text-xs w-full p-2"
                    value={endorseForm.principalRemark}
                    onChange={(e) =>
                      setEndorseForm({ ...endorseForm, principalRemark: e.target.value })
                    }
                    placeholder="e.g. Approved. Promoted to SS2 on merit of outstanding cumulative performance."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Promotion / Academic Status"
                  value={endorseForm.promotionStatus}
                  onChange={(e) =>
                    setEndorseForm({ ...endorseForm, promotionStatus: e.target.value })
                  }
                  options={[
                    { value: 'PROMOTED', label: 'Promoted to Next Class' },
                    { value: 'PROMOTED_ON_TRIAL', label: 'Promoted on Trial' },
                    { value: 'REPEAT', label: 'To Repeat Class' },
                    { value: 'PENDING', label: 'Pending Terminal Review' },
                  ]}
                />

                <div>
                  <label className="label">Next Term Resumption Date</label>
                  <input
                    type="date"
                    className="input text-xs w-full p-2"
                    value={
                      endorseForm.nextTermResumption
                        ? new Date(endorseForm.nextTermResumption).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setEndorseForm({ ...endorseForm, nextTermResumption: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Attendance Days */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b pb-1">
                Attendance Record
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Days Opened</label>
                  <input
                    type="number"
                    className="input text-xs w-full p-2"
                    value={endorseForm.attendanceDaysTotal}
                    onChange={(e) =>
                      setEndorseForm({
                        ...endorseForm,
                        attendanceDaysTotal: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Days Present</label>
                  <input
                    type="number"
                    className="input text-xs w-full p-2"
                    value={endorseForm.attendanceDaysPresent}
                    onChange={(e) =>
                      setEndorseForm({
                        ...endorseForm,
                        attendanceDaysPresent: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Days Absent</label>
                  <input
                    type="number"
                    className="input text-xs w-full p-2"
                    value={endorseForm.attendanceDaysAbsent}
                    onChange={(e) =>
                      setEndorseForm({
                        ...endorseForm,
                        attendanceDaysAbsent: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Affective Domain Ratings */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b pb-1 flex justify-between items-center">
                <span>Affective Domain Ratings</span>
                <span className="text-[10px] text-slate-500 font-normal">Scale: 1 to 5</span>
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { key: 'punctuality', label: 'Punctuality' },
                  { key: 'neatness', label: 'Neatness & Bearing' },
                  { key: 'politeness', label: 'Politeness & Courtesy' },
                  { key: 'honesty', label: 'Honesty & Integrity' },
                  { key: 'leadership', label: 'Leadership' },
                  { key: 'attentiveness', label: 'Attentiveness' },
                  { key: 'cooperation', label: 'Cooperation' },
                  { key: 'emotionalStability', label: 'Emotional Stability' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-slate-600">{label}:</span>
                    <select
                      className="input py-1 px-2 text-xs w-16"
                      value={endorseForm.affectiveRatings?.[key] ?? 5}
                      onChange={(e) =>
                        setEndorseForm({
                          ...endorseForm,
                          affectiveRatings: {
                            ...endorseForm.affectiveRatings,
                            [key]: parseInt(e.target.value),
                          },
                        })
                      }
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Psychomotor Domain Ratings */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b pb-1 flex justify-between items-center">
                <span>Psychomotor Domain Ratings</span>
                <span className="text-[10px] text-slate-500 font-normal">Scale: 1 to 5</span>
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { key: 'handwriting', label: 'Handwriting' },
                  { key: 'sports', label: 'Sports & Games' },
                  { key: 'crafts', label: 'Crafts & Arts' },
                  { key: 'publicSpeaking', label: 'Speaking / Fluency' },
                  { key: 'toolsHandling', label: 'Handling Tools' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-slate-600">{label}:</span>
                    <select
                      className="input py-1 px-2 text-xs w-16"
                      value={endorseForm.psychomotorRatings?.[key] ?? 4}
                      onChange={(e) =>
                        setEndorseForm({
                          ...endorseForm,
                          psychomotorRatings: {
                            ...endorseForm.psychomotorRatings,
                            [key]: parseInt(e.target.value),
                          },
                        })
                      }
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
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
