<?php
/**
 * /api/wa-test.php?key=admin123&phone=600112233
 * Diagnóstico: prueba la conexión del HOSTING con el servicio WhatsApp del VPS
 * y muestra el resultado crudo (código HTTP, error de red, respuesta).
 * Solo para depurar — protegido con la clave admin.
 */
require __DIR__ . '/_common.php';
require_admin();

$phone = preg_replace('/\D/', '', $_GET['phone'] ?? '');
if (!$phone) json_error('Añade ?phone=TU_NUMERO a la URL');

if (!WA_API_URL || !WA_API_TOKEN) {
    json_response(['ok' => false, 'motivo' => 'WA_API_URL/WA_API_TOKEN vacios en _common.php (¿zip viejo?)']);
}

$payload = json_encode(['token' => WA_API_TOKEN, 'phone' => $phone, 'message' => 'Test diagnostico SONOPLAY ✅']);

$code = 0; $err = ''; $resp = '';
if (function_exists('curl_init')) {
    $ch = curl_init(WA_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
} else {
    $err = 'curl no disponible en el hosting';
}

json_response([
    'ok'         => ($code >= 200 && $code < 300),
    'url'        => WA_API_URL,
    'http_code'  => $code,
    'curl_error' => $err,
    'response'   => $resp,
]);
