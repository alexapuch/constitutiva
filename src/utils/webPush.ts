import { supabase } from './supabaseClient';

export const PUBLIC_VAPID_KEY = 'BPF8tXi5xHpYWNpZEBshlY25tgNwaBM1dMZjQ9PqhuROqd2yG1T_ovcNTjOcft_mKh3YwfVBRhBkwPdI91v9K4o';

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

    // Register custom Web Push Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'No se pudieron extraer las claves VAPID de la suscripción.' };
    }

    // Upsert into Supabase push_subscriptions table
    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
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
