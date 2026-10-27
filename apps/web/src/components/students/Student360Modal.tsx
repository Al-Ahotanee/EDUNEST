import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  User, Phone, Mail, MapPin, Calendar, Heart, Shield,
  Award, FileText, CheckCircle2, XCircle, Clock,
  ExternalLink, Copy, Check, Printer, AlertCircle,
  Building, BookOpen, Users,
} from 'lucide-react';
import { Modal, Button, Badge, Avatar } from '../ui';
import { studentsApi } from '../../services/api';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Student360ModalProps {
  open: boolean;
  onClose: () => void;
  student: any;
  school?: any;
  classInfo?: { id: string; name: string; section?: string; level?: number };
  sessionInfo?: { id: string; name: string };
  termInfo?: { id: string; name: string };
  onOpenAdmissionLetter: (student: any) => void;
  onOpenEndorsement?: (student: any) => void;
}

type TabKey = 'overview' | 'guardians' | 'academic' | 'attendance';

export const Student360Modal: React.FC<Student360ModalProps> = ({
  open,
  onClose,
  student: initialStudent,
  school,
  classInfo,
  sessionInfo,
  termInfo,
  onOpenAdmissionLetter,
  onOpenEndorsement,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [copiedAdm, setCopiedAdm] = useState(false);

  // Fetch full details if needed
  const { data: fullStudentData, isLoading } = useQuery({
    queryKey: ['student-360-detail', initialStudent?.id],
    queryFn: () => studentsApi.get(initialStudent.id).then((r) => r.data?.data || r.data),
    enabled: open && Boolean(initialStudent?.id),
    staleTime: 60000,
  });

  if (!open || !initialStudent) return null;

  const student = fullStudentData || initialStudent;
  const guardians: any[] = student.guardians || initialStudent.guardians || [];
  const primaryGuardian = guardians.find((g: any) => g.isPrimary) || guardians[0];

  const handleCopyAdmission = () => {
    if (student.admissionNumber) {
      navigator.clipboard.writeText(student.admissionNumber);
      setCopiedAdm(true);
      toast.success('Admission number copied to clipboard');
      setTimeout(() => setCopiedAdm(false), 2000);
    }
  };

  const attendanceRecords: any[] = student.attendance || [];
  const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter((a) => a.status === 'ABSENT').length;
  const lateCount = attendanceRecords.filter((a) => a.status === 'LATE').length;
  const excusedCount = attendanceRecords.filter((a) => a.status === 'EXCUSED').length;
  const totalAttendance = attendanceRecords.length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-mono">
            ID: {student.id?.slice(0, 8)}...
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => {
                onOpenAdmissionLetter(student);
              }}
            >
              Print Admission Letter
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 -mt-2">
        {/* Enterprise Student Identity Header */}
        <div className="bg-slate-900 rounded-xl p-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                name={student.fullName || `${student.firstName} ${student.lastName}`}
                src={student.photo}
                size="lg"
                className="border-2 border-white/20 w-16 h-16 text-xl rounded-xl"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {student.fullName || `${student.lastName}, ${student.firstName} ${student.otherName || ''}`}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {student.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-mono bg-white/10 px-2 py-0.5 rounded border border-white/10">
                    Adm No: {student.admissionNumber}
                    <button
                      onClick={handleCopyAdmission}
                      title="Copy Admission Number"
                      className="text-slate-400 hover:text-white transition-colors ml-1"
                    >
                      {copiedAdm ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </span>

                  <span>
                    Class:{' '}
                    <strong className="text-white">
                      {classInfo?.name || student.classEnrollments?.[0]?.class?.name || student.className || 'Assigned Class'}
                      {classInfo?.section ? ` (${classInfo.section})` : ''}
                    </strong>
                  </span>

                  <span>
                    Gender: <strong className="text-white">{student.gender || '—'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="secondary"
                size="sm"
                icon={<FileText size={14} />}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                onClick={() => onOpenAdmissionLetter(student)}
              >
                Admission Letter
              </Button>
              {onOpenEndorsement && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Award size={14} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                  onClick={() => onOpenEndorsement(student)}
                >
                  Endorse
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <User size={14} />
            Student Profile
          </button>

          <button
            onClick={() => setActiveTab('guardians')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guardians'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Users size={14} />
            Guardians & Contacts ({guardians.length})
          </button>

          <button
            onClick={() => setActiveTab('academic')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'academic'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <BookOpen size={14} />
            Academic & Enrollment
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Clock size={14} />
            Attendance History
          </button>
        </div>

        {/* Tab 1: Profile & Demographics */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Date of Birth
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Blood Group / Genotype
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.bloodGroup || '—'} {student.genotype ? `(${student.genotype})` : ''}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Nationality / State
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.nationality || 'Nigerian'}{student.stateOfOrigin ? `, ${student.stateOfOrigin}` : ''}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  L.G.A / Origin
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.lga || '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Religion
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.religion || '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Admission Date
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.admissionDate ? formatDate(student.admissionDate) : '—'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Residential Address
              </span>
              <p className="text-sm text-slate-800 flex items-start gap-1.5">
                <MapPin size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                {student.address || 'No residential address recorded on file.'}
              </p>
            </div>

            {student.medicalCondition && (
              <div className="bg-amber-50 p-3.5 rounded-lg border border-amber-200 text-amber-900 text-xs">
                <span className="font-bold uppercase tracking-wider block mb-0.5 text-amber-800">
                  Medical Notice / Condition
                </span>
                {student.medicalCondition}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Guardians & Contacts */}
        {activeTab === 'guardians' && (
          <div className="space-y-3">
            {guardians.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                No guardian records registered for this student.
              </div>
            )}

            {guardians.map((g: any, index: number) => (
              <div
                key={g.id || index}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {g.firstName} {g.lastName}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {g.relationship || 'Guardian'}
                    </span>
                    {g.isPrimary && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Primary Contact
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    {g.phone && (
                      <a
                        href={`tel:${g.phone}`}
                        className="flex items-center gap-1 text-blue-600 hover:underline font-mono"
                      >
                        <Phone size={13} />
                        {g.phone}
                      </a>
                    )}
                    {g.email && (
                      <a
                        href={`mailto:${g.email}`}
                        className="flex items-center gap-1 text-slate-500 hover:underline"
                      >
                        <Mail size={13} />
                        {g.email}
                      </a>
                    )}
                    {g.occupation && (
                      <span className="text-slate-400">
                        Occupation: {g.occupation}
                      </span>
                    )}
                  </div>

                  {g.address && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 pt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                      {g.address}
                    </p>
                  )}
                </div>

                {g.phone && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${g.phone}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    >
                      <Phone size={13} />
                      Call
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Academic & Enrollment */}
        {activeTab === 'academic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Current Class
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {classInfo?.name || student.classEnrollments?.[0]?.class?.name || student.className || '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Section / Arm
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {classInfo?.section || student.classEnrollments?.[0]?.class?.section || 'Default'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Academic Session
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {sessionInfo?.name || '2026/2027'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Academic Term
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {termInfo?.name || 'Current Term'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Enrollment Status
                </span>
                <span className="text-sm font-semibold text-emerald-700">
                  Active Enrollment
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Previous School
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student.previousSchool || '—'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to={`/app/results?classId=${classInfo?.id}&studentId=${student.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                <Award size={14} />
                Open Student Gradebook & Report Sheet &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Tab 4: Attendance History */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-xl font-bold text-emerald-700 block">{presentCount}</span>
                <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">Present</span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <span className="text-xl font-bold text-rose-700 block">{absentCount}</span>
                <span className="text-[11px] text-rose-600 font-semibold uppercase tracking-wider">Absent</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <span className="text-xl font-bold text-amber-700 block">{lateCount}</span>
                <span className="text-[11px] text-amber-600 font-semibold uppercase tracking-wider">Late</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <span className="text-xl font-bold text-blue-700 block">{excusedCount}</span>
                <span className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider">Excused</span>
              </div>
            </div>

            {totalAttendance > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span>Term Attendance Rate</span>
                  <span className="text-emerald-700 font-bold">{attendanceRate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                No archived attendance sessions for this term yet.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
