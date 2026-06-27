/**
 * engine.js — Centralized Local-First Sync Engine
 *
 * Provides three core functions used by both useSync.js and the interval timer:
 *   • syncPendingRecords()  — push all sync_status='pending' records to cloud
 *   • retryFailedRecords()  — reset sync_status='failed' → 'pending' and re-sync
 *   • logSync()             — write a sync attempt to the local sync_log table
 *
 * Design notes:
 *   - Full Soft Delete architecture: records with is_deleted=true are upserted
 *     to Supabase (tombstone), never physically deleted from cloud.
 *   - Other devices detect the tombstone on next pull and remove locally.
 *   - cloud upsert uses onConflict:'id' to prevent duplicate rows.
 */

import db from '../utils/db';
import { supabase } from '../utils/supabase';

const TABLES = ['income', 'expenses', 'refreshments'];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function logSync({ record_id, table_name, status, error_msg = null }) {
  try {
    await db.sync_log.add({
      record_id,
      table_name,
      status,
      error_msg,
      attempted_at: new Date().toISOString(),
    });
  } catch (e) {
    // Non-critical — never let logging crash the sync
    console.warn('[SyncEngine] logSync error:', e);
  }
}

async function syncTable(tableName) {
  const pending = await db[tableName]
    .filter((r) => r.sync_status === 'pending')
    .toArray();

  if (pending.length === 0) return;

  // Separate soft-deleted vs normal upserts
  const toDelete = pending.filter((r) => r.is_deleted === true);
  const toUpsert = pending.filter((r) => r.is_deleted !== true);

  // --- Handle soft-deleted records (Full Soft Delete) ---
  // Tombstone records are upserted to cloud with is_deleted=true.
  // They are NOT physically deleted from Supabase.
  // Other devices will detect is_deleted=true on next pull and remove locally.
  if (toDelete.length > 0) {
    const tombstones = toDelete.map(({ sync_status, synced, ...rest }) => ({
      ...rest,
      is_deleted: true,
    }));

    const { error: delError } = await supabase
      .from(tableName)
      .upsert(tombstones, { onConflict: 'id' });

    if (delError) {
      // Mark all tombstones as failed so retry picks them up
      await Promise.all(
        toDelete.map((r) =>
          db[tableName]
            .update(r.id, { sync_status: 'failed' })
            .then(() =>
              logSync({ record_id: r.id, table_name: tableName, status: 'failed', error_msg: delError.message })
            )
        )
      );
    } else {
      // Mark tombstones as synced — retain locally as tombstone, do NOT purge
      await Promise.all(
        toDelete.map((r) =>
          db[tableName]
            .update(r.id, { sync_status: 'synced', synced: true })
            .then(() =>
              logSync({ record_id: r.id, table_name: tableName, status: 'deleted' })
            )
        )
      );
    }
  }

  // --- Handle normal upserts ---
  if (toUpsert.length === 0) return;

  // Strip ALL local-only fields before sending to cloud
  const cloudRecords = toUpsert.map(({ sync_status, is_deleted, synced, ...rest }) => rest);

  const { error } = await supabase
    .from(tableName)
    .upsert(cloudRecords, { onConflict: 'id' });

  if (error) {
    // Mark all as failed
    await Promise.all(
      toUpsert.map((r) =>
        db[tableName].update(r.id, { sync_status: 'failed' }).then(() =>
          logSync({ record_id: r.id, table_name: tableName, status: 'failed', error_msg: error.message })
        )
      )
    );
    throw error; // Bubble up so useSync can set global UI status
  }

  // Mark all as synced
  await Promise.all(
    toUpsert.map((r) =>
      db[tableName].update(r.id, { sync_status: 'synced', synced: true }).then(() =>
        logSync({ record_id: r.id, table_name: tableName, status: 'synced' })
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Push all records with sync_status='pending' across all tables to Supabase.
 * Uses upsert(onConflict:'id') — safe to call multiple times.
 */
export async function syncPendingRecords() {
  if (!navigator.onLine) {
    console.log('[SyncEngine] Offline — skipping sync.');
    return;
  }

  const errors = [];
  for (const table of TABLES) {
    try {
      await syncTable(table);
    } catch (e) {
      errors.push({ table, error: e });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Sync failed for: ${errors.map((e) => e.table).join(', ')}`
    );
  }
}

/**
 * Reset all sync_status='failed' records back to 'pending' and re-sync.
 */
export async function retryFailedRecords() {
  for (const table of TABLES) {
    const failed = await db[table]
      .filter((r) => r.sync_status === 'failed')
      .toArray();

    if (failed.length > 0) {
      await Promise.all(
        failed.map((r) => db[table].update(r.id, { sync_status: 'pending' }))
      );
    }
  }

  await syncPendingRecords();
}

/**
 * Returns counts of pending / synced / failed records across all tables.
 * Useful for SystemHealth display.
 */
export async function getSyncCounts() {
  let pending = 0, synced = 0, failed = 0;

  for (const table of TABLES) {
    const all = await db[table].toArray();
    for (const r of all) {
      if (r.sync_status === 'pending') pending++;
      else if (r.sync_status === 'failed') failed++;
      else synced++; // 'synced' or legacy records without the field
    }
  }

  return { pending, synced, failed };
}
