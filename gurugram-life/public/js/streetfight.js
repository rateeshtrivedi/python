// Street fight mode: when you reach a Gali ke Don boss, the brawl turns into a face-to-face fight, side-on like a
// fighting game: health bars, rounds, a clock, and three martial arts (Kung Fu, Karate, Judo) for both fighters.
// The rules live in shared/fight.js; this file poses the fighters (limbs aimed in the body's own frame, so it works on
// the MakeHuman rig whatever its bone axes), runs the rounds, the opponent's AI, the HUD and the touch buttons.
import * as THREE from 'three';
import * as F from '../shared/fight.js';

let X = null; // the game's helpers (init)
const lang = () => (X.lang() === 'en' ? 'en' : 'hi');
const tx = o => (o && typeof o === 'object' ? o[lang()] || o.en : o);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ---------------------------------------------------------------- posing
// A pose names limb directions in the fighter's own frame: x = their left, y = up, z = forward. Numbers: drop (crouch,
// m), lean (forward, rad), twist (shoulders to their left, rad), yaw (whole body turn, rad), lift (hop, m).
const LIMBS = [['thighL', 'LeftUpLeg', 'LeftLeg'], ['shinL', 'LeftLeg', 'LeftFoot'], ['thighR', 'RightUpLeg', 'RightLeg'], ['shinR', 'RightLeg', 'RightFoot'],
  ['armL', 'LeftArm', 'LeftForeArm'], ['foreL', 'LeftForeArm', 'LeftHand'], ['armR', 'RightArm', 'RightForeArm'], ['foreR', 'RightForeArm', 'RightHand']];
const NUMS = ['drop', 'lean', 'twist', 'yaw', 'lift', 'roll'];
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), va = V(0, 0, 0), vb = V(0, 0, 0), vc = V(0, 0, 0);
function frameOf(yaw) { const f = V(Math.sin(yaw), 0, Math.cos(yaw)), l = V(Math.cos(yaw), 0, -Math.sin(yaw)); return { f, l }; }
const toWorld = (d, fr) => V(0, 0, 0).addScaledVector(fr.l, d.x).addScaledVector(UP, d.y).addScaledVector(fr.f, d.z).normalize();
function setWorldQ(bone, q) { bone.parent.getWorldQuaternion(qb).invert(); bone.quaternion.copy(qb.multiply(q)); bone.updateMatrixWorld(true); }
function aimBone(bone, child, want, w) {
  bone.getWorldPosition(va); child.getWorldPosition(vb); vc.subVectors(vb, va).normalize();
  const target = w >= 1 ? want : vc.clone().lerp(want, w).normalize();
  qa.setFromUnitVectors(vc, target); bone.getWorldQuaternion(qc); setWorldQ(bone, qa.multiply(qc));
}
function rotBone(bone, axis, ang) { if (!ang) return; qa.setFromAxisAngle(axis, ang); bone.getWorldQuaternion(qc); setWorldQ(bone, qa.multiply(qc)); }
function applyPose(fx, pose, w) { // after the animation mixer: bend the spine, then aim each limb the pose names
  const h = fx.ch.userData.human; if (!h || !pose || w <= 0) return; const B = h.bones; fx.ch.updateMatrixWorld(true);
  const fr = frameOf(fx.ch.rotation.y);
  if (pose.lean || pose.twist || pose.roll) for (const n of ['Spine1', 'Spine2']) { const b = B[n]; if (!b) continue; rotBone(b, fr.l, (pose.lean || 0) * 0.5 * w); /* about the body's left axis: positive bends forward */ rotBone(b, UP, (pose.twist || 0) * 0.5 * w); rotBone(b, fr.f, (pose.roll || 0) * 0.5 * w); }
  for (const [k, a, c] of LIMBS) if (pose[k] && B[a] && B[c]) aimBone(B[a], B[c], toWorld(pose[k], fr), w);
}
function mix(a, b, k) { // blend two full poses (limbs as directions)
  const o = {}; for (const n of NUMS) o[n] = (a[n] || 0) + ((b[n] || 0) - (a[n] || 0)) * k;
  for (const [n] of LIMBS) { const p = a[n], q = b[n]; if (p && q) o[n] = p.clone().lerp(q, k).normalize(); else if (p || q) o[n] = (p || q).clone(); }
  return o;
}
function over(key, base) { // a move key on top of the stance: numbers add, limbs the key names replace the stance's
  const o = {}; for (const n of NUMS) o[n] = (base[n] || 0) + (key[n] || 0); for (const [n] of LIMBS) o[n] = key[n] || base[n]; return o;
}
function sample(keys, t, base) { // keys: [[time 0..1, pose], ...] relative to the stance
  if (t <= keys[0][0]) return over(keys[0][1], base); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i]; const k = (t - t0) / (t1 - t0 || 1); return mix(over(a, base), over(b, base), k * k * (3 - 2 * k)); }
  return over(keys[keys.length - 1][1], base);
}
const P = o => { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = Array.isArray(v) ? V(...v).normalize() : v; return r; };

