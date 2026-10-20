// Tiny-style orbit: product marks and value bubbles pop into a ring around the headline, drift slowly,
// and can be spun by dragging anywhere in the hero (with momentum).

// simple 24px stroke icons
const I = {
  utensils: '<path d="M7 3v7a2.5 2.5 0 0 0 5 0V3M9.5 12.5V21M18 3c-2 1.4-3.2 3.9-3.2 7v3.2H18V21"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  route: '<circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M8.4 17.2c5-1.2 2-5.2 4.8-7.4 1.2-1 2.6-1.4 3-1.6" stroke-dasharray="2.2 2.6"/>',
  chat: '<path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.4A7.5 7.5 0 1 1 20 12.5z"/>',
  watch: '<rect x="6.5" y="5.5" width="11" height="13" rx="3.2"/><path d="M9 5.5V2.5h6v3M9 18.5v3h6v-3"/><circle cx="12" cy="12" r="2.6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M11 18.5h2"/>',
  bolt: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11H12l1-8z"/>',
  alert: '<path d="M10.4 4.2 2.6 17.8A1.8 1.8 0 0 0 4.2 20.5h15.6a1.8 1.8 0 0 0 1.6-2.7L13.6 4.2a1.8 1.8 0 0 0-3.2 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
};

// k: 'icon' (app icon image) | 'ft' (FreeTime mark) | 'anvil' | 'm' | 'v' (value bubble: icon + a few words)
const B = [
  { k: 'icon', src: '/assets/site/img/anchored-icon.png', bg: '#f1ece0', s: 1.0 },
  { k: 'v', bg: '#0a0a0a', fg: '#fff', ic: 'bolt', t: 'Quotes in minutes', s: 1.0 },
  { k: 'ft', bg: '#58cc02', s: 1.12 },
  { k: 'v', bg: '#ff6a3d', fg: '#fff', big: '7:42', t: 'Done by', s: 0.95 },
  { k: 'v', bg: '#fffdf5', fg: '#1d3a05', ac: '#58cc02', ic: 'utensils', t: 'Lunch, 6 min away', s: 1.05 },
  { k: 'anvil', bg: 'linear-gradient(160deg,#f2f4f6,#c9cfd6)', fg: '#0d0f12', s: 1.0 },
  { k: 'v', bg: '#f1ece0', fg: '#18191c', ac: '#ff6a3d', ic: 'watch', t: 'Your watch leads', s: 1.0 },
  { k: 'm', bg: '#fff', s: 0.72 },
  { k: 'v', bg: '#fff4de', fg: '#5a3d07', ac: '#b47a1e', ic: 'alert', t: 'Price change caught', s: 1.0 },
  { k: 'v', bg: '#1cb0f6', fg: '#fff', ic: 'clock', t: 'Back on time', s: 0.92 },
  { k: 'icon', src: '/assets/site/img/anchored-icon-dark.png', bg: '#18191c', s: 1.08 },
  { k: 'v', bg: '#2d9b5f', fg: '#fff', ic: 'check', t: 'Won, to projects', s: 0.95 },
  { k: 'v', bg: '#d7ffb8', fg: '#1d3a05', ac: '#2b8700', ic: 'route', t: 'Fits your gap', s: 0.9 },
  { k: 'anvil', bg: '#0d0f12', fg: '#fff', s: 0.88 },
  { k: 'v', bg: '#18191c', fg: '#f1ece0', ac: '#ff6a3d', ic: 'phone', t: 'Phone stays put', s: 0.95 },
  { k: 'ft', bg: '#58cc02', s: 0.76 },
  { k: 'v', bg: '#eef0f2', fg: '#0d0f12', ac: '#2d9b5f', ic: 'trend', t: 'Live margin', s: 0.9 },
  { k: 'v', bg: '#58cc02', fg: '#fff', ic: 'chat', t: 'Ask in plain English', s: 1.0 },
];

function valueBubble(b) {
  if (b.big) return `<span class="vb vb--big" style="color:${b.fg}"><small>${b.t}</small><strong>${b.big}</strong></span>`;
  return `<span class="vb" style="color:${b.fg}"><svg viewBox="0 0 24 24" fill="none" stroke="${b.ac || b.fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[b.ic]}</svg><b>${b.t}</b></span>`;
}

