import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register the service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Automatically apply update without asking
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] App ready for offline use');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
