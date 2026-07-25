/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import OfflineBanner from './components/OfflineBanner';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import OSRS from './pages/OSRS';

const PublicView = lazy(() => import('./pages/PublicView'));
const AdminView = lazy(() => import('./pages/AdminView'));
const VerificarConstancia = lazy(() => import('./pages/VerificarConstancia'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Disable browser's automatic scroll restoration (iOS Safari issue)
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    // iOS Safari sometimes restores scroll AFTER the initial paint, so force it again
    const t1 = setTimeout(() => window.scrollTo(0, 0), 50);
    const t2 = setTimeout(() => window.scrollTo(0, 0), 150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pathname]);
  return null;
}

// Background preloader for OSRS Timers assets and code (forces GPU VRAM bitmap retention)
function OSRSAssetPreloader() {
  const { pathname } = useLocation();
  const isOsrs = pathname === '/osrs';

  useEffect(() => {
    (window as any).__OSRS_IMAGE_CACHE__ = (window as any).__OSRS_IMAGE_CACHE__ || [];
    const osrsImages = [
      '/osrs-bg.png',
      '/card-bg.png',
      '/birdhouse-logo.png',
      '/herb-logo.png',
      '/osrs-logo.png'
    ];

    const preload = () => {
      osrsImages.forEach(async (src) => {
        const img = new Image();
        img.src = src;
        if ('decode' in img) {
          try {
            await img.decode();
          } catch (e) {}
        }
        (window as any).__OSRS_IMAGE_CACHE__.push(img);
      });
    };

    preload();
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload);
    }
  }, []);

  return (
    <div
      id="osrs-bg-fixed"
      style={{
        opacity: isOsrs ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.15s ease-in-out'
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <OfflineBanner />
        <ScrollToTop />
        <OSRSAssetPreloader />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#120c06]"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/acta" element={<PublicView />} />
            <Route path="/admin" element={<AdminView />} />
            <Route path="/verificar/:id" element={<VerificarConstancia />} />
            <Route path="/osrs" element={<OSRS />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
