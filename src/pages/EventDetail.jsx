import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents, useEventDetail } from '../hooks/useEvents';
import { formatINR, formatDate, todayISO } from '../utils/formatters';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories';
import { newId } from '../utils/uuid';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DatePicker from '../components/ui/DatePicker';
import StatusBadge from '../components/ui/StatusBadge';
import DropdownMenu from '../components/ui/DropdownMenu';
import SmartPrintPreview from '../components/documents/SmartPrintPreview';
import EmptyState from '../components/ui/EmptyState';

import { ArrowLeft, TrendingUp, TrendingDown, Scale, Printer, MoreVertical, Trash2, CheckCircle, XCircle, CalendarDays } from 'lucide-react';

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event, transactions, summary, loading } = useEventDetail(eventId);
  const { addEventIncome, addEventExpense, deleteEventTransaction, updateEventTxStatus, archiveEvent, unarchiveEvent, deleteEvent } = useEvents();

  const [activeModal, setActiveModal] = useState(null); // 'income' | 'expense' | null
  const [printData, setPrintData] = useState(null);
  
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState(''); // payerName or paidTo
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-4">Event Not Found</h2>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!category || !amount) return;

    try {
      const record = {
        id: newId(),
        date,
        category,
        amount: Number(amount),
        notes,
      };

      if (activeModal === 'income') {
        record.payerName = person;
        record.paymentStatus = paymentStatus === 'Paid' ? 'Received' : 'Pending';
        await addEventIncome(eventId, record);
      } else {
        record.paidTo = person;
        record.paymentStatus = paymentStatus;
        await addEventExpense(eventId, record);
      }

      toast.success('Transaction added');
      closeModal();
    } catch (err) {
      toast.error('Failed to add transaction');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setCategory('');
    setAmount('');
    setPerson('');
    setNotes('');
    setPaymentStatus('Paid');
  };

  const handleDeleteTx = async (id) => {
    if (window.confirm('Delete this transaction?')) {
      await deleteEventTransaction(id);
      toast.success('Deleted');
    }
  };

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'type', label: 'Type', render: r => (
      <span className={`text-xs font-bold uppercase ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
        {r.type}
      </span>
    )},
    { key: 'category', label: 'Category', render: r => r.category },
    { key: 'description', label: 'Description', render: r => r.payerName || r.paidTo || r.notes || '-' },
    { key: 'amount', label: 'Amount', render: r => (
      <span className={`font-medium ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
        {formatINR(r.amount)}
      </span>
    )},
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.paymentStatus} type={r.type} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => {
        const isPaid = r.paymentStatus === 'Received' || r.paymentStatus === 'Paid';
        return (
          <DropdownMenu
            trigger={<button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><MoreVertical size={16} /></button>}
            items={[
              {
                label: isPaid ? 'Mark as Pending' : (r.type === 'income' ? 'Mark as Received' : 'Mark as Paid'),
                icon: isPaid ? XCircle : CheckCircle,
                onClick: () => updateEventTxStatus(r.id)
              },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDeleteTx(r.id) }
            ]}
          />
        );
      }
    }
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/events')} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text">{event.name}</h1>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${event.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
              {event.status}
            </span>
          </div>
          {event.description && <p className="text-muted text-sm mt-1">{event.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPrintData(transactions)} disabled={transactions.length === 0} className="hidden sm:flex">
            <Printer size={18} className="mr-2" /> Print PDF
          </Button>
          <DropdownMenu
            trigger={<Button variant="secondary" className="px-2"><MoreVertical size={18} /></Button>}
            items={[
              { label: 'Print PDF', icon: Printer, onClick: () => setPrintData(transactions) },
              ...(event.status === 'active' 
                ? [{ label: 'Archive Event', onClick: () => { archiveEvent(eventId); toast.success('Archived'); } }]
                : [{ label: 'Unarchive Event', onClick: () => { unarchiveEvent(eventId); toast.success('Active'); } }]
              ),
              { label: 'Delete Event', icon: Trash2, danger: true, onClick: () => {
                if (window.confirm('Delete event and all transactions?')) {
                  deleteEvent(eventId);
                  navigate('/events');
                }
              }}
            ]}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════
          MOBILE LAYOUT (Amber Theme)
      ══════════════════════════════════════ */}
      <div className="md:hidden flex flex-col gap-4">
        {/* ── HERO NET BALANCE CARD (AMBER) ── */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group border border-white/10">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700 ease-in-out"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-900/40 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[12px] font-semibold text-amber-200 uppercase tracking-wider opacity-90">
                  OVERALL
                </span>
                <h2 className="text-sm font-medium text-amber-100 opacity-90 mt-1">Net Balance (Shishtam)</h2>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-2 backdrop-blur-sm">
                <CalendarDays size={14} className="text-amber-100" />
                <span className="text-xs font-semibold text-white">Event Total</span>
              </div>
            </div>
            
            <div className="mt-1 flex items-center gap-3">
              <span className="text-[28px] font-bold tracking-tight">
                {formatINR(summary.netBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL OVERVIEW (Split View) ── */}
        <div className="bg-white rounded-xl p-4 shadow-md flex justify-between items-center border border-[#e1e3e0]/50 relative overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center p-2 relative z-10">
            <span className="text-[12px] font-medium text-[#3f4945] flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Income
            </span>
            <span className="text-[16px] font-semibold text-[#191c1b]">{formatINR(summary.receivedIncome)}</span>
          </div>
          <div className="w-px h-12 bg-[#e1e3e0] relative z-10"></div>
          <div className="flex-1 flex flex-col items-center justify-center p-2 relative z-10">
            <span className="text-[12px] font-medium text-[#3f4945] flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
              Expense
            </span>
            <span className="text-[16px] font-semibold text-[#191c1b]">{formatINR(summary.totalPaidExpense)}</span>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        <Card label="Total Event Income" value={formatINR(summary.receivedIncome)} accent="green" icon={TrendingUp} />
        <Card label="Total Event Expense" value={formatINR(summary.totalPaidExpense)} accent="red" icon={TrendingDown} />
        <Card label="Event Balance" value={formatINR(summary.netBalance)} accent="blue" icon={Scale} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-text">Event Transactions</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveModal('income')} disabled={event.status !== 'active'} className="flex-1 sm:flex-none border-green-200 text-green-700 hover:bg-green-50">
              + Add Income
            </Button>
            <Button variant="outline" onClick={() => setActiveModal('expense')} disabled={event.status !== 'active'} className="flex-1 sm:flex-none border-red-200 text-red-700 hover:bg-red-50">
              - Add Expense
            </Button>
          </div>
        </div>
        
        {transactions.length > 0 ? (
          <Table columns={columns} data={transactions} className="border-0 shadow-none rounded-none" />
        ) : (
          <div className="p-10">
            <EmptyState icon={Scale} title="No transactions yet" description="Add income or expense to track this event." />
          </div>
        )}
      </div>

      <Modal isOpen={!!activeModal} onClose={closeModal} title={`Add Event ${activeModal === 'income' ? 'Income' : 'Expense'}`}>
        <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
          <DatePicker label="Date" value={date} onChange={setDate} required />
          <Select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={['', ...(activeModal === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)]}
            required
          />
          <Input
            label={activeModal === 'income' ? 'Received From' : 'Paid To'}
            value={person}
            onChange={e => setPerson(e.target.value)}
            placeholder="Name..."
          />
          <Input
            label="Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
          <Select
            label="Status"
            value={paymentStatus}
            onChange={e => setPaymentStatus(e.target.value)}
            options={activeModal === 'income' ? ['Paid', 'Pending'] : ['Paid', 'Pending']}
          />
          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional details" />
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={closeModal} type="button">Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <SmartPrintPreview
        isOpen={!!printData}
        onClose={() => setPrintData(null)}
        data={printData || []}
        filters={{
          eventName: event.name,
          paymentStatus: 'All',
          categories: [],
        }}
      />
    </div>
  );
}