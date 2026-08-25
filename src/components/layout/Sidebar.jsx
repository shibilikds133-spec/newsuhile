import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, Coffee, FileBarChart, Lock, CalendarDays } from 'lucide-react';
import { useEvents } from '../../hooks/useEvents';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Income', path: '/income', icon: TrendingUp },
  { name: 'Expense', path: '/expense', icon: TrendingDown },
  { name: 'Refreshment', path: '/refreshment', icon: Coffee },
  { name: 'Events', path: '/events', icon: CalendarDays },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);
  const { events } = useEvents();

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

  const recentEvents = events ? events.slice(0, 3) : [];

  return (
    <div className="sidebar w-60 h-screen bg-primary-dark fixed hidden md:flex flex-col text-white shadow-xl flex-shrink-0 z-40">
      <div className="p-6 flex flex-col items-center border-b border-white/10">
        <div style={{ width: '200px', height: '200px' }} className="flex items-center justify-center cursor-pointer" onClick={handleLogoClick}>
          <img
            src="./image/logo.png"
            alt="Logo"
            className="w-full h-full object-contain select-none"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </div>
      
      <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
        {navItems.map((item) => (
          <React.Fragment key={item.path}>
            <NavLink
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
            
            {/* Render nested events under Events tab */}
            {item.name === 'Events' && recentEvents.length > 0 && (
              <div className="ml-9 flex flex-col border-l border-white/20 pl-2 mt-1 mb-2 gap-1">
                {recentEvents.map(ev => (
                  <NavLink
                    key={ev.id}
                    to={`/events/${ev.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-md text-[13px] transition-colors ${
                        isActive
                          ? 'text-white bg-white/10 font-semibold'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-80" />
                    <span className="truncate flex-1">{ev.name}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>
      
      <div className="p-4 border-t border-white/10 flex flex-col gap-4">
        {localStorage.getItem('app_password') && (
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            <Lock size={16} />
            Lock App
          </button>
        )}
        <div className="text-center text-xs text-white/40">
          MAKHDOOMIYYA &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
