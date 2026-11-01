// Realistic people: MakeHuman / MPFB2 humans (CC0, public domain), built offline by tools/people/build_people.py into
// /models/people-m.glb and people-f.glb. Each file holds one rig (Mixamo bone names), the body with photo-scanned skin
// textures, real clothes (fitted MakeHuman garments, split into a top and a bottom the game can tint), hairstyles,
// eyes, brows, lashes and the game's animation clips retargeted onto the rig. The game keeps its old box figure inside
// each character as the far-away / not yet loaded version; this module adds the real body next to it and the game
// decides which one is shown.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
const cloneSkinned = o => SkeletonUtils.clone(o);

export const H = 2.55;            // standing height in world units, the same as the old figure
export const HUMANS = { ready: false, base: {}, clips: {} };
const BONE = { head: 'Head', chest: 'Spine2' };

// ---------- loading
export function loadHumans(base = '/models/') {
  if (HUMANS.loading) return HUMANS.loading;
  const L = new GLTFLoader();
  HUMANS.loading = Promise.all(['m', 'f'].map(g => L.loadAsync(base + 'people-' + g + '.glb').then(gl => prep(gl, g)))).then(([m, f]) => {
    HUMANS.base.m = m; HUMANS.base.f = f;
    for (const g of ['m', 'f']) HUMANS.clips[g] = Object.fromEntries(HUMANS.base[g].clips.map(c => [c.name, c]));
    HUMANS.ready = true; return HUMANS;
  });
  return HUMANS.loading;
}

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function prep(gl, g) {
  const scene = gl.scene; scene.updateMatrixWorld(true);
  // the game renders without sRGB output, so use texture colours as they are
  const linear = t => { if (t) { t.encoding = THREE.LinearEncoding; t.anisotropy = 4; t.needsUpdate = true; } return t; };
  let body = null; scene.traverse(o => { if (o.isSkinnedMesh) { if (o.name === 'body') body = o; if (o.material.map) linear(o.material.map); } });
  const height = (gl.parser.json.extras && gl.parser.json.extras.height) || 1.7;
  const ex = body.userData; const mh = new Uint16Array(b64(ex.mhIndex).buffer); const idx = body.geometry.index.array;
  // the body without the skin each outfit covers: less to draw and no skin poking through fabric
  const bodies = {};
  for (const [oid, mask] of Object.entries(ex.hide)) {
    const m = b64(mask), hid = v => (m[mh[v] >> 3] >> (mh[v] & 7)) & 1, tris = [];
    for (let i = 0; i < idx.length; i += 3) if (!(hid(idx[i]) || hid(idx[i + 1]) || hid(idx[i + 2]))) tris.push(idx[i], idx[i + 1], idx[i + 2]);
    const bg = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(body.geometry.attributes)) bg.setAttribute(n, a);
    bg.setIndex(new THREE.BufferAttribute(new Uint16Array(tris), 1)); body.geometry.computeBoundingSphere(); bg.boundingSphere = body.geometry.boundingSphere; bodies[oid] = bg;
  }
  const skins = {}; for (const [k, ti] of Object.entries(ex.skins)) skins[k] = linear(await gl.parser.getDependency('texture', ti));
  return { scene, g, bodies, skins, height, clips: gl.animations, outfits: Object.keys(ex.hide) };
}

// ---------- materials (shared between characters with the same look)
const MATS = new Map();
function tinted(src, hex, key, extra) {
  const k = key + ':' + src.uuid + ':' + hex; if (MATS.has(k)) return MATS.get(k);
  const m = src.clone(); m.color.set(hex); if (extra) extra(m); MATS.set(k, m); return m;
}
const cloth = m => { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; m.roughness = 0.88; };
// skin tones of the avatar creator -> the closest scanned skin, with a tint for the exact tone
const TONES = [[0xf1c7a3, 'young_asian', 0xfff4ec], [0xd9a07a, 'young_asian', 0xf0d4bc], [0xc68863, 'middleage_asian', 0xe6c0a2], [0xa86b45, 'young_african', 0xffe2cc], [0x7d4a2c, 'young_african', 0xe0b494]];
function toneFor(hex) { let best = TONES[2], bd = 1e9; const c = new THREE.Color(hex); for (const t of TONES) { const d = new THREE.Color(t[0]); const e = (d.r - c.r) ** 2 + (d.g - c.g) ** 2 + (d.b - c.b) ** 2; if (e < bd) { bd = e; best = t; } } return best; }

