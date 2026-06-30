import React, { useState, useMemo, useEffect } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { formatINR, formatDate } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import { format, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, Scale, RefreshCw, Heart, ShoppingBasket, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import AdvancedDateFilter from '../components/ui/AdvancedDateFilter';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function Dashboard() {
  const { 
    allTransactions, 
    loading, 
    syncStatus,
    totalIncome: overallIncome,
    totalExpense: overallExpense,
    totalUnpaid: overallUnpaid,
    netBalance: overallNetBalance,
    fetchDateRangeFromServer
  } = useTransactions();
  
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return {
      start: format(startOfMonth(today), 'yyyy-MM-dd'),
      end: format(endOfMonth(today), 'yyyy-MM-dd'),
      label: 'This Month'
    };
  });
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'overall'

  // Auto-fetch data for whichever date range the user selects
  useEffect(() => {
    if (!dateFilter.start || !dateFilter.end) return;
    fetchDateRangeFromServer(dateFilter.start, dateFilter.end);
  }, [dateFilter.start, dateFilter.end]);

  // Filter by selected date range for the monthly view
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (viewMode === 'overall') return true;
      if (!dateFilter.start || !dateFilter.end) return true;
      try {
        const tDate = t.date; // assuming ISO yyyy-MM-dd format
        return tDate >= dateFilter.start && tDate <= dateFilter.end;
      } catch {
        return true;
      }
    });
  }, [allTransactions, dateFilter, viewMode]);

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
      .filter(t => t.type === 'expense' && (t.paymentStatus === 'Unpaid' || t.paymentStatus === 'Pending'))
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
    <div className="space-y-0">

      {/* ── DESKTOP HEADER (visible md+) ── */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
        <div className="flex items-center gap-3">
          {/* Desktop Month Picker */}
          <div className="hidden md:block">
            <AdvancedDateFilter
              value={dateFilter}
              onChange={(val) => {
                setDateFilter(val);
                setViewMode('monthly');
              }}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MOBILE LAYOUT (hidden on md and up)
      ══════════════════════════════════════ */}
      <div className="md:!hidden flex flex-col gap-6 pb-28">

        {/* ── HERO NET BALANCE CARD ── */}
        <div className="bg-gradient-to-br from-[#004d40] to-[#00695C] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group border border-white/10">
          {/* Subtle background decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700 ease-in-out"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#00342b]/20 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[12px] font-semibold text-[#94d3c1] uppercase tracking-wider opacity-80">
                  {viewMode === 'monthly' ? dateFilter.label : 'All Time'}
                </span>
                <h2 className="text-sm font-medium text-[#afefdd] opacity-90 mt-1">Net Balance (Shishtam)</h2>
              </div>
              {/* Month Selector Dropdown */}
              {viewMode === 'monthly' && (
                <div>
                  <AdvancedDateFilter
                    value={dateFilter}
                    onChange={(val) => setDateFilter(val)}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-1 flex items-center gap-3">
              <span className="text-[28px] font-bold tracking-tight">
                {formatINR(displayNetBalance)}
              </span>
              {syncStatus === 'syncing' && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-pulse ml-2" />
              )}
            </div>
            
            {/* Controls Toggle */}
            <div className="mt-3 flex bg-black/20 rounded-lg p-1 w-fit backdrop-blur-sm border border-white/5">
              <button 
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-1 rounded-md text-[12px] shadow-sm transition-all font-medium ${viewMode === 'monthly' ? 'bg-white text-[#00342b]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('overall')}
                className={`px-4 py-1 rounded-md text-[12px] transition-all font-medium ${viewMode === 'overall' ? 'bg-white text-[#00342b]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                All
              </button>
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
            <span className="text-[16px] font-semibold text-[#191c1b]">{formatINR(displayIncome)}</span>
          </div>
          {/* Vertical Divider */}
          <div className="w-px h-12 bg-[#e1e3e0] relative z-10"></div>
          <div className="flex-1 flex flex-col items-center justify-center p-2 relative z-10">
            <span className="text-[12px] font-medium text-[#3f4945] flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
              Expense
            </span>
            <span className="text-[16px] font-semibold text-[#191c1b]">{formatINR(displayExpense)}</span>
          </div>
        </div>

        {/* ── RECENT TRANSACTIONS ── */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h3 className="text-[18px] font-semibold text-[#191c1b]">Recent Transactions</h3>
            <Link to="/reports" className="text-[12px] font-medium text-[#00342b] hover:text-[#94d3c1] transition-colors">See All</Link>
          </div>
          
          <div className="flex flex-col gap-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group border border-transparent hover:border-[#e1e3e0]/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      tx.type === 'income' 
                        ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white' 
                        : 'bg-danger/10 text-danger group-hover:bg-danger group-hover:text-white'
                    }`}>
                      {tx.type === 'income' ? <Heart size={20} className="fill-current" /> : <ShoppingBasket size={20} className="fill-current" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-[#191c1b]">{tx.category || tx.item || 'Transaction'}</span>
                      <span className="text-[12px] font-medium text-[#3f4945]">{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <span className={`text-[14px] font-semibold ${tx.type === 'income' ? 'text-primary' : 'text-danger'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatINR(tx.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-6 flex flex-col items-center justify-center opacity-40">
                <div className="w-12 h-1 bg-[#e1e3e0] rounded-full mb-4"></div>
                <p className="text-sm">No transactions found</p>
              </div>
            )}
            
            {/* End indicator */}
            {recentTransactions.length > 0 && (
              <div className="py-2 flex justify-center opacity-40">
                <div className="w-12 h-1 bg-[#e1e3e0] rounded-full"></div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══ END MOBILE LAYOUT ══ */}

      {/* ── DESKTOP LAYOUT (hidden on mobile, visible on md and up) ── */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 mt-6">
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

      {/* Desktop recent transactions table */}
      <div className="hidden md:block mt-6 bg-white rounded-lg border border-border shadow-sm overflow-hidden">
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

