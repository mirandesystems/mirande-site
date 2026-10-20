// Mirande Systems · home page
import { runPreloader } from './dots.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const reduce = html.classList.contains('reduce');
const params = new URLSearchParams(location.search);
const isOrbit = html.classList.contains('hero-orbit');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ------------------------------------------------------------ smooth scroll
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollTo = (target, offset = 0) => {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
  else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView({ behavior: 'auto' }));
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const t = id === '#top' ? 0 : $(id);
  if (t === null) return;
  e.preventDefault();
  scrollTo(t, id === '#products' ? 0 : 0);
  if (id !== '#top') history.replaceState(null, '', id);
});

// debug hooks for the shoot tool
window.__jump = (sel, p = 0) => {
  const el = $(sel); if (!el) return 0;
  const y = el.getBoundingClientRect().top + window.scrollY + p * Math.max(0, el.offsetHeight - window.innerHeight);
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  ScrollTrigger.update();
  return Math.round(y);
};
window.__to = (y) => { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); ScrollTrigger.update(); return Math.round(window.scrollY); };
window.__fps = (ms = 2000) => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const f = (t) => { n++; if (t - t0 < ms) requestAnimationFrame(f); else res(Math.round((n * 1000) / (t - t0))); };
  requestAnimationFrame(f);
});

// ------------------------------------------------------------ nav: hide on scroll down, invert on white
const nav = $('#nav');
const themed = $$('[data-theme]');
let lastY = window.scrollY, navTick = false;
function updateNav() {
  navTick = false;
  const y = window.scrollY;
  const dy = y - lastY;
  if (y < 140) nav.classList.remove('is-hidden');
  else if (dy > 4) nav.classList.add('is-hidden');
  else if (dy < -4) nav.classList.remove('is-hidden');
  lastY = y;
  const probe = 46;
  let light = false;
  for (const s of themed) {
    const r = s.getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe) { light = s.dataset.theme === 'light'; break; }
  }
  nav.classList.toggle('is-light', light);
}
window.addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(updateNav); } }, { passive: true });
nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
updateNav();

// ------------------------------------------------------------ hero
let orbit = null;

function heroIntro() {
  if (reduce) { html.classList.remove('js-intro'); return; }
  const title = $('.hero__title');
  const split = new SplitText(title, { type: 'words', wordsClass: 'hw' });
  gsap.set(split.words, { yPercent: 60, opacity: 0, filter: 'blur(14px)' });
  gsap.set(['.hero__sub', '.hero__ctas'], { y: 26, opacity: 0 });
  html.classList.remove('js-intro');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(split.words, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.5, stagger: 0.075 }, 0)
    .to('.hero__sub', { y: 0, opacity: 1, duration: 1.3 }, 0.45)
    .to('.hero__ctas', { y: 0, opacity: 1, duration: 1.3 }, 0.58)
    .add(() => { gsap.set(split.words, { clearProps: 'filter' }); }, 2.4);
  if (orbit) orbit.intro(0.2);
}

async function boot() {
  if (isOrbit) {
    const m = await import('./orbit.js');
    orbit = m.initOrbit({ el: $('#orbit'), ring: $('#orbit-ring'), hero: $('.hero'), reduce, gsap });
  }
  if (html.classList.contains('has-pre')) {
    try { sessionStorage.setItem('ms-pre', '1'); } catch (e) {}
    runPreloader({ el: $('#pre'), canvas: $('#pre-canvas'), onReveal: heroIntro });
  } else heroIntro();
}
document.fonts.ready.then(boot);

// ------------------------------------------------------------ blur-reveal statement (Bending Spoons)
{
  const p = $('#statement-text');
  const words = p.textContent.trim().split(/\s+/);
  p.setAttribute('aria-label', p.textContent.trim());
  p.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const ws = $$('.w', p);
  if (!reduce) {
    gsap.set(ws, { opacity: 0.1, filter: 'blur(12px)' });
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 } })
      .to(ws, { opacity: 1, filter: 'blur(0px)', stagger: 0.12, duration: 0.6, ease: 'none' });
  }
}

