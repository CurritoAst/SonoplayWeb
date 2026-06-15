# SONOPLAY — Servicio WhatsApp (open-wa) en VPS IONOS

Envía WhatsApp automáticos a los clientes (p. ej. confirmación al solicitar
presupuesto). Corre en tu **VPS de IONOS**, NO en el hosting DirectAdmin.

```
[ Web sonoplay.es (PHP) ]  --POST /send-->  [ VPS IONOS : Node + open-wa ]  --> WhatsApp del cliente
```

> ⚠️ open-wa es **no oficial**. Úsalo solo para mensajes que el cliente espera
> (confirmaciones). Enviar mensajes masivos o no solicitados puede provocar el
> **baneo del número**. Para volumen alto, migra a la WhatsApp Business Cloud API.

---

## 1. Preparar el VPS (Ubuntu) — una sola vez

Conéctate por SSH a tu VPS IONOS y ejecuta:

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Dependencias de Chromium que open-wa necesita
sudo apt-get install -y chromium-browser ca-certificates fonts-liberation \
  libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
  libdbus-1-3 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
  libxdamage1 libxrandr2 xdg-utils wget

# PM2 para mantenerlo siempre encendido
sudo npm install -g pm2
```

## 2. Subir y arrancar el servicio

```bash
# Sube la carpeta openwa-server/ al VPS (scp, git, etc.). Luego:
cd openwa-server
npm install
cp .env.example .env
nano .env        # pon un WA_TOKEN largo y aleatorio (apúntalo, lo necesita el PHP)

# Primer arranque EN PRIMER PLANO para escanear el QR con el WhatsApp del negocio:
npm start
# → aparece un QR en la terminal. Escanéalo con WhatsApp del móvil del negocio:
#   WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo.
# Cuando veas "WhatsApp listo. Servicio operativo." funciona. Para con Ctrl+C.

# Ahora déjalo corriendo siempre con PM2:
pm2 start server.js --name sonoplay-wa
pm2 save
pm2 startup       # ejecuta el comando que te imprima, para que arranque al reiniciar
```

Comprueba que vive:
```bash
curl http://localhost:3000/health
# {"ok":true,"ready":true,"session":"SONOPLAY"}
```

## 3. Exponerlo a internet de forma segura

El PHP de sonoplay.es tiene que poder llamar al VPS. Opciones:

- **Sencilla:** abre el puerto 3000 en el firewall de IONOS **solo** a la IP del
  servidor de tu hosting (no a todo internet). El token ya protege el endpoint,
  pero limitar por IP es una capa más.
- **Recomendada:** pon **nginx** delante con HTTPS (un subdominio tipo
  `wa.sonoplay.es` apuntando al VPS) y `proxy_pass` al puerto 3000. Así el PHP
  llama a `https://wa.sonoplay.es/send`.

## 4. Conectar el PHP

En `api/_common.php` (en DirectAdmin) rellena:

```php
const WA_API_URL   = 'https://wa.sonoplay.es/send';   // o http://IP_DEL_VPS:3000/send
const WA_API_TOKEN = 'el-mismo-WA_TOKEN-del-.env';
```

Con eso, al enviar un presupuesto el cliente recibe un WhatsApp de confirmación.

## Mantenimiento

```bash
pm2 logs sonoplay-wa     # ver registro
pm2 restart sonoplay-wa  # reiniciar
pm2 status               # estado
```

Si WhatsApp cierra la sesión (raro), vuelve a `npm start` en primer plano para
reescanear el QR y luego `pm2 restart sonoplay-wa`.
