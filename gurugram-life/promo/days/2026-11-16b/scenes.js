// Day 23 v2 · NEW FEATURE: Multiplayer Rocket Race. An announcement: the title slams in over the grid, YOU blow up
// PINKY (slow-mo fireball, car flipping into the air), a rocket into RAHUL from the front angle, loops/jumps/mud on
// the real map, and the finish: YOU win, gold medal, confetti, podium. Every overlay is a function of scene time.
window.__SCENES = h => { const { g, G, S } = h; const RR = g.RR, T3 = g.THREE;
  const rr = () => G.rr;
  // ---- overlays (drawn by time, so the capture is exact)
  const css = document.createElement('style'); css.textContent = `
  #nf{position:absolute;inset:0;pointer-events:none;font-family:'Baloo 2',sans-serif;text-align:center}
  #nfTag{position:absolute;left:50%;top:150px;transform:translateX(-50%);background:#d7331f;color:#fff;font:800 30px/1 'Baloo 2';padding:12px 22px 6px;border-radius:12px;border:4px solid #fff;box-shadow:0 6px 0 #120c08;white-space:nowrap;letter-spacing:.06em}
  #nfT{position:absolute;left:0;right:0;top:250px;font:800 76px/0.95 'Baloo 2';color:#ffd21f;-webkit-text-stroke:10px #120c08;paint-order:stroke fill;text-shadow:0 8px 0 #120c08}
  #nfT span{color:#fff;display:block;font-size:58px}
  #nfS{position:absolute;left:24px;right:24px;top:500px;font:800 40px/1.05 'Baloo 2';color:#fff;-webkit-text-stroke:7px #120c08;paint-order:stroke fill}
  #nfCd{position:absolute;left:0;right:0;top:40%;font:800 190px/1 'Baloo 2';color:#fff;-webkit-text-stroke:12px #120c08;paint-order:stroke fill;text-shadow:0 10px 0 #120c08}
  #nfFlash{position:absolute;inset:0;background:#fff}
  #nfWin{position:absolute;left:0;right:0;top:170px}
  #nfMedal{width:250px;height:250px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c2,#ffd21f 35%,#d49b00 70%,#9a6b00);border:10px solid #fff3b0;box-shadow:0 0 60px rgba(255,210,31,.9),0 10px 0 #6b4a00;display:grid;place-items:center;font:800 120px/1 'Baloo 2';color:#7a5200;position:relative}
  #nfMedal:before,#nfMedal:after{content:'';position:absolute;top:-150px;width:70px;height:170px;background:#d7331f;z-index:-1;border:5px solid #fff}
  #nfMedal:before{left:40px;transform:rotate(18deg)}#nfMedal:after{right:40px;transform:rotate(-18deg);background:#2563b8}
  #nfWinT{margin-top:26px;font:800 92px/0.95 'Baloo 2';color:#ffd21f;-webkit-text-stroke:10px #120c08;paint-order:stroke fill;text-shadow:0 8px 0 #120c08}
  #nfPod{margin:18px auto 0;width:420px;background:rgba(18,12,8,.82);border:4px solid #ffd21f;border-radius:18px;padding:12px 18px;font:800 34px/1.35 'Baloo 2';color:#fff;text-align:left}
  .cf{position:absolute;width:16px;height:26px;border-radius:3px}`;
  document.head.append(css); const ov = document.getElementById('reelOv'); const nf = document.createElement('div'); nf.id = 'nf'; ov.append(nf);
  const $ = id => document.getElementById(id); const show = html => { nf.innerHTML = html; }; const clamp01 = v => Math.max(0, Math.min(1, v));
  const pop = (el, t, t0) => { if (!el) return; const u = clamp01((t - t0) / 0.25); el.style.opacity = String(u); el.style.transform = (el.id === 'nfTag' ? 'translateX(-50%) ' : '') + 'scale(' + (u < 1 ? 1.6 - 0.6 * u : 1) + ')'; };
  // ---- 3D effects: fireball + flipping car, name tags over the cars
  const tag = (mesh, text, bg) => { if (mesh.userData.nameTag) return; const sp = g.labelSprite(text, { fs: 52, scale: 1.0, bg: bg || 'rgba(215,51,31,.95)', fg: '#fff' }); sp.position.y = 5.2; mesh.add(sp); mesh.userData.nameTag = sp; };
  const FX = []; const fireball = (x, y, z) => { for (const [c, k, life] of [[0xffd21f, 6, 0.6], [0xff6a00, 10, 0.9], [0x3f3f46, 13, 1.5]]) { const m = new T3.Mesh(new T3.SphereGeometry(1, 16, 12), new T3.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthWrite: false })); m.position.set(x, y, z); g.scene.add(m); FX.push({ m, k, life, t: 0 }); } g.burst(x, y, z, 0xff7a00, 60, { speed: 12, up: 8, life: 1.1 }); g.burst(x, y, z, 0xffd21f, 30, { speed: 16, life: 0.6 }); };
  const fxTick = dt => { for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const u = f.t / f.life; f.m.scale.setScalar(0.5 + f.k * Math.min(1, u * 1.6)); f.m.material.opacity = Math.max(0, 0.95 * (1 - u)); f.m.position.y += dt * (f.k > 12 ? 3 : 1); if (u >= 1) { g.scene.remove(f.m); FX.splice(i, 1); } } };
  const FL = []; const flip = (mesh, dir) => { FL.push({ mesh, t: 0, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, ry: mesh.rotation.y, dir }); };
  const flTick = dt => { for (const f of FL) { f.t += dt; const u = Math.min(1.6, f.t); f.mesh.visible = true; f.mesh.position.set(f.x, f.y + Math.max(0, 11 * u - 6 * u * u), f.z); f.mesh.rotation.set(u * 7 * f.dir, f.ry + u * 3, u * 4); } };
  // ---- the race (local AI racers wearing player names)
  const startRace = () => { if (G.rr) return; RR.car = 'sarpanch'; g.rrStart({ track: 'cyber', laps: 3, startAt: g.serverNow() - 1, seed: 24, racers: [g.P.id] }); const r = rr(); r.go = true; r.t0 = r.startAt; const nm = ['PINKY', 'RAHUL', 'SONU']; r.bots.forEach((b, k) => { b.m.children.filter(c => c.isSprite && !c.userData.mine).forEach(c => c.visible = false); tag(b.m, nm[k], ['rgba(194,24,91,.95)', 'rgba(37,99,184,.95)', 'rgba(26,138,74,.95)'][k]); b.name = nm[k]; }); if (g.PV) tag(g.PV, '⭐ YOU', 'rgba(246,192,38,.98)'); };
  const at = (s, lane) => { const q = g.rrAt(rr().path, s); G.x = q.x - q.dz * (lane || 0); G.z = q.z + q.dx * (lane || 0); G.r = G.yaw = q.h; if (g.PV) { g.PV.visible = true; g.PV.position.set(G.x, 0.2, G.z); g.PV.rotation.set(0, G.r, 0); } return q; };
  const botAt = (b, s, lane, v) => { b.s = s; b.lane = lane; b.dead = 0; b.m.visible = true; b.hp = 99; b.v = v || 28; b.pace = v || 28; b.spin = 0; b.frozen = false; };
  const fresh = () => { startRace(); const r = rr(); r.dead = 0; r.hp = r.maxHp; r.ammo = 3; r.spin = 0; r.fireAt = 0; G.loop = null; G.air = 0; FL.length = 0; for (const b of r.bots) { b.finished = 0; b.spin = 0; b.fireAt = 1e9; } if (g.PV && !g.PV.userData.nameTag) tag(g.PV, '⭐ YOU', 'rgba(246,192,38,.98)'); };
  const watchHit = b => { if (!b.hitSeen && b.spin > 0) { b.hitSeen = true; S.hit = 1; fireball(b.m.position.x, 1.5, b.m.position.z); flip(b.m, 1); b.frozenFlip = true; } };
  return [
  // 0 the announcement over the grid: NEW FEATURE · MULTIPLAYER ROCKET RACE · countdown 3-2-1 · GO
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.46; fresh(); const r = rr(); r.go = false; S.s0 = r.path.total * 0.02; S.placed = 0; },
    tick(h, t) { const r = rr(); if (t >= 0 && !S.placed) { S.placed = 1; at(S.s0, -2.5); G.vs = 0; r.bots.forEach((b, k) => { botAt(b, S.s0 + (k === 0 ? 0 : -9), k === 0 ? 2.5 : (k === 1 ? -2.5 : 2.5), 0); b.v = 0; b.pace = 0; }); }
      const u = Math.max(0, t); const go = u > 2.55; r.go = go; if (go) { h.K.KeyW = true; r.bots.forEach(b => { b.pace = 30; }); } else { G.vs = 0; r.bots.forEach(b => { b.v = 0; }); }
      show('<div id="nfFlash"></div><div id="nfTag">🚨 NEW FEATURE 🚨</div><div id="nfT">MULTIPLAYER<span>ROCKET RACE 🚀</span></div><div id="nfS">Race your friends &amp; DESTROY them 💥</div><div id="nfCd"></div>');
      $('nfFlash').style.opacity = String(Math.max(0, 1 - u / 0.15)); pop($('nfTag'), u, 0.05); pop($('nfT'), u, 0.3); pop($('nfS'), u, 0.75);
      const cd = u < 1.4 ? '' : u < 1.8 ? '3' : u < 2.15 ? '2' : u < 2.55 ? '1' : 'GO!'; $('nfCd').textContent = cd; $('nfCd').style.color = cd === 'GO!' ? '#22c55e' : '#fff'; if (cd) { $('nfT').style.opacity = '0'; $('nfS').style.opacity = '0'; }
      const q = g.rrAt(r.path, S.s0 + 3); h.camAt(q.x + q.dx * 15 - q.dz * 4, 4.5, q.z + q.dz * 15 + q.dx * 4, q.x, 1.5, q.z, 4); } },
  // 1 YOU fire at PINKY: slow-mo, fireball, PINKY flips into the air
  { setup() { show(''); fresh(); S.placed = 0; S.fired = 0; S.hit = 0; S.s0 = rr().path.total * 0.075; const b = rr().bots[0]; b.hitSeen = false; },
    post() { const b = rr().bots[0]; watchHit(b); if (b.frozenFlip) b.v = 0; flTick(1 / 30 * (window.__speed || 1)); fxTick(1 / 30 * (window.__speed || 1)); },
    tick(h, t) { h.K.KeyW = !S.hit; if (S.hit) G.vs *= 0.9; const r = rr(), b = r.bots[0]; if (t >= 0 && !S.placed) { S.placed = 1; at(S.s0, -2.5); G.vs = 30; botAt(b, S.s0 + 16, -2.5, 28); r.bots.slice(1).forEach(o => { o.m.visible = false; o.s = -1e5; }); }
      if (t > 0.45 && !S.fired) { S.fired = 1; g.rrFire(); } window.__speed = t > 0.6 && t < 1.9 ? 0.3 : 1; h.chase(9, 3.2, -1.2, 8, 16); },
    done() { window.__speed = 1; const b = rr().bots[0]; b.frozenFlip = false; FL.length = 0; } },
  // 2 the front angle: the rocket comes at the camera and takes out RAHUL
  { setup() { show(''); fresh(); S.placed = 0; S.fired = 0; S.hit = 0; S.s0 = rr().path.total * 0.38; const b = rr().bots[1]; b.hitSeen = false; },
    post() { const b = rr().bots[1]; watchHit(b); if (b.frozenFlip) b.v = 0; flTick(1 / 30 * (window.__speed || 1)); fxTick(1 / 30 * (window.__speed || 1)); },
    tick(h, t) { h.K.KeyW = !S.hit; if (S.hit) G.vs *= 0.9; const r = rr(), b = r.bots[1]; if (t >= 0 && !S.placed) { S.placed = 1; at(S.s0, 2.5); G.vs = 30; botAt(b, S.s0 + 14, 2.5, 22); r.bots[0].m.visible = false; r.bots[0].s = -1e5; }
      if (t > 0.35 && !S.fired) { S.fired = 1; g.rrFire(); } window.__speed = t > 0.55 && t < 1.7 ? 0.35 : 1; const q = g.rrAt(r.path, S.s0 + 50); h.camAt(q.x - q.dz * 4.5, 3.2, q.z + q.dx * 4.5, G.x, 1.8, G.z, 6); },
    done() { window.__speed = 1; const r = rr(); r.bots[1].frozenFlip = false; FL.length = 0; } },
  // 3 the loop between the Cyber City towers
  { setup() { show(''); fresh(); const L = rr().pieces.find(p => p.kind === 'loop'); at(L.s - 9, 0); G.vs = 33; rr().bots.forEach(b => { b.m.visible = false; b.s = -1e5; }); },
    tick(h, t) { h.K.KeyW = true; if (G.loop && G.loopCam) h.camAt(G.loopCam.p.x, G.loopCam.p.y, G.loopCam.p.z, G.loopCam.t.x, G.loopCam.t.y, G.loopCam.t.z, 10); else h.chase(9, 3.2, 0, 8, 8); } },
  // 4 the finish: YOU take the line first, PINKY and RAHUL just behind; gold medal, confetti, podium
  { setup() { show(''); fresh(); S.placed = 0; const r = rr(); S.fin = r.cps[0].s + r.path.total; },
    tick(h, t) { const r = rr(), u = Math.max(0, t); h.K.KeyW = true; if (t >= 0 && !S.placed) { S.placed = 1; at(S.fin - 26, 0); G.vs = 32; botAt(r.bots[0], S.fin - 34, 2.5, 31); botAt(r.bots[1], S.fin - 40, -2.5, 30); r.bots[2].m.visible = false; r.bots[2].s = -1e5; }
      window.__speed = u > 0.55 && u < 1.0 ? 0.35 : 1; const q = g.rrAt(r.path, S.fin);
      if (u < 1.05) h.camAt(q.x + q.dx * 10 - q.dz * 7, 3, q.z + q.dz * 10 + q.dx * 7, G.x, 1.5, G.z, 8); else h.camAt(G.x - Math.sin(G.r) * 7 + Math.cos(G.r) * 5, 4, G.z - Math.cos(G.r) * 7 - Math.sin(G.r) * 5, G.x, 2.2, G.z, 4);
      if (u > 0.8 && !S.conf) { S.conf = 1; for (let k = 0; k < 4; k++) g.burst(q.x + (Math.random() - 0.5) * 10, 6, q.z + (Math.random() - 0.5) * 10, [0xffd21f, 0xd7331f, 0x2563b8, 0x22c55e][k], 40, { speed: 7, up: 6, life: 1.8 }); }
      if (u > 1.0) { let cf = ''; for (let k = 0; k < 36; k++) { const x = (k * 97) % 1080 / 2, y = ((u - 1.0) * (260 + (k * 53) % 200) + (k * 131) % 300) % 980 - 60, r2 = (u * (90 + k * 17)) % 360; cf += '<div class="cf" style="left:' + x + 'px;top:' + y + 'px;transform:rotate(' + r2 + 'deg);background:' + ['#ffd21f', '#d7331f', '#2563b8', '#22c55e', '#fff'][k % 5] + '"></div>'; }
        show(cf + '<div id="nfWin"><div id="nfMedal">1</div><div id="nfWinT">🏆 YOU WIN!</div><div id="nfPod">🥇 YOU<br>🥈 PINKY<br>🥉 RAHUL</div></div>'); const m = $('nfMedal'), w = $('nfWinT'), p = $('nfPod'); const a = clamp01((u - 1.0) / 0.3); m.style.transform = 'scale(' + (a < 1 ? 0.2 + a * 1.05 : 1 + Math.sin(u * 6) * 0.03) + ') rotate(' + ((1 - a) * -40) + 'deg)'; w.style.opacity = String(clamp01((u - 1.25) / 0.2)); p.style.opacity = String(clamp01((u - 1.6) / 0.25)); }
      else show(''); } },
]; };
