// Realistic look for the world: sky with sun and clouds, sun shadows that follow the player, sky reflections on glass and
// car paint, detailed procedural surfaces (asphalt, pavers, plaster, brick, curtain-wall glass), and better-shaped
// vehicles and cows. Everything is generated in the browser: no extra downloads.
// ?simple turns off the costly parts (shadows, clouds); the game also drops shadows on its own when frames stay slow.
import * as THREE from 'three';

export const Q = { simple: /[?&]simple\b/.test(location.search), phone: false, shadows: false };
let R = null, SCENE = null, SUN = null, SKY = null, CUBE = null, CUBECAM = null, ENVSCENE = null, ENVGROUND = null;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
function tex(c, rx, ry) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 8; return t; }
// fine speckle and soft blotches so flat colours read as real material
function grain(x, w, h, n, cols, size) { for (let i = 0; i < n; i++) { x.fillStyle = pick(cols); const s = rnd(size[0], size[1]); x.fillRect(Math.random() * w, Math.random() * h, s, s); } }
function blotch(x, w, h, n, col, rmax) { for (let i = 0; i < n; i++) { const cx = Math.random() * w, cy = Math.random() * h, r = rnd(rmax * 0.3, rmax); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); } }

// ------------------------------------------------------------------ SKY
const SKY_VS = `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = `uniform vec3 uZen, uHor, uSunDir, uSunCol, uCloudCol; uniform float uCloud, uTime, uStars, uClouds; varying vec3 vDir;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir); float y = d.y;
  vec3 col = mix(uHor, uZen, pow(clamp(y, 0.0, 1.0), 0.5));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 64.0) * 0.35);
  if (y > 0.0 && uClouds > 0.5) {
    vec2 uv = d.xz / (y + 0.08) * 0.9 + vec2(uTime * 0.006, uTime * 0.003);
    float c = smoothstep(0.52 - uCloud * 0.3, 0.9 - uCloud * 0.25, fbm(uv) + uCloud * 0.2);
    float lit = 0.75 + 0.25 * fbm(uv * 2.0 + 3.1) + pow(sd, 4.0) * 0.4;
    col = mix(col, uCloudCol * lit, c * smoothstep(0.0, 0.12, y) * 0.92);
  }
  col += uSunCol * smoothstep(0.9993, 0.9997, sd) * 1.5 * (1.0 - uCloud);
  if (uStars > 0.01 && y > 0.0) { vec2 sp = d.xz / (y + 0.3) * 160.0; float s = step(0.996, h(floor(sp))) * uStars * smoothstep(0.0, 0.3, y); col += vec3(s); }
  col = mix(uHor, col, smoothstep(-0.02, 0.05, y));
  gl_FragColor = vec4(col, 1.0);
}`;
function skyMat() {
  return new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZen: { value: new THREE.Color(0x3f7fcf) }, uHor: { value: new THREE.Color(0xbfd3e0) }, uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() }, uSunCol: { value: new THREE.Color(0xfff2d0) }, uCloudCol: { value: new THREE.Color(0xffffff) }, uCloud: { value: 0 }, uTime: { value: 0 }, uStars: { value: 0 }, uClouds: { value: Q.simple ? 0 : 1 } } });
}

// ------------------------------------------------------------------ SETUP
export function init(renderer, scene, sun, phone) {
  R = renderer; SCENE = scene; SUN = sun; Q.phone = phone;
  const m = skyMat(); SKY = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), m); SKY.renderOrder = -1000; SKY.frustumCulled = false; scene.add(SKY);
  // reflections: a small cube map of the same sky over a dusty ground, refreshed as the day moves
  CUBE = new THREE.WebGLCubeRenderTarget(phone ? 64 : 128, { generateMipmaps: false, minFilter: THREE.LinearFilter });
  CUBECAM = new THREE.CubeCamera(1, 1000, CUBE); ENVSCENE = new THREE.Scene();
  ENVSCENE.add(new THREE.Mesh(SKY.geometry, m)); ENVGROUND = new THREE.Mesh(new THREE.CircleGeometry(400, 24), new THREE.MeshBasicMaterial({ color: 0x6d6a60 })); ENVGROUND.rotation.x = -Math.PI / 2; ENVGROUND.position.y = -12; ENVSCENE.add(ENVGROUND);
  scene.add(sun.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = phone ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  const S = sun.shadow, ext = phone ? 48 : 70; S.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(S.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 10, far: 420 }); S.camera.updateProjectionMatrix(); S.bias = -0.0006; S.normalBias = 0.05;
  setShadows(!Q.simple);
}
export const envMap = () => CUBE && CUBE.texture;
export function setShadows(on) { if (!SUN || Q.shadows === on) return; Q.shadows = on; SUN.castShadow = on; }

// which meshes throw a shadow: solid lit things, not flat ground, signs, glows or sprites
const FLAT = new Set(['PlaneGeometry', 'PlaneBufferGeometry', 'CircleGeometry', 'CircleBufferGeometry']);
export function shadowize(root) {
  root.traverse(o => {
    if (!o.isMesh || o.userData.sh) return; o.userData.sh = 1; const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.isMeshBasicMaterial || m.isShaderMaterial || m.transparent) return;
    o.receiveShadow = true; if (o.isInstancedMesh) o.frustumCulled = false; // r128 culls instanced meshes by the first instance only
    if (FLAT.has(o.geometry.type) || (o.geometry.type.startsWith('Box') && !o.isInstancedMesh && o.scale.y < 0.25 && Math.max(o.scale.x, o.scale.z) > 4)) return;
    o.castShadow = true;
  });
}

// per frame: sky colours from the game's day cycle, sun and shadow box over the player, reflection refresh when needed
const ZEN_DAY = new THREE.Color(0x3d7cc9), ZEN_DUSK = new THREE.Color(0x40508a), ZEN_NIGHT = new THREE.Color(0x03050f), tc = new THREE.Color();
let envKey = '', envT = 0;
export function frame(cam, px, pz, o) { // o = { horizon (Color), day, dusk, night, wet, inside, map, t }
  if (!SKY) return; const u = SKY.material.uniforms; SKY.visible = !o.inside; SKY.position.copy(cam.position);
  u.uHor.value.copy(o.horizon); tc.copy(ZEN_NIGHT).lerp(ZEN_DAY, o.day).lerp(ZEN_DUSK, o.dusk * 0.5).lerp(o.horizon, o.wet * 0.85); u.uZen.value.copy(tc);
  if (!o.inside) u.uSunDir.value.copy(o.sunVec);
  u.uSunCol.value.setRGB(1, 0.92 - o.dusk * 0.35, 0.78 - o.dusk * 0.5).multiplyScalar(Math.max(0, o.day * (1 - o.wet * 0.9)));
  u.uCloud.value = o.wet; u.uTime.value = o.t; u.uStars.value = Math.max(0, o.night - 0.4) * (1 - o.wet);
  u.uCloudCol.value.setRGB(1, 0.96 - o.dusk * 0.2, 0.92 - o.dusk * 0.35).multiplyScalar(0.12 + 0.88 * o.day).lerp(o.horizon, o.wet * 0.5);
  // the shadow box rides with the player, the light keeps the sun's direction
  if (!o.inside) { const tx = Math.round(px), tz = Math.round(pz); SUN.target.position.set(tx, 0, tz); SUN.position.set(tx + o.sunVec.x * 200, Math.max(25, o.sunVec.y * 200), tz + o.sunVec.z * 200); }
  setShadows(!Q.simple && !Q.lowShadow && !o.map && o.day > 0.35 && o.wet < 0.85);
  const key = Math.round(o.day * 40) + '|' + Math.round(o.dusk * 20) + '|' + Math.round(o.wet * 10) + '|' + (o.inside ? 1 : 0); envT -= o.dt;
  if (key !== envKey && envT <= 0 && !o.inside) { envKey = key; envT = 2; ENVGROUND.material.color.setRGB(0.42, 0.4, 0.36).multiplyScalar(0.15 + 0.85 * o.day); CUBECAM.update(R, ENVSCENE); }
}

// ------------------------------------------------------------------ MATERIALS
const PAINT = {};
export function paint(c) { // car paint: diffuse colour, a sharp sun highlight and a clear-coat sky reflection
  const k = 'p' + c; if (!PAINT[k]) PAINT[k] = new THREE.MeshPhongMaterial({ color: c, specular: 0x777777, shininess: 70, envMap: envMap(), combine: THREE.MixOperation, reflectivity: 0.22 }); return PAINT[k];
}
export function glass(dark) { const k = 'g' + (dark ? 1 : 0); if (!PAINT[k]) PAINT[k] = new THREE.MeshPhongMaterial({ color: dark ? 0x07090b : 0x1b2730, specular: 0xbbbbbb, shininess: 110, envMap: envMap(), combine: THREE.MixOperation, reflectivity: dark ? 0.45 : 0.55 }); return PAINT[k]; }
export function chrome() { if (!PAINT.ch) PAINT.ch = new THREE.MeshPhongMaterial({ color: 0xb9bec4, specular: 0xffffff, shininess: 120, envMap: envMap(), combine: THREE.MixOperation, reflectivity: 0.6 }); return PAINT.ch; }
export function matte(c) { const k = 'm' + c; if (!PAINT[k]) PAINT[k] = new THREE.MeshLambertMaterial({ color: c }); return PAINT[k]; }
export function lit(c) { const k = 'l' + c; if (!PAINT[k]) PAINT[k] = new THREE.MeshBasicMaterial({ color: c }); return PAINT[k]; }

// ------------------------------------------------------------------ SURFACES
export function asphaltTex() { // one tile = 14 m wide road x 15 m: two lanes each way, dashed centre, edge lines, worn wheel tracks
  const W = 256, c = canvas(W), x = c.getContext('2d');
  x.fillStyle = '#3d3d3f'; x.fillRect(0, 0, W, W); grain(x, W, W, 9000, ['#353537', '#48484a', '#2e2e30', '#525254', '#3a3a3c'], [1, 2]);
  blotch(x, W, W, 10, 'rgba(25,25,27,0.35)', 40); blotch(x, W, W, 6, 'rgba(95,92,86,0.25)', 50);
  for (const tx of [0.2, 0.32, 0.68, 0.8]) { x.fillStyle = 'rgba(20,20,22,0.22)'; x.fillRect(tx * W - 7, 0, 14, W); }
  x.strokeStyle = 'rgba(18,18,20,0.5)'; x.lineWidth = 1.2; for (let i = 0; i < 6; i++) { x.beginPath(); let px = Math.random() * W, py = Math.random() * W; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += rnd(-14, 14); py += rnd(-14, 14); x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(236,230,205,0.88)'; x.fillRect(W / 2 - 2.5, 0, 5, W * 0.5); x.fillRect(W * 0.25 - 1.5, W * 0.6, 3, W * 0.25); x.fillRect(W * 0.75 - 1.5, W * 0.6, 3, W * 0.25);
  x.fillStyle = 'rgba(232,196,70,0.85)'; x.fillRect(6, 0, 4, W); x.fillRect(W - 10, 0, 4, W);
  grain(x, W, W, 1500, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.06)'], [1, 2]); return c;
}
export function plainAsphaltTex() { const W = 128, c = canvas(W), x = c.getContext('2d'); x.fillStyle = '#3c3c3e'; x.fillRect(0, 0, W, W); grain(x, W, W, 3000, ['#353537', '#48484a', '#2e2e30', '#505052'], [1, 2]); blotch(x, W, W, 5, 'rgba(25,25,27,0.35)', 30); return c; }
export function zebraTex() { const c = canvas(128, 64), x = c.getContext('2d'); x.clearRect(0, 0, 128, 64); for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(240,236,220,0.92)'; x.fillRect(i * 16 + 3, 0, 9, 64); } grain(x, 128, 64, 600, ['rgba(60,60,60,0.5)'], [1, 2]); return c; }
export function paversTex() { // grey interlocking pavers, a few stained or replaced ones: the standard Gurugram footpath
  const W = 256, c = canvas(W), x = c.getContext('2d'); x.fillStyle = '#6e6a63'; x.fillRect(0, 0, W, W); const s = 16;
  for (let r = 0; r < W / s; r++) for (let k = -1; k < W / (s * 2) + 1; k++) { const ox = (r % 2) * s, px = k * s * 2 + ox, odd = Math.random() < 0.06;
    const base = odd ? [128, 96, 84] : [150, 146, 138]; const v = rnd(-12, 9); x.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`; x.fillRect(px + 1, r * s + 1, s * 2 - 2, s - 2); }
  grain(x, W, W, 5000, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.06)', 'rgba(90,80,60,0.15)'], [1, 2]); blotch(x, W, W, 10, 'rgba(60,52,40,0.25)', 40); return c;
}
export function kerbTex() { const c = canvas(64, 16), x = c.getContext('2d'); x.fillStyle = '#e9c63a'; x.fillRect(0, 0, 32, 16); x.fillStyle = '#1c1c1c'; x.fillRect(32, 0, 32, 16); grain(x, 64, 16, 300, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.15)'], [1, 2]); return c; }
export function groundTex() { // dusty Haryana soil with dry grass
  const W = 256, c = canvas(W), x = c.getContext('2d'); x.fillStyle = '#8c8158'; x.fillRect(0, 0, W, W);
  blotch(x, W, W, 30, 'rgba(110,122,62,0.45)', 45); blotch(x, W, W, 20, 'rgba(160,140,100,0.4)', 40);
  grain(x, W, W, 9000, ['#7d7650', '#958c5e', '#6f7a48', '#a19566', '#6a6040', '#85904f'], [1, 3]); return c;
}
export function grassTex() { const W = 256, c = canvas(W), x = c.getContext('2d'); x.fillStyle = '#5a7f3c'; x.fillRect(0, 0, W, W); blotch(x, W, W, 25, 'rgba(140,140,70,0.45)', 40); blotch(x, W, W, 15, 'rgba(30,70,25,0.35)', 35);
  for (let i = 0; i < 7000; i++) { x.strokeStyle = pick(['#4a7432', '#668c45', '#3f6530', '#7a9850', '#55803c', '#8a8a55']); const px = Math.random() * W, py = Math.random() * W; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rnd(-1.5, 1.5), py - rnd(2, 5)); x.stroke(); } return c; }
