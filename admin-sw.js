/* Service worker mínimo del panel de admin.
   Permite mostrar notificaciones en Android (que exige SW) y enfocar/abrir
   el panel al pulsar una notificación. No cachea nada. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

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
