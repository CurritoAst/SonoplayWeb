<?php
/**
 * SONOPLAY API — helpers compartidos
 * - Lectura/escritura segura de JSON con file locking
 * - Autenticación admin por cabecera X-Admin-Key
 * - Respuestas JSON consistentes
 */

// La clave admin debe coincidir con la del frontend (auth-shared.js).
// Para un fix real de seguridad mover esto a una variable de entorno fuera del web root.
const SONOPLAY_ADMIN_KEY = 'admin123';

const DATA_DIR = __DIR__ . '/../data';

// ---- WhatsApp automático (servicio open-wa en el VPS de IONOS) ----
// Rellena estos dos valores cuando el servicio del VPS esté en marcha.
// Mientras estén vacíos, no se envía ningún WhatsApp (la web sigue funcionando).
const WA_API_URL   = 'https://wa.sonoplay.es/send';   // VPS IONOS via HTTPS (Plesk proxy -> :3000)
const WA_API_TOKEN = 'Sono_wa_K9mQ2xP7rZ4tB6nW';     // el mismo WA_TOKEN del .env del VPS

// Número del ADMIN que RECIBE los avisos/recordatorios por WhatsApp (nueva
// solicitud, recordatorio de presupuestos pendientes...). Déjalo vacío para
// no enviar avisos al admin.
// El número que los ENVÍA es la cuenta de WhatsApp enlazada en el VPS
// (open-wa) — debe ser el de Administración Sonoplay: 657 46 86 85.
const WA_ADMIN_PHONE = '34605216881';   // recibe los avisos: 605 21 68 81

// Los abandonos avisan por WhatsApp SOLO al admin (WA_ADMIN_PHONE). Al
// cliente nunca se le escribe por abandonar — solo recibe la confirmación
// cuando ÉL envía la solicitud (budget.php).

/**
 * Envía un WhatsApp al cliente a través del servicio open-wa del VPS.
 * No bloquea la web: si falla o no está configurado, devuelve false en silencio.
 */
function send_whatsapp(string $phone, string $message): bool {
    if (!WA_API_URL || !WA_API_TOKEN) return false;
    $digits = preg_replace('/\D/', '', $phone);
    if (!$digits || mb_strlen($message) < 2) return false;

    $payload = json_encode(['token' => WA_API_TOKEN, 'phone' => $digits, 'message' => $message], JSON_UNESCAPED_UNICODE);

    if (function_exists('curl_init')) {
        $ch = curl_init(WA_API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
        ]);
        curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code >= 200 && $code < 300;
    }
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 12,
        'ignore_errors' => true,
    ]]);
    $res = @file_get_contents(WA_API_URL, false, $ctx);
    return $res !== false;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

function json_response($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $msg, int $status = 400): void {
    json_response(['ok' => false, 'error' => $msg], $status);
}

function read_json(string $filename, $default) {
    $path = DATA_DIR . '/' . $filename;
    if (!file_exists($path)) {
        return $default;
    }
    $fp = @fopen($path, 'r');
    if (!$fp) return $default;
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    if ($raw === false || $raw === '') return $default;
    $data = json_decode($raw, true);
    return ($data === null) ? $default : $data;
}

function write_json(string $filename, $data): bool {
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0755, true);
    }
    $path = DATA_DIR . '/' . $filename;
    // Temp único por escritura para que dos procesos concurrentes NO compartan
    // el mismo fichero temporal (evita corrupción). El rename final es atómico.
    $tmp  = $path . '.' . uniqid('tmp_', true);
    $fp = @fopen($tmp, 'w');
    if (!$fp) return false;
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    $written = fwrite($fp, $json);
    fflush($fp);
    fclose($fp);
    if ($written === false) { @unlink($tmp); return false; }
    if (@rename($tmp, $path)) return true;
    @unlink($tmp);
    return false;
}

