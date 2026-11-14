// Real Gurugram from OpenStreetMap (preview: open the game with ?real). Every real road, building outline and park in
// central Gurugram, built into the 3D city tile by tile around the player: plaster houses with rooftop water tanks,
// apartment towers, glass offices, shops with signboards below flats, malls, sheds. Data (c) OpenStreetMap
// contributors, ODbL. The data file comes from scripts/realmap/build_realmap.py.
import * as THREE from 'three';

let DATA = null, root = null, ready = false; const TILE = 250, tiles = new Map(), index = new Map();
let mats = null;
const RADIUS = () => (Math.min(innerWidth, innerHeight) < 520 ? 430 : 650);
export const isReady = () => ready;
export const credit = 'Map data © OpenStreetMap contributors (ODbL)';

// ---------------------------------------------------------------- loading and indexing
export async function load(url, scene) {
  const r = await fetch(url); DATA = await r.json(); const Q = DATA.Q;
  const dec = (a, k = 2) => { const o = new Float32Array(a.length - k); for (let i = k; i < a.length; i++) o[i - k] = a[i] / Q; return o; };
  DATA.B = DATA.bld.map(b => { const p = dec(b); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); } return { s: b[0], f: b[1], p, x0, z0, x1, z1 }; });
  const NM = DATA.names || []; DATA.R = DATA.roads.map((r2, i) => ({ c: r2[0], w: r2[1] / Q, a: r2[2], b: r2[3], ow: r2[4], p: dec(r2, 5), n: DATA.rn && DATA.rn[i] >= 0 ? NM[DATA.rn[i]] : '' }));
  buildGraph();
  DATA.M = (DATA.metro || []).map(m => ({ line: m[0], n: NM[m[1]] || '', p: dec(m) }));
  DATA.PL = (DATA.places || []).map(q => ({ k: q[0], n: NM[q[1]], x: q[2], z: q[3] }));
  DATA.ST = (DATA.stations || []).map(q => ({ n: NM[q[0]], line: q[1], x: q[2], z: q[3] }));
  DATA.L = DATA.land.map(l => ({ k: l[0], p: new Float32Array(l.slice(1).map(v => v / Q)) }));
  const key = (x, z) => Math.floor(x / TILE) + ',' + Math.floor(z / TILE); const add = (k, t, v) => { let e = index.get(k); if (!e) index.set(k, e = { b: [], r: [], l: [], m: [], pi: [], sg: [], pl: [], st: [] }); e[t].push(v); };
  DATA.B.forEach((b, i) => add(key((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2), 'b', i));
  DATA.R.forEach((rd, i) => { for (let j = 0; j < rd.p.length - 2; j += 2) add(key((rd.p[j] + rd.p[j + 2]) / 2, (rd.p[j + 1] + rd.p[j + 3]) / 2), 'r', [i, j]); });
  // metro viaducts: segments and pillars (every 28 units along each line)
  DATA.M.forEach((m, i) => { let acc = 0; for (let j = 0; j < m.p.length - 2; j += 2) { const x0 = m.p[j], z0 = m.p[j + 1], x1 = m.p[j + 2], z1 = m.p[j + 3], L = Math.hypot(x1 - x0, z1 - z0); add(key((x0 + x1) / 2, (z0 + z1) / 2), 'm', [i, j]); for (let d = (28 - acc % 28) % 28; d < L; d += 28) { const x = x0 + (x1 - x0) * d / L, z = z0 + (z1 - z0) * d / L; add(key(x, z), 'pi', [x, z]); } acc += L; } });
  // green road-name boards along named roads: one near each end of a long stretch and every ~160 units
  DATA.R.forEach(rd => { if (!rd.n || rd.c > 6 || (rd.len || 0) < 70) return; let acc = 0, next = 30; /* roads are split at every junction now: only longer stretches get a board */ const p = rd.p; for (let j = 0; j < p.length - 2; j += 2) { const x0 = p[j], z0 = p[j + 1], x1 = p[j + 2], z1 = p[j + 3], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.01) continue; while (next <= acc + L) { const t = (next - acc) / L, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; add(key(x, z), 'sg', { x, z, dx: (x1 - x0) / L, dz: (z1 - z0) / L, w: rd.w, n: rd.n }); next += 220; } acc += L; } });
  DATA.PL.forEach((q, i) => add(key(q.x, q.z), 'pl', i)); DATA.ST.forEach((q, i) => add(key(q.x, q.z), 'st', i));
  DATA.L.forEach((l, i) => { let x = 0, z = 0; const n = l.p.length / 2; for (let j = 0; j < l.p.length; j += 2) { x += l.p[j]; z += l.p[j + 1]; } add(key(x / n, z / n), 'l', i); });
  root = new THREE.Group(); root.name = 'realcity'; scene.add(root); makeMaterials();
  const [bx0, bz0, bx1, bz1] = DATA.bounds; const ground = new THREE.Mesh(new THREE.PlaneGeometry(bx1 - bx0 + 800, bz1 - bz0 + 800), mats.ground); ground.rotation.x = -Math.PI / 2; mats.ground.map.repeat.set((bx1 - bx0 + 800) / 60, (bz1 - bz0 + 800) / 60); ground.position.set((bx0 + bx1) / 2, -0.02, (bz0 + bz1) / 2); ground.receiveShadow = true; root.add(ground);
  ready = true; return DATA;
}
export function toXZ(lat, lon) { const [OLAT, OLON] = DATA.origin, S = DATA.S; const KX = Math.cos(OLAT * Math.PI / 180) * 111320; return { x: (lon - OLON) * KX * S, z: -(lat - OLAT) * 110540 * S }; }
export const bounds = () => DATA && DATA.bounds;

