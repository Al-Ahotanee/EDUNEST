import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Eye, Edit, Trash2, Download, GraduationCap, Filter, RefreshCw } from 'lucide-react';
import {
  DataTable, Button, Modal, Input, Select, Badge,
  ConfirmDialog, Avatar, StatCard, PageLoader, Card,
} from '../../components/ui';
import { studentsApi } from '../../services/api';
import { formatDate, getStatusBadge } from '../../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
});

type StudentForm = z.infer<typeof studentSchema>;

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(searchParams.get('action') === 'new');
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [viewStudent, setViewStudent] = useState<any>(null);

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
    reset({});
    setSearchParams({});
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setModalOpen(true);
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
