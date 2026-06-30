import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';

export default function MonthPicker({ value, onChange, dark = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse value (yyyy-MM)
  const [year, monthStr] = value ? value.split('-') : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')];
  const [currentYear, setCurrentYear] = useState(parseInt(year, 10));

  useEffect(() => {
    if (value) {
      const [y] = value.split('-');
      setCurrentYear(parseInt(y, 10));
    }
  }, [value]);



  const months = [
    { label: 'Jan', value: '01' }, { label: 'Feb', value: '02' }, { label: 'Mar', value: '03' },
    { label: 'Apr', value: '04' }, { label: 'May', value: '05' }, { label: 'Jun', value: '06' },
    { label: 'Jul', value: '07' }, { label: 'Aug', value: '08' }, { label: 'Sep', value: '09' },
    { label: 'Oct', value: '10' }, { label: 'Nov', value: '11' }, { label: 'Dec', value: '12' }
  ];

  const handleMonthSelect = (mValue) => {
    onChange(`${currentYear}-${mValue}`);
    setIsOpen(false);
  };

  const displayFormat = value ? format(new Date(value + '-01'), 'MMM, yyyy') : 'Select Month';

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border outline-none ${
          dark
            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-2 focus:ring-white/30'
            : 'bg-white border-border text-text shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-primary/20 focus:border-primary'
        }`}
      >
        <span>{displayFormat}</span>
        <Calendar size={14} className={dark ? 'text-white/70' : 'text-muted'} />
      </button>

      {isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200 ${
              dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-border'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-4 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={() => setCurrentYear(y => y - 1)}
                className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <ChevronLeft size={20} />
              </button>
              <span className={`font-black text-lg ${dark ? 'text-white' : 'text-gray-900'}`}>{currentYear}</span>
              <button
                type="button"
                onClick={() => setCurrentYear(y => y + 1)}
                className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Grid */}
            <div className="p-4 grid grid-cols-3 gap-3">
              {months.map((m) => {
                const isSelected = value === `${currentYear}-${m.value}`;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleMonthSelect(m.value)}
                    className={`py-3 text-sm font-bold rounded-xl transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md scale-105'
                        : dark
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            
            {/* Footer actions */}
            <div className={`px-5 py-3 border-t flex justify-between ${dark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`text-sm font-bold ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  onChange(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
                  setIsOpen(false);
                }}
                className={`text-sm font-black ${dark ? 'text-primary-light hover:text-white' : 'text-primary hover:text-primary-dark'}`}
              >
                This month
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
