<?php
/**
 * /api/cron.php — Disparador periódico de avisos
 *
 * Pensado para llamarse desde un cron del hosting (DirectAdmin) cada 1-5 min:
 *   wget -q -O /dev/null "https://sonoplay.es/api/cron.php?key=admin123"
 *
 * Revisa los presupuestos abandonados y envía el email + push pendientes,
 * SIN depender de que el admin tenga el panel abierto ni de que haya tráfico.
 * Esto es lo que hace que las notificaciones lleguen con el navegador cerrado.
 *
 * Protegido por la clave admin (?key= o cabecera X-Admin-Key).
 */

require __DIR__ . '/_common.php';

require_admin();

leads_notify_pending(true);

json_response(['ok' => true, 'ranAt' => date('c')]);
