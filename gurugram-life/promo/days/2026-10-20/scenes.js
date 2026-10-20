// Day 4 · POV: Google Maps said "fastest route" (what the navigation said vs what Gurugram did)
window.__SCENES = h => { const { g, G, K, S } = h;
  // the instruction shows as a navigation banner instead of the yellow sticker
  const st = document.createElement('style'); st.textContent = `#rTime{top:150px!important;transform:translateX(-50%)!important;background:#0b7a46!important;color:#fff!important;border:0!important;border-radius:16px!important;font:800 26px/1 'Baloo 2'!important;padding:14px 22px 9px!important;box-shadow:0 6px 18px rgba(0,0,0,.45)}#rPov{top:40px!important}`; document.head.append(st);
  const ride = (type, x, z, r, vs) => { if (G.veh) g.dismount(); G.x = x; G.z = z; G.r = G.yaw = r; g.mount(type); G.vs = vs || 8; };
  return [
  // 0 hook: "stay in your lane" and a truck comes at you the wrong way (placed on NH-48 so the shot never depends on where traffic is)
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.45; h.traffic(true); const c = g.CARS.find(c => c.type === 'truck') || g.CARS[0]; S.c = c; c.along = 'z'; c.line = -373.5; c.p = 236; c.dir = -1; c.held = false; ride('chhotu', 206, -373.5, Math.PI / 2, 5); },
    tick(h, t) { K.KeyW = t > -0.6 && t < 0.9; if (t >= 0.9) G.vs *= 0.85; const c = S.c.mesh.position; h.camAt((G.x + c.x) / 2 - 3, 3.2, -384, (G.x + c.x) / 2, 1.3, -373.5, 3); } },
  // 1 "fastest route": the Iffco Chowk mahajam
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.36; h.setEvent('jam'); h.traffic(true); ride('chhotu', -52, -72, Math.PI / 2, 0); },
    tick(h, t) { K.KeyW = false; G.vs = 0; G.x = -52; const u = Math.max(0, t); h.camAt(-60 - u * 0.6, 4.2 + u * 0.3, -76.5, -20, 0.6, -71.5, 4); } },
  // 2 toll ahead: Kherki Daula
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.52; h.traffic(true); ride('cruiser', 262, -375, Math.PI / 2, 5); },
    tick(h, t) { K.KeyW = t > -0.8; if (G.vs > 5) G.vs = 5; h.chase(8, 3.4, -1.8, 4, 10); } },
  // 3 "faster by Rapid Metro": the long walk to Huda City Centre in the heat
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.5; G.x = -152; G.z = -83.5; G.r = G.yaw = -Math.PI / 2; },
    tick(h, t) { K.KeyW = true; K.ShiftLeft = false; h.camAt(G.x + 6, 1.5, G.z + 2.6, G.x - 18, 6.8, G.z - 3.5, 6); } },
  // 4 "turn left at the underpass": it is a lake
  { setup() { h.reset(); h.weather(3, 1); g.WX.wl = 1; g.WX.ww = 1; g.DAY.t = 0.62; h.setEvent('flood'); h.traffic(false); ride('chhotu', -262, -80, Math.PI / 2, 4.5); },
    tick(h, t) { g.WX.wl = 1; g.WX.ww = 1; K.KeyW = true; if (G.vs > 4.5) G.vs = 4.5; h.chase(9, 3.2, 2.2, 5, 7); },
    post(h) { for (const p of g.PEDS) if (Math.hypot(p.mesh.position.x - G.x, p.mesh.position.z - G.z) < 40) { p.mesh.visible = false; p.mesh.position.y = -50; } } },
  // 5 "you have arrived": by boat
  { setup() { h.reset(); h.weather(2, 1); g.WX.wl = 1; g.WX.ww = 1; g.DAY.t = 0.66; h.setEvent('flood'); h.traffic(false); g.setP({ vehicles: ['chhotu', 'naav'] }); ride('naav', -238, -80, Math.PI / 2, 5); },
    tick(h, t) { g.WX.wl = 1; g.WX.ww = 1; K.KeyW = true; if (G.vs > 5) G.vs = 5; h.front(8, 2.6, 2.4, 4); },
    post(h) { for (const p of g.PEDS) if (Math.hypot(p.mesh.position.x - G.x, p.mesh.position.z - G.z) < 40) { p.mesh.visible = false; p.mesh.position.y = -50; } } },
]; };
