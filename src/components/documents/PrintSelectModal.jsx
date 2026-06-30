import React, { useState } from 'react';
import Button from '../ui/Button';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, REFRESHMENT_ITEMS } from '../../constants/categories';

export default function PrintSelectModal({ isOpen, onClose, onGenerate }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('All'); // All | Paid | Pending
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  if (!isOpen) return null;

  const INCOME_OPTIONS = [...INCOME_CATEGORIES, 'OTHER INCOME'];
  const EXPENSE_OPTIONS = [...EXPENSE_CATEGORIES, 'OTHER EXPENSE'];
  const REFRESHMENT_OPTIONS = [...REFRESHMENT_ITEMS, 'OTHER REFRESHMENT'];

  const handleToggle = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const isAllSelected = (categories) => {
    return categories.every(cat => selectedCategories.includes(cat));
  };

  const handleSelectAll = (categories) => {
    const allSelected = isAllSelected(categories);
    if (allSelected) {
      setSelectedCategories(selectedCategories.filter(c => !categories.includes(c)));
    } else {
      const newSelection = [...new Set([...selectedCategories, ...categories])];
      setSelectedCategories(newSelection);
    }
  };

  const handleApply = (action) => {
    onGenerate({
      categories: selectedCategories,
      paymentStatus,
      fromDate,
      toDate,
      action
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 flex flex-col max-h-[92vh] sm:max-h-[90vh] relative animate-in slide-in-from-bottom duration-300">
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white sticky top-0 z-20">
          <h3 className="text-xl font-bold text-text">Select Categories</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-muted sm:hidden">&times;</button>
        </div>
        
        <div className="px-6 py-6 overflow-y-auto flex-1 overscroll-contain">
          {/* INCOME */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-primary tracking-widest uppercase">INCOME</h4>
              <button 
                onClick={() => handleSelectAll(INCOME_OPTIONS)}
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full active:scale-95 transition-all"
              >
                {isAllSelected(INCOME_OPTIONS) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
              {INCOME_OPTIONS.map(cat => (
                <label key={cat} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white active:bg-white cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat)} 
                    onChange={() => handleToggle(cat)}
                    className="rounded-md text-primary focus:ring-primary h-5 w-5 border-gray-300"
                  />
                  <span className="text-sm font-semibold text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* EXPENSE */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-danger tracking-widest uppercase">EXPENSE</h4>
              <button 
                onClick={() => handleSelectAll(EXPENSE_OPTIONS)}
                className="text-xs font-bold text-danger bg-danger/10 px-3 py-1 rounded-full active:scale-95 transition-all"
              >
                {isAllSelected(EXPENSE_OPTIONS) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
              {EXPENSE_OPTIONS.map(cat => (
                <label key={cat} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white active:bg-white cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat)} 
                    onChange={() => handleToggle(cat)}
                    className="rounded-md text-danger focus:ring-danger h-5 w-5 border-gray-300"
                  />
                  <span className="text-sm font-semibold text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* REFRESHMENT */}
          <div className="mb-8">
            <h4 className="font-extrabold text-sm text-warning tracking-widest uppercase mb-3">REFRESHMENT</h4>
            <div className="grid grid-cols-2 gap-2">
              {REFRESHMENT_OPTIONS.map(cat => (
                <label key={cat} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 cursor-pointer active:bg-white transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat)} 
                    onChange={() => handleToggle(cat)}
                    className="rounded-md text-warning focus:ring-warning h-5 w-5 border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* PAYMENT STATUS FILTER */}
          <div className="border-t border-border pt-6 mb-8">
            <h4 className="font-extrabold text-sm text-gray-900 tracking-widest uppercase mb-4">Payment Status</h4>
            <div className="flex gap-2">
              {['All', 'Paid', 'Pending'].map(status => (
                <button
                  key={status}
                  onClick={() => setPaymentStatus(status)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                    paymentStatus === status
                      ? status === 'Paid'
                        ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-200'
                        : status === 'Pending'
                          ? 'bg-warning text-white border-warning shadow-lg shadow-yellow-200'
                        : 'bg-gray-800 text-white border-gray-800 shadow-lg shadow-gray-200'
                      : 'bg-white text-muted border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="border-t border-border pt-6 pb-4">
            <h4 className="font-extrabold text-sm text-gray-900 tracking-widest uppercase mb-4">Date Range</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">From</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">To</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 border-t border-border sticky bottom-0 z-20">
          <button 
            onClick={() => handleApply('preview')}
            className="w-full sm:w-auto bg-primary text-white py-4 px-8 rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            Preview Report
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          <button 
            onClick={onClose}
            className="w-full sm:w-auto bg-white text-muted py-4 px-8 rounded-2xl font-bold border border-gray-200 active:scale-95 transition-all order-2 sm:order-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

  );
}
