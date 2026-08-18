import { supabase } from './supabaseClient';

export const PUBLIC_VAPID_KEY = 'BPF8tXi5xHpYWNpZEBshlY25tgNwaBM1dMZjQ9PqhuROqd2yG1T_ovcNTjOcft_mKh3YwfVBRhBkwPdI91v9K4o';

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('web_push_device_id');
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'dev_' + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('web_push_device_id', deviceId);
  }
  return deviceId;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkPushSubscriptionStatus(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch (e) {
    return false;
  }
}

export async function subscribeUserToPush(): Promise<{ success: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Este navegador o dispositivo no soporta notificaciones Web Push PWA.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permiso de notificaciones denegado en el navegador.' };
    }

    // Register & update custom Web Push Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await registration.update();
    await navigator.serviceWorker.ready;

    // Unsubscribe existing stale subscription to force a fresh VAPID subscription
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (e) {
        /* ignore */
      }
    }

    const convertedKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'No se pudieron extraer las claves VAPID de la suscripción.' };
    }

    const deviceId = getOrCreateDeviceId();
    const nowIso = new Date().toISOString();

    // Upsert into Supabase push_subscriptions table deduplicated by device_id
    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        device_id: deviceId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: nowIso,
        created_at: nowIso
      },
      { onConflict: 'device_id' }
    );

    if (dbError) {
      console.error('Error al guardar suscripción Push en Supabase:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error al suscribir a Web Push:', e);
    return { success: false, error: e.message || 'Error al configurar suscripción Push' };
  }
}

/**
 * Verificación y auto-re-suscripción transparente:
 * 1. Si el permiso está concedido y getSubscription() es null -> auto-re-suscribe en silencio.
 * 2. Si forceRefresh es true o la suscripción fue borrada en Supabase (ej. tras error 410 APNs/FCM por inactividad) -> fuerza una suscripción nueva limpia con el servicio Push.
 * 3. Si existe la suscripción local y está presente en Supabase -> asegura que esté sincronizada.
 */
export async function ensurePushSubscriptionSync(forceRefresh = false): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (typeof Notification === 'undefined') return false;

  // Si no hay permiso concedido, el usuario requiere interacción manual
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    if (forceRefresh) {
      console.log('🔄 Forzando re-suscripción limpia de Web Push...');
      const res = await subscribeUserToPush();
      return res.success;
    }

    let sub = await registration.pushManager.getSubscription();

    // Caso A: El token expiró o iOS lo borró (getSubscription() == null) PERO permiso sigue concedido
    if (!sub) {
      console.log('🔄 Re-suscribiendo automáticamente en silencio (Permiso previamente concedido)...');
      const res = await subscribeUserToPush();
      return res.success;
    }

    // Caso B: Existe suscripción local -> verificar presencia en Supabase
    const subJson = sub.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      const res = await subscribeUserToPush();
      return res.success;
    }

    const deviceId = getOrCreateDeviceId();

    // Verificar si esta suscripción o device_id ya existe en Supabase
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('device_id', deviceId)
      .maybeSingle();

    // Si fue eliminada de Supabase (ej. tras error 410 por inactividad de varios días) -> Re-suscribir desde cero
    if (error || !data) {
      console.log('🔄 Suscripción eliminada o no encontrada en Supabase. Forzando re-suscripción nueva...');
      const res = await subscribeUserToPush();
      return res.success;
    }

    // Si el endpoint local difiere del de Supabase -> hacer upsert del actual
    if (data.endpoint !== endpoint) {
      console.log('🔄 Sincronizando suscripción Push existente con Supabase...');
      const nowIso = new Date().toISOString();
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          device_id: deviceId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          updated_at: nowIso
        },
        { onConflict: 'device_id' }
      );

      if (dbError) {
        console.error('Error al sincronizar suscripción en Supabase:', dbError);
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error('Error en ensurePushSubscriptionSync:', e);
    return false;
  }
}

