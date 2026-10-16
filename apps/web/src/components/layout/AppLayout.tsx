import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '../../lib/utils';
import { useTenantTheme } from '../../hooks/useTenantTheme';
import { OfflineBanner } from '../shared/OfflineBanner';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useTenantTheme(); // Apply school colors, logo, name globally

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Topbar
        sidebarCollapsed={collapsed}
        onToggleSidebar={() => setCollapsed(!collapsed)}
        onToggleMobile={() => setMobileOpen((prev) => !prev)}
      />
      <main
        className={cn(
          'transition-all duration-300 pt-16 min-h-screen ml-0',
          collapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <div className="p-6 sm:p-8 lg:p-10 w-full max-w-7xl 2xl:max-w-[1700px] mx-auto">
          <Outlet />
        </div>
      </main>
      <OfflineBanner />
    </div>
  );
}
