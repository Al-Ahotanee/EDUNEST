import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Eye, Edit, Trash2, Download, GraduationCap, Filter, RefreshCw, Contact, Printer, Camera, CheckSquare, Square } from 'lucide-react';
import {
  DataTable, Button, Modal, Input, Select, Badge,
  ConfirmDialog, Avatar, StatCard, PageLoader, Card,
} from '../../components/ui';
import { studentsApi, schoolsApi, academicApi } from '../../services/api';
import { formatDate, getStatusBadge } from '../../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { StudentIDCard, StudentIDCardData } from '../../components/idcard';

const studentSchema = z.object({
  admissionNumber: z.string().min(1, 'Required'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  otherName: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  dateOfBirth: z.string().min(1, 'Required'),
  bloodGroup: z.string().optional(),
  stateOfOrigin: z.string().optional(),
  lga: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  status: z.string().optional(),
  photo: z.string().optional(),
  classId: z.string().optional(),
});

type StudentForm = z.infer<typeof studentSchema>;

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(searchParams.get('action') === 'new');
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkPrintRef = useRef<HTMLDivElement>(null);

  // Fetch school branding for ID cards
  const { data: school } = useQuery({
    queryKey: ['current-school'],
    queryFn: async () => {
      const res = await schoolsApi.current();
      return res.data?.data || res.data;
    },
  });

  // Fetch classes for the registration form dropdown
  const { data: classesData } = useQuery({
    queryKey: ['classes-for-registration'],
    queryFn: () => academicApi.classes().then((r) => r.data?.data || r.data || []),
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', page, search, statusFilter],
    queryFn: () => studentsApi.list({ page, limit: 20, search, status: statusFilter }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => studentsApi.stats().then((r) => r.data.data),
  });

  const { data: admNoData } = useQuery({
    queryKey: ['gen-adm-no'],
    queryFn: () => studentsApi.genAdmNo().then((r) => r.data),
    enabled: modalOpen && !editingStudent,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    if (modalOpen && !editingStudent && admNoData) {
      setValue('admissionNumber', admNoData.data || admNoData);
    }
  }, [admNoData, modalOpen, editingStudent]);

  useEffect(() => {
    if (editingStudent) {
      reset({
        ...editingStudent,
        dateOfBirth: editingStudent.dateOfBirth?.split('T')[0],
      });
    } else if (modalOpen) {
      reset({ gender: 'MALE', status: 'ACTIVE' });
    }
  }, [editingStudent, modalOpen]);

  const createMutation = useMutation({
    mutationFn: (data: StudentForm) => studentsApi.create(data),
    onSuccess: () => {
      toast.success('Student registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-stats'] });
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to register student'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentForm }) => studentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Student updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update student'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      toast.success('Student removed');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete student'),
  });

  const onSubmit = (formData: StudentForm) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingStudent(null);
    setPhotoPreview('');
    reset({});
    setSearchParams({});
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setModalOpen(true);
  };

  // ─── BULK ID CARD PRINT ───────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const list = data?.data || [];
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((s: any) => s.id)));
    }
  };

  const handlePrintIDCards = () => {
    const list = (data?.data || []).filter((s: any) => selectedIds.has(s.id));
    if (list.length === 0) {
      toast.error('Select at least one student to print ID cards');
      return;
    }

    const schoolName = school?.name || user?.school?.name || user?.tenant?.name || 'School';
    const schoolLogo = school?.logo || user?.tenant?.logo;
    const schoolMotto = school?.motto;
    const schoolAddress = school?.address;
    const schoolPhone = school?.phone;
    const schoolEmail = school?.email;
    const primaryColor = user?.tenant?.primaryColor || '#2563eb';
    const secondaryColor = user?.tenant?.secondaryColor || '#7e3af2';

    const cardsHtml = list.map((s: any) => {
      const cardData: StudentIDCardData = {
        schoolName, schoolLogo, schoolMotto, schoolAddress, schoolPhone, schoolEmail,
        primaryColor, secondaryColor,
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        otherName: s.otherName,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        bloodGroup: s.bloodGroup,
        className: s.classEnrollments?.[0]?.class?.name,
        status: s.status,
        photo: s.photo,
        issueDate: s.admissionDate || new Date().toISOString(),
        expiryDate: '2027-08-31',
        signatureLine: 'Principal',
      };
      // Render the card to HTML string using ReactDOMServer-like approach
      // Since we can't use ReactDOMServer in the browser easily, we'll build the HTML manually
      return renderCardHTML(cardData);
    }).join('<div style="page-break-after: always;"></div>');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print ID cards');
      return;
    }
    printWindow.document.write(`
<!DOCTYPE html><html><head><title>Student ID Cards — Bulk Print</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<style>
@page { size: 85.6mm 54mm; margin: 0; }
body { margin: 0; padding: 8mm; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f1f5f9; }
.card-wrapper { page-break-after: always; margin-bottom: 8mm; }
.card-wrapper:last-child { page-break-after: auto; margin-bottom: 0; }
@media print { body { background: white; padding: 0; } .card-wrapper { margin-bottom: 0; } }
.id-card { width: 85.6mm; height: 54mm; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; position: relative; background: white; }
.id-card-header { height: 12mm; display: flex; align-items: center; gap: 6px; padding: 0 6px; color: white; }
.id-card-body { position: absolute; top: 13mm; left: 0; right: 0; bottom: 5mm; display: flex; align-items: flex-start; gap: 4px; padding: 2px 6px; }
.id-card-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 5mm; display: flex; align-items: center; justify-content: space-between; padding: 0 6px; color: white; font-size: 5px; }
.photo-placeholder { width: 14mm; height: 18mm; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); font-weight: bold; font-size: 11px; color: #475569; }
.qr-placeholder { width: 48px; height: 48px; }
</style></head><body>
${cardsHtml}
<script>
// Generate QR codes for each card
setTimeout(function() {
  var qrContainers = document.querySelectorAll('[data-qr-payload]');
  qrContainers.forEach(function(el) {
    var payload = el.getAttribute('data-qr-payload');
    QRCode.toCanvas(el, payload, { width: 48, margin: 0, color: { dark: '#000000', light: '#ffffff' } }, function(err) {
      if (err) console.error('QR error:', err);
    });
  });
  setTimeout(function() { window.print(); }, 500);
}, 300);
</script>
</body></html>`);
    printWindow.document.close();
    toast.success(`Printing ${list.length} ID card(s)...`);
  };

  // Helper: render a single card's HTML for bulk print
  const renderCardHTML = (d: StudentIDCardData): string => {
    const primary = d.primaryColor || '#2563eb';
    const secondary = d.secondaryColor || '#7e3af2';
    const qrPayload = `STUDENT:${d.studentId}:${d.admissionNumber}:${d.firstName}:${d.lastName}`;
    const initials = `${(d.firstName?.[0] || '?')}${(d.lastName?.[0] || '')}`;
    const issueDate = d.issueDate ? new Date(d.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    return `<div class="card-wrapper">
  <div class="id-card">
    <div class="id-card-header" style="background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);">
      ${d.schoolLogo ? `<img src="${d.schoolLogo}" style="width:18px;height:18px;border-radius:3px;background:white;padding:1px;object-fit:contain;"/>` : '<div style="width:18px;height:18px;border-radius:4px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:10px;">🎓</div>'}
      <div style="flex:1;min-width:0;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.schoolName}</div>
        ${d.schoolMotto ? `<div style="font-size:6.5px;font-style:italic;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${d.schoolMotto}"</div>` : ''}
      </div>
      <div style="font-size:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:rgba(255,255,255,0.15);padding:1px 4px;border-radius:3px;">Student ID</div>
    </div>
    <div class="id-card-body">
      <div class="photo-placeholder">${d.photo ? `<img src="${d.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;"/>` : initials}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:5px;text-transform:uppercase;color:#94a3b8;font-weight:600;">Name</div>
        <div style="font-size:9px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.firstName} ${d.otherName ? d.otherName + ' ' : ''}${d.lastName}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 4px;margin-top:1px;">
          <div><div style="font-size:5px;text-transform:uppercase;color:#94a3b8;font-weight:600;">Adm. No.</div><div style="font-size:7px;font-family:monospace;font-weight:700;color:#334155;">${d.admissionNumber}</div></div>
          <div><div style="font-size:5px;text-transform:uppercase;color:#94a3b8;font-weight:600;">Class</div><div style="font-size:7px;font-weight:600;color:#334155;">${d.className || '—'}</div></div>
          <div><div style="font-size:5px;text-transform:uppercase;color:#94a3b8;font-weight:600;">Gender</div><div style="font-size:7px;color:#334155;">${d.gender || '—'}</div></div>
          <div><div style="font-size:5px;text-transform:uppercase;color:#94a3b8;font-weight:600;">Blood</div><div style="font-size:7px;font-weight:700;color:#dc2626;">${d.bloodGroup || '—'}</div></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div data-qr-payload="${qrPayload}" class="qr-placeholder" style="border:1px solid #e2e8f0;border-radius:3px;padding:1px;background:white;"></div>
        <div style="font-size:4.5px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;margin-top:1px;">Scan</div>
      </div>
    </div>
    <div class="id-card-footer" style="background:${primary};">
      <div style="font-size:5px;">Issued: <strong>${issueDate}</strong></div>
      <div style="font-size:5px;">Valid: <strong>31 Aug 2027</strong></div>
    </div>
  </div>
</div>`;
  };

  // ─── PHOTO UPLOAD ─────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setValue('photo' as any, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleExportStudents = () => {
    const list = data?.data || [];
    if (list.length === 0) {
      toast.error('No student records to export');
      return;
    }
    const headers = ['Admission No', 'First Name', 'Last Name', 'Gender', 'Class', 'Guardian Name', 'Guardian Phone', 'Date of Birth', 'Status'];
    const rows = list.map((s: any) => [
      s.admissionNumber || '',
      `"${s.firstName || ''}"`,
      `"${s.lastName || ''}"`,
      s.gender || '',
      `"${s.classEnrollments?.[0]?.class?.name || ''}"`,
      `"${s.guardians?.[0] ? `${s.guardians[0].firstName} ${s.guardians[0].lastName}` : ''}"`,
      `"${s.guardians?.[0]?.phone || ''}"`,
      s.dateOfBirth ? s.dateOfBirth.split('T')[0] : '',
      s.status || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `students_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Students roster exported successfully');
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.firstName} ${row.lastName}`} photo={row.photo} size="sm" />
          <div>
            <p className="font-semibold text-slate-900">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-slate-400">{row.admissionNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      render: (row: any) => <Badge status={row.gender} label={row.gender} />,
    },
    {
      key: 'class',
      header: 'Class',
      render: (row: any) => (
        <span className="text-sm">{row.classEnrollments?.[0]?.class?.name || '—'}</span>
      ),
    },
    {
      key: 'guardian',
      header: 'Guardian',
      render: (row: any) => (
        <div>
          <p className="text-sm">{row.guardians?.[0] ? `${row.guardians[0].firstName} ${row.guardians[0].lastName}` : '—'}</p>
          <p className="text-xs text-slate-400">{row.guardians?.[0]?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'dateOfBirth',
      header: 'Date of Birth',
      render: (row: any) => <span className="text-sm">{formatDate(row.dateOfBirth)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <Badge status={row.status} />,
    },
    {
      key: 'select',
      header: () => (
        <button onClick={toggleSelectAll} className="p-1" title="Select all on this page">
          {selectedIds.size === (data?.data || []).length && selectedIds.size > 0
            ? <CheckSquare size={15} className="text-blue-600" />
            : <Square size={15} className="text-slate-400" />}
        </button>
      ),
      render: (row: any) => (
        <button onClick={() => toggleSelect(row.id)} className="p-1">
          {selectedIds.has(row.id)
            ? <CheckSquare size={15} className="text-blue-600" />
            : <Square size={15} className="text-slate-300" />}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/app/students/${row.id}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title="View"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            title="Edit"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Delete"
          >
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
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Manage all student records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button variant="secondary" icon={<Download size={15} />} onClick={handleExportStudents}>
            Export CSV
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="primary"
              icon={<Printer size={15} />}
              onClick={handlePrintIDCards}
            >
              Print {selectedIds.size} ID Card{selectedIds.size > 1 ? 's' : ''}
            </Button>
          )}
          <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
            Register Student
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={(statsData?.total || 0).toLocaleString()} icon={<GraduationCap size={20} />} color="blue" />
        <StatCard title="Active" value={(statsData?.active || 0).toLocaleString()} icon={<GraduationCap size={20} />} color="green" />
        <StatCard title="Male" value={(statsData?.male || 0).toLocaleString()} icon={<GraduationCap size={20} />} color="cyan" />
        <StatCard title="Female" value={(statsData?.female || 0).toLocaleString()} icon={<GraduationCap size={20} />} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-40 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="GRADUATED">Graduated</option>
          <option value="TRANSFERRED">Transferred</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by name or admission number..."
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
          onPageChange: setPage,
        } : undefined}
        emptyMessage="No students found. Click 'Register Student' to add one."
      />

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={handleClose}
        title={editingStudent ? 'Edit Student' : 'Register New Student'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingStudent ? 'Update Student' : 'Register Student'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" {...register('firstName')} error={errors.firstName?.message} placeholder="First name" />
            <Input label="Last Name" {...register('lastName')} error={errors.lastName?.message} placeholder="Last name" />
          </div>
          <Input label="Other Name" {...register('otherName')} placeholder="Middle name (optional)" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Admission Number" {...register('admissionNumber')} error={errors.admissionNumber?.message} placeholder="Auto-generated" />
            <Select
              label="Gender"
              {...register('gender')}
              error={errors.gender?.message}
              options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
            <Select
              label="Blood Group"
              {...register('bloodGroup')}
              options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }))}
              placeholder="Select blood group"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="State of Origin" {...register('stateOfOrigin')} placeholder="e.g. Jigawa" />
            <Input label="LGA" {...register('lga')} placeholder="Local Government Area" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Religion"
              {...register('religion')}
              options={[
                { value: 'Islam', label: 'Islam' },
                { value: 'Christianity', label: 'Christianity' },
                { value: 'Others', label: 'Others' },
              ]}
              placeholder="Select religion"
            />
            <Select
              label="Status"
              {...register('status')}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'GRADUATED', label: 'Graduated' },
                { value: 'TRANSFERRED', label: 'Transferred' },
              ]}
            />
          </div>
          <Input label="Address" {...register('address')} placeholder="Home address" />

          {/* Class Assignment — prevents future unassigned students */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Assign to Class *</label>
              <select
                {...register('classId')}
                className="input"
                defaultValue=""
              >
                <option value="">— Select Class —</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Student will be auto-enrolled in this class for the current session.</p>
            </div>
            <Select
              label="Status"
              {...register('status')}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'GRADUATED', label: 'Graduated' },
                { value: 'TRANSFERRED', label: 'Transferred' },
              ]}
            />
          </div>

          {/* Photo Upload */}
          <div className="form-group">
            <label className="label">Student Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                {photoPreview || editingStudent?.photo ? (
                  <img src={photoPreview || editingStudent?.photo} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Camera size={14} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview || editingStudent?.photo ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(''); setValue('photo' as any, ''); }}
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <p className="text-xs text-slate-400 mt-1">JPG/PNG, max 2MB. Used on ID card.</p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
        title="Remove Student"
        message={`Are you sure you want to remove ${deleteTarget?.firstName} ${deleteTarget?.lastName}? This action can be reversed.`}
        danger
      />
    </div>
  );
}
