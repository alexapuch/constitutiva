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

// Background preloader for OSRS Timers assets and code
function OSRSAssetPreloader() {
  useEffect(() => {
    const osrsImages = [
      '/osrs-bg.png',
      '/card-bg.png',
      '/birdhouse-logo.png',
      '/herb-logo.png',
      '/osrs-logo.png'
    ];

    const preload = () => {
      // 1. Preload image assets into browser cache
      osrsImages.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload);
    } else {
      setTimeout(preload, 100);
    }
  }, []);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <OfflineBanner />
        <ScrollToTop />
        <OSRSAssetPreloader />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0B152A]"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
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
