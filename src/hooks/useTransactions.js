import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../utils/db';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

// Shared sync status to prevent multiple calls across components
let globalSyncStatus = 'synced';
const syncListeners = new Set();
const setGlobalSyncStatus = (status) => {
  globalSyncStatus = status;
  syncListeners.forEach(l => l(status));
};

export function useTransactions() {
  const [syncStatus, setSyncStatus] = useState(globalSyncStatus);
  // Change default loading to false to avoid blocking UI if local data exists
  const [loading, setLoading] = useState(false);

  // Use dexie-react-hooks to automatically listen to IndexedDB changes
  const rawIncome = useLiveQuery(() => db.income.filter(r => !r.is_deleted).toArray()) || [];
  const rawExpenses = useLiveQuery(() => db.expenses.filter(r => !r.is_deleted).toArray()) || [];
  const rawRefreshments = useLiveQuery(() => db.refreshments.filter(r => !r.is_deleted).toArray()) || [];

  // Sort them so newest is first
  const income = useMemo(() => [...rawIncome].sort((a,b) => new Date(b.date) - new Date(a.date)), [rawIncome]);
  const expenses = useMemo(() => [...rawExpenses].sort((a,b) => new Date(b.date) - new Date(a.date)), [rawExpenses]);
  const refreshments = useMemo(() => [...rawRefreshments].sort((a,b) => new Date(b.date) - new Date(a.date)), [rawRefreshments]);

  useEffect(() => {
    const handler = (s) => setSyncStatus(s);
    syncListeners.add(handler);
    return () => syncListeners.delete(handler);
  }, []);

  // Initial Sync from Supabase to LocalDB
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteData = async () => {
      // Don't set loading to true if we already have some local data to show
      const hasLocalData = rawIncome.length > 0 || rawExpenses.length > 0 || rawRefreshments.length > 0;
      if (!hasLocalData) setLoading(true);
      
      setGlobalSyncStatus('syncing');
      try {
        const { data: incomeData, error: incomeError } = await supabase.from('income').select('*');
        const { data: expenseData, error: expenseError } = await supabase.from('expenses').select('*');
        const { data: refreshData, error: refreshError } = await supabase.from('refreshments').select('*');

        if (incomeError || expenseError || refreshError) {
          throw new Error('Failed to fetch data from Supabase');
        }

        // Merge remote data into local keeping local 'pending' items safe
        await db.transaction('rw', db.income, db.expenses, db.refreshments, async () => {
          if (incomeData) await db.income.bulkPut(incomeData.map(r => ({ ...r, paymentStatus: r.paymentStatus || 'Received', synced: true, sync_status: 'synced' })));
          if (expenseData) await db.expenses.bulkPut(expenseData.map(r => ({ ...r, paymentStatus: r.paymentStatus || 'Paid', synced: true, sync_status: 'synced' })));
          if (refreshData) await db.refreshments.bulkPut(refreshData.map(r => ({ ...r, paymentStatus: r.paymentStatus || 'Paid', synced: true, sync_status: 'synced' })));
        });

        if (isMounted) setGlobalSyncStatus('synced');
      } catch (error) {
        console.error('Remote sync error:', error);
        if (isMounted) setGlobalSyncStatus('error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRemoteData();
    return () => { isMounted = false; };
  }, []);

  // Sync a single record to cloud
  const pushToCloud = async (table, record) => {
    setGlobalSyncStatus('syncing');
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { synced, sync_status, is_deleted, ...recordToSync } = record;
      const { error } = await supabase
        .from(table)
        .upsert([recordToSync], { onConflict: 'id' });
      if (error) throw error;

      await db[table].update(record.id, { synced: true, sync_status: 'synced' });
      setGlobalSyncStatus('synced');
    } catch (e) {
      console.warn(`Cloud sync paused for ${table}. Data saved locally.`, e);
      await db[table].update(record.id, { sync_status: 'failed' });
      setGlobalSyncStatus('error');
      
      if (!window._syncErrorShown) {
        toast('Cloud sync paused. Your data is safe on this device.', {
          icon: '☁️',
          duration: 4000,
          id: 'sync-warning'
        });
        window._syncErrorShown = true;
        setTimeout(() => { window._syncErrorShown = false; }, 30 * 60 * 1000);
      }
    }
  };

  const addIncome = async (record) => {
    const newRecord = { ...record, paymentStatus: record.paymentStatus || 'Received', synced: false, sync_status: 'pending' };
    await db.income.put(newRecord);
    await pushToCloud('income', newRecord);
  };

  const addExpense = async (record) => {
    const newRecord = { ...record, paymentStatus: record.paymentStatus || 'Paid', synced: false, sync_status: 'pending' };
    await db.expenses.put(newRecord);
    await pushToCloud('expenses', newRecord);
  };

  const addRefreshment = async (record) => {
    const newRecord = { ...record, paymentStatus: record.paymentStatus || 'Paid', synced: false, sync_status: 'pending' };
    await db.refreshments.put(newRecord);
    await pushToCloud('refreshments', newRecord);
  };

  const deleteRecord = async (id, type) => {
    const tableName = type === 'income' ? 'income' : type === 'expense' ? 'expenses' : 'refreshments';
    await db[tableName].update(id, { is_deleted: true, synced: false, sync_status: 'pending' });

    setGlobalSyncStatus('syncing');
    try {
      if (!navigator.onLine) {
        setGlobalSyncStatus('error');
        return;
      }
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      await db[tableName].delete(id);
      setGlobalSyncStatus('synced');
    } catch (e) {
      console.warn('Could not delete from cloud — soft-delete retained for later sync.', e);
      setGlobalSyncStatus('error');
    }
  };

  const updatePaymentStatus = async (id, type = 'expense') => {
    const tableName = type === 'income' ? 'income' : type === 'refreshment' ? 'refreshments' : 'expenses';
    const record = await db[tableName].get(id);
    if (!record) return;
    
    // Toggle logic based on type
    let newStatus = 'Paid';
    if (type === 'income') {
      newStatus = (record.paymentStatus === 'Received' || !record.paymentStatus) ? 'Pending' : 'Received';
    } else {
      newStatus = (record.paymentStatus === 'Paid' || !record.paymentStatus) ? 'Unpaid' : 'Paid';
    }

    await db[tableName].update(id, { paymentStatus: newStatus, synced: false, sync_status: 'pending' });

    setGlobalSyncStatus('syncing');
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { error } = await supabase.from(tableName).update({ paymentStatus: newStatus }).eq('id', id);
      if (error) throw error;
      await db[tableName].update(id, { synced: true, sync_status: 'synced' });
      setGlobalSyncStatus('synced');
    } catch (error) {
      console.warn('Update status error:', error);
      setGlobalSyncStatus('error');
    }
  };

  const allTransactions = useMemo(() => {
    return [...income, ...expenses, ...refreshments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [income, expenses, refreshments]);

  const stats = useMemo(() => {
    const totalInc = income.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalExpOnly = expenses
      .filter(r => r.paymentStatus === 'Paid')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalExpAll = expenses.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalUnp = expenses
      .filter(r => r.paymentStatus === 'Unpaid')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalRef = refreshments.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const totalExp = totalExpOnly + totalRef;
    const netBal = totalInc - totalExp;

    return {
      totalIncome: totalInc,
      totalExpense: totalExp,
      totalExpenseOnly: totalExpOnly,
      totalExpenseAll: totalExpAll,
      totalUnpaid: totalUnp,
      totalRefreshment: totalRef,
      netBalance: netBal,
    };
  }, [income, expenses, refreshments]);

  return {
    income,
    expenses,
    refreshments,
    loading,
    syncStatus,
    setSyncStatus: setGlobalSyncStatus,
    addIncome,
    addExpense,
    addRefreshment,
    deleteRecord,
    updatePaymentStatus,
    allTransactions,
    ...stats,
  };
}
