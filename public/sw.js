// Web Push Service Worker for OSRS Timers and PWA Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener for Web Push events from VAPID / server / Supabase Edge Function
self.addEventListener('push', (event) => {
  let data = {
    title: '🗡️ OSRS Timers',
    body: '¡Un timer ha finalizado en tu cuenta!',
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

  const options = {
    body: data.body,
    icon: data.icon || '/seprisa-logo.png',
    badge: data.badge || '/seprisa-logo.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/osrs' },
    actions: [
      { action: 'open', title: 'Abrir OSRS Timers' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
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
