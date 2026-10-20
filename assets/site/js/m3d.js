// Giant matte-black extruded M (Not Boring). Chamfered edges, film grain on the surface,
// soft studio light and a soft cast shadow on the white wall. Rolls through the viewport on scroll.
import * as THREE from '../lib/three-m3d.js';
import { RoomEnvironment } from '../lib/three-m3d.js';

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

// set-up is split into small steps that each run in an idle slot, so warming this up in the background
// never stalls the page (shader compiles go through compileAsync / parallel compile where supported)
const idleSlot = () => new Promise((res) => (window.requestIdleCallback ? requestIdleCallback(() => res(), { timeout: 600 }) : setTimeout(res, 50)));

export async function initM({ section, canvas, reduce, ScrollTrigger, debugP }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  await idleSlot();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();
  await idleSlot();

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

  const mat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.66, metalness: 0.0 });
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
  m.castShadow = true;
  m.receiveShadow = true;
  const pivot = new THREE.Group();
  pivot.add(m);
  scene.add(pivot);

  // --- light
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(9, 13, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -16; key.shadow.camera.right = 16; key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
  key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  key.shadow.radius = 13; key.shadow.blurSamples = 10; key.shadow.bias = -0.0006;  // soft enough, far cheaper per frame
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-12, 4, 10); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(2, 14, -6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 0.3));
  // a soft lamp close to the front-right gives the big faces a gentle falloff
  const lamp = new THREE.PointLight(0xffffff, 0, 0, 2);
  scene.add(lamp);

  // --- wall that only catches the shadow
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.15 }));
  wall.position.z = -5.2;
  wall.receiveShadow = true;
  scene.add(wall);

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
    needs = true;
  }

  let target = 0, cur = 0, needs = true, visible = false, raf = 0;
  const fixed = debugP !== null && debugP !== undefined && debugP !== '' ? parseFloat(debugP) : null;
  if (reduce) { target = cur = 0.5; }
  if (fixed !== null) target = cur = fixed;

  if (!reduce && fixed === null) {
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { target = self.progress; needs = true; },
    });
    // entering and leaving: let it travel a little while the section slides in/out
    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'top top',
      onUpdate: (self) => { if (self.progress < 1) { target = (self.progress - 1) * 0.18; needs = true; } },
    });
  }

  const t0 = performance.now();
  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000;
    cur += (target - cur) * (reduce ? 1 : 0.085);
    const k = sample(mobile ? KEYS_MOBILE : KEYS, clamp01(cur));
    // progress below zero (section still entering) pushes it further down
    const extra = cur < 0 ? cur * 2.4 : 0;
    const idle = reduce ? 0 : 1;
    const sc = base * k.s * (mobile ? 1 : Math.min(1, Math.max(0.78, camera.aspect / 1.6)));
    m.scale.setScalar(sc);
    wall.position.z = -3.4 * sc;
    pivot.position.set((k.x + (mobile ? 0 : Math.max(0, 1.6 - camera.aspect) * 0.12)) * viewW * 0.5, (k.y + extra) * viewH, 0);
    pivot.rotation.set(k.rx + Math.sin(t * 0.6) * 0.025 * idle, k.ry + Math.sin(t * 0.45) * 0.04 * idle, k.rz);
    key.target.position.copy(pivot.position);
    key.position.set(pivot.position.x + 6, pivot.position.y + 10, 24);
    lamp.position.set(pivot.position.x + sc * 5, pivot.position.y + sc * 6, sc * 7);
    lamp.intensity = 260 * sc * sc;
    renderer.render(scene, camera);
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: '10% 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (visible) start(); });
  window.addEventListener('resize', () => { resize(); start(); });
  resize();
  // compile shaders and draw once now, in idle time, long before the section is on screen,
  // so scrolling into it never stalls
  await idleSlot();
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
  await idleSlot();
  frame(performance.now());
  window.__m3d = { renderer, scene, camera, pivot, set p(v) { target = cur = v; start(); } };
}
