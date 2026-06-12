<?php
/**
 * /api/users.php
 *
 * POST {action: "register", name, email, password, phone?}   → alta nueva
 * POST {action: "login", email, password}                    → validar credenciales
 * POST {action: "google", email, name, googleId}             → login/alta con Google
 * POST {action: "update-phone", email, googleId, phone}      → fijar teléfono
 * POST {action: "delete", id|email}  (X-Admin-Key)           → eliminar usuario
 * POST {action: "migrate", users:[...]}                      → importar lista legacy
 * GET  (X-Admin-Key)                                         → lista completa (sin passwords)
 *
 * Todas las escrituras usan with_locked_json() → lectura-modificación-escritura
 * atómica con lock exclusivo. Imposible corromper el fichero o perder registros
 * por escrituras concurrentes.
 */

require __DIR__ . '/_common.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_admin();
    $users = read_json('users.json', []);
    if (!is_array($users)) $users = [];
    $safe = array_map(function ($u) { unset($u['password']); return $u; }, $users);

    // ?download=1 → fuerza descarga de la copia de seguridad como archivo
    if (isset($_GET['download'])) {
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="sonoplay-usuarios-' . date('Y-m-d') . '.json"');
        echo json_encode(array_values($safe), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    json_response(['ok' => true, 'users' => array_values($safe)]);
}

if ($method !== 'POST') {
    json_error('Método no permitido', 405);
}

$body   = read_body_json();
$action = $body['action'] ?? '';

// ---------------- REGISTER ----------------
if ($action === 'register') {
    $name    = trim_str($body['name']  ?? '');
    $email   = safe_email($body['email'] ?? '');
    $pass    = trim_str($body['password'] ?? '');
    $phone   = trim_str($body['phone'] ?? '');
    $wedding = safe_date($body['weddingDate'] ?? '');
    if (!$name || !$email || !$pass) json_error('Faltan campos obligatorios');
    if (strlen(preg_replace('/\D/', '', $phone)) < 6 || strlen($phone) > 30) json_error('Introduce un teléfono válido');

    $err = null; $out = null;
    with_locked_json('users.json', function ($users) use ($name, $email, $pass, $phone, $wedding, &$err, &$out) {
        foreach ($users as $u) {
            if (isset($u['email']) && strtolower($u['email']) === $email) { $err = 'Ya existe una cuenta con ese email'; return null; }
        }
        $newUser = [
            'id'          => bin2hex(random_bytes(8)),
            'name'        => $name,
            'email'       => $email,
            'password'    => password_hash($pass, PASSWORD_DEFAULT),
            'phone'       => $phone,
            'weddingDate' => $wedding,
            'role'        => 'user',
            'createdAt'   => date('c'),
        ];
        $users[] = $newUser;
        unset($newUser['password']);
        $out = $newUser;
        return $users;
    });
    if ($err) json_error($err, 409);
    if (!$out) json_error('Error guardando el usuario', 500);
    snapshot_backup('users.json');
    notify_new_user($out, 'Formulario web');
    json_response(['ok' => true, 'user' => $out]);
}

/** Aviso interno: alguien se ha registrado en la web. */
function notify_new_user(array $u, string $via): void {
    $lines = [];
    $lines[] = '👤 NUEVO REGISTRO EN LA WEB';
    $lines[] = '';
    $lines[] = 'Nombre:    ' . ($u['name'] ?: '-');
    $lines[] = 'Email:     ' . ($u['email'] ?? '-');
    $lines[] = 'Teléfono:  ' . (!empty($u['phone']) ? $u['phone'] : '- (aún sin dar)');
    $lines[] = 'Fecha boda: ' . (!empty($u['weddingDate']) ? date('d/m/Y', strtotime($u['weddingDate'])) : '- (aún sin dar)');
    $lines[] = 'Vía:       ' . $via;
    $lines[] = 'Fecha:     ' . date('d/m/Y H:i');
    $lines[] = '';
    $lines[] = 'Panel de admin: https://sonoplay.es/admin.html (sección Usuarios)';
    sonoplay_alert_mail('[SONOPLAY] 👤 Nuevo registro — ' . ($u['name'] ?: ($u['email'] ?? '')), $lines);
}

// ---------------- LOGIN ----------------
if ($action === 'login') {
    $email = safe_email($body['email'] ?? '');
    $pass  = trim_str($body['password'] ?? '');
    if (!$email || !$pass) json_error('Email y contraseña requeridos');

    $users = read_json('users.json', []);
    foreach ($users as $u) {
        if (isset($u['email']) && strtolower($u['email']) === $email) {
            if (isset($u['password']) && password_verify($pass, $u['password'])) {
                unset($u['password']);
                json_response(['ok' => true, 'user' => $u]);
            }
            json_error('Credenciales inválidas', 401);
        }
    }
    json_error('Credenciales inválidas', 401);
}

// ---------------- GOOGLE ----------------
if ($action === 'google') {
    $email    = safe_email($body['email'] ?? '');
    $name     = trim_str($body['name']  ?? '');
    $googleId = trim_str($body['googleId'] ?? '');
    if (!$email) json_error('Email Google inválido');

    $out = null; $isNew = false;
    with_locked_json('users.json', function ($users) use ($email, $name, $googleId, &$out, &$isNew) {
        foreach ($users as $idx => $u) {
            if (isset($u['email']) && strtolower($u['email']) === $email) {
                if (empty($u['googleId']) && $googleId) $users[$idx]['googleId'] = $googleId;
                $ret = $users[$idx];
                unset($ret['password']);
                $out = $ret;
                return $users; // guardamos por si actualizamos googleId
            }
        }
        $newUser = [
            'id'        => bin2hex(random_bytes(8)),
            'name'      => $name ?: explode('@', $email)[0],
            'email'     => $email,
            'phone'     => '',
            'googleId'  => $googleId,
            'role'      => 'user',
            'createdAt' => date('c'),
        ];
        $users[] = $newUser;
        $out = $newUser;
        $isNew = true;
        return $users;
    });
    if (!$out) json_error('Error guardando usuario Google', 500);
    snapshot_backup('users.json');
    if ($isNew) notify_new_user($out, 'Google Sign-In');
    json_response(['ok' => true, 'user' => $out, 'isNew' => $isNew]);
}

// ---------------- UPDATE PHONE ----------------
if ($action === 'update-phone') {
    $email    = safe_email($body['email'] ?? '');
    $googleId = trim_str($body['googleId'] ?? '');
    $phone    = trim_str($body['phone'] ?? '');
    $wedding  = safe_date($body['weddingDate'] ?? '');
    if (!$email) json_error('Email requerido');
    if (!$phone) json_error('Teléfono requerido');
    if (strlen($phone) < 6 || strlen($phone) > 30) json_error('Teléfono no válido');

    $err = null; $out = null;
    with_locked_json('users.json', function ($users) use ($email, $googleId, $phone, $wedding, &$err, &$out) {
        foreach ($users as $idx => $u) {
            if (isset($u['email']) && strtolower($u['email']) === $email) {
                if (!empty($u['googleId']) && (!$googleId || $u['googleId'] !== $googleId)) { $err = 'Verificación fallida'; return null; }
                $users[$idx]['phone'] = $phone;
                if ($wedding) $users[$idx]['weddingDate'] = $wedding;
                $ret = $users[$idx];
                unset($ret['password']);
                $out = $ret;
                return $users;
            }
        }
        $err = 'Usuario no encontrado';
        return null;
    });
    if ($err === 'Verificación fallida') json_error($err, 403);
    if ($err) json_error($err, 404);
    if (!$out) json_error('Error guardando', 500);
    snapshot_backup('users.json');
    json_response(['ok' => true, 'user' => $out]);
}

// ---------------- DELETE ----------------
if ($action === 'delete') {
    require_admin();
    $email = safe_email($body['email'] ?? '');
    $id    = trim_str($body['id'] ?? '');
    if (!$email && !$id) json_error('Falta email o id');

    $removed = 0;
    with_locked_json('users.json', function ($users) use ($email, $id, &$removed) {
        $filtered = array_values(array_filter($users, function ($u) use ($email, $id) {
            if ($id && isset($u['id']) && $u['id'] === $id) return false;
            if ($email && isset($u['email']) && strtolower($u['email']) === $email) return false;
            return true;
        }));
        $removed = count($users) - count($filtered);
        return $filtered;
    });
    if ($removed === 0) json_error('Usuario no encontrado', 404);
    snapshot_backup('users.json');
    json_response(['ok' => true, 'removed' => $removed]);
}

// ---------------- MIGRATE ----------------
if ($action === 'migrate') {
    $incoming = $body['users'] ?? [];
    if (!is_array($incoming)) json_error('Lista inválida');
    if (count($incoming) > 100) $incoming = array_slice($incoming, 0, 100);

    $added = 0; $total = 0;
    with_locked_json('users.json', function ($existing) use ($incoming, &$added, &$total) {
        $emails = [];
        foreach ($existing as $u) {
            if (isset($u['email'])) $emails[strtolower($u['email'])] = true;
        }
        foreach ($incoming as $u) {
            $email = safe_email($u['email'] ?? '');
            if (!$email || isset($emails[$email])) continue;
            $pwd = null;
            if (isset($u['password']) && $u['password']) {
                $pwd = (strpos($u['password'], '$2y$') === 0 || strpos($u['password'], '$2a$') === 0)
                    ? $u['password']
                    : password_hash($u['password'], PASSWORD_DEFAULT);
            }
            $existing[] = [
                'id'          => $u['id'] ?? bin2hex(random_bytes(8)),
                'name'        => trim_str($u['name'] ?? ''),
                'email'       => $email,
                'password'    => $pwd,
                'phone'       => trim_str($u['phone'] ?? ''),
                'weddingDate' => safe_date($u['weddingDate'] ?? ''),
                'googleId'    => trim_str($u['googleId'] ?? ''),
                'role'        => ($u['role'] ?? 'user') === 'admin' ? 'admin' : 'user',
                'createdAt'   => $u['createdAt'] ?? date('c'),
            ];
            $emails[$email] = true;
            $added++;
        }
        $total = count($existing);
        return $existing;
    });
    if ($added > 0) snapshot_backup('users.json');
    json_response(['ok' => true, 'added' => $added, 'total' => $total]);
}

json_error('Acción no reconocida');
