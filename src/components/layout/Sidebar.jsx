import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, Coffee, FileBarChart } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Income (Varav)', path: '/income', icon: TrendingUp },
  { name: 'Expense (Chilav)', path: '/expense', icon: TrendingDown },
  { name: 'Refreshment (Chayachilav)', path: '/refreshment', icon: Coffee },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);

  const handleLogoClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        navigate('/system-admin');
        return 0; // Reset after navigation
      }
      return newCount;
    });
  };

  // Reset click count after 2 seconds of inactivity
  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => setClickCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  return (
    <div className="sidebar w-60 h-screen bg-primary-dark fixed hidden md:flex flex-col text-white shadow-xl flex-shrink-0 z-40">
      <div className="p-6 flex flex-col items-center border-b border-white/10">
        <div style={{ width: '200px', height: '200px' }} className="flex items-center justify-center mb-3 cursor-pointer" onClick={handleLogoClick}>
          <img
            src="./image/logo.png"
            alt="Logo"
            className="w-full h-full object-contain select-none"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-center">Dawa Trust</h1>
      </div>
      
      <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-primary-mid text-white'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={20} strokeWidth={2.5} />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 text-center text-xs text-white/40 border-t border-white/10">
        Dawa Trust &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
