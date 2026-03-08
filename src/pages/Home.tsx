import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-8"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 mb-2 tracking-tight">PROTECCIÓN CIVIL</h1>
          <p className="text-blue-600 font-medium tracking-wide text-sm uppercase">Sistema de Actas Constitutivas</p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6 group">
            <h2 className="flex items-center justify-center gap-2 text-blue-900 font-bold mb-3">
              <Users className="w-5 h-5" />
              Acceso para Usuarios
            </h2>
            <p className="text-sm text-blue-700 mb-4 text-center">
              Ingresa el código único proporcionado por tu administrador para ver y firmar tu acta constitutiva.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Código de Acceso"
                className="w-full border border-blue-200 rounded-lg p-4 text-center uppercase tracking-widest font-bold focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all shadow-inner text-blue-900 placeholder:text-blue-300"
              />
              <button
                onClick={() => {
                  if (code.trim()) {
                    navigate(`/acta?code=${code.trim()}`);
                  }
                }}
                disabled={!code.trim()}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center min-h-[56px]"
              >
                Abrir Documento
              </button>
            </div>
          </div>

          <p
            onClick={() => navigate('/admin')}
            className="text-blue-500 text-sm font-medium cursor-pointer hover:text-blue-800 transition-colors py-2"
          >
            Ingresar como Administrador
          </p>
        </div>

        <div className="text-gray-400 text-sm mt-4">
          v1.14
        </div>
      </motion.div>
    </div>
  );
}
