<?php
/**
 * /api/content.php
 *
 * GET  → devuelve el mapa de textos editables { content-phone, content-email, ... }
 * POST (X-Admin-Key) {content: {...}} → reemplaza el mapa completo
 * POST (X-Admin-Key) {merge:   {...}} → actualiza solo las claves dadas
 */

require __DIR__ . '/_common.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $content = read_json('content.json', new stdClass());
    json_response(['ok' => true, 'content' => $content]);
}

if ($method !== 'POST') {
    json_error('Método no permitido', 405);
}

require_admin();
$body = read_body_json();

if (isset($body['content']) && is_array($body['content'])) {
    $saved = with_locked_json('content.json', function () use ($body) { return $body['content']; });
    json_response(['ok' => true, 'content' => $saved]);
}

if (isset($body['merge']) && is_array($body['merge'])) {
    $saved = with_locked_json('content.json', function ($current) use ($body) {
        if (!is_array($current)) $current = [];
        return array_merge($current, $body['merge']);
    });
    json_response(['ok' => true, 'content' => $saved]);
}

json_error('Payload inválido (esperado "content" o "merge")');
