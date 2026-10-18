// Street dogs: the Khronos "Fox" sample (model CC0 by PixelMannen; rig and animation CC-BY 4.0 by tomkranis), recoloured into
// tan, brown, black and white desi dogs. They wander the footpaths, stop to sniff, bark when the player walks up, and run off
// from speeding vehicles or a running player. Far-away dogs skip their animation update.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';

const S = 0.0115;                 // fox units -> world units: about a 60 cm tall street dog next to 2.55-unit people
const COATS = [0xc9a06a, 0xb8875a, 0x8a5a35, 0x3b332e, 0xe6dccb, 0xd2b48c];
let SRC = null, CLIPS = null, GREY = null;
export const DOGS = [];

export async function loadDogs(url) {
  const g = await new GLTFLoader().loadAsync(url); SRC = g.scene; CLIPS = {}; for (const a of g.animations) CLIPS[a.name] = a;
  SRC.traverse(o => { if (o.isSkinnedMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); /* the sample ships without normals */ const m = o.material, img = m.map && m.map.image; if (img) GREY = greyMap(img, m.map); } });
}
// the fox texture is orange: keep its shading, drop its colour, then every dog tints it with its own coat
function greyMap(img, src) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 0; i < p.length; i += 4) { const l = Math.min(255, (0.3 * p[i] + 0.55 * p[i + 1] + 0.15 * p[i + 2]) * 1.9 + 30); p[i] = p[i + 1] = p[i + 2] = l; } x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = src.flipY; t.wrapS = src.wrapS; t.wrapT = src.wrapT; return t;
}
export const ready = () => !!SRC;

export function makeDog() {
  const root = SkeletonUtils.clone(SRC); root.scale.setScalar(S); const coat = COATS[Math.floor(Math.random() * COATS.length)];
  root.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = false; o.material = new THREE.MeshLambertMaterial({ map: GREY, color: coat, skinning: true }); } });
  const g = new THREE.Group(); g.add(root); const mixer = new THREE.AnimationMixer(root), acts = {};
  for (const k of ['Survey', 'Walk', 'Run']) if (CLIPS[k]) acts[k] = mixer.clipAction(CLIPS[k]);
  return { mesh: g, mixer, acts, cur: null };
}
export function play(d, k, speed) { const a = d.acts[k]; if (!a) return; a.timeScale = speed || 1; if (d.cur === k) return; const prev = d.cur && d.acts[d.cur]; a.reset().play(); if (prev) a.crossFadeFrom(prev, 0.25, false); d.cur = k; }
