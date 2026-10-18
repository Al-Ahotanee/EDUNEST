import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Eye, Edit, Trash2, Users, Briefcase, BookOpen, Contact,
  Camera, GraduationCap, ShieldCheck, X, ChevronRight, Award, Layers,
} from 'lucide-react';
import {
  DataTable, Button, Modal, Input, Select, StatCard, Badge, ConfirmDialog, Avatar, PageLoader,
} from '../../components/ui';
import { hrApi, academicApi, resultsApi, api } from '../../services/api';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { IDCardModal } from '../../components/idcard';
import { EduNestIcon } from '../../components/common/EduNestLogo';

type TeacherTab = 'directory' | 'allocation' | 'idcards';

export default function TeacherManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: user?.school?.name || 'School' };
  const [activeTab, setActiveTab] = useState<TeacherTab>('directory');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modal state
  const [staffModal, setStaffModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewDossier, setViewDossier] = useState<any>(null);
  const [idCardStaff, setIdCardStaff] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [staffPhotoPreview, setStaffPhotoPreview] = useState('');
  const staffPhotoInputRef = useRef<HTMLInputElement>(null);
  const [allocationStaff, setAllocationStaff] = useState<any>(null);

  // Allocation form state
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignRoleType, setAssignRoleType] = useState('SUBJECT_TEACHER');

  // Fetch staff
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', page, search],
    queryFn: () => hrApi.list({ page, limit: 30, search }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes-teacher-mgmt'],
    queryFn: () => academicApi.classes().then(r => r.data?.data || r.data || []),
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // Fetch subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-teacher-mgmt'],
    queryFn: () => academicApi.subjects().then(r => r.data?.data || r.data || []),
  });
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  // Fetch departments
  const { data: deptData } = useQuery({
    queryKey: ['departments-teacher-mgmt'],
    queryFn: () => hrApi.departments().then(r => r.data?.data || r.data || []),
  });
  const departments = Array.isArray(deptData) ? deptData : [];

  // Fetch teacher assignments (for allocation tab)
  const { data: assignmentsData, refetch: refetchAssignments } = useQuery({
    queryKey: ['teacher-assignments-all'],
    queryFn: () => resultsApi.teacherAssignments().then(r => r.data?.data || r.data || []),
    enabled: activeTab === 'allocation',
  });
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];

  // Staff form
  const staffForm = useForm({
    defaultValues: {
      staffId: '', firstName: '', lastName: '', gender: 'MALE',
      designation: '', departmentId: '', employmentType: 'FULL_TIME',
      phone: '', email: '', salary: 0, qualification: '',
      bankName: '', accountNumber: '', photo: '',
    },
  });

  const handleStaffPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setStaffPhotoPreview(base64);
      staffForm.setValue('photo', base64);
    };
    reader.readAsDataURL(file);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => editing ? hrApi.update(editing.id, data) : hrApi.create(data),
    onSuccess: () => {
      toast.success(editing ? 'Staff updated!' : 'Teacher registered!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setStaffModal(false); setEditing(null); staffForm.reset(); setStaffPhotoPreview('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
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

  const assignMutation = useMutation({
    mutationFn: (data: any) => resultsApi.assignTeacher(data),
    onSuccess: () => {
      toast.success('Teacher assigned to class/subject!');
      refetchAssignments();
      setAssignClassId(''); setAssignSubjectId('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to assign'),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/results/teacher-assignments/${id}`),
    onSuccess: () => {
      toast.success('Assignment removed');
      refetchAssignments();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleEdit = (staff: any) => {
    setEditing(staff);
    staffForm.reset(staff);
    setStaffModal(true);
  };

  const staffColumns = [
    {
      key: 'staff',
      header: 'Staff Member',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} photo={r.photo} size="sm" />
          <div>
            <p className="font-semibold text-slate-900">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-slate-400 font-mono">{r.staffId}</p>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation', render: (r: any) => <span className="text-sm font-medium">{r.designation || '—'}</span> },
    { key: 'department', header: 'Department', render: (r: any) => <span className="text-sm">{r.department?.name || '—'}</span> },
    { key: 'type', header: 'Type', render: (r: any) => <Badge status={r.employmentType === 'FULL_TIME' ? 'ACTIVE' : 'INACTIVE'} label={r.employmentType?.replace('_', ' ') || '—'} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button onClick={() => setViewDossier(r)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all" title="View Profile">
            <Eye size={15} />
          </button>
          <button onClick={() => setIdCardStaff(r)} className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-all" title="ID Card">
            <Contact size={15} />
          </button>
          <button onClick={() => { setAllocationStaff(r); setActiveTab('allocation'); }} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all" title="Allocate Class/Subject">
            <Layers size={15} />
          </button>
          <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Edit">
            <Edit size={15} />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Briefcase size={24} /> Teacher Management</h1>
          <p className="page-subtitle">Unified workspace for teacher registration, class & subject allocation, ID cards, and profiles</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => window.location.href = '/app/staff-appointment'} icon={<FileText size={15} />}>
            Appointment Form
          </Button>
          <Button icon={<Plus size={15} />} onClick={() => { setEditing(null); staffForm.reset(); setStaffModal(true); }}>
            Register Teacher
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={(staffData?.meta?.total || 0).toLocaleString()} icon={<Users size={20} />} color="blue" />
        <StatCard title="Classes Available" value={classes.length} icon={<BookOpen size={20} />} color="green" />
        <StatCard title="Subjects Available" value={subjects.length} icon={<Award size={20} />} color="purple" />
        <StatCard title="Departments" value={departments.length} icon={<Layers size={20} />} color="cyan" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {([
          { id: 'directory', label: 'Teacher Directory', icon: <Users size={15} /> },
          { id: 'allocation', label: 'Class & Subject Allocation', icon: <Layers size={15} /> },
          { id: 'idcards', label: 'Staff ID Cards', icon: <Contact size={15} /> },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: TEACHER DIRECTORY ─── */}
      {activeTab === 'directory' && (
        <DataTable
          data={staffData?.data || []}
          columns={staffColumns}
          loading={isLoading}
          onSearch={q => { setSearch(q); setPage(1); }}
          searchPlaceholder="Search by staff name, ID, or designation..."
          pagination={staffData?.meta ? {
            page: staffData.meta.page, limit: staffData.meta.limit,
            total: staffData.meta.total, totalPages: staffData.meta.totalPages,
            onPageChange: setPage,
          } : undefined}
          emptyMessage="No staff records enrolled yet. Click 'Register Teacher' to add one."
        />
      )}

      {/* ─── TAB 2: CLASS & SUBJECT ALLOCATION ─── */}
      {activeTab === 'allocation' && (
        <div className="space-y-4">
          {/* Assignment form */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Layers size={18} className="text-emerald-600" />
              Assign Teacher to Class & Subject
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select className="input" value={allocationStaff?.id || ''} onChange={e => {
                const staff = (staffData?.data || []).find((s: any) => s.id === e.target.value);
                setAllocationStaff(staff || null);
              }}>
                <option value="">— Select Teacher —</option>
                {(staffData?.data || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.staffId})</option>
                ))}
              </select>
              <select className="input" value={assignClassId} onChange={e => setAssignClassId(e.target.value)}>
                <option value="">— Select Class —</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input" value={assignSubjectId} onChange={e => setAssignSubjectId(e.target.value)}>
                <option value="">— Select Subject (optional) —</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Button
                disabled={!allocationStaff || !assignClassId || assignMutation.isPending}
                loading={assignMutation.isPending}
                onClick={() => assignMutation.mutate({
                  userId: allocationStaff.userId || allocationStaff.id,
                  classId: assignClassId,
                  subjectId: assignSubjectId || undefined,
                  roleType: assignRoleType,
                })}
              >
                Assign
              </Button>
            </div>
            <div className="mt-2">
              <label className="text-xs text-slate-500">Role Type:</label>
              <select className="input w-48 ml-2 inline-block" value={assignRoleType} onChange={e => setAssignRoleType(e.target.value)}>
                <option value="SUBJECT_TEACHER">Subject Teacher</option>
                <option value="CLASS_MASTER">Class Master / Form Teacher</option>
              </select>
            </div>
          </div>

          {/* Existing assignments table */}
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Teacher</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{a.class?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{a.subject?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${a.roleType === 'CLASS_MASTER' ? 'badge-blue' : 'badge-green'}`}>
                          {a.roleType?.replace('_', ' ') || 'Subject Teacher'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteAssignmentMutation.mutate(a.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                        No teacher assignments yet. Use the form above to assign a teacher to a class and subject.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: STAFF ID CARDS ─── */}
      {activeTab === 'idcards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(staffData?.data || []).map((staff: any) => (
            <div key={staff.id} className="card p-5 flex flex-col items-center gap-3">
              <Avatar name={`${staff.firstName} ${staff.lastName}`} photo={staff.photo} size="lg" />
              <div className="text-center">
                <p className="font-bold text-slate-900">{staff.firstName} {staff.lastName}</p>
                <p className="text-xs text-slate-400">{staff.staffId} • {staff.designation || 'Staff'}</p>
              </div>
              <Button size="sm" variant="secondary" icon={<Contact size={14} />} onClick={() => setIdCardStaff(staff)}>
                View / Print ID Card
              </Button>
            </div>
          ))}
          {(staffData?.data || []).length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              No staff records found. Register a teacher first.
            </div>
          )}
        </div>
      )}

      {/* ─── REGISTER / EDIT STAFF MODAL ─── */}
      <Modal
        open={staffModal}
        onClose={() => { setStaffModal(false); setEditing(null); staffForm.reset(); setStaffPhotoPreview(''); }}
        title={editing ? 'Edit Staff Profile' : 'Register New Teacher / Staff'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setStaffModal(false); setEditing(null); staffForm.reset(); setStaffPhotoPreview(''); }}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={staffForm.handleSubmit(d => createMutation.mutate(d))}>
              {editing ? 'Update Record' : 'Save Staff Record'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Photo Upload */}
          <div className="form-group">
            <label className="label">Staff Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                {staffPhotoPreview || editing?.photo ? (
                  <img src={staffPhotoPreview || editing?.photo} alt="Staff" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <input ref={staffPhotoInputRef} type="file" accept="image/*" onChange={handleStaffPhotoUpload} className="hidden" />
                <Button type="button" variant="secondary" size="sm" icon={<Camera size={14} />} onClick={() => staffPhotoInputRef.current?.click()}>
                  {staffPhotoPreview || editing?.photo ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {staffPhotoPreview && (
                  <button type="button" onClick={() => { setStaffPhotoPreview(''); staffForm.setValue('photo', ''); }} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                )}
                <p className="text-xs text-slate-400 mt-1">JPG/PNG, max 2MB. Used on ID card.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" {...staffForm.register('firstName', { required: true })} placeholder="First name" />
            <Input label="Last Name *" {...staffForm.register('lastName', { required: true })} placeholder="Last name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Staff ID *" {...staffForm.register('staffId', { required: true })} placeholder="e.g. STF001" />
            <Select label="Gender" {...staffForm.register('gender')} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Designation *" {...staffForm.register('designation')} placeholder="e.g. Maths Teacher" />
            <Select label="Department" {...staffForm.register('departmentId')} options={departments.map((d: any) => ({ value: d.id, label: d.name }))} placeholder="Select department" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Qualification" {...staffForm.register('qualification')} placeholder="e.g. B.Sc, B.Ed" />
            <Input label="Specialization" {...staffForm.register('specialization')} placeholder="e.g. Mathematics" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Employment Type" {...staffForm.register('employmentType')} options={[
              { value: 'FULL_TIME', label: 'Full Time' }, { value: 'PART_TIME', label: 'Part Time' }, { value: 'CONTRACT', label: 'Contract' },
            ]} />
            <Input label="Monthly Salary (₦)" type="number" {...staffForm.register('salary', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Number" {...staffForm.register('phone')} placeholder="+234..." />
            <Input label="Email Address" type="email" {...staffForm.register('email')} placeholder="staff@school.edu" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bank Name" {...staffForm.register('bankName')} placeholder="e.g. First Bank" />
            <Input label="Account Number" {...staffForm.register('accountNumber')} placeholder="10-digit NUBAN" />
          </div>
        </div>
      </Modal>

      {/* ─── STAFF DOSSIER (VIEW PROFILE) MODAL ─── */}
      <Modal
        open={!!viewDossier}
        onClose={() => setViewDossier(null)}
        title="Staff Profile & Dossier"
        size="lg"
        footer={<Button variant="secondary" onClick={() => setViewDossier(null)}>Close</Button>}
      >
        {viewDossier && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <Avatar name={`${viewDossier.firstName} ${viewDossier.lastName}`} photo={viewDossier.photo} size="lg" />
              <div>
                <h3 className="text-xl font-bold text-slate-900">{viewDossier.firstName} {viewDossier.lastName}</h3>
                <p className="text-sm text-slate-500">{viewDossier.designation} • {viewDossier.staffId}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge status={viewDossier.isActive ? 'ACTIVE' : 'INACTIVE'} label={viewDossier.employmentType?.replace('_', ' ') || 'Staff'} />
                  {viewDossier.department && <span className="text-xs text-slate-400">{viewDossier.department.name}</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Qualification:</span> <span className="font-medium text-slate-700">{viewDossier.qualification || '—'}</span></div>
              <div><span className="text-slate-400">Phone:</span> <span className="font-medium text-slate-700">{viewDossier.phone || '—'}</span></div>
              <div><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-700">{viewDossier.email || '—'}</span></div>
              <div><span className="text-slate-400">Salary:</span> <span className="font-medium text-slate-700">{viewDossier.salary ? formatCurrency(viewDossier.salary) : '—'}</span></div>
              <div><span className="text-slate-400">Bank:</span> <span className="font-medium text-slate-700">{viewDossier.bankName || '—'}</span></div>
              <div><span className="text-slate-400">Account:</span> <span className="font-medium text-slate-700">{viewDossier.accountNumber || '—'}</span></div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" variant="secondary" icon={<Contact size={14} />} onClick={() => { setIdCardStaff(viewDossier); setViewDossier(null); }}>
                View ID Card
              </Button>
              <Button size="sm" variant="secondary" icon={<Layers size={14} />} onClick={() => { setAllocationStaff(viewDossier); setActiveTab('allocation'); setViewDossier(null); }}>
                Allocate Class/Subject
              </Button>
              <Button size="sm" variant="secondary" icon={<Edit size={14} />} onClick={() => { handleEdit(viewDossier); setViewDossier(null); }}>
                Edit Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── STAFF ID CARD MODAL ─── */}
      <IDCardModal
        open={!!idCardStaff}
        onClose={() => setIdCardStaff(null)}
        type="staff"
        canPrint={user?.isSuperAdmin || user?.roles?.some((r) => r.name === 'Super Admin')}
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

      {/* ─── CONFIRM DELETE ─── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
        title="Remove Staff Record"
        message={`Remove ${deleteTarget?.firstName} ${deleteTarget?.lastName} from institutional staff records?`}
        danger
      />
    </div>
  );
}
