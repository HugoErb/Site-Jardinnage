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

  /* « [Numéro SIRET] » : valeur d'exemple encore à compléter */
  function isTodo(value) { return /^\[.*\]$/.test(String(value).trim()); }

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
      el.classList.toggle('is-todo', isTodo(el.textContent));
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

    $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  /* Données structurées : uniquement si activées. Les valeurs encore
     entre crochets (à compléter) sont ignorées. */
  function injectJsonLd(cfg) {
    if (getPath(cfg, 'seo.structuredData') !== true) return;
    function val(path) {
      var v = getPath(cfg, path);
      return isEmpty(v) || isTodo(v) ? undefined : String(v).trim();
    }
    var siteUrl = val('seo.siteUrl') || location.href.split('#')[0];
    var tel = toTelHref(val('contact.phone')).replace('tel:', '');
    var areas = [val('zone.city')].concat(getPath(cfg, 'zone.communes') || [])
      .filter(function (name) { return !isEmpty(name) && !isTodo(name); })
      .map(function (name) { return { '@type': 'City', name: String(name) }; });
    var social = getPath(cfg, 'social') || {};
    var sameAs = Object.keys(social).map(function (k) { return social[k]; }).filter(function (v) { return !isEmpty(v); });
    var services = $$('.services__all-list li').map(function (li) { return li.textContent.trim(); });
    var owner = val('legal.ownerName');

    var business = {
      '@type': 'LocalBusiness',
      '@id': siteUrl + '#entreprise',
      name: val('business.name'),
      description: val('business.description'),
      url: siteUrl,
      image: new URL('assets/images/og-image.jpg', siteUrl).href,
      logo: new URL('assets/images/apple-touch-icon.png', siteUrl).href,
      telephone: tel || undefined,
      email: val('contact.email'),
      address: {
        '@type': 'PostalAddress',
        streetAddress: val('legal.address'),
        addressLocality: val('zone.city'),
        addressCountry: 'FR'
      },
      areaServed: areas,
      founder: owner ? { '@type': 'Person', name: owner } : undefined,
      knowsAbout: services,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Prestations de jardinage',
        itemListElement: services.map(function (name) {
          return { '@type': 'Offer', itemOffered: { '@type': 'Service', name: name } };
        })
      },
      sameAs: sameAs.length ? sameAs : undefined
    };
    var site = {
      '@type': 'WebSite',
      '@id': siteUrl + '#site',
      url: siteUrl,
      name: val('business.name'),
      inLanguage: 'fr-FR',
      publisher: { '@id': business['@id'] }
    };
    var script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [site, business] });
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
      var img = $('img, svg', el);
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
     8. Méthode : la tige qui pousse au fil des étapes
     =================================================================== */
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
     8 bis. À propos : le jardin entretenu en boucle
     Tonte, taille de la haie, taille de l'arbuste, puis tout repousse.
     L'état de fin est identique à l'état de départ : la boucle ne saute pas.
     =================================================================== */
  function initGarden(gsap, ScrollTrigger) {
    var scene = $('[data-garden]');
    if (!scene) return;
    function part(name) { return $$('[data-g="' + name + '"]', scene); }
    /* Abscisse d'un élément, lue sur le translate() de son groupe parent */
    function baseX(el) { return el.parentNode.transform.baseVal.getItem(0).matrix.e; }
    function fall(i) {
      return { x: i % 2 ? 16 : -16, y: 130, rotation: i % 2 ? 70 : -70, opacity: 0, duration: 0.8, ease: 'power2.in' };
    }

    var clip = part('stripes-clip')[0];
    var stripes = part('stripes')[0];
    var wheels = part('wheel');
    var blades = part('blade');
    var sprigs = part('sprig');
    var twigs = part('twig');
    var cuttings = sprigs.concat(twigs);
    var shoots = cuttings.map(function (el) { return el.firstElementChild; });
    var secateur = part('secateur')[0];
    var jaw = part('secateur-jaw')[0];
    var toggle = $('[data-garden-toggle]', scene);

    var MOW = 0.6, MOW_D = 4;     // tondeuse : x de -100 à 1000, l'avant du carter balaie -8 → 1092
    var CUT = 4.3, CUT_D = 3.6;   // cisaille : la pointe des lames balaie -10 → 1190
    var PRUNE = 7.7, STOP = 1.15; // sécateur : trois passes autour de l'arbuste
    var GROW = 12.6;              // repousse
    var tl = gsap.timeline({ repeat: -1, paused: true });

    gsap.set(blades.concat(shoots), { transformOrigin: '50% 100%' });
    gsap.set(cuttings.concat(wheels, part('shears-a'), part('shears-b'), jaw, secateur), { transformOrigin: '50% 50%' });

    /* 1. Tonte : les bandes apparaissent derrière la tondeuse (bord droit du masque = avant du carter),
          l'herbe haute disparaît à son passage jusqu'à la repousse */
    tl.fromTo(part('mower'), { x: -100 }, { x: 1000, duration: MOW_D, ease: 'none' }, MOW)
      .fromTo(clip, { attr: { x: -2008 } }, { attr: { x: -908 }, duration: MOW_D, ease: 'none' }, MOW)
      .fromTo(wheels, { rotation: 0 }, { rotation: 2520, duration: MOW_D, ease: 'none' }, MOW)
      .to(part('mower-body'), { y: -1.5, duration: 0.125, repeat: 31, yoyo: true, ease: 'sine.inOut' }, MOW)
      .to(part('spray'), { opacity: 1, duration: 0.3, repeat: 1, repeatDelay: MOW_D - 0.6, yoyo: true }, MOW);
    blades.forEach(function (el) {
      tl.to(el, { scaleY: 0, duration: 0.16, ease: 'power2.in' }, MOW + (baseX(el) + 8) / 1100 * MOW_D);
    });

    /* 2. Haie : la cisaille longe le sommet, chaque pousse tombe au passage des lames */
    tl.fromTo(part('shears'), { x: -190 }, { x: 1010, duration: CUT_D, ease: 'none' }, CUT)
      .to(part('shears-a'), { rotation: -9, duration: 0.15, repeat: 23, yoyo: true, ease: 'sine.inOut' }, CUT)
      .to(part('shears-b'), { rotation: 9, duration: 0.15, repeat: 23, yoyo: true, ease: 'sine.inOut' }, CUT);
    sprigs.forEach(function (el, i) {
      tl.to(el, fall(i), CUT + (baseX(el) + 10) / 1200 * CUT_D);
    });

    /* 3. Arbuste : le sécateur fait le tour de la boule, de droite à gauche */
    var stops = [
      { x: 355, y: 684, rotation: 160, scaleY: -1, twigs: [8, 7, 6] },
      { x: 211.5, y: 575, rotation: 94, scaleY: 1, twigs: [5, 4, 3] },
      { x: 49, y: 673, rotation: 24, scaleY: 1, twigs: [2, 1, 0] }
    ];
    tl.fromTo(secateur, { x: 900, y: 640, rotation: 160, scaleY: -1 },
      { x: stops[0].x, y: stops[0].y, duration: 0.5, ease: 'power2.out' }, PRUNE);
    stops.forEach(function (stop, k) {
      var t = PRUNE + k * STOP;
      if (k) tl.to(secateur, { x: stop.x, y: stop.y, rotation: stop.rotation, scaleY: stop.scaleY, duration: 0.5, ease: 'power2.inOut' }, t);
      tl.to(jaw, { rotation: -22, duration: 0.14, repeat: 3, yoyo: true, ease: 'power1.inOut' }, t + 0.5);
      stop.twigs.forEach(function (n, j) {
        tl.to(twigs[n], fall(n), t + (j < 2 ? 0.78 + j * 0.05 : 1.06));
      });
    });
    tl.to(secateur, { x: -160, y: 640, rotation: 24, duration: 0.6, ease: 'power2.in' }, PRUNE + 3 * STOP);

    /* 4. Tout repousse, puis la boucle reprend à l'identique */
    tl.to(stripes, { opacity: 0, duration: 1.4, ease: 'power1.inOut' }, GROW)
      .to(blades, { scaleY: 1, duration: 1.2, ease: 'back.out(1.6)', stagger: { each: 0.04, from: 'random' } }, GROW + 0.2)
      .set(cuttings, { x: 0, y: 0, rotation: 0, opacity: 1 }, GROW)
      .set(shoots, { scale: 0 }, GROW)
      .to(shoots, { scale: 1, duration: 0.9, ease: 'back.out(2)', stagger: { each: 0.05, from: 'random' } }, GROW + 0.1)
      .set(clip, { attr: { x: -2008 } }, GROW + 1.5)
      .set(stripes, { opacity: 1 }, GROW + 1.5);

    /* Lecture seulement à l'écran ; le bouton pause l'emporte sur le défilement */
    var inView = false;
    var userPaused = false;
    function sync() {
      if (inView && !userPaused) tl.play();
      else tl.pause();
    }
    var trigger = ScrollTrigger.create({
      trigger: scene,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: function (self) { inView = self.isActive; sync(); }
    });
    inView = trigger.isActive;
    sync();

    if (!toggle) return;
    var icon = $('use', toggle);
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      userPaused = !userPaused;
      toggle.setAttribute('aria-label', userPaused ? 'Relancer l’animation' : 'Mettre l’animation en pause');
      icon.setAttribute('href', userPaused ? '#i-play' : '#i-pause');
      sync();
    });
  }

  /* ===================================================================
     9. Formulaire de devis (mailto) : rien n'est envoyé par le site
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
     10. Contact rapide mobile
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
     11. Questions fréquentes : ouverture et fermeture animées
     -------------------------------------------------------------------
     <details> reste fonctionnel sans JS ; ici on anime seulement la
     hauteur de la réponse. Un clic pendant l'animation la renverse.
     =================================================================== */
  function initFaq() {
    $$('.faq__item').forEach(function (item) {
      var summary = $('summary', item);
      var answer = $('.faq__a', item);
      if (!summary || !answer || !answer.animate) return;
      var anim = null;

      summary.addEventListener('click', function (event) {
        if (media.reduce.matches) return;
        event.preventDefault();
        var closing = item.open && !item.classList.contains('is-closing');
        /* Fermé, le contenu garde sa taille de mise en page (Chrome) : on part de 0 */
        var from = item.open ? answer.getBoundingClientRect().height : 0;
        if (anim) anim.cancel();

        item.classList.toggle('is-closing', closing);
        if (!closing) item.open = true;
        var to = closing ? 0 : answer.scrollHeight;

        answer.style.overflow = 'hidden';
        anim = answer.animate([
          { height: from + 'px', opacity: closing ? 1 : 0 },
          { height: to + 'px', opacity: closing ? 0 : 1 }
        ], {
          duration: closing ? 400 : 560,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
        });
        anim.onfinish = function () {
          if (closing) item.open = false;
          item.classList.remove('is-closing');
          answer.style.overflow = '';
          anim = null;
        };
      });
    });
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
    initContactForm(cfg);
    initMobileDock();
    initFaq();

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
    fontsReady().then(function () {
      initHeroScroll(gsap);
      initReveals(gsap, ScrollTrigger, SplitText);
      initServicesDepth(gsap);
      initProcessStem(gsap, ScrollTrigger);
      initGarden(gsap, ScrollTrigger);
      ScrollTrigger.refresh();
      handleInitialHash(lenis);
    });
  }

  boot();
})();
