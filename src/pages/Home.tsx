import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Protección Civil</h1>
          <p className="text-gray-500">Sistema de Actas Constitutivas</p>
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
                className="w-full border border-blue-200 rounded-lg p-3 text-center uppercase tracking-widest font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <button
                onClick={() => {
                  if (code.trim()) {
                    navigate(`/acta?code=${code.trim()}`);
                  }
                }}
                disabled={!code.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Abrir Documento
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-xl font-medium transition-colors"
          >
            <Shield className="w-6 h-6" />
            Ingresar como Administrador
          </button>
        </div>

        <div className="text-gray-400 text-sm mt-4">
          v1.14
        </div>
      </div>
    </div>
  );
}