// ---------- one character
// A pivot under a bone whose children can be authored in the old box figure's coordinates (blockRef = the point of the
// old figure that should land on this bone, k = size ratio). Used for hats, glasses, chains, watches.
function anchor(bone, target, blockRef, k, rot) {
  const a = new THREE.Group(); a.matrixAutoUpdate = false;
  const A = new THREE.Matrix4().compose(target, rot || new THREE.Quaternion(), k.isVector3 ? k : new THREE.Vector3(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-blockRef.x, -blockRef.y, -blockRef.z));
  a.matrix.copy(bone.matrixWorld).invert().multiply(A); bone.add(a); return a;
}
const ACTS = { idle: 'Idle_Loop', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', run: 'Sprint_Loop', jab: 'Punch_Jab', cross: 'Punch_Cross', dance: 'Dance_Loop', sit: 'Sitting_Idle_Loop', drive: 'Driving_Loop', talk: 'Idle_Talking_Loop', hit: 'Hit_Chest', fall: 'Death01', swim: 'Swim_Fwd_Loop' };

export function makeHuman(gender) {
  const g = gender === 'f' ? 'f' : 'm', B = HUMANS.base[g]; const HT = g === 'f' ? H * 0.95 : H, S = HT / B.height; const root = new THREE.Group(); root.name = 'human';
  const rig = cloneSkinned(B.scene); rig.scale.setScalar(S); root.add(rig); rig.updateMatrixWorld(true);
  let body = null; const parts = { outfit: {}, hair: {}, face: [], beard: {} };
  rig.traverse(o => {
    if (!o.isSkinnedMesh) return; o.frustumCulled = false; const n = o.name;
    if (n === 'body') body = o; else if (n.startsWith('outfit__')) { const [, oid, kind] = n.split('__'); (parts.outfit[oid] = parts.outfit[oid] || []).push({ m: o, kind }); o.visible = false; }
    else if (n.startsWith('hair__')) { parts.hair[n.split('__')[1]] = o; o.visible = false; }
    else if (n === 'beard' || n === 'moonchh') { parts.beard[n] = o; o.visible = false; } else parts.face.push(o);
  });
  const bones = {}; rig.traverse(o => { if (o.isBone) bones[o.name] = o; });
  // anchors for the old accessories, in root (character) space at the bind pose
  const W = n => bones[n].getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
  const head = W(BONE.head), neck = W('Neck');
  // The old figure had a big blocky head and a wide torso, so its accessories are mapped per axis onto real landmarks:
  // hats and glasses (authored around a crown at y 2.62) onto the real crown, chains and belts (neck base at y 1.86,
  // waist at 1.05) from the neck down.
  const hatA = anchor(bones.Head, new THREE.Vector3(head.x, HT, head.z + 0.012 * S), new THREE.Vector3(0, 2.62, 0), new THREE.Vector3(0.34, 0.7, 0.52));
  const chestA = anchor(bones[BONE.chest], new THREE.Vector3(neck.x, neck.y - 0.045 * S, neck.z + 0.01 * S), new THREE.Vector3(0, 1.86, 0), new THREE.Vector3(0.32, 0.6, 0.34));
  // the old arm hangs down -y from the shoulder and its wrist is 0.72 below it; the real forearm points along the rest-pose arm
  const arm = side => { const s = side === 'l' ? 'Left' : 'Right'; const lo = W(s + 'ForeArm'), hand = W(s + 'Hand'); const dir = hand.clone().sub(lo).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); return anchor(bones[s + 'Hand'], hand.clone().add(dir.clone().multiplyScalar(-0.03 * S)), new THREE.Vector3(0, -0.72, 0), 0.3, q); };
  const wristL = arm('l'), wristR = arm('r');
  const hairA = new THREE.Group(); bones.Head.add(hairA);
  // animation
  const mixer = new THREE.AnimationMixer(rig); const acts = {};
  for (const [k, n] of Object.entries(ACTS)) {
    const c = HUMANS.clips[g][n]; if (!c) continue; const a = mixer.clipAction(c); if (/jab|cross|hit|fall/.test(k)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = k === 'fall'; } acts[k] = a;
  }
  const h = { root, rig, body, bones, parts, gender: g, mixer, acts, cur: null, hatA, chestA, wristL, wristR, hairA, hair: null, punch: 0, look: null };
  play(h, 'idle', 0); mixer.update(Math.random() * 2);
  return h;
}

