// Shared runtime for daily reels: hides the HUD, draws the POV overlay, offers camera / weather / traffic helpers,
// and runs the day's scenes (days/<DAY>/scenes.js sets window.__SCENES = h => [ { setup, tick, post?, done? }, ... ]).
(() => {
  const g = window.__g, G = g.G, K = g.keys, now = () => performance.now() / 1000; const SC = window.__SC;
  const st = document.createElement('style'); st.textContent = `*{visibility:hidden!important} canvas:not(#mini),#reelOv,#reelOv *{visibility:visible!important}
  #reelOv{position:fixed;inset:0;z-index:99;pointer-events:none;font-family:'Baloo 2',sans-serif}
  #rPov{position:absolute;left:18px;right:18px;top:64px;text-align:center}
  #rPov span{display:inline;background:#fff;color:#111;font:800 25px/1.42 'Baloo 2';padding:2px 10px 0;border-radius:8px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
  #rTime{position:absolute;left:50%;top:205px;transform:translateX(-50%) rotate(-2deg);background:#ffd21f;color:#120c08;font:800 22px/1 'Baloo 2';padding:7px 14px 3px;border-radius:10px;border:3px solid #120c08;white-space:nowrap}
  #rTime:empty,#rPov:empty,#rCap:empty{display:none}
  #rCap{position:absolute;left:14px;right:14px;bottom:170px;text-align:center;font:800 34px/1.08 'Baloo 2';color:#fff;-webkit-text-stroke:7px #120c08;paint-order:stroke fill;text-shadow:0 4px 0 #120c08}
  #rCap.big{color:#ffd21f;font-size:42px}`;
  document.head.append(st); const ov = document.createElement('div'); ov.id = 'reelOv'; ov.innerHTML = '<div id="rPov"></div><div id="rTime"></div><div id="rCap"></div>'; document.body.append(ov); const $ = id => document.getElementById(id);
  const canvas = document.querySelector('canvas:not(#mini)'); const V = g.camera.position.constructor; let camP = null, camL = null, camK = 1, post = null;
  window.__cam = (cam, dt) => { if (post) post(); if (!camP) return; cam.position.lerp(camP, camK >= 1 ? 1 : Math.min(1, dt * camK)); cam.lookAt(camL); };
  const S = {}; const spawn = { x: G.x, z: G.z, yaw: G.yaw };
  const h = {
    g, G, K, S, V, now, spawn,
    camAt(x, y, z, lx, ly, lz, k) { camP = new V(x, y, z); camL = new V(lx, ly, lz); camK = k || 1; },
    chase(dist, height, side, k, lookAhead) { const fx = Math.sin(G.r), fz = Math.cos(G.r); h.camAt(G.x - fx * dist + fz * (side || 0), height, G.z - fz * dist - fx * (side || 0), G.x + fx * (lookAhead || 2), 1.0, G.z + fz * (lookAhead || 2), k || 6); },
    front(dist, height, side, k) { const fx = Math.sin(G.r), fz = Math.cos(G.r); h.camAt(G.x + fx * dist + fz * (side || 0), height, G.z + fz * dist - fx * (side || 0), G.x, 1.1, G.z, k || 6); },
    weather(lvl, wl) { G.weather = { lvl, since: 0, until: 1e12 }; g.WX.wl = wl; g.WX.ww = wl; g.WX.nextBolt = 1e12; },
    keysOff() { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space']) K[k] = false; },
    traffic(on) { for (const c of g.CARS) c.taken = !on; },
    noCrowd() { if (g.CROWD.meshes) for (const im of g.CROWD.meshes) im.visible = false; },
    clearChase() { if (G.chase) G.chase = null; if (g.CJ) g.CJ.visible = false; },
    reset() { h.keysOff(); G.dance = false; G.ev = null; h.clearChase(); if (G.veh) g.dismount(); G.hp = 100; },
    setEvent(type, data) { const t = g.serverNow(); G.ev = { type, id: 'reel', name: type, start: t - 5, end: t + 600, data: data || {} }; },
  };
  let scenes = null, cur = -1;
  window.__R = {
    setup(i) {
      scenes = scenes || window.__SCENES(h); g.DAY.fixed = true; const s = SC[i], k = s.sc;
      if (cur >= 0 && scenes[cur].done) scenes[cur].done(h);
      cur = k; for (const key of Object.keys(S)) delete S[key];
      if (G.inside && !s.inside) { G.dance = false; g.exitInterior(); S.pending = true; } else scenes[k].setup(h);
      post = () => { h.noCrowd(); if (scenes[k].post) scenes[k].post(h); };
      $('rPov').innerHTML = s.pov ? '<span>' + s.pov + '</span>' : ''; $('rTime').textContent = s.time || ''; $('rCap').textContent = ''; $('rCap').className = s.big ? 'big' : '';
      canvas.style.filter = s.filter || 'saturate(1.12) contrast(1.04)';
    },
    tick(i, t) { const s = SC[i]; if (S.pending) { if (G.inside || G.frozen) return; S.pending = false; scenes[s.sc].setup(h); } scenes[s.sc].tick(h, t); $('rCap').textContent = t >= (s.capAt || 0) ? s.cap || '' : ''; },
    info() { const c = g.camera.position; return { x: Math.round(G.x), z: Math.round(G.z), veh: G.veh, inside: G.inside, ev: G.ev && G.ev.type, cam: [c.x, c.y, c.z].map(Math.round), nF: g.FIGHTERS.length, frozen: G.frozen }; },
  };
})();
