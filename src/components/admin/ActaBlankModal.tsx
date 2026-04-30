import React, { useState } from 'react';
import { X, Download, Eye, FileText } from 'lucide-react';
import { DocumentInfo } from '../../types';
import { generateActaBlankPDF } from '../../utils/generateActaBlankPDF';
import { generatePdfName } from '../../utils/pdfNameGenerator';

interface ActaBlankModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onPreview: (url: string, name: string) => void;
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1';

function EmpleadosControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className={labelCls}>Número de recuadros para empleados</label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        El primero será Representante Legal, el resto Multibrigada.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
        >−</button>
        <input
          type="number"
          min={1}
          max={50}
          value={value}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 50) onChange(v); }}
          className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(50, value + 1))}
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
        >+</button>
        <span className="text-sm text-gray-500 dark:text-gray-400">recuadros</span>
      </div>
    </div>
  );
}

export default function ActaBlankModal({ isOpen, onClose, documents, onPreview }: ActaBlankModalProps) {
  const [mode, setMode] = useState<'acta' | 'manual'>('acta');
  const [loading, setLoading] = useState(false);

  // Modo "Desde Acta"
  const [selectedDocId, setSelectedDocId] = useState<number | ''>('');
  const [numActa, setNumActa] = useState(5);

  // Modo "Manual"
  const [mNombreComercial, setMNombreComercial] = useState('');
  const [mRazonSocial, setMRazonSocial] = useState('');
  const [mDireccion, setMDireccion] = useState('');
  const [mCiudad, setMCiudad] = useState<'PLAYA DEL CARMEN' | 'TULUM'>('PLAYA DEL CARMEN');
  const [mFecha, setMFecha] = useState('');
  const [mHoraInicio, setMHoraInicio] = useState('');
  const [mHoraFin, setMHoraFin] = useState('');
  const [numManual, setNumManual] = useState(5);

  const handleClose = () => {
    setMode('acta');
    setSelectedDocId('');
    setNumActa(5);
    setMNombreComercial('');
    setMRazonSocial('');
    setMDireccion('');
    setMCiudad('PLAYA DEL CARMEN');
    setMFecha('');
    setMHoraInicio('');
    setMHoraFin('');
    setNumManual(5);
    onClose();
  };

  if (!isOpen) return null;

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  const buildManualDoc = (): DocumentInfo => ({
    id: 0,
    commercial_name: mNombreComercial.toUpperCase(),
    company_name: mRazonSocial.toUpperCase(),
    address: mDireccion.trim() ? `${mDireccion.trim().toUpperCase()} | ${mCiudad}` : `| ${mCiudad}`,
    date: mFecha,
    time_start: mHoraInicio,
    time_end: mHoraFin,
    is_active: 1,
  });

  const canGenerate = mode === 'acta' ? !!selectedDoc : !!mNombreComercial.trim();

  const getDocAndCount = () =>
    mode === 'acta'
      ? { doc: selectedDoc!, count: numActa }
      : { doc: buildManualDoc(), count: numManual };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const { doc, count } = getDocAndCount();
    setLoading(true);
    await generateActaBlankPDF(doc, count, false);
    setLoading(false);
  };

  const handlePreview = async () => {
    if (!canGenerate) return;
    const { doc, count } = getDocAndCount();
    setLoading(true);
    const url = await generateActaBlankPDF(doc, count, true);
    if (url) {
      const name = generatePdfName('ACTA CONSTITUTIVA BLANK', doc.commercial_name || 'DOCUMENTO', doc.date);
      onPreview(url as string, name);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={handleClose} />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-blue-900 rounded-t-xl shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">Acta Constitutiva para Firmar</span>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
            <button
              onClick={() => setMode('acta')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'acta' ? 'border-b-2 border-blue-700 text-blue-700 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Desde Acta
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'manual' ? 'border-b-2 border-blue-700 text-blue-700 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Manual
            </button>
          </div>

          {/* Body scrollable */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">

            {mode === 'acta' && (
              <>
                <div>
                  <label className={labelCls}>Seleccionar Acta Constitutiva</label>
                  <select
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value === '' ? '' : Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value="">— Selecciona un acta —</option>
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.commercial_name || `Acta #${d.id}`}{d.date ? ` · ${d.date}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDoc && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 space-y-1 text-sm">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Datos del acta</p>
                    <p className="text-gray-800 dark:text-gray-200"><span className="font-medium">Nombre comercial:</span> {selectedDoc.commercial_name}</p>
                    <p className="text-gray-800 dark:text-gray-200"><span className="font-medium">Razón social:</span> {selectedDoc.company_name}</p>
                    <p className="text-gray-800 dark:text-gray-200"><span className="font-medium">Dirección:</span> {selectedDoc.address}</p>
                  </div>
                )}

                <EmpleadosControl value={numActa} onChange={setNumActa} />
              </>
            )}

            {mode === 'manual' && (
              <>
                <div>
                  <label className={labelCls}>Nombre Comercial</label>
                  <input
                    type="text"
                    value={mNombreComercial}
                    onChange={e => setMNombreComercial(e.target.value)}
                    placeholder="Ej. HOTEL PARAÍSO"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Razón Social</label>
                  <input
                    type="text"
                    value={mRazonSocial}
                    onChange={e => setMRazonSocial(e.target.value)}
                    placeholder="Ej. PARAÍSO S.A. DE C.V."
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Dirección</label>
                  <input
                    type="text"
                    value={mDireccion}
                    onChange={e => setMDireccion(e.target.value)}
                    placeholder="Ej. AV. CONSTITUYENTES 123"
                    className={inputCls}
                  />
                  <div className="flex gap-2 mt-2">
                    {(['PLAYA DEL CARMEN', 'TULUM'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setMCiudad(c)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mCiudad === c ? 'bg-blue-900 text-white border-blue-900' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Hora Inicio</label>
                    <input
                      type="time"
                      value={mHoraInicio}
                      onChange={e => setMHoraInicio(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hora Fin</label>
                    <input
                      type="time"
                      value={mHoraFin}
                      onChange={e => setMHoraFin(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Fecha</label>
                  <input
                    type="date"
                    value={mFecha}
                    onChange={e => {
                      const iso = e.target.value;
                      if (!iso) { setMFecha(''); return; }
                      const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
                      const [yr, mo, dy] = iso.split('-').map(Number);
                      setMFecha(`${dy} DE ${meses[mo - 1]} DEL ${yr}`);
                    }}
                    className={inputCls}
                  />
                  {mFecha && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mFecha}</p>}
                </div>

                <EmpleadosControl value={numManual} onChange={setNumManual} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={handlePreview}
              disabled={!canGenerate || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              Vista previa
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Download className="w-4 h-4" />
              }
              Descargar PDF
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
