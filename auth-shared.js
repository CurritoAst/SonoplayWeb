/* ============================================
   SONOPLAY — Auth Modal (shared across all pages)
   ============================================ */

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
        localStorage.removeItem('sonoplay_user');
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
});