export function initOrbit({ el, ring, hero, reduce, gsap }) {
  const nodes = B.map((b) => {
    const d = document.createElement('div');
    d.className = 'bubble' + (b.k === 'v' ? ' bubble--v' : '');
    d.style.background = b.bg;
    if (b.k === 'icon') {
      const img = document.createElement('img'); img.src = b.src; img.alt = ''; img.draggable = false;
      d.appendChild(img);
    } else if (b.k === 'ft') {
      d.innerHTML = '<svg viewBox="0 0 100 100"><use href="#i-ft"/></svg>';
    } else if (b.k === 'anvil') {
      d.innerHTML = '<span class="anvil-mark"></span>'; d.firstChild.style.background = b.fg;
    } else if (b.k === 'm') {
      d.innerHTML = '<svg viewBox="0 0 200 200" style="width:52%;height:52%;color:#000"><use href="#i-m"/></svg>';
    } else {
      d.innerHTML = valueBubble(b);
    }
    ring.appendChild(d);
    return { d, b, a0: 0, phase: Math.random() * 6.28, pop: reduce ? 1 : 0 };
  });

  let W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0, unit = 100;
  function layout() {
    W = el.clientWidth; H = el.clientHeight;
    const mob = W < 700;
    cx = W / 2; cy = H * (mob ? 0.5 : 0.53);
    rx = mob ? W * 0.56 : Math.min(W * 0.42, H * 0.8);
    ry = mob ? H * 0.4 : H * 0.36;
    unit = mob ? Math.max(72, W * 0.235) : Math.min(180, Math.max(96, W * 0.098));
    const n = nodes.length;
    nodes.forEach((o, i) => {
      o.a0 = (i / n) * Math.PI * 2;   // a full ring, so it can spin all the way round
      o.d.style.setProperty('--s', (unit * o.b.s).toFixed(1) + 'px');
    });
  }
  layout();
  window.addEventListener('resize', layout);

  // ---- spin: slow drift, plus drag anywhere in the hero with momentum
  const BASE = reduce ? 0 : 0.05;          // radians per second when left alone
  let angle = 0, vel = 0, dragging = false, lastA = 0, lastT = 0, pid = null;
  const angleAt = (x, y) => {
    const r = el.getBoundingClientRect();
    return Math.atan2((y - r.top - cy) / ry, (x - r.left - cx) / rx);
  };
  const wrap = (d) => (d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d);
  hero.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button')) return;
    dragging = true; pid = e.pointerId;
    lastA = angleAt(e.clientX, e.clientY); lastT = performance.now(); vel = 0;
    hero.classList.add('is-spinning');
    if (e.pointerType === 'mouse') e.preventDefault();   // no text selection while spinning
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const a = angleAt(e.clientX, e.clientY), now = performance.now();
    const da = wrap(a - lastA), dt = Math.max(1, now - lastT) / 1000;
    angle += da;
    vel = vel * 0.6 + (da / dt) * 0.4;      // smoothed angular velocity
    lastA = a; lastT = now;
  }, { passive: true });
  const end = (e) => {
    if (!dragging || (e && e.pointerId !== pid)) return;
    dragging = false; pid = null; hero.classList.remove('is-spinning');
    if (performance.now() - lastT > 90) vel = 0;  // they paused before letting go
    vel = Math.max(-9, Math.min(9, vel));
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  let mx = 0, my = 0, tmx = 0, tmy = 0, raf = 0, visible = true, prev = performance.now();
  if (!reduce) window.addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!dragging) {
      angle += (BASE + vel) * dt;
      vel *= Math.exp(-dt * 1.4);            // momentum fades back to the slow drift
    }
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    const t = now / 1000;
    for (const o of nodes) {
      const a = o.a0 + angle;
      const p = o.pop;
      const r = 0.35 + 0.65 * p;
      const x = cx + Math.cos(a) * rx * r + mx * 30 * o.b.s + (reduce ? 0 : Math.sin(t * 0.7 + o.phase) * 4);
      const y = cy + Math.sin(a) * ry * r + my * 24 * o.b.s + (reduce ? 0 : Math.cos(t * 0.6 + o.phase) * 5);
      o.d.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${Math.max(0.001, p).toFixed(3)})`;
    }
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(el);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  start();

  window.__spin = (v = 3) => { vel = v; return v; };   // debug hook for the shoot tool

  return {
    intro(delay = 0) {
      if (reduce) return;
      // pop in from the bottom of the ring outwards
      const order = nodes.map((o, i) => i).sort((a, b) => Math.abs(Math.sin(nodes[b].a0) - 1) - Math.abs(Math.sin(nodes[a].a0) - 1));
      const tl = gsap.timeline({ delay });
      order.forEach((idx, k) => {
        tl.to(nodes[idx], { pop: 1, duration: 1.1, ease: 'back.out(1.6)' }, 0.15 + k * 0.06);
      });
      tl.add(() => { vel += 0.9; }, 0.2);   // a little spin as it lands, so it's clear the ring moves
      return tl;
    },
  };
}
