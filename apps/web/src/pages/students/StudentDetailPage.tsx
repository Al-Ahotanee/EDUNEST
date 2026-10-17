import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Users,
  CreditCard,
  Calendar,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Contact,
  Printer,
} from 'lucide-react';
import { studentsApi, schoolsApi } from '../../services/api';
import { PageLoader, Badge, Card, Button } from '../../components/ui';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { IDCardModal, StudentIDCardData } from '../../components/idcard';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'guardians' | 'finance' | 'attendance'>('overview');
  const [showIDCard, setShowIDCard] = useState(false);

  // Fetch school branding for the ID card
  const { data: school } = useQuery({
    queryKey: ['current-school'],
    queryFn: async () => {
      const res = await schoolsApi.current();
      return res.data?.data || res.data;
    },
  });

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      if (!id) throw new Error('Student ID required');
      const res = await studentsApi.get(id);
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;

  if (isError || !student) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <AlertCircle size={48} className="mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">Student Not Found</h2>
        <p className="text-slate-500 text-sm">
          The student profile you are looking for does not exist or you do not have permission to view it.
        </p>
        <Button variant="primary" onClick={() => navigate('/app/students')}>
          Return to Students
        </Button>
      </div>
    );
  }

  const currentEnrollment = student.enrollments?.[0];
  const className = currentEnrollment?.class?.name
    ? `${currentEnrollment.class.name}${currentEnrollment.class.arm ? ` - ${currentEnrollment.class.arm}` : ''}`
    : 'Not Assigned';

  const totalInvoiced = (student.feeInvoices || []).reduce((acc: number, inv: any) => acc + (Number(inv.totalAmount) || 0), 0);
  const totalPaid = (student.feeInvoices || []).reduce((acc: number, inv: any) => acc + (Number(inv.amountPaid) || 0), 0);
  const outstandingBalance = (student.feeInvoices || []).reduce((acc: number, inv: any) => acc + (Number(inv.balance) || 0), 0);

  const attendanceRecords = student.attendance || [];
  const presentCount = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter((a: any) => a.status === 'ABSENT').length;
  const lateCount = attendanceRecords.filter((a: any) => a.status === 'LATE').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/students')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Students
        </button>
      </div>

      {/* Profile Header Banner */}
      <div className="card p-6 border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-blue-500/20">
              {student.firstName?.[0]}
              {student.lastName?.[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900">
                  {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                </h1>
                <Badge status={student.status || 'ACTIVE'} />
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span>Admission No: <strong className="text-slate-700 font-mono">{student.admissionNumber}</strong></span>
                <span>•</span>
                <span>Class: <strong className="text-slate-700">{className}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto">
            <Link to={`/app/results`} className="btn btn-secondary text-xs">
              <FileText size={16} /> Results
            </Link>
            <Link to={`/app/finance/invoices?studentId=${student.id}`} className="btn btn-primary text-xs">
              <CreditCard size={16} /> Invoices
            </Link>
            <button
              onClick={() => setShowIDCard(true)}
              className="btn btn-secondary text-xs"
              title="View / Print ID Card"
            >
              <Contact size={16} /> ID Card
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Biodata', icon: <User size={16} /> },
            { id: 'academic', label: 'Academic & Classes', icon: <GraduationCap size={16} /> },
            { id: 'guardians', label: `Guardians (${student.guardians?.length || 0})`, icon: <Users size={16} /> },
            { id: 'finance', label: 'Finances & Fees', icon: <CreditCard size={16} /> },
            { id: 'attendance', label: 'Attendance Records', icon: <Calendar size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview & Biodata */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium">Full Name</p>
                <p className="font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Gender</p>
                <p className="font-semibold text-slate-800 capitalize">{student.gender?.toLowerCase() || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Date of Birth</p>
                <p className="font-semibold text-slate-800">{formatDate(student.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Nationality</p>
                <p className="font-semibold text-slate-800">{student.nationality || 'Nigerian'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">State of Origin</p>
                <p className="font-semibold text-slate-800">{student.state || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">City</p>
                <p className="font-semibold text-slate-800">{student.city || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 font-medium">Residential Address</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                  {student.address || 'No address provided'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Heart size={18} className="text-rose-500" />
              Health & Emergency Details
            </h3>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium">Blood Group</p>
                <p className="font-semibold text-slate-800">{student.bloodGroup || 'Not Recorded'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Genotype</p>
                <p className="font-semibold text-slate-800">{student.genotype || 'Not Recorded'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 font-medium">Known Allergies</p>
                <p className="font-semibold text-slate-800">{student.allergies || 'None reported'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 font-medium">Medical Notes</p>
                <p className="text-slate-700 mt-0.5">{student.medicalNotes || 'No specific medical notes.'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 font-medium">Emergency Contact</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  {student.emergencyContact || '—'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Academic & Classes */}
      {activeTab === 'academic' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <GraduationCap size={18} className="text-blue-600" />
            Class Enrollment History
          </h3>
          {student.enrollments?.length ? (
            <div className="divide-y divide-slate-100">
              {student.enrollments.map((enr: any) => (
                <div key={enr.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">
                      {enr.class?.name} {enr.class?.arm ? `(${enr.class.arm})` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      Academic Session: {enr.academicSession?.name || 'Current'}
                      {enr.rollNumber && ` • Roll No: ${enr.rollNumber}`}
                    </p>
                  </div>
                  <Badge status={enr.status || 'ACTIVE'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">No class enrollments recorded yet.</p>
          )}
        </Card>
      )}

      {/* Tab 3: Guardians */}
      {activeTab === 'guardians' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {student.guardians?.length ? (
            student.guardians.map((g: any) => (
              <Card key={g.id} className="p-6 space-y-3 border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      {g.name?.[0] || 'G'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{g.name}</h4>
                      <p className="text-xs text-slate-500 capitalize">{g.relationship || 'Guardian'}</p>
                    </div>
                  </div>
                  {g.isPrimary && <Badge status="ACTIVE" label="Primary Guardian" />}
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {g.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      <span>{g.phone}</span>
                    </div>
                  )}
                  {g.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={14} className="text-slate-400" />
                      <span>{g.email}</span>
                    </div>
                  )}
                  {g.occupation && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="font-medium text-slate-400">Occupation:</span>
                      <span>{g.occupation}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-2 card p-8 text-center text-slate-500 text-sm">
              No guardians linked to this student yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Finances & Fees */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase">Total Invoiced</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-emerald-600 font-semibold uppercase">Total Paid</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-rose-500 font-semibold uppercase">Outstanding Balance</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(outstandingBalance)}</p>
            </div>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                Fee Invoices & Payment Status
              </span>
              <Link to="/app/finance/invoices" className="text-xs text-blue-600 hover:underline">
                View all in Finance &rarr;
              </Link>
            </h3>

            {student.feeInvoices?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {student.feeInvoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-3 px-3 text-emerald-600 font-semibold">{formatCurrency(inv.amountPaid)}</td>
                        <td className="py-3 px-3 text-rose-600 font-semibold">{formatCurrency(inv.balance)}</td>
                        <td className="py-3 px-3">
                          <Badge status={inv.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No invoices created for this student yet.</p>
            )}
          </Card>
        </div>
      )}

      {/* Tab 5: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Present (Recent)</p>
                <p className="text-xl font-bold text-slate-800">{presentCount} days</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <XCircle size={24} className="text-rose-500" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Absent (Recent)</p>
                <p className="text-xl font-bold text-slate-800">{absentCount} days</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <Clock size={24} className="text-amber-500" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Late (Recent)</p>
                <p className="text-xl font-bold text-slate-800">{lateCount} days</p>
              </div>
            </div>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Recent Attendance History (Last 30 Records)
            </h3>
            {attendanceRecords.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceRecords.map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-800">{formatDate(att.date)}</td>
                        <td className="py-3 px-3">
                          <Badge status={att.status} />
                        </td>
                        <td className="py-3 px-3 text-slate-500">{att.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No attendance records found.</p>
            )}
          </Card>
        </div>
      )}

      {/* ─── ID Card Modal ─── */}
      <IDCardModal
        open={showIDCard}
        onClose={() => setShowIDCard(false)}
        type="student"
        canPrint={
          user?.isSuperAdmin ||
          user?.roles?.some((r) => r.name === 'Super Admin' || r.name === 'Class Master')
        }
        viewerRoleLabel={user?.isSuperAdmin ? 'School Admin' : user?.roles?.[0]?.name || 'User'}
        studentData={{
          schoolName: school?.name || user?.school?.name || user?.tenant?.name || 'EduNest School',
          schoolLogo: school?.logo || user?.tenant?.logo,
          schoolMotto: school?.motto,
          schoolAddress: school?.address,
          schoolPhone: school?.phone,
          schoolEmail: school?.email,
          primaryColor: user?.tenant?.primaryColor || '#2563eb',
          secondaryColor: user?.tenant?.secondaryColor || '#7e3af2',
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          otherName: student.middleName || student.otherName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          bloodGroup: student.bloodGroup,
          className: currentEnrollment?.class?.name || className,
          status: student.status,
          photo: student.photo,
          issueDate: student.admissionDate || new Date().toISOString(),
          expiryDate: '2027-08-31',
          signatureLine: 'Principal',
        }}
      />
    </div>
  );
}
