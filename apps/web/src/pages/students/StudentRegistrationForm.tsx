import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, CheckCircle2, Printer, Search, Check,
  FileCheck, UserPlus, AlertCircle, RefreshCw, Eye, Sparkles, Building2,
  Calendar, Shield, GraduationCap, X, FileText
} from 'lucide-react';
import { studentsApi, schoolsApi, academicApi, uploadApi } from '../../services/api';
import { SchoolLogoImage } from '../../components/common/SchoolLogoImage';
import toast from 'react-hot-toast';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

const RELIGIONS = ['Islam', 'Christianity', 'Traditional', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

interface StudentRegistrationFormProps {
  onBack: () => void;
  onSuccess?: (student: any) => void;
  initialData?: any;
}

export default function StudentRegistrationForm({ onBack, onSuccess, initialData }: StudentRegistrationFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch school branding
  const { data: school } = useQuery({
    queryKey: ['current-school-registration'],
    queryFn: async () => {
      const res = await schoolsApi.current();
      return res.data?.data || res.data;
    },
  });

  // Fetch classes for assignment
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ['classes-for-registration'],
    queryFn: () => academicApi.classes().then((r) => r.data?.data || r.data || []),
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // Fetch auto-generated admission number if creating new student
  const { data: admNoData, refetch: refetchAdmNo } = useQuery({
    queryKey: ['gen-adm-no'],
    queryFn: () => studentsApi.genAdmNo().then((r) => r.data),
    enabled: !initialData,
  });

  const [form, setForm] = useState({
    admissionNumber: initialData?.admissionNumber || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    otherName: initialData?.otherName || '',
    gender: initialData?.gender || 'MALE',
    dateOfBirth: initialData?.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : '',
    bloodGroup: initialData?.bloodGroup || '',
    genotype: initialData?.genotype || '',
    stateOfOrigin: initialData?.stateOfOrigin || '',
    lga: initialData?.lga || '',
    religion: initialData?.religion || '',
    tribe: initialData?.tribe || '',
    nationality: initialData?.nationality || 'Nigerian',
    address: initialData?.address || '',
    photo: initialData?.photo || '',
    status: initialData?.status || 'ACTIVE',
    classId: initialData?.classEnrollments?.[0]?.classId || '',
    boardingDay: 'Day',
    previousSchool: initialData?.previousSchool || '',
    previousClass: initialData?.previousClass || '',
    medicalCondition: initialData?.medicalCondition || '',
    // Parent / Guardian
    parentName: initialData?.guardians?.[0] ? `${initialData.guardians[0].firstName} ${initialData.guardians[0].lastName}` : '',
    parentRelationship: initialData?.guardians?.[0]?.relationship || 'Father',
    parentPhone: initialData?.guardians?.[0]?.phone || '',
    parentEmail: initialData?.guardians?.[0]?.email || '',
    parentOccupation: initialData?.guardians?.[0]?.occupation || '',
    parentAddress: initialData?.guardians?.[0]?.address || '',
    // Emergency Contact
    emergencyContact: '',
    emergencyRelationship: 'Mother',
    emergencyPhone: '',
    // Documents
    birthCertificate: initialData?.birthCertificate || '',
    immunizationCard: initialData?.immunizationCard || '',
    lastReportCard: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.photo || '');
  const [docNames, setDocNames] = useState<Record<string, string>>({});
  const [submittedStudent, setSubmittedStudent] = useState<any>(null);

  const passportInputRef = useRef<HTMLInputElement>(null);
  const birthCertInputRef = useRef<HTMLInputElement>(null);
  const immunizationInputRef = useRef<HTMLInputElement>(null);
  const reportCardInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate admission number when generated
  useEffect(() => {
    if (admNoData?.admissionNumber && !form.admissionNumber && !initialData) {
      setForm((f) => ({ ...f, admissionNumber: admNoData.admissionNumber }));
    }
  }, [admNoData, initialData]);

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Passport photo upload with base64 + universal uploadApi
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setField('photo', base64);
      try {
        const url = await uploadApi.uploadBase64(base64, file.name, 'images');
        if (url) setField('photo', url);
      } catch {}
      toast.success('Passport photo attached!');
    };
    reader.readAsDataURL(file);
  };

  // Document upload handler
  const handleDocUpload = (key: 'birthCertificate' | 'immunizationCard' | 'lastReportCard', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Document must be under 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setField(key, base64);
      setDocNames((prev) => ({ ...prev, [key]: file.name }));
      try {
        const url = await uploadApi.uploadDocument(base64, file.name);
        if (url) setField(key, url);
      } catch {}
      toast.success(`${file.name} attached!`);
    };
    reader.readAsDataURL(file);
  };

  const primaryColor = school?.primaryColor || '#1a56db';
  const secondaryColor = school?.secondaryColor || '#7e3af2';

  // Submission mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (initialData?.id) {
        return studentsApi.update(initialData.id, payload);
      }
      return studentsApi.create(payload);
    },
    onSuccess: (res) => {
      const student = res.data?.data || res.data;
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-stats'] });
      toast.success(initialData ? 'Student record updated successfully!' : 'Student registered and enrolled successfully!');
      if (onSuccess) onSuccess(student);
      setSubmittedStudent(student);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register student. Please check required fields.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Please enter the student\'s first and last name');
      return;
    }
    if (!form.admissionNumber.trim()) {
      toast.error('Admission number is required');
      return;
    }
    if (!form.dateOfBirth) {
      toast.error('Please enter date of birth');
      return;
    }

    // Build guardians array
    const guardians: any[] = [];
    if (form.parentName.trim()) {
      const parts = form.parentName.trim().split(' ');
      const pFirst = parts[0] || 'Guardian';
      const pLast = parts.slice(1).join(' ') || parts[0];
      guardians.push({
        firstName: pFirst,
        lastName: pLast,
        relationship: form.parentRelationship || 'Father',
        phone: form.parentPhone || '',
        email: form.parentEmail || undefined,
        address: form.parentAddress || form.address || undefined,
        occupation: form.parentOccupation || undefined,
        isPrimary: true,
        isEmergency: false,
      });
    }

    if (form.emergencyContact.trim()) {
      const parts = form.emergencyContact.trim().split(' ');
      guardians.push({
        firstName: parts[0] || 'Emergency',
        lastName: parts.slice(1).join(' ') || 'Contact',
        relationship: form.emergencyRelationship || 'Mother',
        phone: form.emergencyPhone || form.parentPhone || '',
        isPrimary: false,
        isEmergency: true,
      });
    }

    const payload = {
      admissionNumber: form.admissionNumber.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      otherName: form.otherName.trim() || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      bloodGroup: form.bloodGroup || undefined,
      genotype: form.genotype || undefined,
      stateOfOrigin: form.stateOfOrigin || undefined,
      lga: form.lga || undefined,
      religion: form.religion || undefined,
      tribe: form.tribe || undefined,
      nationality: form.nationality || 'Nigerian',
      address: form.address || undefined,
      photo: form.photo || undefined,
      status: form.status,
      classId: form.classId || undefined,
      previousSchool: form.previousSchool || undefined,
      previousClass: form.previousClass || undefined,
      medicalCondition: form.medicalCondition || undefined,
      birthCertificate: form.birthCertificate || undefined,
      immunizationCard: form.immunizationCard || undefined,
      guardians: guardians.length > 0 ? guardians : undefined,
    };

    createMutation.mutate(payload);
  };

  const handleRegisterAnother = () => {
    setSubmittedStudent(null);
    setPhotoPreview('');
    setDocNames({});
    setForm({
      admissionNumber: '',
      firstName: '',
      lastName: '',
      otherName: '',
      gender: 'MALE',
      dateOfBirth: '',
      bloodGroup: '',
      genotype: '',
      stateOfOrigin: '',
      lga: '',
      religion: '',
      tribe: '',
      nationality: 'Nigerian',
      address: '',
      photo: '',
      status: 'ACTIVE',
      classId: '',
      boardingDay: 'Day',
      previousSchool: '',
      previousClass: '',
      medicalCondition: '',
      parentName: '',
      parentRelationship: 'Father',
      parentPhone: '',
      parentEmail: '',
      parentOccupation: '',
      parentAddress: '',
      emergencyContact: '',
      emergencyRelationship: 'Mother',
      emergencyPhone: '',
      birthCertificate: '',
      immunizationCard: '',
      lastReportCard: '',
    });
    refetchAdmNo();
  };

  // ─── SUCCESS VIEW ────────────────────────────────────────────────────────────
  if (submittedStudent) {
    const assignedClass = classes.find((c: any) => c.id === form.classId)?.name || 'Class Assigned';
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 font-sans animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}15)` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg" style={{ background: primaryColor }}>
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Student Successfully Registered!</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">Official Institutional Admission & Class Enrollment Slip</p>
          </div>

          {/* Registration Slip Content */}
          <div className="p-8 print:p-0 space-y-8" id="printable-registration-slip">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4 text-center sm:text-left">
                {form.photo ? (
                  <img src={form.photo} alt="Student" className="w-24 h-28 object-cover rounded-xl border-2 border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-24 h-28 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <GraduationCap size={28} />
                    <span className="text-[10px] mt-1">No Photo</span>
                  </div>
                )}
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {submittedStudent.status || 'Active Student'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {submittedStudent.firstName} {submittedStudent.otherName ? `${submittedStudent.otherName} ` : ''}{submittedStudent.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Admission No: <strong className="text-slate-800">{submittedStudent.admissionNumber}</strong>
                  </p>
                  <p className="text-xs font-semibold text-blue-600 mt-1">
                    Class: {assignedClass}
                  </p>
                </div>
              </div>

              {/* School Crest & Info */}
              <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
                <SchoolLogoImage logo={school?.logo} name={school?.name} size="md" className="rounded-xl shadow-xs mb-1" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">{school?.name || 'School'}</h3>
                {school?.motto && <p className="text-[11px] italic text-slate-500">"{school.motto}"</p>}
                <p className="text-[10px] text-slate-400 mt-1">Session: {new Date().getFullYear()}/{new Date().getFullYear() + 1}</p>
              </div>
            </div>

            {/* Grid Bio-data Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Gender</span>
                <span className="font-bold text-slate-800">{submittedStudent.gender}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Date of Birth</span>
                <span className="font-bold text-slate-800">{form.dateOfBirth || '—'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Blood Group</span>
                <span className="font-bold text-slate-800">{form.bloodGroup || '—'} ({form.genotype || '—'})</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Origin</span>
                <span className="font-bold text-slate-800">{form.stateOfOrigin ? `${form.stateOfOrigin} State` : '—'}</span>
              </div>
            </div>

            {/* Guardian & Emergency Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-600" /> Primary Guardian Information
                </h4>
                <p className="font-semibold text-slate-900">{form.parentName || 'None recorded'}</p>
                <p className="text-slate-500 mt-0.5">Phone: <strong>{form.parentPhone || '—'}</strong></p>
                {form.parentEmail && <p className="text-slate-500">Email: {form.parentEmail}</p>}
                {form.parentOccupation && <p className="text-slate-500">Occupation: {form.parentOccupation}</p>}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-500" /> Emergency & Medical Record
                </h4>
                <p className="text-slate-700">Contact: <strong>{form.emergencyContact || form.parentName || 'Primary Guardian'}</strong></p>
                <p className="text-slate-500">Emergency Tel: <strong>{form.emergencyPhone || form.parentPhone || '—'}</strong></p>
                <p className="text-slate-500 mt-1">Medical Conditions: <em>{form.medicalCondition || 'None declared'}</em></p>
              </div>
            </div>

            {/* Official Stamps / Signature Section */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="h-12 border-b border-slate-300 w-48 mx-auto" />
                <p className="mt-2 font-bold text-slate-700 uppercase">Admissions Officer / Teacher</p>
                <p className="text-[10px] text-slate-400">Date & Signature</p>
              </div>
              <div>
                <div className="h-12 border-b border-slate-300 w-48 mx-auto" />
                <p className="mt-2 font-bold text-slate-700 uppercase">Principal / School Registrar</p>
                <p className="text-[10px] text-slate-400">Official Stamp & Seal</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Student Roster
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-semibold text-xs bg-white hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Registration Slip
              </button>
              <button
                type="button"
                onClick={handleRegisterAnother}
                className="px-4 py-2.5 rounded-xl text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                style={{ background: primaryColor }}
              >
                <UserPlus size={14} /> Register Another Student
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN FORM VIEW ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 font-sans animate-in fade-in duration-200">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={16} /> ← Back to Student Roster
        </button>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Institutional Student Enrollment
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Official School Header */}
        <div
          className="p-8 text-center border-b-4 relative"
          style={{ borderColor: primaryColor, background: `linear-gradient(to bottom, ${primaryColor}10, white)` }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Admission Number</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="text"
                  required
                  value={form.admissionNumber}
                  onChange={(e) => setField('admissionNumber', e.target.value)}
                  placeholder="Generating..."
                  className="font-mono font-black text-sm px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 w-36 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => refetchAdmNo()}
                  title="Regenerate admission number"
                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* School Crest */}
            <div className="flex flex-col items-center">
              <SchoolLogoImage logo={school?.logo} name={school?.name} size="lg" className="rounded-2xl shadow-md mb-2" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">{school?.name || 'EduNest School'}</h1>
              {school?.address && <p className="text-xs text-slate-500 max-w-md">{school.address}</p>}
              {school?.motto && <p className="text-xs italic text-slate-500 mt-0.5">"{school.motto}"</p>}
            </div>

            <div className="text-center sm:text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Academic Session</span>
              <p className="text-sm font-black text-slate-700 mt-1 font-mono">
                {new Date().getFullYear()}/{new Date().getFullYear() + 1}
              </p>
            </div>
          </div>

          <div className="mt-4 inline-block border-2 border-dashed rounded-xl px-6 py-1.5" style={{ borderColor: primaryColor }}>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>
              Official Student Registration & Bio-Data Form
            </p>
          </div>
        </div>

        {/* The Full Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-10">

          {/* ── SECTION A: STUDENT DETAILS ── */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-xl text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ background: primaryColor }}
              >
                A
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Student / Pupil Bio-Data</h2>
                <p className="text-xs text-slate-400">Personal identity and demographic background</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Form fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Surname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                    placeholder="e.g. Ibrahim"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    placeholder="e.g. Amina"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Other Names</label>
                  <input
                    type="text"
                    value={form.otherName}
                    onChange={(e) => setField('otherName', e.target.value)}
                    placeholder="Middle name"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setField('gender', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => setField('dateOfBirth', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setField('bloodGroup', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Genotype</label>
                  <select
                    value={form.genotype}
                    onChange={(e) => setField('genotype', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="">Select Genotype</option>
                    {GENOTYPES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">State of Origin</label>
                  <select
                    value={form.stateOfOrigin}
                    onChange={(e) => setField('stateOfOrigin', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="">Select State</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">L.G.A.</label>
                  <input
                    type="text"
                    value={form.lga}
                    onChange={(e) => setField('lga', e.target.value)}
                    placeholder="Local Govt Area"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Religion</label>
                  <select
                    value={form.religion}
                    onChange={(e) => setField('religion', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="">Select Religion</option>
                    {RELIGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Tribe / Ethnicity</label>
                  <input
                    type="text"
                    value={form.tribe}
                    onChange={(e) => setField('tribe', e.target.value)}
                    placeholder="e.g. Hausa, Yoruba, Igbo"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Nationality</label>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={(e) => setField('nationality', e.target.value)}
                    placeholder="Nigerian"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Full residential street address"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Known Medical Condition / Special Needs / Allergies
                  </label>
                  <textarea
                    rows={2}
                    value={form.medicalCondition}
                    onChange={(e) => setField('medicalCondition', e.target.value)}
                    placeholder="Enter any asthma, sight issues, dietary restrictions, or write NONE"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Passport Photo Box */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <input
                  type="file"
                  ref={passportInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div
                  onClick={() => passportInputRef.current?.click()}
                  className="w-36 h-44 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 cursor-pointer transition-all relative overflow-hidden group shadow-xs"
                  title="Click to upload student passport photo"
                >
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Passport" className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                        Change Photo
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                        <Upload size={18} className="text-slate-500 group-hover:text-blue-600" />
                      </div>
                      <p className="text-xs text-slate-700 font-bold">Passport Photo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG max 5MB</p>
                      <span className="text-[10px] text-blue-600 font-semibold mt-2 bg-white px-2 py-0.5 rounded border border-blue-200">
                        Click to Upload
                      </span>
                    </>
                  )}
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(''); setField('photo', ''); }}
                    className="text-xs text-red-500 hover:text-red-700 mt-2 font-medium"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION B: ACADEMIC PLACEMENT ── */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-xl text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ background: primaryColor }}
              >
                B
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Academic Placement & Class Enrollment</h2>
                <p className="text-xs text-slate-400">Assign student to active class roster and billing schedule</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Assign to Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.classId}
                  onChange={(e) => setField('classId', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-semibold"
                >
                  <option value="">— Select Class Roster —</option>
                  {classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section ? `(${cls.section})` : ''} — Level {cls.level}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Student will be immediately enrolled into this class.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Day / Boarding Status</label>
                <select
                  value={form.boardingDay}
                  onChange={(e) => setField('boardingDay', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="Day">Day Student</option>
                  <option value="Boarding">Boarding Student</option>
                  <option value="Weekly Boarding">Weekly Boarding</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Student Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-semibold text-emerald-700"
                >
                  <option value="ACTIVE">ACTIVE (Enrolled)</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TRANSFERRED">TRANSFERRED</option>
                  <option value="GRADUATED">GRADUATED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Previous School Attended</label>
                <input
                  type="text"
                  value={form.previousSchool}
                  onChange={(e) => setField('previousSchool', e.target.value)}
                  placeholder="Last school attended (if transfer)"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Previous Class / Grade</label>
                <input
                  type="text"
                  value={form.previousClass}
                  onChange={(e) => setField('previousClass', e.target.value)}
                  placeholder="e.g. Primary 6 or JSS 2"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION C: PARENT / GUARDIAN ── */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-xl text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ background: primaryColor }}
              >
                C
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Parent / Primary Guardian Details</h2>
                <p className="text-xs text-slate-400">Used for parent portal accounts, fee invoices, and SMS/email notifications</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Parent / Guardian Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.parentName}
                  onChange={(e) => setField('parentName', e.target.value)}
                  placeholder="e.g. Alhaji Sani Ibrahim"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Relationship</label>
                <select
                  value={form.parentRelationship}
                  onChange={(e) => setField('parentRelationship', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Legal Guardian</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Sponsor">Corporate / NGO Sponsor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Primary Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.parentPhone}
                  onChange={(e) => setField('parentPhone', e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Parent Email Address</label>
                <input
                  type="email"
                  value={form.parentEmail}
                  onChange={(e) => setField('parentEmail', e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Occupation / Profession</label>
                <input
                  type="text"
                  value={form.parentOccupation}
                  onChange={(e) => setField('parentOccupation', e.target.value)}
                  placeholder="e.g. Engineer / Civil Servant"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Office / Residential Address</label>
                <input
                  type="text"
                  value={form.parentAddress}
                  onChange={(e) => setField('parentAddress', e.target.value)}
                  placeholder="Guardian residential or work address"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION D: EMERGENCY CONTACT ── */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-xl text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ background: primaryColor }}
              >
                D
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Emergency Contact Information</h2>
                <p className="text-xs text-slate-400">Alternative individual to reach when parents are unreachable</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={form.emergencyContact}
                  onChange={(e) => setField('emergencyContact', e.target.value)}
                  placeholder="Full name of emergency person"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Relationship</label>
                <select
                  value={form.emergencyRelationship}
                  onChange={(e) => setField('emergencyRelationship', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Neighbor">Neighbor / Family Friend</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Emergency Phone Number</label>
                <input
                  type="tel"
                  value={form.emergencyPhone}
                  onChange={(e) => setField('emergencyPhone', e.target.value)}
                  placeholder="08098765432"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION E: DOCUMENTS ── */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-xl text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ background: primaryColor }}
              >
                E
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Supporting Documents (Optional)</h2>
                <p className="text-xs text-slate-400">Attach scanned birth certificate, health record, or transfer certificate</p>
              </div>
            </div>

            <input
              type="file"
              ref={birthCertInputRef}
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleDocUpload('birthCertificate', e)}
              className="hidden"
            />
            <input
              type="file"
              ref={immunizationInputRef}
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleDocUpload('immunizationCard', e)}
              className="hidden"
            />
            <input
              type="file"
              ref={reportCardInputRef}
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleDocUpload('lastReportCard', e)}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Birth Certificate */}
              <div
                onClick={() => birthCertInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  docNames['birthCertificate'] || form.birthCertificate
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50'
                }`}
              >
                {docNames['birthCertificate'] || form.birthCertificate ? (
                  <>
                    <FileCheck size={24} className="mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs text-emerald-800 font-bold truncate">
                      {docNames['birthCertificate'] || 'Birth Certificate Attached'}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ Attached</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="mx-auto mb-1.5 text-slate-400" />
                    <p className="text-xs text-slate-700 font-bold">Birth Certificate</p>
                    <p className="text-[11px] text-slate-400">or Declaration of Age</p>
                    <span className="text-[10px] text-blue-600 font-semibold mt-1.5 inline-block bg-white px-2 py-0.5 rounded border border-blue-200">
                      Upload PDF/Image
                    </span>
                  </>
                )}
              </div>

              {/* Immunization Card */}
              <div
                onClick={() => immunizationInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  docNames['immunizationCard'] || form.immunizationCard
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50'
                }`}
              >
                {docNames['immunizationCard'] || form.immunizationCard ? (
                  <>
                    <FileCheck size={24} className="mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs text-emerald-800 font-bold truncate">
                      {docNames['immunizationCard'] || 'Health Card Attached'}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ Attached</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="mx-auto mb-1.5 text-slate-400" />
                    <p className="text-xs text-slate-700 font-bold">Immunization Card</p>
                    <p className="text-[11px] text-slate-400">or Medical Certificate</p>
                    <span className="text-[10px] text-blue-600 font-semibold mt-1.5 inline-block bg-white px-2 py-0.5 rounded border border-blue-200">
                      Upload PDF/Image
                    </span>
                  </>
                )}
              </div>

              {/* Previous Report Card */}
              <div
                onClick={() => reportCardInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  docNames['lastReportCard']
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50'
                }`}
              >
                {docNames['lastReportCard'] ? (
                  <>
                    <FileCheck size={24} className="mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs text-emerald-800 font-bold truncate">
                      {docNames['lastReportCard']}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ Attached</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="mx-auto mb-1.5 text-slate-400" />
                    <p className="text-xs text-slate-700 font-bold">Previous Report Card</p>
                    <p className="text-[11px] text-slate-400">or Transfer Certificate</p>
                    <span className="text-[10px] text-blue-600 font-semibold mt-1.5 inline-block bg-white px-2 py-0.5 rounded border border-blue-200">
                      Upload PDF/Image
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── ACTION FOOTER ── */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Cancel & Discard
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: primaryColor }}
              >
                {createMutation.isPending ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enrolling Student...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>{initialData ? 'Update Student Record' : 'Register & Auto-Enroll Student'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
