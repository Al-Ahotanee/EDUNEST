import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Briefcase, Shield, Award, Phone, MapPin, UserCog } from 'lucide-react';

/**
 * Formal Staff ID Card component
 * - Same CR80 standard size (85.6mm × 54mm) as StudentIDCard
 * - Different color band (gold/emerald) to distinguish from student cards
 * - Includes designation, department, staff ID
 *
 * RBAC for printing:
 *   - School Admin / Principal: can print any staff card
 *   - Staff member: can print their own card (read-only on others)
 */
export interface StaffIDCardData {
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  primaryColor?: string;
  secondaryColor?: string;
  staffId: string;          // internal UUID
  staffIdNumber: string;    // human-readable (e.g., SCH/STAFF/001)
  firstName: string;
  lastName: string;
  gender?: string;
  designation?: string;
  department?: string;
  employmentType?: string;
  phone?: string;
  email?: string;
  photo?: string;
  issueDate?: string;
  expiryDate?: string;
  signatureLine?: string;
}

interface StaffIDCardProps {
  data: StaffIDCardData;
  variant?: 'front' | 'back' | 'both';
  className?: string;
}

const formatDate = (d?: string) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const StaffIDCard = forwardRef<HTMLDivElement, StaffIDCardProps>(
  ({ data, variant = 'front', className = '' }, ref) => {
    // Staff cards use a distinct palette — gold/emerald to distinguish from students
    const primary = data.primaryColor || '#0f766e';   // teal-700
    const secondary = data.secondaryColor || '#ca8a04'; // amber-600

    // QR payload: structured token that the QR scanner can decode
    // Format: STAFF:{staffId}:{staffIdNumber}:{firstName}:{lastName}
    const qrPayload = `STAFF:${data.staffId}:${data.staffIdNumber}:${data.firstName}:${data.lastName}`;

    const FrontSide = (
      <div
        className="id-card-front relative bg-white shadow-xl print:shadow-none overflow-hidden"
        style={{
          width: '85.6mm',
          height: '54mm',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {/* Header band with school branding */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center gap-2 px-2 py-1"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
            color: 'white',
            height: '12mm',
          }}
        >
          <div className="flex-shrink-0">
            {data.schoolLogo ? (
              <img
                src={data.schoolLogo}
                alt="logo"
                className="w-7 h-7 rounded object-contain bg-white/95 p-0.5"
                style={{ borderRadius: '4px' }}
              />
            ) : (
              <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center">
                <Briefcase size={16} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[9px] leading-tight uppercase tracking-wide truncate">
              {data.schoolName}
            </div>
            {data.schoolMotto && (
              <div className="text-[6.5px] leading-tight text-white/80 italic truncate">
                "{data.schoolMotto}"
              </div>
            )}
          </div>
          <div className="text-[6px] font-bold uppercase tracking-wider text-white/95 px-1 py-0.5 rounded bg-white/15">
            Staff ID
          </div>
        </div>

        {/* Body */}
        <div className="absolute top-[13mm] left-0 right-0 bottom-0 flex items-start gap-1.5 px-2 py-1">
          <div className="flex-shrink-0">
            {data.photo ? (
              <img
                src={data.photo}
                alt={data.firstName}
                className="object-cover bg-slate-100"
                style={{ width: '14mm', height: '18mm', borderRadius: '4px', border: '1px solid #e2e8f0' }}
              />
            ) : (
              <div
                className="flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
                style={{ width: '14mm', height: '18mm', borderRadius: '4px', border: '1px solid #e2e8f0' }}
              >
                <div className="text-center">
                  <div
                    className="font-bold text-slate-700 leading-none"
                    style={{ fontSize: '11px' }}
                  >
                    {(data.firstName?.[0] || '?')}{(data.lastName?.[0] || '')}
                  </div>
                  <div className="text-[5px] text-slate-400 mt-0.5 uppercase tracking-wider">
                    Photo
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div>
              <div className="text-[5.5px] uppercase tracking-wider text-slate-400 font-semibold">Name</div>
              <div className="text-[9px] font-bold text-slate-900 leading-tight truncate">
                {data.firstName} {data.lastName}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
              <div>
                <div className="text-[5.5px] uppercase tracking-wider text-slate-400 font-semibold">Staff ID</div>
                <div className="text-[7px] font-mono font-bold text-slate-700 leading-tight truncate">
                  {data.staffIdNumber}
                </div>
              </div>
              <div>
                <div className="text-[5.5px] uppercase tracking-wider text-slate-400 font-semibold">Designation</div>
                <div className="text-[7px] font-semibold text-slate-700 leading-tight truncate">
                  {data.designation || '—'}
                </div>
              </div>
              <div>
                <div className="text-[5.5px] uppercase tracking-wider text-slate-400 font-semibold">Department</div>
                <div className="text-[7px] text-slate-700 leading-tight truncate">
                  {data.department || '—'}
                </div>
              </div>
              <div>
                <div className="text-[5.5px] uppercase tracking-wider text-slate-400 font-semibold">Emp. Type</div>
                <div className="text-[7px] text-slate-700 leading-tight">
                  {data.employmentType || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* QR code */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="bg-white p-0.5"
              style={{ borderRadius: '3px', border: '1px solid #e2e8f0' }}
            >
              <QRCodeSVG
                value={qrPayload}
                size={48}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-[4.5px] uppercase tracking-wider text-slate-400 mt-0.5 font-semibold">
              Scan for Attendance
            </div>
          </div>
        </div>

        {/* Footer band */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-0.5"
          style={{ background: primary, color: 'white', height: '5mm' }}
        >
          <div className="text-[5.5px] leading-none">
            <span className="opacity-80">Issued:</span>{' '}
            <span className="font-semibold">{formatDate(data.issueDate) || formatDate(new Date().toISOString())}</span>
          </div>
          <div className="text-[5.5px] leading-none">
            <span className="opacity-80">Valid:</span>{' '}
            <span className="font-semibold">{formatDate(data.expiryDate) || '2027'}</span>
          </div>
        </div>
      </div>
    );

    const BackSide = (
      <div
        className="id-card-back relative bg-white shadow-xl print:shadow-none overflow-hidden"
        style={{
          width: '85.6mm',
          height: '54mm',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 px-2 py-0.5 flex items-center justify-between"
          style={{ background: primary, color: 'white', height: '4mm' }}
        >
          <div className="text-[6.5px] font-bold uppercase tracking-wide truncate">
            {data.schoolName}
          </div>
          <div className="text-[6px] opacity-90">Staff Identity Card</div>
        </div>

        <div className="absolute top-[5mm] left-0 right-0 px-2 py-1 space-y-0.5">
          <div className="flex items-start gap-1">
            <MapPin size={7} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-[6.5px] text-slate-700 leading-tight">
              {data.schoolAddress || 'School Address'}
            </div>
          </div>
          <div className="flex items-start gap-1">
            <Phone size={7} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-[6.5px] text-slate-700 leading-tight">
              {data.schoolPhone || 'Tel: +234 800 000 0000'}
            </div>
          </div>
          <div className="flex items-start gap-1">
            <Award size={7} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-[6.5px] text-slate-700 leading-tight">
              {data.email || data.schoolEmail || 'staff@school.edu.ng'}
            </div>
          </div>
        </div>

        <div className="absolute top-[20mm] left-0 right-0 px-2 py-1">
          <div className="border border-slate-200 rounded p-1 bg-slate-50">
            <div className="text-[5.5px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
              Terms & Conditions
            </div>
            <ol className="text-[5.5px] text-slate-600 leading-snug space-y-0.5 list-decimal pl-2">
              <li>This card identifies the bearer as an authorized staff member of {data.schoolName}.</li>
              <li>Must be worn visibly at all times within school premises.</li>
              <li>Required for staff attendance marking via QR scanner.</li>
              <li>Lost cards must be reported to the HR office immediately.</li>
              <li>This card is non-transferable. Return to HR on resignation/termination.</li>
            </ol>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 px-2 py-1 flex items-end justify-between"
          style={{ height: '8mm' }}
        >
          <div>
            <div
              className="border-b border-slate-400 mb-0.5"
              style={{ width: '20mm', height: '3mm' }}
            />
            <div className="text-[5.5px] uppercase tracking-wider text-slate-500 font-semibold">
              {data.signatureLine || 'Principal / HR'}
            </div>
          </div>
          <Shield size={12} className="text-slate-300" />
        </div>
      </div>
    );

    if (variant === 'back') {
      return <div ref={ref} className={className}>{BackSide}</div>;
    }

    if (variant === 'both') {
      return (
        <div ref={ref} className={`flex flex-col gap-3 print:gap-2 ${className}`}>
          {FrontSide}
          {BackSide}
        </div>
      );
    }

    return <div ref={ref} className={className}>{FrontSide}</div>;
  }
);
StaffIDCard.displayName = 'StaffIDCard';
