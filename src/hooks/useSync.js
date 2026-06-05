import { useEffect } from 'react';
import db from '../utils/db';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import { useTransactions } from './useTransactions';
import { syncPendingRecords, retryFailedRecords } from '../sync/engine';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useSync() {
  const { setSyncStatus } = useTransactions();

  useEffect(() => {
    // -----------------------------------------------------------------------
    // Reconnect handler — fire immediately when coming back online
    // -----------------------------------------------------------------------
    const handleOnline = async () => {
      setSyncStatus('syncing');
      try {
        await syncPendingRecords();
        setSyncStatus('synced');
        toast.success('Offline records synced to cloud!');
      } catch (e) {
        console.error('Auto-sync failed:', e);
        setSyncStatus('error');
      }
    };

    // -----------------------------------------------------------------------
    // Interval sync — runs every 5 minutes while the app is open and online
    // -----------------------------------------------------------------------
    const intervalId = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        await syncPendingRecords();
        setSyncStatus('synced');
      } catch (e) {
        console.warn('[useSync] Interval sync error:', e);
        setSyncStatus('error');
      }
    }, INTERVAL_MS);

    // -----------------------------------------------------------------------
    // Hydration check: if DB is completely empty on boot, pull from cloud
    // -----------------------------------------------------------------------
    const checkAndHydrate = async () => {
      try {
        const incomeCount = await db.income.count();
        if (incomeCount === 0 && navigator.onLine) {
          console.log('Database empty on first boot. Pulling data from cloud...');
          await pullFromCloud();
        }
      } catch (error) {
        console.error('Hydration check failed:', error);
      }
    };

    checkAndHydrate();
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [setSyncStatus]);

  // -------------------------------------------------------------------------
  // syncNow — filters by sync_status:'pending' (more reliable than synced flag)
  // -------------------------------------------------------------------------
  const syncNow = async () => {
    setSyncStatus('syncing');
    try {
      await syncPendingRecords();
      setSyncStatus('synced');
    } catch (e) {
      console.error('[useSync] syncNow failed:', e);
      setSyncStatus('error');
      throw e;
    }
  };

  // -------------------------------------------------------------------------
  // retryFailed — resets all failed records back to pending and re-syncs
  // -------------------------------------------------------------------------
  const retryFailed = async () => {
    setSyncStatus('syncing');
    try {
      await retryFailedRecords();
      setSyncStatus('synced');
      toast.success('Failed records retried successfully!');
    } catch (e) {
      console.error('[useSync] retryFailed error:', e);
      setSyncStatus('error');
      toast.error('Retry failed. Check your connection.');
    }
  };

  // -------------------------------------------------------------------------
  // pullFromCloud — full pull from Supabase → local IndexedDB
  // -------------------------------------------------------------------------
  const pullFromCloud = async () => {
    try {
      if (!navigator.onLine) return;

      setSyncStatus('syncing');

      const [incRes, expRes, refRes] = await Promise.all([
        supabase.from('income').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('refreshments').select('*')
      ]);

      if (incRes.error) throw incRes.error;
      if (expRes.error) throw expRes.error;
      if (refRes.error) throw refRes.error;

      // Mark downloaded records as already synced
      const markSynced = (data) =>
        data?.map(item => ({ ...item, synced: true, sync_status: 'synced' })) || [];

      await db.transaction('rw', db.income, db.expenses, db.refreshments, async () => {
        if (incRes.data?.length > 0) await db.income.bulkPut(markSynced(incRes.data));
        if (expRes.data?.length > 0) await db.expenses.bulkPut(markSynced(expRes.data));
        if (refRes.data?.length > 0) await db.refreshments.bulkPut(markSynced(refRes.data));
      });

      setSyncStatus('synced');
      console.log('Successfully pulled all data from cloud');
    } catch (e) {
      console.error('Failed to pull from cloud:', e);
      setSyncStatus('error');
    }
  };

  return { syncNow, pullFromCloud, retryFailed };
}
