import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell, Search, ChevronRight, LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const ROUTE_LABELS: Record<string, string> = {
  app:'App', dashboard:'Dashboard', students:'Students', admissions:'Admissions',
  academic:'Academic', sessions:'Sessions & Terms', classes:'Classes', subjects:'Subjects',
  attendance:'Attendance', results:'Results', cbt:'CBT Exams', finance:'Finance',
  invoices:'Invoices', fees:'Fee Structures', hr:'Human Resources', staff:'Staff',
  departments:'Departments', leaves:'Leave Management', payroll:'Payroll',
  library:'Library', hostel:'Hostel', health:'Health Records', inventory:'Inventory',
  timetable:'Timetable', notifications:'Notifications', reports:'Reports',
  settings:'Settings',
};

function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  return (
    <nav className="flex items-center gap-1.5 text-sm whitespace-nowrap">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const label = ROUTE_LABELS[part] || part.charAt(0).toUpperCase() + part.slice(1);
        const path = '/' + parts.slice(0, i + 1).join('/');
        return (
          <React.Fragment key={part}>
            {i > 0 && <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
            {isLast
              ? <span className="font-semibold text-slate-900">{label}</span>
              : <Link to={path} className="text-slate-500 hover:text-slate-700 transition-colors">{label}</Link>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function Topbar({
  sidebarCollapsed,
  onToggleSidebar,
  onToggleMobile,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobile?: () => void;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Fetch REAL notifications (was previously hardcoded fake data — P1 fix)
  const { data: notifData } = useQuery({
    queryKey: ['topbar-notifications'],
    queryFn: () => api.get('/notifications?limit=5').then((r) => r.data?.data || []),
    retry: false,
    refetchInterval: 60000,
  });
  const notifications = Array.isArray(notifData) ? notifData : [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const schoolName = user?.tenant?.name || user?.school?.name || user?.school?.name || 'School Portal';
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white border-b border-slate-100 z-30 flex items-center px-3 sm:px-4 gap-2 sm:gap-4 left-0 transition-all duration-300 print:hidden',
        sidebarCollapsed ? 'md:left-16' : 'md:left-64'
      )}
    >
      <button
        onClick={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            onToggleMobile?.();
          } else {
            onToggleSidebar();
          }
        }}
        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
        aria-label="Toggle Navigation Menu"
      >
        <Menu size={20} />
      </button>
      <div className="overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* School name badge — hidden on mobile to save horizontal space */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-shrink-0">
        {user?.tenant?.logo && (
          <img src={user.tenant.logo} alt="" className="w-5 h-5 rounded object-contain" />
        )}
        <span className="text-xs font-semibold text-slate-600 truncate max-w-40">{schoolName}</span>
      </div>

      {/* Notifications */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-12 w-[min(20rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <Link to="/app/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n: any, i: number) => (
                  <Link to="/app/notifications" key={n.id || i} onClick={() => setNotifOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.isRead ? 'bg-slate-300' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
          className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="User menu"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {initials}
          </div>
          <div className="hidden md:block text-left min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-32">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.roles?.[0]?.name || (user?.isSuperAdmin ? 'Administrator' : 'User')}</p>
          </div>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-52 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              <Link to="/app/settings" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <User size={15} /> Profile
              </Link>
              <Link to="/app/settings" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <Settings size={15} /> Settings
              </Link>
            </div>
            <div className="p-1.5 border-t border-slate-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
