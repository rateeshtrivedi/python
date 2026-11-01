// Startup life: sit at a laptop and vibe-code your own product (the screen shows the editor, the AI writing code, the
// terminal and the app taking shape), call investors, then pitch them in their boardroom at Skyline Tower and take, haggle
// or walk away from their offer. Code at home on your own laptop (needs a room, not the footpath) or pay for a hot desk at
// Hustle Hub co-working. Rules and money live on the server (shared/startup.js + world.js); this file is the scenes.
import * as THREE from 'three';
import * as S from '../shared/startup.js';

let X = null; // the game's helpers, handed over by init()
const lang = () => (X.lang() === 'en' ? 'en' : 'hi'); // English or Hindi (Haryanvi players get Hindi)
const tx = o => (o && typeof o === 'object' ? o[lang()] || o.en : o);
const T = { // the scene's own lines
  coworkName: 'Hustle Hub Co-working, Udyog Vihar', vcName: 'Skyline Tower, Floor 21',
  promptPh: { en: 'Tell the AI what to build… e.g. "add UPI payments"', hi: 'AI ko batao kya banana hai… jaise "UPI payment daalo"' },
  send: { en: 'Send', hi: 'Bhejo' }, launch: { en: '🚀 Launch', hi: '🚀 Launch karo' }, exit: { en: 'Get up', hi: 'Utho' },
  hello: { en: 'Hi! I\'m your AI coding buddy. Tell me what {name} needs, in plain words. Start with the two must-haves: {core}.', hi: 'Namaste! Main tumhara AI coding saathi. Batao {name} mein kya chahiye, seedhi bhasha mein. Pehle do zaroori cheezein: {core}.' },
  built: { en: 'Done! Added {f} ({file}). Want more?', hi: 'Ho gaya! {f} add kar diya ({file}). Aur kya?' },
  dup: { en: '{f} is already built. Ask for something else.', hi: '{f} pehle se bana hai. Kuch aur maango.' },
  unknown: { en: 'I didn\'t get that. Try: {ideas}.', hi: 'Samjha nahi. Try karo: {ideas}.' },
  bug: { en: 'Uh-oh, the build broke. Type "fix the bug" and I\'ll sort it.', hi: 'Arre, build toot gaya. "bug fix karo" likho, main theek kar dunga.' },
  fixFirst: { en: 'Let\'s fix the error first. Type "fix the bug".', hi: 'Pehle error theek karte hain. "bug fix karo" likho.' },
  fixed: { en: 'Fixed! Tests are green again.', hi: 'Theek ho gaya! Tests phir se green.' },
  ready: { en: 'Your product is ready to launch! Press Launch, or keep adding polish (Hindi, dark mode, offline, reviews, alerts).', hi: 'Product launch ke liye tayyar! Launch dabao, ya aur polish daalo (Hindi, dark mode, offline, review, alert).' },
  launched: { en: '{name} is live! Now open the phone (Menu → Startup) and call investors.', hi: '{name} live ho gaya! Ab phone kholo (Menu → Startup) aur investors ko call karo.' },
  wait: { en: 'Writing code…', hi: 'Code likh raha hoon…' },
  answerPh: { en: 'Type your answer… (be specific, use numbers)', hi: 'Apna jawab likho… (detail mein, numbers ke saath)' },
  submit: { en: 'Answer', hi: 'Jawab do' }, qOf: { en: 'Question {i} of {n}', hi: 'Sawaal {i} / {n}' },
  thinking: { en: 'The investors are talking among themselves…', hi: 'Investors aapas mein baat kar rahe hain…' },
  accept: { en: '🤝 Accept', hi: '🤝 Deal pakki' }, counter: { en: 'Counter', hi: 'Counter karo' }, walk: { en: 'Walk away', hi: 'Chhod do' },
  counterPh: { en: 'Your equity %', hi: 'Tumhara equity %' }, ok: { en: 'OK', hi: 'Theek hai' },
};

