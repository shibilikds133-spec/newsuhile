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

// Version 4 — Adds app_config table
db.version(4).stores({
  income: 'id, date, type, paymentStatus, synced, sync_status',
  expenses: 'id, date, type, paymentStatus, synced, sync_status',
  refreshments: 'id, date, type, paymentStatus, synced, sync_status',
  sync_log: '++id, record_id, table_name, status, attempted_at',
  app_config: 'id, sync_status, updated_at',
});

// Version 5 — Custom Events (Isolated)
db.version(5).stores({
  income: 'id, date, type, paymentStatus, synced, sync_status',
  expenses: 'id, date, type, paymentStatus, synced, sync_status',
  refreshments: 'id, date, type, paymentStatus, synced, sync_status',
  sync_log: '++id, record_id, table_name, status, attempted_at',
  app_config: 'id, sync_status, updated_at',
  events: 'id, name, status, created_at, sync_status',
  event_transactions: 'id, event_id, date, type, category, sync_status',
});

export default db;
