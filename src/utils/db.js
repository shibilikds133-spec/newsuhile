import Dexie from 'dexie';

// Initialize Dexie
export const db = new Dexie('DawaTrustDB');

// Version 1 — KEEP so Dexie can migrate existing databases correctly
db.version(1).stores({
  income: 'id, date, type, synced',
  expenses: 'id, date, type, paymentStatus, synced',
  refreshments: 'id, date, type, synced'
});

// Version 2 — Adds sync_status index and sync_log table
// sync_status values: 'pending' | 'synced' | 'failed'
// is_deleted supports soft-delete so offline deletes sync correctly
db.version(2).stores({
  income: 'id, date, type, synced, sync_status',
  expenses: 'id, date, type, paymentStatus, synced, sync_status',
  refreshments: 'id, date, type, synced, sync_status',
  sync_log: '++id, record_id, table_name, status, attempted_at',
});

// Version 3 — Adds paymentStatus to income and refreshments
db.version(3).stores({
  income: 'id, date, type, paymentStatus, synced, sync_status',
  expenses: 'id, date, type, paymentStatus, synced, sync_status',
  refreshments: 'id, date, type, paymentStatus, synced, sync_status',
  sync_log: '++id, record_id, table_name, status, attempted_at',
});

export default db;
