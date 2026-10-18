// Turns the Quaternius CC0 packs (Universal Base Characters + Universal Animation Library) into small game assets:
// public/models/{male,female,hair,anims}.glb
import { NodeIO, VertexLayout } from '@gltf-transform/core';
import { prune, dedup, resample, weld, mergeDocuments, unpartition } from '@gltf-transform/functions';
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
// usage: npm i --no-save @gltf-transform/core@4 @gltf-transform/functions@4 sharp@0.33 && node scripts/build-people.mjs <unpacked-dir> public/models
// <unpacked-dir> holds work/base (Base Characters/Godot - UE + Textures merged), work/hair (Hairstyles/Origin at 0/glTF (Godot) + Textures)
// and ual/... (the Universal Animation Library zip, unpacked). The zips are attached to the 'models' release on GitHub.
const Q = process.argv[2];
const BASE = Q + '/work/base', TEX = Q + '/work/base';
const HAIR = Q + '/work/hair', UAL = Q + '/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true }); const io = new NodeIO().setVertexLayout(VertexLayout.SEPARATE);
const jpg = async (file, size, q = 82) => sharp(file).resize(size, size).jpeg({ quality: q, mozjpeg: true }).toBuffer();
const KEEP_ATTR = new Set(['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']);
function slimPrims(doc) { for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) for (const s of p.listSemantics()) if (!KEEP_ATTR.has(s)) p.setAttribute(s, null); }
async function setTex(doc, mat, slot, buf, name) { const t = doc.createTexture(name).setImage(new Uint8Array(buf)).setMimeType('image/jpeg'); if (slot === 'base') mat.setBaseColorTexture(t); else mat.setNormalTexture(t); }

for (const [g, file, light] of [['male', 'Superhero_Male_FullBody.gltf', 'T_Superhero_Male_Ligh.png'], ['female', 'Superhero_Female_FullBody.gltf', 'T_Superhero_Female_Light_BaseColor.png']]) {
  const doc = await io.read(path.join(BASE, file)); slimPrims(doc);
  for (const mat of doc.getRoot().listMaterials()) {
    const n = mat.getName(); mat.setMetallicRoughnessTexture(null).setMetallicFactor(0).setDoubleSided(false);
    if (/Superhero/.test(n)) { await setTex(doc, mat, 'base', await jpg(path.join(TEX, light), 1024), g + '_skin'); await setTex(doc, mat, 'normal', await jpg(path.join(TEX, `T_Superhero_${g === 'male' ? 'Male' : 'Female'}_Normal.png`), 512, 88), g + '_nrm'); mat.setRoughnessFactor(0.62); mat.setName('Skin'); }
    else if (/Eyes/.test(n)) { await setTex(doc, mat, 'base', await jpg(path.join(TEX, 'T_Eye_Brown.png'), 256), 'eye'); mat.setNormalTexture(null); mat.setRoughnessFactor(0.25); mat.setName('Eyes'); }
    else { mat.setNormalTexture(null); mat.setName('Brows'); const bt = mat.getBaseColorTexture(); if (bt) mat.setBaseColorTexture(doc.createTexture('brow').setImage(new Uint8Array(await sharp(Buffer.from(bt.getImage())).resize(256, 256).png().toBuffer())).setMimeType('image/png')); mat.setAlphaMode('MASK').setAlphaCutoff(0.35).setDoubleSided(true); }
  }
  await doc.transform(dedup(), prune(), unpartition()); await io.write(path.join(OUT, g + '.glb'), doc); console.log(g, fs.statSync(path.join(OUT, g + '.glb')).size);
}
// hair: every style (and the beard) as a named mesh in one file, positioned for a 1.81 m body at the origin
{
  const files = fs.readdirSync(HAIR).filter(f => /^(Hair_|Eyebrows_).*\.gltf$/.test(f) && !/Eyebrows/.test(f)); let doc = null;
  for (const f of files) { const d = await io.read(path.join(HAIR, f)); slimPrims(d); for (const n of d.getRoot().listNodes()) n.setName(f.replace('.gltf', '')); if (!doc) doc = d; else mergeDocuments(doc, d); }
  const scenes = doc.getRoot().listScenes(); for (const s of scenes.slice(1)) { for (const c of s.listChildren()) scenes[0].addChild(c); s.dispose(); }
  for (const mat of doc.getRoot().listMaterials()) { mat.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.7); for (const [get, set, size, png] of [['getBaseColorTexture', 'setBaseColorTexture', 512, true], ['getNormalTexture', 'setNormalTexture', 256, false]]) { const t = mat[get](); if (!t) continue; const buf = png ? await sharp(Buffer.from(t.getImage())).resize(size, size).png().toBuffer() : await sharp(Buffer.from(t.getImage())).resize(size, size).jpeg({ quality: 85 }).toBuffer(); mat[set](doc.createTexture(t.getName()).setImage(new Uint8Array(buf)).setMimeType(png ? 'image/png' : 'image/jpeg')); } mat.setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(true); }
  await doc.transform(dedup(), prune(), unpartition()); await io.write(path.join(OUT, 'hair.glb'), doc); console.log('hair', fs.statSync(path.join(OUT, 'hair.glb')).size, files.join(' '));
}
// animations: only what the game uses, no mannequin mesh
{
  const KEEP = new Set(['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Punch_Jab', 'Punch_Cross', 'Hit_Chest', 'Death01', 'Dance_Loop', 'Driving_Loop', 'Sitting_Idle_Loop', 'Idle_Talking_Loop', 'Jump_Loop', 'Swim_Fwd_Loop']);
  const doc = await io.read(UAL); const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!KEEP.has(a.getName())) a.dispose();
  // fingers, scale and per-bone translation add megabytes but almost nothing visible: keep rotations, plus hip/root movement
  for (const a of root.listAnimations()) for (const c of a.listChannels()) { const n = c.getTargetNode(), name = n ? n.getName() : '', p = c.getTargetPath();
    if (/^(index|middle|ring|pinky|thumb)_/.test(name) || p === 'scale' || (p === 'translation' && !/^(pelvis|root)$/.test(name))) { const sm = c.getSampler(); c.dispose(); if (sm && !sm.listParents().some(x => x.propertyType === 'AnimationChannel')) sm.dispose(); } }
  for (const n of root.listNodes()) if (n.getMesh()) { n.setMesh(null); n.setSkin(null); }
  for (const m of root.listMeshes()) m.dispose(); for (const m of root.listMaterials()) m.dispose(); for (const t of root.listTextures()) t.dispose();
  for (const p of root.listMeshes().flatMap(m => m.listPrimitives())) p.dispose();
  for (const s of root.listSkins()) s.dispose();
  await doc.transform(resample({ tolerance: 0.002 }), dedup(), prune({ keepLeaves: true }));
  const used = new Set(); for (const a of root.listAnimations()) for (const sm of a.listSamplers()) { used.add(sm.getInput()); used.add(sm.getOutput()); }
  for (const a of root.listAccessors()) if (!used.has(a)) a.dispose(); // leftover mesh data and dropped finger/scale tracks
  await doc.transform(prune({ keepLeaves: true }), unpartition()); await io.write(path.join(OUT, 'anims.glb'), doc); console.log('anims', fs.statSync(path.join(OUT, 'anims.glb')).size, root.listAnimations().map(a => a.getName()).join(' '));
}
