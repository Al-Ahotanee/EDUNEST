import axios from 'axios';

export function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryApi = params.get('api');
      if (queryApi) {
        const clean = queryApi.replace(/\/+$/, '');
        localStorage.setItem('EDUNEST_API_URL', clean);
        return clean;
      }
    } catch {}

    const stored = localStorage.getItem('EDUNEST_API_URL');
    if (stored) {
      if (stored.includes('edunest-api.onrender.com')) {
        localStorage.removeItem('EDUNEST_API_URL');
      } else {
        return stored;
      }
    }
  }

  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && !envApi.includes('edunest-api.onrender.com')) {
    return envApi;
  }

  return (
    typeof window !== 'undefined' && window.location.port === '5173'
      ? 'http://localhost:3000/api/v1'
      : '/api/v1'
  );
}

export const API_BASE = resolveApiBase();

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor - attach token and dynamic baseURL
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const customApi = localStorage.getItem('EDUNEST_API_URL');
      if (customApi) {
        config.baseURL = customApi;
      }
    }
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const tenantSlug = localStorage.getItem('tenantSlug');
    if (tenantSlug) config.headers['x-tenant-slug'] = tenantSlug;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle 401 / refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/me'),
  changePassword: (data: any) => api.patch('/auth/change-password', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsApi = {
  list: (params?: any) => api.get('/students', { params }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  stats: () => api.get('/students/statistics'),
  genAdmNo: () => api.get('/students/generate-admission-number'),
  results: (id: string, termId?: string) => api.get(`/students/${id}/results`, { params: { termId } }),
  attendance: (id: string, termId?: string) => api.get(`/students/${id}/attendance`, { params: { termId } }),
  addGuardian: (id: string, data: any) => api.post(`/students/${id}/guardians`, data),
  // Returns latest term results for all students in the school (used by Promotions page)
  promotionResults: () => api.get('/students/promotion-results').catch(() => ({ data: [] })),
  promote: (id: string, data: any) => api.post(`/students/${id}/promote`, data),
};

// ─── Academic (alias: classesApi) ─────────────────────────────────────────────
export const classesApi = {
  list: (params?: any) => api.get('/academic/classes', { params }),
  get: (id: string) => api.get(`/academic/classes/${id}`),
  create: (data: any) => api.post('/academic/classes', data),
  update: (id: string, data: any) => api.put(`/academic/classes/${id}`, data),
  delete: (id: string) => api.delete(`/academic/classes/${id}`),
};

// ─── Finance ──────────────────────────────────────────────────────────────────
export const financeApi = {
  dashboard: () => api.get('/finance/dashboard'),
  monthlyTrend: (year?: number) => api.get('/finance/monthly-trend', { params: { year } }),
  feeStructures: (params?: any) => api.get('/finance/fee-structures', { params }),
  createFeeStructure: (data: any) => api.post('/finance/fee-structures', data),
  publishFeeStructure: (id: string) => api.patch(`/finance/fee-structures/${id}/publish`),
  getFeeStructuresByClass: (classId: string) => api.get(`/finance/fee-structures/by-class/${classId}`),
  generateInvoicesFromClass: (classId: string) => api.post(`/finance/fee-structures/generate-invoices/${classId}`),
  invoices: (params?: any) => api.get('/finance/invoices', { params }),
  getInvoice: (id: string) => api.get(`/finance/invoices/${id}`),
  createInvoice: (data: any) => api.post('/finance/invoices', data),
  recordPayment: (invoiceId: string, data: any) => api.post(`/finance/invoices/${invoiceId}/payments`, data),
};

// ─── Results ──────────────────────────────────────────────────────────────────
export const resultsApi = {
  matrix: (params: { classId: string; subjectId: string; termId: string }) =>
    api.get('/results/matrix', { params }),
  saveMatrix: (data: {
    classId: string;
    subjectId: string;
    termId: string;
    scores: any[];
    submitForApproval?: boolean;
  }) => api.post('/results/matrix/save', data),
  myAssignments: () => api.get('/results/my-assignments'),
  teacherAssignments: (userId?: string) =>
    api.get('/results/teacher-assignments', { params: { userId } }),
  assignTeacher: (data: any) => api.post('/results/teacher-assignments', data),
  deleteTeacherAssignment: (id: string) => api.delete(`/results/teacher-assignments/${id}`),
  pipeline: (termId: string) => api.get(`/results/pipeline/${termId}`),
  approve: (data: { termId: string; classId?: string; subjectId?: string }) =>
    api.post('/results/approve', data),
  publish: (data: { termId: string; classId?: string; subjectId?: string }) =>
    api.post('/results/publish', data),
  unpublish: (data: { termId: string; classId: string; subjectId?: string; reason?: string }) =>
    api.post('/results/unpublish', data),
  broadsheet: (classId: string, termId: string) =>
    api.get(`/results/broadsheet/${classId}/${termId}`),
  reportCard: (studentId: string, termId: string) =>
    api.get(`/results/report-card/student/${studentId}/term/${termId}`),
  endorseReportCard: (data: any) => api.post('/results/report-card/endorse', data),
  gradingScales: () => api.get('/results/grading-scales'),
  updateGradingScale: (id: string, data: any) => api.put(`/results/grading-scales/${id}`, data),
  stats: (termId: string) => api.get(`/results/statistics/term/${termId}`),
  enterScore: (data: any) => api.post('/results/score', data),
  bulkScores: (scores: any[]) => api.post('/results/bulk-score', { scores }),
  classResults: (classId: string, termId: string) =>
    api.get(`/results/class/${classId}/term/${termId}`),
};

// ─── Academic ─────────────────────────────────────────────────────────────────
export const academicApi = {
  sessions: (params?: any) => api.get('/academic/sessions', { params }),
  createSession: (data: any) => api.post('/academic/sessions', data),
  terms: (sessionId: string) => api.get(`/academic/sessions/${sessionId}/terms`),
  createTerm: (sessionId: string, data: any) => api.post(`/academic/sessions/${sessionId}/terms`, data),
  classes: (params?: any) => api.get('/academic/classes', { params }),
  createClass: (data: any) => api.post('/academic/classes', data),
  subjects: (params?: any) => api.get('/academic/subjects', { params }),
  createSubject: (data: any) => api.post('/academic/subjects', data),
  enroll: (data: any) => api.post('/academic/enroll', data),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  mark: (data: any) => api.post('/attendance', data),
  bulkMark: (data: any) => api.post('/attendance/bulk', data),
  list: (params?: any) => api.get('/attendance', { params }),
  stats: (params?: any) => api.get('/attendance/statistics', { params }),
};

// ─── HR / Staff ───────────────────────────────────────────────────────────────
export const hrApi = {
  list: (params?: any) => api.get('/hr/staff', { params }),
  get: (id: string) => api.get(`/hr/staff/${id}`),
  create: (data: any) => api.post('/hr/staff', data),
  update: (id: string, data: any) => api.put(`/hr/staff/${id}`, data),
  delete: (id: string) => api.delete(`/hr/staff/${id}`),
  departments: () => api.get('/hr/departments'),
  createDepartment: (data: any) => api.post('/hr/departments', data),
  leaves: (params?: any) => api.get('/hr/leaves', { params }),
  applyLeave: (data: any) => api.post('/hr/leaves', data),
  approveLeave: (id: string) => api.patch(`/hr/leaves/${id}/approve`),
  payroll: (params?: any) => api.get('/hr/payroll', { params }),
  generatePayroll: (data: any) => api.post('/hr/payroll/generate', data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  overview: () => api.get('/reports/overview'),
  enrollment: (params?: any) => api.get('/reports/enrollment', { params }),
  attendance: (params?: any) => api.get('/reports/attendance', { params }),
  finance: (params?: any) => api.get('/reports/finance', { params }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Schools ──────────────────────────────────────────────────────────────────
export const schoolsApi = {
  current: () => api.get('/schools/current'),
  updateCurrent: (data: any) => api.put('/schools/current', data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  roles: () => api.get('/users/roles'),
};

