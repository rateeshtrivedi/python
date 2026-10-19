// usage: node rides.mjs <folder with the original .glb files>/ <out folder>/
// Shrinks the Sketchfab vehicles and the zebu for the game: drop ground plates and foreign number plates, bake transforms,
// turn the long axis to +Z (front), scale to game length, sit on y=0, merge by material, simplify, textures to small JPEG/PNG.
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { quantize, resample, prune, dedup, weld, join, simplify, flatten, clearNodeParent, clearNodeTransform, transformMesh, unpartition } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer'; import sharp from 'sharp'; import fs from 'node:fs';
const SRC = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// file, out name, game length, yaw (radians, after which the front faces +Z), simplify ratio, texture size
const LIST = [
  ['ace_11_-_low_poly_model.glb', 'hatch', 4.6, +(process.env.Y_hatch ?? Math.PI), 0.3, 512],
  ['kiri_10_-_low_poly_model.glb', 'sedan', 5.4, +(process.env.Y_sedan ?? Math.PI), 0.35, 512],
  ['eugene_mk6_65_-_low_poly_model.glb', 'jeep', 5.0, +(process.env.Y_jeep ?? Math.PI), 0.25, 512],
  ['lct_3000_95_-_low_poly_model.glb', 'truck', 8.4, +(process.env.Y_truck ?? Math.PI), 0.3, 512],
  ['bus.glb', 'bus', 11, +(process.env.Y_bus ?? Math.PI), 0.8, 1024],
  ['autorikshaw_-_indian_tuk_tuk.glb', 'auto', 3.4, +(process.env.Y_auto ?? Math.PI), 0.5, 512],
  ['old_motorcycle.glb', 'bike', 2.5, +(process.env.Y_bike ?? Math.PI), 0.12, 512],
  ['old_scooter.glb', 'scooter', 2.2, +(process.env.Y_scooter ?? 0), 0.8, 512],
];
const ERR = { bus: 0.004, scooter: 0.004, auto: 0.012, bike: 0.03 };
const DROP = /^(Socle|lambert1|Numberplates_Misk_U)$/;
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
await MeshoptSimplifier.ready;
async function slimTextures(doc, size, keepNormal) {
  const root = doc.getRoot();
  // Sketchfab marks many opaque materials as BLEND: only real cut-outs (alpha in the texture) and real glass stay see-through
  for (const m of root.listMaterials()) { const t = m.getBaseColorTexture(); let cut = false; if (t) { const st = await sharp(Buffer.from(t.getImage())).stats(); cut = st.channels[3] && st.channels[3].min < 128; }
    const f = m.getBaseColorFactor(); if (/Transperent/.test(m.getName()) || (!cut && f[3] < 0.6)) m.setAlphaMode('BLEND'); else if (cut) m.setAlphaMode('MASK').setAlphaCutoff(0.5); else { m.setAlphaMode('OPAQUE'); m.setBaseColorFactor([f[0], f[1], f[2], 1]); } }
  for (const m of root.listMaterials()) { m.setMetallicFactor(0).setRoughnessFactor(0.6).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null); if (!keepNormal) m.setNormalTexture(null); }
  await doc.transform(prune());
  for (const t of root.listTextures()) {
    const alpha = t.listParents().some(p => p.propertyType === 'Material' && p.getAlphaMode() === 'MASK' && p.getBaseColorTexture() === t);
    const img = sharp(Buffer.from(t.getImage())); const meta = await img.metadata(); const s = Math.min(size, meta.width || size);
    const buf = alpha ? await img.resize(s, s).png({ palette: true }).toBuffer() : await img.resize(s, s).flatten({ background: '#808080' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    t.setImage(new Uint8Array(buf)).setMimeType(alpha ? 'image/png' : 'image/jpeg').setURI('');
  }
}
for (const [file, name, len, yaw, ratio, tex] of LIST) {
  if (only && !only.includes(name)) continue;
  const doc = await io.read(SRC + file); const root = doc.getRoot(); const ex = root.getAsset().extras || {};
  for (const n of root.listNodes()) { const m = n.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) if (DROP.test(p.getMaterial()?.getName() || '')) p.dispose(); }
  const scene = root.listScenes()[0];
  for (const n of root.listNodes()) if (n.getMesh()) clearNodeParent(n);
  for (const n of root.listNodes()) if (n.getMesh()) clearNodeTransform(n);
  await doc.transform(prune());
  // long axis along Z
  let b = getBounds(scene); let sx = b.max[0] - b.min[0], sz = b.max[2] - b.min[2]; let a = yaw + (sx > sz ? Math.PI / 2 : 0);
  const c = Math.cos(a), s = Math.sin(a); const R = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  for (const m of root.listMeshes()) transformMesh(m, R);
  b = getBounds(scene); const k = len / (b.max[2] - b.min[2]); const cx = (b.max[0] + b.min[0]) / 2, cz = (b.max[2] + b.min[2]) / 2;
  const T = [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, -cx * k, -b.min[1] * k, -cz * k, 1];
  for (const m of root.listMeshes()) transformMesh(m, T);
  await doc.transform(flatten(), join({ keepNamed: false }), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: ERR[name] ?? 0.01, lockBorder: false }), dedup(), prune());
  await slimTextures(doc, tex, false);
  root.getAsset().extras = { title: ex.title, author: ex.author, license: ex.license, source: ex.source };
  await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), unpartition());
  await io.write(OUT + name + '.glb', doc);
  b = getBounds(root.listScenes()[0]); let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
  console.log(name, (fs.statSync(OUT + name + '.glb').size / 1024).toFixed(0) + 'K', 'tris', tris, 'size', b.max.map((v, i) => (v - b.min[i]).toFixed(2)).join('x'), 'prims', root.listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0), root.listMaterials().map(m => m.getName()).join(','));
}
// zebu: skinned, keep the rig; colour only, smaller textures, fewer triangles
if (!only || only.includes('cow')) {
  const doc = await io.read(SRC + 'zebu_bull.glb'); const root = doc.getRoot(); const ex = root.getAsset().extras || {};
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.006, lockBorder: false }), dedup(), prune());
  await slimTextures(doc, 512, false);
  root.getAsset().extras = { title: ex.title, author: ex.author, license: ex.license, source: ex.source };
  await doc.transform(resample({ tolerance: 0.002 }), unpartition()); await io.write(OUT + 'cow.glb', doc);
  let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
  console.log('cow', (fs.statSync(OUT + 'cow.glb').size / 1024).toFixed(0) + 'K', 'tris', tris, root.listMaterials().map(m => m.getName() + (m.getBaseColorTexture() ? '*' : '')).join(','));
}
