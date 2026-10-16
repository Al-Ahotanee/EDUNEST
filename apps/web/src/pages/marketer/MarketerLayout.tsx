import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, User, LogOut, Menu, X, TrendingUp, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/marketer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/marketer/referrals', icon: Users, label: 'My Referrals' },
  { to: '/marketer/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/marketer/profile', icon: User, label: 'Profile' },
];

export default function MarketerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const marketer = JSON.parse(localStorage.getItem('marketer_data') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('marketer_token');
    localStorage.removeItem('marketer_data');
    navigate('/marketer/login');
    toast.success('Logged out');
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col shadow-sm`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <p className="text-sm font-bold text-gray-800">SchoolERP</p>
                <p className="text-xs text-violet-500">Marketer Portal</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-gray-400 hover:text-gray-600">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`
              }>
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 flex-shrink-0">
              {marketer.firstName?.[0]}{marketer.lastName?.[0]}
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{marketer.firstName} {marketer.lastName}</p>
                  <p className="text-xs text-gray-400 truncate">Marketer</p>
                </div>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={16} /></button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Marketer Portal</h1>
          {marketer.referralCode && (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-violet-600 font-medium">Referral Code:</span>
              <code className="text-xs font-bold text-violet-700">{marketer.referralCode}</code>
              <button onClick={() => { navigator.clipboard.writeText(marketer.referralCode); toast.success('Copied!'); }} className="text-violet-500 hover:text-violet-700">
                <Copy size={12} />
              </button>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
