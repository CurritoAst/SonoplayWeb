/* ============================================
   SONOPLAY — Interactive Script
   ============================================ */

const supabaseUrl = 'https://srkhevcgfuqchidmzdtb.supabase.co';
const supabaseKey = 'sb_publishable_LqVWg8_0_ocYfxH4be7Y6Q_rs55mQmz';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

/**
 * Sincroniza precios y contenido editable desde el servidor en background.
 * Los datos se cachean en localStorage para que el resto del script (que ya
 * lee de localStorage) los use al instante. Si el servidor falla, se sigue
 * usando lo que haya en caché — no se rompe la web.
 */
(function syncServerData() {
  function fetchTo(localKey, url, field) {
    fetch(url, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || !d.ok) return;
        const data = d[field] || {};
        if (Object.keys(data).length === 0) return; // no sobreescribimos con vacío
        localStorage.setItem(localKey, JSON.stringify(data));
        // Notificamos para que las páginas puedan reaccionar a cambios live
        window.dispatchEvent(new CustomEvent('sonoplay:' + field + '-updated', { detail: data }));
      })
      .catch(() => { /* offline — silencioso */ });
  }
  fetchTo('sonoplay_prices',  'api/prices.php',  'prices');
  fetchTo('sonoplay_content', 'api/content.php', 'content');
})();