/**
 * Lectura-modificación-escritura ATÓMICA con bloqueo exclusivo del fichero
 * durante toda la operación. Evita el problema de "lost update" (dos registros
 * simultáneos donde uno pisa al otro) y la corrupción del JSON.
 *
 * $callback recibe el array actual y debe devolver:
 *   - un array  → se guarda como nuevo contenido
 *   - null      → no se modifica nada (solo lectura)
 * Devuelve lo que devuelva el callback (o el array leído si devuelve null).
 */
function with_locked_json(string $filename, callable $callback) {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
    $path = DATA_DIR . '/' . $filename;

    // 'c+' abre lectura/escritura y crea el fichero si no existe, sin truncarlo.
    $fp = @fopen($path, 'c+');
    if (!$fp) return $callback([]); // si no se puede bloquear, al menos no rompemos

    flock($fp, LOCK_EX);
    rewind($fp);
    $raw = stream_get_contents($fp);
    $data = ($raw === false || $raw === '') ? [] : json_decode($raw, true);
    if (!is_array($data)) $data = [];

    $result = $callback($data);

    if (is_array($result)) {
        $json = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, $json);
        fflush($fp);
    }
    flock($fp, LOCK_UN);
    fclose($fp);
    return is_array($result) ? $result : $data;
}

/**
 * Copia de seguridad automática. Tras cada cambio en un fichero de datos,
 * guarda un snapshot diario en data/backups/<base>-YYYY-MM-DD.json
 * (uno por día, se sobreescribe si ya existe ese día). Conserva 60 días.
 * La carpeta data/ ya está protegida por su .htaccess (incluye subcarpetas).
 */
function snapshot_backup(string $filename): void {
    $src = DATA_DIR . '/' . $filename;
    if (!file_exists($src)) return;
    $dir = DATA_DIR . '/backups';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $dest = $dir . '/' . $base . '-' . date('Y-m-d') . '.json';
    @copy($src, $dest);

    // Poda: elimina backups de este mismo fichero con más de 60 días
    $cutoff = time() - 60 * 86400;
    foreach (glob($dir . '/' . $base . '-*.json') ?: [] as $f) {
        if (@filemtime($f) < $cutoff) @unlink($f);
    }
}

function read_body_json() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_admin(): void {
    // Acepta la clave por cabecera X-Admin-Key (normal) o por query param ?key=
    // (fallback para hostings que filtran cabeceras personalizadas y para diagnóstico).
    $sent = $_SERVER['HTTP_X_ADMIN_KEY'] ?? ($_GET['key'] ?? '');
    if (!hash_equals(SONOPLAY_ADMIN_KEY, $sent)) {
        json_error('Acceso denegado', 403);
    }
}

function trim_str($v): string {
    return is_string($v) ? trim($v) : '';
}

function safe_email($v): string {
    $v = strtolower(trim_str($v));
    return filter_var($v, FILTER_VALIDATE_EMAIL) ? $v : '';
}

/** Valida una fecha YYYY-MM-DD (input type=date). Devuelve '' si no es válida. */
function safe_date($v): string {
    $v = trim_str($v);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) return '';
    [$y, $m, $d] = array_map('intval', explode('-', $v));
    return checkdate($m, $d, $y) ? $v : '';
}

/* ============================================================
   NOTIFICACIÓN DE PRESUPUESTOS ABANDONADOS
   - Cada lead "abandonado" (vio precios y no envió) genera UN email a
     producciones@ cuando: cierra la página (aviso inmediato vía beacon,
     ver leads.php) o lleva LEADS_ABANDON_AFTER seg. sin actividad.
   - leads_notify_pending() corre al final de CADA petición a la API
     (shutdown function, con throttle), así no depende de ningún cron.
   ============================================================ */

const LEADS_NOTIFY_TO       = 'producciones@sonoplay.es';
const LEADS_ABANDON_AFTER   = 900;    // 15 min sin actividad → notificable
const LEADS_LEFT_GRACE      = 120;    // cerró la página: avisar si no vuelve en 2 min
                                      // (una recarga reactiva el lead y cancela el aviso)
