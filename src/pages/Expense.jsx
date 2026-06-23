import React, { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useVoucherNo } from '../hooks/useVoucherNo';
import { useForm } from '../hooks/useForm';
import { EXPENSE_CATEGORIES, PAYMENT_MODES, PAYMENT_STATUS } from '../constants/categories';
import { validators } from '../utils/validators';
import { newId } from '../utils/uuid';
import { todayISO, formatINR, formatDate } from '../utils/formatters';
import { amountToWords } from '../utils/amountToWords';
import { exportToExcel } from '../utils/exportExcel';
import toast from 'react-hot-toast';

import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import DropdownMenu from '../components/ui/DropdownMenu';
import Voucher from '../components/documents/Voucher';
import { exportVoucherAsPDF } from '../utils/exportPDF';
import { X, Download, Printer } from 'lucide-react';

export default function Expense() {
  const { expenses, addExpense, deleteRecord, updatePaymentStatus, totalExpenseAll } = useTransactions();
  const { incrementVoucherNo } = useVoucherNo();
  
  const [deleteId, setDeleteId] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [filter, setFilter] = useState('All'); // All | Paid | Unpaid
  const [activeTab, setActiveTab] = useState('add'); // 'add' | 'recent'
  const [catFilter, setCatFilter] = useState('All'); 

  const form = useForm({
    initialValues: {
      date: todayISO(),
      category: '',
      paidTo: '',
      being: '',
      amount: '',
      amountInWords: '',
      paymentMode: 'Cash',
      paymentStatus: 'Unpaid',
      approvedBy: '',
      remarks: '',
      manualVoucherNo: ''
    },
    validate: validators.expense,
    onSubmit: (values) => {
      const nextNo = incrementVoucherNo();
      
      const record = {
        ...values,
        id: newId(),
        type: 'expense',
        voucherNo: nextNo,
        amount: Number(values.amount),
        created_at: new Date().toISOString()
      };
      
      addExpense(record);
      form.resetForm();
      toast.success(`Expense added — Voucher #${nextNo}`);
      setPreviewRecord(record);
    }
  });

  const handleAmountChange = (e) => {
    const val = e.target.value;
    form.handleChange(e);
    if (!isNaN(val) && val !== '') {
      form.setValues(prev => ({ ...prev, amountInWords: amountToWords(Number(val)) }));
    } else {
      form.setValues(prev => ({ ...prev, amountInWords: '' }));
    }
  };

  const handleDownloadVoucherPDF = async (record) => {
    toast.loading('Generating PDF...', { id: 'pdf' });
    setTimeout(async () => {
      try {
        await exportVoucherAsPDF(record, `voucher-${record.voucherNo}`);
        toast.success('Downloaded!', { id: 'pdf' });
      } catch (e) {
        toast.error('Failed to generate PDF', { id: 'pdf' });
      }
    }, 150);
  };

  const totalPaid = expenses.filter(e => e.paymentStatus === 'Paid').reduce((sum, e) => sum + e.amount, 0);
  const totalUnpaid = expenses.filter(e => e.paymentStatus === 'Unpaid').reduce((sum, e) => sum + e.amount, 0);

  const filteredData = expenses.filter(e => {
    if (filter !== 'All' && e.paymentStatus !== filter) return false;
    if (catFilter !== 'All' && e.category !== catFilter) return false;
    return true;
  });

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'voucherNo', label: 'Voucher No' },
    { key: 'category', label: 'Category' },
    { key: 'paidTo', label: 'Paid To' },
    { key: 'being', label: 'Being' },
    { key: 'amount', label: 'Amount', render: r => <span className="font-semibold text-danger">{formatINR(r.amount)}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.paymentStatus} /> },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <DropdownMenu>
          <Button variant="secondary" onClick={() => setPaymentId(r)} className="w-full !justify-start !border-0 !shadow-none !bg-transparent hover:!bg-gray-100 !text-gray-700">
            {(r.paymentStatus === 'Paid' || !r.paymentStatus) ? 'Mark Unpaid' : 'Mark Paid'}
          </Button>
          <Button variant="secondary" onClick={() => setPreviewRecord(r)} className="w-full !justify-start !border-0 !shadow-none !bg-transparent hover:!bg-gray-100 !text-gray-700">
            Voucher
          </Button>
          <Button variant="danger" onClick={() => setDeleteId(r.id)} className="w-full !justify-start !border-0 !shadow-none !bg-transparent hover:!bg-red-50 !text-red-600">
            Delete
          </Button>
        </DropdownMenu>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Expense (Chilav)</h1>
        <p className="text-muted text-sm mt-1">Record and manage all outgoing payments</p>
      </div>

      {/* Mobile-Only Switcher Tab */}
      <div className="flex md:hidden bg-gray-200 rounded-xl p-1 w-full max-w-xs mx-auto mb-2 shrink-0">
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'add'
              ? 'bg-white shadow text-primary-dark font-extrabold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('add')}
        >
          Add New
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'recent'
              ? 'bg-white shadow text-primary-dark font-extrabold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 no-print ${
        activeTab === 'recent' ? 'grid' : 'hidden md:grid'
      }`}>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-muted">Total Expense</p>
          <p className="text-xl font-bold">{formatINR(totalExpenseAll)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-l-4 border-l-primary shadow-sm">
          <p className="text-sm text-muted">Total Paid</p>
          <p className="text-xl font-bold text-primary">{formatINR(totalPaid)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-l-4 border-l-danger shadow-sm">
          <p className="text-sm text-muted">Total Unpaid</p>
          <p className="text-xl font-bold text-danger">{formatINR(totalUnpaid)}</p>
        </div>
      </div>

      <div className={`bg-white rounded-lg border border-border shadow-sm overflow-hidden ${
        activeTab === 'add' ? 'block' : 'hidden md:block'
      }`}>
        <div className="px-6 py-4 border-b border-border bg-gray-50">
          <h2 className="text-base font-semibold text-text">Add New Expense</h2>
        </div>
        <form onSubmit={form.handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Input label="Date" name="date" type="date" required value={form.values.date} onChange={form.handleChange} error={form.errors.date} />
            <div className="flex flex-col gap-1">
              <Input 
                label="Category" 
                name="category" 
                list="expense-categories" 
                required 
                value={form.values.category} 
                onChange={form.handleChange} 
                error={form.errors.category} 
              />
              <datalist id="expense-categories">
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <Input label="Manual Voucher No" name="manualVoucherNo" value={form.values.manualVoucherNo} onChange={form.handleChange} />
            <Input label="Paid To" name="paidTo" required value={form.values.paidTo} onChange={form.handleChange} error={form.errors.paidTo} />
            
            <div className="md:col-span-2 lg:col-span-3">
              <Input label="Being (Purpose)" name="being" required value={form.values.being} onChange={form.handleChange} error={form.errors.being} />
            </div>
            
            <Input label="Amount (₹)" name="amount" type="number" min="1" required value={form.values.amount} onChange={handleAmountChange} error={form.errors.amount} />
            <div className="md:col-span-2">
              <Input label="Amount in Words" name="amountInWords" value={form.values.amountInWords} onChange={form.handleChange} />
            </div>

            <Select label="Payment Mode" name="paymentMode" options={PAYMENT_MODES} value={form.values.paymentMode} onChange={form.handleChange} />
            <Select label="Payment Status" name="paymentStatus" options={PAYMENT_STATUS} value={form.values.paymentStatus} onChange={form.handleChange} />
            <Input label="Approved By (Optional)" name="approvedBy" value={form.values.approvedBy} onChange={form.handleChange} />
            <Input label="Remarks (Optional)" name="remarks" value={form.values.remarks} onChange={form.handleChange} />
          </div>
          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={form.resetForm} className="mr-3">Clear</Button>
            <Button type="submit" variant="primary">Save Expense</Button>
          </div>
        </form>
      </div>

      <div className={`bg-white rounded-lg border border-border shadow-sm overflow-hidden flex flex-col ${
        activeTab === 'recent' ? 'block' : 'hidden md:block'
      }`}>
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex bg-gray-200 rounded-md p-1">
              {['All', 'Paid', 'Unpaid'].map(f => (
                <button 
                  key={f}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${filter === f ? 'bg-white shadow text-text' : 'text-muted hover:text-text'}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <select 
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="border border-border rounded px-3 py-1.5 text-sm bg-white"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {
              if (filteredData.length === 0) return toast.error('No data to export');
              exportToExcel(filteredData, [
                 { key: 'date', label: 'Date' },
                 { key: 'voucherNo', label: 'Voucher No' },
                 { key: 'category', label: 'Category' },
                 { key: 'paidTo', label: 'Paid To' },
                 { key: 'amount', label: 'Amount' },
                 { key: 'paymentStatus', label: 'Status' }
              ], `expense-report-${todayISO()}.xlsx`);
            }}>
              Download Excel
            </Button>
          </div>
        </div>
        
        {filteredData.length > 0 ? (
          <Table columns={columns} data={filteredData} className="border-0 rounded-none shadow-none" />
        ) : (
          <EmptyState icon={null} title="No expenses recorded" description="Add your first expense record above." />
        )}
      </div>

      <Modal 
        isOpen={!!deleteId} 
        title="Delete Expense Record?" 
        message="Are you sure you want to delete this record? This cannot be undone."
        confirmVariant="danger"
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          deleteRecord(deleteId, 'expense');
          setDeleteId(null);
          toast.success('Record deleted');
        }}
      />

      <Modal 
        isOpen={!!paymentId} 
        title="Change Payment Status" 
        message={`Are you sure you want to change the status of this expense to ${(paymentId?.paymentStatus === 'Paid' || !paymentId?.paymentStatus) ? 'Unpaid' : 'Paid'}?`}
        confirmVariant="primary"
        confirmLabel="Yes, Change Status"
        onCancel={() => setPaymentId(null)}
        onConfirm={() => {
          updatePaymentStatus(paymentId.id, 'expense');
          setPaymentId(null);
          toast.success('Status updated');
        }}
      />

      {/* Voucher Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setPreviewRecord(null)} />
          <div className="bg-white md:bg-gray-200 rounded-t-2xl md:rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-hidden z-10 flex flex-col transition-all duration-300">
            
            {/* Mobile Drag/Handle indicator */}
            <div className="md:hidden flex flex-col items-center pt-3 pb-1 bg-white shrink-0">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header buttons (Desktop only) */}
            <div className="hidden md:flex p-4 bg-white border-b justify-between items-center shrink-0 no-print">
              <h3 className="font-semibold text-base text-gray-800">Voucher Preview</h3>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPreviewRecord(null)}>Close</Button>
                <Button variant="secondary" onClick={() => window.print()}>Print</Button>
                <Button variant="primary" onClick={() => handleDownloadVoucherPDF(previewRecord)}>Download PDF</Button>
              </div>
            </div>

            {/* Action Sheet Panel (Mobile only) */}
            <div className="md:hidden p-5 bg-white flex flex-col shrink-0 no-print gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-gray-800 tracking-tight">Voucher Options</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Voucher No: {previewRecord.manualVoucherNo || previewRecord.voucherNo}</p>
                </div>
                <button 
                  onClick={() => setPreviewRecord(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Voucher Summary Card */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Voucher Details</span>
                  <span className="bg-red-50 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Expense</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                  <div>
                    <span className="text-gray-400 block font-medium">Paid To</span>
                    <span className="font-bold text-gray-800">{previewRecord.paidTo}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Date</span>
                    <span className="font-bold text-gray-800">{formatDate(previewRecord.date)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block font-medium">Being (Purpose)</span>
                    <span className="font-bold text-gray-800">{previewRecord.being}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Category</span>
                    <span className="font-bold text-gray-800">{previewRecord.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Amount</span>
                    <span className="font-black text-red-700 text-xs">{formatINR(previewRecord.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Payment Mode</span>
                    <span className="font-bold text-gray-800">{previewRecord.paymentMode} ({previewRecord.paymentStatus})</span>
                  </div>
                  {previewRecord.approvedBy && (
                    <div>
                      <span className="text-gray-400 block font-medium">Approved By</span>
                      <span className="font-bold text-gray-800">{previewRecord.approvedBy}</span>
                    </div>
                  )}
                  {previewRecord.remarks && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block font-medium">Remarks</span>
                      <span className="font-bold text-gray-700">{previewRecord.remarks}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid of options */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  onClick={() => handleDownloadVoucherPDF(previewRecord)}
                  className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  <Download size={18} />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="col-span-2 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 py-3.5 px-4 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  <Printer size={18} />
                  <span>Print Voucher</span>
                </button>
              </div>

              <button
                onClick={() => setPreviewRecord(null)}
                className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>

            <div className="hidden md:flex flex-1 overflow-auto p-8 justify-center bg-gray-200 print-content" id="voucher-preview-content">
              <Voucher record={previewRecord} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
