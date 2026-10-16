import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Clock, Users, CreditCard,
  Megaphone, LogOut, Menu, X, Shield, Bell, ChevronDown,
  TrendingUp, Settings, DollarSign,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { EduNestIcon } from '../../components/common/EduNestLogo';

const navItems = [
  { to: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Platform Overview' },
  { to: '/super-admin/tenants', icon: Building2, label: 'All Schools' },
  { to: '/super-admin/pending', icon: Clock, label: 'Pending Approvals' },
  { to: '/super-admin/plans', icon: CreditCard, label: 'SaaS Plans & Pricing' },
  { to: '/super-admin/payments', icon: DollarSign, label: 'Platform Payments' },
  { to: '/super-admin/marketers', icon: Users, label: 'Marketers & Affiliates' },
  { to: '/super-admin/users', icon: Shield, label: 'Platform Staff' },
  { to: '/super-admin/broadcast', icon: Megaphone, label: 'Global Broadcast' },
];

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/super-admin/login');
    toast.success('Logged out from Platform Console');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Executive Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col z-20`}>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center flex-shrink-0 shadow-xs">
              <EduNestIcon size={22} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="truncate">
                <p className="text-sm font-bold text-white tracking-tight">EDUNEST</p>
                <p className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Root Governance</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Platform Governance
            </p>
          )}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                } ${!sidebarOpen && 'justify-center px-0'}`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </div>

        {/* School ERP Portal Switcher & User */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30 space-y-2">
          {sidebarOpen && (
            <NavLink
              to="/app/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors border border-slate-800"
            >
              <Building2 size={14} className="text-slate-400" />
              <span className="truncate">Switch to School Portal</span>
            </NavLink>
          )}

          <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm">
              {user?.firstName?.[0] || 'A'}
              {user?.lastName?.[0] || 'D'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-blue-400 truncate font-mono">Platform Admin</p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                title="Sign out of Console"
                className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Formal Institutional Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 justify-between shadow-xs z-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Platform Live
            </span>
            <div className="hidden sm:block h-4 w-px bg-slate-200" />
            <p className="hidden sm:block text-xs font-medium text-slate-500">
              Multi-Tenant Architecture · Central Operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium">
              <Shield size={14} className="text-blue-600" />
              <span>SaaS SuperAdmin Authority</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 bg-slate-50">
          <div className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
