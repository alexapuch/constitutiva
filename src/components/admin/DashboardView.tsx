import React from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { DocumentInfo } from '../../types';

interface DashboardViewProps {
  documents: DocumentInfo[];
  quotes: any[];
}

export default function DashboardView({ documents, quotes }: DashboardViewProps) {
  const totalActive = documents.filter(d => d.is_active === 1).length;
  const totalInactive = documents.filter(d => d.is_active !== 1).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
        <BarChart3 className="w-7 h-7" />
        Dashboard
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
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
