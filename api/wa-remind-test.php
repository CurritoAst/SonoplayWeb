<?php
/**
 * /api/wa-remind-test.php?key=admin123&phone=600112233
 * PRUEBA: envía al instante un WhatsApp de ejemplo del recordatorio de
 * "presupuestos sin responder", para ver cómo llega. Protegido con clave admin.
 */
require __DIR__ . '/_common.php';
require_admin();

$phone = preg_replace('/\D/', '', $_GET['phone'] ?? '');
if (!$phone) json_error('Añade ?phone=TU_NUMERO a la URL');

if (!WA_API_URL || !WA_API_TOKEN) {
    json_response(['ok' => false, 'motivo' => 'WA_API_URL/WA_API_TOKEN vacios (¿zip viejo?)']);
}

$lines = [];
$lines[] = '⏰ *Recordatorio SONOPLAY* (PRUEBA)';
$lines[] = 'Tienes 1 presupuesto sin responder:';
$lines[] = '';
$lines[] = '👤 Cliente de Prueba · 📞 600 00 00 00';
$lines[] = '   solicitó presupuesto hace 12 h';
$lines[] = '';
$lines[] = 'Gestiónalos en https://sonoplay.es/admin.html';

$ok = send_whatsapp($phone, implode("\n", $lines));
json_response(['ok' => $ok, 'enviado_a' => $phone]);
