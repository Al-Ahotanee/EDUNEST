import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserCheck, BookOpen, Trash2, Plus, Shield, Search } from 'lucide-react';
import { Button, Modal, Select, PageLoader } from '../ui';
import { resultsApi, hrApi, academicApi } from '../../services/api';

interface TeacherAssignmentsTabProps {
  classes: any[];
  subjects: any[];
}

export const TeacherAssignmentsTab: React.FC<TeacherAssignmentsTabProps> = ({ classes, subjects }) => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    userId: '',
    classId: '',
    subjectId: '',
    roleType: 'SUBJECT_TEACHER',
  });

  // Fetch all staff / teachers
  const { data: staffData } = useQuery({
    queryKey: ['staff-for-assignments'],
    queryFn: () => hrApi.list({ limit: 100 }).then((r) => r.data.data || []),
  });

  // Fetch current assignments
  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => resultsApi.teacherAssignments().then((r) => r.data.data || []),
  });

  // Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      resultsApi.assignTeacher({
        userId: data.userId,
        classId: data.classId,
        subjectId: data.roleType === 'CLASS_MASTER' ? undefined : data.subjectId || undefined,
        roleType: data.roleType,
      }),
    onSuccess: () => {
      toast.success('Teacher assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      setModalOpen(false);
      setForm({ userId: '', classId: '', subjectId: '', roleType: 'SUBJECT_TEACHER' });
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to assign teacher'),
  });

  // Delete Assignment Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => resultsApi.deleteTeacherAssignment(id),
    onSuccess: () => {
      toast.success('Assignment removed.');
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete assignment'),
  });

  const filteredAssignments = (assignments || []).filter((a: any) => {
    const q = searchTerm.toLowerCase();
    const teacherName = `${a.user?.firstName} ${a.user?.lastName}`.toLowerCase();
    const className = a.class?.name?.toLowerCase() || '';
    const subjectName = a.subject?.name?.toLowerCase() || '';
    return teacherName.includes(q) || className.includes(q) || subjectName.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search teacher, class, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input py-1.5 pl-8 pr-3 text-xs w-64 rounded-lg"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Active Assignments: <strong>{assignments?.length || 0}</strong>
          </span>
        </div>

        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          Assign Teacher
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic">
          No teacher assignments found. Click &ldquo;Assign Teacher&rdquo; to designate Class Masters and Subject Teachers.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Teacher / Staff</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Class & Arm</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.map((item: any, idx: number) => {
                const isClassMaster = item.roleType === 'CLASS_MASTER';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">
                        {item.user?.firstName} {item.user?.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.user?.email}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isClassMaster
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isClassMaster ? (
                          <>
                            <UserCheck size={11} />
                            Class Master
                          </>
                        ) : (
                          <>
                            <BookOpen size={11} />
                            Subject Teacher
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {item.class?.name} {item.class?.section ? `(${item.class?.section})` : ''}
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-medium">
                      {isClassMaster ? (
                        <span className="text-slate-400 italic">Entire Class Broadsheet & Endorsements</span>
                      ) : (
                        <span>
                          {item.subject?.name}{' '}
                          <span className="text-[10px] text-slate-400 font-mono">({item.subject?.code})</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Revoke this teacher assignment?')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Remove Assignment"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign Teacher to Class or Subject"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              disabled={!form.userId || !form.classId || (form.roleType === 'SUBJECT_TEACHER' && !form.subjectId)}
              onClick={() => createMutation.mutate(form)}
            >
              Save Assignment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Select Teacher / Staff"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            options={(staffData || []).map((s: any) => ({
              value: s.userId || s.id,
              label: `${s.firstName} ${s.lastName} (${s.designation || 'Teacher'})`,
            }))}
            placeholder="Select Teacher..."
          />

          <Select
            label="Assignment Role"
            value={form.roleType}
            onChange={(e) => setForm({ ...form, roleType: e.target.value })}
            options={[
              { value: 'SUBJECT_TEACHER', label: 'Subject Teacher (Manages score entry for specific subject)' },
              { value: 'CLASS_MASTER', label: 'Class Master / Form Teacher (Oversees class broadsheet & report endorsements)' },
            ]}
          />

          <Select
            label="Target Class"
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} ${c.section ? `(${c.section})` : ''}`,
            }))}
            placeholder="Select Class..."
          />

          {form.roleType === 'SUBJECT_TEACHER' && (
            <Select
              label="Assigned Subject"
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              options={subjects.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code})`,
              }))}
              placeholder="Select Subject..."
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