const LEADS_NOTIFY_THROTTLE = 300;    // escaneo como mucho cada 5 min
const LEADS_RENOTIFY_AFTER  = 86400;  // máx. 1 email por lead cada 24 h
const LEADS_NOTIFY_MAX_AGE  = 7200;   // solo se avisa de abandonos de las últimas 2h:
                                      // los leads viejos (ya gestionados) NO se notifican

// Recordatorio al ADMIN por WhatsApp de presupuestos pendientes (sin gestionar).
const WA_REMIND_AFTER  = 43200;  // 12 h sin gestionar → recordatorio al admin
const WA_REMIND_REPEAT = 86400;  // si sigue sin gestionar, repite el recordatorio cada 24 h

/** Email de aviso interno a producciones@ (texto plano UTF-8). */
function sonoplay_alert_mail(string $subject, array $lines): bool {
    $headers  = "From: SONOPLAY Web <no-reply@sonoplay.es>\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= 'X-Mailer: PHP/' . phpversion() . "\r\n";
    return @mail(LEADS_NOTIFY_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), $headers);
}

/** Envía el email de aviso de un lead abandonado. */
function leads_send_alert(array $l): bool {
    $name  = $l['name'] ?: ($l['email'] ?? 'Cliente');
    $total = isset($l['total']) && $l['total'] ? number_format((float)$l['total'], 0, ',', '.') . ' €' : '';

    $lines = [];
    $lines[] = '🔥 PRESUPUESTO ABANDONADO — lead caliente';
    $lines[] = '';
    $lines[] = 'Nombre:    ' . $name;
    if (!empty($l['email']))       $lines[] = 'Email:     ' . $l['email'];
    if (!empty($l['phone']))       $lines[] = 'Teléfono:  ' . $l['phone'];
    if (!empty($l['weddingDate'])) $lines[] = 'Fecha boda: ' . date('d/m/Y', strtotime($l['weddingDate']));
    if (!empty($l['viewedAt']))    $lines[] = 'Último vistazo: ' . date('d/m/Y H:i', strtotime($l['viewedAt']));
    $lines[] = '';
    $lines[] = '— Presupuesto que estaba mirando —';
    foreach (($l['cart'] ?? []) as $item) {
        $iname = trim_str($item['name'] ?? '');
        if (!$iname) continue;
        $qty = isset($item['qty']) && (int)$item['qty'] > 1 ? ' x' . (int)$item['qty'] : '';
        $price = isset($item['price']) ? ' — ' . number_format((float)$item['price'], 0, ',', '.') . ' €' : '';
        $lines[] = '• ' . $iname . $qty . $price;
    }
    if ($total) {
        $lines[] = '';
        $lines[] = 'TOTAL QUE VIO: ' . $total;
    }
    $lines[] = '';
    $lines[] = 'No llegó a enviar la solicitud. Llámale y hazle una oferta.';
    $lines[] = 'Panel de admin: https://sonoplay.es/admin.html (sección Usuarios)';

    $subject = '[SONOPLAY] 🔥 Presupuesto abandonado — ' . $name . ($total ? ' (' . $total . ')' : '');
    return sonoplay_alert_mail($subject, $lines);
}

/**
 * Busca leads abandonados sin actividad reciente y aún no avisados, y envía
 * el email. $force salta el throttle (lo usa el GET del panel de admin).
 */
