// Web Push Service Worker for OSRS Timers and PWA Notifications (iOS Safari & Android Compatible)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener for Web Push events from VAPID / server / Supabase Edge Function
self.addEventListener('push', (event) => {
  let data = {
    title: '🐥 ¡Bird Houses Listos!',
    body: 'ya esta listo tus bird houses',
    icon: '/seprisa-logo.png',
    badge: '/seprisa-logo.png',
    url: '/osrs'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  // Simplified options compatible with iOS Safari Web Push & Android
  const options = {
    body: data.body,
    icon: data.icon || '/seprisa-logo.png',
    badge: data.badge || '/seprisa-logo.png',
    data: { url: data.url || '/osrs' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch((err) => {
      console.error('Error in showNotification, trying minimal fallback:', err);
      return self.registration.showNotification(data.title, { body: data.body });
    })
  );
});

// Listener for Push Subscription changes (e.g. when iOS / Safari rotates VAPID token in background)
self.addEventListener('pushsubscriptionchange', (event) => {
  const PUBLIC_VAPID_KEY = 'BPF8tXi5xHpYWNpZEBshlY25tgNwaBM1dMZjQ9PqhuROqd2yG1T_ovcNTjOcft_mKh3YwfVBRhBkwPdI91v9K4o';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  event.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        const subJson = newSub.toJSON();
        const endpoint = subJson.endpoint;
        const p256dh = subJson.keys && subJson.keys.p256dh;
        const auth = subJson.keys && subJson.keys.auth;

        if (!endpoint || !p256dh || !auth) return;

        const supabaseUrl = 'https://hdpqihtbueodtermrqbm.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcHFpaHRidWVvZHRlcm1ycWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzUzNzYsImV4cCI6MjA4NzQ1MTM3Nn0.a1O7rfEnktapsaTb-8xi8aQxuDABYXLLD9VK2DSjcdI';

        await fetch(`${supabaseUrl}/rest/v1/push_subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            endpoint: endpoint,
            p256dh: p256dh,
            auth: auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error('Error in pushsubscriptionchange:', err);
      }
    })()
  );
});

// Listener for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/osrs';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/osrs') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
