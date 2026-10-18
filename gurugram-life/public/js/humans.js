// Realistic people: Quaternius Universal Base Characters + Universal Animation Library (CC0, public domain).
// One skinned body per character (male or female), clothes made from the body's own surface (pushed out a little so
// they bend with the skeleton), real hairstyles on the head bone, skin tones, and animation clips (idle, walk, jog,
// sprint, punch, dance, sit, drive). The game keeps its old box figure inside each character as the far-away / not
// yet loaded version; this module adds the real body next to it and the game decides which one is shown.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
const cloneSkinned = o => SkeletonUtils.clone(o);

export const H = 2.55;            // standing height in world units, the same as the old figure
const SRC_H = 1.81;               // the source bodies are 1.81 m tall
const S = H / SRC_H;
export const HUMANS = { ready: false, base: {}, clips: {}, hair: {} };

const BONE = { head: 'Head', chest: 'spine_03', spine: 'spine_02', handL: 'hand_l', handR: 'hand_r', lowL: 'lowerarm_l', lowR: 'lowerarm_r' };
// which bones count as which body part (by the bone that moves a vertex most)
const PART = name => {
  if (/^(Head|neck_01)$/.test(name)) return 'head';
  if (/^hand_|^(index|middle|ring|pinky|thumb)_/.test(name)) return 'hand';
  if (/^lowerarm_/.test(name)) return 'lowarm';
  if (/^upperarm_/.test(name)) return 'uparm';
  if (/^(spine_0[123]|clavicle_)/.test(name)) return 'chest';
  if (name === 'pelvis') return 'pelvis';
  if (/^thigh_/.test(name)) return 'thigh';
  if (/^calf_/.test(name)) return 'calf';
  if (/^(foot|ball)_/.test(name)) return 'foot';
  return 'other';
};

// ---------- loading
export function loadHumans(base = '/models/') {
  if (HUMANS.loading) return HUMANS.loading;
  const L = new GLTFLoader();
  HUMANS.loading = Promise.all(['male', 'female', 'hair', 'anims'].map(n => L.loadAsync(base + n + '.glb'))).then(([m, f, hair, anims]) => {
    // the game renders without sRGB output, so use texture colours as they are (otherwise skin comes out dark)
    for (const gl of [m, f, hair]) gl.scene.traverse(o => { if (o.material && o.material.map) { o.material.map.encoding = THREE.LinearEncoding; o.material.map.needsUpdate = true; } });
    for (const [g, gl] of [['m', m], ['f', f]]) HUMANS.base[g] = prepBase(gl.scene, g);
    hair.scene.updateMatrixWorld(true); hair.scene.traverse(o => { if (o.isMesh) HUMANS.hair[o.name.replace(/_\d+$/, '')] = o; });
    for (const c of anims.animations) HUMANS.clips[c.name] = c;
    HUMANS.ready = true; return HUMANS;
  });
  return HUMANS.loading;
}

