// Sapno ka Shehar homes: one interior per rung of the ladder (D.LADDER), each more lavish than the last. Built only when
// the player walks in (one home at a time, rebuilt after a move), from the same box/sign helpers as the other interiors.
// The spouse waits here after the shaadi, owned jewellery sits in a glass case and the bigger homes show the cars in a garage.
import * as THREE from 'three';

export const HOME_O = { x: 2000, z: 2600 }; // far from the city and the other interiors
// room size, floor, wall colour, ceiling height, where you wake up
const SPEC = {
  pg:    { W: 14, D: 12, H: 5,   floor: 'tile',   wall: 0xd9d2b8 },
  room:  { W: 18, D: 14, H: 5.5, floor: 'wood',   wall: 0xe8dcc4 },
  flat:  { W: 26, D: 20, H: 6,   floor: 'marble', wall: 0xf2ead8 },
  pent:  { W: 36, D: 26, H: 7,   floor: 'parquet', wall: 0xe9e4da },
  kothi: { W: 48, D: 34, H: 9,   floor: 'chess',  wall: 0xeedfc4 },
  farm:  { W: 64, D: 44, H: 10,  floor: 'parquet', wall: 0xe8dcc2 },
};
export const homeSpec = id => SPEC[id];
const GOLD = 0xe8b923;

