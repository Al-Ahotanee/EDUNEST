import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Send,
  Eye,
  FileCheck,
} from 'lucide-react';
import { Button, Select, PageLoader, Modal } from '../ui';
import { resultsApi } from '../../services/api';

interface ApprovalPipelineTabProps {
  terms: any[];
  selectedTerm: string;
  onTermChange: (id: string) => void;
  onViewBroadsheet?: (classId: string) => void;
}

export const ApprovalPipelineTab: React.FC<ApprovalPipelineTabProps> = ({
  terms,
  selectedTerm,
  onTermChange,
  onViewBroadsheet,
}) => {
  const queryClient = useQueryClient();
  const [selectedClassToUnlock, setSelectedClassToUnlock] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState('');

  const { data: pipeline, isLoading, refetch } = useQuery({
    queryKey: ['approval-pipeline', selectedTerm],
    queryFn: () => resultsApi.pipeline(selectedTerm).then((r) => r.data.data),
    enabled: !!selectedTerm,
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (classId: string) =>
      resultsApi.approve({ termId: selectedTerm, classId }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Class results approved by Principal!');
      queryClient.invalidateQueries({ queryKey: ['approval-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['score-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['class-broadsheet'] });
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to approve'),
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: (classId: string) =>
      resultsApi.publish({ termId: selectedTerm, classId }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Results published and officially locked!');
      queryClient.invalidateQueries({ queryKey: ['approval-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['score-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['class-broadsheet'] });
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to publish'),
  });

  // Unpublish Emergency Override Mutation
  const unpublishMutation = useMutation({
    mutationFn: (data: { classId: string; reason: string }) =>
      resultsApi.unpublish({ termId: selectedTerm, classId: data.classId, reason: data.reason }),
    onSuccess: () => {
      toast.success('Results unlocked and returned to DRAFT for corrections.');
      setSelectedClassToUnlock(null);
      setUnlockReason('');
      queryClient.invalidateQueries({ queryKey: ['approval-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['score-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['class-broadsheet'] });
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to unlock results'),
  });

  return (
    <div className="space-y-4">
      {/* Selector Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Select
            label="Filter Academic Term"
            value={selectedTerm}
            onChange={(e) => onTermChange(e.target.value)}
            options={terms.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.session?.name || ''})`,
            }))}
            placeholder="Select Term..."
          />
        </div>

        <div className="text-xs text-slate-500 max-w-md">
          <p className="font-semibold text-slate-800">Principal & Administrator Governance Pipeline</p>
          <p className="mt-0.5">
            Subject teachers submit scores &rarr; Class Masters compile broadsheets &rarr; Principal
            approves &rarr; Officially publish & lock.
          </p>
        </div>
      </div>

      {!selectedTerm ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">Please select an Academic Term</p>
          <p className="text-xs text-slate-400 mt-1">Class pipeline metrics will display automatically.</p>
        </div>
      ) : isLoading ? (
        <PageLoader />
      ) : !pipeline || pipeline.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic">
          No classes found for this school.
        </div>
      ) : (
        <div className="space-y-4">
          {pipeline.map((cls: any) => {
            const hasSubmissions = cls.submitted > 0;
            const hasDraftsOnly = cls.submitted === 0 && cls.drafts > 0 && cls.approved === 0 && cls.published === 0;
            const isFullyApproved = cls.approved > 0 && cls.submitted === 0 && cls.drafts === 0;
            const isFullyPublished = cls.published > 0 && cls.drafts === 0 && cls.submitted === 0 && cls.approved === 0;

            return (
              <div
                key={cls.classId}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {cls.className} {cls.section ? `(${cls.section})` : ''}
                      </h3>

                      {isFullyPublished ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-300">
                          <Lock size={12} />
                          Published & Locked
                        </span>
                      ) : isFullyApproved ? (
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-300">
                          <CheckCircle size={12} />
                          Approved by Principal
                        </span>
                      ) : hasSubmissions ? (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-amber-300">
                          <AlertTriangle size={12} />
                          Pending Principal Review
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-300">
                          In Teacher Drafts
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Class Master: <strong>{cls.classMasterName}</strong> • Enrolled Students:{' '}
                      <strong>{cls.enrolledStudents}</strong>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {onViewBroadsheet && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={() => onViewBroadsheet(cls.classId)}
                      >
                        Inspect Broadsheet
                      </Button>
                    )}

                    {hasSubmissions && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<CheckCircle size={14} className="text-blue-600" />}
                        loading={approveMutation.isPending && approveMutation.variables === cls.classId}
                        onClick={() => approveMutation.mutate(cls.classId)}
                      >
                        Approve Class Scores
                      </Button>
                    )}

                    {(isFullyApproved || cls.approved > 0) && !isFullyPublished && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<ShieldCheck size={14} />}
                        loading={publishMutation.isPending && publishMutation.variables === cls.classId}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Officially publish and lock results for ${cls.className}? Once published, all parents can view report cards and scores cannot be modified.`,
                            )
                          ) {
                            publishMutation.mutate(cls.classId);
                          }
                        }}
                      >
                        Publish to Portals
                      </Button>
                    )}

                    {isFullyPublished && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Unlock size={14} />}
                        onClick={() => setSelectedClassToUnlock(cls)}
                      >
                        Unlock / Reopen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Metric Counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Draft Scores</span>
                    <span className="font-bold text-slate-700 text-sm">{cls.drafts}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-amber-600 block text-[10px] uppercase font-bold">Submitted for Review</span>
                    <span className="font-bold text-amber-800 text-sm">{cls.submitted}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="text-blue-600 block text-[10px] uppercase font-bold">Approved Scores</span>
                    <span className="font-bold text-blue-800 text-sm">{cls.approved}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-emerald-600 block text-[10px] uppercase font-bold">Published & Locked</span>
                    <span className="font-bold text-emerald-800 text-sm">{cls.published}</span>
                  </div>
                </div>

                {/* Subject Submission Badges */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Subject Submissions Breakdown:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.subjects.map((sub: any) => {
                      const isSubPub = sub.status === 'PUBLISHED';
                      const isSubApp = sub.status === 'APPROVED';
                      const isSubSub = sub.status === 'SUBMITTED';

                      return (
                        <span
                          key={sub.subjectId}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                            isSubPub
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isSubApp
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : isSubSub
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span>{sub.subjectName}</span>
                          <span className="text-[9px] opacity-75 font-mono">({sub.totalRecorded})</span>
                          {isSubPub && <Lock size={10} />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Emergency Unlock Modal */}
      {selectedClassToUnlock && (
        <Modal
          open={!!selectedClassToUnlock}
          onClose={() => setSelectedClassToUnlock(null)}
          title={`Administrative Unlock: ${selectedClassToUnlock.className}`}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelectedClassToUnlock(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<Unlock size={14} />}
                loading={unpublishMutation.isPending}
                disabled={!unlockReason.trim()}
                onClick={() =>
                  unpublishMutation.mutate({
                    classId: selectedClassToUnlock.classId,
                    reason: unlockReason,
                  })
                }
              >
                Confirm Unlock to Draft
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900">
              <strong className="block text-sm mb-1">Administrative Warning</strong>
              Reverting published results to <strong>DRAFT</strong> will temporarily hide them from parent portals
              and allow assigned teachers to modify recorded examination scores.
            </div>

            <div>
              <label className="label">Reason for Revision (Mandatory Audit Log)</label>
              <textarea
                rows={3}
                className="input text-xs w-full p-2"
                placeholder="e.g., Mathematics marking error identified on question 4; Principal authorized resubmission."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
