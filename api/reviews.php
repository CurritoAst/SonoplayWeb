<?php
/**
 * /api/reviews.php — Reseñas de Google (Places API) con caché en data/
 *
 * GET → {ok, rating, total, reviews: [{author, rating, text, relative, time}]}
 *
 * Funcionamiento:
 *   - Sirve la caché de data/reviews.json si tiene menos de 24 h.
 *   - Si caducó y hay API key configurada, refresca desde Google Places API
 *     (máx. 5 reseñas — límite de Google) y guarda la caché.
 *   - Si Google falla, sirve la caché antigua antes que nada.
 *   - Sin API key ni caché → {ok:false}: el frontend mantiene las reseñas
 *     estáticas del HTML, la web nunca se queda sin sección de reseñas.
 *
 * CONFIGURACIÓN (pendiente de rellenar):
 *   1. Crear una API key en Google Cloud Console con "Places API" habilitada
 *      (https://console.cloud.google.com → APIs y servicios → Credenciales).
 *      Restringirla por IP del servidor o por API para que no se pueda abusar.
 *   2. Obtener el Place ID del negocio en
 *      https://developers.google.com/maps/documentation/places/web-service/place-id
 */

const GOOGLE_PLACES_API_KEY = '';   // ← API key de Google Cloud (Places API)
const GOOGLE_PLACE_ID       = '';   // ← Place ID de SONOPLAY en Google Maps
const REVIEWS_CACHE_TTL     = 86400; // 24 horas

require __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método no permitido', 405);
}

$cache = read_json('reviews.json', null);
$cacheValid = is_array($cache) && isset($cache['fetchedAt']);

// Caché fresca → servir directamente
if ($cacheValid && (time() - (int)$cache['fetchedAt']) < REVIEWS_CACHE_TTL) {
    json_response([
        'ok'      => true,
        'rating'  => $cache['rating']  ?? null,
        'total'   => $cache['total']   ?? null,
        'reviews' => $cache['reviews'] ?? [],
    ]);
}

// Sin configuración → caché antigua si existe, si no ok:false
if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) {
    if ($cacheValid) {
        json_response([
            'ok'      => true,
            'rating'  => $cache['rating']  ?? null,
            'total'   => $cache['total']   ?? null,
            'reviews' => $cache['reviews'] ?? [],
        ]);
    }
    json_response(['ok' => false, 'error' => 'Reseñas de Google sin configurar (API key / Place ID)']);
}

// Refrescar desde Google Places API
$url = 'https://maps.googleapis.com/maps/api/place/details/json'
     . '?place_id=' . urlencode(GOOGLE_PLACE_ID)
     . '&fields=rating,user_ratings_total,reviews'
     . '&reviews_sort=newest&language=es'
     . '&key=' . urlencode(GOOGLE_PLACES_API_KEY);

$ctx = stream_context_create(['http' => ['timeout' => 8]]);
$raw = @file_get_contents($url, false, $ctx);
$data = $raw ? json_decode($raw, true) : null;

if (!is_array($data) || ($data['status'] ?? '') !== 'OK') {
    // Google falló → servir caché antigua si la hay
    if ($cacheValid) {
        json_response([
            'ok'      => true,
            'rating'  => $cache['rating']  ?? null,
            'total'   => $cache['total']   ?? null,
            'reviews' => $cache['reviews'] ?? [],
        ]);
    }
    json_error('No se pudieron obtener las reseñas de Google', 502);
}

$result  = $data['result'] ?? [];
$reviews = [];
foreach (($result['reviews'] ?? []) as $rv) {
    $text = trim_str($rv['text'] ?? '');
    if (!$text) continue; // reseñas sin texto no aportan en la web
    $reviews[] = [
        'author'   => trim_str($rv['author_name'] ?? ''),
        'rating'   => isset($rv['rating']) ? (int)$rv['rating'] : 5,
        'text'     => mb_substr($text, 0, 600),
        'relative' => trim_str($rv['relative_time_description'] ?? ''),
        'time'     => isset($rv['time']) ? (int)$rv['time'] : 0,
    ];
}

$fresh = [
    'fetchedAt' => time(),
    'rating'    => isset($result['rating']) ? (float)$result['rating'] : null,
    'total'     => isset($result['user_ratings_total']) ? (int)$result['user_ratings_total'] : null,
    'reviews'   => $reviews,
];
write_json('reviews.json', $fresh);

json_response([
    'ok'      => true,
    'rating'  => $fresh['rating'],
    'total'   => $fresh['total'],
    'reviews' => $fresh['reviews'],
]);
