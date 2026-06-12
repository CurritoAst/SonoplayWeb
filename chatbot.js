/* ============================================
   SONOPLAY — Asistente personal (chatbot guiado)
   Widget flotante con respuestas predefinidas y derivación a administración.
   Detecta si el usuario está logueado (localStorage 'sonoplay_user') y filtra
   los temas con datos económicos para usuarios anónimos.
   ============================================ */

(function () {
  'use strict';

  const PHONE_EZEQUIEL = '+34605216881';
  const PHONE_EZEQUIEL_DISPLAY = '605 21 68 81';
  const PHONE_ADMIN = '+34657468685';
  const PHONE_ADMIN_DISPLAY = '657 46 86 85';
  const WHATSAPP_URL = 'https://wa.me/34605216881?text=Hola%2C%20necesito%20ayuda%20con%20un%20evento';

  const TOPICS = [
    {
      id: 'precios',
      icon: '💰',
      label: 'Precios y presupuesto',
      requiresAuth: true,
      response: 'Tenemos montajes desde <strong>1.210 €</strong> (IVA incluido) hasta más de 3.000 €, según el tipo de evento. Cada paquete incluye estructura, iluminación, sonido y máquina de humo.<br><br>Para un <strong>presupuesto personalizado</strong> según tu fecha y lugar, lo mejor es que contactes con administración.'
    },
    {
      id: 'fechas',
      icon: '📅',
      label: 'Disponibilidad de fechas',
      response: 'Cubrimos toda Andalucía <strong>los 12 meses del año</strong>. En temporada alta (mayo-octubre) recomendamos reservar con antelación.<br><br>Para confirmar una fecha concreta, contacta con administración — te lo decimos al momento.'
    },
    {
      id: 'paquetes',
      icon: '🎵',
      label: '¿Qué incluye cada paquete?',
      response: 'Todos los paquetes incluyen:<br>• <strong>Estructura</strong> (varía según opción)<br>• <strong>Iluminación profesional</strong> (cabezas móviles, leds)<br>• <strong>Equipo de sonido</strong> adecuado al lugar<br>• <strong>Máquina de humo</strong><br><br>El DJ se contrata aparte (<strong>484 €</strong> · 5h). Mira el detalle en la sección "Opciones de Montaje" del Inicio.',
      responseAnon: 'Todos los paquetes incluyen:<br>• <strong>Estructura</strong> (varía según opción)<br>• <strong>Iluminación profesional</strong> (cabezas móviles, leds)<br>• <strong>Equipo de sonido</strong> adecuado al lugar<br>• <strong>Máquina de humo</strong><br><br>El DJ se contrata aparte. <em>Inicia sesión para ver precios.</em>'
    },
    {
      id: 'servicios',
      icon: '🎉',
      label: '¿Qué eventos hacéis?',
      response: 'Damos servicio integral para:<br>• <strong>Bodas</strong> (sonido, iluminación, DJ y ceremonia)<br>• <strong>Ferias y casetas</strong> de pueblo<br>• <strong>Festivales y conciertos</strong> en directo<br>• <strong>Eventos corporativos</strong> y empresariales<br><br>Más de 1.200 eventos producidos desde 2013.'
    },
    {
      id: 'donde',
      icon: '📍',
      label: '¿Dónde estáis?',
      response: 'Nuestras oficinas están en:<br><strong>Calle Alfarero nº3, Polígono ITV<br>Lebrija (Sevilla) · CP 41740</strong><br><br>Damos servicio en toda Andalucía.'
    },
    {
      id: 'contacto',
      icon: '🤝',
      label: 'Hablar con administración',
      response: 'Te paso con administración. Elige cómo prefieres contactar:',
      showContact: true
    }
  ];

  function isLoggedIn() {
    try { return !!JSON.parse(localStorage.getItem('sonoplay_user') || 'null'); }
    catch (e) { return false; }
  }

  function visibleTopics() {
    const logged = isLoggedIn();
    return TOPICS.filter(t => !t.requiresAuth || logged);
  }

  function getResponse(topic) {
    if (!isLoggedIn() && topic.responseAnon) return topic.responseAnon;
    return topic.response;
  }

  // ---------- Styles ----------
  const styles = `
    #sn-chat-bubble {
      position: fixed; right: 30px; bottom: 30px; z-index: 1000;
      width: 60px; height: 60px; border-radius: 50%;
      background: var(--cyan, #06b6d4); border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(6,182,212,0.5);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.3s, box-shadow 0.3s;
      color: #000;
    }
    #sn-chat-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(6,182,212,0.7); }
    #sn-chat-bubble.is-open { transform: scale(0.9); opacity: 0.7; }
    #sn-chat-bubble .sn-badge {
      position: absolute; top: -2px; right: -2px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #22c55e; border: 2px solid var(--dark, #0a0a0a);
      animation: snPulse 2s ease-in-out infinite;
    }
    @keyframes snPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
      50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    }

    #sn-chat-panel {
      position: fixed; right: 30px; bottom: 100px; z-index: 1001;
      width: 360px; max-width: calc(100vw - 40px);
      height: 560px; max-height: calc(100vh - 140px);
      background: var(--dark2, #151520);
      border: 1px solid var(--border, rgba(255,255,255,0.1));
      border-radius: 20px;
      display: none; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      animation: snSlideUp 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    #sn-chat-panel.is-open { display: flex; }
    @keyframes snSlideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .sn-chat-header {
      padding: 16px 18px; background: linear-gradient(135deg, var(--cyan, #06b6d4) 0%, #0891b2 100%);
      color: #000; display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .sn-chat-title { display: flex; align-items: center; gap: 10px; }
    .sn-chat-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
    }
    .sn-chat-name { font-weight: 700; font-size: 0.95rem; line-height: 1.2; }
    .sn-chat-status { font-size: 0.72rem; opacity: 0.75; display: flex; align-items: center; gap: 5px; }
    .sn-chat-status::before {
      content: ''; width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
      box-shadow: 0 0 0 2px rgba(34,197,94,0.25);
    }
    .sn-chat-close {
      background: rgba(0,0,0,0.15); border: none; color: #000;
      width: 30px; height: 30px; border-radius: 50%;
      font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .sn-chat-close:hover { background: rgba(0,0,0,0.3); }

    .sn-chat-body {
      flex: 1; overflow-y: auto; padding: 18px 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    .sn-chat-body::-webkit-scrollbar { width: 6px; }
    .sn-chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }

    .sn-msg {
      max-width: 90%; padding: 10px 14px; border-radius: 14px;
      font-size: 0.88rem; line-height: 1.5;
      animation: snFadeIn 0.25s ease;
    }
    @keyframes snFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .sn-msg-bot {
      background: var(--dark3, #1f1f2e); color: var(--text, #d1d5db);
      align-self: flex-start; border-bottom-left-radius: 4px;
    }
    .sn-msg-user {
      background: var(--cyan, #06b6d4); color: #000;
      align-self: flex-end; border-bottom-right-radius: 4px; font-weight: 600;
    }
    .sn-msg-locked {
      background: rgba(245,200,66,0.10); color: var(--gold, #f5c842);
      border: 1px solid rgba(245,200,66,0.3);
      align-self: stretch; text-align: center; font-weight: 500;
    }

    .sn-topics {
      display: flex; flex-direction: column; gap: 8px; margin-top: 4px;
      align-self: stretch;
    }
    .sn-topic-btn {
      background: var(--dark3, #1f1f2e); border: 1px solid var(--border, rgba(255,255,255,0.1));
      color: #fff; padding: 11px 14px; border-radius: 12px;
      font-size: 0.85rem; font-weight: 600; text-align: left;
      cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 10px;
    }
    .sn-topic-btn:hover {
      background: rgba(6,182,212,0.12); border-color: var(--cyan, #06b6d4);
      transform: translateX(2px);
    }
    .sn-topic-btn .sn-icon { font-size: 1.1rem; }

    .sn-login-btn {
      background: var(--gold, #f5c842); color: #000; border: none;
      padding: 11px 16px; border-radius: 12px;
      font-size: 0.88rem; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      align-self: stretch; transition: opacity 0.2s, transform 0.2s;
    }
    .sn-login-btn:hover { opacity: 0.92; transform: translateY(-1px); }

    .sn-continue-btn {
      background: var(--cyan, #06b6d4); color: #000; border: none;
      padding: 11px 18px; border-radius: 12px;
      font-size: 0.88rem; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      align-self: stretch; transition: opacity 0.2s, transform 0.2s;
      box-shadow: 0 4px 14px rgba(6,182,212,0.35);
    }
    .sn-continue-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(6,182,212,0.5); }

    .sn-contact-actions {
      display: flex; flex-direction: column; gap: 8px; margin-top: 8px;
      align-self: stretch;
    }
    .sn-contact-btn {
      padding: 12px 14px; border-radius: 12px; font-weight: 700; font-size: 0.88rem;
      text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.2s, transform 0.2s; border: none; cursor: pointer;
    }
    .sn-contact-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .sn-contact-call { background: var(--cyan, #06b6d4); color: #000; }
    .sn-contact-wa { background: #25d366; color: #fff; }

    .sn-chat-footer {
      padding: 8px 14px 10px; border-top: 1px solid var(--border, rgba(255,255,255,0.08));
      font-size: 0.7rem; color: var(--text-muted, #9ca3af); text-align: center;
      flex-shrink: 0;
    }

    @media (max-width: 600px) {
      #sn-chat-bubble { right: 20px; bottom: 20px; width: 54px; height: 54px; }
      #sn-chat-panel {
        right: 10px; left: 10px; bottom: 84px; width: auto; max-width: none;
        height: calc(100vh - 110px); max-height: none;
      }
    }
  `;

  // ---------- Inject ----------
  function init() {
    if (document.getElementById('sn-chat-bubble')) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const bubble = document.createElement('button');
    bubble.id = 'sn-chat-bubble';
    bubble.setAttribute('aria-label', 'Abrir asistente personal');
    bubble.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      '</svg>' +
      '<span class="sn-badge" aria-hidden="true"></span>';
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.id = 'sn-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'sn-chat-name');
    panel.innerHTML =
      '<div class="sn-chat-header">' +
        '<div class="sn-chat-title">' +
          '<div class="sn-chat-avatar">💬</div>' +
          '<div>' +
            '<div class="sn-chat-name" id="sn-chat-name">Asistente SONOPLAY</div>' +
            '<div class="sn-chat-status">En línea</div>' +
          '</div>' +
        '</div>' +
        '<button class="sn-chat-close" aria-label="Cerrar asistente">&times;</button>' +
      '</div>' +
      '<div class="sn-chat-body" id="sn-chat-body"></div>' +
      '<div class="sn-chat-footer">Asistente automático · Respuesta instantánea</div>';
    document.body.appendChild(panel);

    const body = panel.querySelector('#sn-chat-body');
    const closeBtn = panel.querySelector('.sn-chat-close');

    function addBot(html) {
      const msg = document.createElement('div');
      msg.className = 'sn-msg sn-msg-bot';
      msg.innerHTML = html;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function addUser(text) {
      const msg = document.createElement('div');
      msg.className = 'sn-msg sn-msg-user';
      msg.textContent = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function addLocked(html) {
      const msg = document.createElement('div');
      msg.className = 'sn-msg sn-msg-locked';
      msg.innerHTML = html;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function addLoginAction() {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sn-login-btn';
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>' +
        'Iniciar sesión';
      btn.addEventListener('click', () => {
        // Cierra el chat y abre el modal de auth
        panel.classList.remove('is-open');
        bubble.classList.remove('is-open');
        const navLogin = document.getElementById('nav-login-btn');
        if (navLogin) {
          navLogin.click();
        } else {
          const authModal = document.getElementById('auth-modal');
          if (authModal) authModal.style.display = 'flex';
        }
      });
      body.appendChild(btn);
      body.scrollTop = body.scrollHeight;
    }

    function addTopics() {
      // Limpia restos previos por seguridad
      body.querySelectorAll('.sn-topics, .sn-continue-btn').forEach(el => el.remove());
      const wrap = document.createElement('div');
      wrap.className = 'sn-topics';
      visibleTopics().forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'sn-topic-btn';
        btn.innerHTML = '<span class="sn-icon">' + t.icon + '</span><span>' + t.label + '</span>';
        btn.addEventListener('click', () => handleTopic(t, wrap));
        wrap.appendChild(btn);
      });
      body.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
    }

    function addContactActions() {
      const wrap = document.createElement('div');
      wrap.className = 'sn-contact-actions';
      const phoneSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
      wrap.innerHTML =
        '<a class="sn-contact-btn sn-contact-call" href="tel:' + PHONE_EZEQUIEL + '">' +
          phoneSvg +
          '<span><strong>Ezequiel</strong> · ' + PHONE_EZEQUIEL_DISPLAY + '</span>' +
        '</a>' +
        '<a class="sn-contact-btn sn-contact-call" href="tel:' + PHONE_ADMIN + '">' +
          phoneSvg +
          '<span><strong>Administración Sonoplay</strong> · ' + PHONE_ADMIN_DISPLAY + '</span>' +
        '</a>' +
        '<a class="sn-contact-btn sn-contact-wa" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>' +
          '<span>WhatsApp</span>' +
        '</a>';
      body.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
    }

    function addContinueBtn() {
      // Evita duplicados si por algún motivo se llama dos veces
      body.querySelectorAll('.sn-continue-btn').forEach(el => el.remove());
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sn-continue-btn';
      btn.innerHTML =
        '<span>Continuar</span>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
      let consumed = false;
      btn.addEventListener('click', () => {
        if (consumed) return;
        consumed = true;
        btn.remove();
        addBot('¿Te puedo ayudar con algo más?');
        addTopics();
      });
      body.appendChild(btn);
      body.scrollTop = body.scrollHeight;
    }

    function handleTopic(topic, topicsWrap) {
      // Quita el menú de temas para evitar doble click mientras se procesa la respuesta
      if (topicsWrap && topicsWrap.parentNode) topicsWrap.remove();
      addUser(topic.label);
      setTimeout(() => {
        addBot(getResponse(topic));
        if (topic.showContact) addContactActions();
        setTimeout(() => {
          addContinueBtn();
        }, 400);
      }, 350);
    }

    function startConversation() {
      body.innerHTML = ''; // siempre limpio al abrir para que respete el estado de login actual
      const logged = isLoggedIn();
      addBot('¡Hola! 👋 Soy tu <strong>asistente personal</strong> de SONOPLAY. Estoy aquí para ayudarte con cualquier duda sobre nuestros servicios.');
      if (!logged) {
        setTimeout(() => {
          addLocked('🔒 Para ver <strong>precios completos</strong> y crear tu presupuesto, inicia sesión.');
          addLoginAction();
        }, 350);
      }
      setTimeout(() => {
        addBot('¿Sobre qué tema quieres información?');
        addTopics();
      }, logged ? 500 : 900);
    }

    bubble.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('is-open');
      bubble.classList.toggle('is-open', isOpen);
      bubble.setAttribute('aria-label', isOpen ? 'Cerrar asistente personal' : 'Abrir asistente personal');
      if (isOpen) startConversation();
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('is-open');
      bubble.classList.remove('is-open');
      bubble.setAttribute('aria-label', 'Abrir asistente personal');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        panel.classList.remove('is-open');
        bubble.classList.remove('is-open');
      }
    });

    // Si la página tiene cart-btn, sube el bubble del chat encima
    if (document.getElementById('cart-btn')) {
      bubble.style.bottom = '100px';
      panel.style.bottom = '170px';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
