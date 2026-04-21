import React, { useState, useRef } from 'react';
import { Filter, X, Trash2, Plus, Eye, Award, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DocumentInfo } from '../../types';
import Swal from 'sweetalert2';

interface ManualConstanciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onGenerate: (data: any) => Promise<void>;
  onPreview: (data: any) => Promise<void>;
}

export const CONSTANCIA_PDF_PREFIX: Record<string, string> = {
  'completa':                'CONSTANCIAS',
  'evacuacion':              'CONSTANCIA EVA',
  'extintores':              'CONSTANCIA UYME',
  'primeros_auxilios':       'CONSTANCIA P.A.',
  'pa_extintores':           'CONSTANCIA P.A.-UYME',
  'completa_tulum':          'CONSTANCIAS',
  'evacuacion_tulum':        'CONSTANCIA EVA',
  'extintores_tulum':        'CONSTANCIA UYME',
  'primeros_auxilios_tulum': 'CONSTANCIA P.A.',
  'pa_extintores_tulum':     'CONSTANCIA P.A.-UYME',
};

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
    date: '',
    dateISO: ''
  });
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [excelNames, setExcelNames] = useState<string[]>([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [dateKey, setDateKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const HEADER_KEYWORDS = ['nombre', 'name', 'names', 'nombres', 'empleado', 'employee'];
        const extracted = rows
          .map(row => String(row[0] ?? '').trim().toUpperCase())
          .filter((val, idx) => {
            if (!val || val.length < 2) return false;
            // Omitir primera fila si parece encabezado
            if (idx === 0 && HEADER_KEYWORDS.some(k => val.toLowerCase().includes(k))) return false;
            return true;
          });

        if (extracted.length === 0) {
          Swal.fire({ icon: 'warning', title: 'Sin nombres', text: 'No se encontraron nombres en la columna A del archivo.', confirmButtonColor: '#722F37' });
          return;
        }

        setExcelNames(prev => [...prev, ...extracted]);

        Swal.fire({
          icon: 'success',
          title: `${extracted.length} nombres cargados`,
          text: 'Los nombres de la columna A fueron agregados desde el archivo.',
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error al leer el archivo', text: 'Asegúrate de que sea un archivo .xlsx o .csv válido.', confirmButtonColor: '#722F37' });
      } finally {
        // Limpiar input para permitir subir el mismo archivo de nuevo
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

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

  // Combina nombres manuales + Excel para la generación
  const allNames = [
    ...quickData.employeeNames.filter(n => n.trim() !== ''),
    ...excelNames,
  ];

    const handleGenerateManualConstancia = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (allNames.length === 0 || !quickData.commercial_name.trim() || !quickData.date.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor llena todos los campos, o selecciona un acta existente para autocompletar.',
                confirmButtonColor: '#722F37'
            });
            return;
        }
        await onGenerate({ 
            ...quickData, 
            commercial_name: quickData.commercial_name.toUpperCase(),
            address: quickData.address.toUpperCase(),
            employeeNames: allNames.map(n => n.toUpperCase()) 
        });
    };

    const handlePreviewManualConstancia = async () => {
        if (allNames.length === 0 || !quickData.commercial_name.trim() || !quickData.date.trim()) {
            Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor llena todos los campos.', confirmButtonColor: '#722F37' });
            return;
        }
        await onPreview({ 
            ...quickData, 
            commercial_name: quickData.commercial_name.toUpperCase(),
            address: quickData.address.toUpperCase(),
            employeeNames: allNames.map(n => n.toUpperCase()) 
        });
    };

  const handleLimpiar = () => {
    setQuickData({ employeeNames: [''], constanciaType: 'completa', commercial_name: '', address: '', date: '', dateISO: '' });
    setExcelNames([]);
    setShowExcelPreview(false);
    setShowBulkPaste(false);
    setBulkText('');
    setDateKey(k => k + 1);
  };

  const handleCloseQuickModal = () => {
    handleLimpiar();
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-gray-700">
                Nombre(s) de la(s) Persona(s) *
              </label>
              {quickData.employeeNames.filter(n => n.trim()).length > 1 && (
                <button
                  type="button"
                  onClick={() => setQuickData({ ...quickData, employeeNames: [''] })}
                  className="flex items-center gap-1 text-xs text-red-600 font-semibold hover:text-red-800 transition-colors"
                  title="Eliminar todos los nombres"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar todos
                </button>
              )}
            </div>
            <div className="space-y-2">
              {quickData.employeeNames.map((name, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      placeholder={`Ej. Juan Pérez López`}
                      value={name}
                      ref={(el) => { nameInputRefs.current[idx] = el; }}
                      onChange={(e) => {
                        const updated = [...quickData.employeeNames];
                        updated[idx] = e.target.value;
                        setQuickData({ ...quickData, employeeNames: updated });
                      }}
                      className="w-full border border-gray-300 rounded-md p-3 pr-9 text-base uppercase focus:ring-blue-600 focus:border-blue-600"
                      style={{ fontSize: '16px' }}
                    />
                    {name && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          const updated = [...quickData.employeeNames];
                          updated[idx] = '';
                          setQuickData({ ...quickData, employeeNames: updated });
                          nameInputRefs.current[idx]?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Limpiar campo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const newIdx = quickData.employeeNames.length;
                  setQuickData({ ...quickData, employeeNames: [...quickData.employeeNames, ''] });
                  setTimeout(() => nameInputRefs.current[newIdx]?.focus(), 50);
                }}
                className="flex items-center gap-1.5 text-sm text-blue-700 font-semibold hover:text-blue-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar otra persona
              </button>
              <button
                type="button"
                onClick={() => { setShowBulkPaste(v => !v); setBulkText(''); }}
                className="flex items-center gap-1.5 text-sm text-purple-700 font-semibold hover:text-purple-900 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showBulkPaste ? 'Cancelar pegado múltiple' : 'Pegar lista de nombres'}
              </button>
              {/* Input oculto para Excel/CSV */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-emerald-700 font-semibold hover:text-emerald-900 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Subir Excel / CSV
              </button>
            </div>

            {showBulkPaste && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                <p className="text-xs text-purple-700 font-medium">
                  Pega aquí la lista de nombres (uno por línea). Se agregarán a los nombres ya capturados.
                </p>
                <textarea
                  rows={6}
                  placeholder={"Juan Pérez López\nMaría García Torres\nCarlos Ramírez Vega\n..."}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full border border-purple-300 rounded-md p-2 text-sm focus:ring-purple-500 focus:border-purple-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newNames = bulkText
                      .split('\n')
                      .map(n => n.trim().toUpperCase())
                      .filter(n => n.length > 0);
                    if (newNames.length === 0) return;
                    const existing = quickData.employeeNames.filter(n => n.trim() !== '');
                    setQuickData({ ...quickData, employeeNames: [...existing, ...newNames] });
                    setBulkText('');
                    setShowBulkPaste(false);
                  }}
                  className="w-full py-2 bg-purple-600 text-white rounded-md text-sm font-bold hover:bg-purple-700 transition-colors"
                >
                  Agregar {bulkText.split('\n').filter(n => n.trim()).length || 0} nombres a la lista
                </button>
              </div>
            )}

            {allNames.length > 1 && (
              <p className="mt-1 text-xs text-blue-600 font-medium">
                Se generarán {allNames.length} constancias en un solo PDF.
              </p>
            )}
          </div>

          {/* ── Resumen de nombres cargados desde Excel ── */}
          {excelNames.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-emerald-800">
                    {excelNames.length} nombres cargados desde Excel
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExcelPreview(v => !v)}
                    className="text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    {showExcelPreview ? 'Ocultar' : 'Ver primeros 5'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExcelNames([]); setShowExcelPreview(false); }}
                    className="text-xs text-red-500 font-semibold hover:text-red-700 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              {showExcelPreview && (
                <ul className="text-xs text-emerald-900 space-y-0.5 pl-1">
                  {excelNames.slice(0, 5).map((n, i) => (
                    <li key={i} className="truncate">• {n}</li>
                  ))}
                  {excelNames.length > 5 && (
                    <li className="text-emerald-600 font-medium">... y {excelNames.length - 5} más</li>
                  )}
                </ul>
              )}
            </div>
          )}

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
              <div className="relative">
                <input
                  type="text"
                  required
                  value={quickData.commercial_name}
                  onChange={(e) => setQuickData({ ...quickData, commercial_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-3 pr-9 text-base uppercase focus:ring-blue-600 focus:border-blue-600"
                />
                {quickData.commercial_name && (
                  <button type="button" tabIndex={-1} onClick={() => setQuickData({ ...quickData, commercial_name: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" title="Limpiar campo">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de la Empresa</label>
              <div className="relative">
                <input
                  type="text"
                  value={quickData.address}
                  onChange={(e) => setQuickData({ ...quickData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-3 pr-9 text-base uppercase focus:ring-blue-600 focus:border-blue-600"
                />
                {quickData.address && (
                  <button type="button" tabIndex={-1} onClick={() => setQuickData({ ...quickData, address: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" title="Limpiar campo">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Expedición *</label>
              <input
                key={dateKey}
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
                    setQuickData({ ...quickData, date: formattedDate, dateISO: e.target.value });
                  } else {
                    setQuickData({ ...quickData, date: '', dateISO: '' });
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
            onClick={handleLimpiar}
            className="w-full sm:w-auto px-6 py-2 border border-orange-300 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors font-bold flex items-center justify-center gap-2 min-h-[44px] text-base"
            title="Limpiar todos los campos"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            Limpiar
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
            onClick={handleGenerateManualConstancia}
            className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-bold flex items-center justify-center gap-2 min-h-[44px] text-base"
          >
            <Award className="w-5 h-5 shrink-0" />
            {allNames.length > 1
              ? `Descargar ${allNames.length} Constancias`
              : 'Descargar Constancia'}
          </button>
        </div>
      </div>
    </div>
  );
}
