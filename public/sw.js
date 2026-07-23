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