// ---------------------------------------------------------------- materials (facades drawn once on canvases)
function tex(w, h, draw, rx, ry) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; return t; }
function makeMaterials() {
  const win = (c, x, y, w, h, frame, glass) => { c.fillStyle = frame; c.fillRect(x - 3, y - 3, w + 6, h + 6); c.fillStyle = glass; c.fillRect(x, y, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, y, w * 0.45, h); };
  // one texture tile = 2 bays (8 units) x 1 floor (3.4 units); walls are white-ish so a vertex colour tints each building
  const house = tex(256, 128, (c, w, h) => { c.fillStyle = '#f2ece2'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, Math.random() * h, 6, 2);
    for (const x of [30, 158]) { win(c, x, 34, 62, 56, '#d8d0c2', '#3a4652'); c.fillStyle = '#9a8f80'; c.fillRect(x - 8, 92, 78, 8); /* chajja */ c.fillStyle = '#5b5148'; for (let k = 0; k < 5; k++) c.fillRect(x + 4 + k * 12, 34, 3, 56); /* grille */ }
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, h - 6, w, 6); });
  const tower = tex(256, 128, (c, w, h) => { c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h); for (const x of [16, 144]) { win(c, x, 26, 96, 62, '#e2ddd2', '#4b6377'); } c.fillStyle = '#c9c2b4'; c.fillRect(0, 92, w, 12); /* balcony slab */ c.strokeStyle = '#8f8a80'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < w; x += 10) { c.moveTo(x, 92); c.lineTo(x, 70); } c.stroke(); c.fillStyle = '#8f8a80'; c.fillRect(0, 68, w, 3); });
  const office = tex(256, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#9cc3d8'); g.addColorStop(1, '#3f6f8f'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#d9e4ea'; for (let x = 0; x <= w; x += 32) c.fillRect(x, 0, 3, h); c.fillRect(0, 0, w, 5); c.fillRect(0, h - 14, w, 14); });
  const shop = tex(256, 128, (c, w, h) => { c.fillStyle = '#eee6d8'; c.fillRect(0, 0, w, h); const cols = ['#d7331f', '#f6c026', '#1f7a3a', '#2563b8', '#e85d3a', '#7a2bb8']; for (let k = 0; k < 2; k++) { const x = k * 128; c.fillStyle = cols[(k * 3) % cols.length]; c.fillRect(x + 6, 6, 116, 30); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(x + 20, 16, 60 + k * 10, 10); /* sign */ c.fillStyle = '#7d8288'; c.fillRect(x + 10, 42, 108, 80); c.fillStyle = '#9aa0a6'; for (let y = 46; y < 122; y += 6) c.fillRect(x + 10, y, 108, 2); /* shutter */ } });
  const shed = tex(256, 128, (c, w, h) => { c.fillStyle = '#a7adb2'; c.fillRect(0, 0, w, h); c.fillStyle = '#8d9398'; for (let x = 0; x < w; x += 12) c.fillRect(x, 0, 5, h); });
  const mall = tex(256, 128, (c, w, h) => { c.fillStyle = '#e7dcc6'; c.fillRect(0, 0, w, h); c.fillStyle = '#c9bb9f'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 3, h); c.fillStyle = '#3d6680'; c.fillRect(0, 40, w, 50); c.fillStyle = 'rgba(255,255,255,.2)'; for (let x = 0; x < w; x += 32) c.fillRect(x, 40, 14, 50); });
  const roof = tex(128, 128, (c, w, h) => { c.fillStyle = '#ddd8cf'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 60; i++) c.fillRect(Math.random() * w, Math.random() * h, 10, 10); });
  const road = tex(64, 256, (c, w, h) => { c.fillStyle = '#85868a'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 200; i++) c.fillRect(Math.random() * w, Math.random() * h, 3, 3); c.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 300; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 2); });
  const line = tex(16, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, w, h * 0.55); });
  const earth = tex(256, 256, (c, w, h) => { c.fillStyle = '#8e8f6a'; c.fillRect(0, 0, w, h); /* dusty grass, bare earth patches */ for (let i = 0; i < 90; i++) { c.fillStyle = Math.random() < 0.55 ? 'rgba(150,128,96,.35)' : 'rgba(96,120,64,.35)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 0, 7); c.fill(); } for (let i = 0; i < 900; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(60,80,40,.25)' : 'rgba(170,150,120,.25)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const L = (map, extra) => new THREE.MeshLambertMaterial({ map, vertexColors: true, side: THREE.DoubleSide, ...extra });
  mats = { walls: [null, L(house), L(tower), L(office), L(house), L(shed), L(mall), L(house)], ground1: L(shop), roof: new THREE.MeshLambertMaterial({ map: roof, vertexColors: true }),
    road: new THREE.MeshLambertMaterial({ map: road, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), line: new THREE.MeshBasicMaterial({ map: line, transparent: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    ground: new THREE.MeshLambertMaterial({ map: earth }), park: new THREE.MeshLambertMaterial({ color: 0x5f8a3e, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), water: new THREE.MeshLambertMaterial({ color: 0x4f86a8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    deck: new THREE.MeshLambertMaterial({ color: 0xbdb8ae }), yellow: new THREE.MeshLambertMaterial({ color: 0xf2b705, side: THREE.DoubleSide }), blue: new THREE.MeshLambertMaterial({ color: 0x2c6fb7, side: THREE.DoubleSide }), stationSide: new THREE.MeshLambertMaterial({ color: 0x9fb4c4 }), pole: new THREE.MeshLambertMaterial({ color: 0x6b7178 }),
    tank: new THREE.MeshLambertMaterial({ color: 0x1b1b1d }), trunk: new THREE.MeshLambertMaterial({ color: 0x6b4f35 }), leaf: new THREE.MeshLambertMaterial({ color: 0x3f7a32 }) };
}
const PLASTER = [0xf3e6c9, 0xf6d6c2, 0xf1e9a8, 0xffffff, 0xd9e9cf, 0xcfe2ee, 0xf2c9a0, 0xe8d7f0, 0xf4f0e6, 0xe9c9c0];
const GLASS = [0xffffff, 0xd8f0ff, 0xc9f2e6, 0xe6e0ff];
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// ---------------------------------------------------------------- building one tile
function buildTile(k) {
  const e = index.get(k); const g = new THREE.Group(); g.name = 'tile ' + k; if (!e) return g; const F = DATA.floor;
  const W = mats.walls.map(() => ({ pos: [], nor: [], uv: [], col: [] })); const G1 = { pos: [], nor: [], uv: [], col: [] }, RF = { pos: [], nor: [], uv: [], col: [] };
  const tanks = [], trees = []; const c3 = new THREE.Color();
  const quad = (A, x0, z0, x1, z1, y0, y1, u0, u1, nx, nz, col) => { // a wall strip, outward normal (nx, nz)
    A.pos.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0); for (let i = 0; i < 6; i++) A.nor.push(nx, 0, nz);
    const v0 = y0 / F, v1 = y1 / F; A.uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); for (let i = 0; i < 6; i++) A.col.push(col.r, col.g, col.b);
  };
  for (const bi of e.b) {
    const b = DATA.B[bi], p = b.p, n = p.length / 2, h = b.f * F; let cx = 0, cz = 0; for (let i = 0; i < p.length; i += 2) { cx += p[i]; cz += p[i + 1]; } cx /= n; cz /= n;
    const r = hash(bi, 7); c3.setHex(b.s === 3 ? GLASS[Math.floor(r * GLASS.length)] : b.s === 2 || b.s === 6 ? (r < 0.5 ? 0xffffff : PLASTER[Math.floor(r * PLASTER.length)]) : PLASTER[Math.floor(r * PLASTER.length)]);
    const A = W[b.s] || W[1]; let u = 0;
    for (let i = 0; i < n; i++) {
      const x0 = p[i * 2], z0 = p[i * 2 + 1], x1 = p[((i + 1) % n) * 2], z1 = p[((i + 1) % n) * 2 + 1]; const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); if (len < 0.05) continue;
      let nx = dz / len, nz = -dx / len; if (nx * ((x0 + x1) / 2 - cx) + nz * ((z0 + z1) / 2 - cz) < 0) { nx = -nx; nz = -nz; } // facing out
      const u1 = u + len / 8; if (b.s === 4 && b.f > 1) { quad(G1, x0, z0, x1, z1, 0, F, u, u1, nx, nz, { r: 1, g: 1, b: 1 }); quad(A, x0, z0, x1, z1, F, h, u, u1, nx, nz, c3); } else quad(A, x0, z0, x1, z1, 0, h, u, u1, nx, nz, c3); u = u1;
    }
    // the roof: a flat slab (triangulated footprint)
    const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(p[i * 2], p[i * 2 + 1])); let tri = []; try { tri = THREE.ShapeUtils.triangulateShape(pts, []); } catch { tri = []; }
    const rc = b.s === 3 ? 0x7f8a92 : 0xc8c2b6; c3.setHex(rc);
    for (const [a, b2, c2] of tri) { const A2 = pts[a], B2 = pts[b2], C2 = pts[c2]; upTri(RF, A2.x, h, A2.y, B2.x, h, B2.y, C2.x, h, C2.y, [A2.x / 6, A2.y / 6, B2.x / 6, B2.y / 6, C2.x / 6, C2.y / 6]); for (let q = 0; q < 3; q++) RF.col.push(c3.r, c3.g, c3.b); }
    if ((b.s === 1 || b.s === 4) && hash(bi, 3) < 0.8) tanks.push(cx + (hash(bi, 5) - 0.5) * 1.5, h, cz + (hash(bi, 6) - 0.5) * 1.5); // the black Sintex tank on every Gurugram roof
  }
  const mesh = (A, mat) => { if (!A.pos.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(A.nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); if (A.col.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(A.col, 3)); geo.computeBoundingSphere(); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m); };
  W.forEach((A, s) => s && mesh(A, mats.walls[s])); mesh(G1, mats.ground1); mesh(RF, mats.roof);
  // roads: one strip per segment, overlapping at the joints; centre lines on the main roads
  const RD = { pos: [], nor: [], uv: [] }, LN = { pos: [], nor: [], uv: [] };
  for (const [ri, j] of e.r) {
    const rd = DATA.R[ri], p = rd.p; const x0 = p[j], z0 = p[j + 1], x1 = p[j + 2], z1 = p[j + 3]; const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); if (len < 0.05) continue;
    const ux = dx / len, uz = dz / len, hw = rd.w / 2, ex = ux * hw * 0.98, ez = uz * hw * 0.98; const sx = -uz * hw, sz = ux * hw; const y = 0.02 + (9 - rd.c) * 0.004;
    const a0x = x0 - ex, a0z = z0 - ez, a1x = x1 + ex, a1z = z1 + ez; const L2 = len + hw * 2;
    upTri(RD, a0x + sx, y, a0z + sz, a0x - sx, y, a0z - sz, a1x - sx, y, a1z - sz, [0, 0, 1, 0, 1, L2 / 8]); upTri(RD, a0x + sx, y, a0z + sz, a1x - sx, y, a1z - sz, a1x + sx, y, a1z + sz, [0, 0, 1, L2 / 8, 0, L2 / 8]);
    if (rd.c <= 4) { const lw = 0.18, lx = -uz * lw, lz = ux * lw, ly = y + 0.01; upTri(LN, x0 + lx, ly, z0 + lz, x0 - lx, ly, z0 - lz, x1 - lx, ly, z1 - lz, [0, 0, 1, 0, 1, len / 6]); upTri(LN, x0 + lx, ly, z0 + lz, x1 - lx, ly, z1 - lz, x1 + lx, ly, z1 + lz, [0, 0, 1, len / 6, 0, len / 6]); }
  }
  const flat = (A, mat) => { if (!A.pos.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(A.nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); geo.computeBoundingSphere(); const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; g.add(m); };
  flat(RD, mats.road); flat(LN, mats.line);
  // parks and water (with trees in the parks)
  for (const li of e.l) { const l = DATA.L[li]; const pts = []; for (let j = 0; j < l.p.length; j += 2) pts.push(new THREE.Vector2(l.p[j], l.p[j + 1])); if (pts.length > 2 && pts[0].equals(pts[pts.length - 1])) pts.pop(); let tri = []; try { tri = THREE.ShapeUtils.triangulateShape(pts, []); } catch { continue; }
    const A = { pos: [], nor: [], uv: [] }; const y = l.k === 3 ? 0.012 : 0.01; for (const [a, b2, c2] of tri) upTri(A, pts[a].x, y, pts[a].y, pts[b2].x, y, pts[b2].y, pts[c2].x, y, pts[c2].y, [0, 0, 0, 0, 0, 0]); flat(A, l.k === 3 ? mats.water : mats.park);
    if (l.k === 1 || l.k === 7) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.y); z1 = Math.max(z1, q.y); } const nT = Math.min(60, Math.floor((x1 - x0) * (z1 - z0) / 140)); for (let t = 0; t < nT; t++) { const x = x0 + hash(li, t * 2) * (x1 - x0), z = z0 + hash(li, t * 2 + 1) * (z1 - z0); if (inPoly(pts, x, z)) trees.push(x, z); } }
  }
  buildExtras(e, g);
  if (tanks.length) { const im = new THREE.InstancedMesh(TANK || (TANK = new THREE.CylinderGeometry(0.75, 0.75, 1.3, 10)), mats.tank, tanks.length / 3); const m4 = new THREE.Matrix4(); for (let i = 0; i < tanks.length; i += 3) { m4.makeTranslation(tanks[i], tanks[i + 1] + 0.65, tanks[i + 2]); im.setMatrixAt(i / 3, m4); } im.castShadow = true; g.add(im); }
  if (trees.length) { const n = trees.length / 2; const tr = new THREE.InstancedMesh(TRUNK || (TRUNK = new THREE.CylinderGeometry(0.25, 0.35, 3, 6)), mats.trunk, n), lf = new THREE.InstancedMesh(LEAF || (LEAF = new THREE.IcosahedronGeometry(2.4, 0)), mats.leaf, n); const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const s = 0.8 + hash(i, 9) * 0.6; m4.makeScale(s, s, s).setPosition(trees[i * 2], 1.5 * s, trees[i * 2 + 1]); tr.setMatrixAt(i, m4); m4.makeScale(s, s * 1.1, s).setPosition(trees[i * 2], 4.2 * s, trees[i * 2 + 1]); lf.setMatrixAt(i, m4); } tr.castShadow = lf.castShadow = true; g.add(tr, lf); }
  return g;
}
let TANK = null, TRUNK = null, LEAF = null, PILLAR = null;
// ---------------------------------------------------------------- names and the metro: what makes it Gurugram
const LBL = []; // floating place names, faded by distance in update()
function textCanvas(text, o) { const c = document.createElement('canvas'), x = c.getContext('2d'), fs = o.fs || 44; x.font = '800 ' + fs + 'px "Baloo 2","Mukta",sans-serif'; const w = Math.min(1024, Math.ceil(x.measureText(text).width) + fs * (o.pad || 1)); c.width = w; c.height = Math.round(fs * (o.h || 1.5)); x.font = '800 ' + fs + 'px "Baloo 2","Mukta",sans-serif';
  if (o.bg) { x.fillStyle = o.bg; if (o.round) { const r = c.height / 2.4; x.beginPath(); x.moveTo(r, 0); x.arcTo(w, 0, w, c.height, r); x.arcTo(w, c.height, 0, c.height, r); x.arcTo(0, c.height, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.fill(); } else x.fillRect(0, 0, w, c.height); }
  if (o.border) { x.strokeStyle = o.border; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, c.height - 10); }
  x.fillStyle = o.fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, c.height / 2 + 2); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return { t, aspect: w / c.height }; }
