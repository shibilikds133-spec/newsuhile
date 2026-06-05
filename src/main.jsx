import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './print.css'
import { registerHeartbeat } from './sync/heartbeat'

// Unregister active service workers during development to avoid HMR caching issues
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('[Dev SW] Unregistered service worker to bypass cache');
        }
      });
    }
  });
}

// Register background services
registerHeartbeat(); // Keeps Supabase free-tier project alive (daily ping)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
