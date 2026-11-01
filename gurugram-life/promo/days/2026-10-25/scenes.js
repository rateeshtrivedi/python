// Day 9 · POV: Your Delhi friend said Gurugram is "just 30 minutes away" (a travel clock that keeps jumping)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; g.setP({ vehicles: ['chhotu'], cur: 'chhotu', plate: 'DL3C 4521', mods: {} }); };
  const pot = () => g.POTHOLES.find(p => Math.abs(p.x + 75) < 5 && p.z > -150 && p.z < 150) || g.POTHOLES[0]; // one on MG Road
  return [
  // 0 hook: on NH-48 at sunset, full of hope
  { setup() { go(0.74); at(-300, -375, Math.PI / 2); g.mount('chhotu'); G.vs = 24; },
    tick(h, t) { K.KeyW = true; h.camAt(G.x - 7.5, 1.9, G.z + 3.6, G.x + 4, 1.0, G.z, 6); } },
  // 1 the tank runs dry: the petrol pump
  { setup() { go(0.77); const p = g.PUMPS[0]; S.p = p; at(p.x + p.fx * 4, p.z + p.fz * 4, Math.atan2(-p.fx, -p.fz)); g.mount('chhotu'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; const p = S.p, u = Math.max(0, t); h.camAt(G.x + p.fz * 6 - p.fx * 2 + u * 0.3, 2.2, G.z - p.fx * 6 - p.fz * 2, G.x - p.fx * 2, 1.6, G.z - p.fz * 2, 3); } },
  // 2 MG Road potholes: the car jumps
  { setup() { go(0.8); const p = pot(); S.p = p; at(p.x, p.z - 26, 0); g.mount('chhotu'); G.vs = 16; },
    tick(h, t) { K.KeyW = true; const p = S.p; G.x += (p.x - G.x) * 0.2; if (Math.abs(G.z - p.z) < 1.6 && !S.hit) { S.hit = 1; G.jolt = 0.6; } h.camAt(G.x + 2.4, 0.7, G.z + 6.5, G.x, 0.9, G.z, 6); } },
  // 3 the "shortcut" gali on foot at night: street dogs on your tail
  { setup() { go(0.9); const all = g.DOGS.filter(x => x.side < 2); let pick = null; // a footpath stretch with no rubbish bags in the way
      for (const d of all) { const z0 = d.cz + (d.side === 0 ? 66.5 : -66.5); for (const off of [-40, -20, 0, 10]) { const x0 = d.cx + off; if (!g.GARBAGE.some(q => Math.abs(q.z - z0) < 3 && q.x > x0 - 4 && q.x < x0 + 30)) { pick = { d, z0, x0 }; break; } } if (pick) break; }
      pick = pick || { d: all[0], z0: all[0].cz + 66.5, x0: all[0].cx - 30 }; const d = all.slice(0, 3); S.d = d; S.z0 = pick.z0; at(pick.x0, pick.z0, Math.PI / 2); for (const x of d) { x.cx = pick.d.cx; x.cz = pick.d.cz; x.side = pick.d.side; } },
    tick(h, t) { K.KeyW = true; K.ShiftLeft = true; G.z = S.z0; G.r = G.yaw = Math.PI / 2; S.d.forEach((d, i) => { d.st = 'run'; d.dir = 1; d.t = 9; d.p = (G.x - d.cx) - 2.2 - i * 1.4; }); h.camAt(G.x + 4.2, 1.1, G.z + 1.0, G.x - 1.8, 0.7, G.z, 6); } },
  // 4 4:20 later: Neon Nights, the party is over
  { setup() { go(0.97); const d = g.DOORS.club; at(d.x + 1, d.z + 6, Math.PI); },
    tick(h, t) { K.KeyW = false; const u = Math.max(0, t); h.camAt(G.x + 1.6, 1.5, G.z - 3.2 + u * 0.15, G.x, 1.5, G.z, 3); if (t > 0.6 && !S.said) { S.said = 1; g.say(g.player, 'Bhai kahan ho?', 2.5); } } },
]; };
