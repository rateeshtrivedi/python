// Day 16 · POV: You quit your Gurugram job to build a startup (the new update: vibe coding at Hustle Hub, then the investor pitch at Skyline Tower)
window.__SCENES = h => { const { g, G, S, V } = h; const F = window.__FD, net = g.net;
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; h.traffic(false); };
  const desk = () => F.DESKS.cowork; const L = (x, y, z) => desk().g.localToWorld(new V(x, y, z));
  const prompt = text => { const i = document.getElementById('suIn'); if (!i) return false; i.value = text; F.sendPrompt(); return true; };
  const idle = () => F.CODE && !F.CODE.busy && !F.ED.typing; // the AI finished writing
  const screen = () => { const s = desk().laptop.userData.screen; s.updateMatrixWorld(true); return s.getWorldPosition(new V()); };
  const over = (k) => { const sp = screen(), b = L(0.3, 1.6, 0.74), w = L(0.08, 1.38, 0.42); h.camAt(b.x + (w.x - b.x) * k, b.y + (w.y - b.y) * k, b.z + (w.z - b.z) * k, sp.x, sp.y - 0.02, sp.z, 1); }; // over the shoulder, pushing in on the screen
  const queue = list => { // run prompts one after another (the server wants a short gap between features)
    if (!S.q) S.q = { list: list.slice(), wait: 0 }; const q = S.q; if (!q.list.length) return true;
    if (!idle()) return false; q.wait += 1 / 30; if (q.wait < 3.3) return false; q.wait = 0; if (F.ED.bug) prompt('fix the bug'); else prompt(q.list.shift()); return false;
  };
  const board = () => F.boardroom;
  const founder = () => { g.setP({ outfit: { shirt: null, hat: 'none', shades: false }, bling: [], look: { ...g.P.look, top: 0 } }); G.myTint = 0x26324a; g.applyMyLook(); }; // plain dark tee, no pagdi
  const keepLook = () => { if (g.P.outfit.hat !== 'none' || g.player.userData.hatType !== 'none') founder(); }; // profile updates from the server bring the saved pagdi back
  const talk = (mesh, text, secs, k) => { const o = { mesh }; g.say(o, text, secs); if (o._bub) { o._bub.s.position.y = 2.25; o._bub.s.scale.multiplyScalar(k || 1); } }; // bubble just above the head, so it stays in a vertical frame
  return [
  // 1 hook: you at the Hustle Hub hot desk, wide push-in
  { setup() { go(0.92); S.st = 0; founder(); },
    tick(h, t) { keepLook();
      if (S.st === 0) { if (G.inside !== 'cowork') { if (!S.e) { S.e = 1; g.enterInterior('cowork'); } return; } S.st = 1; S.w = 0; }
      if (S.st === 1) { if ((S.w += 1 / 30) < 1.2) return; S.st = 2; S.w = 0; net.req('su', { op: 'idea', idea: 'park', name: 'ParkKaro' }).then(r => { S.idea = r; if (r && r.ok) g.P.su = r.su; }); }
      if (S.st === 2) { if ((S.w += 1 / 30) < 0.8) return; S.st = 2.5; F.sitAndCode('cowork').then(() => { S.st = F.CODE ? 3 : -2; S.w = 0; }); }
      if (S.st === -2) { if ((S.w += 1 / 30) < 0.5) return; S.st = -3; net.req('su', { op: 'sit' }).then(r => { S.idea = { sit: r, seat: !!G.seat, inside: G.inside }; S.st = -1; }); } // the server rate-limits startup calls (0.3 s apart)
      if (S.st === -1) throw new Error('could not sit ' + JSON.stringify({ idea: S.idea, su: g.P.su }));
      if (S.st < 3) return; const u = Math.max(0, t) / 2.6; const a = L(2.6, 2.6, 3.4), b = L(1.1, 1.85, 2.0), lk = L(0, 1.15, 0.5);
      h.camAt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u, lk.x, lk.y, lk.z, 1);
    } },
  // 2 vibe coding: one line of English, the AI types the code on the laptop
  { setup() { S.sent = 0; }, inside: true,
    tick(h, t) { keepLook(); if (!S.sent && idle()) { S.sent = 1; prompt('add a live map of parking spots'); } over(Math.max(0, t) / 2.8 * 0.85); } },
  // 3 two features later: the bug, then "fix it"
  { setup() { S.fix = 0; }, inside: true,
    tick(h, t) { keepLook(); if (t < 0) { queue(['let users book a parking slot', 'add login with OTP']); return; } // pre-roll: build up to the bug
      if (t > 1.2 && !S.fix && F.ED.bug && idle()) { S.fix = 1; prompt('fix the bug'); } over(0.75); } },
  // 4 launch night
  { setup() { S.l = 0; }, inside: true,
    tick(h, t) { keepLook(); if (t < 0) { S.done = queue(['add UPI payments', 'ratings and reviews', 'make it dark mode', 'Hindi language bhi daalo']); over(0.6); return; }
      if (!S.l && idle()) { S.l = 1; F.launch(); } over(0.6 + Math.min(1, t / 2) * 0.25); } },
  // 5 the call, then the boardroom: "So what's your revenue?"
  { setup() { go(0.5); S.st = 0; },
    tick(h, t) { keepLook();
      if (S.st === 0) { if (F.CODE) F.standUp(); if (G.inside !== 'vc') { if (!S.e) { S.e = 1; net.req('su', { op: 'call', inv: 'sharma' }).then(r => { S.call = r && r.call && r.call.key; if (r && r.ok) g.P.su = r.su; }); G.inside ? g.exitInterior() : g.enterInterior('vc'); } else if (!G.inside && !G.frozen && S.e === 1) { S.e = 2; g.enterInterior('vc'); } return; } S.st = 1; S.w = 0; }
      if (S.st === 1) { if ((S.w += 1 / 30) < 1.2) return; S.st = 2; F.startPitch().then(() => { S.st = 3; }); }
      if (S.st < 3) return; if (!board().invs[0]) throw new Error('pitch did not start ' + JSON.stringify({ call: S.call, meet: g.P.su && g.P.su.meet, feats: g.P.su && g.P.su.feats, launched: g.P.su && g.P.su.launched, inside: G.inside })); const B = board(), inv = B.invSeats[0], me = B.me; const u = Math.max(0, t);
      for (const pl of B.plates) pl.visible = false; h.camAt(me.x + 1.0, 2.05, me.z + 1.9 - u * 0.15, inv.x, 1.75, inv.z, 1); // over your shoulder, across the table
      if (t > 0.3 && !S.s) { S.s = 1; talk(B.invs[0], 'So... what is your revenue? 🤨', 2.4); }
    } },
  // 6 the punchline: they invest
  { setup() { S.s = 0; }, inside: true,
    tick(h, t) { keepLook(); const B = board(); if (!B || !B.invs[0]) return; const inv = B.invSeats[0]; const u = Math.min(1, Math.max(0, t) / 1.2);
      for (const pl of B.plates) pl.visible = false; h.camAt(inv.x + 0.3 - u * 0.15, 1.7, inv.z + 3.4 - u * 0.9, inv.x, 1.75, inv.z, 1); // push in on the investor
      if (t > 0.2 && !S.s) { S.s = 1; talk(B.invs[0], 'Deal! ₹3 lakh for 10% 🤝', 2.6, 0.42); } } },
]; };
