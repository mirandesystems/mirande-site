// Mirande Systems · home page
import { runPreloader } from './dots.js';

const { gsap, ScrollTrigger, SplitText } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const reduce = html.classList.contains('reduce');
const params = new URLSearchParams(location.search);
const isOrbit = html.classList.contains('hero-orbit');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ------------------------------------------------------------ scrolling
// Native scrolling only: it runs on the compositor, so it stays smooth on 120Hz screens even if the page is busy.
const scrollTo = (target, offset = 0) => {
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
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
  window.scrollTo(0, y);
  ScrollTrigger.update();
  return Math.round(y);
};
window.__to = (y) => { window.scrollTo(0, y); ScrollTrigger.update(); return Math.round(window.scrollY); };
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

let introStarted = false, introDone = false;
// decode the product visuals in idle time once the intro has settled, so they're ready before you scroll to them
function predecode() {
  const idle = window.requestIdleCallback ? (fn) => requestIdleCallback(fn, { timeout: 2000 }) : (fn) => setTimeout(fn, 300);
  $$('.pcard__visual img').forEach((img, i) => setTimeout(() => idle(() => { if (img.decode) img.decode().catch(() => {}); }), i * 250));
}
function heroIntro() {
  introStarted = true; 
  if (reduce) { introDone = true; html.classList.remove('js-intro'); startM(); predecode(); return; }
  const title = $('.hero__title');
  const split = new SplitText(title, { type: 'words', wordsClass: 'hw' });
  gsap.set(split.words, { yPercent: 60, opacity: 0 });
  gsap.set(['.hero__sub', '.hero__ctas'], { y: 26, opacity: 0 });
  html.classList.remove('js-intro');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(split.words, { yPercent: 0, opacity: 1, duration: 1.5, stagger: 0.075 }, 0)
    .to('.hero__sub', { y: 0, opacity: 1, duration: 1.3 }, 0.45)
    .to('.hero__ctas', { y: 0, opacity: 1, duration: 1.3 }, 0.58)
    .add(() => { introDone = true; startM(); predecode(); }, 2.2);
  if (orbit) orbit.intro(0.2);
}

async function boot() {
  if (isOrbit) {
    const m = await import('./orbit.js');
    orbit = m.initOrbit({ el: $('#orbit'), ring: $('#orbit-ring'), hero: $('.hero'), reduce, gsap });
  }
  if (html.classList.contains('has-pre')) {
    introStarted = true;   // the preloader counts as the intro: no heavy set-up while it plays
    try { sessionStorage.setItem('ms-pre', '1'); } catch (e) {}
    runPreloader({ el: $('#pre'), canvas: $('#pre-canvas'), onReveal: heroIntro });
  } else heroIntro();
}

// ------------------------------------------------------------ statement: words brighten as you read (Bending Spoons)
{
  const p = $('#statement-text');
  const words = p.textContent.trim().split(/\s+/);
  p.setAttribute('aria-label', p.textContent.trim());
  p.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const ws = $$('.w', p);
  if (!reduce) {
    gsap.set(ws, { opacity: 0.14 });
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 } })
      .to(ws, { opacity: 1, stagger: 0.12, duration: 0.6, ease: 'none' });
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

// ------------------------------------------------------------ giant 3D M
// The module is fetched straight away. Set-up is small now, and it runs either before the hero intro starts
// or once the intro has settled, so it never lands in the middle of an animation or a scroll.
let mModule = null, mStarted = false;
// create the WebGL context now, while the page is still loading: it is the most expensive part of the set-up
const mCanvas = $('#m-canvas');
let mGL = null;
try { mGL = mCanvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, stencil: false, premultipliedAlpha: true, powerPreference: 'high-performance' }); } catch (e) {}
const mReady = import('./m3d.js').then((m) => { mModule = m; startM(); }).catch((err) => console.error('3D M failed', err));

// start once fonts are in and the 3D section has been set up on the still-black screen (capped at 1.5s on slow
// connections), then give the GPU two frames to settle before anything moves
const frames2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
Promise.race([Promise.all([document.fonts.ready, mReady]), new Promise((r) => setTimeout(r, 1500))]).then(frames2).then(boot);
function startM() {
  if (mStarted || !mModule) return;
  if (introStarted && !introDone) return;            // wait for the intro to finish
  mStarted = true;
  mModule.initM({ section: $('#mshow'), canvas: mCanvas, context: mGL, reduce, gsap, ScrollTrigger, debugP: params.get('mp') });
}
{
  const sec = $('#mshow');
  if (!reduce) {
    gsap.from('.mshow__title span', { yPercent: 100, opacity: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 40%', once: true } });
    gsap.from('.mshow__body', { y: 30, opacity: 0, duration: 1.3, delay: 0.25, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 40%', once: true } });
  }
  // safety net: if someone scrolls down before the intro finishes, set it up anyway
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { introDone = true; startM(); } }, { rootMargin: '80% 0px' }).observe(sec);
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
    gsap.from(split.words, { yPercent: 50, opacity: 0, duration: 1.5, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 60%', once: true } });
    gsap.from(['.contact__sub', '.contact__ctas'], { y: 30, opacity: 0, duration: 1.3, stagger: 0.12, delay: 0.3, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 60%', once: true } });
  }
}

// ------------------------------------------------------------ footer (Apollo-style: the plain mark, big)
if (!reduce) {
  gsap.from('.foot__logo', { y: 80, rotate: -6, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });
  gsap.from('.foot__col', { y: 40, opacity: 0, duration: 1.3, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });
}

window.addEventListener('load', () => ScrollTrigger.refresh());
