// Day 3 · POV: Monday at TechNova Towers ("things my manager said" vs what happened)
window.__SCENES = h => { const { g, G, K, S } = h; const DESK = { x: 2290, z: 2002.2 };
  const office = () => { if (G.inside !== 'office') { g.enterInterior('office'); return false; } return true; };
  const ride = (type, x, z, r) => { if (G.veh) g.dismount(); G.x = x; G.z = z; G.r = G.yaw = r; g.mount(type); G.vs = 9; };
  return [
  // 0 hook: wide shot over the open office, a full floor of desks on a Monday morning
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.38; S.ok = false; },
    tick(h, t) { if (!S.ok) { S.ok = office(); if (S.ok) { G.x = DESK.x; G.z = DESK.z; G.r = G.yaw = Math.PI; } return; } const u = Math.max(0, t); h.camAt(2316 - u * 1.2, 7.5 - u * 0.4, 2021 - u * 0.8, 2292, 1.0, 1996, 1); } },
  // 1 at the desk, the "quick call" that never ends
  { setup() { h.reset(); S.ok = false; },
    tick(h, t) { if (!S.ok) { S.ok = office(); if (S.ok) { G.x = DESK.x; G.z = DESK.z; G.r = G.yaw = Math.PI; } return; } const u = Math.max(0, t); h.camAt(DESK.x + 2.4 - u * 0.25, 2.3, DESK.z + 2.6 - u * 0.2, DESK.x, 1.5, DESK.z - 1.2, 1); } },
  // 2 the commute: an auto rickshaw crawling through traffic
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.36; h.traffic(true); ride('auto', 71.5, -150, 0); },
    tick(h, t) { K.KeyW = t > -0.4; if (G.vs > 8) G.vs = 8; h.chase(6.5, 3.0, 1.2, 4, 6); } },
  // 3 the side hustle: scooty deliveries in the rain
  { setup() { h.reset(); h.weather(2, 0.85); g.WX.ww = 0; g.DAY.t = 0.58; h.traffic(true); ride('scooty', -228.5, -60, 0); },
    tick(h, t) { g.WX.ww = 0; K.KeyW = t > -0.4; h.chase(5.5, 2.4, -1.0, 4, 5); } },
  // 4 night shift: a cab down Golf Course Road
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.9; h.traffic(true); ride('chhotu', -370, 71.5, Math.PI / 2); },
    tick(h, t) { K.KeyW = t > -0.4; h.chase(8, 3.2, 1.5, 4, 8); } },
  // 5 the payoff: from the footpath to a penthouse on Golf Course Road (the new Sapno ka Shehar homes)
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.75; g.setP({ home: 'pent', houses: ['street', 'pg', 'room', 'flat', 'pent'], vehicles: ['chhotu', 'desert', 'cruiser'], bling: ['chain', 'watch', 'ring'], spouse: { stage: 5, g: 'f', name: 'Simran', seed: 4242 } }); G.x = 2000; G.z = 2600; S.ok = false; },
    tick(h, t) { if (!S.ok) { S.ok = g.goInside(true); if (S.ok) { G.x = 1992.6; G.z = 2603.6; G.r = G.yaw = 0.3; } return; } const u = Math.max(0, t); h.camAt(1995.5 - u * 0.5, 2.5, 2611 - u * 0.9, 1991.6, 1.9, 2602.5, 1); } },
]; };
