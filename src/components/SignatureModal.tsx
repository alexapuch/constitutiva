import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X } from 'lucide-react';
import { compressSignature } from '../utils/compressSignature';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, role: string, brigade: string, signatureData: string) => Promise<void>;
}

export default function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('EMPLEADO');
    const [brigade] = useState('MULTIBRIGADA');
    const [isSaving, setIsSaving] = useState(false);
    const sigCanvas = useRef<SignatureCanvas>(null);

    if (!isOpen) return null;

    const handleSaveSignature = async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            Swal.fire({
                icon: 'warning',
                title: 'Firma requerida',
                text: 'Por favor, dibuja tu firma antes de guardar.'
            });
            return;
        }

        if (!name.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Nombre requerido',
                text: 'Por favor, ingresa tu nombre completo antes de guardar.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const rawSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
            const signatureData = await compressSignature(rawSignature, 300, 0.6);

            await onSave(name.trim().toUpperCase(), role, brigade, signatureData);

            // Clear form after success
            setName('');
            setRole('EMPLEADO');
            sigCanvas.current.clear();
            onClose();
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un error al guardar la firma.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="text-lg font-bold">Agregar mi firma</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Puesto en la Empresa</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="EMPLEADO">EMPLEADO</option>
                                    <option value="REPRESENTANTE LEGAL">REPRESENTANTE LEGAL</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brigada que Integra</label>
                                <input
                                    type="text"
                                    readOnly
                                    value="MULTIBRIGADA"
                                    className="w-full border border-gray-200 bg-gray-100 rounded-md p-2 text-gray-600 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                    <span>Firma</span>
                                    <button
                                        onClick={() => sigCanvas.current?.clear()}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        Limpiar
                                    </button>
                                </label>
                                <div className="border border-gray-300 rounded-md bg-gray-50" style={{ touchAction: 'none' }}>
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        canvasProps={{
                                            className: 'signature-canvas w-full h-40 rounded-md cursor-crosshair',
                                            style: { touchAction: 'none' }
                                        }}
                                        minWidth={1}
                                        maxWidth={2.5}
                                        velocityFilterWeight={0.7}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Firma dentro del recuadro usando tu dedo o mouse.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveSignature}
                            disabled={isSaving}
                            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Firma'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
