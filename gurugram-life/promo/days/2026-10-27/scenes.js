// Day 11 · POV: Rating Gurugram's roads out of 10 (big score cards; the one 10/10 ends in the air)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; g.setP({ vehicles: ['khatara'], cur: 'khatara', mods: {} }); };
  return [
  // 0 hook: the footpath, rubbish bags to jump over
  { setup() { go(0.45); const q = g.GARBAGE.find(p => Math.abs(p.x) < 300 && Math.abs(p.z) < 300) || g.GARBAGE[0]; S.q = q; const horiz = [-375, -225, -75, 75, 225, 375].some(r => Math.abs(q.z - r) < 12); S.ax = horiz ? 'x' : 'z'; if (horiz) at(q.x - 7, q.z, Math.PI / 2); else at(q.x, q.z - 7, 0); },
    tick(h, t) { K.KeyW = true; const d = Math.hypot(G.x - S.q.x, G.z - S.q.z); K.Space = d < 2.4 && d > 0.6; const fx = Math.sin(G.r), fz = Math.cos(G.r); h.camAt(G.x + fz * 4.2 + fx * 1.5, 1.6, G.z - fx * 4.2 + fz * 1.5, G.x + fx * 1.5, 1.0, G.z + fz * 1.5, 6); } },
  // 1 cow/10: the crossing belongs to them
  { setup() { go(0.55); const c = g.COWS[0]; S.c = c; const cx = c.mesh.position.x, cz = c.mesh.position.z; S.cx = cx; S.cz = cz; at(cx, cz - 8, 0); g.mount('khatara'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; if (t > 0.8 && !S.h) { S.h = 1; g.say(g.player, 'Hato na, mataji!', 2.2); } h.camAt(G.x - 3.6, 2.8, G.z - 5.5, S.cx + 1, 0.6, S.cz, 3); } },
  // 2 the night road with no streetlights
  { setup() { go(0.985); at(375, -120, 0); g.mount('khatara'); G.vs = 14; },
    tick(h, t) { K.KeyW = true; if (G.vs > 15) G.vs = 15; h.chase(6.5, 2.6, 1.2, 5, 8); } },
  // 3 Golf Course Road: smooth, wide, 10/10
  { setup() { go(0.7); at(-225, -240, 0); g.mount('khatara'); G.vs = 26; },
    tick(h, t) { K.KeyW = true; K.ShiftLeft = true; h.camAt(G.x + 2.6, 0.7, G.z + 7, G.x, 0.9, G.z, 7); } },
  // 4 ...and the "speed breaker": the car takes off
  { setup() { go(0.71); const R = g.RAMPS[2]; S.R = R; at(R.x - Math.sin(R.r) * 16, R.z - Math.cos(R.r) * 16, R.r); g.mount('khatara'); G.vs = 28; },
    tick(h, t) { K.KeyW = true; G.vs = Math.max(G.vs, 26); const R = S.R; h.camAt(R.x + 7, 1.6, R.z + 9, G.x, 1.4 + (G.air || 0) * 0.5, G.z, 4); } },
]; };
