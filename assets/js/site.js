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

  // contact form: posts to Web3Forms; access key injected at deploy time
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = '';
      status.textContent = 'Sending...';
      var data = new FormData(form);
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      }).then(function (res) {
        return res.json();
      }).then(function (json) {
        if (json && json.success) {
          form.reset();
          status.className = 'is-success';
          status.textContent = 'Thanks. We will reply within one business day.';
        } else {
          status.className = 'is-error';
          status.textContent = (json && json.message) ? json.message : 'Something went wrong. Email us directly at ishaileshpant@nysha.in.';
        }
      }).catch(function () {
        status.className = 'is-error';
        status.textContent = 'Network error. Email us directly at ishaileshpant@nysha.in.';
      });
    });
  }
})();
