import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';

export default function DatePicker({ label, name, value, onChange, required, error, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fallback to today if no value
  const dateObj = value ? new Date(value) : new Date();
  
  // State for the calendar view (might be navigating without selecting)
  const [viewYear, setViewYear] = useState(dateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(dateObj.getMonth()); // 0-11

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleDaySelect = (day) => {
    const m = (viewMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    // Call the original form onChange or a custom onChange
    if (typeof onChange === 'function') {
      // Mock an event object for Formik/custom form handlers if needed
      onChange({ target: { name, value: `${viewYear}-${m}-${d}` } });
    }
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
  const firstDayOfMonth = getDay(startOfMonth(new Date(viewYear, viewMonth))); // 0=Sun, 6=Sat
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const displayFormat = value ? format(new Date(value), 'dd MMM yyyy') : 'Select date';
  
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Hidden native input for forms that rely on it */}
        <input type="hidden" name={name} value={value || ''} />
        
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
            error ? 'border-danger text-danger focus:ring-danger focus:border-danger' : 'border-border text-text'
          }`}
        >
          <span className={value ? 'text-text' : 'text-muted'}>{displayFormat}</span>
          <CalendarIcon size={16} className={error ? 'text-danger' : 'text-muted'} />
        </button>

        {/* Calendar Popup */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden border border-border p-4 animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-black text-lg text-text">
                  {format(new Date(viewYear, viewMonth), 'MMMM yyyy')}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {weekDays.map(d => (
                  <div key={d} className="text-[10px] font-bold text-muted uppercase tracking-wider py-1.5">
                    {d}
                  </div>
                ))}
                
                {days.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="py-2" />;
                  }
                  
                  const isSelected = value && 
                    new Date(value).getDate() === day && 
                    new Date(value).getMonth() === viewMonth && 
                    new Date(value).getFullYear() === viewYear;
                    
                  const isToday = day === new Date().getDate() && 
                    viewMonth === new Date().getMonth() && 
                    viewYear === new Date().getFullYear();

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDaySelect(day)}
                      className={`text-sm font-bold py-2 rounded-full transition-all flex items-center justify-center w-9 h-9 mx-auto ${
                        isSelected
                          ? 'bg-primary text-white shadow-md scale-110'
                          : isToday
                          ? 'bg-primary-light text-primary hover:bg-primary/20'
                          : 'text-text hover:bg-gray-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-bold text-gray-500 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDaySelect(new Date().getDate())}
                  className="text-sm font-black text-primary hover:text-primary-dark"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
