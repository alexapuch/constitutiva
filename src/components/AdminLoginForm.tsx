import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function AdminLoginForm({ onLogin }: { onLogin: (password: string) => void }) {
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(password);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 space-y-6"
            >
                <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-blue-900 tracking-tight">Acceso Administrador</h2>
                    <p className="text-blue-600 font-medium text-sm mt-2">Ingresa la contraseña maestra para continuar</p>
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-blue-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-blue-900 placeholder:text-blue-300 shadow-inner"
                        placeholder="Contraseña"
                        autoFocus
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white p-4 rounded-xl font-bold text-lg transition-colors shadow-md min-h-[56px]"
                >
                    Ingresar de forma segura
                </button>
                <Link
                    to="/"
                    className="block text-center w-full text-blue-500 hover:text-blue-800 text-sm font-medium transition-colors py-2"
                >
                    Volver al inicio
                </Link>
            </motion.form>
        </div>
    );
}
