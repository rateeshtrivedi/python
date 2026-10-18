// Gurugram Life client: 3D world, controls, UI and all social systems. Money and shared state live on the server.
import * as THREE from 'three';
import * as D from '../shared/data.js';
import { net } from './net.js';
import * as A from './audio.js';
import * as I18N from './i18n.js';
import * as HU from './humans.js';
import * as RL from './realism.js';
import * as DG from './dogs.js';
import { VOICES } from './voices.js';

// ================================================================ UTIL
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
const now = () => performance.now() / 1000;
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function angLerp(a, b, t) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
function el(tag, attrs, ...kids) { const e = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } for (const c of kids) { if (c == null) continue; e.append(c.nodeType ? c : document.createTextNode(c)); } return e; }
const hex = c => '#' + c.toString(16).padStart(6, '0');

// ================================================================ TEXT DATA (realistic local names, no real brands)
const TAUNTS = ['Ram Ram bhai!', 'Ke haal sai bhai?', 'Ae lattu, ke dekhe se?', 'Chaudhar na jhaad mere aage!', 'Bawli boonch!', 'Tere jaise ghane dekhe sain', 'Kanpatti baja dunga, bhaag ja!', 'Hatt ghanchakkar!', 'Maare jaange tere!', 'Aaja, do-do haath ho jaan', 'Ghana shana mat ban', 'Bade bhai ne bula lunga!', 'Gaadi side mein laga, chhore!', 'Yo sheher mera se!'];
// what a street fighter keeps shouting while the fight is on (all recorded, see voices.js)
const ANGRY_LINES = ['Aaja, aaja!', 'Bas itna hi dum se?', 'Maar dunga tujhe!', 'Tu to gaya aaj!', 'Ek aur aa jaa!', 'Hosh mein aa ja, chhore!', 'Teri aisi ki taisi!', 'Chhodunga nahi tujhe!', 'Dekh ke maar, andhe!', 'Haath to chala, darpok!', 'Abhi bataata hoon tujhe kaun se main!', 'Ke dekhe se lattu?', 'Mere te panga?', 'Ruk tu, batata hoon', 'Ab dekh tu!'];
const NPC_LINES = ['Ram Ram!', 'Aaj to garmi ghani se', 'Bhai metro kit se?', 'Gaadi side mein laga!', 'Ke bolya?', 'Chai pi le bhai', 'Iffco Chowk pe jam lag rya', 'Rent fir badh gaya', 'Kati jaa rya se?', 'Oye hoye, ke swag se!', 'AQI 400 se, mask laga le'];
const CHHORA_LINES = ['Ke dekhe se lattu?', 'Aaja, haath dekh mere', 'Teri to... rehn de!', 'Dalal ka chhora se main!', 'Bhaag ja, warna kut jaega', 'Chaudhar na jhaad'];
const PASSENGERS = ['Sharma ji', 'Pinky didi', 'Rahul from Cyber City', 'Ramphal Ahlawat', 'Neha ma\'am', 'Bunty', 'Chaudhary saab', 'Ankit bhai', 'Sunita aunty', 'Monu', 'Dimple', 'Jassi paaji'];
const RIDE_CHAT = ['Bhaiya AC chala do', 'Jaldi chalo, meeting hai!', 'Iffco Chowk pe jam mat lagana', 'Bhai gaana badal de', 'Ke haal sai driver sahab?', 'Thoda dheere bhai', 'UPI chalega na?', 'Last ride thi aaj ki, 5 star pakka'];
const GYAAN = ['Chaudhary sahab kehve: "Paisa aur pasina, dono kamaane padein se."', 'Chaudhary sahab kehve: "Jo Iffco Chowk ke jam se bach gaya, wo zindagi mein kahin na atkega."', 'Chaudhary sahab kehve: "Chhaach pi, dimaag thanda rakh."', 'Chaudhary sahab kehve: "Gaadi ho na ho, swag hona chahiye."', 'Chaudhary sahab kehve: "Rent time pe de, warna Yadav ji ki gaali khaani padegi."', 'Chaudhary sahab kehve: "Peeke gaadi chalayega to naka pe pakda jaega."'];
const OFFICE_GOSSIP = ['Pantry gossip: "Malhotra sir aaj phir late aaye."', 'Pantry gossip: "Appraisal mein sabko 3% milega, sun rya hoon."', 'Pantry gossip: "Naya intern Rapid Metro se aata se."', 'Pantry gossip: "Friday ko Neon Nights chalein?"'];
const QUESTS = [['Mithai ka dabba Sushant Lok mein beti ke sasural pahuncha', 0, 300], ['Thar ki chaabi Golf Course Road wale bete ko de aa', -300, 0], ['Zameen ke kaagaz DLF Cyber City office le ja', 0, -300], ['Shaadi ka card Old Gurgaon mein de aa', 300, 150], ['Doodh ki balti Manesar factory wale munshi ko de aa', 300, 300]];
const MARKET_SHOPS = ['Bansal Sweets', 'Kumar Kirana Store', 'Chaudhary Mobile Point', 'Jaat Ji Electronics', 'Sharma Tailors', 'Mamta Beauty Parlour', 'Lucky Chemist', 'Gupta Bartan Bhandar', 'Raju Chaat Bhandar', 'Desi Ghee Halwai', 'Dahiya Hardware', 'Ritu Boutique', 'Gupta Chaat Corner', 'Pappu Paan Bhandar', 'Sethi Opticals', 'Om Sai Dairy'];
const SHOP_COLORS = ['#d7331f', '#1a8a4a', '#2563b8', '#f6c026', '#8b3fc4', '#e86a17', '#0f766e', '#b91c5c'];
const XROAD = { '-375': 'Southern Peripheral Road', '-225': 'Golf Course Road', '-75': 'MG Road', '75': 'Sohna Road', '225': 'Old Railway Road', '375': 'Badshahpur Road' };
const ZROAD = { '-375': 'NH-48', '-225': 'Dwarka Expressway', '-75': 'Huda City Centre Road', '75': 'Sheetla Mata Road', '225': 'Basai Road', '375': 'Golf Course Ext. Road' };
const ROADS = D.ROADS, DIST = D.DIST;
const INTERIOR_NAMES = { mall: 'Ambience Mall', office: 'TechNova Towers, Floor 7', theka: 'Desi Theka No.1', dhaba: 'Sher-e-Haryana Dhaba', club: 'Neon Nights, Sector 29' };
const DOOR_NAMES = { mall: 'Ambience Island', office: 'DLF Cyber City', theka: 'Sohna Road', dhaba: 'Sector 29', club: 'Sector 29' };

// ================================================================ LOCAL STATE (per device)
const L = Object.assign({ hunger: 80, tut: 0, drinks: 0 }, lsGet('gl_local') || {});
const saveLocal = () => lsSet('gl_local', L);
let P = null; // profile from the server (money, level, items...)
const G = { inside: null, x: 0, z: 48, r: Math.PI, hp: 100, veh: null, vs: 0, yaw: Math.PI, pitch: 0.32, dist: 9, job: null, started: false, punchCD: 0, tipsy: 0, hangover: false, gyaanT: 0, chaiT: 0, shiftCD: 0, frozen: false, modal: false, dance: false, selfie: false, nakaCD: 0, tollCD: 0, impound: 0, chase: null, beef: null, ev: null, belt: null, party: null, roast: null, myId: null, timeOffset: 0, lastLoc: '' };

// ================================================================ THREE SETUP
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0x9fc8e8), SKY_DUSK = new THREE.Color(0xf09a52), SKY_NIGHT = new THREE.Color(0x0e1530), SKY_IN = new THREE.Color(0x2a2119), SKY_CLUB = new THREE.Color(0x0b0614);
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(0x9fc8e8, 160, 560);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 640); // beyond the fog nothing is visible, so nothing is drawn
const hemi = new THREE.HemisphereLight(0xfff1d6, 0x55603f, 0.95); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(120, 200, 80); scene.add(sun);
RL.init(renderer, scene, sun, matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 520); // sky, sun shadows, reflections
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();

const MATS = {};
function mat(c) { if (!MATS[c]) MATS[c] = new THREE.MeshLambertMaterial({ color: c }); return MATS[c]; }
function glow(c) { const k = 'g' + c; if (!MATS[k]) MATS[k] = new THREE.MeshBasicMaterial({ color: c }); return MATS[k]; }
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 14), SPH = new THREE.SphereGeometry(1, 14, 10), CONE = new THREE.ConeGeometry(1, 1, 10);
const LOWSPH = new THREE.IcosahedronGeometry(1, 1), LUMP = new THREE.IcosahedronGeometry(1, 0); // 80 and 20 triangles, for crowds and garbage
const TORUS = new THREE.TorusGeometry(1, 0.18, 6, 16);
const COL = { out: [] };
function addCol(zone, x0, x1, z0, z1) { (COL[zone] || (COL[zone] = [])).push({ x0, x1, z0, z1 }); }
function bx(parent, w, h, d, color, x, y, z, opt) { const m = new THREE.Mesh(BOX, (opt && opt.mat) || (typeof color === 'number' ? mat(color) : color)); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); if (opt && opt.col) addCol(opt.col, x - w / 2, x + w / 2, z - d / 2, z + d / 2); return m; }
function cyl(parent, r, h, color, x, y, z, m2) { const m = new THREE.Mesh(CYL, m2 || mat(color)); m.scale.set(r, h, r); m.position.set(x, y, z); parent.add(m); return m; }
function sph(parent, r, color, x, y, z, m2) { const m = new THREE.Mesh(SPH, m2 || mat(color)); m.scale.set(r, r, r); m.position.set(x, y, z); parent.add(m); return m; }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function signCanvas(text, sub, bg, fg, w, h) {
  const c = document.createElement('canvas'); c.width = w || 512; c.height = h || 128; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(6, 6, c.width - 12, c.height - 12);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = sub ? c.height * 0.42 : c.height * 0.56; x.font = `800 ${fs}px "Baloo 2", "Mukta", sans-serif`;
  while (x.measureText(text).width > c.width - 30 && fs > 10) { fs -= 2; x.font = `800 ${fs}px "Baloo 2", "Mukta", sans-serif`; }
  x.fillText(text, c.width / 2, sub ? c.height * 0.4 : c.height * 0.54);
  if (sub) { let s = c.height * 0.2; x.font = `700 ${s}px "Mukta", "Baloo 2", sans-serif`; while (x.measureText(sub).width > c.width - 30 && s > 8) { s -= 1; x.font = `700 ${s}px "Mukta", sans-serif`; } x.fillText(sub, c.width / 2, c.height * 0.77); }
  return c;
}
function sign(parent, text, sub, bg, fg, w, h, x, y, z, ry) {
  const ch = 128, cw = Math.min(1024, Math.round(ch * w / h)); const t = new THREE.CanvasTexture(signCanvas(text, sub, bg, fg, cw, ch)); t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m); return m;
}
const NARROW = () => Math.min(innerWidth, innerHeight) < 520; // a phone: name tags and speech bubbles get smaller
function labelSprite(text, opts) {
  opts = opts || {}; const fs = opts.fs || 44; const c = document.createElement('canvas'); const x = c.getContext('2d');
  x.font = `800 ${fs}px "Baloo 2", "Mukta", sans-serif`; const tw = Math.ceil(x.measureText(text).width);
  c.width = Math.min(1024, tw + fs); c.height = Math.round(fs * 1.5); x.font = `800 ${fs}px "Baloo 2", "Mukta", sans-serif`;
  x.fillStyle = opts.bg || 'rgba(27,20,16,.72)'; rrect(x, 2, 2, c.width - 4, c.height - 4, c.height / 2.4); x.fill();
  if (opts.border) { x.strokeStyle = opts.border; x.lineWidth = 4; x.stroke(); }
  x.fillStyle = opts.fg || '#fff4d8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); const sc = (opts.scale || 0.7) * ((opts.scale || 0.7) <= 0.7 && NARROW() ? 0.72 : 1); s.scale.set(sc * c.width / c.height, sc, 1); return s;
}
function disposeSprite(s) { if (!s) return; if (s.parent) s.parent.remove(s); s.material.map.dispose(); s.material.dispose(); }
function texFrom(draw, w, h, rx, ry) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }

const FACADES = {}, BMATS = {}, NIGHT_MATS = [];
function facadeBase(style) { return FACADES[style] || (FACADES[style] = RL.facade(style)); } // colour, night windows, glass reflection mask
function facadeMat(style, rw, rh) {
  const key = style + '_' + rw + '_' + rh; if (BMATS[key]) return BMATS[key]; const f = facadeBase(style);
  const tx = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rw, rh); t.anisotropy = 8; return t; };
  const glassy = ['glass', 'gold'].includes(style); // windows mirror the sky; curtain-wall towers most of all
  const m = new THREE.MeshLambertMaterial({ map: tx(f.c), emissive: 0xffffff, emissiveMap: tx(f.e), emissiveIntensity: 0, specularMap: tx(f.s), envMap: RL.envMap(), combine: THREE.MixOperation, reflectivity: glassy ? 0.62 : 0.4 }); NIGHT_MATS.push(m); BMATS[key] = m; return m;
}
function building(parent, x, z, w, d, h, style, zone) {
  const mx = facadeMat(style, Math.max(1, Math.round(d / 7)), Math.max(1, Math.round(h / 4.5))), mz = facadeMat(style, Math.max(1, Math.round(w / 7)), Math.max(1, Math.round(h / 4.5))), top = mat(0x6d665c);
  const m = new THREE.Mesh(BOX, [mx, mx, top, top, mz, mz]); m.scale.set(w, h, d); m.position.set(x, h / 2, z); parent.add(m);
  addCol(zone || 'out', x - w / 2, x + w / 2, z - d / 2, z + d / 2); if (h > 30) bx(parent, w * 0.3, 2.5, d * 0.3, 0x8a8a8a, x, h + 1.25, z); else if (h > 7 && !zone) cyl(parent, 0.8, 1.4, 0x1c1c1c, x + w * 0.3, h + 0.7, z - d * 0.3); return m; // black water tank on the roof
}

// ================================================================ CHARACTERS & VEHICLES
function makeChar(shirt, o) {
  o = o || {}; const g = new THREE.Group();
  const skin = mat(o.skin || pick([0xc68863, 0xb57650, 0xd9a07a, 0x9c6644])); const pants = mat(o.pants || pick([0x2b3550, 0x3a3a3a, 0x5b4632, 0x1f2b3d, 0xe9e4d6])); const shirtM = mat(shirt);
  const mk = (w, h, d, m, x, y, z, p) => { const mm = new THREE.Mesh(BOX, m); mm.scale.set(w, h, d); mm.position.set(x, y, z); (p || g).add(mm); return mm; };
  const hipL = new THREE.Group(); hipL.position.set(-0.22, 1.0, 0); g.add(hipL); const legL = mk(0.32, 0.95, 0.34, pants, 0, -0.47, 0, hipL);
  const hipR = new THREE.Group(); hipR.position.set(0.22, 1.0, 0); g.add(hipR); const legR = mk(0.32, 0.95, 0.34, pants, 0, -0.47, 0, hipR);
  const torso = mk(0.9, 1.0, 0.5, shirtM, 0, 1.5, 0);
  const shL = new THREE.Group(); shL.position.set(-0.6, 1.95, 0); g.add(shL); const armL = mk(0.24, 0.85, 0.26, shirtM, 0, -0.4, 0, shL);
  const shR = new THREE.Group(); shR.position.set(0.6, 1.95, 0); g.add(shR); const armR = mk(0.24, 0.85, 0.26, shirtM, 0, -0.4, 0, shR);
  const handR = mk(0.22, 0.2, 0.22, skin, 0, -0.88, 0, shR), handL = mk(0.22, 0.2, 0.22, skin, 0, -0.88, 0, shL);
  const head = new THREE.Mesh(SPH, skin); head.scale.set(0.33, 0.36, 0.33); head.position.set(0, 2.32, 0); g.add(head);
  const hair = new THREE.Mesh(SPH, mat(o.hair || 0x1a1410)); hair.scale.set(0.35, 0.22, 0.35); hair.position.set(0, 2.5, -0.02); g.add(hair);
  mk(0.06, 0.06, 0.02, mat(0x111111), -0.11, 2.36, 0.31); mk(0.06, 0.06, 0.02, mat(0x111111), 0.11, 2.36, 0.31);
  const hatG = new THREE.Group(); g.add(hatG); const blingG = new THREE.Group(); g.add(blingG); const hairG = new THREE.Group(); g.add(hairG); const bodyG = new THREE.Group(); g.add(bodyG);
  const blingL = new THREE.Group(); shL.add(blingL); const blingR = new THREE.Group(); shR.add(blingR);
  g.userData = { hipL, hipR, shL, shR, torso, armL, armR, hatG, blingG, blingL, blingR, hair, head, legL, legR, handL, handR, hairG, bodyG, walk: 0, punchT: 0, danceT: 0, dress: randomDress(shirt, o) };
  HCHARS.push(g); if (HU.HUMANS.ready) humanize(g);
  return g;
}
// ---- realistic bodies (humans.js). Every character keeps its box figure for far away / before the models load;
// near the camera it shows the real body instead (see updateHumans for the distance and count limits).
const HCHARS = [];
function randomDress(shirt, o) { const f = o.g ? o.g === 'f' : Math.random() < 0.22; return { g: f ? 'f' : 'm', skin: o.skin || pick(SKINS.slice(1)), hair: irnd(0, f ? 3 : 2), hairColor: pick([0x1a1410, 0x1a1410, 0x2b1d14, 0x4a2c17]), top: f ? irnd(0, 2) : pick([0, 0, 1, 2]), shirt, pants: o.pants || pick(PANTS_C), pantsStyle: 0, beard: f ? 0 : pick([0, 0, 'moonchh', 'full']) }; }
function humanize(g) {
  const u = g.userData; if (u.human || !HU.HUMANS.ready) return; const h = HU.makeHuman(u.dress.g); u.human = h;
  if (!u.blockG) { u.blockG = new THREE.Group(); for (const c of [...g.children]) if (c !== u.hatG && c !== u.blingG) u.blockG.add(c); g.add(u.blockG); }
  h.hatA.add(u.hatG); h.chestA.add(u.blingG); h.wristL.add(u.blingL); h.wristR.add(u.blingR); // accessories follow the real body
  g.add(h.root); HU.dressHuman(h, u.dress); humanHair(u); if (u.sit) HU.play(h, 'sit', 0); h.mixer.update(0.01); setHumanVis(u, false);
}
function unhumanize(g) { const u = g.userData, h = u.human; if (!h) return; g.remove(h.root); g.add(u.hatG); g.add(u.blingG); u.shL.add(u.blingL); u.shR.add(u.blingR); u.blockG.visible = true; u.human = null; }
function humanHair(u) { const hide = u.dress.g !== 'f' && ['pagdi', 'safa', 'cap', 'sehra'].includes(u.hatType); HU.setHairVisible(u.human, !hide); }
function setHumanVis(u, on) { if (u.human.root.visible === on && u.blockG.visible === !on) return; u.human.root.visible = on; u.blockG.visible = !on; }
let HFRAME = 0; const hFrustum = new THREE.Frustum(), hMat = new THREE.Matrix4(), hV = new THREE.Vector3(), hSph = new THREE.Sphere(new THREE.Vector3(), 2.2);
function visibleChain(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === scene) return true; } return false; }
function updateHumans(dt) { // which characters show their real body: nearest ones in view, a few on phones
  if (!HU.HUMANS.ready) return; HFRAME++;
  const phone = document.body.classList.contains('touch') || Math.min(innerWidth, innerHeight) < 520, R = phone ? 40 : 62, cap = Math.max(1, Math.round((phone ? 9 : 22) * (PERF.hk || 1)));
  hMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); hFrustum.setFromProjectionMatrix(hMat); const cand = [];
  for (let i = HCHARS.length - 1; i >= 0; i--) {
    const g = HCHARS[i], u = g.userData;
    if (!g.parent) { if ((u.gone = (u.gone || 0) + 1) > 600) { HCHARS.splice(i, 1); unhumanize(g); } continue; } u.gone = 0;
    if (!u.human) humanize(g);
    if (!visibleChain(g)) { setHumanVis(u, false); continue; }
    g.getWorldPosition(hV); const d = hV.distanceTo(camera.position); hSph.center.copy(hV).setY(hV.y + 1.2);
    if (g === player || g === PREVIEW) u.hd = -1; else if (d > R || !hFrustum.intersectsSphere(hSph)) { setHumanVis(u, false); continue; } else u.hd = d;
    cand.push(g);
  }
  cand.sort((a, b) => a.userData.hd - b.userData.hd);
  cand.forEach((g, i) => { const u = g.userData, on = i < cap; setHumanVis(u, on); if (on && u.animF !== HFRAME - 1 && u.animF !== HFRAME) u.human.mixer.update(dt); }); // idle breathing for people nobody animates
}
const GOLD = 0xe8b923;
// Avatar: body type, skin, hair, clothes style. Shared by the creator preview, your player and everyone else.
const SKINS = [0xf1c7a3, 0xd9a07a, 0xc68863, 0xa86b45, 0x7d4a2c], HAIRC = [0x1a1410, 0x4a2c17, 0x7a4b25, 0x9a9a9a, 0xb5651d];
const PANTS_C = [0x2b3550, 0xe9e4d6, 0x1b1b1b, 0x6b5a3a];
const AV = {
  hair: { m: ['Short', 'Spiky', 'Side part', 'Jooda (bun)', 'Bald'], f: ['Lambe khule', 'Ponytail', 'Choti', 'Jooda', 'Bob cut'] },
  top: { m: ['T-shirt', 'Kurta', 'Jacket'], f: ['Kurti', 'Top + jacket', 'Saree'] },
  acc: { m: ['Kuch nahi', 'Moonchh', 'Full daadhi'], f: ['Kuch nahi', 'Bindi', 'Jhumke'] },
  pants: ['Jeans', 'Pyjama', 'Kaali pant', 'Khaki'],
};
const defaultBody = () => ({ g: 'm', skin: 2, hair: 0, hc: 0, top: 0, pants: 0, acc: 1 });
function applyBody(ch, b, shirt) {
  const u = ch.userData; const f = !!b && b.g === 'f';
  dressFrom(ch, b, shirt);
  while (u.hairG.children.length) u.hairG.remove(u.hairG.children[0]); while (u.bodyG.children.length) u.bodyG.remove(u.bodyG.children[0]);
  if (!b) { u.hair.visible = true; u.torso.scale.set(0.9, 1.0, 0.5); u.shL.position.x = -0.6; u.shR.position.x = 0.6; return; } // passers-by keep their random looks
  const sk = mat(SKINS[b.skin] || SKINS[2]); u.head.material = sk; u.handL.material = sk; u.handR.material = sk;
  const pm = mat(PANTS_C[b.pants] || PANTS_C[0]); u.legL.material = pm; u.legR.material = pm;
  u.torso.scale.set(f ? 0.78 : 0.9, 1.0, f ? 0.46 : 0.5); u.shL.position.x = f ? -0.52 : -0.6; u.shR.position.x = f ? 0.52 : 0.6;
  const hm = mat(HAIRC[b.hc] || HAIRC[0]); const H = u.hairG; const cap = (sy) => { const c = new THREE.Mesh(SPH, hm); c.scale.set(0.36, sy || 0.24, 0.36); c.position.set(0, 2.49, -0.03); H.add(c); };
  u.hair.visible = false; const hs = b.hair | 0;
  if (!f) {
    if (hs === 0) cap(); else if (hs === 1) { cap(0.18); for (let k = 0; k < 5; k++) bx(H, 0.12, 0.22, 0.12, 0, -0.2 + k * 0.1, 2.68, -0.02, { mat: hm }); }
    else if (hs === 2) { cap(); bx(H, 0.34, 0.1, 0.18, 0, 0.08, 2.6, 0.2, { mat: hm }); } else if (hs === 3) { cap(); sph(H, 0.15, 0, 0, 2.72, -0.22, hm); }
  } else {
    cap(0.26);
    if (hs === 0) bx(H, 0.66, 0.95, 0.16, 0, 0, 2.08, -0.27, { mat: hm }); else if (hs === 1) { sph(H, 0.11, 0, 0, 2.55, -0.36, hm); bx(H, 0.14, 0.6, 0.14, 0, 0, 2.15, -0.4, { mat: hm }); }
    else if (hs === 2) { bx(H, 0.16, 1.2, 0.14, 0, 0, 1.85, -0.33, { mat: hm }); sph(H, 0.07, 0xd7331f, 0, 1.25, -0.33); } else if (hs === 3) sph(H, 0.19, 0, 0, 2.55, -0.38, hm);
    else bx(H, 0.7, 0.42, 0.5, 0, 0, 2.32, -0.08, { mat: hm });
  }
  const sm = mat(shirt || 0xd7331f); const top = b.top | 0; const Bd = u.bodyG;
  if (!f && top === 1) bx(Bd, 0.94, 0.6, 0.54, 0, 0, 0.78, 0, { mat: sm }); // kurta hem
  if (!f && top === 2 || f && top === 1) for (const x of [-1, 1]) bx(Bd, 0.24, 1.02, 0.54, 0x1b1b1b, x * (f ? 0.27 : 0.32), 1.5, 0); // open jacket
  if (f && top === 0) bx(Bd, 0.9, 0.65, 0.56, 0, 0, 0.75, 0, { mat: sm }); // kurti
  if (f && top === 2) { bx(Bd, 0.86, 1.0, 0.6, 0, 0, 0.5, 0, { mat: sm }); const p = bx(Bd, 0.2, 1.2, 0.54, 0xf6c026, 0.12, 1.5, 0.02); p.rotation.z = 0.45; } // saree + pallu
  const acc = b.acc | 0; // face extras live in bodyG so a pagdi can hide the hair but not the moonchh
  if (!f && acc === 1) bx(Bd, 0.3, 0.06, 0.06, 0, 0, 2.24, 0.32, { mat: hm }); if (!f && acc === 2) { bx(Bd, 0.42, 0.24, 0.12, 0, 0, 2.14, 0.24, { mat: hm }); bx(Bd, 0.3, 0.06, 0.06, 0, 0, 2.24, 0.32, { mat: hm }); }
  if (f && acc === 1) bx(Bd, 0.05, 0.05, 0.02, 0xd7331f, 0, 2.47, 0.33); if (f && acc === 2) for (const x of [-1, 1]) sph(Bd, 0.06, GOLD, x * 0.34, 2.2, 0, glow(GOLD));
}
function dressFrom(ch, b, shirt) { // the realistic body follows the same avatar choices as the box figure
  const u = ch.userData, d = u.dress; const prevG = d.g;
  if (b) Object.assign(d, { g: b.g === 'f' ? 'f' : 'm', skin: SKINS[b.skin] || SKINS[2], hair: b.hair | 0, hairColor: HAIRC[b.hc] || HAIRC[0], top: b.top | 0, pants: PANTS_C[b.pants] || PANTS_C[0], pantsStyle: (b.pants | 0) === 1 ? 1 : 0, beard: b.g === 'f' ? 0 : [0, 'moonchh', 'full'][b.acc | 0] || 0 });
  if (shirt != null) d.shirt = shirt;
  if (u.human && prevG !== d.g) { unhumanize(ch); humanize(ch); } else if (u.human) { HU.dressHuman(u.human, d); humanHair(u); }
}
function setLook(ch, look) {
  const u = ch.userData; const shirt = look.tint != null ? look.tint : look.shirt; const m = mat(shirt); u.torso.material = m; u.armL.material = m; u.armR.material = m;
  for (const grp of [u.hatG, u.blingG, u.blingL, u.blingR]) while (grp.children.length) grp.remove(grp.children[0]);
  u.hair.visible = true; const hat = look.hat; u.hatType = hat; applyBody(ch, look.body, look.tint != null ? look.tint : look.shirt); u.hairG.visible = !(look.body && look.body.g !== 'f' && (hat === 'pagdi' || hat === 'safa' || hat === 'cap'));
  if (hat === 'cap') { cyl(u.hatG, 0.36, 0.2, 0x1d4f91, 0, 2.58, 0); bx(u.hatG, 0.5, 0.05, 0.4, 0x1d4f91, 0, 2.5, 0.3); }
  else if (hat === 'pagdi') { u.hair.visible = false; cyl(u.hatG, 0.4, 0.36, 0xf28c1b, 0, 2.58, 0); sph(u.hatG, 0.18, 0xf6c026, 0, 2.78, 0.05); }
  else if (hat === 'safa') { u.hair.visible = false; cyl(u.hatG, 0.42, 0.4, 0xd7331f, 0, 2.6, 0); bx(u.hatG, 0.16, 0.9, 0.06, 0xd7331f, 0.1, 2.15, -0.36); }
  else if (hat === 'dupatta') { const dm = mat(look.shirt === 0xd7331f ? 0xf6c026 : 0xd7331f); const d1 = new THREE.Mesh(SPH, dm); d1.scale.set(0.4, 0.3, 0.4); d1.position.set(0, 2.45, -0.04); u.hatG.add(d1); bx(u.hatG, 0.7, 1.1, 0.08, 0, 0, 1.9, -0.3, { mat: dm }); }
  else if (hat === 'sehra') { cyl(u.hatG, 0.42, 0.4, 0xd7331f, 0, 2.6, 0); for (let i = 0; i < 9; i++) bx(u.hatG, 0.04, 0.5, 0.04, GOLD, -0.3 + i * 0.075, 2.25, 0.33, { mat: glow(GOLD) }); }
  const b = look.bling || [];
  if (look.shades && !b.includes('gshades')) bx(u.hatG, 0.5, 0.1, 0.04, 0x050505, 0, 2.38, 0.32);
  if (b.includes('gshades')) { bx(u.hatG, 0.5, 0.11, 0.04, 0x050505, 0, 2.38, 0.32); bx(u.hatG, 0.54, 0.03, 0.05, GOLD, 0, 2.44, 0.33, { mat: glow(GOLD) }); }
  if (b.includes('chain')) { const t = new THREE.Mesh(TORUS, glow(GOLD)); t.scale.set(0.3, 0.3, 0.6); t.rotation.x = Math.PI / 2 - 0.3; t.position.set(0, 1.86, 0.18); u.blingG.add(t); sph(u.blingG, 0.08, GOLD, 0, 1.62, 0.27, glow(GOLD)); }
  if (b.includes('kada')) { const t = new THREE.Mesh(TORUS, glow(GOLD)); t.scale.set(0.16, 0.16, 0.3); t.rotation.x = Math.PI / 2; t.position.set(0, -0.72, 0); u.blingR.add(t); }
  if (b.includes('watch')) { bx(u.blingL, 0.28, 0.12, 0.3, GOLD, 0, -0.72, 0, { mat: glow(GOLD) }); bx(u.blingL, 0.12, 0.1, 0.05, 0x111111, 0, -0.72, 0.16); }
  if (look.belt) { bx(u.blingG, 0.96, 0.22, 0.56, GOLD, 0, 1.05, 0, { mat: glow(GOLD) }); bx(u.blingG, 0.36, 0.3, 0.06, 0xd7331f, 0, 1.05, 0.29); }
  if (look.crewColor != null) bx(u.blingG, 0.92, 0.12, 0.52, look.crewColor, 0, 1.88, 0, { mat: glow(look.crewColor) });
}
function animChar(ch, dt, mode, speedMul) {
  const u = ch.userData; // mode: 0 idle, 1 walk, 3 dance
  u.sit = false; const h = u.human; if (h && h.root.visible) humanAnim(u, h, dt, mode, speedMul);
  if (mode === 3) {
    u.danceT += dt * 8; const s = Math.sin(u.danceT);
    u.shL.rotation.x = -2.6 + s * 0.4; u.shR.rotation.x = -2.6 - s * 0.4; u.shL.rotation.z = -0.3; u.shR.rotation.z = 0.3;
    u.hipL.rotation.x = Math.max(0, s) * 0.8; u.hipR.rotation.x = Math.max(0, -s) * 0.8; u.torso.position.y = 1.5 + Math.abs(s) * 0.08; return;
  }
  u.shL.rotation.z = 0; u.shR.rotation.z = 0;
  if (mode === 1) u.walk += dt * 9 * (speedMul || 1); else u.walk *= 0.85;
  const s = mode === 1 ? Math.sin(u.walk) * 0.7 : Math.sin(u.walk) * 0.1;
  u.hipL.rotation.x = s; u.hipR.rotation.x = -s; u.shL.rotation.x = -s * 0.8;
  if (u.punchT > 0) { u.punchT -= dt; u.shR.rotation.x = -1.6; } else u.shR.rotation.x = s * 0.8;
}
function humanAnim(u, h, dt, mode, speedMul) {
  if (u.punchT > 0 && !h.punching) { h.punching = 0.42; HU.play(h, (h.alt = !h.alt) ? 'jab' : 'cross', 0.06, 1.7); }
  if (h.punching) { h.punching -= dt; if (h.punching <= 0) h.punching = 0; }
  if (!h.punching) { const k = mode === 3 ? 'dance' : mode === 1 ? (speedMul > 1.4 ? 'run' : speedMul > 1.15 ? 'jog' : 'walk') : 'idle'; HU.play(h, k, 0.22, k === 'walk' ? Math.min(1.5, 1.05 * (speedMul || 1)) : 1); }
  h.mixer.update(dt); u.animF = HFRAME;
}
function sitChar(ch) { const u = ch.userData; u.sit = true; if (u.human && u.human.cur !== 'sit') { HU.play(u.human, 'sit', 0.15); u.human.mixer.update(0.02); } u.hipL.rotation.x = -1.3; u.hipR.rotation.x = -1.3; u.shL.rotation.x = -0.9; u.shR.rotation.x = -0.9; u.shL.rotation.z = 0; u.shR.rotation.z = 0; }

function plateMesh(text) { const t = new THREE.CanvasTexture(signCanvas(text, null, '#ffffff', '#111111', 256, 64)); return new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: t })); }
function makeVehicle(type, colorOverride, mods, plate) {
  const g = new THREE.Group(); const V = D.VEH[type]; const col = colorOverride || (V && V.color) || 0xcccccc; mods = mods || {};
  const tyre = mat(0x161616);
  const wheel = (x, y, z, r) => { const w = new THREE.Mesh(CYL, tyre); w.scale.set(r, 0.3, r); w.rotation.z = Math.PI / 2; w.position.set(x, y, z); g.add(w); return w; };
  if (type === 'auto') { RL.auto(g); g.userData.len = 2.8; g.userData.rad = 1.3; return g; }
  if (type === 'bus') { RL.bus(g); sign(g, 'GURUGRAM CITY BUS', null, '#f6c026', '#1b1410', 4, 0.6, 1.32, 1.4, 0, Math.PI / 2); sign(g, 'GURUGRAM CITY BUS', null, '#f6c026', '#1b1410', 4, 0.6, -1.32, 1.4, 0, -Math.PI / 2); g.userData.len = 10; g.userData.rad = 2.5; return g; }
  if (type === 'truck') { RL.truck(g); sign(g, 'HORN OK PLEASE', 'Buri nazar wale tera muh kala', '#f6c026', '#d7331f', 2.4, 0.9, 0, 2.2, -4.42, Math.PI); sign(g, 'JAI HARYANA', 'Dalal Transport Co.', '#1a8a4a', '#fff4d8', 5, 1.2, 1.27, 2.4, -1.2, Math.PI / 2); sign(g, 'JAI HARYANA', 'Dalal Transport Co.', '#1a8a4a', '#fff4d8', 5, 1.2, -1.27, 2.4, -1.2, -Math.PI / 2); g.userData.len = 8; g.userData.rad = 2.2; return g; }
  if (type === 'tractor') { bx(g, 1.4, 1.0, 2.2, 0xd7331f, 0, 1.3, 0.6); bx(g, 1.2, 0.12, 1.2, 0x222222, 0, 2.6, -0.6); bx(g, 0.08, 1.2, 0.08, 0x222222, 0, 2.0, 0.2); wheel(-0.95, 0.9, -0.6, 0.9); wheel(0.95, 0.9, -0.6, 0.9); wheel(-0.7, 0.45, 1.4, 0.45); wheel(0.7, 0.45, 1.4, 0.45); g.userData.len = 3.5; g.userData.rad = 1.6; return g; }
  if (type === 'police') { const c = RL.car(g, 0xf5f5f5, { big: false }); bx(g, c.Wd + 0.02, 0.22, c.Ln - 0.6, 0, 0, c.base + c.H * 0.55, 0, { mat: RL.paint(0x2563b8) }); bx(g, 0.5, 0.18, 0.3, 0, -0.3, c.top + 0.12, -0.2, { mat: glow(0xff2020) }); bx(g, 0.5, 0.18, 0.3, 0, 0.3, c.top + 0.12, -0.2, { mat: glow(0x2060ff) }); g.userData.len = 4.4; g.userData.rad = 2; return g; }
  if (type === 'naav' || type === 'policeboat') { const pol = type === 'policeboat'; const hc = pol ? 0xf5f5f5 : col; bx(g, 2.0, 0.7, 4.6, hc, 0, 0.45, 0); bx(g, 1.4, 0.5, 1.2, hc, 0, 0.4, 2.6).rotation.x = 0.35; bx(g, 1.7, 0.12, 4.2, 0x7a5230, 0, 0.82, -0.1); bx(g, 1.8, 0.25, 0.4, pol ? 0x2563b8 : 0x1a8a4a, 0, 0.9, -0.6); bx(g, 0.5, 0.9, 0.5, 0x2b2b2b, 0, 0.9, -2.5); bx(g, 0.15, 0.7, 0.15, 0x555555, 0, 0.2, -2.6);
    if (pol) { bx(g, 0.5, 0.2, 0.3, 0xd7331f, -0.3, 1.5, 0.8, { mat: glow(0xff2020) }); bx(g, 0.5, 0.2, 0.3, 0x2563b8, 0.3, 1.5, 0.8, { mat: glow(0x2060ff) }); sign(g, 'JAL POLICE', null, '#2563b8', '#ffffff', 3.2, 0.5, 1.01, 0.55, 0, Math.PI / 2); }
    else { bx(g, 0.05, 1.6, 0.05, 0x333333, 0.7, 1.6, 1.6); bx(g, 0.7, 0.45, 0.03, 0xf6c026, 0.37, 2.2, 1.6); sign(g, 'JUGAADU', null, '#1b1410', '#f6c026', 2.6, 0.45, 1.01, 0.55, 0, Math.PI / 2); }
    g.userData.len = 4.8; g.userData.rad = 1.9; return g; }
  if (type === 'horse') { const w = mat(0xf5f5f5); bx(g, 0.9, 1.0, 2.2, w, 0, 1.6, 0); bx(g, 0.5, 1.2, 0.6, w, 0, 2.4, 1.1).rotation.x = -0.5; bx(g, 0.4, 0.4, 0.8, w, 0, 2.9, 1.5); for (const a of [[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]]) bx(g, 0.18, 1.2, 0.18, w, a[0], 0.6, a[1]); bx(g, 1.0, 0.1, 1.2, 0xd7331f, 0, 2.15, 0, { mat: glow(0xd7331f) }); g.userData.len = 2.4; g.userData.rad = 1.2; return g; }
  const kind = V ? V.kind : 4;
  if (kind === 2) {
    bx(g, 0.45, 0.5, 1.5, col, 0, 0.7, 0); bx(g, 0.5, 0.25, 0.7, 0x1b1b1b, 0, 1.05, -0.25); bx(g, 0.08, 0.8, 0.08, 0x444444, 0, 1.1, 0.7); bx(g, 0.9, 0.06, 0.06, 0x444444, 0, 1.5, 0.7);
    if (type === 'dhakad') { bx(g, 0.55, 0.4, 0.6, col, 0, 1.1, 0.3); cyl(g, 0.08, 1.2, 0xb8b8b8, 0.3, 0.5, -0.3).rotation.x = Math.PI / 2; }
    wheel(0, 0.35, 0.75, 0.35); wheel(0, 0.35, -0.75, 0.35);
    if (plate) { const p = plateMesh(plate); p.scale.set(0.5, 0.5, 0.5); p.position.set(0, 0.75, -0.86); p.rotation.y = Math.PI; g.add(p); }
    g.userData.len = 1.8; g.userData.rad = 0.9; g.userData.two = true; return g;
  }
  const big = type === 'desert' || type === 'cruiser'; const C = RL.car(g, col, { big, film: mods.film }), Ln = C.Ln, Wd = C.Wd, H = C.H;
  if (type === 'desert') { cyl(g, 0.5, 0.3, 0x111111, 0, 1.3, -Ln / 2 - 0.2).rotation.x = Math.PI / 2; } // spare wheel
  if (type === 'cruiser') bx(g, Wd * 0.6, 0.06, 0.06, 0, 0, C.base + H * 0.8, Ln / 2 + 0.02, { mat: RL.chrome() });
  if (mods.bull) { bx(g, Wd * 0.9, 0.12, 0.12, 0x9a9a9a, 0, 0.6, Ln / 2 + 0.35); bx(g, Wd * 0.9, 0.12, 0.12, 0x9a9a9a, 0, 1.1, Ln / 2 + 0.35); for (const x of [-0.6, 0, 0.6]) bx(g, 0.1, 0.7, 0.1, 0x9a9a9a, x * Wd / 2, 0.85, Ln / 2 + 0.35); }
  if (mods.glow !== undefined && mods.glow !== false) { const gc = D.GLOW_COLORS[mods.glow | 0] || D.GLOW_COLORS[0]; const p = new THREE.Mesh(new THREE.PlaneGeometry(Wd + 0.6, Ln + 0.6), new THREE.MeshBasicMaterial({ color: gc, transparent: true, opacity: 0.55, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.y = 0.06; g.add(p); }
  if (mods.sticker !== undefined && mods.sticker !== false) sign(g, D.STICKERS[mods.sticker | 0] || 'DESI BOYZ', null, '#111111', '#f6c026', Wd * 0.7, 0.3, 0, C.base + H * 0.75, -Ln / 2 - 0.03, Math.PI);
  if (plate) { const pf = plateMesh(plate); pf.position.set(0, C.base + 0.3, Ln / 2 + 0.09); g.add(pf); const pb = plateMesh(plate); pb.position.set(0, C.base + 0.3, -Ln / 2 - 0.09); pb.rotation.y = Math.PI; g.add(pb); }
  g.userData.len = Ln; g.userData.rad = big ? 2.0 : 1.7; return g;
}

// ================================================================ WORLD
const world = new THREE.Group(); scene.add(world);
const ZONES = [], INTERIOR = {}, PLACES = [], PICKUPS = [], METROS = [], DOORS = {}, COW_SPOTS = [], SHOPPERS = [], STATIC_NPCS = [];
const AKHARA = { x: D.SPOTS.akhara.x, z: D.SPOTS.akhara.z, fight: false };
const HOSPITAL = { x: D.SPOTS.hospital.x, z: D.SPOTS.hospital.z };
const OFFICE_DESK = { x: 0, z: 0 };
const blockOf = (x, z) => D.districtAt(x, z);
function zone(z, x, zz, r, label, act) { ZONES.push({ zone: z, x, z: zz, r, label, act }); }
const TREES = [], LAMPS = []; let LAMP_MAT = null;
function tree(x, z, s) { TREES.push([x, z, s || rnd(0.8, 1.4)]); }
function door(parent, x, z, w) { bx(parent, w, 4, 0.3, 0x2a2a2e, x, 2, z + 0.1); bx(parent, w + 0.6, 0.4, 0.4, 0xf6c026, x, 4.2, z + 0.15); }
function charpai(p, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g); bx(g, 2, 0.15, 3.4, 0x8a5a2b, 0, 0.75, 0); bx(g, 1.8, 0.06, 3.2, 0xe9dcb6, 0, 0.84, 0); for (const a of [[-0.9, -1.6], [0.9, -1.6], [-0.9, 1.6], [0.9, 1.6]]) bx(g, 0.15, 0.75, 0.15, 0x6b4a2b, a[0], 0.37, a[1]); return g; }
function cart(p, x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rnd(0, 3); p.add(g); bx(g, 2.6, 0.2, 1.4, 0x7c4a2b, 0, 1, 0); bx(g, 2.4, 0.3, 1.2, pick([0xf28c1b, 0x3a9a3a, 0xd7331f, 0xf6c026]), 0, 1.25, 0); bx(g, 0.06, 1.6, 0.06, 0x444444, 1.2, 1.9, 0); bx(g, 2.8, 0.06, 1.6, pick([0xd7331f, 0x2563b8, 0x1a8a4a]), 0, 2.7, 0); return g; }
function npcStatic(parent, x, z, ry, shirt, name, hat) { const c = makeChar(shirt || pick(D.SHIRTS)); c.position.set(x, 0, z); c.rotation.y = ry || 0; if (hat) setLook(c, { shirt: shirt || 0xffffff, hat }); parent.add(c); if (name) { const l = labelSprite(name, { fs: 34, scale: 0.5 }); l.position.set(x, 3.0, z); parent.add(l); } STATIC_NPCS.push(c); return c; }

function buildGround() {
  const T = (c, rx, ry) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
  const g = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ map: T(RL.groundTex(), 180, 180) }));
  g.rotation.x = -Math.PI / 2; world.add(g);
  const rm = new THREE.MeshLambertMaterial({ map: T(RL.asphaltTex(), 1, 60) });
  for (const r of ROADS) { const a = new THREE.Mesh(new THREE.PlaneGeometry(14, 900), rm); a.rotation.x = -Math.PI / 2; a.position.set(r, 0.03, 0); world.add(a); const b = new THREE.Mesh(new THREE.PlaneGeometry(14, 900), rm); b.rotation.x = -Math.PI / 2; b.rotation.z = Math.PI / 2; b.position.set(0, 0.035, r); world.add(b); }
  const jm = new THREE.MeshLambertMaterial({ map: T(RL.plainAsphaltTex(), 1, 1) }); for (const x of ROADS) for (const z of ROADS) bx(world, 14, 0.02, 14, 0, x, 0.045, z, { mat: jm });
  // zebra crossings on all four arms of every chowk
  const zq = new THREE.Quaternion(), zm = new THREE.Matrix4(), zs = new THREE.Vector3(1, 1, 1), zp = new THREE.Vector3(), ze = new THREE.Euler(); const zebra = [];
  for (const x of ROADS) for (const z of ROADS) for (const [dx, dz] of [[0, 9.5], [0, -9.5], [9.5, 0], [-9.5, 0]]) zebra.push([x + dx, z + dz, dx ? Math.PI / 2 : 0]);
  const zi = new THREE.InstancedMesh(new THREE.PlaneGeometry(12, 3.2), new THREE.MeshLambertMaterial({ map: T(RL.zebraTex(), 1, 1), transparent: true, depthWrite: false }), zebra.length);
  zebra.forEach((q, i) => { ze.set(-Math.PI / 2, 0, q[2]); zq.setFromEuler(ze); zp.set(q[0], 0.055, q[1]); zm.compose(zp, zq, zs); zi.setMatrixAt(i, zm); }); zi.frustumCulled = false; world.add(zi);
  const side = new THREE.MeshLambertMaterial({ map: T(RL.paversTex(), 34, 34) }), kerb = new THREE.MeshLambertMaterial({ map: T(RL.kerbTex(), 68, 1) }); // painted black-and-yellow kerb stones
  const grass = new THREE.MeshLambertMaterial({ map: T(RL.grassTex(), 14, 14) });
  for (const d of DIST) { const green = ['park', 'forest', 'village'].includes(d[3]); const m = new THREE.Mesh(BOX, [kerb, kerb, green ? grass : side, side, kerb, kerb]); m.scale.set(136, 0.2, 136); m.position.set(d[0] * 150, 0.1, d[1] * 150); world.add(m); }
}
function buildInstances() {
  const trunkG = new THREE.CylinderGeometry(0.18, 0.38, 3, 7), leafG = RL.canopy();
  const tr = new THREE.InstancedMesh(trunkG, mat(0x5a4632), TREES.length), lf = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: 0xffffff }), TREES.length); const lc = new THREE.Color();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0); TREES.forEach((t, i) => { q.setFromAxisAngle(UP, t[0] * 7.3 + t[1]); s.set(t[2], t[2], t[2]); p.set(t[0], 1.5 * t[2], t[1]); m.compose(p, q, s); tr.setMatrixAt(i, m); p.set(t[0], 4 * t[2], t[1]); s.set(t[2], t[2] * 0.9, t[2]); m.compose(p, q, s); lf.setMatrixAt(i, m); lf.setColorAt(i, lc.setHex(pick([0x2f7a35, 0x3b8a3a, 0x2a6b30, 0x4a8a3c, 0x356f2c]))); });
  if (lf.instanceColor) lf.instanceColor.needsUpdate = true; world.add(tr, lf);
  const poleG = new THREE.CylinderGeometry(0.12, 0.15, 7, 6), headG = new THREE.BoxGeometry(1.4, 0.25, 0.5);
  const po = new THREE.InstancedMesh(poleG, mat(0x555a60), LAMPS.length); LAMP_MAT = new THREE.MeshLambertMaterial({ color: 0x777777, emissive: 0xffd27a, emissiveIntensity: 0 });
  const he = new THREE.InstancedMesh(headG, LAMP_MAT, LAMPS.length);
  LAMPS.forEach((l, i) => { p.set(l[0], 3.5, l[1]); s.set(1, 1, 1); m.compose(p, q, s); po.setMatrixAt(i, m); p.set(l[0] + l[2] * 0.6, 7, l[1] + l[3] * 0.6); m.compose(p, q, s); he.setMatrixAt(i, m); });
  world.add(po, he);
}

let iplScreen = null;
function districtBuilders() {
  for (const d of DIST) {
    const [i, j, name, type] = d; const opt = d[4] || {}; const cx = i * 150, cz = j * 150;
    PLACES.push({ name, x: cx + rnd(-25, 25), z: cz + 71 });
    const corner = (h0, h1, style, n) => { const pts = [[-45, -45], [45, -45], [-45, 45], [45, 45]]; for (let k = 0; k < (n || 4); k++) { const p = pts[k]; building(world, cx + p[0], cz + p[1], rnd(18, 24), rnd(18, 24), rnd(h0, h1), style || pick(['glass', 'concrete', 'white', 'pink'])); } };
    const lbl = labelSprite(name, { fs: 52, scale: 4, bg: 'rgba(27,20,16,.6)', border: '#f6c026' }); lbl.position.set(cx, type === 'office' || type === 'luxury' ? 78 : 46, cz); world.add(lbl);
    switch (type) {
      case 'towers': corner(28, 70); for (let k = 0; k < 6; k++) tree(cx + rnd(-20, 20), cz + rnd(-20, 20)); break;
      case 'luxury': {
        corner(60, 95, 'gold', 3); building(world, cx + 45, cz + 45, 20, 20, rnd(70, 100), 'glass'); for (let k = 0; k < 10; k++) tree(cx + rnd(-25, 25), cz + rnd(-25, 25), 1.2);
        sign(world, 'Golf Vista Residences', 'Ultra luxury · ' + name, '#2a241b', '#e8c27a', 18, 3, cx - 45, 8, cz - 45 + 11.5);
        if (name === 'Golf Course Road') { building(world, cx, cz + 40, 18, 10, 6, 'gold'); sign(world, 'GOYAL JEWELLERS', 'Since 1972 · Sona, chandi, heere', '#2a241b', '#e8c27a', 16, 2.6, cx, 7, cz + 45.06); door(world, cx, cz + 45, 3); zone('out', cx, cz + 47, 4, () => 'Goyal Jewellers: chain, kada, watch', () => openJeweller()); }
        break;
      }
      case 'res': {
        corner(26, 42, pick(['concrete', 'pink', 'ochre'])); for (let k = 0; k < 8; k++) tree(cx + rnd(-25, 25), cz + rnd(-25, 25));
        if (opt.prop) { building(world, cx, cz + 40, 16, 10, 6, 'white'); sign(world, 'YADAV ESTATES', 'Flat · Penthouse · Farmhouse', '#1a8a4a', '#fff4d8', 14, 2.6, cx, 7, cz + 45.06); door(world, cx, cz + 45, 3); zone('out', cx, cz + 47, 4, () => 'Yadav Estates: buy a home', () => openProperty()); sign(world, 'SHARMA PG', 'Boys & Girls · AC · Wi-Fi · Ghar jaisa khana', '#d7331f', '#fff4d8', 16, 3, cx - 45, 6, cz + 45 + 11.5); }
        break;
      }
      case 'mall': {
        building(world, cx, cz - 12, 66, 40, 22, 'glass'); sign(world, 'AMBIENCE MALL', 'NH-48 · 150+ brands · Food court · Cinema', '#1b1410', '#f6c026', 34, 5, cx, 17, cz + 8.06);
        door(world, cx, cz + 8, 8); DOORS.mall = { x: cx, z: cz + 11 }; zone('out', cx, cz + 10.5, 4.5, () => 'Enter Ambience Mall', () => enterInterior('mall'));
        PICKUPS.push({ name: 'Ambience Mall food court', x: cx, z: cz + 12 });
        for (let k = 0; k < 6; k++) { const car = makeVehicle(pick(['chhotu', 'desert', 'cruiser']), pick([0xdedede, 0x8b1e1e, 0x2e6bd1, 0x151515, 0xf3b61f])); car.position.set(cx - 40 + k * 16, 0.2, cz + 40); car.rotation.y = Math.PI / 2 * (k % 2 ? 1 : -1); world.add(car); addCol('out', cx - 40 + k * 16 - 2.5, cx - 40 + k * 16 + 2.5, cz + 38, cz + 42); }
        building(world, cx - 50, cz - 50, 18, 18, 30, 'concrete'); building(world, cx + 50, cz - 50, 18, 18, 36, 'concrete'); break;
      }
      case 'office': {
        building(world, cx, cz - 14, 34, 28, 64, 'glass'); sign(world, 'TECHNOVA TOWERS', 'IT Park · Tower A · Floors 1-18', '#0f2740', '#8fe0ff', 22, 3.6, cx, 8, cz + 0.06);
        door(world, cx, cz, 6); DOORS.office = { x: cx, z: cz + 3 }; zone('out', cx, cz + 2.5, 4.5, () => 'Enter TechNova Towers (office)', () => enterInterior('office'));
        building(world, cx - 48, cz - 42, 20, 20, 48, 'glass'); building(world, cx + 48, cz - 42, 20, 20, 56, 'glass'); building(world, cx + 45, cz + 40, 18, 18, 30, 'white'); for (let k = 0; k < 6; k++) tree(cx - 50 + k * 8, cz + 30); break;
      }
      case 'cyberhub': {
        const eats = [['The Brew Yard', 'Craft beer · Desi bites', '#3b1d0e', '#f6c026'], ['Socha Social', 'Rooftop · Live music', '#1b1410', '#ff6fa5'], ['Dosa Dynasty', 'South ka swaad', '#0f766e', '#fff4d8'], ['Biryani Bawli', 'Dum biryani · Kebabs', '#7c2d12', '#ffd27a']];
        eats.forEach((e, k) => { const x = cx - 48 + k * 32; building(world, x, cz + 32, 26, 14, 9, pick(['brick', 'glass', 'white'])); sign(world, e[0], e[1], e[2], e[3], 20, 3, x, 6.5, cz + 39.06); door(world, x, cz + 39, 3); });
        zone('out', cx - 48, cz + 41, 4.5, () => 'The Brew Yard: menu', () => openFood('The Brew Yard', 'Cyber Hub ki shaam', 'cyberhub'));
        PICKUPS.push({ name: 'Cyber Hub', x: cx - 16, z: cz + 42 });
        building(world, cx - 40, cz - 40, 30, 20, 58, 'glass'); building(world, cx + 35, cz - 40, 34, 20, 66, 'glass');
        // IPL big screen
        bx(world, 31, 13, 0.8, 0x111111, cx, 10, cz - 10, { col: 'out' }); bx(world, 0.8, 4, 0.8, 0x333333, cx - 12, 2, cz - 10); bx(world, 0.8, 4, 0.8, 0x333333, cx + 12, 2, cz - 10);
        const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 420; const st = new THREE.CanvasTexture(sc); iplScreen = { c: sc, t: st };
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(30, 12.3), new THREE.MeshBasicMaterial({ map: st })); scr.position.set(cx, 10, cz - 9.55); world.add(scr); drawIpl(null);
        zone('out', cx, cz + 5, 14, () => G.ev?.type === 'ipl' ? 'Cheer for your team' : 'Cyber Hub big screen', () => openIplCheer());
        break;
      }
      case 'dealer': {
        building(world, cx, cz - 18, 54, 28, 11, 'glass'); sign(world, 'CHAUDHARY MOTORS', 'Naya ya purana, gaadi le ja dabang', '#d7331f', '#f6c026', 30, 4, cx, 8.5, cz - 3.94);
        zone('out', cx, cz, 5, () => 'Chaudhary Motors: buy a vehicle', () => openDealer());
        D.BUY_VEHICLES.forEach((t, k) => { const v = makeVehicle(t); v.position.set(cx - 40 + k * 20, 0.2, cz + 25); v.rotation.y = 0.6; world.add(v); const l = labelSprite(D.VEH[t].name + ' · ' + fmt(D.VEH[t].price), { fs: 36, scale: 1.1 }); l.position.set(cx - 40 + k * 20, 3.6, cz + 25); world.add(l); addCol('out', cx - 40 + k * 20 - 2, cx - 40 + k * 20 + 2, cz + 22, cz + 28); });
        building(world, cx + 45, cz + 50, 22, 12, 7, 'white'); sign(world, 'SANDHU CAR ACCESSORIES', 'Horn · Black film · Bull bar · Neon · Stickers · HR26 plates', '#111111', '#00e5ff', 20, 2.6, cx + 45, 5.4, cz + 43.94, Math.PI);
        zone('out', cx + 45, cz + 41.5, 4.5, () => 'Sandhu Car Accessories: mods & plates', () => openMods());
        break;
      }
      case 'hub': {
        for (let k = -60; k <= 60; k += 20) bx(world, 3, 7, 3, 0x9a958a, cx + k, 3.5, cz - 20, { col: 'out' });
        bx(world, 136, 1.2, 14, 0x8f8a80, cx, 7.6, cz - 20); bx(world, 136, 1, 0.4, 0xf6c026, cx, 8.6, cz - 26.8); bx(world, 136, 1, 0.4, 0xf6c026, cx, 8.6, cz - 13.2);
        sign(world, 'IFFCO CHOWK FLYOVER', null, '#1a8a4a', '#ffffff', 14, 2.2, cx, 11, cz - 12.9);
        building(world, cx + 30, cz + 38, 24, 14, 7, 'white'); sign(world, 'CHALO CABS HUB', 'Driver partner centre · Bhaago e-scooter rental', '#111111', '#2fc46b', 22, 3, cx + 30, 5.6, cz + 45.06); door(world, cx + 30, cz + 45, 3);
        zone('out', cx + 30, cz + 47, 5, () => G.veh ? 'Return your vehicle first' : 'Rent a Bhaago e-scooter (₹50)', () => rentScooter());
        for (let k = 0; k < 4; k++) { const a = makeVehicle('auto'); a.position.set(cx - 40 + k * 6, 0.2, cz + 50); world.add(a); } addCol('out', cx - 44, cx - 20, cz + 48, cz + 52);
        building(world, cx - 45, cz + 30, 18, 18, 22, 'concrete'); break;
      }
      case 'dhaba': {
        building(world, cx, cz - 6, 32, 20, 7, 'ochre'); sign(world, 'SHER-E-HARYANA DHABA', 'शेर-ए-हरियाणा ढाबा · Pure Desi · Since 1987', '#f6c026', '#d7331f', 26, 3.4, cx, 8.8, cz + 4.06);
        door(world, cx, cz + 4, 5); DOORS.dhaba = { x: cx, z: cz + 7 }; zone('out', cx, cz + 6.5, 4.5, () => 'Enter Sher-e-Haryana Dhaba', () => enterInterior('dhaba'));
        PICKUPS.push({ name: 'Sher-e-Haryana Dhaba', x: cx, z: cz + 8 });
        for (let k = 0; k < 3; k++) charpai(world, cx - 20 + k * 8, cz + 16, 0);
        // Neon Nights club
        building(world, cx + 42, cz + 42, 28, 18, 10, 'dark'); sign(world, 'NEON NIGHTS', 'Club · Sector 29 · DJ every night', '#0b0614', '#ff2bd6', 22, 3.6, cx + 42, 8, cz + 51.06);
        bx(world, 5, 4, 0.3, 0x2a1838, cx + 42, 2, cz + 51.1, { mat: glow(0x3a1050) }); for (let k = 0; k < 6; k++) bx(world, 0.2, 0.2, 0.2, 0, cx + 30 + k * 4.5, 10.3, cz + 51.2, { mat: glow(pick([0xff2bd6, 0x00e5ff, 0x39ff14])) });
        DOORS.club = { x: cx + 42, z: cz + 54 }; zone('out', cx + 42, cz + 53.5, 4.5, () => 'Enter Neon Nights club', () => enterInterior('club'));
        const tr = makeVehicle('truck'); tr.position.set(cx - 42, 0.2, cz + 38); tr.rotation.y = Math.PI / 2; world.add(tr); addCol('out', cx - 46, cx - 38, cz + 34, cz + 42);
        building(world, cx - 45, cz - 45, 22, 20, 14, 'brick'); sign(world, 'CHHATT LOUNGE', 'Sector 29 nightlife', '#1b1410', '#ff6fa5', 16, 2.6, cx - 45, 8, cz - 34.94);
        building(world, cx + 45, cz - 45, 22, 20, 12, 'brick'); sign(world, 'KULHAD CAFE', 'Chai · Maggi · Gup-shup', '#7c2d12', '#ffd27a', 16, 2.6, cx + 45, 7, cz - 34.94); break;
      }
      case 'park': {
        for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; tree(cx + Math.cos(a) * 55, cz + Math.sin(a) * 55, rnd(1, 1.5)); }
        for (let k = 0; k < 12; k++) tree(cx + rnd(-40, 40), cz + rnd(-40, -18));
        const ak = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.3, 24), mat(0x8a5a2b)); ak.position.set(AKHARA.x, 0.25, AKHARA.z); world.add(ak);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; cyl(world, 0.15, 1.6, 0xf6c026, AKHARA.x + Math.cos(a) * 9.3, 1, AKHARA.z + Math.sin(a) * 9.3); }
        sign(world, 'LEISURE VALLEY AKHARA', 'Champion ka belt jeeto · Dangal har roz', '#d7331f', '#fff4d8', 16, 2.6, cx, 4, cz - 0.5);
        zone('out', AKHARA.x, AKHARA.z, 10, () => AKHARA.fight ? 'Dangal chal raha se! Punch with F' : 'Challenge Pehlwan Bhola (₹100 entry, ₹1,000 prize + belt)', () => { if (!AKHARA.fight) startDangal(); });
        break;
      }
      case 'forest': for (let k = 0; k < 90; k++) tree(cx + rnd(-64, 64), cz + rnd(-64, 64), rnd(0.9, 1.7)); sign(world, 'ARAVALI BIODIVERSITY PARK', 'Hara bhara Gurugram', '#1a8a4a', '#fff4d8', 18, 2.6, cx, 3, cz + 66); break;
      case 'market': {
        const shops = MARKET_SHOPS.slice().sort(() => Math.random() - 0.5); if (opt.shop) { shops.splice(shops.indexOf(opt.shop), 1); shops.unshift(opt.shop); }
        for (let k = 0; k < 5; k++) { const x = cx - 48 + k * 24; building(world, x, cz - 50, 22, 16, rnd(7, 12), pick(['ochre', 'brick', 'pink', 'white'])); sign(world, shops[k + 5], null, pick(SHOP_COLORS), '#fff4d8', 18, 2.4, x, 5, cz - 41.94); building(world, x, cz + 50, 22, 16, rnd(7, 12), pick(['ochre', 'brick', 'pink', 'white'])); sign(world, shops[k], null, pick(SHOP_COLORS), '#fff4d8', 18, 2.4, x, 5, cz + 41.94, Math.PI); }
        zone('out', cx - 48, cz + 40, 4, () => opt.shop + ': menu', () => openFood(opt.shop, 'Desi swaad', opt.menu));
        PICKUPS.push({ name: opt.shop + ', ' + name, x: cx - 48, z: cz + 38 });
        for (let k = 0; k < 5; k++) cart(world, cx - 30 + k * 15, cz + rnd(-10, 10));
        if (opt.busy) for (let k = 0; k < 6; k++) COW_SPOTS.push([cx + rnd(-30, 30), cz + rnd(-20, 20)]);
        break;
      }
      case 'plaza': {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(10, 11, 1.2, 28), mat(0xc9bfa8)); f.position.set(cx, 0.6, cz); world.add(f);
        const w = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 0.2, 28), new THREE.MeshLambertMaterial({ color: 0x3fa9d6, emissive: 0x0b3a55 })); w.position.set(cx, 1.15, cz); world.add(w);
        cyl(world, 1.2, 6, 0xd9cfb5, cx, 3, cz); sph(world, 1.4, 0xf6c026, cx, 6.6, cz); addCol('out', cx - 9, cx + 9, cz - 9, cz + 9);
        sign(world, 'GURUGRAM', 'गुरुग्राम · Millennium City', '#d7331f', '#f6c026', 30, 6, cx, 4.5, cz + 32); bx(world, 30.5, 1.6, 1, 0x1b1410, cx, 0.8, cz + 31.6, { col: 'out' });
        sign(world, 'GURUGRAM', 'गुरुग्राम · Millennium City', '#d7331f', '#f6c026', 30, 6, cx, 4.5, cz + 31.2, Math.PI);
        zone('out', cx, cz + 40, 6, () => 'Selfie point: make your Mera Gurugram card', () => startSelfie());
        for (let k = 0; k < 6; k++) bx(world, 4, 0.5, 1.2, 0x7c4a2b, cx - 30 + k * 12, 0.6, cz - 25);
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; tree(cx + Math.cos(a) * 48, cz + Math.sin(a) * 48); }
        corner(30, 55, null, 2); break;
      }
      case 'theka': {
        building(world, cx, cz + 38, 16, 12, 6, 'ochre'); sign(world, 'DESI THEKA No.1', 'देसी व अंग्रेज़ी शराब की सरकारी दुकान', '#1a8a4a', '#f6c026', 16, 3, cx, 5, cz + 44.06);
        door(world, cx, cz + 44, 4); DOORS.theka = { x: cx, z: cz + 47 }; zone('out', cx, cz + 46.5, 4, () => 'Enter Desi Theka No.1', () => enterInterior('theka'));
        building(world, cx, cz - 25, 60, 36, 24, 'glass'); sign(world, 'SOHNA ROAD PLAZA', 'Offices · Showrooms', '#1b1410', '#8fe0ff', 22, 3, cx, 8, cz - 6.94);
        building(world, cx + 48, cz + 40, 18, 18, 30, 'concrete'); building(world, cx - 48, cz + 40, 18, 18, 26, 'pink'); break;
      }
      case 'hospital': {
        building(world, cx, cz - 15, 54, 30, 20, 'white'); sign(world, 'CIVIL HOSPITAL', 'सिविल अस्पताल · Emergency 24x7', '#ffffff', '#d7331f', 30, 4, cx, 14, cz + 0.06);
        bx(world, 6, 1.6, 0.3, 0xd7331f, cx - 22, 16, cz + 0.2); bx(world, 1.6, 6, 0.3, 0xd7331f, cx - 22, 16, cz + 0.2); door(world, cx, cz, 6);
        zone('out', cx, cz + 3, 5, () => 'Treatment: full health (₹100)', async () => { if (G.hp >= 100) return toast('Tu to bilkul fit se!'); const r = await buy('misc', 'hospital'); if (r.ok) { G.hp = 100; toast('Doctor ne pattiyan baandh di. Health full.'); } });
        const amb = makeVehicle('chhotu', 0xffffff); amb.position.set(cx + 30, 0.2, cz + 20); world.add(amb); addCol('out', cx + 28, cx + 32, cz + 18, cz + 22); corner(18, 26, 'white', 2); break;
      }
      case 'village': {
        if (opt.farm) {
          // Bhondsi farmhouse with party lawn
          building(world, cx, cz - 25, 30, 18, 8, 'white'); sign(world, 'BHONDSI FARMHOUSE', 'Private · Party lawn', '#1a8a4a', '#fff4d8', 16, 2.6, cx, 6.5, cz - 15.94);
          const lawn = new THREE.Mesh(new THREE.PlaneGeometry(50, 30), mat(0x3f8f35)); lawn.rotation.x = -Math.PI / 2; lawn.position.set(D.SPOTS.farmLawn.x, 0.22, D.SPOTS.farmLawn.z - 15); world.add(lawn);
          bx(world, 6, 1.4, 3, 0x111111, D.SPOTS.farmLawn.x, 0.7, D.SPOTS.farmLawn.z - 28, { col: 'out' }); npcStatic(world, D.SPOTS.farmLawn.x, D.SPOTS.farmLawn.z - 26, 0, 0x8b3fc4, 'DJ Rocky');
          for (let k = 0; k < 10; k++) sph(world, 0.25, 0, D.SPOTS.farmLawn.x - 22 + k * 5, 4, D.SPOTS.farmLawn.z - 30, glow(pick([0xffd27a, 0xff6fa5, 0x8fe0ff])));
          for (let k = 0; k < 12; k++) tree(cx + rnd(-60, 60), cz + rnd(-60, -40));
          zone('out', D.SPOTS.farmLawn.x, D.SPOTS.farmLawn.z - 15, 14, () => (P && P.houses.includes('farm')) ? (G.party ? 'Party chal rahi se! Dance with B' : 'Host a farmhouse party (₹20,000)') : (G.party ? 'Party chal rahi se! Dance with B' : 'Farmhouse party lawn'), () => { if (P && P.houses.includes('farm') && !G.party) hostParty(); else if (G.party) joinParty(); else toast('Party host karne ke liye yeh farmhouse kharid (Yadav Estates)'); });
          break;
        }
        for (let k = 0; k < 7; k++) { const x = cx + rnd(-55, 55), z = cz + rnd(-55, 30); if (Math.abs(x - cx) < 14 && Math.abs(z - cz) < 14) continue; if (Math.abs(x - cx - 20) < 10 && Math.abs(z - cz - 5) < 10) continue; building(world, x, z, rnd(8, 12), rnd(8, 12), rnd(3.5, 5), pick(['ochre', 'brick'])); }
        for (let k = 0; k < 5; k++) { const h = new THREE.Mesh(CONE, mat(0xd9b44a)); h.scale.set(2.2, 3.5, 2.2); h.position.set(cx + rnd(-50, 50), 1.75, cz + rnd(40, 60)); world.add(h); }
        const t = makeVehicle('tractor'); t.position.set(cx + 8, 0.2, cz + 10); t.rotation.y = 0.8; world.add(t); addCol('out', cx + 6, cx + 10, cz + 8, cz + 12);
        charpai(world, cx - 6, cz + 2, 0.3); cyl(world, 0.25, 1, 0x7c4a2b, cx - 6, 1.2, cz + 2);
        for (let k = 0; k < 4; k++) COW_SPOTS.push([cx + rnd(-40, 40), cz + rnd(-30, 30)]); for (let k = 0; k < 10; k++) tree(cx + rnd(-60, 60), cz + rnd(-60, 60));
        if (opt.chaupal) {
          sign(world, 'BADSHAHPUR CHAUPAL', 'Gyaan muft · Roast battle yahin hoti se', '#7c2d12', '#f6c026', 14, 2.4, cx - 6, 3.5, cz - 3);
          zone('out', D.SPOTS.chaupal.x, D.SPOTS.chaupal.z, 6, () => 'Chaupal: gyaan, or challenge someone to a roast battle', () => openChaupal());
          // land-rich crorepati who hands out side jobs
          const rp = npcStatic(world, cx + 20, cz + 5, -Math.PI / 2, 0xf5f5f5, 'Ramphal Ahlawat (crorepati)', 'pagdi'); setLook(rp, { shirt: 0xf5f5f5, hat: 'pagdi', bling: ['chain', 'watch'] });
          const suv = makeVehicle('desert', 0xf5f5f5, { bull: true, film: true }, 'HR26 RA 0001'); suv.position.set(cx + 26, 0.2, cz + 12); world.add(suv); addCol('out', cx + 24, cx + 28, cz + 9, cz + 15);
          zone('out', cx + 18, cz + 5, 4, () => 'Ramphal Ahlawat: "Ek kaam karega?"', () => offerQuest());
        }
        break;
      }
      case 'temple': {
        bx(world, 22, 3, 22, 0xf1e3c8, cx, 1.5, cz - 10, { col: 'out' }); bx(world, 14, 8, 14, 0xf6efe0, cx, 7, cz - 10);
        const sh = new THREE.Mesh(CONE, mat(0xf28c1b)); sh.scale.set(7, 14, 7); sh.position.set(cx, 18, cz - 10); world.add(sh); cyl(world, 0.12, 6, 0x6b4a2b, cx, 27, cz - 10); bx(world, 3, 1.6, 0.08, 0xf28c1b, cx + 1.6, 29, cz - 10);
        sign(world, 'SHEETLA MATA MANDIR', 'शीतला माता मंदिर · Old Gurgaon', '#f28c1b', '#7c2d12', 18, 2.6, cx, 4.3, cz + 1.06);
        zone('out', cx, cz + 3, 5, () => 'Darshan: daily blessing', async () => { const r = await earn('prasad', 251, 'Prasad aur shagun'); if (r.ok) { G.hp = 100; L.hunger = Math.min(100, L.hunger + 30); } });
        for (let k = 0; k < 4; k++) cart(world, cx - 30 + k * 20, cz + 30); for (let k = 0; k < 3; k++) COW_SPOTS.push([cx + rnd(-30, 30), cz + rnd(20, 50)]);
        corner(8, 14, 'ochre', 4); break;
      }
      case 'industrial': {
        for (let k = 0; k < 4; k++) { const x = cx + (k % 2 ? 30 : -30), z = cz + (k < 2 ? -30 : 30); building(world, x, z, 40, 30, 10, 'concrete'); cyl(world, 1.5, 26, 0x8a7f72, x + 14, 13, z - 8); }
        sign(world, 'MANESAR INDUSTRIAL AREA', 'IMT Manesar', '#2563b8', '#ffffff', 18, 2.6, cx, 3, cz + 66);
        const tr = makeVehicle('truck'); tr.position.set(cx, 0.2, cz); world.add(tr); addCol('out', cx - 1.5, cx + 1.5, cz - 5, cz + 4); break;
      }
    }
    if (opt.metro) {
      const x0 = cx - 40, z0 = cz + 62; for (let k = -2; k <= 2; k++) cyl(world, 0.9, 8, 0xb8b2a6, x0 + k * 9, 4, z0);
      bx(world, 44, 0.8, 6, 0xc9c2b4, x0, 8.4, z0); bx(world, 44, 3.5, 0.3, 0x2563b8, x0, 10.6, z0 - 3);
      sign(world, 'RAPID METRO: ' + opt.metro.toUpperCase(), 'रैपिड मेट्रो', '#2563b8', '#ffffff', 18, 2.4, x0, 10.6, z0 - 2.8);
      METROS.push({ name: opt.metro, x: x0, z: z0 + 3 }); zone('out', x0, z0 + 3, 5, () => 'Rapid Metro: ' + opt.metro + ' (₹30 a trip)', () => openMetro(opt.metro));
    }
  }
  // Traffic police naka at Iffco Chowk and the Kherki Daula toll on NH-48
  { const n = D.SPOTS.naka; for (const dz of [-4.5, 4.5]) { bx(world, 1, 1.1, 4, 0xd7331f, n.x, 0.55, n.z + dz, { col: 'out' }); for (let k = 0; k < 3; k++) bx(world, 1.02, 0.18, 0.5, 0xffffff, n.x, 0.75, n.z + dz - 1.5 + k * 1.5); }
    const jeep = makeVehicle('police'); jeep.position.set(n.x + 12, 0.2, n.z - 11); jeep.rotation.y = Math.PI / 2; world.add(jeep); addCol('out', n.x + 10, n.x + 14, n.z - 13, n.z - 9);
    npcStatic(world, n.x + 2, n.z - 1, -Math.PI / 2, 0xc9b27a, 'Traffic Police', 'cap'); npcStatic(world, n.x - 2, n.z + 1, Math.PI / 2, 0xc9b27a, null, 'cap');
    sign(world, 'TRAFFIC POLICE NAKA', 'Peeke gaadi na chalao · Challan ₹2,000', '#ffffff', '#d7331f', 10, 1.8, n.x + 12, 3.8, n.z - 8.5); }
  { const t = D.SPOTS.toll; for (const dz of [-6.6, -2.2, 2.2, 6.6]) bx(world, 3, 3, 1.4, 0xf5f5f5, t.x, 1.5, t.z + dz, { col: 'out' }); bx(world, 6, 0.8, 18, 0x2563b8, t.x, 4.4, t.z); sign(world, 'KHERKI DAULA TOLL PLAZA', 'Car ₹50 · FASTag lane', '#2563b8', '#ffffff', 16, 2.4, t.x - 3.1, 4.4, t.z, -Math.PI / 2); sign(world, 'KHERKI DAULA TOLL PLAZA', 'Car ₹50 · FASTag lane', '#2563b8', '#ffffff', 16, 2.4, t.x + 3.1, 4.4, t.z, Math.PI / 2); }
  for (const r of ROADS) for (let t = -440; t <= 440; t += 55) { LAMPS.push([r + 8, t, -1, 0]); LAMPS.push([t, r + 8, 0, -1]); if (Math.random() < 0.5 && !ROADS.some(q => Math.abs(t + 20 - q) < 10)) tree(r - 9, t + 20, 0.9); } // no trees in the middle of cross-streets
}

// ---------------- interiors
function floorTex(kind) { return texFrom((x, w, h) => { if (kind === 'marble') { x.fillStyle = '#e8e2d6'; x.fillRect(0, 0, w, h); x.fillStyle = '#d6cdbb'; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); } else if (kind === 'carpet') { x.fillStyle = '#3d4a5c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { x.fillStyle = pick(['#43526a', '#38455a']); x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } } else if (kind === 'tile') { x.fillStyle = '#bdb3a0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8f8676'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2); } else if (kind === 'club') { x.fillStyle = '#120a1c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a1838'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2); } else { x.fillStyle = '#a8875a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.fillStyle = pick(['#9b7a4f', '#b39264', '#8f7048']); x.fillRect(Math.random() * w, Math.random() * h, 3, 2); } } }, 64, 64, 1, 1); }
function makeRoom(key, ox, oz, W, D2, H, fkind, wall, fr) {
  const g = new THREE.Group(); scene.add(g); const ft = floorTex(fkind); ft.repeat.set(W / (fr || 6), D2 / (fr || 6));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D2), new THREE.MeshLambertMaterial({ map: ft })); f.rotation.x = -Math.PI / 2; f.position.set(ox, 0.01, oz); g.add(f);
  bx(g, W, H, 0.6, wall, ox, H / 2, oz - D2 / 2, { col: key }); bx(g, 0.6, H, D2, wall, ox - W / 2, H / 2, oz, { col: key }); bx(g, 0.6, H, D2, wall, ox + W / 2, H / 2, oz, { col: key });
  const seg = (W - 6) / 2; bx(g, seg, H, 0.6, wall, ox - W / 2 + seg / 2, H / 2, oz + D2 / 2, { col: key }); bx(g, seg, H, 0.6, wall, ox + W / 2 - seg / 2, H / 2, oz + D2 / 2, { col: key }); bx(g, 6, H - 4, 0.6, wall, ox, 4 + (H - 4) / 2, oz + D2 / 2);
  bx(g, 6, 4, 0.2, 0, ox, 2, oz + D2 / 2 + 0.3, { mat: glow(0x1a1a1a) }); sign(g, 'EXIT · BAHAR', null, '#1a8a4a', '#ffffff', 4, 0.8, ox, 4.6, oz + D2 / 2 - 0.35, Math.PI);
  INTERIOR[key] = { name: INTERIOR_NAMES[key], ox, oz, W, D: D2, H, g, spawn: { x: ox, z: oz + D2 / 2 - 4, r: Math.PI } };
  zone(key, ox, oz + D2 / 2 - 1.2, 3.2, () => 'Exit to ' + DOOR_NAMES[key], () => exitInterior()); return g;
}
function bottles(g, x0, x1, y, z, n) { for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0) * k / (n - 1); const c = pick([0x5a2d0c, 0x1f5f2a, 0xc9c3b5, 0x7a1c1c, 0xd9a520, 0x2a3d6b]); cyl(g, 0.13, 0.7, c, x, y + 0.35, z); cyl(g, 0.05, 0.25, c, x, y + 0.82, z); } }
function table(g, x, z, w, d, c) { bx(g, w, 0.12, d, c || 0x7c4a2b, x, 1.0, z); for (const a of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.12, 1, 0.12, 0x3a2a1a, x + a[0] * (w / 2 - 0.15), 0.5, z + a[1] * (d / 2 - 0.15)); }
function chair(g, x, z, c) { bx(g, 0.7, 0.1, 0.7, c, x, 0.6, z); bx(g, 0.7, 0.8, 0.1, c, x, 1.0, z - 0.3); for (const a of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.08, 0.6, 0.08, c, x + a[0] * 0.3, 0.3, z + a[1] * 0.3); }
let G_WHEEL = null; const CLUB = { tiles: [], lasers: [], ball: null, dancers: [] };
function buildInteriors() {
  { // MALL
    const ox = 2000, oz = 2000, W = 100, D2 = 70, H = 16; const g = makeRoom('mall', ox, oz, W, D2, H, 'marble', 0xe6dccb, 8);
    bx(g, W, 1, 6, 0xcfc4ae, ox, 8, oz - D2 / 2 + 3); bx(g, W, 1.2, 0.2, 0x9fd3f0, ox, 9.1, oz - D2 / 2 + 6);
    const stores = [['CHHORA FASHION', 'Kurte, shirts, swag', '#d7331f', '#fff4d8', 'fashion'], ['PAGDI PALACE', 'Pagdi · Safa · Caps', '#f28c1b', '#1b1410', 'hats'], ['SHADES & SHOES', 'Kaala chashma', '#1b1410', '#f6c026', 'shades'], ['LUCKY DRAW COUNTER', 'Scratch karo, jeeto ₹5,000', '#8b3fc4', '#fff4d8', 'lucky'], ['REEL STAR CINEMA', 'Aaj ki blockbuster', '#0f2740', '#ff6fa5', 'cinema']];
    stores.forEach((s, k) => {
      const sx = ox - 40 + k * 20, sz = oz - D2 / 2;
      bx(g, 0.5, 7, 13, 0xcfc4ae, sx - 10, 3.5, sz + 6.5, { col: 'mall' }); if (k === 4) bx(g, 0.5, 7, 13, 0xcfc4ae, sx + 10, 3.5, sz + 6.5, { col: 'mall' });
      sign(g, s[0], s[1], s[2], s[3], 16, 2.6, sx, 6.2, sz + 13.1); bx(g, 6, 1.1, 1.4, 0x6b4a2b, sx, 0.55, sz + 8, { col: 'mall' }); npcStatic(g, sx, sz + 6, 0, pick(D.SHIRTS), k === 4 ? 'Ticket counter' : 'Shopkeeper');
      if (s[4] === 'fashion') { for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) bx(g, 0.6, 1.1, 0.12, D.SHIRTS[(q + r) % 8], sx - 6 + r * 2.2, 1.3, sz + 3 + q * 0.6); npcStatic(g, sx + 6, sz + 5, 0, 0xd7331f, null, 'pagdi'); }
      if (s[4] === 'hats') for (let q = 0; q < 6; q++) { cyl(g, 0.4, 0.35, pick([0xf28c1b, 0xd7331f, 0xf6c026, 0x1d4f91]), sx - 6 + q * 2.4, 2.2, sz + 1.5); bx(g, 0.3, 2, 0.3, 0x6b4a2b, sx - 6 + q * 2.4, 1, sz + 1.5); }
      if (s[4] === 'shades') { bx(g, 16, 0.2, 1.2, 0x444444, sx, 1.6, sz + 1); for (let q = 0; q < 12; q++) bx(g, 0.5, 0.12, 0.1, 0x111111, sx - 7 + q * 1.3, 1.8, sz + 1); }
      if (s[4] === 'lucky') { const wh = new THREE.Mesh(CYL, mat(0xf6c026)); wh.scale.set(2.5, 0.3, 2.5); wh.rotation.x = Math.PI / 2; wh.position.set(sx, 4, sz + 1.2); g.add(wh); G_WHEEL = wh; }
      if (s[4] === 'cinema') { sign(g, 'CHAUDHARY NO.1', 'Now showing · Haryanvi action', '#1b1410', '#f6c026', 6, 3.6, sx - 4, 3.5, sz + 0.4); sign(g, 'DIL HARYANVI', 'Romance + dhamaal', '#7c2d12', '#ffd27a', 6, 3.6, sx + 4, 3.5, sz + 0.4); }
      zone('mall', sx, sz + 10, 3, () => ({ fashion: 'Chhora Fashion: shirts', hats: 'Pagdi Palace: hats', shades: 'Shades & Shoes: sunglasses', lucky: 'Lucky draw scratch card (₹200)', cinema: 'Watch a movie (₹250)' })[s[4]], () => mallStore(s[4]));
    });
    const stalls = [['CHOLE BHATURE EXPRESS', '#d7331f', 'chole'], ['MOMO POINT', '#1a8a4a', 'momo'], ['PIZZA PAO', '#2563b8', 'pizza']];
    stalls.forEach((s, k) => { const sz = oz - 12 + k * 12, sx = ox + W / 2 - 3; bx(g, 5, 1.1, 8, 0x6b4a2b, sx - 1, 0.55, sz, { col: 'mall' }); sign(g, s[0], 'Food court', '#1b1410', s[1], 8, 1.6, sx - 3.6, 4, sz, -Math.PI / 2); npcStatic(g, sx + 1, sz, -Math.PI / 2, 0xffffff, 'Cook'); zone('mall', sx - 5, sz, 3, () => s[0].charAt(0) + s[0].slice(1).toLowerCase() + ': menu', () => openFood(s[0], 'Metro Grand Mall food court', s[2])); });
    for (let k = 0; k < 6; k++) { const tx = ox + 22 + (k % 2) * 10, tz = oz - 14 + Math.floor(k / 2) * 12; table(g, tx, tz, 3, 3, 0xf5f5f5); chair(g, tx - 2, tz, 0xd7331f); chair(g, tx + 2, tz, 0xd7331f); addCol('mall', tx - 1.5, tx + 1.5, tz - 1.5, tz + 1.5); }
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1, 24), mat(0xcfc4ae)); fo.position.set(ox - 5, 0.5, oz + 5); g.add(fo);
    const wa = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.2, 24), new THREE.MeshLambertMaterial({ color: 0x3fa9d6, emissive: 0x0b3a55 })); wa.position.set(ox - 5, 1, oz + 5); g.add(wa);
    cyl(g, 0.6, 4, 0xe6dccb, ox - 5, 2.5, oz + 5); sph(g, 1, 0xf6c026, ox - 5, 4.8, oz + 5); addCol('mall', ox - 11, ox + 1, oz - 1, oz + 11);
    for (const ez of [oz - 8, oz + 8]) { bx(g, 3, 0.5, 16, 0x8a8a8a, ox - W / 2 + 8, 4, ez).rotation.x = 0.5; bx(g, 0.2, 1, 16, 0x333333, ox - W / 2 + 6.4, 4.8, ez).rotation.x = 0.5; bx(g, 0.2, 1, 16, 0x333333, ox - W / 2 + 9.6, 4.8, ez).rotation.x = 0.5; addCol('mall', ox - W / 2 + 6, ox - W / 2 + 10, ez - 8, ez + 8); }
    sign(g, 'AMBIENCE MALL', 'Welcome! Namaste! Ram Ram!', '#1b1410', '#f6c026', 22, 3.4, ox, 12.5, oz + D2 / 2 - 0.4, Math.PI);
    bx(g, 4, 1.1, 2, 0xf28c1b, ox - 25, 0.55, oz + 20, { col: 'mall' }); sign(g, 'CHAI POINT', null, '#f28c1b', '#1b1410', 4, 0.9, ox - 25, 2.6, oz + 21.05);
    zone('mall', ox - 25, oz + 22.5, 3, () => 'Chai Point: cutting chai (₹20)', () => buyFood('m_chai', 'chai'));
    for (let k = 0; k < 4; k++) SHOPPERS.push({ zone: 'mall', x0: ox - 35, x1: ox + 15, z0: oz - 15, z1: oz + 28 });
  }
  { // OFFICE
    const ox = 2300, oz = 2000, W = 70, D2 = 50, H = 10; const g = makeRoom('office', ox, oz, W, D2, H, 'carpet', 0xdfe6ea, 4);
    sign(g, 'TECHNOVA', 'Building Bharat ka next unicorn (shayad)', '#0f2740', '#8fe0ff', 16, 3, ox, 6, oz - D2 / 2 + 0.4);
    bx(g, 10, 1.2, 2.4, 0xffffff, ox, 0.6, oz + 14, { col: 'office' }); npcStatic(g, ox, oz + 12.5, 0, 0x2e6bd1, 'Reception: Pooja');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const dx = ox - 21 + c * 11, dz = oz - 8 + r * 8;
      bx(g, 4.2, 0.12, 2, 0xf5f5f5, dx, 1.1, dz); bx(g, 0.1, 1.1, 2, 0x999999, dx - 2, 0.55, dz); bx(g, 0.1, 1.1, 2, 0x999999, dx + 2, 0.55, dz);
      bx(g, 1.6, 1, 0.1, 0x111111, dx, 1.75, dz - 0.6); bx(g, 1.4, 0.85, 0.02, 0, dx, 1.75, dz - 0.54, { mat: glow(0x4aa8ff) }); bx(g, 4.4, 1.6, 0.1, 0x9aa6b0, dx, 0.8, dz - 1.05); addCol('office', dx - 2.1, dx + 2.1, dz - 1.1, dz + 1); chair(g, dx, dz + 1.6, 0x1b1b1b);
      if (r === 1 && c === 1) { sign(g, 'YOUR DESK', null, '#f6c026', '#1b1410', 1.6, 0.5, dx, 2.5, dz - 0.5); OFFICE_DESK.x = dx; OFFICE_DESK.z = dz + 2.2; }
      else if (Math.random() < 0.7) { const n = npcStatic(g, dx, dz + 1.4, Math.PI, pick(D.SHIRTS)); sitChar(n); n.position.y = -0.35; }
    }
    zone('office', OFFICE_DESK.x, OFFICE_DESK.z, 2.5, () => G.shiftCD > now() ? 'Break time. Next shift in ' + Math.ceil(G.shiftCD - now()) + 's' : 'Start work shift (' + D.RANKS[P ? P.rank : 0][0] + ', ' + fmt(D.RANKS[P ? P.rank : 0][1]) + ')', () => startShift());
    const gm = new THREE.MeshLambertMaterial({ color: 0x9fd3f0, transparent: true, opacity: 0.35 });
    bx(g, 0.2, H - 2, 16, 0, ox - W / 2 + 16, (H - 2) / 2, oz - D2 / 2 + 8, { mat: gm, col: 'office' }); bx(g, 10, H - 2, 0.2, 0, ox - W / 2 + 5, (H - 2) / 2, oz - D2 / 2 + 16, { mat: gm, col: 'office' });
    table(g, ox - W / 2 + 8, oz - D2 / 2 + 6, 5, 2.4, 0x3a2a1a); addCol('office', ox - W / 2 + 5.5, ox - W / 2 + 10.5, oz - D2 / 2 + 4.8, oz - D2 / 2 + 7.2);
    npcStatic(g, ox - W / 2 + 8, oz - D2 / 2 + 4, 0, 0x1c1c1c, 'Malhotra Sir (Boss)'); sign(g, 'BOSS CABIN', null, '#1b1410', '#ffffff', 4, 0.8, ox - W / 2 + 13, 4, oz - D2 / 2 + 16.2);
    zone('office', ox - W / 2 + 13, oz - D2 / 2 + 18, 3, () => 'Talk to Malhotra Sir: ask for promotion', () => askPromotion());
    bx(g, 14, 1.1, 2, 0xf5f5f5, ox + W / 2 - 9, 0.55, oz - D2 / 2 + 2, { col: 'office' }); bx(g, 1.4, 1.6, 1.2, 0xd7331f, ox + W / 2 - 12, 1.9, oz - D2 / 2 + 2); bx(g, 2, 4, 2, 0xcccccc, ox + W / 2 - 3, 2, oz - D2 / 2 + 2, { col: 'office' });
    sign(g, 'PANTRY', 'Chai · Coffee · Gossip', '#1a8a4a', '#ffffff', 6, 1.2, ox + W / 2 - 9, 4.6, oz - D2 / 2 + 0.4);
    zone('office', ox + W / 2 - 12, oz - D2 / 2 + 4.5, 3, () => 'Free office chai (and gossip)', () => { if (G.chaiT > now()) return toast('Ek baar mein ek hi chai, bhai'); G.chaiT = now() + 40; L.hunger = Math.min(100, L.hunger + 10); toast(pick(OFFICE_GOSSIP)); });
    bx(g, 0.2, H - 2, 14, 0, ox + W / 2 - 16, (H - 2) / 2, oz + D2 / 2 - 11, { mat: gm, col: 'office' }); table(g, ox + W / 2 - 8, oz + D2 / 2 - 11, 4, 9, 0x3a2a1a); addCol('office', ox + W / 2 - 10, ox + W / 2 - 6, oz + D2 / 2 - 15.5, oz + D2 / 2 - 6.5);
    bx(g, 6, 3, 0.1, 0, ox + W / 2 - 8, 3, oz + D2 / 2 - 1, { mat: glow(0x223344) }); sign(g, 'Q3 TARGETS', null, '#ffffff', '#d7331f', 5, 1.2, ox + W / 2 - 8, 3.2, oz + D2 / 2 - 1.1, Math.PI);
    for (let k = 0; k < 5; k++) cyl(g, 0.6, 1.4, 0x2f7a35, ox - W / 2 + 2, 0.7, oz - 5 + k * 5);
  }
  { // THEKA
    const ox = 2600, oz = 2000, W = 26, D2 = 20, H = 6.5; const g = makeRoom('theka', ox, oz, W, D2, H, 'tile', 0xc9e3b8, 4);
    bx(g, W, 1.3, 1.2, 0x6b4a2b, ox, 0.65, oz - 1, { col: 'theka' });
    for (let x = -W / 2 + 0.5; x <= W / 2 - 0.5; x += 0.7) { if (Math.abs(x) < 1.4) continue; bx(g, 0.08, H - 1.3, 0.08, 0x3a3a3a, ox + x, 1.3 + (H - 1.3) / 2, oz - 1); }
    bx(g, W, 0.12, 0.12, 0x3a3a3a, ox, H - 0.2, oz - 1);
    for (let s = 0; s < 4; s++) { bx(g, W - 4, 0.12, 1, 0x7c4a2b, ox, 1 + s * 1.2, oz - D2 / 2 + 0.8); bottles(g, ox - W / 2 + 3, ox + W / 2 - 3, 1.06 + s * 1.2, oz - D2 / 2 + 0.8, 24); }
    bx(g, 2.4, 4, 1.4, 0xdddddd, ox + W / 2 - 2, 2, oz - 6); bx(g, 2.2, 3.6, 0.05, 0, ox + W / 2 - 2, 2.1, oz - 5.28, { mat: glow(0x9fe8ff) });
    npcStatic(g, ox, oz - 3, 0, 0xf5f5f5, 'Bholu Bhaiya');
    bx(g, 4, 0.12, 0.2, 0, ox, H - 0.5, oz - 4, { mat: glow(0xffffff) }); bx(g, 4, 0.12, 0.2, 0, ox, H - 0.5, oz + 4, { mat: glow(0xffffff) });
    sign(g, 'SARKARI THEKA', 'Desi · Angrezi · Beer', '#1a8a4a', '#f6c026', 8, 1.6, ox, H - 1.6, oz - 1.7);
    sign(g, 'PEEKE GAADI NA CHALAO!', 'Iffco Chowk pe naka lagta se', '#d7331f', '#ffffff', 8, 1.6, ox - W / 2 + 0.35, 3, oz + 5, Math.PI / 2);
    sign(g, 'AHATA', 'Baith ke aaram se', '#f6c026', '#1b1410', 5, 1.2, ox + W / 2 - 0.35, 3, oz + 5, -Math.PI / 2);
    for (let k = 0; k < 2; k++) { const tx = ox + 7, tz = oz + 3 + k * 4; table(g, tx, tz, 2, 2, 0xd7331f); chair(g, tx - 1.6, tz, 0xd7331f); chair(g, tx + 1.6, tz, 0xd7331f); addCol('theka', tx - 1, tx + 1, tz - 1, tz + 1); }
    const ah = npcStatic(g, ox + 5.4, oz + 3, Math.PI / 2, 0xf3b61f, 'Ramkishan Yadav'); sitChar(ah); ah.position.y = -0.4;
    zone('theka', ox, oz + 0.8, 2.6, () => 'Bholu Bhaiya: counter (khidki)', () => openFood('Desi Theka No.1', 'Khidki se le, line mein lag ke', 'theka'));
  }
  { // DHABA
    const ox = 2900, oz = 2000, W = 40, D2 = 30, H = 8; const g = makeRoom('dhaba', ox, oz, W, D2, H, 'mud', 0xe9c27a, 5);
    sign(g, 'HORN OK PLEASE', 'Truck walon ka favourite', '#d7331f', '#f6c026', 8, 2, ox - 12, 5, oz - D2 / 2 + 0.4); sign(g, 'BURI NAZAR WALE', 'Tera muh kala', '#1a8a4a', '#fff4d8', 8, 2, ox, 5, oz - D2 / 2 + 0.4); sign(g, 'JAI JAWAN JAI KISAN', null, '#f28c1b', '#1b1410', 8, 2, ox + 12, 5, oz - D2 / 2 + 0.4);
    bx(g, 14, 1.2, 2, 0x7c4a2b, ox - 6, 0.6, oz - D2 / 2 + 5, { col: 'dhaba' }); for (let k = 0; k < 6; k++) cyl(g, 0.35, 0.6, 0xc0c0c0, ox - 11 + k * 2, 1.5, oz - D2 / 2 + 5);
    sign(g, 'MENU', 'Paratha · Dal Makhani · Lassi · Kadhi · Nimbu paani', '#1b1410', '#f6c026', 7, 2, ox - 6, 3.6, oz - D2 / 2 + 3.9);
    const td = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 1.8, 16), mat(0xa0522d)); td.position.set(ox + 8, 0.9, oz - D2 / 2 + 4); g.add(td);
    const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16), glow(0xff7a1a)); fire.position.set(ox + 8, 1.82, oz - D2 / 2 + 4); g.add(fire); addCol('dhaba', ox + 6.5, ox + 9.5, oz - D2 / 2 + 2.5, oz - D2 / 2 + 5.5);
    npcStatic(g, ox - 6, oz - D2 / 2 + 3.6, 0, 0xffffff, 'Cook Bittu'); npcStatic(g, ox + 8, oz - D2 / 2 + 1.8, 0, 0xf3b61f, 'Tandoor Ustaad', 'pagdi');
    for (let k = 0; k < 4; k++) { charpai(g, ox - 14 + k * 9, oz + 4, 0); addCol('dhaba', ox - 15 + k * 9, ox - 13 + k * 9, oz + 2.3, oz + 5.7); }
    for (let k = 0; k < 3; k++) { const tx = ox - 10 + k * 10, tz = oz - 3; table(g, tx, tz, 4, 1.6, 0x6b4a2b); bx(g, 4, 0.5, 0.5, 0x6b4a2b, tx, 0.5, tz - 1.3); bx(g, 4, 0.5, 0.5, 0x6b4a2b, tx, 0.5, tz + 1.3); addCol('dhaba', tx - 2, tx + 2, tz - 0.8, tz + 0.8); }
    const ch = npcStatic(g, ox - 5, oz + 4, Math.PI / 2, 0x1d8a4e, 'Hukam Singh Dalal', 'pagdi'); sitChar(ch); ch.position.y = -0.15; cyl(g, 0.2, 1.2, 0x7c4a2b, ox - 3.6, 1.4, oz + 4.8);
    for (let k = 0; k < 14; k++) sph(g, 0.18, 0, ox - W / 2 + 2 + k * (W - 4) / 13, H - 1.2 - Math.sin(k / 13 * Math.PI) * 0.8, oz, glow(pick([0xffd27a, 0xff6fa5, 0x8fe0ff, 0x9be564])));
    zone('dhaba', ox - 6, oz - D2 / 2 + 7, 3.2, () => 'Order from the dhaba menu', () => openFood('Sher-e-Haryana Dhaba', 'Ghee mein dooba pyaar', 'dhaba'));
    zone('dhaba', ox + 4, oz + 4, 3, () => 'Rest on the charpai (heal)', () => { G.hp = Math.min(100, G.hp + 40); toast('Charpai pe aaraam kiya. +40 health'); });
  }
  { // NEON NIGHTS CLUB
    const ox = 3200, oz = 2000, W = 50, D2 = 40, H = 10; const g = makeRoom('club', ox, oz, W, D2, H, 'club', 0x1a1024, 4);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const m = new THREE.MeshBasicMaterial({ color: 0x220033 }); const t = new THREE.Mesh(BOX, m); t.scale.set(1.9, 0.08, 1.9); t.position.set(ox - 7 + i * 2, 0.05, oz - 4 + j * 2); g.add(t); CLUB.tiles.push(t); }
    bx(g, 10, 1.4, 3, 0x2a1838, ox, 0.7, oz - D2 / 2 + 3, { col: 'club' }); bx(g, 3, 0.3, 1.2, 0x111111, ox - 2, 1.55, oz - D2 / 2 + 3); bx(g, 3, 0.3, 1.2, 0x111111, ox + 2, 1.55, oz - D2 / 2 + 3);
    for (const sx of [-8, 8]) { bx(g, 2.5, 5, 2, 0x111111, ox + sx, 2.5, oz - D2 / 2 + 2, { col: 'club' }); cyl(g, 0.8, 0.1, 0x333333, ox + sx, 3.5, oz - D2 / 2 + 3.05).rotation.x = Math.PI / 2; }
    npcStatic(g, ox, oz - D2 / 2 + 1.6, 0, 0x111111, 'DJ Sunny', 'cap');
    sign(g, 'NEON NIGHTS', 'DJ Sunny live · Desi club mix', '#0b0614', '#ff2bd6', 18, 3, ox, 7.5, oz - D2 / 2 + 0.4);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xdddddd, wireframe: true })); ball.position.set(ox, H - 1.5, oz + 3); g.add(ball); CLUB.ball = ball;
    for (let k = 0; k < 6; k++) { const l = bx(g, 0.08, 0.08, 30, 0, ox, H - 1.6, oz + 3, { mat: new THREE.MeshBasicMaterial({ color: pick([0xff2bd6, 0x00e5ff, 0x39ff14]), transparent: true, opacity: 0.6 }) }); l.rotation.y = k; CLUB.lasers.push(l); }
    // bar (west)
    bx(g, 2, 1.3, 14, 0x3a1050, ox - W / 2 + 4, 0.65, oz - 2, { col: 'club' }); bx(g, 0.2, 1.3, 14, 0, ox - W / 2 + 5.05, 0.65, oz - 2, { mat: glow(0xff2bd6) });
    for (let s = 0; s < 3; s++) { bx(g, 0.6, 0.1, 12, 0x2a1838, ox - W / 2 + 1, 1.5 + s * 1.2, oz - 2); for (let k = 0; k < 14; k++) cyl(g, 0.12, 0.6, pick([0x5a2d0c, 0x1f5f2a, 0xc9c3b5, 0xd9a520]), ox - W / 2 + 1, 1.85 + s * 1.2, oz - 8 + k * 0.9); }
    npcStatic(g, ox - W / 2 + 2.5, oz - 2, Math.PI / 2, 0x111111, 'Bartender Vicky');
    zone('club', ox - W / 2 + 6.5, oz - 2, 3, () => 'Bar: drinks', () => openFood('Neon Nights bar', 'Club prices, club swag', 'clubbar'));
    // VIP booth (east)
    bx(g, 2, 1, 10, 0x8b1e1e, ox + W / 2 - 2, 0.5, oz - 2, { col: 'club' }); bx(g, 0.6, 2, 10, 0x8b1e1e, ox + W / 2 - 1, 1, oz - 2); table(g, ox + W / 2 - 5, oz - 2, 2, 4, 0x111111);
    sign(g, 'VIP', 'Bottle service', '#e8c27a', '#1b1410', 4, 1.2, ox + W / 2 - 0.4, 4, oz - 2, -Math.PI / 2);
    zone('club', ox + W / 2 - 7.5, oz - 2, 3, () => 'VIP: bottle for the whole club (₹15,000)', () => bottleService());
    zone('club', ox, oz + 3, 7, () => 'Dance floor: B to dance, or challenge someone to a dance-off', () => openDanceOff());
    for (let k = 0; k < 7; k++) { const c = makeChar(pick(D.SHIRTS)); c.position.set(ox - 6 + rnd(0, 12), 0.1, oz - 2 + rnd(0, 10)); c.rotation.y = rnd(0, 6); g.add(c); CLUB.dancers.push(c); }
  }
}

// ================================================================ HUD
// At most two short toasts at a time, never the same text twice
// Notifications queue up and show one at a time on phones (two on bigger screens), so they never cover the view.
// If they pile up the plain ones are dropped first and the rest show a little faster.
const TQ = [];
function toast(msg, cls) {
  if (!msg) return; const box = $('toasts'); for (const c of box.children) if (c.dataset.src === msg) return; if (TQ.some(q => q.msg === msg)) return;
  TQ.push({ msg, cls }); while (TQ.length > 3) { const i = TQ.findIndex(q => !q.cls); TQ.splice(i >= 0 ? i : 0, 1); } pumpToasts();
}
function pumpToasts() {
  const box = $('toasts'); const phone = document.body.classList.contains('touch'); if (!TQ.length || box.querySelectorAll('.toast:not(.out)').length >= (phone ? 1 : 2)) return;
  const { msg, cls } = TQ.shift(); const t = el('div', { class: 'toast' + (cls ? ' ' + cls : ''), text: msg }); t.dataset.src = msg; box.prepend(t);
  const life = (phone ? 2300 : 3000) * (TQ.length ? 0.7 : 1); setTimeout(() => { t.classList.add('out'); setTimeout(() => { t.remove(); pumpToasts(); }, 220); }, life);
}
A.hooks.toast = toast; A.hooks.label = radioLabel;
// City news: quiet for the first 20 s and during races, at most three lines
function feed(text, kind) { if (G.race || G.story || now() - (G.startedAt || 0) < 20) return; const d = el('div', { class: kind || '', text }); $('feed').prepend(d); while ($('feed').children.length > 3) $('feed').lastChild.remove(); setTimeout(() => d.remove(), 10500); }
function updateHUD() {
  if (!P) return;
  $('pname').textContent = P.name; $('plv').textContent = 'Lv ' + P.level; $('money').textContent = fmt(P.money); $('ptitle').textContent = D.respectTitle(P.respect) + ' · ' + P.respect + ' R';
  const need = D.xpNeed(P.level); $('xpt').textContent = P.xp >= need ? 'Full · kaam baaki' : P.xp + '/' + need; $('xpb').style.width = (P.xp / need * 100) + '%';
  $('hpt').textContent = Math.round(G.hp); $('hpb').style.width = G.hp + '%'; $('hut').textContent = Math.round(L.hunger); $('hub').style.width = L.hunger + '%';
}
// ================================================================ AAJ KE KAAM (daily tasks): panel, phone button, tap to go
const TASK_ICON = { kamai: '₹', badla: '👊', shop: '🛍', club: '💃', job: '💼', thrill: '🔥', food: '🍲' };
const kfmt = n => n >= 1000 ? (n / 1000).toFixed(n % 1000 && n < 1e4 ? 1 : 0) + 'k' : String(n);
function dailyTasks() { return P && P.missions && P.missions.v === 2 ? P.missions.active : []; }
function taskProg(a) { return a.done ? a.n : Math.max(0, Math.min(a.n, (P.c[a.k] || 0) - a.base)); }
function taskCount(a, p) { return a.k === 'earned' ? kfmt(p) + '/' + kfmt(a.n) : p + '/' + a.n; }
function streakNext() { const s = P.streak; return s && s.day && Date.parse(P.missions.day) - Date.parse(s.day) <= 864e5 ? s.n : 0; }
function renderMissions() {
  const box = $('mlist'), act = dailyTasks(); if (!P) return; box.textContent = ''; const nd = act.filter(a => a.done).length;
  $('missions').querySelector('h4').textContent = 'Aaj ke kaam · ' + nd + '/' + act.length + (P.streak && P.streak.n ? ' · 🔥' + P.streak.n : '');
  const ds = donState(); if (ds) box.append(el('button', { type: 'button', class: 'm don' + (!ds.avail ? ' done' : ''), onclick: openDon }, el('i', { text: ds.champ ? '👑' : '📖' }), el('span', { text: ds.champ ? 'Tu Gali ka Don se! Monday nayi kahani' : ds.avail ? (ds.called ? 'Gali ke Don ch ' + (ds.ch + 1) + ': ' + ds.C.boss + ' (' + ds.at[2] + ')' : '📞 Golu ka call: Gali ke Don ch ' + (ds.ch + 1)) : 'Gali ke Don: kal ch ' + (ds.ch + 1) + ' khulega' }), el('b', { text: ds.ch + '/5' }), el('em', { style: 'width:' + ds.ch * 20 + '%' })));
  for (const a of act) { const p = taskProg(a); box.append(el('button', { type: 'button', class: 'm' + (a.done ? ' done' : ''), title: a.t, onclick: () => goTask(a) }, el('i', { text: a.done ? '✓' : TASK_ICON[a.slot] || '•' }), el('span', { text: a.t }), el('b', { text: taskCount(a, p) }), el('em', { style: 'width:' + Math.round(p / a.n * 100) + '%' }))); }
  if (act.length) box.append(el('div', { class: 'mfoot', text: nd === act.length ? 'Sab poore! Kal naye kaam aayenge' : nd < 3 ? (3 - nd) + ' aur = Level ' + (P.level + 1) + ' khulega' : 'Saare 7 = ' + fmt(D.dailyBonus(P.level, streakNext())) + ' bonus' }));
  $('mchip').textContent = '📋 Aaj ke kaam ' + nd + '/' + act.length;
}
function goTask(a) {
  if (a.done) return toast('Ye kaam ho gaya ✓ Baaki kar!');
  const near = pts => pts.reduce((b, q) => Math.hypot(q[0] - G.x, q[1] - G.z) < Math.hypot(b[0] - G.x, b[1] - G.z) ? q : b);
  const go = { badla: () => setWaypoint(a.x, a.z, a.enemy + ' (' + a.place + ')'), mall: () => setWaypoint(DOORS.mall.x, DOORS.mall.z, 'Ambience Mall'), club: () => setWaypoint(DOORS.club.x, DOORS.club.z, 'Neon Nights club'),
    office: () => setWaypoint(DOORS.office.x, DOORS.office.z, 'TechNova office'), dhaba: () => setWaypoint(DOORS.dhaba.x, DOORS.dhaba.z, 'Sher-e-Haryana Dhaba'), akhara: () => setWaypoint(AKHARA.x, AKHARA.z, 'Akhara, Leisure Valley'),
    market: () => { const q = near([[-150, 0, 'Galleria Market'], [300, 0, 'Sadar Bazaar']]); setWaypoint(q[0], q[1], q[2]); }, jhatpat: appDelivery, chalo: appRide, races: appRaces, events: appEvents }[a.go];
  closeModal(); if (go) go(); else toast(a.k === 'earned' ? 'Paise: Chalo rides, Jhatpat delivery, office shift, race, dangal. Phone (Tab) kholo.' : a.k === 'jacks' ? 'Sadak pe kisi gaadi ke paas jaa ke E dabao. Driver ko KO kar!' : 'Gali ke chhore sadkon pe ghoomte hain. Punch maar ke shuru kar!');
}
function openTasks() {
  const act = dailyTasks(); if (!act.length) return; const nd = act.filter(a => a.done).length;
  openModal('Aaj ke kaam · ' + nd + '/' + act.length, 'Naye kaam raat 12 baje · 3 poore = agla level · saare poore = bonus', b => {
    const ds = donState(); if (ds) b.append(itemRow((ds.champ ? '👑 ' : '📖 ') + 'Gali ke Don · chapter ' + Math.min(ds.ch + 1, 5) + '/5', ds.champ ? 'Tu is hafte ka Don se!' : ds.avail ? ds.C.boss + (ds.called ? ' (' + ds.at[2] + ')' : ' · tere paas aayega') + ' · inaam ' + donRewardText(ds.ch) : 'Aaj ka chapter ho gaya, kal agla', 'Kahani', openDon));
    b.append(itemRow('📸 Aaj ka Hisaab card', 'Aaj ke kaarname ek card pe · Story pe daalo', 'Banao', () => { closeModal(); makeDayCard(); }));
    for (const a of act) { const p = taskProg(a); const row = itemRow((a.done ? '✓ ' : TASK_ICON[a.slot] + ' ') + a.t, taskCount(a, p) + ' · inaam ' + fmt(a.r), a.done ? 'Ho gaya' : 'Chalo', () => goTask(a)); row.append(el('div', { class: 'tbar' }, el('i', { style: 'width:' + Math.round(p / a.n * 100) + '%' }))); b.append(row); }
    b.append(el('p', { class: 'fine', text: 'Saare 7 poore: ' + fmt(D.dailyBonus(P.level, streakNext())) + ' bonus + 10 respect. Roz poore karo, streak se bonus 2 guna tak.' + (P.streak && P.streak.n ? ' Abhi streak: ' + P.streak.n + ' din 🔥' : '') }));
  });
}
// Gali ke Don: one chapter a day; the boss and his chele wait at their corner
function donState() { const d = P && P.don; if (!d) return null; const ch = d.ch, C = D.DON[ch]; const at = (d.spot != null && D.DON_SPOTS[d.spot]) || (C && C.at); return { d, ch, C, at, called: d.spot != null, avail: !!C && d.last !== (P.missions && P.missions.day), champ: d.champ === d.wk }; }
let DONF = [];
function clearDon() { for (const n of DONF) if (FIGHTERS.includes(n)) { scene.remove(n.mesh); FIGHTERS.splice(FIGHTERS.indexOf(n), 1); } DONF = []; }
function updateDon() {
  const s = donState(); if (!s || !s.avail) { if (DONF.length && !DONF.some(n => n.state === 'ko')) clearDon(); return; }
  if (!s.called) { if (DONF.length) clearDon(); maybeDonCall(s); return; }
  if (DONF.length && (DONF[0].donCh !== s.ch || DONF[0].donSpot !== s.d.spot)) clearDon(); DONF = DONF.filter(n => FIGHTERS.includes(n));
  if (!DONF.length || !DONF.some(n => n.donBoss)) { clearDon(); const k = D.donScale(P.level), [x, z] = s.at;
    const boss = makeFighter(s.C.boss + ' · Don ch ' + (s.ch + 1), x, z, Math.round(s.C.hp * k), s.C.dmg, 0x3b0d0d); boss.donBoss = true; boss.donCh = s.ch; boss.donSpot = s.d.spot; boss.don = true; boss.mesh.scale.set(1.12, 1.12, 1.12); FIGHTERS.push(boss); DONF.push(boss);
    for (let i = 0; i < s.C.hench; i++) { const h = makeFighter(pick(['Chela', 'Chamcha', 'Chela No. ' + (i + 1)]), x + Math.cos(i * 2.1) * 3, z + Math.sin(i * 2.1) * 3, Math.round(45 * k), 5, 0x222222); h.don = true; h.donCh = s.ch; h.donSpot = s.d.spot; FIGHTERS.push(h); DONF.push(h); } }
  const boss = DONF.find(n => n.donBoss); if (!boss) return; const d = Math.hypot(G.x - boss.x, G.z - boss.z);
  if (!boss.seen && d < 45 && !G.inside) { boss.seen = true; bigText('CHAPTER ' + (s.ch + 1) + ': ' + s.C.boss.toUpperCase(), s.at[2] + ' · Gali ke Don', 2.2); }
  if (d < 13 && !G.inside && !G.veh && G.hp > 0) for (const n of DONF) if (n.state === 'wander') { n.state = 'aggro'; if (n.donBoss && !n.taunted) { n.taunted = true; say(n, s.C.taunt, 3); } }
}
// the phone rings: how a new player finds the story. Accepting brings the boss to the nearest corner.
function maybeDonCall(s) {
  if (G.donCallOpen || !G.startedAt || now() - G.startedAt < 20 || now() < (G.donCallNext || 0)) return;
  if (G.story || (G.race && G.race.phase !== 'done') || G.frun || G.map || G.inside || G.selfie || G.minigame || G.chase || !$('modal').hidden || !$('raceres').hidden || G.veh && Math.abs(G.vs) > 20) return;
  const day = P.missions && P.missions.day; const lc = L.donCalls && L.donCalls.day === day ? L.donCalls : { day, n: 0 }; if (lc.n >= 2) return;
  lc.n++; L.donCalls = lc; saveLocal(); showDonCall(s);
}
function showDonCall(s) {
  const [who, face, msg] = D.DON_CALLS[s.ch] || D.DON_CALLS[0]; G.donCallOpen = true; if (document.pointerLockElement) document.exitPointerLock();
  const box = el('div', { id: 'doncall' }); box.innerHTML = '<div class="dc-in"><div class="dc-face">' + face + '</div><div class="dc-who"></div><div class="dc-sub">📞 Incoming call · Gali ke Don ch ' + (s.ch + 1) + '</div><div class="dc-msg"></div><div class="dc-btns"><button type="button" class="dc-no">Baad mein</button><button type="button" class="dc-yes">Chal, aata hoon 👊</button></div></div>';
  box.querySelector('.dc-who').textContent = who; box.querySelector('.dc-msg').textContent = '"' + msg + '"'; document.body.append(box);
  let rings = 0; const ring = setInterval(() => { if (rings++ > 6 || !box.isConnected) return clearInterval(ring); A.sfx('beep'); setTimeout(() => A.sfx('beep'), 180); }, 1300);
  const close = () => { clearInterval(ring); box.remove(); G.donCallOpen = false; };
  box.querySelector('.dc-no').onclick = () => { close(); G.donCallNext = now() + 600; toast('Golu: "Theek se bhai, jab time ho phone (Tab) mein Gali ke Don dabana."'); };
  box.querySelector('.dc-yes').onclick = () => { close(); G.donCallNext = now() + 600; acceptDon(); }; // no second ring while the server confirms
}
async function acceptDon() {
  const s = donState(); if (!s || !s.avail) return; let best = 0, bd = 1e9;
  D.DON_SPOTS.forEach((q, i) => { const d = Math.hypot(q[0] - G.x, q[1] - G.z), sc = d < 50 ? d + 400 : d; if (sc < bd) { bd = sc; best = i; } }); // nearest corner, but not right on top of you
  const r = await net.req('donstart', { spot: best }); if (!r.ok) return toast('Abhi nahi ho paya, thodi der mein try kar');
  const q = D.DON_SPOTS[best]; setWaypoint(q[0], q[1], s.C.boss + ' (' + q[2] + ')'); const dist = Math.round(Math.hypot(q[0] - G.x, q[1] - G.z) / 5) * 5;
  showCard('Chapter ' + (s.ch + 1) + ': ' + s.C.boss, s.C.intro.replace(s.C.at[2], q[2]) + ' (' + dist + ' m door)', [['🛺 Auto bulao (₹50)', async () => { $('raceres').hidden = true; const b2 = await buy('misc', 'don_auto'); if (!b2.ok) return; if (G.veh) dismount(); fadeTo('Auto wale bhaiya ' + q[2] + ' le ja rahe se...', 1400, () => { G.x = q[0] + 9; G.z = q[1] + 9; G.r = G.yaw = Math.atan2(-9, -9); }); }, 'alt'], ['Khud jaunga (GPS on)', () => { $('raceres').hidden = true; }, 'alt2']], 'GPS laga diya · Chele bhi saath honge, taiyaar reh!');
}
function donRewardText(i) { return fmt(Math.round(D.DON[i].r * (1 + 0.1 * Math.min(P.level, 10)) / 10) * 10); }
function openDon() {
  const s = donState(); if (!s) return; closeModal();
  openModal('Gali ke Don · is hafte ki kahani', 'Roz ek chapter · har Monday nayi kahani · finale jeeto, bano Gali ka Don 👑', b => {
    D.DON.forEach((C, i) => { const done = i < s.ch, today = i === s.ch && s.avail, locked = !done && !today;
      const row = itemRow((done ? '✓ ' : today ? '👊 ' : '🔒 ') + 'Ch ' + (i + 1) + ': ' + C.boss + ' · ' + C.at[2], done ? 'Ho gaya' : today ? (s.called ? C.boss + ' ' + s.at[2] + ' mein wait kar rya se.' : C.intro.split('.')[0] + '. Boss tere sabse paas wale chowk pe aayega.') + ' Inaam ' + donRewardText(i) : i === s.ch ? 'Aaj ka chapter ho gaya. Kal khulega!' : 'Pichhla chapter poora karo', today ? 'Chalo' : done ? '✓' : '🔒', () => { if (!today) return; closeModal(); if (s.called) setWaypoint(s.at[0], s.at[1], C.boss + ' (' + s.at[2] + ')'); else acceptDon(); }, !today); b.append(row); });
    if (s.champ) b.append(el('p', { class: 'fine', text: '👑 Tu is hafte ka Gali ka Don se! Monday ko nayi kahani.' }));
  });
}
// Badla: today's goon waits at his corner; KO him for the task
let BADLA = null;
function updateBadla() {
  const a = dailyTasks().find(x => x.k === 'badla' && !x.done);
  if (!a) { if (BADLA && BADLA.state !== 'ko') { scene.remove(BADLA.mesh); FIGHTERS.splice(FIGHTERS.indexOf(BADLA), 1); } if (!BADLA || BADLA.state !== 'ko') BADLA = null; return; }
  if (BADLA && !FIGHTERS.includes(BADLA)) BADLA = null;
  if (!BADLA) { const lv = Math.min(P.level, 10); BADLA = makeFighter(a.enemy + ' · badla', a.x, a.z, 100 + 10 * lv, 6 + (lv >> 1), 0x151515); BADLA.badla = a; FIGHTERS.push(BADLA); }
  const n = BADLA, d = Math.hypot(G.x - n.x, G.z - n.z);
  if (n.state === 'wander' && d < 12 && !G.inside && !G.veh && G.hp > 0) { n.state = 'aggro'; if (!n.taunted) { n.taunted = true; say(n, 'Haan maine peeta! Ke karega?', 3); bigText('BADLA!', a.enemy + ' mil gaya. Dhobi pachhad maar!', 1.6); } }
}

// ================================================================ SERVER CALLS
async function buy(kind, id, extra) { const r = await net.req('buy', { kind, id, ...(extra || {}) }); if (!r.ok) { toast(r.error || 'Nahi ho paya', 'bad'); A.sfx('err'); } else A.sfx('cash'); return r; }
async function earn(reason, amount, why) { const r = await net.req('earn', { reason, amount: Math.round(amount), why }); if (!r.ok && r.error) toast(r.error, 'bad'); return r; }
const ev = k => net.send('ev', { k });

// ================================================================ MODALS & SHOPS
function openModal(title, sub, build) { if (document.pointerLockElement) document.exitPointerLock(); $('mTitle').textContent = title; G.modalTitle = title; $('mSub').textContent = sub || ''; const b = $('mBody'); b.textContent = ''; build(b); $('modal').hidden = false; G.modal = true; G.modalBuild = () => openModal(title, sub, build); }
function closeModal() { $('modal').hidden = true; G.modal = false; G.minigame = null; G.modalBuild = null; }
$('mClose').onclick = closeModal; $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeModal(); });
function itemRow(name, desc, btnText, onClick, disabled, alt) { const b = el('button', { class: 'buy' + (alt ? ' alt' : ''), text: btnText, onclick: onClick }); if (disabled) b.disabled = true; return el('div', { class: 'item' }, el('div', { class: 't' }, el('b', { text: name }), el('small', { text: desc || '' })), b); }
const wallet = () => 'Wallet ' + fmt(P ? P.money : 0);
async function buyFood(id, shop) {
  const f = D.FOOD[id]; const r = await buy('food', id, { shop }); if (!r.ok) return false;
  L.hunger = Math.min(100, L.hunger + f[2]); G.hp = Math.min(100, G.hp + f[2] / 3); A.sfx('eat');
  if (f[3] === 'drink') { G.tipsy = Math.max(G.tipsy, now()) + 35; L.drinks++; G.drankAt = now(); toast('Masti chadh gayi! ' + f[0] + (L.drinks >= 3 ? ' · zyada ho gayi, kal hangover pakka' : '')); }
  else if (f[3] === 'cure') { if (G.hangover || L.drinks) { G.hangover = false; L.drinks = 0; $('hangover').hidden = true; toast('Nimbu ne kamaal kar diya. Hangover gayab!'); } else toast('Thanda thanda nimbu!'); }
  else toast('Swaad aa gaya! ' + f[0] + ' (+' + f[2] + ' bhookh)');
  if (shop === 'dhaba') tutEvent('ate'); saveLocal(); updateHUD(); return true;
}
function openFood(title, sub, shop) { openModal(title, sub + ' · ' + wallet(), b => { for (const id of D.FOOD_SHOPS[shop]) { const f = D.FOOD[id]; b.append(itemRow(f[0], f[3] === 'drink' ? 'Masti + respect (no driving after!)' : f[3] === 'cure' ? 'Hangover ka ilaaj' : '+' + f[2] + ' bhookh', fmt(f[1]), async () => { if (await buyFood(id, shop)) $('mSub').textContent = sub + ' · ' + wallet(); })); } }); }
function mallStore(kind) {
  if (kind === 'fashion') openModal('Chhora Fashion', 'Naya kurta, naya swag · ' + wallet(), b => { D.SHIRTS.forEach((c, i) => { const own = P.outfit.shirt === i; b.append(itemRow(D.SHIRT_NAMES[i] + ' shirt', 'Ek dum fresh', own ? 'Pehna hua' : fmt(D.MISC.shirt[1]), async () => { const r = await buy('shirt', i); if (r.ok) { toast('Kya lag rya se! Naya ' + D.SHIRT_NAMES[i] + ' shirt'); closeModal(); } }, own)); }); });
  if (kind === 'hats') openModal('Pagdi Palace', 'Sar pe taj · ' + wallet(), b => { for (const [id, h] of Object.entries(D.HATS)) { const own = P.outfit.hat === id; b.append(itemRow(h[0], own ? 'Abhi pehna hua' : 'Try kar, jachega', own ? 'Pehna hua' : (h[1] ? fmt(h[1]) : 'Free'), async () => { const r = await buy('hat', id); if (r.ok) { toast('Sar pe naya taj!'); closeModal(); } }, own)); } });
  if (kind === 'shades') openModal('Shades & Shoes', 'Kaala chashma jachda ae · ' + wallet(), b => { b.append(itemRow('Kaala chashma', 'Aviator, full attitude', P.outfit.shades ? 'Utaar do' : fmt(1200), async () => { if (P.outfit.shades) { net.send('unshade', {}); closeModal(); return; } const r = await buy('shades', 'x'); if (r.ok) closeModal(); })); });
  if (kind === 'lucky') openModal('Lucky Draw Counter', 'Ek scratch card ₹200 · ' + wallet(), b => { const out = el('p', { text: 'Scratch kar aur dekh kismat. Inaam: ₹0 se ₹5,000.' }); b.append(out, itemRow('Scratch card', 'Har baar naya mauka', fmt(200), async () => { const r = await buy('misc', 'lucky'); if (!r.ok) return; out.textContent = r.prize ? 'Jeet gaya ' + fmt(r.prize) + '! Ek aur?' : 'Agli baar pakka. Kismat so rahi se.'; if (G_WHEEL) G.wheelSpin = 2; $('mSub').textContent = 'Ek scratch card ₹200 · ' + wallet(); })); });
  if (kind === 'cinema') openModal('Reel Star Cinema', 'Popcorn free with ticket · ' + wallet(), b => { for (const mv of [['Chaudhary No.1', 'Haryanvi action · 2h 10m'], ['Dil Haryanvi', 'Romance + dhamaal · 2h 25m'], ['Cyber City Ke Sher', 'Office comedy · 1h 55m']]) b.append(itemRow(mv[0], mv[1], fmt(250), async () => { const r = await buy('misc', 'movie'); if (!r.ok) return; closeModal(); fadeTo('Picture chal rahi se... ' + mv[0], 2600, () => { L.hunger = Math.min(100, L.hunger + 10); toast('Paisa vasool picture thi!'); }); })); });
}
function openDealer() { openModal('Chaudhary Motors', 'Gaadi le, swag badha · ' + wallet(), b => { for (const t of D.BUY_VEHICLES) { const v = D.VEH[t]; const own = P.vehicles.includes(t); b.append(itemRow(v.name, 'Top speed ' + v.speed * 4 + ' km/h · ' + (v.kind === 2 ? '2-wheeler' : 'Car') + (own ? ' · in your garage' : ''), own ? 'Owned' : fmt(v.price), async () => { const r = await buy('vehicle', t); if (r.ok) { A.sfx('level'); toast('Badhai ho! ' + v.name + ' teri hui. Press V to ride.', 'money'); closeModal(); } }, own)); } }); }
function openProperty() { openModal('Yadav Estates', 'Ghar lo, roz kiraya kamao · ' + wallet(), b => { b.append(el('p', { text: 'Sharma PG mein rehne walon se Yadav ji roz ' + fmt(D.PG_RENT) + ' rent katte hain. Apna ghar le aur rent ki chhutti.' })); for (const [k, h] of Object.entries(D.HOUSES)) { const own = P.houses.includes(k); b.append(itemRow(h.name, (h.daily ? 'Daily income +' + fmt(h.daily) : 'Starter room') + (P.home === k ? ' · your home' : '') + (k === 'farm' ? ' · host farmhouse parties' : ''), own ? (P.home === k ? 'Home' : 'Set home') : fmt(h.price), async () => { if (own) { net.send('sethome', { h: k }); toast('Ab yeh tera ghar se: ' + h.name); closeModal(); return; } const r = await buy('house', k); if (r.ok) { A.sfx('level'); toast('Naya ghar! ' + h.name, 'money'); closeModal(); } }, own && P.home === k, own)); } }); }
function openMetro(from) { openModal('Rapid Metro', 'From ' + from + ' · ₹30 a trip', b => { for (const m of METROS) { if (m.name === from) continue; b.append(itemRow(m.name, 'About 1 minute', fmt(30), async () => { const r = await buy('misc', 'metro'); if (!r.ok) return; closeModal(); fadeTo('Rapid Metro: agla station ' + m.name, 1600, () => teleport(m.x, m.z + 4, 0)); })); } }); }
async function rentScooter() { if (G.veh) return toast('Pehle current gaadi se utar (V)'); const r = await buy('misc', 'rent'); if (r.ok) { G.rented = true; mount('rent'); toast('Bhaago e-scooter rent ho gaya! V se utroge to rental khatam.'); } }
function openJeweller() { openModal('Goyal Jewellers', 'Golf Course Road · ' + wallet(), b => { b.append(el('p', { text: 'Jitna sona, utni izzat. Sab players ko tera bling dikhega.' })); for (const [id, it] of Object.entries(D.BLING)) { const own = P.bling.includes(id); b.append(itemRow(it.name, '+' + Math.round(it.show / 2) + ' respect · show-off ' + it.show, own ? 'Pehna hua' : fmt(it.price), async () => { const r = await buy('bling', id); if (r.ok) { toast('Chamak gaya! ' + it.name, 'money'); G.modalBuild && G.modalBuild(); } }, own)); } }); }
function openMods(vehSel) {
  if (!P.vehicles.length) return openModal('Sandhu Car Accessories', 'Pehle gaadi le, phir modify kar', b => { b.append(el('p', { text: 'Chaudhary Motors yahin bagal mein se. Gaadi kharid ke wapas aa.' })); b.append(modsPlateBlock()); });
  const veh = vehSel || (P.cur && P.vehicles.includes(P.cur) ? P.cur : P.vehicles[0]);
  openModal('Sandhu Car Accessories', D.VEH[veh].name + ' · ' + wallet(), b => {
    if (P.vehicles.length > 1) { const tabs = el('div', { class: 'tabs' }); for (const v of P.vehicles) tabs.append(el('button', { class: v === veh ? 'on' : '', text: D.VEH[v].name, onclick: () => openMods(v) })); b.append(tabs); }
    const cur = P.mods[veh] || {}; const two = D.VEH[veh].kind === 2;
    for (const [id, m] of Object.entries(D.MODS)) {
      if (two && (id === 'film' || id === 'bull' || id === 'glow' || id === 'sticker')) continue;
      const has = cur[id] !== undefined && cur[id] !== false;
      if (id === 'glow' || id === 'sticker') {
        b.append(el('h3', { text: m.name + (has ? ' · lag gaya' : ' · ' + fmt(m.price)) }), el('p', { text: m.desc + (has ? '. Badalne ka ₹500.' : '') }));
        const row = el('div', { class: id === 'glow' ? 'swatchrow' : 'tabs' });
        (id === 'glow' ? D.GLOW_COLORS : D.STICKERS).forEach((v, i) => { const sel = has && (cur[id] | 0) === i; const btn = id === 'glow' ? el('button', { 'aria-label': 'Glow colour ' + (i + 1), style: 'background:' + hex(v), class: sel ? 'sel' : '' }) : el('button', { class: sel ? 'on' : '', text: v }); btn.onclick = async () => { const r = await buy('mod', id, { veh, opt: i }); if (r.ok) { refreshMyVehicle(); openMods(veh); } }; row.append(btn); });
        b.append(row);
      } else b.append(itemRow(m.name, m.desc, has ? 'Laga hua' : fmt(m.price), async () => { const r = await buy('mod', id, { veh }); if (r.ok) { refreshMyVehicle(); toast(m.name + ' lag gaya!'); openMods(veh); } }, has));
    }
    b.append(modsPlateBlock());
  });
}
function modsPlateBlock() { const w = el('div', { style: 'display:grid;gap:8px' }); w.append(el('h3', { text: 'Number plate: ' + (P.plate || 'none') })); w.append(itemRow('Random HR26 plate', 'Naya number, turant', fmt(D.RANDOM_PLATE_PRICE), async () => { const r = await buy('misc', 'plate'); if (r.ok) { refreshMyVehicle(); toast('Nayi plate: ' + P.plate); closeModal(); } })); w.append(itemRow('VIP plate auction', 'HR26 0001, 0007, 0786... live boli', 'Open', () => appPlates(), false, true)); return w; }
function bottleService() { openModal('VIP bottle service', 'Poore club ko pata chalega · ' + wallet(), b => { b.append(el('p', { text: 'Ek bottle poore club ke liye. Har player ko announcement jaega aur tera Party King score +50.' }), itemRow('Bottle for the whole club', '+50 party score, +10 respect', fmt(D.MISC.bottle[1]), async () => { const r = await buy('misc', 'bottle'); if (r.ok) { G.tipsy = Math.max(G.tipsy, now()) + 40; L.drinks++; closeModal(); } })); }); }

// ================================================================ PHONE
function openPhone() {
  tutEvent('phone');
  openModal('Menu', P.name + ' · ' + fmt(P.money) + ' · Tab / Esc se band', b => {
    const quick = [['Map', '#1a8a4a', 'M', () => { closeModal(); openMap3D(); }], ['Dance', '#ff6fa5', 'B', () => { closeModal(); toggleDance(); }], ['Horn', '#f28c1b', 'H', () => { closeModal(); horn(); }], ['Chat', '#2563b8', 'T', () => { closeModal(); openChat(); }], ['Selfie', '#8b3fc4', 'C', () => { closeModal(); startSelfie(); }], ['Gaadi', '#0f766e', 'F', () => { closeModal(); toggleVehicle(); }], [A.Radio.playing ? 'Radio off' : 'Radio on', '#1b1410', 'FM', () => { A.toggleMusic(); closeModal(); }]];
    const qg = el('div', { class: 'apps' }); for (const a of quick) qg.append(el('button', { class: 'app', onclick: a[3] }, el('i', { style: 'background:' + a[1], text: a[2] }), a[0])); b.append(el('h3', { text: 'Abhi karo' }), qg, el('h3', { text: 'Phone apps' }));
    const apps = [['Races', '#d7331f', 'GO', appRaces], ['Paani paar', '#1f7ab8', '~', startFloodRun], ['Chalo', '#111', 'C', appRide], ['Jhatpat', '#d7331f', 'J', appDelivery], ['Garage', '#2563b8', 'G', appGarage], ['Ghar', '#f28c1b', 'H', appHome], ['Top 10', '#e8b923', '#1', () => appLeaderboard()], ['Crew', '#00a3b4', 'K', appCrew], ['Plates', '#1b1410', 'HR', appPlates], ['Events', '#d7331f', '!', appEvents], ['Card', '#ff6fa5', '📷', () => { closeModal(); startSelfie(); }], ['Radio', '#8b3fc4', 'FM', appRadio], ['Online', '#6a5acd', 'O', appOnline], ['Bhasha', '#2f5fd0', 'Aa', appLang], ['Help', '#0f766e', '?', openHelp]]; apps.unshift(['Aaj ke kaam', '#e07b10', '✓', openTasks], ['Gali ke Don', '#3b0d0d', '👊', openDon], ['Aaj ka card', '#ff6fa5', '📸', () => makeDayCard()]);
    const grid = el('div', { class: 'apps' }); for (const a of apps) grid.append(el('button', { class: 'app', onclick: a[3] }, el('i', { style: 'background:' + a[1], text: a[2] }), a[0])); b.append(grid);
    b.append(el('h3', { text: 'Stats' }), el('p', { text: `Rides ${P.c.rides || 0} · Deliveries ${P.c.deliveries || 0} · Shifts ${P.c.shifts || 0} · KOs ${P.c.kos || 0} · Respect ${P.respect} · Party ${P.party} · Net worth ${fmt(D.netWorth(P))}` }));
    b.append(el('p', { text: 'Login streak: ' + P.daily.streak + ' din. Kal wapas aa, aur bada inaam milega.' }));
  });
}
function appRide() { openModal('Chalo Driver', 'Passenger le jao, paise kamao' + (G.ev?.type === 'flood' ? ' · FLOOD SURGE 2x' : ''), b => { if (G.job) { b.append(el('p', { text: 'Current job: ' + jobText() }), itemRow('Cancel current job', '', 'Cancel', () => { endJob(); closeModal(); }, false, true)); return; } b.append(el('p', { text: G.veh ? 'Cars pay 40% more (AC wali sawari).' : 'Ride ke liye gaadi chahiye. Iffco Chowk se e-scooter rent kar, ya Chaudhary Motors se khareed.' }), itemRow('Go online and accept a ride', 'Pickup → drop, fast drop = tip', G.veh ? 'Go online' : 'Need vehicle', () => { closeModal(); startJob('ride'); }, !G.veh)); }); }
function appDelivery() { openModal('Jhatpat Food', '10 minute delivery, Gurugram style' + (G.ev?.type === 'flood' ? ' · FLOOD SURGE 2x' : ''), b => { if (G.job) { b.append(el('p', { text: 'Current job: ' + jobText() }), itemRow('Cancel current job', '', 'Cancel', () => { endJob(); closeModal(); }, false, true)); return; } b.append(el('p', { text: 'Paidal bhi chalega, par gaadi se jaldi hoga.' }), itemRow('Accept a delivery order', 'Restaurant se uthao, sector mein pahunchao', 'Accept', () => { closeModal(); startJob('delivery'); })); }); }
function appGarage() { openModal('Garage', 'V to ride your selected vehicle · H for pressure horn', b => { if (!P.vehicles.length) { b.append(el('p', { text: 'Garage khaali se. Chaudhary Motors (NH-48 Auto Mile) se gaadi le, ya Iffco Chowk pe e-scooter rent kar.' }), itemRow('Set GPS to Chaudhary Motors', '', 'Set GPS', () => { setWaypoint(300, -300, 'Chaudhary Motors'); closeModal(); })); return; } for (const t of P.vehicles) { const m = P.mods[t] || {}; const mods = Object.keys(m).filter(k => m[k] !== false).map(k => D.MODS[k].name).join(', '); b.append(itemRow(D.VEH[t].name, (P.cur === t ? 'Selected' : 'Tap to select') + (mods ? ' · ' + mods : ''), P.cur === t ? 'Selected' : 'Select', () => { net.send('setcur', { v: t }); P.cur = t; appGarage(); }, P.cur === t)); } b.append(itemRow('Modify at Sandhu Car Accessories', 'Horn, film, bull bar, neon, stickers, plates', 'GPS', () => { setWaypoint(345, -255, 'Sandhu Car Accessories'); closeModal(); }, false, true)); }); }
function homePos() { const h = D.HOUSES[P.home] || D.HOUSES.pg; if (P.home === 'farm') return { x: D.SPOTS.farmLawn.x, z: D.SPOTS.farmLawn.z }; return { x: h.at[0] * 150 + (h.at[0] < 0 ? 40 : -40), z: h.at[1] * 150 + 66 }; }
function appHome() { const h = D.HOUSES[P.home]; openModal('Ghar: ' + h.name, 'Sleep to restore health and cure the hangover', b => { b.append(itemRow('Go home', 'Free auto ride home', 'Go', () => { closeModal(); fadeTo('Ghar ja rya se...', 1200, () => { const p = homePos(); teleport(p.x, p.z, 0); }); }), itemRow('So jao', 'Full health, hangover gayab', 'Sleep', () => { closeModal(); fadeTo('Zzz... so rya se', 2200, () => { G.hp = 100;  G.hangover = false; L.drinks = 0; $('hangover').hidden = true; saveLocal(); const p = homePos(); teleport(p.x, p.z, 0); toast('Neend poori! Ram Ram.'); }); }), itemRow('Buy a better home', 'Yadav Estates, DLF Phase 3', 'GPS', () => { setWaypoint(-300, -103, 'Yadav Estates'); closeModal(); }, false, true)); if (P.houses.includes('farm')) b.append(itemRow('Host a farmhouse party', 'Sab players ko invite jaega', fmt(D.MISC.party[1]), () => hostParty(), !!G.party)); }); }
async function appLeaderboard(tab) {
  tab = tab || 'rich'; const r = await net.req('lb', {}); const lb = (r.ok && r.lb) || G.lb || {};
  openModal('Gurugram Top 10', 'Sabse bada kaun? Live rankings', b => {
    const tabs = el('div', { class: 'tabs' }); for (const [k, n] of [['rich', 'Richest'], ['fight', 'Fighters'], ['party', 'Party Kings'], ['respect', 'Respect'], ['crews', 'Crews']]) tabs.append(el('button', { class: k === tab ? 'on' : '', text: n, onclick: () => appLeaderboard(k) })); b.append(tabs);
    const list = el('div', { class: 'lb' }); const rows = lb[tab] || [];
    if (!rows.length) b.append(el('p', { text: 'Abhi khaali se. Pehla naam tera ho sakta se!' }));
    rows.forEach((x, i) => { const v = tab === 'rich' ? fmt(x.v) : tab === 'crews' ? x.turf + ' areas · ' + x.members + ' log' : x.v; list.append(el('span', { text: '#' + (i + 1) }), el('span', { class: 'n', text: (tab === 'crews' ? '[' + x.tag + '] ' + x.name : (x.crew ? '[' + x.crew + '] ' : '') + x.name) + (x.id === P.id ? ' (you)' : '') }), el('span', { class: 'v', text: v })); });
    b.append(list); if (db_belt()) b.append(el('p', { text: 'Akhara champion: ' + db_belt().name }));
  });
}
const db_belt = () => G.belt;
async function appCrew() {
  const r = await net.req('crews', {}); const crews = (r.ok && r.crews) || [];
  openModal('Crew & ilaaka', 'Crew bana, sectors pe kabza kar, ilaaka bonus kama', b => {
    b.append(el('p', { text: 'Crew ke log jis sector mein ghoomte hain aur jahan KO karte hain, wahan ki pakad badhti hai. Kabze wale sectors se har minute online members ko bonus milta hai. Minimap pe crew ke rang dikhte hain.' }));
    const mine = crews.find(c => c.id === P.crew);
    if (mine) { b.append(el('h3', { text: 'Teri crew: [' + mine.tag + '] ' + mine.name }), el('p', { text: mine.members + ' members · ' + mine.turf + ' areas · leader ' + mine.leader }), itemRow('Leave crew', '', 'Leave', async () => { const x = await net.req('crew_leave', {}); if (x.ok) { toast('Crew chhod di'); appCrew(); } }, false, true)); }
    else {
      b.append(el('h3', { text: 'Nayi crew banao (' + fmt(D.CREW_PRICE) + ')' }));
      const n = el('input', { class: 'field', id: 'crewName', maxlength: '18', placeholder: 'Crew name, e.g. Sector 29 Sher' }); const t = el('input', { class: 'field', id: 'crewTag', maxlength: '4', placeholder: 'Tag, e.g. S29' });
      b.append(n, t, itemRow('Create crew', 'Tu leader banega', fmt(D.CREW_PRICE), async () => { const x = await buy('crew', 'new', { name: n.value, tag: t.value }); if (x.ok) appCrew(); }));
    }
    b.append(el('h3', { text: 'Sab crews' })); if (!crews.length) b.append(el('p', { text: 'Abhi koi crew nahi. Pehli tu bana!' }));
    for (const c of crews.sort((a, b2) => b2.turf - a.turf)) b.append(itemRow('[' + c.tag + '] ' + c.name, c.members + ' members · ' + c.turf + ' areas · leader ' + c.leader, c.id === P.crew ? 'Teri crew' : 'Join', async () => { const x = await net.req('crew_join', { id: c.id }); if (!x.ok) return toast(x.error, 'bad'); toast('Crew [' + c.tag + '] mein swagat se!'); appCrew(); }, c.id === P.crew || !!P.crew));
  });
}
function appPlates() {
  openModal('VIP number plates', 'HR26 = Gurugram. Plate dekh ke log samajh jaate hain.', b => {
    b.append(el('p', { text: 'Teri plate: ' + (P.plate || 'abhi koi nahi') }));
    const a = G.auction;
    if (a) { const left = Math.max(0, Math.round(a.ends - serverNow())); const min = Math.max(D.PLATE_START_BID, Math.ceil(a.bid * 1.1 / 1000) * 1000);
      b.append(el('h3', { text: 'Live boli: ' + a.plate }), el('p', { text: (a.by ? 'Sabse badi boli ' + fmt(a.bid) + ' by ' + a.byName : 'Abhi tak koi boli nahi') + ' · ' + left + 's baaki' }));
      const inp = el('input', { class: 'field', id: 'bidIn', type: 'number', min: String(min), step: '1000' }); inp.value = min;
      b.append(inp, itemRow('Boli lagao', 'Last 20 second mein boli lagi to 20s badh jaata se', 'Bid', async () => { const r = await net.req('bid', { amount: Number(inp.value) }); if (!r.ok) return toast(r.error, 'bad'); toast('Boli lag gayi: ' + fmt(Number(inp.value))); A.sfx('ok'); appPlates(); }));
    } else b.append(el('p', { text: 'Agli VIP boli jaldi shuru hogi. Feed mein announcement aayega.' }));
    b.append(itemRow('Random HR26 plate', 'Turant, koi boli nahi', fmt(D.RANDOM_PLATE_PRICE), async () => { const r = await buy('misc', 'plate'); if (r.ok) { refreshMyVehicle(); toast('Nayi plate: ' + P.plate); appPlates(); } }));
  });
}
function appEvents() {
  openModal('Events', 'Gurugram mein abhi kya chal rya se', b => {
    const e = G.ev;
    if (e) { const left = Math.max(0, Math.round(e.end - serverNow())); b.append(el('h3', { text: e.name }), el('p', { text: eventHelp(e.type) + ' · ' + Math.ceil(left / 60) + ' min baaki' })); const wp = eventSpot(e.type); if (wp) b.append(itemRow('Go there', '', 'Set GPS', () => { setWaypoint(wp.x, wp.z, e.name); closeModal(); })); }
    else b.append(el('p', { text: 'Abhi koi bada event nahi. Baraat, Holi, Diwali, IPL screening, flood aur mahajam baari baari aate hain.' }));
    b.append(el('h3', { text: 'Farmhouse party' }));
    if (G.party) b.append(itemRow(G.party.hostName + ' ki party', G.party.guests + ' guests · Bhondsi farmhouse', 'Join party', () => { closeModal(); joinParty(); }));
    else b.append(el('p', { text: 'Koi party nahi chal rahi. Bhondsi farmhouse ke maalik party host kar sakte hain.' }));
    if (G.roast) b.append(el('h3', { text: 'Roast battle: ' + G.roast.aName + ' vs ' + G.roast.bName }), el('p', { text: 'Left panel mein dekh aur vote kar.' }));
    b.append(el('h3', { text: 'Akhara champion' }), el('p', { text: G.belt ? G.belt.name + ' ke paas aaj ka belt se. Akhara mein unhe KO kar ke belt chheen.' : 'Aaj ka belt Pehlwan Bhola ke paas se. Dangal jeet ke champion ban.' }));
  });
}
function eventHelp(t) { return { thaila: 'Sabse pehle pahuncho, saara paisa tera! GPS laga diya.', baraat: 'Golf Course Road pe baraat nikal rahi se. Paas jaake B se naacho, ₹1,000 ke note udao', jam: 'Iffco Chowk pe mahajam. Phansi gaadiyon ko chai becho (E)', flood: 'Kuch sectors mein paani bhar gaya. Chalo aur Jhatpat pe 2x surge', holi: 'Sohna Road pe Holi. G dabao, logon pe rang daalo', diwali: 'Diwali ki raat. Rocket chhodo (phone → Events, ya Action)', ipl: 'Cyber Hub big screen pe match. Cheer karo aur dekho' }[t] || ''; }
function eventSpot(t) { if (t === 'thaila') return G.ev && G.ev.data && G.ev.data.x != null ? { x: G.ev.data.x, z: G.ev.data.z } : null; return { baraat: { x: -225, z: baraatZ() }, jam: { x: 0, z: -75 }, holi: { x: 150, z: 0 }, ipl: { x: 150, z: -295 }, flood: null, diwali: { x: 0, z: 40 } }[t]; }
function appOnline() {
  openModal('Online players', net.solo ? 'Solo mode' : (G.peerCount || 1) + ' online', b => {
    if (net.solo) { b.append(el('p', { text: window.GL_SOLO ? 'Tu solo mode mein khel rya se. Leaderboard, crews aur VIP plate ki boli mein rival log computer chalata se.' : 'Solo mode: multiplayer server se connection nahi bana. Wajah: ' + (G.soloReason || 'unknown') })); if (!window.GL_SOLO) b.append(itemRow('Try multiplayer again', 'Page reload karke server se dobara judega', 'Try again', () => location.reload())); }
    const muted = lsGet('gl_muted') || [];
    b.append(el('p', { text: 'Kisi ki chat band karni ho to Mute dabao. Sirf tujhe nahi dikhegi.' }));
    for (const [id, R] of REMOTES) { if (!R.info) continue; const m = muted.includes(id); b.append(itemRow((R.info.crew ? '[' + R.info.crew.tag + '] ' : '') + R.info.name, 'Level ' + R.info.level + ' · ' + R.info.title + (R.info.plate ? ' · ' + R.info.plate : '') + (R.info.belt ? ' · CHAMPION' : ''), m ? 'Unmute' : 'Mute', () => { const list = lsGet('gl_muted') || []; const i = list.indexOf(id); if (i >= 0) list.splice(i, 1); else list.push(id); lsSet('gl_muted', list); appOnline(); }, false, !m)); }
    if (!REMOTES.size) b.append(el('p', { text: 'Abhi koi aur nahi se. Doston ko link bhej!' }));
  });
}
function appMap() { return openMap3D(); }
function appMap2D() { openModal('Gurugram Map', 'Tap anywhere to set GPS. Yellow = you. Crew colours = ilaaka', b => { const c = el('canvas', { id: 'bigmap', width: 600, height: 600 }); b.append(c); drawBigMap(c); c.addEventListener('pointerdown', e => { const r = c.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width - 0.5) * 900, z = ((e.clientY - r.top) / r.height - 0.5) * 900; const d = blockOf(x, z); setWaypoint(x, z, d ? d[2] : 'GPS point'); drawBigMap(c); }); const list = el('div', { style: 'display:grid;gap:6px' }); for (const [n, x, z] of [['Metro Grand Mall (MG Road)', -150, -289], ['TechNova Towers (Cyber City)', 0, -297], ['Sher-e-Haryana Dhaba (Sector 29)', 150, -143], ['Neon Nights club (Sector 29)', 192, -96], ['Desi Theka No.1 (Sohna Road)', 150, 47], ['Chaudhary Motors (NH-48)', 300, -300], ['Sandhu Car Accessories', 345, -258], ['Goyal Jewellers (Golf Course Road)', -300, 47], ['Chalo Cabs Hub (Iffco Chowk)', 30, -103], ['Leisure Valley Akhara', 300, -140], ['Badshahpur Chaupal', 144, 152], ['Bhondsi farmhouse', 150, 315], ['Civil Hospital', 0, 156], ['Sheetla Mata Mandir', 300, 154], ['Yadav Estates (DLF Phase 3)', -300, -103]]) list.append(itemRow(n, '', 'Set GPS', () => { setWaypoint(x, z, n); closeModal(); })); b.append(el('h3', { text: 'Famous places' }), list); }); }
const TYPE_COL = { towers: '#a9b4bd', luxury: '#c9b58a', res: '#d6b9a0', mall: '#8fb8d6', office: '#7fa7c9', cyberhub: '#e09a8a', dealer: '#e0b05a', hub: '#c9c2b4', dhaba: '#f0c06a', park: '#6fae5a', forest: '#4e8f45', market: '#e8a76a', plaza: '#e8d9a8', theka: '#9bd18a', hospital: '#f2f2f2', village: '#b9c27a', temple: '#f2b36a', industrial: '#9a9a9a' };
function wrapText(x, t, cx, cy, maxW, lh) { const words = t.split(' '); const lines = []; let cur = ''; for (const w of words) { const test = cur ? cur + ' ' + w : w; if (x.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; } lines.push(cur); lines.forEach((l, i) => x.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * lh)); }
function drawBigMap(c) {
  const x = c.getContext('2d'); const s = c.width / 900; x.fillStyle = '#6f6a4a'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#3b3b3d'; for (const r of ROADS) { x.fillRect((r + 450 - 7) * s, 0, 14 * s, c.height); x.fillRect(0, (r + 450 - 7) * s, c.width, 14 * s); }
  for (const d of DIST) { const cx = (d[0] * 150 + 450) * s, cz = (d[1] * 150 + 450) * s; x.fillStyle = TYPE_COL[d[3]] || '#9a927e'; x.fillRect(cx - 68 * s, cz - 68 * s, 136 * s, 136 * s); const t = G.turf && G.turf[d[2]]; if (t) { x.strokeStyle = hex(t.color); x.lineWidth = 6; x.strokeRect(cx - 66 * s, cz - 66 * s, 132 * s, 132 * s); } x.fillStyle = '#1b1410'; x.font = '700 ' + Math.round(15 * s * 2) + 'px "Baloo 2", sans-serif'; x.textAlign = 'center'; wrapText(x, d[2] + (t ? ' [' + t.tag + ']' : ''), cx, cz, 130 * s, 17 * s * 2); }
  if (G.wp) { x.fillStyle = '#d7331f'; x.beginPath(); x.arc((G.wp.x + 450) * s, (G.wp.z + 450) * s, 9, 0, 7); x.fill(); }
  if (G.job) { const t = jobTarget(); x.fillStyle = '#2fc46b'; x.beginPath(); x.arc((t.x + 450) * s, (t.z + 450) * s, 9, 0, 7); x.fill(); }
  const p = G.inside ? DOORS[G.inside] || { x: 0, z: 0 } : G; x.fillStyle = '#f6c026'; x.strokeStyle = '#1b1410'; x.lineWidth = 3; x.beginPath(); x.arc((p.x + 450) * s, (p.z + 450) * s, 10, 0, 7); x.fill(); x.stroke();
}

// ================================================================ HELP & TUTORIAL
function openHelp() {
  openModal('Kaise khelein · How to play', 'Gurugram Life: kamao, party karo, show off karo, lado', b => {
    const sec = (h, items) => { b.append(el('h3', { text: h })); const ul = el('ul'); for (const i of items) ul.append(el('li', { text: i })); b.append(ul); };
    sec('Controls (keyboard + mouse)', ['Click the game once: mouse se dekho (Esc chhodta hai). W A S D: chalo / gaadi chalao.', 'Space: jump (gaadi mein handbrake drift). Shift: daudo (gaadi mein NOS).', 'Left-click or Q: punch. Right-click or E: action. F: gaadi mein baitho / utro.', 'Tab: Menu (sab kuch). M: 3D map. T: chat. B: dance. H: horn. C: selfie. R: next radio station.']);
    sec('Controls (phone)', ['Joystick: chalo (poora dhakelo to daudo). Right side drag: dekho.', 'Jump (gaadi mein NOS), Punch, Gaadi, aur Action jab koi kaam paas ho. Baaki sab Menu mein.']);
    sec('Kamaai (earning)', ['Jhatpat deliveries (on foot works), Chalo rides (vehicle needed, cars pay more).', 'TechNova Towers: your desk shift, then ask Malhotra Sir for a promotion.', 'Ramphal Ahlawat in Badshahpur gives big side jobs. Missions bottom-left never end. Daily login streak bonus.', 'Dangal at Leisure Valley: ₹1,000 and the champion belt.']);
    sec('Show-off', ['VIP HR26 plates: live auctions (Phone → Plates). Random plates at Sandhu Car Accessories.', 'Car mods: pressure horn, black film, bull bar, bass speaker, neon underglow, stickers.', 'Goyal Jewellers: chain, kada, heavy watch, gold chashma. Everyone sees them.', 'Leaderboards: Richest, Fighters, Party Kings, Respect, Crews. Selfie card (C) to share on WhatsApp/Instagram.']);
    sec('Party & drinks', ['Neon Nights club in Sector 29: DJ, dance floor, bar, VIP bottle service announced to everyone, dance-off battles.', 'Farmhouse parties at Bhondsi for owners. Baraat events on Golf Course Road.', 'Drinking makes you tipsy. Driving through the Iffco Chowk police naka tipsy gets you a challan. 3+ drinks = hangover till nimbu paani or sleep.']);
    sec('Fights & crews', ['F to punch. KO = respect. You wake up at Civil Hospital (₹200 bill).', 'Bump another player\'s car: road rage. KO them within 60s for a bonus.', 'Crews fight for ilaaka (sectors). Akhara champion holds the belt until someone KOs them in the ring.', 'Roast battles at Badshahpur Chaupal: write roasts, everyone votes.']);
    sec('Chat', ['T to chat, or tap a quick Haryanvi taunt. Mute anyone from Phone → Online.']);
    b.append(itemRow('Replay the walkthrough', 'Step by step tour', 'Start', () => { closeModal(); startTutorial(); }));
  });
}
const TUT = [
  { t: 'Chal ke dekh! Move with W A S D (or the joystick). Hold Shift to run.', ev: 'moved' },
  { t: 'Look around: drag the mouse (or the right side of the screen). Scroll to zoom.', ev: 'looked' },
  { t: 'Open your phone: press P or tap Phone. Leaderboards, crews, plates, events: sab yahin.', ev: 'phone' },
  { t: 'Bhookh lagi? Follow the yellow beacon to Sher-e-Haryana Dhaba in Sector 29 and press E at the door.', ev: 'dhaba', wp: [150, -143, 'Sher-e-Haryana Dhaba'] },
  { t: 'Walk to the counter and press E. Order something tasty.', ev: 'ate' },
  { t: 'Kamaai time! Phone → Jhatpat → Accept a delivery. Follow the green beacon.', ev: 'delivered' },
  { t: 'Say Ram Ram to Gurugram: press T (or Chat) and send a message or a taunt.', ev: 'chat' },
  { t: 'Show off: press C (or Selfie) and make your Mera Gurugram card.', ev: 'card' },
];
function startTutorial() { G.tut = true; L.tut = 0; saveLocal(); showTut(); }
function showTut() { if (!G.tut) return; const s = TUT[L.tut]; if (!s) { G.tut = false; $('tut').hidden = true; net.send('tutdone', {}); toast('Shabaash! Ab tu asli Gurugram wala se.'); saveLocal(); return; } $('tut').hidden = false; $('tutk').textContent = 'Walkthrough · step ' + (L.tut + 1) + ' of ' + TUT.length; $('tutp').textContent = s.t; if (s.wp) setWaypoint(s.wp[0], s.wp[1], s.wp[2]); }
function tutEvent(e) { if (!G.tut) return; const s = TUT[L.tut]; if (s && s.ev === e) { L.tut++; saveLocal(); A.sfx('ok'); ev('tut'); showTut(); } }
$('tutSkip').onclick = () => { G.tut = false; $('tut').hidden = true; net.send('tutdone', {}); };

// ================================================================ JOBS
function makeBeacon(color) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.1, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); c.position.y = 30; g.add(c); const r = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.12, 6, 28), new THREE.MeshBasicMaterial({ color })); r.rotation.x = Math.PI / 2; r.position.y = 0.4; g.add(r); g.userData.ring = r; scene.add(g); return g; }
const jobBeacon = makeBeacon(0x2fc46b), wpBeacon = makeBeacon(0xf6c026); jobBeacon.visible = wpBeacon.visible = false;
function setWaypoint(x, z, name) { G.wp = { x, z, name }; wpBeacon.position.set(x, 0, z); wpBeacon.visible = true; toast('GPS set: ' + name); }
function jobTarget() { const j = G.job; return j.stage === 'pickup' ? j.from : j.to; }
function jobText() { const j = G.job; if (!j) return ''; if (j.type === 'quest') return j.title + ' → ' + j.to.name; return j.type === 'ride' ? (j.stage === 'pickup' ? 'Pick up ' + j.who + ' at ' + j.from.name : 'Drop ' + j.who + ' at ' + j.to.name) : (j.stage === 'pickup' ? 'Collect order at ' + j.from.name : 'Deliver to ' + j.to.name); }
function hereXZ() { return G.inside ? DOORS[G.inside] : G; }
function startJob(type) {
  if (G.job) return toast('Pehle current job poora kar'); if (type === 'ride' && !G.veh) return toast('Ride ke liye gaadi chahiye', 'bad');
  const here = hereXZ(); let from = type === 'ride' ? pick(PLACES) : pick(PICKUPS); let tries = 0;
  while (Math.hypot(from.x - here.x, from.z - here.z) > 350 && tries++ < 20) from = type === 'ride' ? pick(PLACES) : pick(PICKUPS);
  let to = pick(PLACES); tries = 0; while ((Math.hypot(to.x - from.x, to.z - from.z) < 160 || Math.hypot(to.x - from.x, to.z - from.z) > 520) && tries++ < 40) to = pick(PLACES);
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  G.job = { type, stage: 'pickup', from, to, who: pick(PASSENGERS), pay: Math.round(type === 'ride' ? 90 + d * 0.55 : 60 + d * 0.38), par: d / (type === 'ride' ? 20 : 9) + 25, t0: now() };
  jobBeacon.position.set(from.x, 0, from.z); jobBeacon.visible = true; A.sfx('ok'); toast(type === 'ride' ? 'Ride accepted! Pickup ' + G.job.who : 'Order accepted! Pickup at ' + from.name); renderJob();
}
function offerQuest() {
  if (G.job) return toast('Pehle current kaam poora kar'); if (G.questCD > now()) return toast('Ramphal ji: "Abhi aaram kar, thodi der baad aaiyo"');
  const q = pick(QUESTS); openModal('Ramphal Ahlawat', '2007 mein zameen biki, ab crorepati. Kaam dete hain, paisa bhi', b => { b.append(el('p', { text: '"' + q[0] + '. Jaldi pahunchaiyo, inaam milega."' }), itemRow('Kaam le lo', 'Reward up to ' + fmt(1500), 'Haan ji', () => { closeModal(); G.questCD = now() + 90; G.job = { type: 'quest', stage: 'drop', title: q[0], from: { x: 170, z: 155, name: 'Badshahpur' }, to: { name: blockOf(q[1], q[2])?.[2] || 'Gurugram', x: q[1], z: q[2] + 71 }, pay: irnd(1000, 1500), par: 70, t0: now() }; jobBeacon.position.set(q[1], 0, q[2] + 71); jobBeacon.visible = true; ev('quest_start'); renderJob(); })); });
}
function endJob() { G.job = null; jobBeacon.visible = false; $('job').hidden = true; }
function renderJob() { const j = G.job; if (!j) { $('job').hidden = true; return; } $('job').hidden = false; const t = jobTarget(); const p = hereXZ(); const d = Math.hypot(t.x - p.x, t.z - p.z); const surge = G.ev?.type === 'flood' && j.type !== 'quest' ? 2 : 1; $('job').textContent = ''; $('job').append(el('b', { text: (j.type === 'ride' ? 'Chalo ride · ' : j.type === 'quest' ? 'Ramphal ji ka kaam · ' : 'Jhatpat order · ') + fmt(j.pay * (j.car ? 1.4 : 1) * surge) }), el('div', { text: jobText() }), el('div', { class: 'dist', text: Math.round(d) + ' m' })); }
async function updateJob() {
  const j = G.job; if (!j || G.inside || j.busy) return; const t = jobTarget(); if (Math.hypot(t.x - G.x, t.z - G.z) >= 8) return;
  if (j.stage === 'pickup') { if (j.type === 'ride' && !G.veh) return; j.stage = 'drop'; j.t0 = now(); j.car = G.veh && D.VEH[G.veh].kind === 4; jobBeacon.position.set(j.to.x, 0, j.to.z); A.sfx('ok'); if (j.type === 'ride') { toast(j.who + ' baith gaye. "' + pick(RIDE_CHAT) + '"'); say(player, 'Ram Ram!', 3); } else toast('Order le liya! Garam garam pahuncha.'); return; }
  j.busy = true; const took = now() - j.t0; const surge = G.ev?.type === 'flood' && j.type !== 'quest' ? 2 : 1; let pay = j.pay * (j.car ? 1.4 : 1) * surge; const tip = took < j.par ? Math.round(pay * 0.25) : 0; const stars = took < j.par ? 5 : took < j.par * 1.6 ? 4 : 3;
  const reason = j.type === 'ride' ? 'ride' : j.type === 'quest' ? 'quest' : 'delivery';
  const r = await earn(reason, pay + tip, (j.type === 'ride' ? 'Ride' : j.type === 'quest' ? 'Ramphal ji khush' : 'Delivery') + ' · ' + stars + ' star' + (tip ? ' + tip' : ''));
  if (r.ok) { if (reason === 'delivery') tutEvent('delivered'); endJob(); } else j.busy = false;
}

// ================================================================ OFFICE MINIGAME
function startShift() {
  if (G.shiftCD > now()) return toast('Thoda break le, ' + Math.ceil(G.shiftCD - now()) + 's');
  const ar = ['←', '↑', '→', '↓'], keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']; const seq = []; for (let i = 0; i < 8; i++) seq.push(irnd(0, 3));
  let idx = 0, ok = 0; const t0 = now(), T = 11;
  openModal('Work shift: ' + D.RANKS[P.rank][0], 'Type the Excel shortcut combo before time runs out', b => {
    const row = el('div', { class: 'arrows' }); const spans = seq.map(s => el('span', { text: ar[s] })); spans.forEach(s => row.append(s)); spans[0].classList.add('cur');
    const timer = el('p', { text: 'Time: ' + T + 's', style: 'text-align:center;font-weight:700' }); const pad = el('div', { class: 'pad' }); ar.forEach((a, i) => pad.append(el('button', { text: a, onclick: () => press(i) }))); b.append(row, timer, pad);
    function press(i) { if (!G.minigame) return; if (i === seq[idx]) { spans[idx].classList.add('ok'); ok++; A.sfx('tick'); } else A.sfx('err'); spans[idx].classList.remove('cur'); idx++; if (idx >= seq.length) return finish(); spans[idx].classList.add('cur'); }
    async function finish() { if (!G.minigame) return; G.minigame = null; const pay = Math.round(D.RANKS[P.rank][1] * (0.3 + 0.7 * ok / seq.length)); closeModal(); G.shiftCD = now() + 22; await earn('shift', pay, 'Salary (' + ok + '/' + seq.length + ' tasks)'); if (ok === seq.length) toast('Malhotra Sir: "Shabaash! Aise hi kaam kar."'); }
    G.minigame = { press: k => { const i = keys.indexOf(k); if (i >= 0) press(i); }, tick: () => { const left = T - (now() - t0); timer.textContent = 'Time: ' + Math.max(0, left).toFixed(1) + 's'; if (left <= 0) finish(); } };
  });
}
async function askPromotion() { const r = await net.req('promote', {}); if (r.ok) { A.sfx('level'); toast('Promotion! Ab tu ' + D.RANKS[r.rank][0] + ' se. Salary ' + fmt(D.RANKS[r.rank][1]), 'money'); } else toast('Malhotra Sir: "' + (r.error || 'Abhi nahi') + '"'); }

// ================================================================ PLAYER
let player = null, playerVeh = null;
function myLook() { return { body: P.look, shirt: D.SHIRTS[P.outfit.shirt != null ? P.outfit.shirt : P.color], hat: P.outfit.hat, shades: P.outfit.shades, bling: P.bling, belt: !!(G.belt && G.belt.id === P.id), tint: G.myTint, crewColor: G.myCrew ? G.myCrew.color : null }; }
function applyMyLook() { if (player && P) setLook(player, myLook()); }
function refreshMyVehicle() { if (!G.veh || !playerVeh) return; scene.remove(playerVeh); playerVeh = makeVehicle(G.veh, null, (P.mods && P.mods[G.veh]) || {}, G.veh === 'rent' ? null : P.plate); scene.add(playerVeh); }
function mount(type) {
  if (G.inside) return toast('Andar gaadi nahi chalti, bhai'); if (G.veh) return;
  G.veh = type; G.vs = 0; playerVeh = makeVehicle(type, null, (P.mods && P.mods[type]) || {}, type === 'rent' ? null : P.plate); scene.add(playerVeh);
  player.visible = D.VEH[type].kind === 2 || D.VEH[type].kind === 5; if (player.visible) sitChar(player); G.dance = false;
  if (!G.quietMount) { A.sfx('engine'); toast('Chal pade ' + D.VEH[type].name + ' pe!'); }
  if (L.drinks > 0 && G.tipsy > now()) setTimeout(() => toast('Peeke chala rya se? Iffco Chowk naka pe dhyaan rakhiyo!', 'bad'), 1200);
}
function dismount() { if (!G.veh) return; if (G.race) cleanupRace(); if (G.jacked) { const c = G.jacked; G.jacked = null; G.loaner = false; if (c !== 'peer') { c.taken = false; c.p = c.p > 0 ? c.p - 445 : c.p + 445; } } if (G.loaner) { G.loaner = false; if (!G.story && !L.loanerOK) toast('Chacha ki gaadi wapas. Apni gaadi Chaudhary Motors (NH-48) se le!'); } G.slip = 0; scene.remove(playerVeh); playerVeh = null; if (G.veh === 'rent') { G.rented = false; toast('Rental khatam. Bhaago scooter wapas.'); } G.veh = null; G.vs = 0; player.visible = true; player.position.y = 0; G.x += Math.cos(G.r) * 1.8; G.z -= Math.sin(G.r) * 1.8; resolve(G, 0.6); }
function toggleVehicle() { if (G.veh) { if (G.race && G.race.phase !== 'done') return quitRace(); return dismount(); } if (G.inside) return toast('Bahar ja ke gaadi nikaal'); if (G.impound > now()) return toast('Gaadi police ne zabt kar rakhi se. ' + Math.ceil(G.impound - now()) + 's baaki', 'bad'); if (!P.vehicles.length) { if (L.loanerOK) { G.quietMount = true; mount(L.loanVeh || 'chhotu'); G.quietMount = false; G.loaner = true; return toast('Chacha ki ' + D.VEH[G.veh].name + '. Apni gaadi ka sapna upar dikh rya se!'); } return toast('Gaadi nahi hai. Iffco Chowk pe rent kar ya Chaudhary Motors se le.'); } const wet = P.vehicles.includes('naav') && [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].some(([a, b]) => waterDepth(G.x + a, G.z + b) > 0.3); mount(wet ? 'naav' : P.cur && P.vehicles.includes(P.cur) && P.cur !== 'naav' ? P.cur : P.vehicles.find(v => v !== 'naav') || P.vehicles[0]); }
function teleport(x, z, r) { G.x = x; G.z = z; G.r = r || 0; G.yaw = G.r; if (G.inside) { G.inside = null; setIndoor(false); } }
function enterInterior(key) { if (G.veh) dismount(); const I = INTERIOR[key]; fadeTo('', 500, () => { G.inside = key; G.x = I.spawn.x; G.z = I.spawn.z; G.r = I.spawn.r; G.yaw = G.r; setIndoor(true); toast('Welcome to ' + I.name); if (key === 'mall') ev('visit_mall'); if (key === 'club') { ev('visit_club'); A.setOverride('club'); } if (key === 'dhaba') tutEvent('dhaba'); if (key === 'theka') toast('Bholu Bhaiya: "Aao ji, kya chahiye?"'); }); }
function exitInterior() { const key = G.inside; const d = DOORS[key]; fadeTo('', 500, () => { G.inside = null; setIndoor(false); A.setOverride(null); G.x = d.x; G.z = d.z + 2; G.r = 0; G.yaw = 0; }); }
function setIndoor(on) { scene.fog.near = on ? 60 : 160; scene.fog.far = on ? 220 : 560; camera.far = on ? 260 : 640; camera.updateProjectionMatrix(); if (!on) A.setOverride(null); }
function fadeTo(text, ms, cb) { const f = $('fade'); f.textContent = text; f.classList.add('show'); G.frozen = true; setTimeout(() => { cb && cb(); setTimeout(() => { f.classList.remove('show'); G.frozen = false; }, Math.max(250, ms - 400)); }, 400); }
function resolve(o, r) {
  const list = COL[G.inside || 'out']; let hit = false;
  for (const c of list) { if (o.x + r > c.x0 && o.x - r < c.x1 && o.z + r > c.z0 && o.z - r < c.z1) { const a = o.x + r - c.x0, b = c.x1 - (o.x - r), cc = o.z + r - c.z0, d = c.z1 - (o.z - r); const m = Math.min(a, b, cc, d); if (m === a) o.x -= a; else if (m === b) o.x += b; else if (m === cc) o.z -= cc; else o.z += d; hit = true; } }
  if (!G.inside) { o.x = clamp(o.x, -445, 445); o.z = clamp(o.z, -445, 445); for (const c of COWS) { const dx = o.x - c.x, dz = o.z - c.z, dd = Math.hypot(dx, dz), rr = r + 1.3; if (dd < rr && dd > 0.01) { o.x = c.x + dx / dd * rr; o.z = c.z + dz / dd * rr; hit = true; if (G.veh && Math.abs(G.vs) > 8 && !c.mooT) { c.mooT = 2; A.sfx('moo'); } } } }
  return hit;
}

// ---------------- input
const keys = {}; let joyX = 0, joyY = 0, runBtn = false;
window.addEventListener('keydown', e => {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT')) { if (e.key === 'Escape') { closeChat(); document.activeElement.blur(); } return; }
  if (G.minigame && e.key.startsWith('Arrow')) { G.minigame.press(e.key); e.preventDefault(); return; }
  if (e.key === 'Escape' || (e.code === 'KeyM' && G.map)) { if (G.map) { closeMap3D(); return; } if (!$('modal').hidden) closeModal(); else if (G.selfie) endSelfie(); else if (!$('raceres').hidden) cleanupRace(); return; }
  if (!$('raceres').hidden && $('modal').hidden && G.race) { if (e.key === 'Enter') { e.preventDefault(); return startRace(G.race.R.id); } if (e.code === 'KeyN' && D.RACES[G.race.i + 1] && raceUnlocked(G.race.i + 1)) return startRace(D.RACES[G.race.i + 1].id); }
  if (!G.started || !$('modal').hidden) return;
  keys[e.code] = true;
  const k = e.code;
  if (k === 'KeyE') doAction(); if (k === 'KeyQ') punch(); if (k === 'KeyF' || k === 'KeyV') toggleVehicle(); if (k === 'KeyT') { e.preventDefault(); openChat(); } if (k === 'KeyP' || k === 'Tab') { e.preventDefault(); openPhone(); } if (k === 'KeyM') openMap3D(); if (k === 'KeyR') A.nextStation(); if (k === 'Space' && !G.veh) G.jumpReq = true; if (k === 'ShiftLeft' || k === 'ShiftRight') e.preventDefault();
  if (k === 'KeyB') toggleDance(); if (k === 'KeyH') horn(); if (k === 'KeyC') startSelfie(); if (k === 'KeyG') throwColor();
  if (k.startsWith('Arrow') || k === 'Space') e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let drag = null;
const locked = () => document.pointerLockElement === canvas;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && G.started && !G.map && $('modal').hidden && $('raceres').hidden) {
    if (locked()) { if (e.button === 0) punch(); else if (e.button === 2) doAction(); return; }
    if (!G.noLock && now() - (G.lockTry || 0) > 1.2) { G.lockTry = now(); try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch {} }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, mouse: true }; try { canvas.setPointerCapture(e.pointerId); } catch {} return; // no lock (yet): drag to look, click to punch
  }
  if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.4 && document.body.classList.contains('touch')) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
});
document.addEventListener('pointerlockerror', () => { if (!G.noLock) { G.noLock = true; if (G.started) toast('Mouse: drag karke ghumao, click se punch, right-click se action'); } });
document.addEventListener('pointerlockchange', () => { document.body.classList.toggle('locked', locked()); if (locked()) L.locked = 1; });
document.addEventListener('mousemove', e => { if (!locked()) return; G.yaw -= e.movementX * 0.0026; G.pitch = clamp(G.pitch + e.movementY * 0.002, 0.05, 1.2); G.lookAt = now(); });
canvas.addEventListener('pointermove', e => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; G.yaw -= dx * 0.006; G.pitch = clamp(G.pitch + dy * 0.004, 0.05, 1.2); G.lookAt = now(); if (Math.abs(dx) + Math.abs(dy) > 2) tutEvent('looked'); });
canvas.addEventListener('pointerup', e => { if (drag && drag.id === e.pointerId) { const d = drag; drag = null; if (d.mouse && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) setTimeout(() => { if (!locked() && G.started && $('modal').hidden && !G.map) { if (d.btn === 2) doAction(); else punch(); } }, 120); } }); canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', e => { G.dist = clamp(G.dist + e.deltaY * 0.01, 4, 22); e.preventDefault(); }, { passive: false });
const joy = $('joy'), knob = $('knob'); let joyId = null;
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; joyX = joyY = 0; knob.style.transform = ''; }; joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
function joyMove(e) { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = Math.hypot(dx, dy), R = r.width / 2 - 20; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; joyX = dx / R; joyY = -dy / R; }
// touch layout follows the last input: a tap switches to joystick + buttons, moving with W A S D / arrows (outside text boxes) switches back to the keyboard help, so touchscreen laptops keep the controls help
window.addEventListener('touchstart', () => document.body.classList.add('touch'), { passive: true });
for (const t of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(t, () => { if (!A.audioRunning() || A.Radio.blocked) A.unlock(); }, { capture: true, passive: true });
window.addEventListener('keydown', e => { if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code) && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) document.body.classList.remove('touch'); });
if (matchMedia('(pointer:coarse)').matches && !matchMedia('(any-pointer:fine)').matches) document.body.classList.add('touch');
const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); if (G.started) fn(); });
$('stat').addEventListener('click', e => { if (document.body.classList.contains('touch') && !e.target.closest('button')) $('stat').classList.toggle('open'); }); // phones: tap the small stats card for the full panel
tap('bAct', doAction); tap('bPunch', punch); tap('bVeh', toggleVehicle); tap('bMenu', openPhone);
$('bRun').addEventListener('pointerdown', e => { e.preventDefault(); if (G.veh) { nosHeld = true; return; } G.jumpReq = true; }); // Jump on foot, hold for NOS in a car
for (const ev2 of ['pointerup', 'pointercancel', 'pointerleave']) $('bRun').addEventListener(ev2, () => { nosHeld = false; });
$('helpBtn').onclick = openHelp; $('musicBtn').onclick = appRadio; $('net').onclick = appOnline;

let nearZone = null;
function doAction() {
  if (G.frozen) return; if (nearZone) { nearZone.act(); return; }
  if (G.ev?.type === 'jam' && !G.veh && !G.inside && Math.hypot(G.x - D.SPOTS.naka.x, G.z - D.SPOTS.naka.z) < 70) return sellChai();
  if (G.ev?.type === 'diwali' && !G.inside) return rocket();
  const jt = jackTarget(); if (jt) return startJack(jt);
  if (G.veh) return; toast('Yahan kuch nahi. E sirf yellow prompt wali jagah pe kaam karta se.');
}
function updateZones() {
  let best = null, bd = 1e9; const z = G.inside || 'out';
  let label = null;
  for (const Z of ZONES) { if (Z.zone !== z) continue; const d = Math.hypot(Z.x - G.x, Z.z - G.z); if (d < Z.r && d < bd) { const lb = Z.label(); if (!lb) continue; bd = d; best = Z; label = lb; } }
  nearZone = best; const p = $('prompt');
  if (!label) { const jt = jackTarget(); if (jt) label = jackLabel(jt); }
  if (!label && G.ev?.type === 'jam' && !G.veh && !G.inside && Math.hypot(G.x - D.SPOTS.naka.x, G.z - D.SPOTS.naka.z) < 70) label = 'Sell chai to stuck drivers';
  const actHide = !(label && !G.modal); if ($('bAct').hidden !== actHide) $('bAct').hidden = actHide;
  if (label && !G.modal) { p.hidden = false; p.textContent = ''; p.append(el('kbd', { text: document.body.classList.contains('touch') ? 'Action' : 'E' }), label); } else p.hidden = true;
}
function inFlood(x, z) { if (G.wet) return true; if (G.ev?.type !== 'flood') return false; const d = blockOf(x, z); return d && G.ev.data.districts.includes(d[2]); }
function updatePlayer(dt) {
  if (G.selfie) return;
  let ix = 0, iy = 0; const blocked = G.frozen || G.modal || G.map || !$('chatbar').hidden;
  if (!blocked) { ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joyX; iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joyY; }
  ix = clamp(ix, -1, 1); iy = clamp(iy, -1, 1); if (G.tipsy > now()) ix += Math.sin(now() * 2.3) * 0.35;
  const ox = G.x, oz = G.z; let moving = false; const dep = G.inside ? 0 : waterDepth(G.x, G.z); G.depth = dep;
  const slow = (inFlood(G.x, G.z) && dep < 0.2 ? 0.55 : 1) * (G.hangover ? 0.8 : 1) * (G.veh ? 1 : dep > 0.8 ? 0.4 : dep > 0.25 ? 0.6 : 1);
  if (G.veh) {
    const V = D.VEH[G.veh]; let max = V.speed * slow;
    if (V.kind === 5) max = dep > 0.25 ? V.speed : 3.5; // a boat flies on water and scrapes along a dry road
    else if (dep > 0.25) { max *= dep > 0.85 ? 0.25 : V.kind === 2 && dep > 0.55 ? 0.3 : 0.5;
      if (dep > 0.85 && Math.abs(G.vs) > 3 && !G.race && (G.stallCD || 0) < now() && Math.random() < dt * 0.35) { G.stallCD = now() + 12; G.stall = now() + 3; A.sfx('err'); toast('Engine mein paani ghus gaya! Gaadi band... 3 second', 'bad'); } }
    if (G.stall > now()) { iy = 0; max = 0; } const locked = G.race && G.race.phase === 'count'; if (locked) iy = Math.min(iy, 0) * 0;
    G.nosOn = !locked && nosKey() && (G.nos || 0) > 0.02 && iy > 0.2; if (G.nosOn) { max *= 1.38; G.nos = Math.max(0, G.nos - dt * 0.3); if (!G.nosSfx || now() - G.nosSfx > 0.9) { G.nosSfx = now(); A.sfx('nos'); } } if (G.ev?.type === 'jam' && Math.hypot(G.x - D.SPOTS.naka.x, G.z - D.SPOTS.naka.z) < 90) max = Math.min(max, 6);
    const hb = !locked && keys.Space && Math.abs(G.vs) > 4; G.hb = hb; // Space = handbrake: slide the back out
    const target = hb ? 0 : iy * max * (iy < 0 ? 0.35 : 1); G.vs += (target - G.vs) * Math.min(1, dt * (iy * G.vs < 0 ? 3 : G.nosOn ? 2.6 : 1.2)); if (locked) G.vs = 0; if (Math.abs(iy) < 0.05) G.vs *= Math.pow(0.6, dt); if (blocked) G.vs *= 0.9;
    G.r -= ix * dt * (hb ? 3.1 : 1.9) * clamp(G.vs / 10, -1, 1); if (hb) G.vs *= Math.pow(0.55, dt); G.x += Math.sin(G.r) * G.vs * dt; G.z += Math.cos(G.r) * G.vs * dt;
    if (resolve(G, playerVeh.userData.rad)) { if (Math.abs(G.vs) > 12) { A.sfx('crash'); G.hp -= 3; flashHit(); } G.vs *= 0.4; }
    if (!drag && now() - (G.lookAt || 0) > 1.2) G.yaw = angLerp(G.yaw, G.r, dt * 2.5);
    moving = Math.abs(G.vs) > 0.5; const float = V.kind === 5 && dep > 0.25; playerVeh.position.set(G.x, float ? 0.05 + Math.min(dep, 1) * 0.35 + Math.sin(now() * 3) * 0.06 : 0.2, G.z); playerVeh.rotation.y = G.r; playerVeh.rotation.z = V.kind === 2 ? ix * -0.15 * clamp(G.vs / 10, 0, 1) : float ? Math.sin(now() * 2.2) * 0.05 - ix * 0.08 : 0;
    if (float && Math.abs(G.vs) > 4 && Math.random() < dt * 20) burst(G.x - Math.sin(G.r) * 2.4, 0.4, G.z - Math.cos(G.r) * 2.4, 0xe8f2f8, 2, { speed: 2.5, up: 1.5, life: 0.7 }); // wake
    if (V.kind === 5 && !float && Math.abs(G.vs) > 1 && (G.scrapeT || 0) < now()) { G.scrapeT = now() + 0.6; A.sfx('crash', 0.15); }
    if (V.kind === 2) { player.position.set(G.x - Math.sin(G.r) * 0.25, 0.55, G.z - Math.cos(G.r) * 0.25); player.rotation.y = G.r; sitChar(player); }
    if (V.kind === 5) { player.position.set(G.x - Math.sin(G.r) * 1.0, playerVeh.position.y + 0.35, G.z - Math.cos(G.r) * 1.0); player.rotation.y = G.r; sitChar(player); }
    checkBump(); driveThrills(dt, ix, iy);
  } else {
    G.nosOn = false; driveThrills(dt, 0, 0);
    const fx = Math.sin(G.yaw), fz = Math.cos(G.yaw), rx = -Math.cos(G.yaw), rz = Math.sin(G.yaw);
    let dx = fx * iy + rx * ix, dz = fz * iy + rz * ix; const m = Math.hypot(dx, dz);
    if (m > 0.1) { dx /= Math.max(1, m); dz /= Math.max(1, m); const run = keys.ShiftLeft || keys.ShiftRight || runBtn || Math.hypot(joyX, joyY) > 0.95; const sp = (run ? 11 : 6) * (L.hunger <= 0 ? 0.6 : 1) * slow; G.x += dx * sp * dt; G.z += dz * sp * dt; G.r = angLerp(G.r, Math.atan2(dx, dz), Math.min(1, dt * 12)); moving = true; G.running = run; if (G.dance) G.dance = false; }
    if (G.jumpReq && !(G.jy > 0)) { G.jv = 7.8; G.jy = 0.001; A.sfx('swing'); } G.jumpReq = false;
    if (G.jy > 0) { G.jv -= 24 * dt; G.jy = Math.max(0, G.jy + G.jv * dt); }
    resolve(G, 0.6); player.position.set(G.x, (G.inside ? 0 : groundY(G.x, G.z)) + (G.jy || 0) - Math.min(dep, 1.1) * 0.75, G.z); if (G.jy > 0) { const u = player.userData; u.hipL.rotation.x = -0.9; u.hipR.rotation.x = -0.3; } player.rotation.y = G.r; animChar(player, dt, G.dance ? 3 : moving ? 1 : 0, G.running ? 1.5 : 1);
    if (moving) { G.movedAcc = (G.movedAcc || 0) + Math.hypot(G.x - ox, G.z - oz); if (G.movedAcc > 12) tutEvent('moved'); }
  }
  G.moving = moving;
}
// soft footsteps while walking or running (every ~1.3 m), splashy in the rain or in water
let stepAcc = 0, stepX = null, stepZ = null;
function footsteps() {
  if (G.veh || G.frozen || G.dance || G.map || !G.started) { stepX = null; return; } if (stepX === null) { stepX = G.x; stepZ = G.z; return; }
  const d = Math.hypot(G.x - stepX, G.z - stepZ); stepX = G.x; stepZ = G.z; if (d > 2 || d < 0.004 || player.position.y > groundY(G.x, G.z) + 0.25) return;
  stepAcc += d; if (stepAcc > 1.3) { stepAcc = 0; A.sfx(WX.wl > 0.3 || inFlood(G.x, G.z) ? 'stepwet' : 'step', 0.9 + Math.random() * 0.3); }
}
function groundY(x, z) { return blockOf(x, z) ? 0.2 : 0; }
const camTarget = new THREE.Vector3(), camWant = new THREE.Vector3();
function updateCamera(dt) {
  if (G.selfie) { const f = 5.5; camWant.set(G.x + Math.sin(G.r) * f, 2.6, G.z + Math.cos(G.r) * f); camera.position.lerp(camWant, Math.min(1, dt * 6)); camTarget.set(G.x, 2.0, G.z); camera.lookAt(camTarget); return; }
  const h = G.veh ? (D.VEH[G.veh].kind === 4 ? 2.2 : 1.8) : 1.9; const dist = G.veh ? G.dist + 3 : G.dist;
  let cx = G.x - Math.sin(G.yaw) * Math.cos(G.pitch) * dist, cz = G.z - Math.cos(G.yaw) * Math.cos(G.pitch) * dist, cy = h + Math.sin(G.pitch) * dist + 0.5;
  if (G.inside) { const I = INTERIOR[G.inside]; cx = clamp(cx, I.ox - I.W / 2 + 0.8, I.ox + I.W / 2 - 0.8); cz = clamp(cz, I.oz - I.D / 2 + 0.8, I.oz + I.D / 2 - 0.8); cy = Math.min(cy, I.H - 0.5); }
  camWant.set(cx, cy, cz); camera.position.lerp(camWant, Math.min(1, dt * 10));
  if (G.tipsy > now()) { camera.position.x += Math.sin(now() * 1.7) * 0.3; camera.position.y += Math.sin(now() * 2.1) * 0.2; }
  camTarget.set(G.x, h + 0.4, G.z); camera.lookAt(camTarget);
}

// ================================================================ FIGHTS
function flashHit() { const h = $('hit'); h.style.transition = 'none'; h.style.opacity = 1; requestAnimationFrame(() => { h.style.transition = 'opacity .6s'; h.style.opacity = 0; }); }
function punch() {
  if (G.frozen || G.veh || G.punchCD > now() || G.selfie) return; G.punchCD = now() + 0.42; player.userData.punchT = 0.22; G.dance = false; A.sfx('swing'); ev('punches');
  const cands = [], out = !G.inside;
  for (const n of FIGHTERS) if (n.state !== 'ko' && out && !(n.pehl && !AKHARA.fight)) cands.push({ kind: 'npc', o: n, x: n.x, z: n.z });
  for (const [id, R] of REMOTES) if (R.visible && R.inn === (G.inside || '') && R.hp > 0 && !R.veh) cands.push({ kind: 'peer', id, x: R.mesh.position.x, z: R.mesh.position.z });
  if (out) { for (const p of PEDS) if (!p.fighter && !(p.knock > 0) && p.mesh.visible) cands.push({ kind: 'ped', o: p, x: p.mesh.position.x, z: p.mesh.position.z });
    for (const p of CROWD) if (!(p.knock > 0) && Math.abs(p.x - G.x) < 3.2 && Math.abs(p.z - G.z) < 3.2) cands.push({ kind: 'crowd', o: p, x: p.x, z: p.z }); }
  // aim: whoever is closest in front of the camera or the body; anyone within arm's reach always counts
  let best = null, bs = 1e9;
  for (const c of cands) { const dx = c.x - G.x, dz = c.z - G.z, d = Math.hypot(dx, dz); if (d > 3.1) continue; const a = Math.atan2(dx, dz);
    const off = Math.min(Math.abs(angDiff(a, G.yaw)), Math.abs(angDiff(a, G.r))); if (off > 1.2 && d > 1.7) continue; const sc = d + off * 1.2 + (c.kind === 'crowd' || c.kind === 'ped' ? 0.6 : 0); if (sc < bs) { bs = sc; best = c; } }
  if (!best) return; G.r = Math.atan2(best.x - G.x, best.z - G.z); A.sfx('punch'); G.lastFight = now(); const fx = Math.sin(G.r), fz = Math.cos(G.r);
  if (best.kind === 'npc') { const n = best.o; const dmg = irnd(9, 14) + Math.min(6, Math.floor(P.respect / 100)); n.hp -= dmg; n.state = 'aggro'; n.hitT = 0.2; n.x += fx * 0.8; n.z += fz * 0.8; if (Math.random() < 0.4) say(n, pick(['Aaah!', 'Teri to!', 'Ruk ja!', 'Maar diya re!']), 1.5); if (n.hp <= 0) npcKO(n); }
  else if (best.kind === 'ped') pedFight(best.o);
  else if (best.kind === 'crowd') { const p = best.o; p.knock = 7; p.kx = fx * 3; p.kz = fz * 3; if (Math.random() < 0.5) toast(pick(['Arre! Bina baat ke maarega?', 'Police bulaunga!', 'Oye, hosh mein aa!']), 'bad'); }
  else net.send('hit', { target: best.id });
}
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
// a punched passer-by squares up and fights back (they go home afterwards)
function pedFight(p) {
  const pos = p.mesh.position; const n = makeFighter(pick(['Raahgir', 'Sharma Uncle', 'Gym wala Bunty', 'Bhaiya ji', 'Delivery boy']), pos.x, pos.z, 40, 4, p.mesh.userData.torso ? p.mesh.userData.torso.material.color.getHex() : pick(D.SHIRTS));
  n.fromPed = p; n.state = 'aggro'; n.cd = 0.9; n.hp -= irnd(9, 14); n.hitT = 0.2; p.fighter = n; p.mesh.visible = false; FIGHTERS.push(n);
  say(n, pick(['Oye! Mere te haath uthaya?', 'Bina baat ke? Aaja fir!', 'Ab dekh tu!']), 2.2);
}
function takeHit(dmg, who) { G.lastFight = now(); if (G.hp <= 0) return; G.hp -= dmg; flashHit(); A.sfx('punch'); G.x -= Math.sin(G.r) * 0.4; G.z -= Math.cos(G.r) * 0.4; G.dance = false; if (G.hp <= 0) playerKO(who); updateHUD(); }
function playerKO(who) {
  G.hp = 0; A.sfx('ko'); net.send('ko', {}); if (G.veh) dismount(); if (G.job) { endJob(); toast('Job cancel ho gaya.', 'bad'); }
  fadeTo((who ? who + ' ne dhobi pachhad maar diya!' : 'Behosh ho gaya!') + ' Civil Hospital le ja rahe hain...', 2400, async () => { G.hp = 100; G.inside = null; setIndoor(false); G.x = HOSPITAL.x; G.z = HOSPITAL.z + 4; G.r = 0; G.yaw = 0; if (P.money > 0) { await buy('misc', 'ko_bill'); toast('Civil Hospital mein hosh aaya. Bill kat gaya.', 'bad'); } updateHUD(); });
}
const FIGHTERS = []; let PEHLWAN = null;
function spawnFighters() {
  const homes = [[300, 0], [-150, 0], [-150, 150], [150, -150], [150, 150], [300, 150]];
  homes.forEach(h => FIGHTERS.push(makeFighter('Chhora ' + pick(['Monu', 'Sonu', 'Bittu', 'Golu', 'Rinku', 'Pintu', 'Lalit', 'Sandy']), h[0], h[1], 60, 6, pick([0x1c1c1c, 0xd7331f, 0x2e6bd1, 0xf3b61f]))));
  PEHLWAN = makeFighter('Pehlwan Bhola', AKHARA.x, AKHARA.z, 160, 9, 0xd7331f, true); PEHLWAN.mesh.scale.set(1.25, 1.25, 1.25); PEHLWAN.state = 'idle'; FIGHTERS.push(PEHLWAN);
}
function makeFighter(name, x, z, hp, dmg, shirt, pehl) { const m = makeChar(shirt, { pants: pehl ? 0xd7331f : undefined }); scene.add(m); const l = labelSprite(name, { fs: 34, scale: 0.5, bg: 'rgba(120,25,15,.75)' }); l.position.y = 3.0; m.add(l); return { mesh: m, name, x, z, hx: x, hz: z, r: 0, hp, max: hp, dmg, state: 'wander', tx: x, tz: z, cd: 0, t: 0, pehl: !!pehl, hitT: 0 }; }
function npcKO(n) {
  if (n.donBoss) { n.state = 'ko'; n.t = 8; A.sfx('ko'); say(n, 'Bas kar... maan gaya tujhe!', 3); ev('npc_ko'); net.send('donko', { ch: n.donCh }); for (const h of DONF) if (h !== n && h.state !== 'ko') { h.state = 'ko'; h.t = 6; say(h, 'Bhaago!', 1.5); } bigText('CHAPTER ' + (n.donCh + 1) + ' POORA!', D.DON[n.donCh].boss + ' dhobi pachhad', 1.8); return; }
  if (n.fromPed) { n.state = 'ko'; n.t = 4; A.sfx('ko'); say(n, pick(['Bas kar bhai!', 'Maaf kar de!', 'Aaj ka din hi kharab se...']), 2.5); ev('npc_ko'); return; }
  if (n.badla) { n.state = 'ko'; n.t = 6; A.sfx('ko'); ev('badla'); ev('npc_ko'); say(n, pick(['Maaf kar de! Usse bhi maafi maang lunga!', 'Galti ho gayi bhai...']), 3); bigText('BADLA POORA!', n.badla.friend + ' ka badla le liya', 1.8); return; }
  if (n.jack) { n.state = 'ko'; n.t = 3; A.sfx('ko'); say(n, pick(['Le ja... le ja gaadi!', 'Police ko bataunga!', 'Mummy...!']), 2.5); ev('npc_ko'); return takeJacked(n.jack); }
  if (n.story) { n.state = 'ko'; n.t = 99; A.sfx('ko'); say(n, 'Maaf kar de bhai! Galti ho gayi!', 2.5); ev('npc_ko'); earn('loot', 150, 'Monu ne haar maani'); return storyKO(); }
  n.state = 'ko'; n.t = n.pehl ? 6 : 22; A.sfx('ko'); say(n, n.pehl ? 'Haar gaya... tu asli pehlwan se!' : pick(['Maaf kar de bhai!', 'Galti ho gayi!', 'Ab na karunga!']), 2.5);
  ev('npc_ko');
  if (n.pehl) { AKHARA.fight = false; earn('dangal', 1000, 'Dangal jeeta!'); } else earn('loot', irnd(40, 120), n.name + ' ne haar maani');
}
// ================================================================ GAADI CHHEENO: stop any vehicle and take it; whoever is driving fights for it
const JACK_NAMES = ['Driver Pappu', 'Auto wala Rajesh', 'Truck wala Balwinder', 'Ustaad Kallu', 'Driver Satbir', 'Bus conductor Ramesh'];
function carAt(c) { const x = c.mesh.position.x, z = c.mesh.position.z, fx = c.along === 'x' ? 0 : c.dir, fz = c.along === 'x' ? c.dir : 0; return { x, z, fx, fz }; }
function jackTarget() {
  if (G.veh || G.inside || G.hp <= 0 || G.map || G.frozen || (G.race && G.race.phase !== 'done') || G.story) return null; let best = null, bd = 3.2;
  for (const c of CARS) { if (c.taken || c.held || !c.mesh.visible) continue; const { x, z, fx, fz } = carAt(c); const lx = G.x - x, lz = G.z - z; const ax = Math.abs(lx * fx + lz * fz) - (c.mesh.userData.len || 4) / 2, al = Math.abs(lx * fz - lz * fx) - 1.3; const d = Math.hypot(Math.max(0, ax), Math.max(0, al)); if (d < bd) { bd = d; best = { kind: 'npc', c }; } }
  for (const [id, R] of REMOTES) { if (!R.veh || R.veh === 'naav' || !R.visible || R.inn || !R.vm || R.hp <= 0) continue; const d = Math.hypot(R.vm.position.x - G.x, R.vm.position.z - G.z) - 1.6; if (d < bd) { bd = d; best = { kind: 'peer', id, R }; } }
  return best;
}
function jackLabel(t) { return t.kind === 'npc' ? 'Gaadi roko aur chheeno: ' + D.VEH[t.c.type].name : (t.R.info?.name || 'Player') + ' ko gaadi se utaaro'; }
function startJack(t) {
  G.lastFight = now(); G.dance = false;
  if (t.kind === 'peer') { net.send('jack', { target: t.id }); A.sfx('swing'); return; }
  const c = t.c; c.held = true; const { x, z, fx, fz } = carAt(c); const side = (G.x - x) * fz - (G.z - z) * fx > 0 ? 1 : -1;
  const big = c.type === 'bus' || c.type === 'truck'; const n = makeFighter(pick(JACK_NAMES), x + fz * 1.8 * side, z - fx * 1.8 * side, big ? 80 : 55, big ? 8 : 6, pick(D.SHIRTS));
  n.jack = c; n.state = 'aggro'; n.cd = 0.8; FIGHTERS.push(n); A.sfx('horn');
  say(n, pick(['Meri gaadi? Pehle mujhse nipat!', 'Utar ke dikhata hoon tujhe!', 'Gaadi chheenega? Tera baap bhi na le sake!', 'Ruk ja, abhi batata hoon!']), 2.6);
  toast('Driver bahar aa gaya! KO kar (punch), gaadi teri.', 'bad');
}
function takeJacked(c) {
  if (G.veh || G.inside) return; const { x, z } = carAt(c); c.taken = true; c.held = false; c.mesh.visible = false;
  G.x = x; G.z = z; G.r = G.yaw = c.mesh.rotation.y; G.quietMount = true; mount(c.type); G.quietMount = false; G.loaner = true; G.jacked = c; ev('jacks');
  bigText('GAADI TERI!', D.VEH[c.type].name + ' chheen li', 1.6);
  if (Math.random() < 0.4) setTimeout(() => { if (G.jacked === c && G.veh && !G.chase && !G.inside) { startChase({ secs: 25 }); bigText('POLICE!', 'Chori ki gaadi! Bach ke nikal', 1.8); } }, 2500);
}
function jackWin(m) { // the server says I beat the owner, so the vehicle is mine to ride
  if (G.veh || G.inside || !D.VEH[m.v] || m.v === 'naav') return; G.quietMount = true; mount(m.v); G.quietMount = false; G.loaner = true; G.jacked = 'peer'; ev('jacks');
  bigText('GAADI TERI!', m.name + ' ki ' + D.VEH[m.v].name + ' ab tere paas', 1.8);
}
async function startDangal() { if (G.veh) return; if (G.belt && G.belt.id !== P.id && REMOTES.has(G.belt.id)) toast('Champion ' + G.belt.name + ' online se. Belt ke liye unhe akhara mein KO kar!'); const r = await buy('misc', 'dangal'); if (!r.ok) return; AKHARA.fight = true; PEHLWAN.hp = PEHLWAN.max; PEHLWAN.state = 'aggro'; say(PEHLWAN, 'Aaja chhore, dekh le Haryana ka dum!', 2.5); toast('Dangal shuru! Punch with F. Akhara se bahar mat jaana.'); }
function updateFighters(dt) {
  const gone = [];
  for (const n of FIGHTERS) {
    const m = n.mesh; m.visible = !G.inside; if (n.hitT > 0) n.hitT -= dt;
    if ((n.jack || n.badla || n.fromPed || n.don) && (n.state === 'ko' ? n.t - dt <= 0 : !n.badla && !n.don && (G.inside || G.veh || G.hp <= 0 || Math.hypot(G.x - n.x, G.z - n.z) > 30))) { gone.push(n); if (n.state !== 'ko' && n.jack) { n.jack.held = false; say(n.jack, 'Darpok! Bhaag gaya?', 2); } continue; } // driver climbs back in, or limps off after losing
    if (n.state === 'ko') { n.t -= dt; m.rotation.x = -Math.PI / 2; m.position.set(n.x, 0.4, n.z); if (n.t <= 0) { n.hp = n.max; n.state = n.pehl ? 'idle' : 'wander'; m.rotation.x = 0; if (!n.pehl) { n.x = n.hx; n.z = n.hz; } else { n.x = AKHARA.x; n.z = AKHARA.z; } } continue; }
    const dx = G.x - n.x, dz = G.z - n.z, d = Math.hypot(dx, dz); let moving = false;
    if (G.veh && Math.abs(G.vs) > 7 && d < 2.2 && !G.inside && (n.carCD || 0) < now()) { n.carCD = now() + 1; n.hp -= 35; n.x -= dx / (d || 1) * 3; n.z -= dz / (d || 1) * 3; A.sfx('punch'); G.vs *= 0.8; say(n, pick(['Aaah! Gaadi se maarega?', 'Teri to...!']), 1.5); if (n.hp <= 0) { npcKO(n); continue; } n.state = 'aggro'; }
    if (n.pehl && n.state === 'idle') { n.r += dt * 0.3; if (Math.random() < 0.002 && d < 20) say(n, 'Hai koi maa ka laal? Dangal karega?', 2); }
    else if (n.state === 'aggro' && !G.inside && !G.veh && G.hp > 0 && (n.pehl ? Math.hypot(G.x - AKHARA.x, G.z - AKHARA.z) < 12 : n.story || d < 30)) { n.r = Math.atan2(dx, dz); if ((n.talkT = (n.talkT === undefined ? rnd(0.8, 2) : n.talkT) - dt) <= 0 && d < 14) { n.talkT = rnd(3, 5); say(n, pick(ANGRY_LINES), 2); } if (d > 1.6) { const sp = n.pehl ? 4 : 5; n.x += dx / d * sp * dt; n.z += dz / d * sp * dt; moving = true; } else if (n.cd <= 0) { n.cd = n.pehl ? 1.0 : 1.2; m.userData.punchT = 0.25; takeHit(n.dmg, n.name); if (Math.random() < 0.3) { n.talkT = rnd(2.5, 4); say(n, 'Le! Aur khayega?', 2); } } }
    else {
      if (n.state === 'aggro') { n.state = n.pehl ? 'idle' : 'wander'; if (n.pehl && AKHARA.fight) { AKHARA.fight = false; toast('Akhara chhod diya! Dangal haara.', 'bad'); n.x = AKHARA.x; n.z = AKHARA.z; } }
      if (!n.pehl) { const tdx = n.tx - n.x, tdz = n.tz - n.z, td = Math.hypot(tdx, tdz); if (td < 1) { n.tx = n.hx + rnd(-30, 30); n.tz = n.hz + rnd(-25, 25); } else { n.x += tdx / td * 2.2 * dt; n.z += tdz / td * 2.2 * dt; n.r = Math.atan2(tdx, tdz); moving = true; } if (d < 7 && !G.inside && Math.random() < dt * 0.25) say(n, pick(CHHORA_LINES), 2.5); }
    }
    n.cd -= dt; m.position.set(n.x, groundY(n.x, n.z) + (n.hitT > 0 ? 0.15 : 0), n.z); m.rotation.y = n.r; animChar(m, dt, moving ? 1 : 0, 1.3);
  }
  for (const n of gone) { scene.remove(n.mesh); FIGHTERS.splice(FIGHTERS.indexOf(n), 1); if (n.fromPed) n.fromPed.fighter = null; if (n.don) DONF = DONF.filter(x => x !== n); }
}

// ================================================================ SHOW-OFF ACTIONS
function toggleDance() { if (G.veh || G.selfie) return; G.dance = !G.dance; if (G.dance && !G.story) { toast(G.inside === 'club' ? 'Naach basanti! (dance-off ke liye floor pe E)' : 'Thumka!'); G.danceT = 0; } }
function horn() { if (!G.veh) return toast('Horn gaadi mein bajta se (V)'); const m = (P.mods[G.veh] || {}); if (m.horn) { net.send('horn', {}); A.sfx('pressure'); } else { A.sfx('horn'); if (!G.hornTip) { G.hornTip = 1; toast('Pressure horn chahiye? Sandhu Car Accessories, NH-48'); } } }
function throwColor() { if (G.ev?.type !== 'holi') return toast('Rang sirf Holi pe! (Events dekh)'); let best = null, bd = 6; for (const [id, R] of REMOTES) { if (!R.visible) continue; const d = Math.hypot(R.mesh.position.x - G.x, R.mesh.position.z - G.z); if (d < bd) { bd = d; best = id; } } burst(G.x + Math.sin(G.r) * 2, 2, G.z + Math.cos(G.r) * 2, pick([0xff2bd6, 0x39ff14, 0xffd400, 0x00b4ff]), 30); if (best) net.send('holi', { target: best }); else toast('Bura na mano, Holi hai! (Kisi player ke paas jaa ke G daba)'); }
async function rocket() { const r = await buy('misc', 'firework'); if (r.ok) toast('Rocket chhoda! Sab ko dikhega'); }
async function sellChai() { if (G.chaiSellCD > now()) return; G.chaiSellCD = now() + 4; const r = await earn('chai', irnd(20, 60), 'Chai bech di jam mein'); if (r.ok) say(player, 'Garam chai! Garam chai!', 2); }
async function hostParty() { const r = await buy('misc', 'party'); if (r.ok) { closeModal(); toast('Party shuru! Sab ko invite chala gaya.', 'money'); teleport(D.SPOTS.farmLawn.x, D.SPOTS.farmLawn.z, Math.PI); } }
async function joinParty() { const r = await net.req('party_join', {}); if (!r.ok) return toast(r.error || 'Party nahi mili', 'bad'); fadeTo('Bhondsi farmhouse party ki taraf...', 1400, () => { teleport(r.at.x + rnd(-6, 6), r.at.z - 10, Math.PI); G.dance = true; }); }

// ---------------- naka, toll, chase, hangover, road rage
let chaseJeep = null;
function checkNakaToll() { if (G.race) return;
  if (!G.veh || G.inside) return;
  const n = D.SPOTS.naka; if (G.nakaCD < now() && Math.hypot(G.x - n.x, G.z - n.z) < 9) {
    G.nakaCD = now() + 90; const drunk = G.tipsy > now() || (G.drankAt && now() - G.drankAt < 180); const film = (P.mods[G.veh] || {}).film && Math.random() < 0.4;
    if (drunk) naka('drunk'); else if (film) naka('film'); else { toast('Traffic Police: "Chalo chalo, aage badho"'); }
  }
  const t = D.SPOTS.toll; if (G.tollCD < now() && Math.abs(G.x - t.x) < 3 && Math.abs(G.z - t.z) < 9) { G.tollCD = now() + 60; buy('misc', 'toll').then(r => { if (r.ok) toast('Kherki Daula toll: ₹50 kat gaye. Jam free nahi, toll free bhi nahi!'); }); }
}
function naka(kind) {
  G.vs = 0; A.sfx('siren');
  openModal(kind === 'drunk' ? 'Naka! Breath test positive' : 'Naka! Black film', 'Traffic Police, Iffco Chowk', b => {
    b.append(el('p', { text: kind === 'drunk' ? 'Havaldar: "Muh khol, phoonk maar... oho! Peeke chala rya se? Challan katega."' : 'Havaldar: "Kaale sheeshe? Rule nahi pata? Challan banta se."' }));
    b.append(itemRow('Challan bhar do', 'Seedha kaam, no drama', fmt(kind === 'drunk' ? D.MISC.challan[1] : D.MISC.challan_film[1]), async () => { closeModal(); const r = await buy('misc', kind === 'drunk' ? 'challan' : 'challan_film'); if (r.ok) toast('Challan bhar diya. Agli baar dhyaan se.'); }));
    b.append(itemRow('Behas karo', '"Main to Sharma ji ka ladka hoon!" (kabhi chal jaata se)', 'Try', async () => { closeModal(); if (Math.random() < 0.35) { toast('Havaldar: "Theek se, jaa. Agli baar nahi chhodunga."'); } else { toast('Havaldar: "Zyada hoshiyari? Double challan!"', 'bad'); await buy('misc', kind === 'drunk' ? 'challan_big' : 'challan'); } }, false, true));
    b.append(itemRow('Bhaag!', 'Police jeep peecha karegi. Pakde gaye to ₹5,000 aur gaadi zabt', 'Bhaag', () => { closeModal(); startChase(); }, false, true));
  });
}
function startChase(o) { o = o || {}; if (chaseJeep) scene.remove(chaseJeep); chaseJeep = makeVehicle(o.boat ? 'policeboat' : 'police'); let wp2 = null; if (o.boat) for (let k = 0; k < 40 && !wp2; k++) { const a = rnd(0, Math.PI * 2), rr = rnd(22, 50); const x = G.x + Math.cos(a) * rr, z = G.z + Math.sin(a) * rr; if (waterDepth(x, z) > 0.4) wp2 = [x, z]; } // police boats start in the water
  if (wp2) chaseJeep.position.set(wp2[0], 0.05, wp2[1]); else if (o.near) chaseJeep.position.set(G.x - Math.sin(G.r) * 55, 0.2, G.z - Math.cos(G.r) * 55); else chaseJeep.position.set(D.SPOTS.naka.x + 10, 0.2, D.SPOTS.naka.z - 4); scene.add(chaseJeep); G.chase = { until: now() + (o.secs || 30), x: chaseJeep.position.x, z: chaseJeep.position.z, sirenT: 0, sp: o.sp, story: o.story, boat: o.boat, wait: o.story ? now() + 2.5 : 0 }; if (!o.story) toast(o.boat ? 'Jal Police peeche! ' + (o.secs || 30) + ' second bach ke dikha, ya kinare pe utar ke bhaag!' : 'Police peeche se! ' + (o.secs || 30) + ' second bach ke dikha!', 'bad'); $('banner').hidden = false; $('banner').textContent = 'POLICE CHASE: bach ke nikal!'; }
async function updateChase(dt) {
  const c = G.chase; if (!c) return; const dx = G.x - c.x, dz = G.z - c.z, d = Math.hypot(dx, dz); let sp = now() < (c.wait || 0) ? 0 : c.sp || 29;
  if (c.boat) { const nx = c.x + dx / (d || 1) * 3, nz = c.z + dz / (d || 1) * 3; if (waterDepth(nx, nz) < 0.25) { sp = 0; if (!c.stuckSaid) { c.stuckSaid = 1; toast('Police ki naav kinare pe atak gayi! Sukhi sadak pe bhaag!', 'money'); } } chaseJeep.position.y = 0.05 + Math.min(waterDepth(c.x, c.z), 1) * 0.35 + Math.sin(now() * 3) * 0.06; } // floats on the water like yours
  if (d > 0.1) { c.x += dx / d * Math.min(sp * dt, d); c.z += dz / d * Math.min(sp * dt, d); } chaseJeep.position.x = c.x; chaseJeep.position.z = c.z; if (!c.boat) chaseJeep.position.y = 0.2; chaseJeep.rotation.y = Math.atan2(dx, dz);
  c.sirenT -= dt; if (c.sirenT < 0) { c.sirenT = 2; A.sfx('siren'); }
  if (c.story && (d < 3.5 || d > 130 || now() > c.until || !G.veh || G.inside)) { const esc = d >= 3.5; G.chase = null; scene.remove(chaseJeep); chaseJeep = null; updateBanner(); if (!esc) G.vs = 0; A.stinger(esc ? 'escape' : 'busted'); storyChaseEnd(esc); return; }
  if (d < 3.5 && G.veh) { G.chase = null; scene.remove(chaseJeep); chaseJeep = null; updateBanner(); G.vs = 0; A.stinger('busted'); const veh = G.veh; dismount(); G.impound = now() + 60; toast('Pakde gaye! ' + D.VEH[veh].name + ' 60s ke liye zabt.', 'bad'); await buy('misc', 'challan_chase'); return; }
  if (now() > c.until || !G.veh || G.inside) { const escaped = G.veh && now() > c.until; G.chase = null; scene.remove(chaseJeep); chaseJeep = null; updateBanner(); if (escaped) { ev('escape'); A.stinger('escape'); toast('Police ko chakma de diya! +10 respect', 'money'); } }
}
function updateHangover() { if (G.tipsy && G.tipsy < now() && L.drinks >= 3 && !G.hangover) { G.hangover = true; $('hangover').hidden = false; toast('Hangover! Sir bhaari se. Nimbu paani pi (dhaba ya market) ya so ja.', 'bad'); } }
function checkBump() {
  if (Math.abs(G.vs) < 6 || G.bumpCD > now()) return;
  for (const [id, R] of REMOTES) { if (!R.veh || !R.visible || R.inn) continue; const d = Math.hypot(R.vm.position.x - G.x, R.vm.position.z - G.z); if (d < 3.4) { G.bumpCD = now() + 5; G.vs *= 0.3; A.sfx('crash'); net.send('bump', { target: id }); return; } }
}

// ================================================================ AMBIENT NPCs
const PEDS = [], CARS = [], COWS = [], MALLNPC = [];
// street dogs patrol a stretch of footpath around a block: walk, stop to sniff, bark at the player up close, bolt from speeding
// vehicles or a running player. p = position along the block edge (-60..60), side = which edge of the block
function spawnDogs() {
  const phone = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 520;
  for (let k = 0; k < (phone ? 8 : 14); k++) { const dd = pick(DIST.filter(q => q[3] !== 'forest')), d = DG.makeDog(); scene.add(d.mesh); DG.play(d, 'Walk');
    DOGS.push(Object.assign(d, { cx: dd[0] * 150, cz: dd[1] * 150, side: irnd(0, 3), p: rnd(-58, 58), dir: Math.random() < 0.5 ? 1 : -1, st: 'walk', t: rnd(3, 9), barkT: 0 })); }
}
const DOGS = [];
function updateDogs(dt) {
  const out = !G.inside, cx = camera.position.x, cz = camera.position.z, fast = G.veh ? Math.abs(G.vs) > 5 : keys.ShiftLeft || keys.ShiftRight || runBtn;
  for (const d of DOGS) {
    const off = 66.5, x0 = d.side < 2 ? d.cx + d.p : d.cx + (d.side === 2 ? off : -off), z0 = d.side < 2 ? d.cz + (d.side === 0 ? off : -off) : d.cz + d.p;
    const near = Math.abs(x0 - cx) + Math.abs(z0 - cz); d.mesh.visible = out && near < 120; if (!d.mesh.visible) continue;
    const dp = Math.hypot(x0 - G.x, z0 - G.z); d.t -= dt; d.barkT -= dt;
    if (dp < (G.veh ? 7 : 4) && fast && d.st !== 'run') { d.st = 'run'; d.t = 2.5; const ax = d.side < 2 ? x0 - G.x : z0 - G.z; d.dir = ax >= 0 ? 1 : -1; A.sfx('yelp'); }
    else if (d.t <= 0) { if (d.st === 'walk') { d.st = 'sniff'; d.t = rnd(3, 7); } else { d.st = 'walk'; d.t = rnd(5, 12); if (Math.random() < 0.4) d.dir *= -1; } }
    if (!G.veh && dp < 5 && d.st !== 'run' && d.barkT <= 0) { d.barkT = rnd(5, 10); if (Math.random() < 0.55) { A.sfx('bark'); d.st = 'sniff'; d.t = 2.5; d.look = true; } }
    const sp = d.st === 'run' ? 7 : d.st === 'walk' ? 1.3 : 0; d.p += d.dir * sp * dt; if (Math.abs(d.p) > 60) { d.p = Math.sign(d.p) * 60; d.dir *= -1; if (d.st === 'run') d.st = 'walk'; }
    const x = d.side < 2 ? d.cx + d.p : x0, z = d.side < 2 ? z0 : d.cz + d.p; d.mesh.position.set(x, 0.2, z);
    const yaw = d.side < 2 ? (d.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (d.dir > 0 ? 0 : Math.PI);
    d.mesh.rotation.y = angLerp(d.mesh.rotation.y, d.st === 'sniff' && d.look && dp < 8 ? Math.atan2(G.x - x, G.z - z) : yaw, Math.min(1, dt * 6)); if (dp >= 8) d.look = false;
    DG.play(d, d.st === 'run' ? 'Run' : d.st === 'walk' ? 'Walk' : 'Survey', d.st === 'walk' ? 0.8 : 1); if (near < 70) d.mixer.update(dt);
  }
}
function makeCow() { const g = new THREE.Group(); RL.cow(g); return g; }
function spawnAmbient() {
  for (let k = 0; k < 26; k++) { const d = pick(DIST); const c = makeChar(pick(D.SHIRTS)); if (Math.random() < 0.25) setLook(c, { shirt: c.userData.torso.material.color.getHex(), hat: pick(['pagdi', 'cap', 'none']) }); scene.add(c); PEDS.push({ mesh: c, cx: d[0] * 150, cz: d[1] * 150, t: rnd(0, 4), dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(1.6, 2.4), talkT: rnd(5, 30) }); }
  for (let k = 0; k < 28; k++) { const along = Math.random() < 0.5 ? 'x' : 'z'; const r = pick(ROADS); const dir = Math.random() < 0.5 ? 1 : -1; const type = k < 11 ? 'auto' : k < 13 ? 'bus' : k < 15 ? 'truck' : pick(['chhotu', 'desert', 'cruiser', 'chhotu']); const v = makeVehicle(type, ['chhotu', 'desert', 'cruiser'].includes(type) ? pick([0xdedede, 0x8b1e1e, 0x2e6bd1, 0x151515, 0xf3b61f, 0xffffff]) : null); scene.add(v); CARS.push({ mesh: v, along, line: r + dir * 3.2, dir, p: rnd(-440, 440), sp: type === 'bus' || type === 'truck' ? 11 : rnd(12, 18), honkT: 0, type }); }
  // jam traffic (shown only during the Iffco Chowk mahajam)
  for (let k = 0; k < 14; k++) { const v = makeVehicle(pick(['auto', 'chhotu', 'desert', 'auto', 'bus']), pick([0xdedede, 0x8b1e1e, 0x2e6bd1, 0xf3b61f])); const onX = k % 2; const pos = -60 + Math.floor(k / 2) * 18; v.position.set(onX ? D.SPOTS.naka.x + pos : 72, 0.05, onX ? D.SPOTS.naka.z + 3 : D.SPOTS.naka.z + pos); v.rotation.y = onX ? Math.PI / 2 : 0; v.visible = false; scene.add(v); JAM.push(v); }
  for (const s of COW_SPOTS) { const c = makeCow(); c.position.set(s[0], 0.2, s[1]); c.rotation.y = rnd(0, 6); scene.add(c); COWS.push({ mesh: c, x: s[0], z: s[1], t: rnd(0, 5), mooT: 0 }); }
  for (const r of [75, 225, -75]) for (let k = 0; k < 2; k++) { const z = rnd(-400, 400); const c = makeCow(); c.position.set(r + rnd(-4, 4), 0.05, z); c.rotation.y = rnd(0, 6); scene.add(c); COWS.push({ mesh: c, x: c.position.x, z, t: rnd(0, 5), mooT: 0 }); }
  for (const s of SHOPPERS) { const c = makeChar(pick(D.SHIRTS)); scene.add(c); MALLNPC.push({ mesh: c, s, x: rnd(s.x0, s.x1), z: rnd(s.z0, s.z1), tx: 0, tz: 0, t: 0 }); }
}
const JAM = [];
function updateAmbient(dt) {
  const out = !G.inside; const jam = G.ev?.type === 'jam';
  for (const v of JAM) v.visible = out && jam;
  const ram = G.veh && Math.abs(G.vs) > 6;
  const ccx = camera.position.x, ccz = camera.position.z;
  for (const p of PEDS) { if (p.fighter) { p.mesh.visible = false; continue; } p.mesh.visible = out && Math.abs(p.mesh.position.x - ccx) + Math.abs(p.mesh.position.z - ccz) < 160; if (!out) continue;
    if (p.knock > 0) { p.knock -= dt; const a = 6 - p.knock; if (a < 0.8) { p.mesh.position.x += p.kx * dt; p.mesh.position.z += p.kz * dt; p.mesh.position.y = 0.2 + Math.sin(a / 0.8 * Math.PI) * 2; } else p.mesh.position.y = 0.45; p.mesh.rotation.x = -Math.min(1, a / 0.5) * Math.PI / 2; if (p.knock <= 0) p.mesh.rotation.x = 0; continue; }
    if (ram && Math.hypot(p.mesh.position.x - G.x, p.mesh.position.z - G.z) < 2.1) { knockPerson({}); p.knock = 6; p.kx = Math.sin(G.r) * Math.abs(G.vs) * 0.5; p.kz = Math.cos(G.r) * Math.abs(G.vs) * 0.5; continue; }
    p.t += dt * p.sp / 272 * p.dir; const t = ((p.t % 1) + 1) % 1; const Lr = 68.5; let x, z; const s = t * 4; if (s < 1) { x = -Lr + 2 * Lr * s; z = -Lr; } else if (s < 2) { x = Lr; z = -Lr + 2 * Lr * (s - 1); } else if (s < 3) { x = Lr - 2 * Lr * (s - 2); z = Lr; } else { x = -Lr; z = Lr - 2 * Lr * (s - 3); } const px = p.cx + x, pz = p.cz + z; p.mesh.rotation.y = Math.atan2(px - p.mesh.position.x, pz - p.mesh.position.z); p.mesh.position.set(px, 0.2, pz); if (p.mesh.visible) animChar(p.mesh, dt, 1); p.talkT -= dt; if (p.talkT < 0) { p.talkT = rnd(15, 40); if (Math.hypot(px - G.x, pz - G.z) < 25) say(p, pick(NPC_LINES), 2.5); } }
  for (const c of CARS) {
    if (c.taken) { c.mesh.visible = false; continue; }
    c.mesh.visible = out && Math.abs(c.mesh.position.x - ccx) + Math.abs(c.mesh.position.z - ccz) < 300; if (!out) continue; let x = c.along === 'x' ? c.line : c.p, z = c.along === 'x' ? c.p : c.line;
    const fx = c.along === 'x' ? 0 : c.dir, fz = c.along === 'x' ? c.dir : 0; const dx = G.x - x, dz = G.z - z; const ahead = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
    let blocked = ahead > 0 && ahead < (c.mesh.userData.len / 2 + 5) && lat < 2.4; for (const cw of COWS) { const ax = (cw.x - x) * fx + (cw.z - z) * fz, al = Math.abs((cw.x - x) * fz - (cw.z - z) * fx); if (ax > 0 && ax < c.mesh.userData.len / 2 + 4 && al < 2.4) blocked = true; }
    if (jam && Math.hypot(x - D.SPOTS.naka.x, z - D.SPOTS.naka.z) < 80) blocked = true;
    if (blocked) { c.honkT -= dt; if (c.honkT < 0) { c.honkT = rnd(3, 6); if (Math.hypot(dx, dz) < 25) { A.sfx('horn'); say(c, pick(['Pee pee! Side ho ja!', 'Abe hatt, bhai!', 'Horn OK Please!', 'Gaay ko hata bhai!']), 2); } } }
    else if (!c.held) { c.p += c.dir * c.sp * dt; if (c.p > 445) c.p = -445; if (c.p < -445) c.p = 445; }
    x = c.along === 'x' ? c.line : c.p; z = c.along === 'x' ? c.p : c.line; c.mesh.position.set(x, 0.05, z); c.mesh.rotation.y = c.along === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    if (!G.veh && Math.hypot(G.x - x, G.z - z) < 1.6 && !blocked && !c.held) { takeHit(8, 'Auto wale'); G.x += fz * 2; G.z -= fx * 2; }
    if (G.veh && playerVeh) { // solid traffic: an oriented-box check along the car's length
      const lx = G.x - x, lz = G.z - z; const ax = lx * fx + lz * fz, al = Math.abs(lx * fz - lz * fx); const half = c.mesh.userData.len / 2 + 1.6;
      if (Math.abs(ax) < half && al < 2.6) { const pushL = 2.6 - al, side = Math.sign(lx * fz - lz * fx) || 1; G.x += fz * pushL * side; G.z -= fx * pushL * side;
        if (Math.abs(G.vs) > 5 && (c.crashCD || 0) < now()) { c.crashCD = now() + 2; A.sfx('crash'); flashHit(); G.vs *= G.race ? 0.45 : -0.25; G.jolt = 0.4; c.stopT = now() + 2.5; if (Math.abs(G.vs) > 3) G.hp = Math.max(5, G.hp - 4); say(c, pick(['Abe andhe! Gaadi thok di!', 'Insurance tera baap bharega?', 'Ruk ja, utar neeche!', 'Kahan se licence liya?']), 2.2); } else G.vs *= 0.6; } }
    if (c.stopT && c.stopT > now() && !c.held) { c.p -= c.dir * c.sp * dt; }
  }
  for (const c of COWS) { c.mesh.visible = out; if (!out) continue; c.t += dt; c.mesh.children[1].position.y = 1.7 + Math.sin(c.t * 1.5) * 0.08; if (c.mooT > 0) c.mooT -= dt; }
  for (const n of MALLNPC) { const vis = G.inside === n.s.zone; n.mesh.visible = vis; if (!vis) continue; const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz); if (d < 0.6 || n.t <= 0) { n.tx = rnd(n.s.x0, n.s.x1); n.tz = rnd(n.s.z0, n.s.z1); n.t = 8; } else { n.x += dx / d * 1.8 * dt; n.z += dz / d * 1.8 * dt; n.mesh.rotation.y = Math.atan2(dx, dz); } n.t -= dt; n.mesh.position.set(n.x, 0, n.z); animChar(n.mesh, dt, d >= 0.6 ? 1 : 0); }
  if (G.inside === 'club') { const t = now(); CLUB.tiles.forEach((tl, i) => { const h = ((i * 0.13 + t * 0.6) % 1); tl.material.color.setHSL(h, 1, 0.25 + 0.25 * (Math.sin(t * 8 + i) > 0.6 ? 1 : 0)); }); CLUB.ball.rotation.y += dt; CLUB.lasers.forEach((l, i) => { l.rotation.y = t * (0.5 + i * 0.1) + i; }); CLUB.dancers.forEach(c => animChar(c, dt, 3)); }
}
const BUBBLES = [];
// NPCs speak their lines out loud (recorded voices, panned and fading with distance) instead of showing a bubble.
// Lines without a recording (player chat) still appear as a speech bubble.
const VOX_P = new THREE.Vector3(), VOX_R = new THREE.Vector3();
function say(obj, text, secs) { const v = VOICES[text]; if (v) return speak(obj, text, secs, v); bubble(obj, text, secs); }
function speak(obj, text, secs, v) {
  const m = obj.mesh || obj; m.getWorldPosition(VOX_P); const d = VOX_P.distanceTo(camera.position); if (d > 45) return; // too far to hear
  const u = m.userData || {}, g0 = (u.dress && u.dress.g) || u.voiceG || 'm', g = v[1].includes(g0) ? g0 : v[1][0];
  VOX_R.set(1, 0, 0).applyQuaternion(camera.quaternion); const pan = VOX_P.sub(camera.position).normalize().dot(VOX_R);
  A.voice('/audio/v/' + v[0] + '_' + g + '.mp3', obj, Math.min(1, 9 / Math.max(9, d)), pan).then(ok => { if (!ok) bubble(obj, text, secs); });
}
function bubble(obj, text, secs) { const m = obj.mesh || obj; if (obj._bub) { disposeSprite(obj._bub.s); BUBBLES.splice(BUBBLES.indexOf(obj._bub), 1); } const s = labelSprite(text, { fs: 36, scale: 0.62, bg: 'rgba(255,244,216,.95)', fg: '#1b1410', border: '#d7331f' }); const sc = m.scale.x || 1; s.position.y = 3.6 / sc; s.scale.multiplyScalar(1 / sc); m.add(s); const b = { s, t: secs || 3, o: obj }; obj._bub = b; BUBBLES.push(b); }
function updateBubbles(dt) { for (let i = BUBBLES.length - 1; i >= 0; i--) { const b = BUBBLES[i]; b.t -= dt; if (b.t <= 0) { disposeSprite(b.s); b.o._bub = null; BUBBLES.splice(i, 1); } } }

// ================================================================ PARTICLES (gulal, fireworks, notes, bottle)
const PARTS = []; const PGEO = new THREE.BoxGeometry(0.25, 0.25, 0.25);
function burst(x, y, z, color, n, opts) { opts = opts || {}; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(PGEO, opts.mat || glow(color)); m.position.set(x, y, z); if (opts.note) m.scale.set(1.6, 0.05, 0.8); scene.add(m); const sp = opts.speed || 6; PARTS.push({ m, vx: rnd(-1, 1) * sp, vy: rnd(opts.up || 2, (opts.up || 2) + sp), vz: rnd(-1, 1) * sp, t: opts.life || 1.6, g: opts.grav == null ? 9 : opts.grav, spin: opts.note }); } }
function updateParts(dt) { for (let i = PARTS.length - 1; i >= 0; i--) { const p = PARTS[i]; p.t -= dt; p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; if (p.spin) { p.m.rotation.x += dt * 5; p.m.rotation.z += dt * 3; } if (p.t <= 0 || p.m.position.y < 0) { scene.remove(p.m); PARTS.splice(i, 1); } } }
function firework(x, z) { const h = rnd(40, 70); A.sfx('firework', 0.6); setTimeout(() => burst(x + rnd(-10, 10), h, z + rnd(-10, 10), pick([0xff2bd6, 0x39ff14, 0xffd400, 0x00e5ff, 0xff3b30]), 60, { speed: 14, up: -6, grav: 4, life: 2 }), 600); }

// ================================================================ WORLD EVENTS (client side)
const serverNow = () => Date.now() / 1000 + G.timeOffset;
let baraatG = null, floodMeshes = [];
function buildBaraat() {
  const g = new THREE.Group(); scene.add(g); g.visible = false;
  const horse = makeVehicle('horse'); g.add(horse); const groom = makeChar(0xf5e6c8, { pants: 0xf5e6c8 }); setLook(groom, { shirt: 0xf5e6c8, hat: 'sehra', bling: ['chain'] }); groom.position.set(0, 1.4, 0); sitChar(groom); g.add(groom);
  const lbl = labelSprite('Dulha: Rohit weds Simran', { fs: 34, scale: 0.6, bg: 'rgba(215,51,31,.85)' }); lbl.position.y = 4.8; g.add(lbl);
  const dancers = []; for (let k = 0; k < 10; k++) { const c = makeChar(pick([0xd7331f, 0xf6c026, 0xff6fa5, 0x2e6bd1, 0x1d8a4e]), {}); if (k % 3 === 0) setLook(c, { shirt: 0xf28c1b, hat: 'safa' }); c.position.set(rnd(-4, 4), 0, -4 - k * 1.4); g.add(c); dancers.push(c); }
  for (let k = 0; k < 6; k++) { const side = k % 2 ? 1 : -1; const lamp = new THREE.Group(); lamp.position.set(side * 5, 0, 4 - k * 4); cyl(lamp, 0.08, 2.6, 0x8a7a5a, 0, 1.3, 0); sph(lamp, 0.35, 0, 0, 2.8, 0, glow(0xfff1b0)); g.add(lamp); }
  const dhol = makeChar(0xffffff); dhol.position.set(0, 0, 3); g.add(dhol); cyl(g, 0.4, 0.8, 0xd7331f, 0, 1.4, 3.5).rotation.z = Math.PI / 2;
  sign(g, 'BAND BAAJA BARAAT', 'Masterji Band, Old Gurgaon', '#d7331f', '#f6c026', 6, 1.2, 0, 3.5, 6, 0);
  baraatG = { g, dancers, beatT: 0 };
}
function baraatZ() { if (!G.ev || G.ev.type !== 'baraat') return -420; const p = clamp((serverNow() - G.ev.start) / (G.ev.end - G.ev.start), 0, 1); return -420 + 840 * p; }
function buildFlood() { for (const m of floodMeshes) scene.remove(m); floodMeshes = []; if (G.ev?.type !== 'flood') return; for (const name of G.ev.data.districts) { const d = DIST.find(x => x[2] === name); if (!d) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshLambertMaterial({ color: 0x5a7f8f, transparent: true, opacity: 0.75 })); m.rotation.x = -Math.PI / 2; m.position.set(d[0] * 150, 0.55, d[1] * 150); scene.add(m); floodMeshes.push(m); } }
function updateEvents(dt) {
  const e = G.ev; const out = !G.inside;
  if (baraatG) { baraatG.g.visible = out && e?.type === 'baraat'; if (baraatG.g.visible) { const z = baraatZ(); baraatG.g.position.set(-222, 0, z); baraatG.dancers.forEach(c => animChar(c, dt, 3)); baraatG.beatT -= dt; const near = Math.hypot(G.x + 222, G.z - z) < 18; if (near && baraatG.beatT < 0) { baraatG.beatT = 0.45; A.sfx('bass', 0.5); } if (near && G.dance && !G.baraatT) { G.baraatT = now() + 10; } if (G.baraatT && now() > G.baraatT) { G.baraatT = 0; if (near && G.dance) { ev('baraat'); toast('Baraat mein naache! +respect'); } } if (near && !G.baraatTip) { G.baraatTip = 1; toast('Baraat aa gayi! B se naach, Action se ₹1,000 ke note udao'); } } }
  if (out && e?.type === 'holi' && Math.random() < dt * 2) burst(150 + rnd(-60, 60), 1, rnd(-60, 60), pick([0xff2bd6, 0x39ff14, 0xffd400, 0x00b4ff]), 12, { speed: 4 });
  if (out && e?.type === 'diwali' && Math.random() < dt * 0.8) firework(G.x + rnd(-120, 120), G.z + rnd(-120, 120));
  if (e?.type === 'ipl' && G.inside == null && blockOf(G.x, G.z)?.[2] === 'Cyber Hub' && (!G.iplT || now() > G.iplT)) { G.iplT = now() + 30; ev('ipl_watch'); }
  if (out && e?.type === 'baraat' && nearZone == null && Math.hypot(G.x + 222, G.z - baraatZ()) < 18) G.baraatZone = true; else G.baraatZone = false;
}
function updateBanner() {
  const b = $('banner'); if (G.chase) return;
  if (G.ev) { const left = Math.max(0, Math.round(G.ev.end - serverNow())); b.hidden = false; b.textContent = G.ev.name + ' · ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); }
  else if (G.evSoon && G.evSoon.at > now()) { b.hidden = false; b.textContent = '⏱ ' + Math.ceil(G.evSoon.at - now()) + 's mein: ' + G.evSoon.name; }
  else if (G.beef && G.beef.until > now()) { b.hidden = false; b.textContent = 'ROAD RAGE vs ' + G.beef.name + ' · ' + Math.ceil(G.beef.until - now()) + 's'; }
  else b.hidden = true;
  $('ipl').hidden = G.ev?.type !== 'ipl';
}
function drawIpl(d) {
  if (!iplScreen) return; const x = iplScreen.c.getContext('2d'); const W = iplScreen.c.width, H = iplScreen.c.height;
  x.fillStyle = '#0f2740'; x.fillRect(0, 0, W, H); x.fillStyle = '#8fe0ff'; x.textAlign = 'center';
  if (!d) { x.font = '800 70px "Baloo 2", sans-serif'; x.fillText('CYBER HUB SCREEN', W / 2, 150); x.font = '600 40px Mukta, sans-serif'; x.fillText('IPL screening yahin hogi. Events dekhte raho!', W / 2, 250); }
  else { x.font = '800 54px "Baloo 2", sans-serif'; x.fillText(D.IPL_TEAMS[0] + ' vs ' + D.IPL_TEAMS[1], W / 2, 90); x.font = '800 90px "Baloo 2", sans-serif'; x.fillStyle = '#f6c026'; x.fillText(d.runs[0] + '/' + d.wkts[0] + '   ·   ' + d.runs[1] + '/' + d.wkts[1], W / 2, 220); x.fillStyle = '#ffffff'; x.font = '700 50px Mukta, sans-serif'; x.fillText(d.last || 'Match shuru!', W / 2, 310); x.font = '600 34px Mukta, sans-serif'; x.fillStyle = '#8fe0ff'; x.fillText('Cheers: ' + d.cheers[0] + '  vs  ' + d.cheers[1], W / 2, 380); }
  iplScreen.t.needsUpdate = true;
  if (d) $('ipl').textContent = 'IPL @ Cyber Hub: ' + d.runs[0] + '/' + d.wkts[0] + ' vs ' + d.runs[1] + '/' + d.wkts[1] + ' · ' + (d.last || '');
}
function openIplCheer() { if (G.ev?.type !== 'ipl') return toast('Abhi match nahi chal raha. Events dekh.'); openModal('IPL screening', 'Cyber Hub big screen', b => { D.IPL_TEAMS.forEach((t, i) => b.append(itemRow(t, 'Zor se cheer karo!', 'Cheer', () => { net.send('cheer', { team: i }); A.sfx('cheer'); }))); }); }

// ================================================================ ROAST BATTLE & DANCE-OFF & INVITES
function nearestPlayer(maxD) { let best = null, bd = maxD; for (const [id, R] of REMOTES) { if (!R.visible || !R.info) continue; const d = Math.hypot(R.mesh.position.x - G.x, R.mesh.position.z - G.z); if (d < bd) { bd = d; best = id; } } return best; }
function openChaupal() {
  openModal('Badshahpur Chaupal', 'Gyaan lo, ya roast battle karo', b => {
    b.append(itemRow('Chaudhary sahab ki gyaan', 'Har minute nayi baat', 'Suno', () => { if (G.gyaanT > now()) return toast('Chaudhary sahab so rahe hain, thodi der baad aa'); G.gyaanT = now() + 60; toast(pick(GYAAN)); ev('gyaan'); }));
    const t = nearestPlayer(14); b.append(el('h3', { text: 'Roast battle' }), el('p', { text: '3 round, har round mein ek roast line likho. Phir poora Gurugram vote karta se. Jeeto to +15 respect.' }));
    b.append(itemRow(t ? 'Challenge ' + REMOTES.get(t).info.name : 'Koi player paas nahi', 'Dono chaupal pe hone chahiye', 'Challenge', async () => { const r = await net.req('challenge', { kind: 'roast', target: t }); if (!r.ok) return toast(r.error, 'bad'); toast('Challenge bhej diya!'); closeModal(); }, !t));
  });
}
function openDanceOff() {
  const t = nearestPlayer(12);
  openModal('Neon Nights dance floor', 'B to dance anytime. Dance-off: same 10 moves, sabse tez aur sahi jeetta se', b => {
    b.append(itemRow(G.dance ? 'Stop dancing' : 'Start dancing', 'Party score badhta se', G.dance ? 'Stop' : 'Dance', () => { toggleDance(); closeModal(); }));
    b.append(itemRow(t ? 'Dance-off vs ' + REMOTES.get(t).info.name : 'Floor pe koi aur nahi', 'Winner: +20 party, +5 respect, announcement', 'Challenge', async () => { const r = await net.req('challenge', { kind: 'dance', target: t }); if (!r.ok) return toast(r.error, 'bad'); toast('Challenge bhej diya!'); closeModal(); }, !t));
  });
}
function showInvite(m) {
  const box = $('invite'); box.hidden = false; box.textContent = '';
  box.append(el('b', { text: m.name + (m.kind === 'roast' ? ' ne roast battle ke liye lalkaara!' : ' ne dance-off ke liye lalkaara!') }));
  const row = el('div', { class: 'row' }); row.append(el('button', { class: 'buy', text: 'Accept', onclick: async () => { box.hidden = true; const r = await net.req('accept', { kind: m.kind }); if (!r.ok) toast(r.error, 'bad'); } }), el('button', { class: 'buy alt', text: 'Darr gaya (decline)', onclick: () => { box.hidden = true; } })); box.append(row);
  clearTimeout(G.inviteT); G.inviteT = setTimeout(() => { box.hidden = true; }, 28000);
}
function renderRoast() {
  const r = G.roast; const box = $('roastbox'); if (!r) { box.hidden = true; return; } box.hidden = false; box.textContent = '';
  const left = Math.max(0, Math.round(r.deadline - serverNow()));
  box.append(el('b', { text: 'Roast battle: ' + r.aName + ' vs ' + r.bName }), el('div', { text: (r.phase === 'write' ? 'Round ' + r.round + '/3 · ' : 'Voting · ') + left + 's' }));
  r.lines.forEach((ln, i) => { if (ln[0]) box.append(el('div', { class: 'line', text: r.aName + ': ' + ln[0] })); if (ln[1]) box.append(el('div', { class: 'line', text: r.bName + ': ' + ln[1] })); });
  const side = r.a === P.id ? 0 : r.b === P.id ? 1 : -1;
  if (r.phase === 'write' && side >= 0 && !r.lines[r.round - 1][side]) {
    const f = el('form'); const i = el('input', { maxlength: '100', placeholder: 'Teri roast line...', id: 'roastIn' }); f.append(i, el('button', { class: 'buy', type: 'submit', text: 'Bol' })); f.onsubmit = e => { e.preventDefault(); if (i.value.trim()) net.send('roast_line', { text: i.value }); }; box.append(f);
    const tp = el('div', { class: 'taunts' }); for (const t of TAUNTS.slice(2, 9)) tp.append(el('button', { type: 'button', text: t, onclick: () => net.send('roast_line', { text: t }) })); box.append(tp);
  }
  if (r.phase === 'vote') { box.append(el('div', { text: 'Votes: ' + r.votes[0] + ' - ' + r.votes[1] })); if (side < 0) { const row = el('div', { class: 'row' }); row.append(el('button', { class: 'buy', text: 'Vote ' + r.aName, onclick: () => net.send('roast_vote', { side: 0 }) }), el('button', { class: 'buy alt', text: 'Vote ' + r.bName, onclick: () => net.send('roast_vote', { side: 1 }) })); box.append(row); } }
}
function startDanceGame(d) {
  const ar = ['←', '↑', '→', '↓'], keyN = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']; let idx = 0, hits = 0, t0 = 0;
  G.dance = true;
  openModal('Dance-off: ' + d.aName + ' vs ' + d.bName, 'Arrows jaldi aur sahi dabao!', b => {
    const row = el('div', { class: 'arrows' }); const spans = d.seq.map(s => el('span', { text: ar[s] })); spans.forEach(s => row.append(s)); const info = el('p', { text: 'Ready...', style: 'text-align:center;font-weight:700' });
    const pad = el('div', { class: 'pad' }); ar.forEach((a, i) => pad.append(el('button', { text: a, onclick: () => press(i) }))); b.append(row, info, pad);
    const startIn = Math.max(0, (d.start - serverNow()) * 1000); setTimeout(() => { t0 = performance.now(); info.textContent = 'GO!'; spans[0].classList.add('cur'); }, startIn);
    function press(i) { if (!G.minigame || !t0) return; if (i === d.seq[idx]) { spans[idx].classList.add('ok'); hits++; A.sfx('tick'); } else A.sfx('err'); spans[idx].classList.remove('cur'); idx++; if (idx >= d.seq.length) return finish(); spans[idx].classList.add('cur'); }
    function finish() { if (!G.minigame) return; G.minigame = null; const ms = t0 ? performance.now() - t0 : 1e9; net.send('dance_score', { hits, ms }); info.textContent = hits + '/10 in ' + (ms / 1000).toFixed(1) + 's. Result ka intezaar...'; }
    G.minigame = { press: k => { const i = keyN.indexOf(k); if (i >= 0) press(i); }, tick: () => { if (t0 && performance.now() - t0 > 10000) finish(); } };
  });
}

// ================================================================ SELFIE CARD
function startSelfie() { if (G.selfie || !G.started) return; if (G.veh && D.VEH[G.veh].kind === 4) return toast('Gaadi se utar ke selfie le (V)'); closeModal(); G.selfie = true; $('selfie').hidden = false; $('controls').hidden = true; toast('Pose maar! Click photo dabao'); }
function endSelfie() { G.selfie = false; $('selfie').hidden = true; $('controls').hidden = false; }
$('selfieClose').onclick = endSelfie;
$('snapBtn').onclick = () => {
  renderer.render(scene, camera); const shot = renderer.domElement.toDataURL('image/jpeg', 0.9); A.sfx('shutter'); endSelfie();
  const img = new Image(); img.onload = () => makeCard(img); img.src = shot;
};
// share sheet used by both photo cards
function shareSheet(title, url, fileName, text) {
  openModal(title, 'Story pe daalo, WhatsApp pe bhejo', b => {
    b.append(el('img', { src: url, class: 'cardimg', alt: title }));
    if (window.GL_SOLO) b.append(el('p', { text: 'Photo save karne ke liye image pe long-press (phone) ya right-click → Save image (computer) karo.' }));
    else b.append(el('a', { href: url, download: fileName, class: 'buy', style: 'text-align:center;text-decoration:none;display:block;padding:10px', text: 'Download photo' }));
    if (navigator.canShare) b.append(el('button', { class: 'buy alt', style: 'padding:10px', text: 'Share (Instagram, WhatsApp...)', onclick: async () => { try { const blob = await (await fetch(url)).blob(); const file = new File([blob], fileName, { type: 'image/jpeg' }); if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text }); else await navigator.share({ text }); } catch {} } }));
    b.append(el('a', { class: 'buy', style: 'text-align:center;text-decoration:none;display:block;padding:10px;background:#25d366', href: 'https://wa.me/?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener', text: 'Send on WhatsApp' }));
  });
}
// Aaj ka Hisaab: today's exploits on a 9:16 story card with a funny title
function dayStats() {
  const b = (P.dayBase && P.dayBase.c) || {}, c = P.c, d = k => Math.max(0, (c[k] || 0) - (b[k] || 0));
  return { wallet: Math.max(0, P.money - ((P.dayBase && P.dayBase.money) || P.money)), tasks: dailyTasks().filter(a => a.done).length, earned: d('earned'), kos: d('kos') + d('npc_ko'), races: d('race_wins'), dangal: d('wrestle'), floods: d('flood_runs'), jacks: d('jacks'), jobs: d('deliveries') + d('rides') + d('shifts'), badla: d('badla'), don: d('don'), dance: d('dance') + d('baraat') };
}
function dayTitle(s) {
  if (s.don && P.don && P.don.champ === P.don.wk) return ['👑', 'GALI KA DON'];
  if (s.kos >= 6) return ['👊', 'GALI KA GUNDA']; if (s.earned >= 20000) return ['💰', 'GURUGRAM KA SETH']; if (s.floods || s.jacks >= 2) return [s.floods ? '🚣' : '🛺', s.floods ? 'NAAV KING' : 'AUTO CHOR NO. 1'];
  if (s.races >= 2) return ['🏎️', 'GOLF COURSE ROAD KA RAJA']; if (s.dance >= 3) return ['💃', 'NEON NIGHTS KA HERO']; if (s.jobs >= 4) return ['💼', 'MEHNATI CHHORA']; if (s.kos >= 1) return ['🥊', 'CHHOTA PEHLWAN'];
  return ['🙏', 'NAYA GURUGRAMI'];
}
function makeDayCard() {
  renderer.render(scene, camera); const img = new Image(); img.onload = () => drawDayCard(img); img.src = renderer.domElement.toDataURL('image/jpeg', 0.9);
}
function drawDayCard(photo) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const s = dayStats(), [ico, title] = dayTitle(s);
  x.fillStyle = '#1b1410'; x.fillRect(0, 0, W, H);
  const ph = 860, sc = Math.max(W / photo.width, ph / photo.height), sw = W / sc, sh = ph / sc; x.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, 0, 0, W, ph);
  const gr = x.createLinearGradient(0, ph - 260, 0, ph); gr.addColorStop(0, 'rgba(27,20,16,0)'); gr.addColorStop(1, '#1b1410'); x.fillStyle = gr; x.fillRect(0, ph - 260, W, 260);
  const cols = ['#d7331f', '#f6c026', '#1a8a4a', '#2563b8']; for (let i = 0; i < W / 40; i++) { x.fillStyle = cols[i % 4]; x.fillRect(i * 40, 0, 40, 14); x.fillRect(i * 40, H - 14, 40, 14); }
  x.fillStyle = 'rgba(27,20,16,.75)'; rrect(x, 40, 50, 560, 84, 42); x.fill(); x.fillStyle = '#f6c026'; x.font = '800 50px "Baloo 2", sans-serif'; x.textAlign = 'left'; x.fillText('AAJ KA HISAAB', 72, 110);
  x.textAlign = 'center'; x.fillStyle = '#fff4d8'; x.font = '700 40px Mukta, sans-serif'; x.fillText(P.name + ' · Level ' + P.level + ' · ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), W / 2, ph + 10);
  let tf = 104; do { x.font = '800 ' + tf + 'px "Baloo 2", sans-serif'; tf -= 4; } while (x.measureText(ico + ' ' + title).width > W - 90 && tf > 48); x.fillStyle = '#f6c026'; x.strokeStyle = '#120c08'; x.lineWidth = 14; x.lineJoin = 'round'; x.strokeText(ico + ' ' + title, W / 2, ph + 140); x.fillText(ico + ' ' + title, W / 2, ph + 140);
  const rows = [[Math.max(s.wallet, s.earned), '₹', 'kamaye', v => fmt(v)], [s.tasks, '✅', 'aaj ke kaam'], [s.kos, '👊', 'dhobi pachhad'], [s.races, '🏁', 'race jeeti'], [s.dangal, '🤼', 'dangal jeete'], [s.floods, '🌊', 'baadh paar ki'], [s.jacks, '🛺', 'gaadi chheeni'], [s.jobs, '💼', 'kaam kiye'], [s.badla, '😤', 'badla liya'], [s.don ? (P.don ? P.don.ch : s.don) : 0, '📖', 'Don chapter (/5)'], [s.dance, '💃', 'baar naache']].filter(r => r[0] > 0).slice(0, 6);
  if (!rows.length) rows.push([1, '🙏', 'din Gurugram mein']);
  const nr = Math.ceil(rows.length / 2), top = ph + 200, bottom = H - 400, y0 = top + (bottom - top - nr * 190) / 2 + 80;
  rows.forEach((r, i) => { const solo = i === rows.length - 1 && rows.length % 2, cx = solo ? W / 2 : i % 2 ? W * 0.75 : W * 0.25, cy = y0 + Math.floor(i / 2) * 190; x.fillStyle = 'rgba(255,244,216,.07)'; rrect(x, cx - 230, cy - 70, 460, 160, 26); x.fill();
    x.fillStyle = '#fff'; x.font = '800 70px "Baloo 2", sans-serif'; x.fillText((r[3] ? r[3](r[0]) : r[0]) + (r[1] === '₹' ? '' : ' ' + r[1]), cx, cy + 10); x.fillStyle = '#d9c7a3'; x.font = '700 36px Mukta, sans-serif'; x.fillText(r[2], cx, cy + 62); });
  const quip = { 'GALI KA DON': 'Dalal Bhai bhi salaam karta se 👑', 'GALI KA GUNDA': 'Mohalle mein naam chal rya se 😎', 'GURUGRAM KA SETH': 'Flat ki EMI? Chutki mein 💸', 'NAAV KING': 'Baarish aayi, gaadi nahi naav nikali 🚣', 'AUTO CHOR NO. 1': 'Ola cancel? Auto apna 🛺',
    'GOLF COURSE ROAD KA RAJA': '200 se neeche to beizzati 🏎️', 'NEON NIGHTS KA HERO': 'Thumke dekh ke DJ bhi ruk gaya 💃', 'MEHNATI CHHORA': 'Malhotra Sir bhi khush 💼', 'CHHOTA PEHLWAN': 'Agli baar Sharma Uncle ki baari 😤', 'NAYA GURUGRAMI': 'Abhi to bas shuruaat se 🙏' }[title];
  x.fillStyle = '#fff4d8'; x.font = '700 44px Mukta, sans-serif'; x.fillText(quip, W / 2, ph + 215);
  const st = P.streak && P.streak.n ? '🔥 ' + P.streak.n + ' din ki streak' : ''; x.fillStyle = '#ffd27a'; x.font = '800 44px "Baloo 2", sans-serif'; if (st) x.fillText(st, W / 2, H - 330);
  x.fillStyle = '#f6c026'; rrect(x, 90, H - 280, W - 180, 120, 30); x.fill(); x.fillStyle = '#1b1410'; x.font = '800 52px "Baloo 2", sans-serif'; x.fillText('Mera record tod ke dikha 👊', W / 2, H - 202);
  x.fillStyle = '#fff'; x.font = '800 60px "Baloo 2", sans-serif'; x.fillText('Gurugram Life', W / 2, H - 80); x.fillStyle = '#d9c7a3'; x.font = '600 32px Mukta, sans-serif'; x.fillText(window.GL_SOLO ? 'Free game · phone ya laptop' : location.host + ' · free game', W / 2, H - 36);
  const url = c.toDataURL('image/jpeg', 0.9); ev('card');
  const text = 'Aaj Gurugram Life mein main bana ' + title + ' ' + ico + (s.earned ? ', ' + fmt(s.earned) + ' kamaye' : '') + '! Mera record tod ke dikha: ' + (window.GL_SHARE_URL || location.origin);
  shareSheet('Aaj ka Hisaab', url, 'aaj-ka-hisaab-' + P.name.replace(/\W+/g, '-') + '.jpg', text);
}
function makeCard(photo) {
  const W = 1080, H = 1350; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#1b1410'; x.fillRect(0, 0, W, H);
  const ph = 820; const s = Math.max(W / photo.width, ph / photo.height); const sw = W / s, sh = ph / s; x.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, 0, 0, W, ph);
  const cols = ['#d7331f', '#f6c026', '#1a8a4a', '#2563b8']; for (let i = 0; i < W / 40; i++) { x.fillStyle = cols[i % 4]; x.fillRect(i * 40, ph, 40, 16); x.fillRect(i * 40, H - 16, 40, 16); }
  x.fillStyle = '#f6c026'; x.font = '800 84px "Baloo 2", sans-serif'; x.textAlign = 'left'; x.fillText(P.name, 50, ph + 110);
  x.fillStyle = '#fff4d8'; x.font = '700 40px Mukta, sans-serif'; x.fillText(D.respectTitle(P.respect) + ' · Level ' + P.level + (G.belt && G.belt.id === P.id ? ' · AKHARA CHAMPION' : ''), 50, ph + 170);
  const cr = G.myCrew; x.fillText((cr ? 'Crew [' + cr.tag + '] · ' : '') + 'Net worth ' + fmt(D.netWorth(P)), 50, ph + 225);
  const bl = P.bling.map(b => D.BLING[b].name).join(', '); x.font = '600 34px Mukta, sans-serif'; x.fillStyle = '#e8c27a'; x.fillText(bl ? 'Bling: ' + bl : 'Party score ' + P.party + ' · KOs ' + (P.c.kos || 0), 50, ph + 275);
  if (P.plate) { x.fillStyle = '#ffffff'; rrect(x, W - 430, ph + 50, 380, 110, 12); x.fill(); x.strokeStyle = '#111'; x.lineWidth = 6; x.stroke(); x.fillStyle = '#111'; x.font = '800 66px "Baloo 2", sans-serif'; x.textAlign = 'center'; x.fillText(P.plate, W - 240, ph + 130); x.font = '700 22px Mukta, sans-serif'; x.fillText('IND', W - 400, ph + 150); }
  x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = '800 54px "Baloo 2", sans-serif'; x.fillText('Gurugram Life', 50, H - 70); x.font = '600 30px Mukta, sans-serif'; x.fillStyle = '#d9c7a3'; x.textAlign = 'right'; x.fillText(window.GL_SOLO ? 'Haryana ka swag' : location.host, W - 50, H - 72);
  x.fillStyle = 'rgba(27,20,16,.65)'; rrect(x, 30, 30, 420, 70, 35); x.fill(); x.fillStyle = '#f6c026'; x.textAlign = 'left'; x.font = '800 40px "Baloo 2", sans-serif'; x.fillText('Mera Gurugram', 55, 80);
  const url = c.toDataURL('image/jpeg', 0.9); ev('card'); tutEvent('card');
  openModal('Mera Gurugram card', 'Download karo ya seedha share karo', b => {
    b.append(el('img', { src: url, class: 'cardimg', alt: 'Mera Gurugram card for ' + P.name }));
    if (window.GL_SOLO) b.append(el('p', { text: 'Photo save karne ke liye image pe long-press (phone) ya right-click → Save image (computer) karo.' }));
    else b.append(el('a', { href: url, download: 'mera-gurugram-' + P.name.replace(/\W+/g, '-') + '.jpg', class: 'buy', style: 'text-align:center;text-decoration:none;display:block;padding:10px', text: 'Download photo' }));
    const text = 'Main ' + (P.plate ? P.plate + ' wala ' : '') + P.name + ' hoon, Gurugram Life mein ' + D.respectTitle(P.respect) + '! Aaja khel: ' + (window.GL_SHARE_URL || location.origin);
    if (navigator.canShare) b.append(el('button', { class: 'buy alt', style: 'padding:10px', text: 'Share (WhatsApp, Instagram...)', onclick: async () => { try { const blob = await (await fetch(url)).blob(); const file = new File([blob], 'mera-gurugram.jpg', { type: 'image/jpeg' }); if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text }); else await navigator.share({ text }); } catch {} } }));
    b.append(el('button', { class: 'buy alt', style: 'padding:10px', text: 'Copy invite message', onclick: async e => { try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied!'; } catch { toast(text); } } }));
    b.append(el('a', { class: 'buy', style: 'text-align:center;text-decoration:none;display:block;padding:10px;background:#25d366', href: 'https://wa.me/?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener', text: 'Send on WhatsApp' }));
  });
}

// ================================================================ DAY / NIGHT
// DAY.t = fraction of the day in Gurugram (IST, UTC+5:30); DAY.fixed pins it for promo captures
const DAY = { t: 0.3, fixed: false }; const tmpC = new THREE.Color(), HAZE = new THREE.Color(0xd2d3cc);
const DAYV = { horizon: scene.fog.color, sunVec: new THREE.Vector3(0.5, 0.6, 0.4), day: 1, dusk: 0, night: 0, wet: 0, inside: false, map: false, t: 0, dt: 0 };
function updateDay(dt) {
  if (!DAY.fixed) DAY.t = ((Date.now() + (G.timeOffset || 0) * 1000 + 5.5 * 3600e3) % 864e5) / 864e5; let t = DAY.t; if (G.ev?.type === 'diwali') t = 0.92;
  const sunH = Math.sin((t - 0.25) * Math.PI * 2); const day = clamp(sunH * 1.6 + 0.3, 0, 1); const dusk = clamp(1 - Math.abs(sunH) * 4, 0, 1); const night = 1 - day;
  if (G.inside) { const club = G.inside === 'club'; scene.background.copy(club ? SKY_CLUB : SKY_IN); scene.fog.color.copy(scene.background); hemi.intensity = club ? 0.6 : 1.05; sun.intensity = club ? 0.2 : 0.45; for (const m of NIGHT_MATS) m.emissiveIntensity = 0; return; }
  tmpC.copy(SKY_NIGHT).lerp(SKY_DAY, day); tmpC.lerp(HAZE, day * 0.45); tmpC.lerp(SKY_DUSK, dusk * 0.6); if (G.ev?.type === 'flood') tmpC.lerp(new THREE.Color(0x6b7680), 0.6); scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
  // strong sun and softer fill: sunlit sides bright, shadows and shaded sides cooler; warm light at sunrise and sunset
  hemi.intensity = 0.3 + day * 0.45; sun.intensity = 0.08 + day * 0.72; sun.color.setRGB(1, 1 - dusk * 0.25, 1 - dusk * 0.45); DAYV.sunVec.set(Math.cos((t - 0.25) * Math.PI * 2), Math.max(0.15, sunH), 0.4).normalize(); sun.position.copy(DAYV.sunVec).multiplyScalar(200); DAYV.day = day; DAYV.dusk = dusk; DAYV.night = night;
  const ni = clamp(Math.max(night * 1.2 - 0.1, WX.wl * 0.8), 0, 1); for (const m of NIGHT_MATS) m.emissiveIntensity = ni * 0.9; if (LAMP_MAT) LAMP_MAT.emissiveIntensity = ni;
  weatherSky();
}
function clockText() { const h = Math.floor(DAY.t * 24), m = Math.floor((DAY.t * 24 - h) * 60); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); }

// ================================================================ MINIMAP
const mini = $('mini'), mctx = mini.getContext('2d');
function locName(x, z) { const b = blockOf(x, z); if (b) return b[2]; for (const r of ROADS) { if (Math.abs(x - r) < 8) return XROAD[r]; if (Math.abs(z - r) < 8) return ZROAD[r]; } return 'Gurugram'; }
function drawMini() {
  const W = mini.width, H = mini.height, sc = 0.55; mctx.save(); mctx.fillStyle = '#5f6b45'; mctx.fillRect(0, 0, W, H);
  if (G.inside) { mctx.fillStyle = '#2a2119'; mctx.fillRect(0, 0, W, H); mctx.fillStyle = '#f6c026'; mctx.font = '700 20px "Baloo 2", sans-serif'; mctx.textAlign = 'center'; wrapText(mctx, INTERIOR[G.inside].name, W / 2, H / 2 - 10, W - 40, 22); mctx.font = '600 15px Mukta, sans-serif'; mctx.fillStyle = '#fff4d8'; mctx.fillText('Exit: south door', W / 2, H / 2 + 34); mctx.restore(); return; }
  mctx.translate(W / 2, H / 2); mctx.rotate(G.yaw + Math.PI); mctx.scale(sc, sc); mctx.translate(-G.x, -G.z);
  for (const d of DIST) { mctx.fillStyle = TYPE_COL[d[3]] || '#9a927e'; mctx.fillRect(d[0] * 150 - 68, d[1] * 150 - 68, 136, 136); const t = G.turf && G.turf[d[2]]; if (t) { mctx.strokeStyle = hex(t.color); mctx.lineWidth = 8; mctx.strokeRect(d[0] * 150 - 64, d[1] * 150 - 64, 128, 128); } }
  if (G.ev?.type === 'flood') { mctx.fillStyle = 'rgba(70,120,160,.7)'; for (const n of G.ev.data.districts) { const d = DIST.find(x => x[2] === n); if (d) mctx.fillRect(d[0] * 150 - 75, d[1] * 150 - 75, 150, 150); } }
  mctx.fillStyle = '#2f2f31'; for (const r of ROADS) { mctx.fillRect(r - 7, -450, 14, 900); mctx.fillRect(-450, r - 7, 900, 14); }
  for (const m of METROS) { mctx.fillStyle = '#2563b8'; mctx.fillRect(m.x - 8, m.z - 8, 16, 16); }
  mctx.fillStyle = '#d7331f'; mctx.fillRect(D.SPOTS.naka.x - 6, D.SPOTS.naka.z - 6, 12, 12);
  if (G.ev?.type === 'baraat') { mctx.fillStyle = '#ff6fa5'; mctx.beginPath(); mctx.arc(-222, baraatZ(), 12, 0, 7); mctx.fill(); }
  if (G.wp) { mctx.fillStyle = '#f6c026'; mctx.beginPath(); mctx.arc(G.wp.x, G.wp.z, 9, 0, 7); mctx.fill(); }
  if (G.job) { const t = jobTarget(); mctx.fillStyle = '#2fc46b'; mctx.beginPath(); mctx.arc(t.x, t.z, 10, 0, 7); mctx.fill(); }
  if (G.chase) { mctx.fillStyle = '#2060ff'; mctx.beginPath(); mctx.arc(G.chase.x, G.chase.z, 8, 0, 7); mctx.fill(); }
  for (const [, R] of REMOTES) { if (!R.visible || R.inn) continue; mctx.fillStyle = R.info && R.info.crew ? hex(R.info.crew.color) : '#ff6fa5'; mctx.beginPath(); mctx.arc(R.mesh.position.x, R.mesh.position.z, 6, 0, 7); mctx.fill(); }
  mctx.restore();
  const arrow = (tx, tz, col) => { const dx = tx - G.x, dz = tz - G.z; const a = Math.atan2(dx, dz) - G.yaw; if (Math.hypot(dx, dz) * sc < W / 2 - 10) return; mctx.fillStyle = col; mctx.beginPath(); mctx.arc(W / 2 - Math.sin(a) * (W / 2 - 14), H / 2 - Math.cos(a) * (H / 2 - 14), 8, 0, 7); mctx.fill(); };
  if (G.wp) arrow(G.wp.x, G.wp.z, '#f6c026'); if (G.job) { const t = jobTarget(); arrow(t.x, t.z, '#2fc46b'); }
  mctx.fillStyle = '#fff4d8'; mctx.strokeStyle = '#1b1410'; mctx.lineWidth = 3; mctx.save(); mctx.translate(W / 2, H / 2); mctx.rotate(-(G.r - G.yaw)); mctx.beginPath(); mctx.moveTo(0, -11); mctx.lineTo(8, 9); mctx.lineTo(0, 4); mctx.lineTo(-8, 9); mctx.closePath(); mctx.stroke(); mctx.fill(); mctx.restore();
  mctx.fillStyle = '#1b1410'; mctx.font = '800 16px "Baloo 2", sans-serif'; mctx.textAlign = 'center'; mctx.fillText('N', W / 2 - Math.sin(-G.yaw - Math.PI) * (W / 2 - 14), H / 2 - Math.cos(-G.yaw - Math.PI) * (H / 2 - 14) + 6);
}

// ================================================================ RADIO UI
function radioLabel() { const b = $('musicBtn'); if (!A.Radio.playing) { b.textContent = 'Radio: off'; b.classList.remove('on'); return; } const st = A.STATIONS.find(x => x.id === A.Radio.st); if (A.Radio.street) { b.textContent = 'Radio: gaadi mein'; b.classList.remove('on'); return; } b.textContent = (A.Radio.override === 'club' ? 'CLUB' : st.freq) + ' · ' + (A.rjLine() || A.nowPlaying()); b.classList.add('on'); }
function pickLang(id) { // Haryanvi keeps the Haryanvi station; Hindi and English players get Bollywood
  I18N.setLang(id).then(() => { A.preferStation(id === 'har' ? 'har' : 'bol'); radioLabel(); renderLangPick(); if (G.started) renderMissions(); });
}
function renderLangPick() {
  const box = $('langPick'); if (!box) return; box.textContent = '';
  for (const l of I18N.LANGS) box.append(el('button', { type: 'button', class: 'lang' + (I18N.LANG === l.id ? ' on' : ''), 'aria-pressed': String(I18N.LANG === l.id), onclick: () => pickLang(l.id) }, el('b', { text: l.name }), el('small', { text: l.sub })));
}
function appLang() {
  openModal('Bhasha', 'Game ki bhasha chuno', b => {
    for (const l of I18N.LANGS) { const on = I18N.LANG === l.id; const r = itemRow(l.name, l.sub, on ? 'Chalu' : 'Chuno', () => { pickLang(l.id); setTimeout(appLang, 80); }, on); r.querySelector('.t').setAttribute('data-notr', ''); b.append(r); }
  });
}
function appRadio() {
  openModal('Gurugram Radio', 'Asli gaane, live · M: on/off · R: next station', b => {
    const cur = A.STATIONS.find(s => s.id === A.Radio.st);
    b.append(el('div', { class: 'item', style: 'background:var(--ink);color:var(--cream);border-color:var(--ink)' }, el('div', { class: 't' }, el('b', { text: A.Radio.playing ? (A.Radio.override === 'club' ? 'Neon Nights: Punjabi live' : cur.name) : 'Radio off', style: 'color:var(--sarson)' }), el('small', { text: A.Radio.playing ? 'Now playing: ' + A.nowPlaying() : 'Neeche station chuno', style: 'color:var(--muted)' }))));
    const ctr = el('div', { class: 'pad', style: 'grid-template-columns:repeat(3,1fr)' });
    ctr.append(el('button', { type: 'button', text: '⏮', 'aria-label': 'Previous', onclick: () => { A.skipTrack(-1); setTimeout(appRadio, 50); } }), el('button', { type: 'button', text: A.Radio.playing ? '⏸' : '▶', 'aria-label': A.Radio.playing ? 'Pause' : 'Play', onclick: () => { A.toggleMusic(); setTimeout(appRadio, 50); } }), el('button', { type: 'button', text: '⏭', 'aria-label': 'Next', onclick: () => { A.skipTrack(1); setTimeout(appRadio, 50); } })); b.append(ctr);
    const vol = el('input', { type: 'range', min: '0', max: '1', step: '0.05', id: 'vol', style: 'width:100%' }); vol.value = A.Music.vol; vol.oninput = () => A.setVolume(+vol.value); b.append(el('label', { for: 'vol', text: 'Volume', style: 'font-weight:700' }), vol);
    b.append(itemRow('GTA style: radio sirf gaadi mein', A.Radio.carOnly ? 'Paidal chalo to sheher ki awaaz, gaadi mein baitho to radio' : 'Radio hamesha chalega, paidal bhi', A.Radio.carOnly ? 'On' : 'Off', () => { A.setCarOnly(!A.Radio.carOnly); setTimeout(appRadio, 50); }));
    b.append(itemRow('Awaaz test karo', A.audioRunning() ? 'Awaaz chalu hai. Test dabao: ek aadmi bolega aur horn bajega' : 'Awaaz band lag rahi hai: test dabao, aur phone ka volume / silent switch check karo', 'Test', () => { A.unlock(); setTimeout(() => { A.voice('/audio/v/np1_m.mp3', 'test', 1, 0); A.sfx('horn', 1); }, 120); setTimeout(appRadio, 600); }));
    b.append(itemRow('Sheher ki awaaz', A.citySoundsOn() ? 'Horn, auto, kauve, koyal, sabzi wale, mandir ki ghanti' : 'Band hai', A.citySoundsOn() ? 'On' : 'Off', () => { A.setCitySounds(!A.citySoundsOn()); setTimeout(appRadio, 50); }));
    b.append(el('h3', { text: 'Stations' }));
    for (const s of A.STATIONS) { const on = A.Radio.playing && A.Radio.st === s.id; const dis = s.id === 'mine' && !A.Radio.list.length; b.append(itemRow(s.name, s.sub + (dis ? ' · add songs below first' : ''), on ? 'On air' : 'Tune in', () => { A.setStation(s.id); setTimeout(appRadio, 50); }, on || dis)); }
    if (A.Radio.st !== 'mine') {
      const chans = A.channelList(); const ci = A.Radio.ci[A.Radio.override === 'club' ? 'pun' : A.Radio.st];
      b.append(el('h3', { text: 'Live channels' }), el('p', { text: chans.length ? 'Yeh asli radio stations hain jo internet pe live chalte hain, isliye beech mein RJ ya ad bhi aa sakta hai. Gaana pasand nahi? ⏭ dabao.' : 'Channels load ho rahe hain… (internet chahiye)' }));
      chans.slice(0, 12).forEach((c, i) => { const on = A.Radio.playing && i === ci; b.append(itemRow(c.name, on ? 'Chal raha hai' : 'Live', on ? 'Playing' : 'Play', () => { A.playChannel(i); setTimeout(appRadio, 50); }, on)); });
      if (!chans.length) A.loadStations().then(() => { if (!$('modal').hidden && G.modalTitle === 'Gurugram Radio') appRadio(); });
    }
    b.append(el('h3', { text: 'Meri Playlist: your Haryanvi & Punjabi songs' }), el('p', { text: 'Apne phone ya computer se gaane add karo (MP3, M4A, OGG, WAV). Yeh is browser mein save rehte hain.' }));
    const inp = el('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.aac,.ogg,.wav,.opus,.flac', id: 'songIn', multiple: '', style: 'display:none' }); inp.onchange = async () => { await A.addSongs([...inp.files]); inp.value = ''; appRadio(); };
    b.append(inp, el('label', { for: 'songIn', class: 'buy', style: 'text-align:center;display:block;padding:10px', text: '+ Add songs' }));
    A.Radio.list.forEach((s, i) => { const on = A.Radio.playing && A.Radio.st === 'mine' && A.Radio.idx === i; const row = itemRow(s.name, (on ? 'Playing now' : 'Song ' + (i + 1)) + (s.temp ? ' · this session only' : ''), on ? 'Playing' : 'Play', () => { A.Radio.idx = i; if (A.Radio.st !== 'mine' || !A.Radio.playing) A.setStation('mine'); else A.playMine(); appRadio(); }, on); row.append(el('button', { type: 'button', class: 'buy alt', text: 'Remove', 'aria-label': 'Remove ' + s.name, onclick: () => A.removeSong(s.id).then(appRadio) })); b.append(row); });
  });
}

// ================================================================ MULTIPLAYER
const REMOTES = new Map(); // id -> {info, mesh, vm, label, tx,tz,tr, inn, hp, veh, visible, a}
function remoteLabelText(info) { return (info.crew ? '[' + info.crew.tag + '] ' : '') + info.name + ' · Lv ' + info.level + (info.belt ? ' · CHAMPION' : ''); }
function ensureRemote(id) { let R = REMOTES.get(id); if (!R) { R = { id, info: null, mesh: makeChar(D.SHIRTS[0]), vm: null, label: null, tx: 0, tz: 0, tr: 0, inn: '', hp: 100, veh: null, visible: false, a: 0, lookKey: '', vehKey: '' }; R.mesh.visible = false; scene.add(R.mesh); REMOTES.set(id, R); } return R; }
function applyInfo(m) {
  if (m.id === P?.id) { G.myTint = m.tint; G.myCrew = m.crew; applyMyLook(); return; }
  const R = ensureRemote(m.id); R.info = m;
  const look = { body: m.look, shirt: D.SHIRTS[(m.outfit.shirt != null ? m.outfit.shirt : m.color) % D.SHIRTS.length], hat: m.outfit.hat, shades: m.outfit.shades, bling: m.bling, belt: m.belt, tint: m.tint, crewColor: m.crew ? m.crew.color : null };
  const lk = JSON.stringify(look); if (lk !== R.lookKey) { R.lookKey = lk; setLook(R.mesh, look); }
  const lt = remoteLabelText(m); if (!R.label || R.labelText !== lt) { disposeSprite(R.label); R.labelText = lt; R.label = labelSprite(lt, { fs: 34, scale: 0.55, bg: m.belt ? 'rgba(160,120,20,.9)' : 'rgba(37,99,184,.85)' }); R.label.position.y = 3.05; R.mesh.add(R.label); }
  R.vehKey = ''; // force vehicle rebuild with new mods/plate
}
function updateSnapshot(list) {
  for (const e of list) {
    const R = ensureRemote(e[0]); if (e[1] === null) { R.visible = false; continue; }
    const first = !R.visible; R.visible = !!R.info; R.tx = e[1]; R.tz = e[2]; R.tr = e[3]; R.a = e[4]; R.inn = e[6] || ''; R.hp = e[7]; R.fx = e[8];
    const v = D.VEH[e[5]] ? e[5] : null; const vk = v ? v + '|' + JSON.stringify(R.info?.mods || {}) + '|' + (R.info?.plate || '') : '';
    if (vk !== R.vehKey) { R.vehKey = vk; if (R.vm) { scene.remove(R.vm); R.vm = null; } R.veh = v; if (v) { R.vm = makeVehicle(v, null, v === 'rent' ? {} : R.info?.mods, v === 'rent' ? null : R.info?.plate); scene.add(R.vm); R.vm.position.set(R.tx, 0.2, R.tz); } }
    if (first) { R.mesh.position.set(R.tx, 0, R.tz); if (R.vm) R.vm.position.set(R.tx, 0.2, R.tz); }
  }
}
function removeRemote(id) { const R = REMOTES.get(id); if (!R) return; scene.remove(R.mesh); if (R.vm) scene.remove(R.vm); disposeSprite(R.label); REMOTES.delete(id); }
function updateRemotes(dt) {
  const k = 1 - Math.exp(-dt * 10);
  for (const [, R] of REMOTES) {
    const vis = R.visible && (G.inside || '') === R.inn; const m = R.mesh;
    if (R.vm) { R.vm.visible = vis; R.vm.position.x += (R.tx - R.vm.position.x) * k; R.vm.position.z += (R.tz - R.vm.position.z) * k; R.vm.position.y = 0.2; R.vm.rotation.y = angLerp(R.vm.rotation.y, R.tr, k); m.position.set(R.vm.position.x, 0.55, R.vm.position.z); m.rotation.y = R.vm.rotation.y; sitChar(m); m.visible = vis && (D.VEH[R.veh].kind === 2 || D.VEH[R.veh].kind === 5); if (D.VEH[R.veh].kind === 5) { const wd = waterDepth(R.vm.position.x, R.vm.position.z); if (wd > 0.25) R.vm.position.y = 0.05 + Math.min(wd, 1) * 0.35; m.position.y = R.vm.position.y + 0.35; } if (R.label) R.label.visible = true;
      if (vis && R.fx && Math.hypot(R.vm.position.x - G.x, R.vm.position.z - G.z) < 40) { R.bassT = (R.bassT || 0) - dt; if (R.bassT < 0) { R.bassT = 0.5; A.sfx('bass', 1 - Math.hypot(R.vm.position.x - G.x, R.vm.position.z - G.z) / 40); } } }
    else { m.visible = vis; m.position.x += (R.tx - m.position.x) * k; m.position.z += (R.tz - m.position.z) * k; m.position.y = R.hp <= 0 ? 0.4 : (R.inn ? 0 : groundY(m.position.x, m.position.z)); m.rotation.y = angLerp(m.rotation.y, R.tr, k); m.rotation.x = R.hp <= 0 ? -Math.PI / 2 : 0; animChar(m, dt, R.a === 3 ? 3 : R.a === 1 ? 1 : 0); }
  }
}
let lastSt = 0;
function sendState() {
  if (!net.connected || now() - lastSt < 0.1) return; lastSt = now();
  const speaker = G.veh && (P.mods[G.veh] || {}).speaker && A.Radio.playing ? 1 : 0;
  net.send('st', { x: Math.round(G.x * 100) / 100, z: Math.round(G.z * 100) / 100, r: Math.round(G.r * 100) / 100, a: G.hp <= 0 ? 4 : G.dance ? 3 : G.moving ? 1 : 0, v: G.veh, in: G.inside || '', hp: Math.round(G.hp), fx: speaker });
}
function chatLine(who, text, tag) { const d = el('div', null, el('b', { text: (tag ? '[' + tag + '] ' : '') + who + ': ' }), text); $('chatlog').append(d); while ($('chatlog').children.length > 6) $('chatlog').firstChild.remove(); setTimeout(() => d.remove(), 14500); }
function openChat() { if (!G.started) return; $('chatbar').hidden = false; $('chatin').focus(); for (const k in keys) keys[k] = false; }
function closeChat() { $('chatbar').hidden = true; $('chatin').blur(); }
function sendChat(text) {
  text = D.cleanText(text, 120); if (!text) return; net.send('chat', { text }); tutEvent('chat'); A.sfx('chat');
  for (const n of FIGHTERS) if (n.state !== 'ko' && !n.pehl && Math.hypot(n.x - G.x, n.z - G.z) < 12 && !G.inside) { n.state = 'aggro'; say(n, pick(['Ke bolya? Aaja fir!', 'Mere te panga?', 'Ruk tu, batata hoon']), 2.5); }
}
$('chatform').addEventListener('submit', e => { e.preventDefault(); sendChat($('chatin').value); $('chatin').value = ''; closeChat(); });
$('chatClose').onclick = closeChat;
for (const t of TAUNTS) $('taunts').append(el('button', { type: 'button', text: t, onclick: () => { sendChat(t); closeChat(); } }));

function setNetChip() { const n = $('net'); if (net.solo) { n.classList.remove('online'); n.textContent = 'Solo mode'; return; } n.classList.toggle('online', net.connected); n.textContent = net.connected ? 'Online: ' + (G.peerCount || 1) : 'Reconnecting…'; }
net.on('status', setNetChip);
net.on('welcome', m => {
  P = m.profile; G.myId = m.id; lsSet('gl_token', m.token); G.timeOffset = m.serverTime - Date.now() / 1000;
  if (m.weather) setWeather(m.weather, true); G.ev = m.event; G.auction = m.auction; G.party = m.party; G.roast = m.roast; G.turf = m.turf; G.belt = m.belt; G.lb = m.lb;
  for (const pi of m.players) applyInfo(pi);
  buildFlood(); if (G.ev?.type === 'ipl') drawIpl(G.ev.data); renderRoast();
  if (!G.started) startGame(m.daily); else { applyMyLook(); updateHUD(); renderMissions(); }
});
net.on('profile', m => { const crewChanged = P && P.crew !== m.p.crew; P = m.p; updateHUD(); renderMissions(); applyMyLook(); if (crewChanged) net.req('crews', {}).then(r => { if (r.ok) G.turf = r.turf; }); });
net.on('pi', applyInfo);
net.on('s', m => { updateSnapshot(m.p); if (m.n !== G.peerCount) { G.peerCount = m.n; setNetChip(); } });
net.on('left', m => removeRemote(m.id));
net.on('toast', m => { if (m.kind === 'join') return feed(m.text, 'event'); toast(m.text, m.kind); if (m.sfx) A.sfx(m.sfx); });
net.on('ann', m => { feed(m.text, m.kind); });
net.on('weather', m => setWeather(m.w));
net.on('chat', m => { const muted = lsGet('gl_muted') || []; if (muted.includes(m.id)) return; const mine = m.id === P?.id; chatLine(m.name + (mine ? ' (you)' : ''), m.text, m.tag); if (mine) say(player, m.text, 5); else { const R = REMOTES.get(m.id); if (R && R.visible) say(R, m.text, 5); A.sfx('chat'); } });
net.on('jacked', m => { if (G.veh && !(G.race && G.race.phase !== 'done')) { G.vs = 0; dismount(); } G.lastFight = now(); A.sfx('punch'); bigText('GAADI CHHEENI!', m.name + ' ne gaadi se kheench liya. Lad ke wapas le!', 2); });
net.on('jackwin', jackWin);
net.on('don', m => { A.sfx('level'); const C = D.DON[m.ch - 1], N = D.DON[m.ch]; setTimeout(() => showCard(m.final ? '👑 GALI KA DON!' : 'Chapter ' + m.ch + ' poora! +' + fmt(m.reward), C.outro, [[m.final ? 'Card banao, sabko dikhao 📸' : 'Aaj ka card banao 📸', () => { $('raceres').hidden = true; makeDayCard(); }, 'alt'], ['Theek se', () => { $('raceres').hidden = true; }, 'alt2']], m.final ? 'Monday ko nayi kahani shuru hogi.' : 'Kal milte hain... Chapter ' + (m.ch + 1) + ': ' + N.boss + ' (' + N.at[2] + ')'), 1600); });
net.on('mprog', m => { if (!P) return; P.c[m.k] = m.v; renderMissions(); });
net.on('daydone', m => { setTimeout(() => showCard('Aaj ka din: kamaal! 🔥', 'Saare kaam poore, streak ' + m.streak + ' din. Sabko dikha de!', [['Aaj ka card banao 📸', () => { $('raceres').hidden = true; makeDayCard(); }, 'alt'], ['Baad mein', () => { $('raceres').hidden = true; }, 'alt2']]), 3600); bigText('AAJ KE SAARE KAAM POORE!', 'Bonus ' + fmt(m.bonus) + ' · streak ' + m.streak + ' din 🔥', 3.2); A.sfx('level'); for (let i = 0; i < 4; i++) setTimeout(() => firework(G.x + rnd(-30, 30), G.z + rnd(-30, 30)), i * 500); });
net.on('dmg', m => { takeHit(m.d, m.name); if (Math.random() < 0.5) toast(m.name + ' ne kaan ke neeche baja diya!', 'bad'); });
net.on('fx', m => {
  if (m.fx === 'punch') { const R = REMOTES.get(m.by); if (R) R.mesh.userData.punchT = 0.22; if (m.target !== P.id) A.sfx('punch', 0.5); }
  if (m.fx === 'horn') { const d = Math.hypot(m.x - G.x, m.z - G.z); if (m.by !== P.id) A.sfx('pressure', clamp(1.2 - d / 80, 0.1, 1.2)); }
  if (m.fx === 'notes') burst(m.x, 3, m.z, 0x7fbf7f, 40, { note: true, mat: glow(0x9fd39f), speed: 4, up: 3, grav: 2, life: 4 });
  if (m.fx === 'firework') firework(m.x, m.z);
  if (m.fx === 'gulal') burst(m.x, 2, m.z, m.color, 40, { speed: 5 });
  if (m.fx === 'bottle' && G.inside === 'club') { for (let i = 0; i < 4; i++) setTimeout(() => burst(3200 + rnd(-8, 8), 6, 2000 + rnd(-6, 6), pick([0xffd400, 0xff2bd6, 0x00e5ff]), 50, { speed: 8 }), i * 300); A.sfx('cheer'); }
});
net.on('evsoon', m => { G.evSoon = { name: m.name, at: now() + m.in }; if (!G.story && !G.race) toast('⏱ ' + m.in + ' second mein: ' + m.name + '. Pehle 3 ko inaam!'); updateBanner(); });
net.on('event', m => { const prev = G.ev; G.ev = m.ev; G.evSoon = null; G.evReached = false; rushStart(); buildFlood(); if (G.ev?.type === 'ipl') drawIpl(G.ev.data); else drawIpl(null); if (G.story || G.race) { /* no interruptions during the story or a race */ } else if (G.ev) { toast(G.ev.name + ' shuru! ' + eventHelp(G.ev.type)); A.sfx('ok'); } else if (prev) toast(prev.name + ' khatam'); renderJob(); });
net.on('ipl', m => { if (G.ev) G.ev.data = m.d; drawIpl(m.d); });
net.on('auction', m => { G.auction = m.a; });
net.on('party', m => { const was = G.party; G.party = m.party; if (m.party && !was && m.party.host !== P.id) showPartyInvite(m.party); });
net.on('roast', m => { G.roast = m.r; renderRoast(); });
net.on('invite', m => showInvite(m));
net.on('dance', m => { if (m.d) startDanceGame(m.d); else { G.minigame = null; closeModal(); toast(m.result && m.result.winner === P.id ? 'Dance-off jeet gaya! Floor tera se!' : 'Dance-off haar gaya. Agli baar!', m.result && m.result.winner === P.id ? 'money' : 'bad'); } });
net.on('turf', m => { G.turf = m.turf; });
net.on('belt', m => { G.belt = m.belt; applyMyLook(); });
net.on('lb', m => { G.lb = m.lb; });
net.on('roadrage', m => { G.beef = { with: m.with, name: m.name, until: now() + 60 }; toast('ROAD RAGE! ' + m.name + ' se gaadi bhid gayi. Utar ke dekh le (V), 60s mein KO = bonus respect', 'bad'); A.sfx('crash'); });
net.on('kicked', m => { fadeTo(m.reason + '. Yeh tab band kar do.', 999999, null); });
function showPartyInvite(p) { const box = $('invite'); box.hidden = false; box.textContent = ''; box.append(el('b', { text: p.hostName + ' ki Bhondsi farmhouse party! DJ, lights, sab kuch.' })); const row = el('div', { class: 'row' }); row.append(el('button', { class: 'buy', text: 'Join party', onclick: () => { box.hidden = true; joinParty(); } }), el('button', { class: 'buy alt', text: 'Baad mein', onclick: () => { box.hidden = true; } })); box.append(row); clearTimeout(G.inviteT); G.inviteT = setTimeout(() => { box.hidden = true; }, 25000); }



// situation music: fight theme while fists fly, dhol bhangra at a baraat or when dancing outdoors
function musicDirector() {
  const t = now(); let th = null, k;
  if (t - (G.lastFight || -99) < 5 || (AKHARA.fight && !G.inside) || (G.story && G.story.beat === 'fight' && G.story.monu && G.story.monu.state !== 'ko')) th = 'fight';
  else if (G.chase && chaseJeep) { th = 'chase'; k = clamp(1.15 - Math.hypot(G.x - G.chase.x, G.z - G.chase.z) / 70, 0.2, 1); } // builds as the police close in
  else if (G.race && G.race.phase !== 'done' && G.race.phase !== 'count') { th = 'chase'; k = 0.55; }
  else if (!G.inside && ((G.ev?.type === 'baraat' && Math.hypot(G.x + 222, G.z - baraatZ()) < 70) || G.dance)) th = 'bhangra';
  A.setTheme(th, k); A.setOnFoot(!G.veh && !G.inside);
}
// what the city sounds like where the player is: traffic near roads, birds in green areas, crowds and vendors in markets, bells near temples
function cityMix() {
  const dRoad = Math.min(...ROADS.map(r => Math.min(Math.abs(G.x - r), Math.abs(G.z - r)))), i = Math.round(G.x / 150), j = Math.round(G.z / 150), d = DIST.find(q => q[0] === i && q[1] === j), ty = d ? d[3] : '';
  const night = DAYV.night, jam = G.ev?.type === 'jam' ? 1.3 : 1;
  return { out: !G.inside && !G.map, veh: !!G.veh, night, traffic: clamp((1 - (dRoad - 7) / 45) * (1 - 0.45 * night) * jam, 0.12, 1), nature: ['park', 'forest', 'village'].includes(ty) ? 1 : ['luxury', 'res'].includes(ty) ? 0.35 : 0.1,
    market: ['market', 'plaza', 'dhaba', 'cyberhub', 'mall', 'theka'].includes(ty) ? clamp(1 - (dRoad - 7) / 60, 0.3, 1) : 0, temple: ty === 'temple' ? 1 : 0 };
}

// ================================================================ WEATHER + WATER: rain, rising waterlogging, the lake, boats, flood runs
// G.weather comes from the server (everyone shares the sky). wl = rain strength 0..1, ww = how high the water stands 0..1, both eased.
const WX = { wl: 0, ww: 0, flashT: 0, nextBolt: 0 };
const LAKE = { x: -150, z: 292, r: 36, name: 'Biodiversity Park ki jheel' };
const rainMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uDensity: { value: 0 }, uColor: { value: new THREE.Color(0xc8d6e5) } },
  vertexShader: `attribute float aR; attribute float aEnd; uniform float uTime; uniform vec3 uCam; uniform float uDensity; varying float vA;
    void main() { vec3 p = position; float sp = 22.0 + aR * 10.0; p.y = mod(p.y - uTime * sp, 34.0); p.x = uCam.x + mod(p.x - uCam.x + 45.0, 90.0) - 45.0; p.z = uCam.z + mod(p.z - uCam.z + 45.0, 90.0) - 45.0;
      p.y += aEnd * (0.9 + uDensity * 0.6); p.x += aEnd * 0.12; vA = step(aR, uDensity); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform vec3 uColor; varying float vA; void main() { if (vA < 0.5) discard; gl_FragColor = vec4(uColor, 0.72); }`,
});
const RAIN = (() => { const N = 7000, pos = new Float32Array(N * 6), aR = new Float32Array(N * 2), aEnd = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { const x = rnd(-45, 45), y = rnd(0, 34), z = rnd(-45, 45), r = Math.random(); pos.set([x, y, z, x, y, z], i * 6); aR[i * 2] = aR[i * 2 + 1] = r; aEnd[i * 2] = 0; aEnd[i * 2 + 1] = 1; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(aR, 1)); g.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 1));
  const m = new THREE.LineSegments(g, rainMat); m.frustumCulled = false; m.visible = false; scene.add(m); return m; })();
const FLOOD_MESH = []; let lakeMesh = null;
function buildWater() {
  const wm = () => new THREE.MeshPhongMaterial({ color: 0x6f6a4a, specular: 0x8899aa, shininess: 40, transparent: true, opacity: 0.86 });
  for (const s of D.FLOOD_SPOTS) { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), wm()); m.rotation.x = -Math.PI / 2; m.position.set(s.x, 0.1, s.z); m.visible = false; scene.add(m); FLOOD_MESH.push(m); }
  lakeMesh = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r, 40), new THREE.MeshPhongMaterial({ color: 0x2f6f8f, specular: 0x9fc3d6, shininess: 70 })); lakeMesh.rotation.x = -Math.PI / 2; lakeMesh.position.set(LAKE.x, 0.25, LAKE.z); world.add(lakeMesh);
  const shore = new THREE.Mesh(new THREE.RingGeometry(LAKE.r, LAKE.r + 2.5, 40), mat(0xb59a6a)); shore.rotation.x = -Math.PI / 2; shore.position.set(LAKE.x, 0.24, LAKE.z); world.add(shore);
  for (let i = TREES.length - 1; i >= 0; i--) if (Math.hypot(TREES[i][0] - LAKE.x, TREES[i][1] - LAKE.z) < LAKE.r + 4) TREES.splice(i, 1);
  const gx = LAKE.x, gz = LAKE.z + LAKE.r + 3; bx(world, 6, 0.3, 5, 0x7a5230, gx, 0.4, gz); sign(world, 'NAAV GHAT', 'Boat lo, jheel mein ghoomo', '#2563b8', '#ffffff', 8, 1.6, gx, 3.2, gz + 2.6, 0);
  zone('out', gx, gz + 2, 5, () => 'Naav Ghat: boat kharido / paani mein utaro', () => { if (P.vehicles.includes('naav')) { if (G.veh) dismount(); G.x = LAKE.x; G.z = LAKE.z + LAKE.r - 6; G.r = G.yaw = Math.PI; mount('naav'); } else openDealer(); });
  POI_EXTRA.push({ x: gx, z: gz + 2, name: 'Naav Ghat (boat)', cat: 'ghoomo' });
  for (const sp of D.FLOOD_SPOTS) zone('out', sp.x, sp.z + sp.r + 8, 10, () => (G.weather?.lvl || 0) >= 2 && WX.ww > 0.3 && !G.frun ? 'Paani paar karo: ' + sp.name : null, startFloodRun);
}
function spotRadius(s) { return s.r * (0.35 + 0.65 * WX.ww); }
// how deep the water is here: 0 dry … ~1.5 in the lake
function waterDepth(x, z) {
  let d = 0; const lk = Math.hypot(x - LAKE.x, z - LAKE.z); if (lk < LAKE.r) d = 1.5;
  if (WX.ww > 0.05) for (const s of D.FLOOD_SPOTS) { const r = spotRadius(s), q = Math.hypot(x - s.x, z - s.z); if (q < r) d = Math.max(d, 1.25 * WX.ww * (1 - (q / r) ** 2)); }
  if (d < 0.2) for (const p of PUDDLES) if (((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < 1) d = Math.max(d, 0.18 + 0.25 * WX.wl);
  return d;
}
function floodNear(x, z) { let best = null, bd = 1e9; for (const s of D.FLOOD_SPOTS) { const d = Math.hypot(x - s.x, z - s.z); if (d < bd) { bd = d; best = s; } } return best; }
function setWeather(w, quiet) {
  const prev = G.weather ? G.weather.lvl : 0; G.weather = w; if (quiet || !G.started || w.lvl === prev) return;
  const W = D.WEATHER[w.lvl]; A.sfx(w.lvl > prev ? 'ok' : 'tick');
  toast(w.lvl === 0 ? 'Baarish ruk gayi. Paani utarne mein time lagega!' : 'Mausam: ' + W.name + (w.lvl >= 3 ? ' · Hero Honda Chowk, Sohna Road pe paani bharega!' : ''), w.lvl >= 3 ? 'bad' : undefined);
  if (w.lvl >= 2 && prev < 2) setTimeout(() => toast('Naya kaam: "Paani paar karo" · Menu → Paani paar, ya bhare chowk pe jaa'), 3500);
}
function updateWeather(dt) {
  const W = D.WEATHER[(G.weather && G.weather.lvl) || 0]; WX.wl += (W.rain - WX.wl) * Math.min(1, dt / 6); WX.ww += (W.water - WX.ww) * Math.min(1, dt / (W.water > WX.ww ? 25 : 60)); // water rises fast, drains slowly
  const out = !G.inside; RAIN.visible = out && WX.wl > 0.02 && !G.map; rainMat.uniforms.uTime.value = now(); rainMat.uniforms.uCam.value.copy(camera.position); rainMat.uniforms.uDensity.value = WX.wl * (PERF.pr < 1 ? 0.6 : 1);
  FLOOD_MESH.forEach((m, i) => { const s = D.FLOOD_SPOTS[i]; const r = spotRadius(s); m.visible = WX.ww > 0.05; m.scale.set(r, r, 1); m.position.y = 0.08 + WX.ww * 0.35; m.material.opacity = 0.55 + WX.ww * 0.35; });
  lakeMesh.position.y = 0.25 + Math.sin(now() * 0.8) * 0.03;
  A.setRain(out ? WX.wl : WX.wl * 0.3);
  if (out && (G.weather?.lvl || 0) >= 3 && now() > WX.nextBolt) { WX.nextBolt = now() + rnd(7, 18); WX.flashT = 0.18; const h = $('hit'); h.style.transition = 'none'; h.style.background = 'rgba(255,255,255,.75)'; h.style.opacity = 1; requestAnimationFrame(() => { h.style.transition = 'opacity .35s'; h.style.opacity = 0; setTimeout(() => { h.style.background = ''; }, 400); }); setTimeout(() => A.sfx('thunder'), rnd(300, 1600)); }
  if (WX.flashT > 0) WX.flashT -= dt;
}
// rain greys the sky, shortens the view and dims the sun; called from updateDay after the normal sky
function weatherSky() { if (G.inside || WX.wl < 0.01) { if (!G.inside && !G.map) { scene.fog.near = 160; scene.fog.far = 560; } return; } const w = WX.wl; scene.background.lerp(GREY_SKY, w * 0.75); scene.fog.color.copy(scene.background); if (!G.map) { scene.fog.near = 160 - 120 * w; scene.fog.far = 560 - 300 * w; } hemi.intensity *= 1 - 0.4 * w; sun.intensity *= 1 - 0.6 * w; if (WX.flashT > 0) hemi.intensity += 1.2; }
const GREY_SKY = new THREE.Color(0x56606b);
// Paani paar karo: a timed run straight through a flooded chowk
function startFloodRun() {
  if ((G.weather?.lvl || 0) < 2 || WX.ww < 0.3) return toast('Abhi paani nahi bhara. Tez baarish mein aaiyo!');
  if (G.race || G.frun) return; closeModal(); const s = floodNear(G.x, G.z); const r = spotRadius(s);
  let dx = s.x - G.x, dz = s.z - G.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d; if (Math.abs(dx) > Math.abs(dz)) { dx = Math.sign(dx); dz = 0; } else { dz = Math.sign(dz); dx = 0; } // along the road
  const pts = [[-0.85, 'Paani mein ghuso'], [0, 'Beech mein'], [0.85, 'Bahar niklo'], [1.0 + 14 / r, 'Sukhi sadak']].map(([k, n]) => ({ x: s.x + dx * k * r, z: s.z + dz * k * r, h: Math.atan2(dx, dz), n }));
  G.frun = { s, pts, cp: 0, t0: now(), limit: 40 + r * 0.9 }; setWaypoint(pts[0].x, pts[0].z, s.name + ': paani paar karo');
  bigText('PAANI PAAR KARO!', s.name + ' · ' + Math.round(G.frun.limit) + ' second', 2.2); A.sfx('go');
}
function updateFloodRun() {
  const f = G.frun; if (!f) return; const t = now(); const left = f.limit - (t - f.t0); const p = f.pts[f.cp];
  GATES.forEach((g, k) => { const q = f.pts[f.cp + k]; g.visible = !!q && k < 2; if (q) { g.position.set(q.x, 0, q.z); g.rotation.y = q.h; g.userData.ring.material.color.setHex(k === 0 ? 0x2fa8ff : 0xfff4d8); g.userData.ring.material.opacity = k === 0 ? 0.95 : 0.4; } });
  navPoint(raceArrow, p.x, p.z);
  $('racehud').hidden = false; $('racehud').innerHTML = '<b class="p1">PAANI</b><span>' + Math.max(0, left).toFixed(0) + 's</span><span>' + (f.cp + 1) + '/' + f.pts.length + '</span><small>' + p.n + '</small>';
  if (Math.hypot(p.x - G.x, p.z - G.z) < 10) { f.cp++; A.sfx('cp'); if (f.cp >= f.pts.length) return endFloodRun(true); setWaypoint(f.pts[f.cp].x, f.pts[f.cp].z, f.pts[f.cp].n); }
  if (left <= 0) endFloodRun(false);
}
function endFloodRun(ok) {
  const f = G.frun; G.frun = null; GATES.forEach(g => { g.visible = false; }); raceArrow.visible = false; $('racehud').hidden = true; G.wp = null; wpBeacon.visible = false;
  if (ok) { const pay = Math.round(400 + f.s.r * 12 * WX.ww); bigText('PAANI PAAR!', 'Gurugram ka asli driver', 2); earn('flood', pay, 'Paani paar: ' + f.s.name); for (let k = 0; k < 2; k++) setTimeout(() => firework(G.x + rnd(-15, 15), G.z + rnd(-15, 15)), k * 400); }
  else { bigText('PAANI MEIN PHANS GAYA', 'Time khatam. Fir try kar!', 2); A.sfx('err'); }
}
// police boats patrol the water when you go boating
function boatPolice(dt) {
  if (G.veh !== 'naav' || G.chase || G.race || G.story || G.inside) return; if (waterDepth(G.x, G.z) < 0.3) return;
  G.boatT = (G.boatT || 0) + dt; if (G.boatT < 35) return; G.boatT = 0;
  if (Math.random() < 0.45) { startChase({ near: true, secs: 25, boat: true, sp: 23 }); bigText('JAL POLICE!', '"Ruk ja! Naav ka permit dikha!"', 2); A.sfx('siren'); }
}

// ================================================================ CITY FILL: shop rows, skyline, crowds, potholes, garbage, waterlogging
// Everything here is instanced (one draw call per kind) so a denser Gurugram stays fast on phones.
const SHOP_NAMES = ['SHARMA SWEETS', 'JAAT DHABA', 'CHAUDHARY MOBILES', 'YADAV HARDWARE', 'AGGARWAL MEDICOS', 'GUPTA GENERAL STORE', 'BALAJI CHAI', 'HARYANA TENT HOUSE', 'SINGH TYRES', 'MALIK GYM', 'DEEPAK SALOON', 'MAA DURGA DHABA', 'LUCKY PROPERTY DEALER', 'ROYAL TAILORS', 'BANARASI PAAN', 'RAJ PHOTOSTAT', 'SANGWAN DAIRY', 'BANSAL BOOK DEPOT', 'KRISHNA CHHOLE BHATURE', 'JAI BHOLE ELECTRICALS', 'DAHIYA SPORTS', 'HOODA CAR WASH', 'SHIV MOMOS', 'RAO KIRANA'];
const SIGN_COLS = [['#d7331f', '#fff4d8'], ['#1a8a4a', '#fff4d8'], ['#2563b8', '#ffffff'], ['#f6c026', '#1b1410'], ['#1b1410', '#f6c026'], ['#8b3fc4', '#ffffff']];
const POTHOLES = [], PUDDLES = [], GARBAGE = [], CROWD = [];
const colHit = (x0, x1, z0, z1) => (COL.out || []).some(b => x0 < b.x1 && x1 > b.x0 && z0 < b.z1 && z1 > b.z0);
const zoneNear = (x, z, r) => ZONES.some(Z => Z.zone === 'out' && Math.hypot(Z.x - x, Z.z - z) < r + (Z.r || 4));
function buildCityFill() {
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  // police thana near Iffco Chowk
  for (const [tx, tz] of [[40, -125], [-40, -125], [40, -175], [-40, -175], [0, -195]]) { if (colHit(tx - 12, tx + 12, tz - 8, tz + 8)) continue; building(world, tx, tz, 22, 14, 9, 'white'); bx(world, 22.2, 1.2, 14.2, 0x1b3a8a, tx, 7.6, tz); bx(world, 22.2, 0.5, 14.2, 0xd7331f, tx, 8.4, tz); sign(world, 'POLICE THANA', 'Gurugram Police · Sector 29 · Dial 112', '#1b3a8a', '#ffffff', 16, 2.4, tx, 5.6, tz + 7.06); door(world, tx, tz + 7, 4); zone('out', tx, tz + 9, 4.5, () => 'Police Thana: shikayat darj karo', () => toast(pick(['Munshi ji: "Line mein lag ja, FIR kal likhenge."', 'Thanedar: "Kya hua? Phone chori? Chai pi ke ja."', 'Havaldar: "Naka pe jo kiya tha, wo yaad se!"']))); POI_EXTRA.push({ x: tx, z: tz + 9, name: 'Police Thana', cat: 'police' }); break; }
  // shop rows along every block edge, wherever there's room
  const shops = [];
  for (const d of DIST) {
    if (['park', 'forest'].includes(d[3])) continue; const cx = d[0] * 150, cz = d[1] * 150;
    for (let side = 0; side < 4; side++) for (let t = -54; t <= 54; t += 10.5) {
      if (Math.random() < 0.12) continue; const W = rnd(8, 9.6), Dp = 7, H = rnd(5.5, 11); const along = t + rnd(-0.6, 0.6);
      const ry = [0, Math.PI, Math.PI / 2, -Math.PI / 2][side]; const x = side < 2 ? cx + along : cx + (side === 2 ? 61 : -61), z = side < 2 ? cz + (side === 0 ? 61 : -61) : cz + along;
      const w = side < 2 ? W : Dp, dd = side < 2 ? Dp : W; if (colHit(x - w / 2 - 0.6, x + w / 2 + 0.6, z - dd / 2 - 0.6, z + dd / 2 + 0.6) || zoneNear(x, z, 3)) continue;
      addCol('out', x - w / 2, x + w / 2, z - dd / 2, z + dd / 2); shops.push({ x, z, W, H, ry, fx: Math.sin(ry), fz: Math.cos(ry), c: pick([0xe8c39e, 0xd98f6b, 0xc9d6a3, 0x9fc3d6, 0xe3a3b8, 0xf0d77a, 0xcfc6b4, 0xd6b38a, 0xa7c7a0]), a: pick([0xd7331f, 0x1a8a4a, 0x2563b8, 0xf6c026, 0xe07b10]), sign: irnd(0, SHOP_NAMES.length - 1), sc: irnd(0, SIGN_COLS.length - 1) });
    }
  }
  for (let i = TREES.length - 1; i >= 0; i--) if (colHit(TREES[i][0] - 0.5, TREES[i][0] + 0.5, TREES[i][1] - 0.5, TREES[i][1] + 0.5)) TREES.splice(i, 1);
  const inst = (geo, material, n) => { const im = new THREE.InstancedMesh(geo, material, n); world.add(im); return im; };
  const body = inst(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff, map: new THREE.CanvasTexture(RL.shopWallTex()) }), shops.length), shut = inst(BOX, mat(0x4a4f55), shops.length), awn = inst(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), shops.length), win = inst(BOX, RL.glass(), shops.length);
  const place = (im, i, x, y, z, ry, sx, sy, sz) => { q.setFromAxisAngle(up, ry); ps.set(x, y, z); sc.set(sx, sy, sz); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); };
  const signGeo = SHOP_NAMES.map(() => ({ p: [], uv: [], ix: [] }));
  shops.forEach((s, i) => {
    place(body, i, s.x, s.H / 2, s.z, s.ry, s.W, s.H, 7); body.setColorAt(i, col.setHex(s.c));
    place(shut, i, s.x + s.fx * 3.55, 1.5, s.z + s.fz * 3.55, s.ry, s.W * 0.7, 3, 0.15);
    place(awn, i, s.x + s.fx * 4.2, 3.4, s.z + s.fz * 4.2, s.ry, s.W * 0.96, 0.18, 1.5); awn.setColorAt(i, col.setHex(s.a));
    place(win, i, s.x + s.fx * 3.52, s.H > 8 ? s.H - 1.8 : -5, s.z + s.fz * 3.52, s.ry, s.W * 0.6, 1.3, 0.1);
    const g = signGeo[s.sign]; const cxs = s.x + s.fx * 3.62, czs = s.z + s.fz * 3.62, rx = Math.cos(s.ry), rz = -Math.sin(s.ry), hw = s.W * 0.45, y0 = 4.0, y1 = 5.3; const b = g.p.length / 3;
    g.p.push(cxs - rx * hw, y0, czs - rz * hw, cxs + rx * hw, y0, czs + rz * hw, cxs + rx * hw, y1, czs + rz * hw, cxs - rx * hw, y1, czs - rz * hw); g.uv.push(0, 0, 1, 0, 1, 1, 0, 1); g.ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  for (const im of [body, awn]) if (im.instanceColor) im.instanceColor.needsUpdate = true;
  signGeo.forEach((g, k) => { if (!g.p.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2)); geo.setIndex(g.ix); const [bg, fg] = SIGN_COLS[k % SIGN_COLS.length]; const t = new THREE.CanvasTexture(signCanvas(SHOP_NAMES[k], null, bg, fg, 512, 80)); world.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t }))); });
  // skyline ring outside the playable city
  const ring = []; for (let side = 0; side < 4; side++) for (let t = -600; t <= 600; t += rnd(20, 30)) { const off = rnd(462, 540); const x = side < 2 ? t : (side === 2 ? off : -off), z = side < 2 ? (side === 0 ? off : -off) : t; ring.push([x, z, rnd(18, 30), rnd(18, 30), rnd(20, 90)]); }
  const sky = inst(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), ring.length); ring.forEach((r, i) => { place(sky, i, r[0], r[4] / 2, r[1], 0, r[2], r[4], r[3]); sky.setColorAt(i, col.setHex(pick([0x8fa3b5, 0xb8b0a0, 0x9fb7c9, 0xc9b9a0, 0x7f8f9f, 0xd2c6b2]))); }); sky.instanceColor.needsUpdate = true;
  // potholes, waterlogging, garbage
  for (const r of ROADS) for (let t = -430; t <= 430; t += rnd(70, 140)) { if (ROADS.some(q2 => Math.abs(t - q2) < 9)) continue; const lat = rnd(-4.5, 4.5); if (Math.random() < 0.5) POTHOLES.push({ x: r + lat, z: t, s: rnd(0.9, 1.5) }); else POTHOLES.push({ x: t, z: r + lat, s: rnd(0.9, 1.5) }); }
  const ph = inst(new THREE.CircleGeometry(1, 7), mat(0x1d1d1e), POTHOLES.length); POTHOLES.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); ps.set(p.x, 0.06, p.z); sc.set(p.s * 1.3, p.s, 1); m4.compose(ps, q, sc); ph.setMatrixAt(i, m4); });
  for (let k = 0; k < 14; k++) { const r = pick(ROADS), t = rnd(-420, 420); const horiz = Math.random() < 0.5; PUDDLES.push({ x: horiz ? t : r + rnd(-2, 2), z: horiz ? r + rnd(-2, 2) : t, rx: horiz ? rnd(9, 16) : rnd(5, 7), rz: horiz ? rnd(5, 7) : rnd(9, 16) }); }
  const pud = inst(new THREE.CircleGeometry(1, 20), new THREE.MeshPhongMaterial({ color: 0x4f6d7d, specular: 0x99aabb, shininess: 60, transparent: true, opacity: 0.8 }), PUDDLES.length); PUDDLES.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); ps.set(p.x, 0.07, p.z); sc.set(p.rx, p.rz, 1); m4.compose(ps, q, sc); pud.setMatrixAt(i, m4); });
  for (const d of DIST) { const cx = d[0] * 150, cz = d[1] * 150; for (let k = 0; k < 2; k++) { const side = irnd(0, 3), t = rnd(-60, 60); const x = side < 2 ? cx + t : cx + (side === 2 ? 66.3 : -66.3), z = side < 2 ? cz + (side === 0 ? 66.3 : -66.3) : cz + t; if (zoneNear(x, z, 3)) continue; GARBAGE.push({ x, z }); } }
  const bags = inst(LUMP, new THREE.MeshLambertMaterial({ color: 0xffffff }), GARBAGE.length * 4); GARBAGE.forEach((g, i) => { for (let k = 0; k < 4; k++) { ps.set(g.x + rnd(-0.6, 0.6), 0.35 + k * 0.08, g.z + rnd(-0.6, 0.6)); const s0 = rnd(0.35, 0.6); sc.set(s0, s0 * 0.8, s0); q.identity(); m4.compose(ps, q, sc); bags.setMatrixAt(i * 4 + k, m4); bags.setColorAt(i * 4 + k, col.setHex(pick([0x1b1b1b, 0x2f5d2f, 0x6b4a2b, 0x3a3a5a]))); } }); if (bags.instanceColor) bags.instanceColor.needsUpdate = true;
  // crowds: cheap three-part people on every pavement, plus small groups near doors and shops
  const N = 170; const legs = inst(BOX, mat(0x2b3550), N), torso = inst(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), N), head = inst(LOWSPH, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
  for (let k = 0; k < N; k++) {
    const d = pick(DIST); const p = { cx: d[0] * 150, cz: d[1] * 150, t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(1.3, 2.3), L: rnd(65.4, 67.4), still: k > 120, x: 0, z: 0, r: 0, knock: 0, kv: 0 };
    if (p.still) { const Z = pick(ZONES.filter(z2 => z2.zone === 'out')); const a = rnd(0, Math.PI * 2), rr = rnd(4.5, 8); p.x = Z.x + Math.cos(a) * rr; p.z = Z.z + Math.sin(a) * rr; p.r = Math.atan2(Z.x - p.x, Z.z - p.z) + rnd(-1, 1); }
    const sh = pick(D.SHIRTS); p.dress = randomDress(sh, {}); torso.setColorAt(k, col.setHex(sh)); head.setColorAt(k, col.setHex(p.dress.skin)); CROWD.push(p);
  }
  torso.instanceColor.needsUpdate = true; head.instanceColor.needsUpdate = true; CROWD.meshes = [legs, torso, head];
}
function updateCrowd(dt) {
  if (!CROWD.meshes) return; const [legs, torso, head] = CROWD.meshes; const out = !G.inside; for (const im of CROWD.meshes) im.visible = out; if (!out) return;
  const U = updateCrowd.u || (updateCrowd.u = { q: new THREE.Quaternion(), e: new THREE.Euler(), m: new THREE.Matrix4(), ps: new THREE.Vector3(), sc: new THREE.Vector3(), off: new THREE.Vector3(), f: 0 }); const { q, e, ps, sc, off } = U, m4 = U.m; const t = now(); const fr = ++U.f; const cx = camera.position.x, cz = camera.position.z;
  const carHit = G.veh && Math.abs(G.vs) > 6 ? 1.9 : 0;
  CROWD.forEach((p, k) => {
    if (!p.still && !p.knock) { p.t += dt * p.sp / (p.L * 8) * p.dir; const u = ((p.t % 1) + 1) % 1 * 4, Lr = p.L; let x, z; if (u < 1) { x = -Lr + 2 * Lr * u; z = -Lr; } else if (u < 2) { x = Lr; z = -Lr + 2 * Lr * (u - 1); } else if (u < 3) { x = Lr - 2 * Lr * (u - 2); z = Lr; } else { x = -Lr; z = Lr - 2 * Lr * (u - 3); } const nx = p.cx + x, nz = p.cz + z; p.r = Math.atan2(nx - p.x, nz - p.z); p.x = nx; p.z = nz; }
    if (carHit && !p.knock && Math.abs(p.x - G.x) < 2.2 && Math.abs(p.z - G.z) < 2.2 && Math.hypot(p.x - G.x, p.z - G.z) < carHit) knockPerson(p);
    if (!p.knock && p.still && p.placed) return; p.placed = true; // a standing group never moves unless someone runs into it
    if (!p.knock && (fr + k) % 6 && Math.abs(p.x - cx) + Math.abs(p.z - cz) > 170) return; // far away: refresh every 6th frame only
    let fall = 0, lift = 0; p.fall = 0; p.lift = 0; if (p.knock) { p.knock -= dt; const age = 7 - p.knock; if (age < 0.9) { p.x += p.kx * dt; p.z += p.kz * dt; lift = Math.sin(age / 0.9 * Math.PI) * 2.2; fall = Math.min(1, age / 0.6); } else fall = 1; if (p.knock <= 0) { p.knock = 0; p.placed = false; if (p.still) p.r += 1; } }
    p.fall = fall; p.lift = lift; const bob = p.still || p.knock ? 0 : Math.abs(Math.sin(t * 8 * p.sp + k)) * 0.08; e.set(-fall * Math.PI / 2, p.r, 0, 'YXZ'); q.setFromEuler(e); const hid = p.slot ? 0 : 1; // a realistic stand-in is showing this one
    const put = (im, oy, sx, sy, sz) => { off.set(0, oy, 0).applyQuaternion(q); ps.set(p.x + off.x, lift + bob + off.y + (fall ? 0.3 : 0), p.z + off.z); sc.set(sx * hid, sy * hid, sz * hid); m4.compose(ps, q, sc); im.setMatrixAt(k, m4); };
    put(legs, 0.5, 0.62, 1.0, 0.34); put(torso, 1.45, 0.86, 0.95, 0.46); put(head, 2.2, 0.32, 0.36, 0.32);
  });
  for (const im of CROWD.meshes) im.instanceMatrix.needsUpdate = true;
  crowdHumans(dt);
}
// The crowd is one instanced box figure for speed. A small pool of realistic people stands in for the crowd members
// nearest the camera (their box copy is hidden), so the people you actually look at are real.
const CPOOL = [];
function crowdHumans(dt) {
  if (!HU.HUMANS.ready) return; const phone = document.body.classList.contains('touch') || Math.min(innerWidth, innerHeight) < 520;
  if (!CPOOL.length) { const nM = phone ? 4 : 10, nF = phone ? 2 : 5; for (let i = 0; i < nM + nF; i++) { const g = i < nM ? 'm' : 'f', h = HU.makeHuman(g); h.root.visible = false; scene.add(h.root); CPOOL.push({ h, g, p: null }); } }
  const release = s => { s.p.slot = null; s.p.placed = false; s.p = null; s.h.root.visible = false; };
  if (G.inside || G.map) { for (const s of CPOOL) if (s.p) release(s); return; }
  const R = phone ? 34 : 55, cx = camera.position.x, cz = camera.position.z; hMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); hFrustum.setFromProjectionMatrix(hMat);
  const want = []; for (const p of CROWD) { const d = Math.hypot(p.x - cx, p.z - cz); if (d > R) continue; hSph.center.set(p.x, 1.2, p.z); if (!hFrustum.intersectsSphere(hSph)) continue; want.push([d, p]); }
  want.sort((a, b) => a[0] - b[0]); const keep = new Set();
  for (const g of ['m', 'f']) { const free = Math.floor(CPOOL.filter(s => s.g === g).length * (PERF.hk || 1)); want.filter(w => w[1].dress.g === g).slice(0, free).forEach(w => keep.add(w[1])); }
  for (const s of CPOOL) if (s.p && !keep.has(s.p)) release(s);
  for (const p of keep) if (!p.slot) { const s = CPOOL.find(x => !x.p && x.g === p.dress.g); if (!s) continue; s.p = p; p.slot = s; p.placed = false; HU.dressHuman(s.h, p.dress); }
  for (const s of CPOOL) { if (!s.p) continue; const p = s.p, h = s.h; h.root.visible = true; const fall = p.fall || 0; h.root.position.set(p.x, (p.lift || 0) + (fall ? 0.25 : 0), p.z); h.root.rotation.set(-fall * Math.PI / 2, p.r, 0, 'YXZ'); // standing groups never set fall/lift
    HU.play(h, p.still && !p.knock ? 'idle' : 'walk', 0.25, p.still ? 1 : Math.min(1.5, p.sp / 1.7)); h.mixer.update(dt); }
}
function knockPerson(p) { const sp = Math.max(6, Math.abs(G.vs)); p.knock = 7; p.kx = Math.sin(G.r) * sp * 0.5; p.kz = Math.cos(G.r) * sp * 0.5; G.vs *= 0.82; A.sfx('punch', 0.8); A.sfx('crash', 0.4); if (Math.random() < 0.6) toast(pick(['Oye! Andha se ke?', 'Bhai dekh ke chala!', 'Arre maar diya re!', 'Police bulaunga!']), 'bad'); G.hitPeople = (G.hitPeople || 0) + 1; if (G.hitPeople % 5 === 0 && !G.chase && !G.race && !G.story) { startChase({ near: true, secs: 25 }); toast('Logon ko thok raha hai? Police aa gayi!', 'bad'); } }
// road hazards: potholes jolt the car, waterlogging slows everything, garbage blocks walkers unless they jump
function roadHazards(dt) {
  if (G.inside) return; const sp = Math.abs(G.vs); const t = now();
  if (G.veh && sp > 6 && (G.potCD || 0) < t) for (const p of POTHOLES) if (Math.abs(p.x - G.x) < 2 && Math.abs(p.z - G.z) < 2 && Math.hypot(p.x - G.x, p.z - G.z) < 1.2 + p.s) { G.potCD = t + 0.8; G.vs *= 0.78; G.jolt = 0.35; A.sfx('crash', 0.35); if (Math.random() < 0.35) say(player, pick(['Gurugram ke gaddhe!', 'Gaadi ka suspension gaya!', 'MCG kahan hai?']), 2); break; }
  const wet = (G.depth || 0) > 0.15 && G.veh !== 'naav';
  if (wet) { G.wet = true; if (sp > 3 && Math.random() < dt * 14) burst(G.x + rnd(-1, 1), 0.3, G.z + rnd(-1, 1), 0x9fb7c9, 2, { speed: 2 + sp * 0.12, up: 2, life: 0.6 }); if (!G.wetSaid || t - G.wetSaid > 25) { G.wetSaid = t; toast(pick(['Paani bhar gaya! Gurugram ka monsoon special', 'Yeh sadak hai ya swimming pool?', 'Thoda dheere, chhapaak!'])); } } else G.wet = false;
  if (wet && G.depth > 0.5 && Math.abs(G.vs) > 2 && Math.random() < dt * 30) burst(G.x + rnd(-1.5, 1.5), 0.5, G.z + rnd(-1.5, 1.5), 0x8f8a6a, 3, { speed: 3 + Math.abs(G.vs) * 0.15, up: 3, life: 0.8 });
  if (!G.veh && !(G.jy > 0.6)) for (const g of GARBAGE) { const dx = G.x - g.x, dz = G.z - g.z, d = Math.hypot(dx, dz); if (d < 1.4 && d > 0.01) { G.x = g.x + dx / d * 1.4; G.z = g.z + dz / d * 1.4; if (!G.trashSaid || t - G.trashSaid > 20) { G.trashSaid = t; toast('Kooda! Space se jump karke paar kar'); } } }
  if (G.veh && sp > 6) for (const g of GARBAGE) if (Math.hypot(G.x - g.x, G.z - g.z) < 2) { if ((g.cd || 0) < t) { g.cd = t + 2; burst(g.x, 0.6, g.z, pick([0x1b1b1b, 0x6b4a2b, 0x2f5d2f]), 14, { speed: 5, life: 1 }); G.vs *= 0.85; } }
  if (G.jolt > 0) { G.jolt -= dt; camera.position.y += Math.sin(t * 60) * G.jolt * 0.5; }
}

// ================================================================ 3D MAP: fly up over the real city, pins for every useful place
const MAPCAT = { kaam: ['Kaam', '#2563b8'], khana: ['Khana', '#e07b10'], police: ['Police', '#1b3a8a'], mall: ['Shopping', '#8b3fc4'], party: ['Party', '#d61f9a'], race: ['Race', '#d7331f'], gaadi: ['Gaadi', '#0f766e'], hospital: ['Hospital', '#e11d48'], metro: ['Metro', '#3a6fd8'], ghoomo: ['Ghoomo', '#1a8a4a'] };
const POI_EXTRA = []; // places added by the city builder (police thana etc.)
MAPCAT.paani = ['Paani bhara', '#1f7ab8']; MAPCAT.don = ['Gali ke Don', '#7a1010'];
function mapCat(t) {
  if (/race/i.test(t)) return 'race'; if (/police|thana|naka/i.test(t)) return 'police'; if (/treatment|hospital/i.test(t)) return 'hospital'; if (/metro/i.test(t)) return 'metro';
  if (/technova|office|ramphal|kaam/i.test(t)) return 'kaam'; if (/dhaba|menu|sweets|chaat|brew|food|chai|order|khana/i.test(t)) return 'khana';
  if (/club|theka|party|farmhouse/i.test(t)) return 'party'; if (/motors|accessories|gaadi/i.test(t)) return 'gaadi'; if (/mall|jewell|estates|shop|bazaar/i.test(t)) return 'mall'; return 'ghoomo';
}
function mapPOIs() {
  const out = []; const seen = new Set();
  for (const Z of ZONES) { if (Z.zone !== 'out') continue; let t; try { t = Z.label(); } catch { t = null; } if (!t) continue; const name = t.replace(/^Enter /, '').replace(/^Race lagao: /, 'Race: ').split(/:| \(|·/)[0].trim().slice(0, 30); const k = name + Math.round(Z.x / 20) + Math.round(Z.z / 20); if (seen.has(k)) continue; seen.add(k); out.push({ x: Z.x, z: Z.z, name, cat: mapCat(t) }); }
  out.push({ x: D.SPOTS.naka.x, z: D.SPOTS.naka.z, name: 'Police naka, Iffco Chowk', cat: 'police' }, { x: D.SPOTS.akhara.x, z: D.SPOTS.akhara.z, name: 'Akhara (dangal)', cat: 'ghoomo' });
  { const ds = donState(); if (ds && ds.avail && ds.called) out.push({ x: ds.at[0], z: ds.at[1], name: ds.C.boss + ' (ch ' + (ds.ch + 1) + ')', cat: 'don' }); }
  for (const p of POI_EXTRA) out.push(p); if (WX.ww > 0.2) for (const s2 of D.FLOOD_SPOTS) out.push({ x: s2.x, z: s2.z, name: s2.name + ' (paani)', cat: 'paani' }); if (P) { const h = homePos(); out.push({ x: h.x, z: h.z, name: 'Mera ghar', cat: 'ghoomo' }); }
  return out;
}
let mapGroup = null;
function openMap3D() {
  if (!G.started) return; if (G.inside) return toast('Bahar aa ke map dekh'); if (G.race && G.race.phase !== 'done') return; if (G.map) return closeMap3D();
  closeModal(); if (document.pointerLockElement) document.exitPointerLock();
  G.map = { x: G.x, z: G.z, h: innerWidth < 700 ? 300 : 360, filter: G.mapFilter || 'all', fogFar: scene.fog.far, camFar: camera.far, dayFixed: DAY.fixed };
  scene.fog.far = 4000; camera.far = 4000; camera.updateProjectionMatrix(); DAY.fixed = true; DAY.t = 0.45;
  document.body.classList.add('mapmode'); $('map3d').hidden = false; buildMapPins(); renderMapChips();
}
function closeMap3D(picked) { const m = G.map; if (!m) return; G.map = null; scene.fog.far = m.fogFar; camera.far = m.camFar; camera.updateProjectionMatrix(); DAY.fixed = m.dayFixed; if (mapGroup) { scene.remove(mapGroup); mapGroup.traverse(o => { if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } }); mapGroup = null; } document.body.classList.remove('mapmode'); $('map3d').hidden = true;
  if (!picked && m.filter !== 'all') { let best = null, bd = 1e9; for (const p of mapPOIs()) if (p.cat === m.filter) { const d = Math.hypot(p.x - G.x, p.z - G.z); if (d < bd) { bd = d; best = p; } } if (best) setWaypoint(best.x, best.z, MAPCAT[m.filter][0] + ': ' + best.name); }
}
function buildMapPins() {
  if (mapGroup) { scene.remove(mapGroup); mapGroup = null; } mapGroup = new THREE.Group(); scene.add(mapGroup); const f = G.map.filter;
  for (const p of mapPOIs()) { if (f !== 'all' && p.cat !== f) continue; const c = MAPCAT[p.cat]; const sp = labelSprite(c[0].toUpperCase() + ' · ' + p.name, { fs: 40, scale: 1, bg: c[1], fg: '#ffffff' }); sp.userData = { poi: p, base: sp.scale.clone() }; sp.position.set(p.x, 0, p.z); mapGroup.add(sp); const stick = new THREE.Mesh(BOX, glow(parseInt(c[1].slice(1), 16))); stick.userData.stick = true; stick.position.set(p.x, 0, p.z); mapGroup.add(stick); }
  for (const d of DIST) { const sp = labelSprite(d[2], { fs: 44, scale: 1, bg: 'rgba(27,20,16,.55)', fg: '#fff4d8' }); sp.userData = { base: sp.scale.clone(), district: true }; sp.position.set(d[0] * 150, 0, d[1] * 150 + 40); mapGroup.add(sp); }
  const me = labelSprite('TU YAHAN HAI', { fs: 48, scale: 1, bg: '#f6c026', fg: '#1b1410' }); me.userData = { base: me.scale.clone(), me: true }; mapGroup.add(me);
}
function renderMapChips() {
  const box = $('mapchips'); box.textContent = ''; const f = G.map.filter;
  for (const [k, name, col] of [['all', 'Sab', '#1b1410'], ...Object.entries(MAPCAT).map(([k, v]) => [k, v[0], v[1]])]) box.append(el('button', { type: 'button', class: k === f ? 'on' : '', style: '--c:' + col, text: name, onclick: () => { G.map.filter = G.mapFilter = k; buildMapPins(); renderMapChips(); } }));
}
function updateMap3D() {
  const m = G.map; camera.position.set(m.x, m.h, m.z + m.h * 0.5); camera.lookAt(m.x, 0, m.z); const s = m.h / 420;
  for (const o of mapGroup.children) {
    if (o.userData.stick) { o.scale.set(0.6 * s, 18 * s, 0.6 * s); o.position.y = 9 * s; continue; }
    const b = o.userData.base; const k = (o.userData.district ? 13 : o.userData.me ? 17 : 15) * (innerWidth < 700 ? 1.5 : 1); o.scale.set(b.x * k * s, b.y * k * s, 1); o.position.y = (o.userData.district ? 4 : 18 + 5) * s;
    if (o.userData.me) o.position.set(G.x, 26 * s + Math.sin(now() * 4) * 2 * s, G.z);
  }
}
const mapRay = new THREE.Raycaster(), mapPtr = new THREE.Vector2(); const mapTouch = new Map(); let mapMoved = 0;
canvas.addEventListener('pointerdown', e => { if (!G.map) return; mapTouch.set(e.pointerId, { x: e.clientX, y: e.clientY }); mapMoved = 0; canvas.setPointerCapture(e.pointerId); }, true);
canvas.addEventListener('pointermove', e => {
  if (!G.map || !mapTouch.has(e.pointerId)) return; const prev = mapTouch.get(e.pointerId); const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  if (mapTouch.size === 2) { const pts = [...mapTouch.values()]; const other = pts.find(p => p !== prev); const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y); if (d0 > 0) G.map.h = clamp(G.map.h * d0 / d1, 120, 1100); }
  else { const k = G.map.h / innerHeight * 1.1; G.map.x = clamp(G.map.x - dx * k, -520, 520); G.map.z = clamp(G.map.z - dy * k, -520, 520); }
  mapMoved += Math.abs(dx) + Math.abs(dy); prev.x = e.clientX; prev.y = e.clientY;
}, true);
canvas.addEventListener('pointerup', e => {
  if (!G.map) return; const was = mapTouch.size; mapTouch.delete(e.pointerId); if (mapMoved > 8 || was > 1) return;
  const r = canvas.getBoundingClientRect(); mapPtr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); mapRay.setFromCamera(mapPtr, camera);
  const hit = mapRay.intersectObjects(mapGroup.children.filter(o => o.isSprite && o.userData.poi), false)[0];
  if (hit) { const p = hit.object.userData.poi; closeMap3D(true); setWaypoint(p.x, p.z, p.name); }
}, true);
canvas.addEventListener('wheel', e => { if (!G.map) return; G.map.h = clamp(G.map.h * (e.deltaY > 0 ? 1.12 : 0.89), 120, 1100); e.preventDefault(); e.stopImmediatePropagation(); }, { passive: false, capture: true });
$('mapClose').onclick = () => closeMap3D(); $('mchip').onclick = openTasks; $('navx').onclick = () => { if (G.wp && !G.frun) { G.wp = null; wpBeacon.visible = false; toast('GPS band'); } }; $('mapwrap').addEventListener('click', openMap3D);

// ================================================================ STREET RACES + DRIVING THRILLS (NOS, drift, near miss)
// Races: checkpoint gates on real roads vs a named rival. Win to unlock the next rival; rematch is one tap.
const RACE_SPOTS = [];
const fmtT = ms => { const s = ms / 1000; return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
const raceWon = id => !!(P && P.raceWins && (P.raceWins[id] || (id === D.RACES[0].id && P.raceWins.sheetla)));
const raceUnlocked = i => i === 0 || raceWon(D.RACES[i - 1].id);
function raceGates(R) {
  const out = []; let s = 0;
  for (let i = 1; i < R.pts.length; i++) {
    const [ax, az] = R.pts[i - 1], [bx2, bz] = R.pts[i]; const len = Math.hypot(bx2 - ax, bz - az); const n = Math.max(1, Math.round(len / 140));
    for (let k = 1; k <= n; k++) out.push({ x: ax + (bx2 - ax) * k / n, z: az + (bz - az) * k / n, h: Math.atan2(bx2 - ax, bz - az), s: s + len * k / n, corner: k === n && i < R.pts.length - 1 });
    s += len;
  }
  return out;
}
function pathAt(R, s) { // point on the route at distance s, nudged into the right-hand lane
  let acc = 0;
  for (let i = 1; i < R.pts.length; i++) {
    const [ax, az] = R.pts[i - 1], [bx2, bz] = R.pts[i]; const len = Math.hypot(bx2 - ax, bz - az);
    if (s <= acc + len || i === R.pts.length - 1) { const t = clamp((s - acc) / len, 0, 1); const dx = (bx2 - ax) / len, dz = (bz - az) / len; return { x: ax + (bx2 - ax) * t + dz * 3, z: az + (bz - az) * t - dx * 3, h: Math.atan2(dx, dz), toCorner: i < R.pts.length - 1 ? acc + len - s : 1e9 }; }
    acc += len;
  }
}
function gateMesh() {
  const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.5, 8, 36), new THREE.MeshBasicMaterial({ color: 0xf6c026, transparent: true, opacity: 0.95 }));
  ring.position.y = 6.5; g.add(ring); for (const s2 of [-7.6, 7.6]) bx(g, 0.5, 13, 0.5, 0x1b1410, s2, 6.5, 0);
  g.userData.ring = ring; g.visible = false; scene.add(g); return g;
}
const GATES = [gateMesh(), gateMesh(), gateMesh()];
// small GPS arrow: two white chevrons with a teal edge, lying on the road beside you and pointing the way
function makeNavArrow() {
  const sh = new THREE.Shape(); sh.moveTo(0, 0.42); sh.lineTo(0.42, -0.12); sh.lineTo(0.24, -0.12); sh.lineTo(0, 0.18); sh.lineTo(-0.24, -0.12); sh.lineTo(-0.42, -0.12); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh); geo.rotateX(Math.PI / 2); const g = new THREE.Group();
  for (let k = 0; k < 2; k++) {
    const edge = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide })); edge.scale.set(1.28, 1, 1.28); edge.position.set(0, -0.01, k * -0.5 - 0.04);
    const face = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide })); face.position.z = k * -0.5;
    edge.renderOrder = 20; face.renderOrder = 21; g.add(edge, face);
  }
  g.rotation.order = 'YXZ'; g.visible = false; scene.add(g); return g;
}
const raceArrow = makeNavArrow(), wpArrow = makeNavArrow();
function navPoint(o, tx, tz) { // remember where this arrow points; it is drawn on screen by drawNavRing (the 3D meshes stay hidden)
  o.visible = true; for (const m of o.children) m.visible = false; NAVT[o === raceArrow ? 'race' : 'wp'] = { x: tx, z: tz, t: now() };
}
const NAVT = { race: null, wp: null }; const navV1 = new THREE.Vector3(), navV2 = new THREE.Vector3();
// an arrow drawn over the 3D view, around wherever the player is on screen, pointing at the target: nothing in the world can hide it
function drawNavRing() {
  const el2 = $('navring'); const fresh = q => q && now() - q.t < 0.3; const tg = fresh(NAVT.race) ? NAVT.race : fresh(NAVT.wp) ? NAVT.wp : null;
  if (!tg || G.map || G.inside || G.selfie || !$('modal').hidden) { if (!el2.hidden) el2.hidden = true; return; }
  const h = G.veh ? 1.3 : 1.1; navV1.set(G.x, h, G.z).project(camera); if (navV1.z > 1) { if (!el2.hidden) el2.hidden = true; return; }
  const dx = tg.x - G.x, dz = tg.z - G.z, dl = Math.hypot(dx, dz) || 1; navV2.set(G.x + dx / dl * 3, h, G.z + dz / dl * 3).project(camera);
  const W = innerWidth, H = innerHeight, sx = (navV1.x + 1) / 2 * W, sy = (1 - navV1.y) / 2 * H; let vx = (navV2.x - navV1.x) * W, vy = -(navV2.y - navV1.y) * H;
  if (navV2.z > 1) { vx = -vx; vy = -vy; } const ang = Math.atan2(vy, vx); const R = (G.veh ? 105 : 78) * (W < 700 ? 0.8 : 1);
  const x = clamp(sx + Math.cos(ang) * R, 30, W - 30), y = clamp(sy + Math.sin(ang) * R, 60, H - 30); const pulse = 1 + Math.sin(now() * 6) * 0.06;
  el2.hidden = false; el2.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + (ang * 180 / Math.PI + 90).toFixed(1) + 'deg) scale(' + pulse.toFixed(3) + ')';
}
function navTarget() { if (G.wp) return G.wp; if (G.job) { const t = jobTarget(); return { x: t.x, z: t.z, name: G.job.stage === 'pickup' ? 'Pickup' : 'Drop' }; } return null; }
// rush: GPS to the event, first three there win (the money bag: first one only)
const BAG = (() => { const g = new THREE.Group(); const gold = new THREE.MeshStandardMaterial({ color: 0xf6c026, emissive: 0x7a5200, roughness: 0.4 }); const b = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), gold); b.scale.set(1, 0.85, 1); b.position.y = 1.1; g.add(b); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.6, 10), gold); k.position.y = 2.05; g.add(k); g.visible = false; scene.add(g); return g; })();
const bagBeacon = makeBeacon(0xf6c026); bagBeacon.visible = false;
function rushStart() {
  const e = G.ev; BAG.visible = bagBeacon.visible = false; if (!e) return; const sp = eventSpot(e.type); if (!sp) return;
  if (e.type === 'thaila') { BAG.position.set(sp.x, 0, sp.z); bagBeacon.position.set(sp.x, 0, sp.z); BAG.visible = bagBeacon.visible = !e.data.taken; }
  if (!G.story && !G.race && !G.job && !G.frun && (!G.wp || e.type === 'thaila')) setWaypoint(sp.x, sp.z, e.type === 'thaila' ? '💰 Thaila (' + e.data.place + ')' : e.name);
  if (!G.story && !G.race) bigText(e.type === 'thaila' ? '💰 PAISON KA THAILA!' : 'CITY EVENT!', e.type === 'thaila' ? e.data.place + ' · pehle pahuncho, ' + fmt(e.data.prize) + ' tera' : e.name + ' · pehle 3 ko inaam', 2);
}
function updateRush() {
  const e = G.ev; if (BAG.visible) { BAG.rotation.y += 0.04; BAG.children[0].position.y = 1.1 + Math.sin(now() * 3) * 0.15; BAG.visible = bagBeacon.visible = !G.inside; }
  if (!e || G.evReached || G.inside || (e.rush && e.rush.length >= 3)) return; const sp = eventSpot(e.type); if (!sp) return;
  const d = e.type === 'baraat' ? Math.abs(G.x - sp.x) : Math.hypot(G.x - sp.x, G.z - sp.z); if (d < (e.type === 'thaila' ? 6 : 20)) { G.evReached = true; net.send('evreach', {}); if (e.type === 'thaila') { BAG.visible = bagBeacon.visible = false; A.sfx('cash'); } }
}
function updateNav() {
  const tg = !G.inside && !G.map && !raceArrow.visible ? navTarget() : null; const d = tg ? Math.hypot(tg.x - G.x, tg.z - G.z) : 0;
  if (tg && d > 9) navPoint(wpArrow, tg.x, tg.z); else { wpArrow.visible = false; NAVT.wp = null; }
  drawNavRing();
  const chip = $('navchip'), show = !!tg && !(G.race && G.race.phase !== 'done');
  if (chip.hidden === show) chip.hidden = !show; if (!show) return;
  const a = Math.atan2(tg.x - G.x, tg.z - G.z) - G.yaw; $('navdir').style.transform = 'rotate(' + (-a * 180 / Math.PI).toFixed(1) + 'deg)';
  const nm = tg.name || 'GPS', ds = d < 1000 ? Math.round(d / 5) * 5 + ' m' : (d / 1000).toFixed(1) + ' km'; if (chip.dataset.n !== nm) { chip.dataset.n = nm; $('navtxt').textContent = nm; } if (chip.dataset.d !== ds) { chip.dataset.d = ds; $('navdist').textContent = ds; }
}
function buildRaceSpots() {
  D.RACES.forEach((R, i) => {
    const [x0, z0] = R.pts[0], [x1, z1] = R.pts[1]; const h = Math.atan2(x1 - x0, z1 - z0);
    const arch = new THREE.Group(); arch.position.set(x0, 0, z0); arch.rotation.y = h; scene.add(arch);
    for (const s2 of [-8, 8]) bx(arch, 0.6, 9, 0.6, 0x1b1410, s2, 4.5, 0);
    for (const ry of [0, Math.PI]) sign(arch, 'RACE ' + (i + 1) + ' · ' + R.name, 'vs ' + R.rival, '#d7331f', '#fff4d8', 17, 2.6, 0, 9.4, ry ? -0.05 : 0.05, ry);
    const car = makeVehicle(R.veh, R.color); const p = pathAt(R, -10); car.position.set(p.x, 0.05, p.z); car.rotation.y = h; scene.add(car);
    const lab = labelSprite(R.rival + ' · Race?', { fs: 30, scale: 0.6, bg: 'rgba(215,51,31,.92)', fg: '#fff4d8' }); lab.position.y = 4.4; car.add(lab);
    if (R.rival === 'Pinky Yadav') car.userData.voiceG = 'f'; const spot = { R, i, car, lab, x: x0, z: z0, h, home: { x: p.x, z: p.z, h }, tauntT: 0 }; RACE_SPOTS.push(spot);
    ZONES.push({ zone: 'out', x: x0, z: z0, r: 16, label: () => G.race ? null : raceUnlocked(i) ? 'Race lagao: ' + R.name + ' vs ' + R.rival : 'Locked: pehle ' + D.RACES[i - 1].rival + ' ko hara', act: () => raceUnlocked(i) ? startRace(R.id) : toast('Pehle ' + D.RACES[i - 1].name + ' jeet', 'bad') });
  });
}
function bestCar() { const own = (P.vehicles || []).filter(v => D.VEH[v]); own.sort((a, b) => D.VEH[b].speed - D.VEH[a].speed); return own[0] || null; }
function startRace(id, opts) {
  opts = opts || {}; const i = D.RACES.findIndex(r => r.id === id); const R = D.RACES[i]; if (!R) return;
  if (G.race) cleanupRace(); if (G.inside) return toast('Pehle bahar aa'); if (G.selfie) endSelfie(); closeModal(); $('raceres').hidden = true;
  const spot = RACE_SPOTS[i]; G.dance = false; G.chase = null; if (chaseJeep) chaseJeep.visible = false;
  const want = G.veh && D.VEH[G.veh].kind === 4 ? G.veh : bestCar() || L.loanVeh || 'chhotu';
  if (G.veh !== want) { if (G.veh) dismount(); G.loaner = !(P.vehicles || []).includes(want); G.quietMount = true; mount(want); G.quietMount = false; }
  const start = pathAt(R, 0); const lx = start.x - Math.cos(start.h) * 6, lz = start.z + Math.sin(start.h) * 6; // player in the left lane
  G.x = lx; G.z = lz; G.r = G.yaw = start.h; G.vs = 0; G.pitch = 0.28; G.nos = Math.max(G.nos || 0, 0.35);
  playerVeh.position.set(G.x, 0.2, G.z); playerVeh.rotation.y = G.r; camera.position.set(G.x - Math.sin(G.r) * 14, 6, G.z - Math.cos(G.r) * 14);
  spot.car.position.set(start.x, 0.05, start.z); spot.car.rotation.y = start.h; spot.lab.visible = false;
  G.race = { R, i, spot, gates: raceGates(R), cp: 0, phase: 'count', goAt: now() + (opts.intro ? 5.5 : 3.6), rv: { s: 0, v: 0, done: 0 }, total: D.raceLen(R), intro: !!opts.intro, beeps: 0 };
  document.body.classList.add('racing'); $('racehud').hidden = false; showGates();
  say(spot.car, pick(R.taunt), 3.5); A.sfx('engine');
  if (opts.intro) bigText('RACE LAGEGI?', R.rival + ' ne challenge kiya!', 2.6);
  $('racehint').hidden = false; $('racehint').textContent = document.body.classList.contains('touch') ? 'Joystick: chalao · NOS button dabake rakho: boost' : 'W: race · A D: steer · Shift: NOS · Space: handbrake drift';
}
function showGates() { const r = G.race; GATES.forEach((g, k) => { const gt = r && r.gates[r.cp + k]; g.visible = !!gt && k < 2; if (!gt) return; g.position.set(gt.x, 0, gt.z); g.rotation.y = gt.h; const last = r.cp + k === r.gates.length - 1; g.userData.ring.material.color.setHex(last ? 0xff3b30 : k === 0 ? 0xf6c026 : 0xfff4d8); g.userData.ring.material.opacity = k === 0 ? 0.95 : 0.4; g.scale.setScalar(k === 0 ? 1 : 0.9); }); }
function raceProgress() { const r = G.race; const gt = r.gates[Math.min(r.cp, r.gates.length - 1)]; const prev = r.cp ? r.gates[r.cp - 1].s : 0; return clamp(gt.s - Math.hypot(gt.x - G.x, gt.z - G.z), prev, gt.s); }
function updateRace(dt) {
  const r = G.race; if (!r) return; const t = now();
  if (r.phase === 'count') {
    const left = r.goAt - t; const n = Math.ceil(left);
    if (left <= 3 && n !== r.beeps) { r.beeps = n; if (n > 0) { bigText(String(n), '', 0.8); A.sfx('beep'); } }
    if (left <= 0) {
      r.phase = 'go'; r.t0 = t; bigText('GO!', '', 0.8); A.sfx('go'); if (r.intro) step('race1_go');
      const thr = keys.KeyW || keys.ArrowUp || joyY > 0.5; if (thr) { G.vs = D.VEH[G.veh].speed * 0.55; G.nos = Math.min(1, (G.nos || 0) + 0.3); popText('PERFECT START! +NOS', 'gold'); }
      say(r.spot.car, pick(['Chal!', 'Pakad ke dikha!', 'Bye bye!']), 1.5);
    }
  }
  // rival
  const rv = r.rv;
  if (r.phase !== 'count' && !rv.done) {
    const top = D.VEH[G.veh] ? D.VEH[G.veh].speed : 30; const here = pathAt(r.R, rv.s); let target = top * r.R.skill;
    const late = r.i >= 1; if (here.toCorner < 28) target = Math.min(target, late ? 19 : 16.5);
    if (late && here.toCorner > 90 && t > (rv.nosNext || r.t0 + 3)) { rv.nosUntil = t + 2.2; rv.nosNext = t + rnd(6, 10); if (Math.random() < 0.5) say(r.spot.car, pick(['NOS!', 'Bye bye!', 'Pakad ke dikha!']), 1.2); }
    if ((rv.nosUntil || 0) > t) target *= 1.32;
    const gap = rv.s - raceProgress();
    if (r.intro && !r.surge && raceProgress() / r.total > 0.25) { r.surge = t; G.nos = 1; bigText('MONU NE NOS MAARA!', touchUI() ? 'Ab tu bhi NOS button daba!' : 'Ab tu bhi Shift daba: NOS!', 2); $('bRun').classList.add('pulse'); setTimeout(() => $('bRun').classList.remove('pulse'), 5000); }
    if (r.intro) { if (r.surge && t - r.surge < 3) target *= 1.5; else if (r.surge && gap > -10) target *= 0.72; if (gap > 30) target *= 0.7; } // the Pehla Din race stays beatable for beginners
    else if (gap > 70) target *= 0.93; else if (gap < -25) target *= 1.28; // real races: the rival only eases off when miles ahead, and chases hard when behind
    // the rival lives in the same Gurugram: potholes, waterlogging and traffic slow it down too
    const rp = pathAt(r.R, rv.s); if ((rv.potCD || 0) < t) { if (POTHOLES.some(q => Math.abs(q.x - rp.x) < 1.6 && Math.abs(q.z - rp.z) < 1.6)) { rv.v *= 0.8; rv.potCD = t + 0.8; } }
    if (PUDDLES.some(q => ((rp.x - q.x) / q.rx) ** 2 + ((rp.z - q.z) / q.rz) ** 2 < 1)) target *= 0.55;
    if ((rv.carCD || 0) < t && CARS.some(c => c.mesh.visible && Math.hypot(c.mesh.position.x - rp.x, c.mesh.position.z - rp.z) < 3.4)) { rv.v *= 0.45; rv.carCD = t + 1.5; if (Math.random() < 0.5) say(r.spot.car, pick(['Abe hat!', 'Side de!', 'Traffic ne maar diya!']), 1.2); }
    rv.v += (target - rv.v) * Math.min(1, dt * 1.6); rv.s += rv.v * dt;
    if (rv.s >= r.total) { rv.done = t - r.t0; rv.s = r.total; if (r.phase === 'go') { toast(r.R.rival + ' finish line pe pahunch gaya!', 'bad'); say(r.spot.car, 'Main jeet gaya!', 2.5); } }
  }
  const p = pathAt(r.R, rv.s); const car = r.spot.car; const k2 = Math.min(1, dt * 8);
  car.position.x += (p.x - car.position.x) * k2; car.position.z += (p.z - car.position.z) * k2; car.rotation.y = angLerp(car.rotation.y, p.h, Math.min(1, dt * 6));
  // gates
  if (r.phase === 'go') {
    const gt = r.gates[r.cp]; if (gt && Math.hypot(gt.x - G.x, gt.z - G.z) < 11) {
      r.cp++; A.sfx('cp'); G.nos = Math.min(1, (G.nos || 0) + 0.12); burst(gt.x, 6, gt.z, 0xf6c026, 18, { speed: 7, life: 0.9 });
      if (r.cp >= r.gates.length) finishRace(); else showGates();
    }
    if (r.phase === 'go' && rv.done && t - r.t0 - rv.done > 12) finishRace();
  }
  // arrow to the next gate
  const gt = r.gates[r.cp]; raceArrow.visible = !!gt && r.phase !== 'done';
  if (gt && r.phase !== 'done') navPoint(raceArrow, gt.x, gt.z);
  for (const g of GATES) if (g.visible) g.userData.ring.rotation.z += dt * 1.5;
  // HUD
  if (r.phase !== 'done') {
    const el2 = r.phase === 'go' ? t - r.t0 : 0; const me = raceProgress(); const first = r.cp >= r.gates.length || me >= rv.s || (!rv.done && me + 2 >= rv.s && me > 0);
    const gapS = rv.v > 1 ? Math.abs(rv.s - me) / Math.max(10, rv.v) : 0;
    $('racehud').innerHTML = '<b class="' + (first ? 'p1' : 'p2') + '">' + (first ? '1st' : '2nd') + '</b><span>' + fmtT(el2 * 1000) + '</span><span>Gate ' + Math.min(r.cp + 1, r.gates.length) + '/' + r.gates.length + '</span><small>' + (r.phase === 'go' ? r.R.rival + (first ? ' -' : ' +') + gapS.toFixed(1) + 's' : r.R.name) + '</small>';
  }
}
async function finishRace() {
  const r = G.race; if (!r || r.phase === 'done') return; r.phase = 'done'; const ms = Math.round((now() - r.t0) * 1000); const done = r.cp >= r.gates.length;
  const won = done && (!r.rv.done || r.rv.done * 1000 > ms); r.won = won; GATES.forEach(g => { g.visible = false; }); raceArrow.visible = false; $('racehint').hidden = true;
  bigText(won ? 'JEET GAYA!' : done ? 'HAAR GAYA' : 'TIME UP', won ? 'Gurugram dekh rya se!' : r.R.rival + ' aage nikal gaya', 2.2); A.sfx(won ? 'level' : 'err');
  say(r.spot.car, pick(won ? r.R.win : r.R.lose), 4);
  if (won) for (let k = 0; k < 3; k++) setTimeout(() => firework(G.x + rnd(-20, 20), G.z + rnd(-20, 20)), 300 + k * 450);
  let res = { ok: false }; if (done) res = await net.req('race', { id: r.R.id, ms, won }).catch(() => ({ ok: false }));
  step(r.R.id === D.RACES[0].id ? 'race1_done' : r.R.id === 'golf' && r.won ? 'race2_won' : 'race_more');
  if (G.race !== r) return;
  if (r.intro && G.story) { setTimeout(() => { if (G.race === r) storyGo('fight'); }, 1300); return; }
  setTimeout(() => { if (G.race === r) showRaceResult(r, ms, done, res); }, 1500);
}
function showRaceResult(r, ms, done, res) {
  const box = $('raceres'); box.hidden = false; box.textContent = ''; const R = r.R; const next = D.RACES[r.i + 1];
  box.append(el('div', { class: 'k', text: 'Race ' + (r.i + 1) + ' · ' + R.name }), el('h2', { class: r.won ? 'win' : 'lose', text: r.won ? 'Jeet gaya!' : 'Haar gaya' }));
  const rows = el('div', { class: 'rows' });
  const row = (a, b2) => rows.append(el('div', null, el('span', { text: a }), el('b', { text: b2 })));
  if (done) row('Tera time', fmtT(ms)); if (r.rv.done) row(R.rival, fmtT(r.rv.done * 1000));
  if (res.ok) { row('Tera best', fmtT(res.pb) + (res.newPb ? '  NEW!' : '')); if (res.top && res.top[0]) row('Gurugram record', fmtT(res.top[0].ms) + ' · ' + res.top[0].name); if (res.rank) row('Tera rank', '#' + res.rank); }
  box.append(rows);
  if (r.won && res.firstWin && next) box.append(el('p', { class: 'unlock', text: 'Unlocked: ' + next.name + ' vs ' + next.rival + '!' }));
  else if (r.won && !next) box.append(el('p', { class: 'unlock', text: 'Tu Gurugram ka Street King se! Ab record tod ke dikha.' }));
  else if (!r.won) box.append(el('p', { class: 'unlock', text: done ? 'Bas ' + ((ms - r.rv.done * 1000) / 1000).toFixed(1) + 's peeche! Corners pe NOS mat jala, seedhe pe jala.' : 'Gates ke beech se nikal, yellow arrow follow kar.' }));
  if (G.loaner) box.append(el('p', { class: 'fine', text: 'Chacha ki ' + D.VEH[G.veh].name + ' tere paas se jab tak utrega nahi (V). Ghoom le!' }));
  const btns = el('div', { class: 'btns' });
  btns.append(el('button', { class: 'buy big', text: 'Rematch (Enter)', onclick: () => startRace(R.id) }));
  if (next && raceUnlocked(r.i + 1)) btns.append(el('button', { class: 'buy big alt2', text: 'Agli race: ' + next.rival, onclick: () => startRace(next.id) }));
  btns.append(el('button', { class: 'buy alt', text: 'Gurugram ghoomo', onclick: () => { cleanupRace(); if (!L.seenFree) { L.seenFree = 1; saveLocal(); setTimeout(() => toast('Phone (P) mein Races, Jhatpat, Map sab hai. Club Sector 29 mein!'), 600); } } }));
  box.append(btns);
}
function cleanupRace() {
  const r = G.race; if (!r) return; G.race = null; GATES.forEach(g => { g.visible = false; }); raceArrow.visible = false; $('raceres').hidden = true; $('racehud').hidden = true; $('racehint').hidden = true; $('bigtxt').hidden = true;
  document.body.classList.remove('racing'); const s = r.spot; s.car.position.set(s.home.x, 0.05, s.home.z); s.car.rotation.y = s.home.h; s.lab.visible = true;
}
function quitRace() { if (!G.race) return; cleanupRace(); toast('Race chhod di'); }
function updateRaceSpots(dt) { if (G.race || G.inside) return; for (const s of RACE_SPOTS) { s.tauntT -= dt; if (s.tauntT < 0 && Math.hypot(s.x - G.x, s.z - G.z) < 30) { s.tauntT = 14; (raceUnlocked(s.i) ? say(s.car, pick(s.R.taunt), 3) : (say(s.car, 'Pehle baaki racers ko hara, fir aaiyo', 3), toast('Pehle ' + D.RACES[s.i - 1].rival + ' ko hara, fir yeh race khulegi'))); } } }
function appRaces() {
  net.req('races', {}).then(res => openModal('Street Races', 'Har rival ko hara, agla unlock. Rematch ek tap pe.', b => {
    D.RACES.forEach((R, i) => {
      const un = raceUnlocked(i); const pb = P.raceBest && P.raceBest[R.id]; const rec = res.ok && res.rec[R.id] && res.rec[R.id][0];
      const sub = (un ? 'vs ' + R.rival : 'Locked: pehle ' + D.RACES[i - 1].rival + ' ko hara') + ' · Prize ' + fmt(R.prize) + (raceWon(R.id) ? ' · Jeeti hui' : '') + (pb ? ' · Best ' + fmtT(pb) : '') + (rec ? ' · Record ' + fmtT(rec.ms) + ' (' + rec.name + ')' : '');
      b.append(itemRow((i + 1) + '. ' + R.name, sub, un ? 'Race!' : 'Locked', () => startRace(R.id), !un));
    });
  }));
}
// on-screen big text and combo popups
function bigText(t, sub, secs) { const b = $('bigtxt'); b.hidden = false; b.textContent = ''; b.append(el('b', { text: t })); if (sub) b.append(el('small', { text: sub })); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(G.bigT); G.bigT = setTimeout(() => { b.hidden = true; }, (secs || 1) * 1000); }
function popText(t, cls) { const d = el('div', { class: 'pop ' + (cls || ''), text: t }); $('combo').append(d); while ($('combo').children.length > 2) $('combo').firstChild.remove(); setTimeout(() => d.remove(), 1400); }
// driving feel: NOS, drift smoke, near misses, speed camera
G.nos = 0; let nosHeld = false, driftAcc = 0, driftT = 0, smokeT = 0;
const nosKey = () => keys.ShiftLeft || keys.ShiftRight || nosHeld;
function driveThrills(dt, ix, iy) {
  if (!G.veh || !playerVeh) { if (G.speedoKey) { G.speedoKey = ''; $('speedo').hidden = true; } return; }
  const V = D.VEH[G.veh]; const sp = Math.abs(G.vs); const t = now();
  const so = Math.round(sp * 5) + '|' + Math.round((G.nos || 0) * 100) + '|' + !!G.nosOn; if (G.speedoKey !== so) { G.speedoKey = so; $('speedo').hidden = false; $('spd').textContent = Math.round(sp * 5); $('nosb').style.width = Math.round((G.nos || 0) * 100) + '%'; $('speedo').classList.toggle('on', !!G.nosOn); }
  // drift: hard steer at speed slides the body and fills NOS
  const drifting = Math.abs(ix) > 0.4 && sp > 12 && (iy > 0 || G.hb); const want = drifting ? -ix * 0.32 : 0; G.slip = (G.slip || 0) + (want - (G.slip || 0)) * Math.min(1, dt * 6);
  playerVeh.rotation.y = G.r + G.slip;
  if (drifting) { driftAcc += dt * sp; driftT = t; G.nos = Math.min(1, (G.nos || 0) + dt * 0.2); smokeT -= dt; if (smokeT < 0) { smokeT = 0.05; const bx2 = G.x - Math.sin(G.r) * 2, bz = G.z - Math.cos(G.r) * 2; burst(bx2, 0.4, bz, 0xcfcfcf, 2, { speed: 1.2, up: 0.4, grav: -1, life: 0.7 }); } }
  else if (driftAcc > 0 && t - driftT > 0.4) { if (driftAcc > 60) { popText('DRIFT ' + Math.round(driftAcc) + '!', 'gold'); A.sfx('ok'); } driftAcc = 0; }
  // near miss with traffic
  if (sp > 14) for (const c of CARS) { if (!c.mesh.visible || (c.nm || 0) > t) continue; const d = Math.hypot(c.mesh.position.x - G.x, c.mesh.position.z - G.z); if (d < 4.6 && d > 1.8) { c.nm = t + 3; G.nos = Math.min(1, (G.nos || 0) + 0.2); popText('NEAR MISS! +NOS', 'red'); A.sfx('whoosh'); } }
  // NOS flames
  if (G.nosOn) { smokeT -= dt; if (smokeT < 0) { smokeT = 0.04; burst(G.x - Math.sin(G.r) * 2.6, 0.7, G.z - Math.cos(G.r) * 2.6, pick([0x33bbff, 0xffffff, 0xff8a00]), 2, { speed: 1, up: 0.2, grav: 0, life: 0.3 }); } }
  if (V.kind === 2) $('speedo').classList.add('bike'); else $('speedo').classList.remove('bike');
}
function baseFov() { const a = innerWidth / innerHeight; return a >= 1 ? 62 : Math.min(84, 62 + (1 - a) * 42); } // tall screens: open the view up so buildings and people at the sides stay visible
function speedCamera(dt) {
  const sp = G.veh ? Math.abs(G.vs) : 0; const want = baseFov() + clamp(sp - 12, 0, 30) * 0.32 + (G.nosOn ? 12 : 0);
  if (Math.abs(camera.fov - want) > 0.05) { camera.fov += (want - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  if (G.nosOn) { camera.position.x += rnd(-0.08, 0.08); camera.position.y += rnd(-0.06, 0.06); }
  const sfx2 = (G.nosOn ? 0.85 : clamp((sp - 26) / 14, 0, 0.35)).toFixed(2); if (G.sfxOp !== sfx2) { G.sfxOp = sfx2; $('speedfx').style.opacity = sfx2; }
}

// ================================================================ PEHLA DIN: the scripted first two minutes
// One beat flows into the next with no menus: race → road rage → swag → police chase → club → a dream to chase.
const BEATS = ['race', 'fight', 'swag', 'chase', 'club'];
function step(k) { if (!P) return; P.steps = P.steps || {}; if (P.steps[k]) return; P.steps[k] = Date.now(); net.send('step', { k }); }
function quest(title, sub) {
  const q = $('quest'); if (!title) { q.hidden = true; return; } q.hidden = false; q.textContent = '';
  const n = G.story ? BEATS.indexOf(G.story.beat) + 1 : 0; q.append(el('small', { text: 'Pehla Din · ' + n + '/5' }), el('b', { text: title }));
  if (sub) q.append(el('span', { text: sub })); q.append(el('button', { type: 'button', class: 'skip', text: 'Skip', onclick: skipStory }));
}
function startStory() { G.story = { beat: 'race' }; step('story_start'); startRace(D.RACES[0].id, { intro: true }); }
function skipStory() { if (!G.story) return; const s = G.story; G.story = null; quest(null); step('story_skip'); if (s.monu) dropMonu(); if (G.race) cleanupRace(); $('raceres').hidden = true; endStoryCommon(); toast('Story skip. Phone (P) mein sab kuch hai.'); }
function endStoryCommon() { L.loanerOK = 1; saveLocal(); if (!P.tutDone) { P.tutDone = true; net.send('tutdone', {}); } }
function storyGo(beat) { if (!G.story) return; G.story.beat = beat; G.story.t0 = now(); step('b_' + beat); ({ fight: beatFight, swag: beatSwag, chase: beatChase, club: beatClub, done: beatDone })[beat](); }
const touchUI = () => document.body.classList.contains('touch');
function beatFight() {
  const r = G.race; const spot = r ? r.spot : RACE_SPOTS[0]; G.story.spot = spot;
  GATES.forEach(g => { g.visible = false; }); raceArrow.visible = false; $('racehud').hidden = true; $('racehint').hidden = true; document.body.classList.remove('racing'); G.race = null;
  G.storyLoaner = G.veh || 'chhotu'; G.vs = 0; dismount();
  // Monu's car screeches up beside you and he jumps out in front of you
  const sx = Math.cos(G.r), sz = -Math.sin(G.r); spot.car.position.set(G.x + sx * 5 + Math.sin(G.r) * 3, 0.05, G.z + sz * 5 + Math.cos(G.r) * 3); spot.car.rotation.y = G.r; A.sfx('crash');
  const m = makeFighter('Monu Dahiya', G.x + Math.sin(G.r) * 5 + sx * 1.5, G.z + Math.cos(G.r) * 5 + sz * 1.5, 30, 3, 0xdedede); m.r = G.r + Math.PI; m.state = 'aggro'; m.story = true; FIGHTERS.push(m); G.story.monu = m;
  setTimeout(() => say(m, r && r.won ? 'Cheating kari se tune! Utar neeche!' : 'Haar gaya? Chal chai pila, warna...', 3), 300);
  bigText('ROAD RAGE!', 'Monu ladne aa gaya', 1.8); A.sfx('crash');
  quest('Monu ko sabak sikha!', touchUI() ? 'Paas jaa aur Punch dabao' : 'Paas jaa aur Left-click (ya Q) se punch maaro');
}
function dropMonu() { const s = G.story || {}; const m = s.monu; if (m) { const i = FIGHTERS.indexOf(m); if (i >= 0) FIGHTERS.splice(i, 1); scene.remove(m.mesh); } const sp = s.spot || RACE_SPOTS[0]; sp.car.position.set(sp.home.x, 0.05, sp.home.z); sp.car.rotation.y = sp.home.h; sp.lab.visible = true; }
function storyKO() { step('fight_ko'); bigText('DHOBI PACHHAD!', 'Gurugram dekh rya se', 1.8); A.sfx('cheer'); burst(G.x, 2, G.z, 0xf6c026, 30, { speed: 6 }); setTimeout(() => { dropMonu(); G.story.monu = null; storyGo('swag'); }, 1800); }
function beatSwag() {
  quest('Jeet ka jashn!', 'Kuch swag le, sab dekhenge');
  const opts = [['Haryanvi pagdi', 'hat', 'pagdi', D.HATS.pagdi[1]], ['Kaala chashma', 'shades', 'x', 1200], ['Naya kurta', 'shirt', (P.color + 3) % D.SHIRTS.length, D.MISC.shirt[1]]];
  showCard('Jeet ka jashn!', 'Wallet ' + fmt(P.money) + ' · ek cheez le le, turant pehan', opts.filter(o => !(o[1] === 'hat' && P.outfit.hat === 'pagdi') && !(o[1] === 'shades' && P.outfit.shades)).map(o => [o[0] + ' · ' + fmt(o[3]), async () => {
    const r = await buy(o[1], o[2]); if (!r.ok) return; step('swag_buy'); $('raceres').hidden = true; A.sfx('level');
    for (let k = 0; k < 3; k++) setTimeout(() => burst(G.x, 2.4, G.z, pick([0xf6c026, 0xffffff, 0xff6fa5]), 20, { speed: 4, life: 1 }), k * 200);
    G.yaw = G.r + Math.PI; G.dist = 5; G.lookAt = now() + 1.5; const ped = PEDS.find(p => Math.hypot(p.mesh.position.x - G.x, p.mesh.position.z - G.z) < 40); say(ped || player, 'Kya lag rya se, bhai!', 2.2);
    setTimeout(() => { G.dist = 9; storyGo('chase'); }, 2400);
  }]).concat([['Baad mein', () => { $('raceres').hidden = true; storyGo('chase'); }, 'alt']]));
}
function beatChase() {
  G.quietMount = true; mount(G.storyLoaner || 'chhotu'); G.quietMount = false; G.loaner = !(P.vehicles || []).includes(G.veh); G.nos = 1;
  // point the car down the long side of the road it is on, so the getaway has room
  const rx = ROADS.find(r => Math.abs(G.x - r) < 9), rz = ROADS.find(r => Math.abs(G.z - r) < 9);
  if (rx !== undefined) { G.x = rx - 3 * Math.sign(G.z || 1); G.r = G.z > 0 ? Math.PI : 0; } else if (rz !== undefined) { G.z = rz; G.r = G.x > 0 ? -Math.PI / 2 : Math.PI / 2; }
  G.yaw = G.r; G.vs = 8; playerVeh.position.set(G.x, 0.2, G.z); playerVeh.rotation.y = G.r;
  bigText('POLICE!', 'Race ki shikayat aa gayi. Bhaag!', 1.8); startChase({ near: true, secs: 20, story: true, sp: 21 });
  quest('Police se bach: 20 second', touchUI() ? 'Joystick se bhaga · NOS button' : 'W se bhaga · Shift: NOS');
}
function storyChaseEnd(escaped) { step(escaped ? 'chase_escape' : 'chase_caught'); if (escaped) { bigText('BACH GAYA!', 'Police ko chakma de diya', 1.6); A.sfx('cheer'); } else toast('Havaldar: "Pehli baar se, jaa. Agli baar nahi chhodunga!"'); setTimeout(() => storyGo('club'), 1500); }
function beatClub() {
  const d = DOORS.club; setWaypoint(d.x, d.z + 2, 'Neon Nights club');
  quest('Ab party! Neon Nights, Sector 29', 'Yellow roshni follow kar, door pe ' + (touchUI() ? 'Action' : 'E'));
}
function beatDone() {
  step('debut_done'); quest(null); const s = G.story; G.story = null; endStoryCommon();
  const goal = sapnaGoal(); const next = D.RACES[1];
  showCard('Pehla Din poora!', 'Race, ladai, swag, police, party: sab ek din mein. Ab asli khel.', [
    [raceUnlocked(1) ? 'Race 2: ' + next.rival + ' (₹' + (next.prize * 2).toLocaleString('en-IN') + ')' : 'Rematch: ' + D.RACES[0].rival, () => { if (G.inside) exitInterior(); setTimeout(() => startRace(raceUnlocked(1) ? next.id : D.RACES[0].id), G.inside ? 700 : 0); }],
    ['Dangal: Pehlwan Bhola (₹1,000)', () => { $('raceres').hidden = true; if (G.inside) exitInterior(); setWaypoint(AKHARA.x, AKHARA.z, 'Akhara, Leisure Valley'); }, 'alt2'],
    ['Club mein naacho', () => { $('raceres').hidden = true; }, 'alt'],
  ], goal ? 'Tera sapna: ' + goal.name + ' (' + fmt(goal.price) + '). Races sabse tez paisa dete hain.' : null);
}
function updateStory(dt) {
  const s = G.story; if (!s) return;
  if (s.beat === 'club' && G.inside === 'club' && !s.inClub) { s.inClub = now(); step('club_in'); A.sfx('cheer'); bigText(P.name.toUpperCase() + ' IN THE HOUSE!', 'DJ ne tera naam liya!', 2.2); quest('Naach!', touchUI() ? 'Dance button dabao' : 'B dabao'); for (let k = 0; k < 4; k++) setTimeout(() => burst(3200 + rnd(-8, 8), 6, 2000 + rnd(-6, 6), pick([0xffd400, 0xff2bd6, 0x00e5ff]), 40, { speed: 8 }), k * 300); }
  if (s.beat === 'club' && s.inClub) { if (G.dance) s.danced = (s.danced || 0) + dt; if ((s.danced || 0) >= 3 && now() - s.inClub > 4) storyGo('done'); }
}
// a card in the middle of the screen (shares the race result box)
function showCard(title, sub, buttons, foot) {
  $('bigtxt').hidden = true; const box = $('raceres'); box.hidden = false; box.textContent = ''; box.append(el('h2', { class: 'win', text: title }), el('p', { class: 'fine', text: sub }));
  const btns = el('div', { class: 'btns' }); for (const [t, fn, cls] of buttons) btns.append(el('button', { class: 'buy big' + (cls ? ' ' + cls : ''), text: t, onclick: fn })); box.append(btns);
  if (foot) box.append(el('p', { class: 'unlock', text: foot }));
}
// Sapna: the next thing to own, always on screen, so there is always a reason to earn
function sapnaGoal() {
  const own = (P.vehicles || []).map(v => D.VEH[v] ? D.VEH[v].price : 0); const best = own.length ? Math.max(...own) : 0;
  for (const t of D.BUY_VEHICLES) { const v = D.VEH[t]; if (!P.vehicles.includes(t) && v.price > best) return { name: v.name, price: v.price, kind: 'vehicle' }; }
  const hs = Object.entries(D.HOUSES).filter(([id, h]) => h.price && !P.houses.includes(id)).sort((a, b) => a[1].price - b[1].price);
  return hs.length ? { name: hs[0][1].name, price: hs[0][1].price, kind: 'house' } : null;
}
function renderSapna() {
  const g = sapnaGoal(); const box = $('sapna'); if (!g) { box.hidden = true; return; } box.hidden = false;
  const pct = clamp(P.money / g.price, 0, 1); const ready = pct >= 1; const key = g.name + (ready ? 1 : 0);
  if (box.dataset.k !== key) { box.dataset.k = key; box.textContent = ''; box.append(el('div', { class: 'blab' }, el('span', { text: 'Sapna: ' + g.name }), el('span', { id: 'sapt' })), el('div', { class: 'bar' }, el('i', { id: 'sapb' }))); box.classList.toggle('ready', ready);
    if (ready && G.sapnaSeen !== g.name && G.started && !G.story) { G.sapnaSeen = g.name; bigText('SAPNA POORA HO SAKTA SE!', g.name + ' le le: ' + (g.kind === 'vehicle' ? 'Chaudhary Motors, NH-48' : 'Yadav Estates'), 2.4); A.sfx('level'); } }
  $('sapt').textContent = ready ? 'Ab le le!' : Math.floor(pct * 100) + '%'; $('sapb').style.width = (pct * 100) + '%';
}
$('sapna').onclick = () => { const g = sapnaGoal(); if (!g) return; if (P.money >= g.price) { if (g.kind === 'vehicle') setWaypoint(300, -296, 'Chaudhary Motors'); else openProperty(); } else appRaces(); };

// ================================================================ LOGIN & BOOT
// Joining: name → avatar (first time, or "Avatar badlo") → start place → play
const AVD = Object.assign({ g: 'm', skin: 2, hair: 0, hc: 0, top: 0, pants: 0, acc: 1, color: lsGet('gl_color') ?? 0, hat: 'none', shades: false, ride: 'chhotu' }, lsGet('gl_avatar') || {});
const STARTS = [
  ['ambience', 'Ambience Mall', 'Pehla Din yahin se: race, ladai, swag, party', () => ({ x: DOORS.mall.x + rnd(-3, 3), z: DOORS.mall.z + 37, r: Math.PI })],
  ['sector29', 'Sector 29', 'Neon Nights club, Sher-e-Haryana Dhaba', () => ({ x: DOORS.club.x + rnd(-2, 2), z: DOORS.club.z + 10, r: Math.PI })],
  ['cyberhub', 'Cyber Hub', 'Office crowd, cafe, raat ki ronak', () => ({ x: 158, z: -228, r: Math.PI })],
  ['rajiv', 'Rajiv Chowk', 'Shehar ka centre, Iffco Chowk paas mein', () => ({ x: rnd(-9, 9), z: 48, r: Math.PI })],
  ['sohna', 'Sohna Road', 'Theka aur nightlife', () => ({ x: 158, z: 72, r: Math.PI })],
  ['golf', 'Golf Course Road', 'Penthouse, baraat route, rich log', () => ({ x: -292, z: 72, r: Math.PI })],
  ['badshahpur', 'Badshahpur', 'Chaupal, gaon ka swag', () => ({ x: 158, z: 222, r: Math.PI })],
  ['leisure', 'Leisure Valley', 'Akhara: dangal aur champion belt', () => ({ x: 308, z: -78, r: Math.PI })],
];
let PREVIEW = null, previewYaw = 0;
function avLook() { return { body: { g: AVD.g, skin: AVD.skin, hair: AVD.hair, hc: AVD.hc, top: AVD.top, pants: AVD.pants, acc: AVD.acc }, shirt: D.SHIRTS[AVD.color], hat: AVD.hat, shades: AVD.shades, bling: [] }; }
function previewPos() { return { x: DOORS.mall.x, z: DOORS.mall.z + 40 }; }
function showCreator() {
  $('login').hidden = true; $('startpick').hidden = true; $('creator').hidden = false; G.creating = true; DAY.fixed = true; DAY.t = 0.45; // daylight for the preview
  if (!PREVIEW) { PREVIEW = makeChar(D.SHIRTS[AVD.color]); scene.add(PREVIEW); const p = previewPos(); PREVIEW.position.set(p.x, 0.2, p.z); }
  PREVIEW.visible = true; renderCreator();
}
function renderCreator() {
  setLook(PREVIEW, avLook()); lsSet('gl_avatar', AVD); const rows = $('crows'); rows.textContent = '';
  const row = (label, node) => rows.append(el('div', { class: 'crow' }, el('label', { text: label }), node));
  const seg = (opts, cur, set) => { const w = el('div', { class: 'seg' }); opts.forEach(([v, t]) => w.append(el('button', { type: 'button', class: v === cur ? 'on' : '', text: t, onclick: () => { set(v); renderCreator(); } }))); return w; };
  const dots = (cols, cur, set) => { const w = el('div', { class: 'dots' }); cols.forEach((c, i) => w.append(el('button', { type: 'button', 'aria-label': 'colour ' + (i + 1), class: i === cur ? 'on' : '', style: 'background:' + hex(c), onclick: () => { set(i); renderCreator(); } }))); return w; };
  const f = AVD.g === 'f'; const firstTime = !lsGet('gl_lookset');
  row('Main hoon', seg([['m', 'Ladka'], ['f', 'Ladki']], AVD.g, v => { if (v !== AVD.g) { AVD.g = v; AVD.hair = 0; AVD.top = 0; AVD.acc = v === 'f' ? 1 : 1; AVD.hat = 'none'; } }));
  row('Rang (skin)', dots(SKINS, AVD.skin, v => { AVD.skin = v; }));
  row('Baal (hair)', seg(AV.hair[AVD.g].map((t, i) => [i, t]), AVD.hair, v => { AVD.hair = v; }));
  row('Baalon ka rang', dots(HAIRC, AVD.hc, v => { AVD.hc = v; }));
  row('Kapde', seg(AV.top[AVD.g].map((t, i) => [i, t]), AVD.top, v => { AVD.top = v; }));
  row('Kapdon ka rang', dots(D.SHIRTS, AVD.color, v => { AVD.color = v; }));
  row('Pant', seg(AV.pants.map((t, i) => [i, t]), AVD.pants, v => { AVD.pants = v; }));
  row(f ? 'Shringar' : 'Chehra', seg(AV.acc[AVD.g].map((t, i) => [i, t]), AVD.acc, v => { AVD.acc = v; }));
  if (firstTime) {
    row('Sar pe', seg(f ? [['none', 'Kuch nahi'], ['dupatta', 'Dupatta']] : [['none', 'Kuch nahi'], ['cap', 'Cap'], ['pagdi', 'Pagdi']], AVD.hat, v => { AVD.hat = v; }));
    row('Kaala chashma', seg([[false, 'Nahi'], [true, 'Haan, swag']], AVD.shades, v => { AVD.shades = v; }));
  }
  row('Chacha ki gaadi (jab tak apni na lo)', seg([['chhotu', 'Chhotu Hatchback'], ['desert', 'Desert King 4x4'], ['dhakad', 'Dhakad 350 Bullet']], AVD.ride, v => { AVD.ride = v; }));
}
$('cRandom').onclick = () => { AVD.g = Math.random() < 0.5 ? 'm' : 'f'; AVD.skin = irnd(0, 4); AVD.hair = irnd(0, 4); AVD.hc = irnd(0, 4); AVD.top = irnd(0, 2); AVD.pants = irnd(0, 3); AVD.acc = irnd(0, 2); AVD.color = irnd(0, D.SHIRTS.length - 1); renderCreator(); };
$('cBack').onclick = () => { $('creator').hidden = true; G.creating = false; DAY.fixed = false; if (G.viewOff) { camera.clearViewOffset(); G.viewOff = false; } if (PREVIEW) PREVIEW.visible = false; $('login').hidden = false; };
$('cNext').onclick = () => { lsSet('gl_avatar', AVD); G.avatarDirty = true; showStartPick(); };
$('sBack').onclick = () => showCreator();
let dragPrev = null; $('creator').addEventListener('pointerdown', e => { if (e.target.closest('.cpanel')) return; dragPrev = e.clientX; });
window.addEventListener('pointermove', e => { if (dragPrev != null) { previewYaw += (e.clientX - dragPrev) * 0.012; dragPrev = e.clientX; } }); window.addEventListener('pointerup', () => { dragPrev = null; });
function showStartPick() {
  $('login').hidden = true; $('creator').hidden = true; $('startpick').hidden = false; G.creating = !!PREVIEW; const box = $('splaces'); box.textContent = '';
  const last = lsGet('gl_start') || 'ambience';
  for (const [id, name, sub] of STARTS) box.append(el('button', { type: 'button', class: 'splace' + (id === 'ambience' ? ' rec' : '') + (id === last ? ' on' : ''), onclick: e => joinWhenReady(id, e.currentTarget) }, el('b', { text: name }), el('span', { text: sub })));
}
renderLangPick();
const savedName = lsGet('gl_name'); if (!savedName) { $('nameIn').value = pick(['Bunty', 'Monty', 'Rocky', 'Sunny', 'Lucky', 'Bittu', 'Golu', 'Pinky', 'Sweety', 'Neetu']) + ' ' + pick(['Yadav', 'Chaudhary', 'Dahiya', 'Sangwan', 'Malik', 'Hooda', 'Rao', 'Phogat']); $('loginNote').textContent = 'Naam badalna ho to badal le. Agle step mein apna avatar banao!'; } if (savedName) { $('nameIn').value = savedName; $('loginNote').textContent = 'Wapas aa gaya ' + savedName + '! Tera progress saved se.'; }
if (savedName && lsGet('gl_lookset')) { $('playBtn').textContent = 'Chalo, Khelo!'; $('playBtn').after(el('button', { type: 'button', class: 'buy alt', id: 'avBtn', text: 'Avatar badlo', onclick: () => { saveName(); showCreator(); } })); } else $('playBtn').textContent = 'Aage: apna avatar banao →';
$('nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('playBtn').click(); });
function saveName() { let n = D.cleanText($('nameIn').value, 16); if (n.length < 2) n = 'Chhora ' + irnd(10, 99); lsSet('gl_name', n); }
$('playBtn').onclick = () => { saveName(); A.initAudio(); if (lsGet('gl_lookset')) showStartPick(); else showCreator(); };
// wait (up to 25 s) for the realistic people before entering, so nobody shows up as a block figure first
async function joinWhenReady(id, btn) {
  A.unlock(); // inside the tap, so phones allow sound from the start
  if (HUMANS_P && !HU.HUMANS.ready) { document.querySelectorAll('.splace').forEach(b => b.disabled = true); const sp = btn && btn.querySelector('span'); if (sp) sp.textContent = 'Gurugram ke log aa rahe hain… (pehli baar thoda time lagta hai)';
    await Promise.race([HUMANS_P, new Promise(r => setTimeout(r, 25000))]); }
  joinGame(id);
}
function joinGame(startId) { if (G.viewOff) { camera.clearViewOffset(); G.viewOff = false; }
  lsSet('gl_start', startId); G.startId = startId; lsSet('gl_color', AVD.color); L.loanVeh = AVD.ride; saveLocal();
  $('startpick').hidden = true; $('creator').hidden = true; if (PREVIEW) PREVIEW.visible = false; G.creating = false; DAY.fixed = false;
  $('login').hidden = false; $('playBtn').disabled = true; $('playBtn').textContent = 'Connecting…'; A.initAudio(); { const rs = lsGet('gl_radio'); if (I18N.LANG !== 'har' && (!rs || rs.st === 'har')) A.preferStation('bol'); } A.restoreRadio(); radioLabel(); // Hindi / English players join to Bollywood
  const hello = () => ({ token: lsGet('gl_token'), name: lsGet('gl_name'), color: lsGet('gl_color') });
  const goSolo = reason => {
    if (G.started || net.local) return; G.soloReason = reason || ''; net.connectLocal(hello);
    if (window.GL_SOLO) return;
    console.warn('Gurugram Life: multiplayer unavailable, playing solo. Reason:', reason);
    const msg = reason === 'full' ? 'Server full se (bahut log online). Solo mode mein khel rya se; thodi der baad refresh karna.' : String(reason).startsWith('kicked') ? 'Server ne mana kiya: ' + reason.slice(8) + '. Abhi solo mode.' : 'Multiplayer server se connect nahi ho paya, isliye solo mode. Phone → Online mein "Try again" dabao.';
    setTimeout(() => toast(msg, 'bad'), 2500);
  };
  if (window.GL_SOLO) goSolo('artifact');
  else { $('loginNote').textContent = 'Server se connect ho rya se…'; net.on('unreachable', goSolo); net.connect(hello); setTimeout(() => goSolo('timed out after 15s (' + (net.lastClose || 'no reply') + ')'), 15000); }
}
function sendAvatar() { if (!G.avatarDirty && P.look) return; G.avatarDirty = false; const a = AVD; net.req('look', { look: { g: a.g, skin: a.skin, hair: a.hair, hc: a.hc, top: a.top, pants: a.pants, acc: a.acc }, color: a.color, hat: a.hat, shades: a.shades }).then(() => lsSet('gl_lookset', 1)); }
function startGame(daily) {
  $('login').hidden = true; $('hud').hidden = false; G.started = true;
  player = makeChar(D.SHIRTS[P.color]); scene.add(player); sendAvatar(); applyMyLook();
  const st = STARTS.find(x => x[0] === G.startId) || STARTS[0]; const sp = st[3](); G.x = sp.x; G.z = sp.z; G.r = G.yaw = sp.r; G.pitch = 0.12;
  updateHUD(); renderMissions(); setNetChip(); G.startedAt = now();
  { const k = $('keyhint'); k.hidden = false; k.innerHTML = '<kbd>W A S D</kbd> chalo · <kbd>Shift</kbd> daudo<br><kbd>Space</kbd> jump · <kbd>Click</kbd> punch<br><kbd>E</kbd> action · <kbd>F</kbd> gaadi · <kbd>M</kbd> map<br><kbd>Tab</kbd> menu · <kbd>T</kbd> chat · <kbd>Esc</kbd> mouse'; } // stays on screen
  const fresh = !P.tutDone && !(P.raceWins && Object.keys(P.raceWins).length);
  step('play'); bigText(st[1].toUpperCase(), 'Gurugram · ' + clockText(), 2);
  if (fresh && st[0] === 'ambience') setTimeout(startStory, 2300); else if (fresh) { step('start_other'); endStoryCommon(); setTimeout(() => toast('Pehla Din story Ambience Mall pe milegi. Abhi ghoomo!'), 2600); }
  else { toast('Ram Ram, ' + P.name + '! Wapas aa gaya.'); if (daily && daily.streak > 1) setTimeout(() => toast('Day ' + daily.streak + ' streak: +' + fmt(daily.amt) + ' wallet mein', 'money'), 9000); }
}

let last = performance.now(), hungerT = 0, regenT = 0, hudT = 0, shT = 99;
const PERF = { acc: 0, n: 0, pr: Math.min(window.devicePixelRatio || 1, 1.5) };
function adaptQuality(frameMs) { // average over ~2 s; slow → drop the pixel ratio a step (1.5 → 1.25 → 1 → 0.85), fast again → step back up
  PERF.acc += frameMs; PERF.n++; if (PERF.n < 120 && PERF.acc < 2000) return; /* every ~2 s, sooner on a very slow device */ const avg = PERF.acc / PERF.n; PERF.acc = PERF.n = 0; const max = Math.min(window.devicePixelRatio || 1, 1.5);
  let pr = PERF.pr; if (avg > 26 && pr > 0.85) pr = Math.max(0.85, +(pr - 0.25).toFixed(2)); else if (avg < 15 && pr < max) pr = Math.min(max, +(pr + 0.25).toFixed(2));
  if (pr !== PERF.pr) { PERF.pr = pr; renderer.setPixelRatio(pr); resize(); }
  // still slow at the lowest resolution: drop sun shadows first, then show fewer realistic people (the rest keep their simple figure); back up when fast
  if (avg > 30 && PERF.pr <= 0.85) { if (!RL.Q.lowShadow) RL.Q.lowShadow = true; else PERF.hk = Math.max(0.15, (PERF.hk || 1) - 0.25); } else if (avg < 17) { if ((PERF.hk || 1) < 1) PERF.hk = Math.min(1, (PERF.hk || 1) + 0.25); else if (avg < 14) RL.Q.lowShadow = false; }
}
function loop(t) {
  requestAnimationFrame(loop); const dt = Math.min(0.1, (t - last) / 1000); if (G.started) adaptQuality(t - last); last = t;
  updateDay(dt); updateWeather(dt);
  if (G.started) {
    updatePlayer(dt); footsteps(); if (G.map) updateMap3D(); else { updateCamera(dt); speedCamera(dt); roadHazards(dt); } updateRace(dt); updateRaceSpots(dt); updateStory(dt); updateFloodRun(); boatPolice(dt); updateZones(); updateJob(); checkNakaToll(); updateChase(dt); updateHangover(); updateEvents(dt);
    hungerT += dt; if (hungerT > 14) { hungerT = 0; L.hunger = Math.max(0, L.hunger - 1); if (L.hunger === 15) toast('Bhookh lag rahi se! Kuch kha le.', 'bad'); saveLocal(); }
    regenT += dt; if (regenT > 2.5) { regenT = 0; if (L.hunger > 30 && G.hp < 100 && G.hp > 0) G.hp = Math.min(100, G.hp + 1); if (L.hunger <= 0 && G.hp > 0) { G.hp -= 2; if (G.hp <= 0) playerKO(null); } }
    hudT += dt; if (hudT > 0.25) { hudT = 0; A.setCity(cityMix()); updateHUD(); renderSapna(); const mins = (now() - G.startedAt) / 60; for (const m of [1, 2, 5, 10]) if (mins >= m) step('min' + m); $('bRun').firstChild.textContent = G.veh ? 'NOS' : 'Jump'; renderJob(); updateBanner(); if (G.roast) renderRoastTimer(); const ln = G.inside ? INTERIOR[G.inside].name : locName(G.x, G.z); const wtxt = (G.weather?.lvl || 0) ? ' · ' + D.WEATHER[G.weather.lvl].short : ''; const lt = ln + '|' + clockText() + wtxt; if (lt !== G.lastLoc) { G.lastLoc = lt; $('loc').textContent = ln; $('loc').append(el('small', { text: clockText() + wtxt })); } if (G.minigame) G.minigame.tick(); }
    sendState(); if ((G.miniF = (G.miniF || 0) + 1) % 3 === 0) drawMini();
  } else if (G.creating && PREVIEW) { const p = previewPos(); const mob = innerWidth < 700; previewYaw += dt * 0.25; PREVIEW.rotation.y = previewYaw; animChar(PREVIEW, dt, 0);
    if (mob) { // the panel covers the bottom 58%: frame the whole avatar in the strip above it, whatever the phone's shape
      const W = innerWidth, H = innerHeight, d = 4.1 / (0.42 * 2 * Math.tan((camera.fov / 2) * Math.PI / 180)); camera.position.set(p.x, 1.5, p.z + d); camera.lookAt(p.x, 1.35, p.z); camera.setViewOffset(W, H, 0, H * 0.28, W, H); G.viewOff = true; // ~4 m of world fills the top 42%
    } else { camera.position.set(p.x - 2.6, 2.4, p.z + 6.5); camera.lookAt(p.x - 2.6, 1.7, p.z); } }
  else { const a = t / 1000 * 0.05; camera.position.set(Math.sin(a) * 110, 60, Math.cos(a) * 110); camera.lookAt(0, 10, 0); }
  if (G.started) musicDirector(); updateAmbient(dt); updateDogs(dt); updateCrowd(dt); updateFighters(dt); updateRemotes(dt); updateBubbles(dt); updateParts(dt); if (G.started) { updateNav(); updateBadla(); updateRush(); updateDon(); if (G.dance && G.inside === 'club' && now() > (G.danceEvT || 0)) { if (G.danceEvT) ev('dance'); G.danceEvT = now() + 21; } else if (!G.dance) G.danceEvT = 0; }
  for (const b of [jobBeacon, wpBeacon]) if (b.visible) { b.userData.ring.rotation.z += dt; b.children[0].visible = !G.inside; b.userData.ring.visible = !G.inside; }
  if (G.wp && !G.inside && Math.hypot(G.wp.x - G.x, G.wp.z - G.z) < 10) { toast('Pahunch gaya: ' + G.wp.name); G.wp = null; wpBeacon.visible = false; }
  if (G_WHEEL && G.wheelSpin > 0) { G.wheelSpin -= dt; G_WHEEL.rotation.y += dt * 12; }
  updateHumans(dt); if ((shT += dt) > 2) { shT = 0; RL.shadowize(scene); }
  Object.assign(DAYV, { wet: WX.wl, inside: !!G.inside, map: !!G.map, t: t / 1000, dt }); RL.frame(camera, G.started ? G.x : camera.position.x, G.started ? G.z : camera.position.z, DAYV); renderer.render(scene, camera);
}
let roastRendered = 0; function renderRoastTimer() { if (now() - roastRendered > 1 && !(document.activeElement && document.activeElement.id === 'roastIn')) { roastRendered = now(); renderRoast(); } }
// Notes and baraat: Action near the procession throws notes
ZONES.push({ zone: 'out', get x() { return -222; }, get z() { return baraatZ(); }, r: 16, label: () => G.ev?.type === 'baraat' ? 'Baraat: note udao (₹1,000)' : null, act: async () => { if (G.ev?.type !== 'baraat') return; const r = await buy('misc', 'notes'); if (r.ok) { G.dance = true; toast('Note udaye! Sab dekh rahe hain'); } } });
function boot() { buildGround(); districtBuilders(); buildRaceSpots(); buildCityFill(); buildWater(); buildInstances(); buildInteriors(); spawnAmbient(); spawnFighters(); buildBaraat(); requestAnimationFrame(loop); }
const fontsReady = document.fonts ? Promise.race([Promise.all([document.fonts.load('800 40px "Baloo 2"', 'Gurugram गुरुग्राम'), document.fonts.load('700 30px "Mukta"', 'Ram Ram राम')]), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
fontsReady.catch(() => {}).then(boot); A.loadSongs();
DG.loadDogs('/models/dog.glb').then(() => { if (!DOGS.length) spawnDogs(); }).catch(e => console.warn('Gurugram Life: street dogs not loaded', e)); // 160 KB
const HUMANS_P = /[?&]simple\b/.test(location.search) ? null : HU.loadHumans('/models/').catch(e => console.warn('Gurugram Life: realistic people not loaded, using simple ones', e)); // ~2.7 MB, cached after the first visit
window.addEventListener('pagehide', saveLocal);