// Clothes: triangles of the body whose vertices belong to the chosen parts, pushed out along the normal so they
// sit on top of the skin. They keep the body's bone weights, so they bend with it.
const GET = ['getX', 'getY', 'getZ', 'getW']; // works for plain and interleaved attributes
function cloth(geo, joints, want, push, cut, smooth) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index;
  const keep = new Uint8Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    let best = 0, bw = 0; for (let k = 0; k < 4; k++) { const w = sw[GET[k]](v), j = si[GET[k]](v); if (w > bw && j < joints.length) { bw = w; best = j; } } // unused slots hold index 255 with weight 0
    const part = PART(joints[best].name); keep[v] = want.has(part) && (!cut || cut(part, pos.getX(v), pos.getY(v), pos.getZ(v))) ? 1 : 0;
  }
  const tris = []; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (keep[a] && keep[b] && keep[c]) tris.push(a, b, c); }
  const g = geo.clone(); g.setIndex(tris); softenCloth(g, tris, push, smooth == null ? 40 : smooth); g.computeBoundingSphere(); g.userData.cover = keep; return g; // keep: which body vertices this piece hides
}
// Fabric doesn't follow every muscle: smooth the kept surface a few times (seam copies of a vertex move together),
// push it out along the smoothed normal, and give it seamless normals so the cloth reads as one soft piece.
function softenCloth(g, tris, push, iters) {
  const p = g.attributes.position, n = p.count, key = new Map(), grp = new Int32Array(n); let ng = 0;
  for (let v = 0; v < n; v++) { const k = Math.round(p.getX(v) * 2e3) + ',' + Math.round(p.getY(v) * 2e3) + ',' + Math.round(p.getZ(v) * 2e3); let id = key.get(k); if (id === undefined) { id = ng++; key.set(k, id); } grp[v] = id; }
  const P = new Float32Array(ng * 3), used = new Uint8Array(ng); for (let v = 0; v < n; v++) { const q = grp[v] * 3; P[q] = p.getX(v); P[q + 1] = p.getY(v); P[q + 2] = p.getZ(v); }
  const nb = Array.from({ length: ng }, () => new Set());
  for (let i = 0; i < tris.length; i += 3) { const a = grp[tris[i]], b = grp[tris[i + 1]], c = grp[tris[i + 2]]; used[a] = used[b] = used[c] = 1; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  const T = new Float32Array(ng * 3);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < ng; i++) { const q = i * 3; if (!used[i] || !nb[i].size) { T[q] = P[q]; T[q + 1] = P[q + 1]; T[q + 2] = P[q + 2]; continue; } let x = 0, y = 0, z = 0; for (const j of nb[i]) { x += P[j * 3]; y += P[j * 3 + 1]; z += P[j * 3 + 2]; } const k = 1 / nb[i].size, l = it % 2 ? -0.65 : 0.62; T[q] = P[q] + (x * k - P[q]) * l; T[q + 1] = P[q + 1] + (y * k - P[q + 1]) * l; T[q + 2] = P[q + 2] + (z * k - P[q + 2]) * l; } // Taubin: smooths without shrinking
    P.set(T);
  }
  const N = new Float32Array(ng * 3), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const face = () => { for (let i = 0; i < tris.length; i += 3) { const a = grp[tris[i]], b = grp[tris[i + 1]], c = grp[tris[i + 2]]; A.fromArray(P, a * 3); B.fromArray(P, b * 3).sub(A); C.fromArray(P, c * 3).sub(A); B.cross(C); for (const j of [a, b, c]) { N[j * 3] += B.x; N[j * 3 + 1] += B.y; N[j * 3 + 2] += B.z; } } for (let i = 0; i < ng; i++) { A.fromArray(N, i * 3).normalize(); A.toArray(N, i * 3); } };
  face();
  for (let i = 0; i < ng; i++) { const q = i * 3, pv = typeof push === 'function' ? push(P[q + 1]) : push; P[q] += N[q] * pv; P[q + 1] += N[q + 1] * pv; P[q + 2] += N[q + 2] * pv; }
  N.fill(0); face();
  const nr = g.attributes.normal; for (let v = 0; v < n; v++) { const q = grp[v] * 3; p.setXYZ(v, P[q], P[q + 1], P[q + 2]); nr.setXYZ(v, N[q], N[q + 1], N[q + 2]); }
  p.needsUpdate = nr.needsUpdate = true;
}

