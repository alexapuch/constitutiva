/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import OfflineBanner from './components/OfflineBanner';
import { ThemeProvider } from './context/ThemeContext';

const Home = lazy(() => import('./pages/Home'));
const PublicView = lazy(() => import('./pages/PublicView'));
const AdminView = lazy(() => import('./pages/AdminView'));

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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <OfflineBanner />
        <ScrollToTop />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/acta" element={<PublicView />} />
            <Route path="/admin" element={<AdminView />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
