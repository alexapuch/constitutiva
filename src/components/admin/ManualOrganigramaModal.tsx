import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Eye, GitBranch } from 'lucide-react';
import { motion } from 'motion/react';
import { generateOrganigrama } from '../../utils/generateOrganigrama';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (url: string, name: string) => void;
}

export default function ManualOrganigramaModal({ isOpen, onClose, onPreview }: Props) {
  const [comercialName, setComercialName] = useState('');
  const [names, setNames] = useState(['', '']);
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleLimpiar = () => {
    setComercialName('');
    setNames(['', '']);
  };

  const handleClose = () => {
    handleLimpiar();
    onClose();
  };

  const updateName = (idx: number, val: string) => {
    const updated = [...names];
    updated[idx] = val;
    setNames(updated);
  };

  const addName = () => {
    const newIdx = names.length;
    setNames([...names, '']);
    setTimeout(() => nameRefs.current[newIdx]?.focus(), 50);
  };

  const removeName = (idx: number) => {
    if (names.length <= 2) return;
    setNames(names.filter((_, i) => i !== idx));
  };

  const handlePreview = async () => {
    const filledNames = names.map(n => n.trim()).filter(Boolean);
    if (!comercialName.trim() || filledNames.length === 0) return;

    const fakeDocInfo = {
      id: 0, commercial_name: comercialName.trim().toUpperCase(),
      company_name: '', date: '', time_start: '', time_end: '',
      address: '', is_active: 1
    };
    const fakeEmployees = filledNames.map((name, i) => ({
      id: i, document_id: 0, name: name.toUpperCase(),
      role: i === 0 ? 'REPRESENTANTE LEGAL' : '',
      brigade: '', signature: ''
    }));

    const url = await generateOrganigrama(fakeDocInfo as any, fakeEmployees as any, true);
    if (url) {
      onPreview(url as string, `ORGANIGRAMA - ${comercialName.trim().toUpperCase()}`);
    }
  };

  const canPreview = comercialName.trim() !== '' && names.some(n => n.trim() !== '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center md:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-xl overflow-hidden flex flex-col">
        <div className="bg-teal-800 shrink-0 md:hidden" style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="bg-teal-800 px-5 py-5 text-white flex justify-between items-center shrink-0">
          <h3 className="font-extrabold flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5" />
            Organigrama Manual
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center bg-teal-700/50 hover:bg-teal-700 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ overscrollBehavior: 'contain' }}>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Nombre Comercial de la Empresa *
            </label>
            <div className="relative">
              <input
                type="text"
                value={comercialName}
                onChange={e => setComercialName(e.target.value)}
                placeholder="Ej. HOTEL RIVIERA MAR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none pr-9 uppercase"
              />
              {comercialName && (
                <button type="button" tabIndex={-1} onClick={() => setComercialName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Nombres *
              </label>
              <span className="text-xs text-gray-400">El primero será el Jefe de Brigada</span>
            </div>

            <div className="space-y-2">
              {names.map((name, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {idx === 0
                        ? <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1 py-0.5 whitespace-nowrap">JEFE</span>
                        : <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 whitespace-nowrap">MULTI</span>
                      }
                    </div>
                    <input
                      ref={el => { nameRefs.current[idx] = el; }}
                      type="text"
                      value={name}
                      onChange={e => updateName(idx, e.target.value)}
                      placeholder={idx === 0 ? 'Nombre del Jefe de Brigada' : `Nombre persona ${idx + 1}`}
                      className="w-full border border-gray-200 rounded-lg pl-14 pr-9 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    {name && (
                      <button type="button" tabIndex={-1}
                        onClick={() => { updateName(idx, ''); nameRefs.current[idx]?.focus(); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {names.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeName(idx)}
                      className="shrink-0 w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Quitar persona"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addName}
              className="mt-2 flex items-center gap-1.5 text-sm text-teal-700 font-semibold hover:text-teal-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar persona
            </button>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
            El primer nombre se mostrará como <strong>Jefe de Brigada de Emergencia Multifuncional</strong> y el resto como <strong>Multibrigada</strong>.
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
            disabled={!canPreview}
            className="flex-[2] px-1 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors font-bold flex items-center justify-center gap-1 text-xs sm:text-sm min-h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            Vista Previa
          </button>
        </div>
      </div>
    </div>
  );
}
