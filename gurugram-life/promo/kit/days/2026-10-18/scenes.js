// Day 2 · POV: You planned a 'chill Sunday' in Gurugram (plan vs reality format)
window.__SCENES = h => { const { g, G, K, S } = h; const HOLI = [0xff2bd6, 0x39ff14, 0xffd400, 0x00b4ff, 0xff6a00];
  const holi = (t, near) => { G.dance = true; if (t > (S.b || -9)) { S.b = t + 0.18; g.burst(G.x + (Math.random() - 0.5) * near, 1.2 + Math.random() * 2.5, G.z + (Math.random() - 0.5) * near, HOLI[Math.floor(Math.random() * HOLI.length)], 26, { speed: 5 }); } };
  const holiOn = () => { const t = g.serverNow(); G.ev = { type: 'holi', id: 'reel', name: 'holi', start: t - 5, end: t + 600 }; };
  return [
  // 0 hook: Holi colours flying around the player at sunset (the payoff, shown first)
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.7; holiOn(); G.x = 150; G.z = 28; G.r = G.yaw = Math.PI; S.u = 0; },
    tick(h, t) { const u = (S.u += 1 / 30); holi(u, 7); h.camAt(G.x + 1.2 + u * 0.15, 1.5, G.z - 3.4 + u * 0.1, G.x, 1.4, G.z, 1); } },
  // 1 cows parked on the village road, traffic queues behind them
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.37; G.ev = null; h.traffic(true); G.x = 236; G.z = 170; G.r = G.yaw = Math.PI;
      S.cows = g.COWS.slice(0, 3); S.cows.forEach((c, i) => { S['c' + i] = [c.x, c.z]; c.x = 224 + i * 2.6; c.z = 140 + i * 3.2; c.mesh.position.set(c.x, 0.05, c.z); c.mesh.rotation.y = 0.4 + i; }); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(230 - u * 0.3, 1.5, 154, 225, 1.0, 141, 1); },
    done() { S.cows.forEach((c, i) => { [c.x, c.z] = S['c' + i]; c.mesh.position.set(c.x, 0.2, c.z); }); } },
  // 2 Galleria Market: carts, shops, a slow walk past the chaat stalls
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.45; G.ev = null; G.x = -150; G.z = 18; G.r = G.yaw = -Math.PI / 2; },
    tick(h, t) { K.KeyW = t > 0; const u = Math.max(0, t); h.camAt(G.x + 3.5, 2.0, G.z + 5.2, G.x - 3, 1.3, G.z - 2, 4); } },
  // 3 akhara dangal: the pehlwan and the player trade punches
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.4; const A = g.AKHARA, P = g.PEHLWAN; A.fight = true; P.hp = P.max * 5; P.state = 'aggro'; G.x = A.x + 1.6; G.z = A.z; G.r = G.yaw = -Math.PI / 2; P.x = A.x - 0.2; P.z = A.z; S.p = 0; },
    tick(h, t) { G.hp = 100; const A = g.AKHARA, P = g.PEHLWAN; P.x = G.x - 1.5; P.z = G.z; G.r = -Math.PI / 2;
      for (const [k, at] of [[1, 0.25], [2, 0.75], [3, 1.3], [4, 1.85], [5, 2.4]]) if (t > at && S.p < k) { S.p = k; g.punch(); }
      h.camAt(A.x + 0.8, 1.9, A.z + 5.6, A.x + 0.6, 1.3, A.z, 1); },
    done() { g.AKHARA.fight = false; g.PEHLWAN.state = 'idle'; g.PEHLWAN.hp = g.PEHLWAN.max; } },
  // 4 village chaupal: three elders on the charpai turn on the player
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.6; G.x = 145; G.z = 157; G.r = G.yaw = Math.PI; S.el = [];
      for (const [dx, dz, hat] of [[-2.2, -2.6, 'pagdi'], [0, -3.2, 'safa'], [2.2, -2.6, 'pagdi']]) { const e = g.makeChar(0xf5f0e6, { pants: 0xf5f0e6 }); g.setLook(e, { shirt: 0xf5f0e6, hat }); e.position.set(G.x + dx, 0.2, G.z + dz); e.rotation.y = Math.atan2(-dx, 3); g.scene.add(e); S.el.push(e); } },
    tick(h, t) { for (const f of g.FIGHTERS) if (Math.hypot(f.x - G.x, f.z - G.z) < 25) { f.x += 60; f.tx = f.x; f.hx = f.x; } const u = Math.max(0, t); h.camAt(G.x + 3.4 - u * 0.5, 2.2, G.z + 3.8, G.x, 1.4, G.z - 2.2, 1); },
    done() { for (const e of S.el) g.scene.remove(e); } },
  // 5 the payoff: Holi on Sohna Road at sunset, wide orbit
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.705; holiOn(); G.x = 150; G.z = 28; G.r = G.yaw = Math.PI; S.u = 0; },
    tick(h, t) { const u = (S.u += 1 / 30); holi(u, 12); const a = 2.2 + u * 0.22; h.camAt(G.x + Math.sin(a) * 8, 2.6, G.z + Math.cos(a) * 8, G.x, 1.3, G.z, 1); } },
]; };
