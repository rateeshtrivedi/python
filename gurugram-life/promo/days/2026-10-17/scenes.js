// Day 1 · POV: Day 1 of your 'corporate job' in Gurugram (timestamps format)
window.__SCENES = h => { const { g, G, K, S } = h; return [
  // 0 hook: pulling a driver out of his car
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.36; h.traffic(true);
      const c = g.CARS.filter(c => c.type !== 'bus' && c.type !== 'truck' && c.mesh.visible).sort((a, b) => Math.hypot(a.mesh.position.x - G.x, a.mesh.position.z - G.z) - Math.hypot(b.mesh.position.x - G.x, b.mesh.position.z - G.z))[0];
      S.c = c; c.held = true; const p = g.carAt(c); G.x = p.x + p.fz * 3.4; G.z = p.z - p.fx * 3.4; G.r = G.yaw = Math.atan2(p.x - G.x, p.z - G.z);
      g.startJack({ c }); S.n = g.FIGHTERS[g.FIGHTERS.length - 1]; S.n.hp = 18; S.n.x = G.x + Math.sin(G.r) * 1.4; S.n.z = G.z + Math.cos(G.r) * 1.4; S.n.cd = 9; S.p = 0; },
    tick(h, t) { G.hp = 100; const n = S.n; if (n && n.state !== 'ko') { n.cd = 9; G.r = G.yaw = Math.atan2(n.x - G.x, n.z - G.z); }
      if (t > 0.35 && S.p < 1) { S.p = 1; g.punch(); } if (t > 0.95 && S.p < 2) { S.p = 2; g.punch(); } if (t > 1.5 && S.p < 3) { S.p = 3; g.punch(); }
      const fx = Math.sin(G.r), fz = Math.cos(G.r); const mx = n ? (G.x + n.x) / 2 : G.x, mz = n ? (G.z + n.z) / 2 : G.z; h.camAt(mx + fz * 5.2 - fx * 1.2, 1.9, mz - fx * 5.2 - fz * 1.2, mx, 1.1, mz, 1); } },
  // 1 8:00 AM: cab cancelled, cars fly past
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.34; h.traffic(true); G.x = -213.5; G.z = -120; G.r = G.yaw = -Math.PI / 2; },
    tick(h, t) { h.camAt(G.x - 17, 1.5, G.z + 3, G.x, 1.4, G.z, 1); } },
  // 2 8:31 AM: police joined the commute
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.36; h.traffic(false); G.x = 75.5; G.z = -260; G.r = G.yaw = 0; g.mount('chhotu'); G.vs = 18; g.startChase({ secs: 999 }); },
    tick(h, t) { K.KeyW = true; const c = G.chase; if (c) { c.wait = 1e12; c.x = G.x - Math.sin(G.r) * 7; c.z = G.z - Math.cos(G.r) * 7; }
      if (t > 0.7 && !S.s && g.CJ) { S.s = 1; g.say(g.CJ, 'Rok gaadi!', 2); } h.front(8, 2.6, 2.5, 6); } },
  // 3 9:45 AM: TechNova Towers
  { setup() { h.reset(); g.enterInterior('office'); }, inside: true,
    tick(h, t) { if (G.inside !== 'office') return; const a = 0.6 + Math.max(0, t) * 0.25; h.camAt(G.x + Math.sin(a) * 6.5, 2.9, G.z + Math.cos(a) * 6.5, G.x, 1.3, G.z, 1); } },
  // 4 1:00 PM: dhaba
  { setup() { h.reset(); g.enterInterior('dhaba'); }, inside: true,
    tick(h, t) { if (G.inside !== 'dhaba') return; const u = Math.max(0, t); h.camAt(G.x + 1.8 - u * 0.4, 3.0, G.z + 3.0, G.x - 0.8, 1.0, G.z - 7, 1); } },
  // 5 7:30 PM: stuck behind a baraat
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.8; const t = g.serverNow(); G.ev = { type: 'baraat', id: 'reel', name: 'baraat', start: t - 300, end: t + 300 }; G.x = -222; G.z = 12; G.r = G.yaw = Math.PI; g.mount('chhotu'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; h.camAt(G.x + 4.5, 3.2, G.z + 6.5, G.x - 0.5, 1.2, G.z - 8, 1); } },
  // 6 11:00 PM: fireworks for no reason
  { setup() { h.reset(); h.weather(0, 0); const t = g.serverNow(); G.ev = { type: 'diwali', id: 'reel', name: 'diwali', start: t - 5, end: t + 600 }; G.x = -40; G.z = -190; G.r = G.yaw = Math.PI; S.f = -9; },
    tick(h, t) { G.dance = true; const tt = t < 0 ? (S.pre = (S.pre || 0) + 1 / 30) - 2 : t; if (tt > S.f) { S.f = tt + 0.22; g.firework(G.x + (Math.random() - 0.5) * 70, G.z - 85 - Math.random() * 50); } h.camAt(G.x + 1.6, 1.1, G.z + 4.2, G.x - 2, 22, G.z - 90, 1); } },
]; };