const PLC = { 1: ['#1b1410cc', '#fff4d8', 13, 34, 520], 2: ['#1b1410b0', '#fff4d8', 10, 30, 380], 3: ['#2f6b2fd8', '#fff', 6, 12, 220], 4: ['#5b2a86d8', '#fff', 6, 15, 240], 5: ['#d7331fe6', '#fff', 7, 22, 320], 6: ['#f6c026ee', '#1b1410', 6, 9, 260] }; // bg, fg, size, height, seen-from
function buildExtras(e, g) {
  // metro: a concrete deck on pillars, a coloured band for the line (Yellow Line / Rapid Metro blue)
  if (e.m.length) { const D = { pos: [], nor: [], uv: [] }, B1 = { pos: [], nor: [], uv: [] }, B2 = { pos: [], nor: [], uv: [] }, y0 = 8.2, y1 = 9.6, hw = 3.2;
    const wall = (A, ax, az, bx, bz, ya, yb, nx, nz) => { A.pos.push(ax, ya, az, bx, ya, bz, bx, yb, bz, ax, ya, az, bx, yb, bz, ax, yb, az); for (let k = 0; k < 6; k++) A.nor.push(nx, 0, nz); A.uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); };
    for (const [mi, j] of e.m) { const m = DATA.M[mi], p = m.p, x0 = p[j], z0 = p[j + 1], x1 = p[j + 2], z1 = p[j + 3], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.05) continue; const ux = (x1 - x0) / L, uz = (z1 - z0) / L, sx = -uz * hw, sz = ux * hw, ex = ux * 0.6, ez = uz * 0.6;
      const a0x = x0 - ex, a0z = z0 - ez, a1x = x1 + ex, a1z = z1 + ez;
      upTri(D, a0x + sx, y1, a0z + sz, a0x - sx, y1, a0z - sz, a1x - sx, y1, a1z - sz, [0, 0, 1, 0, 1, 1]); upTri(D, a0x + sx, y1, a0z + sz, a1x - sx, y1, a1z - sz, a1x + sx, y1, a1z + sz, [0, 0, 1, 1, 0, 1]);
      D.pos.push(a0x + sx, y0, a0z + sz, a1x - sx, y0, a1z - sz, a0x - sx, y0, a0z - sz, a0x + sx, y0, a0z + sz, a1x + sx, y0, a1z + sz, a1x - sx, y0, a1z - sz); for (let k = 0; k < 6; k++) D.nor.push(0, -1, 0); D.uv.push(0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1);
      const band = m.line === 2 ? B2 : B1; wall(band, a0x + sx, a0z + sz, a1x + sx, a1z + sz, y0, y1, -uz, ux); wall(band, a1x - sx, a1z - sz, a0x - sx, a0z - sz, y0, y1, uz, -ux); }
    const mk = (A, mat) => { if (!A.pos.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(A.nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); geo.computeBoundingSphere(); const ms = new THREE.Mesh(geo, mat); ms.castShadow = true; ms.receiveShadow = true; g.add(ms); };
    mk(D, mats.deck); mk(B1, mats.yellow); mk(B2, mats.blue); }
  if (e.pi.length) { const im = new THREE.InstancedMesh(PILLAR || (PILLAR = new THREE.CylinderGeometry(0.9, 1.1, 8.2, 10)), mats.deck, e.pi.length); const m4 = new THREE.Matrix4(); e.pi.forEach(([x, z], i) => { m4.makeTranslation(x, 4.1, z); im.setMatrixAt(i, m4); }); im.castShadow = true; g.add(im); }
  // stations: a box over the line, the name in big letters
  for (const si of e.st) { const st = DATA.ST[si]; let ang = 0, bd = 1e9; for (const m of DATA.M) for (let j = 0; j < m.p.length - 2; j += 2) { const d = Math.hypot((m.p[j] + m.p[j + 2]) / 2 - st.x, (m.p[j + 1] + m.p[j + 3]) / 2 - st.z); if (d < bd) { bd = d; ang = Math.atan2(m.p[j + 2] - m.p[j], m.p[j + 3] - m.p[j + 1]); } }
    const box = new THREE.Mesh(new THREE.BoxGeometry(11, 5.5, 46), [mats.stationSide, mats.stationSide, mats.deck, mats.deck, mats.stationSide, mats.stationSide]); box.position.set(st.x, 12.4, st.z); box.rotation.y = ang; box.castShadow = true; box.userData.own = true; g.add(box);
    const { t, aspect } = textCanvas('🚇 ' + st.n + (st.line === 2 ? ' · Rapid Metro' : / Station$/.test(st.n) ? '' : ' · Metro'), { fs: 46, bg: st.line === 2 ? '#2c6fb7' : '#d6a400', fg: '#fff', round: true, pad: 1.4 }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(5 * aspect, 5, 1); sp.position.set(st.x, 19, st.z); sp.userData.own = true; g.add(sp); LBL.push({ sp, x: st.x, z: st.z, far: 600 }); }
  // green road-name boards (Gurugram style) at the kerb, readable from both directions
  for (const sg of e.sg) { const { t, aspect } = textCanvas(sg.n, { fs: 40, bg: '#178a48', fg: '#ffffff', border: '#ffffff', pad: 1.2, h: 1.6 }); const W = Math.min(9, 1.5 * aspect), H = 1.5; const mat = new THREE.MeshBasicMaterial({ map: t }); const grp = new THREE.Group();
    for (const sd of [0, Math.PI]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); pl.rotation.y = sd; pl.position.z = sd ? -0.03 : 0.03; grp.add(pl); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.6, 6), mats.pole); pole.position.set(-W / 2 + 0.2, -2.0, 0); grp.add(pole); const pole2 = pole.clone(); pole2.position.x = W / 2 - 0.2; grp.add(pole2);
    const off = sg.w / 2 + 1.6; grp.position.set(sg.x - sg.dz * off, 4.3, sg.z + sg.dx * off); grp.rotation.y = Math.atan2(sg.dx, sg.dz); grp.userData.own = true; mat.userData = { own: true }; g.add(grp); }
  // place names: sectors and localities high up, parks/markets/landmarks/chowks lower down
  for (const pi of e.pl) { const q = DATA.PL[pi], st = PLC[q.k]; if (!st) continue; const { t, aspect } = textCanvas((q.k === 3 ? '🌳 ' : q.k === 6 ? '🚦 ' : q.k === 5 ? '🏬 ' : '') + q.n, { fs: 44, bg: st[0], fg: st[1], round: true, pad: 1.2 }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    sp.scale.set(st[2] * aspect * 0.5, st[2] * 0.5, 1); sp.position.set(q.x, st[3], q.z); sp.userData.own = true; g.add(sp); LBL.push({ sp, x: q.x, z: q.z, far: st[4] }); }
}
// ---------------------------------------------------------------- the road graph: GPS routes and traffic
// Every road piece runs junction to junction (a -> b). ADJ[node] lists where you can go from it (one-ways only forwards).
let GN = null, ADJ = null;
const SPEED = { 1: 2.4, 2: 2.0, 3: 1.7, 4: 1.5, 5: 1.5, 6: 1.0, 7: 0.55 }; // how much the router likes each road class
function buildGraph() {
  const n = (DATA.gn || []).length / 2; GN = new Float32Array(n * 2); for (let i = 0; i < n * 2; i++) GN[i] = DATA.gn[i] / DATA.Q; ADJ = Array.from({ length: n }, () => []);
  DATA.R.forEach((rd, i) => { if (rd.c > 7 || rd.a == null) return; let L = 0; for (let j = 0; j < rd.p.length - 2; j += 2) L += Math.hypot(rd.p[j + 2] - rd.p[j], rd.p[j + 3] - rd.p[j + 1]); rd.len = L;
    ADJ[rd.a].push({ r: i, to: rd.b, fwd: true }); if (!rd.ow) ADJ[rd.b].push({ r: i, to: rd.a, fwd: false }); });
}
export const nodeXZ = i => [GN[i * 2], GN[i * 2 + 1]];
export const edgesFrom = i => ADJ[i] || [];
export const road = i => DATA.R[i];
function nearestNode(x, z, car = true) { // the closest junction on a drivable road around (x, z)
  const tx = Math.floor(x / TILE), tz = Math.floor(z / TILE); let best = -1, bd = 1e9;
  for (let r = 0; r <= 2 && best < 0; r++) for (let ax = tx - r; ax <= tx + r; ax++) for (let az = tz - r; az <= tz + r; az++) { const e = index.get(ax + ',' + az); if (!e) continue; for (const [ri] of e.r) { const rd = DATA.R[ri]; if (rd.c > (car ? 7 : 8) || rd.a == null) continue; for (const nd of [rd.a, rd.b]) { const d = Math.hypot(GN[nd * 2] - x, GN[nd * 2 + 1] - z); if (d < bd) { bd = d; best = nd; } } } }
  return best;
}
// A*: the quickest way by road (main roads preferred, one-ways respected). Returns the route as points, or null.
export function snapRoad(x, z) { if (!ready || !GN) return null; const n = nearestNode(x, z); return n < 0 ? null : [GN[n * 2], GN[n * 2 + 1]]; } // the nearest junction on a drivable road
export function route(x0, z0, x1, z1) {
  if (!ready || !ADJ) return null; const s = nearestNode(x0, z0), t = nearestNode(x1, z1); if (s < 0 || t < 0) return null; if (s === t) return [[x0, z0], [x1, z1]];
  const n = ADJ.length, g = new Float32Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), via = new Int32Array(n).fill(-1), closed = new Uint8Array(n); const tx = GN[t * 2], tz = GN[t * 2 + 1];
  const H = [], push = (f, i) => { H.push([f, i]); let k = H.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (H[p][0] <= H[k][0]) break; [H[p], H[k]] = [H[k], H[p]]; k = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === k) break; [H[m], H[k]] = [H[k], H[m]]; k = m; } } return top; };
  g[s] = 0; push(0, s); let it = 0;
  while (H.length && it++ < 200000) { const [, u] = pop(); if (closed[u]) continue; closed[u] = 1; if (u === t) break;
    for (const e of ADJ[u]) { const rd = DATA.R[e.r], c = g[u] + rd.len / (SPEED[rd.c] || 1); if (c < g[e.to]) { g[e.to] = c; came[e.to] = u; via[e.to] = e.r * 2 + (e.fwd ? 1 : 0); push(c + Math.hypot(GN[e.to * 2] - tx, GN[e.to * 2 + 1] - tz) / 2.4, e.to); } } }
  if (came[t] < 0) return null; const legs = []; for (let v = t; v !== s; v = came[v]) legs.push(via[v]); legs.reverse();
  const pts = [[x0, z0]]; for (const lg of legs) { const rd = DATA.R[lg >> 1], fwd = lg & 1, p = rd.p, m = p.length / 2; for (let k = 0; k < m; k++) { const j = fwd ? k : m - 1 - k; pts.push([p[j * 2], p[j * 2 + 1]]); } }
  pts.push([x1, z1]); return pts;
}
// roads near a point, for spawning traffic out of sight
export function roadsNear(x, z, rMin, rMax) { const out = [], tx = Math.floor(x / TILE), tz = Math.floor(z / TILE), n = Math.ceil(rMax / TILE); for (let ax = tx - n; ax <= tx + n; ax++) for (let az = tz - n; az <= tz + n; az++) { const e = index.get(ax + ',' + az); if (!e) continue; for (const [ri, j] of e.r) { const rd = DATA.R[ri]; if (rd.c > 6 || rd.a == null || j) continue; const d = Math.hypot(rd.p[0] - x, rd.p[1] - z); if (d > rMin && d < rMax) out.push(ri); } } return out; }
// where am I: the locality (nearest sector or neighbourhood) and the road under you
export function placeAt(x, z) {
  if (!ready) return null; let area = null, ad = 1e9, road = null, rdd = 1e9; const tx = Math.floor(x / TILE), tz = Math.floor(z / TILE);
  for (let ax = tx - 3; ax <= tx + 3; ax++) for (let az = tz - 3; az <= tz + 3; az++) { const e = index.get(ax + ',' + az); if (!e) continue; for (const pi of e.pl) { const q = DATA.PL[pi]; if (q.k > 2) continue; const d = Math.hypot(q.x - x, q.z - z) * (q.k === 1 ? 0.85 : 1); if (d < ad) { ad = d; area = q.n; } }
    if (Math.abs(ax - tx) <= 1 && Math.abs(az - tz) <= 1) for (const [ri, j] of e.r) { const rd = DATA.R[ri]; if (!rd.n) continue; const p = rd.p, x0 = p[j], z0 = p[j + 1], dx = p[j + 2] - x0, dz = p[j + 3] - z0, L2 = dx * dx + dz * dz || 1e-9, k = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / L2)), d = Math.hypot(x - x0 - k * dx, z - z0 - k * dz); if (d < rd.w / 2 + 3 && d < rdd) { rdd = d; road = rd.n; } } }
  return { area: ad < 1400 ? area : null, road };
}
export const places = () => ready ? DATA.PL.map(q => ({ k: q.k, n: q.n, x: q.x, z: q.z })).concat(DATA.ST.map(q => ({ k: 7, n: q.n + (q.line === 2 ? ' (Rapid Metro)' : ' Metro'), x: q.x, z: q.z }))) : [];

