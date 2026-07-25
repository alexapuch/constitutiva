import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Clock, BellRing } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../utils/supabaseClient';
import { subscribeUserToPush, checkPushSubscriptionStatus } from '../utils/webPush';

const BIRD_DURATION_SEC = 50 * 60; // 50 minutes
const HERB_DURATION_SEC = 80 * 60; // 80 minutes

export default function OSRS() {
  const navigate = useNavigate();

  // Mounted flag to disable CSS transition on first paint
  const [isMounted, setIsMounted] = useState(false);

  // Current timestamp tick state (initialized lazily before first render)
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Bird Run State
  const [birdTarget, setBirdTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_bird_target');
    return saved ? parseInt(saved, 10) : null;
  });
  const [lastBirdCompleted, setLastBirdCompleted] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_bird_last_completed');
    return saved ? parseInt(saved, 10) : null;
  });

  // Herb Run State
  const [herbTarget, setHerbTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_herb_target');
    return saved ? parseInt(saved, 10) : null;
  });
  const [lastHerbCompleted, setLastHerbCompleted] = useState<number | null>(() => {
    const saved = localStorage.getItem('osrs_herb_last_completed');
    return saved ? parseInt(saved, 10) : null;
  });

  // Dev mode for quick testing
  const [devMode, setDevMode] = useState(false);

  // Web Push Subscription state
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  // Audio Context ref to avoid recreating AudioContext repeatedly
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  // Single tick interval to drive all countdowns efficiently
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notification trigger helper (Audio Chime when open + Trigger Server Cron)
  const triggerNotification = async (type: 'bird' | 'herb') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
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

    try {
      await fetch('/api/osrs/cron', { method: 'POST' });
    } catch (e) {
      /* ignore */
    }
  };

  // Derived time remaining calculations (pure functions)
  const calcRemainingSec = (target: number | null) => {
    if (!target) return 0;
    return Math.max(0, Math.floor((target - now) / 1000));
  };

  const birdTimeLeft = calcRemainingSec(birdTarget);
  const herbTimeLeft = calcRemainingSec(herbTarget);

  // Check for completion notification trigger
  useEffect(() => {
    if (birdTarget && birdTimeLeft === 0) {
      const lastNotified = localStorage.getItem('osrs_bird_notified');
      if (lastNotified !== birdTarget.toString()) {
        localStorage.setItem('osrs_bird_notified', birdTarget.toString());
        triggerNotification('bird');
      }
    }
    if (herbTarget && herbTimeLeft === 0) {
      const lastNotified = localStorage.getItem('osrs_herb_notified');
      if (lastNotified !== herbTarget.toString()) {
        localStorage.setItem('osrs_herb_notified', herbTarget.toString());
        triggerNotification('herb');
      }
    }
  }, [birdTarget, birdTimeLeft, herbTarget, herbTimeLeft]);

  // Helper for medieval-styled centered alerts
  const showMedievalAlert = (title: string, text: string, icon: 'success' | 'error' | 'info' = 'success') => {
    Swal.fire({
      title: `<span style="font-family: 'MedievalSharp', serif; color: #EFC96A; font-size: 20px; text-shadow: 1px 1px 2px #000;">${title}</span>`,
      html: `<div style="font-family: 'MedievalSharp', serif; color: #F0DEB2; font-size: 14px; margin-top: 6px; line-height: 1.4;">${text}</div>`,
      icon: icon,
      iconColor: icon === 'success' ? '#E8C05A' : '#EF4444',
      timer: 2200,
      showConfirmButton: false,
      position: 'center',
      background: '#18120c',
      customClass: {
        popup: 'border-2 border-[#D6A043] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] max-w-[90vw] sm:max-w-md'
      }
    });
  };

  // Handle subscribing device to VAPID Web Push
  const handleSubscribePush = async () => {
    setSubscribingPush(true);
    const res = await subscribeUserToPush();
    setSubscribingPush(false);
    if (res.success) {
      setIsPushSubscribed(true);
      showMedievalAlert(
        '🔔 ¡Notificaciones Activadas!',
        'Tu dispositivo recibirá notificaciones nativas cuando termine un timer, ¡incluso con la app cerrada!'
      );
    } else {
      showMedievalAlert(
        '⚠️ Error de Suscripción',
        res.error || 'No se pudo activar la suscripción a notificaciones.',
        'error'
      );
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

    // Instant Optimistic State & Storage Update
    setBirdTarget(target);
    setLastBirdCompleted(nowMs);
    localStorage.setItem('osrs_bird_target', target.toString());
    localStorage.setItem('osrs_bird_last_completed', nowMs.toString());
    localStorage.removeItem('osrs_bird_notified');

    showMedievalAlert(
      '🐥 ¡Bird Run Iniciado!',
      `Timer configurado a ${devMode ? '15 seg' : '50 minutos'}. ¡Recibirás una notificación cuando esté listo!`
    );

    // Parallel background persistence
    Promise.all([
      supabase.from('osrs_timers').delete().eq('type', 'bird_run').then(() =>
        supabase.from('osrs_timers').insert({ type: 'bird_run', ends_at: endsAt, notified: false })
      ),
      fetch('/api/osrs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bird', durationSeconds: seconds })
      })
    ]).catch(console.error);
  };

  // Stop Bird Run
  const handleStopBird = async () => {
    setBirdTarget(null);
    localStorage.removeItem('osrs_bird_target');
    localStorage.removeItem('osrs_bird_notified');

    Promise.all([
      supabase.from('osrs_timers').delete().eq('type', 'bird_run'),
      fetch('/api/osrs/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bird' })
      })
    ]).catch(console.error);
  };

  // Start / Reset Herb Run
  const handleStartHerb = async () => {
    const nowMs = Date.now();
    const seconds = devMode ? 20 : HERB_DURATION_SEC;
    const target = nowMs + seconds * 1000;
    const endsAt = new Date(target).toISOString();

    // Instant Optimistic State & Storage Update
    setHerbTarget(target);
    setLastHerbCompleted(nowMs);
    localStorage.setItem('osrs_herb_target', target.toString());
    localStorage.setItem('osrs_herb_last_completed', nowMs.toString());
    localStorage.removeItem('osrs_herb_notified');

    showMedievalAlert(
      '🌿 ¡Herb Run Iniciado!',
      `Timer configurado a ${devMode ? '20 seg' : '80 minutos'}. ¡Recibirás una notificación cuando esté listo!`
    );

    // Parallel background persistence
    Promise.all([
      supabase.from('osrs_timers').delete().eq('type', 'herb_patch').then(() =>
        supabase.from('osrs_timers').insert({ type: 'herb_patch', ends_at: endsAt, notified: false })
      ),
      fetch('/api/osrs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'herb', durationSeconds: seconds })
      })
    ]).catch(console.error);
  };

  // Stop Herb Run
  const handleStopHerb = async () => {
    setHerbTarget(null);
    localStorage.removeItem('osrs_herb_target');
    localStorage.removeItem('osrs_herb_notified');

    Promise.all([
      supabase.from('osrs_timers').delete().eq('type', 'herb_patch'),
      fetch('/api/osrs/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'herb' })
      })
    ]).catch(console.error);
  };

  // Calculate progress % directly from target timestamp and now
  const getProgress = (target: number | null, durationSec: number) => {
    if (!target) return 0;
    const totalMs = durationSec * 1000;
    const remainingMs = target - now;
    if (remainingMs <= 0) return 100;
    if (remainingMs >= totalMs) return 0;
    const elapsedMs = totalMs - remainingMs;
    return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  };

  const birdProgress = getProgress(birdTarget, devMode ? 15 : BIRD_DURATION_SEC);
  const herbProgress = getProgress(herbTarget, devMode ? 20 : HERB_DURATION_SEC);

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950 relative" style={{ backgroundColor: '#120c06' }}>
      {/* Header with iOS Safe Area Notch Padding */}
      <header
        className="bg-transparent border-b border-amber-900/40 sticky top-0 z-20 px-4 md:px-8 shadow-none transition-all"
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
                  }}
                />
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
        className="flex-1 max-w-4xl w-full mx-auto px-6 py-4 md:p-6 space-y-6 z-10"
        style={{
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))'
        }}
      >

        {/* Timers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: BIRD RUNS */}
          <div 
            className="transition-all px-7 pt-6 pb-11 sm:px-10 sm:pt-7 sm:pb-12 flex flex-col justify-between relative bg-no-repeat w-full mx-auto min-h-[270px]"
            style={{ 
              backgroundColor: '#1c140b',
              backgroundImage: "url('/card-bg.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center"
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between pt-1 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-[46px] h-[46px] rounded-xl border flex items-center justify-center text-amber-400 text-lg shrink-0 overflow-hidden relative shadow-sm"
                    style={{
                      backgroundColor: 'rgba(36, 23, 8, 0.82)',
                      borderColor: 'rgba(196, 133, 42, 0.45)'
                    }}
                  >
                    <img 
                      src="/birdhouse-logo.png" 
                      alt="Bird House" 
                      className="w-full h-full object-contain p-1.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
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
              <div className="bg-black/85 rounded-xl px-4 py-3 border border-[#39230C] text-center relative overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div 
                  className="text-3xl sm:text-4xl font-bold font-['Canterbury','Cormorant_Garamond',serif] tracking-widest leading-none py-1"
                  style={{
                    background: 'linear-gradient(180deg, #EFC96A 0%, #D6A23A 50%, #8E5A16 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {birdTarget ? formatTime(birdTimeLeft) : '50:00'}
                </div>
                <div className="text-xs mt-1 flex flex-col items-center gap-0.5 font-medium" style={{ color: '#B6B2A6' }}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: '#B6B2A6' }} />
                    {birdTarget ? (birdTimeLeft > 0 ? `Termina a las: ${formatClockTime(birdTarget)}` : '¡Listo para recolectar!') : 'Timer inactivo'}
                  </div>
                  {lastBirdCompleted && (
                    <span className="text-[10px] font-mono mt-0.5" style={{ color: '#B6B2A6' }}>
                      Última recolección: {formatClockTime(lastBirdCompleted)}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full mt-2 overflow-hidden border border-[#39230C]" style={{ backgroundColor: '#17130F' }}>
                  <div
                    className={`h-full rounded-full ${isMounted ? 'transition-[width] duration-500 ease-linear' : '!transition-none'}`}
                    style={{ width: `${birdProgress}%`, backgroundColor: '#A46F21' }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 mt-0.5 sm:mt-1 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
              <button
                onClick={handleStartBird}
                style={{
                  background: 'linear-gradient(180deg, #A87422 0%, #7C5119 50%, #57330E 100%)',
                  borderColor: '#D6A043',
                  color: '#F0DEB2'
                }}
                className="w-full py-2.5 hover:brightness-110 active:scale-[0.98] font-bold text-xs sm:text-sm rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border transition-all flex items-center justify-center gap-2 cursor-pointer font-['MedievalSharp',serif] tracking-wide"
              >
                {birdTarget ? (
                  <>
                    <RotateCcw className="w-4 h-4" style={{ color: '#E8C05A' }} />
                    Completar & Reiniciar (50m)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" style={{ fill: '#E8C05A', color: '#E8C05A' }} />
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
            className="transition-all px-7 pt-6 pb-11 sm:px-10 sm:pt-7 sm:pb-12 flex flex-col justify-between relative bg-no-repeat w-full mx-auto min-h-[270px]"
            style={{ 
              backgroundColor: '#0c1a12',
              backgroundImage: "url('/card-bg.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center"
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between pt-1 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-[46px] h-[46px] rounded-xl border flex items-center justify-center text-emerald-400 text-lg shrink-0 overflow-hidden relative shadow-sm"
                    style={{
                      backgroundColor: 'rgba(7, 26, 18, 0.82)',
                      borderColor: 'rgba(0, 145, 95, 0.45)'
                    }}
                  >
                    <img 
                      src="/herb-logo.png" 
                      alt="Herb Run" 
                      className="w-full h-full object-contain p-1.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
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
              <div className="bg-black/85 rounded-xl px-4 py-3 border border-[#1F2E22] text-center relative overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] w-full max-w-[260px] sm:max-w-[290px] mx-auto">
                <div 
                  className="text-3xl sm:text-4xl font-bold font-['Canterbury','Cormorant_Garamond',serif] tracking-widest leading-none py-1"
                  style={{
                    background: 'linear-gradient(180deg, #9AD8A4 0%, #72B07D 50%, #43644A 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {herbTarget ? formatTime(herbTimeLeft) : '1h 20m'}
                </div>
                <div className="text-xs mt-1 flex flex-col items-center gap-0.5 font-medium" style={{ color: '#B6B2A6' }}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: '#B6B2A6' }} />
                    {herbTarget ? (herbTimeLeft > 0 ? `Termina a las: ${formatClockTime(herbTarget)}` : '¡Listo para cosechar!') : 'Timer inactivo'}
                  </div>
                  {lastHerbCompleted && (
                    <span className="text-[10px] font-mono mt-0.5" style={{ color: '#B6B2A6' }}>
                      Última recolección: {formatClockTime(lastHerbCompleted)}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full mt-2 overflow-hidden border border-[#1F2E22]" style={{ backgroundColor: '#17130F' }}>
                  <div
                    className={`h-full rounded-full ${isMounted ? 'transition-[width] duration-500 ease-linear' : '!transition-none'}`}
                    style={{ width: `${herbProgress}%`, backgroundColor: '#497055' }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 mt-0.5 sm:mt-1 w-full max-w-[260px] sm:max-w-[290px] mx-auto">
              <button
                onClick={handleStartHerb}
                style={{
                  background: 'linear-gradient(180deg, #4E8B63 0%, #356948 50%, #234432 100%)',
                  borderColor: '#7CB086',
                  color: '#D6E3CE'
                }}
                className="w-full py-2.5 hover:brightness-110 active:scale-[0.98] font-bold text-xs sm:text-sm rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border transition-all flex items-center justify-center gap-2 cursor-pointer font-['MedievalSharp',serif] tracking-wide"
              >
                {herbTarget ? (
                  <>
                    <RotateCcw className="w-4 h-4" style={{ color: '#A5C8A2' }} />
                    Completar & Reiniciar (80m)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" style={{ fill: '#A5C8A2', color: '#A5C8A2' }} />
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
