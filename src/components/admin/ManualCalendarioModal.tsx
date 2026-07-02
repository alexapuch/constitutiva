import React, { useState, useEffect } from 'react';
import { X, Save, Eye, CheckCircle2 } from 'lucide-react';
import { DocumentInfo } from '../../types';
import { ACTIVITIES_LIST, MONTHS_LIST, CalendarioData } from '../../utils/generateCalendarioPDF';
import Swal from 'sweetalert2';

interface ManualCalendarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentInfo | null;
  onPreview: (data: CalendarioData) => void;
  onGenerate: (data: CalendarioData) => void;
}

export default function ManualCalendarioModal({
  isOpen,
  onClose,
  document,
  onPreview,
  onGenerate
}: ManualCalendarioModalProps) {
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    if (isOpen && document) {
      // Parse document date
      let docMonth = 0; // Default January
      let docYear = new Date().getFullYear().toString();
      if (document.date && document.date !== 'UNKNOWN') {
        const dateUpper = document.date.toUpperCase();
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        const foundIndex = meses.findIndex(m => dateUpper.includes(m));
        if (foundIndex !== -1) {
          docMonth = foundIndex;
        }
        const matchYear = dateUpper.match(/20\d{2}/);
        if (matchYear) {
          docYear = matchYear[0];
        }
      }
      setYear(docYear);

      // Initialize grid
      const initialGrid: boolean[][] = [];
      for (let r = 0; r < ACTIVITIES_LIST.length; r++) {
        const row: boolean[] = new Array(12).fill(false);
        const activity = ACTIVITIES_LIST[r];

        if (activity === "RENOVACIÓN POLIZA DE SEGURO") {
          // Empty
        } else if (activity.includes("(MENSUAL)") || activity.includes("(DIARIO)")) {
          // All months
          row.fill(true);
        } else if (activity.includes("RECORRIDO DE SEGURIDAD EN EL INMUEBLE (BIMESTRAL)")) {
          // Fixed Jan, Mar, May, Jul, Sep, Nov
          [0, 2, 4, 6, 8, 10].forEach(m => row[m] = true);
        } else if (activity.includes("PLÁTICAS Y ACCIONES DE DIFUSIÓN REFERENTES A LA PROTECCIÓN CIVIL")) {
          // Fixed Jan, Mar, May, Jul, Sep, Nov based on reference image
          [0, 2, 4, 6, 8, 10].forEach(m => row[m] = true);
        } else if (activity.includes("SEMESTRAL")) {
          // Month of Acta and Month + 6
          row[docMonth] = true;
          row[(docMonth + 6) % 12] = true;
        } else {
          // The rest are (ANUAL) or single time in the year. Set to docMonth
          row[docMonth] = true;
        }
        
        initialGrid.push(row);
      }
      setGrid(initialGrid);
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const toggleCell = (rIdx: number, cIdx: number) => {
    const newGrid = [...grid];
    newGrid[rIdx] = [...newGrid[rIdx]];
    newGrid[rIdx][cIdx] = !newGrid[rIdx][cIdx];
    setGrid(newGrid);
  };

  const handlePreview = () => {
    onPreview({
      commercialName: document.commercial_name || '',
      year,
      grid
    });
  };

  const handleGenerate = () => {
    onGenerate({
      commercialName: document.commercial_name || '',
      year,
      grid
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-blue-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Calendario de Actividades
              </h2>
              <p className="text-sm text-slate-500 font-medium">{document.commercial_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Año del Calendario:</label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-32 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-1.5 font-bold text-slate-800 dark:text-slate-100 outline-none text-center"
            />
          </div>

          <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-x-auto shadow-inner bg-slate-50 dark:bg-slate-900">
            <table className="w-full text-xs text-left whitespace-nowrap min-w-[1000px]">
              <thead className="bg-[#0b2c5e] text-white">
                <tr>
                  <th className="px-4 py-3 font-bold border-r border-slate-400">ACTIVIDAD</th>
                  {MONTHS_LIST.map((m, i) => (
                    <th key={m} className="px-2 py-1 border-r border-slate-400 text-center relative w-8 h-28">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="transform -rotate-90 tracking-widest">{m}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-bold border-r border-slate-400 text-center">RESPONSABLE</th>
                  <th className="px-4 py-3 font-bold text-center">EVIDENCIA<br/>DOCUMENTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {ACTIVITIES_LIST.map((activity, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-3 py-2 font-semibold border-r border-slate-300 dark:border-slate-700 whitespace-normal min-w-[250px] leading-tight text-[11px]">
                      {activity}
                    </td>
                    {MONTHS_LIST.map((_, cIdx) => (
                      <td
                        key={cIdx}
                        onClick={() => toggleCell(rIdx, cIdx)}
                        className={`border-r border-slate-300 dark:border-slate-700 cursor-pointer transition-colors p-0.5 ${
                          grid[rIdx]?.[cIdx]
                            ? 'bg-[#99c2e6] hover:bg-[#85b5df]'
                            : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="w-full h-8 flex items-center justify-center">
                          {/* Invisible checkmark to give body if we wanted, but color is enough */}
                        </div>
                      </td>
                    ))}
                    <td className="border-r border-slate-300 dark:border-slate-700"></td>
                    <td className="px-2 py-2 text-center font-bold text-[10px] uppercase">
                      {(() => {
                        if (rIdx === 2) return "EVIDENCIA FOTOGRÁFICA";
                        if (rIdx >= 12 && rIdx <= 14) return "CONSTANCIAS";
                        return "REPORTE";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 italic text-center">Haz clic en los cuadros para marcarlos o desmarcarlos.</p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all shadow-sm"
          >
            <Eye className="w-5 h-5" />
            Vista Previa
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Save className="w-5 h-5" />
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