// flat triangles must face up (counter-clockwise seen from above) so they light as ground, not as an underside
function upTri(A, ax, ay, az, bx, by, bz, cx, cy, cz, uv) { const cr = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); if (cr < 0) { A.pos.push(ax, ay, az, cx, cy, cz, bx, by, bz); if (uv) A.uv.push(uv[0], uv[1], uv[4], uv[5], uv[2], uv[3]); } else { A.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz); if (uv) A.uv.push(...uv); } A.nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); }
function inPoly(pts, x, z) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > z) !== (b.y > z) && x < (b.x - a.x) * (z - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }

// ---------------------------------------------------------------- streaming: build what's near, drop what's far
export function update(px, pz) {
  if (!ready) return; const R = RADIUS(); const tx0 = Math.floor((px - R) / TILE), tx1 = Math.floor((px + R) / TILE), tz0 = Math.floor((pz - R) / TILE), tz1 = Math.floor((pz + R) / TILE);
  let built = 0, best = null, bd = 1e9;
  for (let tx = tx0; tx <= tx1; tx++) for (let tz = tz0; tz <= tz1; tz++) { const k = tx + ',' + tz; if (tiles.has(k)) continue; const d = Math.hypot((tx + 0.5) * TILE - px, (tz + 0.5) * TILE - pz); if (d < R && d < bd) { bd = d; best = k; } }
  if (best) { const g = buildTile(best); root.add(g); tiles.set(best, g); built++; } // one tile per frame keeps it smooth
  for (const [k, g] of tiles) { const [tx, tz] = k.split(',').map(Number); if (Math.hypot((tx + 0.5) * TILE - px, (tz + 0.5) * TILE - pz) > R + TILE * 1.2) { root.remove(g); g.traverse(o => { if (o.geometry && o.geometry !== TANK && o.geometry !== TRUNK && o.geometry !== LEAF && o.geometry !== PILLAR) o.geometry.dispose(); if (o.material && (o.isSprite || o.userData.own || (o.material.userData && o.material.userData.own))) { for (const mt of [].concat(o.material)) { if (mt.map && mt !== mats.deck) mt.map.dispose(); if (mt.userData && mt.userData.own || o.isSprite) mt.dispose(); } } }); tiles.delete(k); } }
  for (let i = LBL.length - 1; i >= 0; i--) { const L = LBL[i]; if (!L.sp.parent || !L.sp.parent.parent) { LBL.splice(i, 1); continue; } const d = Math.hypot(L.x - px, L.z - pz), o = d < 14 ? d / 14 : d > L.far ? 0 : d > L.far * 0.7 ? (L.far - d) / (L.far * 0.3) : 1; L.sp.material.opacity = o; L.sp.visible = o > 0.02; }
  return built;
}
export const tileCount = () => tiles.size;
export function warm(px, pz, max = 60) { for (let i = 0; i < max; i++) if (!update(px, pz)) break; } // build everything in view at once (start, teleports)

