// Day 20 · POV: Someone copied your startup in Gurugram (Part 4): the new street fight mode. Rinku Chhapri claims ParkKaro is his; face-off, you pick Judo vs his Karate, slow-motion hip throw finish.
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
  return [
  // 1 hook: FACE-OFF, Rinku claims your app
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.7; founder(); G.x = 300; G.z = 6; G.r = G.yaw = 0; document.body.classList.add('nopick');
      const b = g.makeFighter('Rinku Chhapri', 300.4, 12, 120, 7, 0x3b0d0d); b.donBoss = true; g.FIGHTERS.push(b); W.__B = b; W.__go = 0; for (const c of b.mesh.children) if (c.isSprite) c.visible = false; /* no floating name tag over the reel */
      const fo = document.createElement('div'); fo.id = 'rFace'; fo.textContent = 'FACE-OFF!'; fo.style.cssText = "position:absolute;left:0;right:0;top:36%;text-align:center;font:800 66px/1 'Baloo 2';color:#ffd21f;-webkit-text-stroke:9px #141414;paint-order:stroke fill;text-shadow:0 6px 0 #141414;transform:rotate(-4deg)"; document.getElementById('reelOv').append(fo); },
    tick(h, t) { keepLook(); if (!W.__go) { W.__go = 1; SF.start({ boss: W.__B, ch: 0, name: 'Rinku Chhapri', crowd: [], onWin() {}, onLose() {}, onFlee() {} }); }
      const f = sf(); if (f) { f.me.style = f.me.style || null; f.me.s = -1.8; f.foe.s = 1.8; }
      const fo = document.getElementById('rFace'); if (fo) fo.style.display = t < 1.3 ? '' : 'none'; for (const c of W.__B.mesh.children) if (c.isSprite && !c.userData.bub) c.visible = false; if (t < 1.1) closeOn('foe', 1); else cam(3.6, 2.0, 0.75, 4); } },
  // 2 choose your style
  { setup() { document.body.classList.remove('nopick'); S.k = 0; },
    tick(h, t) { keepLook(); cam(3.8, 2.0, 0.75, 4); const cards = document.querySelectorAll('.sfcard'); const i = t < 0.5 ? 0 : t < 0.9 ? 1 : 2; cards.forEach((c, j) => c.classList.toggle('hot', j === i));
      if (t > 1.9 && !S.k) { S.k = 1; SF.choose('judo'); } } },
  // 3 round 1: his karate kick, your block
  { setup() { S.a = S.b = 0; },
    tick(h, t) { keepLook(); hold(); cam(3.4, 1.9, 0.75, 5); const f = sf(); if (!f || f.phase !== 'fight') { if (f) at(-1.0, 1.0); return; }
      if (!S.a) { S.a = 1; at(-0.9, 0.9); } if (t > 1.45 && !S.b) { S.b = 1; block(true); SF.doMove(f.foe, 'kick'); } if (t > 2.3) block(false); } },
  // 4 your foot sweep: he goes down
  { setup() { S.a = 0; },
    tick(h, t) { keepLook(); hold(); cam(3.2, 1.6, 0.55, 5); const f = sf(); if (!f) return; if (!S.a && t > 0.15) { S.a = 1; at(-0.8, 0.8); SF.doMove(f.me, 'kick'); } } },
  // 5 he gets up angry: the karate chop breaks your guard
  { setup() { S.a = 0; const f = sf(); if (f) { f.foe.down = 0; f.foe.stun = 0; } },
    tick(h, t) { keepLook(); cam(3.0, 1.9, 0.9, 5); hold(); const f = sf(); if (!f) return; if (!S.a && t > 0.25) { S.a = 1; at(-0.8, 0.8); block(true); SF.doMove(f.foe, 'special'); } if (t > 1.4) block(false); } },
  // 6 slow motion: JUDO HIP THROW
  { setup() { S.a = 0; const f = sf(); if (f) { f.foe.hp = Math.min(f.foe.hp, 18); f.me.wins = 1; f.me.act = null; f.me.stun = 0; f.foe.act = null; } },
    tick(h, t) { keepLook(); cam(3.0, 1.0, 0.5, 4, 1.7); hold(); const f = sf(); if (!f) return; W.__speed = t > 0.15 && t < 1.9 ? 0.4 : 1; if (!S.a && t > 0.05) { S.a = 1; at(-0.6, 0.6); f.me.cd = 0; SF.doMove(f.me, 'special'); } } },
  // 7 K.O. and the punchline
  { setup() { W.__speed = 1; },
    tick(h, t) { keepLook(); const f = sf(); if (f) { f.foe.think = 99; const px = f.C.x + f.A.x * f.me.s, pz = f.C.z + f.A.z * f.me.s; h.camAt(px + f.A.x * 2.4 + f.N.x * 1.6, 1.7, pz + f.A.z * 2.4 + f.N.z * 1.6, px, 1.5, pz, 3); } } }, // the winner, front-on
]; };
