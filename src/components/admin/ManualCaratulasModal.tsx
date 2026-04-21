import React, { useState } from 'react';
import { X, Trash2, Eye, BookOpen } from 'lucide-react';
import { generateCaratulasPDF } from '../../utils/generateCaratulasPDF';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (url: string, name: string) => void;
}

export default function ManualCaratulasModal({ isOpen, onClose, onPreview }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [commercialName, setCommercialName] = useState('');

  const handleLimpiar = () => {
    setCompanyName('');
    setCommercialName('');
  };

  const handleClose = () => {
    handleLimpiar();
    onClose();
  };

  const handlePreview = async () => {
    if (!commercialName.trim()) return;
    const fakeDocInfo = {
      id: 0, commercial_name: commercialName.trim().toUpperCase(),
      company_name: companyName.trim().toUpperCase(),
      date: '', time_start: '', time_end: '', address: '', is_active: 1
    };
    const url = await generateCaratulasPDF(fakeDocInfo as any, true);
    if (url) {
      onPreview(url as string, `CARÁTULAS - ${commercialName.trim().toUpperCase()}`);
    }
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
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
            Se generará una vista previa con las 4 carátulas de anexos (I, II, III y IV) usando los datos de la empresa que ingreses.
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-9 uppercase"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-9 uppercase"
              />
              {commercialName && (
                <button type="button" tabIndex={-1} onClick={() => setCommercialName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
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
            className="flex-[2] px-1 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 transition-colors font-bold flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            Vista Previa
          </button>
        </div>
      </div>
    </div>
  );
}
