import React from 'react';
import { BarChart3, History, FileText } from 'lucide-react';
import { DocumentInfo } from '../../types';

interface DashboardViewProps {
  documents: DocumentInfo[];
  quotes: any[];
  pdfHistory: any[];
}

export default function DashboardView({ documents, quotes, pdfHistory }: DashboardViewProps) {
  const totalActive = documents.filter(d => d.is_active === 1).length;
  const totalInactive = documents.filter(d => d.is_active !== 1).length;
  const thisMonth = new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' });
  const pdfsThisMonth = pdfHistory.filter(h => {
    try { 
      const d = new Date(h.date); 
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); 
    } catch { return false; }
  }).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
        <BarChart3 className="w-7 h-7" />
        Dashboard
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Documentos Activos</p>
          <p className="text-3xl font-extrabold text-green-600 mt-1">{totalActive}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Inactivos</p>
          <p className="text-3xl font-extrabold text-gray-400 mt-1">{totalInactive}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cotizaciones</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">{quotes.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">PDFs ({thisMonth})</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-1">{pdfsThisMonth}</p>
        </div>
      </div>

      {/* Recent PDFs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <History className="w-5 h-5" />
            Ultimos PDFs Generados
          </h3>
        </div>
        {pdfHistory.length === 0 ? (
          <p className="p-5 text-gray-400 text-sm italic">No se han generado PDFs aun.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {pdfHistory.slice(0, 10).map((entry, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                  entry.type === 'Acta Constitutiva' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  entry.type === 'Carta Responsiva' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  entry.type.includes('Constancia') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  entry.type.includes('Simulacro') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {entry.type}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{entry.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{entry.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resumen de Documentos
          </h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700">
          {documents.slice(0, 10).map(doc => (
            <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{doc.commercial_name}</p>
                <p className="text-xs text-gray-400">{doc.company_name}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.is_active === 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                {doc.is_active === 1 ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
