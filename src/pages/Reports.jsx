import React, { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { formatINR, formatDate, todayISO } from '../utils/formatters';
import { exportTablePDF } from '../utils/exportPDF';
import { exportToExcel } from '../utils/exportExcel';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatusBadge from '../components/ui/StatusBadge';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import PrintSelectModal from '../components/documents/PrintSelectModal';
import SmartPrintPreview from '../components/documents/SmartPrintPreview';

export default function Reports() {
  const { allTransactions } = useTransactions();
  
  const [typeFilter, setTypeFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPreviewData, setPrintPreviewData] = useState(null);
  const [printPreviewFilters, setPrintPreviewFilters] = useState(null);

  const handlePreset = (preset) => {
    const today = new Date();
    if (preset === 'This Month') {
      setFromDate(startOfMonth(today).toISOString().split('T')[0]);
      setToDate(endOfMonth(today).toISOString().split('T')[0]);
    } else if (preset === 'Last Month') {
      const lastMonth = subMonths(today, 1);
      setFromDate(startOfMonth(lastMonth).toISOString().split('T')[0]);
      setToDate(endOfMonth(lastMonth).toISOString().split('T')[0]);
    } else if (preset === 'This Year') {
      setFromDate(startOfYear(today).toISOString().split('T')[0]);
      setToDate(endOfYear(today).toISOString().split('T')[0]);
    } else if (preset === 'All Time') {
      setFromDate('');
      setToDate('');
    }
  };

  const filteredData = allTransactions.filter(t => {
    if (typeFilter !== 'All' && t.type !== typeFilter.toLowerCase()) return false;
    
    const cat = t.category || t.item;
    if (expenseCategoryFilter !== 'All' && cat !== expenseCategoryFilter) return false;

    if (t.type === 'expense') {
      if (paymentFilter !== 'All' && t.paymentStatus !== paymentFilter) return false;
    }
    
    if (fromDate && t.date < fromDate) return false;
    if (toDate && t.date > toDate) return false;
    
    return true;
  });

  const totalIncomeValue = filteredData
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Only PAID expenses count towards real cash spent
  const totalExpenseValue = filteredData
    .filter(t => (t.type === 'expense' && t.paymentStatus === 'Paid') || t.type === 'refreshment')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalanceValue = totalIncomeValue - totalExpenseValue;

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'type', label: 'Type', render: r => <Badge type={r.type} /> },
    { key: 'category', label: 'Category/Item', render: r => r.category || r.item },
    { key: 'description', label: 'Description', render: r => r.payerName || r.paidTo || r.notes || '-' },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: r => (
        <span className={r.type === 'income' ? 'text-primary font-medium' : 'text-danger font-medium'}>
          {formatINR(r.amount)}
        </span>
      ) 
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: r => r.type === 'expense' ? <StatusBadge status={r.paymentStatus} /> : '-' 
    }
  ];

  const handleGeneratePrintData = ({ categories, paymentStatus, fromDate: printFrom, toDate: printTo }) => {
    setIsPrintModalOpen(false);

    const dataToPrint = allTransactions.filter(t => {
      if (printFrom && t.date < printFrom) return false;
      if (printTo && t.date > printTo) return false;
      const cat = t.category || t.item;
      if (categories.length > 0 && !categories.includes(cat)) return false;
      if (t.type === 'expense' && paymentStatus !== 'All') {
        if (t.paymentStatus !== paymentStatus) return false;
      }
      return true;
    });

    if (dataToPrint.length === 0) {
      return toast.error('No records found for selected criteria');
    }

    setPrintPreviewFilters({ fromDate: printFrom, toDate: printTo, paymentStatus, categories });
    setPrintPreviewData(dataToPrint);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Reports</h1>
          <p className="text-muted text-sm mt-1">Generate unified financial reports and exports</p>
        </div>
        <Button onClick={() => setIsPrintModalOpen(true)}>Smart Print</Button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4 filter-bar">
        {/* Quick Presets */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['This Month', 'Last Month', 'This Year', 'All Time'].map(p => (
            <button 
              key={p} 
              onClick={() => handlePreset(p)}
              className="px-3 py-1.5 text-sm bg-bg border border-border rounded whitespace-nowrap hover:bg-gray-100"
            >
              {p}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted font-medium">Type Filter</label>
            <div className="flex bg-gray-100 rounded p-1">
              {['All', 'Income', 'Expense', 'Refreshment'].map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`flex-1 text-xs py-1 rounded ${typeFilter === f ? 'bg-white shadow text-text' : 'text-muted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          {(typeFilter === 'Expense' || typeFilter === 'Refreshment' || typeFilter === 'All') && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted font-medium">Category / Item</label>
                <select className="border border-border rounded px-2 py-1.5 text-sm w-full" value={expenseCategoryFilter} onChange={e => setExpenseCategoryFilter(e.target.value)}>
                  <option value="All">All Items</option>
                  {[...new Set(allTransactions.map(t => t.category || t.item).filter(Boolean))].sort().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {typeFilter === 'Expense' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted font-medium">Payment Status</label>
                  <select className="border border-border rounded px-2 py-1.5 text-sm w-full" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                    <option value="All">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted font-medium">From Date</label>
            <input type="date" className="border border-border rounded px-2 py-1.5 text-sm w-full" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted font-medium">To Date</label>
            <input type="date" className="border border-border rounded px-2 py-1.5 text-sm w-full" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <Card label="Filtered Income" value={formatINR(totalIncomeValue)} accent="green" />
        <Card label="Filtered Expense" value={formatINR(totalExpenseValue)} accent="red" />
        <Card label="Filtered Net Balance" value={formatINR(netBalanceValue)} accent={netBalanceValue >= 0 ? 'blue' : 'red'} />
      </div>

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden flex flex-col pt-4">
        <div className="px-6 pb-4 flex justify-between items-center export-buttons">
          <h2 className="text-base font-semibold text-text">Filtered Transactions ({filteredData.length})</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {
              exportToExcel(filteredData, [
                { key: 'date', label: 'Date' },
                { key: 'type', label: 'Type' },
                { key: 'category', label: 'Category' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount' },
                { key: 'status', label: 'Status' }
              ], `full-report-${todayISO()}.xlsx`);
            }}>Excel</Button>
            <Button variant="primary" onClick={() => {
              setPrintPreviewFilters({ 
                fromDate, 
                toDate, 
                paymentStatus: paymentFilter, 
                categories: expenseCategoryFilter === 'All' ? [] : [expenseCategoryFilter] 
              });
              setPrintPreviewData(filteredData);
            }}>Print Report</Button>
          </div>
        </div>
        
        <Table columns={columns} data={filteredData} className="border-0 rounded-none shadow-none" />
      </div>

      <PrintSelectModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        onGenerate={handleGeneratePrintData} 
      />

      <SmartPrintPreview
        isOpen={!!printPreviewData}
        onClose={() => setPrintPreviewData(null)}
        data={printPreviewData}
        filters={printPreviewFilters}
      />
    </div>
  );
}