function leads_notify_pending(bool $force = false): void {
    if (!is_dir(DATA_DIR)) return;
    $stamp = DATA_DIR . '/.leads-notify-stamp';
    if (!$force) {
        $last = @filemtime($stamp);
        if ($last && time() - $last < LEADS_NOTIFY_THROTTLE) return;
    }
    @touch($stamp);

    // Recordatorio al admin de presupuestos pendientes (>12h sin gestionar)
    leads_remind_admin();

    $leads = read_json('leads.json', []);
    if (!is_array($leads) || count($leads) === 0) return;

    $now = time();
    $notified = [];
    $lastLead = null;
    foreach ($leads as $l) {
        if (($l['status'] ?? '') !== 'abandonado') continue;
        if (empty($l['cart'])) continue;
        $viewed = !empty($l['viewedAt']) ? strtotime($l['viewedAt']) : 0;
        // Si cerró la página basta la gracia corta; si sigue abierta, 15 min de inactividad
        $threshold = !empty($l['left']) ? LEADS_LEFT_GRACE : LEADS_ABANDON_AFTER;
        if (!$viewed || $viewed > $now - $threshold) continue; // aún activo
        // Solo abandonos recientes: los viejos (ya gestionados) no se reavisan,
        // ni aunque nunca llegaran a tener notifiedAt (p.ej. antes del cron).
        if ($viewed < $now - LEADS_NOTIFY_MAX_AGE) continue;
        if (!empty($l['notifiedAt']) && strtotime($l['notifiedAt']) > $now - LEADS_RENOTIFY_AFTER) continue;
        if (leads_send_alert($l)) {
            $notified[strtolower($l['email'] ?? '')] = true;
            $lastLead = $l;
            // WhatsApp SOLO al admin (605) con el presupuesto abandonado.
            // Al cliente no se le escribe nada por abandonar.
            if (WA_ADMIN_PHONE) {
                $wa = [];
                $wa[] = '🔥 *Presupuesto abandonado* — SONOPLAY';
                $wa[] = '';
                $wa[] = '👤 ' . ($l['name'] ?: ($l['email'] ?? 'Cliente'));
                if (!empty($l['phone']))       $wa[] = '📞 ' . $l['phone'];
                if (!empty($l['email']))       $wa[] = '✉️ ' . $l['email'];
                if (!empty($l['weddingDate'])) $wa[] = '💍 Boda: ' . date('d/m/Y', strtotime($l['weddingDate']));
                if (is_array($l['cart']) && count($l['cart']) > 0) {
                    $wa[] = '';
                    $wa[] = '— Lo que estaba mirando —';
                    foreach (array_slice($l['cart'], 0, 12) as $item) {
                        $iname = trim_str($item['name'] ?? '');
                        if (!$iname) continue;
                        $iprice = isset($item['price']) ? ' — ' . number_format((float)$item['price'], 0, ',', '.') . ' €' : '';
                        $wa[] = '• ' . $iname . $iprice;
                    }
                }
                if (!empty($l['total'])) {
                    $wa[] = '';
                    $wa[] = '💰 Total que vio: ' . number_format((float)$l['total'], 0, ',', '.') . ' €';
                }
                $wa[] = '';
                $wa[] = 'No envió la solicitud. Llámale y hazle una oferta.';
                $wa[] = 'Panel: https://sonoplay.es/admin.html';
                send_whatsapp(WA_ADMIN_PHONE, implode("\n", $wa));
            }
        }
    }
    if (count($notified) === 0) return;

    with_locked_json('leads.json', function ($leads) use ($notified) {
        foreach ($leads as $i => $l) {
            if (isset($notified[strtolower($l['email'] ?? '')])) {
                $leads[$i]['notifiedAt'] = date('c');
            }
        }
        return $leads;
    });

    // Push a los dispositivos del admin (aunque tengan el navegador cerrado)
    $who   = $lastLead['name'] ?: ($lastLead['email'] ?? 'Un cliente');
    $total = !empty($lastLead['total']) ? ' (' . number_format((float)$lastLead['total'], 0, ',', '.') . ' €)' : '';
    $extra = count($notified) > 1 ? ' y ' . (count($notified) - 1) . ' más' : '';
    push_notify_admins('🔥 Presupuesto abandonado', $who . $total . $extra . ' — toca para verlo en el panel.');
}

/**
 * Recordatorio al ADMIN por WhatsApp de los presupuestos PENDIENTES (sin
 * gestionar) que llevan más de WA_REMIND_AFTER (12h). Manda un único mensaje
 * resumen y vuelve a recordar como mucho cada WA_REMIND_REPEAT (24h) por lead.
 * Un lead se considera gestionado cuando el admin lo marca "Confirmado".
 */
