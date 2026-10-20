// Giant matte-black extruded M (Not Boring). Chamfered edges, film grain on the surface, soft studio light
// and a soft shadow on the white wall. Rolls through the viewport on scroll.
// Built to be cheap: no shadow maps or environment maps (the soft shadow is a pre-drawn texture), and it only
// draws a frame while it is actually moving.
import * as THREE from '../lib/three-m3d.js';

const M_PTS = [[20, 25], [180, 25], [180, 150], [140, 150], [140, 65], [100, 195], [60, 65], [60, 150], [20, 150]];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// keyframes in view units: x in fractions of half-width, y in fractions of view height
const KEYS = [
  { p: 0.0, x: 0.52, y: -1.12, s: 1.3, rx: 0.75, ry: -1.15, rz: 0.55 },
  { p: 0.5, x: 0.42, y: 0.0, s: 0.64, rx: 0.17, ry: -0.34, rz: -0.06 },
  { p: 1.0, x: 0.3, y: 1.18, s: 1.3, rx: -0.65, ry: 0.55, rz: -0.6 },
];
const KEYS_MOBILE = [
  { p: 0.0, x: 0.1, y: -0.95, s: 1.25, rx: 0.7, ry: -1.1, rz: 0.5 },
  { p: 0.5, x: 0.0, y: 0.12, s: 1.0, rx: 0.12, ry: -0.4, rz: -0.06 },
  { p: 1.0, x: -0.1, y: 1.1, s: 1.25, rx: -0.6, ry: 0.5, rz: -0.55 },
];
function sample(keys, p) {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (p >= keys[i].p && p <= keys[i + 1].p) { a = keys[i]; b = keys[i + 1]; break; }
  const t = easeInOut(clamp01((p - a.p) / (b.p - a.p || 1)));
  const o = {};
  for (const k of ['x', 'y', 's', 'rx', 'ry', 'rz']) o[k] = lerp(a[k], b[k], t);
  return o;
}

// a soft, M-shaped shadow drawn once with canvas shadowBlur (works in every browser)
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.shadowColor = 'rgba(0,0,0,1)'; x.shadowBlur = 26; x.shadowOffsetX = 1000;
  x.translate(-1000 + 128 - 100 * 0.78, 128 - 110 * 0.78); x.scale(0.78, 0.78);
  x.beginPath(); M_PTS.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initM({ section, canvas, context, reduce, ScrollTrigger, debugP }) {
  const renderer = new THREE.WebGLRenderer({ canvas, context: context || undefined, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 200);
  camera.position.set(0, 0, 34);

  // --- the M
  const shape = new THREE.Shape();
  const S = 1 / 17;
  M_PTS.forEach(([x, y], i) => { const X = (x - 100) * S, Y = -(y - 110) * S; i ? shape.lineTo(X, Y) : shape.moveTo(X, Y); });
  shape.closePath();
  const depth = 2.0, bevel = 0.6;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, curveSegments: 1, steps: 1 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({ color: 0x272727, specular: 0x3a3a3a, shininess: 10 });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `
        float msHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        void main() {`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float g = msHash(floor(gl_FragCoord.xy));
        gl_FragColor.rgb += (g - 0.5) * 0.085;`);
  };
  const m = new THREE.Mesh(geo, mat);
  const pivot = new THREE.Group();
  pivot.add(m);
  scene.add(pivot);

  // --- light: soft studio key, fill and rim, a sky/ground fill and a close lamp for falloff on the big faces
  const key = new THREE.DirectionalLight(0xffffff, 2.4); scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-12, 4, 10); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0); rim.position.set(2, 14, -6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8c8c8c, 1.15));
  const lamp = new THREE.PointLight(0xffffff, 0, 0, 2); scene.add(lamp);

  // --- soft shadow on the wall behind it
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
  scene.add(shadow);

  // --- size + state
  let W = 0, H = 0, viewH = 1, viewW = 1, mobile = false, base = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    // matte black on white with MSAA: 1.5x is visually identical on big screens and much cheaper
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W * H > 1.2e6 ? 1.5 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    viewW = viewH * camera.aspect;
    mobile = W / H < 0.9;
    // base scale: M as tall as the viewport on desktop, sized to the width on phones
    base = mobile ? Math.min((viewW * 0.74) / 9.4, (viewH * 0.46) / 10) : viewH / 10;
    dirty = true;
  }

  let target = 0, cur = 0, dirty = true, visible = false, raf = 0;
  const fixed = debugP !== null && debugP !== undefined && debugP !== '' ? parseFloat(debugP) : null;
  if (reduce) { target = cur = 0.5; }
  if (fixed !== null) target = cur = fixed;

  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  if (!reduce && fixed === null) {
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { target = self.progress; kick(); },
    });
    // entering and leaving: let it travel a little while the section slides in/out
    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'top top',
      onUpdate: (self) => { if (self.progress < 1) { target = (self.progress - 1) * 0.18; kick(); } },
    });
  }

  function draw() {
    const k = sample(mobile ? KEYS_MOBILE : KEYS, clamp01(cur));
    const extra = cur < 0 ? cur * 2.4 : 0;   // section still entering: push it further down
    const sc = base * k.s * (mobile ? 1 : Math.min(1, Math.max(0.78, camera.aspect / 1.6)));
    m.scale.setScalar(sc);
    pivot.position.set((k.x + (mobile ? 0 : Math.max(0, 1.6 - camera.aspect) * 0.12)) * viewW * 0.5, (k.y + extra) * viewH, 0);
    pivot.rotation.set(k.rx, k.ry, k.rz);
    key.position.set(pivot.position.x + 6, pivot.position.y + 10, 24);
    key.target.position.copy(pivot.position);
    lamp.position.set(pivot.position.x + sc * 5, pivot.position.y + sc * 6, sc * 7);
    lamp.intensity = 260 * sc * sc;
    // shadow: offset away from the key light, flattened by how far the M is turned
    const z = -3.4 * sc;
    const size = sc * 13.5;
    shadow.position.set(pivot.position.x - sc * 1.9, pivot.position.y - sc * 2.6, z);
    shadow.rotation.set(0, 0, k.rz);
    shadow.scale.set(size * Math.max(0.35, Math.abs(Math.cos(k.ry))), size * Math.max(0.35, Math.abs(Math.cos(k.rx))), 1);
    renderer.render(scene, camera);
  }
  function frame() {
    raf = 0;
    const d = target - cur;
    cur += reduce ? d : d * 0.12;
    if (Math.abs(target - cur) < 0.0004) cur = target;
    draw();
    dirty = false;
    // keep drawing only while it is still easing towards the scroll position
    if (visible && cur !== target) raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && (dirty || cur !== target)) kick(); }, { rootMargin: '10% 0px' }).observe(section);
  window.addEventListener('resize', () => { resize(); dirty = true; kick(); });
  resize();
  // compile and draw the first frame right away: this runs while the page is still loading, so the GPU
  // allocates everything (programs, buffers, the canvas layer) before anything is on screen or scrolling
  renderer.compile(scene, camera);
  draw();
  window.__m3d = { renderer, scene, camera, pivot, set p(v) { target = cur = v; dirty = true; visible = true; kick(); } };
}
