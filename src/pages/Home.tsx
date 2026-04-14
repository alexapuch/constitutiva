import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, QrCode, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const currentUrl = window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Cabecera Azul de SEPRISA */}
      <div className="bg-[#0B152A] w-full px-4 md:px-8 pb-4 shadow-md flex items-center justify-between z-10" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-4">
          <div className="bg-transparent rounded-full overflow-hidden w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <img
              src="/seprisa-logo.png"
              alt="Logo SEPRISA"
              className="w-[120%] h-[120%] max-w-none object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-widest uppercase">SEPRISA</h1>
        </div>

        {/* Botón de QR movido a la cabecera */}
        <button
          onClick={() => setShowQrModal(true)}
          className="text-white hover:text-blue-200 bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
          title="Mostrar código QR de la página"
        >
          <QrCode className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center space-y-8 relative"
        >
          <div className="flex flex-col items-center justify-center mt-2">
            <p className="text-red-800 font-extrabold tracking-widest text-[14px] uppercase leading-relaxed text-center">
              Sistema actas constitutivas,<br />cédula de simulacro y constancias
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6 group">
              <h2 className="flex items-center justify-center gap-2 text-blue-900 font-bold mb-3">
                <Users className="w-5 h-5" />
                Acceso para Usuarios
              </h2>
              <p className="text-sm text-blue-700 mb-4 text-center">
                Ingresa el código único proporcionado por tu administrador para ver y firmar tu acta constitutiva, cédula de simulacro, y generar tu constancia.
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
                  className="w-full bg-red-800 hover:bg-red-900 active:bg-red-950 text-white p-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center min-h-[56px]"
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

          <div className="text-gray-400 text-xs mt-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-1.5 w-full">
            <p className="font-semibold text-[#0B152A]/70">&copy; 2026 SEPRISA. Todos los derechos reservados.</p>
            <p>v1.33</p>
          </div>
        </motion.div>
      </div>

      {/* Modal del Código QR */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-sm w-full relative text-center"
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-blue-900 mb-2">Compartir Página</h3>
            <p className="text-sm text-gray-500 mb-6">
              Escanea este código para abrir la página en otro dispositivo.
            </p>

            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 flex justify-center mb-6">
              <img
                src={qrUrl}
                alt="Código QR de la página"
                className="w-48 h-48 object-cover rounded-lg"
              />
            </div>

            <button
              onClick={async () => {
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(currentUrl);
                  } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = currentUrl;
                    textArea.style.position = "absolute";
                    textArea.style.left = "-999999px";
                    document.body.prepend(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    textArea.remove();
                  }
                  import('sweetalert2').then(Swal => {
                    Swal.default.fire({
                      icon: 'success',
                      title: '¡Copiado!',
                      text: '¡Enlace copiado al portapapeles!',
                      timer: 2000,
                      showConfirmButton: false
                    });
                  });
                } catch (e) {
                  import('sweetalert2').then(Swal => {
                    Swal.default.fire({
                      icon: 'error',
                      title: 'Error',
                      text: 'No se pudo copiar el enlace',
                      timer: 2000
                    });
                  });
                }
              }}
              className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 py-3 rounded-lg font-medium transition-colors"
            >
              Copiar Enlace
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
