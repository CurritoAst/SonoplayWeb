<?php
/**
 * /api/leads.php — Leads calientes (presupuestos abandonados)
 *
 * POST {action:"price-viewed", email, name?, phone?, weddingDate?, cart?, total?, dj?}
 *   → registra que un usuario logueado ha visto el precio de su presupuesto.
 *     El lead queda en estado "abandonado" hasta que envíe la solicitud.
 * POST {action:"budget-sent", email}
 *   → marca el lead como "enviado" (ya no es un abandono).
 * GET  (X-Admin-Key)
 *   → lista completa de leads para el panel de admin.
 *
 * Un lead por email (upsert). Cada nueva visualización actualiza carrito,
 * precio y fecha; si ya había enviado y vuelve a mirar con otro carrito,
 * vuelve a estado "abandonado" (nuevo interés sin completar).
 */

require __DIR__ . '/_common.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_admin();
    // Aprovecha la visita del admin para despachar avisos pendientes ya
    leads_notify_pending(true);
    $leads = read_json('leads.json', []);
    if (!is_array($leads)) $leads = [];
    json_response(['ok' => true, 'leads' => array_values($leads)]);
}

if ($method !== 'POST') {
    json_error('Método no permitido', 405);
}

$body   = read_body_json();
$action = $body['action'] ?? '';
$email  = safe_email($body['email'] ?? '');
if (!$email) json_error('Email requerido');

// "price-viewed": el usuario tiene carrito / está mirando precios (upsert).
// "page-left": igual, pero porque ha cerrado/abandonado la página (beacon)
//              → además dispara el email de aviso inmediatamente.
if ($action === 'price-viewed' || $action === 'page-left') {
    $name        = mb_substr(trim_str($body['name'] ?? ''), 0, 100);
    $phone       = mb_substr(trim_str($body['phone'] ?? ''), 0, 30);
    $weddingDate = mb_substr(trim_str($body['weddingDate'] ?? ''), 0, 10);
    $dj          = mb_substr(trim_str($body['dj'] ?? ''), 0, 100);
    $total       = isset($body['total']) ? (float)$body['total'] : 0;

    // Carrito: solo nombre/precio/cantidad, máximo 30 items
    $cart = [];
    if (isset($body['cart']) && is_array($body['cart'])) {
        foreach (array_slice($body['cart'], 0, 30) as $item) {
            $iname = mb_substr(trim_str($item['name'] ?? ''), 0, 120);
            if (!$iname) continue;
            $cart[] = [
                'name'  => $iname,
                'price' => isset($item['price']) ? (float)$item['price'] : 0,
                'qty'   => isset($item['qty']) ? (int)$item['qty'] : 1,
            ];
        }
    }

    with_locked_json('leads.json', function ($leads) use ($action, $email, $name, $phone, $weddingDate, $dj, $total, $cart) {
        $found = false;
        foreach ($leads as $idx => $l) {
            if (isset($l['email']) && strtolower($l['email']) === $email) {
                $leads[$idx]['name']        = $name ?: ($l['name'] ?? '');
                $leads[$idx]['phone']       = $phone ?: ($l['phone'] ?? '');
                $leads[$idx]['weddingDate'] = $weddingDate ?: ($l['weddingDate'] ?? '');
                $leads[$idx]['dj']          = $dj;
                $leads[$idx]['cart']        = $cart;
                $leads[$idx]['total']       = $total;
                // Si ya había enviado, o se le avisó hace más de 24h, esto es
                // un ciclo de interés NUEVO → vuelve a ser notificable.
                if (($l['status'] ?? '') === 'enviado'
                    || (!empty($l['notifiedAt']) && strtotime($l['notifiedAt']) < time() - LEADS_RENOTIFY_AFTER)) {
                    $leads[$idx]['notifiedAt'] = null;
                }
                $leads[$idx]['status']   = 'abandonado';
                $leads[$idx]['left']     = ($action === 'page-left'); // cerró la página
                $leads[$idx]['viewedAt'] = date('c');
                $found = true;
                break;
            }
        }
        if (!$found) {
            $leads[] = [
                'id'          => bin2hex(random_bytes(8)),
                'email'       => $email,
                'name'        => $name,
                'phone'       => $phone,
                'weddingDate' => $weddingDate,
                'dj'          => $dj,
                'cart'        => $cart,
                'total'       => $total,
                'status'      => 'abandonado',
                'left'        => ($action === 'page-left'),
                'viewedAt'    => date('c'),
                'sentAt'      => null,
                'notifiedAt'  => null,
            ];
        }
        return $leads;
    });

    // Cerró la página con carrito sin enviar → email de aviso inmediato
    if ($action === 'page-left' && count($cart) > 0) {
        $leads = read_json('leads.json', []);
        foreach ($leads as $l) {
            if (!isset($l['email']) || strtolower($l['email']) !== $email) continue;
            if (($l['status'] ?? '') !== 'abandonado') break;
            if (!empty($l['notifiedAt']) && strtotime($l['notifiedAt']) > time() - LEADS_RENOTIFY_AFTER) break;
            if (leads_send_alert($l)) {
                with_locked_json('leads.json', function ($leads) use ($email) {
                    foreach ($leads as $i => $x) {
                        if (isset($x['email']) && strtolower($x['email']) === $email) {
                            $leads[$i]['notifiedAt'] = date('c');
                            return $leads;
                        }
                    }
                    return null;
                });
            }
            break;
        }
    }

    json_response(['ok' => true]);
}

if ($action === 'budget-sent') {
    with_locked_json('leads.json', function ($leads) use ($email) {
        foreach ($leads as $idx => $l) {
            if (isset($l['email']) && strtolower($l['email']) === $email) {
                $leads[$idx]['status'] = 'enviado';
                $leads[$idx]['sentAt'] = date('c');
                return $leads;
            }
        }
        return null; // no existía lead — nada que marcar
    });
    json_response(['ok' => true]);
}

json_error('Acción no reconocida');
