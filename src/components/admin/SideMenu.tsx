import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, BarChart3, ClipboardList, Calculator, FileSignature, ShieldCheck, Sun, Moon, LogOut, GitBranch, BookOpen, FilePen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'documents' | 'dashboard';
  setActiveTab: (tab: 'documents' | 'dashboard') => void;
  quotesCount: number;
  onOpenQuoteHistory: () => void;
  onOpenNewQuote: () => void;
  onOpenManualConstancia: () => void;
  onOpenOrganigrama: () => void;
  onOpenCaratulas: () => void;
  onOpenCartaResponsiva: () => void;
  onOpenConstanciasHistory: () => void;
  onOpenActaBlank: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export default function SideMenu({
  isOpen, onClose, activeTab, setActiveTab, quotesCount,
  onOpenQuoteHistory, onOpenNewQuote, onOpenManualConstancia, onOpenOrganigrama,
  onOpenCaratulas, onOpenCartaResponsiva, onOpenConstanciasHistory, onOpenActaBlank, onLogout, onNavigateHome
}: SideMenuProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
            className="bg-black"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '18rem', zIndex: 9999 }}
            className="bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-5 border-b border-gray-200 bg-blue-900" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
              <span className="text-lg font-bold text-white">Panel Admin</span>
              <button onClick={onClose} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 py-4 overflow-y-auto">
              <p className="px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Navegación</p>
              <button
                onClick={() => { onClose(); onNavigateHome(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
              >
                <Home className="w-5 h-5" />
                Inicio
              </button>

              <button
                onClick={() => { onClose(); setActiveTab(activeTab === 'dashboard' ? 'documents' : 'dashboard'); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                <BarChart3 className="w-5 h-5" />
                {activeTab === 'dashboard' ? 'Ver Documentos' : 'Dashboard'}
              </button>

              <div className="my-3 border-t border-gray-100 dark:border-gray-700" />
              <p className="px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</p>

              <button
                onClick={() => { onClose(); onOpenQuoteHistory(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
              >
                <ClipboardList className="w-5 h-5" />
                Historial de Cotizaciones
                {quotesCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{quotesCount}</span>
                )}
              </button>

              <button
                onClick={() => { onClose(); onOpenNewQuote(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
              >
                <Calculator className="w-5 h-5" />
                Nueva Cotización
              </button>

              <button
                onClick={() => { onClose(); onOpenManualConstancia(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
              >
                <FileSignature className="w-5 h-5" />
                Generar Constancia
              </button>

              <button
                onClick={() => { onClose(); onOpenOrganigrama(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors font-medium"
              >
                <GitBranch className="w-5 h-5" />
                Generar Organigrama
              </button>

              <button
                onClick={() => { onClose(); onOpenCaratulas(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors font-medium"
              >
                <BookOpen className="w-5 h-5" />
                Generar Carátulas
              </button>

              <button
                onClick={() => { onClose(); onOpenCartaResponsiva(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
              >
                <ShieldCheck className="w-5 h-5" />
                Carta Responsiva
              </button>

              <button
                onClick={() => { onClose(); onOpenActaBlank(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors font-medium"
              >
                <FilePen className="w-5 h-5" />
                Acta para Firmar
              </button>

              <button
                onClick={() => { onClose(); onOpenConstanciasHistory(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                <ClipboardList className="w-5 h-5" />
                Registro de Constancias
              </button>
            </nav>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 py-2.5 rounded-lg font-medium transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              </button>
              <button
                onClick={() => { onClose(); onLogout(); }}
                className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg font-medium transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