// K: the game's helpers { bx, cyl, sph, sign, table, chair, addCol, glow, mat, makeRoom, makeVehicle, texFrom, pick }
export function buildHome(K, id, o) {
  const S = SPEC[id]; const ox = HOME_O.x, oz = HOME_O.z, W = S.W, D2 = S.D, H = S.H, back = oz - D2 / 2, L = ox - W / 2, R = ox + W / 2;
  const g = K.makeRoom('home', ox, oz, W, D2, H, S.floor, S.wall, id === 'pg' ? 2 : 4);
  const { bx, cyl, sph, sign, glow } = K; const col = (x0, x1, z0, z1) => K.addCol('home', x0, x1, z0, z1);
  const spot = { bed: null, spouse: null, wake: null }; // where things are, for the game

  // ---- furniture pieces
  const bed = (x, z, w, l, frame, sheet, ry) => { const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry || 0; g.add(b); bx(b, w, 0.5, l, frame, 0, 0.35, 0); bx(b, w - 0.1, 0.25, l - 0.1, sheet, 0, 0.72, 0.05); bx(b, w, 1.4, 0.2, frame, 0, 0.8, -l / 2); for (const s of w > 2.4 ? [-w / 4, w / 4] : [0]) bx(b, w > 2.4 ? w / 2 - 0.3 : w - 0.4, 0.22, 0.5, 0xffffff, s, 0.95, -l / 2 + 0.45); col(x - w / 2, x + w / 2, z - l / 2, z + l / 2); return b; };
  const sofa = (x, z, w, c, ry) => { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; g.add(s); bx(s, w, 0.5, 1.1, c, 0, 0.45, 0); bx(s, w, 0.9, 0.3, c, 0, 0.95, -0.45); bx(s, 0.3, 0.75, 1.1, c, -w / 2, 0.7, 0); bx(s, 0.3, 0.75, 1.1, c, w / 2, 0.7, 0); for (let i = 0; i < Math.floor(w / 1.2); i++) bx(s, 0.5, 0.45, 0.15, 0xf2e2c4, -w / 2 + 0.8 + i * 1.2, 1.0, -0.25); const hw = Math.abs(Math.sin(ry || 0)) > 0.5; col(x - (hw ? 0.6 : w / 2), x + (hw ? 0.6 : w / 2), z - (hw ? w / 2 : 0.6), z + (hw ? w / 2 : 0.6)); return s; };
  const tv = (x, z, w, ry) => { const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry || 0; g.add(t); bx(t, w + 0.4, 0.5, 0.6, 0x3a2a1a, 0, 0.25, 0); bx(t, w, w * 0.56, 0.08, 0x0a0a0a, 0, 0.6 + w * 0.3, -0.1); bx(t, w - 0.12, w * 0.56 - 0.12, 0.02, 0, 0, 0.6 + w * 0.3, -0.05, { mat: glow(K.pick([0x2a6fd8, 0x1f8a5a, 0xc8462a])) }); return t; };
  const rug = (x, z, w, d, c) => bx(g, w, 0.03, d, c, x, 0.03, z);
  const plant = (x, z, s) => { cyl(g, 0.3 * s, 0.6 * s, 0x8a4a2a, x, 0.3 * s, z); sph(g, 0.55 * s, 0x2f7a35, x, 0.9 * s + 0.2, z); sph(g, 0.4 * s, 0x3b8a3a, x + 0.2 * s, 1.3 * s + 0.2, z); };
  const fan = (x, z) => { cyl(g, 0.05, 0.6, 0x666666, x, H - 0.3, z); for (let i = 0; i < 3; i++) { const b = bx(g, 1.4, 0.04, 0.22, 0x9a8f7a, x, H - 0.6, z); b.rotation.y = i * 2.09; b.translateX(0.7); } };
  const chandelier = (x, z, s) => { cyl(g, 0.04, H * 0.25, GOLD, x, H - H * 0.125, z, glow(GOLD)); cyl(g, 0.9 * s, 0.12, GOLD, x, H * 0.72, z, glow(GOLD)); for (let i = 0; i < 10; i++) { const a = i * 0.628; sph(g, 0.14 * s, 0, x + Math.cos(a) * 0.85 * s, H * 0.68, z + Math.sin(a) * 0.85 * s, glow(0xfff2c8)); } sph(g, 0.4 * s, 0, x, H * 0.62, z, glow(0xfff6dc)); };
  const frame = (x, y, z, w, h, c, ry) => { const f = bx(g, w, h, 0.08, GOLD, x, y, z); f.rotation.y = ry || 0; const p = bx(g, w - 0.2, h - 0.2, 0.02, c, x, y, z); p.rotation.y = ry || 0; p.translateZ(0.05); };
  const counter = (x, z, w, d, c) => { bx(g, w, 1.0, d, c, x, 0.5, z); bx(g, w + 0.05, 0.08, d + 0.05, 0x2b2b2b, x, 1.04, z); col(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };
  const fridge = (x, z) => { bx(g, 1.0, 2.2, 0.9, 0xd8dde2, x, 1.1, z); bx(g, 0.05, 0.6, 0.05, 0x777777, x + 0.38, 1.4, z + 0.47); col(x - 0.5, x + 0.5, z - 0.45, z + 0.45); };
  const dining = (x, z, n) => { const w = 1.6 + n * 0.5; K.table(g, x, z, w, 1.8, 0x5a3a22); for (let i = 0; i < n; i++) { const cx = x - w / 2 + 0.7 + i * ((w - 1.4) / Math.max(1, n - 1)); K.chair(g, cx, z - 1.3, 0x7c4a2b); const c2 = K.chair(g, cx, z + 1.3, 0x7c4a2b); } col(x - w / 2, x + w / 2, z - 1.6, z + 1.6); };
  const windowView = (x, y, z, w, h, night) => { // a big window onto the city: skyline painted on a glowing plane
    const t = K.texFrom((c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#7fb2e6'); gr.addColorStop(1, '#d9e8f2'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); for (let i = 0; i < 26; i++) { const bw = 14 + Math.random() * 30, bh = ch * (0.25 + Math.random() * 0.55), bxp = Math.random() * cw; c.fillStyle = K.pick(['#8ea3b8', '#a7b5c4', '#6f8499', '#b9c4cf']); c.fillRect(bxp, ch - bh, bw, bh); c.fillStyle = 'rgba(255,240,190,.55)'; for (let yy = ch - bh + 6; yy < ch - 4; yy += 9) for (let xx = bxp + 3; xx < bxp + bw - 3; xx += 6) if (Math.random() < 0.3) c.fillRect(xx, yy, 2, 4); } }, 512, 192, 1, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); g.add(m);
    for (let i = 0; i <= Math.round(w / 3); i++) bx(g, 0.12, h, 0.12, 0xdadada, x - w / 2 + i * (w / Math.round(w / 3)), y, z + 0.05); bx(g, w, 0.15, 0.15, 0xdadada, x, y - h / 2, z + 0.05); bx(g, w, 0.15, 0.15, 0xdadada, x, y + h / 2, z + 0.05);
  };
  const lamp = (x, z) => { cyl(g, 0.25, 0.08, 0x2b2b2b, x, 0.04, z); cyl(g, 0.04, 1.8, GOLD, x, 0.95, z, glow(GOLD)); cyl(g, 0.38, 0.5, 0, x, 2.0, z, glow(0xfff0c8)); };
  const cove = c => { for (const [x, z, w, d] of [[ox, back + 0.4, W - 1, 0.1], [L + 0.4, oz, 0.1, D2 - 1], [R - 0.4, oz, 0.1, D2 - 1]]) bx(g, w, 0.08, d, 0, x, H - 0.25, z, { mat: glow(c) }); };
  const accent = (c, trim) => { bx(g, W - 1.4, H - 1.2, 0.06, c, ox, (H - 1.2) / 2 + 0.3, back + 0.33); for (const y of [0.35, H - 0.9]) bx(g, W - 1.4, 0.1, 0.08, 0, ox, y, back + 0.36, { mat: glow(trim) }); for (let i = 1; i < 6; i++) bx(g, 0.08, H - 1.3, 0.08, 0, L + 0.7 + i * (W - 1.4) / 6, (H - 1.2) / 2 + 0.3, back + 0.36, { mat: glow(trim) }); };
  const curtains = (x, w, z, c) => { for (const s of [-1, 1]) bx(g, 1.2, H - 1, 0.25, c, x + s * (w / 2 + 0.6), (H - 1) / 2 + 0.3, z + 0.5); };
  const jewels = (x, z) => { // glass case with every owned piece: gold glows, the diamond set sparkles
    const b = o.bling || []; bx(g, 2.4, 1.0, 1.0, 0x3a2a1a, x, 0.5, z); const gm = new THREE.MeshLambertMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.28 }); bx(g, 2.4, 0.9, 1.0, 0, x, 1.45, z, { mat: gm }); col(x - 1.2, x + 1.2, z - 0.5, z + 0.5);
    b.forEach((k, i) => { const px = x - 0.9 + (i % 4) * 0.6, pz = z - 0.2 + Math.floor(i / 4) * 0.4; const c = k === 'heera' ? 0xeaf8ff : GOLD; const tor = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 16), glow(c)); tor.position.set(px, 1.12, pz); tor.rotation.x = -1.2; g.add(tor); });
    if (b.length) sign(g, 'ZEVAR', b.length + ' cheezein', '#2a241b', '#e8c27a', 1.6, 0.4, x, 2.2, z - 0.52);
  };
  const garage = (x, z, w) => { // owned cars behind a glass wall
    const cars = (o.vehicles || []).filter(v => v !== 'naav'); bx(g, w, 0.04, 8, 0x5b5b5b, x, 0.03, z); sign(g, 'GARAGE', cars.length ? cars.length + ' gaadiyan' : 'Khaali: pehli gaadi le', '#1b1410', '#f6c026', 4, 0.8, x, 4.2, z - 3.9);
    cars.slice(0, 5).forEach((v, i) => { const c = K.makeVehicle(v, null, (o.mods || {})[v] || {}, o.plate); c.position.set(x - w / 2 + 3 + i * ((w - 6) / Math.max(1, Math.min(5, cars.length) - 1 || 1)), 0.05, z); c.rotation.y = Math.PI * 0.85; g.add(c); });
    col(x - w / 2, x + w / 2, z - 4, z + 4);
  };

  if (id === 'pg') { // Sharma PG: two cots, a steel almirah, a bucket and the house rules
    bed(L + 2, back + 2.5, 1.6, 3.4, 0x6b5a45, 0x5d7ba6); bed(R - 2, back + 2.5, 1.6, 3.4, 0x6b5a45, 0xa65d5d); spot.bed = { x: L + 2, z: back + 5 };
    bx(g, 0.2, 0.05, 3, 0xd9cfae, R - 2, 0.74, back + 2.5); // the roommate's crumpled sheet
    bx(g, 1.4, 2.4, 0.8, 0x8a9096, ox, 1.2, back + 0.6); col(ox - 0.7, ox + 0.7, back, back + 1);
    K.chair(g, ox + 1.2, back + 4, 0x2f6fb0); cyl(g, 0.35, 0.5, 0x2f6fb0, R - 1, 0.25, oz + 2); fan(ox, oz - 1);
    bx(g, 1.2, 0.08, 0.08, 0, ox, H - 0.4, back + 0.35, { mat: glow(0xffffff) });
    sign(g, 'SHARMA PG · NIYAM', 'Gate raat 11 baje band · Khana 8:30 · Bijli bachao', '#fff4d8', '#d7331f', 4.2, 1.1, ox - 4, 2.4, back + 0.32);
    sign(g, 'SAPNA', 'Ek din apna ghar', '#1b1410', '#f6c026', 1.6, 0.6, L + 2, 2.4, back + 0.32);
  } else if (id === 'room') { // 1BHK in Sector 14: own double bed, a small TV, a kitchenette
    bed(L + 2.8, back + 3, 2.6, 3.6, 0x7c4a2b, 0xd7a35a); spot.bed = { x: L + 2.8, z: back + 6 }; rug(L + 2.8, back + 6.5, 3, 2, 0x8a3b3b);
    tv(R - 3, back + 0.6, 1.8); sofa(R - 3, back + 5, 2.6, 0x2e6bd1, Math.PI); counter(ox, back + 0.7, 4, 1.2, 0xf2ead8); fridge(ox + 2.6, back + 0.7); cyl(g, 0.25, 0.1, 0x333333, ox - 1, 1.12, back + 0.7);
    plant(R - 1, oz + 3, 1); fan(ox, oz); frame(L + 0.4, 2.6, oz, 1.6, 1.1, 0x5aa0d8, Math.PI / 2); windowView(ox - 3.5, 2.8, back + 0.32, 3, 1.8);
  } else if (id === 'flat') { // 2BHK in Sushant Lok: a bedroom behind a wall, a living room with a dining table
    bx(g, 0.3, H, D2 * 0.55, S.wall, ox - 3, H / 2, back + D2 * 0.275, { col: 'home' });
    bed(L + 5, back + 3.2, 2.8, 3.8, 0x5a3a22, 0xe6d3b8); spot.bed = { x: L + 5, z: back + 6.4 }; bx(g, 2, 2.6, 0.8, 0x7c4a2b, L + 1.4, 1.3, back + 0.6); plant(L + 1.2, back + 7, 0.9);
    lamp(ox - 1.8, back + 1.2); lamp(R - 1.2, oz + 6); tv(ox + 6, back + 0.6, 2.6); sofa(ox + 6, back + 6, 4, 0x8b3fc4, Math.PI); rug(ox + 6, back + 4, 5, 3, 0xc9b27a); dining(ox + 4, oz + 4, 4);
    counter(R - 1, oz - 1, 1.2, 5, 0xf2ead8); fridge(R - 0.8, oz + 3); fan(ox + 6, back + 4); frame(ox + 1, 3, back + 0.32, 2.2, 1.4, 0xd8a24a); frame(ox + 10, 3, back + 0.32, 1.4, 1.4, 0x3a7a5a);
    windowView(ox + 6, 3.4, back + 0.32, 4, 1.6); plant(R - 1, back + 1.2, 1.1);
  } else if (id === 'pent') { // penthouse: a glass wall onto the skyline, a bar, a chandelier, a king bed
    windowView(ox, H / 2, back + 0.32, W - 6, H - 1.2); curtains(ox, W - 6, back, 0x6b2a2a); cove(0xffd9a0); lamp(L + 1.5, oz - 2); lamp(R - 1.5, oz - 8); rug(L + 4, oz + 2, 5, 5, 0xc9b27a); bed(L + 4, oz + 2, 3.4, 4, 0xf2f2f2, 0x2a3d6b, Math.PI / 2); spot.bed = { x: L + 7, z: oz + 2 };
    sofa(ox, oz - 3, 6, 0xf5f5f5, Math.PI); sofa(ox + 4, oz - 6, 3.5, 0xf5f5f5, -Math.PI / 2); rug(ox + 1, oz - 5.5, 7, 4, 0x1b1b1b); tv(ox, oz + 0.2, 3.4, Math.PI);
    counter(R - 3, oz + 4, 5, 1.2, 0x1b1b1b); for (let i = 0; i < 9; i++) cyl(g, 0.1, 0.5, K.pick([0x5a2d0c, 0x1f5f2a, 0xd9a520, 0x7a1c1c]), R - 5.2 + i * 0.55, 1.35, oz + 4); for (const dx of [-1.5, 0, 1.5]) cyl(g, 0.28, 1.1, 0xb9bec4, R - 3 + dx, 0.55, oz + 5.6);
    chandelier(ox, oz - 5, 1.1); plant(L + 1.2, back + 1.5, 1.4); plant(R - 1.2, back + 1.5, 1.4); frame(R - 0.4, 3.2, oz - 4, 2.6, 1.8, 0xc8462a, -Math.PI / 2);
    jewels(L + 3, oz + 7.5); dining(ox - 4, oz + 7, 4);
  } else if (id === 'kothi') { // kothi: a double-height hall, staircase, two chandeliers, a mandir, a garage
    for (let i = 0; i < 12; i++) bx(g, 4, 0.4, 0.9, 0xeadfc8, L + 4, 0.2 + i * 0.4, back + 3 + i * 0.9 - 0.45 + 0.45, { col: i < 3 ? 'home' : null }); bx(g, 10, 0.4, 5, 0xeadfc8, L + 7, 4.8, back + 2.5); for (let i = 0; i < 10; i++) cyl(g, 0.05, 1, GOLD, L + 2.2 + i, 5.5, back + 5, glow(GOLD));
    accent(0x7a2a2a, GOLD); cove(0xffe2a8); for (const [lx, lz] of [[L + 1.5, oz + 9], [R - 1.5, oz - 6], [ox - 5.5, oz + 1.5], [ox + 5.5, oz + 1.5]]) lamp(lx, lz);
    chandelier(ox - 6, oz - 2, 1.4); chandelier(ox + 6, oz - 2, 1.4); sofa(ox, oz, 7, 0x7a1c1c, Math.PI); sofa(ox - 4.5, oz - 3.5, 4, 0x7a1c1c, Math.PI / 2); sofa(ox + 4.5, oz - 3.5, 4, 0x7a1c1c, -Math.PI / 2); rug(ox, oz - 3.5, 9, 6, 0x6b2a2a); K.table(g, ox, oz - 3.5, 3, 1.6, 0x3a2a1a);
    tv(ox, back + 0.8, 4.2); bed(R - 5, back + 3.5, 3.6, 4.2, 0x5a3a22, 0xf6c026); spot.bed = { x: R - 5, z: back + 7 }; dining(R - 8, oz + 6, 6);
    bx(g, 3, 3.2, 1.6, 0xfff4d8, L + 2, 1.6, oz + 4); bx(g, 2.4, 1.6, 0.2, 0, L + 2.8, 1.8, oz + 4, { mat: glow(0xff9a2a) }); sign(g, 'ॐ', null, '#fff4d8', '#d7331f', 0.8, 0.8, L + 2.8, 2.9, oz + 4.82, Math.PI / 2);
    frame(ox, 6, back + 0.32, 4, 2.6, 0x8a5a2a); jewels(ox - 9, back + 1.5); plant(L + 1.5, back + 1.5, 1.6); plant(R - 1.5, oz + 10, 1.6);
    garage(ox + 8, oz + 11, 22); windowView(ox + 9, 5.2, back + 0.32, 8, 3);
  } else if (id === 'farm') { // farmhouse: indoor pool, home theatre, bar, three chandeliers, a garage for the whole fleet
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshPhongMaterial({ color: 0x2aa6d8, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.85 })); pool.rotation.x = -Math.PI / 2; pool.position.set(L + 10, 0.06, oz - 4); g.add(pool); bx(g, 15, 0.12, 9, 0xeadfc8, L + 10, 0.02, oz - 4); col(L + 3, L + 17, oz - 8, oz);
    for (const dx of [-4, 0, 4]) { bx(g, 1, 0.3, 2, 0xffffff, L + 10 + dx, 0.15, oz + 1.6); }
    windowView(ox, H / 2, back + 0.32, W - 8, H - 2); curtains(ox, W - 8, back, 0xe8c27a); cove(0xffe2a8); for (const [lx, lz] of [[L + 1.5, oz + 4], [R - 1.5, oz - 8], [ox - 3, oz + 4], [ox + 9, oz + 4]]) lamp(lx, lz); rug(ox - 4, oz + 8, 12, 6, 0x7a1c1c); chandelier(ox - 10, oz - 2, 1.5); chandelier(ox, oz - 2, 1.8); chandelier(ox + 10, oz - 2, 1.5);
    sofa(ox + 2, oz + 2, 8, 0xf2e2c4, Math.PI); sofa(ox + 8, oz - 2, 5, 0xf2e2c4, -Math.PI / 2); rug(ox + 3, oz - 2, 10, 7, 0x2a3d6b); tv(ox + 3, oz - 7.5, 6);
    counter(R - 4, back + 3, 6, 1.4, 0x1b1b1b); for (let i = 0; i < 12; i++) cyl(g, 0.1, 0.5, K.pick([0x5a2d0c, 0x1f5f2a, 0xd9a520, 0x7a1c1c, 0x2a3d6b]), R - 6.7 + i * 0.5, 1.35, back + 3);
    bx(g, 4, 0.9, 2.2, 0x1f6a3a, ox + 14, 0.9, oz + 6); bx(g, 4.2, 0.2, 2.4, 0x5a3a22, ox + 14, 0.9, oz + 6); col(ox + 12, ox + 16, oz + 4.9, oz + 7.1); // pool table
    bed(R - 6, oz + 6, 4, 4.4, 0xf2f2f2, 0x7a1c1c, -Math.PI / 2); spot.bed = { x: R - 9, z: oz + 6 }; dining(ox - 4, oz + 8, 6); jewels(L + 4, back + 1.5);
    for (const [px, pz] of [[L + 2, back + 2], [R - 2, back + 2], [L + 2, oz + 12], [ox + 6, back + 2]]) plant(px, pz, 1.8);
    sign(g, 'CHAUDHARY FARMS', 'Bhondsi · Est. ' + new Date().getFullYear(), '#1b1410', '#f6c026', 8, 1.4, ox, H - 1.6, back + 0.34);
    garage(ox - 12, oz + 14, 28);
  }
  spot.wake = spot.bed || { x: ox, z: oz }; spot.spouse = { x: spot.wake.x + 2, z: spot.wake.z + 1.2 };
  return { g, spot, W, D: D2, H };
}

