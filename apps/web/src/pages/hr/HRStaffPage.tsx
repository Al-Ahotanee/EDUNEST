import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Users, UserCheck, Briefcase, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
import {
  DataTable, Button, Modal, Input, Select, StatCard, Badge, ConfirmDialog, Avatar,
} from '../../components/ui';
import { hrApi } from '../../services/api';
import { formatDate, formatCurrency } from '../../lib/utils';

export default function HRStaffPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [staffModal, setStaffModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveTab, setLeaveTab] = useState<'staff' | 'leaves' | 'payroll'>('staff');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff', page, search],
    queryFn: () => hrApi.list({ page, limit: 20, search }).then(r => r.data),
    placeholderData: (prev) => prev,
    enabled: leaveTab === 'staff',
  });

  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: () => hrApi.departments().then(r => r.data.data || []) });
  const { data: leavesData, isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves'], queryFn: () => hrApi.leaves({ limit: 50 }).then(r => r.data.data || []),
    enabled: leaveTab === 'leaves',
  });
  const { data: payrollData, isLoading: loadingPayroll } = useQuery({
    queryKey: ['payroll'], queryFn: () => hrApi.payroll({ limit: 20 }).then(r => r.data.data || []),
    enabled: leaveTab === 'payroll',
  });

  const staffForm = useForm({ defaultValues: { staffId: '', firstName: '', lastName: '', gender: 'MALE', designation: '', departmentId: '', employmentType: 'FULL_TIME', phone: '', email: '', salary: 0 } });
  const leaveForm = useForm({ defaultValues: { staffId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' } });

  const createMutation = useMutation({
    mutationFn: (d: any) => editing ? hrApi.update(editing.id, d) : hrApi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Staff updated!' : 'Staff added!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setStaffModal(false);
      setEditing(null);
      staffForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi.delete(id),
    onSuccess: () => { toast.success('Staff removed'); queryClient.invalidateQueries({ queryKey: ['staff'] }); setDeleteTarget(null); },
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
    onSuccess: () => { toast.success('Leave approved!'); queryClient.invalidateQueries({ queryKey: ['leaves'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleEdit = (staff: any) => {
    setEditing(staff);
    staffForm.reset({ ...staff, departmentId: staff.departmentId || '', salary: staff.salary || 0 });
    setStaffModal(true);
  };

  const staffColumns = [
    {
      key: 'name', header: 'Staff Member',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} photo={r.photo} size="sm" />
          <div>
            <p className="font-semibold text-slate-900">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-slate-400">{r.staffId}</p>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation', render: (r: any) => <span>{r.designation || '—'}</span> },
    { key: 'department', header: 'Department', render: (r: any) => <span>{r.department?.name || '—'}</span> },
    { key: 'employmentType', header: 'Type', render: (r: any) => <Badge status={r.employmentType === 'FULL_TIME' ? 'ACTIVE' : 'INACTIVE'} label={r.employmentType?.replace('_', ' ')} /> },
    { key: 'phone', header: 'Phone', render: (r: any) => <span className="text-sm">{r.phone || '—'}</span> },
    { key: 'salary', header: 'Salary', render: (r: any) => <span className="font-medium">{r.salary ? formatCurrency(r.salary) : '—'}</span> },
    { key: 'isActive', header: 'Status', render: (r: any) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', header: '',
      render: (r: any) => (
        <div className="flex gap-1">
          <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Edit size={15} /></button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  const totalStaff = data?.meta?.total || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Human Resources</h1>
          <p className="page-subtitle">Staff records, leave management and payroll</p>
        </div>
        <div className="flex gap-2">
          {leaveTab === 'staff' && (
            <>
              <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => refetch()}>Refresh</Button>
              <Button icon={<Plus size={16} />} onClick={() => setStaffModal(true)}>Add Staff</Button>
            </>
          )}
          {leaveTab === 'leaves' && (
            <Button icon={<Plus size={16} />} onClick={() => setLeaveModal(true)}>Apply Leave</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={totalStaff} icon={<Users size={20} />} color="blue" />
        <StatCard title="Full Time" value="—" icon={<UserCheck size={20} />} color="green" />
        <StatCard title="Departments" value={(deptData || []).length} icon={<Briefcase size={20} />} color="purple" />
        <StatCard title="On Leave" value="—" icon={<Users size={20} />} color="amber" />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['staff', 'leaves', 'payroll'] as const).map(t => (
          <button key={t} onClick={() => setLeaveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${leaveTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {leaveTab === 'staff' && (
        <DataTable data={data?.data || []} columns={staffColumns} loading={isLoading}
          onSearch={q => { setSearch(q); setPage(1); }} searchPlaceholder="Search staff..."
          pagination={data?.meta ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
          emptyMessage="No staff records found." />
      )}

      {leaveTab === 'leaves' && (
        <div className="card overflow-hidden">
          {loadingLeaves ? <div className="p-8 text-center text-slate-400">Loading...</div> :
            !leavesData?.length ? <div className="p-8 text-center text-slate-400">No leave applications found</div> :
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  {['Staff', 'Type', 'Start Date', 'End Date', 'Reason', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {leavesData.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{l.staff?.firstName} {l.staff?.lastName}</td>
                      <td className="px-4 py-3"><Badge status="ACTIVE" label={l.type} /></td>
                      <td className="px-4 py-3 text-sm">{formatDate(l.startDate)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(l.endDate)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{l.reason}</td>
                      <td className="px-4 py-3"><Badge status={l.status} /></td>
                      <td className="px-4 py-3">
                        {l.status === 'PENDING' && (
                          <Button size="sm" variant="secondary" onClick={() => approveLeaveMutation.mutate(l.id)} loading={approveLeaveMutation.isPending}>
                            Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {leaveTab === 'payroll' && (
        <div className="card p-6">
          {loadingPayroll ? <div className="text-center text-slate-400 py-8">Loading...</div> :
            !payrollData?.length ? <div className="text-center text-slate-400 py-8">No payroll records found</div> :
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  {['Month/Year', 'Status', 'Processed At', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {payrollData.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{new Date(0, p.month - 1).toLocaleString('default', { month: 'long' })} {p.year}</td>
                      <td className="px-4 py-3"><Badge status={p.status === 'COMPLETED' ? 'PAID' : p.status === 'DRAFT' ? 'INACTIVE' : 'PENDING'} label={p.status} /></td>
                      <td className="px-4 py-3 text-sm">{p.processedAt ? formatDate(p.processedAt) : '—'}</td>
                      <td className="px-4 py-3"><Button size="sm" variant="secondary">View Details</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* Staff Modal */}
      <Modal open={staffModal} onClose={() => { setStaffModal(false); setEditing(null); staffForm.reset(); }}
        title={editing ? 'Edit Staff' : 'Add Staff Member'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setStaffModal(false); setEditing(null); staffForm.reset(); }}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={staffForm.handleSubmit(d => createMutation.mutate(d))}>
              {editing ? 'Update' : 'Add Staff'}
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" {...staffForm.register('firstName')} placeholder="First name" />
            <Input label="Last Name" {...staffForm.register('lastName')} placeholder="Last name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Staff ID" {...staffForm.register('staffId')} placeholder="e.g. STF001" />
            <Select label="Gender" {...staffForm.register('gender')} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Designation" {...staffForm.register('designation')} placeholder="e.g. Class Teacher" />
            <Select label="Department" {...staffForm.register('departmentId')}
              options={(deptData || []).map((d: any) => ({ value: d.id, label: d.name }))}
              placeholder="Select department" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Employment Type" {...staffForm.register('employmentType')}
              options={[{ value: 'FULL_TIME', label: 'Full Time' }, { value: 'PART_TIME', label: 'Part Time' }, { value: 'CONTRACT', label: 'Contract' }]} />
            <Input label="Monthly Salary (₦)" type="number" {...staffForm.register('salary', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" {...staffForm.register('phone')} placeholder="Phone number" />
            <Input label="Email" type="email" {...staffForm.register('email')} placeholder="Email address" />
          </div>
        </div>
      </Modal>

      {/* Leave Application Modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Apply for Leave" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaveModal(false)}>Cancel</Button>
            <Button loading={applyLeaveMutation.isPending} onClick={leaveForm.handleSubmit(d => applyLeaveMutation.mutate(d))}>
              Submit Application
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Select label="Staff Member" {...leaveForm.register('staffId')}
            options={[]} placeholder="Select staff" />
          <Select label="Leave Type" {...leaveForm.register('type')}
            options={['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'CASUAL', 'STUDY'].map(v => ({ value: v, label: v }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...leaveForm.register('startDate')} />
            <Input label="End Date" type="date" {...leaveForm.register('endDate')} />
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea {...leaveForm.register('reason')} rows={3} className="input resize-none" placeholder="Reason for leave..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} loading={deleteMutation.isPending}
        title="Remove Staff" message={`Remove ${deleteTarget?.firstName} ${deleteTarget?.lastName} from staff records?`} danger />
    </div>
  );
}