document.addEventListener('DOMContentLoaded', () => {

  // ---- NAVBAR SCROLL ----
  const navbar = document.getElementById('navbar');
  let isNavScrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!isNavScrollTicking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        isNavScrollTicking = false;
      });
      isNavScrollTicking = true;
    }
  }, { passive: true });

  // ---- HAMBURGER MENU ----
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
    const isOpen = navLinks.classList.contains('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when link clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // ---- SMOOTH ACTIVE NAV ----
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  const observerOptions = { rootMargin: '-40% 0px -55% 0px' };
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, observerOptions);

  sections.forEach(s => sectionObserver.observe(s));

  // ---- REVEAL ON SCROLL ----
  const revealEls = document.querySelectorAll(
    '.service-card, .dj-card, .review-card, .wedding-feature, .package-card, .info-card, .about-grid, .about-text p, .dj-card, .stat'
  );

  revealEls.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  revealEls.forEach(el => revealObserver.observe(el));

  // Stagger service cards
  document.querySelectorAll('.service-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.08}s`;
  });

  // ---- SECTION-LEVEL CINEMATIC ENTRANCE ----
  const entranceSections = document.querySelectorAll('section, footer#footer');
  entranceSections.forEach(s => s.classList.add('section-enter'));
  const entranceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-in');
        entranceObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  entranceSections.forEach(s => entranceObserver.observe(s));

  document.querySelectorAll('.dj-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });

  // ---- ANIMATED COUNTERS ----
  const counterEls = document.querySelectorAll('.stat-num[data-target]');
  let countersStarted = false;

  const statsSection = document.querySelector('.stats-ribbon');
  const statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !countersStarted) {
      countersStarted = true;
      counterEls.forEach(el => animateCounter(el));
    }
  }, { threshold: 0.5 });

  if (statsSection) statsObserver.observe(statsSection);

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();
    const startVal = 0;

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(startVal + (target - startVal) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ---- PARTICLES (HERO) ----
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position: absolute;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        background: rgba(245,200,66,${Math.random() * 0.4 + 0.1});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: floatParticle ${Math.random() * 10 + 8}s ease-in-out infinite;
        animation-delay: -${Math.random() * 10}s;
      `;
      particlesContainer.appendChild(p);
    }
    if (!document.getElementById('particle-kf')) {
      const style = document.createElement('style');
      style.id = 'particle-kf';
      style.textContent = `
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
          50% { transform: translateY(-15px) translateX(-8px); opacity: 0.5; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.9; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ---- EQ BARS (HERO) ----
  const heroBg = document.querySelector('#hero .hero-bg');
  if (heroBg) {
    const eq = document.createElement('div');
    eq.className = 'eq-bars';
    const barCount = 48;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'eq-bar';
      const h = Math.random() * 55 + 10;
      const d = (Math.random() * 0.8 + 0.5).toFixed(2);
      const delay = (Math.random() * 1.2).toFixed(2);
      bar.style.cssText = `--h:${h}px; --d:${d}s; animation-delay:-${delay}s;`;
      eq.appendChild(bar);
    }
    heroBg.appendChild(eq);
  }

  // ---- 3D TILT CARDS (solo tarjetas estáticas, no el carrusel DJ) ----
  document.querySelectorAll('.vertical-card, .extra-card').forEach(card => {
    card.classList.add('tilt-card');
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // ---- MAGNETIC BUTTONS ----
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = ((e.clientX - r.left) - r.width  / 2) * 0.28;
      const y = ((e.clientY - r.top)  - r.height / 2) * 0.28;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

  // ---- REVIEWS SLIDER ----
  // Reinicializable: se llama al cargar (reseñas estáticas del HTML) y de
  // nuevo si llegan las reseñas reales de Google (api/reviews.php).
  let revAutoplay = null;
  let revResizeHandler = null;

  function setupReviewsSlider() {
    const track = document.getElementById('reviews-track');
    if (!track) return;
    const slides = track.querySelectorAll('.reviews-slide');
    if (slides.length === 0) return;

    // Limpia restos de una inicialización anterior
    if (revAutoplay) { clearInterval(revAutoplay); revAutoplay = null; }
    if (revResizeHandler) { window.removeEventListener('resize', revResizeHandler); revResizeHandler = null; }

    // Regenera los dots según el número de slides actual
    const dotsWrap = document.querySelector('.rev-dots');
    if (dotsWrap) {
      dotsWrap.innerHTML = Array.from(slides)
        .map((_, i) => '<span class="rev-dot' + (i === 0 ? ' active' : '') + '"></span>').join('');
    }
    const dots = document.querySelectorAll('.rev-dot');

    // Clona las flechas para descartar listeners de inits anteriores
    let prevBtn = document.getElementById('rev-prev');
    let nextBtn = document.getElementById('rev-next');
    if (!prevBtn || !nextBtn) return;
    const prevClone = prevBtn.cloneNode(true);
    const nextClone = nextBtn.cloneNode(true);
    prevBtn.replaceWith(prevClone); prevBtn = prevClone;
    nextBtn.replaceWith(nextClone); nextBtn = nextClone;

    let current = 0;

    // Measure height
    function setTrackHeight() {
      const h = slides[0].offsetHeight;
      track.style.height = h + 'px';
    }

    function goTo(idx) {
      slides[current].style.transform = 'translateX(0)';
      slides[current].style.opacity = '1';

      current = (idx + slides.length) % slides.length;

      slides.forEach((slide, i) => {
        slide.style.position = i === 0 ? 'relative' : 'absolute';
        slide.style.opacity = i === current ? '1' : '0';
        slide.style.pointerEvents = i === current ? 'auto' : 'none';
        slide.style.zIndex = i === current ? '2' : '1';
      });

      if (current !== 0) {
        slides[0].style.position = 'absolute';
        slides[0].style.opacity = '0';
        slides[current].style.position = 'absolute';
        slides[current].style.opacity = '1';
      } else {
        slides[0].style.position = 'relative';
        slides[0].style.opacity = '1';
      }

      dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
      setTrackHeight();
    }

    // Init
    slides.forEach((slide, i) => {
      if (i > 0) {
        slide.style.position = 'absolute';
        slide.style.opacity = '0';
        slide.style.top = '0';
        slide.style.left = '0';
        slide.style.pointerEvents = 'none';
        slide.style.transition = 'opacity 0.6s ease';
      } else {
        slide.style.position = 'relative';
        slide.style.opacity = '1';
        slide.style.transition = 'opacity 0.6s ease';
      }
    });

    setTrackHeight();
    revResizeHandler = setTrackHeight;
    window.addEventListener('resize', revResizeHandler);

    prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

    function resetAuto() {
      clearInterval(revAutoplay);
      revAutoplay = setInterval(() => goTo(current + 1), 5000);
    }

    revAutoplay = setInterval(() => goTo(current + 1), 5000);
  }
  setupReviewsSlider();

  // ---- RESEÑAS REALES DE GOOGLE ----
  // Si api/reviews.php devuelve reseñas (Places API configurada), sustituyen
  // a las estáticas del HTML. Si no, la sección se queda como está.
  (function loadGoogleReviews() {
    const track = document.getElementById('reviews-track');
    if (!track) return;
    fetch('api/reviews.php', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || !d.ok || !Array.isArray(d.reviews) || d.reviews.length === 0) return;

        const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        const cards = d.reviews.map(rv => {
          const initials = esc((rv.author || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase());
          const stars = '★'.repeat(Math.max(1, Math.min(5, Math.round(rv.rating || 5))));
          let text = String(rv.text || '').trim();
          if (text.length > 260) text = text.slice(0, 257).trimEnd() + '…';
          return '<div class="review-card">' +
            '<div class="review-stars">' + stars + '</div>' +
            '<p class="review-text">"' + esc(text) + '"</p>' +
            '<div class="review-author">' +
              '<div class="reviewer-avatar">' + initials + '</div>' +
              '<div><span class="reviewer-name">' + esc(rv.author) + '</span>' +
              '<span class="reviewer-date">Google · ' + esc(rv.relative || '') + '</span></div>' +
            '</div></div>';
        });

        // Slides de 3 reseñas (mismo layout que las estáticas)
        const slidesHtml = [];
        for (let i = 0; i < cards.length; i += 3) {
          slidesHtml.push('<div class="reviews-slide">' + cards.slice(i, i + 3).join('') + '</div>');
        }
        track.innerHTML = slidesHtml.join('');

        // Nota media y nº de reseñas reales en toda la página
        if (d.rating) document.querySelectorAll('[data-content-key="content-rating"]').forEach(el => { el.textContent = d.rating; });
        if (d.total)  document.querySelectorAll('[data-content-key="content-reviews-count"]').forEach(el => { el.textContent = d.total; });

        setupReviewsSlider();
      })
      .catch(() => { /* offline o sin configurar — se quedan las estáticas */ });
  })();

  // ---- CONTACT FORM ----
  const form = document.getElementById('contact-form');
  const successMsg = document.getElementById('form-success');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = form.querySelector('.btn-submit');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Enviando...';

      setTimeout(() => {
        form.style.opacity = '0';
        form.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          form.style.display = 'none';
          successMsg.classList.add('visible');
        }, 400);
      }, 1200);
    });
  }

  // ---- SMOOTH SCROLL FOR ANCHOR LINKS ----
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ---- CURSOR GLOW EFFECT (desktop) ----
  if (window.matchMedia('(pointer: fine)').matches) {
    const glow = document.createElement('div');
    glow.style.cssText = `
      position: fixed;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
      transform: translate(-50%, -50%);
      transition: transform 0.1s linear;
      mix-blend-mode: screen;
    `;
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });
  }

  // ---- DJ COVERFLOW CAROUSEL ----
  const djTrack = document.getElementById('dj-carousel-track');
  if (djTrack) {
    const djSlides = djTrack.querySelectorAll('.dj-slide');
    const djDots = document.querySelectorAll('.dj-dot');
    const djPrev = document.getElementById('dj-prev');
    const djNext = document.getElementById('dj-next');
    let djCurrent = 0;
    const totalDjs = djSlides.length;

    function djLayout() {
      const container = document.getElementById('dj-coverflow');
      const containerW = container.offsetWidth;
      const centerX = containerW / 2;

      djSlides.forEach((slide, i) => {
        let diff = i - djCurrent;

        // Wrap around for circular feel
        if (diff > Math.floor(totalDjs / 2)) diff -= totalDjs;
        if (diff < -Math.floor(totalDjs / 2)) diff += totalDjs;

        const absDiff = Math.abs(diff);

        if (absDiff > 2) {
          // Fully hidden
          slide.style.opacity = '0';
          slide.style.pointerEvents = 'none';
          slide.style.zIndex = '0';
          slide.style.transform = `translateX(${centerX + diff * 200}px) translateX(-50%) scale(0.5)`;
        } else if (absDiff === 0) {
          // Center (active)
          slide.style.opacity = '1';
          slide.style.pointerEvents = 'auto';
          slide.style.zIndex = '10';
          slide.style.transform = `translateX(${centerX}px) translateX(-50%) scale(1)`;
          slide.style.filter = 'none';
        } else if (absDiff === 1) {
          // Left/right neighbors
          const offset = diff * 240;
          slide.style.opacity = '0.55';
          slide.style.pointerEvents = 'auto';
          slide.style.zIndex = '5';
          slide.style.transform = `translateX(${centerX + offset}px) translateX(-50%) scale(0.78)`;
          slide.style.filter = 'brightness(0.6)';
        } else {
          // 2 positions away
          const offset = diff * 220;
          slide.style.opacity = '0.25';
          slide.style.pointerEvents = 'none';
          slide.style.zIndex = '2';
          slide.style.transform = `translateX(${centerX + offset}px) translateX(-50%) scale(0.6)`;
          slide.style.filter = 'brightness(0.4)';
        }
      });

      // Update dots
      djDots.forEach((dot, i) => {
        dot.style.background = i === djCurrent ? 'var(--cyan)' : 'rgba(255,255,255,0.3)';
      });
    }

    function djGoTo(idx) {
      djCurrent = ((idx % totalDjs) + totalDjs) % totalDjs;
      djLayout();
    }

    // Init layout
    djLayout();

    djPrev.addEventListener('click', () => djGoTo(djCurrent - 1));
    djNext.addEventListener('click', () => djGoTo(djCurrent + 1));
    djDots.forEach((dot, i) => dot.addEventListener('click', () => djGoTo(i)));

    // ---- SELECCIÓN DJ A UN CLIC ----
    // Un clic sobre el DJ central lo selecciona directamente (sin modal ni
    // botón de confirmación). Volver a hacer clic lo deselecciona.
    function selectDj(djName) {
      const existingDj = cart.find(item => item.isDj);
      const isSame = existingDj && existingDj.djName === djName;
      const toast = document.getElementById('dj-toast');

      // Para elegir un DJ hay que haber elegido antes un montaje.
      // (Si está quitando el DJ que ya tenía, se permite igualmente.)
      if (!cart.some(item => item.isPackage) && !isSame) {
        if (toast) {
          toast.textContent = '👉 Primero elige un montaje para tu boda';
          toast.style.top = '30px';
          setTimeout(() => { toast.style.top = '-100px'; }, 3000);
        }
        setTimeout(() => {
          const weddings = document.getElementById('weddings');
          if (weddings) {
            const top = weddings.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 400);
        return;
      }

      const existingDjIdx = cart.findIndex(item => item.isDj);
      if (existingDjIdx !== -1) cart.splice(existingDjIdx, 1);

      if (isSame) {
        // Toggle: clic sobre el DJ ya elegido → lo quita
        if (toast) {
          toast.textContent = 'Has quitado a ' + djName + ' de tu presupuesto';
          toast.style.top = '30px';
          setTimeout(() => { toast.style.top = '-100px'; }, 2500);
        }
        if (typeof updateCartUI === 'function') updateCartUI();
        return;
      }

      const djPrice = (JSON.parse(localStorage.getItem('sonoplay_prices') || '{}')).dj || 484;
      cart.push({ name: 'DJ ' + djName + ' (5h)', price: djPrice, qty: 1, unit: '', isPackage: false, isDj: true, djName: djName });
      if (typeof updateCartUI === 'function') updateCartUI();

      if (toast) {
        toast.textContent = '✓ Has elegido a ' + djName;
        toast.style.top = '30px';
        setTimeout(() => { toast.style.top = '-100px'; }, 2500);
      }

      setTimeout(() => {
        const extrasSection = document.getElementById('extras');
        if (extrasSection) {
          const offset = 80;
          const top = extrasSection.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 500);
    }

    // En móvil ocultamos los logos (descuadraban) y mostramos el NOMBRE del DJ
    // como texto debajo de la foto. Marcamos el contenedor del logo y añadimos
    // una etiqueta de nombre a cada slide (CSS decide cuándo mostrarla).
    djSlides.forEach(slide => {
      const logoImg = slide.querySelector('img[src*="logo-"]');
      if (logoImg && logoImg.parentElement) logoImg.parentElement.classList.add('dj-logo-wrap');
      if (!slide.querySelector('.dj-name-label')) {
        const label = document.createElement('div');
        label.className = 'dj-name-label';
        label.textContent = slide.dataset.dj || '';
        slide.appendChild(label);
      }
    });

    // Marca visualmente el slide del DJ que está en el carrito
    window.syncDjSelection = function () {
      const djItem = cart.find(it => it.isDj);
      djSlides.forEach(slide => {
        slide.classList.toggle('dj-selected', !!djItem && djItem.djName === slide.dataset.dj);
      });
    };

    // Click on slides: side slides navigate, center slide selects DJ (1 clic)
    djSlides.forEach((slide, i) => {
      slide.addEventListener('click', () => {
        if (i !== djCurrent) {
          djGoTo(i);
        } else {
          const djName = slide.dataset.dj;
          if (!djName) return;

          if (!isLoggedIn()) {
            // Guarda la intención para retomarla tras el login/registro
            window.pendingDjName = djName;
            if (!isRegisterMode) toggleAuthMode();
            openAuthModal();
            return;
          }

          selectDj(djName);
        }
      });
    });

    // Tras login/registro, retoma la selección de DJ pendiente
    window.addEventListener('sonoplay:auth-changed', () => {
      if (window.pendingDjName && isLoggedIn()) {
        const name = window.pendingDjName;
        window.pendingDjName = null;
        selectDj(name);
      }
    });

    // Hover effects for arrows
    [djPrev, djNext].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.25)';
        btn.style.borderColor = '#fff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
      });
    });

    // Touch swipe support
    let djStartX = 0;
    djTrack.addEventListener('touchstart', (e) => { djStartX = e.touches[0].clientX; }, { passive: true });
    djTrack.addEventListener('touchend', (e) => {
      const diff = djStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? djGoTo(djCurrent + 1) : djGoTo(djCurrent - 1);
      }
    });

    // Recalculate on resize
    window.addEventListener('resize', djLayout);
  }

  // ---- SHOPPING CART ----
  const cart = [];
  const cartBtn = document.getElementById('cart-btn');
  const cartCount = document.getElementById('cart-count');
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartClose = document.getElementById('cart-close');
  const cartItemsEl = document.getElementById('cart-items');
  const cartEmptyEl = document.getElementById('cart-empty');
  const cartTotalEl = document.getElementById('cart-total');
  const cartContactBtn = document.getElementById('cart-contact-btn');

  function openCart() {
    cartSidebar.style.right = '0';
    cartOverlay.style.opacity = '1';
    cartOverlay.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartSidebar.style.right = '-420px';
    cartOverlay.style.opacity = '0';
    cartOverlay.style.pointerEvents = 'none';
    document.body.style.overflow = '';
  }

  cartBtn.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // ---- PROMO NOVIOS + DESCUENTOS ----
  // Promo "novios": 5% EXTRA para las parejas que se registren entre
  // PROMO_START y PROMO_END (incluidos). Se SUMA al descuento directo del
  // 10% por umbral que ya existía. Para cambiarla o quitarla, edita estas
  // constantes (PROMO_PERCENT = 0 la desactiva).
  const PROMO_PERCENT = 5;
  const PROMO_START   = '2026-06-13'; // desde hoy
  const PROMO_END     = '2026-10-31'; // hasta final de octubre (incluido)
  const PROMO_LABEL   = 'reserva hasta octubre';

  function userQualifiesForPromo() {
    if (PROMO_PERCENT <= 0) return false;
    const u = getUser();
    if (!u || u.role === 'admin') return false;
    const reg = (u.createdAt || u.date || '').toString();
    let d = null;
    if (/^\d{4}-\d{2}-\d{2}/.test(reg)) d = reg.slice(0, 10);                 // ISO del servidor
    else if (/^\d{2}\/\d{2}\/\d{4}/.test(reg)) { const p = reg.slice(0, 10).split('/'); d = p[2] + '-' + p[1] + '-' + p[0]; }
    if (!d) return false;
    return d >= PROMO_START && d <= PROMO_END;
  }

  // Desglose de descuentos sobre un subtotal: tramos aplicados, total
  // descontado y total final. Única fuente de verdad para carrito, modal,
  // WhatsApp y el total que se registra como lead.
  function getDiscount(subtotal) {
    const p = JSON.parse(localStorage.getItem('sonoplay_prices') || '{}');
    const threshold   = p['discount-threshold'] !== undefined ? parseFloat(p['discount-threshold']) : 4000;
    const basePercent = p['discount-percent']   !== undefined ? parseFloat(p['discount-percent'])   : 10;
    const lines = [];
    let discount = 0;
    if (threshold > 0 && subtotal >= threshold && basePercent > 0) {
      const a = subtotal * basePercent / 100;
      discount += a;
      lines.push({ label: 'Descuento directo (' + basePercent + '%)', amount: a });
    }
    if (userQualifiesForPromo()) {
      const a = subtotal * PROMO_PERCENT / 100;
      discount += a;
      lines.push({ label: 'Promo novios · ' + PROMO_LABEL + ' (' + PROMO_PERCENT + '%)', amount: a });
    }
    return { subtotal: subtotal, discount: discount, finalTotal: subtotal - discount, lines: lines };
  }
  function fmtEur(n) { return n.toFixed(2).replace(/\.00$/, ''); }

  // ---- LEADS (presupuestos abandonados) ----
  // El lead se registra en el servidor desde que el usuario logueado tiene
  // algo en el carrito (ve precios). Si cierra la página sin enviar la
  // solicitud, un beacon avisa al servidor para que notifique al admin por
  // email. Si la deja abierta sin actividad, el servidor lo detecta solo.
  function trackLead(action, extra) {
    const user = getUser();
    if (!user || !user.email || user.role === 'admin') return;
    const payload = Object.assign({ action, email: user.email }, extra || {});
    try {
      fetch('api/leads.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch (e) { /* silencioso — el tracking nunca debe romper la web */ }
  }

  // Snapshot del carrito (con descuento aplicado) para enviar al servidor
  function leadCartPayload() {
    const user = getUser() || {};
    const djItem = cart.find(it => it.isDj);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const d = getDiscount(subtotal);
    return {
      name: user.name || '',
      phone: user.phone || '',
      weddingDate: user.weddingDate || '',
      dj: djItem ? djItem.name : '',
      cart: cart.map(it => ({ name: it.name, price: it.price * it.qty, qty: it.qty })),
      total: Math.round(d.finalTotal * 100) / 100
    };
  }

  // Cada cambio de carrito actualiza el lead. El PRIMER artículo se registra
  // al instante (si cierra la página a los 2 segundos, el lead ya existe);
  // los siguientes cambios van con debounce para no bombardear al servidor.
  let leadSyncTimer = null;
  let leadFirstSyncDone = false;
  function scheduleLeadSync() {
    if (cart.length === 0) return;
    if (!leadFirstSyncDone) {
      leadFirstSyncDone = true;
      trackLead('price-viewed', leadCartPayload());
      return;
    }
    clearTimeout(leadSyncTimer);
    leadSyncTimer = setTimeout(() => trackLead('price-viewed', leadCartPayload()), 2500);
  }

  // Al cerrar/abandonar la página con carrito y sin haber enviado: aviso
  // inmediato al servidor (sendBeacon sobrevive al cierre de la pestaña).
  let budgetSentThisSession = false;
  function leadBeacon(action) {
    if (budgetSentThisSession || cart.length === 0) return;
    const user = getUser();
    if (!user || !user.email || user.role === 'admin') return;
    const payload = Object.assign({ action, email: user.email }, leadCartPayload());
    try {
      navigator.sendBeacon('api/leads.php', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } catch (e) { /* silencioso */ }
  }
  // page-left → además dispara el email de aviso inmediato en el servidor
  window.addEventListener('pagehide', () => leadBeacon('page-left'));
  // Respaldo: al pasar a segundo plano (cambio de pestaña, minimizar, cerrar
  // en móvil) guarda el snapshot sin disparar email — en móvil muchas veces
  // es la única señal que llega antes de que maten la página.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leadBeacon('price-viewed');
  });

  // ---- BUDGET CONTACT MODAL ----
  const budgetOverlay = document.getElementById('budget-modal-overlay');
  const budgetCloseBtn = document.getElementById('budget-modal-close');
  const budgetSummary = document.getElementById('budget-summary');
  const budgetWhatsappBtn = document.getElementById('budget-whatsapp-btn');

  function openBudgetModal() {
    // Build summary of cart items
    let summaryHTML = '';
    let total = 0;
    cart.forEach(item => {
      const itemTotal = item.price * item.qty;
      total += itemTotal;
      summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem;"><span style="color: var(--text);">${item.name}${item.qty > 1 ? ' x' + item.qty : ''}</span><span style="color: var(--cyan); font-weight: 700;">${itemTotal} €</span></div>`;
    });
    if (cart.length > 0) {
      const d = getDiscount(total);
      if (d.discount > 0) {
        summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 8px 0 0; margin-top: 8px; border-top: 1px solid var(--border); font-size: 0.85rem;"><span style="color: var(--text-muted);">Subtotal</span><span style="color: var(--text-muted); text-decoration: line-through;">${fmtEur(total)} €</span></div>`;
        d.lines.forEach(ln => {
          summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 4px 0;"><span style="color: #ef4444; font-weight: 600; font-size: 0.85rem;">${ln.label}</span><span style="color: #ef4444; font-weight: 700; font-size: 0.85rem;">-${fmtEur(ln.amount)} €</span></div>`;
        });
      }
      summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 8px 0 0; border-top: 1px solid var(--border); font-size: 0.95rem; margin-top: 4px;"><span style="color: #fff; font-weight: 700;">Total estimado</span><span style="color: var(--cyan); font-weight: 900;">${fmtEur(d.finalTotal)} €</span></div>`;
    } else {
      summaryHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No hay servicios seleccionados</p>';
    }
    budgetSummary.innerHTML = summaryHTML;

    // Datos del usuario para autorrellenar el mensaje (nombre + fecha de boda)
    const bUser = getUser() || {};
    const bDj = cart.find(it => it.isDj);
    const bPkg = cart.find(it => it.isPackage);
    function fmtWeddingDate(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return (y && m && d) ? d + '/' + m + '/' + y : iso;
    }
    const bWedding = fmtWeddingDate(bUser.weddingDate || '');

    // Build WhatsApp message
    let waMsg = '¡Hola SONOPLAY! 👋';
    if (bUser.name) waMsg += ' Soy ' + bUser.name + '.';
    if (bWedding) waMsg += ' Nuestra boda es el ' + bWedding + '.';
    waMsg += ' Me gustaría solicitar presupuesto para:\n\n';
    cart.forEach(item => {
      waMsg += `• ${item.name}${item.qty > 1 ? ' x' + item.qty : ''} — ${item.price * item.qty} €\n`;
    });
    if (cart.length > 0) {
      const d = getDiscount(total);
      if (d.discount > 0) {
        waMsg += `\nSubtotal: ${fmtEur(total)} €`;
        d.lines.forEach(ln => { waMsg += `\n❌ ${ln.label}: -${fmtEur(ln.amount)} €`; });
        waMsg += `\n✅ Total estimado: ${fmtEur(d.finalTotal)} €\n`;
      } else {
        waMsg += `\nTotal estimado: ${fmtEur(total)} €\n`;
      }
    }
    waMsg += '\n¿Podrían darme más información? ¡Gracias!';
    const waUrl = 'https://wa.me/34605216881?text=' + encodeURIComponent(waMsg);
    if (budgetWhatsappBtn) budgetWhatsappBtn.href = waUrl;
    const budgetWhatsappBtnThanks = document.getElementById('budget-whatsapp-btn-thanks');
    if (budgetWhatsappBtnThanks) budgetWhatsappBtnThanks.href = waUrl;

    // Autorrellena el formulario interno con nombre + fecha de boda (+ DJ y
    // montaje elegidos). Solo si el usuario no ha escrito nada antes.
    const bNameInput = document.getElementById('budget-name');
    const bDescInput = document.getElementById('budget-description');
    if (bNameInput && !bNameInput.value.trim() && bUser.name) bNameInput.value = bUser.name;
    if (bDescInput && !bDescInput.value.trim()) {
      let autoMsg = '¡Hola!';
      if (bWedding) autoMsg += ' Nuestra boda es el ' + bWedding + '.';
      const interests = [];
      if (bPkg) interests.push('el montaje ' + bPkg.name);
      if (bDj) interests.push(bDj.name);
      if (interests.length) autoMsg += ' Nos interesa ' + interests.join(' con ') + '.';
      autoMsg += ' ¿Podríais confirmarnos disponibilidad y enviarnos el presupuesto? ¡Gracias!';
      bDescInput.value = autoMsg;
    }

    // Resetear al estado FORMULARIO al abrir
    const formState = document.getElementById('budget-form-state');
    const thanksState = document.getElementById('budget-thanks-state');
    if (formState && thanksState) {
      formState.style.display = '';
      thanksState.style.display = 'none';
    }
    const errEl = document.getElementById('budget-form-error');
    if (errEl) errEl.style.display = 'none';

    // Lead caliente: el usuario está viendo el precio de su presupuesto
    if (cart.length > 0) trackLead('price-viewed', leadCartPayload());

    closeCart();
    budgetOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // ---- BUDGET FORM SUBMIT ----
  const budgetForm = document.getElementById('budget-form');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('budget-form-error');
      const submitBtn = document.getElementById('budget-form-submit');
      const name = document.getElementById('budget-name').value.trim();
      const description = document.getElementById('budget-description').value.trim();
      const hp = budgetForm.querySelector('input[name="_hp"]').value;

      errEl.style.display = 'none';
      if (name.length < 2) { errEl.textContent = 'Introduce tu nombre.'; errEl.style.display = 'block'; return; }
      if (description.length < 10) { errEl.textContent = 'Cuéntanos un poco más sobre tu evento.'; errEl.style.display = 'block'; return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';

      // Construye snapshot del carrito para enviar al servidor
      const cartSnapshot = cart.map(it => ({ name: it.name, price: it.price * it.qty, qty: it.qty }));
      const pkgItem = cart.find(it => it.isPackage);
      const packageLabel = pkgItem ? pkgItem.name : '';

      const fUser = getUser() || {};
      try {
        const res = await fetch('api/budget.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, description, cart: cartSnapshot, package: packageLabel, _hp: hp,
            email: fUser.email || '', phone: fUser.phone || '', weddingDate: fUser.weddingDate || ''
          })
        });
        const data = await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida' }));
        if (!res.ok || !data.ok) {
          errEl.textContent = data.error || 'No se pudo enviar. Inténtalo de nuevo.';
          errEl.style.display = 'block';
          return;
        }
        // Éxito → muestra estado de gracias y vacía el carrito (ya enviado)
        budgetSentThisSession = true;
        trackLead('budget-sent');
        document.getElementById('budget-form-state').style.display = 'none';
        document.getElementById('budget-thanks-state').style.display = '';
        budgetForm.reset();
        cart.splice(0, cart.length);
        updateCartUI();
      } catch (err) {
        errEl.textContent = 'No se pudo conectar. Inténtalo de nuevo.';
        errEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar solicitud';
      }
    });
  }

  const budgetCloseThanks = document.getElementById('budget-modal-close-thanks');
  if (budgetCloseThanks) budgetCloseThanks.addEventListener('click', () => closeBudgetModal());

  function closeBudgetModal() {
    budgetOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  cartContactBtn.addEventListener('click', () => {
    if (!isLoggedIn()) {
      // If not logged in, open auth modal
      document.getElementById('auth-modal').style.display = 'flex';
      return;
    }
    openBudgetModal();
  });

  budgetCloseBtn.addEventListener('click', closeBudgetModal);
  budgetOverlay.addEventListener('click', (e) => {
    if (e.target === budgetOverlay) closeBudgetModal();
  });

  function updateCartBadge() {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = total;
    if (total > 0) {
      cartCount.style.display = 'flex';
      cartCount.style.animation = 'cartBounce 0.4s ease';
      setTimeout(() => cartCount.style.animation = '', 400);
    } else {
      cartCount.style.display = 'none';
    }
  }

  function updateCartUI() {
    cartEmptyEl.style.display = cart.length === 0 ? 'block' : 'none';

    // Remove old items
    cartItemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());

    let total = 0;

    cart.forEach((item, idx) => {
      const itemTotal = item.price * item.qty;
      total += itemTotal;

      const div = document.createElement('div');
      div.className = 'cart-item';

      const unitLabel = item.unit === 'm2' ? 'm²' : item.unit === 'u' ? 'uds' : '';
      const nameDisplay = item.unit && item.qty > 0 ? `${item.name} <span style="color: var(--cyan); font-size: 0.8rem;">(${item.qty} ${unitLabel})</span>` : item.name;
      const priceDetail = item.unit ? `<span style="font-size:0.75rem; color: var(--text-muted); display:block;">${item.price}€/${unitLabel} × ${item.qty}</span>` : '';

      div.innerHTML = `
        <span class="cart-item-name">${nameDisplay}</span>
        <div class="cart-item-qty">
          <button data-idx="${idx}" data-action="minus">−</button>
          <span>${item.qty}</span>
          <button data-idx="${idx}" data-action="plus">+</button>
        </div>
        <span class="cart-item-price">${itemTotal > 0 ? itemTotal + ' €' : 'Consultar'}${priceDetail}</span>
        <button class="cart-remove-btn" data-idx="${idx}" title="Eliminar">&times;</button>
      `;

      cartItemsEl.appendChild(div);
    });

    // Handle discounts
    let finalTotal = total;
    let discountHtml = '';
    const discountInfoEl = document.getElementById('cart-discount-info');
    
    if (total > 0) {
      const d = getDiscount(total);
      if (d.discount > 0) {
        finalTotal = d.finalTotal;
        discountHtml = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: var(--text-muted); font-size: 0.95rem;">Subtotal:</span>
            <span style="color: var(--text-muted); font-size: 1rem; text-decoration: line-through;">${fmtEur(total)} €</span>
          </div>`;
        d.lines.forEach(ln => {
          discountHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: rgba(239, 68, 68, 0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
            <span style="color: #ef4444; font-size: 0.9rem; font-weight: 600;">${ln.label}</span>
            <span style="color: #ef4444; font-size: 1rem; font-weight: 700;">-${fmtEur(ln.amount)} €</span>
          </div>`;
        });
      }
    }
    
    if (discountInfoEl) {
      discountInfoEl.innerHTML = discountHtml;
    }

    cartTotalEl.textContent = finalTotal > 0 ? finalTotal.toFixed(2).replace(/\.00$/, '') + ' €' : '0 €';
    updateCartBadge();
    updateAddButtons();
    if (window.syncDjSelection) window.syncDjSelection();
    // Persistencia: el carrito sobrevive a recargas y a cerrar el navegador
    try { localStorage.setItem('sonoplay_cart', JSON.stringify(cart)); } catch (e) {}
    scheduleLeadSync(); // registra/actualiza el lead con cada cambio de carrito
  }

  // ---- RESTAURAR CARRITO GUARDADO ----
  const MONTAJE_NAMES = ['OPCION BASIC','OPCION OVALO','OPCION TOTEMS','OPCION CUBO','OPCION EQUIS','OPCION HEXA'];
  (function restoreCart() {
    try {
      const saved = JSON.parse(localStorage.getItem('sonoplay_cart') || '[]');
      if (Array.isArray(saved)) {
        saved.forEach(it => {
          if (it && it.name && typeof it.price === 'number') {
            // Re-deriva isPackage por si el carrito se guardó con el flag mal
            if (MONTAJE_NAMES.includes(it.name)) it.isPackage = true;
            cart.push(it);
          }
        });
        // Por si un carrito viejo tuviera más de un montaje, deja solo el último
        const pkgs = cart.filter(it => it.isPackage);
        if (pkgs.length > 1) {
          pkgs.slice(0, -1).forEach(p => { const i = cart.indexOf(p); if (i !== -1) cart.splice(i, 1); });
        }
      }
    } catch (e) { /* datos corruptos — empezamos de cero */ }
    if (cart.length > 0) updateCartUI();
  })();


  function updateAddButtons() {
    document.querySelectorAll('.cart-add-btn').forEach(btn => {
      const name = btn.dataset.name;
      const cartItem = cart.find(item => item.name === name);
      if (cartItem) {
        btn.classList.add('added');
        if (cartItem.unit && cartItem.qty > 1) {
          const unitLabel = cartItem.unit === 'm2' ? 'm²' : 'uds';
          btn.textContent = 'Añadido (' + cartItem.qty + ' ' + unitLabel + ')';
        } else {
          btn.textContent = 'Añadido';
        }
      } else {
        btn.classList.remove('added');
        btn.textContent = '+ Añadir';
        if (btn.dataset.package === 'true' || btn.closest('.package-card')) {
          btn.textContent = '+ Añadir al presupuesto';
        }
      }
    });
  }

  // Add to cart
  document.querySelectorAll('.cart-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price) || 0;
      const unit = btn.dataset.unit || '';

      // Es un montaje (paquete) si el botón lleva data-package="true".
      // Los montajes están en .package-poster (no .package-card) y solo se
      // permite UNO a la vez. Ceremonia Civil y los extras NO son montajes.
      const isPackage = btn.dataset.package === 'true';

      if (isPackage) {
        // Remove any existing package from cart
        const existingPkgIdx = cart.findIndex(item => item.isPackage);
        if (existingPkgIdx !== -1) {
          cart.splice(existingPkgIdx, 1);
        }
      }

      // Get quantity from qty input if exists
      let qty = 1;
      const qtyInputId = btn.dataset.qtyInput;
      if (qtyInputId) {
        const qtyInput = document.getElementById(qtyInputId);
        if (qtyInput) qty = Math.max(1, parseInt(qtyInput.value) || 1);
      }

      const existing = cart.find(item => item.name === name);
      if (existing) {
        // If already in cart, remove it (toggle behavior)
        const idx = cart.indexOf(existing);
        cart.splice(idx, 1);
      } else {
        cart.push({ name, price, qty, unit, isPackage: !!isPackage });
      }

      updateCartUI();

      // Brief visual feedback
      if (!cart.some(item => item.name === name)) return;
      btn.classList.add('added');
      btn.textContent = 'Añadido';

      // Auto-scroll to the next step
      if (isPackage) {
        const djsSection = document.getElementById('djs');
        if (djsSection) {
          setTimeout(() => {
            const offset = 80;
            const top = djsSection.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
          }, 400);
        }
      } else if (name === 'Ceremonia Civil') {
        const weddingsSection = document.getElementById('weddings');
        if (weddingsSection) {
          setTimeout(() => {
            const offset = 80;
            const top = weddingsSection.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
          }, 400);
        }
      }
    });
  });

  // ---- QTY SELECTOR (extras with units) ----
  function updateSubtotal(inputEl) {
    const subtotalEl = document.querySelector(`.qty-subtotal[data-qty-input="${inputEl.id}"]`);
    if (!subtotalEl) return;
    const unitPrice = parseFloat(subtotalEl.dataset.unitPrice) || 0;
    const qty = Math.max(1, parseInt(inputEl.value) || 1);
    subtotalEl.textContent = '= ' + (unitPrice * qty) + ' €';
  }

  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      let val = parseInt(input.value) || 1;
      if (btn.classList.contains('qty-minus')) {
        val = Math.max(1, val - 1);
      } else {
        val = Math.min(parseInt(input.max) || 999, val + 1);
      }
      input.value = val;
      updateSubtotal(input);
    });
  });

  document.querySelectorAll('.qty-selector input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      let val = parseInt(input.value) || 1;
      val = Math.max(1, Math.min(parseInt(input.max) || 999, val));
      input.value = val;
      updateSubtotal(input);
    });
  });

  // Cart item actions (qty +/-, remove)
  cartItemsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const idx = parseInt(btn.dataset.idx);

    if (btn.dataset.action === 'plus') {
      cart[idx].qty++;
    } else if (btn.dataset.action === 'minus') {
      cart[idx].qty--;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
    } else if (btn.classList.contains('cart-remove-btn')) {
      cart.splice(idx, 1);
    }

    updateCartUI();
  });

  // ---- AUTH SYSTEM ----
  const ADMIN_ACCOUNT = { email: 'admin@sonoplay.es', password: 'admin123', role: 'admin', name: 'Administrador' };

  function getUser() {
    return JSON.parse(localStorage.getItem('sonoplay_user') || 'null');
  }

  // NOTA: el registro/login real lo gestiona auth-shared.js (servidor compartido).
  // Aquí solo guardamos helpers de SESIÓN local (sonoplay_user) que usan otras
  // partes de script.js — la lista de usuarios YA NO se guarda en localStorage.

  function isLoggedIn() {
    return !!getUser();
  }

  function isAdmin() {
    const u = getUser();
    return u && u.role === 'admin';
  }

  // Auth modal elements
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authToggle = document.getElementById('auth-toggle');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authSubmit = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');
  const authNameField = document.getElementById('auth-name-field');
  const authPhoneField = document.getElementById('auth-phone-field');
  const navLoginBtn = document.getElementById('nav-login-btn');

  let isRegisterMode = false;

  function showAuthError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
  }

  function hideAuthError() {
    authError.style.display = 'none';
  }

  function openAuthModal() {
    authModal.style.display = 'flex';
    hideAuthError();
  }

  function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      authTitle.textContent = 'Crear cuenta';
      authSubmit.textContent = 'Registrarse';
      authToggleText.textContent = '¿Ya tienes cuenta?';
      authToggle.textContent = ' Inicia sesión';
      authNameField.style.display = 'block';
      authPhoneField.style.display = 'block';
    } else {
      authTitle.textContent = 'Iniciar sesión';
      authSubmit.textContent = 'Entrar';
      authToggleText.textContent = '¿No tienes cuenta?';
      authToggle.textContent = ' Regístrate';
      authNameField.style.display = 'none';
      authPhoneField.style.display = 'none';
    }
    hideAuthError();
  }


  // ---- CREA TU PRESUPUESTO FLOW ----
  window.pendingBudgetFlow = false;
  function checkPendingBudgetFlow() {
    if (window.pendingBudgetFlow) {
      window.pendingBudgetFlow = false;
      setTimeout(() => {
        const target = document.getElementById('ceremonia-civil');
        if (target) {
          const offset = 80;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 300);
    }
  }

  function handleBudgetBtnClick(e) {
    e.preventDefault();
    if (!isLoggedIn()) {
      window.pendingBudgetFlow = true;
      if (!isRegisterMode) toggleAuthMode();
      openAuthModal();
    } else {
      const target = document.getElementById('ceremonia-civil');
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  }

  document.querySelectorAll('[id^="btn-create-budget"]').forEach(btn => {
    btn.addEventListener('click', handleBudgetBtnClick);
  });

  const createBudgetBtn = document.getElementById('btn-create-budget');
  if (createBudgetBtn) {
    createBudgetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isLoggedIn()) {
        window.pendingBudgetFlow = true;
        // Default to Register view since new budget creators usually need an account
        if (!isRegisterMode) toggleAuthMode();
        openAuthModal();
      } else {
        const target = document.getElementById('ceremonia-civil');
        if (target) {
          const offset = 80;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  }

  // Update nav button based on auth state
  function updateAuthUI() {
    const user = getUser();
    if (user) {
      if (user.role === 'admin') {
        navLoginBtn.textContent = 'Panel Admin';
        navLoginBtn.style.color = '#22c55e';
      } else {
        navLoginBtn.textContent = 'Cerrar sesión';
      }
    } else {
      navLoginBtn.textContent = 'Iniciar sesión';
      navLoginBtn.style.color = 'var(--cyan)';
    }
  }

  // ---- PRICE VISIBILITY ----
  function applyPriceVisibility() {
    const logged = isLoggedIn();

    // All price elements (2.2rem, 2rem, 1.8rem with cyan color and font-weight 900)
    document.querySelectorAll('[style*="font-weight: 900"][style*="color: var(--cyan)"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.match(/[\d.,]+\s*€/)) {
        if (logged) {
          // Show price
          if (el.dataset.originalPrice) {
            el.innerHTML = el.dataset.originalPrice;
          }
          el.style.display = '';
          // Show adjacent IVA text
          const next = el.nextElementSibling;
          if (next && next.textContent.includes('IVA')) next.style.display = '';
        } else {
          // Save and hide price
          if (!el.dataset.originalPrice) {
            el.dataset.originalPrice = el.innerHTML;
          }
          el.style.display = 'none';
          // Hide adjacent IVA text
          const next = el.nextElementSibling;
          if (next && next.textContent.includes('IVA')) next.style.display = 'none';
        }
      }
    });

    // Price-sensitive elements (like "PANTALLAS LED OPCIONAL — 100€/M2")
    document.querySelectorAll('.price-sensitive').forEach(el => {
      el.style.display = logged ? '' : 'none';
    });

    // Cart add buttons -> "Obtener más información" when not logged
    document.querySelectorAll('.cart-add-btn').forEach(btn => {
      if (logged) {
        btn.style.display = '';
        // Remove info buttons
        const infoBtn = btn.parentElement.querySelector('.info-login-btn');
        if (infoBtn) infoBtn.remove();
      } else {
        btn.style.display = 'none';
        // Add "Obtener más información" if not already there
        if (!btn.parentElement.querySelector('.info-login-btn')) {
          const infoBtn = document.createElement('button');
          infoBtn.className = 'info-login-btn';
          infoBtn.textContent = 'Obtener más información';
          infoBtn.style.cssText = 'background: var(--cyan); color: #000; border: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; margin-top: 10px;';
          infoBtn.addEventListener('click', () => openAuthModal());
          btn.insertAdjacentElement('afterend', infoBtn);
        }
      }
    });

    // DJ price info
    const djPriceSection = document.querySelector('#djs .section-header div[style*="text-align: center"]');
    if (djPriceSection) {
      if (logged) {
        djPriceSection.style.display = '';
      } else {
        djPriceSection.style.display = 'none';
      }
    }

    // Hide/show cart button
    if (cartBtn) {
      cartBtn.style.display = logged ? 'flex' : 'none';
    }
  }

  // ---- EXTRAS VISIBILITY ----
  function applyExtrasVisibility() {
    const extrasSection = document.getElementById('extras');
    if (!extrasSection) return;
    if (isLoggedIn()) {
      extrasSection.style.display = '';
    } else {
      extrasSection.style.display = 'none';
    }
  }

  // Init auth state
  updateAuthUI();
  applyPriceVisibility();
  applyExtrasVisibility();

  // Tras login/registro (gestionado en auth-shared.js): desbloquea precios y
  // extras sin recargar, y retoma el flujo "crea tu presupuesto" si estaba pendiente.
  window.addEventListener('sonoplay:auth-changed', () => {
    updateAuthUI();
    applyPriceVisibility();
    applyExtrasVisibility();
    checkPendingBudgetFlow();
  });

  // ---- APPLY ADMIN PRICES (puede llamarse varias veces si llega update del server) ----
  function applyAdminPrices() {
    const prices = JSON.parse(localStorage.getItem('sonoplay_prices') || '{}');

    function formatPrice(val, useDot) {
      if (useDot && val >= 1000) {
        return val.toLocaleString('es-ES') + ' €';
      }
      return val + ' €';
    }

    // Montajes + Ceremonia + DJ prices
    document.querySelectorAll('[data-price-key]').forEach(el => {
      const key = el.dataset.priceKey;
      if (prices[key] === undefined) return;
      const val = prices[key];

      if (el.tagName === 'BUTTON') {
        el.dataset.price = val;
      } else if (el.tagName === 'P' && el.dataset.suffix) {
        el.textContent = 'Hora extra: ' + val + ' €' + el.dataset.suffix;
      } else if (el.tagName === 'P') {
        el.textContent = formatPrice(val, el.dataset.format === 'dot');
      }
    });

    document.querySelectorAll('[data-extra-key]').forEach(el => {
      const key = el.dataset.extraKey;
      if (prices[key] === undefined) return;
      const val = prices[key];

      if (el.tagName === 'BUTTON') {
        el.dataset.price = val;
      } else if (el.tagName === 'P') {
        const unit = el.dataset.unit || '';
        if (unit) {
          el.innerHTML = val + ' €<span style="font-size: 0.9rem; font-weight: 400;">' + unit + '</span>';
        } else {
          el.textContent = val + ' €';
        }
      }
    });

    document.querySelectorAll('.qty-subtotal').forEach(sub => {
      const input = document.getElementById(sub.dataset.qtyInput);
      if (!input) return;
      const btn = document.querySelector(`button.cart-add-btn[data-qty-input="${sub.dataset.qtyInput}"]`);
      if (btn) {
        sub.dataset.unitPrice = btn.dataset.price;
        const qty = Math.max(1, parseInt(input.value) || 1);
        sub.textContent = '= ' + (parseFloat(btn.dataset.price) * qty) + ' €';
      }
    });
  }
  applyAdminPrices();
  window.addEventListener('sonoplay:prices-updated', applyAdminPrices);

  // ---- APPLY ADMIN CONTENT (puede llamarse varias veces si llega update del server) ----
  function applyAdminContent() {
    const content = JSON.parse(localStorage.getItem('sonoplay_content') || '{}');

    Object.keys(content).forEach(key => {
      document.querySelectorAll(`[data-content-key="${key}"]`).forEach(el => {
        if (el.tagName === 'A') {
          el.textContent = content[key];
          if (key === 'content-email') el.href = 'mailto:' + content[key];
        } else if (el.dataset.contentTarget) {
          el.dataset.target = content[key];
        } else {
          el.textContent = content[key];
        }
      });
      document.querySelectorAll(`[data-content-target="${key}"]`).forEach(el => {
        el.dataset.target = content[key];
      });
    });
  }
  applyAdminContent();
  window.addEventListener('sonoplay:content-updated', applyAdminContent);


  // ============================================
  // PACKAGE MODAL — Card deck para Opciones de Montaje
  // Cada .package-poster contiene un .poster-full-content oculto que se clona
  // dentro del modal cuando se pulsa el poster. El botón "Añadir al presupuesto"
  // clonado dispara click() sobre el botón original (que sí tiene handler real),
  // así no duplicamos la lógica del carrito.
  // ============================================
  (function setupPackageModal() {
    const overlay = document.getElementById('package-modal-overlay');
    if (!overlay) return;

    const modalImg     = document.getElementById('package-modal-img');
    const modalTitle   = document.getElementById('package-modal-title');
    const modalBody    = document.getElementById('package-modal-body');
    const galleryBtn   = document.getElementById('package-modal-gallery-btn');
    const closeBtn     = document.getElementById('package-modal-close');
    const posters      = document.querySelectorAll('.package-poster');
    let currentPoster  = null;
    let pendingPoster  = null; // montaje pulsado sin sesión — se reabre tras login

    function openModal(poster) {
      // Los montajes requieren estar registrado: sin sesión → login/registro
      // y, al completarlo, se reabre automáticamente este mismo montaje.
      if (!isLoggedIn()) {
        pendingPoster = poster;
        if (!isRegisterMode) toggleAuthMode();
        openAuthModal();
        return;
      }
      pendingPoster = null;
      currentPoster = poster;
      const img = poster.querySelector('.poster-img');
      const title = poster.dataset.packageTitle || '';
      const fullContent = poster.querySelector('.poster-full-content');

      modalImg.src = img ? img.src : '';
      modalImg.alt = img ? (img.alt || title) : title;
      modalTitle.textContent = title;

      modalBody.innerHTML = '';
      if (fullContent) {
        Array.from(fullContent.children).forEach(child => {
          modalBody.appendChild(child.cloneNode(true));
        });
      }

      // Wire del botón "Añadir al presupuesto" clonado: dispara click en el original
      const clonedBtn = modalBody.querySelector('.cart-add-btn');
      const originalBtn = fullContent ? fullContent.querySelector('.cart-add-btn') : null;
      if (clonedBtn && originalBtn) {
        clonedBtn.addEventListener('click', () => {
          originalBtn.click();
          // Sincroniza el texto/estado del botón clonado con el original tras la acción
          setTimeout(() => {
            clonedBtn.textContent = originalBtn.textContent;
            clonedBtn.classList.toggle('added', originalBtn.classList.contains('added'));
          }, 50);
        });
      }

      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      currentPoster = null;
    }

    posters.forEach(poster => {
      poster.addEventListener('click', () => openModal(poster));
      poster.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(poster);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
    });

    // Botón "Pulsa para ver más fotos" del modal → abre la galería del poster actual
    if (galleryBtn) {
      galleryBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!currentPoster || !window.SonoplayGallery || !window.SonoplayGallery.open) return;
        window.SonoplayGallery.open(currentPoster);
      });
    }

    // Tras login/registro, continúa donde estaba: reabre el montaje pulsado
    window.addEventListener('sonoplay:auth-changed', () => {
      if (pendingPoster && isLoggedIn()) {
        const poster = pendingPoster;
        pendingPoster = null;
        setTimeout(() => openModal(poster), 250); // deja cerrar el modal de auth
      }
    });
  })();

});
