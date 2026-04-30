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

export default function ActaBlankModal({ isOpen, onClose, documents, onPreview }: ActaBlankModalProps) {
  const [selectedDocId, setSelectedDocId] = useState<number | ''>('');
  const [numEmpleados, setNumEmpleados] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setLoading(true);
    await generateActaBlankPDF(selectedDoc, numEmpleados, false);
    setLoading(false);
  };

  const handlePreview = async () => {
    if (!selectedDoc) return;
    setLoading(true);
    const url = await generateActaBlankPDF(selectedDoc, numEmpleados, true);
    if (url) {
      const name = generatePdfName('ACTA CONSTITUTIVA BLANK', selectedDoc.commercial_name || 'DOCUMENTO', selectedDoc.date);
      onPreview(url as string, name);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-900 rounded-t-xl">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">Acta Constitutiva para Firmar</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">

            {/* Seleccionar acta */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Seleccionar Acta Constitutiva
              </label>
              <select
                value={selectedDocId}
                onChange={e => setSelectedDocId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selecciona un acta —</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.commercial_name || `Acta #${d.id}`}
                    {d.date ? ` · ${d.date}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Info del acta seleccionada */}
            {selectedDoc && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 space-y-1 text-sm">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Datos del acta</p>
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Nombre comercial:</span> {selectedDoc.commercial_name}
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Razón social:</span> {selectedDoc.company_name}
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Dirección:</span> {selectedDoc.address}
                </p>
              </div>
            )}

            {/* Número de recuadros de empleados */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Número de recuadros para empleados
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                El primero será Representante Legal, el resto Multibrigada.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNumEmpleados(n => Math.max(1, n - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={numEmpleados}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= 50) setNumEmpleados(v);
                  }}
                  className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setNumEmpleados(n => Math.min(50, n + 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  +
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  recuadros
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePreview}
              disabled={!selectedDoc || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              Vista previa
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedDoc || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Descargar PDF
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