// stances (looping guard per style)
const STANCE = {
  karate: P({ drop: 0.1, lean: 0.05, twist: 0.25, thighL: [0.12, -1, 0.32], shinL: [0.05, -1, -0.05], thighR: [-0.18, -1, -0.3], shinR: [-0.05, -1, -0.32],
    armL: [0.25, -0.55, 0.6], foreL: [-0.05, 0.75, 0.6], armR: [-0.3, -0.85, 0.25], foreR: [0.1, 0.25, 0.95] }),
  kungfu: P({ drop: 0.18, lean: 0.02, twist: 0.35, thighL: [0.4, -1, 0.4], shinL: [0.1, -1, 0.05], thighR: [-0.45, -1, -0.15], shinR: [-0.1, -1, -0.1],
    armL: [0.2, -0.3, 0.8], foreL: [-0.1, 0.9, 0.5], armR: [-0.25, -0.6, 0.5], foreR: [0.3, 0.3, 0.9] }),
  judo: P({ drop: 0.12, lean: 0.18, twist: 0.1, thighL: [0.3, -1, 0.15], shinL: [0.08, -1, 0], thighR: [-0.3, -1, -0.1], shinR: [-0.08, -1, -0.05],
    armL: [0.35, -0.45, 0.75], foreL: [-0.2, 0.15, 1], armR: [-0.35, -0.45, 0.75], foreR: [0.2, 0.15, 1] }),
};
const BLOCK = P({ drop: 0.04, lean: 0.1, twist: -0.15, armL: [0.3, -0.35, 0.75], foreL: [-0.3, 0.9, 0.25], armR: [-0.3, -0.35, 0.75], foreR: [0.3, 0.9, 0.25] }); // both forearms up in front of the face
const WIN = P({ drop: -0.12, armL: [0.3, 0.95, 0.1], foreL: [0.05, 1, 0], armR: [-0.3, -0.9, 0.1], foreR: [0, -1, 0.2] });
const fullR = P({ armR: [-0.05, 0.05, 1], foreR: [-0.02, 0.06, 1] });
// moves: keyframes over the move's whole duration (wind + act + rec), on top of the stance
const MOVES = {
  karate: {
    punch: [[0, P({})], [0.35, P({ twist: -0.6, lean: 0.08, ...fullR, armL: [0.3, -0.8, 0.2], foreL: [0, 0.4, 0.9] })], [0.6, P({ twist: -0.6, lean: 0.08, ...fullR })], [1, P({})]],
    kick: [[0, P({})], [0.25, P({ lean: -0.15, thighR: [-0.1, 0.1, 1], shinR: [-0.1, -0.9, 0.3] })], [0.5, P({ lean: -0.22, thighR: [-0.08, 0.2, 1], shinR: [-0.08, 0.25, 1] })], [0.7, P({ lean: -0.15, thighR: [-0.1, 0.1, 1], shinR: [-0.1, -0.9, 0.3] })], [1, P({})]],
    special: [[0, P({})], [0.45, P({ lean: -0.1, twist: 0.4, armR: [-0.4, 0.9, -0.2], foreR: [-0.1, 1, 0.1] })], [0.62, P({ lean: 0.35, twist: -0.3, armR: [-0.05, -0.3, 1], foreR: [0, -0.35, 1] })], [0.8, P({ lean: 0.3, armR: [-0.05, -0.35, 1], foreR: [0, -0.4, 1] })], [1, P({})]],
  },
  kungfu: {
    punch: [[0, P({})], [0.35, P({ twist: -0.4, lean: 0.1, armR: [-0.05, 0.1, 1], foreR: [0, 0.45, 0.9] })], [0.6, P({ twist: -0.4, lean: 0.1, armR: [-0.05, 0.1, 1], foreR: [0, 0.45, 0.9] })], [1, P({})]],
    kick: [[0, P({})], [0.25, P({ yaw: 1.2, lean: -0.3, thighR: [-1, 0.05, 0.25], shinR: [-0.4, -0.9, 0] })], [0.5, P({ yaw: 1.35, lean: -0.45, roll: 0.2, thighR: [-1, 0.3, 0.1], shinR: [-1, 0.32, 0.05] })], [0.72, P({ yaw: 1.2, lean: -0.3, thighR: [-1, 0.05, 0.25], shinR: [-0.4, -0.9, 0] })], [1, P({})]],
    special: [[0, P({})], [0.12, P({ twist: -0.4, armR: [-0.05, 0.15, 1], foreR: [0, 0.2, 1] })], [0.26, P({ twist: 0.4, armL: [0.05, 0.15, 1], foreL: [0, 0.2, 1] })], [0.4, P({ twist: -0.4, armR: [-0.05, 0.15, 1], foreR: [0, 0.2, 1] })],
      [0.54, P({ twist: 0.4, armL: [0.05, 0.15, 1], foreL: [0, 0.2, 1] })], [0.7, P({ lift: 0.25, lean: -0.3, thighR: [-0.1, 0.35, 1], shinR: [-0.1, 0.4, 1] })], [1, P({})]],
  },
  judo: {
    punch: [[0, P({})], [0.35, P({ twist: -0.3, lean: 0.15, armR: [-0.05, 0.05, 1], foreR: [0, 0.1, 1] })], [0.6, P({ twist: -0.3, lean: 0.15, armR: [-0.05, 0.05, 1], foreR: [0, 0.1, 1] })], [1, P({})]],
    kick: [[0, P({})], [0.3, P({ drop: 0.28, lean: 0.25, thighR: [-0.3, -0.75, 0.6], shinR: [-0.2, -0.9, 0.4] })], [0.5, P({ drop: 0.32, lean: 0.3, thighR: [0.2, -0.75, 0.65], shinR: [0.35, -0.85, 0.4] })], [1, P({})]],
    special: [[0, P({})], [0.15, P({ lean: 0.2, armL: [0.3, 0.1, 1], foreL: [-0.2, 0.2, 1], armR: [-0.3, 0.1, 1], foreR: [0.2, 0.2, 1] })], [0.32, P({ yaw: 2.6, drop: 0.25, lean: 0.75, armL: [0.2, 0.7, 0.4], foreL: [-0.4, 0.6, -0.5], armR: [-0.2, 0.6, 0.5], foreR: [0.3, 0.7, -0.4] })],
      [0.6, P({ yaw: 2.9, drop: 0.3, lean: 1.0, armL: [0.2, -0.3, 0.9], foreL: [0, -0.5, 0.9], armR: [-0.2, -0.3, 0.9], foreR: [0, -0.5, 0.9] })], [1, P({})]],
  },
};

