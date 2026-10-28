// Day 12 · POV: You on the phone with Mummy (what you tell her, subtitled, vs what is actually on screen)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; g.setP({ gang: [], vehicles: ['chhotu'], cur: 'chhotu' }); g.syncGang(); };
  const foe = (name, x, z) => { const n = g.makeFighter(name, x, z, 999, 0, 0x3a3a3a); n.state = 'aggro'; g.FIGHTERS.push(n); return n; };
  return [
  // 0 hook: "office mein hoon": a street brawl with the chele
  { setup() { go(0.47); at(60, 75.5, Math.PI / 2); g.setP({ gang: [{ n: 'Monu', s: 1 }, { n: 'Sonu', s: 2 }, { n: 'Pinku', s: 4 }] }); g.syncGang(); S.f = [foe('Gali ka chhora', 63, 75), foe('Chhora 2', 64, 77), foe('Chhora 3', 65, 73.5)]; S.p = 0; },
    tick(h, t) { if (t > S.p) { S.p = t + 0.5; g.punch(); } h.camAt(G.x - 2.5, 1.9, G.z + 5.5, G.x + 2, 1.2, G.z, 3); },
    done() { for (const n of S.f) { const i = g.FIGHTERS.indexOf(n); if (i >= 0) g.FIGHTERS.splice(i, 1); g.scene.remove(n.mesh); } } },
  // 1 "khana kha liya": the golgappa thela
  { setup() { go(0.6); at(g.GOL.x + 1.4, g.GOL.z + 1.4, Math.atan2(-1.4, -1.4)); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(g.GOL.x + 4.2, 1.7, g.GOL.z - 0.6 + u * 0.2, g.GOL.x + 1.0, 1.2, g.GOL.z + 1.0, 3); } },
  // 2 "bas ghar pahunch gaya": the police jeep right behind
  { setup() { go(0.86); at(-75, -250, 0); g.mount('chhotu'); G.vs = 25; g.startChase({ near: true, secs: 60, sp: 25 }); S.dogs = g.DOGS.map(d => [d, d.cx]); for (const d of g.DOGS) d.cx += 3000; /* keep street dogs out of this shot */ G.chase.x = G.x + 0.5; G.chase.z = G.z - 13; },
    post(h) { for (const c of g.COWS) if (c.mesh) c.mesh.visible = false; }, done() { for (const c of g.COWS) if (c.mesh) c.mesh.visible = true; for (const [d, cx] of S.dogs || []) d.cx = cx; },
    tick(h, t) { K.KeyW = true; G.vs = 25; if (G.chase) G.chase.sp = 25; if (g.CJ) g.CJ.visible = true; h.camAt(G.x + 2.6, 1.9, G.z + 8.5, G.x, 1.0, G.z - 7, 6); } },
  // 3 "jaldi so jaunga": 2 AM at the theka
  { setup() { h.reset(); g.DAY.t = 0.08; g.enterInterior('theka'); }, inside: true,
    tick(h, t) { if (G.inside !== 'theka') return; G.dance = true; const a = 0.8 + Math.max(0, t) * 0.25; h.camAt(G.x + Math.sin(a) * 3.6, 2.0, G.z + Math.cos(a) * 3.6, G.x, 1.3, G.z, 1); } },
  // 4 Mummy calls again: Civil Hospital
  { setup() { go(0.35); at(g.HOSPITAL.x, g.HOSPITAL.z + 7, Math.PI); S.lie = true; },
    post(h) { const p = g.player; if (p) { p.rotation.x = -Math.PI / 2; p.position.y = 0.35; } },
    tick(h, t) { const u = Math.max(0, t); h.camAt(G.x + 3.5, 2.6 + u * 0.2, G.z + 4.5, G.x, 1.4, G.z - 6, 3); },
    done() { const p = g.player; if (p) { p.rotation.x = 0; p.position.y = 0; } } },
]; };
