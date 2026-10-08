/* =====================================================================
   Script principal
   ---------------------------------------------------------------------
   Script classique (pas de module ES) pour fonctionner aussi en
   ouvrant directement index.html. Les informations du professionnel
   viennent de js/config.js (window.SITE_CONFIG).
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     1. Utilitaires
     =================================================================== */
  var doc = document;
  var root = doc.documentElement;

  function $(selector, scope) { return (scope || doc).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(selector)); }

  function getPath(obj, path) {
    return String(path).split('.').reduce(function (o, key) {
      return o == null ? undefined : o[key];
    }, obj);
  }

  function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'number') return !isFinite(value);
    if (Array.isArray(value)) return value.length === 0 || value.every(isEmpty);
    if (typeof value === 'object') return Object.keys(value).every(function (k) { return isEmpty(value[k]); });
    return false;
  }

  /* « 06 12 34 56 78 » → « tel:+33612345678 » */
  function toTelHref(phone) {
    var digits = String(phone || '').replace(/[^\d+]/g, '');
    if (digits.indexOf('00') === 0) digits = '+' + digits.slice(2);
    if (/^0\d{9}$/.test(digits)) digits = '+33' + digits.slice(1);
    return digits ? 'tel:' + digits : '';
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  var media = {
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)'),
    fine: window.matchMedia('(hover: hover) and (pointer: fine)'),
    desktop: window.matchMedia('(min-width: 1024px)')
  };

  /* Attend que Tailwind ait compilé ses utilitaires (sonde .hidden). */
  function tailwindReady(timeout) {
    var probe = $('[data-tw-probe]');
    if (!probe) return Promise.resolve(false);
    var limit = timeout || 1500;
    return new Promise(function (resolve) {
      var start = performance.now();
      (function check() {
        if (getComputedStyle(probe).display === 'none') return resolve(true);
        if (performance.now() - start > limit) return resolve(false);
        requestAnimationFrame(check);
      })();
    });
  }

  /* Polices prêtes (au plus tard après 1,2 s, pour ne jamais bloquer). */
  function fontsReady() {
    return Promise.race([doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve(), wait(1200)]);
  }

  function headerOffset() {
    var header = $('[data-header]');
    return header ? header.offsetHeight : 0;
  }

  /* ===================================================================
     2. Configuration → page
     =================================================================== */
  function fillTemplate(template, cfg) {
    return template.replace(/\{([\w.]+)\}/g, function (_, path) {
      var v = getPath(cfg, path);
      return isEmpty(v) ? '' : String(v);
    });
  }

  function renderList(list, items) {
    var tpl = $('template', list);
    if (!tpl) return;
    $$(':scope > :not(template)', list).forEach(function (child) { child.remove(); });
    (items || []).filter(function (item) { return !isEmpty(item); }).forEach(function (item) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      if (typeof item === 'object') {
        $$('[data-item]', node).forEach(function (slot) {
          slot.textContent = isEmpty(item[slot.dataset.item]) ? '' : String(item[slot.dataset.item]);
        });
      } else {
        var slot = node.hasAttribute('data-item') ? node : $('[data-item]', node);
        if (slot) slot.textContent = String(item);
      }
      list.appendChild(node);
    });
  }

  function applyConfig(cfg) {
    $$('[data-bind]').forEach(function (el) {
      var v = getPath(cfg, el.dataset.bind);
      el.textContent = isEmpty(v) ? '' : String(v);
      /* Valeur encore entre crochets = information à compléter (surlignée) */
      el.classList.toggle('is-todo', /^\[.*\]$/.test(el.textContent.trim()));
    });

    $$('[data-href]').forEach(function (el) {
      var key = el.dataset.href;
      var href = '';
      if (key === 'tel') href = toTelHref(getPath(cfg, 'contact.phone'));
      else if (key === 'mailto') href = isEmpty(getPath(cfg, 'contact.email')) ? '' : 'mailto:' + getPath(cfg, 'contact.email').trim();
      else href = isEmpty(getPath(cfg, key)) ? '' : String(getPath(cfg, key)).trim();
      if (href) el.setAttribute('href', href);
      else el.removeAttribute('href');
    });

    $$('[data-aria]').forEach(function (el) {
      el.setAttribute('aria-label', fillTemplate(el.dataset.aria, cfg).trim());
    });

    $$('[data-list]').forEach(function (list) {
      renderList(list, getPath(cfg, list.dataset.list));
    });

    $$('[data-if]').forEach(function (el) {
      var empty = isEmpty(getPath(cfg, el.dataset.if));
      if (empty && el.hasAttribute('data-prune')) el.remove();
      else el.hidden = empty;
    });

    var demo = !!getPath(cfg, 'demo.illustrationLabels');
    $$('[data-demo-label]').forEach(function (el) { el.hidden = !demo; });

    $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  /* Données structurées : uniquement si activées et avec les vraies valeurs. */
  function injectJsonLd(cfg) {
    if (getPath(cfg, 'seo.structuredData') !== true) return;
    var tel = toTelHref(getPath(cfg, 'contact.phone')).replace('tel:', '');
    var siteUrl = getPath(cfg, 'seo.siteUrl');
    var areas = [getPath(cfg, 'zone.city')].concat(getPath(cfg, 'zone.communes') || [])
      .filter(function (name) { return !isEmpty(name); })
      .map(function (name) { return { '@type': 'City', name: String(name) }; });
    var social = getPath(cfg, 'social') || {};
    var sameAs = Object.keys(social).map(function (k) { return social[k]; }).filter(function (v) { return !isEmpty(v); });

    var data = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: getPath(cfg, 'business.name'),
      description: getPath(cfg, 'business.description'),
      telephone: tel || undefined,
      email: getPath(cfg, 'contact.email') || undefined,
      url: siteUrl || location.href,
      image: siteUrl ? new URL('assets/images/og-image.jpg', siteUrl).href : undefined,
      areaServed: areas,
      sameAs: sameAs.length ? sameAs : undefined
    };
    var script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    doc.head.appendChild(script);
  }

  /* ===================================================================
     3. Défilement doux et liens d'ancrage
     =================================================================== */
  function initSmoothScroll(hasGsap) {
    if (media.reduce.matches || typeof window.Lenis !== 'function') return null;
    var lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true, autoRaf: !hasGsap });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    }
    return lenis;
  }

  function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function targetTop(target) {
    if (target.id === 'accueil') return 0;
    return target.getBoundingClientRect().top + window.scrollY - headerOffset();
  }

  function scrollToTarget(target, lenis) {
    var done = function () { focusTarget(target); };
    if (lenis) {
      lenis.scrollTo(targetTop(target), { duration: 1.3, onComplete: done });
    } else {
      window.scrollTo({ top: targetTop(target), behavior: media.reduce.matches ? 'auto' : 'smooth' });
      setTimeout(done, media.reduce.matches ? 0 : 700);
    }
  }

  function initAnchors(lenis, menu) {
    doc.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      var id = decodeURIComponent(link.getAttribute('href').slice(1));
      var target = id && doc.getElementById(id);
      if (!target) return;
      event.preventDefault();
      if (menu && menu.isOpen()) menu.close(false);
      scrollToTarget(target, lenis);
      if (history.pushState) history.pushState(null, '', '#' + id);
    });
  }

  function handleInitialHash(lenis) {
    if (!location.hash) return;
    var target = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    if (lenis) lenis.scrollTo(targetTop(target), { immediate: true, force: true });
    else window.scrollTo(0, targetTop(target));
  }

  /* ===================================================================
     4. En-tête : état au défilement, couleur, cordeau, section active
     =================================================================== */
  function initHeader() {
    var header = $('[data-header]');
    if (!header) return;
    var progress = $('[data-progress]', header);
    var themed = $$('[data-header-theme]').reverse();
    var navLinks = $$('[data-nav]');
    var spy = $$('main section[id]').reverse();
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);

      var probe = header.offsetHeight / 2;
      var theme = 'dark';
      for (var i = 0; i < themed.length; i++) {
        var r = themed[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { theme = themed[i].dataset.headerTheme; break; }
      }
      header.classList.toggle('is-dark', theme === 'dark');

      var max = root.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';

      var line = window.innerHeight * 0.4;
      var current = null;
      for (var j = 0; j < spy.length; j++) {
        var rect = spy[j].getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) { current = spy[j].id; break; }
      }
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }

    function request() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ===================================================================
     5. Menu mobile
     =================================================================== */
  function initMobileMenu(lenis) {
    var toggle = $('[data-menu-toggle]');
    var panel = $('[data-menu]');
    var header = $('[data-header]');
    if (!toggle || !panel || !header) return null;
    var label = $('[data-menu-label]', toggle);
    var outside = $$('body > *').filter(function (el) {
      return el !== header && !/^(SCRIPT|TEMPLATE|STYLE)$/.test(el.tagName) && !(el.tagName === 'svg');
    });
    var open = false;
    var closeTimer;

    function focusables() { return [toggle].concat($$('a[href], button:not([disabled])', panel)); }

    function onKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      if (event.key !== 'Tab') return;
      var items = focusables();
      var first = items[0];
      var last = items[items.length - 1];
      var index = items.indexOf(doc.activeElement);
      if (index === -1) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    function openMenu() {
      if (open) return;
      open = true;
      clearTimeout(closeTimer);
      var r = toggle.getBoundingClientRect();
      panel.style.setProperty('--menu-x', Math.round(r.left + r.width / 2) + 'px');
      panel.style.setProperty('--menu-y', Math.round(r.top + r.height / 2) + 'px');
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Fermer le menu';
      header.classList.add('menu-open');
      outside.forEach(function (el) { el.inert = true; });
      if (lenis) lenis.stop(); else root.classList.add('scroll-locked');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { panel.classList.add('is-open'); });
      });
      var first = $('a[href]', panel);
      if (first) first.focus({ preventScroll: true });
      doc.addEventListener('keydown', onKey);
      doc.dispatchEvent(new CustomEvent('menu:change'));
    }

    function close(restoreFocus) {
      if (!open) return;
      open = false;
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Ouvrir le menu';
      header.classList.remove('menu-open');
      outside.forEach(function (el) { el.inert = false; });
      if (lenis) lenis.start(); else root.classList.remove('scroll-locked');
      doc.removeEventListener('keydown', onKey);
      closeTimer = setTimeout(function () { if (!open) panel.hidden = true; }, media.reduce.matches ? 0 : 760);
      doc.dispatchEvent(new CustomEvent('menu:change'));
      if (restoreFocus !== false) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', function () { if (open) close(true); else openMenu(); });
    media.desktop.addEventListener('change', function (e) { if (e.matches) close(false); });
    return { isOpen: function () { return open; }, close: close };
  }

  /* ===================================================================
     6. Hero : séquence d'arrivée (« la coupe ») et défilement
     =================================================================== */
  function initHeroIntro(gsap, SplitText) {
    var hero = $('.hero');
    if (!hero) return;
    var mediaEl = $('[data-hero-media]', hero);
    var scene = $('[data-hero-scene]', hero);
    var planes = $$('.hero__plane', hero);
    var title = $('[data-hero-title]', hero);
    var cut = $('[data-hero-cut]', hero);
    var items = $$('[data-hero-item]', hero);

    /* Mobile : animation allégée, le contenu reste visible dès le départ */
    if (!media.desktop.matches) {
      root.classList.add('intro-done');
      gsap.fromTo(scene, { scale: 1.08 }, { scale: 1, duration: 1.8, ease: 'expo.out' });
      return;
    }

    fontsReady().then(function () {
      var split = SplitText.create(title, { type: 'lines', mask: 'lines' });
      gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: function () {
          split.revert();
          gsap.set(mediaEl, { clipPath: 'none' });
          root.classList.add('intro-done');
        }
      })
        .set(title, { visibility: 'visible' })
        .fromTo(cut, { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }, 0)
        .fromTo(mediaEl, { clipPath: 'inset(49.6% 0% 49.6% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.inOut' }, 0.35)
        .fromTo(scene, { scale: 1.16 }, { scale: 1, duration: 1.9 }, 0.35)
        .from(planes.slice(2), { y: function (i) { return 50 + i * 40; }, duration: 1.8, stagger: 0.06 }, 0.4)
        .to(cut, { opacity: 0, duration: 0.35, ease: 'none' }, 0.8)
        .from(split.lines, { yPercent: 108, duration: 1.15, stagger: 0.09 }, 0.6)
        .fromTo(items, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.95, stagger: 0.08 }, 0.95);
    });
  }

  function initHeroScroll(gsap) {
    var hero = $('.hero');
    if (!hero) return;
    var mediaEl = $('[data-hero-media]', hero);
    var planes = $$('.hero__plane', hero);
    var layer = $('[data-hero-layer]', hero);
    var range = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    var depth = function (el) { return parseFloat(el.dataset.depth) || 0; };
    var mm = gsap.matchMedia();

    mm.add('(min-width: 1024px)', function () {
      window.ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', pin: true, pinSpacing: false });
      gsap.to(mediaEl, { scale: 1.06, ease: 'none', scrollTrigger: range });
      planes.forEach(function (plane) {
        gsap.to(plane, { yPercent: 1 + depth(plane) * 9, ease: 'none', scrollTrigger: range });
      });
      gsap.to(layer, { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: range });

      if (!media.fine.matches) return undefined;
      var movers = planes.map(function (plane) {
        return {
          d: depth(plane),
          x: gsap.quickTo(plane, 'x', { duration: 1.2, ease: 'power3.out' })
        };
      });
      function onMove(event) {
        var dx = event.clientX / window.innerWidth - 0.5;
        movers.forEach(function (m) { m.x(dx * -34 * m.d); });
      }
      hero.addEventListener('pointermove', onMove);
      return function () { hero.removeEventListener('pointermove', onMove); };
    });

    mm.add('(max-width: 1023.98px)', function () {
      planes.forEach(function (plane) {
        gsap.to(plane, { yPercent: depth(plane) * 8, ease: 'none', scrollTrigger: range });
      });
    });
  }

  /* ===================================================================
     7. Révélations au défilement (titres, illustrations, textes)
     =================================================================== */
  function initReveals(gsap, ScrollTrigger, SplitText) {
    $$('[data-split]').forEach(function (el) {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 105, duration: 1.1, stagger: 0.08, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
        }
      });
    });

    $$('[data-reveal="image"]').forEach(function (el) {
      var img = $('img', el);
      gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onComplete: function () {
          gsap.set([el, img], { clearProps: 'clipPath,transform' });
          el.classList.add('is-revealed');
        }
      })
        .fromTo(el, { opacity: 1, clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.inOut' })
        .fromTo(img, { scale: 1.16 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.1);
    });

    gsap.matchMedia().add('(min-width: 640px)', function () {
      $$('[data-parallax]').forEach(function (img) {
        gsap.fromTo(img, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });

    ScrollTrigger.batch('[data-reveal="up"], [data-reveal="line"]', {
      start: 'top 92%',
      once: true,
      onEnter: function (batch) {
        gsap.fromTo(batch, { opacity: 0, y: 26 }, {
          opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out',
          onStart: function () { batch.forEach(function (el) { el.classList.add('is-in'); }); }
        });
      }
    });
  }

  /* Profondeur : la seconde colonne de cartes défile légèrement plus vite */
  function initServicesDepth(gsap) {
    var col = $('[data-col-depth]');
    if (!col) return;
    gsap.matchMedia().add('(min-width: 1024px)', function () {
      gsap.fromTo(col, { y: 70 }, {
        y: -70, ease: 'none',
        scrollTrigger: { trigger: col.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ===================================================================
     8. Comparateur avant / après
     =================================================================== */
  function createBeforeAfter(root) {
    var frame = $('[data-ba-frame]', root);
    var range = $('[data-ba-range]', root);
    if (!frame || !range) return;
    var dragging = false;
    var touched = false;

    function set(value, fromRange) {
      var pos = clamp(value, 0, 100);
      frame.style.setProperty('--pos', pos.toFixed(2) + '%');
      if (!fromRange) range.value = String(Math.round(pos));
      range.setAttribute('aria-valuetext', Math.round(pos) + ' % avant, ' + (100 - Math.round(pos)) + ' % après');
    }

    function fromEvent(event) {
      var r = frame.getBoundingClientRect();
      return (event.clientX - r.left) / r.width * 100;
    }

    frame.addEventListener('pointerdown', function (event) {
      touched = true;
      dragging = true;
      if (event.pointerType === 'mouse' && frame.setPointerCapture) frame.setPointerCapture(event.pointerId);
      set(fromEvent(event));
    });
    frame.addEventListener('pointermove', function (event) {
      if (dragging) set(fromEvent(event));
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
      frame.addEventListener(type, function () { dragging = false; });
    });
    range.addEventListener('input', function () {
      touched = true;
      set(Number(range.value), true);
    });
    set(50);

    /* Indice de manipulation à la première apparition (annulé au premier contact) */
    if (media.reduce.matches || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      var keys = [50, 28, 72, 50];
      var segment = 0;
      var start = null;
      var duration = 700;
      function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function step(now) {
        if (touched) return;
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / duration);
        set(keys[segment] + (keys[segment + 1] - keys[segment]) * ease(t));
        if (t < 1) { requestAnimationFrame(step); return; }
        segment += 1;
        start = null;
        if (segment < keys.length - 1) requestAnimationFrame(step);
      }
      setTimeout(function () { requestAnimationFrame(step); }, 400);
    }, { threshold: 0.6 });
    io.observe(frame);
  }

  /* ===================================================================
     9. Visionneuse de la galerie
     =================================================================== */
  function createLightbox(lenis) {
    var dialog = $('[data-lightbox]');
    var items = $$('[data-gallery-item]');
    if (!dialog || !items.length || typeof dialog.showModal !== 'function') return;
    var img = $('[data-lightbox-img]', dialog);
    var caption = $('[data-lightbox-caption]', dialog);
    var count = $('[data-lightbox-count]', dialog);
    var index = 0;
    var opener = null;
    var startX = null;

    function show(i) {
      index = (i + items.length) % items.length;
      var item = items[index];
      var thumb = $('img', item);
      img.src = item.dataset.full;
      img.alt = thumb ? (thumb.dataset.alt || thumb.alt) : '';
      caption.textContent = ($('.gallery__title', item) || {}).textContent || '';
      count.textContent = (index + 1) + ' / ' + items.length;
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () {
        opener = item;
        show(i);
        dialog.showModal();
        if (lenis) lenis.stop();
        root.classList.add('scroll-locked');
      });
    });

    $('[data-lightbox-prev]', dialog).addEventListener('click', function () { show(index - 1); });
    $('[data-lightbox-next]', dialog).addEventListener('click', function () { show(index + 1); });
    $('[data-lightbox-close]', dialog).addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('pointerdown', function (event) { startX = event.clientX; });
    dialog.addEventListener('pointerup', function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });
    dialog.addEventListener('close', function () {
      root.classList.remove('scroll-locked');
      if (lenis) lenis.start();
      if (opener) opener.focus({ preventScroll: true });
    });
  }

  /* ===================================================================
     10. Méthode : la tige qui pousse au fil des étapes
     =================================================================== */
  function seeded(seed) {
    var state = seed >>> 0;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function initProcessStem(gsap, ScrollTrigger) {
    var wrap = $('[data-process]');
    if (!wrap) return;
    var svg = $('[data-process-stem]', wrap);
    var base = $('[data-stem-base]', wrap);
    var grow = $('[data-stem-grow]', wrap);
    var steps = $$('[data-step]', wrap);
    var animated = !!(gsap && ScrollTrigger) && root.classList.contains('motion');
    var ns = 'http://www.w3.org/2000/svg';
    var length = 0;
    var progress = animated ? 0 : 1;
    var leaves = [];
    var leafLayer = doc.createElementNS(ns, 'g');
    leafLayer.setAttribute('class', 'process__leaves');
    svg.appendChild(leafLayer);

    function build() {
      var box = wrap.getBoundingClientRect();
      var points = steps.map(function (step) {
        var r = $('.step__num', step).getBoundingClientRect();
        return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
      });
      if (!points.length) return;
      var sway = media.desktop.matches ? 42 : 7;
      var prev = [points[0][0], 0];
      var d = 'M' + prev[0].toFixed(1) + ' 0';
      points.concat([[points[points.length - 1][0], box.height]]).forEach(function (p, i) {
        var dir = i % 2 ? -1 : 1;
        var mid = (prev[1] + p[1]) / 2;
        d += ' C' + (prev[0] + sway * dir).toFixed(1) + ' ' + mid.toFixed(1) + ' ' +
          (p[0] - sway * dir).toFixed(1) + ' ' + mid.toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
        prev = p;
      });
      base.setAttribute('d', d);
      grow.setAttribute('d', d);
      length = grow.getTotalLength();
      grow.style.strokeDasharray = length + ' ' + length;
      placeLeaves();
    }

    /* Feuilles réparties le long de la tige, de part et d'autre */
    function placeLeaves() {
      leafLayer.textContent = '';
      leaves = [];
      var desktop = media.desktop.matches;
      var spacing = desktop ? 96 : 74;
      var nodes = steps.map(function (step) {
        var r = $('.step__num', step).getBoundingClientRect();
        return r.top + r.height / 2 - wrap.getBoundingClientRect().top;
      });
      for (var at = spacing * 0.65, i = 0; at < length - 24; at += spacing, i++) {
        var p = grow.getPointAtLength(at);
        var q = grow.getPointAtLength(Math.min(length, at + 2));
        if (nodes.some(function (y) { return Math.abs(y - p.y) < (desktop ? 46 : 34); })) continue;
        var side = leaves.length % 2 ? 1 : -1;
        var angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + side * 56;
        var k = (leaves.length % 3 === 1 ? 0.8 : 1) * (desktop ? 1.45 : 1);
        var group = doc.createElementNS(ns, 'g');
        group.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + angle.toFixed(1) + ')');
        var leaf = doc.createElementNS(ns, 'path');
        leaf.setAttribute('d', 'M0 0Q' + (11 * k).toFixed(1) + ' ' + (-10 * k).toFixed(1) + ' ' + (26 * k).toFixed(1) +
          ' 0Q' + (11 * k).toFixed(1) + ' ' + (10 * k).toFixed(1) + ' 0 0Z');
        leaf.setAttribute('class', 'process__leaf' + (leaves.length % 3 === 2 ? ' process__leaf--light' : ''));
        group.appendChild(leaf);
        leafLayer.appendChild(group);
        leaves.push({ at: at / length, el: leaf, on: true });
      }
      if (animated) {
        gsap.set(leaves.map(function (l) { return l.el; }), { scale: 0, transformOrigin: '0% 50%' });
        leaves.forEach(function (l) { l.on = false; });
        syncLeaves(progress);
      }
    }

    function syncLeaves(value) {
      progress = value;
      leaves.forEach(function (l) {
        var on = value >= l.at;
        if (on === l.on) return;
        l.on = on;
        gsap.to(l.el, { scale: on ? 1 : 0, duration: on ? 0.75 : 0.3, ease: on ? 'back.out(2.4)' : 'power2.in', overwrite: true });
      });
    }

    build();
    if (!animated) {
      grow.style.strokeDashoffset = '0';
      steps.forEach(function (step) { step.classList.add('is-active'); });
      return;
    }

    grow.style.strokeDashoffset = String(length);
    gsap.fromTo(grow, { strokeDashoffset: function () { return length; } }, {
      strokeDashoffset: 0,
      ease: 'none',
      onUpdate: function () { syncLeaves(this.progress()); },
      scrollTrigger: { trigger: wrap, start: 'top 72%', end: 'bottom 72%', scrub: 0.6, invalidateOnRefresh: true }
    });
    steps.forEach(function (step) {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 70%',
        onEnter: function () { step.classList.add('is-active'); },
        onLeaveBack: function () { step.classList.remove('is-active'); }
      });
    });

    if ('ResizeObserver' in window) {
      var timer;
      var lastWidth = wrap.offsetWidth;
      new ResizeObserver(function () {
        if (wrap.offsetWidth === lastWidth) return;
        lastWidth = wrap.offsetWidth;
        clearTimeout(timer);
        timer = setTimeout(function () { build(); ScrollTrigger.refresh(); }, 150);
      }).observe(wrap);
    }
  }

  /* ===================================================================
     11. Zone d'intervention : cernes de croissance et communes
     =================================================================== */
  function initZoneRings(cfg) {
    var wrap = $('[data-rings]');
    if (!wrap) return null;
    var svg = $('[data-rings-svg]', wrap);
    var labels = $('[data-rings-labels]', wrap);
    var ns = 'http://www.w3.org/2000/svg';
    var rnd = seeded(5);
    svg.textContent = '';
    [292, 238, 182, 126, 72].forEach(function (radius) {
      var p1 = rnd() * 6.28;
      var p2 = rnd() * 6.28;
      var d = '';
      for (var k = 0; k <= 96; k++) {
        var a = k / 96 * Math.PI * 2;
        var r = radius * (1 + 0.024 * Math.sin(a * 3 + p1) + 0.014 * Math.sin(a * 7 + p2));
        d += (k ? 'L' : 'M') + (300 + Math.cos(a) * r).toFixed(1) + ' ' + (300 + Math.sin(a) * r).toFixed(1);
      }
      var path = doc.createElementNS(ns, 'path');
      path.setAttribute('d', d + 'Z');
      path.setAttribute('class', 'rings__ring');
      svg.appendChild(path);
    });

    var communes = (getPath(cfg, 'zone.communes') || []).filter(function (c) { return !isEmpty(c); });
    var tracks = communes.length <= 6 ? [212] : [176, 266];
    labels.textContent = '';
    wrap.classList.toggle('rings--dense', communes.length > 6);
    var items = communes.map(function (name, i) {
      var two = tracks.length === 2;
      var track = two ? i % 2 : 0;
      var perTrack = two ? Math.ceil(communes.length / 2) : communes.length;
      var index = two ? Math.floor(i / 2) : i;
      var el = doc.createElement('span');
      el.className = 'tag rings__label';
      el.textContent = String(name);
      labels.appendChild(el);
      return { el: el, r: tracks[track], a: -Math.PI / 2 + 0.42 + (index / perTrack) * Math.PI * 2 + (track ? Math.PI / perTrack : 0) };
    });

    function place(item) {
      item.el.style.left = (50 + Math.cos(item.a) * item.r / 6).toFixed(2) + '%';
      item.el.style.top = (50 + Math.sin(item.a) * item.r / 6).toFixed(2) + '%';
    }

    /* Écarte les étiquettes qui se chevauchent, le long de leurs cernes.
       Boîtes calculées à partir des dimensions (indépendantes des animations). */
    function relax() {
      items.forEach(place);
      var W = labels.offsetWidth;
      var H = labels.offsetHeight;
      if (!W || getComputedStyle(labels).display === 'none') return;
      var sizes = items.map(function (it) { return [it.el.offsetWidth, it.el.offsetHeight]; });
      function box(k) {
        var cx = W * (0.5 + Math.cos(items[k].a) * items[k].r / 600);
        var cy = H * (0.5 + Math.sin(items[k].a) * items[k].r / 600);
        return [cx - sizes[k][0] / 2, cy - sizes[k][1] / 2, cx + sizes[k][0] / 2, cy + sizes[k][1] / 2];
      }
      for (var iter = 0; iter < 120; iter++) {
        var moved = false;
        for (var i = 0; i < items.length; i++) {
          for (var j = i + 1; j < items.length; j++) {
            var A = box(i), B = box(j);
            if (A[0] < B[2] + 6 && B[0] < A[2] + 6 && A[1] < B[3] + 3 && B[1] < A[3] + 3) {
              var diff = Math.atan2(Math.sin(items[j].a - items[i].a), Math.cos(items[j].a - items[i].a));
              var push = diff >= 0 ? 0.03 : -0.03;
              items[i].a -= push;
              items[j].a += push;
              moved = true;
            }
          }
        }
        if (!moved) break;
      }
      items.forEach(place);
    }

    relax();
    fontsReady().then(relax);
    if ('ResizeObserver' in window && items.length) {
      var timer;
      var lastWidth = wrap.offsetWidth;
      new ResizeObserver(function () {
        if (wrap.offsetWidth === lastWidth) return;
        lastWidth = wrap.offsetWidth;
        clearTimeout(timer);
        timer = setTimeout(relax, 120);
      }).observe(wrap);
    }
    return wrap;
  }

  function animateZone(gsap) {
    var wrap = $('[data-rings]');
    if (!wrap) return;
    var trigger = { trigger: wrap, start: 'top 78%', once: true };
    gsap.from($$('.rings__ring', wrap).reverse(), {
      scale: 0.55, opacity: 0, svgOrigin: '300 300', duration: 1.3, stagger: 0.09, ease: 'expo.out', scrollTrigger: trigger
    });
    gsap.from($('.rings__center', wrap), { y: -24, opacity: 0, duration: 1, delay: 0.25, ease: 'back.out(2)', scrollTrigger: trigger });
    gsap.from($$('.rings__label', wrap), { opacity: 0, scale: 0.8, duration: 0.7, stagger: 0.06, delay: 0.45, ease: 'expo.out', scrollTrigger: trigger });
  }

  /* ===================================================================
     12. Formulaire de devis (mailto) : rien n'est envoyé par le site
     =================================================================== */
  function buildMailto(data, cfg) {
    var to = String(getPath(cfg, 'contact.email') || '').trim();
    var firstName = String(getPath(cfg, 'person.firstName') || '').trim();
    var subject = 'Demande de devis — ' + data.serviceLabel + ' — ' + data.name;
    var body = [
      'Bonjour' + (firstName ? ' ' + firstName : '') + ',',
      '',
      data.message,
      '',
      '—',
      'Nom : ' + data.name,
      'E-mail : ' + data.email,
      'Téléphone : ' + (data.phone || 'non renseigné'),
      'Prestation : ' + data.serviceLabel
    ].join('\r\n');
    return {
      to: to,
      href: 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body),
      text: 'À : ' + to + '\r\nObjet : ' + subject + '\r\n\r\n' + body
    };
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      if (ok) resolve(); else reject(new Error('copy'));
    });
  }

  function initContactForm(cfg) {
    var form = $('[data-quote-form]');
    if (!form) return;
    var status = $('[data-form-status]', form);
    var f = form.elements;
    var submitted = false;
    var text = {
      name: 'Indiquez votre nom.',
      emailMissing: 'Indiquez votre adresse e-mail.',
      emailInvalid: 'Cette adresse e-mail semble incomplète (exemple : nom@domaine.fr).',
      phone: 'Ce numéro semble incomplet.',
      message: 'Décrivez brièvement votre besoin.'
    };

    function setError(input, message) {
      var error = $('#' + input.id + '-error');
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      if (error) error.textContent = message || '';
    }

    function check(input) {
      var v = input.value.trim();
      if (input === f.name) return v ? '' : text.name;
      if (input === f.email) {
        if (!v) return text.emailMissing;
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : text.emailInvalid;
      }
      if (input === f.phone) return !v || v.replace(/\D/g, '').length >= 9 ? '' : text.phone;
      if (input === f.message) return v ? '' : text.message;
      return '';
    }

    function validate() {
      var invalid = [];
      [f.name, f.email, f.phone, f.message].forEach(function (input) {
        var message = check(input);
        setError(input, message);
        if (message) invalid.push(input);
      });
      return invalid;
    }

    [f.name, f.email, f.phone, f.message].forEach(function (input) {
      input.addEventListener('input', function () { if (submitted) setError(input, check(input)); });
      input.addEventListener('blur', function () { if (submitted || input.value.trim()) setError(input, check(input)); });
    });

    function el(tag, className, content) {
      var node = doc.createElement(tag);
      if (className) node.className = className;
      if (content) node.textContent = content;
      return node;
    }

    function renderStatus(mail, long) {
      status.textContent = '';
      status.appendChild(el('p', '', 'Votre messagerie devrait s’ouvrir avec votre demande pré-remplie. Pensez à cliquer sur « Envoyer » : je ne la recevrai qu’à ce moment-là.'));
      if (long) status.appendChild(el('p', '', 'Votre message est long : si votre messagerie le coupe, utilisez « Copier ma demande ».'));
      status.appendChild(el('p', '', 'Rien ne s’est ouvert ? Copiez votre demande pour la coller dans votre messagerie, ou appelez-moi.'));
      var actions = el('div', 'quote-form__status-actions');
      var copy = el('button', 'btn btn--sm');
      copy.type = 'button';
      copy.setAttribute('data-copy', '');
      var svgNs = 'http://www.w3.org/2000/svg';
      var icon = doc.createElementNS(svgNs, 'svg');
      icon.setAttribute('class', 'icon');
      icon.setAttribute('aria-hidden', 'true');
      var use = doc.createElementNS(svgNs, 'use');
      use.setAttribute('href', '#i-copy');
      icon.appendChild(use);
      copy.appendChild(icon);
      var label = el('span', '', 'Copier ma demande');
      copy.appendChild(label);
      copy.addEventListener('click', function () {
        copyText(mail.text).then(function () {
          label.textContent = 'Demande copiée';
          use.setAttribute('href', '#i-check');
          setTimeout(function () { label.textContent = 'Copier ma demande'; use.setAttribute('href', '#i-copy'); }, 2600);
        }, function () {
          label.textContent = 'Copie impossible : sélectionnez le texte du formulaire';
        });
      });
      actions.appendChild(copy);
      if (mail.to) {
        var mailLink = el('a', 'link link--always', mail.to);
        mailLink.href = mail.href;
        actions.appendChild(mailLink);
      }
      var phone = getPath(cfg, 'contact.phone');
      if (!isEmpty(phone)) {
        var tel = el('a', 'link link--always', String(phone));
        tel.href = toTelHref(phone);
        actions.appendChild(tel);
      }
      status.appendChild(actions);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitted = true;
      var invalid = validate();
      if (invalid.length) {
        invalid[0].focus();
        return;
      }
      var select = f.service;
      var mail = buildMailto({
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        message: f.message.value.trim(),
        serviceLabel: select.options[select.selectedIndex].text
      }, cfg);
      renderStatus(mail, mail.href.length > 1800);
      if (mail.to) window.location.href = mail.href;
    });

    /* Les liens « Demander un devis pour… » préremplissent la prestation */
    $$('[data-service]').forEach(function (link) {
      link.addEventListener('click', function () {
        var select = f.service;
        if (!select || !$('option[value="' + link.dataset.service + '"]', select)) return;
        select.value = link.dataset.service;
        select.classList.add('is-highlight');
        setTimeout(function () { select.classList.remove('is-highlight'); }, 1800);
      });
    });
  }

  /* ===================================================================
     13. Contact rapide mobile
     =================================================================== */
  function initMobileDock() {
    var dock = $('[data-dock]');
    var hero = $('.hero');
    var contact = $('#contact');
    var header = $('[data-header]');
    if (!dock) return;
    var contactVisible = false;
    var ticking = false;

    function update() {
      ticking = false;
      var past = window.scrollY > (hero ? hero.offsetHeight * 0.6 : 300);
      var menuOpen = header && header.classList.contains('menu-open');
      var visible = past && !contactVisible && !menuOpen;
      dock.classList.toggle('is-visible', visible);
      dock.inert = !visible;
    }
    function request() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    if (contact && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        contactVisible = entries[0].isIntersecting;
        request();
      }, { rootMargin: '0px 0px -20% 0px' }).observe(contact);
    }
    window.addEventListener('scroll', request, { passive: true });
    doc.addEventListener('menu:change', request);
    update();
  }

  /* ===================================================================
     99. Démarrage
     =================================================================== */
  function boot() {
    var cfg = window.SITE_CONFIG || {};
    applyConfig(cfg);
    injectJsonLd(cfg);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var hasGsap = !!(gsap && ScrollTrigger && SplitText);
    var motion = root.classList.contains('motion');
    if (motion && !hasGsap) {
      root.classList.remove('motion');
      motion = false;
    }
    if (hasGsap) gsap.registerPlugin(ScrollTrigger, SplitText);

    var lenis = motion ? initSmoothScroll(hasGsap) : null;
    initHeader();
    var menu = initMobileMenu(lenis);
    initAnchors(lenis, menu);
    $$('[data-ba]').forEach(createBeforeAfter);
    createLightbox(lenis);
    initZoneRings(cfg);
    initContactForm(cfg);
    initMobileDock();

    if (!motion) {
      initProcessStem(null, null);
      handleInitialHash(null);
      return;
    }

    var lateStart = root.classList.contains('no-intro');
    root.classList.add('motion-ready');
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (lateStart) root.classList.add('intro-done');
    else initHeroIntro(gsap, SplitText);
    tailwindReady().then(fontsReady).then(function () {
      initHeroScroll(gsap);
      initReveals(gsap, ScrollTrigger, SplitText);
      initServicesDepth(gsap);
      initProcessStem(gsap, ScrollTrigger);
      animateZone(gsap);
      ScrollTrigger.refresh();
      handleInitialHash(lenis);
    });
  }

  boot();
})();
