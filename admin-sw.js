/* Service worker mínimo del panel de admin.
   Permite mostrar notificaciones en Android (que exige SW) y enfocar/abrir
   el panel al pulsar una notificación. No cachea nada. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Push del servidor (funciona con el navegador cerrado). El envío es
// "payloadless", así que normalmente no hay datos: usamos un texto por
// defecto. Si algún día se envía payload JSON, lo respetamos.
self.addEventListener('push', e => {
  let title = '🔥 Presupuesto abandonado';
  let body  = 'Un cliente ha dejado un presupuesto sin enviar. Toca para verlo en el panel.';
  if (e.data) {
    try { const d = e.data.json(); if (d.title) title = d.title; if (d.body) body = d.body; }
    catch (_) { const t = e.data.text(); if (t) body = t; }
  }
  e.waitUntil(self.registration.showNotification(title, {
    body,
    icon: 'images/favicon-192.png',
    badge: 'images/favicon-192.png',
    tag: 'sonoplay-push',
    renotify: true,
    data: { url: 'admin.html' }
  }));
});

// Si el navegador renueva la suscripción, la reenvía al servidor
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try {
      const sub = await self.registration.pushManager.subscribe(e.oldSubscription
        ? { userVisibleOnly: true, applicationServerKey: e.oldSubscription.options.applicationServerKey }
        : { userVisibleOnly: true });
      await fetch('api/push.php?key=admin123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'admin123' },
        body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON() })
      });
    } catch (_) {}
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'admin.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.indexOf('admin') !== -1 && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