function leads_remind_admin(): void {
    $leads = read_json('leads.json', []);
    if (!is_array($leads) || count($leads) === 0) return;

    $now = time();
    $pending = [];
    $ids = [];
    foreach ($leads as $l) {
        $status = $l['status'] ?? '';
        if ($status === 'confirmado') continue;   // ya gestionado
        if (empty($l['cart'])) continue;
        // "Pendiente desde": si envió la solicitud → sentAt; si no → viewedAt
        $ts = ($status === 'enviado' && !empty($l['sentAt']))
            ? strtotime($l['sentAt'])
            : (!empty($l['viewedAt']) ? strtotime($l['viewedAt']) : 0);
        if (!$ts || $ts > $now - WA_REMIND_AFTER) continue;  // aún no han pasado 12h
        if (!empty($l['reminderAt']) && strtotime($l['reminderAt']) > $now - WA_REMIND_REPEAT) continue;
        $pending[] = ['lead' => $l, 'ts' => $ts];
        $ids[$l['id'] ?? ''] = true;
    }
    if (count($pending) === 0) return;

    // 1) Notificación PUSH a los dispositivos del admin (navegador, aunque esté cerrado)
    $n = count($pending);
    push_notify_admins('⏰ Presupuestos sin responder',
        'Tienes ' . $n . ' presupuesto' . ($n > 1 ? 's' : '') . ' pendiente' . ($n > 1 ? 's' : '') . ' de gestionar. Toca para verlos.');

    // 2) WhatsApp al admin (solo si hay número configurado)
    if (WA_ADMIN_PHONE) {
        $lines = [];
        $lines[] = '⏰ *Recordatorio SONOPLAY*';
        $lines[] = 'Tienes ' . $n . ' presupuesto(s) sin responder:';
        foreach (array_slice($pending, 0, 10) as $p) {
            $l = $p['lead'];
            $hours = max(1, (int)floor(($now - $p['ts']) / 3600));
            $who = $l['name'] ?: ($l['email'] ?? 'Cliente');
            $tipo = (($l['status'] ?? '') === 'enviado') ? 'solicitó presupuesto' : 'lo dejó a medias';
            $tel = !empty($l['phone']) ? ' · 📞 ' . $l['phone'] : '';
            $lines[] = '';
            $lines[] = '👤 ' . $who . $tel;
            $lines[] = '   ' . $tipo . ' hace ' . $hours . ' h';
        }
        $lines[] = '';
        $lines[] = 'Gestiónalos en https://sonoplay.es/admin.html';
        send_whatsapp(WA_ADMIN_PHONE, implode("\n", $lines));
    }

    // 3) Marca los leads como recordados para no repetir hasta dentro de 24h
    with_locked_json('leads.json', function ($leads) use ($ids) {
        foreach ($leads as $i => $l) {
            if (isset($ids[$l['id'] ?? ''])) $leads[$i]['reminderAt'] = date('c');
        }
        return $leads;
    });
}

/* ============================================================
   WEB PUSH (VAPID) — notificaciones al admin con el navegador cerrado
   Implementación en PHP puro (sin Composer): envío "payloadless" (sin
   cuerpo cifrado), solo el JWT VAPID firmado con ES256 vía openssl. El
   service worker recibe el push y muestra la notificación.
   ============================================================ */

const VAPID_SUBJECT = 'mailto:producciones@sonoplay.es';

function b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** Devuelve (y crea la primera vez) el par de claves VAPID. */
function vapid_keys(): ?array {
    $k = read_json('push-keys.json', null);
    if (is_array($k) && !empty($k['privPem']) && !empty($k['pub'])) return $k;
    if (!function_exists('openssl_pkey_new')) return null;

    $res = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$res) return null;
    openssl_pkey_export($res, $privPem);
    $det = openssl_pkey_get_details($res);
    if (empty($det['ec']['x']) || empty($det['ec']['y'])) return null;

    $x = str_pad($det['ec']['x'], 32, "\0", STR_PAD_LEFT);
    $y = str_pad($det['ec']['y'], 32, "\0", STR_PAD_LEFT);
    $k = ['privPem' => $privPem, 'pub' => b64url_encode("\x04" . $x . $y)];
    write_json('push-keys.json', $k);
    return $k;
}

