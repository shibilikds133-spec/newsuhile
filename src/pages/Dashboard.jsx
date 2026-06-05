import React, { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { formatINR, formatDate } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import { format, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, Scale, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';

export default function Dashboard() {
  const { 
    allTransactions, 
    loading, 
    syncStatus,
    totalIncome: overallIncome,
    totalExpense: overallExpense,
    totalUnpaid: overallUnpaid,
    netBalance: overallNetBalance 
  } = useTransactions();
  
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'overall'

  // Filter by selected month for the monthly view
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (viewMode === 'overall') return true;
      if (!selectedMonth) return true;
      try {
        const [year, month] = selectedMonth.split('-');
        const tDate = new Date(t.date);
        return tDate.getFullYear() === parseInt(year) && (tDate.getMonth() + 1) === parseInt(month);
      } catch {
        return true;
      }
    });
  }, [allTransactions, selectedMonth, viewMode]);

  const monthlyIncome = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  , [filteredTransactions]);

  const monthlyExpense = useMemo(() => 
    filteredTransactions
      .filter(t => (t.type === 'expense' && t.paymentStatus === 'Paid') || t.type === 'refreshment')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  , [filteredTransactions]);

  const monthlyUnpaid = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === 'expense' && t.paymentStatus === 'Unpaid')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  , [filteredTransactions]);

  const monthlyNetBalance = monthlyIncome - monthlyExpense;

  // Decide which data to show in cards
  const displayIncome = viewMode === 'monthly' ? monthlyIncome : overallIncome;
  const displayExpense = viewMode === 'monthly' ? monthlyExpense : overallExpense;
  const displayUnpaid = viewMode === 'monthly' ? monthlyUnpaid : overallUnpaid;
  const displayNetBalance = viewMode === 'monthly' ? monthlyNetBalance : overallNetBalance;

  const recentTransactions = useMemo(() => 
    filteredTransactions.slice(0, 10)
  , [filteredTransactions]);

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'type', label: 'Type', render: (r) => <Badge type={r.type} /> },
    { key: 'category', label: 'Category/Item', render: (r) => r.category || r.item },
    { key: 'description', label: 'Description', render: (r) => r.payerName || r.paidTo || r.notes || '-' },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: (r) => (
        <span className={r.type === 'income' ? 'text-primary font-medium' : 'text-danger font-medium'}>
          {formatINR(r.amount)}
        </span>
      ) 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">Dashboard</h1>
            <p className="text-muted text-sm mt-1">Overview of your finances</p>
          </div>
          {syncStatus === 'syncing' && (
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium animate-pulse border border-blue-100">
              <RefreshCw size={12} className="animate-spin" />
              Syncing...
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {/* Mobile toggle */}
          <div className="flex md:!hidden bg-white p-1 rounded-lg border border-border shadow-sm">
            <button 
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-text'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setViewMode('overall')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'overall' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-text'}`}
            >
              Overall
            </button>
          </div>

          {/* Desktop Month Picker */}
          <div className="hidden md:block">
             <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setViewMode('monthly');
              }}
              className="border border-border bg-white rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-text"
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout (hidden on md and up) */}
      <div className="md:!hidden space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card 
            label="INCOME" 
            value={formatINR(displayIncome)} 
            accent="green" 
            icon={TrendingUp} 
            className="text-center p-3"
          />
          <Card 
            label="EXPENSE" 
            value={formatINR(displayExpense)} 
            accent="red" 
            icon={TrendingDown} 
            className="text-center p-3"
          />
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden h-44 flex flex-col justify-end">
          <div className="absolute top-4 right-4 opacity-10">
            <Scale size={120} strokeWidth={1} />
          </div>
          <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">Net Balance</p>
          <h3 className="text-4xl font-black tracking-tight">{formatINR(displayNetBalance)}</h3>
        </div>

        {displayUnpaid > 0 && (
          <Card 
            label="PENDING / UNPAID" 
            value={formatINR(displayUnpaid)} 
            accent="amber" 
            icon={TrendingDown} 
            className="bg-amber-50/50"
          />
        )}
      </div>

      {/* Desktop Layout (hidden on mobile, visible on md and up) */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        <Card 
          label="Total Income (Varav)" 
          value={formatINR(displayIncome)} 
          accent="green" 
          icon={TrendingUp} 
        />
        <Card 
          label="Paid Expense (Chilav)" 
          value={formatINR(displayExpense)} 
          accent="red" 
          icon={TrendingDown} 
        />
        <Card 
          label="Pending / Unpaid" 
          value={formatINR(displayUnpaid)} 
          accent="blue" 
          icon={TrendingDown} 
        />
        <Card 
          label="Net Balance (Shishtam)" 
          value={formatINR(displayNetBalance)} 
          accent="blue" 
          icon={Scale} 
        />
      </div>

      {viewMode === 'monthly' && (
        <div className="md:!hidden bg-primary-light/50 p-4 rounded-lg border border-primary-light flex items-center justify-between">
          <p className="text-sm font-medium text-primary-dark">
            Showing data for: <span className="font-bold">{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</span>
          </p>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none bg-white rounded px-2 py-1 text-sm font-bold shadow-sm focus:ring-primary"
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text">Recent Transactions</h2>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="p-0">
            <Table columns={columns} data={recentTransactions} className="border-0 shadow-none rounded-none" />
            <div className="bg-bg px-6 py-3 border-t border-border text-center">
              <Link to="/reports" className="text-primary hover:text-primary-dark text-sm font-medium">
                View All Reports &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState 
            icon={TrendingUp}
            title="No transactions yet"
            description="Start adding income and expenses to see them here."
          />
        )}
      </div>
    </div>
  );
}
