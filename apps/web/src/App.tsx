import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { Users } from 'lucide-react';

// Public
import LandingPage from './pages/landing/LandingPage';
import SaasRegisterPage from './pages/saas/SaasRegisterPage';
import ParentPortalPage from './pages/parent-portal/ParentPortalPage';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SchoolLandingPage from './pages/school-portal/SchoolLandingPage';
import AdmissionApplicationPage from './pages/school-portal/AdmissionApplicationPage';
import AdmissionStatusCheckerPage from './pages/school-portal/AdmissionStatusCheckerPage';
import SchoolFeesPublicPage from './pages/school-portal/SchoolFeesPublicPage';
import WebsiteBuilderPage from './pages/settings/WebsiteBuilderPage';

// Super Admin
import SuperAdminLoginPage from './pages/super-admin/SuperAdminLoginPage';
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import SADashboard from './pages/super-admin/SADashboard';
import SATenantsPage from './pages/super-admin/SATenantsPage';
import SAPendingPage from './pages/super-admin/SAPendingPage';
import SAMarketersPage from './pages/super-admin/SAMarketersPage';
import SABroadcastPage from './pages/super-admin/SABroadcastPage';
import SAUsersPage from './pages/super-admin/SAUsersPage';
import SAPlansPage from './pages/super-admin/SAPlansPage';
import SAPaymentsPage from './pages/super-admin/SAPaymentsPage';

// Marketer
import MarketerLoginPage from './pages/marketer/MarketerLoginPage';
import MarketerLayout from './pages/marketer/MarketerLayout';
import MarketerDashboard from './pages/marketer/MarketerDashboard';

// School App
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import StudentDetailPage from './pages/students/StudentDetailPage';
import PromotionsPage from './pages/students/PromotionsPage';
import AdminAdmissionsPage from './pages/admissions/AdminAdmissionsPage';
import AcademicPage from './pages/academic/AcademicPage';
import AttendancePage from './pages/attendance/AttendancePage';
import ResultsPage from './pages/results/ResultsPage';
import FinancePage from './pages/finance/FinancePage';
import AccountantDashboardPage from './pages/finance/AccountantDashboardPage';
import FinancialPolicyPage from './pages/finance/FinancialPolicyPage';
import ClassMasterFinancePage from './pages/finance/ClassMasterFinancePage';
import OutstandingFeesReportPage from './pages/finance/OutstandingFeesReportPage';
import DailyCollectionReportPage from './pages/finance/DailyCollectionReportPage';
import HRStaffPage from './pages/hr/HRStaffPage';
import TeacherManagementPage from './pages/teacher-management/TeacherManagementPage';
import StaffDocumentsPage from './pages/staff-documents/StaffDocumentsPage';
import StaffAppointmentFormPage from './pages/staff-appointment/StaffAppointmentFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import CbtPage from './pages/cbt/CbtPage';
import LibraryPage from './pages/library/LibraryPage';
import HostelPage from './pages/hostel/HostelPage';
import HealthPage from './pages/health/HealthPage';
import InventoryPage from './pages/inventory/InventoryPage';
import TimetablePage from './pages/timetable/TimetablePage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import PlaceholderPage from './pages/shared/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60000, retry: 1, refetchOnWindowFocus: false } },
});

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore(s => s.isAuthenticated);
  return auth ? <>{children}</> : <Navigate to="/login" replace />;
}

