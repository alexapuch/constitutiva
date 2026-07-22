import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Feather, Sprout, Play, RotateCcw, Send, CheckCircle2, Clock, BellRing, Sparkles } from 'lucide-react';
import Swal from 'sweetalert2';

const BIRD_DURATION_SEC = 50 * 60; // 50 minutes
const HERB_DURATION_SEC = 80 * 60; // 80 minutes

export default function OSRS() {
  const navigate = useNavigate();

  // Bird Run State
  const [birdTarget, setBirdTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_bird_target');
    return saved ? parseInt(saved, 10) : null;
  });
  const [birdTimeLeft, setBirdTimeLeft] = useState<number>(0);

  // Herb Run State
  const [herbTarget, setHerbTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_herb_target');
    return saved ? parseInt(saved, 10) : null;
  });
  const [herbTimeLeft, setHerbTimeLeft] = useState<number>(0);

  // Dev mode for quick testing
  const [devMode, setDevMode] = useState(false);

  // Sending indicator
  const [testingMsg, setTestingMsg] = useState(false);

  // Tick effect for timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (birdTarget) {
        const remaining = Math.max(0, Math.floor((birdTarget - now) / 1000));
        setBirdTimeLeft(remaining);
      } else {
        setBirdTimeLeft(0);
      }

      if (herbTarget) {
        const remaining = Math.max(0, Math.floor((herbTarget - now) / 1000));
        setHerbTimeLeft(remaining);
      } else {
        setHerbTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [birdTarget, herbTarget]);

  // Start / Reset Bird Run
  const handleStartBird = async () => {
    const seconds = devMode ? 15 : BIRD_DURATION_SEC;
    const target = Date.now() + seconds * 1000;
    setBirdTarget(target);
    localStorage.setItem('osrs_bird_target', target.toString());

    try {
      await fetch('/api/osrs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bird', durationSeconds: seconds })
      });
      Swal.fire({
        icon: 'success',
        title: '¡Bird Run Iniciado!',
        text: `Timer configurado a ${devMode ? '15 seg' : '50 minutos'}. Recibirás un WhatsApp al finalizar.`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Stop Bird Run
  const handleStopBird = async () => {
    setBirdTarget(null);
    localStorage.removeItem('osrs_bird_target');
    try {
      await fetch('/api/osrs/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bird' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Start / Reset Herb Run
  const handleStartHerb = async () => {
    const seconds = devMode ? 20 : HERB_DURATION_SEC;
    const target = Date.now() + seconds * 1000;
    setHerbTarget(target);
    localStorage.setItem('osrs_herb_target', target.toString());

    try {
      await fetch('/api/osrs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'herb', durationSeconds: seconds })
      });
      Swal.fire({
        icon: 'success',
        title: '¡Herb Run Iniciado!',
        text: `Timer configurado a ${devMode ? '20 seg' : '80 minutos'}. Recibirás un WhatsApp al finalizar.`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Stop Herb Run
  const handleStopHerb = async () => {
    setHerbTarget(null);
    localStorage.removeItem('osrs_herb_target');
    try {
      await fetch('/api/osrs/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'herb' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Test CallMeBot WhatsApp
  const handleTestWhatsApp = async () => {
    setTestingMsg(true);
    try {
      const res = await fetch('/api/osrs/test', { method: 'POST' });
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡WhatsApp Enviado!',
          text: 'Se envió la notificación de prueba a tu celular por CallMeBot.',
          confirmButtonColor: '#0B152A'
        });
      } else {
        throw new Error('Error al enviar');
      }
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Error de envío',
        text: 'No se pudo contactar con CallMeBot.'
      });
    } finally {
      setTestingMsg(false);
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const birdProgress = birdTarget
    ? Math.min(100, Math.max(0, 100 - (birdTimeLeft / (devMode ? 15 : BIRD_DURATION_SEC)) * 100))
    : 0;

  const herbProgress = herbTarget
    ? Math.min(100, Math.max(0, 100 - (herbTimeLeft / (devMode ? 20 : HERB_DURATION_SEC)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-amber-900/30 backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-700 cursor-pointer"
            title="Volver al Panel Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-inner">
              🗡️
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-500 tracking-wider">
                OSRS TIMERS
              </h1>
              <p className="text-xs text-amber-500/70 font-medium">Bird Houses & Herb Runs Notifier</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestWhatsApp}
            disabled={testingMsg}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs md:text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className={`w-4 h-4 ${testingMsg ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">Probar</span> WhatsApp
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Banner Alert */}
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/30 rounded-2xl p-4 md:p-5 flex items-start gap-4 shadow-xl relative overflow-hidden">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-bold text-amber-200 flex items-center gap-2">
              Notificaciones por CallMeBot <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
              Las notificaciones están configuradas a tu número de WhatsApp. Cuando termine un timer, recibirás el mensaje automáticamente. Si expira y no reinicias el timer, recibirás un recordatorio cada <strong>45 minutos</strong>.
            </p>
          </div>
          {/* Dev Mode Switch */}
          <button
            onClick={() => setDevMode(!devMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              devMode
                ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {devMode ? '🧪 Modo Prueba (15s/20s)' : 'Modo Normal'}
          </button>
        </div>

        {/* Timers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: BIRD RUNS */}
          <div className="bg-slate-900/90 border border-amber-900/40 hover:border-amber-500/40 transition-all rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            {/* Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600"></div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
                    🐥
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      Bird Houses
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Timer de 50 minutos</p>
                  </div>
                </div>
                {birdTarget && birdTimeLeft === 0 && (
                  <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold rounded-full animate-bounce">
                    ¡LISTO!
                  </span>
                )}
              </div>

              {/* Timer Display */}
              <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 text-center relative overflow-hidden my-4">
                <div className="text-4xl md:text-5xl font-black font-mono tracking-wider text-amber-400 drop-shadow-md">
                  {birdTarget ? formatTime(birdTimeLeft) : '50:00'}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {birdTarget ? (birdTimeLeft > 0 ? 'En progreso...' : '¡Listo para recolectar!') : 'Timer inactivo'}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${birdProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mt-4">
              <button
                onClick={handleStartBird}
                className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 active:scale-[0.98] text-slate-950 font-extrabold text-base md:text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {birdTarget ? (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Completar & Reiniciar (50m)
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-slate-950" />
                    Iniciar Bird Run (50m)
                  </>
                )}
              </button>

              {birdTarget && (
                <button
                  onClick={handleStopBird}
                  className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-red-400 font-semibold text-xs rounded-xl transition-all border border-slate-700/50 cursor-pointer"
                >
                  Detener Timer
                </button>
              )}
            </div>
          </div>

          {/* CARD 2: HERB RUNS */}
          <div className="bg-slate-900/90 border border-emerald-900/40 hover:border-emerald-500/40 transition-all rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            {/* Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-600"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shadow-inner">
                    🌿
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      Herb Runs
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Timer de 80 minutos</p>
                  </div>
                </div>
                {herbTarget && herbTimeLeft === 0 && (
                  <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold rounded-full animate-bounce">
                    ¡LISTO!
                  </span>
                )}
              </div>

              {/* Timer Display */}
              <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 text-center relative overflow-hidden my-4">
                <div className="text-4xl md:text-5xl font-black font-mono tracking-wider text-emerald-400 drop-shadow-md">
                  {herbTarget ? formatTime(herbTimeLeft) : '1h 20m'}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  {herbTarget ? (herbTimeLeft > 0 ? 'En progreso...' : '¡Listo para cosechar!') : 'Timer inactivo'}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-green-400 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${herbProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mt-4">
              <button
                onClick={handleStartHerb}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98] text-slate-950 font-extrabold text-base md:text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {herbTarget ? (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Completar & Reiniciar (80m)
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-slate-950" />
                    Iniciar Herb Run (80m)
                  </>
                )}
              </button>

              {herbTarget && (
                <button
                  onClick={handleStopHerb}
                  className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-red-400 font-semibold text-xs rounded-xl transition-all border border-slate-700/50 cursor-pointer"
                >
                  Detener Timer
                </button>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