// ---------------------------------------------------------------- collisions: a circle against real building outlines
export function collide(o, r) {
  if (!ready) return false; let hit = false; const tx = Math.floor(o.x / TILE), tz = Math.floor(o.z / TILE);
  for (let ax = tx - 1; ax <= tx + 1; ax++) for (let az = tz - 1; az <= tz + 1; az++) { const e = index.get(ax + ',' + az); if (!e) continue;
    for (const bi of e.b) { const b = DATA.B[bi]; if (o.x + r < b.x0 || o.x - r > b.x1 || o.z + r < b.z0 || o.z - r > b.z1) continue; const p = b.p, n = p.length / 2;
      let inside = false, best = 1e9, bx = 0, bz = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) { const x1 = p[i * 2], z1 = p[i * 2 + 1], x2 = p[j * 2], z2 = p[j * 2 + 1];
        if ((z1 > o.z) !== (z2 > o.z) && o.x < (x2 - x1) * (o.z - z1) / (z2 - z1) + x1) inside = !inside;
        const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1e-9; const k = Math.max(0, Math.min(1, ((o.x - x1) * dx + (o.z - z1) * dz) / L2)); const qx = x1 + k * dx, qz = z1 + k * dz; const d = Math.hypot(o.x - qx, o.z - qz); if (d < best) { best = d; bx = qx; bz = qz; } }
      if (inside) { const d = best || 1e-6; o.x = bx + (bx - o.x) / d * r; o.z = bz + (bz - o.z) / d * r; hit = true; }
      else if (best < r) { const d = best || 1e-6; o.x = bx + (o.x - bx) / d * r; o.z = bz + (o.z - bz) / d * r; hit = true; } } }
  for (let ax = tx - 1; ax <= tx + 1; ax++) for (let az = tz - 1; az <= tz + 1; az++) { const e = index.get(ax + ',' + az); if (!e) continue; for (const [x, z] of e.pi) { const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz), rr = r + 1.0; if (d < rr && d > 1e-6) { o.x = x + dx / d * rr; o.z = z + dz / d * rr; hit = true; } } } // metro pillars
  const [x0, z0, x1, z1] = DATA.bounds; o.x = Math.max(x0, Math.min(x1, o.x)); o.z = Math.max(z0, Math.min(z1, o.z));
  return hit;
}

