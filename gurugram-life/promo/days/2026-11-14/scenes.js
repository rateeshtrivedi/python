// Day 22 · "Guess the Gurugram place": the new real-map city (every real road, metro and sector from OpenStreetMap)
// as a quiz. Each place is shown with the names hidden, a 3-2-1 countdown, then the reveal stamp. Ends on comment bait:
// "Comment your SECTOR".
window.__SCENES = h => { const { g, G, S } = h; const RC = g.RC; const V = h.V;
  const css = document.createElement('style'); css.textContent = `
  #qz{position:absolute;left:0;right:0;top:44%;text-align:center;font:800 150px/1 'Baloo 2';color:#fff;-webkit-text-stroke:10px #120c08;paint-order:stroke fill;text-shadow:0 8px 0 #120c08;opacity:0}
  #qzS{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%) rotate(-8deg);border:9px solid #22c55e;color:#22c55e;background:rgba(255,255,255,.92);border-radius:18px;font:800 46px/1 'Baloo 2';padding:16px 22px 8px;opacity:0;white-space:nowrap}`;
  document.head.append(css); const ov = document.getElementById('reelOv'); const qz = document.createElement('div'); qz.id = 'qz'; ov.append(qz); const qs = document.createElement('div'); qs.id = 'qzS'; qs.textContent = 'CORRECT? 👀'; ov.append(qs);
  const root = () => g.scene.getObjectByName('realcity');
  // the quiz hides every floating name and road board until the reveal (scale to 0; the label fader only touches opacity)
  const names = on => { const r = g.scene; if (!r) return; r.traverse(o => { const isName = o.isSprite || (o.isGroup && o.userData.own && o.children.length === 4); if (!isName) return; if (!o.userData.s0) o.userData.s0 = o.scale.clone(); if (on) o.scale.copy(o.userData.s0); else o.scale.set(1e-4, 1e-4, 1e-4); }); };
  const go = (lat, lon) => { const q = RC.toXZ(lat, lon); G.x = q.x; G.z = q.z; RC.warm(q.x, q.z, 80); return q; };
  const place = (k, re) => RC.places().find(p => p.k === k && re.test(p.n));
  const quiz = t => { const u = Math.max(0, t); if (u < 1.65) { const n = 3 - Math.floor(u / 0.55); qz.textContent = String(Math.max(1, n)); const f = (u % 0.55) / 0.55; qz.style.opacity = String(1 - f * 0.6); qz.style.transform = 'scale(' + (1.3 - f * 0.3) + ')'; qs.style.opacity = '0'; names(false); }
    else { qz.style.opacity = '0'; names(true); qs.style.opacity = u < 2.3 ? '1' : '0'; } };
  const clear = () => { qz.style.opacity = '0'; qs.style.opacity = '0'; names(true); };
  const hideMe = () => { const pl = g.player; if (pl) pl.visible = false; };
  return [
  // 0 hook: dropping out of the sky onto MG Road, the Yellow Line on its pillars, the towers of Sikanderpur
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.42; S.q = go(28.4800, 77.0870); },
    post() { hideMe(); },
    tick(h, t) { const u = Math.min(1, Math.max(0, t) / 2.6), q = S.q; h.camAt(q.x + 40 - u * 30, 260 - u * 170, q.z + 260 - u * 150, q.x - 10, 8, q.z - 40, 1); } },
  // 1 IFFCO Chowk: the metro station on the viaduct
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.45; const st = place(7, /IFFCO/); S.q = st ? { x: st.x, z: st.z } : go(28.4722, 77.0726); G.x = S.q.x + 20; G.z = S.q.z + 20; RC.warm(S.q.x, S.q.z, 80); },
    post() { hideMe(); }, done: clear,
    tick(h, t) { const u = Math.max(0, t), q = S.q; quiz(t); h.camAt(q.x + 46 - u * 6, 15 + u * 1.5, q.z + 52 - u * 6, q.x, 11, q.z, 1); } },
  // 2 Cyber City: glass towers and the Rapid Metro curving between them
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.4; S.q = go(28.4950, 77.0890); },
    post() { hideMe(); }, done: clear,
    tick(h, t) { const u = Math.max(0, t), q = S.q; quiz(t); h.camAt(q.x - 150 + u * 12, 110 - u * 6, q.z + 170 - u * 10, q.x, 25, q.z, 1); } },
  // 3 Ambience Mall: the big one by the expressway
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.47; const m = place(5, /Ambience Mall/); S.q = m ? { x: m.x, z: m.z } : go(28.5052, 77.0960); G.x = S.q.x + 30; G.z = S.q.z + 30; RC.warm(S.q.x, S.q.z, 80); },
    post() { hideMe(); }, done: clear,
    tick(h, t) { const u = Math.max(0, t), q = S.q; quiz(t); h.camAt(q.x + 110 - u * 10, 70, q.z + 120 - u * 8, q.x, 8, q.z, 1); } },
  // 4 the payoff: racing Pinky down the real MG Road under the Yellow Line
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.5; g.setP({ vehicles: ['desert', 'scooty'], cur: 'desert' }); g.startRace('r_mg'); S.k = 1; },
    tick(h, t) { const r = G.race; if (r) { const R = r.R; let k = S.k; while (k < R.pts.length - 1 && Math.hypot(R.pts[k][0] - G.x, R.pts[k][1] - G.z) < 18) k++; S.k = k; const want = Math.atan2(R.pts[k][0] - G.x, R.pts[k][1] - G.z); let d = want - G.r; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; G.r += d * 0.18; G.yaw = G.r; }
      h.K.KeyW = true; h.K.ShiftLeft = t > 0.6; G.nos = Math.max(G.nos || 0, 0.6); h.chase(9, 3.2, 0, 8, 8); },
    done() { h.keysOff(); } },
  // 5 comment bait: the sectors from above, names floating over them
  { setup() { h.reset(); h.weather(0, 0); if (G.race) { try { g.dismount(); } catch (e) {} } G.race = null; document.body.classList.remove('racing'); g.DAY.t = 0.44; const sec = RC.places().filter(p => p.k === 1); let best = sec[0], bn = -1; for (const p of sec) { const n = sec.filter(q => Math.hypot(q.x - p.x, q.z - p.z) < 330).length; if (n > bn) { bn = n; best = p; } } S.q = { x: best.x, z: best.z }; G.x = best.x + 60; G.z = best.z + 60; /* not on top of the names: they fade out right next to you */ RC.warm(best.x, best.z, 80); }, /* where the most real sector names are */
    post() { hideMe(); const r = root(); if (r) r.traverse(o => { if (o.isSprite) { if (!o.userData.s0) o.userData.s0 = o.scale.clone(); o.scale.copy(o.userData.s0).multiplyScalar(3.2); } }); }, /* the sector names big enough to read on a phone */
    done() { const r = root(); if (r) r.traverse(o => { if (o.isSprite && o.userData.s0) o.scale.copy(o.userData.s0); }); },
    tick(h, t) { const u = Math.min(1, Math.max(0, t) / 2.9), q = S.q; h.camAt(q.x - 40 + u * 40, 120 - u * 30, q.z + 160 - u * 40, q.x, 0, q.z - 20, 1); } },
]; };