function Public({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore(s => s.isAuthenticated);
  return auth ? <Navigate to="/app/dashboard" replace /> : <>{children}</>;
}

function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;
  // SECURITY FIX: Check isSuperAdmin flag, NOT role name
  if (!user?.isSuperAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function MarketerOnly({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('marketer_token');
  if (!token) return <Navigate to="/marketer/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* P0 prevention: wrap the entire app in an ErrorBoundary so any
          uncaught render error (e.g. a missing import like the Round 6
          FileText crash) shows a friendly fallback UI instead of a
          blank white screen. The boundary catches errors during render,
          in lifecycle methods, and in constructors of the whole tree below. */}
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            {/* ── Public / Marketing ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/saas/register" element={<SaasRegisterPage />} />
            <Route path="/register" element={<Navigate to="/saas/register" replace />} />
            <Route path="/parent-portal" element={<ParentPortalPage />} />
            <Route path="/parent-portal/login" element={<ParentPortalPage />} />
            <Route path="/login" element={<Public><LoginPage /></Public>} />
            <Route path="/login/:tenantSlug" element={<Public><LoginPage /></Public>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ── School Public Portals ── */}
          <Route path="/school/:slug" element={<SchoolLandingPage />} />
          <Route path="/school/:slug/fees" element={<SchoolFeesPublicPage />} />
          <Route path="/school/:slug/apply" element={<AdmissionApplicationPage />} />
          <Route path="/school/:slug/apply/status" element={<AdmissionStatusCheckerPage />} />

          {/* Legacy admission portal route */}
          <Route path="/admissions/:schoolSlug" element={<AdmissionApplicationPage />} />
          <Route path="/admissions/:schoolSlug/status" element={<AdmissionStatusCheckerPage />} />

          {/* ── Super Admin (Platform) ── */}
          <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
          <Route path="/super-admin" element={<SuperAdminOnly><SuperAdminLayout /></SuperAdminOnly>}>
            <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
            <Route path="dashboard" element={<SADashboard />} />
            <Route path="tenants" element={<SATenantsPage />} />
            <Route path="pending" element={<SAPendingPage />} />
            <Route path="plans" element={<SAPlansPage />} />
            <Route path="payments" element={<SAPaymentsPage />} />
            <Route path="marketers" element={<SAMarketersPage />} />
            <Route path="users" element={<SAUsersPage />} />
            <Route path="broadcast" element={<SABroadcastPage />} />
            <Route path="subscriptions" element={<Navigate to="/super-admin/plans" replace />} />
          </Route>

          {/* ── Marketer Portal ── */}
          <Route path="/marketer/login" element={<MarketerLoginPage />} />
          <Route path="/marketer" element={<MarketerOnly><MarketerLayout /></MarketerOnly>}>
            <Route index element={<Navigate to="/marketer/dashboard" replace />} />
            <Route path="dashboard" element={<MarketerDashboard />} />
            <Route path="referrals" element={<MarketerDashboard />} />
            <Route path="earnings" element={<MarketerDashboard />} />
            <Route path="profile" element={<MarketerDashboard />} />
          </Route>

          {/* ── School App ── */}
          <Route path="/app" element={<Protected><AppLayout /></Protected>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/new" element={<StudentsPage />} />
            <Route path="students/promotions" element={<PromotionsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="admissions" element={<AdminAdmissionsPage />} />
            <Route path="academic/sessions" element={<AcademicPage />} />
            <Route path="academic/classes" element={<AcademicPage />} />
            <Route path="academic/subjects" element={<AcademicPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="cbt" element={<CbtPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/invoices" element={<FinancePage />} />
            <Route path="finance/fees" element={<FinancePage />} />
            <Route path="finance/accountant" element={<AccountantDashboardPage />} />
            <Route path="finance/class-master" element={<ClassMasterFinancePage />} />
            <Route path="finance/policy" element={<FinancialPolicyPage />} />
            <Route path="finance/outstanding-fees" element={<OutstandingFeesReportPage />} />
            <Route path="finance/daily-collection" element={<DailyCollectionReportPage />} />
            <Route path="hr/staff" element={<HRStaffPage />} />
            <Route path="teacher-management" element={<TeacherManagementPage />} />
            <Route path="staff-documents" element={<StaffDocumentsPage />} />
            <Route path="staff-appointment" element={<StaffAppointmentFormPage />} />
            <Route path="hr/departments" element={<HRStaffPage />} />
            <Route path="hr/leaves" element={<HRStaffPage />} />
            <Route path="hr/payroll" element={<HRStaffPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="hostel" element={<HostelPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="website-builder" element={<WebsiteBuilderPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Legacy / Direct shortcuts redirects to authenticated app */}
          <Route path="/website-builder" element={<Navigate to="/app/website-builder" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/students" element={<Navigate to="/app/students" replace />} />
          <Route path="/attendance" element={<Navigate to="/app/attendance" replace />} />
          <Route path="/results" element={<Navigate to="/app/results" replace />} />
          <Route path="/finance" element={<Navigate to="/app/finance" replace />} />
          <Route path="/finance/*" element={<Navigate to="/app/finance" replace />} />
          <Route path="/hr" element={<Navigate to="/app/hr/staff" replace />} />
          <Route path="/hr/*" element={<Navigate to="/app/hr/staff" replace />} />
          <Route path="/cbt" element={<Navigate to="/app/cbt" replace />} />
          <Route path="/library" element={<Navigate to="/app/library" replace />} />
          <Route path="/hostel" element={<Navigate to="/app/hostel" replace />} />
          <Route path="/health" element={<Navigate to="/app/health" replace />} />
          <Route path="/inventory" element={<Navigate to="/app/inventory" replace />} />
          <Route path="/timetable" element={<Navigate to="/app/timetable" replace />} />
          <Route path="/notifications" element={<Navigate to="/app/notifications" replace />} />
          <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center space-y-4">
                <h1 className="text-6xl font-black text-slate-300">404</h1>
                <p className="text-lg font-semibold text-slate-600">Page Not Found</p>
                <p className="text-sm text-slate-400">The page you're looking for doesn't exist or has been moved.</p>
                <a href="/app/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Back to Dashboard
                </a>
              </div>
            </div>
          } />
        </Routes>
        </BrowserRouter>
      </ErrorBoundary>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1e293b', color: '#f1f5f9', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