// ---------------------------------------------------------------- minimap: real roads (and parks) around the player
export function drawMini(ctx, px, pz, span) { drawMini0(ctx, px, pz, span); if (!ready) return; ctx.lineWidth = 5; for (const m of DATA.M) { ctx.strokeStyle = m.line === 2 ? '#2c6fb7' : '#f2b705'; ctx.setLineDash([9, 6]); ctx.beginPath(); for (let j = 0; j < m.p.length; j += 2) (j ? ctx.lineTo : ctx.moveTo).call(ctx, m.p[j], m.p[j + 1]); ctx.stroke(); } ctx.setLineDash([]); for (const st of DATA.ST) { if (Math.abs(st.x - px) > span * 1.5 || Math.abs(st.z - pz) > span * 1.5) continue; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(st.x, st.z, 9, 0, 7); ctx.fill(); ctx.fillStyle = st.line === 2 ? '#2c6fb7' : '#d6a400'; ctx.beginPath(); ctx.arc(st.x, st.z, 6, 0, 7); ctx.fill(); } }
function drawMini0(ctx, px, pz, span) {
  if (!ready) return; const tx = Math.floor(px / TILE), tz = Math.floor(pz / TILE), n = Math.ceil(span / TILE) + 1;
  ctx.fillStyle = '#5f8a3e'; for (let ax = tx - n; ax <= tx + n; ax++) for (let az = tz - n; az <= tz + n; az++) { const e = index.get(ax + ',' + az); if (!e) continue; for (const li of e.l) { const l = DATA.L[li]; ctx.fillStyle = l.k === 3 ? '#4f86a8' : '#5f8a3e'; ctx.beginPath(); for (let j = 0; j < l.p.length; j += 2) (j ? ctx.lineTo : ctx.moveTo).call(ctx, l.p[j], l.p[j + 1]); ctx.fill(); } }
  ctx.lineCap = 'round'; for (let ax = tx - n; ax <= tx + n; ax++) for (let az = tz - n; az <= tz + n; az++) { const e = index.get(ax + ',' + az); if (!e) continue; for (const [ri, j] of e.r) { const rd = DATA.R[ri], p = rd.p; ctx.strokeStyle = rd.c <= 2 ? '#f6c026' : rd.c <= 4 ? '#e8e2d0' : '#2f2f31'; ctx.lineWidth = Math.max(rd.w, 5); ctx.beginPath(); ctx.moveTo(p[j], p[j + 1]); ctx.lineTo(p[j + 2], p[j + 3]); ctx.stroke(); } }
}
