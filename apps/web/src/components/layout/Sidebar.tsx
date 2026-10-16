import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  DollarSign, UserCog, Monitor, Library, Bed, Heart, Package,
  Calendar, Bell, BarChart3, Settings, ChevronDown, ChevronRight,
  School, LogOut, ClipboardCheck, Award, FileText, Building2, X,
} from 'lucide-react';
import { EduNestIcon } from '../common/EduNestLogo';

const NAV_ITEMS: any[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Students',
    icon: <GraduationCap size={18} />,
    children: [
      { label: 'All Students', path: '/app/students', icon: <Users size={16} /> },
      { label: 'Admissions', path: '/app/admissions', icon: <FileText size={16} /> },
      { label: 'Promotions', path: '/app/students/promotions', icon: <Award size={16} /> },
    ],
  },
  {
    label: 'Academic',
    icon: <BookOpen size={18} />,
    children: [
      { label: 'Sessions & Terms', path: '/app/academic/sessions', icon: <Calendar size={16} /> },
      { label: 'Classes', path: '/app/academic/classes', icon: <School size={16} /> },
      { label: 'Subjects', path: '/app/academic/subjects', icon: <BookOpen size={16} /> },
      { label: 'Timetable', path: '/app/timetable', icon: <ClipboardList size={16} /> },
    ],
  },
  { label: 'Attendance', path: '/app/attendance', icon: <ClipboardCheck size={18} /> },
  { label: 'Results', path: '/app/results', icon: <Award size={18} /> },
  { label: 'CBT Exams', path: '/app/cbt', icon: <Monitor size={18} /> },
  {
    label: 'Finance',
    icon: <DollarSign size={18} />,
    children: [
      { label: 'Overview', path: '/app/finance', icon: <BarChart3 size={16} /> },
      { label: 'Invoices', path: '/app/finance/invoices', icon: <FileText size={16} /> },
      { label: 'Fee Structures', path: '/app/finance/fees', icon: <DollarSign size={16} /> },
    ],
  },
  {
    label: 'Human Resources',
    icon: <UserCog size={18} />,
    children: [
      { label: 'Staff', path: '/app/hr/staff', icon: <Users size={16} /> },
      { label: 'Departments', path: '/app/hr/departments', icon: <School size={16} /> },
      { label: 'Leave Management', path: '/app/hr/leaves', icon: <ClipboardList size={16} /> },
      { label: 'Payroll', path: '/app/hr/payroll', icon: <DollarSign size={16} /> },
    ],
  },
  { label: 'Library', path: '/app/library', icon: <Library size={18} /> },
  { label: 'Hostel', path: '/app/hostel', icon: <Bed size={18} /> },
  { label: 'Health Records', path: '/app/health', icon: <Heart size={18} /> },
  { label: 'Inventory', path: '/app/inventory', icon: <Package size={18} /> },
  { label: 'Notifications', path: '/app/notifications', icon: <Bell size={18} /> },
  { label: 'Reports', path: '/app/reports', icon: <BarChart3 size={18} /> },
  { label: 'Settings', path: '/app/settings', icon: <Settings size={18} /> },
];

function NavItemComponent({
  item,
  collapsed,
  onNavigate,
}: {
  item: any;
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

  const displayRole = user?.roles?.[0]?.name === 'Super Admin'
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
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shadow-xs">
                <EduNestIcon size={22} className="text-white" />
              </div>
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
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!isCollapsed && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-1">School Operations</p>}
        {NAV_ITEMS.map(item => (
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
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
