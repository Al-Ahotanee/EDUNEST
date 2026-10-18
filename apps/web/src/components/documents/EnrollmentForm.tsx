import React, { forwardRef } from 'react';
import { GraduationCap, User, Users, MapPin, Phone, Calendar, Shield } from 'lucide-react';

export interface EnrollmentFormData {
  schoolName: string;
  schoolLogo?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  primaryColor?: string;
  // Student info
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  stateOfOrigin?: string;
  lga?: string;
  nationality?: string;
  religion?: string;
  address?: string;
  photo?: string;
  // Class placement
  className?: string;
  sessionName?: string;
  termName?: string;
  admissionDate?: string;
  // Guardian info
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  guardianRelationship?: string;
  guardianAddress?: string;
}

const fmt = (d?: string) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const EnrollmentFormDocument = forwardRef<HTMLDivElement, { data: EnrollmentFormData }>(
  ({ data }, ref) => {
    const primary = data.primaryColor || '#2563eb';

    const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
      <div className="flex items-center gap-2 mt-6 mb-3 pb-1 border-b" style={{ borderColor: `${primary}40` }}>
        <div className="p-1 rounded" style={{ background: `${primary}15`, color: primary }}>{icon}</div>
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: primary }}>{title}</h3>
      </div>
    );

    const Field = ({ label, value }: { label: string; value?: string }) => (
      <div className="py-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
        <p className="text-sm font-medium text-slate-800 border-b border-dotted border-slate-200 pb-0.5">{value || '—'}</p>
      </div>
    );

    return (
      <div ref={ref} className="bg-white p-8 sm:p-10 max-w-3xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {/* Header with school branding */}
        <div className="text-center mb-6 pb-4 border-b-2" style={{ borderColor: primary }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            {data.schoolLogo ? (
              <img src={data.schoolLogo} alt="Logo" className="w-14 h-14 rounded-xl object-contain" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: primary }}>
                <GraduationCap size={28} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{data.schoolName}</h1>
              {data.schoolAddress && <p className="text-xs text-slate-500">{data.schoolAddress}</p>}
              <p className="text-xs text-slate-400">{data.schoolPhone} {data.schoolEmail && `| ${data.schoolEmail}`}</p>
            </div>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider mt-3" style={{ color: primary }}>
            Student Enrollment & Registration Form
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {data.sessionName || '2026/2027'} Academic Session — {data.termName || 'First Term'}
          </p>
        </div>

        {/* Photo + Admission Number */}
        <div className="flex items-start gap-6 mb-4">
          <div className="flex-shrink-0">
            {data.photo ? (
              <img src={data.photo} alt={data.firstName} className="w-24 h-32 rounded-lg object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-24 h-32 rounded-lg bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-300 border-2 border-slate-200">
                {data.firstName?.[0]}{data.lastName?.[0]}
              </div>
            )}
            <p className="text-center text-[10px] text-slate-400 mt-1">Passport Photo</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-0">
            <Field label="Admission Number" value={data.admissionNumber} />
            <Field label="Admission Date" value={fmt(data.admissionDate)} />
            <Field label="Academic Session" value={data.sessionName} />
            <Field label="Entry Term" value={data.termName} />
            <Field label="Class Assigned" value={data.className} />
            <Field label="Status" value="ACTIVE — Enrolled" />
          </div>
        </div>

        {/* Section A: Student Information */}
        <SectionHeader icon={<User size={16} />} title="Section A: Student Information" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-0">
          <Field label="First Name" value={data.firstName} />
          <Field label="Last Name" value={data.lastName} />
          <Field label="Other Name" value={data.otherName} />
          <Field label="Gender" value={data.gender} />
          <Field label="Date of Birth" value={fmt(data.dateOfBirth)} />
          <Field label="Blood Group" value={data.bloodGroup} />
          <Field label="Nationality" value={data.nationality || 'Nigerian'} />
          <Field label="State of Origin" value={data.stateOfOrigin} />
          <Field label="LGA" value={data.lga} />
          <Field label="Religion" value={data.religion} />
          <div className="col-span-2"><Field label="Residential Address" value={data.address} /></div>
        </div>

        {/* Section B: Parent/Guardian Information */}
        <SectionHeader icon={<Users size={16} />} title="Section B: Parent/Guardian Information" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-0">
          <Field label="Guardian Name" value={data.guardianName} />
          <Field label="Relationship" value={data.guardianRelationship} />
          <Field label="Phone Number" value={data.guardianPhone} />
          <Field label="Email" value={data.guardianEmail} />
          <Field label="Occupation" value={data.guardianOccupation} />
          <div className="col-span-2"><Field label="Guardian Address" value={data.guardianAddress} /></div>
        </div>

        {/* Section C: Declarations */}
        <SectionHeader icon={<Shield size={16} />} title="Section C: Declarations" />
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong>Parent/Guardian Declaration:</strong> I, {data.guardianName || "___________"}, hereby declare that the information provided above is true and accurate to the best of my knowledge. I accept the admission offer for my ward {data.firstName} {data.lastName} and agree to comply with the rules and regulations of {data.schoolName}.
          </p>
          <p>
            <strong>School Verification:</strong> The above information has been verified by the school
            administration and the student has been duly enrolled.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="text-center">
            <div className="border-b border-slate-400 mb-1" style={{ width: '100%', height: '40px' }} />
            <p className="text-xs font-bold text-slate-700">Parent/Guardian Signature</p>
            <p className="text-[10px] text-slate-400">Date: _______________</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-400 mb-1" style={{ width: '100%', height: '40px' }} />
            <p className="text-xs font-bold text-slate-700">Principal / Head of School</p>
            <p className="text-[10px] text-slate-400">Date: _______________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">
            This enrollment form was generated by {data.schoolName} EduNest School Management System on {fmt(new Date().toISOString())}.
            {' '}Admission No: {data.admissionNumber}
          </p>
        </div>
      </div>
    );
  }
);
EnrollmentFormDocument.displayName = 'EnrollmentFormDocument';
