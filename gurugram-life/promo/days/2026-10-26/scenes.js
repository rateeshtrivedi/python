// Day 10 · POV: HR said the Diwali bonus is "coming soon" (HR's messages vs what you already spent, the total running into the red)
window.__SCENES = h => { const { g, G, K, S } = h; const DESK = { x: 2290, z: 2002.2 };
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const office = () => { if (G.inside !== 'office') { g.enterInterior('office'); return false; } return true; };
  return [
  // 0 hook: the desk, the HR mail
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.4; S.ok = false; }, inside: true,
    tick(h, t) { if (!S.ok) { S.ok = office(); return; } at(DESK.x, DESK.z - 0.6, Math.PI); const u = Math.max(0, t); h.camAt(DESK.x + 1.6 - u * 0.2, 2.0, DESK.z + 2.2 - u * 0.25, DESK.x, 1.5, DESK.z - 1.0, 1); } },
  // 1 Neon Nights: a bottle on the bonus that hasn't come
  { setup() { h.reset(); g.enterInterior('club'); }, inside: true,
    tick(h, t) { if (G.inside !== 'club') return; const I = g.INTERIOR.club; G.x = I.ox; G.z = I.oz; G.dance = true; const a = 0.3 + Math.max(0, t) * 0.3; h.camAt(G.x + Math.sin(a) * 4.2, 2.2, G.z + Math.cos(a) * 4.2, G.x, 1.4, G.z, 1); } },
  // 2 Diwali night: rockets "on the company"
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.88; h.setEvent('diwali'); at(-292, 56, Math.PI); S.f = 0; },
    tick(h, t) { if (t > S.f) { S.f = t + 0.45; g.firework(G.x + (Math.random() - 0.5) * 16, G.z - 14 - Math.random() * 8); } const u = Math.max(0, t); h.camAt(G.x + 1.6, 0.9, G.z + 3.5 - u * 0.2, G.x - 0.5, 9 + u, G.z - 16, 3); } },
  // 3 Goyal Jewellers: a kangan for Mummy, "bonus aayega na"
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.62; at(-300, 58, Math.PI); },
    tick(h, t) { K.KeyW = t > 0.1 && t < 1.6; const u = Math.max(0, t); h.camAt(-296.5 - u * 0.6, 2.0, 61.5, -300, 3.0, 47, 3); } },
  // 4 the bonus: back at the desk
  { setup() { h.reset(); S.ok = false; }, inside: true,
    tick(h, t) { if (!S.ok) { S.ok = office(); return; } at(DESK.x, DESK.z - 0.6, 0); const u = Math.max(0, t); if (t > 0.5 && !S.said) { S.said = 1; g.say(g.player, '₹501?!', 2.5); } h.camAt(DESK.x - 0.8, 1.7, DESK.z + 1.8 - u * 0.15, DESK.x, 1.5, DESK.z - 0.6, 1); } },
]; };
