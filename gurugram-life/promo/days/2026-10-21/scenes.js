// Day 5 · POV: the Gali ke Don just called you (phone-call cold open, gangster-film boss name cards, slow-mo)
window.__SCENES = h => { const { g, G, K, S } = h;
  const st = document.createElement('style'); st.textContent = `#rTime{top:170px!important;transform:translateX(-50%) rotate(-1.5deg)!important;background:#0d0d0d!important;color:#fff!important;border:0!important;border-left:10px solid #d7261b!important;border-radius:4px!important;font:800 27px/1 'Baloo 2'!important;letter-spacing:.06em;padding:14px 20px 9px!important;box-shadow:0 8px 24px rgba(0,0,0,.6)}
  #rCall{position:absolute;left:50%;top:250px;transform:translateX(-50%);width:330px;padding:26px 20px 22px;border-radius:30px;background:rgba(14,14,18,.86);color:#fff;text-align:center;font-family:'Baloo 2';box-shadow:0 18px 40px rgba(0,0,0,.55);display:none}
  #rCall .av{font-size:64px;line-height:1}#rCall b{display:block;font:800 30px/1.1 'Baloo 2';margin-top:6px}#rCall span{display:block;font:600 19px 'Baloo 2';color:#bbb}
  #rCall .btns{display:flex;justify-content:space-around;margin-top:18px}#rCall i{font-style:normal;width:68px;height:68px;border-radius:50%;display:grid;place-items:center;font-size:32px}#rCall .no{background:#e0342a}#rCall .yes{background:#1fae4b;animation:rp .7s infinite alternate}@keyframes rp{to{transform:scale(1.12)}}`;
  document.head.append(st); const call = document.createElement('div'); call.id = 'rCall'; call.innerHTML = '<div class="av">🕶️</div><b>Unknown number</b><span id="rCallS">incoming call…</span><div class="btns" id="rCallB"><i class="no">✕</i><i class="yes">📞</i></div>'; document.getElementById('reelOv').append(call);
  const gang = [];
  const spawn = (name, x, z, shirt, scale) => { const n = g.makeFighter(name, x, z, 999, 0, shirt); g.FIGHTERS.push(n); gang.push(n); if (scale) n.mesh.scale.setScalar(scale); return n; };
  const clear = () => { for (const n of gang) { g.scene.remove(n.mesh); const i = g.FIGHTERS.indexOf(n); if (i >= 0) g.FIGHTERS.splice(i, 1); } gang.length = 0; call.style.display = 'none'; };
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const done = () => clear();
  return [
  // 0 cold open: night at Rajiv Chowk, the phone rings: "Unknown number"
  { setup() { h.reset(); clear(); h.weather(0, 0); g.DAY.t = 0.74; at(0, 52, Math.PI); call.style.display = 'block'; document.getElementById('rCallS').textContent = 'incoming call…'; document.getElementById('rCallB').style.display = 'flex'; },
    tick(h, t) { const u = Math.max(0, t); if (t > 1.15) { document.getElementById('rCallB').style.display = 'none'; document.getElementById('rCallS').textContent = '00:0' + Math.floor(t - 1.15) + ' · on call'; } h.front(4.6 - u * 0.5, 1.75, 1.1, 3); }, done },
  // 1 boss 1: Rinku Chhapri walks up in Sadar Bazaar (slow-mo)
  { setup() { h.reset(); clear(); g.DAY.t = 0.7; at(300, -9, 0); S.b = spawn('Rinku Chhapri', 300.5, 1, 0x8b1e1e); S.b.state = 'aggro'; },
    tick(h, t) { window.__speed = 0.55; const b = S.b; h.camAt(G.x - 3.2, 1.1, G.z - 3.4, b.x, 1.9, b.z, 4); }, done },
  // 2 round 1: punches, then the knockout in slow motion
  { setup() { h.reset(); clear(); g.DAY.t = 0.7; at(300, -1, 0); S.b = spawn('Rinku Chhapri', 300, 0.6, 0x8b1e1e); S.b.hp = 34; S.b.state = 'aggro'; S.k = 0; },
    tick(h, t) { const b = S.b; window.__speed = t > 1.25 ? 0.33 : 1; G.r = G.yaw = Math.atan2(b.x - G.x, b.z - G.z); if (t > 0 && b.state !== 'ko' && t > S.k) { S.k = t + 0.42; G.punchCD = 0; g.punch(); }
      h.camAt(G.x + 4.2, 1.6, G.z + 0.6, (G.x + b.x) / 2, 1.3, (G.z + b.z) / 2, 4); }, done },
  // 3 boss 2: Lalit Lambu and a chela, Sector 29 (slow-mo walk)
  { setup() { h.reset(); clear(); g.DAY.t = 0.7; at(-150, -12, 0); S.b = spawn('Lalit Lambu', -150, 2, 0x2a2a2a, 1.08); S.c = spawn('Goon', -147.8, 0.5, 0x555555); S.b.state = S.c.state = 'aggro'; },
    tick(h, t) { window.__speed = 0.6; const b = S.b; h.camAt(G.x - 2.6, 0.9, G.z - 3.0, b.x + 1, 2.0, b.z, 4); }, done },
  // 4 boss 3: Sandy Gunda and two chele, Old Gurgaon (hero low angle, they walk at the camera)
  { setup() { h.reset(); clear(); g.DAY.t = 0.72; at(300, 136, 0); S.b = spawn('Sandy Gunda', 300, 152, 0x1b3a8a, 1.1); S.c = spawn('Goon', 297.8, 153.5, 0x444444); S.d = spawn('Goon', 302.2, 153.5, 0x5a3a2a); for (const n of gang) n.state = 'aggro'; },
    tick(h, t) { window.__speed = 0.6; const b = S.b; h.camAt(300.4, 0.6, 140.5, b.x, 2.2, b.z, 4); }, done },
  // 5 the finale tease: Dalal Bhai on Sohna Road at night
  { setup() { h.reset(); clear(); g.DAY.t = 0.745; at(150, -60, 0); S.b = spawn('Dalal Bhai', 150, 4, 0x111111, 1.25); S.b.state = 'aggro'; },
    tick(h, t) { window.__speed = 0.5; const b = S.b, u = Math.max(0, t); h.camAt(b.x + 0.8, 0.75, b.z - 3.4, b.x, 2.6, b.z, 6); }, done },
]; };
