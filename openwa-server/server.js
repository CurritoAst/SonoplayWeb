/**
 * SONOPLAY — Servicio de envío de WhatsApp (open-wa)
 *
 * Corre en un VPS (NO en el hosting PHP). Levanta una sesión de WhatsApp Web
 * (escaneando un QR la primera vez con el WhatsApp del negocio) y expone un
 * endpoint HTTP protegido por token para enviar mensajes.
 *
 * El backend PHP (api/_common.php → send_whatsapp) llama a POST /send.
 *
 *   POST /send   { token, phone, message }   → envía un WhatsApp
 *   GET  /health                              → estado del servicio
 *
 * ⚠️  open-wa es NO oficial: úsalo con moderación (solo mensajes esperados por
 *     el cliente, como confirmaciones) para minimizar el riesgo de baneo del
 *     número. Para volumen alto usa la WhatsApp Business Cloud API oficial.
 */

require('dotenv').config();
const express = require('express');
const { create } = require('@open-wa/wa-automate');

const PORT      = process.env.PORT || 3000;
const WA_TOKEN  = process.env.WA_TOKEN || '';
const SESSION   = process.env.WA_SESSION || 'SONOPLAY';

if (!WA_TOKEN) {
  console.error('✖ Falta WA_TOKEN en el .env. Aborto por seguridad.');
  process.exit(1);
}

let waClient = null;          // cliente open-wa cuando esté listo
const app = express();
app.use(express.json({ limit: '64kb' }));

// Normaliza un teléfono español a formato internacional sin signos: 600111222 → 34600111222
function normalizePhone(raw) {
  let num = String(raw || '').replace(/\D/g, '');
  if (!num) return '';
  num = num.replace(/^0+/, '');            // quita ceros a la izquierda
  if (num.length === 9) num = '34' + num;  // móvil español sin prefijo → +34
  return num;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, ready: !!waClient, session: SESSION });
});

app.post('/send', async (req, res) => {
  const { token, phone, message } = req.body || {};
  if (token !== WA_TOKEN) return res.status(403).json({ ok: false, error: 'Token inválido' });
  if (!waClient)          return res.status(503).json({ ok: false, error: 'WhatsApp aún no está listo' });

  const num = normalizePhone(phone);
  if (!num)               return res.status(400).json({ ok: false, error: 'Teléfono inválido' });
  if (!message || String(message).trim().length < 2) {
    return res.status(400).json({ ok: false, error: 'Mensaje vacío' });
  }

  const chatId = num + '@c.us';
  try {
    // Comprueba que el número tiene WhatsApp antes de enviar
    const exists = await waClient.checkNumberStatus(chatId).catch(() => null);
    if (exists && exists.numberExists === false) {
      return res.status(422).json({ ok: false, error: 'El número no tiene WhatsApp' });
    }
    await waClient.sendText(chatId, String(message));
    console.log(`✔ WhatsApp enviado a ${num}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('✖ Error enviando WhatsApp:', err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: 'No se pudo enviar el WhatsApp' });
  }
});

// Arranca open-wa y, cuando está listo, el servidor HTTP
create({
  sessionId: SESSION,
  multiDevice: true,
  headless: true,
  qrTimeout: 0,            // no caduca el QR mientras escaneas
  authTimeout: 0,
  blockCrashLogs: true,
  disableSpins: true,
  useChrome: true,
  // En VPS sin sandbox suele hacer falta:
  chromiumArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
})
  .then((client) => {
    waClient = client;
    console.log('✔ WhatsApp listo. Servicio operativo.');
    client.onStateChanged((state) => {
      console.log('Estado WA:', state);
      if (state === 'CONFLICT' || state === 'UNLAUNCHED') client.forceRefocus();
    });
    app.listen(PORT, () => console.log(`✔ HTTP escuchando en el puerto ${PORT}`));
  })
  .catch((err) => {
    console.error('✖ No se pudo iniciar open-wa:', err);
    process.exit(1);
  });
