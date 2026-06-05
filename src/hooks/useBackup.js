import { useEffect } from 'react';
import { exportDB } from 'dexie-export-import';
import db from '../utils/db';

export function useBackup() {
  const performBackup = async () => {
    // Only run if in Electron environment
    if (!window.electronAPI) return;

    try {
      console.log('Initiating database backup...');
      const blob = await exportDB(db);
      
      // Convert blob to string/arraying for IPC transfer (Electron prefers this for fs.writeFile)
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result;
        const response = await window.electronAPI.saveBackup(result);
        if (response.success) {
          console.log('Backup successful:', response.path);
        } else {
          console.error('Backup failed:', response.error);
        }
      };
      reader.readAsArrayBuffer(blob);
    } catch (error) {
      console.error('Failed to export database:', error);
    }
  };

  useEffect(() => {
    // 1. Initial backup after 30 seconds
    const initialTimer = setTimeout(performBackup, 30000);

    // 2. Interval backup every 12 hours
    const interval = setInterval(performBackup, 12 * 60 * 60 * 1000);

    // 3. Backup on close (beforeunload)
    const handleClose = () => {
      performBackup();
    };
    window.addEventListener('beforeunload', handleClose);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleClose);
    };
  }, []);

  return { performBackup };
}
