import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Protección Civil</h1>
          <p className="text-gray-500">Sistema de Actas Constitutivas</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/acta')}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-medium transition-colors"
          >
            <Users className="w-6 h-6" />
            Ingresar como Usuario
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-xl font-medium transition-colors"
          >
            <Shield className="w-6 h-6" />
            Ingresar como Administrador
          </button>
        </div>

        <div className="text-gray-400 text-sm mt-4">
          v1.9
        </div>
      </div>
    </div>
  );
}