// ---------------------------------------------------------------- the fight
let SF = null; // the running fight
const T = {
  faceoff: { en: 'FACE-OFF!', hi: 'FACE-OFF!' }, pick: { en: 'Choose your fighting style', hi: 'Apna fighting style chuno' },
  vs: { en: 'fights', hi: 'ka style' }, round: { en: 'ROUND', hi: 'ROUND' }, fight: { en: 'FIGHT!', hi: 'FIGHT!' }, ko: { en: 'K.O.!', hi: 'K.O.!' }, time: { en: 'TIME!', hi: 'TIME!' },
  youWin: { en: 'YOU WIN!', hi: 'TU JEET GAYA!' }, youLose: { en: 'YOU LOSE', hi: 'HAAR GAYA' }, perfect: { en: 'PERFECT!', hi: 'PERFECT!' }, draw: { en: 'DRAW', hi: 'BARABAR' },
  keys: { en: 'A/D move · J punch · K kick · L block · I special · Esc run away', hi: 'A/D chalo · J punch · K kick · L block · I special · Esc bhaago' },
  blocked: { en: 'BLOCKED', hi: 'BLOCK' }, broke: { en: 'GUARD BROKEN!', hi: 'GUARD TOOT GAYA!' }, thrown: { en: 'IPPON!', hi: 'IPPON!' },
};
export const active = () => !!SF;
export function init(ctx) { X = ctx; }

