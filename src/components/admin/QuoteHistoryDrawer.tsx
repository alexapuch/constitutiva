import React from 'react';
import { Calculator, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuoteHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: any[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEditQuote: (quote: any) => void;
  onDeleteQuote: (id: string) => void;
  onNewQuote: () => void;
}

export default function QuoteHistoryDrawer({
  isOpen, onClose, quotes, searchTerm, onSearchChange, onEditQuote, onDeleteQuote, onNewQuote
}: QuoteHistoryDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8 md:inset-12 lg:inset-y-12 lg:inset-x-[15%] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <div className="px-5 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <Calculator className="w-5 h-5 text-blue-600" />
                Historial de Cotizaciones
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 shrink-0">
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {quotes
                .filter(q => q.client_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((quote) => (
                  <div key={quote.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{quote.client_name}</span>
                      <span className="text-lg font-bold text-gray-700">
                        ${Number(quote.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{quote.date}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditQuote(quote)}
                          className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors font-medium text-xs"
                        >
                          Editar / Imprimir
                        </button>
                        <button
                          onClick={() => onDeleteQuote(quote.id)}
                          className="bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 transition-colors font-medium text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {quotes.length === 0 && (
                <div className="p-8 text-center text-gray-500 italic">
                  No hay cotizaciones registradas en el historial.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                onClick={onNewQuote}
                className="w-full flex items-center justify-center gap-2 bg-red-900 text-white px-4 py-2.5 rounded-md hover:bg-red-950 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Nueva Cotización
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
