import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Auto-reload on Vite chunk fetch failures (e.g. when a new version deploys while client is cached)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected, reloading page...', event);
  window.location.reload();
});

// Register custom Web Push Service Worker if supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('Error mounting React app:', err);
  }
}

// Ensure splash screen is hidden
if (typeof (window as any).__hideSplash === 'function') {
  (window as any).__hideSplash();
} else {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => splash.remove(), 400);
  }
}

