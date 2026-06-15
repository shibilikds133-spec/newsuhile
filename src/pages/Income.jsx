import React, { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useReceiptNo } from '../hooks/useReceiptNo';
import { useForm } from '../hooks/useForm';
import { INCOME_CATEGORIES, DONATION_CATEGORIES } from '../constants/categories';
import { validators } from '../utils/validators';
import { newId } from '../utils/uuid';
import { todayISO, formatINR, formatDate } from '../utils/formatters';
import { amountToWords } from '../utils/amountToWords';
import { exportTablePDF, exportReceiptAsPDF, exportReceiptAsPDFExperimental } from '../utils/exportPDF';
import { exportToExcel } from '../utils/exportExcel';
import toast from 'react-hot-toast';

import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Receipt from '../components/documents/Receipt';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { X, Share2, Download, Image, Printer, FileText } from 'lucide-react';

export default function Income() {
  const { income, addIncome, deleteRecord, totalIncome } = useTransactions();
  const { incrementReceiptNo } = useReceiptNo();
  
  const [deleteId, setDeleteId] = useState(null);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [whatsappPromptRecord, setWhatsappPromptRecord] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('add'); // 'add' | 'recent'

  const handleWhatsAppShare = (record) => {
    if (!record || !record.contactNo) return;
    const cleanPhone = record.contactNo.replace(/\D/g, '');
    const message = `🕌 *MAKHDOOMIYYA ACADEMY*\n_Under Quadisiyya Islamic Complex, Kollam_\n━━━━━━━━━━━━━━━━━━━━\n\n🙏 *Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh*\n\nWe gratefully acknowledge your generous contribution.\n\n📋 *RECEIPT DETAILS*\n▸ *Receipt No :* ${record.manualReceiptNo || record.digitalReceiptNo}\n▸ *Date       :* ${formatDate(record.date)}\n▸ *Name       :* ${record.payerName}\n▸ *Amount     :* ${formatINR(record.amount)}\n\n━━━━━━━━━━━━━━━━━━━━\n_May Allah accept your contribution and reward you abundantly._\n\n🤲 *Jazakallah Khair*\n_Makhdoomiyya Academy_`;
    const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const form = useForm({
    initialValues: {
      date: todayISO(),
      category: '',
      payerName: '',
      address: '',
      contactNo: '',
      manualReceiptNo: '',
      amount: '',
      amountInWords: '',
    },
    validate: validators.income,
    onSubmit: (values) => {
      const isDonation = DONATION_CATEGORIES.includes(values.category);
      const nextNo = incrementReceiptNo();
      
      const record = {
        ...values,
        id: newId(),
        type: 'income',
        donationType: isDonation ? 'Donation' : values.category,
        seqNo: nextNo.seqNo,
        digitalReceiptNo: nextNo.digitalReceiptNo,
        amount: Number(values.amount),
        created_at: new Date().toISOString()
      };
      
      addIncome(record);
      form.resetForm();
      toast.success(`Income added — Receipt #${nextNo.digitalReceiptNo}`);
      setPreviewRecord(record);

      if (record.contactNo) {
        const cleanPhone = record.contactNo.replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
          setWhatsappPromptRecord(record);
        }
      }
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

  const handleDownloadReceiptPDF = async (record) => {
    toast.loading('Generating PDF...', { id: 'pdf' });
    setTimeout(async () => {
      try {
        await exportReceiptAsPDF(record, `receipt-${record.manualReceiptNo || record.digitalReceiptNo}`);
        toast.success('Downloaded!', { id: 'pdf' });
      } catch (e) {
        toast.error('Failed to generate PDF', { id: 'pdf' });
      }
    }, 150);
  };



  const handleShareJPG = (record) => {
    const el = document.getElementById('receipt-inner');
    if (!el) return;

    toast.loading('Preparing image...', { id: 'share' });

    setTimeout(async () => {
      try {
        const jpgDataUrl = await htmlToImage.toJpeg(el, {
          pixelRatio: 3,
          backgroundColor: '#ffffff',
          style: {
            transform: 'none',
            position: 'relative',
            margin: '0'
          }
        });
        const res = await fetch(jpgDataUrl);
        const blob = await res.blob();
        const fileName = `receipt-${record.manualReceiptNo || record.digitalReceiptNo}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          toast.dismiss('share');
          await navigator.share({
            title: 'Makhdoomiyya Academy Receipt',
            text: `Receipt #${record.manualReceiptNo || record.digitalReceiptNo} for ${record.payerName}`,
            files: [file]
          });
        } else {
          const link = document.createElement('a');
          link.href = jpgDataUrl;
          link.download = fileName;
          link.click();
          toast.success('Receipt saved as JPG!', { id: 'share' });
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to export receipt as image.', { id: 'share' });
      }
    }, 300);
  };

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'digitalReceiptNo', label: 'Receipt No' },
    { key: 'category', label: 'Category' },
    { key: 'donationType', label: 'Donation Type' },
    { key: 'payerName', label: 'Payer Name' },
    { key: 'amount', label: 'Amount', render: r => <span className="font-semibold text-primary">{formatINR(r.amount)}</span> },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <div className="flex gap-2 flex-nowrap shrink-0">
          <Button variant="secondary" onClick={() => setPreviewRecord(r)} className="px-2 py-1 text-xs">
            Receipt
          </Button>
          <Button variant="danger" onClick={() => setDeleteId(r.id)} className="px-2 py-1 text-xs">
            Delete
          </Button>
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Income (Varav)</h1>
        <p className="text-muted text-sm mt-1">Record and manage all incoming funds</p>
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

      <div className={`bg-white rounded-lg border border-border shadow-sm overflow-hidden ${
        activeTab === 'add' ? 'block' : 'hidden md:block'
      }`}>
        <div className="px-6 py-4 border-b border-border bg-gray-50">
          <h2 className="text-base font-semibold text-text">Add New Income</h2>
        </div>
        <form onSubmit={form.handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Input label="Date" name="date" type="date" required value={form.values.date} onChange={form.handleChange} error={form.errors.date} />
            <div className="flex flex-col gap-1">
              <Input 
                label="Category" 
                name="category" 
                list="income-categories" 
                required 
                value={form.values.category} 
                onChange={form.handleChange} 
                error={form.errors.category} 
              />
              <datalist id="income-categories">
                {INCOME_CATEGORIES.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            
            <Input label="Payer Name" name="payerName" required value={form.values.payerName} onChange={form.handleChange} error={form.errors.payerName} />
            <Input label="Address" name="address" value={form.values.address} onChange={form.handleChange} />
            <Input label="Contact No" name="contactNo" value={form.values.contactNo} onChange={form.handleChange} />
            
            <Input label="Amount (₹)" name="amount" type="number" min="1" required value={form.values.amount} onChange={handleAmountChange} error={form.errors.amount} />
            <div className="lg:col-span-2">
              <Input label="Amount in Words" name="amountInWords" value={form.values.amountInWords} onChange={form.handleChange} />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={form.resetForm} className="mr-3">Clear</Button>
            <Button type="submit" variant="primary">Save Income</Button>
          </div>
        </form>
      </div>

      <div className={`bg-white rounded-lg border border-border shadow-sm overflow-hidden flex flex-col ${
        activeTab === 'recent' ? 'block' : 'hidden md:block'
      }`}>
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-text">Income Records</h2>
            <div className="bg-primary-light text-primary-dark px-3 py-1 rounded-full text-sm font-semibold">
              Total: {formatINR(totalIncome)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={async () => {
              if (income.length === 0) return toast.error('No data to export');
              setIsExporting(true);
              toast.loading('Generating Excel...', { id: 'excel' });
              exportToExcel(income, [
                 { key: 'date', label: 'Date' },
                 { key: 'digitalReceiptNo', label: 'Receipt No' },
                 { key: 'category', label: 'Category' },
                 { key: 'payerName', label: 'Payer Name' },
                 { key: 'amount', label: 'Amount' }
              ], `income-report-${todayISO()}.xlsx`);
              toast.success('Downloaded!', { id: 'excel' });
              setIsExporting(false);
            }}>
              Download Excel
            </Button>
          </div>
        </div>
        
        {income.length > 0 ? (
          <Table columns={columns} data={income} className="border-0 rounded-none shadow-none" />
        ) : (
          <EmptyState icon={null} title="No income recorded" description="Add your first income record above." />
        )}
      </div>

      <Modal 
        isOpen={!!deleteId} 
        title="Delete Income Record?" 
        message="Are you sure you want to delete this record? This cannot be undone and the receipt number will not be reused."
        confirmVariant="danger"
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          deleteRecord(deleteId, 'income');
          setDeleteId(null);
          toast.success('Record deleted');
        }}
      />

      <Modal 
        isOpen={!!whatsappPromptRecord} 
        title="Send Receipt via WhatsApp?" 
        message={`Would you like to send the receipt details to ${whatsappPromptRecord?.payerName} at ${whatsappPromptRecord?.contactNo}?`}
        confirmVariant="primary"
        confirmLabel="Send Message"
        cancelLabel="Skip"
        onCancel={() => setWhatsappPromptRecord(null)}
        onConfirm={() => {
          handleWhatsAppShare(whatsappPromptRecord);
          setWhatsappPromptRecord(null);
        }}
      />

      {/* Receipt Preview Modal */}
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
              <h3 className="font-semibold text-base text-gray-800">Receipt Preview</h3>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPreviewRecord(null)} className="text-xs px-2 py-1">Close</Button>
                {previewRecord.contactNo && (
                  <Button variant="primary" onClick={() => handleWhatsAppShare(previewRecord)} className="text-xs px-2 py-1">WhatsApp</Button>
                )}
                <Button variant="secondary" onClick={() => handleShareJPG(previewRecord)} className="text-xs px-2 py-1">📷 Share as JPG</Button>
                <Button variant="secondary" onClick={() => window.print()} className="text-xs px-2 py-1">Print</Button>
                <Button variant="primary" onClick={() => handleDownloadReceiptPDF(previewRecord)} className="text-xs px-2 py-1">Download PDF</Button>
              </div>
            </div>

            {/* Action Sheet Panel (Mobile only) */}
            <div className="md:hidden p-5 bg-white flex flex-col shrink-0 no-print gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-gray-800 tracking-tight">Receipt Options</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Receipt No: {previewRecord.manualReceiptNo || previewRecord.digitalReceiptNo}</p>
                </div>
                <button 
                  onClick={() => setPreviewRecord(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Receipt Details</span>
                  <span className="bg-teal-50 text-teal-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Income</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                  <div>
                    <span className="text-gray-400 block font-medium">Payer Name</span>
                    <span className="font-bold text-gray-800">{previewRecord.payerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Date</span>
                    <span className="font-bold text-gray-800">{formatDate(previewRecord.date)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block font-medium">Category / Purpose</span>
                    <span className="font-bold text-gray-800">{previewRecord.category} {previewRecord.donationType ? `(${previewRecord.donationType})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Amount</span>
                    <span className="font-black text-teal-700 text-xs">{formatINR(previewRecord.amount)}</span>
                  </div>
                  {previewRecord.contactNo && (
                    <div>
                      <span className="text-gray-400 block font-medium">Contact No</span>
                      <span className="font-bold text-gray-800">{previewRecord.contactNo}</span>
                    </div>
                  )}
                  {previewRecord.address && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block font-medium">Address</span>
                      <span className="font-bold text-gray-700">{previewRecord.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid of options */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                {previewRecord.contactNo && (
                  <button
                    onClick={() => handleWhatsAppShare(previewRecord)}
                    className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Share2 size={18} />
                    <span>Share to WhatsApp</span>
                  </button>
                )}
                
                <button
                  onClick={() => handleDownloadReceiptPDF(previewRecord)}
                  className="flex flex-col items-center justify-center gap-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 p-4 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                >
                  <Download size={20} />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => handleShareJPG(previewRecord)}
                  className="flex flex-col items-center justify-center gap-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 p-4 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                >
                  <Image size={20} />
                  <span>Share as JPG</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex flex-col items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 p-4 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                >
                  <Printer size={20} />
                  <span>Print Receipt</span>
                </button>


              </div>

              <button
                onClick={() => setPreviewRecord(null)}
                className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>

            {/* Receipt content — off-screen on mobile so html2canvas can still capture it, visible on desktop */}
            <div className="flex flex-1 overflow-auto bg-gray-200 print-content p-4 md:p-8 justify-center items-start absolute -left-[9999px] md:relative md:left-auto">
              <div
                id="receipt-element"
                style={{
                  transformOrigin: 'top center',
                  // On small screens, scale down so the full receipt is visible
                  transform: window.innerWidth < 768 ? `scale(${Math.min(1, (window.innerWidth - 32) / 842)})` : 'none',
                  marginBottom: window.innerWidth < 768 ? `-${842 * (1 - Math.min(1, (window.innerWidth - 32) / 842)) * 0.55}px` : '0',
                }}
              >
                <Receipt record={previewRecord} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
