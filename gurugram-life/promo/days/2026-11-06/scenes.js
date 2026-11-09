// Day 19 · POV: First Diwali after raising ₹10 lakh (Part 3 of the founder story): rockets, a gold chain for Mummy, Diwali market, then Mummy: "naukri kab lagegi?"
window.__SCENES = h => { const { g, G, K, S, V } = h; const F = window.__FD;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const founder = () => { g.setP({ outfit: { shirt: null, hat: 'none', shades: false }, bling: [], look: { ...g.P.look, top: 0 } }); G.myTint = 0x26324a; g.applyMyLook(); }; // the same founder as Parts 1 and 2
  const keepLook = () => { if (g.P.outfit.hat !== 'none' || g.player.userData.hatType !== 'none') founder(); };
  const talk = (mesh, text, secs, k) => { const o = { mesh }; g.say(o, text, secs); if (o._bub) { o._bub.s.position.y = 2.7; o._bub.s.scale.multiplyScalar(k || 1); } };
  const cam = (x, y, z, lx, ly, lz) => { h.camAt(x, y, z, lx, ly, lz, 1); g.camera.position.set(x, y, z); g.camera.lookAt(lx, ly, lz); }; // also set directly: the game's camera update can pause right after entering the home
  const night = () => { h.reset(); h.weather(0, 0); g.DAY.t = 0.88; h.setEvent('diwali'); };
  const mummy = () => { // Mummy in a saree, waiting at home
    if (S.m) return S.m; const X = F.X; const c = X.makeChar(0xd7331f, { g: 'f', pants: 0xd7331f }); c.userData.dress.top = 2; c.userData.dress.old = true; c.userData.noBlock = true; X.dressFrom(c, null, 0xd7331f);
    const fx = Math.sin(G.r), fz = Math.cos(G.r); c.position.set(G.x + fx * 2.3, 0, G.z + fz * 2.3); c.rotation.y = G.r + Math.PI; g.scene.add(c); S.m = c; return c; };
  let M = null; // Mummy stays between the last two scenes
  return [
  // 1 hook: Diwali night, rockets over Gurugram
  { setup() { night(); founder(); at(-292, 56, Math.PI); S.f = 0; S.c = 0; },
    tick(h, t) { keepLook(); h.keysOff(); S.c += 1 / 30; if (S.c > S.f) { S.f = S.c + 0.18; g.firework(G.x + (Math.random() - 0.5) * 30, G.z - 38 - Math.random() * 12); } /* rockets start in the pre-roll, so frame 1 already has bursts */ const u = Math.max(0, t); h.camAt(G.x + 1.2, 1.1, G.z + 4.2 - u * 0.3, G.x, 24 + u * 2, G.z - 42, 1); } }, // your silhouette against the sky
  // 2 Goyal Jewellers: a gold chain for Mummy
  { setup() { night(); g.DAY.t = 0.8; at(-300, 58, Math.PI); },
    tick(h, t) { keepLook(); K.KeyW = t > 0.1 && t < 1.6; const u = Math.max(0, t); h.camAt(-297.4 - u * 0.4, 2.0, 61.5, -300, 3.0, 47, 1); } },
  // 3 rockets up close: the investors' money going up
  { setup() { night(); at(-150, 14, 0); S.f = 0; S.c = 0; },
    tick(h, t) { keepLook(); h.keysOff(); S.c += 1 / 30; if (S.c > S.f) { S.f = S.c + 0.2; g.firework(G.x + (Math.random() - 0.5) * 24, G.z + 34 + Math.random() * 10); } const u = Math.max(0, t); h.camAt(G.x - 1.6, 1.2, G.z - 4.0 + u * 0.3, G.x + 1, 22 + u * 2, G.z + 38, 1); } },
  // 4 home: Mummy is waiting
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.9; g.setP({ home: 'pg', houses: ['street', 'pg'] }); S.st = 0; }, inside: true,
    tick(h, t) { keepLook();
      if (S.st === 0) { if (G.inside !== 'home') { S.e = (S.e || 0) + 1; if (S.e % 10 === 1) { h.reset(); g.setP({ home: 'pg', houses: ['street', 'pg'] }); g.goInside(true); } return; } S.st = 1; S.w = 0; } // retry until the home has been built and entered
      if (S.st === 1) { if ((S.w += 1 / 30) < 0.6) return; S.st = 2; M = mummy(); }
      h.keysOff(); const fx = Math.sin(G.r), fz = Math.cos(G.r); const u = Math.max(0, t);
      const mx = G.x + (M.position.x - G.x) * 0.55, mz = G.z + (M.position.z - G.z) * 0.55; // framed towards Mummy, so her bubble stays on screen
      cam(G.x - fx * (1.3 - u * 0.1) + fz * 1.25, 2.05, G.z - fz * (1.3 - u * 0.1) - fx * 1.25, M.position.x, 1.85, M.position.z); // three-quarter from behind your shoulder: Mummy faces the camera // side-on: you and Mummy
      if (t > 0.3 && !S.s) { S.s = 1; talk(M, 'Itne paise? Kahan se? 😳', 2.4, 0.48); } } },
  // 5 the punchline
  { setup() { S.s = 0; }, inside: true,
    tick(h, t) { keepLook(); if (!M) return; h.keysOff(); const k = Math.min(1, Math.max(0, t) / 1.0); const dx = G.x - M.position.x, dz = G.z - M.position.z, d = Math.hypot(dx, dz) || 1;
      cam(M.position.x + dx / d * (2.7 - k * 0.6) + 0.25, 1.7, M.position.z + dz / d * (2.7 - k * 0.6), M.position.x, 1.85, M.position.z); // push in on Mummy
      if (t > 0.2 && !S.s) { S.s = 1; talk(M, 'Par naukri kab lagegi? 🙂', 2.6, 0.34); } }, done() { if (M) g.scene.remove(M); M = null; } },
]; };
