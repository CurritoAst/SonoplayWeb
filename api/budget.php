<?php
/**
 * /api/budget.php
 *
 * POST {name, description, cart?, package?, _hp?}
 *   → manda email a producciones@sonoplay.es con la solicitud de presupuesto.
 *
 * Anti-spam:
 *   - Honeypot ($_hp): si viene relleno, descarta silenciosamente (fueron bots).
 *   - Rate limit por IP: 5 envíos / minuto máximo.
 *   - Validación de longitud y caracteres mínimos.
 */

require __DIR__ . '/_common.php';

const TO_EMAIL    = 'producciones@sonoplay.es';
const FROM_EMAIL  = 'no-reply@sonoplay.es';   // remitente
const FROM_NAME   = 'SONOPLAY Web';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$body = read_body_json();

// Honeypot
if (!empty($body['_hp'])) {
    json_response(['ok' => true]); // mentimos al bot, no enviamos
}

$name = trim_str($body['name']        ?? '');
$desc = trim_str($body['description'] ?? '');
$cart = $body['cart']    ?? null;          // array opcional con items del carrito
$pkg  = trim_str($body['package']     ?? '');  // texto del paquete elegido (opcional)

if (mb_strlen($name) < 2)  json_error('Introduce tu nombre');
if (mb_strlen($desc) < 10) json_error('Cuéntanos un poco más sobre tu evento');
if (mb_strlen($name) > 100 || mb_strlen($desc) > 2000) json_error('Texto demasiado largo');

// Rate limit muy básico por IP (5 envíos / 60 s)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rl_dir = DATA_DIR . '/ratelimit';
if (!is_dir($rl_dir)) @mkdir($rl_dir, 0755, true);
$rl_file = $rl_dir . '/budget-' . md5($ip);
$now = time();
$attempts = [];
if (file_exists($rl_file)) {
    $raw = @file_get_contents($rl_file);
    $attempts = $raw ? json_decode($raw, true) : [];
    if (!is_array($attempts)) $attempts = [];
    $attempts = array_filter($attempts, function ($t) use ($now) { return $t > $now - 60; });
}
if (count($attempts) >= 5) {
    json_error('Demasiados envíos. Inténtalo en un momento.', 429);
}
$attempts[] = $now;
@file_put_contents($rl_file, json_encode(array_values($attempts)));

// Construir el cuerpo del email
$lines = [];
$lines[] = "Nombre: $name";
$lines[] = "";
$lines[] = "Motivo / descripción:";
$lines[] = $desc;
$lines[] = "";
if ($pkg) {
    $lines[] = "Paquete elegido en la web: $pkg";
    $lines[] = "";
}
if (is_array($cart) && count($cart) > 0) {
    $lines[] = "— Resumen del carrito —";
    foreach ($cart as $item) {
        $iname = trim_str($item['name']  ?? '');
        $iprice = isset($item['price']) ? (float)$item['price'] : null;
        if (!$iname) continue;
        $lines[] = '• ' . $iname . ($iprice !== null ? ' — ' . number_format($iprice, 0, ',', '.') . ' €' : '');
    }
    $lines[] = "";
}
$lines[] = "----------------------------";
$lines[] = "IP del cliente:  $ip";
$lines[] = "User-Agent:      " . substr($_SERVER['HTTP_USER_AGENT'] ?? '-', 0, 200);
$lines[] = "Enviado desde:   sonoplay.es";
$lines[] = "Fecha:           " . date('d/m/Y H:i');

$subject = '[SONOPLAY] Nueva solicitud de presupuesto — ' . $name;
$message = implode("\n", $lines);

// Cabeceras
$headers  = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . ">\r\n";
$headers .= 'Reply-To: ' . FROM_EMAIL . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// Codificar asunto UTF-8 para que llegue bien con tildes
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$ok = @mail(TO_EMAIL, $encodedSubject, $message, $headers);

if (!$ok) {
    json_error('No se pudo enviar el aviso. Llámanos o escríbenos por WhatsApp.', 500);
}

json_response(['ok' => true]);