export function shopWallTex() { // neutral plaster (tinted per shop): damp line at the bottom, rain streaks, a parapet band and an AC box
  const c = canvas(128), x = c.getContext('2d'); x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, 128, 128); grain(x, 128, 128, 2500, ['rgba(0,0,0,0.035)', 'rgba(255,255,255,0.2)', 'rgba(120,100,70,0.05)'], [1, 2]);
  for (let i = 0; i < 7; i++) { const sx = rnd(0, 128), g = x.createLinearGradient(0, 8, 0, rnd(40, 90)); g.addColorStop(0, 'rgba(70,60,50,0.22)'); g.addColorStop(1, 'rgba(70,60,50,0)'); x.fillStyle = g; x.fillRect(sx, 8, rnd(2, 6), 90); }
  x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 0, 128, 7); const g2 = x.createLinearGradient(0, 128, 0, 100); g2.addColorStop(0, 'rgba(60,50,40,0.4)'); g2.addColorStop(1, 'rgba(60,50,40,0)'); x.fillStyle = g2; x.fillRect(0, 100, 128, 28);
  x.fillStyle = '#d9d9d4'; x.fillRect(92, 14, 24, 14); x.fillStyle = '#9a9a96'; for (let i = 0; i < 5; i++) x.fillRect(95, 16 + i * 2.5, 18, 1); return c;
}