// the footpath "home" next to Rajiv Chowk: a tarp, a bedroll, a bag and a steel glass
export const CAMP = { x: 45.6, z: 66.3 }; // on the pavement in front of the Rajiv Chowk shops (they end at z 64.5)
export function buildCamp(K, parent) {
  const { bx, cyl } = K; const x = CAMP.x, z = CAMP.z; const g = new THREE.Group(); g.position.set(x, 0.2, z); parent.add(g);
  bx(g, 3.4, 0.06, 1.4, 0x6b6250, 0, 0.03, 0); bx(g, 2.2, 0.16, 0.9, 0x8a3b3b, -0.3, 0.12, 0); bx(g, 0.6, 0.2, 0.5, 0xe6dccb, -1.2, 0.22, 0);
  const tarp = bx(g, 3.6, 0.04, 2.2, 0x2563b8, 0, 1.6, -0.2); tarp.rotation.x = 0.35; for (const dx of [-1.7, 1.7]) cyl(g, 0.04, 1.8, 0x555555, dx, 0.9, 0.6);
  bx(g, 0.7, 0.5, 0.4, 0x3a5a2a, 1.3, 0.25, 0.2); cyl(g, 0.07, 0.18, 0xb9bec4, 1.0, 0.1, 0.6);
  cyl(g, 0.12, 0.3, 0, 0.9, 0.17, 0.2, K.glow(0xffb347)); // a small lantern, so the camp shows at night
  K.sign(g, 'SAPNO KA SHEHAR', 'Aaj footpath, kal apna ghar', '#1b1410', '#f6c026', 2.6, 0.6, 0, 2.3, -1.0);
  return g;
}
