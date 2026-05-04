/* ============================================
   SONOPLAY — Gallery modal (festivales, ferias, corporativos)
   Auto-injects modal HTML and wires up cards with [data-gallery-items]
   ============================================ */

(function () {
  'use strict';

  function injectModal() {
    if (document.getElementById('gallery-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'gallery-modal';
    modal.id = 'gallery-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'gallery-title');
    modal.innerHTML = [
      '<div class="gallery-header">',
        '<div class="gallery-title-block">',
          '<span class="gallery-title" id="gallery-title"></span>',
          '<span class="gallery-counter" id="gallery-counter"></span>',
        '</div>',
        '<button class="gallery-close" id="gallery-close" aria-label="Cerrar galería">',
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        '</button>',
      '</div>',
      '<div class="gallery-stage">',
        '<button class="gallery-nav gallery-prev" id="gallery-prev" aria-label="Anterior">',
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
        '</button>',
        '<div class="gallery-track" id="gallery-track" tabindex="0"></div>',
        '<button class="gallery-nav gallery-next" id="gallery-next" aria-label="Siguiente">',
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
        '</button>',
      '</div>',
      '<div class="gallery-thumbs" id="gallery-thumbs"></div>'
    ].join('');
    document.body.appendChild(modal);
  }

  function init() {
    // Solo inicializa si hay al menos una card con galería
    const cards = document.querySelectorAll('.festival-card[data-gallery-items]');
    if (!cards.length) return;

    injectModal();

    const modal     = document.getElementById('gallery-modal');
    const titleEl   = document.getElementById('gallery-title');
    const counterEl = document.getElementById('gallery-counter');
    const closeBtn  = document.getElementById('gallery-close');
    const track     = document.getElementById('gallery-track');
    const thumbsEl  = document.getElementById('gallery-thumbs');
    const prevBtn   = document.getElementById('gallery-prev');
    const nextBtn   = document.getElementById('gallery-next');
    let currentIdx = 0;
    let totalSlides = 0;

    function openGallery(card) {
      let items;
      try {
        items = JSON.parse(card.dataset.galleryItems || '[]');
      } catch (e) { return; }
      if (!items.length) return;

      totalSlides = items.length;
      currentIdx = 0;

      const title = card.dataset.galleryTitle || '';
      const meta  = card.dataset.galleryMeta || '';
      titleEl.textContent = title + (meta ? ' — ' + meta : '');

      track.innerHTML = items.map(function (it, i) {
        if (it.type === 'video') {
          return '<div class="gallery-slide" data-idx="' + i + '"><video src="' + it.src + '" controls playsinline preload="metadata"></video></div>';
        }
        return '<div class="gallery-slide" data-idx="' + i + '"><img src="' + it.src + '" alt="' + (it.alt || '') + '" loading="lazy"></div>';
      }).join('');

      if (items.length > 1) {
        thumbsEl.style.display = '';
        thumbsEl.innerHTML = items.map(function (it, i) {
          return '<button class="gallery-thumb' + (i === 0 ? ' is-active' : '') + '" data-idx="' + i + '" aria-label="Foto ' + (i + 1) + '"><img src="' + it.src + '" alt=""></button>';
        }).join('');
      } else {
        thumbsEl.style.display = 'none';
        thumbsEl.innerHTML = '';
      }

      modal.classList.add('is-open');
      document.body.classList.add('gallery-locked');
      track.scrollLeft = 0;
      updateUI();
      setTimeout(function () { track.focus({ preventScroll: true }); }, 50);
    }

    function closeGallery() {
      modal.classList.remove('is-open');
      document.body.classList.remove('gallery-locked');
      track.querySelectorAll('video').forEach(function (v) { v.pause(); });
    }

    function goTo(idx) {
      if (idx < 0 || idx >= totalSlides) return;
      currentIdx = idx;
      const slide = track.children[idx];
      if (slide) slide.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      updateUI();
    }

    function updateUI() {
      counterEl.textContent = (currentIdx + 1) + ' / ' + totalSlides;
      prevBtn.toggleAttribute('disabled', currentIdx === 0);
      nextBtn.toggleAttribute('disabled', currentIdx === totalSlides - 1);
      const onlyOne = totalSlides <= 1;
      prevBtn.style.display = onlyOne ? 'none' : '';
      nextBtn.style.display = onlyOne ? 'none' : '';
      thumbsEl.querySelectorAll('.gallery-thumb').forEach(function (t, i) {
        t.classList.toggle('is-active', i === currentIdx);
      });
    }

    // Click en imagen abre galería
    cards.forEach(function (card) {
      const img = card.querySelector('.festival-card-image');
      if (!img) return;
      img.addEventListener('click', function () { openGallery(card); });
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openGallery(card);
        }
      });
    });

    closeBtn.addEventListener('click', closeGallery);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeGallery();
    });
    prevBtn.addEventListener('click', function () { goTo(currentIdx - 1); });
    nextBtn.addEventListener('click', function () { goTo(currentIdx + 1); });
    thumbsEl.addEventListener('click', function (e) {
      const t = e.target.closest('.gallery-thumb');
      if (!t) return;
      goTo(parseInt(t.dataset.idx, 10));
    });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeGallery();
      else if (e.key === 'ArrowLeft') goTo(currentIdx - 1);
      else if (e.key === 'ArrowRight') goTo(currentIdx + 1);
    });

    // Sync con swipe en móvil
    let scrollTimer = null;
    track.addEventListener('scroll', function () {
      if (scrollTimer) cancelAnimationFrame(scrollTimer);
      scrollTimer = requestAnimationFrame(function () {
        const w = track.clientWidth;
        if (!w) return;
        const idx = Math.round(track.scrollLeft / w);
        if (idx !== currentIdx && idx >= 0 && idx < totalSlides) {
          currentIdx = idx;
          updateUI();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
