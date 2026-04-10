/* ============================================
   SONOPLAY — Interactive Script
   ============================================ */

const supabaseUrl = 'https://srkhevcgfuqchidmzdtb.supabase.co';
const supabaseKey = 'sb_publishable_LqVWg8_0_ocYfxH4be7Y6Q_rs55mQmz';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

document.addEventListener('DOMContentLoaded', () => {

  // ---- PASSWORD PROTECTION ----
  const lockOverlay = document.getElementById('site-lock-overlay');
  const passInput = document.getElementById('site-password-input');
  const passBtn = document.getElementById('site-password-btn');
  const passError = document.getElementById('site-password-error');

  if (lockOverlay && passBtn && passInput && passError) {
    if (sessionStorage.getItem('sonoplay-unlocked') === 'true') {
      lockOverlay.style.display = 'none';
      document.body.style.overflow = '';
    } else {
      document.body.style.overflow = 'hidden';
      // Force scroll to top just in case
      window.scrollTo(0, 0);
    }

    passBtn.addEventListener('click', () => {
      const val = passInput.value.trim().toLowerCase();
      if (val === 'celuhaztefotos123') {
        lockOverlay.style.opacity = '0';
        lockOverlay.style.transition = 'opacity 0.4s ease';
        setTimeout(() => lockOverlay.style.display = 'none', 400);
        document.body.style.overflow = '';
        sessionStorage.setItem('sonoplay-unlocked', 'true');
      } else {
        passError.style.display = 'block';
        passInput.value = '';
        passInput.focus();
      }
    });

    passInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') passBtn.click();
    });
  }

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

    // Inject keyframes
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

  // ---- REVIEWS SLIDER ----
  const track = document.getElementById('reviews-track');
  if (track) {
    const slides = track.querySelectorAll('.reviews-slide');
    const dots = document.querySelectorAll('.rev-dot');
    const prevBtn = document.getElementById('rev-prev');
    const nextBtn = document.getElementById('rev-next');
    let current = 0;
    let autoPlay;

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
        slide.style.transition = 'opacity 0.6s ease';
      }
    });

    setTrackHeight();
    window.addEventListener('resize', setTrackHeight);

    prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

    function resetAuto() {
      clearInterval(autoPlay);
      autoPlay = setInterval(() => goTo(current + 1), 5000);
    }

    autoPlay = setInterval(() => goTo(current + 1), 5000);
  }

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

    // Click on slides: side slides navigate, center slide selects DJ
    djSlides.forEach((slide, i) => {
      slide.addEventListener('click', () => {
        if (i !== djCurrent) {
          djGoTo(i);
        } else {
          // Open DJ Info Modal
          const djName = slide.dataset.dj;
          if (!djName) return;

          // Perfiles mockeados para Inyección Dinámica
          const djProfiles = {
            "Juanfran Montes": {
              desc: "Especialista en animar la pista con la mejor selección musical y una energía inagotable para tu boda.",
              media: '<img src="images/dj-juanfran.jpg" style="width:100%; height:100%; object-fit:cover; object-position:center 30%; position:absolute;"><div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div><img src="images/logo-juanfran.png" style="width:150px; position:absolute; bottom:20px; z-index:2;">'
            },
            "Rafa": {
              desc: "Ritmo, pasión y una técnica impecable. Rafa convertirá tu celebración en un auténtico festival.",
              media: '<img src="images/dj-rafa-new.png" style="width:100%; height:100%; object-fit:cover; object-position:center 45%; position:absolute;"><div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div><img src="images/logo-rafa.png" style="height:110px; filter:invert(1); position:absolute; bottom:15px; z-index:2;">'
            },
            "JR Jona Rivas": {
              desc: "La combinación perfecta entre elegancia y locura discotequera. Conecta directamente con tus invitados.",
              media: '<img src="images/dj-jr.jpg" style="width:100%; height:100%; object-fit:cover; object-position:top; position:absolute;"><div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div><img src="images/logo-jr-white.png" style="height:100px; position:absolute; bottom:20px; z-index:2;">'
            },
            "Celu Martinez": {
              desc: "Sesiones vibrantes y adaptación total a tu estilo. Magia en los platos para un evento inolvidable.",
              media: '<div style="width:100%; height:100%; background:#111; display:flex; align-items:center; justify-content:center; position:absolute;"><span style="font-family:\'Montserrat\', sans-serif; font-size:4rem; font-weight:700; color:#333;">CM</span></div><div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div><img src="images/logo-celu.png" style="width:150px; position:absolute; bottom:20px; z-index:2;">'
            },
            "Cristian White": {
              desc: "Pura adrenalina y un manejo exquisito del público. La garantía absoluta de un control maestro sobre la pista.",
              media: '<img src="images/dj-cristian-white.png" style="width:100%; height:100%; object-fit:cover; object-position:center 40%; transform:scale(1.4); position:absolute;"><div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div><img src="images/logo-cristian-v3.png" style="width:180px; position:absolute; bottom:20px; z-index:2;">'
            }
          };

          const profile = djProfiles[djName] || { desc: 'La mejor selección para tu boda.', media: '' };

          // Bind Data to Modal
          document.getElementById('dj-info-name').textContent = djName;
          document.getElementById('dj-info-desc').textContent = profile.desc;
          document.getElementById('dj-info-media').innerHTML = profile.media;
          
          const actionBtn = document.getElementById('dj-info-action-btn');
          
          if (!isLoggedIn()) {
            actionBtn.innerHTML = '🔒 Regístrate para seleccionar';
            actionBtn.onclick = () => {
              document.getElementById('dj-info-modal-overlay').style.display = 'none';
              if (!window.isRegisterMode && typeof toggleAuthMode === 'function') toggleAuthMode();
              if (typeof openAuthModal === 'function') openAuthModal();
            };
          } else {
            actionBtn.innerHTML = '+ Seleccionar este DJ';
            actionBtn.onclick = () => {
              document.getElementById('dj-info-modal-overlay').style.display = 'none';
              
              const existingDjIdx = cart.findIndex(item => item.isDj);
              if (existingDjIdx !== -1) cart.splice(existingDjIdx, 1);

              const djPrice = (JSON.parse(localStorage.getItem('sonoplay_prices') || '{}')).dj || 484;
              cart.push({ name: 'DJ ' + djName + ' (5h)', price: djPrice, qty: 1, unit: '', isPackage: false, isDj: true });
              if (typeof updateCartUI === 'function') updateCartUI();

              const toast = document.getElementById('dj-toast');
              if (toast) {
                toast.textContent = 'Has elegido a ' + djName;
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
            };
          }

          // Show the new Modal
          document.getElementById('dj-info-modal-overlay').style.display = 'flex';
        }
      });
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
      const savedPrices = JSON.parse(localStorage.getItem('sonoplay_prices') || '{}');
      const threshold = savedPrices['discount-threshold'] !== undefined ? parseFloat(savedPrices['discount-threshold']) : 4000;
      const percent = savedPrices['discount-percent'] !== undefined ? parseFloat(savedPrices['discount-percent']) : 10;
      let finalTotal = total;
      let discountAmount = 0;
      
      if (threshold > 0 && total >= threshold && percent > 0) {
        discountAmount = total * (percent / 100);
        finalTotal = total - discountAmount;
        summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 8px 0 0; margin-top: 8px; border-top: 1px solid var(--border); font-size: 0.85rem;"><span style="color: var(--text-muted);">Subtotal</span><span style="color: var(--text-muted); text-decoration: line-through;">${total.toFixed(2).replace(/\.00$/, '')} €</span></div>`;
        summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 4px 0;"><span style="color: #ef4444; font-weight: 600; font-size: 0.85rem;">Descuento directo (${percent}%)</span><span style="color: #ef4444; font-weight: 700; font-size: 0.85rem;">-${discountAmount.toFixed(2).replace(/\.00$/, '')} €</span></div>`;
      }
      summaryHTML += `<div style="display: flex; justify-content: space-between; padding: 8px 0 0; border-top: 1px solid var(--border); font-size: 0.95rem; margin-top: 4px;"><span style="color: #fff; font-weight: 700;">Total estimado</span><span style="color: var(--cyan); font-weight: 900;">${finalTotal.toFixed(2).replace(/\.00$/, '')} €</span></div>`;
    } else {
      summaryHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No hay servicios seleccionados</p>';
    }
    budgetSummary.innerHTML = summaryHTML;

    // Build WhatsApp message
    let waMsg = '¡Hola SONOPLAY! 👋 Me gustaría solicitar presupuesto para:\n\n';
    cart.forEach(item => {
      waMsg += `• ${item.name}${item.qty > 1 ? ' x' + item.qty : ''} — ${item.price * item.qty} €\n`;
    });
    if (cart.length > 0) {
      const savedPrices = JSON.parse(localStorage.getItem('sonoplay_prices') || '{}');
      const threshold = savedPrices['discount-threshold'] !== undefined ? parseFloat(savedPrices['discount-threshold']) : 4000;
      const percent = savedPrices['discount-percent'] !== undefined ? parseFloat(savedPrices['discount-percent']) : 10;
      
      if (threshold > 0 && total >= threshold && percent > 0) {
        const discountAmount = total * (percent / 100);
        const finalTotal = total - discountAmount;
        waMsg += `\nSubtotal: ${total} €`;
        waMsg += `\n❌ Descuento (${percent}%): -${discountAmount.toFixed(2).replace(/\.00$/, '')} €`;
        waMsg += `\n✅ Total estimado: ${finalTotal.toFixed(2).replace(/\.00$/, '')} €\n`;
      } else {
        waMsg += `\nTotal estimado: ${total} €\n`;
      }
    }
    waMsg += '\n¿Podrían darme más información? ¡Gracias!';
    budgetWhatsappBtn.href = 'https://wa.me/34657468685?text=' + encodeURIComponent(waMsg);

    closeCart();
    budgetOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

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
      const savedPrices = JSON.parse(localStorage.getItem('sonoplay_prices') || '{}');
      const threshold = savedPrices['discount-threshold'] !== undefined ? parseFloat(savedPrices['discount-threshold']) : 4000;
      const percent = savedPrices['discount-percent'] !== undefined ? parseFloat(savedPrices['discount-percent']) : 10;
      
      // If we meet condition, calculate
      if (threshold > 0 && total >= threshold && percent > 0) {
        const discountAmount = total * (percent / 100);
        finalTotal = total - discountAmount;
        discountHtml = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: var(--text-muted); font-size: 0.95rem;">Subtotal:</span>
            <span style="color: var(--text-muted); font-size: 1rem; text-decoration: line-through;">${total.toFixed(2).replace(/\.00$/, '')} €</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: rgba(239, 68, 68, 0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
            <span style="color: #ef4444; font-size: 0.95rem; font-weight: 600;">Descuento directo (${percent}%)</span>
            <span style="color: #ef4444; font-size: 1rem; font-weight: 700;">-${discountAmount.toFixed(2).replace(/\.00$/, '')} €</span>
          </div>
        `;
      }
    }
    
    if (discountInfoEl) {
      discountInfoEl.innerHTML = discountHtml;
    }

    cartTotalEl.textContent = finalTotal > 0 ? finalTotal.toFixed(2).replace(/\.00$/, '') + ' €' : '0 €';
    updateCartBadge();
    updateAddButtons();
  }

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
        if (btn.closest('.package-card')) {
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

      // Check if it's a package (montaje) - only allow one at a time
      const isPackage = btn.closest('.package-card');

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

  function getUsers() {
    return JSON.parse(localStorage.getItem('sonoplay_users') || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem('sonoplay_users', JSON.stringify(users));
  }

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

  authToggle.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });

  // Submit login/register
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    const name = document.getElementById('auth-name').value.trim();
    const phone = document.getElementById('auth-phone').value.trim();

    if (isRegisterMode) {
      // Register
      if (!name) { showAuthError('Introduce tu nombre'); return; }
      const users = getUsers();
      if (users.find(u => u.email === email)) { showAuthError('Este email ya está registrado'); return; }
      const newUser = { name, email, password, phone, role: 'user', date: new Date().toLocaleDateString('es-ES') };
      users.push(newUser);
      saveUsers(users);
      localStorage.setItem('sonoplay_user', JSON.stringify(newUser));
    } else {
      // Login
      if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
        localStorage.setItem('sonoplay_user', JSON.stringify(ADMIN_ACCOUNT));
        authModal.style.display = 'none';
        updateAuthUI();
        applyPriceVisibility();
        checkPendingBudgetFlow();
        return;
      }
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) { showAuthError('Email o contraseña incorrectos'); return; }
      localStorage.setItem('sonoplay_user', JSON.stringify(user));
    }

    authModal.style.display = 'none';
    updateAuthUI();
    applyPriceVisibility();
    checkPendingBudgetFlow();
  });

  // Nav login button
  navLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoggedIn()) {
      if (isAdmin()) {
        window.location.href = 'admin.html';
      } else {
        // Logout
        localStorage.removeItem('sonoplay_user');
        updateAuthUI();
        applyPriceVisibility();
      }
    } else {
      openAuthModal();
    }
  });

  // Close modal clicking outside
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.style.display = 'none';
  });

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

  // Init auth state
  updateAuthUI();
  applyPriceVisibility();

  // ---- APPLY ADMIN PRICES ----
  (function applyAdminPrices() {
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
        // Update data-price on cart buttons
        el.dataset.price = val;
      } else if (el.tagName === 'P' && el.dataset.suffix) {
        // DJ extra hour special format
        el.textContent = 'Hora extra: ' + val + ' €' + el.dataset.suffix;
      } else if (el.tagName === 'P') {
        // Price display
        el.textContent = formatPrice(val, el.dataset.format === 'dot');
      }
    });

    // Extras prices
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

    // Update subtotal unit prices
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
  })();

  // ---- APPLY ADMIN CONTENT ----
  (function applyAdminContent() {
    const content = JSON.parse(localStorage.getItem('sonoplay_content') || '{}');

    Object.keys(content).forEach(key => {
      document.querySelectorAll(`[data-content-key="${key}"]`).forEach(el => {
        if (el.tagName === 'A') {
          el.textContent = content[key];
          if (key === 'content-email') el.href = 'mailto:' + content[key];
        } else if (el.dataset.contentTarget) {
          // Counter target
          el.dataset.target = content[key];
        } else {
          el.textContent = content[key];
        }
      });
      // Also update counter targets
      document.querySelectorAll(`[data-content-target="${key}"]`).forEach(el => {
        el.dataset.target = content[key];
      });
    });
  })();

  // ---- LOAD ADMIN IMAGES ----
  (function loadAdminImages() {
    const images = JSON.parse(localStorage.getItem('sonoplay_images') || '{}');
    const imageMap = {
      'logo': 'images/logosonoplay-largo.png',
      'dj-juanfran': 'images/dj-juanfran.jpg',
      'dj-rafa': 'images/dj-rafa-new.png',
      'dj-jr': 'images/dj-jr.jpg',
      'dj-cristian': 'images/dj-cristian-white.png',
      'logo-juanfran': 'images/logo-juanfran.png',
      'logo-rafa': 'images/logo-rafa.png',
      'logo-jr': 'images/logo-jr-white.png',
      'logo-celu': 'images/logo-celu.png',
      'logo-cristian': 'images/logo-cristian-v3.png',
      'foto-hexa': 'images/foto-hexa.jpeg',
      'foto-basic': 'images/foto-basic.jpeg',
      'foto-totems': 'images/foto-totems.jpeg',
      'foto-duo': 'images/foto-duo.jpeg',
      'foto-cubo': 'images/foto-cubo.jpeg',
      'foto-equis': 'images/foto-equis.jpeg'
    };
    Object.keys(images).forEach(key => {
      const defaultSrc = imageMap[key];
      if (!defaultSrc) return;
      document.querySelectorAll(`img[src="${defaultSrc}"]`).forEach(img => {
        img.src = images[key];
        img.style.display = ''; 
        if (img.parentElement && img.parentElement.classList.contains('wedding-package-media')) {
          img.parentElement.style.display = '';
        }
      });
    });
  })();

});