export function play(h, k, fade = 0.2, speed = 1) {
  const a = h.acts[k]; if (!a) return; a.timeScale = speed;
  if (h.cur === k) return; const prev = h.cur && h.acts[h.cur];
  a.reset().setEffectiveWeight(1).play(); if (prev && fade > 0) a.crossFadeFrom(prev, fade, false); else if (prev) prev.stop();
  h.cur = k;
}

// ---------- looks
// o: { g, skin, hair, hairColor, top, shirt, pants, pantsStyle, shoes, beard, outfit?, old? } from the avatar creator / random passers-by
const TOPS = { m: ['tee', 'kurta', 'jacket'], f: ['kurti', 'top', 'saree'] };
export function dressHuman(h, o) {
  const B = HUMANS.base[h.gender];
  const oid = o.outfit && h.parts.outfit[o.outfit] ? o.outfit : TOPS[h.gender][o.top | 0] || TOPS[h.gender][0];
  for (const [id, list] of Object.entries(h.parts.outfit)) for (const p of list) {
    p.m.visible = id === oid; if (id !== oid) continue;
    p.src = p.src || p.m.material;
    p.m.material = p.kind === 'top' ? tinted(p.src, o.shirt != null ? o.shirt : 0xd7331f, 'top', cloth) : p.kind === 'bottom' ? tinted(p.src, o.pants != null ? o.pants : 0x2b3550, 'bot', cloth) : tinted(p.src, 0xffffff, 'all', cloth);
  }
  h.body.geometry = B.bodies[oid];
  // skin: the scanned texture closest to the tone (older people get the lined faces), tinted to it
  const t = toneFor(o.skin != null ? o.skin : 0xc68863); const key = (o.old ? 'old_asian' : t[1]) + (h.gender === 'f' ? '_female' : '_male');
  h.body.userData.src = h.body.userData.src || h.body.material;
  h.body.material = tinted(h.body.userData.src, t[2], 'skin:' + key, m => { m.map = B.skins[key] || m.map; m.roughness = 0.62; });
  // hair: one of the styles, tinted (its texture is greyscale)
  for (const [k, m] of Object.entries(h.parts.hair)) m.visible = false;
  const hm = h.parts.hair[o.hair | 0]; h.hair = hm || null;
  if (hm) { hm.userData.src = hm.userData.src || hm.material; hm.material = tinted(hm.userData.src, new THREE.Color(o.hairColor != null ? o.hairColor : 0x1a1410).multiplyScalar(1.6).getHex(), 'hair'); hm.visible = !h.hairHidden; }
  const hc = o.hairColor != null ? o.hairColor : 0x1a1410;
  for (const [k, m] of Object.entries(h.parts.beard)) { m.visible = (o.beard === 'full' ? 'beard' : o.beard) === k; if (m.visible) { m.userData.src = m.userData.src || m.material; m.material = tinted(m.userData.src, hc, 'beard'); } }
  for (const f of h.parts.face) if (f.name !== 'eyes') { f.userData.src = f.userData.src || f.material; f.material = tinted(f.userData.src, o.hairColor != null ? o.hairColor : 0x1a1410, 'brow'); }
}
export function setHairVisible(h, v) { h.hairHidden = !v; if (h.hair) h.hair.visible = v; }