// one facade tile = 7 m x 4.5 m = two bays by two floors. c: colour, e: lit windows at night, s: where it reflects (glass)
const FAC = { glass: { wall: '#294f66', glass: ['#3e6f8c', '#4f86a6', '#2d5873', '#5e94b0', '#36657f'], frame: '#9eb4c0', curtain: 1 },
  gold: { wall: '#2e271d', glass: ['#3a3022', '#4a3d2a', '#2c261d', '#55462f'], frame: '#c9a35b', curtain: 1 },
  concrete: { wall: '#d6c9ae', glass: ['#3c4b58', '#465a6a'], frame: '#efefe8', ac: 1 }, white: { wall: '#ecebe5', glass: ['#3f5a73', '#4b6a86'], frame: '#c9c9c3', ac: 1 },
  ochre: { wall: '#d6a458', glass: ['#3b3226', '#4d3d2a'], frame: '#f2e2c0', ac: 1 }, pink: { wall: '#e3b2a6', glass: ['#3f4d5e', '#4c5d70'], frame: '#f6efe6', ac: 1 },
  brick: { wall: '#a4553a', glass: ['#2f3540', '#3a3a44'], frame: '#e8dccb', brick: 1 }, dark: { wall: '#1a1024', glass: ['#2a1838'], frame: '#ff2bd6', neon: 1 } };
