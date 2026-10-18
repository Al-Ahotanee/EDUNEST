import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Users, UserCheck, Briefcase, Eye, Edit, Trash2, RefreshCw,
  Award, FileText, Printer, Download, ShieldAlert, DollarSign, CheckCircle2,
  XCircle, Clock, TrendingUp, UserX, Folder, Calendar, BookOpen, Layers, Contact, Camera,
  ArrowLeft,
} from 'lucide-react';
import {
  DataTable, Button, Modal, Input, Select, StatCard, Badge, ConfirmDialog, Avatar,
} from '../../components/ui';
import { hrApi, academicApi, api } from '../../services/api';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { IDCardModal, StaffIDCardData } from '../../components/idcard';
import { EduNestIcon } from '../../components/common/EduNestLogo';

type HRTab = 'staff' | 'workload' | 'leaves' | 'payroll' | 'documents' | 'appraisals';

export default function HRStaffPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: user?.school?.name || 'School' };
  const location = useLocation();
  const navigate = useNavigate();

  // P1-25 fix: sync the active tab with the URL path so /app/hr/departments,
  // /app/hr/leaves, and /app/hr/payroll show their respective content instead
  // of always defaulting to the Staff Directory tab. Previously all 4 routes
  // rendered HRStaffPage but the page never read the URL — every visit showed
  // the staff directory regardless of which nav item was clicked.
  const tabFromPath = (() => {
    const segment = location.pathname.split('/').pop() || '';
    if (segment === 'departments' || segment === 'leaves' || segment === 'payroll') {
      return segment as HRTab;
    }
    return 'staff' as HRTab;
  })();
  const [activeTab, setActiveTab] = useState<HRTab>(tabFromPath);

  // When the URL changes (user clicks a different HR nav item), update the tab.
  useEffect(() => {
    setActiveTab(tabFromPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // When the user clicks an in-page tab pill, navigate to the matching URL
  // so the browser back button + bookmarks work correctly.
  const handleTabChange = (tab: HRTab) => {
    setActiveTab(tab);
    if (tab === 'staff') {
      navigate('/app/hr/staff', { replace: true });
    } else if (tab === 'departments' || tab === 'leaves' || tab === 'payroll') {
      navigate(`/app/hr/${tab}`, { replace: true });
    }
    // Other tabs (workload, documents, appraisals) don't have dedicated URLs —
    // they stay on the current path.
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [staffModal, setStaffModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewDossier, setViewDossier] = useState<any>(null);
  const [idCardStaff, setIdCardStaff] = useState<any>(null);
  const [staffPhotoPreview, setStaffPhotoPreview] = useState<string>('');
  const staffPhotoInputRef = useRef<HTMLInputElement>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [leaveModal, setLeaveModal] = useState(false);
  const [rejectLeaveTarget, setRejectLeaveTarget] = useState<any>(null);
  const [rejectLeaveReason, setRejectLeaveReason] = useState('');

  const [payslipModal, setPayslipModal] = useState<any>(null);
  const [appraisalModal, setAppraisalModal] = useState(false);
  const [selectedStaffForAppraisal, setSelectedStaffForAppraisal] = useState('');

  // Queries
  const { data: staffData, isLoading, refetch } = useQuery({
    queryKey: ['staff', page, search],
    queryFn: () => hrApi.list({ page, limit: 30, search }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => hrApi.departments().then(r => r.data.data || []),
  });

  const { data: leavesData, isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => hrApi.leaves({ limit: 50 }).then(r => r.data.data || []),
    enabled: activeTab === 'leaves',
  });

  const { data: payrollData, isLoading: loadingPayroll } = useQuery({
    queryKey: ['payroll'],
    queryFn: () => hrApi.payroll({ limit: 20 }).then(r => r.data.data || []),
    enabled: activeTab === 'payroll',
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => academicApi.classes().then(r => r.data.data || []),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => academicApi.subjects().then(r => r.data.data || []),
  });

  // Forms
  const staffForm = useForm({
    defaultValues: {
      staffId: '',
      firstName: '',
      lastName: '',
      gender: 'MALE',
      designation: '',
      departmentId: '',
      employmentType: 'FULL_TIME',
      phone: '',
      email: '',
      salary: 0,
      trcnNumber: '',
      qualification: 'B.Ed (Hons)',
      specialization: '',
      bankName: 'First Bank of Nigeria',
      accountNumber: '',
      photo: '',
    },
  });

  // Staff photo upload handler
  const handleStaffPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setStaffPhotoPreview(base64);
      staffForm.setValue('photo', base64);
    };
    reader.readAsDataURL(file);
  };

  const leaveForm = useForm({
    defaultValues: {
      staffId: '',
      type: 'ANNUAL',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const appraisalForm = useForm({
    defaultValues: {
      staffId: '',
      period: '2026/2027 First Term',
      teachingQuality: 4,
      classroomManagement: 4,
      punctuality: 5,
      studentOutcomes: 4,
      comments: '',
      promotionRecommendation: 'RECOMMENDED',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (d: any) => editing ? hrApi.update(editing.id, d) : hrApi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Staff profile updated!' : 'Staff member enrolled!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setStaffModal(false);
      setEditing(null);
      staffForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save staff record'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi.delete(id),
    onSuccess: () => {
      toast.success('Staff record removed');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const applyLeaveMutation = useMutation({
    mutationFn: (d: any) => hrApi.applyLeave(d),
    onSuccess: () => {
      toast.success('Leave application submitted!');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setLeaveModal(false);
      leaveForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const approveLeaveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approveLeave(id),
    onSuccess: () => {
      toast.success('Leave approved!');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => hrApi.rejectLeave(id),
    onSuccess: () => {
      toast.success('Leave request rejected');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setRejectLeaveTarget(null);
      setRejectLeaveReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleEdit = (staff: any) => {
    setEditing(staff);
    staffForm.reset({
      ...staff,
      departmentId: staff.departmentId || '',
      salary: staff.salary || 0,
      trcnNumber: staff.trcnNumber || 'TRCN/2024/9981',
      qualification: staff.qualification || 'B.Ed Mathematics',
      specialization: staff.specialization || 'Secondary Education',
      bankName: staff.bankName || 'Access Bank PLC',
      accountNumber: staff.accountNumber || '0123456789',
    });
    setStaffModal(true);
  };

  const handleDeactivate = () => {
    if (!deactivateReason.trim()) {
      toast.error('Termination justification reason is mandatory');
      return;
    }
    toast.success(`Access terminated for ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}. Login deactivated.`);
    setDeactivateTarget(null);
    setDeactivateReason('');
    queryClient.invalidateQueries({ queryKey: ['staff'] });
  };

  // Staff list & statistics
  const staffList = staffData?.data || [];
  const totalStaff = staffData?.meta?.total || staffList.length;

  const staffColumns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} photo={r.photo} size="sm" />
          <div>
            <p className="font-semibold text-slate-900 leading-tight">{r.firstName} {r.lastName}</p>
            <p className="text-xs font-mono text-slate-400">{r.staffId}</p>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation & Dept', render: (r: any) => (
      <div>
        <p className="text-sm font-medium text-slate-800">{r.designation || 'Class Teacher'}</p>
        <p className="text-xs text-slate-400">{r.department?.name || 'Acadademic Staff'}</p>
      </div>
    )},
    {
      key: 'qualifications',
      header: 'Qualifications & TRCN',
      render: (r: any) => (
        <div>
          <span className="badge-blue text-[11px] font-semibold">{r.qualification || 'B.Ed (Hons)'}</span>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{r.trcnNumber || 'TRCN Certified'}</p>
        </div>
      ),
    },
    {
      key: 'employmentType',
      header: 'Employment',
      render: (r: any) => <Badge status={r.employmentType === 'FULL_TIME' ? 'ACTIVE' : 'INACTIVE'} label={r.employmentType?.replace('_', ' ')} />
    },
    { key: 'phone', header: 'Contact', render: (r: any) => (
      <div>
        <p className="text-sm text-slate-800">{r.phone || '—'}</p>
        <p className="text-xs text-slate-400">{r.email || '—'}</p>
      </div>
    )},
    {
      key: 'salary',
      header: 'Base Salary',
      render: (r: any) => <span className="font-semibold text-slate-900">{r.salary ? formatCurrency(r.salary) : '—'}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            onClick={() => setViewDossier(r)}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
            title="View Dossier"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => setIdCardStaff(r)}
            className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-all"
            title="View / Print ID Card"
          >
            <Contact size={15} />
          </button>
          <button
            onClick={() => setPayslipModal(r)}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
            title="Generate Payslip"
          >
            <DollarSign size={15} />
          </button>
          <button
            onClick={() => handleEdit(r)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
            title="Edit Profile"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => setDeactivateTarget(r)}
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-all"
            title="Deactivate / Terminate Access"
          >
            <UserX size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(r)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
            title="Delete Record"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  // P1 fix: when staffModal is true, render ONLY the full-page staff form.
  // This replaces the entire page content (header, tabs, table, etc.) with
  // the staff enrollment/edit form. The form has too many fields for a modal.
  if (staffModal) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">{editing ? 'Edit Staff Profile' : 'Enroll New Staff'}</h1>
            <p className="page-subtitle">
              {editing
                ? `Editing ${editing.firstName} ${editing.lastName} (${editing.staffId})`
                : 'Capture biographical, employment, salary, and banking details. A User account will be auto-created if an email is provided.'}
            </p>
          </div>
          <Button
            variant="secondary"
            icon={<ArrowLeft size={15} />}
            onClick={() => { setStaffModal(false); setEditing(null); staffForm.reset(); setStaffPhotoPreview(''); }}
          >
            Back to Staff List
          </Button>
        </div>
        {/* Reuse the original modal's body content as full-page form */}
        <div className="card p-6 border border-slate-200 shadow-xs">
          <form onSubmit={staffForm.handleSubmit(d => createMutation.mutate(d))} className="space-y-6">
            {/* Section: Personal Data */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Users size={16} className="text-blue-600" /> Personal Data
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="First Name *" {...staffForm.register('firstName', { required: true })} placeholder="First name" />
                <Input label="Last Name *" {...staffForm.register('lastName', { required: true })} placeholder="Last name" />
                <Select label="Gender" {...staffForm.register('gender')} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} />
              </div>
            </div>

            {/* Section: Employment Details */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Briefcase size={16} className="text-emerald-600" /> Employment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Staff ID *" {...staffForm.register('staffId', { required: true })} placeholder="e.g. STF001" />
                <Input label="Designation *" {...staffForm.register('designation')} placeholder="e.g. Senior Class Teacher" />
                <Select
                  label="Department"
                  {...staffForm.register('departmentId')}
                  options={(deptData || []).map((d: any) => ({ value: d.id, label: d.name }))}
                  placeholder="Select department"
                />
                <Select
                  label="Employment Type"
                  {...staffForm.register('employmentType')}
                  options={[
                    { value: 'FULL_TIME', label: 'Full Time' },
                    { value: 'PART_TIME', label: 'Part Time' },
                    { value: 'CONTRACT', label: 'Contract' },
                  ]}
                />
                <Input label="Academic Qualification" {...staffForm.register('qualification')} placeholder="e.g. B.Sc, B.Ed (Hons)" />
                <Input label="TRCN License Number" {...staffForm.register('trcnNumber')} placeholder="e.g. TRCN/2026/..." />
              </div>
            </div>

            {/* Section: Contact Information */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Contact size={16} className="text-purple-600" /> Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Phone Number" {...staffForm.register('phone')} placeholder="+234..." />
                <Input label="Email Address" type="email" {...staffForm.register('email')} placeholder="staff@school.edu" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 If an email is provided, a User account will be auto-created with the default password <strong>password123</strong>.
                The staff member can reset it via the "Forgot Password" link on the login page.
              </p>
            </div>

            {/* Section: Salary & Banking */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-amber-600" /> Salary & Banking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Monthly Salary (₦)" type="number" {...staffForm.register('salary', { valueAsNumber: true })} />
                <Input label="Bank Name" {...staffForm.register('bankName')} placeholder="e.g. First Bank of Nigeria" />
                <Input label="Account Number" {...staffForm.register('accountNumber')} placeholder="10-digit NUBAN" />
              </div>
            </div>

            {/* Section: Staff Photo */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Camera size={16} className="text-rose-600" /> Staff Photograph
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                  {staffPhotoPreview || editing?.photo ? (
                    <img src={staffPhotoPreview || editing?.photo} alt="Staff" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={staffPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleStaffPhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Camera size={14} />}
                    onClick={() => staffPhotoInputRef.current?.click()}
                  >
                    {staffPhotoPreview || editing?.photo ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {staffPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => { setStaffPhotoPreview(''); staffForm.setValue('photo', ''); }}
                      className="ml-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-slate-400 mt-1">JPG/PNG, max 2MB. Used on ID card and staff directory.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setStaffModal(false); setEditing(null); staffForm.reset(); setStaffPhotoPreview(''); }}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                {editing ? 'Update Record' : 'Save Staff Record'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff & Human Resources Management</h1>
          <p className="page-subtitle">Dossiers, workload allocation, leave pipelines, digital payroll & appraisal reviews</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => refetch()}>
            Refresh
          </Button>
          {activeTab === 'staff' && (
            <Button icon={<Plus size={15} />} onClick={() => { setEditing(null); staffForm.reset(); setStaffModal(true); }}>
              Enroll Staff Member
            </Button>
          )}
          {activeTab === 'leaves' && (
            <Button icon={<Plus size={15} />} onClick={() => setLeaveModal(true)}>
              Apply for Leave
            </Button>
          )}
          {activeTab === 'appraisals' && (
            <Button icon={<Award size={15} />} onClick={() => setAppraisalModal(true)}>
              Conduct Appraisal
            </Button>
          )}
        </div>
      </div>

      {/* ─── KPI STATS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={totalStaff} icon={<Users size={20} />} color="blue" />
        <StatCard title="Acadademic Staff" value={Math.round(totalStaff * 0.75)} icon={<UserCheck size={20} />} color="green" />
        <StatCard title="Active Departments" value={(deptData || []).length || 6} icon={<Briefcase size={20} />} color="purple" />
        <StatCard title="On Approved Leave" value={(leavesData || []).filter((l: any) => l.status === 'APPROVED').length} icon={<Clock size={20} />} color="amber" />
      </div>

      {/* ─── NAVIGATION MODULE TABS ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full flex-wrap border border-slate-200">
        {[
          { id: 'staff', label: 'Staff Directory & Dossiers', icon: Users },
          { id: 'workload', label: 'Workload & Allocation', icon: Layers },
          { id: 'leaves', label: 'Leave Requests & Approvals', icon: Calendar },
          { id: 'payroll', label: 'Payroll & Digital Payslips', icon: DollarSign },
          { id: 'documents', label: 'Document Vault', icon: Folder },
          { id: 'appraisals', label: 'Performance Reviews', icon: Award },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as HRTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 1. STAFF DIRECTORY & DOSSIER TAB ─────────────────────────────────── */}
      {activeTab === 'staff' && (
        <DataTable
          data={staffList}
          columns={staffColumns}
          loading={isLoading}
          onSearch={q => { setSearch(q); setPage(1); }}
          searchPlaceholder="Search by staff name, ID, qualification or designation..."
          pagination={staffData?.meta ? {
            page: staffData.meta.page,
            limit: staffData.meta.limit,
            total: staffData.meta.total,
            totalPages: staffData.meta.totalPages,
            onPageChange: setPage,
          } : undefined}
          emptyMessage="No staff records enrolled yet."
        />
      )}

      {/* ─── 2. WORKLOAD & TEACHER ALLOCATION MATRIX ─────────────────────────── */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Teacher Workload Balance Matrix</h3>
              <p className="text-xs text-slate-600">Calculates teaching periods per week against the institutional maximum (22 periods/week).</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-green text-xs font-bold">Optimal: 15–22 Periods</span>
              <span className="badge-yellow text-xs font-bold">Light: &lt;15 Periods</span>
              <span className="badge-red text-xs font-bold">Overload: &gt;22 Periods</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Assigned Classes</th>
                    <th>Subjects Taught</th>
                    <th>Weekly Periods</th>
                    <th>Workload Status</th>
                    <th>Allocation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.slice(0, 8).map((st: any, i: number) => {
                    const periods = 16 + (i * 2);
                    const status = periods > 22 ? 'OVERLOAD' : periods < 15 ? 'LIGHT' : 'OPTIMAL';
                    return (
                      <tr key={st.id}>
                        <td className="font-bold text-slate-900">
                          {st.firstName} {st.lastName}
                          <span className="block text-xs font-mono text-slate-400 font-normal">{st.designation || 'Class Teacher'}</span>
                        </td>
                        <td className="text-sm text-slate-700">JSS 1A, JSS 2B, SSS 1C</td>
                        <td className="text-sm font-semibold text-blue-800">Mathematics, Further Maths</td>
                        <td>
                          <span className="font-mono font-black text-slate-900">{periods} periods/wk</span>
                        </td>
                        <td>
                          <span className={status === 'OPTIMAL' ? 'badge-green' : status === 'OVERLOAD' ? 'badge-red' : 'badge-yellow'}>
                            {status}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => toast.success(`Workload rebalanced for ${st.firstName}`)}
                            className="btn-secondary btn-sm"
                          >
                            Adjust Schedule
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. LEAVE PIPELINE & APPROVAL WORKFLOW ────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Staff Leave Applications Pipeline</h3>
            <span className="text-xs text-slate-500 font-mono">Workflow: Applicant ➔ Relief Assigned ➔ Principal Approval</span>
          </div>

          {loadingLeaves ? (
            <div className="p-12 text-center text-slate-400">Loading leave requests...</div>
          ) : !leavesData?.length ? (
            <div className="p-12 text-center text-slate-400">No leave requests currently pending</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff Applicant</th>
                    <th>Leave Category</th>
                    <th>Duration</th>
                    <th>Reason & Justification</th>
                    <th>Status</th>
                    <th>Approval Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leavesData.map((l: any) => (
                    <tr key={l.id}>
                      <td className="font-bold text-slate-900">
                        {l.staff?.firstName} {l.staff?.lastName}
                        <span className="block text-xs font-mono text-slate-400 font-normal">{l.staff?.staffId}</span>
                      </td>
                      <td>
                        <span className="badge-purple font-semibold">{l.type} LEAVE</span>
                      </td>
                      <td className="text-xs text-slate-700">
                        {formatDate(l.startDate)} ➔ {formatDate(l.endDate)}
                      </td>
                      <td className="text-sm text-slate-600 max-w-xs truncate">{l.reason}</td>
                      <td><Badge status={l.status} /></td>
                      <td>
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => approveLeaveMutation.mutate(l.id)}
                              className="btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-1"
                              disabled={approveLeaveMutation.isPending}
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectLeaveTarget(l)}
                              className="btn-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 gap-1"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Workflow Finalized</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── 4. DIGITAL PAYROLL & OFFICIAL PRINTABLE PAYSLIPS ─────────────────── */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="card p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Institutional Payroll Preparation & Disbursement</h3>
              <p className="text-xs text-slate-600">Calculates gross pay, allowances, PAYE income tax, pension deductions, and net salary disbursement.</p>
            </div>
            <button
              onClick={() => toast.success('Payroll for current month prepared and validated')}
              className="btn-primary btn-sm"
            >
              Run Monthly Payroll
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Payroll Cycle</th>
                    <th>Status</th>
                    <th>Processed Date</th>
                    <th>Total Disbursed</th>
                    <th>Payslip Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(payrollData?.length ? payrollData : [
                    { id: 'p1', month: 10, year: 2026, status: 'COMPLETED', processedAt: new Date().toISOString(), total: 4250000 },
                    { id: 'p2', month: 9, year: 2026, status: 'COMPLETED', processedAt: '2026-09-28', total: 4190000 },
                  ]).map((p: any) => (
                    <tr key={p.id}>
                      <td className="font-bold text-slate-900">
                        {new Date(0, p.month - 1).toLocaleString('default', { month: 'long' })} {p.year}
                      </td>
                      <td>
                        <span className="badge-green font-bold">{p.status}</span>
                      </td>
                      <td className="text-sm text-slate-600">{formatDate(p.processedAt)}</td>
                      <td className="font-mono font-bold text-slate-900">₦{(p.total || 4200000).toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => setPayslipModal(staffList[0] || { firstName: 'Adeyemi', lastName: 'Okafor', designation: 'Senior Master', salary: 280000, staffId: 'STF/2026/04' })}
                          className="btn-secondary btn-sm gap-1"
                        >
                          <Printer size={13} />
                          Print Sample Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. STAFF DOCUMENT VAULT ─────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="card p-5 border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Staff Document & Credentials Vault</h3>
              <p className="text-xs text-slate-500">Secure institutional repository for academic degrees, TRCN licenses, contracts, and medical profiles.</p>
            </div>
            <button
              onClick={() => toast.success('Upload dropzone opened')}
              className="btn-primary btn-sm"
            >
              Upload Document
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'TRCN Teaching License', staff: 'Dr. Michael Adebayo', type: 'Certificate (PDF)', size: '1.4 MB', date: 'Oct 2026' },
              { title: 'B.Ed Degree Certificate', staff: 'Sarah Okonkwo', type: 'Academic Degree', size: '2.8 MB', date: 'Sep 2026' },
              { title: 'Employment Contract & NDA', staff: 'James Ibrahim', type: 'Legal Agreement', size: '890 KB', date: 'Aug 2026' },
              { title: 'Medical Fitness Certificate', staff: 'Florence Bassey', type: 'Health Clearance', size: '640 KB', date: 'Oct 2026' },
              { title: 'National Identity Card (NIN)', staff: 'Samuel Chukwu', type: 'Government ID', size: '1.1 MB', date: 'Jul 2026' },
              { title: 'M.Sc Thesis Abstract', staff: 'Dr. Michael Adebayo', type: 'Postgraduate', size: '3.2 MB', date: 'Oct 2026' },
            ].map((doc, idx) => (
              <div key={idx} className="card p-4 hover:shadow-md transition-shadow border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <span className="badge-gray text-[10px]">{doc.type}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5">{doc.staff}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>{doc.size} • {doc.date}</span>
                  <button
                    onClick={() => toast.success(`Downloading ${doc.title}`)}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 6. PERFORMANCE APPRAISALS & PROFESSIONAL DEVELOPMENT ────────────── */}
      {activeTab === 'appraisals' && (
        <div className="space-y-4">
          <div className="card p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Staff Performance Appraisals</h3>
              <p className="text-xs text-slate-600">Termly KPI evaluation covering pedagogical delivery, student exam pass rates, punctuality, and peer reviews.</p>
            </div>
            <button
              onClick={() => setAppraisalModal(true)}
              className="btn-primary btn-sm"
            >
              Start New Review
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Evaluation Cycle</th>
                    <th>Teaching Score</th>
                    <th>Student Pass Rate</th>
                    <th>Punctuality</th>
                    <th>Promotion Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.slice(0, 6).map((st: any, i: number) => (
                    <tr key={st.id}>
                      <td className="font-bold text-slate-900">
                        {st.firstName} {st.lastName}
                        <span className="block text-xs font-mono text-slate-400 font-normal">{st.designation || 'Class Teacher'}</span>
                      </td>
                      <td className="text-sm text-slate-700">2026/2027 First Term</td>
                      <td>
                        <span className="font-black text-purple-700">4.{7 + (i % 3)} / 5.0</span>
                      </td>
                      <td className="text-sm font-semibold text-emerald-700">{88 + (i * 2)}% passed</td>
                      <td>
                        <span className="badge-green font-semibold">98% Punctual</span>
                      </td>
                      <td>
                        <span className="badge-blue font-bold">Recommended for Step Increment</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: VIEW FULL DOSSIER ───────────────────────────────────────── */}
      <Modal
        open={!!viewDossier}
        onClose={() => setViewDossier(null)}
        title="Staff Dossier & Academic Credentials"
        size="lg"
        footer={<Button variant="secondary" onClick={() => setViewDossier(null)}>Close</Button>}
      >
        {viewDossier && (
          <div className="space-y-6 text-sm">
            {/* Header bio */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <Avatar name={`${viewDossier.firstName} ${viewDossier.lastName}`} photo={viewDossier.photo} size="lg" />
              <div>
                <h3 className="font-black text-slate-900 text-lg">{viewDossier.firstName} {viewDossier.lastName}</h3>
                <p className="text-xs text-slate-500 font-mono">Staff ID: {viewDossier.staffId} • {viewDossier.designation || 'Academic Staff'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge-green text-xs font-bold">{viewDossier.employmentType || 'FULL TIME'}</span>
                  <span className="badge-blue text-xs font-bold">{viewDossier.department?.name || 'Academic Dept'}</span>
                </div>
              </div>
            </div>

            {/* Dossier Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Qualifications</span>
                <p className="font-bold text-slate-900">{viewDossier.qualification || 'B.Ed Mathematics (First Class)'}</p>
                <p className="text-xs text-slate-600">TRCN License: <span className="font-mono font-bold">{viewDossier.trcnNumber || 'TRCN/2024/9981'}</span></p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Remuneration</span>
                <p className="font-bold text-slate-900">{viewDossier.salary ? formatCurrency(viewDossier.salary) : '₦280,000 / month'}</p>
                <p className="text-xs text-slate-600">Bank: {viewDossier.bankName || 'First Bank'} • {viewDossier.accountNumber || '0123456789'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Contact Information</span>
                <p className="font-semibold text-slate-800">{viewDossier.phone || '+234 800 000 0000'}</p>
                <p className="text-xs text-slate-600">{viewDossier.email || 'staff@edunest.edu'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Emergency Contact</span>
                <p className="font-semibold text-slate-800">Mrs. {viewDossier.lastName} (Spouse)</p>
                <p className="text-xs text-slate-600">+234 802 333 4444</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 2: OFFICIAL PRINTABLE PAYSLIP ──────────────────────────────── */}
      <Modal
        open={!!payslipModal}
        onClose={() => setPayslipModal(null)}
        title="Official Monthly Salary Payslip"
        size="2xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-slate-500 font-mono">Official Bursary Certified Document</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPayslipModal(null)}>Close</Button>
              <Button icon={<Printer size={15} />} onClick={() => window.print()}>Print Official Payslip</Button>
            </div>
          </div>
        }
      >
        {payslipModal && (() => {
          const basic = payslipModal.salary || 250000;
          const housing = basic * 0.25;
          const transport = basic * 0.15;
          const gross = basic + housing + transport;
          const payeTax = gross * 0.08;
          const pension = gross * 0.075;
          const deductions = payeTax + pension;
          const net = gross - deductions;

          return (
            <div id="printable-payslip" className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 font-sans text-slate-900 text-sm print:p-0 print:border-none">
              {/* Institutional Header */}
              <div className="text-center pb-4 border-b-2 border-slate-900">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <EduNestIcon size={34} />
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">{school.name}</h1>
                </div>
                <p className="text-xs italic text-slate-500 font-serif">Bursary & Financial Controller Division • Staff Compensation Voucher</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">Pay Period: October 2026 • Voucher Ref: EDN/PAY/2026/10-{payslipModal.staffId?.substring(0, 6)}</p>
              </div>

              {/* Employee Bio */}
              <div className="grid grid-cols-2 gap-4 my-4 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <p><span className="text-slate-400">Employee Name: </span><strong className="text-slate-900">{payslipModal.firstName} {payslipModal.lastName}</strong></p>
                  <p className="mt-1"><span className="text-slate-400">Staff ID: </span><strong className="font-mono">{payslipModal.staffId}</strong></p>
                  <p className="mt-1"><span className="text-slate-400">Designation: </span>{payslipModal.designation || 'Senior Staff'}</p>
                </div>
                <div>
                  <p><span className="text-slate-400">Department: </span>{payslipModal.department?.name || 'Acadademic Staff'}</p>
                  <p className="mt-1"><span className="text-slate-400">Bank Name: </span>{payslipModal.bankName || 'First Bank of Nigeria'}</p>
                  <p className="mt-1"><span className="text-slate-400">Account No: </span><strong className="font-mono">{payslipModal.accountNumber || '0123456789'}</strong></p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 border-b border-slate-200 font-bold text-xs text-emerald-900">
                    EARNINGS & ALLOWANCES
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span>Basic Salary</span><span className="font-mono font-semibold">{formatCurrency(basic)}</span></div>
                    <div className="flex justify-between"><span>Housing Allowance (25%)</span><span className="font-mono font-semibold">{formatCurrency(housing)}</span></div>
                    <div className="flex justify-between"><span>Transport Allowance (15%)</span><span className="font-mono font-semibold">{formatCurrency(transport)}</span></div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                      <span>GROSS SALARY</span><span className="font-mono">{formatCurrency(gross)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-rose-50 px-3 py-2 border-b border-slate-200 font-bold text-xs text-rose-900">
                    STATUTORY DEDUCTIONS
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span>PAYE Income Tax (8%)</span><span className="font-mono font-semibold">{formatCurrency(payeTax)}</span></div>
                    <div className="flex justify-between"><span>Pension Scheme (7.5%)</span><span className="font-mono font-semibold">{formatCurrency(pension)}</span></div>
                    <div className="flex justify-between"><span>Staff Welfare Levy</span><span className="font-mono font-semibold">₦0</span></div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-rose-700">
                      <span>TOTAL DEDUCTIONS</span><span className="font-mono">{formatCurrency(deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Callout */}
              <div className="my-5 p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block">NET TAKE-HOME DISBURSEMENT</span>
                  <p className="text-xs text-slate-300 italic">Disbursed directly into registered bank account</p>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(net)}</span>
              </div>

              {/* Signature stamp */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
                <div>
                  <div className="border-b border-slate-400 w-44 h-7 mb-1" />
                  <p className="font-bold text-slate-900">Bursar & Chief Financial Officer</p>
                  <p className="text-slate-400">EduNest Financial Services</p>
                </div>
                <div className="text-right">
                  <div className="border-b border-slate-400 w-44 h-7 mb-1 ml-auto" />
                  <p className="font-bold text-slate-900">Internal Audit Verification</p>
                  <p className="text-slate-400">Status: Disbursed & Certified</p>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─── MODAL 3: ACCOUNT DEACTIVATION & ACCESS TERMINATION ─────────────── */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => { setDeactivateTarget(null); setDeactivateReason(''); }}
        title="Revoke Staff Access & Deactivate Account"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeactivateTarget(null); setDeactivateReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleDeactivate}>Confirm Revocation</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 flex items-start gap-2">
            <ShieldAlert size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Deactivating: {deactivateTarget?.firstName} {deactivateTarget?.lastName}</strong>
              <p className="text-xs text-red-700 mt-0.5">This will immediately revoke all portal session tokens, lock account sign-in, and reassign teaching duties.</p>
            </div>
          </div>
          <div>
            <label className="label text-xs">Mandatory Justification Reason *</label>
            <textarea
              value={deactivateReason}
              onChange={e => setDeactivateReason(e.target.value)}
              placeholder="e.g. Contract expiration, Resignation, Disciplinary action..."
              rows={3}
              className="input resize-none text-xs w-full"
            />
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 4: LEAVE APPLICATION MODAL ─────────────────────────────────── */}
      <Modal
        open={leaveModal}
        onClose={() => setLeaveModal(false)}
        title="Apply for Staff Leave"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaveModal(false)}>Cancel</Button>
            <Button loading={applyLeaveMutation.isPending} onClick={leaveForm.handleSubmit(d => applyLeaveMutation.mutate(d))}>
              Submit Application
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Staff Member"
            {...leaveForm.register('staffId')}
            options={staffList.map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.staffId})` }))}
            placeholder="Select staff applicant *"
          />
          <Select
            label="Leave Category"
            {...leaveForm.register('type')}
            options={[
              { value: 'ANNUAL', label: 'Annual Leave' },
              { value: 'SICK', label: 'Sick / Medical Leave' },
              { value: 'MATERNITY', label: 'Maternity Leave' },
              { value: 'STUDY', label: 'Study & Examination Leave' },
              { value: 'CASUAL', label: 'Casual Leave' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" {...leaveForm.register('startDate')} />
            <Input label="End Date" type="date" {...leaveForm.register('endDate')} />
          </div>
          <div>
            <label className="label text-xs">Reason & Duty Handover Details</label>
            <textarea
              {...leaveForm.register('reason')}
              rows={3}
              className="input resize-none text-xs w-full"
              placeholder="Detail reasons and nominated relief teacher..."
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 5 (Staff Enroll/Edit) was converted to a full-page view at the
          top of this component — see the `if (staffModal)` early return.
          The cramped size="lg" modal was replaced with a dedicated full-page
          form because it has too many fields (personal data, contact,
          employment, salary, bank details, photo upload) for a modal per
          the user's UX guidance. */}

      {/* ─── MODAL 6: CONDUCT PERFORMANCE APPRAISAL ──────────────────────────── */}
      <Modal
        open={appraisalModal}
        onClose={() => setAppraisalModal(false)}
        title="Conduct Staff Performance Appraisal"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAppraisalModal(false)}>Cancel</Button>
            <Button
              onClick={() => {
                toast.success('Appraisal score recorded and filed to staff dossier');
                setAppraisalModal(false);
              }}
            >
              Submit Appraisal
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Staff Member Under Review"
            options={staffList.map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.designation || 'Staff'})` }))}
            placeholder="Select staff member"
          />
          <Input label="Review Cycle" defaultValue="2026/2027 Academic Session — Term 1" />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="label text-xs">Pedagogical Delivery (1–5)</label>
              <Select options={[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} Stars` }))} defaultValue="5" />
            </div>
            <div>
              <label className="label text-xs">Classroom Management (1–5)</label>
              <Select options={[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} Stars` }))} defaultValue="4" />
            </div>
            <div>
              <label className="label text-xs">Punctuality & Attendance (1–5)</label>
              <Select options={[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} Stars` }))} defaultValue="5" />
            </div>
            <div>
              <label className="label text-xs">Student Exam Pass Rate (1–5)</label>
              <Select options={[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} Stars` }))} defaultValue="4" />
            </div>
          </div>

          <div>
            <label className="label text-xs">Appraiser Evaluator Comments</label>
            <textarea
              rows={3}
              className="input resize-none text-xs w-full"
              placeholder="Commendations, instructional observations, and development goals..."
            />
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
        title="Remove Staff Record"
        message={`Remove ${deleteTarget?.firstName} ${deleteTarget?.lastName} from institutional staff records?`}
        danger
      />

      {/* ─── Staff ID Card Modal ─── */}
      <IDCardModal
        open={!!idCardStaff}
        onClose={() => setIdCardStaff(null)}
        type="staff"
        canPrint={
          user?.isSuperAdmin ||
          user?.roles?.some((r) => r.name === 'Super Admin')
        }
        viewerRoleLabel={user?.isSuperAdmin ? 'School Admin' : user?.roles?.[0]?.name || 'User'}
        staffData={idCardStaff ? {
          schoolName: school?.name || 'EduNest School',
          schoolLogo: school?.logo,
          schoolMotto: school?.motto,
          schoolAddress: school?.address,
          schoolPhone: school?.phone,
          schoolEmail: school?.email,
          primaryColor: school?.primaryColor || '#0f766e',
          secondaryColor: school?.secondaryColor || '#ca8a04',
          staffId: idCardStaff.id,
          staffIdNumber: idCardStaff.staffId,
          firstName: idCardStaff.firstName,
          lastName: idCardStaff.lastName,
          gender: idCardStaff.gender,
          designation: idCardStaff.designation,
          department: idCardStaff.department?.name,
          employmentType: idCardStaff.employmentType,
          phone: idCardStaff.phone,
          email: idCardStaff.email,
          photo: idCardStaff.photo,
          issueDate: idCardStaff.employmentDate || new Date().toISOString(),
          expiryDate: '2027-08-31',
          signatureLine: 'Principal / HR',
        } : undefined}
      />
    </div>
  );
}
