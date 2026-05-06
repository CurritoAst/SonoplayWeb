/* ============================================
   SONOPLAY — Auth Modal (shared across all pages)
   - Email/password (legado)
   - Google Sign-In (Google Identity Services)
   ============================================ */

const GOOGLE_CLIENT_ID = '453204425742-in0ohhppbgcnm1ig69o34hcsolt1v6pq.apps.googleusercontent.com';
const ADMIN_EMAIL = 'producciones@sonoplay.es'; // siempre minúsculas

document.addEventListener('DOMContentLoaded', () => {

  const ADMIN_ACCOUNT = { email: 'admin@sonoplay.es', password: 'admin123', role: 'admin', name: 'Administrador' };

  function getUser()  { return JSON.parse(localStorage.getItem('sonoplay_user') || 'null'); }
  function getUsers() { return JSON.parse(localStorage.getItem('sonoplay_users') || '[]'); }
  function saveUsers(users) { localStorage.setItem('sonoplay_users', JSON.stringify(users)); }
  function isLoggedIn() { return !!getUser(); }
  function isAdmin()  { const u = getUser(); return u && u.role === 'admin'; }

  const authModal      = document.getElementById('auth-modal');
  const authForm       = document.getElementById('auth-form');
  const authTitle      = document.getElementById('auth-title');
  const authToggle     = document.getElementById('auth-toggle');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authSubmit     = document.getElementById('auth-submit');
  const authError      = document.getElementById('auth-error');
  const authNameField  = document.getElementById('auth-name-field');
  const authPhoneField = document.getElementById('auth-phone-field');
  const navLoginBtn    = document.getElementById('nav-login-btn');

  if (!authModal || !navLoginBtn) return;

  let isRegisterMode = false;

  function showAuthError(msg) { authError.textContent = msg; authError.style.display = 'block'; }
  function hideAuthError()    { authError.style.display = 'none'; }
  function openAuthModal()    { authModal.style.display = 'flex'; hideAuthError(); }

  function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      authTitle.textContent      = 'Crear cuenta';
      authSubmit.textContent     = 'Registrarse';
      authToggleText.textContent = '¿Ya tienes cuenta?';
      authToggle.textContent     = ' Inicia sesión';
      authNameField.style.display  = 'block';
      authPhoneField.style.display = 'block';
    } else {
      authTitle.textContent      = 'Iniciar sesión';
      authSubmit.textContent     = 'Entrar';
      authToggleText.textContent = '¿No tienes cuenta?';
      authToggle.textContent     = ' Regístrate';
      authNameField.style.display  = 'none';
      authPhoneField.style.display = 'none';
    }
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

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    const name     = document.getElementById('auth-name').value.trim();
    const phone    = document.getElementById('auth-phone').value.trim();

    if (isRegisterMode) {
      if (!name) { showAuthError('Introduce tu nombre'); return; }
      const users = getUsers();
      if (users.find(u => u.email === email)) { showAuthError('Este email ya está registrado'); return; }
      const newUser = { name, email, password, phone, role: 'user', date: new Date().toLocaleDateString('es-ES') };
      users.push(newUser);
      saveUsers(users);
      localStorage.setItem('sonoplay_user', JSON.stringify(newUser));
    } else {
      if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
        localStorage.setItem('sonoplay_user', JSON.stringify(ADMIN_ACCOUNT));
        authModal.style.display = 'none';
        updateAuthUI();
        return;
      }
      const users = getUsers();
      const user  = users.find(u => u.email === email && u.password === password);
      if (!user) { showAuthError('Email o contraseña incorrectos'); return; }
      localStorage.setItem('sonoplay_user', JSON.stringify(user));
    }
    authModal.style.display = 'none';
    updateAuthUI();
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

  function handleGoogleCredential(response) {
    const payload = decodeJwtPayload(response.credential);
    if (!payload || !payload.email) {
      showAuthError('No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.');
      return;
    }
    const email   = String(payload.email).toLowerCase();
    const name    = payload.name || payload.given_name || email.split('@')[0];
    const picture = payload.picture || null;
    const isAdminEmail = email === ADMIN_EMAIL;

    const user = {
      name,
      email,
      picture,
      phone: '',
      role: isAdminEmail ? 'admin' : 'user',
      provider: 'google',
      date: new Date().toLocaleDateString('es-ES')
    };

    // Para usuarios normales: añadir al listado si no existe
    if (!isAdminEmail) {
      const users = getUsers();
      if (!users.find(u => u.email === email)) {
        users.push({ ...user, password: null });
        saveUsers(users);
      }
    }

    localStorage.setItem('sonoplay_user', JSON.stringify(user));
    authModal.style.display = 'none';
    updateAuthUI();

    // Si es admin, redirigir directamente al panel
    if (isAdminEmail) {
      window.location.href = 'admin.html';
    }
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
      // Ya cargando — esperar
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
