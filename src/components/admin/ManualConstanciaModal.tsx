import React, { useState } from 'react';
import { Filter, X, Trash2, Plus, Eye, Award, FileText } from 'lucide-react';
import { DocumentInfo } from '../../types';
import Swal from 'sweetalert2';

interface ManualConstanciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onGenerate: (data: any) => Promise<void>;
  onPreview: (data: any) => Promise<void>;
}

export const CONSTANCIA_TYPES = [
  { id: 'completa',           label: 'Completa (todos los rubros)',    image: '/constancia_vacia.png',                  location: 'pdc' },
  { id: 'evacuacion',         label: 'Evacuación',                     image: '/constancia_evacuacion.png',             location: 'pdc' },
  { id: 'extintores',         label: 'Uso y Manejo de Extintores',     image: '/constancia_extintores.png',             location: 'pdc' },
  { id: 'primeros_auxilios',  label: 'Primeros Auxilios',              image: '/constancia_primeros_auxilios.png',      location: 'pdc' },
  { id: 'pa_extintores',      label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores.png',          location: 'pdc' },
  { id: 'completa_tulum',          label: 'Completa (todos los rubros)',    image: '/constancia_vacia_tulum.png',             location: 'tulum' },
  { id: 'evacuacion_tulum',        label: 'Evacuación',                     image: '/constancia_evacuacion_tulum.png',        location: 'tulum' },
  { id: 'extintores_tulum',        label: 'Uso y Manejo de Extintores',     image: '/constancias_extintores_tulum.png',       location: 'tulum' },
  { id: 'primeros_auxilios_tulum', label: 'Primeros Auxilios',              image: '/constancia_primeros_auxilios_tulum.png', location: 'tulum' },
  { id: 'pa_extintores_tulum',     label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores_tulum.png',     location: 'tulum' },
];

export default function ManualConstanciaModal({
  isOpen, onClose, documents, onGenerate, onPreview
}: ManualConstanciaModalProps) {
  const [locationSection, setLocationSection] = useState<'pdc' | 'tulum' | null>('pdc');
  const [quickData, setQuickData] = useState({
    employeeNames: [''],
    constanciaType: 'completa',
    commercial_name: '',
    address: '',
    date: ''
  });

  const handleQuickAutocomplete = (docId: string) => {
    if (!docId) {
      setQuickData(prev => ({ ...prev, commercial_name: '', address: '', date: '' }));
      return;
    }
    const doc = documents.find(d => d.id.toString() === docId);
    if (doc) {
      setQuickData(prev => ({
        ...prev,
        commercial_name: doc.commercial_name || '',
        address: doc.address || '',
        date: doc.date || ''
      }));
    }
  };

  const handleGenerateManualConstancia = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const names = quickData.employeeNames.filter(n => n.trim() !== '');
    if (names.length === 0 || !quickData.commercial_name.trim() || !quickData.address.trim() || !quickData.date.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor llena todos los campos, o selecciona un acta existente para autocompletar.',
        confirmButtonColor: '#722F37'
      });
      return;
    }
    await onGenerate(quickData);
  };

  const handlePreviewManualConstancia = async () => {
    const names = quickData.employeeNames.filter((n: string) => n.trim() !== '');
    if (names.length === 0 || !quickData.commercial_name.trim() || !quickData.address.trim() || !quickData.date.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor llena todos los campos.', confirmButtonColor: '#722F37' });
      return;
    }
    await onPreview(quickData);
  };

  const handleCloseQuickModal = () => {
    setQuickData({
      employeeNames: [''],
      constanciaType: 'completa',
      commercial_name: '',
      address: '',
      date: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center md:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-xl overflow-hidden flex flex-col min-w-0 break-words" style={{ overscrollBehavior: 'contain' }}>
        <div className="bg-blue-900 shrink-0 md:hidden" style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="bg-blue-900 px-5 py-5 text-white flex justify-between items-center shrink-0">
          <h3 className="font-extrabold flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Nueva Constancia
          </h3>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleCloseQuickModal(); }}
            className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form id="constancia-form" onSubmit={handleGenerateManualConstancia} className="p-6 space-y-4 overflow-y-auto overflow-x-hidden flex-1 w-full max-w-full" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Genera una constancia en PDF al instante para cualquier persona. Puedes escribir los datos de la empresa manualmente o autocompletarlos seleccionando un acta existente.
          </p>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Nombre(s) de la(s) Persona(s) *
            </label>
            <div className="space-y-2">
              {quickData.employeeNames.map((name, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder={`Ej. Juan Pérez López`}
                    value={name}
                    onChange={(e) => {
                      const updated = [...quickData.employeeNames];
                      updated[idx] = e.target.value.toUpperCase();
                      setQuickData({ ...quickData, employeeNames: updated });
                    }}
                    className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  />
                  {quickData.employeeNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = quickData.employeeNames.filter((_, i) => i !== idx);
                        setQuickData({ ...quickData, employeeNames: updated });
                      }}
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
              onClick={() => setQuickData({ ...quickData, employeeNames: [...quickData.employeeNames, ''] })}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-700 font-semibold hover:text-blue-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar otra persona
            </button>
            {quickData.employeeNames.filter(n => n.trim()).length > 1 && (
              <p className="mt-1 text-xs text-blue-600 font-medium">
                Se generarán {quickData.employeeNames.filter(n => n.trim()).length} constancias en un solo PDF.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Constancia *</label>

            {/* Playa del Carmen section */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
              <button
                type="button"
                onClick={() => setLocationSection(locationSection === 'pdc' ? null : 'pdc')}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-700">📍 Playa del Carmen</span>
                <span className="text-gray-400 text-xs">{locationSection === 'pdc' ? '▲' : '▼'}</span>
              </button>
              {locationSection === 'pdc' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                  {CONSTANCIA_TYPES.filter(t => t.location === 'pdc').map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border cursor-pointer transition-all ${
                        quickData.constanciaType === type.id
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="constanciaType"
                        value={type.id}
                        checked={quickData.constanciaType === type.id}
                        onChange={(e) => setQuickData({ ...quickData, constanciaType: e.target.value })}
                        className="w-3 h-3 text-blue-600 accent-blue-600 shrink-0"
                      />
                      <span className={`text-xs font-medium leading-tight ${quickData.constanciaType === type.id ? 'text-blue-800' : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Tulum section */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setLocationSection(locationSection === 'tulum' ? null : 'tulum')}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-700">📍 Tulum</span>
                <span className="text-gray-400 text-xs">{locationSection === 'tulum' ? '▲' : '▼'}</span>
              </button>
              {locationSection === 'tulum' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                  {CONSTANCIA_TYPES.filter(t => t.location === 'tulum').map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border cursor-pointer transition-all ${
                        quickData.constanciaType === type.id
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="constanciaType"
                        value={type.id}
                        checked={quickData.constanciaType === type.id}
                        onChange={(e) => setQuickData({ ...quickData, constanciaType: e.target.value })}
                        className="w-3 h-3 text-blue-600 accent-blue-600 shrink-0"
                      />
                      <span className={`text-xs font-medium leading-tight ${quickData.constanciaType === type.id ? 'text-blue-800' : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Autocompletar datos desde acta existente (Opcional):</label>
            <select
              className="w-full border border-gray-300 rounded-md p-3 text-base bg-gray-50 focus:ring-blue-600"
              onChange={(e) => handleQuickAutocomplete(e.target.value)}
              defaultValue=""
            >
              <option value="">-- Escribir datos manualmente --</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.commercial_name} ({doc.date})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial de la Empresa *</label>
              <input
                type="text"
                required
                value={quickData.commercial_name}
                onChange={(e) => setQuickData({ ...quickData, commercial_name: e.target.value.toUpperCase() })}
                className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de la Empresa *</label>
              <input
                type="text"
                required
                value={quickData.address}
                onChange={(e) => setQuickData({ ...quickData, address: e.target.value.toUpperCase() })}
                className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Expedición *</label>
              <input
                type="date"
                required
                onChange={(e) => {
                  const dateObj = new Date(e.target.value + 'T00:00:00');
                  if (!isNaN(dateObj.getTime())) {
                    const formattedDate = dateObj.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });
                    setQuickData({ ...quickData, date: formattedDate });
                  } else {
                    setQuickData({ ...quickData, date: '' });
                  }
                }}
                className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
              />
              {quickData.date && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  Formato final: {quickData.date}
                </p>
              )}
            </div>
          </div>

        </form>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={handleCloseQuickModal}
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-bold min-h-[44px] text-base"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePreviewManualConstancia}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2 min-h-[44px] text-base"
          >
            <Eye className="w-5 h-5 shrink-0" />
            Vista Previa
          </button>
          <button
            type="button"
            onClick={() => { const form = document.getElementById('constancia-form') as HTMLFormElement; if (form) form.requestSubmit(); }}
            className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-bold flex items-center justify-center gap-2 min-h-[44px] text-base"
          >
            <Award className="w-5 h-5 shrink-0" />
            {quickData.employeeNames.filter(n => n.trim()).length > 1
              ? `Descargar ${quickData.employeeNames.filter(n => n.trim()).length} Constancias`
              : 'Descargar Constancia'}
          </button>
        </div>
      </div>
    </div>
  );
}