// start a face-off: boss is the game's fighter object, crowd the chele who stand round and cheer
export function start(o) {
  if (SF) return; const G = X.G(), pl = X.player(); const bx = o.boss.x, bz = o.boss.z; let ax = bx - G.x, az = bz - G.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
  const C = V((G.x + bx) / 2, 0, (G.z + bz) / 2), A = V(ax, 0, az); let N = V(-az, 0, ax);
  const near = pl.parent ? nearMeshes(C, pl.parent) : []; if (blockers(C, N, pl, o.boss.mesh, near).length > blockers(C, N.clone().negate(), pl, o.boss.mesh, near).length) { N.negate(); A.negate(); } // film from the clearer side (A flips too, so the player stays on the left)
  const lv = F.bossLevel(o.ch, X.P().level || 1); const bossStyle = F.BOSS_STYLE[o.ch % F.BOSS_STYLE.length];
  const mk = (ch, isP, style, hp, dmg) => ({ ch, isP, style, hp, max: hp, dmg, s: isP ? -2.1 : 2.1, act: null, block: false, stun: 0, down: 0, thrown: 0, cd: 0, walk: 0, think: 0.6, aiBlock: 0, aiWalk: 0, aiDir: 0, wins: 0 });
  SF = { o, C, A, N, lv, hidden: new Set(), near, phase: 'pick', t: 0, round: 1, clock: F.ROUND_SECS, banner: null, shake: 0, crowd: o.crowd || [], keys: {}, touch: {},
    me: mk(pl, true, null, F.HP, 1), foe: mk(o.boss.mesh, false, bossStyle, lv.hp, lv.dmg), name: o.name };
  o.boss.sfHold = true; for (const c of SF.crowd) c.sfHold = true; SF.wasNoBlock = o.boss.mesh.userData.noBlock; o.boss.mesh.userData.noBlock = true; pl.userData.noBlock = true;
  G.sf = true; G.frozen = true; G.dance = false; document.body.classList.add('sfmode'); placeCrowd(); buildHud(); pickUI();
  X.bigText(tx(T.faceoff), o.name + ' · ' + tx(F.STYLES[bossStyle].name), 1.8); X.A.sfx('level');
}
const ray = new THREE.Raycaster();
function nearMeshes(C, scene) { // plain meshes within 25 m of the fight (no sprites, skinned bodies or instanced crowds)
  const out = [], w = V(0, 0, 0); scene.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.visible) return; o.getWorldPosition(w); if (Math.hypot(w.x - C.x, w.z - C.z) < 25) out.push(o); }); return out;
}
function blockers(C, N, a, b, list) { // meshes between a camera on side N and the middle of the fight
  const cam = V(C.x + N.x * 6, 2, C.z + N.z * 6), out = []; const scene = a.parent; if (!scene) return out;
  for (const tgt of [V(C.x, 1.3, C.z), a.position.clone().setY(1.3), b.position.clone().setY(1.3)]) { const dir = tgt.clone().sub(cam); const len = dir.length(); ray.set(cam, dir.normalize()); ray.far = len - 0.6;
    for (const h of ray.intersectObjects(list, false)) { let o = h.object; if (!o.visible) continue; let mine = false; for (let q = o; q; q = q.parent) if (q === a || q === b) { mine = true; break; } if (!mine && h.distance < len - 0.6) out.push(o); } }
  return out;
}
function clearView() { // hide whatever stands between the camera and the fighters (stalls, poles, trees), put back at the end
  const cam = X.G().camFix && X.G().camFix.p; if (!cam || (SF.viewT = (SF.viewT || 0) + 1) % 6) return; const scene = SF.me.ch.parent; if (!scene) return;
  for (const f of [SF.me, SF.foe]) { const tgt = f.ch.position.clone().setY(1.2); const dir = tgt.clone().sub(cam); const len = dir.length(); ray.set(cam, dir.normalize()); ray.far = len - 0.5;
    for (const h of ray.intersectObjects(SF.near, false)) { const o = h.object; if (!o.visible) continue; let mine = false; for (let q = o; q; q = q.parent) if (q === SF.me.ch || q === SF.foe.ch || SF.crowd.some(c => c.mesh === q)) { mine = true; break; } if (mine) continue; o.visible = false; SF.hidden.add(o); } }
}
function placeCrowd() { // the chele stand on both sides of the street and cheer
  const { C, A, N } = SF; SF.crowd.forEach((c, i) => { const side = i % 2 ? 1 : -1, along = (Math.floor(i / 2) - 0.5) * 2.2; c.x = C.x - N.x * 3.6 * side + A.x * along; c.z = C.z - N.z * 3.6 * side + A.z * along; c.r = Math.atan2(C.x - c.x, C.z - c.z); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.set(0, c.r, 0); });
}
function pickUI() {
  const box = X.el('div', { id: 'sfPick', class: 'sfpick' }); box.append(X.el('h2', { text: tx(T.pick) }));
  const foeSt = F.STYLES[SF.foe.style]; box.append(X.el('p', { class: 'small', text: SF.name + ' ' + tx(T.vs) + ': ' + foeSt.icon + ' ' + tx(foeSt.name) }));
  const row = X.el('div', { class: 'sfcards' });
  F.STYLE_IDS.forEach((id, i) => { const S = F.STYLES[id]; const card = X.el('button', { class: 'sfcard', onclick: () => choose(id) }, X.el('b', { text: S.icon + ' ' + tx(S.name) }), X.el('small', { text: tx(S.tag) }),
    X.el('ul', {}, ...['punch', 'kick', 'special'].map(k => X.el('li', { text: k.toUpperCase() + ': ' + tx(S.moves[k].name) }))), X.el('i', { text: String(i + 1) })); row.append(card); });
  box.append(row); document.body.append(box);
}
function choose(id) { if (!SF || SF.phase !== 'pick') return; SF.me.style = id; const b = document.getElementById('sfPick'); if (b) b.remove(); X.A.sfx('click'); roundStart(); }
function roundStart() {
  const { me, foe } = SF; for (const f of [me, foe]) { f.hp = f.max; f.act = null; f.stun = f.down = f.thrown = 0; f.cd = 0; f.block = false; f.ch.rotation.x = 0; }
  me.s = -2.1; foe.s = 2.1; SF.clock = F.ROUND_SECS; SF.phase = 'intro'; SF.t = 0; renderHud();
  banner(tx(T.round) + ' ' + SF.round, 1.1); setTimeout(() => { if (SF && SF.phase === 'intro') { SF.phase = 'fight'; banner(tx(T.fight), 0.8); X.A.sfx('swing'); } }, 1200);
}
function banner(text, secs) { SF.banner = { text, t: secs }; const b = document.getElementById('sfBanner'); if (b) { b.textContent = text; b.style.opacity = '1'; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } }

