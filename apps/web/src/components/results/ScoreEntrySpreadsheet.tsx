import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Send, Lock, AlertTriangle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { Button, Select, PageLoader } from '../ui';
import { resultsApi } from '../../services/api';

interface ScoreEntrySpreadsheetProps {
  classes: any[];
  subjects: any[];
  terms: any[];
  selectedClass: string;
  selectedSubject: string;
  selectedTerm: string;
  onClassChange: (id: string) => void;
  onSubjectChange: (id: string) => void;
  onTermChange: (id: string) => void;
  isPrivileged?: boolean;
}

export const ScoreEntrySpreadsheet: React.FC<ScoreEntrySpreadsheetProps> = ({
  classes,
  subjects,
  terms,
  selectedClass,
  selectedSubject,
  selectedTerm,
  onClassChange,
  onSubjectChange,
  onTermChange,
  isPrivileged = false,
}) => {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch matrix data
  const { data: matrixResponse, isLoading, refetch } = useQuery({
    queryKey: ['score-matrix', selectedClass, selectedSubject, selectedTerm],
    queryFn: () =>
      resultsApi
        .matrix({ classId: selectedClass, subjectId: selectedSubject, termId: selectedTerm })
        .then((r) => r.data.data),
    enabled: !!(selectedClass && selectedSubject && selectedTerm),
  });

  // Sync state when matrixResponse updates
  useEffect(() => {
    if (matrixResponse?.students) {
      setScores(matrixResponse.students);
    } else {
      setScores([]);
    }
  }, [matrixResponse]);

  // Live score change handler
  const handleScoreChange = (
    studentId: string,
    field: 'ca1Score' | 'ca2Score' | 'ca3Score' | 'examScore',
    value: string,
  ) => {
    const num = Math.max(0, parseFloat(value) || 0);

    setScores((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;

        const updated = { ...row, [field]: num };
        const ca1 = field === 'ca1Score' ? num : updated.ca1Score || 0;
        const ca2 = field === 'ca2Score' ? num : updated.ca2Score || 0;
        const ca3 = field === 'ca3Score' ? num : updated.ca3Score || 0;
        const exam = field === 'examScore' ? num : updated.examScore || 0;
        const total = Math.min(100, ca1 + ca2 + ca3 + exam);

        // Instant client-side grade resolution
        let grade = 'F9';
        let remark = 'Fail';
        if (total >= 75) {
          grade = 'A1';
          remark = 'Excellent';
        } else if (total >= 70) {
          grade = 'B2';
          remark = 'Very Good';
        } else if (total >= 65) {
          grade = 'B3';
          remark = 'Good';
        } else if (total >= 60) {
          grade = 'C4';
          remark = 'Credit';
        } else if (total >= 55) {
          grade = 'C5';
          remark = 'Credit';
        } else if (total >= 50) {
          grade = 'C6';
          remark = 'Credit';
        } else if (total >= 45) {
          grade = 'D7';
          remark = 'Pass';
        } else if (total >= 40) {
          grade = 'E8';
          remark = 'Pass';
        }

        return {
          ...updated,
          totalScore: Math.round(total * 10) / 10,
          grade,
          remark,
        };
      }),
    );
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (submitForApproval: boolean) => {
      const payload = {
        classId: selectedClass,
        subjectId: selectedSubject,
        termId: selectedTerm,
        submitForApproval,
        scores: scores.map((s) => ({
          studentId: s.studentId,
          ca1Score: s.ca1Score,
          ca2Score: s.ca2Score,
          ca3Score: s.ca3Score,
          examScore: s.examScore,
        })),
      };
      return resultsApi.saveMatrix(payload);
    },
    onSuccess: (res, submitForApproval) => {
      toast.success(
        submitForApproval
          ? 'Scores successfully submitted to Principal for approval!'
          : 'Scores saved to draft.',
      );
      queryClient.invalidateQueries({ queryKey: ['score-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['broadsheet'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      refetch();
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to save scores');
    },
  });

  const matrixStatus = matrixResponse?.matrixStatus || 'DRAFT';
  const isLocked = matrixResponse?.isLocked || matrixStatus === 'PUBLISHED';
  const isSubmitted = matrixStatus === 'SUBMITTED';

  const filteredScores = scores.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalStudents = scores.length;
  const scoredCount = scores.filter((s) => (s.totalScore || 0) > 0).length;
  const avgScore =
    scoredCount > 0
      ? Math.round(
          (scores.reduce((sum, s) => sum + (s.totalScore || 0), 0) / scoredCount) * 10,
        ) / 10
      : 0;

  return (
    <div className="space-y-4">
      {/* Selector Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Class & Arm"
          value={selectedClass}
          onChange={(e) => onClassChange(e.target.value)}
          options={classes.map((c) => ({
            value: c.id,
            label: `${c.name} ${c.section ? `(${c.section})` : ''}`,
          }))}
          placeholder="Select Class..."
        />

        <Select
          label="Subject"
          value={selectedSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          options={subjects.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
          }))}
          placeholder="Select Subject..."
        />

        <Select
          label="Academic Term"
          value={selectedTerm}
          onChange={(e) => onTermChange(e.target.value)}
          options={terms.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.session?.name || ''})`,
          }))}
          placeholder="Select Term..."
        />
      </div>

      {/* Main Content Area */}
      {!selectedClass || !selectedSubject || !selectedTerm ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">Please select a Class, Subject, and Term</p>
          <p className="text-xs text-slate-400 mt-1">The spreadsheet score entry matrix will load automatically.</p>
        </div>
      ) : isLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {/* Status & Action Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                  isLocked
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isSubmitted
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock size={13} />
                    Published & Locked
                  </>
                ) : isSubmitted ? (
                  <>
                    <AlertTriangle size={13} />
                    Submitted for Approval
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} />
                    Draft (Editable)
                  </>
                )}
              </span>

              <span className="text-xs text-slate-500 font-medium">
                Entered: <strong className="text-slate-800">{scoredCount}</strong> / {totalStudents} • Class Avg:{' '}
                <strong className="text-slate-800">{avgScore}%</strong>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input py-1.5 pl-8 pr-3 text-xs w-44 rounded-lg"
                />
              </div>

              {!isLocked && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Save size={14} />}
                    loading={saveMutation.isPending && !saveMutation.variables}
                    onClick={() => saveMutation.mutate(false)}
                  >
                    Save Draft
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send size={14} />}
                    loading={saveMutation.isPending && !!saveMutation.variables}
                    onClick={() => {
                      if (window.confirm('Submit scores to the Principal for formal approval? Once submitted, editing will be paused during review.')) {
                        saveMutation.mutate(true);
                      }
                    }}
                  >
                    Submit for Approval
                  </Button>
                </>
              )}

              {isLocked && (
                <span className="text-xs text-slate-400 italic">
                  Scores published. Changes require administrative unlock.
                </span>
              )}
            </div>
          </div>

          {/* Locked Alert Warning */}
          {isLocked && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
              <Lock size={16} className="text-amber-700 flex-shrink-0" />
              <span>
                <strong>Notice:</strong> This subject&apos;s results have been published by the Principal and are locked
                against modifications to ensure official transcript integrity.
              </span>
            </div>
          )}

          {/* Spreadsheet Table Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 w-28">Admission No.</th>
                    <th className="py-2.5 px-2 text-center w-20">CA 1 (20)</th>
                    <th className="py-2.5 px-2 text-center w-20">CA 2 (20)</th>
                    <th className="py-2.5 px-2 text-center w-20">CA 3 (20)</th>
                    <th className="py-2.5 px-2 text-center w-20">Exam (40)</th>
                    <th className="py-2.5 px-2 text-center w-24 bg-slate-200/70 font-black">Total (100)</th>
                    <th className="py-2.5 px-2 text-center w-16">Grade</th>
                    <th className="py-2.5 px-3 w-28">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScores.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredScores.map((student, idx) => (
                      <tr
                        key={student.studentId}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{student.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{student.admissionNumber}</td>

                        {/* CA1 Input */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step="0.5"
                            disabled={isLocked}
                            value={student.ca1Score ?? ''}
                            onChange={(e) => handleScoreChange(student.studentId, 'ca1Score', e.target.value)}
                            className="w-16 py-1 px-1 text-center font-mono font-medium text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </td>

                        {/* CA2 Input */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step="0.5"
                            disabled={isLocked}
                            value={student.ca2Score ?? ''}
                            onChange={(e) => handleScoreChange(student.studentId, 'ca2Score', e.target.value)}
                            className="w-16 py-1 px-1 text-center font-mono font-medium text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </td>

                        {/* CA3 Input */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step="0.5"
                            disabled={isLocked}
                            value={student.ca3Score ?? ''}
                            onChange={(e) => handleScoreChange(student.studentId, 'ca3Score', e.target.value)}
                            className="w-16 py-1 px-1 text-center font-mono font-medium text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </td>

                        {/* Exam Input */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min={0}
                            max={40}
                            step="0.5"
                            disabled={isLocked}
                            value={student.examScore ?? ''}
                            onChange={(e) => handleScoreChange(student.studentId, 'examScore', e.target.value)}
                            className="w-16 py-1 px-1 text-center font-mono font-medium text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </td>

                        {/* Total Computed Column */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 bg-slate-50">
                          {student.totalScore?.toFixed(1) ?? '—'}
                        </td>

                        {/* Grade */}
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              student.grade?.startsWith('A')
                                ? 'bg-emerald-100 text-emerald-800'
                                : student.grade?.startsWith('B')
                                ? 'bg-blue-100 text-blue-800'
                                : student.grade?.startsWith('C')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.grade || '—'}
                          </span>
                        </td>

                        {/* Remark */}
                        <td className="py-2 px-3 text-slate-600 italic text-[11px] truncate max-w-[120px]">
                          {student.remark || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