export function facade(style) {
  const S = FAC[style] || FAC.concrete, W = 256, c = canvas(W), e = canvas(W), s = canvas(W), x = c.getContext('2d'), y = e.getContext('2d'), z = s.getContext('2d');
  x.fillStyle = S.wall; x.fillRect(0, 0, W, W); y.fillStyle = '#000'; y.fillRect(0, 0, W, W); z.fillStyle = '#000'; z.fillRect(0, 0, W, W);
  if (S.brick) { for (let r = 0; r < W / 8; r++) for (let k = -1; k < W / 20 + 1; k++) { const v = rnd(-18, 14); x.fillStyle = `rgb(${164 + v | 0},${85 + v * 0.6 | 0},${58 + v * 0.5 | 0})`; x.fillRect(k * 20 + (r % 2) * 10 + 1, r * 8 + 1, 18, 6); } }
  else if (!S.curtain) grain(x, W, W, 6000, ['rgba(0,0,0,0.07)', 'rgba(255,255,255,0.18)', 'rgba(110,90,60,0.08)'], [1, 3]);
  const lights = ['#ffd88a', '#ffe7b0', '#fff2cf', '#bfe3ff', '#ffe0a0'];
  if (S.curtain) { // floor-to-ceiling glass: panes between mullions, a dark spandrel at every slab
    for (let f = 0; f < 2; f++) { const y0 = f * 128; x.fillStyle = S.wall; x.fillRect(0, y0, W, 128); for (let b = 0; b < 8; b++) { const px = b * 32;
      const gr = x.createLinearGradient(0, y0 + 14, 0, y0 + 128); gr.addColorStop(0, pick(S.glass)); gr.addColorStop(1, pick(S.glass)); x.fillStyle = gr; x.fillRect(px + 2, y0 + 16, 28, 110);
      z.fillStyle = '#fff'; z.fillRect(px + 2, y0 + 16, 28, 110); if (Math.random() < 0.5) { y.fillStyle = pick(lights); y.globalAlpha = rnd(0.5, 1); y.fillRect(px + 2, y0 + 16, 28, 110); y.globalAlpha = 1; } }
      x.fillStyle = S.frame; for (let b = 0; b <= 8; b++) x.fillRect(b * 32 - 1, y0, 3, 128); x.fillRect(0, y0 + 13, W, 3); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, y0, W, 13); }
  } else for (let f = 0; f < 2; f++) for (let b = 0; b < 2; b++) { // punched windows with frame, sill, shade and sometimes an AC unit
    const wx = b * 128 + 26, wy = f * 128 + 26, ww = 76, wh = 64;
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(wx - 6, wy - 6, ww + 12, 8); x.fillStyle = S.frame; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    const gr = x.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, pick(S.glass)); gr.addColorStop(1, '#1d242b'); x.fillStyle = gr; x.fillRect(wx, wy, ww, wh); x.fillStyle = S.frame; x.fillRect(wx + ww / 2 - 2, wy, 4, wh); x.fillRect(wx, wy + 24, ww, 3);
    z.fillStyle = '#bbb'; z.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(wx - 8, wy + wh + 4, ww + 16, 6); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(wx - 8, wy + wh + 10, ww + 16, 3);
    const st = x.createLinearGradient(0, wy + wh + 12, 0, wy + wh + 50); st.addColorStop(0, 'rgba(60,50,40,0.18)'); st.addColorStop(1, 'rgba(60,50,40,0)'); x.fillStyle = st; x.fillRect(wx + rnd(0, ww - 10), wy + wh + 12, rnd(4, 10), 38);
    if (S.ac && Math.random() < 0.55) { const ax = b ? wx - 30 : wx + ww + 6, ay = wy + wh - 26; x.fillStyle = '#e4e4df'; x.fillRect(ax, ay, 26, 22); x.fillStyle = '#9a9a96'; for (let i = 0; i < 6; i++) x.fillRect(ax + 3, ay + 3 + i * 3, 20, 1.2); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(ax, ay + 22, 26, 3); }
    if (Math.random() < 0.55 || S.neon) { y.fillStyle = S.neon ? '#ff2bd6' : pick(lights); y.fillRect(wx, wy, ww, wh); }
  }
  return { c, e, s };
}

