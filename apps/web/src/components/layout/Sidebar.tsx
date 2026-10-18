import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  DollarSign, UserCog, Monitor, Library, Bed, Heart, Package,
  Calendar, Bell, BarChart3, Settings, ChevronDown, ChevronRight,
  School, LogOut, ClipboardCheck, Award, FileText, Building2, X, Briefcase,
} from 'lucide-react';
import { EduNestIcon } from '../common/EduNestLogo';

// School-branded logo component — uses school name first letter when no logo
function SchoolLogo({ school, size = 22 }: { school: any; size?: number }) {
  if (school?.logo) {
    return <img src={school.logo} alt={school.name} className="rounded-xl object-contain bg-white p-0.5" style={{ width: size + 14, height: size + 14 }} />;
  }
  // Use first letter of school name as the logo
  const initial = school?.name?.[0] || 'S';
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shadow-xs"
      style={{ width: size + 14, height: size + 14 }}>
      <span className="text-white font-bold" style={{ fontSize: size - 4 }}>{initial}</span>
    </div>
  );
}

// Each item declares the permission(s) needed to see it.
// Items without `requiredPermission` are visible to all authenticated users.
// Items with `adminOnly: true` are only visible to users with role 'Super Admin' (or isSuperAdmin flag).
interface NavItemDef {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItemDef[];
  adminOnly?: boolean;
  requiredPermission?: { module: string; action: string };
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Students',
    icon: <GraduationCap size={18} />,
    children: [
      { label: 'All Students', path: '/app/students', icon: <Users size={16} />, requiredPermission: { module: 'students', action: 'read' } },
      { label: 'Admissions', path: '/app/admissions', icon: <FileText size={16} />, adminOnly: true },
      { label: 'Promotions', path: '/app/students/promotions', icon: <Award size={16} />, adminOnly: true },
    ],
  },
  {
    label: 'Academic',
    icon: <BookOpen size={18} />,
    children: [
      { label: 'Sessions & Terms', path: '/app/academic/sessions', icon: <Calendar size={16} />, adminOnly: true },
      { label: 'Classes', path: '/app/academic/classes', icon: <School size={16} />, requiredPermission: { module: 'academic', action: 'read' } },
      { label: 'Subjects', path: '/app/academic/subjects', icon: <BookOpen size={16} />, requiredPermission: { module: 'academic', action: 'read' } },
      { label: 'Timetable', path: '/app/timetable', icon: <ClipboardList size={16} />, requiredPermission: { module: 'academic', action: 'read' } },
    ],
  },
  { label: 'Attendance', path: '/app/attendance', icon: <ClipboardCheck size={18} />, requiredPermission: { module: 'attendance', action: 'read' } },
  { label: 'Results', path: '/app/results', icon: <Award size={18} />, requiredPermission: { module: 'results', action: 'read' } },
  { label: 'CBT Exams', path: '/app/cbt', icon: <Monitor size={18} />, requiredPermission: { module: 'academic', action: 'read' } },
  { label: 'Teacher Management', path: '/app/teacher-management', icon: <Briefcase size={18} />, adminOnly: true },
  { label: 'Staff Documents', path: '/app/staff-documents', icon: <FileText size={18} />, adminOnly: true },
  {
    label: 'Finance',
    icon: <DollarSign size={18} />,
    adminOnly: true,
    children: [
      { label: 'Overview', path: '/app/finance', icon: <BarChart3 size={16} />, adminOnly: true },
      { label: 'Invoices', path: '/app/finance/invoices', icon: <FileText size={16} />, adminOnly: true },
      { label: 'Fee Structures', path: '/app/finance/fees', icon: <DollarSign size={16} />, adminOnly: true },
    ],
  },
  {
    label: 'Human Resources',
    icon: <UserCog size={18} />,
    adminOnly: true,
    children: [
      { label: 'Staff', path: '/app/hr/staff', icon: <Users size={16} />, adminOnly: true },
      { label: 'Departments', path: '/app/hr/departments', icon: <School size={16} />, adminOnly: true },
      { label: 'Leave Management', path: '/app/hr/leaves', icon: <ClipboardList size={16} />, adminOnly: true },
      { label: 'Payroll', path: '/app/hr/payroll', icon: <DollarSign size={16} />, adminOnly: true },
    ],
  },
  { label: 'Library', path: '/app/library', icon: <Library size={18} />, adminOnly: true },
  { label: 'Hostel', path: '/app/hostel', icon: <Bed size={18} />, adminOnly: true },
  { label: 'Health Records', path: '/app/health', icon: <Heart size={18} />, adminOnly: true },
  { label: 'Inventory', path: '/app/inventory', icon: <Package size={18} />, adminOnly: true },
  { label: 'Notifications', path: '/app/notifications', icon: <Bell size={18} /> },
  { label: 'Reports', path: '/app/reports', icon: <BarChart3 size={18} />, adminOnly: true },
  { label: 'Settings', path: '/app/settings', icon: <Settings size={18} /> },
];

