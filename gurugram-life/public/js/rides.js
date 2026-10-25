// Real vehicles and the zebu cow: Sketchfab models (CC BY 4.0, names in Menu → Credits and on /about), shrunk for phones by
// promo/models/rides.mjs. Until a model arrives the game shows its box-built vehicle, then swaps the model in on the same group.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as RL from './realism.js';

// game vehicle type -> model file; sizes are baked in (length along +Z = front, wheels on y = 0)
export const MODEL_OF = { chhotu: 'hatch', khatara: 'hatch', cruiser: 'sedan', desert: 'jeep', police: 'jeep', auto: 'auto', bus: 'bus', truck: 'truck', dhakad: 'bike', scooty: 'scooter' };
const ORDER = ['auto', 'hatch', 'sedan', 'jeep', 'bus', 'truck', 'bike', 'scooter'];
const SRC = {}, DIM = {}; let COW = null, COW_CLIPS = null;
export const has = type => !!SRC[MODEL_OF[type]];
export const dims = type => DIM[MODEL_OF[type]];

function prep(root) {
  root.traverse(o => {
    if (!o.isMesh) return; const m = o.material, n = m.name || '';
    if (m.map) m.map.encoding = THREE.LinearEncoding; // the game renders in linear, like the people
    if (/bodymat/i.test(n)) { o.userData.paint = true; o.material = RL.paint(m.color.getHex()); }
    else if (/Transperent/.test(n)) o.material = new THREE.MeshPhongMaterial({ map: m.map, color: 0x3a444c, specular: 0xbbbbbb, shininess: 110, envMap: RL.envMap(), combine: THREE.MixOperation, reflectivity: 0.5, transparent: true, opacity: 0.85, depthWrite: false });
    else o.material = new THREE.MeshLambertMaterial({ map: m.map, color: m.color, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side });
  });
  const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()); return { Ln: s.z, Wd: s.x, H: s.y };
}

// loads one model at a time (traffic first) and calls back so waiting vehicles can be swapped
export async function loadRides(base, onModel) {
  const L = new GLTFLoader();
  for (const f of ORDER) { try { const g = await L.loadAsync(base + f + '.glb'); DIM[f] = prep(g.scene); SRC[f] = g.scene; onModel && onModel(f); } catch (e) { console.warn('Gurugram Life: vehicle model not loaded', f, e); } }
  try { const g = await L.loadAsync(base + 'cow.glb'); prepCow(g); onModel && onModel('cow'); } catch (e) { console.warn('Gurugram Life: cow model not loaded', e); }
}

// adds a copy of the model to g: shared geometry and textures, paint by colour (one material per colour)
// the two-wheelers are built a little small for a 1.8 m rider: scale them up to real size next to a person
const UPSCALE = { bike: 1.2, scooter: 1.15 };
// where the rider's hips go on each two-wheeler, in game units from the vehicle's centre (z: + is forward), after UPSCALE
export const SEAT = { dhakad: { z: -0.22, y: 1.1 }, scooty: { z: -0.48, y: 1.18 } }; // front of the saddle, so the hands reach the bars
export function addModel(g, type, col) {
  const f = MODEL_OF[type], m = SRC[f].clone(), k = UPSCALE[f] || 1;
  if (col != null) m.traverse(o => { if (o.userData.paint) o.material = RL.paint(col); });
  m.scale.setScalar(k); g.add(m); const d = DIM[f]; return k === 1 ? d : { Ln: d.Ln * k, Wd: d.Wd * k, H: d.H * k };
}

// ---------------------------------------------------------------- the cow (a zebu, as on Gurugram roads)
const COW_S = 0.17; // model units -> world: about 2 units (1.4 m) at the hump
const COATS = [0xffffff, 0xf2ece0, 0xe0d4c0, 0xc9b49a, 0xffffff];
function prepCow(g) {
  COW = g.scene; COW_CLIPS = { idle: g.animations[0], idle2: g.animations[1], walk: g.animations[2], graze: g.animations[3] };
  COW.traverse(o => { if (o.isSkinnedMesh) { const m = o.material; if (m.map) m.map.encoding = THREE.LinearEncoding; o.material = new THREE.MeshLambertMaterial({ map: m.map, color: 0xffffff, skinning: true }); o.frustumCulled = false; } });
}
export const cowReady = () => !!COW;
export function addCow(g) {
  const root = SkeletonUtils.clone(COW); root.scale.setScalar(COW_S); const coat = COATS[Math.floor(Math.random() * COATS.length)];
  root.traverse(o => { if (o.isSkinnedMesh) { o.material = o.material.clone(); o.material.color.setHex(coat); } });
  g.add(root); const mixer = new THREE.AnimationMixer(root);
  const acts = ['idle', 'idle2', 'graze'].map(k => mixer.clipAction(COW_CLIPS[k]));
  const cow = { mixer, acts, cur: -1, left: 0 }; pickCowAct(cow); mixer.setTime(Math.random() * 3); return cow;
}
function pickCowAct(c) { const i = Math.random() < 0.45 ? 2 : Math.random() < 0.5 ? 0 : 1; const a = c.acts[i]; if (i !== c.cur) { a.reset().play(); if (c.cur >= 0) a.crossFadeFrom(c.acts[c.cur], 0.6, false); c.cur = i; } c.left = a.getClip().duration * (1 + Math.floor(Math.random() * 3)); }
export function tickCow(c, dt) { c.left -= dt; if (c.left <= 0) pickCowAct(c); c.mixer.update(dt); }
