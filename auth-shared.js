/* ============================================
   SONOPLAY — Auth Modal (compartido entre páginas)
   - Email/password vía /api/users.php (servidor compartido)
   - Google Sign-In (Google Identity Services)
   - Sesión local en localStorage 'sonoplay_user'
   ============================================ */

const GOOGLE_CLIENT_ID = '453204425742-in0ohhppbgcnm1ig69o34hcsolt1v6pq.apps.googleusercontent.com';
const ADMIN_EMAIL = 'producciones@sonoplay.es'; // Email admin para Google Sign-In (lowercase)

document.addEventListener('DOMContentLoaded', () => {

  // Cuenta admin con email/password — hardcodeada como fallback de gestión.
  // (Cualquier login con admin@sonoplay.es/admin123 funciona sin pasar por servidor.)
  const ADMIN_ACCOUNT = { email: 'admin@sonoplay.es', password: 'admin123', role: 'admin', name: 'Administrador' };

  function getUser()    { return JSON.parse(localStorage.getItem('sonoplay_user') || 'null'); }
  function isLoggedIn() { return !!getUser(); }
  function isAdmin()    { const u = getUser(); return u && u.role === 'admin'; }

  // ---------- API HELPERS ----------
  async function apiPost(action, payload) {
    const res = await fetch('api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action }, payload || {}))
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); }
    catch (e) { throw new Error('Respuesta inválida del servidor'); }
    return data;
  }

  // ---------- AUTO-MIGRACIÓN SILENCIOSA ----------
  // Si este navegador tiene usuarios registrados antes de la migración al servidor
  // (en localStorage 'sonoplay_users'), los sube en background. La operación es
  // idempotente — duplicados se ignoran. Tras éxito, limpia la caché local para
  // no repetir la llamada en cada visita.
  (async function autoMigrateLegacyUsers() {
    try {
      const raw = localStorage.getItem('sonoplay_users');
      if (!raw) return;
      const local = JSON.parse(raw);
      if (!Array.isArray(local) || local.length === 0) return;
      const r = await apiPost('migrate', { users: local });
      if (r && r.ok) {
        // Datos ya en servidor: limpiamos para no reenviar en futuras visitas
        localStorage.removeItem('sonoplay_users');
        if (r.added > 0) console.info('[Sonoplay] Migración automática: ' + r.added + ' usuario(s) sincronizado(s) al servidor');
      }
    } catch (e) {
      // Silencioso — si el servidor no responde, lo intentamos en la siguiente visita
    }
  })();

  const authModal      = document.getElementById('auth-modal');
  const authForm       = document.getElementById('auth-form');
  const authTitle      = document.getElementById('auth-title');
  const authToggle     = document.getElementById('auth-toggle');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authSubmit     = document.getElementById('auth-submit');
  const authError      = document.getElementById('auth-error');
  const authNameField    = document.getElementById('auth-name-field');
  const authPhoneField   = document.getElementById('auth-phone-field');
  const authWeddingField = document.getElementById('auth-wedding-field');
  const navLoginBtn      = document.getElementById('nav-login-btn');

  if (!authModal || !navLoginBtn) return;

  let isRegisterMode = false;

  function showAuthError(msg) { authError.textContent = msg; authError.style.display = 'block'; }
  function hideAuthError()    { authError.style.display = 'none'; }
  function openAuthModal()    { authModal.style.display = 'flex'; hideAuthError(); }

  function setSubmitting(busy) {
    if (!authSubmit) return;
    authSubmit.disabled = !!busy;
    if (busy) {
      authSubmit.dataset.originalText = authSubmit.dataset.originalText || authSubmit.textContent;
      authSubmit.textContent = 'Cargando…';
    } else if (authSubmit.dataset.originalText) {
      authSubmit.textContent = authSubmit.dataset.originalText;
    }
  }

  function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      authTitle.textContent      = 'Crear cuenta';
      authSubmit.textContent     = 'Registrarse';
      authToggleText.textContent = '¿Ya tienes cuenta?';
      authToggle.textContent     = ' Inicia sesión';
      authNameField.style.display  = 'block';
      authPhoneField.style.display = 'block';
      if (authWeddingField) authWeddingField.style.display = 'block';
    } else {
      authTitle.textContent      = 'Iniciar sesión';
      authSubmit.textContent     = 'Entrar';
      authToggleText.textContent = '¿No tienes cuenta?';
      authToggle.textContent     = ' Regístrate';
      authNameField.style.display  = 'none';
      authPhoneField.style.display = 'none';
      if (authWeddingField) authWeddingField.style.display = 'none';
    }
    delete authSubmit.dataset.originalText;
    hideAuthError();
  }

  function updateAuthUI() {
    const user = getUser();
    if (user) {
      navLoginBtn.textContent = user.role === 'admin' ? 'Panel Admin' : 'Cerrar sesión';
      navLoginBtn.style.color = user.role === 'admin' ? '#22c55e' : 'var(--cyan)';
    } else {
      navLoginBtn.textContent = 'Iniciar sesión';
      navLoginBtn.style.color = 'var(--cyan)';
    }
  }

  authToggle.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    const name     = document.getElementById('auth-name').value.trim();
    const phone    = document.getElementById('auth-phone').value.trim();
    const weddingInput = document.getElementById('auth-wedding');
    const weddingDate  = weddingInput ? weddingInput.value.trim() : '';

    if (!email || !password) { showAuthError('Email y contraseña son obligatorios'); return; }

    if (isRegisterMode) {
      if (!name) { showAuthError('Introduce tu nombre'); return; }
      if (phone.replace(/\D/g, '').length < 6) { showAuthError('Introduce un teléfono válido'); return; }
      if (weddingInput && !weddingDate) { showAuthError('Indícanos la fecha de tu boda o evento'); return; }
      setSubmitting(true);
      try {
        const r = await apiPost('register', { name, email, password, phone, weddingDate });
        if (!r.ok) { showAuthError(r.error || 'Error en el registro'); return; }
        // Sesión local con el usuario devuelto por el servidor
        localStorage.setItem('sonoplay_user', JSON.stringify(r.user));
      } catch (err) {
        showAuthError('No se pudo conectar al servidor. Inténtalo de nuevo.');
        return;
      } finally {
        setSubmitting(false);
      }
    } else {
      // Login admin: fallback hardcoded sin servidor
      if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
        localStorage.setItem('sonoplay_user', JSON.stringify(ADMIN_ACCOUNT));
        authModal.style.display = 'none';
        updateAuthUI();
        return;
      }
      // Login usuario normal: pasa por servidor
      setSubmitting(true);
      try {
        let r = await apiPost('login', { email, password });
        if (!r.ok) {
          // FALLBACK PARA USUARIOS LEGACY:
          // Si el servidor no tiene este usuario pero lo encontramos en localStorage
          // (registrado antes de la migración en este navegador), lo damos de alta
          // automáticamente en el servidor y reintentamos el login.
          const localRaw = localStorage.getItem('sonoplay_users');
          const localUsers = localRaw ? JSON.parse(localRaw) : [];
          const legacy = Array.isArray(localUsers)
            ? localUsers.find(u => u && u.email === email && u.password === password)
            : null;
          if (legacy) {
            const reg = await apiPost('register', {
              name:  legacy.name  || email.split('@')[0],
              email: legacy.email,
              password: password,
              phone: legacy.phone || ''
            });
            if (reg && reg.ok) {
              r = await apiPost('login', { email, password });
            }
          }
        }
        if (!r.ok) { showAuthError(r.error || 'Email o contraseña incorrectos'); return; }
        localStorage.setItem('sonoplay_user', JSON.stringify(r.user));
      } catch (err) {
        showAuthError('No se pudo conectar al servidor. Inténtalo de nuevo.');
        return;
      } finally {
        setSubmitting(false);
      }
    }
    authModal.style.display = 'none';
    updateAuthUI();
    // Notifica al resto de la página (script.js) para refrescar precios
    // ocultos y retomar la acción que el usuario tenía pendiente.
    window.dispatchEvent(new CustomEvent('sonoplay:auth-changed'));
  });

  navLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoggedIn()) {
      if (isAdmin()) {
        window.location.href = 'admin.html';
      } else {
        // Logout
        localStorage.removeItem('sonoplay_user');
        if (window.google && google.accounts && google.accounts.id) {
          try { google.accounts.id.disableAutoSelect(); } catch (_) {}
        }
        updateAuthUI();
      }
    } else {
      openAuthModal();
    }
  });

  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.style.display = 'none';
  });

  updateAuthUI();

  // ============== GOOGLE SIGN-IN ==============

  function decodeJwtPayload(jwt) {
    try {
      const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
      const json = decodeURIComponent(atob(padded).split('').map(c =>
        '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
      ).join(''));
      return JSON.parse(json);
    } catch (e) {
      console.error('Error decoding Google JWT', e);
      return null;
    }
  }

  async function handleGoogleCredential(response) {
    const payload = decodeJwtPayload(response.credential);
    if (!payload || !payload.email) {
      showAuthError('No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.');
      return;
    }
    const email    = String(payload.email).toLowerCase();
    const name     = payload.name || payload.given_name || email.split('@')[0];
    const picture  = payload.picture || null;
    const googleId = payload.sub || '';
    const isAdminEmail = email === ADMIN_EMAIL;

    if (isAdminEmail) {
      // Admin vía Google: sesión local, redirige al panel
      const user = { name, email, picture, phone: '', role: 'admin', provider: 'google', date: new Date().toLocaleDateString('es-ES') };
      localStorage.setItem('sonoplay_user', JSON.stringify(user));
      authModal.style.display = 'none';
      updateAuthUI();
      window.location.href = 'admin.html';
      return;
    }

    // Usuario normal: registramos/loggeamos en el servidor
    try {
      const r = await apiPost('google', { email, name, googleId });
      if (!r.ok) { showAuthError(r.error || 'Error iniciando sesión con Google'); return; }
      const user = Object.assign({}, r.user, { picture, provider: 'google' });
      localStorage.setItem('sonoplay_user', JSON.stringify(user));
      authModal.style.display = 'none';
      updateAuthUI();
      window.dispatchEvent(new CustomEvent('sonoplay:auth-changed'));

      // Si el usuario Google no tiene teléfono o fecha de boda guardados, los
      // pedimos antes de continuar. Aparece la primera vez tras registrarse y
      // en cada login hasta que los introduzca.
      if (!user.phone || !user.weddingDate) {
        showPhonePrompt({ email, googleId, name, phone: user.phone || '', weddingDate: user.weddingDate || '' });
      }
    } catch (err) {
      showAuthError('No se pudo conectar al servidor.');
    }
  }

  // ---------- MODAL PEDIR TELÉFONO (usuarios Google) ----------
  function showPhonePrompt(ctx) {
    if (document.getElementById('phone-prompt-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'phone-prompt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:10500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.25s;';
    overlay.innerHTML =
      '<div style="background:var(--dark2,#151520);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:20px;padding:36px 30px;max-width:420px;width:100%;text-align:center;animation:cartSlideIn 0.3s;">' +
        '<div style="font-size:2.5rem;margin-bottom:10px;">📱</div>' +
        '<h3 style="color:#fff;font-size:1.35rem;font-weight:700;margin:0 0 8px;">¡Bienvenido' + (ctx.name ? ', ' + escapeHTML(ctx.name.split(' ')[0]) : '') + '! 👋</h3>' +
        '<p style="color:var(--text-muted,#9ca3af);font-size:0.92rem;line-height:1.5;margin:0 0 22px;">Para terminar de configurar tu cuenta y que podamos contactarte rápido con tu presupuesto, déjanos tu <strong style="color:var(--cyan,#06b6d4);">número de teléfono</strong> y la <strong style="color:var(--cyan,#06b6d4);">fecha de tu boda o evento</strong>.</p>' +
        '<form id="phone-prompt-form">' +
          '<input type="tel" id="phone-prompt-input" placeholder="Ej. 600 12 34 56" required autocomplete="tel" inputmode="tel" style="width:100%;background:var(--dark3,#1f1f2e);border:1px solid var(--border,rgba(255,255,255,0.1));color:#fff;padding:14px 16px;border-radius:12px;font-size:1rem;margin-bottom:8px;font-family:inherit;outline:none;text-align:center;letter-spacing:0.05em;" />' +
          '<label style="display:block;color:var(--text-muted,#9ca3af);font-size:0.78rem;text-align:left;margin:8px 0 4px;">Fecha de tu boda / evento</label>' +
          '<input type="date" id="wedding-prompt-input" required style="width:100%;background:var(--dark3,#1f1f2e);border:1px solid var(--border,rgba(255,255,255,0.1));color:#fff;padding:14px 16px;border-radius:12px;font-size:1rem;margin-bottom:8px;font-family:inherit;outline:none;text-align:center;color-scheme:dark;" />' +
          '<div id="phone-prompt-error" style="display:none;color:#ef4444;font-size:0.85rem;margin:6px 0 12px;"></div>' +
          '<button type="submit" id="phone-prompt-submit" style="width:100%;background:var(--cyan,#06b6d4);color:#000;border:none;padding:14px;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:14px;font-family:inherit;transition:opacity 0.2s;">Guardar y continuar</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    const form     = overlay.querySelector('#phone-prompt-form');
    const input    = overlay.querySelector('#phone-prompt-input');
    const weddingI = overlay.querySelector('#wedding-prompt-input');
    const errEl    = overlay.querySelector('#phone-prompt-error');
    const submit   = overlay.querySelector('#phone-prompt-submit');

    // Prerrellena lo que ya sepamos (ej. tiene teléfono pero falta la fecha)
    if (ctx.phone) input.value = ctx.phone;
    if (ctx.weddingDate && weddingI) weddingI.value = ctx.weddingDate;

    setTimeout(() => input.focus(), 100);

    function showErr(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      const phone = input.value.trim();
      const weddingDate = weddingI ? weddingI.value.trim() : '';
      if (phone.replace(/\D/g, '').length < 6) { showErr('Introduce un teléfono válido'); return; }
      if (weddingI && !weddingDate) { showErr('Indícanos la fecha de tu boda o evento'); return; }

      submit.disabled = true;
      submit.textContent = 'Guardando…';
      try {
        const r = await apiPost('update-phone', { email: ctx.email, googleId: ctx.googleId, phone, weddingDate });
        if (!r || !r.ok) { showErr((r && r.error) || 'Error al guardar el teléfono'); return; }
        // Actualiza la sesión local con los datos nuevos
        const u = getUser();
        if (u) { u.phone = phone; u.weddingDate = weddingDate; localStorage.setItem('sonoplay_user', JSON.stringify(u)); }
        overlay.remove();
      } catch (err) {
        showErr('No se pudo conectar al servidor');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Guardar y continuar';
      }
    });
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Inyectar el "o" + el contenedor del botón Google en el modal
  function injectGoogleSection() {
    if (document.getElementById('google-signin-btn')) return;
    const divider = document.createElement('div');
    divider.className = 'auth-divider';
    divider.textContent = 'o';
    const btnWrap = document.createElement('div');
    btnWrap.id = 'google-signin-btn';
    btnWrap.style.cssText = 'display:flex;justify-content:center;margin-top:6px;';
    authForm.insertAdjacentElement('afterend', btnWrap);
    authForm.insertAdjacentElement('afterend', divider);
  }

  function renderGoogleButton() {
    if (!window.google || !google.accounts || !google.accounts.id) return false;
    const btn = document.getElementById('google-signin-btn');
    if (!btn) return false;
    if (btn.dataset.rendered === '1') return true;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    google.accounts.id.renderButton(btn, {
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 280
    });
    btn.dataset.rendered = '1';
    return true;
  }

  function loadGoogleScriptAndRender() {
    injectGoogleSection();
    if (window.google && google.accounts && google.accounts.id) {
      renderGoogleButton();
      return;
    }
    if (document.querySelector('script[data-gsi]')) {
      const wait = setInterval(() => {
        if (renderGoogleButton()) clearInterval(wait);
      }, 200);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.dataset.gsi = '1';
    s.onload = renderGoogleButton;
    document.head.appendChild(s);
  }

  loadGoogleScriptAndRender();
});
