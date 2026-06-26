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
      // CRIT-2 fix upgraded: If full hydration is not explicitly marked as complete,
      // useSync.checkAndHydrate() is handling (or will handle) the full-history pull.
      // Skip normal startup sync to prevent a parallel race.
      const hydrationState = localStorage.getItem('dawa_hydration_state') || 'idle';
      if (hydrationState !== 'complete') {
        setLoading(false);
        return;
      }

      // Don't set loading to true if we already have some local data to show
      const hasLocalData = rawIncome.length > 0 || rawExpenses.length > 0 || rawRefreshments.length > 0;
      if (!hasLocalData) setLoading(true);
      
      setGlobalSyncStatus('syncing');
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1; // 1-indexed

        // Include last month so Dashboard's default "last month" view has data
        const lastMonthDate = new Date(y, m - 2, 1);
        const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
        const monthEnd = new Date(y, m, 0).toISOString().split('T')[0];

        const [incRes, expRes, refRes] = await Promise.all([
          supabase.from('income').select('*').gte('date', lastMonthStart).lte('date', monthEnd),
          supabase.from('expenses').select('*').gte('date', lastMonthStart).lte('date', monthEnd),
          supabase.from('refreshments').select('*').gte('date', lastMonthStart).lte('date', monthEnd),
        ]);

        if (incRes.error || expRes.error || refRes.error) {
          throw new Error('Failed to fetch data from Supabase');
        }

        // Safe merge remote data into local keeping local 'pending' items safe
        const safeMerge = async (tableName, serverData, defaultStatus) => {
          if (!serverData || serverData.length === 0) return;
          await db.transaction('rw', db[tableName], async () => {
            const pending = await db[tableName]
              .filter(r => r.sync_status === 'pending' || r.synced === false)
              .toArray();
            const pendingIds = new Set(pending.map(r => r.id));

            const toPut = serverData
              .filter(r => !pendingIds.has(r.id))
              .map(r => ({
                ...r,
                paymentStatus: r.paymentStatus || defaultStatus,
                synced: true,
                sync_status: 'synced',
              }));

            if (toPut.length > 0) {
              await db[tableName].bulkPut(toPut);
            }
          });
        };

        await safeMerge('income', incRes.data, 'Received');
        await safeMerge('expenses', expRes.data, 'Paid');
        await safeMerge('refreshments', refRes.data, 'Paid');

        // Mark both last month and current month as loaded in cache
        const currentMonthStr = `${y}-${String(m).padStart(2, '0')}`;
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const loadedMonthsStr = localStorage.getItem('dawa_loaded_months') || '[]';
        let loadedMonths = [];
        try {
          loadedMonths = JSON.parse(loadedMonthsStr);
        } catch (e) {
          loadedMonths = [];
        }
        [currentMonthStr, lastMonthStr].forEach(ms => {
          if (!loadedMonths.includes(ms)) loadedMonths.push(ms);
        });
        localStorage.setItem('dawa_loaded_months', JSON.stringify(loadedMonths));

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

  const fetchDateRangeFromServer = async (fromDate, toDate) => {
    if (!navigator.onLine) return;
    if (!fromDate || !toDate) return;

    try {
      setGlobalSyncStatus('syncing');
      
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      // 1. Calculate months spanned
      const months = [];
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      const limit = new Date(end.getFullYear(), end.getMonth(), 1);
      while (current <= limit) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        months.push(`${y}-${m}`);
        current.setMonth(current.getMonth() + 1);
      }

      // 2. Filter loaded months
      const loadedMonthsStr = localStorage.getItem('dawa_loaded_months') || '[]';
      let loadedMonths = [];
      try {
        loadedMonths = JSON.parse(loadedMonthsStr);
      } catch (err) {
        loadedMonths = [];
      }

      const missingMonths = months.filter(m => !loadedMonths.includes(m));
      if (missingMonths.length === 0) {
        setGlobalSyncStatus('synced');
        return;
      }

      // 3. Fetch missing months in batches
      for (const monthStr of missingMonths) {
        const [yStr, mStr] = monthStr.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);

        const monthStart = `${yStr}-${mStr}-01`;
        const monthEnd = new Date(y, m, 0).toISOString().split('T')[0];

        const [incRes, expRes, refRes] = await Promise.all([
          supabase.from('income').select('*').gte('date', monthStart).lte('date', monthEnd),
          supabase.from('expenses').select('*').gte('date', monthStart).lte('date', monthEnd),
          supabase.from('refreshments').select('*').gte('date', monthStart).lte('date', monthEnd),
        ]);

        if (incRes.error) throw incRes.error;
        if (expRes.error) throw expRes.error;
        if (refRes.error) throw refRes.error;

        // 4. Safe merge into local Dexie
        const safeMerge = async (tableName, serverData, defaultStatus) => {
          if (!serverData || serverData.length === 0) return;
          await db.transaction('rw', db[tableName], async () => {
            const pending = await db[tableName]
              .filter(r => r.sync_status === 'pending' || r.synced === false)
              .toArray();
            const pendingIds = new Set(pending.map(r => r.id));

            const toPut = serverData
              .filter(r => !pendingIds.has(r.id))
              .map(r => ({
                ...r,
                paymentStatus: r.paymentStatus || defaultStatus,
                synced: true,
                sync_status: 'synced',
              }));

            if (toPut.length > 0) {
              await db[tableName].bulkPut(toPut);
            }
          });
        };

        await safeMerge('income', incRes.data, 'Received');
        await safeMerge('expenses', expRes.data, 'Paid');
        await safeMerge('refreshments', refRes.data, 'Paid');

        loadedMonths.push(monthStr);
        localStorage.setItem('dawa_loaded_months', JSON.stringify(loadedMonths));
      }

      setGlobalSyncStatus('synced');
    } catch (e) {
      console.error('[fetchDateRangeFromServer] error:', e);
      setGlobalSyncStatus('error');
    }
  };

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
    fetchDateRangeFromServer,
    ...stats,
  };
}
