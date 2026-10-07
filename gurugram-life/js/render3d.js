'use strict';
// 3D renderer for Gurugram Life (Three.js r128). The simulation lives in game.js;
// this file only turns the world state into a lit, shadowed 3D city.
// Map coordinates (x, y) become world (X, Z); Y is up. 1 unit ≈ 10 cm.
window.GGL3D = (() => {
  const T = window.THREE;
  if (!T) return { supported: () => false, ready: false }; // CDN unreachable: game.js uses 2D
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  function supported() {
    try {
      if (!T) return false;
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  let renderer, scene, camera, sun, hemi, sky, stars, rain, rainPos;
  let ready = false;
  const lin = (hex) => new T.Color(hex).convertSRGBToLinear();
  const matCache = {};
  const stdMat = (hex, opts = {}) => {
    const k = hex + JSON.stringify(opts);
    return matCache[k] || (matCache[k] = new T.MeshStandardMaterial(Object.assign({ color: lin(hex), roughness: 0.85 }, opts)));
  };

  // ---------- camera control ----------
  const cam = { yaw: -Math.PI / 2, pitch: 0.36, dist: 150, tx: 0, ty: 14, tz: 0, init: false };
  const rot = { left: false, right: false };
  function attachControls(canvas) {
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      cam.yaw += (e.clientX - drag.x) * 0.006;
      cam.pitch = clamp(cam.pitch + (e.clientY - drag.y) * 0.004, 0.15, 1.3);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 45, 650); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'z') rot.left = true;
      if (k === 'x') rot.right = true;
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'z') rot.left = false;
      if (k === 'x') rot.right = false;
    });
  }

  // ---------- procedural textures ----------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    return t;
  }
  function noise(g, w, h, n, a) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a * Math.random()})` : `rgba(255,255,255,${a * Math.random()})`;
      const s = 1 + Math.random() * 3;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }

  // A facade tile is 4 window bays by 4 floors = 56 x 56 world units.
  const TILE = 56;
  function facadeTextures(style) {
    const S = 256, cell = 64;
    const lit = [];
    for (let i = 0; i < 16; i++) lit.push(Math.random() < (style === 'resi' ? 0.55 : 0.4));
    const map = canvasTex(S, S, (g) => {
      if (style === 'glass') {
        const gr = g.createLinearGradient(0, 0, S, S);
        gr.addColorStop(0, '#5f8bab'); gr.addColorStop(0.5, '#86aec6'); gr.addColorStop(1, '#4d7591');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        g.fillStyle = 'rgba(255,255,255,.12)';
        for (let i = 0; i < 6; i++) g.fillRect(Math.random() * S, 0, 10 + Math.random() * 30, S);
        g.fillStyle = '#2d3a44';
        for (let x = 0; x <= S; x += cell) g.fillRect(x - 2, 0, 4, S);
        for (let y = 0; y <= S; y += cell) g.fillRect(0, y - 3, S, 6);
      } else if (style === 'office') {
        g.fillStyle = '#d9d5cc'; g.fillRect(0, 0, S, S);
        noise(g, S, S, 900, 0.08);
        for (let y = 0; y < S; y += cell) { g.fillStyle = '#3b5266'; g.fillRect(0, y + 18, S, 32); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, y + 18, S, 6); }
        g.fillStyle = '#bfb9ae'; for (let x = 0; x < S; x += cell) g.fillRect(x, 0, 5, S);
      } else if (style === 'resi') {
        g.fillStyle = '#e9e0cf'; g.fillRect(0, 0, S, S);
        noise(g, S, S, 1200, 0.1);
        for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) {
          g.fillStyle = '#4a5a68'; g.fillRect(x + 12, y + 12, 34, 34);
          g.fillStyle = '#d8cdb8'; g.fillRect(x + 28, y + 12, 3, 34);
          g.fillStyle = '#b8ab92'; g.fillRect(x + 4, y + 50, 56, 7); // balcony slab
          g.fillStyle = '#6b6b6b'; for (let r = x + 6; r < x + 60; r += 6) g.fillRect(r, y + 44, 1.5, 7); // railing
          if (Math.random() < 0.4) { g.fillStyle = '#f2f2ee'; g.fillRect(x + 48, y + 20, 12, 9); } // AC unit
          if (Math.random() < 0.3) { g.fillStyle = ['#c0392b', '#2f6db3', '#e3b23c'][Math.floor(Math.random() * 3)]; g.fillRect(x + 8, y + 40, 20, 4); } // laundry
        }
      } else if (style === 'shop') {
        g.fillStyle = '#c7a283'; g.fillRect(0, 0, S, S);
        noise(g, S, S, 1500, 0.12);
        for (let y = 0; y < S; y += cell) { g.fillStyle = 'rgba(80,50,30,.25)'; g.fillRect(0, y + cell - 4, S, 4); }
        for (let y = 0; y < S; y += cell * 2) for (let x = 0; x < S; x += cell) {
          g.fillStyle = '#7b8a90'; g.fillRect(x + 6, y + cell + 10, 52, 50); // rolling shutter
          g.fillStyle = 'rgba(0,0,0,.18)'; for (let s = y + cell + 12; s < y + cell + 60; s += 4) g.fillRect(x + 6, s, 52, 1);
          g.fillStyle = '#3e4c58'; g.fillRect(x + 14, y + 14, 36, 30);
        }
      } else if (style === 'mall') {
        g.fillStyle = '#cfd2d6'; g.fillRect(0, 0, S, S);
        g.fillStyle = '#b7bbc1'; for (let x = 0; x < S; x += 32) g.fillRect(x, 0, 2, S);
        for (let y = 0; y < S; y += 32) g.fillRect(0, y, S, 2);
        g.fillStyle = '#3f5568'; g.fillRect(0, 150, S, 60);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 150, S, 10);
      } else if (style === 'industrial') {
        for (let x = 0; x < S; x += 8) { g.fillStyle = x % 16 ? '#9aa1a6' : '#868d93'; g.fillRect(x, 0, 8, S); }
        noise(g, S, S, 800, 0.1);
        g.fillStyle = '#4a5866'; g.fillRect(0, 20, S, 16);
      } else if (style === 'construction') {
        g.fillStyle = '#9b9790'; g.fillRect(0, 0, S, S);
        noise(g, S, S, 1500, 0.15);
        for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) { g.fillStyle = '#2b2b2b'; g.fillRect(x + 8, y + 10, 48, 44); }
        g.fillStyle = 'rgba(40,140,70,.45)'; g.fillRect(0, 0, S, 70);
      } else { // metro
        g.fillStyle = '#2a9d8f'; g.fillRect(0, 0, S, S);
        g.fillStyle = '#e8f4f2'; g.fillRect(0, 100, S, 56);
        g.fillStyle = '#21312f'; for (let x = 6; x < S; x += 42) g.fillRect(x, 106, 34, 44);
      }
    }, true);
    const emissive = canvasTex(S, S, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      if (style === 'industrial' || style === 'construction') return;
      let i = 0;
      for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell, i++) {
        if (!lit[i]) continue;
        g.fillStyle = Math.random() < 0.7 ? '#ffd890' : '#d6ecff';
        if (style === 'glass') g.fillRect(x + 4, y + 5, cell - 8, cell - 10);
        else if (style === 'office') g.fillRect(x, y + 18, cell, 32);
        else if (style === 'resi') g.fillRect(x + 12, y + 12, 34, 34);
        else if (style === 'mall') g.fillRect(0, 150, S, 60);
        else g.fillRect(x + 14, y + 14, 36, 30);
      }
    }, true);
    return { map, emissive };
  }

  function roadTexture(hw) {
    return canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h);
      noise(g, w, h, 2500, 0.18);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(w * 0.18, 0, w * 0.12, h); g.fillRect(w * 0.7, 0, w * 0.12, h); // tyre wear
      g.fillStyle = '#e9e7df'; g.fillRect(5, 0, 3, h); g.fillRect(w - 8, 0, 3, h);
      if (hw) {
        g.fillStyle = '#e8c547'; g.fillRect(w / 2 - 4, 0, 2, h); g.fillRect(w / 2 + 2, 0, 2, h);
        g.fillStyle = '#e9e7df'; g.fillRect(w * 0.25 - 1, 0, 2, h / 2); g.fillRect(w * 0.75 - 1, 0, 2, h / 2);
      } else { g.fillStyle = '#e9e7df'; g.fillRect(w / 2 - 1.5, 0, 3, h / 2); }
    }, true);
  }

  function scaleUV(geo, su, sv, faces) {
    const uv = geo.attributes.uv;
    for (const f of faces) {
      for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * su[f], uv.getY(i) * sv[f]);
    }
    uv.needsUpdate = true;
  }

  // ---------- geometry helpers ----------
  const tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpS = new T.Vector3(1, 1, 1), tmpP = new T.Vector3();
  function part(geo, color, x, y, z, rx = 0, ry = 0, rz = 0) { return { geo, color, m: new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1)) }; }
  function merge(parts) {
    const pos = [], nor = [], col = [];
    for (const p of parts) {
      const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()).applyMatrix4(p.m);
      const c = lin(p.color);
      const P = g.attributes.position.array, N = g.attributes.normal.array;
      for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(N[i]); }
      for (let i = 0; i < P.length / 3; i++) col.push(c.r, c.g, c.b);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    return g;
  }
  const BOX = (w, h, d) => new T.BoxGeometry(w, h, d);
  const WHEEL = (r, t) => new T.CylinderGeometry(r, r, t, 12);

  // Vehicles face +X. Returns { body, lamps } geometries, cached per kind.
  const vehCache = {};
  function vehicleGeo(k) {
    const key = [k.c, k.l, k.w, !!k.auto, !!k.bus, !!k.two, !!k.rider].join('|');
    if (vehCache[key]) return vehCache[key];
    const L = (k.l || 30) * 1.35, W = (k.w || 16) * 1.25, parts = [], lamps = [];
    const tyre = '#1b1b1b';
    if (k.two) {
      parts.push(part(WHEEL(3, 1.4), tyre, -7, 3, 0, Math.PI / 2), part(WHEEL(3, 1.4), tyre, 7, 3, 0, Math.PI / 2));
      parts.push(part(BOX(14, 4, 3.2), k.c || '#c0392b', 0, 6, 0), part(BOX(6, 1.6, 3.4), '#222', -2, 8.6, 0), part(BOX(1, 1, 7), '#555', 6, 10, 0));
      if (k.rider) {
        parts.push(part(BOX(3.5, 7, 5), k.riderShirt || '#2b3a55', -2, 13, 0), part(new T.SphereGeometry(2.5, 10, 8), k.helmet || '#d94a2b', -1.5, 19, 0));
        parts.push(part(BOX(5, 2, 1.8), '#2f3640', 1, 8.5, 1.8), part(BOX(5, 2, 1.8), '#2f3640', 1, 8.5, -1.8));
      }
      lamps.push(part(BOX(0.6, 1.4, 1.6), '#fff', 8, 8, 0));
    } else if (k.auto) {
      parts.push(part(WHEEL(2.6, 1.6), tyre, 9, 2.6, 0, Math.PI / 2), part(WHEEL(2.6, 1.6), tyre, -8, 2.6, W / 2 - 1), part(WHEEL(2.6, 1.6), tyre, -8, 2.6, -W / 2 + 1));
      parts.push(part(BOX(L, 7, W), '#2d8a3a', 0, 7, 0), part(BOX(L * 0.85, 1.2, W + 0.6), '#f2c14e', -1, 11, 0));
      parts.push(part(BOX(L * 0.8, 1.5, W + 0.4), '#1d1d1d', -1.5, 21, 0), part(BOX(1, 9, W), '#2a3540', L * 0.35, 16, 0));
      parts.push(part(BOX(1.2, 10, 1.2), '#222', -L * 0.4, 16, W / 2 - 0.6), part(BOX(1.2, 10, 1.2), '#222', -L * 0.4, 16, -W / 2 + 0.6));
      lamps.push(part(BOX(0.6, 1.6, 2), '#fff', L / 2 + 0.2, 8, 0));
    } else if (k.bus) {
      const r = 3.6;
      [-L * 0.33, L * 0.3].forEach((x) => { parts.push(part(WHEEL(r, 1.8), tyre, x, r, W / 2 - 1.5, Math.PI / 2), part(WHEEL(r, 1.8), tyre, x, r, -W / 2 + 1.5, Math.PI / 2)); });
      parts.push(part(BOX(L, 22, W), k.c, 0, 14, 0), part(BOX(L - 6, 7, W + 0.4), '#26323d', -1, 19, 0), part(BOX(1, 10, W - 3), '#26323d', L / 2, 17, 0));
      parts.push(part(BOX(L, 1, W), '#e9e9e9', 0, 25.5, 0));
      lamps.push(part(BOX(0.6, 2, 3), '#fff', L / 2 + 0.2, 7, W / 2 - 3), part(BOX(0.6, 2, 3), '#fff', L / 2 + 0.2, 7, -W / 2 + 3));
    } else {
      const r = 3.3;
      [-L * 0.32, L * 0.3].forEach((x) => { parts.push(part(WHEEL(r, 2), tyre, x, r, W / 2 - 1.5, Math.PI / 2), part(WHEEL(r, 2), tyre, x, r, -W / 2 + 1.5, Math.PI / 2)); });
      parts.push(part(BOX(L, 6.5, W), k.c, 0, 6.5, 0));
      parts.push(part(BOX(L * 0.52, 5.5, W * 0.88), '#1f2a33', -L * 0.06, 12.3, 0), part(BOX(L * 0.46, 0.8, W * 0.86), k.c, -L * 0.06, 15.3, 0));
      parts.push(part(BOX(0.8, 1.2, W * 0.9), '#2b2b2b', L / 2, 5, 0));
      lamps.push(part(BOX(0.6, 1.6, 3.2), '#fff', L / 2 + 0.1, 7.5, W / 2 - 2.6), part(BOX(0.6, 1.6, 3.2), '#fff', L / 2 + 0.1, 7.5, -W / 2 + 2.6));
    }
    const out = { body: merge(parts), lamps: merge(lamps), L, W };
    vehCache[key] = out;
    return out;
  }
  let vehMat, lampMat, tailMat;
  function makeVehicle(k) {
    const g = vehicleGeo(k), grp = new T.Group();
    const body = new T.Mesh(g.body, vehMat);
    body.castShadow = !mobile;
    grp.add(body, new T.Mesh(g.lamps, lampMat));
    if (!k.two) { const tl = new T.Mesh(BOX(0.5, 1.5, 2.5), tailMat); tl.position.set(-g.L / 2 - 0.2, 7, g.W / 2 - 2.5); const tr = tl.clone(); tr.position.z = -tl.position.z; grp.add(tl, tr); }
    return grp;
  }

  // People face +X. Limbs pivot so they can swing.
  let PG = null;
  function personGeos() {
    if (PG) return PG;
    const leg = new T.CylinderGeometry(1.25, 1.0, 8, 10); leg.translate(0, -4, 0);
    const arm = new T.CylinderGeometry(0.85, 0.7, 7, 8); arm.translate(0, -3.5, 0);
    const torso = new T.CylinderGeometry(3.1, 2.6, 7, 14); torso.scale(0.62, 1, 1);
    PG = {
      leg, arm, torso, head: new T.SphereGeometry(2.3, 14, 10),
      hair: new T.SphereGeometry(2.48, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hand: new T.SphereGeometry(0.9, 6, 5),
      long: BOX(1.3, 5.5, 4.6), bun: new T.SphereGeometry(1.4, 8, 6), brim: BOX(3.2, 0.4, 4.4), shoe: BOX(3.2, 1.2, 2.4),
    };
    return PG;
  }
  function makePerson(look) {
    const G = personGeos(), g = new T.Group();
    const m = (hex) => stdMat(hex);
    const legL = new T.Mesh(G.leg, m(look.pants)), legR = new T.Mesh(G.leg, m(look.pants));
    legL.position.set(0, 9, -1.4); legR.position.set(0, 9, 1.4);
    [legL, legR].forEach((l) => { const s = new T.Mesh(G.shoe, m('#2a2a2a')); s.position.set(0.5, -8.2, 0); l.add(s); });
    const torso = new T.Mesh(G.torso, m(look.shirt)); torso.position.y = 12.5;
    const armL = new T.Mesh(G.arm, m(look.shirt)), armR = new T.Mesh(G.arm, m(look.shirt));
    armL.position.set(0, 15.5, -4); armR.position.set(0, 15.5, 4);
    [armL, armR].forEach((a) => { const h = new T.Mesh(G.hand, m(look.skin)); h.position.y = -7.2; a.add(h); });
    const head = new T.Mesh(G.head, m(look.skin)); head.position.y = 18.6;
    g.add(legL, legR, torso, armL, armR, head);
    const hairCol = look.hairStyle === 'cap' ? '#c0392b' : look.hair;
    const hair = new T.Mesh(G.hair, m(hairCol)); hair.position.set(-0.15, 18.9, 0); g.add(hair);
    if (look.hairStyle === 'long') { const l = new T.Mesh(G.long, m(look.hair)); l.position.set(-1.6, 17, 0); g.add(l); }
    if (look.hairStyle === 'bun') { const b = new T.Mesh(G.bun, m(look.hair)); b.position.set(-1.9, 20.8, 0); g.add(b); }
    if (look.hairStyle === 'cap') { const b = new T.Mesh(G.brim, m(hairCol)); b.position.set(2, 19.3, 0); g.add(b); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = !mobile; });
    g.userData = { legL, legR, armL, armR };
    g.scale.setScalar(0.9);
    return g;
  }
  function animatePerson(p, phase, amt) {
    const s = Math.sin(phase) * 0.65 * amt, u = p.userData;
    u.legL.rotation.z = s; u.legR.rotation.z = -s; u.armL.rotation.z = -s * 0.8; u.armR.rotation.z = s * 0.8;
  }
  function seatPerson(p) { const u = p.userData; u.legL.rotation.z = u.legR.rotation.z = 1.3; u.armL.rotation.z = u.armR.rotation.z = 1.1; }

  function textSprite(text, bg, px = 64) {
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.beginPath(); g.arc(px / 2, px / 2, px / 2 - 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
    g.font = `${px * 0.5}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, px / 2, px / 2 + 2);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, sizeAttenuation: false, transparent: true }));
    s.renderOrder = 10;
    return s;
  }
  function signMesh(text, color, maxW) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = '700 46px system-ui, sans-serif';
    const tw = Math.ceil(g.measureText(text).width);
    c.width = tw + 56; c.height = 84;
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; g.strokeRect(4, 4, c.width - 8, c.height - 8);
    g.font = '700 46px system-ui, sans-serif'; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 28, 44);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    let h = 9, w = (h * c.width) / c.height;
    if (w > maxW) { w = maxW; h = (w * c.height) / c.width; }
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, toneMapped: false }));
    return { mesh, h };
  }

  // ---------- city ----------
  const SPEC = {
    talksphere: [150, 'glass'], precision: [55, 'industrial'], truckdhaba: [28, 'shop'], codekraft: [330, 'glass'], cybersquare: [70, 'mall'],
    metro_cyber: [36, 'metro'], glasstower: [430, 'glass'], galaxymall: [90, 'mall'], bhatura: [34, 'shop'], metro_mg: [36, 'metro'],
    aravallifin: [380, 'glass'], paisabank: [80, 'office'], metro_sik: [36, 'metro'], shantipg: [70, 'resi'], chaichaupal: [30, 'shop'],
    skillup: [90, 'office'], sec14market: [40, 'shop'], kirana14: [28, 'shop'], brewbastion: [45, 'shop'], momomahal: [34, 'shop'],
    ironparadise: [45, 'office'], natak: [75, 'mall'], skyline: [560, 'resi'], emerald: [30, 'office'], grandorchid: [200, 'office'],
    metro_gcr: [36, 'metro'], sanjeevani: [160, 'office'], palmres: [260, 'resi'], mithaas: [30, 'shop'], metro_54: [36, 'metro'],
    sadar: [40, 'shop'], sharmaji: [30, 'shop'], basera: [55, 'resi'], busadda: [26, 'industrial'], sushantnest: [150, 'resi'],
    biryanibros: [32, 'shop'], plaza: [42, 'shop'], zipzap: [40, 'industrial'], raftaar: [40, 'mall'], omnix: [90, 'mall'],
    hustlehive: [220, 'glass'], horizon: [460, 'resi'], caffeinelab: [32, 'shop'], taulassi: [26, 'shop'], harmony: [200, 'resi'],
    site82: [120, 'construction'], cineplex: [70, 'mall'], rajma: [28, 'shop'], trafficbhawan: [60, 'office'],
  };
  const ICON = { job: '💼', food: '🍽️', home: '🏠', social: '🎉', park: '🌳', metro: '🚇', shop: '🛍️', mall: '🛍️', bank: '🏦', hospital: '🏥', gym: '🏋️', skill: '🎓', dealer: '🛵', landmark: '📍' };
  const boxes = []; // for camera occlusion
  const icons = [];
  const facadeMats = [];
  let lampHeadMat, roofMat;
  const rideRing = { mesh: null };
  let waypointBeam, waypointRing, puddleGroup, nakaGroup;

  function buildGround() {
    const W = 2048, H = Math.round((2048 * WORLD.h) / WORLD.w), k = W / WORLD.w;
    const tex = canvasTex(W, H, (g) => {
      g.fillStyle = '#7d8a55'; g.fillRect(0, 0, W, H);
      for (const d of DISTRICTS) {
        const base = d.farm ? '#6e7f3c' : d.green ? '#4f7034' : '#706d64';
        g.fillStyle = base; g.fillRect(d.x * k, d.y * k, d.w * k, d.h * k);
        if (!d.farm && !d.green) { g.globalAlpha = 0.1; g.fillStyle = d.color; g.fillRect(d.x * k, d.y * k, d.w * k, d.h * k); g.globalAlpha = 1; }
        if (d.farm) { g.strokeStyle = 'rgba(60,80,30,.35)'; g.lineWidth = 2; for (let y = d.y * k; y < (d.y + d.h) * k; y += 7) { g.beginPath(); g.moveTo(d.x * k, y); g.lineTo((d.x + d.w) * k, y); g.stroke(); } }
        if (!d.farm && !d.green) {
          for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${70 + Math.random() * 30},${100 + Math.random() * 30},45,.6)`; g.beginPath(); g.ellipse((d.x + Math.random() * d.w) * k, (d.y + Math.random() * d.h) * k, 4 + Math.random() * 12, 3 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
        }
      }
      for (const b of BUILDINGS) {
        if (b.solid) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect((b.x - 6) * k, (b.y - 6) * k, (b.w + 12) * k, (b.h + 20) * k); continue; }
        g.fillStyle = '#5b8a3c'; g.fillRect(b.x * k, b.y * k, b.w * k, b.h * k);
        g.strokeStyle = '#b9a67e'; g.lineWidth = 5; g.beginPath(); g.ellipse((b.x + b.w / 2) * k, (b.y + b.h / 2) * k, b.w * k * 0.36, b.h * k * 0.36, 0, 0, Math.PI * 2); g.stroke();
        if (b.park === 'cricket') { g.fillStyle = '#c9b282'; g.fillRect((b.x + b.w / 2 - 10) * k, (b.y + b.h / 2 - 50) * k, 20 * k, 100 * k); }
      }
      g.fillStyle = '#3a3c40';
      for (const r of ROADS_V) g.fillRect((r.x - r.w / 2) * k, 0, r.w * k, H);
      for (const r of ROADS_H) g.fillRect(0, (r.y - r.w / 2) * k, W, r.w * k);
      noise(g, W, H, 60000, 0.12);
    });
    const ground = new T.Mesh(new T.PlaneGeometry(WORLD.w, WORLD.h), new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD.w / 2, 0, WORLD.h / 2);
    ground.receiveShadow = true;
    const outer = new T.Mesh(new T.PlaneGeometry(16000, 16000), new T.MeshStandardMaterial({ color: lin('#74814f'), roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(WORLD.w / 2, -0.3, WORLD.h / 2);
    scene.add(ground, outer);
    // Aravalli hills on the eastern and southern horizon
    const hillMat = new T.MeshStandardMaterial({ color: lin('#6f7650'), roughness: 1, flatShading: true });
    for (let i = 0; i < 22; i++) {
      const geo = new T.IcosahedronGeometry(1, 1);
      const p = geo.attributes.position;
      for (let j = 0; j < p.count; j++) { const s = 0.75 + Math.random() * 0.5; p.setXYZ(j, p.getX(j) * s, Math.max(0, p.getY(j)) * s, p.getZ(j) * s); }
      geo.computeVertexNormals();
      const h = new T.Mesh(geo, hillMat);
      const east = i < 14;
      h.position.set(east ? WORLD.w + 500 + Math.random() * 1400 : Math.random() * WORLD.w * 1.3, 0, east ? -800 + Math.random() * (WORLD.h + 1600) : WORLD.h + 600 + Math.random() * 900);
      h.scale.set(400 + Math.random() * 500, 120 + Math.random() * 260, 400 + Math.random() * 500);
      scene.add(h);
    }
  }

  function buildRoads() {
    const texV = roadTexture(false), texHW = roadTexture(true);
    const matV = new T.MeshStandardMaterial({ map: texV, roughness: 0.9 });
    const matHW = new T.MeshStandardMaterial({ map: texHW, roughness: 0.9 });
    const asphalt = new T.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); noise(g, w, h, 1500, 0.18); }, true), roughness: 0.9 });
    const zebra = new T.MeshStandardMaterial({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ecebe4'; g.fillRect(8, 0, 32, 64); }, true), roughness: 0.8 });
    const curbMat = stdMat('#a9a59b', { roughness: 0.9 });
    const add = (geo, mat, x, z, ry) => { const m = new T.Mesh(geo, mat); m.rotation.set(-Math.PI / 2, 0, ry || 0); m.position.set(x, 0.25, z); m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); scene.add(m); return m; };
    const DASH = 120;
    for (const r of ROADS_V) { const geo = new T.PlaneGeometry(r.w, WORLD.h); scaleUV(geo, [1], [WORLD.h / DASH], [0]); add(geo, r.hw ? matHW : matV, r.x, WORLD.h / 2, 0); }
    for (const r of ROADS_H) { const geo = new T.PlaneGeometry(r.w, WORLD.w); scaleUV(geo, [1], [WORLD.w / DASH], [0]); add(geo, r.hw ? matHW : matV, WORLD.w / 2, r.y, Math.PI / 2); }
    for (const rv of ROADS_V) for (const rh of ROADS_H) {
      const g = new T.PlaneGeometry(rv.w, rh.w); scaleUV(g, [rv.w / 60], [rh.w / 60], [0]);
      const m = add(g, asphalt, rv.x, rh.y, 0); m.position.y = 0.32; m.updateMatrix();
      const zz = (w, len, x, z, ry) => { const zg = new T.PlaneGeometry(w, len); scaleUV(zg, [w / 16], [1], [0]); const zm = add(zg, zebra, x, z, ry); zm.position.y = 0.34; zm.updateMatrix(); };
      zz(rv.w - 8, 12, rv.x, rh.y - rh.w / 2 - 10, 0); zz(rv.w - 8, 12, rv.x, rh.y + rh.w / 2 + 10, 0);
      zz(rh.w - 8, 12, rv.x - rv.w / 2 - 10, rh.y, Math.PI / 2); zz(rh.w - 8, 12, rv.x + rv.w / 2 + 10, rh.y, Math.PI / 2);
    }
    // Pavements (between intersections) and street lights
    const segs = [];
    const cut = (len, crossers, pos) => {
      const cs = crossers.map((c) => [pos(c) - c.w / 2, pos(c) + c.w / 2]).sort((a, b) => a[0] - b[0]);
      const out = []; let s = 0;
      for (const [a, b] of cs) { if (a > s) out.push([s, a]); s = b; }
      if (s < len) out.push([s, len]);
      return out;
    };
    for (const r of ROADS_V) for (const [a, b] of cut(WORLD.h, ROADS_H, (c) => c.y)) [-1, 1].forEach((sd) => segs.push({ v: true, x: r.x + sd * (r.w / 2 + 5), a, b, sd }));
    for (const r of ROADS_H) for (const [a, b] of cut(WORLD.w, ROADS_V, (c) => c.x)) [-1, 1].forEach((sd) => segs.push({ v: false, y: r.y + sd * (r.w / 2 + 5), a, b, sd }));
    const lampPos = [];
    for (const s of segs) {
      const len = s.b - s.a, mid = (s.a + s.b) / 2;
      const m = new T.Mesh(s.v ? BOX(10, 1.2, len) : BOX(len, 1.2, 10), curbMat);
      m.position.set(s.v ? s.x : mid, 0.6, s.v ? mid : s.y); m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); scene.add(m);
      for (let t = s.a + 40; t < s.b - 30; t += 150) lampPos.push(s.v ? { x: s.x, z: t, ang: s.sd > 0 ? Math.PI : 0 } : { x: t, z: s.y, ang: s.sd > 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
    const pole = new T.InstancedMesh(new T.CylinderGeometry(0.7, 1, 44, 6), stdMat('#5d6166', { metalness: 0.5, roughness: 0.5 }), lampPos.length);
    const arm = new T.InstancedMesh(BOX(14, 1, 1), stdMat('#5d6166', { metalness: 0.5, roughness: 0.5 }), lampPos.length);
    lampHeadMat = new T.MeshStandardMaterial({ color: lin('#ddd'), emissive: lin('#ffd38a'), emissiveIntensity: 0 });
    const head = new T.InstancedMesh(BOX(6, 1.4, 3), lampHeadMat, lampPos.length);
    lampPos.forEach((p, i) => {
      tmpQ.setFromEuler(tmpE.set(0, p.ang, 0));
      pole.setMatrixAt(i, tmpM.compose(tmpP.set(p.x, 22, p.z), tmpQ, tmpS));
      const off = new T.Vector3(7, 0, 0).applyQuaternion(tmpQ);
      arm.setMatrixAt(i, tmpM.compose(tmpP.set(p.x + off.x, 43.5, p.z + off.z), tmpQ, tmpS));
      const off2 = new T.Vector3(13, 0, 0).applyQuaternion(tmpQ);
      head.setMatrixAt(i, tmpM.compose(tmpP.set(p.x + off2.x, 42.6, p.z + off2.z), tmpQ, tmpS));
    });
    pole.castShadow = !mobile;
    scene.add(pole, arm, head);
  }

  function buildBuildings() {
    const facades = {};
    roofMat = new T.MeshStandardMaterial({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#6b6c6a'; g.fillRect(0, 0, 64, 64); noise(g, 64, 64, 400, 0.2); }, true), roughness: 0.95 });
    const tankGeo = new T.CylinderGeometry(4, 4, 8, 12), tankMat = stdMat('#1d1e1f', { roughness: 0.6 });
    const canopyMat = stdMat('#efefef', { roughness: 0.6 });
    const doorMat = new T.MeshStandardMaterial({ color: lin('#1c2733'), roughness: 0.2, metalness: 0.4, emissive: lin('#ffcf8a'), emissiveIntensity: 0 });
    const ringMat = new T.MeshBasicMaterial({ color: lin('#ffd400'), transparent: true, opacity: 0.55, depthWrite: false });
    const ringGeo = new T.RingGeometry(9, 12, 28);
    for (const b of BUILDINGS) {
      if (!b.solid) continue;
      const [H, style] = SPEC[b.id] || [40, 'shop'];
      const fx = facades[style] || (facades[style] = facadeTextures(style));
      const tint = new T.Color('#ffffff').lerp(new T.Color(b.color), style === 'glass' ? 0.25 : 0.4).convertSRGBToLinear();
      const mat = new T.MeshStandardMaterial({ color: tint, map: fx.map, emissiveMap: fx.emissive, emissive: new T.Color(1, 1, 1), emissiveIntensity: 0,
        roughness: style === 'glass' ? 0.25 : 0.85, metalness: style === 'glass' ? 0.45 : 0.05 });
      facadeMats.push(mat);
      const geo = BOX(b.w, H, b.h);
      scaleUV(geo, [b.h / TILE, b.h / TILE, 1, 1, b.w / TILE, b.w / TILE], [H / TILE, H / TILE, 1, 1, H / TILE, H / TILE], [0, 1, 4, 5]);
      scaleUV(geo, [1, 1, b.w / 60, b.w / 60, 1, 1], [1, 1, b.h / 60, b.h / 60, 1, 1], [2, 3]);
      const mesh = new T.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
      mesh.position.set(b.x + b.w / 2, H / 2, b.y + b.h / 2);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      scene.add(mesh);
      boxes.push({ x0: b.x, x1: b.x + b.w, z0: b.y, z1: b.y + b.h, h: H });
      // roof details: water tanks are on nearly every Indian rooftop
      if (style !== 'glass' && style !== 'metro' && style !== 'construction') {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) { const t = new T.Mesh(tankGeo, tankMat); t.position.set(b.x + 12 + Math.random() * (b.w - 24), H + 4, b.y + 12 + Math.random() * (b.h - 24)); t.castShadow = true; scene.add(t); }
      } else if (style === 'glass') {
        const cap = new T.Mesh(BOX(b.w * 0.5, 14, b.h * 0.5), stdMat('#7c8790', { metalness: 0.4, roughness: 0.4 }));
        cap.position.set(b.x + b.w / 2, H + 7, b.y + b.h / 2); cap.castShadow = true; scene.add(cap);
      }
      // entrance, canopy, door, sign and door ring
      const fz = b.y + b.h;
      const canopy = new T.Mesh(BOX(Math.min(40, b.w * 0.6), 1.5, 10), canopyMat); canopy.position.set(b.x + b.w / 2, 17, fz + 5); canopy.castShadow = true; scene.add(canopy);
      const dr = new T.Mesh(new T.PlaneGeometry(Math.min(22, b.w * 0.4), 15), doorMat); dr.position.set(b.x + b.w / 2, 7.5, fz + 0.3); scene.add(dr);
      const s = signMesh(b.name, b.color, b.w * 0.92); s.mesh.position.set(b.x + b.w / 2, Math.min(H - s.h / 2 - 1, 17 + 2 + s.h / 2), fz + 0.4); scene.add(s.mesh);
      const ring = new T.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.set(b.x + b.w / 2, 0.5, fz + 14); scene.add(ring);
      const ic = textSprite(ICON[b.type] || '📍', b.color); ic.position.set(b.x + b.w / 2, H + 45, b.y + b.h / 2); ic.scale.set(0.042, 0.042, 1); scene.add(ic); icons.push(ic);
      if (b.id === 'site82') buildCrane(b, H);
    }
    for (const b of BUILDINGS) if (!b.solid) { const ic = textSprite('🌳', b.color); ic.position.set(b.x + b.w / 2, 40, b.y + b.h / 2); ic.scale.set(0.045, 0.045, 1); scene.add(ic); icons.push(ic); }
  }

  function buildCrane(b, H) {
    const y = stdMat('#e5b62b', { roughness: 0.6 });
    const mast = new T.Mesh(BOX(8, H + 120, 8), y); mast.position.set(b.x + b.w - 20, (H + 120) / 2, b.y + 20);
    const jib = new T.Mesh(BOX(220, 6, 6), y); jib.position.set(b.x + b.w - 70, H + 120, b.y + 20);
    const cw = new T.Mesh(BOX(24, 12, 12), stdMat('#555')); cw.position.set(b.x + b.w + 30, H + 112, b.y + 20);
    [mast, jib, cw].forEach((m) => { m.castShadow = true; scene.add(m); });
  }

  let train = null;
  const TRAIN_LINE = [{ x: 1300, z: 350 }, { x: 2830, z: 350 }];
  function buildMetro() {
    const deckMat = stdMat('#b9b6ad', { roughness: 0.9 });
    const legs = [[{ x: 1300, z: 350 }, { x: 2830, z: 350 }], [{ x: 2400, z: 350 }, { x: 2400, z: 1100 }], [{ x: 2400, z: 1100 }, { x: 2840, z: 1100 }]];
    const DY = 60;
    for (const [a, c] of legs) {
      const len = Math.hypot(c.x - a.x, c.z - a.z), horiz = a.z === c.z;
      const deck = new T.Mesh(horiz ? BOX(len + 20, 6, 22) : BOX(22, 6, len + 20), deckMat);
      deck.position.set((a.x + c.x) / 2, DY, (a.z + c.z) / 2); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
      for (let t = 0; t <= len; t += 140) {
        const px = a.x + ((c.x - a.x) * t) / len, pz = a.z + ((c.z - a.z) * t) / len;
        const p = new T.Mesh(BOX(7, DY, 7), deckMat); p.position.set(px, DY / 2, pz); p.castShadow = true; scene.add(p);
      }
    }
    const parts = [];
    for (let i = 0; i < 3; i++) {
      parts.push(part(BOX(44, 14, 16), '#f1f1ee', i * 46, 0, 0), part(BOX(44, 3, 16.4), '#2a9d8f', i * 46, -2, 0), part(BOX(40, 4, 16.6), '#23303a', i * 46, 3, 0));
    }
    train = new T.Mesh(merge(parts), vehMat);
    train.castShadow = true;
    train.userData = { t: 0, dir: 1 };
    scene.add(train);
  }

  let treeTrunks, treeCrowns;
  function buildTrees(trees) {
    const crownGeo = new T.IcosahedronGeometry(1, 2);
    const p = crownGeo.attributes.position;
    const seen = {};
    for (let j = 0; j < p.count; j++) {
      const key = [p.getX(j), p.getY(j), p.getZ(j)].map((v) => v.toFixed(3)).join();
      const s = seen[key] || (seen[key] = 0.82 + Math.random() * 0.32);
      p.setXYZ(j, p.getX(j) * s, p.getY(j) * s * 0.85, p.getZ(j) * s);
    }
    crownGeo.computeVertexNormals();
    treeTrunks = new T.InstancedMesh(new T.CylinderGeometry(0.8, 1.3, 1, 6), stdMat('#5a4632'), trees.length);
    treeCrowns = new T.InstancedMesh(crownGeo, new T.MeshStandardMaterial({ roughness: 0.95 }), trees.length);
    const c = new T.Color();
    trees.forEach((t, i) => {
      const s = t.r * 1.1, th = 8 + t.r * 0.8;
      treeTrunks.setMatrixAt(i, tmpM.compose(tmpP.set(t.x, th / 2, t.y), tmpQ.identity(), new T.Vector3(1 + t.r * 0.05, th, 1 + t.r * 0.05)));
      treeCrowns.setMatrixAt(i, tmpM.compose(tmpP.set(t.x, th + s * 0.7, t.y), tmpQ.setFromEuler(tmpE.set(0, Math.random() * 6, 0)), new T.Vector3(s, s * 1.05, s)));
      treeCrowns.setColorAt(i, c.set(t.c).offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.08).convertSRGBToLinear());
    });
    treeTrunks.castShadow = treeCrowns.castShadow = !mobile;
    scene.add(treeTrunks, treeCrowns);
  }

  function buildMisc(puddles) {
    puddleGroup = new T.Group();
    const pm = new T.MeshStandardMaterial({ color: lin('#3c4c5c'), roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.85 });
    for (const p of puddles) { const m = new T.Mesh(new T.CircleGeometry(p.r, 20), pm); m.rotation.x = -Math.PI / 2; m.scale.y = 0.6; m.position.set(p.x, 0.45, p.y); puddleGroup.add(m); }
    scene.add(puddleGroup);
    nakaGroup = new T.Group();
    const cone = new T.ConeGeometry(2.5, 8, 10), coneMat = stdMat('#ff7b00');
    for (const n of NAKAS) {
      for (let k = -1; k <= 1; k++) { const c = new T.Mesh(cone, coneMat); c.position.set(n.x + k * 16, 4, n.y + 8); c.castShadow = true; nakaGroup.add(c); }
      const cop = makePerson({ skin: '#c98f62', hair: '#1b1410', hairStyle: 'cap', shirt: '#cdbb8e', pants: '#8a7550' });
      cop.position.set(n.x + 32, 0.6, n.y); cop.rotation.y = Math.PI; nakaGroup.add(cop);
      const sign = signMesh('Traffic Police Naka', '#1f3b70', 40); sign.mesh.position.set(n.x + 32, 30, n.y); nakaGroup.add(sign.mesh);
      nakaGroup.userData[n.x + ',' + n.y] = sign.mesh;
    }
    scene.add(nakaGroup);
    waypointBeam = new T.Mesh(new T.CylinderGeometry(5, 5, 500, 16, 1, true), new T.MeshBasicMaterial({ color: lin('#ff3d71'), transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
    waypointRing = new T.Mesh(new T.RingGeometry(12, 17, 32), new T.MeshBasicMaterial({ color: lin('#ff3d71'), transparent: true, opacity: 0.85, depthWrite: false }));
    waypointRing.rotation.x = -Math.PI / 2;
    scene.add(waypointBeam, waypointRing);
    rideRing.mesh = new T.Mesh(new T.RingGeometry(26, 31, 32), new T.MeshBasicMaterial({ color: lin('#ffd400'), transparent: true, opacity: 0.9, depthWrite: false }));
    rideRing.mesh.rotation.x = -Math.PI / 2;
    scene.add(rideRing.mesh);
  }

  function buildSky() {
    sky = new T.Mesh(new T.SphereGeometry(4500, 24, 12), new T.ShaderMaterial({
      uniforms: { top: { value: new T.Color() }, bottom: { value: new T.Color() } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vW; void main(){ float h = normalize(vW - cameraPosition).y; float t = pow(clamp(h, 0.0, 1.0), 0.55); gl_FragColor = vec4(mix(bottom, top, t), 1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}',
      side: T.BackSide, depthWrite: false,
    }));
    sky.renderOrder = -1;
    scene.add(sky);
    const sp = [];
    for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3 + 0.08; sp.push(Math.cos(a) * Math.cos(e) * 4000, Math.sin(e) * 4000, Math.sin(a) * Math.cos(e) * 4000); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(stars);
    const N = mobile ? 700 : 1500;
    rainPos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 700, y = Math.random() * 400, z = (Math.random() - 0.5) * 700; rainPos.set([x, y, z, x - 1, y - 9, z], i * 6); }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rainPos, 3));
    rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: lin('#b8c8e0'), transparent: true, opacity: 0.45 }));
    rain.frustumCulled = false;
    scene.add(rain);
  }

  // ---------- init ----------
  function init(canvas, world) {
    if (ready) return true;
    renderer = new T.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.fog = new T.Fog(0xcfdcea, 500, 3000);
    camera = new T.PerspectiveCamera(55, 1, 2, 9000);
    hemi = new T.HemisphereLight(0xdfe9ff, 0x6b6450, 0.6);
    sun = new T.DirectionalLight(0xffffff, 1.6);
    sun.castShadow = !mobile;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -650, right: 650, top: 650, bottom: -650, near: 10, far: 3000 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.6;
    scene.add(hemi, sun, sun.target);
    vehMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 });
    lampMat = new T.MeshBasicMaterial({ color: lin('#fff6d6'), toneMapped: false });
    tailMat = new T.MeshBasicMaterial({ color: lin('#ff2a2a'), toneMapped: false });
    buildSky();
    buildGround();
    buildRoads();
    buildBuildings();
    buildMetro();
    buildTrees(world.trees);
    buildMisc(world.puddles);
    attachControls(canvas);
    ready = true;
    return true;
  }

  // ---------- dynamic objects ----------
  let npcMeshes = [], carMeshes = [], player = null, playerLook = null, playerVeh = {}, rideMesh = null, rideRef = null, questSprites = [];
  function setNPCs(npcs) {
    npcMeshes.forEach((m) => scene.remove(m));
    questSprites.forEach((m) => scene.remove(m));
    npcMeshes = npcs.map((n) => { const m = makePerson(n.look); scene.add(m); return m; });
    questSprites = npcs.map(() => { const s = textSprite('❗', '#ff8a3d', 48); s.scale.set(0.035, 0.035, 1); scene.add(s); return s; });
  }
  function setCars(cars) {
    carMeshes.forEach((m) => scene.remove(m));
    carMeshes = cars.map((c) => { const m = makeVehicle(c.two ? Object.assign({ rider: true }, c) : c); scene.add(m); return m; });
  }
  function ensurePlayer(look) {
    if (player && playerLook === look) return;
    if (player) scene.remove(player);
    player = makePerson(look); playerLook = look; scene.add(player);
  }
  function playerVehicle(key, two) {
    if (!playerVeh[key]) {
      const m = two ? makeVehicle({ two: true, c: key === 'ebike' ? '#f2c14e' : key === 'bike' ? '#20242a' : '#c0392b' }) : makeVehicle({ c: '#e8e8e8', l: 34, w: 18 });
      playerVeh[key] = m; scene.add(m);
    }
    return playerVeh[key];
  }

  // Sheru the dog: one merged mesh that trots behind the player.
  let dog = null;
  const dogS = { x: 0, z: 0, ang: 0, phase: 0, init: false };
  function makeDog() {
    const fur = '#a0703c', dark = '#5b3a1e', parts = [
      part(BOX(12, 6, 5.5), fur, 0, 8, 0), part(BOX(6, 5.5, 5), fur, 7.5, 11.5, 0), part(BOX(3.5, 2.6, 3.2), '#c99a66', 11.5, 10.5, 0),
      part(BOX(1, 1, 1), '#111', 13.3, 11, 0), part(BOX(2, 3, 1.2), dark, 6.5, 15, 1.8), part(BOX(2, 3, 1.2), dark, 6.5, 15, -1.8),
      part(BOX(5, 1.6, 1.6), fur, -7.5, 11, 0, 0, 0, 0.7),
      part(BOX(2, 6, 2), fur, 4.5, 3, 1.8), part(BOX(2, 6, 2), fur, 4.5, 3, -1.8), part(BOX(2, 6, 2), fur, -4.5, 3, 1.8), part(BOX(2, 6, 2), fur, -4.5, 3, -1.8),
      part(BOX(1.2, 1.4, 5.8), '#d94a2b', 4.2, 10.5, 0),
    ];
    const m = new T.Mesh(merge(parts), vehMat);
    m.castShadow = !mobile;
    m.scale.setScalar(0.85);
    return m;
  }
  function updateDog(f, dt) {
    if (!f.pet || f.onboard) { if (dog) dog.visible = false; return; }
    if (!dog) { dog = makeDog(); scene.add(dog); }
    dog.visible = true;
    const P = f.P, a = P.ang || 0;
    const tx = P.x - Math.cos(a) * 22 - Math.sin(a) * 10, tz = P.y - Math.sin(a) * 22 + Math.cos(a) * 10;
    if (!dogS.init || Math.hypot(tx - dogS.x, tz - dogS.z) > 300) { dogS.x = tx; dogS.z = tz; dogS.init = true; }
    const dx = tx - dogS.x, dz = tz - dogS.z, d = Math.hypot(dx, dz);
    if (d > 3) {
      const sp = Math.min(d, Math.max(90, d * 3) * dt);
      dogS.x += (dx / d) * sp; dogS.z += (dz / d) * sp; dogS.ang = Math.atan2(dz, dx); dogS.phase += dt * 14;
    }
    dog.position.set(dogS.x, 0.6 + (d > 3 ? Math.abs(Math.sin(dogS.phase)) * 1.6 : 0), dogS.z);
    dog.rotation.y = -dogS.ang;
  }

  // ---------- per-frame ----------
  const fogDay = new T.Color(), skyTop = new T.Color(), skyBot = new T.Color(), C = (h) => new T.Color(h);
  function lerpHex(a, b, t) { return C(a).lerp(C(b), clamp(t, 0, 1)); }
  function lighting(f) {
    const h = f.hour;
    const dayT = (h - 6) / 12, elev = Math.sin(dayT * Math.PI);
    const day = clamp(elev * 3, 0, 1), warm = elev > 0 ? 1 - clamp(elev * 3.5, 0, 1) : 1;
    const haze = f.rain ? 0.75 : clamp((f.aqi - 150) / 250, 0, 1);
    let top = lerpHex('#0a1024', '#4f86cf', day), bot = lerpHex('#1a2340', '#cfdff0', day);
    if (elev > -0.15 && elev < 0.35) { const s = 1 - Math.abs(elev - 0.1) / 0.25; bot = bot.lerp(C('#f0a060'), clamp(s, 0, 1) * 0.7); top = top.lerp(C('#5a5f8f'), clamp(s, 0, 1) * 0.3); }
    if (haze > 0) { const hz = f.rain ? '#8c96a3' : '#c4b597'; bot.lerp(C(hz), haze * 0.7 * Math.max(day, 0.2)); top.lerp(C(f.rain ? '#6f7883' : '#b3b4a8'), (f.rain ? 0.95 : haze * 0.55) * day); }
    skyTop.copy(top).convertSRGBToLinear(); skyBot.copy(bot).convertSRGBToLinear();
    sky.material.uniforms.top.value.copy(skyTop); sky.material.uniforms.bottom.value.copy(skyBot);
    fogDay.copy(skyBot); scene.fog.color.copy(fogDay);
    scene.fog.near = 300 - haze * 200; scene.fog.far = 3200 - haze * 1900;
    const az = Math.PI * clamp(dayT, -0.1, 1.1);
    const dir = elev > 0 ? new T.Vector3(Math.cos(az), Math.max(elev, 0.08) * 1.4, 0.45) : new T.Vector3(-0.3, 1, 0.5);
    dir.normalize();
    sun.position.set(f.focus.x + dir.x * 1200, dir.y * 1200, f.focus.y + dir.z * 1200);
    sun.target.position.set(f.focus.x, 0, f.focus.y);
    sun.color.copy(elev > 0 ? lerpHex('#fff4e2', '#ffa25a', warm) : C('#8ea6ff')).convertSRGBToLinear();
    sun.intensity = elev > 0 ? (0.25 + 1.55 * clamp(elev * 2.2, 0, 1)) * (f.rain ? 0.35 : 1 - haze * 0.45) : 0.22;
    hemi.intensity = 0.18 + 0.5 * day;
    hemi.color.copy(lerpHex('#3a4a7a', '#dfe9ff', day)).convertSRGBToLinear();
    hemi.groundColor.copy(lerpHex('#20201c', '#6b6450', day)).convertSRGBToLinear();
    const night = f.dark / 0.55;
    facadeMats.forEach((m) => { m.emissiveIntensity = night * 1.1; });
    lampHeadMat.emissiveIntensity = night * 3;
    stars.material.opacity = clamp(night - haze * 0.6, 0, 1) * 0.9;
    rain.visible = f.rain; puddleGroup.visible = f.rain;
  }

  function occlusion(fx, fz, pitch, d) {
    const cp = Math.cos(pitch), spc = Math.sin(pitch);
    const ox = cam.tx, oy = cam.ty, oz = cam.tz, dx = -fx * cp * d, dy = spc * d, dz = -fz * cp * d;
    let tmin = 1;
    for (const b of boxes) {
      let t0 = 0, t1 = 1, ok = true;
      for (const [o, dd, lo, hi] of [[ox, dx, b.x0, b.x1], [oy, dy, 0, b.h], [oz, dz, b.z0, b.z1]]) {
        if (Math.abs(dd) < 1e-6) { if (o < lo || o > hi) { ok = false; break; } continue; }
        let a = (lo - o) / dd, c = (hi - o) / dd;
        if (a > c) { const t = a; a = c; c = t; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c);
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < tmin) tmin = t0;
    }
    return tmin;
  }
  function placeCamera(f, dt) {
    if (rot.left) cam.yaw -= dt * 1.8;
    if (rot.right) cam.yaw += dt * 1.8;
    if (f.onboard && f.followAng != null) {
      let d = f.followAng - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * 1.2);
    }
    const jump = Math.hypot(f.focus.x - cam.tx, f.focus.y - cam.tz) > 250; // metro, hospital, ride drop-off
    const k = cam.init && !jump ? 1 - Math.exp(-dt * 10) : 1;
    cam.init = true;
    cam.tx += (f.focus.x - cam.tx) * k; cam.tz += (f.focus.y - cam.tz) * k; cam.ty = 14;
    const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw);
    const base = cam.dist * (f.onboard ? 1.25 : 1);
    // First try lifting the camera over low buildings; only pull it in if that fails.
    let pitch = cam.pitch, d = base, tmin = 1;
    for (const p of [cam.pitch, cam.pitch + 0.25, cam.pitch + 0.5, 1.2]) {
      tmin = occlusion(fx, fz, Math.min(p, 1.3), base);
      pitch = Math.min(p, 1.3);
      if (tmin >= 1) break;
    }
    if (tmin < 1) { pitch = cam.pitch; tmin = occlusion(fx, fz, pitch, base); d = base * Math.max(0.12, tmin * 0.9); }
    cam.curPitch = cam.curPitch == null ? pitch : cam.curPitch + (pitch - cam.curPitch) * Math.min(1, dt * 6);
    const cp = Math.cos(cam.curPitch), spc = Math.sin(cam.curPitch);
    camera.position.set(cam.tx - fx * cp * d, cam.ty + spc * d, cam.tz - fz * cp * d);
    camera.lookAt(cam.tx, cam.ty + 4, cam.tz);
  }

  let lastT = performance.now();
  function render(f) {
    if (!ready) return;
    const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (carMeshes.length !== f.cars.length) setCars(f.cars);
    lighting(f);
    // traffic
    f.cars.forEach((c, i) => {
      const p = f.carXY(c), m = carMeshes[i];
      m.position.set(p.x, 0.5, p.y);
      m.rotation.y = c.t === 'v' ? (c.lane > 0 ? -Math.PI / 2 : Math.PI / 2) : (c.lane > 0 ? 0 : Math.PI);
    });
    // people
    f.npcs.forEach((n, i) => {
      const m = npcMeshes[i];
      if (!m) return;
      m.position.set(n.x, 0.6, n.y);
      if (n.ang != null) m.rotation.y = -n.ang;
      animatePerson(m, n.phase, n.wait > 0 ? 0 : 1);
      const q = questSprites[i];
      q.visible = !!f.quests[n.name];
      q.position.set(n.x, 28, n.y);
    });
    // player and vehicles
    const P = f.P;
    ensurePlayer(P.look);
    Object.keys(playerVeh).forEach((k) => { playerVeh[k].visible = false; });
    player.visible = !f.onboard;
    if (!f.onboard) {
      player.position.set(P.x, 0.6, P.y);
      player.rotation.y = -P.ang;
      if (P.riding) {
        const v = playerVehicle(P.riding, f.vehTwo);
        v.visible = true; v.position.set(P.x, 0.5, P.y); v.rotation.y = -P.ang;
        if (f.vehTwo) { seatPerson(player); player.position.y = 3; player.position.x -= Math.cos(P.ang) * 2; player.position.z -= Math.sin(P.ang) * 2; } else player.visible = false;
      } else animatePerson(player, P.phase || 0, P.moving ? 1 : 0);
    }
    // ride-hailing car
    if (f.ride !== rideRef) {
      if (rideMesh) scene.remove(rideMesh);
      rideMesh = null; rideRef = f.ride;
    }
    if (f.ride && f.ride.car) {
      if (!rideMesh) { const R = f.rideType; rideMesh = makeVehicle({ c: R.color, l: R.len, w: R.wid, two: f.ride.type === 'bike', auto: f.ride.type === 'auto', rider: f.ride.type === 'bike', riderShirt: '#f4a300', helmet: '#f4a300' }); scene.add(rideMesh); }
      const c = f.ride.car, a = c.ang || 0;
      rideMesh.position.set(c.x + Math.sin(a) * 14, 0.5, c.y - Math.cos(a) * 14);
      rideMesh.rotation.y = -a;
      rideRing.mesh.visible = f.ride.status !== 'onboard';
      rideRing.mesh.position.set(rideMesh.position.x, 0.6, rideMesh.position.z);
      rideRing.mesh.scale.setScalar(1 + Math.sin(now / 250) * 0.06);
    } else rideRing.mesh.visible = false;
    // waypoint
    const wp = f.waypoint;
    waypointBeam.visible = waypointRing.visible = !!wp;
    if (wp) { waypointBeam.position.set(wp.x, 250, wp.y); waypointRing.position.set(wp.x, 0.6, wp.y); waypointRing.scale.setScalar(1 + Math.sin(now / 300) * 0.12); }
    // metro train shuttles along the elevated line
    if (train) {
      const u = train.userData, a = TRAIN_LINE[0], b = TRAIN_LINE[1], len = b.x - a.x - 140;
      u.t += u.dir * dt * 160;
      if (u.t > len) { u.t = len; u.dir = -1; } else if (u.t < 0) { u.t = 0; u.dir = 1; }
      train.position.set(a.x + u.t, 70, a.z);
    }
    // icons fade with distance
    icons.forEach((s) => { const d = Math.hypot(s.position.x - f.focus.x, s.position.z - f.focus.y); s.visible = d < 900; });
    // rain follows the camera
    if (f.rain) {
      for (let i = 0; i < rainPos.length; i += 6) {
        rainPos[i + 1] -= dt * 520; rainPos[i + 4] -= dt * 520;
        if (rainPos[i + 4] < 0) { rainPos[i + 1] += 400; rainPos[i + 4] += 400; }
      }
      rain.geometry.attributes.position.needsUpdate = true;
      rain.position.set(cam.tx, 0, cam.tz);
    }
    updateDog(f, dt);
    placeCamera(f, dt);
    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  function resize(w, h) {
    if (!ready) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 70 : 55;
    camera.updateProjectionMatrix();
  }

  return {
    supported, init, setNPCs, render, resize,
    get ready() { return ready; },
    get yaw() { return cam.yaw; },
    debug() { return { cam: camera && camera.position.toArray().map(Math.round), target: [cam.tx, cam.ty, cam.tz].map(Math.round), yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist }; },
  };
})();
