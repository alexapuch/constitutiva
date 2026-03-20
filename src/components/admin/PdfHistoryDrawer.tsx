import React from 'react';
import { History, X, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';

interface PdfHistoryEntry {
  type: string;
  name: string;
  date: string;
  publicUrl?: string;
}

interface PdfHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfHistory: PdfHistoryEntry[];
  onClearHistory: () => void;
}

export default function PdfHistoryDrawer({
  isOpen, onClose, pdfHistory, onClearHistory
}: PdfHistoryDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
              <h3 className="text-lg font-bold">Historial de PDFs Generados</h3>
              <button
                onClick={onClose}
                className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {pdfHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                  <History className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Sin historial</p>
                  <p className="text-sm text-center mt-1">Los PDFs que generes apareceran aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pdfHistory.filter(entry => entry.type.includes('Constancia')).map((entry, i) => (
                    <div key={i} className="px-5 py-3.5 hover:bg-gray-50 transition-colors flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                          entry.type === 'Acta Constitutiva' ? 'bg-red-100 text-red-700' :
                          entry.type === 'Carta Responsiva' ? 'bg-purple-100 text-purple-700' :
                          entry.type.includes('Constancia') ? 'bg-blue-100 text-blue-700' :
                          entry.type.includes('Simulacro') ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {entry.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{entry.name}</p>
                          <p className="text-xs text-gray-400">{entry.date}</p>
                        </div>
                      </div>
                      
                      {entry.publicUrl && (
                        <div className="flex justify-end mt-1">
                          <a 
                            href={entry.publicUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-bold rounded-md transition-colors border border-blue-200"
                            title="Descargar desde la nube"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                            Descargar (Nube)
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pdfHistory.length > 0 && (
              <div className="p-4 border-t border-gray-200 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => {
                    Swal.fire({
                      title: '¿Limpiar historial?',
                      text: 'Se eliminara todo el historial de PDFs generados.',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Sí, limpiar',
                      cancelButtonText: 'Cancelar'
                    }).then(result => {
                      if (result.isConfirmed) {
                        onClearHistory();
                      }
                    });
                  }}
                  className="w-full py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
                >
                  Limpiar Historial
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