// A flared hem (kurta, kurti, saree): rings of cloth from the waist down, hanging from the pelvis and following each
// thigh a little towards the bottom so walking legs stay inside.
function skirt(body, joints, y0, y1, flare) {
  const pos = body.geometry.attributes.position, idx = (n) => joints.findIndex(b => b.name === n);
  let rx = 0, zmin = 1e9, zmax = -1e9; for (let v = 0; v < pos.count; v++) { const y = pos.getY(v); if (Math.abs(y - y0) < 0.05 && Math.abs(pos.getX(v)) < 0.3) { rx = Math.max(rx, Math.abs(pos.getX(v))); zmin = Math.min(zmin, pos.getZ(v)); zmax = Math.max(zmax, pos.getZ(v)); } }
  const cz = (zmin + zmax) / 2, rz = (zmax - zmin) / 2; const SEG = 28, RINGS = 7; const P = [], Nn = [], UV = [], SI = [], SW = [], I = [];
  const pel = idx('pelvis'), tl = idx('thigh_l'), tr = idx('thigh_r'); const lx = joints[tl].getWorldPosition(new THREE.Vector3()).x;
  for (let r = 0; r <= RINGS; r++) {
    const t = r / RINGS, y = y0 + (y1 - y0) * t, grow = 1.04 + 0.1 * Math.min(1, t * 3) + flare * t; // snug at the waist, then falls and flares
    for (let k = 0; k <= SEG; k++) {
      const a = k / SEG * Math.PI * 2, x = Math.sin(a) * (rx + 0.03) * grow, z = cz + Math.cos(a) * (rz + 0.04) * grow;
      P.push(x, y, z); Nn.push(Math.sin(a), 0.15, Math.cos(a)); UV.push(k / SEG * 3, t * 2);
      const side = Math.sign(x) === Math.sign(lx) ? tl : tr, wt = Math.min(0.7, t * 0.8) * Math.min(1, Math.abs(x) / (rx * 0.6));
      SI.push(pel, side, 0, 0); SW.push(1 - wt, wt, 0, 0);
    }
  }
  for (let r = 0; r < RINGS; r++) for (let k = 0; k < SEG; k++) { const a = r * (SEG + 1) + k, b = a + SEG + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function prepBase(scene, g) {
  scene.updateMatrixWorld(true);
  let body = null; const extras = [];
  scene.traverse(o => { if (o.isSkinnedMesh) { if (/Skin/i.test(o.material.name)) body = o; else extras.push(o); } });
  const joints = body.skeleton.bones, geo = body.geometry; const by = n => joints.find(b => b.name === n);
  const y = n => { const v = new THREE.Vector3(); by(n).getWorldPosition(v); return v.y; };
  const knee = y('calf_l'), hip = y('thigh_l'), waist = (y('pelvis') + y('spine_01')) / 2, ankle = y('foot_l');
  const elbow = n => by('lowerarm_' + n).getWorldPosition(new THREE.Vector3()).x;
  const mid = (a, b) => (a + b) / 2, sleeveL = mid(Math.abs(elbow('l')), Math.abs(by('upperarm_l').getWorldPosition(new THREE.Vector3()).x));
  const P = s => new Set(s);
  const tops = {
    tee: cloth(geo, joints, P(['chest', 'uparm', 'pelvis']), 0.012, (p, x, yy) => p !== 'uparm' || Math.abs(x) < sleeveL + 0.04 ? (p !== 'pelvis' || yy > waist - 0.06) : false),
    full: cloth(geo, joints, P(['chest', 'uparm', 'lowarm', 'pelvis']), 0.013, (p, x, yy) => p !== 'pelvis' || yy > waist - 0.07),
    kurta: cloth(geo, joints, P(['chest', 'uparm', 'lowarm', 'pelvis']), 0.016, (p, x, yy) => p !== 'pelvis' || yy > waist - 0.07),
  };
  const skirts = { kurta: skirt(body, joints, waist - 0.03, mid(knee, hip) - 0.03, 0.35), kurti: skirt(body, joints, waist - 0.03, knee - 0.02, 0.32), saree: skirt(body, joints, waist - 0.03, ankle + 0.04, 0.55) };
  const pants = {
    long: cloth(geo, joints, P(['pelvis', 'thigh', 'calf']), 0.016, (p, x, yy) => yy < waist + 0.02 && yy > ankle + 0.03, 60),
    loose: cloth(geo, joints, P(['pelvis', 'thigh', 'calf']), yy => 0.02 + Math.max(0, knee - yy) * 0.03, (p, x, yy) => yy < waist + 0.02 && yy > ankle + 0.02, 60),
  };
  const shoes = cloth(geo, joints, P(['foot', 'calf']), 0.008, (p, x, yy) => yy < ankle + 0.05);
  const headPos = by('Head').getWorldPosition(new THREE.Vector3());
  // the body without the skin that clothes cover: less to draw and no skin poking through fabric
  const bodies = new Map();
  const bodyFor = (...pieces) => { const key = pieces.map(x => x.uuid).join(); if (bodies.has(key)) return bodies.get(key);
    const idx = geo.index, tris = []; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (!pieces.some(pc => pc.userData.cover[a] && pc.userData.cover[b] && pc.userData.cover[c])) tris.push(a, b, c); }
    const bg = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(geo.attributes)) bg.setAttribute(n, a); bg.setIndex(tris); bg.boundingSphere = geo.boundingSphere; bodies.set(key, bg); return bg; };
  return { scene, body, extras, joints, tops, pants, shoes, skirts, headPos, g, bodyFor };
}

