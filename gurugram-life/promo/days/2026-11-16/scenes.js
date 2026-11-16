// Day 23 · Rocket Race: "POV: Gurugram traffic, but every car has ROCKETS". Real gameplay from the new private-room
// rocket race on the Cyber City Loop Run (real roads): a rocket hit, the loop between the towers, a jump, mud, getting
// wrecked by a friend, and the comment bait. The race runs locally (AI racers), no server room needed.
window.__SCENES = h => { const { g, G, S } = h; const RR = g.RR;
  const rr = () => G.rr;
  const piece = (kind, n) => rr().pieces.filter(p => p.kind === kind)[n || 0];
  const startRace = () => { if (G.rr) return; RR.car = 'sarpanch'; g.rrStart({ track: 'cyber', laps: 3, startAt: g.serverNow() - 1, seed: 23, racers: [g.P.id] }); const r = rr(); if (r) { r.go = true; r.t0 = r.startAt; } };
  const at = (s, lane) => { const q = g.rrAt(rr().path, s); G.x = q.x - q.dz * (lane || 0); G.z = q.z + q.dx * (lane || 0); G.r = G.yaw = q.h; if (g.PV) { g.PV.visible = true; g.PV.position.set(G.x, 0.2, G.z); g.PV.rotation.set(0, G.r, 0); } return q; };
  const botAt = (b, s, lane) => { b.s = s; b.lane = lane; b.dead = 0; b.m.visible = true; b.hp = 1; b.v = 30; };
  const fresh = () => { startRace(); const r = rr(); r.dead = 0; r.hp = r.maxHp; r.ammo = 3; r.spin = 0; G.loop = null; G.air = 0; r.lap = 1; for (const b of r.bots) { b.finished = 0; b.spin = 0; } };
  return [
  // 0 hook: a homing rocket into the car ahead at the signal
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.45; startRace(); fresh(); S.s0 = rr().path.total * 0.07; at(S.s0, -2.5); G.vs = 26; const b = rr().bots[0]; botAt(b, S.s0 + 22, 3); b.pace = 22; rr().bots.slice(1).forEach((o, k) => botAt(o, S.s0 - 30 - k * 12, k ? 3 : -3)); S.fired = 0; },
    tick(h, t) { h.K.KeyW = true; if (t >= 0 && !S.placed) { S.placed = 1; at(S.s0, -2.5); G.vs = 28; const b = rr().bots[0]; botAt(b, S.s0 + 15, -2.5); b.pace = 24; b.v = 24; rr().fireAt = 0; rr().ammo = 3; } /* place both cars when the camera rolls, not in the warm-up */ if (t > 0.45 && !S.fired) { S.fired = 1; g.rrFire(); } window.__speed = t > 0.6 && t < 1.5 ? 0.35 : 1; /* slow-mo on the hit */ h.chase(9, 3.4, -1.5, 8, 14); } },
  // 1 the loop between the towers (the race's own side camera)
  { setup() { fresh(); const L = piece('loop'); S.L = L; at(L.s - 9, 0); G.vs = 32; h.camAt(0, 0, 0, 0, 0, 0, 1); },
    tick(h, t) { h.K.KeyW = true; if (!G.loop) h.chase(9, 3.2, 0, 8, 8); else h.camAt(G.loopCam.p.x, G.loopCam.p.y, G.loopCam.p.z, G.loopCam.t.x, G.loopCam.t.y, G.loopCam.t.z, 10); } },
  // 2 off the ramp
  { setup() { fresh(); const J = piece('jump', 1) || piece('jump'); S.J = J; at(J.s - 30, 0); G.vs = 34; },
    tick(h, t) { h.K.KeyW = true; const y = g.PV ? g.PV.position.y : 1; window.__speed = y > 2 ? 0.5 : 1; const fx = Math.sin(G.r), fz = Math.cos(G.r); h.camAt(G.x - fx * 12, 4.8 + y * 0.75, G.z - fz * 12, G.x + fx * 6, y + 0.5, G.z + fz * 6, 7); } },
  // 3 mud: sliding, splashing
  { setup() { fresh(); const M = piece('mud'); at(M.s - 18, 0); G.vs = 24; },
    tick(h, t) { h.K.KeyW = true; h.K.KeyA = Math.sin(t * 5) > 0.3; h.K.KeyD = Math.sin(t * 5) < -0.3; h.chase(7, 2.2, -2, 6, 6); }, done() { h.keysOff(); } },
  // 4 a friend's rocket from behind: wrecked
  { setup() { fresh(); S.s0 = rr().path.total * 0.36; at(S.s0, 0); G.vs = 20; rr().hp = 1; const b = rr().bots[1]; botAt(b, S.s0 - 30, 0); b.pace = 22; S.fired = 0; },
    tick(h, t) { h.K.KeyW = t < 1.1; if (t > 0.25 && !S.fired) { S.fired = 1; const q = g.rrAt(rr().path, S.s0 - 22); g.rrSpawnRocket('bot1', 'reel', q.x, 1.7, q.z, q.h, 1); } const fx = Math.sin(G.r), fz = Math.cos(G.r); h.camAt(G.x + fx * 9 + fz * 3, 3.2, G.z + fz * 9 - fx * 3, G.x - fx * 6, 1.2, G.z - fz * 6, 8); } },
  // 5 the pack through a checkpoint arch, from above
  { setup() { fresh(); const r = rr(); if (g.PV) g.PV.visible = true; r.dead = 0; S.s0 = r.cps[3].s; at(S.s0 - 20, -3); G.vs = 30; r.bots.forEach((b, k) => { botAt(b, S.s0 - 8 - k * 10, k % 2 ? 3 : -3); b.hp = 3; b.pace = 30 - k; }); },
    tick(h, t) { h.K.KeyW = true; const q = g.rrAt(rr().path, S.s0 + 25); const u = Math.min(1, Math.max(0, t) / 2.7); h.camAt(q.x + q.dx * (14 - u * 8), 9 + u * 3, q.z + q.dz * (14 - u * 8), q.x - q.dx * 30, 1.5, q.z - q.dz * 30, 3); } /* in front, the pack coming at the camera through the arch */, done() { h.keysOff(); } },
]; };
