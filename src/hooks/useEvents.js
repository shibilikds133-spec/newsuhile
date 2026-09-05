import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../utils/db';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import { calculateTransactionSummary } from '../utils/accounting';

export function useEvents() {
  const [syncStatus, setSyncStatus] = useState('synced');
  const [loading, setLoading] = useState(false);

  // Read all non-deleted events
  const rawEvents = useLiveQuery(() => db.events.filter(r => !r.is_deleted).toArray()) || [];
  
  // Sort events newest first
  const events = useMemo(() => {
    return [...rawEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawEvents]);

  const pushToCloud = async (table, record) => {
    setSyncStatus('syncing');
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { synced, sync_status, is_deleted, ...recordToSync } = record;
      const { error } = await supabase
        .from(table)
        .upsert([recordToSync], { onConflict: 'id' });
      if (error) throw error;

      await db[table].update(record.id, { synced: true, sync_status: 'synced' });
      setSyncStatus('synced');
    } catch (e) {
      console.warn(`Cloud sync paused for ${table}. Data saved locally.`, e);
      await db[table].update(record.id, { sync_status: 'failed' });
      setSyncStatus('error');
    }
  };

  const createEvent = async (record) => {
    const newRecord = { 
      ...record, 
      status: 'active',
      synced: false, 
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };
    await db.events.put(newRecord);
    await pushToCloud('events', newRecord);
    return newRecord.id;
  };

  const updateEvent = async (id, updates) => {
    const record = await db.events.get(id);
    if (!record) return;
    const newRecord = { ...record, ...updates, synced: false, sync_status: 'pending' };
    await db.events.put(newRecord);
    await pushToCloud('events', newRecord);
  };

  const archiveEvent = async (id) => updateEvent(id, { status: 'archived' });
  const unarchiveEvent = async (id) => updateEvent(id, { status: 'active' });

  // Delete event and cascade delete all its transactions
  const deleteEvent = async (id) => {
    setSyncStatus('syncing');
    try {
      // 1. Soft delete local event and its transactions
      await db.events.update(id, { is_deleted: true, synced: false, sync_status: 'pending' });
      
      const txs = await db.event_transactions.filter(r => r.event_id === id).toArray();
      for (const tx of txs) {
        await db.event_transactions.update(tx.id, { is_deleted: true, synced: false, sync_status: 'pending' });
      }

      // 2. Soft delete on cloud
      if (navigator.onLine) {
        const { error: err1 } = await supabase.from('events').update({ is_deleted: true }).eq('id', id);
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('event_transactions').update({ is_deleted: true }).eq('event_id', id);
        if (err2) throw err2;

        await db.events.update(id, { sync_status: 'synced', synced: true });
        for (const tx of txs) {
          await db.event_transactions.update(tx.id, { sync_status: 'synced', synced: true });
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      console.warn('Could not delete from cloud immediately — tombstone retained.', e);
      setSyncStatus('error');
    }
  };

  // -------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------
  
  const addEventTransaction = async (record) => {
    const newRecord = { 
      ...record, 
      paymentStatus: record.paymentStatus || 'Paid', 
      synced: false, 
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };
    await db.event_transactions.put(newRecord);
    await pushToCloud('event_transactions', newRecord);
  };

  const addEventIncome = async (eventId, record) => {
    await addEventTransaction({ ...record, event_id: eventId, type: 'income', paymentStatus: record.paymentStatus || 'Received' });
  };

  const addEventExpense = async (eventId, record) => {
    await addEventTransaction({ ...record, event_id: eventId, type: 'expense', paymentStatus: record.paymentStatus || 'Paid' });
  };

  const deleteEventTransaction = async (id) => {
    await db.event_transactions.update(id, { is_deleted: true, synced: false, sync_status: 'pending' });
    setSyncStatus('syncing');
    try {
      if (navigator.onLine) {
        const { error } = await supabase.from('event_transactions').update({ is_deleted: true }).eq('id', id);
        if (error) throw error;
        await db.event_transactions.update(id, { sync_status: 'synced', synced: true });
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      console.warn('Tombstone retained for later sync.', e);
      setSyncStatus('error');
    }
  };

  const updateEventTxStatus = async (id) => {
    const record = await db.event_transactions.get(id);
    if (!record) return;
    
    let newStatus = 'Paid';
    if (record.type === 'income') {
      newStatus = (record.paymentStatus === 'Received' || !record.paymentStatus) ? 'Pending' : 'Received';
    } else {
      newStatus = (record.paymentStatus === 'Paid' || !record.paymentStatus) ? 'Pending' : 'Paid';
    }

    await db.event_transactions.update(id, { paymentStatus: newStatus, synced: false, sync_status: 'pending' });
    setSyncStatus('syncing');
    try {
      if (navigator.onLine) {
        const { error } = await supabase.from('event_transactions').update({ paymentStatus: newStatus }).eq('id', id);
        if (error) throw error;
        await db.event_transactions.update(id, { synced: true, sync_status: 'synced' });
        setSyncStatus('synced');
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  };

  return {
    events,
    loading,
    syncStatus,
    createEvent,
    updateEvent,
    archiveEvent,
    unarchiveEvent,
    deleteEvent,
    
    addEventIncome,
    addEventExpense,
    deleteEventTransaction,
    updateEventTxStatus,
  };
}

export function useEventDetail(eventId) {
  const [loading, setLoading] = useState(true);
  const event = useLiveQuery(() => db.events.get(eventId), [eventId]);
  const rawTxs = useLiveQuery(() => db.event_transactions.filter(r => r.event_id === eventId && !r.is_deleted).toArray(), [eventId]);
  
  useEffect(() => {
    if (event !== undefined && rawTxs !== undefined) {
      setLoading(false);
    }
  }, [event, rawTxs]);

  const transactions = useMemo(() => {
    if (!rawTxs) return [];
    return [...rawTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawTxs]);

  const summary = useMemo(() => calculateTransactionSummary(transactions), [transactions]);

  return {
    event,
    transactions,
    summary,
    loading
  };
}

export function useEventCategories(eventId) {
  const rawConfig = useLiveQuery(
    () => db.app_config.filter(r => r.id.startsWith(`event_cat_${eventId}_`) && !r.is_deleted).toArray(),
    [eventId]
  ) || [];

  const incomeCategories = useMemo(() => {
    return rawConfig.filter(c => c.id.includes('_income_')).map(c => c.value);
  }, [rawConfig]);

  const expenseCategories = useMemo(() => {
    return rawConfig.filter(c => c.id.includes('_expense_')).map(c => c.value);
  }, [rawConfig]);

  const saveCustomCategory = async (type, category) => {
    if (!category || !category.trim()) return;
    const catUpper = category.trim().toUpperCase();
    if (type === 'income' && catUpper === 'DONATION') return;
    if (type === 'expense' && catUpper === 'EXPENSE') return;
    
    const id = `event_cat_${eventId}_${type}_${catUpper}`;
    const existing = await db.app_config.get(id);
    if (!existing || existing.is_deleted) {
      const record = {
        id,
        value: catUpper,
        is_deleted: false,
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      };
      await db.app_config.put(record);
      
      // Auto push to cloud if online
      if (navigator.onLine) {
        supabase.from('app_config').upsert([{
          id: record.id,
          value: record.value,
          updated_at: record.updated_at,
          is_deleted: record.is_deleted
        }]).then(({ error }) => {
          if (!error) db.app_config.update(id, { sync_status: 'synced' });
        });
      }
    }
  };

  const deleteCustomCategory = async (type, category) => {
    const catUpper = category.trim().toUpperCase();
    const id = `event_cat_${eventId}_${type}_${catUpper}`;
    const existing = await db.app_config.get(id);
    if (existing) {
      const record = {
        ...existing,
        is_deleted: true,
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      };
      await db.app_config.put(record);
      
      if (navigator.onLine) {
        supabase.from('app_config').update({ is_deleted: true, updated_at: record.updated_at }).eq('id', id)
          .then(({ error }) => {
            if (!error) db.app_config.update(id, { sync_status: 'synced' });
          });
      }
    }
  };

  return { incomeCategories, expenseCategories, saveCustomCategory, deleteCustomCategory };
}

