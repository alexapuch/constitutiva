import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Feather, Sprout, Play, RotateCcw, Send, CheckCircle2, Clock, BellRing, Sparkles } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../utils/supabaseClient';
import { subscribeUserToPush, checkPushSubscriptionStatus } from '../utils/webPush';

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
  const [lastBirdCompleted, setLastBirdCompleted] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_bird_last_completed');
    return saved ? parseInt(saved, 10) : null;
  });

  // Herb Run State
  const [herbTarget, setHerbTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_herb_target');
    return saved ? parseInt(saved, 10) : null;
  });
  const [herbTimeLeft, setHerbTimeLeft] = useState<number>(0);
  const [lastHerbCompleted, setLastHerbCompleted] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_herb_last_completed');
    return saved ? parseInt(saved, 10) : null;
  });

  // Dev mode for quick testing
  const [devMode, setDevMode] = useState(false);

  // Sending indicator
  const [testingMsg, setTestingMsg] = useState(false);

  // Web Push Subscription state
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  // Sync status & check Push Subscription on mount
  useEffect(() => {
    fetch('/api/osrs/status')
      .then(res => res.json())
      .then(data => {
        if (data.bird?.targetTime && data.bird.status === 'pending') {
          setBirdTarget(data.bird.targetTime);
          localStorage.setItem('osrs_bird_target', data.bird.targetTime.toString());
        }
        if (data.herb?.targetTime && data.herb.status === 'pending') {
          setHerbTarget(data.herb.targetTime);
          localStorage.setItem('osrs_herb_target', data.herb.targetTime.toString());
        }
      })
      .catch(() => { });

    checkPushSubscriptionStatus().then(setIsPushSubscribed);
  }, []);

  // Handle subscribing device to VAPID Web Push
  const handleSubscribePush = async () => {
    setSubscribingPush(true);
    const res = await subscribeUserToPush();
    setSubscribingPush(false);
    if (res.success) {
      setIsPushSubscribed(true);
      Swal.fire({
        icon: 'success',
        title: '¡Notificaciones Web Push PWA Activadas!',
        text: 'Tu dispositivo recibirá notificaciones nativas de Web Push cuando termine un timer, ¡incluso con la app y el navegador cerrados!',
        timer: 3500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Suscripción Push',
        text: res.error || 'No se pudo activar la suscripción Web Push.'
      });
    }
  };

  // Notification trigger helper (Audio Chime when open + Trigger Server Cron)
  const triggerNotification = async (title: string, text: string) => {
    // 1. Audio chime (if browser window is active)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      /* Audio context blocked */
    }

    // 2. Trigger server cron to send WhatsApp + VAPID Web Push
    try {
      await fetch('/api/osrs/cron', { method: 'POST' });
    } catch (e) {
      /* ignore */
    }
  };

  // Tick effect for timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (birdTarget) {
        const remaining = Math.max(0, Math.floor((birdTarget - now) / 1000));
        setBirdTimeLeft(remaining);

        const lastNotified = localStorage.getItem('osrs_bird_notified');
        if (remaining === 0 && lastNotified !== birdTarget.toString()) {
          localStorage.setItem('osrs_bird_notified', birdTarget.toString());
          triggerNotification('🐥 ¡Bird Houses Listos!', 'ya esta listo tus bird houses');
        }
      } else {
        setBirdTimeLeft(0);
      }

      if (herbTarget) {
        const remaining = Math.max(0, Math.floor((herbTarget - now) / 1000));
        setHerbTimeLeft(remaining);

        const lastNotified = localStorage.getItem('osrs_herb_notified');
        if (remaining === 0 && lastNotified !== herbTarget.toString()) {
          localStorage.setItem('osrs_herb_notified', herbTarget.toString());
          triggerNotification('🌿 ¡Herbs Listas!', 'tus herbs ya estan listas para recolectar');
        }
      } else {
        setHerbTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [birdTarget, herbTarget]);

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

  // Format timestamp to 12-hour local clock string (e.g. 09:38 PM)
  const formatClockTime = (timestamp: number | null) => {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Start / Reset Bird Run
  const handleStartBird = async () => {
    const nowMs = Date.now();
    const seconds = devMode ? 15 : BIRD_DURATION_SEC;
    const target = nowMs + seconds * 1000;
    const endsAt = new Date(target).toISOString();
    setBirdTarget(target);
    setLastBirdCompleted(nowMs);
    localStorage.setItem('osrs_bird_target', target.toString());
    localStorage.setItem('osrs_bird_last_completed', nowMs.toString());
    localStorage.removeItem('osrs_bird_notified');

    try {
      // Direct Supabase insert into osrs_timers
      await supabase.from('osrs_timers').delete().eq('type', 'bird_run');
      await supabase.from('osrs_timers').insert({
        type: 'bird_run',
        ends_at: endsAt,
        notified: false
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await fetch('/api/osrs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bird', durationSeconds: seconds })
      });
    } catch (e) {
      console.error(e);
    }

    Swal.fire({
      icon: 'success',
      title: '¡Bird Run Iniciado!',
      text: `Timer configurado a ${devMode ? '15 seg' : '50 minutos'}. Recibirás tu WhatsApp al finalizar.`,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  // Stop Bird Run
  const handleStopBird = async () => {
    setBirdTarget(null);
    localStorage.removeItem('osrs_bird_target');
    localStorage.removeItem('osrs_bird_notified');
    try {
      await supabase.from('osrs_timers').delete().eq('type', 'bird_run');
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
    const nowMs = Date.now();
    const seconds = devMode ? 20 : HERB_DURATION_SEC;
    const target = nowMs + seconds * 1000;
    const endsAt = new Date(target).toISOString();
    setHerbTarget(target);
    setLastHerbCompleted(nowMs);
    localStorage.setItem('osrs_herb_target', target.toString());
    localStorage.setItem('osrs_herb_last_completed', nowMs.toString());
    localStorage.removeItem('osrs_herb_notified');

    try {
      // Direct Supabase insert into osrs_timers
      await supabase.from('osrs_timers').delete().eq('type', 'herb_patch');
      await supabase.from('osrs_timers').insert({
        type: 'herb_patch',
        ends_at: endsAt,
        notified: false
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await fetch('/api/osrs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'herb', durationSeconds: seconds })
      });
    } catch (e) {
      console.error(e);
    }

    Swal.fire({
      icon: 'success',
      title: '¡Herb Run Iniciado!',
      text: `Timer configurado a ${devMode ? '20 seg' : '80 minutos'}. Recibirás tu WhatsApp al finalizar.`,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  // Stop Herb Run
  const handleStopHerb = async () => {
    setHerbTarget(null);
    localStorage.removeItem('osrs_herb_target');
    localStorage.removeItem('osrs_herb_notified');
    try {
      await supabase.from('osrs_timers').delete().eq('type', 'herb_patch');
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

  // Cron Job Helper Modal
  const handleCronHelp = () => {
    const cronUrl = `${window.location.origin}/api/osrs/cron`;
    Swal.fire({
      title: '⚡ Avisos Puntuales 24/7',
      html: `
        <div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.5;">
          <p style="margin-bottom: 12px;">Vercel limita los crons gratuitos en servidores serverless. Para que los mensajes de WhatsApp te lleguen <strong>exactos al minuto sin abrir la página</strong>:</p>
          <ol style="margin-left: 20px; list-style-type: decimal; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;">Entra a <a href="https://cron-job.org" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">cron-job.org</a> (es 100% gratis).</li>
            <li style="margin-bottom: 6px;">Crea un trabajo con frecuencia de <strong>cada 1 minuto</strong> y pégale la siguiente URL:</li>
          </ol>
          <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; font-family: monospace; word-break: break-all; margin: 10px 0; border: 1px solid #cbd5e1; font-weight: bold;">
            ${cronUrl}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 10px;">¡Con esto los avisos llegarán puntualísimos aunque tu celular o PC estén apagados!</p>
        </div>
      `,
      confirmButtonText: 'Copiar URL de Cron',
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#0B152A'
    }).then((result) => {
      if (result.isConfirmed) {
        navigator.clipboard.writeText(cronUrl);
        Swal.fire({
          icon: 'success',
          title: '¡URL Copiada!',
          text: 'Pégala en cron-job.org para activar las alertas automatizadas.',
          timer: 2500,
          showConfirmButton: false
        });
      }
    });
  };

  const birdProgress = birdTarget
    ? Math.min(100, Math.max(0, 100 - (birdTimeLeft / (devMode ? 15 : BIRD_DURATION_SEC)) * 100))
    : 0;

  const herbProgress = herbTarget
    ? Math.min(100, Math.max(0, 100 - (herbTimeLeft / (devMode ? 20 : HERB_DURATION_SEC)) * 100))
    : 0;

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950 relative">
      {/* Fixed Seamless Background Layer */}
      <div id="osrs-bg-fixed" />

      {/* Header with iOS Safe Area Notch Padding */}
      <header
        className="bg-black border-b border-amber-900/60 sticky top-0 z-20 px-4 md:px-8 shadow-2xl transition-all"
        style={{
          paddingTop: 'calc(0.85rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.85rem',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-white transition-all flex items-center justify-center border border-amber-500/50 cursor-pointer shrink-0"
              title="Volver al Panel Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg sm:text-xl shadow-inner shrink-0 overflow-hidden relative">
                <img 
                  src="/osrs-logo.png" 
                  alt="OSRS Logo" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <span className="hidden">🗡️</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-500 tracking-wider leading-tight font-['Cinzel_Decorative',serif]">
                  OSRS TIMERS
                </h1>
                <p className="text-[11px] sm:text-xs text-amber-500/70 font-medium leading-none font-['MedievalSharp',serif] tracking-wider">Bird Houses & Herb Runs</p>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDevMode(!devMode)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer font-['MedievalSharp',serif] ${devMode
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-400/80 hover:text-amber-200'
                }`}
            >
              {devMode ? '🧪 (15s/20s)' : 'Prueba'}
            </button>
            <button
              onClick={handleSubscribePush}
              disabled={subscribingPush}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 border rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer font-['MedievalSharp',serif] ${isPushSubscribed
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-amber-600/30 hover:bg-amber-600/40 border-amber-500 text-amber-200 animate-pulse'
                }`}
              title="Suscripción a Notificaciones Web Push (App Cerrada)"
            >
              <BellRing className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${subscribingPush ? 'animate-spin' : ''}`} />
              <span>{isPushSubscribed ? 'Push Activo' : 'Activar Push PWA'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        className="flex-1 max-w-4xl w-full mx-auto px-3.5 py-4 md:p-6 space-y-6 z-10"
        style={{
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.875rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.875rem, env(safe-area-inset-right, 0px))'
        }}
      >

        {/* Timers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: BIRD RUNS */}
          <div 
            className="transition-all px-7 py-6 sm:px-10 sm:py-8 flex flex-col justify-between relative bg-no-repeat w-full mx-auto min-h-[270px]"
            style={{ 
              backgroundImage: "url('/card-bg.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center"
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shadow-inner shrink-0 overflow-hidden relative">
                    <img 
                      src="/birdhouse-logo.png" 
                      alt="Bird House" 
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                    <span className="hidden">🐥</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-amber-100 group-hover:text-yellow-300 transition-colors font-['MedievalSharp',serif] tracking-wider drop-shadow-md">
                      Bird Houses
                    </h3>
                    <p className="text-[11px] text-amber-300/80 font-semibold">Timer de 50 minutos</p>
                  </div>
                </div>
                {birdTarget && birdTimeLeft === 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold rounded-full animate-bounce font-['MedievalSharp',serif]">
                    ¡LISTO!
                  </span>
                )}
              </div>

              {/* Timer Display */}
              <div className="bg-black/85 rounded-xl px-4 py-3 border border-amber-500/40 text-center relative overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-amber-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  {birdTarget ? formatTime(birdTimeLeft) : '50:00'}
                </div>
                <div className="text-xs text-amber-100/90 mt-1 flex flex-col items-center gap-0.5 font-medium">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {birdTarget ? (birdTimeLeft > 0 ? `Termina a las: ${formatClockTime(birdTarget)}` : '¡Listo para recolectar!') : 'Timer inactivo'}
                  </div>
                  {lastBirdCompleted && (
                    <span className="text-[10px] text-amber-300 font-mono mt-0.5">
                      Última recolección: {formatClockTime(lastBirdCompleted)}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/90 h-2 rounded-full mt-2 overflow-hidden border border-amber-900/60">
                  <div
                    className="bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 h-full transition-all duration-1000 ease-linear rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    style={{ width: `${birdProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 mt-2 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
              <button
                onClick={handleStartBird}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-[0_3px_12px_rgba(245,158,11,0.4)] border border-amber-300/80 transition-all flex items-center justify-center gap-2 cursor-pointer font-['MedievalSharp',serif] tracking-wide"
              >
                {birdTarget ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Completar & Reiniciar (50m)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    Iniciar Bird Run (50m)
                  </>
                )}
              </button>

              {birdTarget && (
                <button
                  onClick={handleStopBird}
                  className="w-full py-1.5 bg-black/70 hover:bg-black/90 text-amber-200/80 hover:text-red-400 font-semibold text-xs rounded-lg transition-all border border-amber-500/30 cursor-pointer font-['MedievalSharp',serif]"
                >
                  Detener Timer
                </button>
              )}
            </div>
          </div>

          {/* CARD 2: HERB RUNS */}
          <div 
            className="transition-all px-7 py-6 sm:px-10 sm:py-8 flex flex-col justify-between relative bg-no-repeat w-full mx-auto min-h-[270px]"
            style={{ 
              backgroundImage: "url('/card-bg.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center"
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg shadow-inner shrink-0 overflow-hidden relative">
                    <img 
                      src="/herb-logo.png" 
                      alt="Herb Run" 
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                    <span className="hidden">🌿</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-emerald-100 group-hover:text-green-300 transition-colors font-['MedievalSharp',serif] tracking-wider drop-shadow-md">
                      Herb Runs
                    </h3>
                    <p className="text-[11px] text-emerald-300/80 font-semibold">Timer de 80 minutos</p>
                  </div>
                </div>
                {herbTarget && herbTimeLeft === 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold rounded-full animate-bounce font-['MedievalSharp',serif]">
                    ¡LISTO!
                  </span>
                )}
              </div>

              {/* Timer Display */}
              <div className="bg-black/85 rounded-xl px-4 py-3 border border-emerald-500/40 text-center relative overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  {herbTarget ? formatTime(herbTimeLeft) : '1h 20m'}
                </div>
                <div className="text-xs text-emerald-100/90 mt-1 flex flex-col items-center gap-0.5 font-medium">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {herbTarget ? (herbTimeLeft > 0 ? `Termina a las: ${formatClockTime(herbTarget)}` : '¡Listo para cosechar!') : 'Timer inactivo'}
                  </div>
                  {lastHerbCompleted && (
                    <span className="text-[10px] text-emerald-300 font-mono mt-0.5">
                      Última recolección: {formatClockTime(lastHerbCompleted)}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/90 h-2 rounded-full mt-2 overflow-hidden border border-emerald-900/60">
                  <div
                    className="bg-gradient-to-r from-emerald-600 via-emerald-400 to-green-300 h-full transition-all duration-1000 ease-linear rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${herbProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 mt-2 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
              <button
                onClick={handleStartHerb}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-[0_3px_12px_rgba(16,185,129,0.4)] border border-emerald-300/80 transition-all flex items-center justify-center gap-2 cursor-pointer font-['MedievalSharp',serif] tracking-wide"
              >
                {herbTarget ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Completar & Reiniciar (80m)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    Iniciar Herb Run (80m)
                  </>
                )}
              </button>

              {herbTarget && (
                <button
                  onClick={handleStopHerb}
                  className="w-full py-1.5 bg-black/70 hover:bg-black/90 text-emerald-200/80 hover:text-red-400 font-semibold text-xs rounded-lg transition-all border border-emerald-500/30 cursor-pointer font-['MedievalSharp',serif]"
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
