// Expa-style starfield: white dots and small rings drifting, the cursor gently pushes them away.
export function initStars(canvas, { reduce } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, stars = [];
  const mouse = { x: -9999, y: -9999, on: false };

  function build() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const n = Math.round((W * H) / 3300);
    stars = Array.from({ length: n }, () => {
      const ring = Math.random() < 0.2;
      const big = Math.random() < 0.05;
      return {
        x: Math.random() * W, y: Math.random() * H, ox: 0, oy: 0, vx: 0, vy: 0,
        dx: (Math.random() - 0.5) * 6, dy: -2 - Math.random() * 7,
        r: big ? 2.2 : 0.9 + Math.random() * 0.9,
        ring, rr: 11 + Math.random() * 6,
        a: 0.45 + Math.random() * 0.55, tw: Math.random() * 6.28,
      };
    });
  }
  build();
  window.addEventListener('resize', build);

  const sec = canvas.parentElement;
  sec.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  });
  sec.addEventListener('pointerleave', () => { mouse.on = false; mouse.x = mouse.y = -9999; });

  let visible = false, raf = 0, prev = performance.now();
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const R = 150;
    for (const s of stars) {
      if (!reduce) {
        s.x += s.dx * dt; s.y += s.dy * dt;
        if (s.y < -20) { s.y = H + 20; s.x = Math.random() * W; }
        if (s.x < -20) s.x = W + 20; else if (s.x > W + 20) s.x = -20;
        // repel
        const px = s.x + s.ox, py = s.y + s.oy;
        const ddx = px - mouse.x, ddy = py - mouse.y;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 900;
          s.vx += (ddx / d) * f * dt; s.vy += (ddy / d) * f * dt;
        }
        s.vx += -s.ox * 6 * dt; s.vy += -s.oy * 6 * dt;
        s.vx *= Math.pow(0.02, dt); s.vy *= Math.pow(0.02, dt);
        s.ox += s.vx * dt; s.oy += s.vy * dt;
      }
      const x = s.x + s.ox, y = s.y + s.oy;
      const a = s.a * (reduce ? 1 : 0.8 + 0.2 * Math.sin(now * 0.002 + s.tw));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
      if (s.ring) {
        ctx.strokeStyle = `rgba(255,255,255,${(a * 0.55).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, s.rr, 0, 6.283); ctx.stroke();
      }
    }
    if (visible && !reduce && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
  start();
}
