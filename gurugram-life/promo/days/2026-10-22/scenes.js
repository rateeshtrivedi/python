// Day 6 · POV: a baraat blocked Golf Course Road ("if you can't beat them, join them": six levels from honking to the family photo)
window.__SCENES = h => { const { g, G, K, S } = h;
  const BX = -222, BZ = 30; // the procession, held still on Golf Course Road
  const baraat = () => { const t = g.serverNow(), D = 1e10, p = (BZ + 420) / 840; G.ev = { type: 'baraat', id: 'reel', name: 'baraat', start: t - p * D, end: t - p * D + D, data: {} }; };
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const base = (dt) => { h.reset(); h.weather(0, 0); g.DAY.t = dt; h.traffic(false); baraat(); };
  return [
  // 0 hook: stuck in the car, nose to nose with the band
  { setup() { base(0.8); at(BX, BZ + 11, Math.PI); g.mount('chhotu'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; const u = Math.max(0, t); h.camAt(G.x - 1.6 + u * 0.35, 1.9, G.z + 4.6 - u * 0.5, BX, 1.8, BZ + 1, 3); } },
  // 1 level 2: wait "patiently" (front view through the windscreen)
  { setup() { base(0.82); at(BX, BZ + 15, Math.PI); g.mount('chhotu'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; h.camAt(G.x + 3.4, 8.5, G.z + 6.5, G.x - 0.3, 0.6, G.z - 6.5, 4); } },
  // 2 level 3: get out to complain, march up to the dhol
  { setup() { base(0.83); at(BX + 1.5, BZ + 15, Math.PI); g.mount('chhotu'); G.vs = 0; S.off = 0; },
    tick(h, t) { if (t > 0.15 && !S.off) { S.off = 1; g.dismount(); at(BX + 2.2, BZ + 14, Math.PI); } if (S.off) { K.KeyW = t < 2.0; } else { K.KeyW = false; G.vs = 0; }
      h.camAt(G.x - 3.0, 1.6, G.z + 3.6, G.x + 0.5, 1.4, G.z - 6, 5); } },
  // 3 level 4: the dhol hits... the legs move on their own
  { setup() { base(0.84); at(BX + 0.6, BZ + 7.4, 0); G.dance = true; },
    tick(h, t) { G.dance = true; const a = -0.35 + Math.max(0, t) * 0.28; h.camAt(G.x + Math.sin(a) * 3.6, 1.35, G.z + Math.cos(a) * 3.6, G.x, 1.2, G.z - 1.5, 4); } },
  // 4 level 5: ₹1,000 notes over the dulha
  { setup() { base(0.85); at(BX - 1.4, BZ + 3.2, Math.PI * 0.85); G.dance = true; S.n = -1; },
    tick(h, t) { G.dance = true; if (t > S.n) { S.n = t + 0.3; g.burst(G.x + 0.4, 3.3, G.z - 0.6, 0x7fbf7f, 26, { note: true, speed: 4, up: 3, grav: 2, life: 4 }); }
      h.camAt(G.x - 2.6, 0.9, G.z + 3.4, G.x + 0.6, 2.4, G.z - 2.5, 4); } },
  // 5 level 6: fireworks, next to the ghodi, in the family photo
  { setup() { base(0.86); at(BX + 2.0, BZ + 0.6, Math.PI * 1.05); G.dance = true; S.f = -9; },
    tick(h, t) { G.dance = true; const tt = t < 0 ? -1 : t; if (tt > S.f) { S.f = tt + 0.35; g.firework(BX + (Math.random() - 0.5) * 50, BZ - 40 - Math.random() * 40); }
      const u = Math.max(0, t); h.camAt(BX + 3.2 - u * 0.3, 1.5, BZ + 6.2 - u * 0.4, BX + 0.4, 2.1, BZ - 1, 3); } },
]; };
