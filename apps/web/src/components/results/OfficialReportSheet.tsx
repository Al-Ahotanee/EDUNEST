import React, { useRef } from 'react';
import { Printer, Download, Award, CheckCircle, Shield, Calendar, User, BookOpen } from 'lucide-react';
import { Button } from '../ui';
import { EduNestIcon } from '../common/EduNestLogo';

interface ReportSheetProps {
  data: any;
  onEndorse?: () => void;
  canEndorse?: boolean;
}

export const OfficialReportSheet: React.FC<ReportSheetProps> = ({ data, onEndorse, canEndorse }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const {
    school,
    student,
    term,
    attendance,
    results,
    academicSummary,
    affectiveDomain,
    psychomotorDomain,
    endorsements,
    status,
  } = data;

  const handlePrint = () => {
    window.print();
  };

  const affectiveKeys = [
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'neatness', label: 'Neatness & Bearing' },
    { key: 'politeness', label: 'Politeness & Courtesy' },
    { key: 'honesty', label: 'Honesty & Integrity' },
    { key: 'leadership', label: 'Leadership & Initiative' },
    { key: 'attentiveness', label: 'Attentiveness in Class' },
    { key: 'cooperation', label: 'Cooperation with Peers' },
    { key: 'emotionalStability', label: 'Emotional Stability' },
  ];

  const psychomotorKeys = [
    { key: 'handwriting', label: 'Handwriting / Penmanship' },
    { key: 'sports', label: 'Sports & Athletic Skills' },
    { key: 'crafts', label: 'Crafts & Creative Arts' },
    { key: 'publicSpeaking', label: 'Verbal Fluency & Speaking' },
    { key: 'toolsHandling', label: 'Handling Tools & Equipment' },
  ];

  const getGradeBadge = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (grade.startsWith('D') || grade.startsWith('E')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar (hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              status === 'PUBLISHED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : status === 'APPROVED'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : status === 'SUBMITTED'
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            {status === 'PUBLISHED' ? '🔒 Published & Official' : status}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Format: Formal Institutional A4 Sheet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canEndorse && onEndorse && (
            <Button variant="secondary" size="sm" onClick={onEndorse}>
              Edit Remarks & Ratings
            </Button>
          )}
          <Button variant="primary" size="sm" icon={<Printer size={16} />} onClick={handlePrint}>
            Print Official Sheet
          </Button>
        </div>
      </div>

      {/* ─── PRINTABLE FORMAL REPORT SHEET CONTAINER ────────────────────────────── */}
      <div
        ref={printRef}
        id="official-report-card"
        className="bg-white text-slate-900 border border-slate-300 shadow-lg rounded-xl max-w-[920px] mx-auto p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {/* Outer Formal Double Border */}
        <div className="border-4 border-double border-slate-800 p-6 sm:p-8 print:p-5 relative">
          
          {/* Official Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <EduNestIcon size={420} className="text-slate-950" />
          </div>

          {/* 1. INSTITUTIONAL LETTERHEAD */}
          <div className="text-center pb-5 border-b-2 border-slate-800 relative">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center border border-slate-300 rounded-lg p-1 bg-slate-50">
                {school.logo ? (
                  <img src={school.logo} alt="School Crest" className="max-h-full max-w-full object-contain" />
                ) : (
                  <EduNestIcon size={48} className="text-slate-800" />
                )}
              </div>

              <div className="flex-1 text-center px-2">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900" style={{ letterSpacing: '0.04em' }}>
                  {school.name}
                </h1>
                <p className="text-xs sm:text-sm italic font-medium text-slate-700 mt-1">
                  Motto: &ldquo;{school.motto}&rdquo;
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {school.address}
                  {school.phone && ` • Tel: ${school.phone}`}
                  {school.email && ` • Email: ${school.email}`}
                </p>
                {school.website && (
                  <p className="text-xs text-slate-500 font-sans mt-0.5">{school.website}</p>
                )}
              </div>

              <div className="w-20 h-24 flex-shrink-0 border border-slate-300 rounded-lg p-0.5 bg-slate-50 overflow-hidden flex flex-col items-center justify-center text-center">
                {student.photo ? (
                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <User size={28} />
                    <span className="text-[9px] uppercase font-sans mt-1">Passport</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-3 inline-block bg-slate-900 text-white px-6 py-1.5 rounded-sm uppercase tracking-wider text-xs sm:text-sm font-sans font-bold shadow-sm">
              Continuous Assessment & Terminal Examination Report Sheet
            </div>
          </div>

          {/* 2. STUDENT BIODATA & ATTENDANCE MATRIX */}
          <div className="my-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans border-b border-slate-300 pb-5">
            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Student&apos;s Full Name</span>
              <span className="font-bold text-slate-900 text-sm block">{student.fullName}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Admission Number</span>
              <span className="font-bold text-slate-800 text-sm font-mono block">{student.admissionNumber}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Class & Section</span>
              <span className="font-bold text-slate-800 text-sm block">{student.class} ({student.section})</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Academic Session & Term</span>
              <span className="font-bold text-slate-800 text-sm block">{term.name} • {term.sessionName}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Gender</span>
              <span className="font-semibold text-slate-800 block capitalize">{student.gender?.toLowerCase() || '—'}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Times School Opened</span>
              <span className="font-semibold text-slate-800 block">{attendance.daysOpened} Days</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Times Present</span>
              <span className="font-semibold text-emerald-700 block">{attendance.daysPresent} Days</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wide">Times Absent</span>
              <span className="font-semibold text-red-600 block">{attendance.daysAbsent} Days</span>
            </div>
          </div>

          {/* 3. COGNITIVE PERFORMANCE TABLE (SUBJECT SCORES) */}
          <div className="mb-6 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
              <BookOpen size={14} className="text-slate-700" />
              Cognitive Academic Achievement
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] tracking-wider border-b border-slate-400">
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-8">#</th>
                    <th className="border border-slate-400 py-1.5 px-3">Subject Name</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12">CA1 (20)</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12">CA2 (20)</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12">CA3 (20)</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12">Exam (40)</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-14 bg-slate-200">Total (100)</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12">Grade</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12">Pos.</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12 text-slate-500">Highest</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12 text-slate-500">Lowest</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-12 text-slate-500">Class Avg</th>
                    <th className="border border-slate-400 py-1.5 px-3">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {results.map((r: any, idx: number) => (
                    <tr key={r.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">{r.subject?.name}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-700">{r.ca1Score ?? '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-700">{r.ca2Score ?? '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-700">{r.ca3Score ?? '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-700">{r.examScore ?? '—'}</td>
                      <td className="border border-slate-400 py-1.5 px-2 text-center font-bold text-slate-950 bg-slate-100">
                        {r.totalScore?.toFixed(1) ?? '—'}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getGradeBadge(r.grade || 'F')}`}>
                          {r.grade || '—'}
                        </span>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold text-slate-800">
                        {r.subjectPosition ? `${r.subjectPosition}` : '—'}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-500 font-mono text-[11px]">{r.classHighest ?? '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-500 font-mono text-[11px]">{r.classLowest ?? '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-500 font-mono text-[11px]">{r.classAverage ?? '—'}</td>
                      <td className="border border-slate-300 py-1.5 px-3 text-slate-700 italic text-[11px]">{r.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. OVERALL ACADEMIC SUMMARY SCORECARD */}
          <div className="mb-6 font-sans border-2 border-slate-800 rounded p-3 bg-slate-50/80">
            <div className="grid grid-cols-2 sm:grid-cols-6 divide-x divide-slate-300 text-center">
              <div className="p-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Marks Obtainable</span>
                <span className="text-base font-bold text-slate-900">{academicSummary.totalObtainable}</span>
              </div>
              <div className="p-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Marks Obtained</span>
                <span className="text-base font-bold text-slate-900">{academicSummary.totalObtained}</span>
              </div>
              <div className="p-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Percentage Average</span>
                <span className="text-base font-black text-slate-950">{academicSummary.studentAverage}%</span>
              </div>
              <div className="p-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Position in Class</span>
                <span className="text-base font-black text-emerald-800">
                  {academicSummary.classPosition}
                  <span className="text-xs font-normal text-slate-600"> / {academicSummary.classSize}</span>
                </span>
              </div>
              <div className="p-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Overall Grade</span>
                <span className="text-base font-black text-slate-900">{academicSummary.overallGrade}</span>
              </div>
              <div className="p-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Decision</span>
                <span className="text-xs font-black uppercase text-slate-900 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 inline-block mt-0.5">
                  {academicSummary.promotionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* 5. AFFECTIVE & PSYCHOMOTOR DOMAINS (HOLISTIC EVALUATION) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 font-sans">
            {/* Affective Domain */}
            <div className="border border-slate-400 rounded p-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1 flex justify-between items-center">
                <span>Affective Domain (Character & Conduct)</span>
                <span className="text-[9px] text-slate-500 font-normal">Rating (1 - 5)</span>
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {affectiveKeys.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-700 text-[11px]">{label}:</span>
                    <span className="font-bold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                      {affectiveDomain?.[key] ?? 4}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Psychomotor Domain */}
            <div className="border border-slate-400 rounded p-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1 flex justify-between items-center">
                <span>Psychomotor Domain (Skills & Athletics)</span>
                <span className="text-[9px] text-slate-500 font-normal">Rating (1 - 5)</span>
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {psychomotorKeys.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-700 text-[11px]">{label}:</span>
                    <span className="font-bold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                      {psychomotorDomain?.[key] ?? 4}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. KEY TO GRADING SYSTEM */}
          <div className="mb-6 p-2 bg-slate-100/70 border border-slate-300 rounded text-[10px] font-sans text-center text-slate-700 leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-slate-900 mr-2">Key to Grading:</span>
            <span>A1 (75-100% Excellent)</span> • 
            <span> B2 (70-74% Very Good)</span> • 
            <span> B3 (65-69% Good)</span> • 
            <span> C4 (60-64% Credit)</span> • 
            <span> C5 (55-59% Credit)</span> • 
            <span> C6 (50-54% Credit)</span> • 
            <span> D7 (45-49% Pass)</span> • 
            <span> E8 (40-44% Pass)</span> • 
            <span> F9 (0-39% Fail)</span>
            <div className="mt-0.5 text-[9px] text-slate-500">
              Affective / Psychomotor Rating Keys: 5 = Excellent | 4 = Very Good | 3 = Good / Average | 2 = Needs Improvement | 1 = Unsatisfactory
            </div>
          </div>

          {/* 7. REMARKS, DIGITAL SIGNATURES & OFFICIAL SEAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-800 text-xs">
            {/* Class Master Section */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block font-sans">
                  Class Master&apos;s Remark:
                </span>
                <p className="italic text-slate-800 mt-1 min-h-[38px] border-b border-dotted border-slate-400 pb-1">
                  &ldquo;{endorsements.classTeacherRemark}&rdquo;
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <div className="w-36 border-b border-slate-900 mb-1" />
                  <span className="text-[10px] uppercase font-sans text-slate-600 font-bold">Class Master&apos;s Signature</span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Date: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            {/* Principal's Endorsement Section */}
            <div className="space-y-3 relative">
              {/* Institutional Seal Watermark / Stamp */}
              <div className="absolute right-4 -top-3 w-24 h-24 rounded-full border-2 border-dashed border-red-700/60 flex items-center justify-center text-red-700/80 text-[10px] font-sans font-black uppercase text-center rotate-[-15deg] pointer-events-none select-none p-1">
                <div className="border border-red-700/40 rounded-full w-full h-full flex flex-col items-center justify-center p-1">
                  <span>★ OFFICIAL ★</span>
                  <span className="text-[8px] leading-tight">SCHOOL SEAL</span>
                  <span>APPROVED</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block font-sans">
                  Principal&apos;s Formal Endorsement:
                </span>
                <p className="italic text-slate-800 mt-1 min-h-[38px] border-b border-dotted border-slate-400 pb-1">
                  &ldquo;{endorsements.principalRemark}&rdquo;
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between relative z-10">
                <div>
                  <div className="w-36 border-b border-slate-900 mb-1" />
                  <span className="text-[10px] uppercase font-sans text-slate-600 font-bold">Principal&apos;s Signature & Stamp</span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Date: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </div>

          {/* 8. FOOTER NOTICES (RESUMPTION & BURSARY) */}
          <div className="mt-6 pt-3 border-t border-slate-300 flex flex-wrap items-center justify-between text-[11px] font-sans text-slate-600 gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Calendar size={13} className="text-slate-700" />
              <span>Next Term Resumption Date:</span>
              <span className="text-blue-900 underline font-mono">
                {endorsements.nextTermResumption
                  ? new Date(endorsements.nextTermResumption).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Announced via SMS/Portal'}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 italic">
              Notice: All outstanding school fees must be cleared before resumption to ensure entry.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
