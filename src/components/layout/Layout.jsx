import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileDrawer from './MobileDrawer';

const routeTitles = {
  '/': 'Dashboard',
  '/income': 'Income (Varav)',
  '/expense': 'Expense (Chilav)',
  '/refreshment': 'Refreshment (Chayachilav)',
  '/reports': 'Reports',
  '/system-admin': 'Technical & System Health',
};

export default function Layout() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const location = useLocation();
  
  const currentTitle = routeTitles[location.pathname] || 'Dashboard';

  return (
    <div className="flex h-screen bg-bg overflow-hidden font-sans">
      <Sidebar />
      <MobileDrawer isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} />
      
      <div className="flex-1 flex flex-col md:ml-60 h-screen overflow-hidden">
        <Topbar title={currentTitle} onMenuClick={() => setIsMobileDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
