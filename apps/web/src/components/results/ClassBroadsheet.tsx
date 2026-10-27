import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, Award, Users, BookOpen, TrendingUp } from 'lucide-react';
import { Button, Select, PageLoader } from '../ui';
import { resultsApi } from '../../services/api';

interface ClassBroadsheetProps {
  classes?: any[];
  terms?: any[];
  selectedClass?: string;
  selectedTerm?: string;
  classId?: string;
  termId?: string;
  onClassChange?: (id: string) => void;
  onTermChange?: (id: string) => void;
  hideFilters?: boolean;
}

export const ClassBroadsheet: React.FC<ClassBroadsheetProps> = ({
  classes = [],
  terms = [],
  selectedClass,
  selectedTerm,
  classId,
  termId,
  onClassChange,
  onTermChange,
  hideFilters = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const activeClass = selectedClass || classId || '';
  const activeTerm = selectedTerm || termId || '';

  const { data: broadsheet, isLoading } = useQuery({
    queryKey: ['class-broadsheet', activeClass, activeTerm],
    queryFn: () =>
      resultsApi.broadsheet(activeClass, activeTerm).then((r) => r.data?.data || r.data),
    enabled: !!(activeClass && activeTerm),
  });

  const exportCSV = () => {
    if (!broadsheet?.students || broadsheet.students.length === 0) return;

    const subjects = broadsheet.subjects || [];
    const headers = [
      'Pos',
      'Admission No',
      'Student Full Name',
      'Gender',
      ...subjects.map((s: any) => `${s.code} (Total)`),
      ...subjects.map((s: any) => `${s.code} (Grade)`),
      'Total Score',
      'Average (%)',
      'Promotion Status',
    ];

    const rows = (broadsheet.students || []).map((s: any) => {
      const subjectScores = subjects.map((sub: any) => {
        const found = (s.subjects || []).find((item: any) => item.subjectId === sub.id);
        return found?.totalScore ?? '';
      });
      const subjectGrades = subjects.map((sub: any) => {
        const found = (s.subjects || []).find((item: any) => item.subjectId === sub.id);
        return found?.grade ?? '';
      });

      return [
        s.position,
        `"${s.admissionNumber}"`,
        `"${s.name}"`,
        s.gender,
        ...subjectScores,
        ...subjectGrades,
        s.totalObtained,
        s.averageScore,
        s.promotionStatus,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `broadsheet_${broadsheet.class?.name || activeClass}_${broadsheet.term?.name || activeTerm}.csv`.replace(/\s+/g, '_'),
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Selector Filters */}
      {!hideFilters && (classes?.length > 0 || terms?.length > 0) && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <Select
            label="Select Class"
            value={activeClass}
            onChange={(e) => onClassChange?.(e.target.value)}
            options={(classes || []).map((c) => ({
              value: c.id,
              label: `${c.name} ${c.section ? `(${c.section})` : ''}`,
            }))}
            placeholder="Select Class..."
          />

          <Select
            label="Select Academic Term"
            value={activeTerm}
            onChange={(e) => onTermChange?.(e.target.value)}
            options={(terms || []).map((t) => ({
              value: t.id,
              label: `${t.name} (${t.session?.name || ''})`,
            }))}
            placeholder="Select Term..."
          />
        </div>
      )}

      {!activeClass || !activeTerm ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">Please select a Class and Term</p>
          <p className="text-xs text-slate-400 mt-1">The master class broadsheet will compile automatically.</p>
        </div>
      ) : isLoading ? (
        <PageLoader />
      ) : !broadsheet || broadsheet.students?.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic">
          No students or examination results recorded for this class yet.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Master Broadsheet: {broadsheet.class?.name} ({broadsheet.class?.section || 'Arm A'})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {broadsheet.term?.name} • {broadsheet.term?.sessionName} • Class Master:{' '}
                <strong>{broadsheet.class?.classMasterName}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCSV}>
                Export CSV
              </Button>
              <Button variant="primary" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
                Print Broadsheet
              </Button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Users size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Class Size</span>
                <p className="text-base font-bold text-slate-900">{broadsheet.classSize} Students</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Class Average</span>
                <p className="text-base font-bold text-slate-900">{broadsheet.classAverage}%</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <BookOpen size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Subjects</span>
                <p className="text-base font-bold text-slate-900">{broadsheet.subjects?.length || 0} Registered</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Award size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Highest Average</span>
                <p className="text-base font-bold text-slate-900">
                  {broadsheet.students[0]?.averageScore ?? 0}%
                </p>
              </div>
            </div>
          </div>

          {/* ─── BROADSHEET MATRIX TABLE ────────────────────────────────────────── */}
          <div
            ref={printRef}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none"
          >
            {/* Print Header (Only visible on print) */}
            <div className="hidden print:block text-center p-4 border-b-2 border-slate-800">
              <h1 className="text-xl font-bold uppercase">{broadsheet.class?.name} Master Broadsheet</h1>
              <p className="text-xs text-slate-600">
                {broadsheet.term?.name} • {broadsheet.term?.sessionName} • Class Master: {broadsheet.class?.classMasterName}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2 px-2 text-center border border-slate-800 w-8">Pos</th>
                    <th className="py-2 px-3 border border-slate-800 min-w-[140px]">Student Name</th>
                    <th className="py-2 px-2 border border-slate-800 w-24">Adm. No</th>
                    {(broadsheet.subjects || []).map((sub: any) => (
                      <th
                        key={sub.id}
                        className="py-2 px-1 text-center border border-slate-800 min-w-[58px]"
                        title={sub.name}
                      >
                        {sub.code}
                      </th>
                    ))}
                    <th className="py-2 px-2 text-center border border-slate-800 bg-slate-800 min-w-[65px]">
                      Total
                    </th>
                    <th className="py-2 px-2 text-center border border-slate-800 bg-slate-800 min-w-[55px]">
                      Avg %
                    </th>
                    <th className="py-2 px-2 text-center border border-slate-800 min-w-[70px]">
                      Decision
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {(broadsheet.students || []).map((student: any, idx: number) => (
                    <tr
                      key={student.studentId}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center font-bold text-slate-900 border border-slate-200 bg-slate-100/50">
                        {student.position}
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-slate-900 border border-slate-200 whitespace-nowrap">
                        {student.name}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-slate-500 border border-slate-200 text-[10px]">
                        {student.admissionNumber}
                      </td>

                      {/* Subject Marks */}
                      {(broadsheet.subjects || []).map((sub: any) => {
                        const scoreData = (student.subjects || []).find((s: any) => s.subjectId === sub.id);
                        const hasScore = scoreData && scoreData.totalScore !== null;
                        return (
                          <td
                            key={sub.id}
                            className="py-1.5 px-1 text-center border border-slate-200 font-mono text-[10px]"
                          >
                            {hasScore ? (
                              <span
                                className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium ${
                                  (scoreData.totalScore || 0) < 50
                                    ? 'text-red-700 bg-red-50'
                                    : 'text-slate-900'
                                }`}
                              >
                                {scoreData.totalScore}
                                <span className="text-[9px] font-bold text-slate-400 ml-0.5">
                                  {scoreData.grade}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Cumulative Total */}
                      <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-950 bg-slate-100/80 border border-slate-200">
                        {student.totalObtained}
                      </td>

                      {/* Student Average */}
                      <td className="py-1.5 px-2 text-center font-mono font-black text-slate-950 bg-slate-100/80 border border-slate-200">
                        {student.averageScore}%
                      </td>

                      {/* Promotion Decision */}
                      <td className="py-1.5 px-2 text-center border border-slate-200">
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            student.averageScore >= 50
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {student.promotionStatus || (student.averageScore >= 50 ? 'PASS' : 'FAIL')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Subject Statistics Footer Summary */}
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-[10px] text-slate-700">
                    <td colSpan={3} className="py-1.5 px-3 border border-slate-300 uppercase tracking-wide">
                      Subject Class Average
                    </td>
                    {(broadsheet.subjects || []).map((sub: any) => {
                      const stat = (broadsheet.subjectStats || []).find((s: any) => s.subjectId === sub.id);
                      return (
                        <td key={sub.id} className="py-1.5 px-1 text-center font-mono border border-slate-300">
                          {stat?.averageScore ?? '—'}%
                        </td>
                      );
                    })}
                    <td colSpan={3} className="py-1.5 px-2 text-center border border-slate-300">
                      Overall: {broadsheet.classAverage}%
                    </td>
                  </tr>

                  <tr className="bg-slate-100 font-bold text-[10px] text-slate-700">
                    <td colSpan={3} className="py-1.5 px-3 border border-slate-300 uppercase tracking-wide">
                      Subject Highest Score
                    </td>
                    {(broadsheet.subjects || []).map((sub: any) => {
                      const stat = (broadsheet.subjectStats || []).find((s: any) => s.subjectId === sub.id);
                      return (
                        <td key={sub.id} className="py-1.5 px-1 text-center font-mono text-emerald-700 border border-slate-300">
                          {stat?.highestScore ?? '—'}
                        </td>
                      );
                    })}
                    <td colSpan={3} className="py-1.5 px-2 border border-slate-300" />
                  </tr>

                  <tr className="bg-slate-100 font-bold text-[10px] text-slate-700">
                    <td colSpan={3} className="py-1.5 px-3 border border-slate-300 uppercase tracking-wide">
                      Subject Pass Rate (%)
                    </td>
                    {(broadsheet.subjects || []).map((sub: any) => {
                      const stat = (broadsheet.subjectStats || []).find((s: any) => s.subjectId === sub.id);
                      return (
                        <td key={sub.id} className="py-1.5 px-1 text-center font-mono border border-slate-300">
                          {stat?.passRate ?? '—'}%
                        </td>
                      );
                    })}
                    <td colSpan={3} className="py-1.5 px-2 border border-slate-300" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