function NavItemComponent({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    item.children?.some((c: any) => c.path && location.pathname.startsWith(c.path)) || false
  );

  if (item.children) {
    const isActive = item.children.some((c: any) => c.path && location.pathname.startsWith(c.path));
    if (collapsed) {
      return (
        <NavLink
          to={item.children[0]?.path || '#'}
          title={item.label}
          onClick={onNavigate}
          className={({ isActive: a }) => cn('flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all',
            a ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white')}>
          {item.icon}
        </NavLink>
      );
    }
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className={cn('sidebar-item w-full', isActive && !open && 'text-white bg-white/10')}>
          <span className="flex-shrink-0">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child: any) => (
              <NavLink
                key={child.label}
                to={child.path}
                onClick={onNavigate}
                className={({ isActive }) => cn('sidebar-item', isActive && 'active')}>
                <span className="flex-shrink-0">{child.icon}</span>
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (collapsed) {
    return (
      <NavLink
        to={item.path}
        title={item.label}
        onClick={onNavigate}
        className={({ isActive }) => cn('flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all',
          isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white')}>
        {item.icon}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path!}
      onClick={onNavigate}
      className={({ isActive }) => cn('sidebar-item', isActive && 'active')}>
      <span className="flex-shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
}

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ collapsed, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const isCollapsed = collapsed && !mobileOpen;

  // Filter nav items based on user role/permissions
  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    const isSuperAdmin = user.isSuperAdmin || user.roles?.some((r) => r.name === 'Super Admin');

    const filterItem = (item: NavItemDef): NavItemDef | null => {
      // Admin-only items: visible to Super Admin only
      if (item.adminOnly && !isSuperAdmin) return null;

      // Items requiring a specific permission
      if (item.requiredPermission) {
        const hasPermission = isSuperAdmin || user.roles?.some((r) =>
          r.permissions?.some((p) => p.module === item.requiredPermission!.module && p.action === item.requiredPermission!.action)
        );
        if (!hasPermission) return null;
      }

      // For items with children, filter the children too
      if (item.children) {
        const visibleChildren = item.children
          .map((c) => filterItem(c))
          .filter((c): c is NavItemDef => c !== null);
        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      }

      return item;
    };

    return NAV_ITEMS
      .map((item) => filterItem(item))
      .filter((item): item is NavItemDef => item !== null);
  }, [user]);

  const displayRole = user?.isSuperAdmin
    ? 'School Administrator'
    : user?.roles?.[0]?.name || 'Staff Member';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 bg-slate-900',
        mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full',
        'md:translate-x-0',
        collapsed ? 'md:w-16' : 'md:w-64'
      )}
    >
      {/* Logo / School Branding */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {user?.tenant?.logo ? (
              <img src={user.tenant.logo} alt={user.tenant.name} className="w-9 h-9 rounded-xl object-contain bg-white p-0.5" />
            ) : (
              <SchoolLogo school={user?.school || user?.tenant || { name: user?.school?.name || 'S' }} size={22} />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{user?.school?.name || user?.tenant?.name || 'School Portal'}</p>
              <p className="text-xs text-slate-400 truncate">{displayRole}</p>
            </div>
          )}
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!isCollapsed && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-1">School Operations</p>}
        {visibleNavItems.map(item => (
          <NavItemComponent
            key={item.label}
            item={item}
            collapsed={isCollapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </nav>

      {/* User */}
      {!isCollapsed && (
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{displayRole}</p>
            </div>
            <button
              onClick={() => {
                onCloseMobile?.();
                logout();
              }}
              title="Logout"
              className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