// ---------------------------------------------------------------- input (keys arrive from the game's handlers)
export function key(code, down) {
  if (!SF) return false; const k = SF.keys; k[code] = down;
  if (SF.phase === 'pick' && down && /^Digit[123]$/.test(code)) { choose(F.STYLE_IDS[+code.slice(5) - 1]); return true; }
  if (down && code === 'Escape') { flee(); return true; }
  if (down && SF.phase === 'fight') { if (code === 'KeyJ' || code === 'KeyF') act(SF.me, 'punch'); if (code === 'KeyK') act(SF.me, 'kick'); if (code === 'KeyI' || code === 'Space') act(SF.me, 'special'); }
  return /^(Key[ADJKLIF]|Arrow(Left|Right)|Space|Digit[123])$/.test(code);
}
function act(f, kind) {
  if (!f.style || f.act || f.stun > 0 || f.down > 0 || f.thrown > 0) return false; const m = F.move(f.style, kind); if (kind === 'special' && f.cd > 0) return false;
  f.act = { kind, m, t: 0, hits: 0, dur: F.total(m) }; if (kind === 'special') f.cd = m.cd; X.A.sfx('swing'); return true;
}
function flee() { // Esc: run away; the boss laughs and the fight is off for now
  const o = SF.o; end(null); X.say(o.boss, 'Bhaag gaya? Darpok!', 2.5); X.toast(lang() === 'en' ? 'You ran from the face-off. Come back when you are ready.' : 'Face-off chhod ke bhaag gaya. Taiyaar ho ke aana.', 'bad');
}