// ------------------------------------------------------------------ SHAPES
const G = {};
function shaped(key, fn) { if (!G[key]) { const g = new THREE.BoxGeometry(1, 1, 1, 2, 1, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v[0], v[1], v[2]); } g.computeVertexNormals(); G[key] = g; } return G[key]; }
// unit car body with a sloping nose and tail; unit greenhouse narrowing toward the roof
const carBody = () => shaped('body', (x, y, z) => [x * (y > 0 ? 0.97 : 1), y > 0 && z > 0.3 ? y - 0.28 : y > 0 && z < -0.3 ? y - 0.12 : y, z]);
const cabin = (k) => shaped('cab' + k, (x, y, z) => [y > 0 ? x * 0.84 : x, y, y > 0 ? z * k : z]);
function part(g, geo, m, sx, sy, sz, x, y, z) { const o = new THREE.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); g.add(o); return o; }
const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 18), SPHG = new THREE.SphereGeometry(1, 16, 12);
function wheel(g, x, y, z, r, w) { const t = part(g, CYLG, matte(0x141414), r, w || 0.28, r, x, y, z); t.rotation.z = Math.PI / 2; const h = part(g, CYLG, chrome(), r * 0.55, 0.04, r * 0.55, x + Math.sign(x || 1) * (w || 0.28) / 2, y, z); h.rotation.z = Math.PI / 2; return t; }

