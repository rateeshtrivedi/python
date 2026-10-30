// Day 14 · POV: You became a delivery boy in Gurugram (app pings vs reality, the rating falling every shot)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; g.setP({ vehicles: ['scooty'], cur: 'scooty', plate: null }); };
  const clear = () => { for (const m of S.props || []) g.scene.remove(m); S.props = []; };
  return [
  // 0 hook: the order pings at the dhaba: ₹38 for 9 km
  { setup() { go(0.52); const d = g.DOORS.dhaba; S.d = d; at(d.x + 2.5, d.z + 6, Math.PI / 2); g.mount('scooty'); G.vs = 0; },
    tick(h, t) { K.KeyW = t > 1.2; const d = S.d; h.camAt(G.x - 2.2, 1.7, G.z + 3.4, G.x + 1, 1.0, G.z, 4); } },
  // 1 "ETA 10 min": stuck behind a trala
  { setup() { go(0.56); at(75, -150, 0); g.mount('scooty'); G.vs = 8; const t = g.makeVehicle('truck'); t.position.set(75.5, 0.2, -141); g.scene.add(t); S.props = [t]; S.tz = -141; },
    tick(h, t) { K.KeyW = true; if (G.vs > 8) G.vs = 8; S.tz += 8 / 30 * 0.98; S.props[0].position.z = Math.max(S.tz, G.z + 6.5); h.camAt(G.x - 1.6, 1.8, G.z - 4.5, G.x, 1.6, G.z + 6, 6); }, done: clear },
  // 2 "gate pe aa jao": the society guard and his register
  { setup() { go(0.6); const d = g.DOORS.office; S.d = d; at(d.x + 1.5, d.z + 7, Math.PI); const gd = g.makeChar(0x1c1c1c); gd.position.set(d.x - 0.5, 0, d.z + 4.5); gd.rotation.y = 0; g.scene.add(gd); S.props = [gd]; S.gd = gd; },
    tick(h, t) { if (t > 0.3 && !S.s1) { S.s1 = 1; g.say({ mesh: S.gd }, 'Register mein entry karo!', 2.2); } const d = S.d; h.camAt(d.x + 4, 1.9, d.z + 9, d.x + 0.5, 1.4, d.z + 4.5, 3); }, done: clear },
  // 3 "24th floor, bhaiya": looking up the tower
  { setup() { go(0.64); at(-292, 56, Math.PI); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(G.x + 1.5, 0.8, G.z + 3.5, G.x - 6, 26 + u * 6, G.z - 38, 2); } },
  // 4 1 star, no tip: he eats it himself under a streetlight
  { setup() { go(0.9); at(-75, 120, 0); g.mount('scooty'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; if (t > 0.5 && !S.s) { S.s = 1; g.say(g.player, 'Khud kha lunga 😋', 2.6); } const u = Math.max(0, t); h.camAt(G.x + 3.4, 1.9, G.z + 4.6 - u * 0.2, G.x, 1.7, G.z, 3); } },
]; };
