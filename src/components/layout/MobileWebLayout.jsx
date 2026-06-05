import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Coffee, 
  FileBarChart,
  Settings,
  X,
  Cloud,
  CloudOff
} from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';

const navItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Income', path: '/income', icon: TrendingUp },
  { name: 'Expense', path: '/expense', icon: TrendingDown },
  { name: 'Refresh.', path: '/refreshment', icon: Coffee },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
];

const routeTitles = {
  '/': 'Dashboard',
  '/income': 'Income (Varav)',
  '/expense': 'Expense (Chilav)',
  '/refreshment': 'Refreshment',
  '/reports': 'Reports',
  '/system-admin': 'System Admin',
  '/health': 'System Health',
};

export default function MobileWebLayout() {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || 'Dawa Trust';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { syncStatus } = useTransactions();

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden font-sans select-none mobile-layout">
      {/* Branded Dark Green Header */}
      <header className="bg-primary-dark text-white px-4 h-16 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm border border-white/20">
            <img src="./image/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-white">Dawa Trust</h1>
            {currentTitle !== 'Dashboard' && (
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-widest">{currentTitle}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Sync Status Indicator */}
          <div className="flex items-center bg-black/20 px-2 py-1 rounded-full border border-white/10">
            {syncStatus === 'synced' && <Cloud size={14} className="text-green-400" />}
            {syncStatus === 'syncing' && <Cloud size={14} className="text-blue-400 animate-pulse" />}
            {syncStatus === 'error' && <CloudOff size={14} className="text-red-400" />}
          </div>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 p-4 pt-4">
        <div className="max-w-md mx-auto">
          {/* Inject a style to hide redundant page headers in mobile layout */}
          <style dangerouslySetInnerHTML={{ __html: `
            .mobile-layout main h1 { display: none !important; }
            .mobile-layout .space-y-6 > div:first-child { margin-bottom: 0 !important; }
            /* Hide the "Add New Income" title bar as well to save space */
            .mobile-layout .bg-gray-50 h2 { display: none !important; }
            .mobile-layout .bg-gray-50 { border-bottom: none !important; padding: 0 !important; }
          ` }} />
          <Outlet />
        </div>
      </main>

      {/* Floating Action Buttons (FAB) */}
      <div className="fixed bottom-24 left-0 right-0 flex justify-center gap-6 z-[45] pointer-events-none">
        <NavLink 
          to="/income" 
          className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-all pointer-events-auto border-4 border-white text-3xl font-light"
        >
          +
        </NavLink>
        <NavLink 
          to="/expense" 
          className="w-16 h-16 bg-danger text-white rounded-full flex items-center justify-center shadow-lg shadow-danger/40 active:scale-95 transition-all pointer-events-auto border-4 border-white text-3xl font-light"
        >
          &minus;
        </NavLink>
      </div>

      {/* Quick Access Sidebar/Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-primary-dark">App Settings</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex flex-col gap-3">
              <NavLink 
                to="/system-admin" 
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-4 rounded-2xl hover:bg-primary-light text-text font-medium transition-all border border-transparent hover:border-primary/20 shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">System Admin</div>
                  <div className="text-[10px] text-muted uppercase tracking-wider">Technical Settings</div>
                </div>
              </NavLink>
            </nav>
            
            <div className="mt-auto pt-6 border-t border-border text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
                <img src="./image/logo.png" alt="Logo" className="w-12 h-12 object-contain grayscale opacity-30" />
              </div>
              <p className="text-xs text-muted font-bold">Dawa Trust Dashboard</p>
              <p className="text-[10px] text-muted/50 mt-1 uppercase tracking-[0.2em]">Version 1.0.0</p>
            </div>
          </div>
        </div>
      )}

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-1 py-1 flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1.5 px-1 transition-all duration-300 flex-1 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'scale-110' : ''}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      {/* Safe Area Inset for iOS */}
      <div className="h-safe-area-bottom bg-white" />
    </div>
  );
}
