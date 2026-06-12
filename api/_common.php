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