// ------------------------------------------------------------ products
// Not Boring tiles: tilt + press with the cursor, click to jump to the card
$$('.app').forEach((app) => {
  const tile = $('.app__tile', app), face = $('.app__face', app);
  app.addEventListener('click', () => { const t = $(app.dataset.target); if (t) scrollTo(t, -96); });
  if (reduce) return;
  app.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = tile.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    tile.style.transform = `rotateX(${(-y * 22).toFixed(2)}deg) rotateY(${(x * 24).toFixed(2)}deg) translateZ(10px)`;
    face.style.setProperty('--gx', (x + 0.5) * 100 + '%'); face.style.setProperty('--gy', (y + 0.5) * 100 + '%');
  });
  app.addEventListener('pointerleave', () => { tile.style.transform = ''; });
});
if (!reduce) {
  gsap.from('.products__title', { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.products__title', start: 'top 85%', once: true } });
  gsap.from('.app', { y: 90, opacity: 0, rotateX: -30, duration: 1.4, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.apps', start: 'top 85%', once: true } });
  $$('.pcard').forEach((card) => {
    gsap.from(card, { y: 120, opacity: 0, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 92%', once: true } });
    const v = $('.pcard__visual', card);
    if (v) gsap.fromTo(v, { yPercent: 10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'center 55%', scrub: true } });
  });
}

// ------------------------------------------------------------ giant 3D M (lazy)
{
  const sec = $('#mshow');
  let started = false;
  const go = async () => {
    if (started) return; started = true;
    try {
      const m = await import('./m3d.js');
      m.initM({ section: sec, canvas: $('#m-canvas'), reduce, gsap, ScrollTrigger, debugP: params.get('mp') });
    } catch (err) { console.error('3D M failed', err); }
  };
  new IntersectionObserver(([e]) => { if (e.isIntersecting) go(); }, { rootMargin: '120% 0px' }).observe(sec);
  if (!reduce) {
    gsap.from('.mshow__title span', { yPercent: 100, opacity: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 40%', once: true } });
    gsap.from('.mshow__body', { y: 30, opacity: 0, duration: 1.3, delay: 0.25, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 40%', once: true } });
  }
}

// ------------------------------------------------------------ founder letter (Tiny)
{
  const letter = $('#letter');
  const edit = $('.letter__edit', letter);
  const chars = [...edit.textContent].map((c) => `<span class="c">${c}</span>`).join('');
  edit.setAttribute('aria-label', edit.textContent); edit.innerHTML = chars;
  if (!reduce) {
    const cs = $$('.c', edit);
    gsap.set(letter.querySelector('.letter__strike'), { '--strike': 0 });
    gsap.set(cs, { display: 'none' });
    gsap.set(letter, { '--hl': '0%', '--hlc': 'rgba(255,255,255,.8)', '--sig': 1400 });
    gsap.set('.founder__arrow', { '--draw': 400 });
    gsap.from(letter, { y: 100, opacity: 0, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: letter, start: 'top 90%', once: true } });
    gsap.from('.founder__title', { y: 50, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.founder', start: 'top 75%', once: true } });
    gsap.to('.founder__arrow', { '--draw': 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '.founder', start: 'top 60%', once: true } });
    gsap.timeline({ scrollTrigger: { trigger: '.letter__strike', start: 'top 72%', once: true } })
      .to(letter.querySelector('.letter__strike'), { '--strike': 1, duration: 0.55, ease: 'power2.inOut' }, 0.2)
      .to(cs, { display: 'inline', duration: 0.01, stagger: 0.026 }, 0.8)
      .to(letter, { '--hl': '100%', duration: 0.9, ease: 'power2.inOut' }, '+=0.25')
      .to(letter, { '--hlc': '#000', duration: 0.35 }, '<0.25')
      .to(letter, { '--sig': 0, duration: 1.7, ease: 'power1.inOut' }, '-=0.1');
  }
}

// ------------------------------------------------------------ contact starfield
{
  const canvas = $('#stars');
  let started = false;
  const go = async () => {
    if (started) return; started = true;
    try { const m = await import('./stars.js'); m.initStars(canvas, { reduce }); } catch (err) { console.error('stars failed', err); }
  };
  new IntersectionObserver(([e]) => { if (e.isIntersecting) go(); }, { rootMargin: '60% 0px' }).observe($('.contact'));
  if (!reduce) {
    const split = new SplitText('.contact__title', { type: 'words', wordsClass: 'cw' });
    gsap.from(split.words, { yPercent: 50, opacity: 0, filter: 'blur(14px)', duration: 1.5, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 60%', once: true } });
    gsap.from(['.contact__sub', '.contact__ctas'], { y: 30, opacity: 0, duration: 1.3, stagger: 0.12, delay: 0.3, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 60%', once: true } });
  }
}

// ------------------------------------------------------------ footer (Apollo-style: the plain mark, big)
if (!reduce) {
  gsap.from('.foot__logo', { y: 80, rotate: -6, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });
  gsap.from('.foot__col', { y: 40, opacity: 0, duration: 1.3, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });
}

window.addEventListener('load', () => ScrollTrigger.refresh());
