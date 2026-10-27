import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { teacherApi } from '../services/api';

export function useTeacherAssignments() {
  const { user, isAuthenticated } = useAuthStore();

  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const userRoles = (user?.roles || []).map((r) => (r.name || '').toLowerCase());
  const isPrivileged =
    isSuperAdmin ||
    userRoles.some((n) =>
      ['admin', 'school admin', 'principal', 'proprietor', 'director', 'head of school'].some((t) =>
        n.includes(t)
      )
    );

  const isAccountant = userRoles.some((n) => n === 'accountant') && !isPrivileged;
  const isTeacher = userRoles.some((n) => n === 'teacher') && !isPrivileged && !isAccountant;

  const {
    data: teacherSummary,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['teacher-dashboard-summary'],
    queryFn: () => teacherApi.getDashboard().then((r) => r.data?.data || r.data),
    enabled: isAuthenticated && isTeacher,
    staleTime: 60000,
  });

  const roles = teacherSummary?.roles || {};
  const isClassMaster = Boolean(roles.isClassMaster);
  const isSubjectTeacher = Boolean(roles.isSubjectTeacher);
  const hasDualRole = Boolean(roles.hasDualRole);

  return {
    isTeacher,
    isPrivileged,
    isAccountant,
    isClassMaster,
    isSubjectTeacher,
    hasDualRole,
    classMaster: teacherSummary?.classMaster || null,
    teaching: teacherSummary?.teaching || null,
    academicState: teacherSummary?.academicState || null,
    teacherProfile: teacherSummary?.teacher || null,
    isLoading,
    refetch,
  };
}
