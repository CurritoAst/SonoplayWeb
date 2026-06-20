/* ============================================================
   SONOPLAY — Consentimiento de cookies (RGPD / LSSI)
   - Muestra un banner hasta que el usuario acepta o rechaza.
   - Las cookies de analítica/marketing (Analytics, Meta Pixel) SOLO se
     cargan si el usuario ACEPTA. Por defecto NO se carga nada.
   - Inyecta los enlaces legales en el pie y un acceso para reconfigurar.

   CONFIG: cuando tengas tus IDs reales, ponlos aquí (NO en el HTML). Si los
   dejas vacíos, simplemente no se carga esa herramienta.
   ============================================================ */
(function () {
  var GA4_ID   = '';   // ej: 'G-XXXXXXXXXX' (Google Analytics 4)
  var META_PIXEL_ID = ''; // ej: '123456789012345' (Meta/Facebook Pixel)

  var KEY = 'sonoplay_cookie_consent'; // 'accepted' | 'rejected'

  function getConsent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // ---- Cargadores de analítica (solo se llaman si hay consentimiento) ----
  function loadAnalytics() {
    if (GA4_ID) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA4_ID, { anonymize_ip: true });
    }
    if (META_PIXEL_ID) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
  }

  // Borra cookies de analítica si el usuario ha rechazado (limpieza defensiva)
  function clearTrackingCookies() {
    var names = ['_ga', '_gid', '_gat', '_fbp', '_fbc'];
    var host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (names.indexOf(n) !== -1 || n.indexOf('_ga_') === 0) {
        ['', '.' + host, host].forEach(function (d) {
          document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  // ---- Banner ----
  function buildBanner() {
    if (document.getElementById('cookie-banner')) return;
    var b = document.createElement('div');
    b.id = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Aviso de cookies');
    b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:0 auto;background:linear-gradient(135deg,#16161f,#20203a);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:20px 22px;box-shadow:0 18px 50px rgba(0,0,0,0.6);font-family:Montserrat,Arial,sans-serif;color:#e8e8f4;';
    b.innerHTML =
      '<p style="margin:0 0 12px;font-size:0.9rem;line-height:1.55;">' +
        '🍪 Usamos cookies propias y de terceros para el funcionamiento de la web y, con tu permiso, para analítica y marketing. ' +
        'Puedes aceptarlas, rechazarlas o leer más en nuestra <a href="politica-cookies.html" style="color:#06b6d4;text-decoration:underline;">Política de Cookies</a>.' +
      '</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;align-items:center;">' +
        '<a href="politica-privacidad.html" style="margin-right:auto;color:#9a9ac0;font-size:0.8rem;text-decoration:underline;">Política de Privacidad</a>' +
        '<button id="cookie-reject" style="background:transparent;color:#e8e8f4;border:1px solid rgba(255,255,255,0.25);padding:10px 18px;border-radius:10px;font-weight:600;font-size:0.85rem;cursor:pointer;font-family:inherit;">Rechazar</button>' +
        '<button id="cookie-accept" style="background:var(--cyan,#06b6d4);color:#000;border:none;padding:10px 20px;border-radius:10px;font-weight:800;font-size:0.85rem;cursor:pointer;font-family:inherit;">Aceptar</button>' +
      '</div>';
    document.body.appendChild(b);
    document.getElementById('cookie-accept').addEventListener('click', function () { accept(); });
    document.getElementById('cookie-reject').addEventListener('click', function () { reject(); });
  }
  function removeBanner() { var b = document.getElementById('cookie-banner'); if (b) b.remove(); }

  function decided() { try { window.dispatchEvent(new CustomEvent('sonoplay:cookies-decided')); } catch (e) {} }
  function accept() { setConsent('accepted'); removeBanner(); loadAnalytics(); decided(); }
  function reject() { setConsent('rejected'); removeBanner(); clearTrackingCookies(); decided(); }

  // Reabrir preferencias (enlace "Configurar cookies" del pie)
  window.sonoplayOpenCookies = function () { buildBanner(); };

  // ---- Enlaces legales en el pie ----
  function injectFooterLinks() {
    if (document.getElementById('legal-footer-links')) return;
    var wrap = document.createElement('div');
    wrap.id = 'legal-footer-links';
    wrap.style.cssText = 'text-align:center;padding:18px 16px;font-size:0.8rem;color:#8a8ab0;border-top:1px solid rgba(255,255,255,0.08);';
    wrap.innerHTML =
      '<a href="aviso-legal.html" style="color:#8a8ab0;text-decoration:none;margin:0 8px;">Aviso Legal</a>·' +
      '<a href="politica-privacidad.html" style="color:#8a8ab0;text-decoration:none;margin:0 8px;">Privacidad</a>·' +
      '<a href="politica-cookies.html" style="color:#8a8ab0;text-decoration:none;margin:0 8px;">Cookies</a>·' +
      '<a href="#" onclick="sonoplayOpenCookies();return false;" style="color:#8a8ab0;text-decoration:none;margin:0 8px;">Configurar cookies</a>';
    var footer = document.getElementById('footer') || document.querySelector('footer');
    if (footer) footer.appendChild(wrap); else document.body.appendChild(wrap);
  }

  function init() {
    injectFooterLinks();
    var c = getConsent();
    if (c === 'accepted') loadAnalytics();
    else if (c === 'rejected') clearTrackingCookies();
    else buildBanner(); // sin decisión aún → mostrar banner
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
