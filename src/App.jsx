import { useEffect, useState } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import MobileWebLayout from './components/layout/MobileWebLayout';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expense from './pages/Expense';
import Refreshment from './pages/Refreshment';
import Reports from './pages/Reports';
import SystemHealth from './pages/SystemHealth';
import { migrateLocalStorageToDexie } from './utils/migrate';
import { useSync } from './hooks/useSync';
import { useBackup } from './hooks/useBackup';
import { isElectron, isMobile } from './utils/platform';

/**
 * Adaptive Layout component that switches between Desktop and Mobile views
 * based on platform and screen size.
 */
function AdaptiveLayout() {
  const [mobileMode, setMobileMode] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isMob = !isElectron() && window.innerWidth < 768;
      setMobileMode(isMob);
      setIsReady(true);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use a wrapper with same hook structure to avoid Error #310
  // and unique keys to force clean mount/unmount when switching
  return (
    <div className={!isReady ? "opacity-0" : "opacity-100"}>
      {mobileMode ? (
        <MobileWebLayout key="mobile-layout" />
      ) : (
        <Layout key="desktop-layout" />
      )}
    </div>
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <AdaptiveLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'income', element: <Income /> },
      { path: 'expense', element: <Expense /> },
      { path: 'refreshment', element: <Refreshment /> },
      { path: 'reports', element: <Reports /> },
      { path: 'system-admin', element: <SystemHealth /> },
      { path: 'health', element: <SystemHealth /> },
      { path: 'system-health', element: <SystemHealth /> },
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  }
});

function AppCore() {
  // Setup Background Sync
  useSync();
  
  // Setup Periodic Database Backups (Electron Only)
  useBackup();

  // Run Migration On First Load
  useEffect(() => {
    migrateLocalStorageToDexie();
  }, []);

  return <RouterProvider router={router} />;
}

import LockScreen from './components/auth/LockScreen';
import db from './utils/db';

function AuthWrapper({ children }) {
  const [isLocked, setIsLocked] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function checkLock() {
      try {
        const storedHash = await db.app_config.get('password_hash');
        if (!storedHash || !storedHash.value) {
          setIsLocked(false);
        }
      } catch (err) {
        console.error('Failed to read config', err);
        setIsLocked(false);
      } finally {
        setIsInitializing(false);
      }
    }
    checkLock();
  }, []);

  if (isInitializing) {
    return <div className="min-h-screen bg-bg flex items-center justify-center">Loading...</div>;
  }

  if (isLocked) {
    return (
      <>
        <LockScreen onUnlock={() => setIsLocked(false)} />
        <Toaster position="top-right" />
      </>
    );
  }

  return children;
}

export default function App() {
  return (
    <AuthWrapper>
      <AppCore />
      <Toaster position="top-right" />
    </AuthWrapper>
  );
}
