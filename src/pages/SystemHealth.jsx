import React, { useState, useEffect, useCallback } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useSync } from '../hooks/useSync';
import { supabase } from '../utils/supabase';
import db from '../utils/db';
import { getSyncCounts } from '../sync/engine';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  Activity, Database, AlertCircle, RefreshCw, Trash2,
  HardDrive, Wifi, WifiOff, CheckCircle, Clock, XCircle, Heart, List,
  Download, Upload, ShieldCheck, Lock
} from 'lucide-react';
import { hashPassword } from '../utils/crypto';
import Modal from '../components/ui/Modal';
import { exportDB, importDB } from 'dexie-export-import';
import { saveAs } from 'file-saver';

export default function SystemHealth() {
  const { allTransactions, syncStatus } = useTransactions();
  const { syncNow, pullFromCloud, retryFailed } = useSync();

  const [latency, setLatency] = useState(null);
  const [dbStats, setDbStats] = useState({ income: 0, expenses: 0, refreshments: 0 });
  const [syncCounts, setSyncCounts] = useState({ pending: 0, synced: 0, failed: 0 });
  const [storageUsage, setStorageUsage] = useState({ usage: 0, quota: 0, percentage: 0 });
  const [syncLog, setSyncLog] = useState([]);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // ── Fetch all stats ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    // DB record counts
    const [incCount, expCount, refCount, passConfig] = await Promise.all([
      db.income.count(),
      db.expenses.count(),
      db.refreshments.count(),
      db.app_config.get('password_hash'),
    ]);
    setDbStats({ income: incCount, expenses: expCount, refreshments: refCount });
    setHasPassword(!!passConfig);

    // Sync status counts (pending / synced / failed)
    const counts = await getSyncCounts();
    setSyncCounts(counts);

    // Recent sync log (latest 10)
    const log = await db.sync_log
      .orderBy('attempted_at')
      .reverse()
      .limit(10)
      .toArray()
      .catch(() => []); // table may not exist yet on very first run
    setSyncLog(log);

    // Heartbeat
    setLastHeartbeat(localStorage.getItem('last_heartbeat_date') || 'Never');

    // Storage
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      setStorageUsage({
        usage: (estimate.usage / (1024 * 1024)).toFixed(2),
        quota: (estimate.quota / (1024 * 1024)).toFixed(0),
        percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2),
      });
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats, allTransactions, syncStatus]);

  // ── Supabase ping ────────────────────────────────────────────────────────
  const pingSupabase = async () => {
    setLatency('Pinging…');
    const start = Date.now();
    try {
      if (!navigator.onLine) throw new Error('Offline');
      await supabase.from('income').select('id').limit(1);
      setLatency(`${Date.now() - start} ms`);
    } catch {
      setLatency('Error');
    }
  };

  useEffect(() => { pingSupabase(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleForceSync = async () => {
    if (!navigator.onLine) { toast.error('Cannot sync while offline'); return; }
    toast.loading('Forcing Sync…', { id: 'forcesync' });
    try {
      await syncNow();
      await fetchStats();
      toast.success('Sync complete', { id: 'forcesync' });
    } catch {
      toast.error('Sync failed', { id: 'forcesync' });
    }
  };

  const handleRetryFailed = async () => {
    if (!navigator.onLine) { toast.error('Cannot retry while offline'); return; }
    setIsRetrying(true);
    try {
      await retryFailed();
      await fetchStats();
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!navigator.onLine) { toast.error('Cannot pull while offline'); return; }
    toast.loading('Pulling from cloud…', { id: 'pull' });
    try {
      await pullFromCloud();
      await fetchStats();
      toast.success('Cloud data pulled successfully', { id: 'pull' });
    } catch {
      toast.error('Pull failed', { id: 'pull' });
    }
  };

  const handleFactoryReset = async () => {
    try {
      await db.delete();
      localStorage.clear();
      toast.success('Local cache cleared. Reloading…');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading('Generating local backup...');
    try {
      const blob = await exportDB(db);
      
      // If in Electron, also save to the Documents folder automatically
      if (window.electronAPI) {
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result;
          await window.electronAPI.saveBackup(result);
        };
        reader.readAsArrayBuffer(blob);
      }

      // Always trigger a browser download for the user to keep manually
      if (window.electronAPI && window.electronAPI.downloadFile) {
        const arrayBuffer = await blob.arrayBuffer();
        await window.electronAPI.downloadFile(arrayBuffer, `DawaTrust_Manual_Backup_${new Date().toISOString().split('T')[0]}.json`);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = dataUrl;
          a.download = `DawaTrust_Manual_Backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
          }, 1500);
        };
        reader.readAsDataURL(blob);
      }
      
      toast.success('Backup generated and saved!', { id: toastId });
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed to generate', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setIsRestoreModalOpen(true);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const performRestore = async () => {
    if (!selectedFile) return;
    setIsRestoring(true);
    const toastId = toast.loading('Restoring database... Please do not close the app.');
    
    try {
      // 1. Delete existing DB
      await db.delete();
      
      // 2. Import from file
      await importDB(selectedFile);
      
      toast.success('Restore successful! Reloading...', { id: toastId });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Restore failed. The file might be corrupted.', { id: toastId });
      setIsRestoring(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword) return;
    
    if (hasPassword) {
      if (!currentPassword) {
        toast.error('Please enter your current password first');
        return;
      }
      const currentHash = await hashPassword(currentPassword);
      const storedConfig = await db.app_config.get('password_hash');
      if (currentHash !== storedConfig.value) {
        toast.error('Current password is incorrect');
        return;
      }
    }

    const hash = await hashPassword(newPassword);
    await db.app_config.put({
      id: 'password_hash',
      value: hash,
      sync_status: 'pending',
      updated_at: new Date().toISOString()
    });
    setHasPassword(true);
    setNewPassword('');
    setCurrentPassword('');
    setIsSettingPassword(false);
    toast.success('App password set successfully');
    
    // Trigger sync to cloud
    if (navigator.onLine) {
      syncNow().catch(() => {});
    }
  };

  const handleRemovePassword = async () => {
    const pwd = window.prompt('Enter current password to remove lock:');
    if (!pwd) return;
    
    const currentHash = await hashPassword(pwd);
    const storedConfig = await db.app_config.get('password_hash');
    
    if (currentHash !== storedConfig?.value) {
      toast.error('Incorrect password');
      return;
    }
    
    await db.app_config.put({
      id: 'password_hash',
      value: '', // clear password hash
      is_deleted: true, // soft delete for sync
      sync_status: 'pending',
      updated_at: new Date().toISOString()
    });
    setHasPassword(false);
    toast.success('App password removed');
    
    // Trigger sync to cloud
    if (navigator.onLine) {
      syncNow().catch(() => {});
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      synced:  'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed:  'bg-red-100 text-red-800',
      deleted: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Activity className="text-primary" /> Technical &amp; System Health
        </h1>
        <p className="text-muted text-sm mt-1">Advanced monitoring and developer tools</p>
      </div>

      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          label="Network Status"
          value={navigator.onLine ? 'Online' : 'Offline'}
          accent={navigator.onLine ? 'green' : 'red'}
          icon={navigator.onLine ? Wifi : WifiOff}
        />
        <Card
          label="Supabase Latency"
          value={latency || 'Pinging…'}
          accent={latency === 'Error' ? 'red' : 'blue'}
          icon={Activity}
        />
        <Card
          label="Pending Syncs"
          value={syncCounts.pending.toString()}
          accent={syncCounts.pending > 0 ? 'red' : 'green'}
          icon={RefreshCw}
        />
        <Card
          label="Storage Usage"
          value={`${storageUsage.usage} MB`}
          accent="blue"
          icon={HardDrive}
        />
      </div>

      {/* ── Security / App Lock ── */}
      <div className="bg-white rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
          <Lock size={20} className="text-primary" /> App Security
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-text">App Lock Password</p>
            <p className="text-sm text-muted">
              {hasPassword 
                ? 'Your app is currently protected by a password. It will be required on launch.' 
                : 'Set a password to lock the app. Anyone opening the app will need it.'}
            </p>
          </div>
          <div>
            {isSettingPassword ? (
              <div className="flex flex-col gap-2">
                {hasPassword && (
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    autoFocus
                  />
                )}
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  autoFocus={!hasPassword}
                />
                <div className="flex items-center gap-2 mt-1">
                  <Button onClick={handleSetPassword} disabled={!newPassword || (hasPassword && !currentPassword)}>Save</Button>
                  <Button variant="ghost" onClick={() => { setIsSettingPassword(false); setNewPassword(''); setCurrentPassword(''); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {hasPassword ? (
                  <>
                    <Button onClick={() => setIsSettingPassword(true)}>Change Password</Button>
                    <Button variant="danger" onClick={handleRemovePassword}>Remove</Button>
                  </>
                ) : (
                  <Button onClick={() => setIsSettingPassword(true)}>Set Password</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sync Status Breakdown ── */}
      <div className="bg-white rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
          <RefreshCw size={20} className="text-primary" /> Sync Status Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Synced */}
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle size={28} className="text-green-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-800">{syncCounts.synced}</p>
              <p className="text-sm text-green-700">Synced to cloud</p>
            </div>
          </div>
          {/* Pending */}
          <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <Clock size={28} className="text-yellow-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-yellow-800">{syncCounts.pending}</p>
              <p className="text-sm text-yellow-700">Pending sync</p>
            </div>
          </div>
          {/* Failed */}
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <XCircle size={28} className="text-red-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-800">{syncCounts.failed}</p>
              <p className="text-sm text-red-700">Failed — retry needed</p>
            </div>
          </div>
        </div>

        {/* Retry Failed button — only shown when there are failures */}
        {syncCounts.failed > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="font-medium text-red-800">
                {syncCounts.failed} record{syncCounts.failed > 1 ? 's' : ''} failed to sync
              </p>
              <p className="text-xs text-red-600">Click Retry to reset them to pending and re-attempt.</p>
            </div>
            <Button
              variant="danger"
              onClick={handleRetryFailed}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw size={15} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Retrying…' : 'Retry Failed'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Details Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Local DB Stats */}
        <div className="bg-white rounded-lg border border-border shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
              <Database size={20} className="text-blue-500" /> Local Database (IndexedDB)
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted">Income Records</span>
                <span className="font-semibold text-text">{dbStats.income}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted">Expense Records</span>
                <span className="font-semibold text-text">{dbStats.expenses}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted">Refreshment Records</span>
                <span className="font-semibold text-text">{dbStats.refreshments}</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">Browser Storage Usage</span>
                  <span className="text-muted">{storageUsage.percentage}% of {storageUsage.quota} MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Heartbeat */}
          <div className="pt-2 border-t border-border">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-3">
              <Heart size={20} className="text-pink-500" /> Supabase Keep-Alive
            </h2>
            <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg border border-pink-200">
              <div>
                <p className="text-sm font-medium text-pink-900">Last Heartbeat Ping</p>
                <p className="text-xs text-pink-700 mt-0.5">Prevents free-tier project from pausing</p>
              </div>
              <span className="text-sm font-semibold text-pink-800">
                {lastHeartbeat === 'Never' ? '—' : lastHeartbeat}
              </span>
            </div>
          </div>

          {/* Cloud storage note */}
          <div className="pt-2 border-t border-border">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-3">
              <Database size={20} className="text-green-500" /> Supabase Cloud Storage
            </h2>
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <p className="text-sm font-semibold text-green-900">Limit: 500 MB (Free Tier)</p>
              <p className="text-sm text-green-800 mt-1">
                Text-only transaction data is extremely lightweight — 500 MB comfortably holds millions of records.
              </p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Database Backup & Restore */}
          <div className="bg-white rounded-lg border border-primary/20 shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <ShieldCheck size={80} className="text-primary" />
            </div>
            
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
              <ShieldCheck size={20} className="text-primary" /> Data Security & Backups
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h3 className="font-medium text-text text-sm">Manual Local Backup</h3>
                <p className="text-xs text-muted mt-1 mb-3">
                  Download a complete copy of your local database. Recommended before major updates or clear-outs.
                </p>
                <Button 
                  onClick={handleManualBackup}
                  disabled={isBackingUp}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  {isBackingUp ? 'Generating...' : 'Download Backup Now'}
                </Button>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <h3 className="font-medium text-orange-900 text-sm">Restore from Backup</h3>
                <p className="text-xs text-orange-800 mt-1 mb-3">
                  Restore data from a previously saved JSON backup file. <span className="font-bold underline">This will overwrite your current local data.</span>
                </p>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isRestoring}
                  />
                  <Button 
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 border-orange-200 text-orange-800 hover:bg-orange-100"
                    disabled={isRestoring}
                  >
                    <Upload size={16} />
                    {isRestoring ? 'Restoring...' : 'Upload & Restore File'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Log */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-6 flex-1">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
              <List size={20} className="text-indigo-500" /> Recent Sync Log
            </h2>
            {syncLog.length === 0 ? (
              <p className="text-sm text-muted italic">No sync activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {syncLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {statusBadge(entry.status)}
                      <span className="text-muted truncate">{entry.table_name}</span>
                    </div>
                    <span className="text-xs text-muted shrink-0 ml-2">
                      {new Date(entry.attempted_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Developer Actions */}
          <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-1">
              <AlertCircle size={20} className="text-red-500" /> Developer Actions
            </h2>
            <p className="text-sm text-muted mb-4">Use with caution — some actions are irreversible.</p>

            <div className="space-y-3">
              {/* Force Sync */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-md border border-border gap-3">
                <div>
                  <h3 className="font-medium text-text">Force Cloud Sync</h3>
                  <p className="text-xs text-muted">Push all pending records to Supabase immediately.</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleForceSync}
                  className="whitespace-nowrap flex items-center gap-2"
                >
                  <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                  Force Sync
                </Button>
              </div>

              {/* Pull from Cloud */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-blue-50 rounded-md border border-blue-100 gap-3">
                <div>
                  <h3 className="font-medium text-text">Pull from Cloud</h3>
                  <p className="text-xs text-muted">Re-download all data from Supabase to local DB.</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handlePullFromCloud}
                  className="whitespace-nowrap flex items-center gap-2"
                >
                  <Database size={16} /> Pull Cloud Data
                </Button>
              </div>

              {/* Factory Reset */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-red-50 rounded-md border border-red-100 gap-3">
                <div>
                  <h3 className="font-medium text-danger">Factory Reset (Clear Cache)</h3>
                  <p className="text-xs text-red-600">Deletes ALL local IndexedDB data. Unsynced data will be lost!</p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => setIsResetModalOpen(true)}
                  className="whitespace-nowrap flex items-center gap-2"
                >
                  <Trash2 size={16} /> Hard Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isResetModalOpen}
        title="DANGER: Factory Reset?"
        message={`Are you absolutely sure you want to delete all local data? ${
          syncCounts.pending > 0
            ? `WARNING: You have ${syncCounts.pending} unsynced records that WILL BE LOST FOREVER.`
            : 'Data stored on the cloud will remain safe, but local offline data will be wiped.'
        }`}
        confirmVariant="danger"
        confirmLabel="Yes, Erase Everything"
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={() => { setIsResetModalOpen(false); handleFactoryReset(); }}
      />

      <Modal
        isOpen={isRestoreModalOpen}
        title="Confirm Database Restore?"
        message={`WARNING: Restoring from "${selectedFile?.name}" will delete all your current local data and replace it with the data from the backup file. This action cannot be undone.`}
        confirmVariant="danger"
        confirmLabel="Yes, Overwrite & Restore"
        onCancel={() => { setIsRestoreModalOpen(false); setSelectedFile(null); }}
        onConfirm={() => { setIsRestoreModalOpen(false); performRestore(); }}
      />
    </div>
  );
}
