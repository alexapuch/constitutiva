import React, { useEffect, useState } from 'react';
import { FileSignature, X, Search, RefreshCw, Download, Building2, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentInfo } from '../../types';
import { generateConstanciaPDF, generateConstanciasBatchFromRegistry } from '../../utils/generateConstanciaPDF';

interface ConstanciaEntry {
  folio: string;
  employee_name: string;
  commercial_name: string;
  address?: string | null;
  date?: string | null;
  created_at: string;
  document_id: number | null;
}

interface ConstanciasHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
}

export default function ConstanciasHistoryDrawer({ isOpen, onClose, documents }: ConstanciasHistoryDrawerProps) {
  const [constancias, setConstancias] = useState<ConstanciaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingFolios, setDownloadingFolios] = useState<Set<string>>(new Set());
  const [downloadingBatch, setDownloadingBatch] = useState<Set<string>>(new Set());

  const fetchConstancias = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/constancias', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConstancias(data);
      } else {
        console.error('Error fetching constancias');
      }
    } catch (err) {
      console.error('Network error fetching constancias', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConstancias();
    }
  }, [isOpen]);

  const filteredConstancias = constancias
    .filter(c => {
      const term = searchTerm.toLowerCase();
      return (
        c.folio.toLowerCase().includes(term) ||
        (c.employee_name && c.employee_name.toLowerCase().includes(term)) ||
        (c.commercial_name && c.commercial_name.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      const numA = parseInt(a.folio.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.folio.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });

  // Group by company
  const companyGroups = Object.entries(
    filteredConstancias.reduce((acc, c) => {
      const key = c.commercial_name || '—';
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {} as Record<string, ConstanciaEntry[]>)
  );

  const buildDocInfoAndEmp = (c: ConstanciaEntry) => {
    let date = c.date || new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    let address = c.address || '';
    // Fallback: look up linked document if fields weren't saved at generation time
    if ((!date || !address) && c.document_id) {
      const linked = documents.find(d => d.id === c.document_id);
      if (linked) {
        if (!date) date = linked.date || date;
        if (!address) address = linked.address || '';
      }
    }
    const docInfo = {
      id: c.document_id ?? 0,
      commercial_name: c.commercial_name || '',
      company_name: '',
      date,
      address,
      time_start: '',
      time_end: '',
      is_active: 1,
    } as DocumentInfo;
    const emp = { id: 0, document_id: c.document_id ?? 0, name: c.employee_name || '', role: '', brigade: '', signature: '' };
    return { docInfo, emp };
  };

  const handleRegenerate = async (c: ConstanciaEntry) => {
    setDownloadingFolios(prev => new Set(prev).add(c.folio));
    try {
      const { docInfo, emp } = buildDocInfoAndEmp(c);
      await generateConstanciaPDF(docInfo, emp, '/constancia_vacia.png', false, 'CONSTANCIA', undefined, c.folio);
    } finally {
      setDownloadingFolios(prev => { const s = new Set(prev); s.delete(c.folio); return s; });
    }
  };

  const handleBatchDownload = async (companyName: string, entries: ConstanciaEntry[]) => {
    setDownloadingBatch(prev => new Set(prev).add(companyName));
    try {
      const batchEntries = entries.map(c => {
        let date = new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        let address = '';
        if (c.document_id) {
          const linked = documents.find(d => d.id === c.document_id);
          if (linked) { date = linked.date || date; address = linked.address || ''; }
        }
        return { folio: c.folio, employee_name: c.employee_name || '', commercial_name: c.commercial_name || '', date, address };
      });
      await generateConstanciasBatchFromRegistry(batchEntries, companyName);
    } finally {
      setDownloadingBatch(prev => { const s = new Set(prev); s.delete(companyName); return s; });
    }
  };

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
            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
              <div className="flex items-center gap-3">
                <FileSignature className="w-6 h-6" />
                <h3 className="text-lg font-bold">Registro de Constancias</h3>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por folio, nombre o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={fetchConstancias}
                disabled={isLoading}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50 flex items-center justify-center"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
              {isLoading && constancias.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredConstancias.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                  <FileSignature className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">{searchTerm ? 'Sin resultados' : 'Sin constancias'}</p>
                  <p className="text-sm text-center mt-1">
                    {searchTerm ? 'No se encontraron constancias que coincidan con la búsqueda.' : 'Las constancias generadas aparecerán aquí.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {companyGroups.map(([companyName, entries]) => {
                    const isBatchLoading = downloadingBatch.has(companyName);
                    return (
                      <div key={companyName}>
                        {/* Company header */}
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="text-sm font-bold text-blue-900 dark:text-blue-300 truncate">{companyName}</span>
                            <span className="text-xs text-gray-400 font-medium shrink-0">({entries.length})</span>
                          </div>
                          {entries.length > 1 && (
                            <button
                              onClick={() => handleBatchDownload(companyName, entries)}
                              disabled={isBatchLoading}
                              className="shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors touch-manipulation ml-2"
                              title="Descargar todas las constancias de esta empresa"
                            >
                              {isBatchLoading
                                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
                                : <><PackageOpen className="w-3.5 h-3.5" /> Descargar todas</>
                              }
                            </button>
                          )}
                        </div>

                        {/* Individual cards */}
                        <div className="flex flex-col gap-2">
                          {entries.map((c, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2.5 py-1 rounded-md">
                                  Folio: {c.folio}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                  {new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>

                              <div className="mt-3 flex items-end justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-0.5">Acredita a</p>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.employee_name || 'N/A'}</p>
                                </div>
                                <button
                                  onClick={() => handleRegenerate(c)}
                                  disabled={downloadingFolios.has(c.folio) || isBatchLoading}
                                  className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors touch-manipulation"
                                  title="Volver a descargar constancia"
                                >
                                  {downloadingFolios.has(c.folio)
                                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
                                    : <><Download className="w-3.5 h-3.5" /> Descargar</>
                                  }
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
