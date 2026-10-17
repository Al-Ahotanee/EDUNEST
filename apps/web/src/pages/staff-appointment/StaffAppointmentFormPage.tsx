import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  GraduationCap, Camera, Printer, Save, FileText, Briefcase, User,
  Phone, Mail, MapPin, Award, Shield, Calendar, DollarSign, X,
} from 'lucide-react';
import { Button, Modal, Input, Select, PageLoader } from '../../components/ui';
import { hrApi, academicApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { EduNestIcon } from '../../components/common/EduNestLogo';

export default function StaffAppointmentFormPage() {
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: 'EduNest School' };
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [savedStaff, setSavedStaff] = useState<any>(null);

  const form = useForm({
    defaultValues: {
      staffId: '', firstName: '', lastName: '', gender: 'MALE',
      designation: '', departmentId: '', employmentType: 'FULL_TIME',
      phone: '', email: '', salary: 0, qualification: 'B.Ed (Hons)',
      specialization: '', trcnNumber: '', bankName: 'First Bank of Nigeria',
      accountNumber: '', stateOfOrigin: '', lga: '', address: '',
      emergencyContactName: '', emergencyContactPhone: '',
      employmentDate: new Date().toISOString().split('T')[0],
      photo: '',
    },
  });

  const { data: deptData } = useQuery({
    queryKey: ['depts-appointment'],
    queryFn: () => hrApi.departments().then(r => r.data?.data || r.data || []),
  });
  const departments = Array.isArray(deptData) ? deptData : [];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      form.setValue('photo', base64);
    };
    reader.readAsDataURL(file);
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => hrApi.create(data),
    onSuccess: (resp) => {
      toast.success('Staff appointment saved successfully!');
      setSavedStaff(resp.data?.data || resp.data);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-black text-center">{school.name}</h1>
        <p className="text-center text-sm">{school.address}</p>
        <h2 className="text-lg font-bold text-center mt-4">Staff Appointment & Registration Form</h2>
      </div>

      {/* Screen header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title flex items-center gap-2"><Briefcase size={24} /> Staff Appointment Form</h1>
          <p className="page-subtitle">Formal full-page staff registration with school branding, photo, and comprehensive fields</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Printer size={15} />} onClick={handlePrint}>Print</Button>
          <Button icon={<Save size={15} />} loading={saveMutation.isPending}
            onClick={form.handleSubmit(d => saveMutation.mutate(d))}>Save Appointment</Button>
        </div>
      </div>

      {/* Success banner */}
      {savedStaff && (
        <div className="card p-5 bg-emerald-50 border-emerald-200 print:hidden">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800">Staff appointment saved!</p>
              <p className="text-sm text-emerald-600">
                {savedStaff.firstName} {savedStaff.lastName} ({savedStaff.staffId}) has been registered.
              </p>
            </div>
            <Button variant="secondary" size="sm" className="ml-auto" onClick={() => window.location.href = '/app/teacher-management'}>
              View in Teacher Management
            </Button>
          </div>
        </div>
      )}

      {/* Official Form */}
      <div className="card overflow-hidden max-w-4xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {/* School Letterhead */}
        <div className="flex items-center justify-between border-b-2 pb-4 px-8 pt-6" style={{ borderColor: school.primaryColor || '#2563eb' }}>
          <div className="flex items-center gap-3">
            {school.logo ? (
              <img src={school.logo} alt="Logo" className="w-14 h-14 rounded-xl object-contain" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: school.primaryColor || '#2563eb' }}>
                <GraduationCap size={28} className="text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{school.name}</h2>
              <p className="text-xs text-slate-500">{school.address || 'School Address'}</p>
              <p className="text-xs text-slate-400">{school.phone} {school.email && `| ${school.email}`}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: school.primaryColor || '#2563eb' }}>
              Staff Appointment
            </p>
            <p className="text-xs text-slate-400">Form Ref: APPT/{new Date().getFullYear()}/{String(Date.now()).slice(-6)}</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {/* Photo + Basic Info */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-28 h-36 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Staff" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={32} className="text-slate-300" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-xs text-blue-600 hover:underline font-semibold">
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">First Name *</label>
                <input {...form.register('firstName', { required: true })} className="input mt-1" placeholder="First name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Last Name *</label>
                <input {...form.register('lastName', { required: true })} className="input mt-1" placeholder="Last name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Staff ID *</label>
                <input {...form.register('staffId', { required: true })} className="input mt-1" placeholder="e.g. STF001" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Gender</label>
                <select {...form.register('gender')} className="input mt-1">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employment Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-2">
              <Briefcase size={16} /> Employment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Designation *</label>
                <input {...form.register('designation')} className="input mt-1" placeholder="e.g. Senior Maths Teacher" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Department</label>
                <select {...form.register('departmentId')} className="input mt-1">
                  <option value="">— Select —</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Employment Type</label>
                <select {...form.register('employmentType')} className="input mt-1">
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Date of Appointment</label>
                <input type="date" {...form.register('employmentDate')} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Monthly Salary (₦)</label>
                <input type="number" {...form.register('salary', { valueAsNumber: true })} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Qualification</label>
                <input {...form.register('qualification')} className="input mt-1" placeholder="e.g. B.Sc Mathematics" />
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-2">
              <Phone size={16} /> Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
                <input {...form.register('phone')} className="input mt-1" placeholder="+234..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                <input type="email" {...form.register('email')} className="input mt-1" placeholder="staff@school.edu" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">State of Origin</label>
                <input {...form.register('stateOfOrigin')} className="input mt-1" placeholder="e.g. Lagos" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">LGA</label>
                <input {...form.register('lga')} className="input mt-1" placeholder="Local Government Area" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Residential Address</label>
                <input {...form.register('address')} className="input mt-1" placeholder="Home address" />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-2">
              <Shield size={16} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Emergency Contact Name</label>
                <input {...form.register('emergencyContactName')} className="input mt-1" placeholder="Next of kin" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Emergency Contact Phone</label>
                <input {...form.register('emergencyContactPhone')} className="input mt-1" placeholder="+234..." />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-2">
              <DollarSign size={16} /> Bank Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Bank Name</label>
                <input {...form.register('bankName')} className="input mt-1" placeholder="e.g. First Bank" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Account Number</label>
                <input {...form.register('accountNumber')} className="input mt-1" placeholder="10-digit NUBAN" />
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-2">
              <FileText size={16} /> Declaration
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              I declare that the information provided above is true and accurate to the best of my knowledge.
              I accept the appointment and agree to abide by the rules, regulations, and policies of {school.name}.
            </p>
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div className="text-center">
                <div className="border-b border-slate-400 mb-1" style={{ height: '40px' }} />
                <p className="text-xs font-bold text-slate-700">Staff Signature</p>
                <p className="text-[10px] text-slate-400">Date: _______________</p>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-400 mb-1" style={{ height: '40px' }} />
                <p className="text-xs font-bold text-slate-700">Principal / HR</p>
                <p className="text-[10px] text-slate-400">Date: _______________</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 bg-slate-50 border-t text-center">
          <p className="text-[10px] text-slate-400">
            This appointment form was generated by {school.name} EduNest School Management System.
            {' '}Form Ref: APPT/{new Date().getFullYear()}/{String(Date.now()).slice(-6)}
          </p>
        </div>
      </div>
    </div>
  );
}
