import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../utils/supabaseClient';
import Swal from 'sweetalert2';

export default function AdminLoginForm({ onLogin }: { onLogin?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [token, setToken] = useState('');
    const ADMIN_EMAIL = 'alexapuch@hotmail.com';

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email: ADMIN_EMAIL,
            options: {
                shouldCreateUser: true,
            }
        });
        setLoading(false);
        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            setEmailSent(true);
            Swal.fire('Código enviado', `Revisa el correo ${ADMIN_EMAIL}`, 'success');
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email: ADMIN_EMAIL,
            token,
            type: 'email'
        });
        setLoading(false);

        if (error) {
            Swal.fire('Error', 'Código inválido o expirado.', 'error');
        } else if (data.session) {
            if (onLogin) onLogin();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                onSubmit={emailSent ? handleVerifyOtp : handleSendEmail}
                className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 space-y-6"
            >
                <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-blue-900 tracking-tight">Acceso Administrador</h2>
                    <p className="text-blue-600 font-medium text-sm mt-2">
                        {emailSent ? 'Ingresa el código enviado a tu correo' : 'Solicita un código de acceso a tu correo'}
                    </p>
                </div>
                
                {emailSent ? (
                    <div>
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full border border-blue-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-blue-900 placeholder:text-blue-300 shadow-inner text-center font-bold tracking-widest text-lg"
                            placeholder="Ej. 123456"
                            autoFocus
                        />
                    </div>
                ) : (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-center font-medium">
                        {ADMIN_EMAIL}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || (emailSent && token.length < 6)}
                    className="w-full bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white p-4 rounded-xl font-bold text-lg transition-colors shadow-md min-h-[56px] disabled:opacity-50"
                >
                    {loading ? 'Procesando...' : (emailSent ? 'Verificar y Entrar' : 'Enviar código al correo')}
                </button>
                
                {emailSent && (
                    <button
                        type="button"
                        onClick={() => setEmailSent(false)}
                        className="w-full mt-2 text-sm text-blue-500 hover:underline"
                    >
                        Reenviar código
                    </button>
                )}

                <Link
                    to="/"
                    className="block text-center w-full text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors py-2 mt-4"
                >
                    Volver al inicio
                </Link>
            </motion.form>
        </div>
    );
}
