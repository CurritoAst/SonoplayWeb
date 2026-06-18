<?php
/**
 * /api/push-test.php?key=admin123
 * PRUEBA: envía una notificación push a todos los dispositivos del admin
 * suscritos, y dice cuántos hay. Protegido con la clave admin.
 */
require __DIR__ . '/_common.php';
require_admin();

$subs = read_json('push-subs.json', []);
$count = is_array($subs) ? count($subs) : 0;

push_notify_admins('🔔 Prueba de notificación', 'Si ves esto, las notificaciones push funcionan en este dispositivo. ✅');

json_response([
    'ok' => true,
    'dispositivos_suscritos' => $count,
    'nota' => $count === 0
        ? 'No hay ningún dispositivo suscrito. Entra en el panel admin (https://sonoplay.es/admin.html) y pulsa "🔔 Activar avisos" para suscribir este dispositivo.'
        : 'Push enviado a ' . $count . ' dispositivo(s). Si no te llega, revisa los permisos de notificaciones del navegador (o, en iPhone, instala la web como app).',
]);