// ---------------------------------------------------------------- per frame (call after updateHumans, before render)
export function tick(dt) {
  if (!SF) return; const { me, foe } = SF; SF.t += dt;
  if (SF.banner && (SF.banner.t -= dt) <= 0) { SF.banner = null; const b = document.getElementById('sfBanner'); if (b) b.style.opacity = '0'; }
  if (SF.phase === 'fight') {
    SF.clock -= dt; me.block = !!(SF.keys.KeyL || SF.touch.block) && !me.act && me.stun <= 0 && me.down <= 0;
    const dir = (SF.keys.KeyD || SF.keys.ArrowRight || SF.touch.r ? 1 : 0) - (SF.keys.KeyA || SF.keys.ArrowLeft || SF.touch.l ? 1 : 0); walk(me, dir, dt);
    ai(foe, me, dt); for (const [a, b] of [[me, foe], [foe, me]]) step(a, b, dt);
    const w = F.roundWinner(me.hp, foe.hp, SF.clock); if (w) roundOver(w);
  } else for (const f of [me, foe]) { f.stun = Math.max(0, f.stun - dt); f.down = Math.max(0, f.down - dt); }
  for (const f of [me, foe]) { f.cd = Math.max(0, f.cd - dt); if (f.thrown > 0) f.thrown = Math.max(0, f.thrown - dt); }
  place(me, foe, dt); place(foe, me, dt); for (const c of SF.crowd) cheer(c, dt); camera(dt); clearView(); renderHud();
}
function walk(f, dir, dt) {
  if (!dir || f.act || f.block || f.stun > 0 || f.down > 0 || f.thrown > 0) { f.walk = 0; return; }
  const fwd = f.isP ? dir : -dir; const other = f.isP ? SF.foe : SF.me; let s = f.s + dir * F.WALK * dt * (fwd < 0 ? 0.8 : 1); s = Math.max(-F.ARENA, Math.min(F.ARENA, s));
  if (f.isP ? other.s - s < F.MIN_GAP : s - other.s < F.MIN_GAP) s = f.s; f.walk = s !== f.s ? fwd : 0; f.s = s;
}
function ai(f, foe, dt) {
  if (f.act || f.stun > 0 || f.down > 0 || f.thrown > 0) { f.block = false; return; }
  if (f.aiBlock > 0) { f.aiBlock -= dt; f.block = true; return; } f.block = false;
  if (f.aiWalk > 0) { f.aiWalk -= dt; walk(f, f.aiDir, dt); return; }
  if ((f.think -= dt) > 0) return; f.think = SF.lv.think * (0.7 + Math.random() * 0.6);
  const gap = f.s - foe.s; const d = F.aiDecide({ gap, foeAttacking: foe.act && foe.act.t < foe.act.m.wind + foe.act.m.act ? foe.act.kind : null, cd: f.cd, style: f.style, foeStyle: foe.style, hpFrac: f.hp / f.max }, SF.lv);
  if (d === 'block') { f.aiBlock = 0.45; f.block = true; } else if (d === 'fwd') { f.aiWalk = 0.35; f.aiDir = -1; } else if (d === 'back') { f.aiWalk = 0.4; f.aiDir = 1; } else if (d !== 'idle') act(f, d);
}
function step(a, b, dt) { // advance a's move and land its hits on b
  a.stun = Math.max(0, a.stun - dt); a.down = Math.max(0, a.down - dt); const A = a.act; if (!A) return; A.t += dt; const m = A.m, n = m.hits || 1;
  while (A.hits < n && A.t >= m.wind + m.act * (A.hits / n)) {
    A.hits++; const gap = Math.abs(a.s - b.s); if (!F.inReach(m, gap + 0.05) || b.down > 0 || b.thrown > 0) continue;
    const r = F.resolveHit(m, b.block && (!b.act), a.dmg); land(a, b, r, A);
  }
  if (A.t >= A.dur) a.act = null;
}
function land(a, b, r, A) {
  b.hp = Math.max(0, b.hp - r.dmg); const push = r.kb * (b.isP ? -1 : 1); b.s = Math.max(-F.ARENA, Math.min(F.ARENA, b.s + push)); if (Math.abs(a.s - b.s) < F.MIN_GAP) b.s = a.s + (b.isP ? -F.MIN_GAP : F.MIN_GAP);
  const p = b.ch.position; X.burst && X.burst(p.x, 1.5, p.z, r.blocked ? 0x9ad1ff : 0xffd21f, r.blocked ? 10 : 18, { speed: 3, life: 0.35, grav: 2 });
  if (r.blocked) { X.A.sfx('click', 0.5); pop(b, tx(T.blocked)); b.stun = 0.12; return; }
  X.A.sfx('punch'); X.grunt(b.ch, 'hit'); SF.shake = Math.max(SF.shake, r.thrown ? 0.35 : 0.15); if (b.isP) X.flash && X.flash();
  b.act = null; b.block = false; if (r.broke) pop(b, tx(T.broke)); if (r.thrown) { b.thrown = 1.1; b.down = 1.7; pop(b, tx(T.thrown)); A.throwT = 0; } else if (r.down) b.down = 1.3; else b.stun = 0.32;
}
function pop(f, text) { SF.pops = SF.pops || []; SF.pops.push({ f, text, t: 0.9 }); }
function roundOver(w) {
  const { me, foe } = SF; SF.phase = 'between'; const ko = me.hp <= 0 || foe.hp <= 0; banner(ko ? tx(T.ko) : tx(T.time), 1.4); X.A.sfx(ko ? 'ko' : 'click');
  if (w === 'a') me.wins++; else if (w === 'b') foe.wins++; if (foe.hp <= 0) X.grunt(foe.ch, 'ko'); if (me.hp <= 0) X.grunt(me.ch, 'ko');
  const mw = F.matchWinner(me.wins, foe.wins, SF.round);
  setTimeout(() => { if (!SF) return; if (mw) { SF.phase = 'over'; const won = mw === 'a'; banner(won ? (me.hp >= me.max ? tx(T.perfect) : tx(T.youWin)) : tx(T.youLose), 2.2); X.A.sfx(won ? 'level' : 'ko'); setTimeout(() => end(won), 2300); } else { SF.round++; roundStart(); } }, 1800);
}
function end(won) {
  if (!SF) return; const s = SF; SF = null; const G = X.G(); const pl = X.player(); for (const o of s.hidden) o.visible = true;
  for (const f of [s.me, s.foe]) f.ch.rotation.x = 0; s.o.boss.sfHold = false; for (const c of s.crowd) c.sfHold = false; s.o.boss.mesh.userData.noBlock = s.wasNoBlock; pl.userData.noBlock = false;
  G.sf = false; G.frozen = false; G.camFix = null; document.body.classList.remove('sfmode'); for (const id of ['sfHud', 'sfPick', 'sfPad']) { const e = document.getElementById(id); if (e) e.remove(); }
  const fx = s.me.ch.position; G.x = fx.x; G.z = fx.z; s.o.boss.x = s.foe.ch.position.x; s.o.boss.z = s.foe.ch.position.z;
  if (won === true) s.o.onWin(); else if (won === false) s.o.onLose(); else { s.o.onFlee && s.o.onFlee(); G.x -= s.A.x * 6; G.z -= s.A.z * 6; }
}

