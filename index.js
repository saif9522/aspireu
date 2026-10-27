/* ================= AspireU – page interactions ================= */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- loader ---------- */
function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hide');
  document.body.classList.add('loaded');
}
window.addEventListener('load', () => setTimeout(hideLoader, 500));
setTimeout(hideLoader, 4000); // safety net if a CDN is slow

/* ---------- sticky navbar, progress bar, back-to-top ---------- */
const navbar = document.getElementById('navbar');
const progress = document.getElementById('progress');
const toTop = document.getElementById('toTop');

function onScroll() {
  const y = window.scrollY;
  navbar.classList.toggle('fixed-nav', y > 80);
  toTop.classList.toggle('show', y > 600);
  const h = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- hero rotating word (anime.js) ---------- */
const words = ['ADMISSION', 'CAREER', 'FUTURE', 'SUCCESS'];
const target = document.querySelector('.ml11 .letters');
let w = 0;

function playWord() {
  target.innerHTML = words[w].replace(/\S/g, "<span class='letter'>$&</span>");
  anime.timeline()
    .add({
      targets: '.ml11 .letter',
      opacity: [0, 1],
      translateY: [24, 0],
      easing: 'easeOutExpo',
      duration: 700,
      delay: (el, n) => 45 * n
    })
    .add({
      targets: '.ml11 .letter',
      opacity: 0,
      translateY: -12,
      easing: 'easeInExpo',
      duration: 500,
      delay: (el, n) => 2200 + 30 * n,
      complete: () => { w = (w + 1) % words.length; playWord(); }
    });
}
if (target && window.anime && !reduceMotion) playWord();

/* ---------- count-up numbers ---------- */
function countUp(el) {
  const end = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const dur = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(end * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------- lazy illustrations: animation starts when visible ---------- */
function loadIllustration(container) {
  container.querySelectorAll('img[data-src]').forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
}

/* ---------- scroll reveal ---------- */
const revealEls = document.querySelectorAll('[data-reveal]');
const bars = document.querySelectorAll('.textdiv');

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      loadIllustration(el);
      el.querySelectorAll('[data-count]').forEach(countUp);
      if (el.dataset.count) countUp(el);
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => io.observe(el));

  const barIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in-bar'); barIO.unobserve(entry.target); }
    });
  }, { threshold: 0.3 });
  bars.forEach((b) => barIO.observe(b));
} else {
  revealEls.forEach((el) => { el.classList.add('in'); loadIllustration(el); });
  bars.forEach((b) => b.classList.add('in-bar'));
}

/* ---------- enquiry form → aspireu2026@gmail.com ---------- */
/* Sent through FormSubmit (formsubmit.co). Works only when the site is opened from a
   real web address (Vercel etc.), not by double-clicking index.html on a computer.
   The very first enquiry sends an "Activate Form" email to aspireu2026@gmail.com;
   click it once and every enquiry after that arrives in that inbox. */
const FORM_EMAIL = 'aspireu2026@gmail.com';
const form = document.getElementById('enquiryForm');
const statusEl = form.querySelector('.form-status');
const submitBtn = form.querySelector('.btn-submit');

function showStatus(type, html) {
  statusEl.className = 'form-status ' + type;
  statusEl.innerHTML = html;
}

// returned from the fallback (normal) submit
if (new URLSearchParams(location.search).get('sent') === '1') {
  showStatus('ok', 'Thank you! Your enquiry has been sent. Our counsellor will contact you shortly.');
  history.replaceState(null, '', location.pathname + '#Contact');
  setTimeout(() => document.getElementById('Contact').scrollIntoView(), 600);
}

function nativeSubmit() {
  // plain form POST to FormSubmit, then come back to this page with ?sent=1
  let next = form.querySelector('input[name="_next"]');
  if (!next) {
    next = document.createElement('input');
    next.type = 'hidden'; next.name = '_next';
    form.appendChild(next);
  }
  next.value = location.origin + location.pathname + '?sent=1#Contact';
  HTMLFormElement.prototype.submit.call(form);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  if (form._honey.value) return; // bot trap

  if (location.protocol === 'file:') {
    showStatus('err', 'The form sends email only on the live website (e.g. your Vercel link), not from a file opened on a computer.');
    return;
  }

  submitBtn.classList.add('loading');
  showStatus('', '');

  const data = Object.fromEntries(new FormData(form).entries());
  delete data._honey;

  try {
    const res = await fetch('https://formsubmit.co/ajax/' + FORM_EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    const msg = String(json.message || '');

    if (res.ok && String(json.success) === 'true') {
      showStatus('ok', 'Thank you! Your enquiry has been sent. Our counsellor will contact you shortly.');
      form.reset();
    } else if (/activat/i.test(msg)) {
      showStatus('ok', 'Almost done! An activation email was sent to ' + FORM_EMAIL + '. Click "Activate Form" in it once, then enquiries will arrive automatically.');
    } else {
      throw new Error(msg || 'AJAX failed');
    }
  } catch (err) {
    nativeSubmit(); // fallback: normal form post usually still gets through
  } finally {
    submitBtn.classList.remove('loading');
  }
});
