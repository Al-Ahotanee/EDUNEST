import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GraduationCap, Shield, Award, MapPin, Phone, Calendar, User, Users } from 'lucide-react';

export interface AdmissionLetterData {
  schoolName: string;
  schoolLogo?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  primaryColor?: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  gender?: string;
  dateOfBirth?: string;
  className?: string;
  sessionName?: string;
  termName?: string;
  admissionDate?: string;
  reportingDate?: string;
  parentName?: string;
  parentPhone?: string;
  photo?: string;
  letterRef?: string;
  issueDate?: string;
}

const formatDate = (d?: string) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const AdmissionLetter = forwardRef<HTMLDivElement, { data: AdmissionLetterData }>(
  ({ data }, ref) => {
    const primary = data.primaryColor || '#2563eb';

    return (
      <div ref={ref} className="bg-white p-8 sm:p-12 max-w-3xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {/* Letterhead */}
        <div className="flex items-center justify-between border-b-2 pb-4 mb-8" style={{ borderColor: primary }}>
          <div className="flex items-center gap-3">
            {data.schoolLogo ? (
              <img src={data.schoolLogo} alt="School Logo" className="w-16 h-16 rounded-xl object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: primary }}>
                <GraduationCap size={32} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{data.schoolName}</h1>
              {data.schoolAddress && <p className="text-xs text-slate-500 mt-0.5">{data.schoolAddress}</p>}
              <p className="text-xs text-slate-400">
                {data.schoolPhone && `Tel: ${data.schoolPhone}`}
                {data.schoolEmail && ` | ${data.schoolEmail}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Admission Letter</div>
            <div className="text-xs text-slate-400 mt-1">Ref: {data.letterRef || `ADM/${new Date().getFullYear()}/${data.admissionNumber}`}</div>
          </div>
        </div>

        {/* Date */}
        <div className="text-right mb-6">
          <p className="text-sm text-slate-600">{formatDate(data.issueDate || new Date().toISOString())}</p>
        </div>

        {/* Salutation */}
        <div className="mb-4">
          <p className="text-sm text-slate-700">Dear {data.parentName || 'Parent/Guardian'},</p>
        </div>

        {/* Subject Line */}
        <div className="mb-6">
          <p className="font-bold text-slate-900 text-sm uppercase tracking-wide" style={{ color: primary }}>
            RE: ADMISSION OFFER — {data.sessionName || '2026/2027'} ACADEMIC SESSION
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            We are delighted to inform you that <strong>{data.firstName} {data.otherName ? data.otherName + ' ' : ''}{data.lastName}</strong>
            {' '}has been offered admission to <strong>{data.schoolName}</strong> for the
            {' '}{data.sessionName || '2026/2027'} academic session, {data.termName || 'First Term'}.
          </p>

          {/* Student details card */}
          <div className="border rounded-xl p-4 bg-slate-50 my-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {data.photo ? (
                  <img src={data.photo} alt={data.firstName} className="w-16 h-20 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="w-16 h-20 rounded-lg bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400">
                    {data.firstName?.[0]}{data.lastName?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Admission No:</span> <span className="font-bold font-mono">{data.admissionNumber}</span></div>
                <div><span className="text-slate-400">Full Name:</span> <span className="font-semibold">{data.firstName} {data.lastName}</span></div>
                <div><span className="text-slate-400">Gender:</span> {data.gender || '—'}</div>
                <div><span className="text-slate-400">Date of Birth:</span> {formatDate(data.dateOfBirth)}</div>
                <div><span className="text-slate-400">Class:</span> <span className="font-semibold">{data.className || '—'}</span></div>
                <div><span className="text-slate-400">Session:</span> {data.sessionName || '—'}</div>
              </div>
            </div>
          </div>

          <p>
            The student has been placed in <strong>{data.className || 'the appropriate class'}</strong>.
            {data.reportingDate && (
              <> The resumption date is <strong>{formatDate(data.reportingDate)}</strong>. Please ensure the student arrives promptly.</>
            )}
          </p>

          <p>
            <strong>Next Steps:</strong>
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-xs">
            <li>Pay the required fees as per the school's fee schedule for {data.className || 'your class'}.</li>
            <li>Bring the following documents on resumption:
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Birth certificate (original + photocopy)</li>
                <li>Last report card from previous school (if applicable)</li>
                <li>2 passport photographs</li>
                <li>Immunization records</li>
              </ul>
            </li>
            <li>Visit the bursary office to complete fee payment and obtain your official receipt.</li>
            <li>Report to the class teacher on the first day of school with this admission letter.</li>
          </ol>

          <p>
            For fee inquiries, please contact the bursary office at {data.schoolPhone || 'the school office'}.
            We look forward to welcoming {data.firstName} to our academic community.
          </p>
        </div>

        {/* Signature */}
        <div className="mt-12 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-600">Yours faithfully,</p>
            <div className="border-b border-slate-400 mt-8 mb-1" style={{ width: '180px' }} />
            <p className="text-sm font-bold text-slate-900">The Principal</p>
            <p className="text-xs text-slate-400">{data.schoolName}</p>
          </div>
          <Shield size={32} className="text-slate-200" />
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            This is a computer-generated admission letter from {data.schoolName} EduNest School Management System.
            {' '}Admission No: {data.admissionNumber} | Issued: {formatDate(data.issueDate || new Date().toISOString())}
          </p>
        </div>
      </div>
    );
  }
);
AdmissionLetter.displayName = 'AdmissionLetter';