// ---------------------------------------------------------------- bodies, camera, crowd
function place(f, other, dt) {
  const { C, A } = SF; const face = Math.atan2(f.isP ? A.x : -A.x, f.isP ? A.z : -A.z); const h = f.ch.userData.human;
  const pos = V(C.x + A.x * f.s, 0, C.z + A.z * f.s);
  const pose = f.style ? STANCE[f.style] : STANCE.karate; let full = pose;
  if (f.act) full = sample(MOVES[f.style][f.act.kind], f.act.t / f.act.dur, pose);
  else if (f.block) full = over(BLOCK, pose);
  if (SF.phase === 'over' && f.hp > 0 && f.wins >= F.WINS) full = over(WIN, pose);
  const yaw = face + (full.yaw || 0);
  // the body: knocked down, thrown through the air, stunned, or on its feet
  let clip = 'idle', y = -(full.drop || 0) + (full.lift || 0), rx = 0;
  if (f.thrown > 0) { const k = 1 - f.thrown / 1.1; const thrower = other; const arc = Math.sin(Math.min(1, k * 1.2) * Math.PI); pos.set(C.x + A.x * (thrower.s + (f.isP ? -1 : 1) * (0.9 + k * 0.9)), 0, C.z + A.z * (thrower.s + (f.isP ? -1 : 1) * (0.9 + k * 0.9))); y = arc * 1.5; rx = -Math.min(1, k * 1.25) * Math.PI * 0.55; clip = 'fall'; }
  else if (f.hp <= 0 || f.down > 0) clip = 'fall'; else if (f.stun > 0) clip = 'hit'; else if (f.walk) clip = 'walk';
  f.ch.position.set(pos.x, Math.max(-0.4, y), pos.z); f.ch.rotation.order = 'YXZ'; f.ch.rotation.set(rx, clip === 'fall' && f.thrown <= 0 ? face : yaw, 0);
  if (f.isP) { const G = X.G(); G.x = pos.x; G.z = pos.z; G.r = face; }
  if (h) { const k = clip === 'walk' ? 'walk' : clip; X.HU.play(h, k, clip === 'fall' ? 0.12 : 0.18, clip === 'walk' ? (f.walk < 0 ? -0.8 : 0.9) : 1); h.mixer.update(dt); X.markAnim(f.ch.userData);
    if (clip === 'idle' || clip === 'walk') applyPose(f, full, clip === 'walk' ? 0.55 : 1); }
  else f.ch.userData.punchT = f.act ? 0.2 : 0;
}
function cheer(c, dt) { const h = c.mesh.userData.human; if (h) { X.HU.play(h, Math.floor(SF.t / 3 + c.x) % 2 ? 'dance' : 'talk', 0.3); h.mixer.update(dt); X.markAnim(c.mesh.userData); } }
function camera(dt) {
  const { C, A, N, me, foe } = SF; const mid = (me.s + foe.s) / 2, gap = Math.abs(foe.s - me.s); const portrait = innerHeight > innerWidth;
  const d = (portrait ? 5.4 : 5.2) + gap * (portrait ? 0.45 : 0.6); const cx = C.x + A.x * mid, cz = C.z + A.z * mid;
  const sh = SF.shake > 0 ? (SF.shake -= dt, (Math.random() - 0.5) * SF.shake * 0.6) : 0;
  const ang = portrait ? 0.95 : 0; const ox = N.x * Math.cos(ang) - A.x * Math.sin(ang), oz = N.z * Math.cos(ang) - A.z * Math.sin(ang); // portrait: swing round behind the player
  X.G().camFix = { p: V(cx + ox * d + sh, (portrait ? 2.3 : 2.0) + sh, cz + oz * d), t: V(cx + A.x * (portrait ? 0.4 : 0), 1.25, cz + A.z * (portrait ? 0.4 : 0)) };
}

