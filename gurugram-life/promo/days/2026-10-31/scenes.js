// Day 15 · POV: Halloween in Gurugram hits different (horror title cards, a dark grade, the EMI as the final jump scare)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; h.traffic(false); };
  const clear = () => { for (const m of S.props || []) g.scene.remove(m); S.props = []; h.traffic(true); };
  return [
  // 1 Cyber Hub at 3 AM: empty, a slow creep in
  { setup() { go(0.13); at(150, -262, Math.PI); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(156 - u * 0.8, 1.3, -250 - u * 1.2, 150, 1.4, -262, 2); }, done: clear },
  // 2 power cut in the PG
  { setup() { go(0.95); g.setP({ home: 'pg', houses: ['street', 'pg'] }); S.ok = false; }, inside: true,
    tick(h, t) { if (!S.ok) { S.ok = g.goInside(true); return; } const u = Math.max(0, t); h.camAt(G.x + 2.2, 1.8, G.z + 2.6 - u * 0.2, G.x, 1.3, G.z, 1); } },
  // 3 the midnight auto: "meter nahi chalega"
  { setup() { go(0.02); at(-75, 60, Math.PI / 2); const a = g.makeVehicle('auto'); a.position.set(-71, 0.2, 61.5); a.rotation.y = -Math.PI / 2; g.scene.add(a); S.props = [a]; },
    tick(h, t) { if (t > 0.4 && !S.s) { S.s = 1; g.say(g.player, 'Meter se?', 2); } const u = Math.max(0, t); h.camAt(-74.5 - u * 0.2, 1.5, 65.5, -72, 1.0, 61.3, 3); }, done: clear },
  // 4 the landlord walks up out of the dark
  { setup() { go(0.04); at(75, 120, 0); const l = g.makeChar(0xf5f5f5); l.position.set(75, 0, 136); l.rotation.y = Math.PI; g.scene.add(l); S.props = [l]; S.l = l; S.lz = 136; },
    tick(h, t) { const u = Math.max(0, t); S.lz = Math.max(123, 136 - u * 4); S.l.position.z = S.lz; if (t > 0.6 && !S.s) { S.s = 1; g.say({ mesh: S.l }, 'Kiraya badh gaya 🙂', 2.2); } h.camAt(75.8, 1.6, 118.5, 75, 1.5, 130, 3); }, done: clear },
  // 5 jump scare: the EMI
  { setup() { go(0.06); at(-225, 0, 0); },
    tick(h, t) { const u = Math.max(0, t); const k = u < 0.5 ? u * 2 : 1; h.camAt(G.x, 1.75, G.z + 6 - k * 5.0, G.x, 1.65, G.z, 1); } },
]; };