// ---------------------------------------------------------------- the laptop and its live screen
const SCR = { W: 1024, H: 640 }; let screenCanvas = null, screenTex = null, idleTex = null;
function liveScreen() {
  if (screenTex) return screenTex; screenCanvas = document.createElement('canvas'); screenCanvas.width = SCR.W; screenCanvas.height = SCR.H;
  screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.encoding = THREE.LinearEncoding; screenTex.anisotropy = 4; return screenTex;
}
function idleScreen() { // other people's laptops: a static editor
  if (idleTex) return idleTex; idleTex = X.texFrom((c, w, h) => { c.fillStyle = '#1e1f24'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b2d34'; c.fillRect(0, 0, w * 0.18, h);
    for (let i = 0; i < 18; i++) { c.fillStyle = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff'][i % 5]; c.fillRect(w * 0.22 + (i % 3) * 14, 14 + i * 13, 40 + ((i * 37) % 120), 6); } }, 256, 160); return idleTex;
}
function laptop(parent, x, y, z, ry, live) { // base + tilted lid with a glowing screen; front faces local +z
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; parent.add(g);
  X.bx(g, 0.62, 0.035, 0.44, 0x9aa1a8, 0, 0.018, 0); X.bx(g, 0.5, 0.004, 0.2, 0x2b2e33, 0, 0.037, -0.04); X.bx(g, 0.16, 0.003, 0.1, 0x7d838a, 0, 0.037, 0.13);
  const lid = new THREE.Group(); lid.position.set(0, 0.035, -0.22); lid.rotation.x = -0.28; g.add(lid);
  X.bx(lid, 0.62, 0.42, 0.018, 0x9aa1a8, 0, 0.21, 0);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.3625), new THREE.MeshBasicMaterial({ map: live ? liveScreen() : idleScreen() })); scr.position.set(0, 0.215, 0.0105); lid.add(scr);
  g.userData.screen = scr; return g;
}
function deskSet(parent, x, z, ry, live, col) { // desk (1.8 x 0.9), office chair, laptop, mug; the sitter faces the desk from local +z
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; parent.add(g);
  X.bx(g, 1.8, 0.06, 0.9, 0xd9cdb6, 0, 1.0, 0); for (const sx of [-0.85, 0.85]) X.bx(g, 0.05, 1.0, 0.8, 0x3a3d42, sx, 0.5, 0);
  const lt = laptop(g, 0, 1.03, 0.05, 0, live); lt.scale.setScalar(1.2); X.cyl(g, 0.05, 0.1, 0xf6c026, 0.6, 1.08, 0.1); X.bx(g, 0.18, 0.012, 0.25, 0xf5f5f5, -0.6, 1.035, 0.1);
  X.cyl(g, 0.32, 0.08, 0x2b2b2b, 0, 0.62, 0.95); X.bx(g, 0.62, 0.1, 0.6, col || 0x2f3a4a, 0, 0.66, 0.95); X.bx(g, 0.6, 0.7, 0.08, col || 0x2f3a4a, 0, 1.05, 1.25); X.cyl(g, 0.04, 0.6, 0x555555, 0, 0.3, 0.95);
  return { g, laptop: lt };
}
const SIT = 0.45; // the seated pose puts the hips this far behind a character's feet, so seat them this much in front of the chair's centre
const local = (g, lx, ly, lz) => g.localToWorld(new THREE.Vector3(lx, ly, lz)); // a point in a desk set's space, in world space

// ---------------------------------------------------------------- the rooms
const DESKS = {}; let boardroom = null;
export function buildInteriors() {
  { // Hustle Hub co-working, Udyog Vihar
    const ox = 3500, oz = 2000, W = 40, D2 = 30, H = 6; const g = X.makeRoom('cowork', ox, oz, W, D2, H, 'parquet', 0xf2efe8, 3);
    X.sign(g, 'HUSTLE HUB', 'Co-working · Udyog Vihar Phase 4 · Hot desk ' + X.fmt(S.COWORK_FEE), '#111827', '#22d3ee', 9, 1.6, ox, 4.2, oz - D2 / 2 + 0.35);
    X.bx(g, 8, 0.6, 0.06, 0, ox + 11, 3.2, oz - D2 / 2 + 0.36, { mat: X.glow(0xff4fa3) }); X.sign(g, 'BUILD · SHIP · REPEAT', null, '#140a1f', '#ff7ac1', 7.6, 0.55, ox + 11, 3.2, oz - D2 / 2 + 0.4);
    // café counter with a barista
    X.bx(g, 6, 1.1, 1.2, 0x2b2118, ox - 13, 0.55, oz - 9, { col: 'cowork' }); X.bx(g, 6.1, 0.08, 1.3, 0xd9cdb6, ox - 13, 1.12, oz - 9); X.sign(g, 'CHAI ☕ COFFEE', 'Unlimited for members', '#2b2118', '#f6c026', 4, 0.8, ox - 13, 3, oz - D2 / 2 + 0.36);
    X.npcStatic(g, ox - 13, oz - 10.4, 0, 0x2b2118, 'Barista: Kabir');
    // rows of desks: people working; the free hot desk at the end of the front row glows
    let k = 0; const people = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = ox - 4 + c * 4.2, z = oz - 6 + r * 5; const hot = r === 2 && c === 3; const d = deskSet(g, x, z, 0, hot, hot ? 0xf6c026 : null); X.addCol('cowork', x - 0.95, x + 0.95, z - 0.5, z + 0.5);
      if (hot) { DESKS.cowork = d; const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 32), new THREE.MeshBasicMaterial({ color: 0xf6c026, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.04, z + 1.6); g.add(ring); const l = X.labelSprite('💻 Hot desk · ' + X.fmt(S.COWORK_FEE), { fs: 34, scale: 0.55, bg: 'rgba(15,118,110,.92)' }); l.position.set(x, 2.6, z + 0.2); g.add(l); d.sign = l; d.ring = ring; }
      else if (k++ % 2 === 0 && people.length < 6) people.push([x, z]); }
    for (const [x, z] of people) { const p = X.makeChar(X.pick(X.SHIRTS), {}); p.position.set(x, -0.12, z + 0.95 - SIT); p.rotation.y = Math.PI; g.add(p); X.sitChar(p); }
    // beanbags, phone booths, a whiteboard full of sticky notes, plants
    for (const [bx2, bz, c] of [[ox + 14, oz + 4, 0xd7331f], [ox + 16, oz + 6, 0x2563b8], [ox + 13, oz + 8, 0xf6c026]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), X.mat(c)); s.scale.set(1, 0.55, 1); s.position.set(bx2, 0.42, bz); g.add(s); }
    const glassM = new THREE.MeshLambertMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.3 });
    for (let i = 0; i < 2; i++) { const bx2 = ox + 15 + i * 2.6, bz = oz - 10; X.bx(g, 2.2, 2.6, 2.2, 0, bx2, 1.3, bz, { mat: glassM, col: 'cowork' }); X.bx(g, 2.2, 0.1, 2.2, 0x111827, bx2, 2.65, bz); X.sign(g, 'CALL BOOTH ' + (i + 1), null, '#111827', '#22d3ee', 1.8, 0.35, bx2, 2.3, bz + 1.12); }
    X.bx(g, 5, 2.4, 0.08, 0xffffff, ox - 13, 2, oz + 4, { col: 'cowork' }); for (let i = 0; i < 14; i++) X.bx(g, 0.35, 0.35, 0.02, X.pick([0xfff176, 0xff8a80, 0x80d8ff, 0xb9f6ca]), ox - 15 + (i % 7) * 0.65, 2.7 - Math.floor(i / 7) * 0.6, oz + 4.05);
    X.sign(g, 'ROADMAP Q4', 'MVP → Launch → Funding 🚀', '#ffffff', '#111827', 3, 0.5, ox - 13, 3.4, oz + 4.05);
    for (const [px, pz] of [[ox - 18, oz - 13], [ox + 18, oz - 13], [ox - 18, oz + 12], [ox + 18, oz + 12]]) { X.cyl(g, 0.35, 0.7, 0xf5f5f5, px, 0.35, pz); X.sph(g, 0.7, 0x2f7a35, px, 1.3, pz); }
    X.zone('cowork', DESKS.cowork.g.position.x, DESKS.cowork.g.position.z + 1.4, 1.8, () => tx({ en: 'Code at the hot desk (', hi: 'Hot desk pe code karo (' }) + X.fmt(S.COWORK_FEE) + ')', () => sitAndCode('cowork'));
  }
  { // Skyline Tower, Floor 21: reception, waiting sofa, the glass boardroom
    const ox = 3800, oz = 2000, W = 36, D2 = 28, H = 7; const g = X.makeRoom('vc', ox, oz, W, D2, H, 'marble', 0xe9e6e0, 4);
    X.bx(g, 6, 1.2, 1.4, 0xf5f5f5, ox + 9, 0.6, oz + 7, { col: 'vc' }); X.bx(g, 6.1, 0.06, 1.5, 0x1b1b1b, ox + 9, 1.23, oz + 7); X.npcStatic(g, ox + 9, oz + 5.6, 0, 0x1b1b1b, 'Reception: Simran');
    X.sign(g, 'SKYLINE TOWER · 21', S.INVESTORS.map(v => v.name).join(' · '), '#0f172a', '#e2e8f0', 8, 1.2, ox + 9, 4.2, oz + D2 / 2 - 0.4, Math.PI);
    for (const sx of [-1, 1]) { const s = new THREE.Group(); s.position.set(ox + 9 + sx * 4.5, 0, oz + 10.5); s.rotation.y = Math.PI; g.add(s); X.bx(s, 3, 0.5, 1, 0x3b3f46, 0, 0.45, 0); X.bx(s, 3, 0.8, 0.25, 0x3b3f46, 0, 0.95, -0.4); }
    for (const [px, pz] of [[ox + 17, oz + 12], [ox + 1, oz + 12], [ox - 17, oz + 12]]) { X.cyl(g, 0.4, 0.9, 0x1b1b1b, px, 0.45, pz); X.sph(g, 0.8, 0x2f7a35, px, 1.6, pz); }
    // the boardroom: glass walls, long table, investors on the far side, the founder's chair on the near side, a TV
    const bx0 = ox - 6, bz0 = oz - 5, BW = 20, BD = 14; const glassM = new THREE.MeshLambertMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.22 });
    X.bx(g, BW, H - 0.6, 0.1, 0, bx0, (H - 0.6) / 2, bz0 + BD / 2, { mat: glassM }); X.addCol('vc', bx0 - BW / 2, bx0 - 2, bz0 + BD / 2 - 0.1, bz0 + BD / 2 + 0.1); X.addCol('vc', bx0 + 2, bx0 + BW / 2, bz0 + BD / 2 - 0.1, bz0 + BD / 2 + 0.1);
    X.bx(g, 0.1, H - 0.6, BD, 0, bx0 + BW / 2, (H - 0.6) / 2, bz0, { mat: glassM, col: 'vc' }); X.sign(g, 'BOARDROOM', null, '#0f172a', '#e2e8f0', 3, 0.5, bx0, 5.6, bz0 + BD / 2 + 0.06);
    const sky = X.texFrom((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fbce6'); gr.addColorStop(1, '#e3edf3'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { const bw = 20 + Math.random() * 40, bh = 60 + Math.random() * 180, x = Math.random() * w; c.fillStyle = ['#7d8fa3', '#9aa9b8', '#6b7d90', '#a9b6c2'][i % 4]; c.fillRect(x, h - bh, bw, bh); c.fillStyle = 'rgba(255,255,255,.35)'; for (let y = h - bh + 6; y < h - 4; y += 10) for (let xx = x + 4; xx < x + bw - 4; xx += 8) c.fillRect(xx, y, 4, 5); } }, 1024, 256);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.4, H - 1.6), new THREE.MeshBasicMaterial({ map: sky })); win.position.set(ox, H / 2 + 0.2, oz - D2 / 2 + 0.34); g.add(win);
    X.bx(g, 9, 0.12, 3, 0x3a2a1a, bx0, 1.0, bz0 - 0.5); for (const sx of [-3.8, 3.8]) X.bx(g, 0.2, 1.0, 2.4, 0x2b2b2b, bx0 + sx, 0.5, bz0 - 0.5); X.addCol('vc', bx0 - 4.5, bx0 + 4.5, bz0 - 2, bz0 + 1);
    const chairAt = (x, z, ry) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); X.bx(c, 0.66, 0.1, 0.62, 0x1f2937, 0, 0.66, 0); X.bx(c, 0.62, 0.9, 0.08, 0x1f2937, 0, 1.15, -0.32); X.cyl(c, 0.05, 0.6, 0x666666, 0, 0.32, 0); X.cyl(c, 0.32, 0.06, 0x333333, 0, 0.04, 0); };
    const invSeats = [-2.6, 0, 2.6].map(dx => ({ x: bx0 + dx, z: bz0 - 2.5 })); invSeats.forEach(s => chairAt(s.x, s.z, 0));
    const me = { x: bx0, z: bz0 + 1.6 }; chairAt(me.x, me.z, Math.PI); for (const dx of [-2.6, 2.6]) chairAt(bx0 + dx, bz0 + 1.6, Math.PI);
    const tvC = document.createElement('canvas'); tvC.width = 1024; tvC.height = 576; const tvT = new THREE.CanvasTexture(tvC); tvT.encoding = THREE.LinearEncoding;
    X.bx(g, 5.2, 3, 0.12, 0x0a0a0a, bx0, 3.4, bz0 - BD / 2 + 0.5); const tv = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.8125), new THREE.MeshBasicMaterial({ map: tvT })); tv.position.set(bx0, 3.4, bz0 - BD / 2 + 0.57); g.add(tv);
    // three investors (the one you meet sits in the middle, the others are partners) and name plates
    const invs = [null]; for (let i = 1; i < 3; i++) invs.push(seatInvestor(g, invSeats[i], i === 1 ? 'm' : 'f', i === 2));
    boardroom = { g, ox, oz, bx0, bz0, me, invSeats, invs, tvC, tvT, plates: [] };
    X.zone('vc', me.x, me.z + 1.2, 2, () => { const su = X.P() && X.P().su; const v = su && su.meet && S.investor(su.meet.inv); return v ? tx({ en: 'Start your pitch: ', hi: 'Pitch shuru karo: ' }) + v.name : tx({ en: 'No meeting: call an investor first (Menu → Startup)', hi: 'Meeting nahi hai: pehle investor ko call karo (Menu → Startup)' }); }, () => startPitch());
    drawTV(null);
  }
}
function seatInvestor(g, s, gender, old) {
  const f = gender === 'f', shirt = f ? 0xf5f5f5 : 0x1b1b1b; const c = X.makeChar(shirt, { g: gender, pants: 0x1b1b1b }); c.userData.dress.outfit = f ? 'shirt' : 'office'; c.userData.dress.old = !!old; c.userData.noBlock = true;
  X.dressFrom(c, null, shirt); c.position.set(s.x, -0.1, s.z + SIT); g.add(c); X.sitChar(c); return c;
}
const INV_G = { sharma: 'm', bansal: 'f', skyline: 'm' };
// a desk at home (front-left corner of every home, facing the left wall)
export function homeDesk(g, spec, homeO) {
  const L = homeO.x - spec.W / 2, front = homeO.z + spec.D / 2; const x = L + 0.75, z = front - 3.2;
  const d = deskSet(g, x, z, Math.PI / 2, true); DESKS.home = d; X.addCol('home', x - 0.5, x + 0.5, z - 0.95, z + 0.95);
  X.zone('home', x + 1.4, z, 1.6, () => (X.P() && X.P().laptop ? tx({ en: 'Code on your laptop (free)', hi: 'Laptop pe code karo (free)' }) : tx({ en: 'No laptop (buy one: Menu → Startup) · or use Hustle Hub co-working', hi: 'Laptop nahi hai (Menu → Startup se lo) · ya Hustle Hub co-working jao' })), () => sitAndCode('home'));
}

