import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';

interface EditConstanciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  constancia: any;
  onSuccess: () => void;
}

export default function EditConstanciaModal({ isOpen, onClose, constancia, onSuccess }: EditConstanciaModalProps) {
  const [employeeName, setEmployeeName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && constancia) {
      setEmployeeName(constancia.employee_name || '');
      setCommercialName(constancia.commercial_name || '');
      setAddress(constancia.address || '');
      setDate(constancia.date || '');
    }
  }, [isOpen, constancia]);

  const handleSave = async () => {
    if (!employeeName.trim() || !commercialName.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'El nombre del empleado y de la empresa son requeridos.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/constancias/folio/${constancia.folio.replace('/', '-')}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: employeeName.trim().toUpperCase(),
          commercial_name: commercialName.trim().toUpperCase(),
          address: address.trim().toUpperCase(),
          date: date.trim().toUpperCase()
        })
      });

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Guardado', text: 'Constancia actualizada correctamente.', timer: 1500, showConfirmButton: false });
        onSuccess();
        onClose();
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la constancia.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold">Editar Constancia</h3>
                <p className="text-sm text-blue-200 mt-1">Folio: {constancia?.folio}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-blue-800 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Empleado</label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-[16px] dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={commercialName}
                  onChange={(e) => setCommercialName(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-[16px] dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Dirección (Opcional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-[16px] dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value.toUpperCase())}
                    placeholder="Ej: 10 DE MAYO DE 2026"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-[16px] dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                  />
                  <div className="relative">
                    <input
                      type="date"
                      onChange={e => {
                        const iso = e.target.value;
                        if (!iso) return;
                        const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
                        const [yr, mo, dy] = iso.split('-').map(Number);
                        setDate(`${dy} DE ${meses[mo - 1]} DEL ${yr}`);
                        e.target.value = ''; // Reset to allow re-selection
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="h-full px-4 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer transition-colors">
                      📅
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
