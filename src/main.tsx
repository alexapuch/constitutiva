import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Force clear old service workers once per app version
const SW_VERSION = '4';
if ('serviceWorker' in navigator && localStorage.getItem('sw_version') !== SW_VERSION) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    Promise.all(regs.map(reg => reg.unregister())).then(() => {
      localStorage.setItem('sw_version', SW_VERSION);
      window.location.reload();
    });
  });
}

// Register the service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {},
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