/** Clave pública VAPID en base64url (para el navegador). */
function vapid_public_key(): string {
    $k = vapid_keys();
    return $k['pub'] ?? '';
}

/** Convierte la firma ECDSA DER de openssl a 64 bytes crudos (R||S). */
function ecdsa_der_to_raw(string $der): string {
    $off = 0;
    if (strlen($der) < 8 || ord($der[$off++]) !== 0x30) return '';
    $len = ord($der[$off++]);
    if ($len & 0x80) { $n = $len & 0x7f; $off += $n; }
    if (ord($der[$off++]) !== 0x02) return '';
    $rlen = ord($der[$off++]); $r = substr($der, $off, $rlen); $off += $rlen;
    if (ord($der[$off++]) !== 0x02) return '';
    $slen = ord($der[$off++]); $s = substr($der, $off, $slen);
    $r = ltrim($r, "\0"); $s = ltrim($s, "\0");
    return str_pad($r, 32, "\0", STR_PAD_LEFT) . str_pad($s, 32, "\0", STR_PAD_LEFT);
}

/** JWT VAPID firmado (ES256) para la audiencia (origen del push service). */
function vapid_jwt(string $aud, string $privPem): string {
    $header  = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = b64url_encode(json_encode(['aud' => $aud, 'exp' => time() + 43200, 'sub' => VAPID_SUBJECT]));
    $input = $header . '.' . $payload;
    $der = '';
    if (!openssl_sign($input, $der, $privPem, OPENSSL_ALGO_SHA256)) return '';
    $raw = ecdsa_der_to_raw($der);
    if (strlen($raw) !== 64) return '';
    return $input . '.' . b64url_encode($raw);
}

/** Envía un push (sin payload) a un endpoint. Devuelve el código HTTP. */
function push_send_one(array $sub, array $keys): int {
    $endpoint = $sub['endpoint'] ?? '';
    if (!$endpoint) return 0;
    $p = parse_url($endpoint);
    if (empty($p['scheme']) || empty($p['host'])) return 0;
    $aud = $p['scheme'] . '://' . $p['host'];
    $jwt = vapid_jwt($aud, $keys['privPem']);
    if (!$jwt) return 0;

    $headers = [
        'Authorization: vapid t=' . $jwt . ', k=' . $keys['pub'],
        'TTL: 86400',
        'Content-Length: 0',
    ];
    if (function_exists('curl_init')) {
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => '',
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
        ]);
        curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code;
    }
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => implode("\r\n", $headers),
        'content' => '',
        'timeout' => 8,
        'ignore_errors' => true,
    ]]);
    @file_get_contents($endpoint, false, $ctx);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) return (int)$m[1];
    return 0;
}

/**
 * Envía push a todos los dispositivos del admin suscritos. Poda los que
 * ya no existen (404/410). El título/cuerpo van por el data del SW si el
 * navegador lo soporta; en payloadless el SW usa su texto por defecto.
 */
function push_notify_admins(string $title, string $body): void {
    $subs = read_json('push-subs.json', []);
    if (!is_array($subs) || count($subs) === 0) return;
    $keys = vapid_keys();
    if (!$keys) return;

    $dead = [];
    foreach ($subs as $sub) {
        $code = push_send_one($sub, $keys);
        if ($code === 404 || $code === 410) $dead[$sub['endpoint']] = true;
    }
    if ($dead) {
        with_locked_json('push-subs.json', function ($subs) use ($dead) {
            return array_values(array_filter($subs, function ($s) use ($dead) {
                return empty($dead[$s['endpoint'] ?? '']);
            }));
        });
    }
}

// Corre al terminar cualquier petición a la API (la respuesta ya se envió,
// el visitante no espera). Cada visita a la web pasa por aquí vía prices.php.
register_shutdown_function(function () { leads_notify_pending(); });