// ---------- materials (shared between characters with the same look)
const MATS = new Map();
let FABRIC = null;
function fabric() { // soft woven noise, tiled over the body's UVs, so clothes don't look like plastic
  if (FABRIC) return FABRIC; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const im = x.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const u = i % 128, v = (i / 128) | 0; const w = 128 + 18 * Math.sin(u * 1.6) * Math.sin(v * 1.6) + (Math.random() - 0.5) * 40; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = w; im.data[i * 4 + 3] = 255; }
  x.putImageData(im, 0, 0); FABRIC = new THREE.CanvasTexture(c); FABRIC.wrapS = FABRIC.wrapT = THREE.RepeatWrapping; FABRIC.repeat.set(10, 10); return FABRIC;
}
function clothMat(hex, rough = 0.88) { const k = 'c' + hex + rough; if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, skinning: true, bumpMap: fabric(), bumpScale: 0.006, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); return MATS.get(k); }
const LIGHTEST = new THREE.Color(0xf1c7a3);
function skinMat(src, hex) {
  const k = 's' + src.uuid + hex; if (MATS.has(k)) return MATS.get(k);
  const m = src.clone(); const c = new THREE.Color(hex); m.color.setRGB(Math.min(1, c.r / LIGHTEST.r * 1.04), Math.min(1, c.g / LIGHTEST.g * 1.02), Math.min(1, c.b / LIGHTEST.b)); m.roughness = 0.6; MATS.set(k, m); return m;
}
function hairMat(src, hex, skinned) { const k = 'h' + src.uuid + hex + !!skinned; if (!MATS.has(k)) { const m = src.clone(); m.color.set(hex).multiplyScalar(2.2); m.skinning = !!skinned; MATS.set(k, m); } return MATS.get(k); }

// ---------- one character
// A pivot under a bone whose children can be authored in the old box figure's coordinates (blockRef = the point of the
// old figure that should land on this bone, k = size ratio). Used for hats, glasses, chains, watches, hair.
function anchor(bone, target, blockRef, k, rot) {
  const a = new THREE.Group(); a.matrixAutoUpdate = false;
  const A = new THREE.Matrix4().compose(target, rot || new THREE.Quaternion(), new THREE.Vector3(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-blockRef.x, -blockRef.y, -blockRef.z));
  a.matrix.copy(bone.matrixWorld).invert().multiply(A); bone.add(a); return a;
}

