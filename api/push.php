<?php
/**
 * /api/push.php — Suscripciones Web Push del admin (VAPID)
 *
 * GET  ?action=key       (X-Admin-Key) → {ok, key}  clave pública VAPID
 * POST {action:subscribe, subscription:{endpoint, keys:{...}}} (X-Admin-Key)
 * POST {action:unsubscribe, endpoint} (X-Admin-Key)
 * POST {action:test} (X-Admin-Key) → envía un push de prueba a este admin
 *
 * Las suscripciones se guardan en data/push-subs.json (protegido por
 * data/.htaccess). El envío real lo hace push_notify_admins() en _common.php.
 */

require __DIR__ . '/_common.php';

require_admin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'key') {
        $key = vapid_public_key();
        if (!$key) json_error('No se pudo generar la clave VAPID (¿openssl con EC disponible?)', 500);
        json_response(['ok' => true, 'key' => $key]);
    }
    json_error('Acción no reconocida');
}

if ($method !== 'POST') json_error('Método no permitido', 405);

$body   = read_body_json();
$action = $body['action'] ?? '';

if ($action === 'subscribe') {
    $sub = $body['subscription'] ?? null;
    if (!is_array($sub) || empty($sub['endpoint'])) json_error('Suscripción inválida');
    $endpoint = (string)$sub['endpoint'];
    if (!preg_match('#^https://#', $endpoint)) json_error('Endpoint inválido');

    with_locked_json('push-subs.json', function ($subs) use ($endpoint, $sub) {
        if (!is_array($subs)) $subs = [];
        // Evita duplicados del mismo endpoint
        $subs = array_values(array_filter($subs, function ($s) use ($endpoint) {
            return ($s['endpoint'] ?? '') !== $endpoint;
        }));
        $subs[] = [
            'endpoint'  => $endpoint,
            'keys'      => isset($sub['keys']) && is_array($sub['keys']) ? $sub['keys'] : new stdClass(),
            'createdAt' => date('c'),
        ];
        return $subs;
    });
    json_response(['ok' => true]);
}

if ($action === 'unsubscribe') {
    $endpoint = trim_str($body['endpoint'] ?? '');
    if (!$endpoint) json_error('Falta endpoint');
    with_locked_json('push-subs.json', function ($subs) use ($endpoint) {
        if (!is_array($subs)) return [];
        return array_values(array_filter($subs, function ($s) use ($endpoint) {
            return ($s['endpoint'] ?? '') !== $endpoint;
        }));
    });
    json_response(['ok' => true]);
}

if ($action === 'test') {
    push_notify_admins('🔔 Prueba de aviso', 'Las notificaciones funcionan aunque tengas el navegador cerrado.');
    json_response(['ok' => true]);
}

json_error('Acción no reconocida');