// ---------------------------------------------------------------- HUD and touch pad
function buildHud() {
  const hud = X.el('div', { id: 'sfHud' }); hud.innerHTML = '<div class="sfbars"><div class="sfside me"><b id="sfMeN"></b><div class="sfbar"><i id="sfMeH"></i></div><span id="sfMeW"></span></div><div id="sfClock">45</div><div class="sfside foe"><b id="sfFoeN"></b><div class="sfbar"><i id="sfFoeH"></i></div><span id="sfFoeW"></span></div></div><div id="sfBanner"></div><div id="sfPops"></div><div id="sfKeys"></div>';
  document.body.append(hud); document.getElementById('sfKeys').textContent = tx(T.keys);
  const pad = X.el('div', { id: 'sfPad' }); const btn = (cls, label, on, off) => { const b = X.el('button', { class: 'sfbtn ' + cls, text: label }); const dn = e => { e.preventDefault(); on(); }, up = e => { e.preventDefault(); off && off(); }; b.addEventListener('touchstart', dn, { passive: false }); b.addEventListener('touchend', up); b.addEventListener('mousedown', dn); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', up); return b; };
  pad.append(X.el('div', { class: 'sfmove' }, btn('l', '◀', () => { SF && (SF.touch.l = true); }, () => { SF && (SF.touch.l = false); }), btn('r', '▶', () => { SF && (SF.touch.r = true); }, () => { SF && (SF.touch.r = false); })),
    X.el('div', { class: 'sfacts' }, btn('p', 'PUNCH', () => SF && SF.phase === 'fight' && act(SF.me, 'punch')), btn('k', 'KICK', () => SF && SF.phase === 'fight' && act(SF.me, 'kick')), btn('b', 'BLOCK', () => { SF && (SF.touch.block = true); }, () => { SF && (SF.touch.block = false); }), btn('s', 'SPECIAL', () => SF && SF.phase === 'fight' && act(SF.me, 'special'))));
  document.body.append(pad);
}
function renderHud() {
  if (!SF) return; const { me, foe } = SF; const $ = id => document.getElementById(id); if (!$('sfHud')) return;
  const st = f => f.style ? F.STYLES[f.style].icon + ' ' : '';
  $('sfMeN').textContent = st(me) + (X.P().name || 'You'); $('sfFoeN').textContent = st(foe) + SF.name;
  $('sfMeH').style.width = (100 * me.hp / me.max) + '%'; $('sfFoeH').style.width = (100 * foe.hp / foe.max) + '%';
  $('sfMeW').textContent = '●'.repeat(me.wins) + '○'.repeat(F.WINS - me.wins); $('sfFoeW').textContent = '●'.repeat(foe.wins) + '○'.repeat(F.WINS - foe.wins);
  $('sfClock').textContent = String(Math.max(0, Math.ceil(SF.clock)));
  const sb = document.querySelector('.sfbtn.s'); if (sb) sb.classList.toggle('cd', me.cd > 0);
  const pops = $('sfPops'); pops.textContent = ''; SF.pops = (SF.pops || []).filter(p => (p.t -= 1 / 60) > 0); for (const p of SF.pops) pops.append(X.el('div', { class: 'sfpop ' + (p.f.isP ? 'me' : 'foe'), text: p.text }));
}
// for tests and reels
export const state = () => SF && { phase: SF.phase, round: SF.round, me: { hp: SF.me.hp, s: SF.me.s, style: SF.me.style, wins: SF.me.wins, act: SF.me.act && SF.me.act.kind, down: SF.me.down }, foe: { hp: SF.foe.hp, s: SF.foe.s, style: SF.foe.style, wins: SF.foe.wins, act: SF.foe.act && SF.foe.act.kind, down: SF.foe.down, thrown: SF.foe.thrown }, clock: SF.clock };
export const _sf = () => SF;
export { choose, act as doMove };
