import React, { useState } from 'react';
import { X, Trash2, Eye, BookOpen, Download } from 'lucide-react';
import { generateCaratulasPDF } from '../../utils/generateCaratulasPDF';
import { DocumentInfo } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (url: string, name: string) => void;
  documents: DocumentInfo[];
}

export default function ManualCaratulasModal({ isOpen, onClose, onPreview, documents }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [frameColor, setFrameColor] = useState<string>('31,73,125');
  const [selectedDocId, setSelectedDocId] = useState('');

  const handleLimpiar = () => {
    setCompanyName('');
    setCommercialName('');
    setSelectedDocId('');
  };

  const handleClose = () => {
    handleLimpiar();
    onClose();
  };

  const handleDocChange = (docIdStr: string) => {
    setSelectedDocId(docIdStr);
    if (!docIdStr) {
      handleLimpiar();
      return;
    }
    const doc = documents.find(d => String(d.id) === docIdStr);
    if (doc) {
      setCompanyName(doc.company_name || '');
      setCommercialName(doc.commercial_name || '');
    }
  };

  const buildDocInfo = () => ({
    id: 0, commercial_name: commercialName.trim().toUpperCase(),
    company_name: companyName.trim().toUpperCase(),
    date: '', time_start: '', time_end: '', address: '', is_active: 1
  });

  const handlePreview = async () => {
    if (!commercialName.trim()) return;
    const [r, g, b] = frameColor.split(',').map(Number);
    const url = await generateCaratulasPDF(buildDocInfo() as any, true, [r, g, b]);
    if (url) onPreview(url as string, `CARÁTULAS - ${commercialName.trim().toUpperCase()}`);
  };

  const handleDescargar = async () => {
    if (!commercialName.trim()) return;
    const [r, g, b] = frameColor.split(',').map(Number);
    await generateCaratulasPDF(buildDocInfo() as any, false, [r, g, b]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center md:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-xl overflow-hidden flex flex-col">
        <div className="bg-purple-800 shrink-0 md:hidden" style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="bg-purple-800 px-5 py-5 text-white flex justify-between items-center shrink-0">
          <h3 className="font-extrabold flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Carátulas de Anexos
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center bg-purple-700/50 hover:bg-purple-700 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ overscrollBehavior: 'contain' }}>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Cargar Datos de Empresa Existente
            </label>
            <select
              value={selectedDocId}
              onChange={e => handleDocChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white text-gray-800"
            >
              <option value="">-- Manual (Sin cargar acta) --</option>
              {documents.map(d => (
                <option key={d.id} value={String(d.id)}>{d.commercial_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Razón Social de la Empresa
            </label>
            <div className="relative">
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ej. SERVICIOS DE PROTECCIÓN S.A. DE C.V."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-9 uppercase"
              />
              {companyName && (
                <button type="button" tabIndex={-1} onClick={() => setCompanyName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Nombre Comercial de la Empresa *
            </label>
            <div className="relative">
              <input
                type="text"
                value={commercialName}
                onChange={e => setCommercialName(e.target.value)}
                placeholder="Ej. HOTEL RIVIERA MAR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-9 uppercase"
              />
              {commercialName && (
                <button type="button" tabIndex={-1} onClick={() => setCommercialName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Color del Marco
            </label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-md border border-gray-300 shadow-sm shrink-0 transition-colors" 
                style={{ backgroundColor: `rgb(${frameColor})` }}
              />
              <select
                value={frameColor}
                onChange={e => setFrameColor(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
              >
                <option value="31,73,125">Azul (Seprisa)</option>
                <option value="114,47,55">Vino</option>
                <option value="200,0,0">Rojo</option>
                <option value="249,115,22">Naranja</option>
                <option value="0,100,0">Verde Oscuro</option>
                <option value="218,165,32">Amarillo / Dorado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 flex flex-row gap-1.5">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-bold text-xs sm:text-sm min-h-[38px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            className="flex-1 px-1 py-2 border border-orange-300 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors font-bold flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[38px]"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Limpiar
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!commercialName.trim()}
            className="flex-1 px-1 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 transition-colors font-bold flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            Previa
          </button>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={!commercialName.trim()}
            className="flex-1 px-1 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors font-bold flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}
