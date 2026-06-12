<?php
/**
 * /api/prices.php
 *
 * GET   → devuelve el mapa de precios { basic: 1210, duo: 1936, ... }
 * POST  (X-Admin-Key) {prices: {...}}  → reemplaza el mapa completo
 * POST  (X-Admin-Key) {merge: {...}}   → fusiona/actualiza solo las claves dadas
 */

require __DIR__ . '/_common.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $prices = read_json('prices.json', new stdClass());
    json_response(['ok' => true, 'prices' => $prices]);
}

if ($method !== 'POST') {
    json_error('Método no permitido', 405);
}

require_admin();
$body = read_body_json();

if (isset($body['prices']) && is_array($body['prices'])) {
    $saved = with_locked_json('prices.json', function () use ($body) { return $body['prices']; });
    json_response(['ok' => true, 'prices' => $saved]);
}

if (isset($body['merge']) && is_array($body['merge'])) {
    $saved = with_locked_json('prices.json', function ($current) use ($body) {
        if (!is_array($current)) $current = [];
        return array_merge($current, $body['merge']);
    });
    json_response(['ok' => true, 'prices' => $saved]);
}

json_error('Payload inválido (esperado "prices" o "merge")');
