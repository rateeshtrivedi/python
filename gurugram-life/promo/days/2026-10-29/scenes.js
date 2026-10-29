// Day 13 · POV: Things you only see in Gurugram (countdown #5 → #1, each a "wait, what?" shot; #1 is the rent)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; };
  const prop = (type, mods, plate, x, z, r) => { const m = g.makeVehicle(type, null, mods || {}, plate || null); m.position.set(x, type === 'naav' ? 0.05 : 0.2, z); m.rotation.y = r; g.scene.add(m); S.props = (S.props || []).concat(m); return m; };
  const clear = () => { for (const m of S.props || []) g.scene.remove(m); S.props = []; };
  return [
  // #5 a tractor parked next to a supercar, under the glass towers of Cyber Hub
  { setup() { go(0.5); at(158, -240, Math.PI); prop('tractor', null, null, 152, -250, Math.PI / 2); prop('cruiser', { glow: 1 }, 'HR26 9999', 152, -256.5, Math.PI / 2); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(161 - u * 0.5, 2.2, -246 - u * 0.4, 152, 1.6, -253.5, 3); }, done: clear },
  // #4 a ghodi parked at the mall gate
  { setup() { go(0.56); const d = g.DOORS.mall; S.d = d; at(d.x + 3, d.z + 9, Math.PI); prop('horse', null, null, d.x - 1.5, d.z + 6, Math.PI / 2); },
    tick(h, t) { const d = S.d, u = Math.max(0, t); h.camAt(d.x + 5 - u * 0.4, 2.0, d.z + 13, d.x - 1, 2.8, d.z + 3, 3); }, done: clear },
  // #3 a VIP number on a Scooty
  { setup() { go(0.62); g.setP({ vehicles: ['scooty'], cur: 'scooty', plate: 'HR26 0007' }); at(-75, 40, 0); g.mount('scooty'); G.vs = 7; },
    tick(h, t) { K.KeyW = true; if (G.vs > 7) G.vs = 7; h.camAt(G.x + 0.5, 0.95, G.z - 2.2, G.x, 0.85, G.z, 8); } },
  // #2 a boat parked in a dry sector lane
  { setup() { go(0.68); at(240, 152, Math.PI); prop('naav', null, null, 221, 132, 0.2); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(226 + u * 0.4, 2.3, 141, 221, 0.9, 132, 3); }, done: clear },
  // #1 the rent: a 1BHK for ₹45,000
  { setup() { go(0.4); g.setP({ home: 'room', houses: ['street', 'room'] }); S.ok = false; }, inside: true,
    tick(h, t) { if (!S.ok) { S.ok = g.goInside(true); return; } const u = Math.max(0, t); h.camAt(G.x + 2.6 - u * 0.3, 3.2, G.z + 3.0, G.x - 1, 1.2, G.z - 2, 1); } },
]; };
