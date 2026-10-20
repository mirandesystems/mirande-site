// Dot-matrix type + the M drawn from a dot grid (Expa-style preloader, footer mark).

const M_POLY = [[20, 25], [180, 25], [180, 150], [140, 150], [140, 65], [100, 195], [60, 65], [60, 150], [20, 150]];

const FONT = {
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// M as dots, coordinates in viewBox units (0..200), centred on (100, 110)
export function mDots(step = 10) {
  const out = [];
  for (let y = 30; y <= 190; y += step) {
    for (let x = 100 - step * 8; x <= 100 + step * 8; x += step) {
      const px = x + (x < 100 ? 0.6 : x > 100 ? -0.6 : 0);
      if (inside(px, y - 0.6, M_POLY) || inside(px, y + 0.6, M_POLY)) out.push({ x, y });
    }
  }
  return out;
}

// text as dots, in cell units; returns {dots, cols, rows}
export function textDots(str, tracking = 1) {
  const dots = [];
  let cx = 0;
  [...str.toUpperCase()].forEach((ch, li) => {
    const g = FONT[ch] || FONT[' '];
    g.forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') dots.push({ x: cx + rx, y: ry, li }); }));
    cx += (ch === ' ' ? 3 : 5) + tracking;
  });
  return { dots, cols: cx - tracking, rows: 7 };
}

const ease = {
  outBack: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inCubic: (t) => t * t * t,
  inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- preloader
export function runPreloader({ el, canvas, onReveal, onDone }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const size = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  size();

  // M grid
  const md = mDots(10);
  const mSize = Math.min(W, H) * (W < 600 ? 0.36 : 0.25);
  const unit = mSize / 160;                 // px per viewBox unit
  const mr = unit * 10 * 0.36;              // dot radius
  const mcx = W / 2, mcy = H / 2 - mSize * 0.16;
  const mPts = md.map((d, i) => {
    const px = mcx + (d.x - 100) * unit, py = mcy + (d.y - 110) * unit;
    const dist = Math.hypot(d.x - 100, d.y - 110) / 110;
    return { px, py, delay: 480 + dist * 300 + Math.random() * 220, ph: Math.random() * 6.28, k: 0.6 + Math.random() * 1.4 };
  });

  // word
  const td = textDots('MIRANDE SYSTEMS', 1);
  const tpitch = Math.max(3, Math.min(5.2, (W * 0.5) / td.cols));
  const tr = tpitch * 0.34;
  const tx0 = W / 2 - (td.cols - 1) * tpitch / 2;
  const ty0 = mcy + mSize * 0.66 + 26;
  const tPts = td.dots.map((d) => ({ px: tx0 + d.x * tpitch, py: ty0 + d.y * tpitch, delay: 980 + d.li * 26 + Math.random() * 60, ph: Math.random() * 6.28, k: 0.5 + Math.random() * 1.2 }));

  // random 5x5 glyphs that morph before the M appears
  const glyphs = Array.from({ length: 8 }, () => Array.from({ length: 25 }, () => Math.random() < 0.42));
  const gp = Math.max(5, mSize / 26);

  const t0 = performance.now();
  let revealed = false, raf = 0;
  const T_END = 1950;

  function frame(now) {
    const t = Math.max(0, now - t0);   // the first rAF timestamp can be slightly earlier than t0
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // background fades during the dispersal
    const bgA = 1 - ease.inOut(clamp01((t - 1520) / 420));
    ctx.fillStyle = `rgba(0,0,0,${bgA})`;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    // phase 1: morphing glyph
    if (t < 640) {
      const gi = Math.min(glyphs.length - 1, Math.floor(t / 80));
      const a = t > 520 ? 1 - (t - 520) / 120 : 1;
      ctx.globalAlpha = Math.max(0, a);
      glyphs[gi].forEach((on, i) => {
        if (!on) return;
        const gx = (i % 5) - 2, gy = Math.floor(i / 5) - 2;
        ctx.beginPath(); ctx.arc(mcx + gx * gp, mcy + gy * gp, gp * 0.34, 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // dispersal factor
    const e = ease.inCubic(clamp01((t - 1450) / 500));
    const jit = (p, amp) => (1 - clamp01((t - p.delay) / 700)) * amp;

    const drawSet = (pts, r, cx, cy) => {
      for (const p of pts) {
        const s = ease.outBack(clamp01((t - p.delay) / 260));
        if (s <= 0) continue;
        const j = jit(p, r * 1.4);
        let x = p.px + Math.sin(t * 0.02 + p.ph) * j;
        let y = p.py + Math.cos(t * 0.017 + p.ph) * j;
        let rr = r * s;
        if (e > 0) {
          x = cx + (x - cx) * (1 + e * 3.2 * p.k);
          y = cy + (y - cy) * (1 + e * 3.2 * p.k);
          rr *= 1 + e * 2.4;
          ctx.globalAlpha = Math.max(0, 1 - e * 1.15);
        }
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, rr), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    drawSet(mPts, mr, W / 2, H / 2);
    drawSet(tPts, tr, W / 2, H / 2);

    if (!revealed && t > 1480) { revealed = true; onReveal && onReveal(); }
    if (t < T_END) raf = requestAnimationFrame(frame);
    else { el.style.display = 'none'; onDone && onDone(); }
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ---------------------------------------------------------------- static dot mark for the footer
export function drawDotMark(canvas, { color = '#fff', word = 'MIRANDE' } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 200;
  const td = textDots(word, 1);
  const pitch = cssW / (td.cols + 0.2);
  const md = mDots(10);
  const mH = pitch * 17;              // M grid is 17 rows
  const cssH = mH + pitch * 3 + pitch * 7 + 2;
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = color;
  const r = pitch * 0.34;
  md.forEach((d) => { ctx.beginPath(); ctx.arc(pitch * 0.6 + (d.x - 20) / 10 * pitch, pitch * 0.6 + (d.y - 30) / 10 * pitch, r, 0, 6.283); ctx.fill(); });
  const ty = mH + pitch * 3;
  td.dots.forEach((d) => { ctx.beginPath(); ctx.arc(pitch * 0.6 + d.x * pitch, ty + d.y * pitch, r, 0, 6.283); ctx.fill(); });
}