// ---------------------------------------------------------------- the editor on the screen
const ED = { file: 'README.md', lines: [], shown: 0, files: [], term: [], bug: false, typing: null, chat: [], name: '', dirty: true, blink: 0 };
const KW = /\b(import|from|export|default|function|const|let|return|async|await|if|throw|new|for|of)\b/g;
function drawScreen(su) {
  if (!screenCanvas) return; const c = screenCanvas.getContext('2d'), W = SCR.W, H = SCR.H; ED.dirty = false;
  c.fillStyle = '#1e1f24'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#2b2d34'; c.fillRect(0, 0, W, 30); for (const [i, col] of [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].entries()) { c.fillStyle = col[0]; c.beginPath(); c.arc(16 + i * 18, 15, 6, 0, 7); c.fill(); }
  c.fillStyle = '#c8ccd4'; c.font = '600 15px monospace'; c.textAlign = 'center'; c.fillText((ED.name || 'my-app') + ' — VibeCode AI', W * 0.38, 20); c.textAlign = 'left';
  // file tree
  c.fillStyle = '#25272d'; c.fillRect(0, 30, 150, H - 30); c.fillStyle = '#8b93a1'; c.font = '600 13px monospace'; c.fillText('EXPLORER', 12, 52);
  ['README.md', ...ED.files].forEach((f, i) => { c.fillStyle = f === ED.file ? '#3b3f48' : 'transparent'; c.fillRect(0, 62 + i * 22, 150, 22); c.fillStyle = f === ED.file ? '#ffffff' : '#aab2bf'; c.font = '15px monospace'; c.fillText((f.endsWith('x') ? '⚛ ' : f.endsWith('css') ? '# ' : '◆ ') + f, 12, 78 + i * 22); });
  // editor
  const ex = 150, ew = 470, eh = H - 30 - 170; c.fillStyle = '#2b2d34'; c.fillRect(ex, 30, ew, 26); c.fillStyle = '#1e1f24'; c.fillRect(ex, 30, 140, 26); c.fillStyle = '#e6e6e6'; c.font = '14px monospace'; c.fillText(ED.file, ex + 12, 48);
  let left = ED.shown; c.font = '19px monospace';
  for (let i = 0; i < ED.lines.length && left > 0; i++) { const y = 84 + i * 26; if (y > 30 + eh) break; const full = ED.lines[i], s = full.slice(0, left); left -= full.length + 1;
    c.fillStyle = '#5c6370'; c.textAlign = 'right'; c.fillText(String(i + 1), ex + 30, y); c.textAlign = 'left'; drawCode(c, s, ex + 42, y);
    if (left <= 0 && Math.floor(ED.blink * 2) % 2 === 0) { c.fillStyle = '#ffffff'; c.fillRect(ex + 42 + c.measureText(s).width + 1, y - 17, 10, 21); } }
  if (ED.bug) { c.strokeStyle = '#ff5370'; c.lineWidth = 2; const y = 84 + Math.min(ED.lines.length - 1, 3) * 26 + 5; c.beginPath(); for (let x = ex + 42; x < ex + 380; x += 6) c.lineTo(x, y + ((x / 6) % 2 ? 3 : 0)); c.stroke(); }
  // terminal
  const ty = 30 + eh; c.fillStyle = '#16171b'; c.fillRect(ex, ty, ew, 170); c.fillStyle = '#8b93a1'; c.font = '600 13px monospace'; c.fillText('TERMINAL', ex + 12, ty + 20);
  ED.term.slice(-5).forEach((l, i) => { c.fillStyle = l.c || '#c3e88d'; c.font = '17px monospace'; c.fillText(l.t.slice(0, 44), ex + 12, ty + 46 + i * 24); });
  // the app taking shape on a phone
  const px = 650, pw = 340, py = 44, ph = H - 64; c.fillStyle = '#0b0c0f'; rr(c, px, py, pw, ph, 34); c.fill(); c.fillStyle = '#f7f5f0'; rr(c, px + 12, py + 14, pw - 24, ph - 28, 24); c.fill();
  const I = su ? S.idea(su.idea) : null; c.fillStyle = '#0f766e'; rr(c, px + 12, py + 14, pw - 24, 70, 24); c.fill(); c.fillRect(px + 12, py + 60, pw - 24, 24);
  c.fillStyle = '#ffffff'; c.font = '800 24px sans-serif'; c.fillText(ED.name || 'My App', px + 30, py + 56); c.font = '13px sans-serif'; c.fillStyle = '#ccfbf1'; c.fillText(I ? tx({ en: I.en, hi: I.hi }) : '', px + 30, py + 76);
  const feats = su ? su.feats : []; feats.forEach((id, i) => { const f = S.feature(id); const fx = px + 26 + (i % 2) * 148, fy = py + 104 + Math.floor(i / 2) * 64; c.fillStyle = (I && I.core.includes(id)) ? '#fef3c7' : '#e7eef7'; rr(c, fx, fy, 138, 54, 12); c.fill(); c.fillStyle = '#1b1410'; c.font = '700 17px sans-serif'; c.fillText(tx({ en: f.en, hi: f.hi }).slice(0, 14), fx + 10, fy + 34); });
  if (!feats.length) { c.fillStyle = '#94a3b8'; c.font = '15px sans-serif'; c.fillText(lang() === 'en' ? 'Your app appears here' : 'Tumhara app yahan dikhega', px + 60, py + 200); }
  const q = su ? S.quality(su) : 0; c.fillStyle = '#e2e8f0'; rr(c, px + 26, py + ph - 70, pw - 52, 14, 7); c.fill(); c.fillStyle = q >= 80 ? '#16a34a' : q >= 55 ? '#f59e0b' : '#ef4444'; rr(c, px + 26, py + ph - 70, (pw - 52) * q / 100, 14, 7); c.fill();
  c.fillStyle = '#334155'; c.font = '600 13px sans-serif'; c.fillText((lang() === 'en' ? 'Quality ' : 'Quality ') + q + '/100', px + 26, py + ph - 80);
  screenTex.needsUpdate = true;
}
function drawCode(c, s, x, y) { // tiny syntax colouring
  if (/^\s*\/\//.test(s)) { c.fillStyle = '#7f8c98'; c.fillText(s, x, y); return; }
  const parts = s.split(/("[^"]*"?|`[^`]*`?|\/\/.*$)/); let cx = x;
  for (const p of parts) { if (!p) continue; if (/^["`]/.test(p)) { c.fillStyle = '#c3e88d'; c.fillText(p, cx, y); cx += c.measureText(p).width; continue; } if (/^\/\//.test(p)) { c.fillStyle = '#7f8c98'; c.fillText(p, cx, y); cx += c.measureText(p).width; continue; }
    const toks = p.split(/(\b(?:import|from|export|default|function|const|let|return|async|await|if|throw|new|for|of)\b)/); for (const t of toks) { if (!t) continue; c.fillStyle = KW.test(t) ? '#c792ea' : /^\s*[A-Z]/.test(t) ? '#ffcb6b' : '#e6e6e6'; KW.lastIndex = 0; c.fillText(t, cx, y); cx += c.measureText(t).width; } }
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function typeLines(file, lines, then) { ED.file = file; if (!ED.files.includes(file)) ED.files.push(file); ED.lines = lines; ED.shown = 0; ED.typing = { then, speed: 90 + Math.random() * 40 }; ED.dirty = true; }

// ---------------------------------------------------------------- sitting down to code
let CODE = null; // { where, su, busy }
async function sitAndCode(where) {
  if (CODE || X.G().seat) return; const P = X.P(); if (!P) return;
  if (!P.su || !P.su.idea) { const g = await X.net.req('su', { op: 'get' }); if (g && g.ok) { setSu(g.su); P.laptop = g.laptop; } } // the cached profile can be a step behind
  if (!P.su || !P.su.idea || (P.su.launched && P.su.dealDone)) return openStartup(true);
  if (P.su.launched) { X.toast(lang() === 'en' ? P.su.name + ' is already live. Call investors from the phone.' : P.su.name + ' live ho chuka. Phone se investors ko call karo.'); return; }
  const r = await X.net.req('su', { op: 'sit' }); if (!r.ok) { X.toast(r.error, 'bad'); X.A.sfx('err'); return; }
  setSu(r.su); const d = DESKS[where]; if (!d) return; d.g.updateMatrixWorld(true);
  const seat = local(d.g, 0, 0, 0.95 - SIT); // hips over the chair, not through its back
  const scr = d.laptop.userData.screen; scr.updateMatrixWorld(true); const sp = scr.getWorldPosition(new THREE.Vector3());
  const back = local(d.g, 0.38, 1.78, 1.2), wide = local(d.g, 1.9, 2.5, 2.9); // a wide shot of you sitting down, then just over the right shoulder
  const cam = { p: wide.clone(), t: seat.clone().setY(1.4) }; X.seat({ x: seat.x, z: seat.z, y: -0.12, r: d.g.rotation.y + Math.PI }, cam); X.snapCam && X.snapCam();
  setTimeout(() => { if (CODE) { cam.p.copy(back); cam.t.copy(sp).add(new THREE.Vector3(0, -0.1, 0)); } }, 1800); // aimed a little low so the screen sits above the panel
  CODE = { where, busy: false, desk: d }; if (d.sign) d.sign.visible = d.ring.visible = false; ED.name = r.su.name; ED.files = ED.files.length && ED.name === r.su.name ? ED.files : []; ED.term = [{ t: '$ npx create-app ' + slug(r.su.name), c: '#89ddff' }, { t: '✓ ready on http://localhost:3000' }];
  if (!r.su.feats.length) typeLines('README.md', ['# ' + r.su.name, '', '> ' + tx(S.idea(r.su.idea).pitch).slice(0, 52), '', '## Must-haves', ...S.idea(r.su.idea).core.map(id => '- [ ] ' + tx({ en: S.feature(id).en, hi: S.feature(id).hi })), '', 'Built with VibeCode AI']);
  else { const f = S.feature(r.su.feats[r.su.feats.length - 1]); typeLines(f.file, f.code, null); ED.shown = 9999; ED.files = r.su.feats.map(id => S.feature(id).file); }
  ED.chat = []; aiSay(say(tx(T.hello), { name: r.su.name, core: S.idea(r.su.idea).core.map(id => tx({ en: S.feature(id).en, hi: S.feature(id).hi })).join(', ') }));
  codeUI(true); X.A.sfx('click');
}
const slug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-app';
const say = S.say;
function setSu(su) { const P = X.P(); if (P) P.su = su; }
function aiSay(text, who) { ED.chat.push({ who: who || 'ai', text }); ED.chat = ED.chat.slice(-6); renderChat(); }
function renderChat() { const box = document.getElementById('suChat'); if (!box) return; box.textContent = ''; for (const m of ED.chat) box.append(X.el('div', { class: 'sumsg ' + m.who }, X.el('b', { text: m.who === 'me' ? (lang() === 'en' ? 'You' : 'Tum') : 'AI' }), ' ' + m.text)); box.scrollTop = box.scrollHeight; }
function hints(su) { const I = S.idea(su.idea), have = new Set(su.feats); const order = [...I.core, ...S.FEATURES.map(f => f.id).filter(id => !I.core.includes(id))]; return order.filter(id => !have.has(id)).slice(0, 5).map(id => S.feature(id)); }
function codeUI(on) {
  let box = document.getElementById('suCode'); if (!on) { if (box) box.remove(); return; }
  if (box) box.remove(); const su = X.P().su;
  box = X.el('div', { id: 'suCode', class: 'supanel' });
  const chat = X.el('div', { id: 'suChat', class: 'suchat' }); const inp = X.el('input', { id: 'suIn', type: 'text', maxlength: '140', placeholder: tx(T.promptPh), autocomplete: 'off' });
  const sendB = X.el('button', { class: 'buy', text: tx(T.send), onclick: () => sendPrompt() }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendPrompt(); } if (e.key === 'Escape') { inp.blur(); } e.stopPropagation(); });
  const chips = X.el('div', { id: 'suChips', class: 'suchips' }); const prog = X.el('div', { id: 'suProg', class: 'suprog' });
  const launchB = X.el('button', { id: 'suLaunch', class: 'buy', text: tx(T.launch), onclick: () => launch() }); const exitB = X.el('button', { class: 'buy alt', text: tx(T.exit), onclick: () => standUp() });
  box.append(chat, X.el('div', { class: 'surow' }, inp, sendB), chips, X.el('div', { class: 'surow' }, prog, launchB, exitB)); document.body.append(box); renderChat(); refreshCodeUI(su);
  setTimeout(() => { if (!matchMedia('(pointer: coarse)').matches) inp.focus(); }, 300);
}
function refreshCodeUI(su) {
  const chips = document.getElementById('suChips'), prog = document.getElementById('suProg'), lb = document.getElementById('suLaunch'); if (!chips) return;
  chips.textContent = ''; for (const f of hints(su)) { const core = S.idea(su.idea).core.includes(f.id); chips.append(X.el('button', { class: 'suchip' + (core ? ' core' : ''), text: (core ? '★ ' : '+ ') + tx({ en: f.en, hi: f.hi }), onclick: () => { const i = document.getElementById('suIn'); i.value = (lang() === 'en' ? 'add ' : '') + f.keys[0] + (lang() === 'en' ? '' : ' daalo'); sendPrompt(); } })); }
  const I = S.idea(su.idea); prog.textContent = (lang() === 'en' ? 'Features ' : 'Features ') + su.feats.length + '/' + S.NEED_FEATS + ' · ' + I.core.map(c => (su.feats.includes(c) ? '✓ ' : '✗ ') + tx({ en: S.feature(c).en, hi: S.feature(c).hi })).join(' · ') + ' · Q ' + S.quality(su);
  lb.disabled = !S.canLaunch(su) || ED.bug || CODE.busy;
}
async function sendPrompt() {
  const inp = document.getElementById('suIn'); if (!inp || !CODE || CODE.busy) return; const text = inp.value.trim(); if (!text) return; inp.value = ''; aiSay(text, 'me'); const su = X.P().su;
  if (ED.bug) { if (!S.isFix(text)) return aiSay(tx(T.fixFirst)); CODE.busy = true; refreshCodeUI(su); ED.term.push({ t: '$ vibe fix --auto', c: '#89ddff' }); typeLines(ED.file, [...ED.lines.slice(0, 3), '  // fixed: guard against missing data', '  if (!data) return [];', ...ED.lines.slice(3)], () => { ED.bug = false; ED.term.push({ t: '✓ 12 tests passed' }); aiSay(tx(T.fixed)); CODE.busy = false; refreshCodeUI(X.P().su); X.A.sfx('cash', 0.3); }); return; }
  const f = S.featureFor(text, su.feats);
  if (!f) { const all = S.featureFor(text, []); if (all) return aiSay(say(tx(T.dup), { f: tx({ en: all.en, hi: all.hi }) })); return aiSay(say(tx(T.unknown), { ideas: hints(su).map(h => '"' + h.keys[0] + '"').join(', ') })); }
  CODE.busy = true; refreshCodeUI(su); aiSay(tx(T.wait)); ED.term.push({ t: '$ vibe "' + text.slice(0, 34) + '"', c: '#89ddff' });
  const r = await X.net.req('su', { op: 'feat', f: f.id }); if (!r.ok) { CODE.busy = false; aiSay(r.error); refreshCodeUI(su); return; }
  typeLines(f.file, f.code, () => { setSu(r.su); ED.term.push({ t: '✓ compiled ' + f.file + ' (' + (40 + Math.floor(Math.random() * 90)) + ' ms)' }); CODE.busy = false;
    const n = r.su.feats.length; if (n === 3 || n === 5) { ED.bug = true; ED.term.push({ t: 'TypeError: Cannot read properties of undefined', c: '#ff5370' }); ED.term.push({ t: '    at ' + f.file + ':4:18', c: '#ff5370' }); aiSay(tx(T.bug)); X.A.sfx('err'); }
    else { aiSay(say(tx(T.built), { f: tx({ en: f.en, hi: f.hi }), file: f.file })); if (S.canLaunch(r.su) && !CODE.readySaid) { CODE.readySaid = true; aiSay(tx(T.ready)); } X.A.sfx('click'); }
    refreshCodeUI(r.su); });
}
async function launch() {
  if (!CODE || ED.bug) return; const r = await X.net.req('su', { op: 'launch' }); if (!r.ok) { aiSay(r.error); return; } setSu(r.su);
  ED.term.push({ t: '$ vibe deploy --prod', c: '#89ddff' }, { t: '🚀 live at https://' + slug(r.su.name) + '.app' }); ED.dirty = true; aiSay(say(tx(T.launched), { name: r.su.name })); X.A.sfx('level');
  setTimeout(() => { standUp(); X.toast('🚀 ' + r.su.name + ' launch! Menu → Startup → investors ko call karo', 'good'); }, 2600);
}
function standUp() { codeUI(false); if (CODE && CODE.desk.sign) CODE.desk.sign.visible = CODE.desk.ring.visible = true; CODE = null; X.unseat(); }

// ---------------------------------------------------------------- the phone app
export function openStartup(fromDesk) {
  const P = X.P(); X.net.req('su', { op: 'get' }).then(r => { if (r && r.ok) { setSu(r.su); P.laptop = r.laptop; } render(); }); render();
  function render() {
    const su = P.su || {}; X.openModal('Startup 💻', lang() === 'en' ? 'Build a product, call investors, pitch, raise money' : 'Product banao, investors ko call karo, pitch do, funding lo', b => {
      const I = su.idea ? S.idea(su.idea) : null;
      if (I) b.append(X.el('div', { class: 'sucard' }, X.el('b', { text: su.name + ' · ' + tx({ en: I.en, hi: I.hi }) }), X.el('p', { text: (su.launched ? '🚀 Live' : '🛠 ' + (lang() === 'en' ? 'Building' : 'Ban raha hai')) + ' · ' + su.feats.length + ' features · Quality ' + S.quality(su) + '/100' + (su.dealDone ? ' · 💰 Funded' : '') }), X.el('p', { class: 'small', text: (lang() === 'en' ? 'Founder equity ' : 'Tumhari equity ') + su.equity + '% · ' + (lang() === 'en' ? 'Raised ' : 'Funding ') + X.fmt(su.raised || 0) + ' · ' + (lang() === 'en' ? 'Products launched ' : 'Launch kiye ') + (su.products || 0) })));
      // where to code
      const home = P.home !== 'street' && P.laptop; b.append(X.el('h3', { text: lang() === 'en' ? '1 · Code your product' : '1 · Product code karo' }));
      b.append(X.itemRow('🏠 ' + (lang() === 'en' ? 'At home, on your laptop' : 'Ghar pe, apne laptop pe'), home ? (lang() === 'en' ? 'Free. Walk to the desk at home and press E.' : 'Free. Ghar ki desk pe jaake E dabao.') : (P.laptop ? (lang() === 'en' ? 'You need a room (not the footpath).' : 'Room chahiye (footpath nahi).') : (lang() === 'en' ? 'You need your own laptop and a room.' : 'Apna laptop aur room chahiye.')), lang() === 'en' ? 'Go home' : 'Ghar jao', () => { X.closeModal(); X.goHome(); }, !home));
      b.append(X.itemRow('🏢 ' + T.coworkName, (lang() === 'en' ? 'Anyone can code here: hot desk ' : 'Koi bhi yahan code kar sakta hai: hot desk ') + X.fmt(S.COWORK_FEE) + (lang() === 'en' ? ' per sitting.' : ' har baar.'), 'GPS', () => { X.closeModal(); X.gps('cowork', T.coworkName); }));
      if (!P.laptop) b.append(X.itemRow('💻 ' + (lang() === 'en' ? 'Buy a laptop' : 'Laptop kharido'), (lang() === 'en' ? 'Code at home for free (needs a room).' : 'Ghar pe free code karo (room chahiye).'), X.fmt(S.LAPTOP_PRICE), async () => { const r = await X.net.req('su', { op: 'laptop' }); if (!r.ok) { X.toast(r.error, 'bad'); X.A.sfx('err'); return; } X.A.sfx('cash'); P.laptop = true; setSu(r.su); X.toast('💻 Laptop aa gaya!', 'good'); render(); }, P.money < S.LAPTOP_PRICE));
      if (!I || su.dealDone) ideaPicker(b, su);
      // investors
      b.append(X.el('h3', { text: lang() === 'en' ? '2 · Call investors' : '2 · Investors ko call karo' }));
      for (const v of S.INVESTORS) b.append(X.itemRow('📞 ' + v.name + ' (' + v.who + ')', tx(v.line) + ' · ' + (lang() === 'en' ? 'Up to ' : 'Max ') + X.fmt(v.cheque) + (su.meet && su.meet.inv === v.id ? ' · ✅ ' + (lang() === 'en' ? 'Meeting today' : 'Aaj meeting') : ''), lang() === 'en' ? 'Call' : 'Call karo', () => callInvestor(v), !su.launched));
      if (su.meet) b.append(X.itemRow('📍 ' + T.vcName, lang() === 'en' ? 'Your meeting is waiting in the boardroom.' : 'Boardroom mein meeting intezaar kar rahi hai.', 'GPS', () => { X.closeModal(); X.gps('vc', T.vcName); }));
      if ((su.deals || []).length) { b.append(X.el('h3', { text: lang() === 'en' ? 'Deals' : 'Deals' })); for (const d of su.deals.slice().reverse()) b.append(X.el('p', { class: 'small', text: '🤝 ' + d.name + ' → ' + d.product + ': ' + X.fmt(d.amount) + ' for ' + d.equity + '% · ' + d.day })); }
    });
  }
  function ideaPicker(b, su) {
    b.append(X.el('h3', { text: su.dealDone ? (lang() === 'en' ? 'Start your next product' : 'Agla product shuru karo') : (lang() === 'en' ? 'Pick an idea' : 'Idea chuno') }));
    const nameIn = X.el('input', { type: 'text', maxlength: '18', placeholder: lang() === 'en' ? 'Product name (e.g. ParkKaro)' : 'Product ka naam (jaise ParkKaro)', class: 'suname' }); nameIn.addEventListener('keydown', e => e.stopPropagation());
    const ownIn = X.el('input', { type: 'text', maxlength: '80', placeholder: lang() === 'en' ? 'Your own idea in one line (for "My own idea")' : 'Apni idea ek line mein ("Meri apni idea" ke liye)', class: 'suname' }); ownIn.addEventListener('keydown', e => e.stopPropagation());
    b.append(nameIn);
    for (const I of S.IDEAS) b.append(X.itemRow(tx({ en: I.en, hi: I.hi }), I.id === 'own' ? (lang() === 'en' ? 'Describe it below' : 'Neeche likho') : tx(I.pitch), lang() === 'en' ? 'Choose' : 'Chuno', async () => { const r = await X.net.req('su', { op: 'idea', idea: I.id, name: nameIn.value, pitch: ownIn.value }); if (!r.ok) { X.toast(r.error, 'bad'); X.A.sfx('err'); nameIn.focus(); return; } setSu(r.su); X.A.sfx('click'); X.toast('💡 ' + r.su.name + (lang() === 'en' ? ': now sit at a laptop and build it' : ': ab laptop pe baith ke banao'), 'good'); X.closeModal(); if (fromDesk) sitAndCode(X.G().inside === 'home' ? 'home' : 'cowork'); }));
    b.append(ownIn);
  }
  async function callInvestor(v) {
    X.closeModal(); X.toast('📞 ' + v.name + '… tring tring'); let rings = 0; const ring = setInterval(() => { if (++rings > 3) clearInterval(ring); X.A.sfx('beep'); }, 600);
    const r = await X.net.req('su', { op: 'call', inv: v.id }); await new Promise(res => setTimeout(res, 2000)); clearInterval(ring); if (!r.ok) { X.toast(r.error, 'bad'); return; } setSu(r.su);
    const c = r.call; const line = say(tx(c.line), { office: v.office, who: v.who }); const yes = c.key === 'yes';
    X.card('📞 ' + v.who + ' · ' + v.name, line, yes ? [['GPS: ' + T.vcName, () => X.gps('vc', T.vcName)], [tx(T.ok), () => {}, 'alt2']] : [[tx(T.ok), () => {}]]);
  }
}

// ---------------------------------------------------------------- the pitch
let PITCH = null;
function drawTV(su, extra) {
  if (!boardroom) return; const c = boardroom.tvC.getContext('2d'), W = 1024, H = 576; c.fillStyle = '#0f172a'; c.fillRect(0, 0, W, H);
  if (!su) { c.fillStyle = '#e2e8f0'; c.font = '800 64px sans-serif'; c.textAlign = 'center'; c.fillText('SKYLINE TOWER', W / 2, H / 2 - 10); c.font = '28px sans-serif'; c.fillStyle = '#94a3b8'; c.fillText(S.INVESTORS.map(v => v.name).join('  ·  '), W / 2, H / 2 + 40); c.textAlign = 'left'; boardroom.tvT.needsUpdate = true; return; }
  const I = S.idea(su.idea); c.fillStyle = '#0f766e'; c.fillRect(0, 0, W, 120); c.fillStyle = '#ffffff'; c.font = '800 60px sans-serif'; c.fillText(su.name, 50, 82); c.font = '26px sans-serif'; c.fillStyle = '#ccfbf1'; c.fillText(tx(I.pitch).slice(0, 60), 50, 112);
  c.fillStyle = '#e2e8f0'; c.font = '700 30px sans-serif'; c.fillText(lang() === 'en' ? 'What it does' : 'Kya karta hai', 50, 180);
  su.feats.slice(0, 8).forEach((id, i) => { const f = S.feature(id); c.fillStyle = '#1e293b'; c.fillRect(50 + (i % 2) * 330, 200 + Math.floor(i / 2) * 64, 310, 52); c.fillStyle = '#f8fafc'; c.font = '24px sans-serif'; c.fillText('✓ ' + tx({ en: f.en, hi: f.hi }), 66 + (i % 2) * 330, 234 + Math.floor(i / 2) * 64); });
  c.fillStyle = '#f6c026'; c.font = '800 40px sans-serif'; c.fillText('Q ' + S.quality(su) + '/100', 760, 240); c.fillStyle = '#94a3b8'; c.font = '24px sans-serif'; c.fillText(lang() === 'en' ? 'Product score' : 'Product score', 760, 275);
  if (extra) { c.fillStyle = '#f8fafc'; c.font = '700 34px sans-serif'; c.fillText(extra, 760, 380); }
  boardroom.tvT.needsUpdate = true;
}
async function startPitch() {
  if (PITCH || X.G().seat) return; const P = X.P(); const su = P.su; if (!su || !su.meet) { X.toast(lang() === 'en' ? 'No meeting. Call an investor from the phone first.' : 'Meeting nahi hai. Pehle phone se investor ko call karo.', 'bad'); return; }
  const r = await X.net.req('su', { op: 'pitchstart' }); if (!r.ok) { X.toast(r.error, 'bad'); return; } setSu(r.su);
  const v = S.investor(r.inv); const B = boardroom; B.g.updateMatrixWorld(true);
  for (const p of B.plates) X.disposeSprite(p); B.plates = [X.labelSprite(v.who + ' · ' + v.name, { fs: 26, scale: 0.3, bg: 'rgba(15,118,110,.92)' })]; B.plates[0].position.set(B.invSeats[0].x, 2.75, B.invSeats[0].z); B.g.add(B.plates[0]);
  if (B.invs[0]) B.g.remove(B.invs[0]); B.invs[0] = seatInvestor(B.g, B.invSeats[0], INV_G[v.id] || 'm', v.id === 'skyline');
  drawTV(su);
  X.seat({ x: B.me.x, z: B.me.z - SIT, y: -0.1, r: Math.PI }, { p: new THREE.Vector3(B.me.x + 1.4, 2.7, B.me.z + 2.6), t: new THREE.Vector3(B.bx0 - 0.3, 1.9, B.bz0 - 2.4) });
  PITCH = { inv: v, qs: r.qs, i: 0, a: [], marks: [], t0: Date.now() }; pitchUI(); X.A.sfx('click');
  X.say(B.invs[0], lang() === 'en' ? 'Welcome! Let\'s begin.' : 'Aao baitho! Shuru karte hain.', 3);
}
function pitchUI() {
  let box = document.getElementById('suPitch'); if (box) box.remove(); if (!PITCH) return;
  const q = S.question(PITCH.qs[PITCH.i]); const v = PITCH.inv;
  box = X.el('div', { id: 'suPitch', class: 'supanel pitch' });
  const ta = X.el('textarea', { id: 'suAns', maxlength: '500', rows: '3', placeholder: tx(T.answerPh) }); ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); answer(); } });
  box.append(X.el('p', { class: 'small', text: say(tx(T.qOf), { i: PITCH.i + 1, n: PITCH.qs.length }) + ' · ' + v.who + ', ' + v.name }), X.el('div', { class: 'suq', text: '“' + (lang() === 'en' ? q.en : q.hi) + '”' }), ta,
    X.el('div', { class: 'surow' }, X.el('span', { id: 'suCount', class: 'small', text: '0' }), X.el('button', { class: 'buy', text: tx(T.submit), onclick: () => answer() }), X.el('button', { class: 'buy alt', text: tx(T.walk), onclick: () => endPitch() })));
  ta.addEventListener('input', () => { document.getElementById('suCount').textContent = ta.value.trim().split(/\s+/).filter(Boolean).length + (lang() === 'en' ? ' words' : ' shabd'); });
  if (PITCH.last) box.prepend(X.el('p', { class: 'small sureact', text: '💬 ' + PITCH.last })); document.body.append(box); setTimeout(() => ta.focus(), 200);
}
async function answer() {
  const ta = document.getElementById('suAns'); if (!ta || !PITCH) return; const a = ta.value.trim(); if (!a) { ta.focus(); return; }
  const q = S.question(PITCH.qs[PITCH.i]); const m = S.scoreAnswer(q, a, X.P().su, PITCH.a); PITCH.a.push(a); PITCH.marks.push(m.s);
  const bank = S.LINES.react[lang()].find(([min]) => m.s >= min)[1]; const re = bank[Math.floor(Math.random() * bank.length)]; PITCH.last = (PITCH.i % 3 === 1 ? 'Partner' : PITCH.inv.who) + ': ' + re; X.say(boardroom.invs[PITCH.i % 3 === 1 ? 1 : 0], re, 2.2); X.A.sfx(m.s >= 8 ? 'cash' : 'click', 0.25);
  PITCH.i++; if (PITCH.i < PITCH.qs.length) { setTimeout(pitchUI, 900); return; }
  document.getElementById('suPitch').remove(); X.toast(tx(T.thinking)); X.say(boardroom.invs[1], lang() === 'en' ? '(whispers) What do you think?' : '(dheere se) Kya lagta hai?', 2.4);
  await new Promise(res => setTimeout(res, Math.max(2500, 21000 - (Date.now() - PITCH.t0)))); // the server wants at least 20 s of pitching
  const r = await X.net.req('su', { op: 'pitch', a: PITCH.a }); if (!r.ok) { X.toast(r.error, 'bad'); endPitch(); return; } setSu(r.su); result(r);
}
function money(n) { return X.fmt(n); }
function result(r) { try { window.__suLast = { ...r, a: PITCH.a.slice(), qs: PITCH.qs }; } catch {} // for tests
  const d = r.decision, v = PITCH.inv, avg = (r.marks.reduce((s, x) => s + x.s, 0) / r.marks.length).toFixed(1); const L = S.LINES;
  const summary = (lang() === 'en' ? 'Your pitch score: ' : 'Tumhara pitch score: ') + avg + '/10 · ' + (lang() === 'en' ? 'They think it\'s worth ' : 'Unke hisaab se value ') + money(d.worth);
  drawTV(X.P().su, avg + '/10');
  if (d.kind === 'pass') { X.say(boardroom.invs[0], tx(L.pass[d.why]), 5); X.card('🙅 ' + v.name, tx(L.pass[d.why]), [[tx(T.ok), () => endPitch()]], summary); return; }
  const line = say(tx(d.kind === 'deal' ? L.deal : d.why === 'noask' ? L.noask : L.counter), { amount: money(d.amount), equity: d.equity }); X.say(boardroom.invs[0], line, 5);
  offerCard(line, summary, d.kind !== 'deal');
}
function offerCard(line, summary, canCounter) {
  const v = PITCH.inv; const acts = [[tx(T.accept), () => deal('accept')]];
  if (canCounter) acts.push([tx(T.counter), () => counterBox(line, summary), 'alt']);
  acts.push([tx(T.walk), () => deal('walk'), 'alt2']); X.card('💼 ' + v.name, line, acts, summary);
}
function counterBox(line, summary) { // type the equity you'd give instead
  X.openModal(tx(T.counter), line, b => { const inp = X.el('input', { type: 'number', min: '1', max: '99', step: '0.5', placeholder: tx(T.counterPh), class: 'suname' }); inp.addEventListener('keydown', e => e.stopPropagation());
    b.append(inp, X.el('div', { class: 'surow' }, X.el('button', { class: 'buy', text: tx(T.counter), onclick: () => { const e = parseFloat(inp.value); if (!(e > 0 && e < 100)) { inp.focus(); return; } X.closeModal(); deal('counter', e); } }), X.el('button', { class: 'buy alt', text: lang() === 'en' ? 'Back' : 'Wapas', onclick: () => { X.closeModal(); offerCard(line, summary, true); } })));
    setTimeout(() => inp.focus(), 100); });
}
async function deal(kind, equity) {
  const r = await X.net.req('su', { op: 'deal', do: kind, equity }); if (!r.ok) { X.toast(r.error, 'bad'); return endPitch(); } setSu(r.su); const L = S.LINES;
  if (kind === 'walk') { X.say(boardroom.invs[0], lang() === 'en' ? 'Your call. Good luck!' : 'Tumhari marzi. All the best!', 3); return endPitch(); }
  if (kind === 'counter') { const o = r.offer; const line = say(tx(r.counter === 'yes' ? L.deal : L.final), { amount: money(o.amount), equity: o.equity }); X.say(boardroom.invs[0], line, 4); if (r.counter === 'yes') { X.card('🤝 ' + PITCH.inv.name, line, [[tx(T.accept), () => deal('accept')], [tx(T.walk), () => deal('walk'), 'alt2']]); } else offerCard(line, '', false); return; }
  const dl = r.deal; X.A.sfx('level'); X.confetti && X.confetti(); X.say(boardroom.invs[0], lang() === 'en' ? 'Welcome to the family! 🤝' : 'Family mein swagat hai! 🤝', 4);
  X.card('🎉 ' + (lang() === 'en' ? 'Funded!' : 'Funding mil gayi!'), dl.name + ' → ' + dl.product + ': ' + money(dl.amount) + ' for ' + dl.equity + '%', [[tx(T.ok), () => endPitch()]], (lang() === 'en' ? 'Your equity now: ' : 'Ab tumhari equity: ') + r.su.equity + '% · ' + (lang() === 'en' ? 'Next: build another product and pitch bigger funds.' : 'Aage: agla product banao, bade investors ko pitch karo.'));
}
function endPitch() { const b = document.getElementById('suPitch'); if (b) b.remove(); PITCH = null; X.unseat(); drawTV(null); }

// ---------------------------------------------------------------- per frame
export function tick(dt) {
  if (!CODE) return; ED.blink += dt;
  if (ED.typing) { const total = ED.lines.join('\n').length; ED.shown = Math.min(total, ED.shown + ED.typing.speed * dt); ED.dirty = true; if (ED.shown >= total) { const t = ED.typing; ED.typing = null; if (t.then) t.then(); } }
  if (ED.dirty || Math.floor(ED.blink * 2) !== Math.floor((ED.blink - dt) * 2)) drawScreen(X.P().su);
}
export const busy = () => !!(CODE || PITCH);
export function leave() { if (CODE) standUp(); if (PITCH) endPitch(); }
export function init(ctx) { X = ctx; }