// four-wheelers: body + glasshouse + bumpers + lights + wheels with rims. Returns the measures the game expects.
export function car(g, col, o) { // o = { big, film }
  const big = o.big, Ln = big ? 4.8 : 4.0, Wd = big ? 2.1 : 1.8, H = big ? 1.15 : 0.85, wr = big ? 0.5 : 0.4, base = wr * 0.9;
  part(g, carBody(), paint(col), Wd, H, Ln, 0, base + H / 2, 0);
  const cy = base + H + (big ? 0.42 : 0.36), ch = big ? 0.85 : 0.72; part(g, cabin(big ? 0.85 : 0.72), glass(o.film), Wd * 0.92, ch, Ln * (big ? 0.6 : 0.52), 0, cy, big ? -0.25 : -0.2);
  part(g, BOXG, paint(col), Wd * 0.78, 0.07, Ln * (big ? 0.5 : 0.37), 0, cy + ch / 2 + 0.02, big ? -0.25 : -0.2);
  for (const s of [-1, 1]) { part(g, BOXG, paint(col), 0.05, ch * 0.9, 0.08, s * Wd * 0.43, cy, (big ? -0.25 : -0.2) + Ln * (big ? 0.06 : 0.02)); part(g, BOXG, paint(col), 0.18, 0.12, 0.08, s * (Wd / 2 + 0.06), base + H + 0.08, Ln * 0.18); }
  for (const z of [Ln / 2, -Ln / 2]) part(g, BOXG, matte(0x1e2023), Wd * 1.01, 0.22, 0.14, 0, base + 0.12, z);
  part(g, BOXG, matte(0x0d0e10), Wd * 0.42, 0.18, 0.05, 0, base + H * 0.42, Ln / 2 + 0.01);
  for (const s of [-1, 1]) { part(g, BOXG, lit(0xfff6d8), Wd * 0.22, 0.13, 0.05, s * Wd * 0.34, base + H * 0.5, Ln / 2 + 0.01 - (big ? 0 : 0.05)); part(g, BOXG, lit(0xd81e12), Wd * 0.2, 0.12, 0.05, s * Wd * 0.36, base + H * 0.7, -Ln / 2 - 0.01); }
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) wheel(g, x * (Wd / 2 - 0.08), wr, z * Ln * 0.31, wr);
  return { Ln, Wd, H, base, top: cy + ch / 2 };
}
export function bus(g) {
  const B = paint(0x2563b8); part(g, BOXG, B, 2.6, 2.0, 10, 0, 1.5, 0); part(g, BOXG, glass(), 2.62, 0.95, 9.4, 0, 2.95, -0.2); part(g, BOXG, B, 2.6, 0.25, 10, 0, 3.55, 0); part(g, BOXG, paint(0xf2f2f2), 2.62, 0.35, 10.02, 0, 1.0, 0);
  part(g, BOXG, glass(), 2.3, 1.3, 0.06, 0, 2.6, 5.01); part(g, BOXG, matte(0x1e2023), 2.64, 0.35, 0.2, 0, 0.62, 5.0); part(g, BOXG, matte(0x1e2023), 2.64, 0.35, 0.2, 0, 0.62, -5.0);
  for (const s of [-1, 1]) { part(g, BOXG, lit(0xfff6d8), 0.35, 0.2, 0.05, s * 0.95, 1.05, 5.02); part(g, BOXG, lit(0xd81e12), 0.3, 0.25, 0.05, s * 1.05, 1.2, -5.02); part(g, BOXG, matte(0x222222), 0.06, 2.0, 1.1, s * 1.31, 1.95, 3.2); }
  for (const [x, z] of [[-1.2, 3.4], [1.2, 3.4], [-1.2, -3.2], [1.2, -3.2]]) wheel(g, x, 0.55, z, 0.55, 0.36);
}
export function truck(g) {
  const C = paint(0xf28c1b); part(g, BOXG, C, 2.4, 1.6, 2.0, 0, 1.75, 3.3); part(g, BOXG, glass(), 2.3, 0.75, 0.06, 0, 2.15, 4.31); part(g, BOXG, C, 2.42, 0.25, 2.05, 0, 2.65, 3.3);
  part(g, BOXG, matte(0x2a2a2a), 2.0, 0.35, 1.0, 0, 3.0, 3.1); part(g, BOXG, matte(0x1e2023), 2.5, 0.35, 0.25, 0, 0.75, 4.35); part(g, BOXG, chrome(), 1.2, 0.5, 0.05, 0, 1.3, 4.31);
  for (const s of [-1, 1]) part(g, BOXG, lit(0xfff6d8), 0.3, 0.22, 0.05, s * 0.9, 1.2, 4.33);
  part(g, BOXG, paint(0xd7331f), 2.5, 2.4, 6.4, 0, 2.3, -1.2); part(g, BOXG, matte(0x3a2a1a), 2.3, 0.3, 6.2, 0, 0.95, -1.2);
  for (const [x, z] of [[-1.15, 3.2], [1.15, 3.2], [-1.15, -2.2], [1.15, -2.2], [-1.15, -3.4], [1.15, -3.4]]) wheel(g, x, 0.55, z, 0.55, 0.36);
}
// CNG auto: green body, yellow canvas hood over a curved frame, one wheel in front, black rear seat
export function auto(g) {
  const GR = paint(0x1f8f45), YE = paint(0xf2c01e), BK = matte(0x161616);
  part(g, BOXG, GR, 1.35, 0.42, 2.4, 0, 0.62, -0.1); part(g, BOXG, GR, 1.4, 0.75, 0.9, 0, 1.0, -0.85);
  const nose = part(g, cabin(0.5), GR, 0.95, 0.85, 0.75, 0, 1.0, 1.05); nose.rotation.x = -0.12;
  part(g, BOXG, glass(), 1.0, 0.62, 0.05, 0, 1.7, 0.86).rotation.x = -0.15; part(g, BOXG, BK, 1.06, 0.06, 0.06, 0, 2.02, 0.84);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 2.0, 18, 1, true, -Math.PI / 2, Math.PI), YE); hood.material = YE.clone(); hood.material.side = THREE.DoubleSide; hood.rotation.x = -Math.PI / 2; hood.scale.set(1, 1, 0.42); hood.position.set(0, 1.95, -0.2); g.add(hood);
  part(g, BOXG, YE, 1.42, 0.85, 0.06, 0, 1.75, -1.2); part(g, BOXG, BK, 0.05, 0.75, 1.0, -0.69, 1.6, -0.75); part(g, BOXG, BK, 0.05, 0.75, 1.0, 0.69, 1.6, -0.75);
  for (const s of [-1, 1]) part(g, BOXG, BK, 0.05, 1.2, 0.05, s * 0.68, 1.45, 0.8);
  part(g, BOXG, BK, 1.2, 0.18, 0.6, 0, 1.0, -0.65); part(g, BOXG, BK, 1.2, 0.55, 0.12, 0, 1.3, -0.95); part(g, BOXG, BK, 0.45, 0.14, 0.4, 0, 1.0, 0.35);
  part(g, BOXG, chrome(), 0.75, 0.04, 0.04, 0, 1.38, 0.62); part(g, CYLG, lit(0xfff6d8), 0.1, 0.06, 0.1, 0, 1.15, 1.45).rotation.x = Math.PI / 2;
  part(g, BOXG, GR, 0.3, 0.08, 0.45, 0, 0.72, 1.3); for (const s of [-1, 1]) part(g, BOXG, lit(0xd81e12), 0.12, 0.1, 0.04, s * 0.55, 0.85, -1.31);
  wheel(g, 0, 0.32, 1.3, 0.32, 0.18); wheel(g, -0.62, 0.32, -0.9, 0.32, 0.2); wheel(g, 0.62, 0.32, -0.9, 0.32, 0.2);
}
// desi cow: zebu hump, dewlap, short horns, swinging tail. children[1] is the head (the game bobs it)
export function cow(g) {
  const tint = pick([0xf2efe6, 0xe9e2d2, 0xd9cbb0, 0x8a6a4a, 0xf2efe6]), W = matte(tint), D = matte(0x2b2622), H = matte(0xd8cdb6);
  part(g, SPHG, W, 0.55, 0.52, 1.15, 0, 1.3, -0.05);
  const head = new THREE.Group(); head.position.set(0, 1.7, 1.05); g.add(head);
  part(head, SPHG, W, 0.24, 0.26, 0.36, 0, 0, 0.22).rotation.x = 0.5; part(head, SPHG, D, 0.16, 0.13, 0.12, 0, -0.18, 0.5); for (const s of [-1, 1]) { const hn = part(head, new THREE.ConeGeometry(0.05, 0.28, 8), H, 1, 1, 1, s * 0.13, 0.2, 0.08); hn.rotation.z = -s * 0.5; const e = part(head, SPHG, W, 0.12, 0.05, 0.08, s * 0.25, 0.06, 0.1); e.rotation.z = s * 0.4; part(head, SPHG, D, 0.03, 0.03, 0.03, s * 0.13, 0.03, 0.4); }
  part(g, SPHG, W, 0.3, 0.32, 0.3, 0, 1.75, 0.6); part(g, SPHG, W, 0.08, 0.32, 0.25, 0, 1.15, 0.75);
  for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.75], [0.3, -0.75]]) { part(g, CYLG, W, 0.09, 0.85, 0.09, x, 0.6, z); part(g, CYLG, D, 0.08, 0.12, 0.08, x, 0.12, z); }
  const t = part(g, CYLG, W, 0.03, 0.85, 0.03, 0, 1.0, -1.18); t.rotation.x = 0.15; part(g, SPHG, D, 0.06, 0.12, 0.06, 0, 0.55, -1.25);
}
// leafy canopy: three lumpy blobs merged into one geometry, for instanced trees
export function canopy() {
  const parts = [[0, 0, 0, 1], [0.9, -0.3, 0.4, 0.75], [-0.8, -0.2, -0.5, 0.8], [0.1, 0.6, -0.3, 0.7]], pos = [];
  for (const [ox, oy, oz, s] of parts) { const g = new THREE.IcosahedronGeometry(2.0 * s, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + Math.sin(v.x * 3.1 + v.y * 1.7) * 0.08 + Math.cos(v.z * 2.3 - v.y) * 0.08; pos.push(v.x * k + ox, v.y * k * 0.85 + oy, v.z * k + oz); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
export const debug = () => ({ SKY, CUBE, SUN });
