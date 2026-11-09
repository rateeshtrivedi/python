// Day 17 · POV: Gurugram is an RPG and you're only Lv 3 (turn-based battle UI over real gameplay: five wild encounters, the police are the final boss)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const hero = () => { g.setP({ outfit: { shirt: null, hat: 'none', shades: true }, bling: [], look: { ...g.P.look, top: 0 } }); G.myTint = 0x2563b8; g.applyMyLook(); }; // a plain blue tee and shades
  const go = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; g.setP({ vehicles: ['scooty'], cur: 'scooty', mods: {} }); if (g.P.outfit.hat !== 'none') hero(); };
  const BX = -222, BZ = 30; const baraat = () => { const t = g.serverNow(), D = 1e10, p = (BZ + 420) / 840; G.ev = { type: 'baraat', id: 'reel', name: 'baraat', start: t - p * D, end: t - p * D + D, data: {} }; };
  const pot = () => g.POTHOLES.find(p => Math.abs(p.x + 75) < 5 && p.z > -150 && p.z < 150) || g.POTHOLES[0];
  const canvas = document.querySelector('canvas:not(#mini)');

  // ---- the battle UI (drawn over the game; every frame is a pure function of the scene time, so preview and final match)
  const css = document.createElement('style'); css.textContent = `
  #rpg{position:absolute;inset:0;font-family:'Baloo 2',sans-serif;color:#141414}
  #rpg .plate{position:absolute;width:262px;background:#fffdf4;border:4px solid #141414;border-radius:12px;box-shadow:0 5px 0 #141414;padding:6px 12px 8px}
  #rpg .plate b{font:800 22px/1.1 'Baloo 2';display:block;white-space:nowrap}#rpg .plate i{font:800 16px 'Baloo 2';font-style:normal;float:right;margin-top:2px}
  #rpg .bar{display:flex;align-items:center;gap:6px;margin-top:3px;font:800 14px 'Baloo 2'}#rpg .bar span{background:#f6c026;border-radius:4px;padding:0 5px;line-height:18px}
  #rpg .bar div{flex:1;height:12px;border:3px solid #141414;border-radius:8px;background:#3b3b3b;overflow:hidden}#rpg .bar em{display:block;height:100%;background:#22c55e}
  #rpgE{right:14px;top:250px}#rpgP{left:14px;bottom:356px}
  #rpgM{position:absolute;left:14px;right:14px;bottom:300px;display:flex;gap:7px;justify-content:center}
  #rpgM span{background:#fffdf4;border:3px solid #141414;border-radius:10px;font:800 18px/1 'Baloo 2';padding:8px 10px 4px;box-shadow:0 3px 0 #141414}#rpgM span.on{background:#f6c026}
  #rpgT{position:absolute;left:14px;right:14px;bottom:168px;min-height:118px;background:#fffdf4;border:5px solid #141414;border-radius:14px;box-shadow:inset 0 0 0 4px #fffdf4,inset 0 0 0 7px #2563eb,0 6px 0 #141414;padding:14px 20px 10px;font:800 25px/1.22 'Baloo 2'}
  #rpgT:after{content:'▼';position:absolute;right:14px;bottom:6px;font-size:16px;color:#d7331f}
  #rpgF{position:absolute;inset:0;background:#fff;opacity:0}
  #rpgB{position:absolute;left:0;right:0;top:40%;text-align:center;font:800 60px/1.02 'Baloo 2';color:#fff;-webkit-text-stroke:9px #141414;paint-order:stroke fill;text-shadow:0 6px 0 #141414;opacity:0}`;
  document.head.append(css);
  const ov = document.getElementById('reelOv'); const root = document.createElement('div'); root.id = 'rpg'; ov.append(root);
  root.innerHTML = '<div id="rpgF"></div><div class="plate" id="rpgE"></div><div class="plate" id="rpgP"></div><div id="rpgM"></div><div id="rpgT"></div><div id="rpgB"></div>';
  const $ = id => document.getElementById(id);
  const plate = (el, name, lv, label, v) => { el.innerHTML = '<i>Lv ' + lv + '</i><b>' + name + '</b><div class="bar"><span>' + label + '</span><div><em style="width:' + Math.max(0, v) + '%;background:' + (v > 50 ? '#22c55e' : v > 20 ? '#f59e0b' : '#ef4444') + '"></em></div></div>'; };
  const lerp = (a, b, t0, t, d) => a + (b - a) * Math.min(1, Math.max(0, (t - t0) / (d || 0.5)));
  let B = null; // the current battle
  const battle = cfg => { B = cfg; root.style.display = ''; $('rpgM').innerHTML = ['FIGHT', cfg.move, 'BAG', 'RUN'].map(m => '<span class="' + (m === cfg.move ? 'on' : '') + '">' + (m === cfg.move ? '▶ ' : '') + m + '</span>').join(''); };
  const ui = t => {
    if (!B) return; const u = Math.max(0, t);
    $('rpgF').style.opacity = u < 0.18 ? String(1 - u / 0.18) : B.flash2 != null && u > B.flash2 && u < B.flash2 + 0.14 ? String(1 - (u - B.flash2) / 0.14) : '0';
    $('rpgF').style.background = B.red && u > (B.flash2 || 0) ? '#ef4444' : '#fff';
    plate($('rpgE'), B.enemy, B.lv, 'HP', lerp(B.ehp[0], B.ehp[1], B.hit, u)); plate($('rpgP'), 'BUNTY (YOU)', 3, B.plabel || 'HP', lerp(B.php[0], B.php[1], B.hit, u, 0.6));
    let line = B.lines[0]; for (const l of B.lines) if (u >= l[0]) line = l; const n = Math.floor((u - line[0]) * 42); $('rpgT').textContent = Array.from(line[1]).slice(0, Math.max(1, n)).join(''); // by characters, so emoji never split
    $('rpgM').style.display = u < B.hit ? 'flex' : 'none'; // the menu shows until you pick the move
    const sh = u > B.hit && u < B.hit + 0.35 ? Math.sin(u * 90) * 9 : 0; canvas.style.transform = sh ? 'translate(' + sh.toFixed(1) + 'px,' + (sh * 0.4).toFixed(1) + 'px)' : ''; // hit shake
    if (B.big) { $('rpgB').style.opacity = u > B.big[0] ? '1' : '0'; $('rpgB').innerHTML = B.big[1]; } else $('rpgB').style.opacity = '0';
  };
  const end = () => { canvas.style.transform = ''; };

  return [
  // 1 hook: a wild cow blocks the road (battle flash on frame 1)
  { setup() { go(0.55); const c = g.COWS[0]; S.cx = c.mesh.position.x; S.cz = c.mesh.position.z; at(S.cx, S.cz - 7, 0); g.mount('scooty'); G.vs = 0;
      battle({ enemy: 'WILD COW 🐄', lv: 99, move: 'HONK', ehp: [100, 100], php: [100, 100], hit: 1.15, lines: [[0, 'A wild COW blocked Golf Course Road!'], [1.15, 'You used HONK! It\'s not very effective…']] }); },
    tick(h, t) { K.KeyW = false; G.vs = 0; ui(t); const u = Math.max(0, t); h.camAt(G.x - 1.9, 1.5, G.z - 3.4 + u * 0.25, S.cx + 0.7, 1.15, S.cz, 3); }, done: end },
  // 2 a wild auto bhaiya: "meter kharab hai"
  { setup() { go(0.5); at(-75, 60, Math.PI / 2); const a = g.makeVehicle('auto'); a.position.set(-71, 0.2, 61.5); a.rotation.y = -Math.PI / 2; g.scene.add(a); S.props = [a]; h.traffic(false);
      battle({ enemy: 'AUTO BHAIYA 🛺', lv: 45, move: 'BARGAIN', ehp: [100, 100], php: [100, 18], plabel: '₹', hit: 1.1, lines: [[0, 'A wild AUTO BHAIYA appeared!'], [1.1, 'He used "METER KHARAB HAI"! Your wallet took ₹300 damage 💸']] }); },
    tick(h, t) { ui(t); const u = Math.max(0, t); h.camAt(-77.4 - u * 0.15, 1.55, 63.6, -71.5, 1.05, 61.0, 3); }, done() { end(); for (const m of S.props || []) g.scene.remove(m); h.traffic(true); } },
  // 3 a wild pothole: critical hit, the Scooty faints
  { setup() { go(0.62); const p = pot(); S.p = p; at(p.x, p.z - 17, 0); g.mount('scooty'); G.vs = 15;
      battle({ enemy: 'WILD POTHOLE 🕳️', lv: 70, move: 'SWERVE', ehp: [100, 100], php: [100, 12], hit: 1.1, lines: [[0, 'A wild POTHOLE appeared!'], [1.1, 'Critical hit! Your Scooty fainted 😵']] }); },
    tick(h, t) { const p = S.p, u = Math.max(0, t); K.KeyW = u < 1.25; if (u >= 1.25) G.vs *= 0.8; G.x += (p.x - G.x) * 0.2; if (Math.abs(G.z - p.z) < 1.6 && !S.hit) { S.hit = 1; G.jolt = 0.7; } ui(t); h.camAt(G.x - 2.2, 1.0, G.z - 4.6, G.x + 0.3, 0.8, G.z + 4, 6); }, done: end },
  // 4 a wild baraat: 200 of them, the dhol drains your time
  { setup() { h.reset(); h.weather(0, 0); g.DAY.t = 0.8; h.traffic(false); baraat(); g.setP({ vehicles: ['scooty'], cur: 'scooty', mods: {} }); if (g.P.outfit.hat !== 'none') hero(); at(BX + 1.2, BZ + 10, Math.PI); g.mount('scooty'); G.vs = 0;
      battle({ enemy: 'BARAAT ×200 🥁', lv: 88, move: 'HORN', ehp: [100, 100], php: [100, 6], plabel: 'TIME', hit: 1.15, lines: [[0, 'A wild BARAAT appeared! It brought 200 friends'], [1.15, 'BARAAT used DHOL DHAMAKA! You lost 45 minutes ⏰']] }); },
    tick(h, t) { K.KeyW = false; G.vs = 0; ui(t); const u = Math.max(0, t); h.camAt(G.x - 2.0 + u * 0.2, 1.7, G.z + 3.8, BX, 1.7, BZ + 0.5, 3); }, done: end },
  // 5 FINAL BOSS: Haryana Police
  { setup() { go(0.86); at(-75, -250, 0); g.mount('scooty'); G.vs = 16; g.startChase({ near: true, secs: 60, sp: 16 }); G.chase.x = G.x + 0.5; G.chase.z = G.z - 10;
      battle({ enemy: 'BOSS: POLICE 🚨', lv: 100, move: 'PLEAD', ehp: [100, 100], php: [12, 0], hit: 1.35, flash2: 1.35, red: true, big: [2.0, 'YOU BLACKED<br>OUT 💀'], lines: [[0, '⚠️ FINAL BOSS! HARYANA POLICE wants to battle!'], [1.35, 'POLICE used CHALLAN! ₹5,000! It\'s super effective…']] }); },
    post(h) { for (const c of g.COWS) if (c.mesh && Math.abs(c.mesh.position.x - G.x) < 40 && Math.abs(c.mesh.position.z - G.z) < 120) { if (!c._s) c._s = c.mesh.scale.x || 1; c.mesh.scale.setScalar(0.0001); } }, // no cow wandering into the boss fight (the cow update resets visibility every frame, so shrink them)
    done() { end(); for (const c of g.COWS) if (c._s) { c.mesh.scale.setScalar(c._s); delete c._s; } B = null; },
    tick(h, t) { K.KeyW = true; G.vs = Math.min(G.vs, 16); if (G.chase) G.chase.sp = 16; if (g.CJ) g.CJ.visible = true; ui(t); h.camAt(G.x + 2.2, 1.8, G.z + 7.5, G.x, 1.0, G.z - 5, 6); } },
]; };
