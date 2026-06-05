/**
 * heartbeat.js — Keeps the Supabase free-tier project alive.
 *
 * The Supabase free tier pauses a project after 7 days of inactivity.
 * This service sends a lightweight ping to the `heartbeat` table once per day
 * (and every 12 hours after that) to prevent the project from being paused.
 *
 * Requires in Supabase (run once in the SQL editor):
 *   create table if not exists heartbeat (
 *     id          text primary key default 'dawa-client',
 *     last_ping   timestamptz,
 *     app_version text
 *   );
 *   alter table heartbeat enable row level security;
 *   create policy "anon access" on heartbeat for all using (true);
 */

import { supabase } from '../utils/supabase';

const HEARTBEAT_KEY = 'last_heartbeat_date';
const HEARTBEAT_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const APP_VERSION = '2.0.0';

async function sendHeartbeat() {
  if (!navigator.onLine) {
    console.log('[Heartbeat] Offline — skipping ping.');
    return;
  }

  try {
    const { error } = await supabase
      .from('heartbeat')
      .upsert(
        { id: 'dawa-client', last_ping: new Date().toISOString(), app_version: APP_VERSION },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[Heartbeat] Ping failed:', error.message);
    } else {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      localStorage.setItem(HEARTBEAT_KEY, today);
      console.log('[Heartbeat] Ping sent successfully.');
    }
  } catch (e) {
    console.warn('[Heartbeat] Unexpected error:', e);
  }
}

function shouldSendToday() {
  const last = localStorage.getItem(HEARTBEAT_KEY);
  if (!last) return true;
  const today = new Date().toISOString().slice(0, 10);
  return last !== today;
}

/**
 * Call once at app startup from main.jsx.
 * Sends an immediate ping if not already sent today,
 * then sets up a recurring 12-hour interval.
 */
export function registerHeartbeat() {
  // Fire immediately if not pinged today
  if (shouldSendToday()) {
    sendHeartbeat();
  }

  // Then ping every 12 hours
  setInterval(() => {
    sendHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
}
