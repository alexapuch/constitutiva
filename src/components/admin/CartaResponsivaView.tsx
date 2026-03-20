import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Download, Eye } from 'lucide-react';
import { DocumentInfo } from '../../types';

interface CartaResponsivaViewProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onGeneratePDF: (docId: number, fecha: string, fvu: string, dictamenGas: boolean) => Promise<void>;
  onPreviewPDF: (docId: number, fecha: string, fvu: string, dictamenGas: boolean) => Promise<void>;
}

export default function CartaResponsivaView({
  isOpen, onClose, documents, onGeneratePDF, onPreviewPDF
}: CartaResponsivaViewProps) {
  const [cartaDocId, setCartaDocId] = useState<number | null>(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).docId ?? null; } catch {} return null;
  });
  const [cartaFvu, setCartaFvu] = useState(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).fvu ?? ''; } catch {} return '';
  });
  const [cartaDictamenGas, setCartaDictamenGas] = useState(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).dictamenGas ?? true; } catch {} return true;
  });
  const [cartaFecha, setCartaFecha] = useState(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).fecha ?? ''; } catch {} return '';
  });

  useEffect(() => {
    const hasData = cartaDocId || cartaFvu || cartaFecha;
    if (hasData) localStorage.setItem('autosave_carta', JSON.stringify({ docId: cartaDocId, fvu: cartaFvu, dictamenGas: cartaDictamenGas, fecha: cartaFecha }));
    else localStorage.removeItem('autosave_carta');
  }, [cartaDocId, cartaFvu, cartaDictamenGas, cartaFecha]);

  const handleClose = () => {
    setCartaDocId(null);
    setCartaFvu('');
    setCartaDictamenGas(true);
    setCartaFecha('');
    localStorage.removeItem('autosave_carta');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white" style={{ height: '100dvh' }}>
      <div className="w-full h-full overflow-hidden flex flex-col" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
        <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <h3 className="font-extrabold flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5" />
            Carta Responsiva
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 py-5 space-y-4 overflow-y-auto overflow-x-hidden flex-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
          <p className="text-sm text-gray-600">
            Selecciona un acta constitutiva registrada para generar la carta responsiva con sus datos.
          </p>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Acta Constitutiva *</label>
            <select
              value={cartaDocId ?? ''}
              onChange={(e) => setCartaDocId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="">— Seleccionar documento —</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.commercial_name} — {doc.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden">
            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de la Carta *</label>
            <input
              type="date"
              value={cartaFecha}
              onChange={(e) => setCartaFecha(e.target.value)}
              className="border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">FVU-2026-</label>
            <input
              type="text"
              value={cartaFvu}
              onChange={(e) => setCartaFvu(e.target.value)}
              placeholder="Ej: 00123"
              className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <label className="flex items-center gap-3 text-base text-gray-700 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={cartaDictamenGas}
              onChange={(e) => setCartaDictamenGas(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-semibold">Incluir Dictamen de Gas</span>
          </label>

          {cartaDocId && (() => {
            const doc = documents.find(d => d.id === cartaDocId);
            if (!doc) return null;
            return (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-bold text-blue-900">Datos que se usarán:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-600">Nombre Comercial:</span>
                    <p className="text-gray-900">{doc.commercial_name || '—'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Razón Social:</span>
                    <p className="text-gray-900">{doc.company_name || '—'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Dirección:</span>
                    <p className="text-gray-900">{doc.address || '—'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Giro Comercial:</span>
                    <p className="text-gray-900">{doc.activity || '—'}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 flex gap-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            disabled={!cartaDocId}
            onClick={() => {
              if (cartaDocId) onGeneratePDF(cartaDocId, cartaFecha, cartaFvu, cartaDictamenGas);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-red-900 text-white px-4 py-3 rounded-l-md hover:bg-red-950 transition-colors font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Generar PDF
          </button>
          <button
            disabled={!cartaDocId}
            onClick={() => {
              if (cartaDocId) onPreviewPDF(cartaDocId, cartaFecha, cartaFvu, cartaDictamenGas);
            }}
            className="flex items-center justify-center bg-red-800 text-white px-3 py-3 rounded-r-md hover:bg-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            title="Vista Previa"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
