import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../utils/supabaseClient';
import Swal from 'sweetalert2';

export default function AdminLoginForm({ onLogin }: { onLogin?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [token, setToken] = useState('');
    const [usePasswordMode, setUsePasswordMode] = useState(false);
    const [password, setPassword] = useState('');
    const ADMIN_EMAIL = 'alexapuch@hotmail.com';
    const MASTER_PASSWORD = 'ammp98puchi';

    const handleMasterPasswordLogin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password.trim().toLowerCase() === MASTER_PASSWORD) {
            localStorage.setItem('adminAuth', 'true');
            if (onLogin) onLogin();
            Swal.fire({
                icon: 'success',
                title: '¡Acceso Concedido!',
                text: 'Has ingresado con la Contraseña Maestra.',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Contraseña Incorrecta',
                text: 'La contraseña introducida no es válida.',
                confirmButtonColor: '#1e3a8a'
            });
        }
    };

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
            console.error('OTP Error:', error);
            const isRateLimit = error.message.toLowerCase().includes('rate limit') || error.status === 429;
            
            if (isRateLimit) {
                setUsePasswordMode(true);
                Swal.fire({
                    icon: 'warning',
                    title: 'Límite de correos superado (Rate Limit)',
                    text: 'Se ha alcanzado el límite de envíos por correo de Supabase. Puedes ingresar escribiendo tu Contraseña Maestra.',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#1e3a8a'
                });
            } else {
                Swal.fire({
                    title: 'Error de Envío',
                    text: `${error.message}. ¿Deseas ingresar usando tu Contraseña Maestra?`,
                    icon: 'error',
                    showCancelButton: true,
                    confirmButtonText: 'Usar Contraseña',
                    cancelButtonText: 'Reintentar',
                    confirmButtonColor: '#1e3a8a'
                }).then((res) => {
                    if (res.isConfirmed) setUsePasswordMode(true);
                });
            }
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
            Swal.fire({
                title: 'Código Incorrecto',
                text: 'Código inválido o expirado. ¿Deseas ingresar usando tu Contraseña Maestra?',
                icon: 'error',
                showCancelButton: true,
                confirmButtonText: 'Usar Contraseña',
                cancelButtonText: 'Cerrar',
                confirmButtonColor: '#1e3a8a'
            }).then((res) => {
                if (res.isConfirmed) setUsePasswordMode(true);
            });
        } else if (data.session) {
            localStorage.setItem('adminAuth', 'true');
            if (onLogin) onLogin();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                onSubmit={usePasswordMode ? handleMasterPasswordLogin : (emailSent ? handleVerifyOtp : handleSendEmail)}
                className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 space-y-6"
            >
                <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-blue-900 tracking-tight">Acceso Administrador</h2>
                    <p className="text-blue-600 font-medium text-sm mt-2">
                        {usePasswordMode 
                            ? 'Ingresa tu Contraseña Maestra'
                            : (emailSent ? 'Ingresa el código enviado a tu correo' : 'Solicita un código de acceso a tu correo')
                        }
                    </p>
                </div>
                
                {usePasswordMode ? (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
                            Contraseña Maestra
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-blue-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-blue-900 placeholder:text-blue-300 shadow-inner text-center font-bold tracking-wider text-lg"
                            placeholder="••••••••••••"
                            autoFocus
                        />
                    </div>
                ) : emailSent ? (
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
                    disabled={loading || (usePasswordMode && !password.trim()) || (emailSent && !usePasswordMode && token.length < 6)}
                    className="w-full bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white p-4 rounded-xl font-bold text-lg transition-colors shadow-md min-h-[56px] disabled:opacity-50 cursor-pointer"
                >
                    {loading ? 'Procesando...' : (usePasswordMode ? 'Entrar con Contraseña' : (emailSent ? 'Verificar y Entrar' : 'Enviar código al correo'))}
                </button>
                
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setUsePasswordMode(!usePasswordMode);
                            setPassword('');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer py-1"
                    >
                        {usePasswordMode ? '← Volver al acceso por correo' : '🔑 Ingresar con Contraseña Maestra'}
                    </button>

                    {emailSent && !usePasswordMode && (
                        <button
                            type="button"
                            onClick={() => setEmailSent(false)}
                            className="text-xs text-gray-500 hover:underline"
                        >
                            Reenviar código por correo
                        </button>
                    )}
                </div>

                <Link
                    to="/"
                    className="block text-center w-full text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors py-2"
                >
                    Volver al inicio
                </Link>
            </motion.form>
        </div>
    );
}
