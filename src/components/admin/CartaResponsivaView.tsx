import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Download, Eye } from 'lucide-react';
import { DocumentInfo } from '../../types';
import { generateCartaResponsivaPDF } from '../../utils/generateCartaResponsivaPDF';

interface CartaResponsivaViewProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onGeneratePDF: (docId: number, fecha: string, fvu: string, dictamenGas: boolean) => Promise<void>;
  onPreviewPDF: (docId: number, fecha: string, fvu: string, dictamenGas: boolean) => Promise<void>;
  onPreviewManualPDF: (url: string, name: string) => void;
}

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function formatFecha(iso: string) {
  if (!iso) return '';
  const [yr, mo, dy] = iso.split('-').map(Number);
  return `${dy} DE ${MESES[mo - 1]} DE ${yr}`;
}

export default function CartaResponsivaView({
  isOpen, onClose, documents, onGeneratePDF, onPreviewPDF, onPreviewManualPDF
}: CartaResponsivaViewProps) {
  const [mode, setMode] = useState<'acta' | 'manual'>('acta');

  // ── Modo Acta ────────────────────────────────────────────────────────────
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

  // ── Modo Manual ───────────────────────────────────────────────────────────
  const [mNombreComercial, setMNombreComercial] = useState('');
  const [mRazonSocial, setMRazonSocial] = useState('');
  const [mDireccion, setMDireccion] = useState('');
  const [mGiro, setMGiro] = useState('');
  const [mFecha, setMFecha] = useState('');
  const [mFvu, setMFvu] = useState('');
  const [mDictamenGas, setMDictamenGas] = useState(true);

  const handleClose = () => {
    setCartaDocId(null); setCartaFvu(''); setCartaDictamenGas(true); setCartaFecha('');
    localStorage.removeItem('autosave_carta');
    onClose();
  };

  const handleManualGenerate = async () => {
    await generateCartaResponsivaPDF({
      nombreComercial: mNombreComercial.trim().toUpperCase(),
      razonSocial: mRazonSocial.trim().toUpperCase(),
      direccion: mDireccion.trim().toUpperCase(),
      giroComercial: mGiro.trim().toUpperCase(),
      fecha: formatFecha(mFecha),
      fvu: mFvu,
      dictamenGas: mDictamenGas,
    }, false);
  };

  const handleManualPreview = async () => {
    const url = await generateCartaResponsivaPDF({
      nombreComercial: mNombreComercial.trim().toUpperCase(),
      razonSocial: mRazonSocial.trim().toUpperCase(),
      direccion: mDireccion.trim().toUpperCase(),
      giroComercial: mGiro.trim().toUpperCase(),
      fecha: formatFecha(mFecha),
      fvu: mFvu,
      dictamenGas: mDictamenGas,
    }, true);
    if (url) onPreviewManualPDF(url as string, `CARTA RESPONSIVA - ${mNombreComercial.trim().toUpperCase()}`);
  };

  const manualReady = mNombreComercial.trim() !== '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white" style={{ height: '100dvh' }}>
      <div className="w-full h-full overflow-hidden flex flex-col" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>

        {/* Header */}
        <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <h3 className="font-extrabold flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5" />
            Carta Responsiva
          </h3>
          <button type="button" onClick={handleClose}
            className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-gray-200 bg-white">
          <button
            onClick={() => setMode('acta')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'acta' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Desde Acta
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'manual' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Manual
          </button>
        </div>

        {/* ── MODO ACTA ── */}
        {mode === 'acta' && (
          <>
            <div className="px-4 py-5 space-y-4 overflow-y-auto overflow-x-hidden flex-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              <p className="text-sm text-gray-600">Selecciona un acta constitutiva registrada para generar la carta responsiva con sus datos.</p>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Acta Constitutiva *</label>
                <select
                  value={cartaDocId ?? ''}
                  onChange={(e) => setCartaDocId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">— Seleccionar documento —</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.commercial_name} — {doc.company_name}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden">
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de la Carta *</label>
                <input type="date" value={cartaFecha} onChange={(e) => setCartaFecha(e.target.value)}
                  className="border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' }} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">FVU-2026-</label>
                <input type="text" value={cartaFvu} onChange={(e) => setCartaFvu(e.target.value)}
                  placeholder="Ej: 00123"
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600" />
              </div>

              <label className="flex items-center gap-3 text-base text-gray-700 cursor-pointer select-none py-1">
                <input type="checkbox" checked={cartaDictamenGas} onChange={(e) => setCartaDictamenGas(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="font-semibold">Incluir Dictamen de Gas</span>
              </label>

              {cartaDocId && (() => {
                const doc = documents.find(d => d.id === cartaDocId);
                if (!doc) return null;
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-bold text-blue-900">Datos que se usarán:</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-semibold text-gray-600">Nombre Comercial:</span><p className="text-gray-900">{doc.commercial_name || '—'}</p></div>
                      <div><span className="font-semibold text-gray-600">Razón Social:</span><p className="text-gray-900">{doc.company_name || '—'}</p></div>
                      <div><span className="font-semibold text-gray-600">Dirección:</span><p className="text-gray-900">{doc.address || '—'}</p></div>
                      <div><span className="font-semibold text-gray-600">Giro Comercial:</span><p className="text-gray-900">{doc.activity || '—'}</p></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 flex gap-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button disabled={!cartaDocId}
                onClick={() => { if (cartaDocId) onGeneratePDF(cartaDocId, cartaFecha, cartaFvu, cartaDictamenGas); }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-900 text-white px-4 py-3 rounded-l-md hover:bg-red-950 transition-colors font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed">
                <Download className="w-5 h-5" />
                Generar PDF
              </button>
              <button disabled={!cartaDocId}
                onClick={() => { if (cartaDocId) onPreviewPDF(cartaDocId, cartaFecha, cartaFvu, cartaDictamenGas); }}
                className="flex items-center justify-center bg-red-800 text-white px-3 py-3 rounded-r-md hover:bg-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                title="Vista Previa">
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* ── MODO MANUAL ── */}
        {mode === 'manual' && (
          <>
            <div className="px-4 py-5 space-y-4 overflow-y-auto overflow-x-hidden flex-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              <p className="text-sm text-gray-600">Ingresa los datos manualmente para generar la carta responsiva sin necesidad de un acta registrada.</p>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial *</label>
                <input type="text" value={mNombreComercial} onChange={e => setMNombreComercial(e.target.value)}
                  placeholder="Ej. HOTEL RIVIERA MAR"
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600 uppercase" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social</label>
                <input type="text" value={mRazonSocial} onChange={e => setMRazonSocial(e.target.value)}
                  placeholder="Ej. SERVICIOS HOTELEROS S.A. DE C.V."
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600 uppercase" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
                <textarea value={mDireccion} onChange={e => setMDireccion(e.target.value)}
                  placeholder="Ej. AV. CONSTITUYENTES 123, COL. CENTRO"
                  rows={2}
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600 resize-none uppercase" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Giro Comercial</label>
                <input type="text" value={mGiro} onChange={e => setMGiro(e.target.value)}
                  placeholder="Ej. HOSPEDAJE"
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600 uppercase" />
              </div>

              <div className="overflow-hidden">
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de la Carta</label>
                <input type="date" value={mFecha} onChange={e => setMFecha(e.target.value)}
                  className="border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' }} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">FVU-2026-</label>
                <input type="text" value={mFvu} onChange={e => setMFvu(e.target.value)}
                  placeholder="Ej: 00123"
                  className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600" />
              </div>

              <label className="flex items-center gap-3 text-base text-gray-700 cursor-pointer select-none py-1">
                <input type="checkbox" checked={mDictamenGas} onChange={e => setMDictamenGas(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="font-semibold">Incluir Dictamen de Gas</span>
              </label>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 flex gap-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button disabled={!manualReady} onClick={handleManualGenerate}
                className="flex-1 flex items-center justify-center gap-2 bg-red-900 text-white px-4 py-3 rounded-l-md hover:bg-red-950 transition-colors font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed">
                <Download className="w-5 h-5" />
                Generar PDF
              </button>
              <button disabled={!manualReady} onClick={handleManualPreview}
                className="flex items-center justify-center bg-red-800 text-white px-3 py-3 rounded-r-md hover:bg-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                title="Vista Previa">
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
