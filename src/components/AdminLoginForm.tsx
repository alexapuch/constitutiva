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
                    <h2 className="text-2xl font-bold text-gray-900">Acceso Administrador</h2>
                    <p className="text-gray-500 text-sm mt-2">Ingresa la contraseña para continuar</p>
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Contraseña"
                        autoFocus
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-black text-white p-3 rounded-xl font-medium transition-colors"
                >
                    Ingresar
                </button>
                <Link
                    to="/"
                    className="block text-center w-full text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                    Volver al inicio
                </Link>
            </motion.form>
        </div>
    );
}
