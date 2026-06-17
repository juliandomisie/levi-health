const CACHE_NAME = 'levi-health-v3';
const STATIC_ASSETS = ['/', '/dashboard', '/sleep', '/nutrition', '/fitness', '/biomarkers', '/coach', '/koerper', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_ALARM') {
    const { time } = event.data;
    self.scheduledAlarm = time;
    checkAlarmLoop();
  }
  if (event.data?.type === 'CLEAR_ALARM') {
    self.scheduledAlarm = null;
  }
});

let alarmInterval = null;

function checkAlarmLoop() {
  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(() => {
    if (!self.scheduledAlarm) { clearInterval(alarmInterval); return; }
    const now = new Date();
    const current = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    if (current === self.scheduledAlarm) {
      self.scheduledAlarm = null;
      clearInterval(alarmInterval);
      self.registration.showNotification('⏰ Wecker – Levi Health', {
        body: 'Guten Morgen! Zeit aufzustehen.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'alarm',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [{ action: 'stop', title: 'Abstellen' }],
      });
    }
  }, 15000);
}

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Levi 🧬', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'levi',
      renotify: true,
      requireInteraction: data.requireInteraction ?? false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/dashboard');
    })
  );
});
