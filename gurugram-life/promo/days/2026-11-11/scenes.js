// Day 21 · POV: You told Mummy you're quitting your job for a startup: Mummy is the final boss (street fight mode). She blocks everything, then a slow-motion 4-hit 'chappal combo'. You lose. Loops back to the face-off.
window.__SCENES = h => { const { g, G, S } = h; const SF = g.SF; const W = window;
  const css = document.createElement('style'); css.textContent = '#sfHud,#sfHud *,#sfPick,#sfPick *,#bigtxt,#bigtxt *{visibility:visible!important} #sfPad,#sfKeys{display:none!important} body.nopick #sfPick{display:none!important} .sfcard.hot{border-color:#ffd21f!important;background:#4a3a1c!important;transform:scale(1.04)}'; document.head.append(css);
  const founder = () => { g.setP({ outfit: { shirt: null, hat: 'none', shades: false }, bling: [], look: { ...g.P.look, top: 0 } }); G.myTint = 0x26324a; g.applyMyLook(); }; // the same founder as Parts 1 to 3
  const keepLook = () => { if (g.P.outfit.hat !== 'none' || g.player.userData.hatType !== 'none') founder(); };
  const talk = (mesh, text, secs, k) => { const o = { mesh }; g.say(o, text, secs); if (o._bub) { o._bub.s.position.y = 2.75; o._bub.s.scale.multiplyScalar(k || 1); } };
  const sf = () => SF._sf();
  const hold = () => { const f = sf(); if (f && f.phase === 'fight') { f.foe.think = 99; f.foe.aiWalk = 0; f.foe.aiBlock = 0; f.me.dmg = 1; f.foe.dmg = 0.5; } };
  const at = (me, foe) => { const f = sf(); f.me.s = me; f.foe.s = foe; };
  const cam = (d, y, ang, k, look) => { const f = sf(); if (!f) return; const mid = (f.me.s + f.foe.s) / 2; const cx = f.C.x + f.A.x * mid, cz = f.C.z + f.A.z * mid; const ox = f.N.x * Math.cos(ang) - f.A.x * Math.sin(ang), oz = f.N.z * Math.cos(ang) - f.A.z * Math.sin(ang); h.camAt(cx + ox * d, y, cz + oz * d, cx, look || 1.3, cz, k || 5); }; // closer than the game's own fight camera, for a phone screen
  const closeOn = (who, k) => { const f = sf(); if (!f) return; const F = who === 'foe' ? f.foe : f.me, sgn = who === 'foe' ? -1 : 1; const px = f.C.x + f.A.x * F.s, pz = f.C.z + f.A.z * F.s; h.camAt(px + f.A.x * 2.0 * sgn + f.N.x * 0.8, 1.75, pz + f.A.z * 2.0 * sgn + f.N.z * 0.8, px, 1.6, pz, k || 1); };
  const banner = text => { const f = sf(), b = document.getElementById('sfBanner'); if (!f || !b) return; f.banner = { text, t: 1.6 }; b.textContent = text; b.style.opacity = '1'; };
  const block = (on) => { const f = sf(); if (f) f.touch.block = on; };
  const guard = () => { const f = sf(); if (f && f.phase === 'fight') { f.foe.think = 99; f.foe.aiWalk = 0; f.me.dmg = 1; } }; // Mummy only does what the script says (her blocks stay on)
  const mummyBlock = secs => { const f = sf(); if (f) { f.foe.aiBlock = secs; f.foe.block = true; } };
  return [
  // 1 hook: FACE-OFF with Mummy
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.7; founder(); G.x = 6; G.z = 8; G.r = G.yaw = 0; document.body.classList.add('nopick');
      const b = g.makeFighter('Mummy', 6.4, 14, 100, 5, 0xd7331f, false, 'f'); const X = window.__FD.X; const c = b.mesh; c.userData.dress.top = 2; c.userData.dress.old = true; c.userData.noBlock = true; X.dressFrom(c, null, 0xd7331f); // a red saree
      b.donBoss = true; g.FIGHTERS.push(b); W.__B = b; W.__go = 0; for (const s2 of c.children) if (s2.isSprite) s2.visible = false;
      const fo = document.createElement('div'); fo.id = 'rFace'; fo.textContent = 'FINAL BOSS'; fo.style.cssText = "position:absolute;left:0;right:0;top:36%;text-align:center;font:800 64px/1 'Baloo 2';color:#ff4d4d;-webkit-text-stroke:9px #141414;paint-order:stroke fill;text-shadow:0 6px 0 #141414;transform:rotate(-4deg)"; document.getElementById('reelOv').append(fo); },
    tick(h, t) { keepLook(); if (!W.__go) { W.__go = 1; SF.start({ boss: W.__B, ch: 1, name: 'Mummy', crowd: [], onWin() {}, onLose() {}, onFlee() {} }); }
      const f = sf(); if (f) { f.me.s = -1.8; f.foe.s = 1.8; }
      const fo = document.getElementById('rFace'); if (fo) fo.style.display = t < 1.2 ? '' : 'none'; for (const s2 of W.__B.mesh.children) if (s2.isSprite) s2.visible = false; if (t < 1.0) closeOn('foe', 1); else cam(3.6, 2.0, 0.75, 4); } },
  // 2 choose your style: Karate (from YouTube) vs Mummy's Kung Fu
  { setup() { document.body.classList.remove('nopick'); S.k = 0; },
    tick(h, t) { keepLook(); cam(3.8, 2.0, 0.75, 4); const cards = document.querySelectorAll('.sfcard'); const i = t < 0.5 ? 0 : 1; cards.forEach((c, j) => c.classList.toggle('hot', j === i));
      if (t > 1.5 && !S.k) { S.k = 1; SF.choose('karate'); } } },
  // 3 your best punch: blocked
  { setup() { S.a = S.b = 0; },
    tick(h, t) { keepLook(); cam(3.3, 1.9, 0.75, 5); guard(); const f = sf(); if (!f || f.phase !== 'fight') { if (f) at(-1.0, 1.0); return; }
      if (!S.a) { S.a = 1; at(-0.85, 0.85); } if (t > 1.35 && !S.b) { S.b = 1; mummyBlock(0.9); SF.doMove(f.me, 'punch'); } } },
  // 4 your kick: blocked again
  { setup() { S.a = 0; },
    tick(h, t) { keepLook(); cam(3.1, 1.6, 0.6, 5); guard(); const f = sf(); if (!f) return; if (!S.a && t > 0.1) { S.a = 1; at(-0.85, 0.85); mummyBlock(1.0); f.me.act = null; f.me.stun = 0; SF.doMove(f.me, 'kick'); } } },
  // 5 slow motion: the chappal combo
  { setup() { S.a = 0; const f = sf(); if (f) { f.me.hp = Math.min(f.me.hp, 30); f.foe.wins = 1; f.foe.dmg = 2.5; f.foe.aiBlock = 0; f.foe.block = false; f.me.act = null; } },
    tick(h, t) { keepLook(); cam(3.0, 1.15, 0.5, 4, 1.6); guard(); const f = sf(); if (!f) return; W.__speed = t > 0.1 && t < 2.3 ? 0.45 : 1;
      if (!S.a && t > 0.05) { S.a = 1; at(-0.8, 0.8); f.foe.cd = 0; f.foe.act = null; f.foe.stun = 0; SF.doMove(f.foe, 'special'); } } },
  // 6 K.O. · YOU LOSE · emotional damage
  { setup() { W.__speed = 1; },
    tick(h, t) { keepLook(); const f = sf(); if (f) { f.foe.think = 99; const px = f.C.x + f.A.x * f.me.s, pz = f.C.z + f.A.z * f.me.s; h.camAt(px - f.A.x * 1.0 + f.N.x * 2.6, 2.2, pz - f.A.z * 1.0 + f.N.z * 2.6, px + f.A.x * 0.8, 0.8, pz + f.A.z * 0.8, 3); } } }, // down on the street, Mummy standing over you
]; };
