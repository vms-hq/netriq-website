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

  // Contact form posts to the backend at form.action (the Cloudflare Worker at
  // forms.netriq.ai/contact, source under worker/). On any failure — Worker down, CORS, network drop —
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
