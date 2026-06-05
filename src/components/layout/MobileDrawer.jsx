import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, Coffee, FileBarChart, X } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Income (Varav)', path: '/income', icon: TrendingUp },
  { name: 'Expense (Chilav)', path: '/expense', icon: TrendingDown },
  { name: 'Refreshment (Chayachilav)', path: '/refreshment', icon: Coffee },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
];

export default function MobileDrawer({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="mobile-drawer fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 w-64 bg-primary-dark text-white shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="./image/logo.png" alt="Logo" className="h-12 w-auto object-contain brightness-0 invert" />
             <span className="font-semibold">Dawa Trust</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-md">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive
                    ? 'bg-primary-mid text-white'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
