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
        const hydrationState = localStorage.getItem('dawa_hydration_state') || 'idle';
        if (hydrationState !== 'complete' && navigator.onLine) {
          console.log(`[Hydration] State is '${hydrationState}'. Pulling FULL HISTORY from cloud...`);
          await pullFromCloud(true); // fresh install — no date cap
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
  const pullFromCloud = async (fullHistory = false) => {
    try {
      if (!navigator.onLine) return;

      if (fullHistory) {
        localStorage.setItem('dawa_hydration_state', 'running');
      }
      setSyncStatus('syncing');

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');

      // -----------------------------------------------------------------------
      // CRIT-1 fix: paginated helper — fetches ALL rows even when table > 1000
      // Supabase/PostgREST silently caps a plain select('*') at 1000 rows.
      // This loop continues until a page returns fewer rows than PAGE_SIZE.
      // -----------------------------------------------------------------------
      const fetchAllRows = async (tableName) => {
        const PAGE_SIZE = 1000;
        let allData = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          allData = [...allData, ...(data || [])];
          if (!data || data.length < PAGE_SIZE) break; // last page reached
          from += PAGE_SIZE;
        }
        return allData;
      };

      let incData, expData, refData;

      if (fullHistory) {
        // Fresh install: paginated fetch — guaranteed no row cap
        [incData, expData, refData] = await Promise.all([
          fetchAllRows('income'),
          fetchAllRows('expenses'),
          fetchAllRows('refreshments'),
        ]);
      } else {
        // Normal sync: single-page current-month fetch (always < 1000 rows)
        const monthStart = `${y}-${m}-01`;
        const monthEnd = new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0];
        const [incRes, expRes, refRes] = await Promise.all([
          supabase.from('income').select('*').gte('date', monthStart).lte('date', monthEnd),
          supabase.from('expenses').select('*').gte('date', monthStart).lte('date', monthEnd),
          supabase.from('refreshments').select('*').gte('date', monthStart).lte('date', monthEnd),
        ]);
        if (incRes.error) throw incRes.error;
        if (expRes.error) throw expRes.error;
        if (refRes.error) throw refRes.error;
        incData = incRes.data;
        expData = expRes.data;
        refData = refRes.data;
      }

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

      await safeMerge('income', incData, 'Received');
      await safeMerge('expenses', expData, 'Paid');
      await safeMerge('refreshments', refData, 'Paid');

      if (fullHistory) {
        // Full-history hydration complete
        localStorage.setItem('dawa_hydration_state', 'complete');
        console.log('[Hydration] Full history pulled and stored in Dexie.');
      } else {
        // Add this current month to dawa_loaded_months cache
        const monthStr = `${y}-${m}`;
        const loadedMonthsStr = localStorage.getItem('dawa_loaded_months') || '[]';
        let loadedMonths = [];
        try {
          loadedMonths = JSON.parse(loadedMonthsStr);
        } catch (e) {
          loadedMonths = [];
        }
        if (!loadedMonths.includes(monthStr)) {
          loadedMonths.push(monthStr);
          localStorage.setItem('dawa_loaded_months', JSON.stringify(loadedMonths));
        }
      }

      setSyncStatus('synced');
      console.log('[Sync] Pull from cloud complete.');
    } catch (e) {
      if (fullHistory) {
        localStorage.setItem('dawa_hydration_state', 'failed');
      }
      console.error('Failed to pull from cloud:', e);
      setSyncStatus('error');
    }
  };

  return { syncNow, pullFromCloud, retryFailed };
}
