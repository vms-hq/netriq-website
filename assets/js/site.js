// NetrIQ.AI — site script. Vanilla, no deps.

(function () {
  // mobile nav
  var burger = document.querySelector('.btn-burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') nav.classList.remove('is-open');
    });
  }

  // active nav link by pathname
  var path = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href) return;
    if (href === path || (path === '/' && href === '/index.html') || (href !== '/' && path.indexOf(href.replace(/\.html$/, '')) === 0)) {
      a.classList.add('is-active');
    }
  });

  // reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  // hero product tour — auto-loop crossfade through product screens
  var shots = document.querySelectorAll('.cr-shots .cr-shot');
  if (shots.length > 1) {
    var frame = document.querySelector('.cr-frame');
    var pathEl = frame && frame.querySelector('.cr-frame__path');
    var labelEl = frame && frame.querySelector('.cr-frame__screen');
    var descEl = frame && frame.querySelector('.cr-frame__desc');
    var ticksWrap = frame && frame.querySelector('.cr-frame__ticks');
    var idx = 0, timer = null, ticks = [];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function go(n) {
      idx = (n + shots.length) % shots.length;
      shots.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      ticks.forEach(function (t, i) { t.setAttribute('aria-current', String(i === idx)); });
      var cur = shots[idx];
      if (pathEl && cur.dataset.screen) pathEl.textContent = 'netriq.ai / ' + cur.dataset.screen;
      if (labelEl && cur.dataset.label) labelEl.textContent = cur.dataset.label;
      if (descEl && cur.dataset.desc) descEl.textContent = cur.dataset.desc;
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { if (!reduce && !timer) timer = setInterval(function () { go(idx + 1); }, 3400); }

    if (ticksWrap) {
      shots.forEach(function (s, i) {
        var t = document.createElement('button');
        t.type = 'button';
        t.className = 'cr-tick';
        t.setAttribute('aria-label', s.dataset.label || ('Screen ' + (i + 1)));
        t.addEventListener('click', function () { stop(); go(i); start(); });
        ticksWrap.appendChild(t);
        ticks.push(t);
      });
    }
    if (frame) {
      frame.addEventListener('mouseenter', stop);
      frame.addEventListener('mouseleave', start);
    }
    go(0);
    start();
  }

  // fit-to-viewport: scale a block as ONE unit so the whole thing stays in
  // view on short screens (13" laptops, browser chrome eating height) while
  // keeping every child crisp and aligned — no element-level cropping or
  // text re-wrap. Keyed to the real viewport height, so it self-corrects for
  // the bookmarks bar / dock.
  function fitBlock(el, reservedBelow, minScale) {
    if (!el) return function () {};
    reservedBelow = reservedBelow || 18;
    minScale = minScale || 0.6;
    function fit() {
      el.style.transform = 'none';
      el.style.height = 'auto';
      el.classList.remove('is-fit');
      var natural = el.offsetHeight;
      var top = el.getBoundingClientRect().top;
      var avail = window.innerHeight - top - reservedBelow;
      var s = avail / natural;
      if (s >= 0.995) return;            // tall screen — leave at natural size
      if (s < minScale) s = minScale;    // never shrink to unreadable
      el.classList.add('is-fit');
      el.style.transformOrigin = 'top center';
      el.style.transform = 'scale(' + s.toFixed(4) + ')';
      el.style.height = Math.ceil(natural * s) + 'px';
    }
    fit();
    var raf;
    window.addEventListener('resize', function () {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return fit;
  }
  fitBlock(document.querySelector('.cr-tour'), 18);
  var vfit = fitBlock(document.querySelector('.cr-vfit'), 26, 0.92);

  // vertical showcase — auto-rotate the tab strip + content frame on load;
  // an explicit tab click pauses the loop (stays on the chosen vertical).
  var vtabs = document.querySelectorAll('.cr-vtab');
  if (vtabs.length > 1) {
    var vpanels = document.querySelectorAll('.cr-vpanel');
    var vidx = 0, vtimer = null;
    var vreduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function vgo(n) {
      vidx = (n + vtabs.length) % vtabs.length;
      vtabs.forEach(function (t, i) { t.classList.toggle('is-active', i === vidx); t.setAttribute('aria-selected', String(i === vidx)); });
      vpanels.forEach(function (p, i) { p.classList.toggle('is-active', i === vidx); });
      if (vfit) vfit(); // re-fit: panels differ in height, keep the showcase in view
    }
    function vstop() { if (vtimer) { clearInterval(vtimer); vtimer = null; } }
    function vstart() { if (!vreduce && !vtimer) vtimer = setInterval(function () { vgo(vidx + 1); }, 4500); }
    vtabs.forEach(function (t, i) {
      t.addEventListener('click', function () { vstop(); vgo(i); }); // explicit click pauses the loop
    });
    vgo(0);
    vstart();
  }

  // Contact form posts to the backend at form.action (formsubmit.co AJAX
  // endpoint). On any submission failure — backend down, CORS, network drop —
  // we fall back to a mailto: link populated with the form contents so the
  // user can complete via their mail client. The fallback target lives on a
  // data-mailto-fallback attribute on the form (no plain email in the
  // visible HTML body — it's revealed only when fallback kicks in).
  function buildMailtoFallback(form, recipient) {
    var fields = ['name','organisation','email','phone','vertical','cameras','message'];
    var lines = fields.map(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (!el || !el.value) return null;
      var label = k.charAt(0).toUpperCase() + k.slice(1);
      return label + ': ' + el.value;
    }).filter(Boolean);
    var subject = 'NetrIQ enquiry — ' + (form.querySelector('[name="name"]').value || 'new lead');
    var body = lines.join('\n');
    return 'mailto:' + recipient
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);
  }

  function showMailtoFallback(form, status, recipient, prefix) {
    status.className = 'is-error';
    status.innerHTML = '';
    var msg = document.createElement('span');
    msg.textContent = (prefix || 'Submission failed') + ' — ';
    status.appendChild(msg);
    var a = document.createElement('a');
    a.href = buildMailtoFallback(form, recipient);
    a.textContent = 'open in your email client instead';
    a.style.color = 'var(--teal)';
    a.style.textDecoration = 'underline';
    status.appendChild(a);
  }

  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (form && status) {
    var fallbackRecipient = form.getAttribute('data-mailto-fallback') || '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = '';
      status.textContent = 'Sending...';
      // Honeypot trip: silently "succeed" so bots don't probe further
      var honey = form.querySelector('input[name="_honey"]');
      var bot = form.querySelector('input[name="botcheck"]');
      if ((honey && honey.value) || (bot && bot.checked)) {
        status.className = 'is-success';
        status.textContent = 'Thanks. We will reply within one business day.';
        form.reset();
        return;
      }
      var data = new FormData(form);
      // Race with a 10s timeout so a stalled backend doesn't hang the UI
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timeoutId = setTimeout(function () { controller && controller.abort(); }, 10000);
      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data,
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (json) {
          return { ok: res.ok, json: json };
        });
      }).then(function (r) {
        clearTimeout(timeoutId);
        var ok = r.ok && r.json && (r.json.success === 'true' || r.json.success === true);
        if (ok) {
          form.reset();
          status.className = 'is-success';
          status.textContent = 'Thanks. We will reply within one business day.';
        } else if (fallbackRecipient) {
          showMailtoFallback(form, status, fallbackRecipient, 'Submission service is temporarily unavailable');
        } else {
          status.className = 'is-error';
          status.textContent = 'Submission failed. Please try again in a moment.';
        }
      }).catch(function () {
        clearTimeout(timeoutId);
        if (fallbackRecipient) {
          showMailtoFallback(form, status, fallbackRecipient, 'Network issue reaching our form service');
        } else {
          status.className = 'is-error';
          status.textContent = 'Network error. Please check your connection and try again.';
        }
      });
    });
  }
})();