export function makeHuman(gender) {
  const B = HUMANS.base[gender === 'f' ? 'f' : 'm']; const root = new THREE.Group(); root.name = 'human';
  const rig = cloneSkinned(B.scene); rig.scale.setScalar(S); root.add(rig); rig.updateMatrixWorld(true);
  let body = null; const extras = []; rig.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = false; if (o.material.name === 'Skin' || /Skin/i.test(o.material.name)) body = o; else extras.push(o); } });
  const bones = {}; rig.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const wear = (geo, m) => { const s = new THREE.SkinnedMesh(geo, m); s.frustumCulled = false; s.bind(body.skeleton, body.bindMatrix); rig.add(s); return s; };
  const parts = { top: wear(B.tops.tee, clothMat(0xd7331f)), pants: wear(B.pants.long, clothMat(0x2b3550)), shoes: wear(B.shoes, clothMat(0x1b1410, 0.6)), skirt: wear(B.skirts.kurta, clothMat(0xd7331f)) }; parts.skirt.visible = false;
  // anchors for the old accessories, in root (character) space at the bind pose
  const W = n => bones[n].getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
  const head = W(BONE.head), chest = W(BONE.chest);
  const headTop = head.clone().add(new THREE.Vector3(0, 0.12 * S, 0.01 * S));
  const hatA = anchor(bones.Head, headTop, new THREE.Vector3(0, 2.32 + 0.18, 0), 0.52);
  const chestA = anchor(bones[BONE.chest], chest.clone().add(new THREE.Vector3(0, -0.02 * S, 0)), new THREE.Vector3(0, 1.62, 0), 0.6);
  // the old arm hangs down -y from the shoulder and its wrist is 0.72 below it; the real forearm points along the T-pose arm
  const arm = side => { const lo = W('lowerarm_' + side), hand = W('hand_' + side); const dir = hand.clone().sub(lo).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); return anchor(bones['hand_' + side], hand.clone().add(dir.clone().multiplyScalar(-0.03 * S)), new THREE.Vector3(0, -0.72, 0), 0.42, q); };
  const wristL = arm('l'), wristR = arm('r');
  const hairA = new THREE.Group(); hairA.matrixAutoUpdate = false; hairA.matrix.copy(bones.Head.matrixWorld).invert().multiply(rig.matrixWorld); bones.Head.add(hairA);
  // animation
  const mixer = new THREE.AnimationMixer(rig); const acts = {};
  for (const [k, n] of Object.entries({ idle: 'Idle_Loop', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', run: 'Sprint_Loop', jab: 'Punch_Jab', cross: 'Punch_Cross', dance: 'Dance_Loop', sit: 'Sitting_Idle_Loop', drive: 'Driving_Loop', talk: 'Idle_Talking_Loop', hit: 'Hit_Chest', fall: 'Death01', swim: 'Swim_Fwd_Loop' })) {
    const c = HUMANS.clips[n]; if (!c) continue; const a = mixer.clipAction(c); if (/jab|cross|hit|fall/.test(k)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = k === 'fall'; } acts[k] = a;
  }
  const h = { root, rig, body, extras, bones, parts, gender: gender === 'f' ? 'f' : 'm', mixer, acts, cur: null, hatA, chestA, wristL, wristR, hairA, hair: null, beard: null, punch: 0, look: null };
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
const HAIR_STYLE = { m: ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_SimpleParted', 'Hair_Buns', null], f: ['Hair_Long', 'Hair_Long', 'Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'] };
// b: { g, skin, hair, hc, top, pants, acc } from the avatar creator (indices into the game's lists); colours resolved by the caller
export function dressHuman(h, o) {
  const B = HUMANS.base[h.gender];
  h.body.material = skinMat(B.body.material, o.skin);
  // men: T-shirt, kurta, jacket (full sleeves); women: kurti, top + jacket, saree
  const t = o.top | 0, f = h.gender === 'f';
  const topKey = f ? (t === 1 ? 'full' : 'kurta') : ['tee', 'kurta', 'full'][t] || 'tee', skirtKey = f ? [ 'kurti', null, 'saree'][t] : t === 1 ? 'kurta' : null;
  h.parts.top.geometry = B.tops[topKey]; h.parts.top.material = clothMat(o.shirt, 0.86);
  h.parts.skirt.visible = !!skirtKey; if (skirtKey) { h.parts.skirt.geometry = B.skirts[skirtKey]; h.parts.skirt.material = clothMat(o.shirt, 0.86); }
  const loose = o.pantsStyle === 1 || skirtKey === 'saree';
  h.parts.pants.geometry = loose ? B.pants.loose : B.pants.long; h.parts.pants.material = clothMat(skirtKey === 'saree' ? o.shirt : o.pants, 0.9);
  h.parts.shoes.material = clothMat(o.shoes || 0x1b1410, 0.55);
  h.body.geometry = B.bodyFor(h.parts.top.geometry, h.parts.pants.geometry, B.shoes);
  // hair and beard as meshes fixed to the head bone
  for (const k of ['hair', 'beard']) if (h[k]) { h.hairA.remove(h[k]); h[k] = null; }
  const name = HAIR_STYLE[h.gender][o.hair | 0]; const hm = name && HUMANS.hair[name];
  if (hm) { h.hair = new THREE.Mesh(hm.geometry, hairMat(hm.material, o.hairColor)); h.hair.matrixAutoUpdate = false; h.hair.matrix.copy(hm.matrixWorld); h.hairA.add(h.hair); }
  if (h.gender === 'm' && o.beard && HUMANS.hair.Hair_Beard) { const bm = HUMANS.hair.Hair_Beard; h.beard = new THREE.Mesh(bm.geometry, hairMat(bm.material, o.hairColor)); h.beard.matrixAutoUpdate = false; h.beard.matrix.copy(bm.matrixWorld); if (o.beard === 'moonchh') h.beard.matrix.multiply(new THREE.Matrix4().makeScale(1, 0.55, 1)); h.hairA.add(h.beard); }
  for (const e of h.extras) if (/Brow|Hair/i.test(e.material.name)) { e.userData.src = e.userData.src || e.material; e.material = hairMat(e.userData.src, o.hairColor, true); }
}
export function setHairVisible(h, v) { if (h.hair) h.hair.visible = v; }
