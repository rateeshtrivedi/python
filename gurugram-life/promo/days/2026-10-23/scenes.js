// Day 7 · POV: Friday night in Gurugram (night-out speedrun: logged off at 7, timestamps till the naka)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const night = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; };
  return [
  // 0 hook 7:02 PM: logged off, sprinting out of Cyber Hub
  { setup() { night(0.79); at(150, -262, Math.PI); },
    tick(h, t) { K.KeyW = t > -0.3; K.ShiftLeft = true; h.camAt(G.x + 1.4, 1.5, G.z - 4.2, G.x, 1.4, G.z + 2, 6); } },
  // 1 7:20 PM: Ambience Mall, new shirt
  { setup() { h.reset(); g.enterInterior('mall'); }, inside: true,
    tick(h, t) { if (G.inside !== 'mall') return; const a = 0.4 + Math.max(0, t) * 0.35; h.camAt(G.x + Math.sin(a) * 4.8, 2.0, G.z + Math.cos(a) * 4.8, G.x, 1.3, G.z, 1); } },
  // 2 8:05 PM: neon underglow on Golf Course Road
  { setup() { night(0.84); g.setP({ mods: { chhotu: { glow: 1 } } }); at(-222, -40, 0); g.mount('chhotu'); G.vs = 12; },
    tick(h, t) { K.KeyW = true; h.camAt(G.x + 3.2, 0.7, G.z + 1.5, G.x, 0.6, G.z + 3, 6); } },
  // 3 9:10 PM: IPL on the Cyber Hub big screen
  { setup() { night(0.88); h.setEvent('ipl'); at(150, -291, Math.PI); G.dance = true; },
    tick(h, t) { G.dance = true; const u = Math.max(0, t); h.camAt(151.5 - u * 0.3, 1.5, -284 + u * 0.4, 150, 8.5, -309, 3); } },
  // 4 10:30 PM: "just one race"
  { setup() { night(0.9); at(-222, -150, 0); g.mount('chhotu'); G.vs = 26; },
    tick(h, t) { K.KeyW = true; K.ShiftLeft = true; h.camAt(G.x - 1.9, 0.55, G.z - 3.2, G.x + 0.3, 0.9, G.z + 8, 8); } },
  // 5 11:48 PM: the naka at Iffco Chowk (barricades across the road, the car rolls up and stops)
  { setup() { night(0.95); at(-16, -76.5, Math.PI / 2); g.mount('chhotu'); G.vs = 7; },
    tick(h, t) { K.KeyW = false; if (G.x > -5) G.vs = 0; else G.vs = Math.max(2.5, G.vs * 0.985); const u = Math.max(0, t); h.camAt(3.2 - u * 0.2, 1.7, -71.5, G.x - 1, 0.9, G.z, 3); } },
]; };
