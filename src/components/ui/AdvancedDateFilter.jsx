import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear, 
  subDays,
  addMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import Modal from './Modal';

export default function AdvancedDateFilter({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());

  // Swipe logic
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setViewMonth(prev => addMonths(prev, 1));
    }
    if (isRightSwipe) {
      setViewMonth(prev => subMonths(prev, 1));
    }
  };

  const handleQuickFilter = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'This Month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'Last Month':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'This Year':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'Last 7 Days':
        start = subDays(today, 6);
        end = today;
        break;
      default:
        start = startOfMonth(today);
        end = endOfMonth(today);
    }

    onChange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: preset
    });
    setIsOpen(false);
  };

  const handleDayClick = (date) => {
    onChange({
      start: format(date, 'yyyy-MM-dd'),
      end: format(date, 'yyyy-MM-dd'),
      label: format(date, 'dd MMM yyyy')
    });
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add empty slots for days before the 1st of the month
    const startDay = start.getDay();
    const emptyDays = Array.from({ length: startDay }).map((_, i) => (
      <div key={`empty-${i}`} className="w-10 h-10" />
    ));

    return (
      <div className="mt-4" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-bold text-lg text-text">
            {format(viewMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-xs font-semibold text-muted py-1">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {emptyDays}
          {days.map(day => {
            const isSelected = value.start === value.end && value.start === format(day, 'yyyy-MM-dd');
            const isTodayDate = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all
                  ${isSelected ? 'bg-primary text-white font-bold shadow-md transform scale-110' : 
                    isTodayDate ? 'border-2 border-primary text-primary font-bold' : 
                    'text-text hover:bg-primary/10 hover:text-primary'}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-center text-muted/50 mt-4 uppercase tracking-widest">
          Swipe to change month
        </p>
      </div>
    );
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-border hover:border-primary/30 transition-all font-semibold text-text active:scale-95"
      >
        <CalendarIcon size={18} className="text-primary" />
        {value.label}
      </button>

      {isOpen && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Date Range">
          <div className="grid grid-cols-2 gap-2 mb-6">
            {['This Month', 'Last Month', 'This Year', 'Last 7 Days'].map(preset => (
              <button
                key={preset}
                onClick={() => handleQuickFilter(preset)}
                className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-between
                  ${value.label === preset ? 'bg-primary text-white' : 'bg-gray-50 text-text border border-border hover:bg-primary/10'}
                `}
              >
                {preset}
                {value.label === preset && <Check size={16} />}
              </button>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-bold text-muted mb-2">Or select a specific day:</h4>
            {renderCalendar()}
          </div>
        </Modal>
      )}
    </>
  );
}
