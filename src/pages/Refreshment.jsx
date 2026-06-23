import React, { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useForm } from '../hooks/useForm';
import { REFRESHMENT_ITEMS } from '../constants/categories';
import { validators } from '../utils/validators';
import { newId } from '../utils/uuid';
import { todayISO, formatINR, formatDate } from '../utils/formatters';
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

export default function Refreshment() {
  const { refreshments, addRefreshment, deleteRecord, updatePaymentStatus, totalRefreshment } = useTransactions();
  const [deleteId, setDeleteId] = useState(null);
  const [paymentId, setPaymentId] = useState(null);

  const form = useForm({
    initialValues: {
      date: todayISO(),
      item: '',
      quantity: 1,
      amount: '',
      notes: '',
      paymentStatus: ''
    },
    validate: validators.refreshment,
    onSubmit: (values) => {
      const record = {
        ...values,
        id: newId(),
        type: 'refreshment',
        quantity: Number(values.quantity),
        amount: Number(values.amount),
        created_at: new Date().toISOString()
      };
      
      addRefreshment(record);
      form.resetForm();
      toast.success('Refreshment added');
    }
  });

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'item', label: 'Item' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'notes', label: 'Notes' },
    { key: 'amount', label: 'Amount', render: r => <span className="font-semibold text-warning">{formatINR(r.amount)}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.paymentStatus || 'Paid'} /> },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <DropdownMenu>
          <Button variant="secondary" onClick={() => setPaymentId(r)} className="w-full !justify-start !border-0 !shadow-none !bg-transparent hover:!bg-gray-100 !text-gray-700">
            {(r.paymentStatus === 'Paid' || !r.paymentStatus) ? 'Mark Unpaid' : 'Mark Paid'}
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
        <h1 className="text-2xl font-bold text-text">Refreshment (Chayachilav)</h1>
        <p className="text-muted text-sm mt-1">Record daily refreshments and small expenses. These will be included in total expense.</p>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-gray-50">
          <h2 className="text-base font-semibold text-text">Add Refreshment</h2>
        </div>
        <form onSubmit={form.handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <Input label="Date" name="date" type="date" required value={form.values.date} onChange={form.handleChange} error={form.errors.date} />
            <Select label="Item" name="item" options={REFRESHMENT_ITEMS} required value={form.values.item} onChange={form.handleChange} error={form.errors.item} />
            <Input label="Qty" name="quantity" type="number" min="1" required value={form.values.quantity} onChange={form.handleChange} error={form.errors.quantity} />
            <Input label="Amount (₹)" name="amount" type="number" min="1" required value={form.values.amount} onChange={form.handleChange} error={form.errors.amount} />
            <div className="flex flex-col gap-1">
              <Select 
                label="Payment Status" 
                name="paymentStatus" 
                required 
                value={form.values.paymentStatus} 
                onChange={form.handleChange}
                error={form.errors.paymentStatus}
              >
                <option value="">Select Status...</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </Select>
            </div>
            <Input label="Notes" name="notes" value={form.values.notes} onChange={form.handleChange} />
          </div>
          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={form.resetForm} className="mr-3">Clear</Button>
            <Button type="submit" variant="primary">Save Entry</Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-text">Refreshment Log</h2>
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
              Total: {formatINR(totalRefreshment)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {
              if (refreshments.length === 0) return toast.error('No data to export');
              exportToExcel(refreshments, [
                 { key: 'date', label: 'Date' },
                 { key: 'item', label: 'Item' },
                 { key: 'quantity', label: 'Qty' },
                 { key: 'amount', label: 'Amount' },
                 { key: 'notes', label: 'Notes' }
              ], `refreshment-report-${todayISO()}.xlsx`);
            }}>
              Download Excel
            </Button>
          </div>
        </div>
        
        {refreshments.length > 0 ? (
          <Table columns={columns} data={refreshments} className="border-0 rounded-none shadow-none" />
        ) : (
          <EmptyState icon={null} title="No refreshments recorded" description="Add your first refreshment above." />
        )}
      </div>

      <Modal 
        isOpen={!!deleteId} 
        title="Delete Refreshment?" 
        message="Are you sure you want to delete this record? This cannot be undone."
        confirmVariant="danger"
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          deleteRecord(deleteId, 'refreshment');
          setDeleteId(null);
          toast.success('Record deleted');
        }}
      />

      <Modal 
        isOpen={!!paymentId} 
        title="Change Payment Status" 
        message={`Are you sure you want to change the status of this refreshment to ${(paymentId?.paymentStatus === 'Paid' || !paymentId?.paymentStatus) ? 'Unpaid' : 'Paid'}?`}
        confirmVariant="primary"
        confirmLabel="Yes, Change Status"
        onCancel={() => setPaymentId(null)}
        onConfirm={() => {
          updatePaymentStatus(paymentId.id, 'refreshment');
          setPaymentId(null);
          toast.success('Status updated');
        }}
      />
    </div>
  );
}
