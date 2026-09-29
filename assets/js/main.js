/* ==========================================================================
   Sri Vinayaga Chimney Work — Site behaviour
   Small independent modules, each guarded so every page runs only what it has.
   ========================================================================== */

(function () {
  'use strict';

  var BIZ = {
    phone: '919360424124',            // WhatsApp + call
    phoneDisplay: '+91 93604 24124',
    phone2: '918056773893',           // call only
    phone2Display: '+91 80567 73893',
    email: 'srivinayagachimneywork@gmail.com'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function raf(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; fn(); });
    };
  }

  /* ------------------------------------------------------------------ */
  /* Header — info bar collapses and the bar floats once scrolled         */
  /* ------------------------------------------------------------------ */
  function header() {
    var top = document.querySelector('.site-top');
    if (!top) return;
    var update = raf(function () {
      top.classList.toggle('is-stuck', window.scrollY > 30);
    });
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Sliding pill behind the navigation links                            */
  /* ------------------------------------------------------------------ */
  function navPill() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var pill = nav.querySelector('.nav__pill');
    var active = nav.querySelector('.nav__link.is-active');
    if (!pill) return;

    function moveTo(link) {
      if (!link) { pill.classList.remove('is-on'); return; }
      pill.style.width = link.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + (link.offsetLeft - 5) + 'px)';
      pill.classList.add('is-on');
    }

    nav.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('mouseenter', function () { moveTo(link); });
      link.addEventListener('focus', function () { moveTo(link); });
    });
    nav.addEventListener('mouseleave', function () { moveTo(active); });

    /* Wait for webfonts so the measurement is right */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { moveTo(active); });
    }
    window.addEventListener('load', function () { moveTo(active); });
    window.addEventListener('resize', raf(function () { moveTo(active); }));
    moveTo(active);
  }

  /* ------------------------------------------------------------------ */
  /* Mobile navigation drawer                                            */
  /* ------------------------------------------------------------------ */
  function mobileNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var drawer = document.querySelector('.mobile-nav');
    if (!toggle || !drawer) return;

    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
    }
    toggle.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1060) setOpen(false);
    });
    setOpen(false);
  }

  /* ------------------------------------------------------------------ */
  /* Scroll progress bar                                                 */
  /* ------------------------------------------------------------------ */
  function progress() {
    var bar = document.querySelector('.progress');
    if (!bar || reduceMotion) return;
    var update = raf(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Split headlines into words so they can rise in one at a time         */
  /* ------------------------------------------------------------------ */
  function splitHeadings() {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      if (el.dataset.splitDone) return;
      var step = parseInt(el.getAttribute('data-split'), 10) || 55;
      var i = 0;

      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var parts = child.textContent.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement('span');
              w.className = 'wsplit-word';
              var inner = document.createElement('i');
              inner.textContent = part;
              inner.style.setProperty('--wd', (i++ * step) + 'ms');
              w.appendChild(inner);
              frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && !child.classList.contains('wsplit-word')) {
            walk(child);
          }
        });
      })(el);

      el.classList.add('wsplit');
      el.dataset.splitDone = '1';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Count-up numbers                                                    */
  /* ------------------------------------------------------------------ */
  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = el.getAttribute('data-count'); return; }
    var pad = (el.getAttribute('data-pad') || '').length;
    var dur = 1500;
    var from = target > 100 ? Math.max(0, target - 40) : 0;
    var t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(from + (target - from) * eased);
      el.textContent = pad ? String(val).padStart(pad, '0') : String(val);
      if (p < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal — drives reveals, masks, splits, dividers, counters    */
  /* ------------------------------------------------------------------ */
  function reveal() {
    var sel = '.reveal, .mask-reveal, .wsplit, .divider, .process, [data-count]';
    var items = document.querySelectorAll(sel);
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (n) {
        n.classList.add('is-in');
        if (n.hasAttribute('data-count')) n.textContent = n.getAttribute('data-count');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        if (entry.target.hasAttribute('data-count')) runCount(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.1 });

    items.forEach(function (n) { io.observe(n); });

    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.classList.contains('reveal')) child.style.setProperty('--d', (i * step) + 'ms');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Parallax — hero background and any [data-par] media                  */
  /* ------------------------------------------------------------------ */
  function parallax() {
    if (reduceMotion) return;
    var hero = document.querySelector('[data-parallax] img');
    var layers = Array.prototype.slice.call(document.querySelectorAll('[data-par]'));
    if (!hero && !layers.length) return;

    var update = raf(function () {
      var vh = window.innerHeight;
      if (hero) {
        var h = hero.closest('.hero').getBoundingClientRect();
        if (h.bottom > 0 && h.top < vh) {
          hero.style.transform = 'translate3d(0,' + (Math.min(Math.max(-h.top, 0), h.height) * 0.14).toFixed(1) + 'px,0)';
        }
      }
      layers.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var amt = parseFloat(el.getAttribute('data-par')) || 12;
        var centre = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = 'translate3d(0,' + (centre * -amt).toFixed(1) + 'px,0)';
      });
    });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic buttons — the button leans toward the cursor                */
  /* ------------------------------------------------------------------ */
  function magnetic() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll('.btn, .socials a, .lb-btn').forEach(function (el) {
      el.classList.add('magnetic');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.34;
        el.style.setProperty('--mx', x.toFixed(1) + 'px');
        el.style.setProperty('--my', (y - 2).toFixed(1) + 'px');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Card tilt — a few degrees of parallax on hover                       */
  /* ------------------------------------------------------------------ */
  function tilt() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll('.svc-card, .prod, .proj').forEach(function (el) {
      if (el.classList.contains('svc-card--feature')) return;
      el.classList.add('tilt');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (px * 5).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
        el.style.setProperty('--ty', '-6px');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Page transition — fade out before following an internal link         */
  /* ------------------------------------------------------------------ */
  function pageTransition() {
    if (reduceMotion) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
      if (/^(https?:|mailto:|tel:|#)/.test(href)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      document.body.classList.add('is-leaving');
      window.setTimeout(function () { window.location.href = href; }, 260);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) document.body.classList.remove('is-leaving');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Capability marquee                                                  */
  /* ------------------------------------------------------------------ */
  function marquee() {
    var track = document.querySelector('.strip__track');
    if (!track || track.dataset.cloned) return;
    track.innerHTML += track.innerHTML;
    track.dataset.cloned = '1';
  }

  /* ------------------------------------------------------------------ */
  /* Project gallery — category filters                                  */
  /* ------------------------------------------------------------------ */
  function filters() {
    var bar = document.querySelector('[data-filters]');
    var gallery = document.querySelector('[data-gallery]');
    if (!bar || !gallery) return;

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      var cat = btn.getAttribute('data-filter');

      bar.querySelectorAll('.filter').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });

      var i = 0;
      gallery.querySelectorAll('[data-cat]').forEach(function (card) {
        var show = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.classList.toggle('is-hidden', !show);
        if (show && !reduceMotion) {
          card.style.animation = 'none';
          void card.offsetWidth;
          card.style.animation = 'projIn .6s var(--ease-out) both';
          card.style.animationDelay = (i++ * 40) + 'ms';
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lightbox — images and videos                                        */
  /* ------------------------------------------------------------------ */
  function lightbox() {
    var box = document.querySelector('[data-lightbox]');
    if (!box) return;

    var stage = box.querySelector('.lightbox__stage');
    var cat = box.querySelector('[data-lb-cat]');
    var ttl = box.querySelector('[data-lb-title]');
    var idxEl = box.querySelector('[data-lb-index]');
    var lastFocus = null;
    var items = [];
    var current = 0;

    function collect() {
      items = Array.prototype.filter.call(
        document.querySelectorAll('[data-lb-item]'),
        function (n) { return !n.classList.contains('is-hidden'); }
      );
    }

    function render(i) {
      var node = items[i];
      if (!node) return;
      current = i;
      var video = node.getAttribute('data-video');
      var src = node.getAttribute('data-full');
      stage.innerHTML = '';

      var media;
      if (video) {
        media = document.createElement('video');
        media.src = video;
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;
        media.setAttribute('playsinline', '');
        media.poster = src || '';
      } else {
        media = document.createElement('img');
        media.src = src;
        media.alt = node.getAttribute('data-title') || '';
      }
      stage.appendChild(media);

      cat.textContent = node.getAttribute('data-catlabel') || '';
      ttl.textContent = node.getAttribute('data-title') || '';
      idxEl.textContent = (i + 1) + ' / ' + items.length;
    }

    function open(node) {
      collect();
      var i = items.indexOf(node);
      if (i < 0) return;
      lastFocus = document.activeElement;
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nav-open');
      render(i);
      box.querySelector('[data-lb-close]').focus();
    }

    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nav-open');
      stage.innerHTML = '';
      if (lastFocus) lastFocus.focus();
    }

    function step(dir) { render((current + dir + items.length) % items.length); }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-lb-item]');
      if (trigger) { e.preventDefault(); e.stopPropagation(); open(trigger); return; }
      if (e.target.closest('[data-lb-close]')) { close(); return; }
      if (e.target.closest('[data-lb-prev]')) { step(-1); return; }
      if (e.target.closest('[data-lb-next]')) { step(1); return; }
      if (e.target === box || e.target.classList.contains('lightbox__stage')) close();
    }, true);

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Enquiry form — validation, then hand the enquiry to WhatsApp         */
  /* ------------------------------------------------------------------ */
  function enquiryForm() {
    var form = document.querySelector('[data-enquiry-form]');
    if (!form) return;
    /* The confirmation panel sits above the form, not inside it. */
    var status = document.querySelector('[data-form-status]');

    function fieldOf(input) { return input.closest('.field') || input.closest('fieldset'); }

    function setError(input, message) {
      var wrap = fieldOf(input);
      if (!wrap) return;
      wrap.classList.add('has-error');
      var slot = wrap.querySelector('.field__err');
      if (slot) slot.textContent = message;
      input.setAttribute('aria-invalid', 'true');
    }

    function clearError(input) {
      var wrap = fieldOf(input);
      if (!wrap) return;
      wrap.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
    }

    function validate(input) {
      var v = (input.value || '').trim();
      if (input.hasAttribute('required') && !v) {
        setError(input, 'This field is required.');
        return false;
      }
      if (input.type === 'tel' && v && v.replace(/\D/g, '').length < 10) {
        setError(input, 'Enter a valid 10-digit mobile number.');
        return false;
      }
      if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        setError(input, 'Enter a valid email address.');
        return false;
      }
      clearError(input);
      return true;
    }

    var inputs = Array.prototype.slice.call(
      form.querySelectorAll('input[name], select[name], textarea[name]')
    ).filter(function (n) { return n.type !== 'radio'; });

    inputs.forEach(function (input) {
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        var w = fieldOf(input);
        if (w && w.classList.contains('has-error')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;
      inputs.forEach(function (input) {
        if (!validate(input)) { ok = false; if (!firstBad) firstBad = input; }
      });
      if (!ok) {
        if (status) status.classList.remove('is-shown');
        if (firstBad) firstBad.focus();
        return;
      }

      var data = new FormData(form);
      var get = function (k) { return (data.get(k) || '').toString().trim(); };

      var lines = [
        'New enquiry from the website', '',
        'Name: ' + get('name'),
        'Mobile: ' + get('phone')
      ];
      if (get('email')) lines.push('Email: ' + get('email'));
      lines.push('Service required: ' + get('service'));
      if (get('location')) lines.push('Site / location: ' + get('location'));
      if (get('contact_pref')) lines.push('Preferred contact: ' + get('contact_pref'));
      if (get('message')) { lines.push('', 'Requirement:', get('message')); }

      window.open('https://wa.me/' + BIZ.phone + '?text=' + encodeURIComponent(lines.join('\n')),
                  '_blank', 'noopener');

      form.reset();
      if (status) {
        status.classList.add('is-shown');
        status.setAttribute('role', 'status');
        status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  function year() {
    document.querySelectorAll('[data-year]').forEach(function (n) {
      n.textContent = new Date().getFullYear();
    });
  }

  function init() {
    splitHeadings();
    header();
    navPill();
    mobileNav();
    progress();
    reveal();
    parallax();
    magnetic();
    tilt();
    pageTransition();
    marquee();
    filters();
    lightbox();
    enquiryForm();
    year();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
