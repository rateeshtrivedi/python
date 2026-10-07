'use strict';
(() => {
  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const inr = (n) => (n < 0 ? '-₹' : '₹') + Math.abs(Math.round(n)).toLocaleString('en-IN');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return (h >>> 0).toString(16); }

  const BLD = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
  const door = (b) => (b.solid ? { x: b.x + b.w / 2, y: b.y + b.h + 14 } : { x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const TYPE_ICON = { job: '💼', food: '🍽️', home: '🏠', social: '🎉', park: '🌳', metro: '🚇', shop: '🛍️', mall: '🛍️', bank: '🏦', hospital: '🏥', gym: '🏋️', skill: '🎓', dealer: '🛵', landmark: '📍' };

  // ---------- time ----------
  const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayOf = (t) => Math.floor(t / 1440) + 1;
  const hourF = (t) => (t % 1440) / 60;
  const weekday = (d) => WEEK[(d - 1) % 7];
  const fmtHour = (h) => { h = ((h % 24) + 24) % 24; return (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); };
  function clock(t) {
    const m = Math.floor(t % 1440), h = Math.floor(m / 60), mm = m % 60;
    return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
  const isPeak = () => { const h = hourF(S.time); return weekday(dayOf(S.time)) !== 'Sun' && ((h >= 8 && h < 11) || (h >= 17 && h < 21)); };
  const MIN_PER_SEC = 1440 / 900; // one in-game day lasts 15 real minutes

  // ---------- storage / profiles ----------
  const STORE_KEY = 'ggl.v1';
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { profiles: {} }; } catch (e) { return { profiles: {} }; } }
  function saveStore() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage full or blocked */ } }
  let store = loadStore();
  let user = null;
  let S = null; // game state of the signed-in player

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }

  function renderProfiles() {
    const list = $('#profile-list');
    list.innerHTML = '';
    const ps = Object.entries(store.profiles).sort((a, b) => (b[1].last || 0) - (a[1].last || 0)).slice(0, 4);
    if (ps.length) list.insertAdjacentHTML('beforeend', '<div class="sect">On this device</div>');
    for (const [, p] of ps) {
      const d = document.createElement('div');
      d.className = 'prof';
      const info = p.save ? `Day ${dayOf(p.save.time)} · ${inr(p.save.player.money)}` : 'New';
      d.innerHTML = `<b>${esc(p.display)}</b><small>${info}${p.pin ? ' · 🔒' : ''}</small>`;
      const btn = document.createElement('button');
      btn.textContent = 'Continue';
      btn.onclick = () => {
        $('#login-name').value = p.display;
        if (p.pin) { $('#login-pin').focus(); $('#login-err').textContent = 'Enter your PIN to continue.'; } else signIn(p.display, '');
      };
      d.appendChild(btn);
      list.appendChild(d);
    }
  }

  function signIn(name, pin) {
    name = name.trim();
    const err = $('#login-err');
    if (!/^[\w .-]{2,16}$/.test(name)) { err.textContent = 'Use 2–16 letters, numbers, spaces, . _ or -'; return; }
    if (pin && !/^\d{4}$/.test(pin)) { err.textContent = 'PIN must be exactly 4 digits.'; return; }
    const key = name.toLowerCase();
    let p = store.profiles[key];
    if (p) {
      if (p.pin && p.pin !== hashStr(key + ':' + pin)) { err.textContent = 'Wrong PIN for this username.'; return; }
    } else {
      p = store.profiles[key] = { display: name, pin: pin ? hashStr(key + ':' + pin) : null, created: Date.now(), save: null };
    }
    p.last = Date.now();
    saveStore();
    user = key;
    err.textContent = '';
    $('#login-pin').value = '';
    if (p.save) startGame(p.save, false); else openCreator(name);
  }

  $('#btn-login').onclick = () => signIn($('#login-name').value, $('#login-pin').value);
  $('#login-pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-login').click(); });
  $('#login-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-login').click(); });
  $('#btn-guest').onclick = () => signIn('Guest ' + randi(1000, 9999), '');

  // ---------- character creator ----------
  const cc = { name: '', look: { skin: LOOKS.skin[1], hair: LOOKS.hair[0], hairStyle: 'short', shirt: LOOKS.shirt[1], pants: LOOKS.pants[0] }, bg: 'fresher' };

  function openCreator(name) {
    cc.name = name.startsWith('Guest ') ? '' : name;
    $('#cc-name').value = cc.name;
    const sw = (el, key, vals) => {
      el.innerHTML = '';
      vals.forEach((v) => {
        const b = document.createElement('button');
        b.style.background = v;
        b.className = cc.look[key] === v ? 'on' : '';
        b.setAttribute('aria-label', key + ' ' + v);
        b.onclick = () => { cc.look[key] = v; sw(el, key, vals); drawPreview(); };
        el.appendChild(b);
      });
    };
    sw($('#cc-skin'), 'skin', LOOKS.skin);
    sw($('#cc-hair'), 'hair', LOOKS.hair);
    sw($('#cc-shirt'), 'shirt', LOOKS.shirt);
    sw($('#cc-pants'), 'pants', LOOKS.pants);
    const st = $('#cc-style');
    const drawStyles = () => {
      st.innerHTML = '';
      LOOKS.hairStyle.forEach((v) => {
        const b = document.createElement('button');
        b.textContent = v;
        b.className = cc.look.hairStyle === v ? 'on' : '';
        b.onclick = () => { cc.look.hairStyle = v; drawStyles(); drawPreview(); };
        st.appendChild(b);
      });
    };
    drawStyles();
    const bgl = $('#cc-bg');
    const drawBg = () => {
      bgl.innerHTML = '';
      BACKSTORIES.forEach((b) => {
        const el = document.createElement('button');
        el.className = cc.bg === b.id ? 'on' : '';
        el.innerHTML = `<b>${b.title}</b><small>${b.desc}</small>`;
        el.onclick = () => { cc.bg = b.id; drawBg(); };
        bgl.appendChild(el);
      });
    };
    drawBg();
    drawPreview();
    showScreen('screen-create');
  }

  function drawPreview() {
    const c = $('#preview').getContext('2d');
    c.clearRect(0, 0, 200, 240);
    drawPerson(c, 100, 150, cc.look, 0, 5);
  }

  $('#btn-start').onclick = () => {
    const nm = $('#cc-name').value.trim() || store.profiles[user].display;
    cc.name = nm.slice(0, 16);
    startGame(newState(), true);
  };

  function newState() {
    const bg = BACKSTORIES.find((b) => b.id === cc.bg);
    const start = door(BLD.busadda);
    return {
      v: 1, time: 8 * 60, lastDay: 1,
      player: {
        name: cc.name, look: { ...cc.look }, x: start.x, y: start.y + 10, ang: Math.PI / 2,
        money: bg.money, savings: 0, health: 100, hunger: 75, energy: 85, social: 60,
        skills: Object.assign({ coding: 0, comm: 0, fitness: 0.5 }, bg.skills),
        items: (bg.items || []).slice(), vehicles: bg.vehicle ? [bg.vehicle] : [], riding: null, rental: null, fuelAcc: 0,
      },
      home: null, job: null, zipzap: false, weather: 'clear', aqi: 180,
      friends: {}, txns: [], goals: {}, gig: null, errand: null, orders: [], waypoint: null,
      quests: {}, naka: {}, stats: { rides: 0, deliveries: 0, shifts: 0, courses: 0, km: 0 },
    };
  }

  // ---------- world helpers ----------
  function roadAt(x, y) {
    for (const r of ROADS_V) if (Math.abs(x - r.x) < r.w / 2) return r;
    for (const r of ROADS_H) if (Math.abs(y - r.y) < r.w / 2) return r;
    return null;
  }
  function solidAt(x, y, rad) {
    for (const b of BUILDINGS) {
      if (b.solid && x + rad > b.x && x - rad < b.x + b.w && y + rad > b.y && y - rad < b.y + b.h) return b;
    }
    for (const b of FILLERS) {
      if (x + rad > b.x && x - rad < b.x + b.w && y + rad > b.y && y - rad < b.y + b.h) return b;
    }
    return null;
  }
  function districtAt(x, y) {
    for (let i = DISTRICTS.length - 1; i >= 0; i--) {
      const d = DISTRICTS[i];
      if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d;
    }
    return DISTRICTS[0];
  }
  function placeName(x, y) {
    const r = roadAt(x, y);
    return r ? r.name : districtAt(x, y).name;
  }
  function freePoint(rect, rng = Math.random) {
    for (let i = 0; i < 30; i++) {
      const x = rect.x + 20 + rng() * (rect.w - 40), y = rect.y + 20 + rng() * (rect.h - 40);
      if (!solidAt(x, y, 14) && !roadAt(x, y)) return { x, y };
    }
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h - 10 };
  }

  // Road network: every road spans the whole map, so intersections form a grid.
  function snapToRoad(x, y) {
    let best = null, bd = 1e9;
    ROADS_V.forEach((r, i) => { const d = Math.abs(x - r.x); if (d < bd) { bd = d; best = { x: r.x, y: clamp(y, 5, WORLD.h - 5), t: 'v', i }; } });
    ROADS_H.forEach((r, i) => { const d = Math.abs(y - r.y); if (d < bd) { bd = d; best = { x: clamp(x, 5, WORLD.w - 5), y: r.y, t: 'h', i }; } });
    return best;
  }
  function roadPath(a, b) {
    const nodes = [];
    ROADS_V.forEach((rv, i) => ROADS_H.forEach((rh, j) => nodes.push({ x: rv.x, y: rh.y, v: i, h: j })));
    const mk = (p) => ({ x: p.x, y: p.y, v: p.t === 'v' ? p.i : -1, h: p.t === 'h' ? p.i : -1 });
    nodes.push(mk(a), mk(b));
    const si = nodes.length - 2, ei = nodes.length - 1;
    const adj = nodes.map(() => []);
    const link = (key, axis, count) => {
      for (let i = 0; i < count; i++) {
        const ids = nodes.map((_, k) => k).filter((k) => nodes[k][key] === i).sort((p, q) => nodes[p][axis] - nodes[q][axis]);
        for (let k = 1; k < ids.length; k++) {
          const d = Math.abs(nodes[ids[k]][axis] - nodes[ids[k - 1]][axis]);
          adj[ids[k]].push([ids[k - 1], d]); adj[ids[k - 1]].push([ids[k], d]);
        }
      }
    };
    link('v', 'y', ROADS_V.length);
    link('h', 'x', ROADS_H.length);
    const D = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false);
    D[si] = 0;
    for (;;) {
      let u = -1;
      for (let k = 0; k < nodes.length; k++) if (!done[k] && (u < 0 || D[k] < D[u])) u = k;
      if (u < 0 || D[u] === Infinity || u === ei) break;
      done[u] = true;
      for (const [v, w] of adj[u]) if (D[u] + w < D[v]) { D[v] = D[u] + w; prev[v] = u; }
    }
    const path = [];
    for (let k = ei; k >= 0; k = prev[k]) { path.unshift({ x: nodes[k].x, y: nodes[k].y }); if (k === si) break; }
    if (path.length < 1 || path[0].x !== nodes[si].x || path[0].y !== nodes[si].y) return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    return path;
  }
  const pathLen = (p) => p.reduce((s, q, i) => (i ? s + dist(q.x, q.y, p[i - 1].x, p[i - 1].y) : 0), 0);
  function moveAlong(c, d) {
    while (d > 0 && c.seg < c.path.length - 1) {
      const a = c.path[c.seg + 1];
      const dx = a.x - c.x, dy = a.y - c.y, L = Math.hypot(dx, dy);
      if (L > 0.01) c.ang = Math.atan2(dy, dx);
      if (L <= d) { c.x = a.x; c.y = a.y; c.seg++; d -= L; } else { c.x += (dx / L) * d; c.y += (dy / L) * d; d = 0; }
    }
    return c.seg >= c.path.length - 1;
  }

  // ---------- world setup ----------
  let trees = [], puddles = [], cars = [], npcs = [], thumb = null, worldReady = false;
  const TH = 0.25;

  function setupWorld() {
    if (worldReady) return;
    worldReady = true;
    const rng = mulberry32(2026);
    for (const d of DISTRICTS) {
      const n = d.farm ? 60 : d.green ? 140 : 16;
      for (let i = 0; i < n; i++) {
        const p = freePoint(d, rng);
        if (!roadAt(p.x, p.y)) trees.push({ x: p.x, y: p.y, r: 8 + rng() * 9, c: rng() < 0.5 ? '#4f8a3c' : '#5c9a46' });
      }
    }
    for (const b of BUILDINGS) {
      if (b.solid) continue;
      for (let i = 0; i < b.w * b.h / 9000; i++) {
        const x = b.x + 15 + rng() * (b.w - 30), y = b.y + 15 + rng() * (b.h - 30);
        if (!roadAt(x, y)) trees.push({ x, y, r: 9 + rng() * 10, c: rng() < 0.5 ? '#3f7d34' : '#4f8a3c' });
      }
    }
    for (let i = 0; i < 40; i++) {
      if (rng() < 0.5) { const r = ROADS_V[Math.floor(rng() * ROADS_V.length)]; puddles.push({ x: r.x + (rng() - 0.5) * r.w * 0.6, y: rng() * WORLD.h, r: 18 + rng() * 22 }); }
      else { const r = ROADS_H[Math.floor(rng() * ROADS_H.length)]; puddles.push({ x: rng() * WORLD.w, y: r.y + (rng() - 0.5) * r.w * 0.6, r: 18 + rng() * 22 }); }
    }
    const kinds = [
      { c: '#d64545', l: 30, w: 16 }, { c: '#f0f0f0', l: 30, w: 16 }, { c: '#3a3f4a', l: 32, w: 17 }, { c: '#4f74b3', l: 30, w: 16 },
      { c: '#c9c9c9', l: 34, w: 18 }, { c: '#2d9c3c', l: 22, w: 15, auto: true }, { c: '#e67e22', l: 58, w: 20, bus: true }, { c: '#111', l: 16, w: 7, two: true },
    ];
    const addCars = (list, t, len) => list.forEach((r) => [-1, 1].forEach((lane) => {
      const n = Math.round(len / (r.hw ? 300 : 520));
      for (let k = 0; k < n; k++) cars.push({ t, r, lane, pos: rng() * len, spd: (90 + rng() * 90) * (r.hw ? 1.4 : 1), ...kinds[Math.floor(rng() * kinds.length)] });
    }));
    addCars(ROADS_V, 'v', WORLD.h);
    addCars(ROADS_H, 'h', WORLD.w);
    buildThumb();
  }

  function spawnNPCs() {
    npcs = NPC_NAMES.map(([name, occ], i) => {
      const d = DISTRICTS[1 + (i * 7) % (DISTRICTS.length - 1)];
      const p = freePoint(d);
      return {
        name, occ, home: d, x: p.x, y: p.y, tx: p.x, ty: p.y, wait: rand(0, 3), phase: 0, spd: rand(35, 60),
        look: { skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), hairStyle: pick(LOOKS.hairStyle), shirt: pick(LOOKS.shirt), pants: pick(LOOKS.pants) },
      };
    });
  }

  function buildThumb() {
    thumb = document.createElement('canvas');
    thumb.width = WORLD.w * TH; thumb.height = WORLD.h * TH;
    const c = thumb.getContext('2d');
    c.scale(TH, TH);
    c.fillStyle = '#c9c6b6'; c.fillRect(0, 0, WORLD.w, WORLD.h);
    for (const d of DISTRICTS) { c.fillStyle = d.color; c.fillRect(d.x, d.y, d.w, d.h); }
    for (const b of BUILDINGS) if (!b.solid) { c.fillStyle = b.color; c.fillRect(b.x, b.y, b.w, b.h); }
    c.fillStyle = '#55585f';
    for (const r of ROADS_V) c.fillRect(r.x - r.w / 2, 0, r.w, WORLD.h);
    for (const r of ROADS_H) c.fillRect(0, r.y - r.w / 2, WORLD.w, r.w);
    for (const b of FILLERS) { c.fillStyle = '#a9a39a'; c.fillRect(b.x, b.y, b.w, b.h); }
    for (const b of BUILDINGS) if (b.solid) { c.fillStyle = b.color; c.fillRect(b.x, b.y, b.w, b.h); }
  }

  // ---------- game start ----------
  let running = false;
  let ride = null;
  let busy = false;
  let currentAct = null;

  function migrate(s) {
    s.player.items = s.player.items || [];
    s.player.vehicles = s.player.vehicles || [];
    s.stats = Object.assign({ rides: 0, deliveries: 0, shifts: 0, courses: 0, km: 0 }, s.stats);
    s.orders = s.orders || []; s.quests = s.quests || {}; s.naka = s.naka || {}; s.goals = s.goals || {}; s.hints = s.hints || {};
    ensureProg(s); ensureMore(s);
    return s;
  }

  let use3D = false;
  const can3D = () => !!(window.GGL3D && window.GGL3D.supported());
  function setGraphics(mode) {
    use3D = mode === '3d' && can3D();
    if (use3D && !window.GGL3D.ready) {
      try { window.GGL3D.init($('#game3d'), { trees, puddles, quality: store.gfxq }); } catch (e) { console.warn('3D init failed, using 2D', e); use3D = false; }
    }
    if (use3D) window.GGL3D.setNPCs(npcs);
    $('#game3d').classList.toggle('hidden', !use3D);
    $('#game').classList.toggle('hidden', use3D);
    resize();
    renderKeyLegend();
  }

  function startGame(state, fresh) {
    S = migrate(state);
    setupWorld();
    spawnNPCs();
    setGraphics(store.gfx || '3d');
    ride = null;
    if (fresh) { genQuests(); save(); }
    showScreen('screen-game');
    resize();
    running = true;
    playStart = 0;
    renderKeyLegend();
    updateHUD();
    const newDayReal = checkDaily();
    if (!fresh && S.lastSeen) {
      const hrs = Math.min(8, (Date.now() - S.lastSeen) / 3.6e6);
      let sum = 0;
      if (hrs > 0.05) for (const b of BUSINESSES) { const o = S.biz[b.id]; if (!o) continue; const cap = bizIncome(b, o.lvl) * BIZ_CAP_H, add = Math.min(cap - o.till, bizIncome(b, o.lvl) * hrs * 3); if (add > 0) { o.till += add; sum += add; } }
      if (sum >= 1) setTimeout(() => toast(`🏪 While you were away, your businesses made ${inr(sum)}. Collect it in Dhandha!`, 'good', 8000), 1500);
    }
    if (fresh) welcome();
    else {
      toast(`Welcome back, ${esc(S.player.name)}! ${weekday(dayOf(S.time))} ${clock(S.time)}.`, 'good');
      if (newDayReal || rewardsPending()) setTimeout(() => { if (!isUI()) openRewards(); }, 900);
    }
  }

  function welcome() {
    const P = S.player;
    showModal(`Swagat hai, ${P.name}! 🙏`, 'You just stepped off the bus at Old Gurugram Bus Adda.', [
      { note: `You have <b>${inr(P.money)}</b> in your PayKaro wallet. Gurugram is expensive — spend wisely.` },
      { icon: '🏠', label: 'Find a place to stay', sub: 'Basera Rooms is right next door, or browse the RoofRaja app.' },
      { icon: '💼', label: 'Get a job', sub: 'Open KaamDhanda on your phone. Chai Chaupal and ZipZap hire freshers.' },
      { icon: '🚕', label: 'Book rides', sub: 'Chalo (cabs & autos) or PhatPhat (bike taxis). Beware peak-hour surge!' },
      { icon: '👋', label: 'Make friends', sub: 'Walk up to people and press E. Some have errands for you (❗).' },
      { note: isTouch() ? '<b>Controls:</b> joystick to walk · <b>E</b> to interact · drag the screen to look around · 📱 phone · 🗺️ map · ❓ help.' : `<b>Controls:</b> WASD to walk · Shift to jog · E interact · P phone · M map · F vehicle${use3D ? ' · drag the mouse to look around' : ''} · <b>H for help</b>.`, blue: true },
      { icon: '📖', label: 'Read the quick guide', sub: 'Controls, getting around, money and tips — 2 minutes', onClick: () => openHelp('start') },
      { icon: '▶️', label: 'Let\'s go!', onClick: closeModal },
    ]);
  }

  // ---------- money ----------
  function txn(label, amt) { S.txns.unshift({ t: S.time, label, amt: Math.round(amt) }); if (S.txns.length > 40) S.txns.pop(); }
  function spend(amt, label) {
    amt = Math.round(amt);
    if (S.player.money < amt) { toast(`Payment failed — you need ${inr(amt)}.`, 'bad'); return false; }
    S.player.money -= amt; txn(label, -amt); return true;
  }
  function earn(amt, label) { amt = Math.round(amt); S.player.money += amt; txn(label, amt); }

  // ---------- needs & time ----------
  function applyNeeds(m, mods) {
    const P = S.player;
    const fit = 1 - Math.min(P.skills.fitness, 5) * 0.05;
    if (mods.sleep) {
      P.energy += 0.22 * m * mods.comfort;
      P.hunger -= 0.035 * m;
      if (mods.mood) P.social += 0.02 * m;
    } else {
      P.hunger -= 0.06 * m * (mods.hunger || 1);
      P.energy -= 0.05 * m * (mods.energy || 1) * fit;
      P.social -= 0.03 * m * (mods.social == null ? 1 : mods.social) * (S.partner && (mods.social == null || mods.social > 0) ? 0.6 : 1);
    }
    if (P.hunger <= 0 || P.energy <= 0) P.health -= 0.15 * m;
    else if (P.hunger > 40 && P.energy > 20) P.health += 0.03 * m;
    if (!mods.indoor && !mods.sleep && S.aqi > 250) P.health -= ((S.aqi - 250) / 12000) * m * (P.items.includes('mask') ? 0.5 : 1);
    P.hunger = clamp(P.hunger, 0, 100); P.energy = clamp(P.energy, 0, 100);
    P.social = clamp(P.social, 0, 100); P.health = clamp(P.health, 0, 100);
  }

  function passTime(min, mods = {}) {
    let left = min;
    while (left > 1e-9) {
      const toMidnight = 1440 - (S.time % 1440);
      const step = Math.min(left, toMidnight);
      applyNeeds(step, mods);
      accrueBiz(step);
      S.time += step; left -= step;
      if (dayOf(S.time) !== S.lastDay) newDay();
    }
    tickMarket();
    for (let i = S.orders.length - 1; i >= 0; i--) {
      const o = S.orders[i];
      if (S.time >= o.at) { S.orders.splice(i, 1); applyFood(o.h, o.fx); track('eat'); toast(`🛵 Your Bhookh order arrived: ${o.name}. Delicious!`, 'good'); }
    }
  }

  function newDay() {
    const d = dayOf(S.time), P = S.player;
    S.lastDay = d;
    S.weather = Math.random() < 0.22 ? 'rain' : 'clear';
    S.aqi = S.weather === 'rain' ? randi(55, 140) : randi(110, 380);
    if (P.savings > 0) { const i = Math.round(P.savings * 0.002); if (i > 0) { P.savings += i; txn(`Paisa Bank interest +${inr(i)} (to savings)`, 0); } }
    if (P.rental && P.rental.day < d) { if (P.riding === 'ebike') P.riding = null; P.rental = null; toast('Your ZipZap e-bike rental ended.'); }
    if (S.home && d >= S.home.nextDue) {
      const H = HOMES[S.home.key];
      if (P.money >= H.rent) { P.money -= H.rent; txn(`Rent – ${H.title}`, -H.rent); S.home.nextDue += 7; S.home.overdue = 0; toast(`🏠 Weekly rent of ${inr(H.rent)} paid.`); }
      else {
        S.home.overdue++;
        if (S.home.overdue >= 3) { toast(`🚪 Evicted from ${BLD[H.building].name} for unpaid rent. Deposit forfeited.`, 'bad'); S.home = null; }
        else toast(`⚠️ Rent of ${inr(H.rent)} is overdue! Pay within ${3 - S.home.overdue} day(s) or face eviction.`, 'bad');
      }
    }
    if (S.job) {
      const J = JOBS[S.job.id];
      if (!J.flexible && S.job.hired < d - 1 && S.job.lastDay !== d - 1 && weekday(d - 1) !== 'Sun') {
        S.job.missed++;
        if (S.job.missed >= 3) { toast(`📉 You were fired from ${BLD[J.building].name} for missing shifts.`, 'bad'); S.job = null; }
        else toast(`⚠️ You missed yesterday's shift at ${BLD[J.building].name} (${S.job.missed}/3 warnings).`, 'bad');
      }
    }
    if (S.home && S.home.key === 'pg') P.hunger = clamp(P.hunger + 25, 0, 100);
    genQuests();
    onNewDayProg(d);
    marketNewDay();
    const wx = S.weather === 'rain' ? '🌧️ Monsoon rain — waterlogging and surge pricing likely' : `AQI ${S.aqi}${S.aqi > 300 ? ' 😷 wear a mask' : ''}`;
    toast(`📅 ${weekday(d)}, Day ${d} · ${wx}`);
  }

  function genQuests() {
    S.quests = {};
    const names = NPC_NAMES.map((n) => n[0]).sort(() => Math.random() - 0.5).slice(0, 4);
    const targets = BUILDINGS.filter((b) => b.solid);
    for (const n of names) { const e = pick(ERRANDS); S.quests[n] = { label: e[0], bid: pick(targets).id, reward: randi(15, 40) * 10 }; }
  }

  function checkHealth() {
    const P = S.player;
    if (P.health <= 0) {
      const h = BLD.sanjeevani, dd = door(h);
      P.money -= 3000; txn('Sanjeevani Hospital – emergency', -3000);
      P.health = 60; P.energy = Math.max(P.energy, 50); P.hunger = Math.max(P.hunger, 40);
      P.x = dd.x; P.y = dd.y; P.riding = null; ride = null;
      passTime(360, { sleep: true, comfort: 0.3, indoor: true });
      toast('🏥 You collapsed and were rushed to Sanjeevani Hospital. Bill: ₹3,000. Eat, sleep and mind the AQI!', 'bad');
    } else if (P.energy <= 0 && !busy) {
      P.riding = null;
      passTime(240, { sleep: true, comfort: 0.4 });
      toast('😵 You fainted from exhaustion right on the street. Sleep at home next time!', 'bad');
    }
  }

  function activity(text, minutes, mods, after) {
    closeModal(); closePhone();
    busy = true;
    $('#act-text').textContent = text;
    $('#activity').classList.remove('hidden');
    const fill = $('#act-fill');
    fill.style.transition = 'none'; fill.style.width = '0';
    setTimeout(() => { fill.style.transition = 'width 1s linear'; fill.style.width = '100%'; }, 30);
    setTimeout(() => {
      passTime(minutes, mods || {});
      $('#activity').classList.add('hidden');
      busy = false;
      if (after) after();
      checkHealth();
      checkGoals();
      save();
    }, 1100);
  }

  // ---------- stats ----------
  const styleScore = () => Math.min(5, S.player.items.reduce((s, k) => s + (ITEMS[k].style || 0), 0));
  const skillVal = (k) => (k === 'style' ? styleScore() : S.player.skills[k] || 0);
  const SKILL_LABEL = { coding: 'Coding', comm: 'Communication', fitness: 'Fitness', style: 'Style' };
  const reqMet = (req) => Object.entries(req).every(([k, v]) => skillVal(k) >= v);
  const reqText = (req) => {
    const e = Object.entries(req);
    if (!e.length) return 'No experience needed';
    return e.map(([k, v]) => `${skillVal(k) >= v ? '✅' : '❌'} ${SKILL_LABEL[k]} ${v}`).join(' · ');
  };
  const friendCount = () => Object.values(S.friends).filter((f) => f.fs >= 30).length;
  function gainSkill(k, amt) { S.player.skills[k] = Math.min(5, (S.player.skills[k] || 0) + amt); }
  function addFriend(name, amt) {
    const f = S.friends[name] || (S.friends[name] = { fs: 0, lastChat: -999, lastCall: 0 });
    const before = f.fs;
    f.fs = clamp(f.fs + amt, 0, 100);
    if (before < 30 && f.fs >= 30) toast(`🤝 ${name} is now your friend!`, 'good');
    return f;
  }

  // ---------- goals ----------
  const GOALS = [
    { id: 'home', t: 'Find a place to stay', d: 'Rent a home via RoofRaja or walk into a listing', r: 500, ok: () => !!S.home },
    { id: 'job', t: 'Land your first job', d: 'Apply on KaamDhanda', r: 500, ok: () => !!S.job },
    { id: 'ride', t: 'Book your first ride', d: 'Open Chalo or PhatPhat', r: 200, ok: () => S.stats.rides > 0 },
    { id: 'shift', t: 'Complete a work shift', d: 'Be at work on time and press E', r: 300, ok: () => S.stats.shifts > 0 },
    { id: 'friends', t: 'Make 3 friends', d: 'Chat and hang out (friendship 30+)', r: 800, ok: () => friendCount() >= 3 },
    { id: 'skill', t: 'Take a course at SkillUp Academy', d: 'Sector 14', r: 400, ok: () => S.stats.courses > 0 },
    { id: 'deliver', t: 'Complete 5 ZipZap deliveries', d: 'Sohna Road hub', r: 600, ok: () => S.stats.deliveries >= 5 },
    { id: 'vehicle', t: 'Buy your own vehicle', d: 'Raftaar Motors, Sohna Road', r: 1000, ok: () => S.player.vehicles.length > 0 },
    { id: 'lakh', t: 'Save ₹1,00,000', d: 'Wallet + savings', r: 2000, ok: () => S.player.money + S.player.savings >= 100000 },
    { id: 'dev', t: 'Become a Software Engineer', d: 'CodeKraft, Cyber City — needs Coding 3', r: 3000, ok: () => S.job && S.job.id === 'dev' },
    { id: 'level5', t: 'Reach Level 5', d: 'Earn XP from everything you do', r: 1000, ok: () => S.level >= 5 },
    { id: 'biz', t: 'Start your first hustle', d: 'Phone → Dhandha', r: 800, ok: () => Object.keys(S.biz).length > 0 },
    { id: 'viral', t: 'Go viral on Reelz', d: 'Post reels at photo spots', r: 1500, ok: () => S.reelz.viral > 0 },
    { id: 'fans', t: 'Reach 10K followers', d: 'Unlocks a ₹3,000/day brand deal', r: 3000, ok: () => S.reelz.followers >= 10000 },
    { id: 'love', t: 'Find love', d: 'Friendship 70+, then ask them out', r: 1500, ok: () => !!S.partner },
    { id: 'pet', t: 'Adopt a pet', d: 'Keep an eye out for strays', r: 500, ok: () => !!S.pet },
    { id: 'streak', t: 'Play 7 days in a row', d: '🎁 Rewards → daily streak', r: 5000, ok: () => S.streak.count >= 7 },
    { id: 'empire', t: 'Own 4 businesses', d: 'Build a hustle empire', r: 10000, ok: () => Object.keys(S.biz).length >= 4 },
    { id: 'chai10', t: 'Find 10 Golden Chai cups', d: 'They are hidden all over the city', r: 2000, ok: () => S.chai.length >= 10 },
    { id: 'racegold', t: 'Win gold in a street race', d: 'Night Runs at Raftaar Motors', r: 3000, ok: () => Object.values(S.races).some((r) => r.medal === 0) },
    { id: 'driver10', t: 'Complete 10 passenger trips', d: 'KaamDhanda → drive for Chalo / PhatPhat', r: 2500, ok: () => S.driver.trips >= 10 },
    { id: 'investor', t: 'Grow a ₹1,00,000 portfolio', d: 'Paisa Trade app', r: 5000, ok: () => portfolio() >= 100000 },
    { id: 'gcr', t: 'Live on Golf Course Road', d: 'Rent the Skyline Towers penthouse', r: 5000, ok: () => S.home && S.home.key === 'penthouse' },
  ];
  function checkGoals() {
    for (const g of GOALS) {
      if (!S.goals[g.id] && g.ok()) {
        S.goals[g.id] = true;
        earn(g.r, `Goal reward: ${g.t}`);
        toast(`🏆 Goal complete: ${g.t} (+${inr(g.r)})`, 'good');
      }
    }
  }

  // ---------- UI: toasts, modal ----------
  function toast(html, kind, ms = 5000) {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.innerHTML = html;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.remove(), ms);
  }

  function itemEl(it) {
    if (it.section) { const d = document.createElement('div'); d.className = 'sect'; d.textContent = it.section; return d; }
    if (it.note) { const d = document.createElement('div'); d.className = 'note' + (it.blue ? ' blue' : ''); d.innerHTML = it.note; return d; }
    if (it.html) { const d = document.createElement('div'); d.innerHTML = it.html; return d.firstElementChild || d; }
    const b = document.createElement(it.onClick ? 'button' : 'div');
    b.className = 'item';
    if (it.style) b.style.cssText = it.style;
    b.innerHTML = `<span class="ic">${it.icon || '•'}</span><span class="tx"><b>${esc(it.label)}</b>${it.sub ? `<small>${it.sub}</small>` : ''}</span>${it.right ? `<span class="rt">${it.right}</span>` : ''}`;
    if (it.onClick) { b.disabled = !!it.disabled; b.onclick = () => it.onClick(); }
    return b;
  }
  function fillList(el, items) { items.filter(Boolean).forEach((it) => el.appendChild(itemEl(it))); }

  function showModal(title, sub, items) {
    const body = $('#modal-body');
    $('.modal-box').classList.remove('wide');
    body.innerHTML = `<h3>${esc(title)}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}<div class="list"></div>`;
    fillList(body.querySelector('.list'), items);
    $('#modal').classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); }
  $('#modal-x').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  const isUI = () => busy || !$('#modal').classList.contains('hidden') || !$('#phone').classList.contains('hidden') || !$('#mapview').classList.contains('hidden');

  function setWaypoint(pt, label) { S.waypoint = { x: pt.x, y: pt.y, label }; }

  // ---------- buildings ----------
  function openBuilding(b) {
    const T = {
      job: jobMenu, food: foodMenu, home: homeMenu, social: socialMenu, park: parkMenu, metro: metroMenu, shop: shopMenu,
      mall: mallMenu, bank: bankMenu, hospital: hospitalMenu, gym: gymMenu, skill: skillMenu, dealer: dealerMenu, landmark: landmarkMenu,
    };
    T[b.type](b);
  }

  function foodItems(menu, delivery) {
    return MENUS[menu].map(([n, p, h, fx]) => {
      const price = delivery ? Math.round(p * 1.15 + 40) : p;
      const extra = fx ? Object.entries(fx).map(([k, v]) => ` · ${k} +${v}`).join('') : '';
      return {
        icon: '🍽️', label: n, sub: `Hunger +${h}${extra}`, right: inr(price),
        onClick: () => {
          if (!spend(price, delivery ? `Bhookh: ${n}` : n)) return;
          if (delivery) {
            const eta = randi(25, 45) + (S.weather === 'rain' ? 15 : 0);
            S.orders.push({ at: S.time + eta, name: n, h, fx });
            closePhone();
            toast(`🍱 Order placed! ${n} arriving in ~${eta} min.`);
          } else activity(`Eating ${n}…`, 20, { indoor: true }, () => { applyFood(h, fx); track('eat'); toast(`😋 ${n} — ekdum mast!`, 'good'); });
        },
      };
    });
  }
  function applyFood(h, fx = {}) {
    const P = S.player;
    P.hunger = clamp(P.hunger + h, 0, 100);
    if (fx.energy) P.energy = clamp(P.energy + fx.energy, 0, 100);
    if (fx.social) P.social = clamp(P.social + fx.social, 0, 100);
    if (fx.mood) P.social = clamp(P.social + fx.mood, 0, 100);
    if (fx.health) P.health = clamp(P.health + fx.health, 0, 100);
  }
  function foodMenu(b) { showModal(b.name, `${districtAt(b.x, b.y).name} · Hunger ${Math.round(S.player.hunger)}/100`, foodItems(b.menu)); }

  function shiftCheck() {
    const J = JOBS[S.job.id], h = hourF(S.time);
    if (S.player.energy < 20) return { ok: false, msg: 'Too tired to work — sleep or grab a chai first.' };
    if (J.flexible) {
      if (h < 7 || h > 22) return { ok: false, msg: 'HustleHive is open 7 AM – 11 PM.' };
      if (S.time - S.job.lastShiftAt < J.hours * 60) return { ok: false, msg: 'Take a break before the next session.' };
      return { ok: true, msg: 'Flexible hours — work whenever you like.' };
    }
    const diff = ((h - J.start + 36) % 24) - 12;
    if (S.time - S.job.lastShiftAt < 12 * 60) return { ok: false, msg: 'You already worked this shift.' };
    if (diff < -1) return { ok: false, msg: `Shift starts at ${fmtHour(J.start)}. You can clock in from ${fmtHour(J.start - 1)}.` };
    if (diff > 2) return { ok: false, msg: `Too late for today's ${fmtHour(J.start)} shift. Come back tomorrow.` };
    return { ok: true, late: diff > 0.25, msg: diff > 0.25 ? 'You\'re late — 15% pay cut today.' : 'Right on time!' };
  }

  function work() {
    const J = JOBS[S.job.id], chk = shiftCheck();
    if (!chk.ok) { toast(chk.msg, 'bad'); return; }
    const pay = J.pay * (1 + 0.15 * S.job.level) * (chk.late ? 0.85 : 1);
    S.job.lastShiftAt = S.time; S.job.lastDay = dayOf(S.time); S.job.missed = 0;
    activity(`Working as ${J.title}…`, J.hours * 60, { energy: J.energy, social: 0.5, indoor: true }, () => {
      earn(pay, `${BLD[J.building].name} – shift pay`);
      track('shift'); track('earn', pay);
      S.job.shifts++; S.stats.shifts++;
      ['coding', 'comm', 'fitness'].forEach((k) => { if (J[k]) gainSkill(k, J[k]); });
      let msg = `💰 Shift done! Earned ${inr(pay)}.`;
      if (S.job.shifts % 8 === 0) { S.job.level++; msg += ` 🎉 Promoted! Pay is now +${S.job.level * 15}%.`; }
      toast(msg, 'good');
    });
  }

  function applyJob(id) {
    const J = JOBS[id];
    if (!reqMet(J.req)) { toast('You don\'t meet the requirements yet.', 'bad'); return; }
    if (S.job) toast(`You resigned from ${BLD[JOBS[S.job.id].building].name}.`);
    S.job = { id, level: 0, shifts: 0, hired: dayOf(S.time), lastDay: dayOf(S.time), missed: 0, lastShiftAt: -99999 };
    setWaypoint(door(BLD[J.building]), BLD[J.building].name);
    closeModal(); closePhone();
    toast(`🎉 Hired as ${J.title} at ${BLD[J.building].name}! ${J.flexible ? 'Work any time 7 AM–11 PM.' : `Shift starts ${fmtHour(J.start)}.`} Waypoint set.`, 'good');
    checkGoals(); save();
  }
  function jobItem(id) {
    const J = JOBS[id], b = BLD[J.building], mine = S.job && S.job.id === id;
    return {
      icon: mine ? '⭐' : '💼', label: `${J.title} · ${b.name}`,
      sub: `${J.flexible ? `${J.hours}h sessions, flexible` : `${fmtHour(J.start)} – ${fmtHour(J.start + J.hours)}`} · ${reqText(J.req)}`,
      right: inr(J.pay) + '/shift', disabled: mine || !reqMet(J.req), onClick: () => applyJob(id),
    };
  }

  function jobMenu(b) {
    if (b.job === 'delivery') return zipzapMenu(b);
    const J = JOBS[b.job], items = [];
    if (S.job && S.job.id === b.job) {
      const chk = shiftCheck();
      items.push({ note: `You work here · ${S.job.shifts} shifts done · Level ${S.job.level}` });
      items.push({ icon: '🕘', label: `Start ${J.hours}-hour shift`, sub: chk.msg, right: inr(J.pay * (1 + 0.15 * S.job.level)), disabled: !chk.ok, onClick: work });
    } else items.push({ section: 'Now hiring' }, jobItem(b.job));
    if (b.menu) items.push({ section: 'Café menu' }, ...foodItems(b.menu));
    showModal(b.name, `${J.title} · ${inr(J.pay)} per shift`, items);
  }

  function startGig() {
    const cands = BUILDINGS.filter((b) => b.solid && b.id !== 'zipzap');
    const b = pick(cands), d = door(b);
    const km = (dist(S.player.x, S.player.y, d.x, d.y) / PX_PER_KM) * 1.25;
    S.gig = { bid: b.id, item: pick(ORDERS), cust: pick(NPC_NAMES)[0], start: S.time, allowed: Math.round(8 + km * 2.6), pay: Math.round(45 + km * 26) };
    setWaypoint(d, b.name);
    closeModal(); closePhone();
    toast(`📦 Order accepted: deliver ${S.gig.item} to ${S.gig.cust} at ${b.name}. ${S.gig.allowed} min for a tip. Base pay ${inr(S.gig.pay)}.`);
  }
  function zipzapMenu(b) {
    const P = S.player, items = [];
    if (!S.zipzap) {
      items.push({ note: 'Join as a delivery partner — paid per order, plus tips for fast delivery. Work any time 8 AM–11 PM.' });
      items.push({ icon: '📝', label: 'Register as ZipZap partner', sub: 'Free · instant onboarding', onClick: () => { S.zipzap = true; toast('✅ Registered! Accept orders here or from the KaamDhanda app.', 'good'); zipzapMenu(b); } });
    } else {
      const h = hourF(S.time);
      if (S.gig) items.push({ note: `Active order: ${esc(S.gig.item)} → <b>${BLD[S.gig.bid].name}</b>` });
      else items.push({ icon: '📦', label: 'Accept next order', sub: h < 8 || h >= 23 ? 'Orders run 8 AM – 11 PM' : 'Random drop-off somewhere in Gurugram', disabled: h < 8 || h >= 23, onClick: startGig });
      items.push({ icon: '🛵', label: 'Rent an e-bike for today', sub: P.rental ? 'Already rented — press F to ride' : 'Much faster than walking. Returned at midnight.', right: '₹199', disabled: !!P.rental,
        onClick: () => { if (spend(199, 'ZipZap e-bike rental')) { P.rental = { type: 'ebike', day: dayOf(S.time) }; toast('🛵 e-bike rented. Press F (or 🛵) to ride.', 'good'); zipzapMenu(b); } } });
      items.push({ note: `Deliveries completed: ${S.stats.deliveries}` });
    }
    showModal(b.name, 'Delivery partner hub', items);
  }

  function rentHome(key) {
    const H = HOMES[key];
    if (S.home && S.home.key === key) return;
    const cost = H.rent * 2;
    if (S.player.money < cost) { toast(`You need ${inr(cost)} (first week + 1 week deposit).`, 'bad'); return; }
    if (S.home) { const old = HOMES[S.home.key]; earn(S.home.deposit, `Deposit refund – ${old.title}`); }
    spend(cost, `Rent + deposit – ${H.title}`);
    S.home = { key, nextDue: dayOf(S.time) + 7, overdue: 0, deposit: H.rent };
    setWaypoint(door(BLD[H.building]), BLD[H.building].name);
    closeModal(); closePhone();
    toast(`🔑 You moved into ${BLD[H.building].name}! Rent ${inr(H.rent)}/week, auto-paid every 7 days.`, 'good');
    checkGoals(); save();
  }
  function homeItem(key) {
    const H = HOMES[key], b = BLD[H.building], mine = S.home && S.home.key === key;
    return { icon: mine ? '🔑' : '🏠', label: `${H.title} · ${b.name}`, sub: `${districtAt(b.x, b.y).name} · Comfort ${Math.round(H.comfort * 100)}% · ${H.desc}`,
      right: inr(H.rent) + '/wk', disabled: mine, onClick: () => rentHome(key) };
  }
  function sleepItems(H) {
    const m = Math.floor(S.time % 1440), toSeven = (7 * 60 - m + 1440) % 1440;
    const items = [];
    if (toSeven >= 60 && toSeven <= 11 * 60) items.push({ icon: '🛏️', label: 'Sleep until 7 AM', sub: `${Math.round(toSeven / 60)} hours · energy restores`, onClick: () => sleep(toSeven, H.comfort, !!H.mood) });
    items.push({ icon: '😴', label: 'Nap for 3 hours', onClick: () => sleep(180, H.comfort, !!H.mood) });
    return items;
  }
  function sleep(min, comfort, mood) {
    if (S.player.items.includes('inverter')) comfort += 0.12;
    activity('Sleeping… zzz', min, { sleep: true, comfort, mood, indoor: true }, () => toast(`☀️ Good ${hourF(S.time) < 12 ? 'morning' : 'day'}! Energy ${Math.round(S.player.energy)}.`, 'good'));
  }
  function homeMenu(b) {
    const H = HOMES[b.home];
    if (S.home && S.home.key === b.home) {
      showModal(b.name, `Your home · next rent ${inr(H.rent)} due on Day ${S.home.nextDue}`, [
        ...sleepItems(H),
        { icon: '🍳', label: 'Cook a simple meal', sub: 'Hunger +35', right: '₹70', onClick: () => { if (spend(70, 'Groceries')) activity('Cooking dal-chawal…', 40, { indoor: true }, () => applyFood(35)); } },
        { icon: '📺', label: 'Binge a web series', sub: '2 hours · social +10, energy +5', onClick: () => activity('Watching just one more episode…', 120, { indoor: true, social: -3 }, () => { S.player.energy = clamp(S.player.energy + 5, 0, 100); }) },
        { icon: '📦', label: 'Move out', sub: `Deposit of ${inr(S.home.deposit)} refunded`, onClick: () => { earn(S.home.deposit, `Deposit refund – ${H.title}`); S.home = null; closeModal(); toast('You moved out. Find a new place on RoofRaja.'); } },
      ]);
    } else {
      showModal(b.name, H.desc, [{ note: `Move in for <b>${inr(H.rent * 2)}</b> today (first week + refundable deposit).` }, homeItem(b.home)]);
    }
  }

  const VENUES = {
    cybersquare: [
      { label: 'Hang out at Cyber Square', icon: '🎉', cost: 600, mins: 120, social: 35, meet: true },
      { label: 'Startup networking mixer', icon: '🤝', cost: 300, mins: 120, social: 20, comm: 0.25, meet: true },
    ],
    pub: [
      { label: 'Live music night', icon: '🎸', cost: 900, mins: 150, social: 40, meet: true },
      { label: 'Karaoke night', icon: '🎤', cost: 500, mins: 120, social: 30, comm: 0.1, meet: true },
    ],
    theatre: [{ label: 'Watch the musical "Dil Se Gurugram"', icon: '🎭', cost: 1500, mins: 180, social: 45 }],
    golf: [{ label: 'Round of golf with CXOs', icon: '⛳', cost: 3000, mins: 240, social: 35, comm: 0.35, style: 2, meet: true }],
    cinema: [
      { label: 'Watch the latest blockbuster', icon: '🎬', cost: 350, mins: 180, social: 25 },
      { label: 'Late show + popcorn combo', icon: '🍿', cost: 650, mins: 180, social: 30, hunger: 20 },
    ],
  };
  function doSocial(v) {
    if (!spend(v.cost, v.label)) return;
    activity(`${v.label}…`, v.mins, { energy: 1.3, social: 0, indoor: true }, () => {
      const P = S.player;
      P.social = clamp(P.social + v.social, 0, 100);
      if (v.hunger) P.hunger = clamp(P.hunger + v.hunger, 0, 100);
      if (v.comm) gainSkill('comm', v.comm);
      track('social');
      let msg = `🎉 Fun time! Social +${v.social}.`;
      if (v.meet) { const n = pick(NPC_NAMES); addFriend(n[0], 10); msg += ` You met ${n[0]} (${n[1]}).`; }
      toast(msg, 'good');
    });
  }
  function socialMenu(b) {
    const h = hourF(S.time), open = h >= 11 || h < 2;
    const items = VENUES[b.venue].map((v) => {
      const styleOk = !v.style || styleScore() >= v.style;
      return { icon: v.icon, label: v.label, sub: `${v.mins / 60}h · Social +${v.social}${v.comm ? ' · Communication +' + v.comm : ''}${v.meet ? ' · meet new people' : ''}${!styleOk ? ` · ❌ Dress code: Style ${v.style}` : ''}`,
        right: inr(v.cost), disabled: !open || !styleOk, onClick: () => doSocial(v) };
    });
    showModal(b.name, open ? 'Open now · 11 AM – 2 AM' : 'Closed — opens at 11 AM', items);
  }

  function parkMenu(b) {
    const P = S.player, h = hourF(S.time);
    const items = [
      { icon: '🚶', label: 'Take a stroll', sub: '1h · Social +8, Fitness +0.05', onClick: () => activity('Strolling…', 60, { energy: 1.2, social: -4 }, () => gainSkill('fitness', 0.05)) },
      { icon: '🏃', label: 'Go for a jog', sub: '1h · Fitness +0.2, Energy −', onClick: () => activity('Jogging…', 60, { energy: 3, hunger: 1.6 }, () => { gainSkill('fitness', 0.2); track('train'); }) },
    ];
    if (b.park === 'leisure') items.push({ icon: '🧘', label: 'Morning yoga with the aunty-ji group', sub: h >= 5 && h < 10 ? '1h · Social +15, Fitness +0.15' : 'Only 5 AM – 10 AM', disabled: !(h >= 5 && h < 10),
      onClick: () => activity('Surya namaskar ×12…', 60, { energy: 1.5, social: -8 }, () => { gainSkill('fitness', 0.15); addFriend('Simran', 6); }) });
    if (b.park === 'cricket') items.push({ icon: '🏏', label: 'Join a gully-cricket match', sub: '2h · Social +20, Fitness +0.25', onClick: () => activity('Hitting sixes…', 120, { energy: 2.5, social: -5 }, () => { gainSkill('fitness', 0.25); addFriend('Arjun', 8); }) });
    if (b.park === 'chaupal') items.push({ icon: '🪑', label: 'Sit with Rakesh Tau at the chaupal', sub: '1h · Social +15 · free gossip', onClick: () => activity('Hearing stories of "Gurgaon" before the malls…', 60, { social: -8 }, () => addFriend('Rakesh Tau', 10)) });
    if (b.park === 'aravalli' || b.park === 'trail') items.push({ icon: '🥾', label: 'Nature trek', sub: '2h · Fitness +0.3, Social +5', onClick: () => activity('Trekking past the Aravalli scrub…', 120, { energy: 2.6, social: -1.5 }, () => { gainSkill('fitness', 0.3); P.health = clamp(P.health + 6, 0, 100); }) });
    if (!S.home) items.push({ icon: '🪵', label: 'Sleep on a bench (homeless)', sub: 'Poor rest · cold and mosquitoes', onClick: () => sleep(360, 0.45, false) });
    showModal(b.name, 'Free entry · fresh-ish air', items);
  }

  function metroMenu(b) {
    const st = BUILDINGS.filter((x) => x.type === 'metro'), i = st.indexOf(b), h = hourF(S.time);
    const open = h >= 6 && h < 23;
    showModal(b.name, open ? 'Rapid Link Metro · 6 AM – 11 PM' : 'Closed for the night (6 AM – 11 PM)', st.filter((x) => x !== b).map((x) => {
      const hops = Math.abs(st.indexOf(x) - i), fare = 20 + hops * 10;
      return { icon: '🚇', label: x.name.replace('Rapid Link – ', ''), sub: `${hops} stop${hops > 1 ? 's' : ''} · ~${4 + hops * 4} min`, right: inr(fare), disabled: !open,
        onClick: () => { if (spend(fare, `Rapid Link Metro`)) activity('Riding the Rapid Link Metro…', 4 + hops * 4, { indoor: true }, () => { const d = door(x); S.player.x = d.x; S.player.y = d.y; S.player.riding = null; track('metro'); arrivalChecks(); }); } };
    }));
  }

  function shopMenu(b) {
    showModal(b.name, `Your style: ${styleScore().toFixed(1)} / 5`, shopItems(b.shop));
  }
  function shopItems(shop) {
    return SHOPS[shop].map((k) => {
      const it = ITEMS[k], own = S.player.items.includes(k);
      return { icon: it.style ? '👕' : k === 'helmet' ? '⛑️' : '😷', label: it.name, sub: it.desc || `Style +${it.style}`, right: own ? 'Owned' : inr(it.price), disabled: own,
        onClick: () => { if (spend(it.price, it.name)) { S.player.items.push(k); toast(`🛍️ Bought ${it.name}!`, 'good'); closeModal(); } } };
    });
  }
  function mallMenu(b) {
    const items = [];
    if (b.job) {
      if (S.job && S.job.id === b.job) { const chk = shiftCheck(); items.push({ icon: '🕘', label: `Start retail shift`, sub: chk.msg, disabled: !chk.ok, onClick: work }); }
      else items.push({ section: 'Now hiring' }, jobItem(b.job));
    }
    items.push({ section: 'Shops' }, ...shopItems(b.shop), { section: 'Food court' }, ...foodItems(b.menu));
    showModal(b.name, 'AC, escalators and a lot of window shopping', items);
  }

  function bankMenu(b) {
    const P = S.player;
    const mv = (amt, dep) => {
      amt = Math.round(amt);
      if (amt <= 0) return;
      if (dep) { if (!spend(amt, 'Deposit to savings')) return; P.savings += amt; }
      else { if (P.savings < amt) { toast('Not enough savings.', 'bad'); return; } P.savings -= amt; earn(amt, 'Withdrawal from savings'); }
      bankMenu(b);
    };
    showModal(b.name, `Wallet ${inr(P.money)} · Savings ${inr(P.savings)} · 0.2% interest daily`, [
      { section: 'Deposit' },
      { icon: '⬇️', label: 'Deposit ₹1,000', disabled: P.money < 1000, onClick: () => mv(1000, true) },
      { icon: '⬇️', label: 'Deposit ₹10,000', disabled: P.money < 10000, onClick: () => mv(10000, true) },
      { icon: '⬇️', label: 'Deposit everything', disabled: P.money <= 0, onClick: () => mv(P.money, true) },
      { section: 'Withdraw' },
      { icon: '⬆️', label: 'Withdraw ₹1,000', disabled: P.savings < 1000, onClick: () => mv(1000, false) },
      { icon: '⬆️', label: 'Withdraw ₹10,000', disabled: P.savings < 10000, onClick: () => mv(10000, false) },
      { icon: '⬆️', label: 'Withdraw everything', disabled: P.savings <= 0, onClick: () => mv(P.savings, false) },
    ]);
  }

  function hospitalMenu(b) {
    const P = S.player;
    showModal(b.name, `Health ${Math.round(P.health)}/100`, [
      { icon: '🩺', label: 'OPD consultation', sub: '1h · Health +30', right: '₹600', onClick: () => { if (spend(600, 'Sanjeevani OPD')) activity('Waiting for Dr. Malhotra…', 60, { indoor: true }, () => { P.health = clamp(P.health + 30, 0, 100); }); } },
      { icon: '💉', label: 'Full treatment', sub: '3h · Health to 100', right: '₹2,500', onClick: () => { if (spend(2500, 'Sanjeevani treatment')) activity('Getting treated…', 180, { indoor: true }, () => { P.health = 100; }); } },
    ]);
  }

  function gymMenu(b) {
    const P = S.player;
    showModal(b.name, `Fitness ${P.skills.fitness.toFixed(1)} / 5 · reduces how fast you tire`, [
      { icon: '🏋️', label: 'Workout session', sub: '1.5h · Fitness +0.35', right: '₹300', disabled: P.energy < 20,
        onClick: () => { if (spend(300, 'Iron Paradise session')) activity('Leg day. No skipping.', 90, { energy: 3, hunger: 1.5, indoor: true }, () => { gainSkill('fitness', 0.35); addFriend('Harsh', 3); track('train'); }); } },
      { icon: '🥤', label: 'Protein shake', sub: 'Hunger +15, Energy +5', right: '₹180', onClick: () => { if (spend(180, 'Protein shake')) { applyFood(15, { energy: 5 }); toast('💪 Gains!'); closeModal(); } } },
    ]);
  }

  function skillMenu(b) {
    const P = S.player;
    const course = (label, k, cost, mins, gain) => ({
      icon: '🎓', label, sub: `${mins / 60}h · ${SKILL_LABEL[k]} +${gain} (now ${P.skills[k].toFixed(1)}/5)`, right: cost ? inr(cost) : 'Free', disabled: P.skills[k] >= 5 || P.energy < 15,
      onClick: () => { if (cost && !spend(cost, `SkillUp: ${label}`)) return; activity(`Studying ${label}…`, mins, { energy: 1.4, indoor: true }, () => { gainSkill(k, gain); S.stats.courses++; track('train'); toast(`📚 ${SKILL_LABEL[k]} is now ${P.skills[k].toFixed(1)}!`, 'good'); }); },
    });
    showModal(b.name, 'Upskill to unlock better-paying jobs', [
      course('Coding bootcamp module', 'coding', 2500, 240, 1),
      course('Communication & interview skills', 'comm', 1500, 180, 1),
      course('Self-study in the library', 'coding', 0, 180, 0.25),
      course('Spoken English group class', 'comm', 400, 120, 0.4),
    ]);
  }

  function dealerMenu(b) {
    const P = S.player;
    const items = ['scooter', 'bike', 'car'].map((k) => {
      const V = VEHICLES[k], own = P.vehicles.includes(k);
      return own
        ? { icon: '✅', label: V.name, sub: `Owned · sell back for ${inr(V.price * 0.6)}`, right: 'Sell', onClick: () => { P.vehicles = P.vehicles.filter((x) => x !== k); if (P.riding === k) P.riding = null; earn(V.price * 0.6, `Sold ${V.name}`); dealerMenu(b); } }
        : { icon: V.two ? '🛵' : '🚗', label: V.name, sub: `Top speed ${V.speed} · fuel ~${inr(V.fuel)}/km${V.two ? ' · helmet required' : ' · AC, no helmet needed'}`, right: inr(V.price),
          onClick: () => { if (spend(V.price, `Raftaar Motors – ${V.name}`)) { P.vehicles.push(k); toast(`🔑 You bought a ${V.name}! Press F to ride.`, 'good'); checkGoals(); dealerMenu(b); } } };
    });
    showModal(b.name, 'Zero down-payment? No. Full payment only.', [{ section: 'Night Runs · street races (start here, on your vehicle)' }, ...raceItems(), { section: 'Showroom' }, { note: 'Two-wheelers dodge traffic jams better; cars stay slow in peak hours. Ride without a helmet and the traffic police nakas will fine you ₹1,000.' }, ...items]);
  }

  function landmarkMenu(b) { showModal(b.name, districtAt(b.x, b.y).name, [{ note: b.text }]); }

  // ---------- NPCs ----------
  function talkTo(n) {
    const f = S.friends[n.name] || { fs: 0 };
    const q = S.quests[n.name];
    const greet = f.fs >= 30 ? `Arre ${esc(S.player.name)}! Kaise ho?` : f.fs > 0 ? 'Oh hi again!' : `Hi, I'm ${n.name}. I work as a ${n.occ}.`;
    const items = [
      { note: `<b>${n.name}</b>: "${greet} ${esc(pick(CHATTER))}"` },
      { icon: '💬', label: 'Chat', sub: 'Friendship +6 · Social +8', onClick: () => {
        const fr = S.friends[n.name] || addFriend(n.name, 0);
        if (S.time - fr.lastChat < 60) { toast(`${n.name}: "Yaar, we just talked! Catch you later."`); closeModal(); return; }
        fr.lastChat = S.time; addFriend(n.name, 6); S.player.social = clamp(S.player.social + 8, 0, 100); passTime(10);
        track('chat');
        toast(`💬 Nice chat with ${n.name}.`, 'good'); closeModal();
      } },
      { icon: '💡', label: 'Ask about jobs', onClick: () => { toast(`${n.name}: "${JOB_TIPS[n.occ] || 'Check KaamDhanda on your phone — and learn skills at SkillUp Academy.'}"`); addFriend(n.name, 1); closeModal(); } },
      { icon: '☕', label: 'Hang out over chai & snacks', sub: f.fs >= 25 ? '2h · Friendship +12 · Social +30' : 'Become closer first (friendship 25)', right: '₹400', disabled: f.fs < 25,
        onClick: () => { if (spend(400, `Hangout with ${n.name}`)) activity(`Hanging out with ${n.name}…`, 120, { social: -8 }, () => { addFriend(n.name, 12); applyFood(15); }); } },
    ];
    if (f.fs >= 70 && !S.partner) items.push({ icon: '💞', label: `Ask ${n.name} out on a date`, sub: 'Dinner at Cyber Square · Style and mood help', right: '₹1,500', onClick: () => askOut(n.name) });
    if (q && !S.errand) items.push({ icon: '❗', label: `Errand: ${q.label}`, sub: `Take it to ${BLD[q.bid].name}`, right: inr(q.reward),
      onClick: () => { S.errand = { npc: n.name, ...q }; delete S.quests[n.name]; setWaypoint(door(BLD[q.bid]), BLD[q.bid].name); closeModal(); toast(`❗ Errand accepted for ${n.name}. Waypoint set to ${BLD[q.bid].name}.`); } });
    else if (q) items.push({ note: `${n.name} has an errand, but you're already running one.` });
    showModal(n.name, `${n.occ} · friendship ${Math.round(f.fs)}/100`, items);
  }

  // ---------- ride hailing ----------
  const DRIVERS = ['Ramesh', 'Sukhvinder', 'Imran', 'Rajbir', 'Pawan', 'Satish', 'Anil', 'Mukesh', 'Joginder', 'Salim', 'Bablu', 'Naresh'];
  const surge = () => Math.min(2.2, 1 + (isPeak() ? 0.4 : 0) + (S.weather === 'rain' ? 0.5 : 0));
  function quotes(appKey, dest) {
    const pu = snapToRoad(S.player.x, S.player.y), dn = snapToRoad(dest.x, dest.y);
    const km = Math.max(0.6, pathLen(roadPath(pu, dn)) / PX_PER_KM);
    const app = RIDE_APPS[appKey], sg = surge();
    return app.types.map((t) => {
      const T = RIDE_TYPES[t], s = t === 'bike' ? 1 + (sg - 1) * 0.5 : sg;
      const fare = Math.round(((T.base + T.perKm * km) * app.mult * s) / 5) * 5;
      const slow = isPeak() ? 1 / (T.jam + (1 - T.jam) * 0.4) : 1;
      return { type: t, fare, km, surge: s, eta: randi(2, 6) + (isPeak() && t !== 'bike' ? 4 : 0), mins: Math.round(km * 1.5 * slow) };
    });
  }
  function bookRide(appKey, q, dest) {
    if (ride) { toast('You already have a ride booked.', 'bad'); return; }
    if (S.player.money < q.fare) { toast(`Insufficient PayKaro balance for ${inr(q.fare)}.`, 'bad'); return; }
    S.player.riding = null;
    ride = { app: appKey, type: q.type, fare: q.fare, dest, status: 'searching', timer: rand(1.2, 2.5), pickup: snapToRoad(S.player.x, S.player.y), car: null, driver: null };
    toast(`🔎 ${RIDE_APPS[appKey].name}: finding a ${RIDE_TYPES[q.type].label} near you…`);
  }
  function plate() { const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'; return `HR 26 ${L[randi(0, 22)]}${L[randi(0, 22)]} ${randi(1000, 9999)}`; }
  function updateRide(dt) {
    if (!ride) return;
    const T = RIDE_TYPES[ride.type], P = S.player;
    if (ride.status === 'searching') {
      ride.timer -= dt;
      if (ride.timer <= 0) {
        const pu = ride.pickup;
        const off = (Math.random() < 0.5 ? -1 : 1) * rand(450, 800);
        let sp = pu.t === 'v' ? { x: pu.x, y: clamp(pu.y + off, 10, WORLD.h - 10), t: 'v', i: pu.i } : { x: clamp(pu.x + off, 10, WORLD.w - 10), y: pu.y, t: 'h', i: pu.i };
        if (Math.abs((sp.x - pu.x) + (sp.y - pu.y)) < 200) sp = pu.t === 'v' ? { ...sp, y: clamp(pu.y - off, 10, WORLD.h - 10) } : { ...sp, x: clamp(pu.x - off, 10, WORLD.w - 10) };
        const path = roadPath(sp, pu);
        ride.car = { x: path[0].x, y: path[0].y, path, seg: 0, ang: 0 };
        ride.driver = { name: pick(DRIVERS), rating: rand(4.3, 4.97).toFixed(2), plate: plate() };
        ride.status = 'arriving';
        toast(`✅ ${ride.driver.name} (${ride.driver.rating}★) is on the way · ${ride.driver.plate}`, 'good');
      }
    } else if (ride.status === 'arriving') {
      const jam = isPeak() && roadAt(ride.car.x, ride.car.y)?.jam ? T.jam : 1;
      if (moveAlong(ride.car, 360 * jam * dt)) { ride.status = 'waiting'; toast(`📍 Your ${T.label} has arrived at the pickup point. Walk up and press E.`); }
    } else if (ride.status === 'waiting') {
      if (dist(P.x, P.y, ride.car.x, ride.car.y) < 40) boardRide();
    } else if (ride.status === 'onboard') {
      const jamRoad = isPeak() && roadAt(ride.car.x, ride.car.y)?.jam;
      const vis = 420 * (jamRoad ? 0.55 : 1) * dt;
      const before = { x: ride.car.x, y: ride.car.y };
      const done = moveAlong(ride.car, vis);
      const moved = dist(before.x, before.y, ride.car.x, ride.car.y);
      passTime((moved / PX_PER_KM) * 1.5 * (jamRoad ? 1 / T.jam : 1), { indoor: true, energy: 0.5 });
      P.x = ride.car.x; P.y = ride.car.y;
      if (done) finishRide();
    }
  }
  function boardRide() {
    const dn = snapToRoad(ride.dest.x, ride.dest.y);
    const path = roadPath({ x: ride.car.x, y: ride.car.y, ...snapToRoad(ride.car.x, ride.car.y) }, dn);
    ride.car.path = path; ride.car.seg = 0; ride.car.x = path[0].x; ride.car.y = path[0].y;
    ride.status = 'onboard';
    S.player.riding = null;
    toast(`🚗 On the way to ${esc(ride.dest.label)}. Sit back — ${pick(['the driver is playing old Bollywood hits.', 'AC is on full blast.', 'the driver asks "GPS se chalein ya shortcut?"', 'the driver is on a hands-free call with his mother.'])}`);
  }
  function finishRide() {
    const P = S.player, r = ride;
    ride = null;
    const target = r.dest.door || r.dest;
    P.x = target.x; P.y = target.y;
    if (solidAt(P.x, P.y, 10) || roadAt(P.x, P.y)) {
      const sn = snapToRoad(target.x, target.y);
      const r2 = sn.t === 'v' ? ROADS_V[sn.i] : ROADS_H[sn.i];
      if (sn.t === 'v') { P.x = sn.x + (target.x >= sn.x ? 1 : -1) * (r2.w / 2 + 14); P.y = sn.y; } else { P.y = sn.y + (target.y >= sn.y ? 1 : -1) * (r2.w / 2 + 14); P.x = sn.x; }
      if (solidAt(P.x, P.y, 10)) { P.x = target.x; P.y = target.y; }
    }
    P.money -= r.fare; txn(`${RIDE_APPS[r.app].name} ${RIDE_TYPES[r.type].label} ride`, -r.fare);
    S.stats.rides++;
    track('ride');
    toast(`🏁 Arrived at ${esc(r.dest.label)}. ${inr(r.fare)} paid via PayKaro. You rated ${r.driver.name} ★★★★★`, 'good');
    if (S.waypoint && dist(S.waypoint.x, S.waypoint.y, target.x, target.y) < 60 && !S.gig && !S.errand) S.waypoint = null;
    arrivalChecks(); checkGoals(); save();
  }
  function cancelRide() {
    if (!ride) return;
    if (ride.status !== 'searching') { S.player.money -= 50; txn('Ride cancellation fee', -50); toast('Ride cancelled. ₹50 cancellation fee charged.', 'bad'); }
    else toast('Ride request cancelled.');
    ride = null;
  }

  // ---------- missions ----------
  function arrivalChecks() {
    const P = S.player;
    if (S.gig) {
      const d = door(BLD[S.gig.bid]);
      if (dist(P.x, P.y, d.x, d.y) < 55) {
        const g = S.gig, late = S.time - g.start > g.allowed;
        const tip = late ? 0 : randi(1, 6) * 10;
        const pay = late ? Math.round(g.pay * 0.8) : g.pay;
        earn(pay + tip, `ZipZap delivery${tip ? ' + tip' : ''}`);
        S.stats.deliveries++; S.gig = null; S.waypoint = null;
        track('deliver'); track('earn', pay + tip);
        toast(late ? `📦 Delivered, but late. ${g.cust} rated you 3★. Earned ${inr(pay)}.` : `📦 Delivered on time! ${g.cust} tipped ${inr(tip)}. Earned ${inr(pay + tip)}.`, late ? '' : 'good');
        checkGoals();
      }
    }
    if (S.errand) {
      const d = door(BLD[S.errand.bid]);
      if (dist(P.x, P.y, d.x, d.y) < 55) {
        earn(S.errand.reward, `Errand for ${S.errand.npc}`);
        addFriend(S.errand.npc, 15);
        track('errand'); track('earn', S.errand.reward);
        toast(`❗ Errand done! ${S.errand.npc} sent you ${inr(S.errand.reward)} on PayKaro. Friendship +15.`, 'good');
        S.errand = null; S.waypoint = null;
        checkGoals();
      }
    }
  }

  // ---------- vehicles ----------
  function bestVehicle() {
    const P = S.player, opts = P.vehicles.slice();
    if (P.rental) opts.push(P.rental.type);
    return opts.sort((a, b) => VEHICLES[b].speed - VEHICLES[a].speed)[0] || null;
  }
  function toggleVehicle() {
    const P = S.player;
    if (ride && ride.status === 'onboard') return;
    if (P.riding) { P.riding = null; toast('You parked your ride.'); return; }
    const v = bestVehicle();
    if (!v) { toast('No vehicle yet. Rent an e-bike at ZipZap hub or buy one at Raftaar Motors — or book a ride!', 'bad'); return; }
    P.riding = v;
    toast(`🛵 Riding your ${VEHICLES[v].name}.${VEHICLES[v].two && !P.items.includes('helmet') ? ' ⚠️ No helmet — watch out for police nakas!' : ''}`);
  }

  // ---------- input ----------
  const keys = {};
  const joy = { x: 0, y: 0, id: null };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (!running) return;
    if (k === 'escape') { closeModal(); closePhone(); closeMap(); }
    if (busy) return;
    if (k === 'e' || k === 'enter') { if (!isUI() && currentAct) currentAct(); }
    if (k === 'p' || k === 'tab') { e.preventDefault(); if ($('#phone').classList.contains('hidden')) openPhone(); else closePhone(); }
    if (k === 'h' || k === '?') { if ($('#modal').classList.contains('hidden')) openHelp(); else closeModal(); }
    if (k === 'g') { if ($('#modal').classList.contains('hidden')) openRewards(); else closeModal(); }
    if (k === 'm') { if ($('#mapview').classList.contains('hidden')) openMap(); else closeMap(); }
    if (k === 'f' && !isUI()) toggleVehicle();
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const stick = $('#stick'), knob = $('#knob');
  function moveJoy(e) {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const L = Math.hypot(dx, dy), max = 45;
    if (L > max) { dx = (dx / L) * max; dy = (dy / L) * max; }
    joy.x = dx / max; joy.y = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  const endJoy = () => { joy.x = joy.y = 0; joy.id = null; knob.style.transform = ''; };
  stick.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveJoy(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
  stick.addEventListener('pointerup', endJoy);
  stick.addEventListener('pointercancel', endJoy);
  $('#btn-act').onclick = () => { if (!isUI() && currentAct) currentAct(); };
  $('#btn-phone').onclick = () => openPhone();
  $('#btn-map').onclick = () => openMap();
  $('#btn-veh').onclick = () => toggleVehicle();
  $('#btn-help').onclick = () => openHelp();
  $('#btn-gift').onclick = () => openRewards();
  if ('ontouchstart' in window || matchMedia('(pointer: coarse)').matches) document.body.classList.add('is-touch');

  // ---------- update ----------
  let hitCooldown = 0, puddleWarned = 0;
  function update(dt) {
    const P = S.player;
    const onboard = ride && ride.status === 'onboard';
    if (!onboard) passTime(dt * MIN_PER_SEC, { energy: P.riding ? 0.6 : keys.shift ? 1.6 : 1 });

    // traffic
    for (const c of cars) {
      const jam = isPeak() && c.r.jam ? 0.35 : 1;
      c.pos += c.lane * c.spd * jam * dt;
      const len = c.t === 'v' ? WORLD.h : WORLD.w;
      if (c.pos > len + 60) c.pos = -60; else if (c.pos < -60) c.pos = len + 60;
    }

    // npcs
    for (const n of npcs) {
      if (n.wait > 0) { n.wait -= dt; continue; }
      const dx = n.tx - n.x, dy = n.ty - n.y, L = Math.hypot(dx, dy);
      if (L < 4) { const p = freePoint(n.home); n.tx = p.x; n.ty = p.y; n.wait = rand(1, 5); continue; }
      const nx = n.x + (dx / L) * n.spd * dt, ny = n.y + (dy / L) * n.spd * dt;
      if (solidAt(nx, ny, 9)) { n.tx = n.x; n.ty = n.y; n.wait = rand(0.3, 1); continue; }
      n.x = nx; n.y = ny; n.phase += dt * 9; n.ang = Math.atan2(dy, dx);
    }

    updateRide(dt);

    // player movement
    if (!onboard) {
      let mx = 0, my = 0;
      if (keys.w || keys.arrowup) my -= 1;
      if (keys.s || keys.arrowdown) my += 1;
      if (keys.a || keys.arrowleft) mx -= 1;
      if (keys.d || keys.arrowright) mx += 1;
      mx += joy.x; my += joy.y;
      if (use3D) {
        // camera-relative: forward is where the camera looks
        const yaw = window.GGL3D.yaw, fwd = -my, rt = mx;
        mx = Math.cos(yaw) * fwd - Math.sin(yaw) * rt;
        my = Math.sin(yaw) * fwd + Math.cos(yaw) * rt;
      }
      const L = Math.hypot(mx, my);
      if (L > 1) { mx /= L; my /= L; }
      const V = P.riding ? VEHICLES[P.riding] : null;
      let spd = V ? V.speed : use3D ? (keys.shift ? 150 : 85) : (keys.shift ? 210 : 135);
      if (!V && P.energy < 15) spd *= 0.7;
      const road = roadAt(P.x, P.y);
      if (V && isPeak() && road && road.jam) spd *= V.two ? 0.75 : 0.4;
      if (S.weather === 'rain' && road && puddles.some((p) => dist(p.x, p.y, P.x, P.y) < p.r)) {
        spd *= 0.5;
        if (performance.now() - puddleWarned > 15000) { puddleWarned = performance.now(); toast('🌊 Waterlogged road! Classic Gurugram monsoon.'); }
      }
      const rad = V ? 12 : 9;
      if (L > 0.05) {
        const ox = P.x, oy = P.y;
        const nx = clamp(P.x + mx * spd * dt, 10, WORLD.w - 10);
        if (!solidAt(nx, P.y, rad)) P.x = nx;
        const ny = clamp(P.y + my * spd * dt, 10, WORLD.h - 10);
        if (!solidAt(P.x, ny, rad)) P.y = ny;
        P.ang = Math.atan2(my, mx);
        P.phase = (P.phase || 0) + dt * (V ? 4 : 11);
        P.moving = true;
        const moved = dist(ox, oy, P.x, P.y) / PX_PER_KM;
        if (V) { S.stats.km += moved; P.fuelAcc += moved * V.fuel; if (P.fuelAcc >= 50) { P.money -= Math.round(P.fuelAcc); txn('Fuel / charging', -P.fuelAcc); P.fuelAcc = 0; } }
      } else P.moving = false;

      // traffic collisions while on foot
      hitCooldown -= dt;
      if (!V && road && hitCooldown <= 0) {
        for (const c of cars) {
          const p = carXY(c), hl = (c.t === 'v' ? c.w : c.l) / 2 + 8, vl = (c.t === 'v' ? c.l : c.w) / 2 + 8;
          if (Math.abs(p.x - P.x) < hl && Math.abs(p.y - P.y) < vl) {
            hitCooldown = 2;
            P.health = clamp(P.health - 12, 0, 100);
            if (c.t === 'v') P.x += (P.x < c.r.x ? -1 : 1) * 60; else P.y += (P.y < c.r.y ? -1 : 1) * 60;
            if (solidAt(P.x, P.y, 9)) { P.x = clamp(P.x, 10, WORLD.w - 10); }
            toast(pick(['🚗 HONK! A speeding SUV clipped you. Health −12.', '🛺 An auto brushed past you. Ouch! Health −12.', '🚌 The bus driver did not stop. Health −12. Cross carefully!']), 'bad');
            break;
          }
        }
      }

      // traffic police nakas
      if (V && V.two && !P.items.includes('helmet')) {
        NAKAS.forEach((nk, i) => {
          if (dist(nk.x, nk.y, P.x, P.y) < 70 && S.time - (S.naka[i] || -9999) > 120) {
            S.naka[i] = S.time; P.money -= 1000; txn('Traffic challan – no helmet', -1000);
            toast('👮 Naka! "Helmet kahan hai?" ₹1,000 challan issued. Buy a helmet at Sadar Bazaar.', 'bad');
          }
        });
      }
      arrivalChecks();
      checkChai();
      updateRace();
      updateDriver(dt);
    }
    checkHealth();
    findInteraction();
  }

  function carXY(c) { return c.t === 'v' ? { x: c.r.x + (c.lane * c.r.w) / 4, y: c.pos } : { x: c.pos, y: c.r.y - (c.lane * c.r.w) / 4 }; }

  function findInteraction() {
    const P = S.player;
    let best = null;
    if (ride && ride.status === 'waiting' && dist(P.x, P.y, ride.car.x, ride.car.y) < 110) best = { t: `Board your ${RIDE_TYPES[ride.type].label} (${ride.driver.plate})`, fn: boardRide };
    if (!best && !(ride && ride.status === 'onboard')) {
      let nd = 44;
      for (const n of npcs) { const d = dist(n.x, n.y, P.x, P.y); if (d < nd) { nd = d; best = { t: `Talk to ${n.name}${S.quests[n.name] ? ' ❗' : ''}`, fn: () => talkTo(n) }; } }
      if (!best) {
        let bd = 48;
        for (const b of BUILDINGS) {
          if (!b.solid) continue;
          const d = door(b), dd = dist(d.x, d.y, P.x, P.y);
          if (dd < bd) { bd = dd; best = { t: `${TYPE_ICON[b.type]} ${b.name}`, fn: () => openBuilding(b) }; }
        }
      }
      if (!best) {
        for (const b of BUILDINGS) if (!b.solid && P.x > b.x && P.x < b.x + b.w && P.y > b.y && P.y < b.y + b.h && !roadAt(P.x, P.y)) best = { t: `${TYPE_ICON.park} ${b.name}`, fn: () => openBuilding(b) };
      }
    }
    currentAct = best ? best.fn : null;
    const html = best ? `<kbd>E</kbd>${esc(best.t)}` : '';
    if (promptEl.innerHTML !== html) promptEl.innerHTML = html;
  }
  const promptEl = $('#prompt');

  // ---------- rendering ----------
  const cv = $('#game'), ctx = cv.getContext('2d');
  let VW = 0, VH = 0, DPR = 1, ZOOM = 1;
  const cam = { x: 0, y: 0 };
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    VW = window.innerWidth; VH = window.innerHeight;
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
    ZOOM = VW < 700 ? 0.72 : 1;
    if (use3D && window.GGL3D.ready) window.GGL3D.resize(VW, VH);
  }
  window.addEventListener('resize', resize);

  function rr(c, x, y, w, h, r) {
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); } else c.fillRect(x, y, w, h);
  }

  function drawPerson(c, x, y, look, phase, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 10, 8, 3.5, 0, 0, Math.PI * 2); c.fill();
    const sw = Math.sin(phase) * 2.5;
    c.fillStyle = look.pants; c.fillRect(-5, 1, 4, 8 + sw); c.fillRect(1, 1, 4, 8 - sw);
    c.fillStyle = look.skin; c.fillRect(-9, -7, 3, 8 - sw * 0.5); c.fillRect(6, -7, 3, 8 + sw * 0.5);
    c.fillStyle = look.shirt; rr(c, -7, -9, 14, 12, 4);
    c.fillStyle = look.skin; c.beginPath(); c.arc(0, -14, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = look.hair;
    if (look.hairStyle === 'cap') {
      c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, -15, 6.3, Math.PI, 0); c.fill(); c.fillRect(-1, -16, 9, 2.5);
    } else {
      c.beginPath(); c.arc(0, -15, 6.3, Math.PI, 0); c.fill();
      if (look.hairStyle === 'long') { c.fillRect(-6.3, -15, 2.6, 11); c.fillRect(3.7, -15, 2.6, 11); }
      if (look.hairStyle === 'bun') { c.beginPath(); c.arc(0, -21.5, 3.2, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }

  function drawVehicle(c, x, y, ang, k) {
    c.save(); c.translate(x, y); c.rotate(ang);
    if (k.two) {
      c.fillStyle = '#111'; c.fillRect(-10, -1.5, 4, 3); c.fillRect(6, -1.5, 4, 3);
      c.fillStyle = k.c || '#c0392b'; rr(c, -8, -4, 16, 8, 3);
    } else if (k.auto) {
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-k.l / 2 + 2, -k.w / 2 + 3, k.l, k.w);
      c.fillStyle = '#2d9c3c'; rr(c, -k.l / 2, -k.w / 2, k.l, k.w, 5);
      c.fillStyle = '#f2c14e'; rr(c, -k.l / 2 + 3, -k.w / 2 + 2, k.l - 9, k.w - 4, 3);
    } else {
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-k.l / 2 + 2, -k.w / 2 + 3, k.l, k.w);
      c.fillStyle = k.c; rr(c, -k.l / 2, -k.w / 2, k.l, k.w, 4);
      c.fillStyle = 'rgba(20,30,50,.65)'; c.fillRect(k.l / 2 - (k.bus ? 6 : 11), -k.w / 2 + 2, k.bus ? 4 : 5, k.w - 4);
      if (!k.bus) c.fillRect(-k.l / 2 + 4, -k.w / 2 + 2, 4, k.w - 4);
      else { c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = -k.l / 2 + 4; i < k.l / 2 - 10; i += 8) c.fillRect(i, -k.w / 2 + 1, 5, 2); }
      c.fillStyle = '#ffe9a8'; c.fillRect(k.l / 2 - 2, -k.w / 2 + 2, 2, 3); c.fillRect(k.l / 2 - 2, k.w / 2 - 5, 2, 3);
    }
    c.restore();
  }

  function idHash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h >>> 0; }

  function drawBuilding(c, b, night) {
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(b.x + 7, b.y + 7, b.w, b.h);
    c.fillStyle = b.color; c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(b.x, b.y, b.w, 8);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    if (b.type !== 'metro') {
      let h = idHash(b.id);
      for (let yy = b.y + 18; yy < b.y + b.h - 24; yy += 22) {
        for (let xx = b.x + 12; xx < b.x + b.w - 14; xx += 20) {
          h = (h * 1103515245 + 12345) >>> 0;
          const lit = night && (h >> 16) % 3 !== 0;
          c.fillStyle = lit ? 'rgba(255,220,120,.95)' : 'rgba(40,60,90,.28)';
          c.fillRect(xx, yy, 9, 10);
        }
      }
    }
    if (b.filler) return;
    c.fillStyle = '#5a3a22'; c.fillRect(b.x + b.w / 2 - 10, b.y + b.h - 9, 20, 9);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(b.x + b.w / 2 - 28, b.y + b.h + 2, 56, 4);
  }

  function drawLabel(c, text, x, y, size, color = '#fff') {
    c.font = `700 ${size}px system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.65)'; c.strokeText(text, x, y);
    c.fillStyle = color; c.fillText(text, x, y);
  }

  function darkness() {
    const h = hourF(S.time);
    if (h >= 7 && h < 17.5) return 0;
    if (h >= 17.5 && h < 20) return ((h - 17.5) / 2.5) * 0.55;
    if (h >= 5 && h < 7) return ((7 - h) / 2) * 0.55;
    return 0.55;
  }

  function render() {
    const P = S.player;
    const vw = VW / ZOOM, vh = VH / ZOOM;
    const focus = ride && ride.status === 'onboard' ? ride.car : P;
    cam.x = vw >= WORLD.w ? (WORLD.w - vw) / 2 : clamp(focus.x - vw / 2, 0, WORLD.w - vw);
    cam.y = vh >= WORLD.h ? (WORLD.h - vh) / 2 : clamp(focus.y - vh / 2, 0, WORLD.h - vh);
    const x0 = cam.x, y0 = cam.y, x1 = cam.x + vw, y1 = cam.y + vh;
    const vis = (x, y, w, h) => x + w > x0 && x < x1 && y + h > y0 && y < y1;
    const dark = darkness(), night = dark > 0.3;

    ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, -cam.x * DPR * ZOOM, -cam.y * DPR * ZOOM);
    ctx.fillStyle = '#c9c6b6'; ctx.fillRect(x0, y0, vw, vh);
    for (const d of DISTRICTS) if (vis(d.x, d.y, d.w, d.h)) {
      ctx.fillStyle = d.color; ctx.fillRect(d.x, d.y, d.w, d.h);
      if (d.farm) { ctx.strokeStyle = 'rgba(90,110,40,.25)'; ctx.lineWidth = 2; for (let yy = Math.max(d.y, y0 - y0 % 24); yy < Math.min(d.y + d.h, y1); yy += 24) { ctx.beginPath(); ctx.moveTo(d.x, yy); ctx.lineTo(d.x + d.w, yy); ctx.stroke(); } }
    }
    for (const b of BUILDINGS) if (!b.solid && vis(b.x, b.y, b.w, b.h)) {
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.setLineDash([14, 10]);
      ctx.strokeRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28); ctx.setLineDash([]);
      if (b.park === 'cricket') { ctx.fillStyle = '#d9c38c'; ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 - 50, 20, 100); }
    }

    // roads
    const roadCol = (r) => (r.hw ? '#43464d' : '#55585f');
    for (const r of ROADS_V) if (vis(r.x - r.w / 2, 0, r.w, WORLD.h)) {
      ctx.fillStyle = '#9a978c'; ctx.fillRect(r.x - r.w / 2 - 6, y0, r.w + 12, vh);
      ctx.fillStyle = roadCol(r); ctx.fillRect(r.x - r.w / 2, y0, r.w, vh);
    }
    for (const r of ROADS_H) if (vis(0, r.y - r.w / 2, WORLD.w, r.w)) {
      ctx.fillStyle = '#9a978c'; ctx.fillRect(x0, r.y - r.w / 2 - 6, vw, r.w + 12);
      ctx.fillStyle = roadCol(r); ctx.fillRect(x0, r.y - r.w / 2, vw, r.w);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([22, 18]);
    for (const r of ROADS_V) if (vis(r.x - r.w / 2, 0, r.w, WORLD.h)) { ctx.beginPath(); ctx.moveTo(r.x, y0 - (y0 % 40)); ctx.lineTo(r.x, y1); ctx.stroke(); }
    for (const r of ROADS_H) if (vis(0, r.y - r.w / 2, WORLD.w, r.w)) { ctx.beginPath(); ctx.moveTo(x0 - (x0 % 40), r.y); ctx.lineTo(x1, r.y); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const rv of ROADS_V) for (const rh of ROADS_H) {
      const ix = rv.x - rv.w / 2, iy = rh.y - rh.w / 2;
      if (!vis(ix - 30, iy - 30, rv.w + 60, rh.w + 60)) continue;
      ctx.fillStyle = roadCol(rv.hw ? rv : rh); ctx.fillRect(ix, iy, rv.w, rh.w);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let k = 4; k < rv.w - 4; k += 10) { ctx.fillRect(ix + k, iy - 16, 6, 12); ctx.fillRect(ix + k, iy + rh.w + 4, 6, 12); }
      for (let k = 4; k < rh.w - 4; k += 10) { ctx.fillRect(ix - 16, iy + k, 12, 6); ctx.fillRect(ix + rv.w + 4, iy + k, 12, 6); }
    }
    if (S.weather === 'rain') { ctx.fillStyle = 'rgba(110,140,170,.55)'; for (const p of puddles) if (vis(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)) { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); } }
    for (const nk of NAKAS) if (vis(nk.x - 40, nk.y - 40, 80, 80)) {
      ctx.fillStyle = '#ff7b00'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(nk.x + k * 18 - 5, nk.y + 6); ctx.lineTo(nk.x + k * 18, nk.y - 8); ctx.lineTo(nk.x + k * 18 + 5, nk.y + 6); ctx.fill(); }
      drawPerson(ctx, nk.x + 30, nk.y, { skin: '#c98f62', hair: '#1b1410', hairStyle: 'cap', shirt: '#d8c8a0', pants: '#7a6248' }, 0, 1);
    }
    for (const r of ROADS_V) for (let yy = 500; yy < WORLD.h; yy += 900) if (vis(r.x - 40, yy - 60, 80, 120)) {
      ctx.save(); ctx.translate(r.x, yy); ctx.rotate(-Math.PI / 2); drawLabel(ctx, r.name, 0, 0, 13, '#ffe9a8'); ctx.restore();
    }
    for (const r of ROADS_H) for (let xx = 560; xx < WORLD.w; xx += 900) if (vis(xx - 80, r.y - 20, 160, 40)) drawLabel(ctx, r.name, xx, r.y, 13, '#ffe9a8');

    // traffic
    for (const c of cars) {
      const p = carXY(c);
      if (!vis(p.x - 40, p.y - 40, 80, 80)) continue;
      const ang = c.t === 'v' ? (c.lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.lane > 0 ? 0 : Math.PI);
      drawVehicle(ctx, p.x, p.y, ang, c);
    }
    // trees
    for (const t of trees) if (vis(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2)) {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(t.x + 4, t.y + 4, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.c; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    }
    // buildings
    for (const b of FILLERS) if (vis(b.x - 10, b.y - 10, b.w + 30, b.h + 30)) drawBuilding(ctx, b, night);
    for (const b of BUILDINGS) if (b.solid && vis(b.x - 10, b.y - 10, b.w + 30, b.h + 30)) drawBuilding(ctx, b, night);
    for (const c of GOLDEN_CHAI) if (!S.chai.includes(c.id) && vis(c.x - 20, c.y - 20, 40, 40)) {
      const bob = Math.sin(performance.now() / 250 + c.x) * 3;
      ctx.fillStyle = 'rgba(255,215,0,.35)'; ctx.beginPath(); ctx.arc(c.x, c.y, 16, 0, Math.PI * 2); ctx.fill();
      drawLabel(ctx, '☕', c.x, c.y - 4 + bob, 18, '#ffd700');
    }
    if (race && !race.countdown) { const [rx, ry] = race.r.pts[race.idx]; ctx.strokeStyle = '#ff7b00'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(rx, ry, 50, 0, Math.PI * 2); ctx.stroke(); }
    if (S.driver.trip && S.driver.trip.stage === 'pickup') { const t = S.driver.trip; drawPerson(ctx, t.pu.x, t.pu.y, { skin: '#c98f62', hair: '#1b1410', hairStyle: 'long', shirt: '#22a06b', pants: '#2f3a56' }, 0); drawLabel(ctx, '🙋', t.pu.x, t.pu.y - 32, 16); }
    // waypoint
    if (S.waypoint && vis(S.waypoint.x - 40, S.waypoint.y - 60, 80, 80)) {
      const t = performance.now() / 300, wp = S.waypoint;
      ctx.strokeStyle = '#ff3d71'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(wp.x, wp.y, 16 + Math.sin(t) * 3, 8 + Math.sin(t) * 1.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff3d71'; ctx.beginPath(); ctx.moveTo(wp.x, wp.y - 6); ctx.lineTo(wp.x - 9, wp.y - 26); ctx.lineTo(wp.x + 9, wp.y - 26); ctx.fill();
      ctx.beginPath(); ctx.arc(wp.x, wp.y - 30, 10, 0, Math.PI * 2); ctx.fill();
    }
    // npcs
    for (const n of npcs) if (vis(n.x - 20, n.y - 30, 40, 50)) {
      drawPerson(ctx, n.x, n.y, n.look, n.wait > 0 ? 0 : n.phase);
      if (S.quests[n.name]) drawLabel(ctx, '❗', n.x, n.y - 32, 16);
      else if ((S.friends[n.name] || {}).fs >= 30) drawLabel(ctx, '♥', n.x, n.y - 30, 12, '#ff6f91');
    }
    // ride
    if (ride && ride.car) {
      const T = RIDE_TYPES[ride.type];
      const c = ride.car, a = c.ang || 0;
      const ox = Math.sin(a) * 12, oy = -Math.cos(a) * 12;
      const kind = { c: T.color, l: T.len, w: T.wid, two: ride.type === 'bike', auto: ride.type === 'auto' };
      if (ride.status !== 'onboard') {
        ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x + ox, c.y + oy, 26, 0, Math.PI * 2); ctx.stroke();
      }
      drawVehicle(ctx, c.x + ox, c.y + oy, a, kind);
      if (ride.type === 'bike') drawPerson(ctx, c.x + ox, c.y + oy - 4, { skin: '#c98f62', hair: '#1b1410', hairStyle: 'cap', shirt: '#f4a300', pants: '#333' }, 0, 0.9);
      if (ride.status !== 'onboard') drawLabel(ctx, `Your ${RIDE_APPS[ride.app].name}`, c.x, c.y - 30, 12, '#ffd400');
    }
    // player
    if (!(ride && ride.status === 'onboard')) {
      if (P.riding) {
        const V = VEHICLES[P.riding];
        drawVehicle(ctx, P.x, P.y + 4, P.ang, V.two ? { two: true, c: P.riding === 'ebike' ? '#f2c14e' : '#c0392b' } : { c: '#e8e8e8', l: 34, w: 18 });
        if (V.two) drawPerson(ctx, P.x, P.y, P.look, 0);
      } else drawPerson(ctx, P.x, P.y, P.look, P.moving ? P.phase : 0);
      drawLabel(ctx, P.name, P.x, P.y - 32, 11, '#fff');
      if (S.pet) { const a = P.ang || 0; drawLabel(ctx, '🐕', P.x - Math.cos(a) * 22 + 10, P.y - Math.sin(a) * 22 + 4, 16); }
    }
    // labels
    for (const b of BUILDINGS) if (vis(b.x - 60, b.y - 20, b.w + 120, b.h + 40)) {
      const cy = b.solid ? b.y + b.h / 2 : b.y + 34;
      drawLabel(ctx, TYPE_ICON[b.type], b.x + b.w / 2, cy - 14, 18);
      drawLabel(ctx, b.name, b.x + b.w / 2, cy + 8, 12);
    }
    for (const d of DISTRICTS) {
      const cx = d.x + d.w / 2, cy = d.y + d.h - 26;
      if (vis(cx - 150, cy - 20, 300, 40)) { ctx.globalAlpha = 0.55; drawLabel(ctx, d.name.toUpperCase(), cx, cy, 18, '#fff'); ctx.globalAlpha = 1; }
    }

    // screen-space effects
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (S.aqi > 250 && S.weather !== 'rain') { ctx.fillStyle = `rgba(190,170,140,${Math.min(0.22, (S.aqi - 250) / 600)})`; ctx.fillRect(0, 0, VW, VH); }
    if (dark > 0) { ctx.fillStyle = `rgba(10,15,45,${dark})`; ctx.fillRect(0, 0, VW, VH); }
    if (S.weather === 'rain') {
      ctx.strokeStyle = 'rgba(200,220,255,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 110; i++) { const x = Math.random() * VW, y = Math.random() * VH; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); }
      ctx.stroke();
    }
    // waypoint arrow
    if (S.waypoint) {
      const sx = (S.waypoint.x - cam.x) * ZOOM, sy = (S.waypoint.y - cam.y) * ZOOM;
      if (sx < 0 || sy < 0 || sx > VW || sy > VH) {
        const cx = VW / 2, cy = VH / 2, a = Math.atan2(sy - cy, sx - cx);
        const R = Math.min(VW, VH) / 2 - 60;
        const ax = cx + Math.cos(a) * R, ay = cy + Math.sin(a) * R;
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
        ctx.fillStyle = '#ff3d71'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.fill();
        ctx.restore();
        const km = dist(focus.x, focus.y, S.waypoint.x, S.waypoint.y) / PX_PER_KM;
        drawLabel(ctx, `${km.toFixed(1)} km`, ax - Math.cos(a) * 26, ay - Math.sin(a) * 26, 12);
      }
    }
    drawMinimap();
  }

  function render3D() {
    const P = S.player, onboard = !!(ride && ride.status === 'onboard');
    const focus = onboard ? ride.car : P;
    window.GGL3D.render({
      P, focus, onboard, followAng: onboard ? ride.car.ang : null, ride, rideType: ride ? RIDE_TYPES[ride.type] : null,
      cars, npcs, carXY, quests: S.quests, waypoint: S.waypoint,
      hour: hourF(S.time), dark: darkness(), rain: S.weather === 'rain', aqi: S.aqi,
      vehTwo: P.riding ? VEHICLES[P.riding].two : false, pet: !!S.pet,
      chai: S.chai, checkpoint: race && !race.countdown ? race.r.pts[race.idx] : null,
      passenger: S.driver.trip && S.driver.trip.stage === 'pickup' ? S.driver.trip.pu : null,
    });
    drawMinimap();
  }

  const mm = $('#minimap'), mctx = mm.getContext('2d');
  function drawMinimap() {
    const W = mm.width, H = mm.height, P = S.player;
    const focus = ride && ride.status === 'onboard' ? ride.car : P;
    const span = 1500, sw = span * (W / H) > WORLD.w ? WORLD.w : span * (W / H);
    const sx = clamp(focus.x - sw / 2, 0, WORLD.w - sw), sy = clamp(focus.y - span / 2, 0, WORLD.h - span);
    mctx.drawImage(thumb, sx * TH, sy * TH, sw * TH, span * TH, 0, 0, W, H);
    const tx = (x) => ((x - sx) / sw) * W, ty = (y) => ((y - sy) / span) * H;
    const dot = (x, y, col, r) => { mctx.fillStyle = col; mctx.beginPath(); mctx.arc(tx(x), ty(y), r, 0, Math.PI * 2); mctx.fill(); };
    if (S.home) { const d = door(BLD[HOMES[S.home.key].building]); dot(d.x, d.y, '#0f9d58', 4); }
    if (S.job) { const d = door(BLD[JOBS[S.job.id].building]); dot(d.x, d.y, '#2563eb', 4); }
    if (S.waypoint) dot(S.waypoint.x, S.waypoint.y, '#ff3d71', 5);
    if (ride && ride.car && ride.status !== 'onboard') dot(ride.car.x, ride.car.y, '#ffd400', 4);
    if (use3D) {
      const yaw = window.GGL3D.yaw, cx = tx(focus.x), cy = ty(focus.y);
      mctx.fillStyle = 'rgba(255,255,255,.35)'; mctx.beginPath(); mctx.moveTo(cx, cy);
      mctx.arc(cx, cy, 26, yaw - 0.5, yaw + 0.5); mctx.closePath(); mctx.fill();
    }
    mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; dot(focus.x, focus.y, '#ff8a3d', 5); mctx.beginPath(); mctx.arc(tx(focus.x), ty(focus.y), 5, 0, Math.PI * 2); mctx.stroke();
  }

  // ---------- HUD ----------
  function setBar(id, v) {
    const el = $(id); el.style.width = v + '%';
    el.className = v < 25 ? 'low' : v < 50 ? 'mid' : '';
  }
  function updateHUD() {
    if (!S) return;
    const P = S.player, d = dayOf(S.time);
    $('#hud-time').textContent = `${weekday(d)} · Day ${d} · ${clock(S.time)}${isPeak() ? ' · 🚦 Peak' : ''}`;
    $('#hud-weather').textContent = S.weather === 'rain' ? '🌧️ Rain' : `${hourF(S.time) > 6 && hourF(S.time) < 19 ? '☀️' : '🌙'} AQI ${S.aqi}`;
    $('#hud-money').textContent = inr(P.money);
    $('#hud-lvl').innerHTML = `⭐ Lv ${S.level} · ${titleFor(S.level)}<i class="xpbar"><s style="width:${Math.min(100, (S.xp / xpNeed(S.level)) * 100)}%"></s></i>`;
    $('#btn-gift').classList.toggle('dot', rewardsPending());
    $('#hud-money').style.color = P.money < 0 ? '#ff8f8f' : '';
    setBar('#bar-health', P.health); setBar('#bar-hunger', P.hunger); setBar('#bar-energy', P.energy); setBar('#bar-social', P.social);
    $('#hud-loc').textContent = '📍 ' + (ride && ride.status === 'onboard' ? `In a ${RIDE_TYPES[ride.type].label} · ${placeName(ride.car.x, ride.car.y)}` : placeName(P.x, P.y)) + (P.riding ? ` · 🛵 ${VEHICLES[P.riding].name}` : '') + (S.waypoint ? ` · 📌 ${(dist(focus0().x, focus0().y, S.waypoint.x, S.waypoint.y) / PX_PER_KM).toFixed(1)} km` : '');
    $('#hud-task').innerHTML = taskText();
    $('#btn-veh').classList.toggle('off', !bestVehicle());
    $('#ph-time').textContent = clock(S.time);
  }
  function focus0() { return ride && ride.status === 'onboard' ? ride.car : S.player; }
  function taskText() {
    if (ride) {
      if (ride.status === 'searching') return `🔎 ${RIDE_APPS[ride.app].name}: looking for a driver…`;
      if (ride.status === 'arriving') return `🚕 ${ride.driver.name} is arriving · ${ride.driver.plate} — wait near the road`;
      if (ride.status === 'waiting') return `📍 ${ride.driver.name} is waiting (yellow ring). Walk up and press E`;
      return `🚗 Riding to ${esc(ride.dest.label)}`;
    }
    if (race) return race.countdown ? '🏁 Get ready…' : `🏁 ${race.r.name} · checkpoint ${race.idx + 1}/${race.r.pts.length} · ${fmtSec((performance.now() - race.t0) / 1000)}`;
    if (S.driver.trip) return S.driver.trip.stage === 'pickup' ? `🙋 Pick up ${S.driver.trip.name} at ${esc(S.driver.trip.pu.label)}` : `🚘 Drop ${S.driver.trip.name} at ${BLD[S.driver.trip.bid].name} · ${inr(S.driver.trip.fare)}`;
    if (S.gig) { const left = Math.round(S.gig.allowed - (S.time - S.gig.start)); return `📦 Deliver ${esc(S.gig.item)} to ${BLD[S.gig.bid].name} · ${left > 0 ? left + ' min left' : 'LATE'}`; }
    if (S.errand) return `❗ Errand for ${S.errand.npc}: ${esc(S.errand.label)} → ${BLD[S.errand.bid].name}`;
    if (S.player.hunger < 20) return '🍛 You\'re starving! Eat something (or order on Bhookh).';
    if (S.player.energy < 20) return '⚡ You\'re exhausted. Head home and sleep.';
    if (S.job && !JOBS[S.job.id].flexible) {
      const J = JOBS[S.job.id], h = hourF(S.time), until = (J.start - h + 24) % 24;
      if (until < 3 && S.time - S.job.lastShiftAt > 12 * 60) return `🕘 Shift at ${BLD[J.building].name} starts ${fmtHour(J.start)} (${until < 1 ? 'soon!' : `in ${Math.floor(until)}h`})`;
    }
    if (S.rival && !S.rival.beaten) return `⚔️ Beat ${esc(S.rival.name)}: Life Score ${lifeScore()} / ${S.rival.score}`;
    const g = GOALS.find((x) => !S.goals[x.id]);
    return g ? `🏆 ${g.t} — <small>${g.d}</small>` : '🏆 All goals done. You\'re a true Gurugramite!';
  }

  // ---------- phone ----------
  const APPS = [
    { id: 'chalo', name: 'Chalo', ico: '🚕', bg: '#14161c' },
    { id: 'phatphat', name: 'PhatPhat', ico: '🏍️', bg: '#ffcc00' },
    { id: 'bhookh', name: 'Bhookh', ico: '🍱', bg: '#e23744' },
    { id: 'kaam', name: 'KaamDhanda', ico: '💼', bg: '#2563eb' },
    { id: 'roof', name: 'RoofRaja', ico: '🏠', bg: '#0f9d58' },
    { id: 'pay', name: 'PayKaro', ico: '💸', bg: '#5f259f' },
    { id: 'yaari', name: 'Yaari', ico: '👥', bg: '#ff6f61' },
    { id: 'maps', name: 'Maps', ico: '🗺️', bg: '#34a853' },
    { id: 'goals', name: 'Goals', ico: '🏆', bg: '#f59e0b' },
    { id: 'me', name: 'Profile', ico: '🧑', bg: '#64748b' },
    { id: 'reelz', name: 'Reelz', ico: '📸', bg: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)' },
    { id: 'dhandha', name: 'Dhandha', ico: '🏪', bg: '#16a34a' },
    { id: 'trade', name: 'Paisa Trade', ico: '📈', bg: '#0b3d2e' },
    { id: 'rewards', name: 'Rewards', ico: '🎁', bg: '#f43f5e' },
    { id: 'share', name: 'Share', ico: '📣', bg: '#0f172a' },
    { id: 'help', name: 'Help', ico: '❓', bg: '#0ea5e9' },
    { id: 'settings', name: 'Settings', ico: '⚙️', bg: '#374151' },
  ];
  const phoneBody = $('#phone-body');
  function openPhone(app, ...args) {
    if (busy) return;
    closeModal(); closeMap();
    $('#phone').classList.remove('hidden');
    if (app) openApp(app, ...args); else phoneHome();
  }
  function closePhone() { $('#phone').classList.add('hidden'); }
  $('#phone').addEventListener('click', (e) => { if (e.target.id === 'phone') closePhone(); });
  $('#phone-home').onclick = () => phoneHome();

  function phoneHome() {
    phoneBody.innerHTML = '<div class="apps"></div>';
    const g = phoneBody.firstChild;
    for (const a of APPS) {
      const b = document.createElement('button');
      b.className = 'app-ico';
      b.innerHTML = `<span style="background:${a.bg}">${a.ico}</span>${a.name}`;
      b.onclick = () => openApp(a.id);
      g.appendChild(b);
    }
  }
  function appShell(id, title) {
    const a = APPS.find((x) => x.id === id);
    const fg = id === 'phatphat' ? '#14161c' : '#fff';
    phoneBody.innerHTML = `<div class="app-head" style="background:${a.bg};color:${fg}"><button>‹</button><b>${a.ico} ${title || a.name}</b></div><div class="app-pad"></div>`;
    phoneBody.querySelector('.app-head button').onclick = phoneHome;
    phoneBody.scrollTop = 0;
    return phoneBody.querySelector('.app-pad');
  }
  function openApp(id, ...args) {
    if (args[0] && (id === 'chalo' || id === 'phatphat')) return rideQuote(id, args[0]);
    ({ chalo: rideApp, phatphat: rideApp, bhookh: bhookhApp, kaam: kaamApp, roof: roofApp, pay: payApp, yaari: yaariApp, goals: goalsApp, me: meApp, settings: settingsApp,
      maps: () => { closePhone(); openMap(); }, help: () => openHelp(), reelz: reelzApp, dhandha: dhandhaApp, trade: () => tradeApp(), rewards: () => openRewards(), share: () => openShare() })[id](id, ...args);
  }

  function placeGroups() {
    const groups = {};
    for (const b of BUILDINGS) {
      const dn = districtAt(b.x + b.w / 2, b.y + b.h / 2).name;
      (groups[dn] = groups[dn] || []).push(b);
    }
    return groups;
  }
  function destFor(b) { const d = door(b); return { x: d.x, y: d.y, door: d, label: b.name }; }

  function rideApp(id) {
    const app = RIDE_APPS[id];
    const pad = appShell(id);
    if (ride) {
      if (ride.app !== id) { fillList(pad, [{ note: `You have an active ride on ${RIDE_APPS[ride.app].name}.` }, { icon: '↗️', label: `Open ${RIDE_APPS[ride.app].name}`, onClick: () => openApp(ride.app) }]); return; }
      const T = RIDE_TYPES[ride.type];
      const st = { searching: 'Finding your driver…', arriving: 'Driver on the way to pickup', waiting: 'Driver has arrived — walk to the yellow ring', onboard: 'Trip in progress' }[ride.status];
      fillList(pad, [
        { html: `<div class="note blue"><div class="big">${T.icon} ${st}</div>${ride.driver ? `<b>${ride.driver.name}</b> · ${ride.driver.rating}★ · <b>${ride.driver.plate}</b>` : ''}<br>To: <b>${esc(ride.dest.label)}</b> · Fare <b>${inr(ride.fare)}</b> (PayKaro)<br><small>Close the phone to keep playing — the city pauses while it's open.</small></div>` },
        ride.status !== 'onboard' && { icon: '❌', label: 'Cancel ride', sub: ride.status === 'searching' ? 'Free' : '₹50 cancellation fee', onClick: () => { cancelRide(); rideApp(id); } },
        ride.driver && { icon: '📞', label: `Call ${ride.driver.name}`, onClick: () => toast(`${ride.driver.name}: "${pick(['Haan ji, bas 2 minute!', 'Location bhej do please.', 'Main gate pe hoon, sir/ma\'am.', 'Traffic hai thoda, aa raha hoon.'])}"`) },
      ]);
      return;
    }
    pad.insertAdjacentHTML('beforeend', `<div class="note" style="background:${app.bg};color:${app.fg};border:0"><b>${app.name}</b> — ${app.tag}${surge() > 1 ? `<br>⚡ Surge ${surge().toFixed(1)}× right now (${isPeak() ? 'peak hours' : ''}${isPeak() && S.weather === 'rain' ? ' + ' : ''}${S.weather === 'rain' ? 'rain' : ''})` : ''}</div>`);
    pad.insertAdjacentHTML('beforeend', `<input class="search" placeholder="🔍 Where to?">`);
    const quick = [];
    if (S.home) quick.push({ icon: '🏠', label: 'Home', sub: BLD[HOMES[S.home.key].building].name, onClick: () => rideQuote(id, destFor(BLD[HOMES[S.home.key].building])) });
    if (S.job) quick.push({ icon: '💼', label: 'Work', sub: BLD[JOBS[S.job.id].building].name, onClick: () => rideQuote(id, destFor(BLD[JOBS[S.job.id].building])) });
    if (S.waypoint) quick.push({ icon: '📌', label: 'Waypoint', sub: S.waypoint.label, onClick: () => rideQuote(id, { x: S.waypoint.x, y: S.waypoint.y, label: S.waypoint.label }) });
    quick.push({ icon: '🗺️', label: 'Pick a spot on the map', onClick: () => { closePhone(); openMap({ pick: (pt) => openPhone(id, pt) }); } });
    fillList(pad, quick);
    const listEl = document.createElement('div');
    listEl.className = 'app-pad'; listEl.style.padding = '0';
    pad.appendChild(listEl);
    const groups = placeGroups();
    const draw = (q) => {
      listEl.innerHTML = '';
      const items = [];
      for (const [dn, bs] of Object.entries(groups)) {
        const m = bs.filter((b) => !q || b.name.toLowerCase().includes(q) || dn.toLowerCase().includes(q));
        if (!m.length) continue;
        items.push({ section: dn }, ...m.map((b) => ({ icon: TYPE_ICON[b.type], label: b.name, sub: `${(dist(S.player.x, S.player.y, door(b).x, door(b).y) / PX_PER_KM).toFixed(1)} km away`, onClick: () => rideQuote(id, destFor(b)) })));
      }
      fillList(listEl, items);
    };
    draw('');
    pad.querySelector('.search').addEventListener('input', (e) => draw(e.target.value.trim().toLowerCase()));
  }
  function rideQuote(id, dest) {
    const pad = appShell(id, 'Choose a ride');
    const qs = quotes(id, dest);
    fillList(pad, [
      { note: `📍 From <b>${esc(placeName(S.player.x, S.player.y))}</b><br>🏁 To <b>${esc(dest.label)}</b> · ${qs[0].km.toFixed(1)} km` },
      qs[0].surge > 1 && { note: `⚡ Surge pricing ${qs[0].surge.toFixed(1)}× — ${S.weather === 'rain' ? 'it\'s raining' : 'peak traffic'}. Bike taxis surge less.` },
      ...qs.map((q) => { const T = RIDE_TYPES[q.type]; return { icon: T.icon, label: T.label, sub: `Pickup in ${q.eta} min · trip ~${q.mins} min`, right: inr(q.fare), disabled: S.player.money < q.fare, onClick: () => { bookRide(id, q, dest); rideApp(id); } }; }),
      { note: `Balance ${inr(S.player.money)} · paid automatically via PayKaro on arrival.`, blue: true },
      { icon: '‹', label: 'Change destination', onClick: () => rideApp(id) },
    ]);
  }

  function bhookhApp() {
    const pad = appShell('bhookh');
    fillList(pad, [{ note: `Hungry? Hunger ${Math.round(S.player.hunger)}/100. Delivered anywhere in ~30 min. Prices include delivery.${S.weather === 'rain' ? ' 🌧️ Rain delays expected.' : ''}` }]);
    for (const b of BUILDINGS.filter((x) => x.menu && x.type !== 'job')) {
      fillList(pad, [{ icon: '🍽️', label: b.name, sub: districtAt(b.x, b.y).name, onClick: () => {
        const p2 = appShell('bhookh', b.name);
        fillList(p2, [...foodItems(b.menu, true), { icon: '‹', label: 'Back to restaurants', onClick: bhookhApp }]);
      } }]);
    }
    if (S.orders.length) fillList(pad, [{ section: 'On the way' }, ...S.orders.map((o) => ({ icon: '🛵', label: o.name, sub: `Arrives ~${clock(o.at)}` }))]);
  }

  function kaamApp() {
    const pad = appShell('kaam');
    const items = [];
    if (S.job) {
      const J = JOBS[S.job.id], b = BLD[J.building];
      items.push({ section: 'Your job' }, { html: `<div class="note blue"><b>${J.title}</b> at ${b.name}<br>${J.flexible ? 'Flexible hours' : `Shift ${fmtHour(J.start)} – ${fmtHour(J.start + J.hours)}`} · ${inr(J.pay * (1 + 0.15 * S.job.level))}/shift<br>Shifts: ${S.job.shifts} · Level ${S.job.level} · Warnings ${S.job.missed}/3</div>` },
        { icon: '📌', label: 'Navigate to work', onClick: () => { setWaypoint(door(b), b.name); closePhone(); toast('Waypoint set.'); } },
        { icon: '🚕', label: 'Book a ride to work', onClick: () => rideQuote('chalo', destFor(b)) },
        { icon: '🚪', label: 'Resign', onClick: () => { S.job = null; toast('You resigned.'); kaamApp(); } });
    }
    items.push({ section: 'Gig work' }, S.zipzap
      ? { icon: '📦', label: S.gig ? `Active: deliver to ${BLD[S.gig.bid].name}` : 'Accept a ZipZap delivery order', sub: `${S.stats.deliveries} delivered so far`, disabled: !!S.gig || hourF(S.time) < 8 || hourF(S.time) >= 23, onClick: startGig }
      : { icon: '📦', label: 'ZipZap delivery partner', sub: 'Register at the ZipZap hub on Sohna Road. Paid per order.', onClick: () => { setWaypoint(door(BLD.zipzap), BLD.zipzap.name); closePhone(); toast('Waypoint set to ZipZap hub.'); } });
    const mv = myVehicle();
    items.push({ icon: S.driver.online ? '🟢' : '🚘', label: S.driver.online ? `Online as a driver · ${S.driver.trip ? 'on a trip' : 'waiting for requests'}` : 'Drive passengers for Chalo / PhatPhat',
      sub: mv ? `${S.driver.trips} trips · ${S.driver.rating}★ · uses your ${VEHICLES[mv].name}. ${S.driver.online ? 'Tap to go offline.' : 'Tap to go online.'}` : 'Needs your own scooter, bike or car (Raftaar Motors)', disabled: !mv && !S.driver.online,
      onClick: () => { driverToggle(); kaamApp(); } });
    items.push({ section: 'Openings' }, ...Object.keys(JOBS).map(jobItem));
    items.push({ note: `Your skills — Coding ${S.player.skills.coding.toFixed(1)} · Communication ${S.player.skills.comm.toFixed(1)} · Fitness ${S.player.skills.fitness.toFixed(1)} · Style ${styleScore().toFixed(1)}`, blue: true });
    fillList(pad, items);
  }

  function roofApp() {
    const pad = appShell('roof');
    const items = [];
    if (S.home) {
      const H = HOMES[S.home.key], b = BLD[H.building];
      items.push({ section: 'Your home' }, { html: `<div class="note blue"><b>${H.title}</b> · ${b.name}<br>Rent ${inr(H.rent)}/week · next due Day ${S.home.nextDue}${S.home.overdue ? ` · ⚠️ ${S.home.overdue} day(s) overdue` : ''}<br>Deposit held: ${inr(S.home.deposit)}</div>` },
        { icon: '📌', label: 'Navigate home', onClick: () => { setWaypoint(door(b), b.name); closePhone(); toast('Waypoint set.'); } });
    } else items.push({ note: 'You are homeless! Sleeping on park benches is rough. Rent a place below.' });
    items.push({ section: 'Listings (first week + 1 week deposit)' }, ...Object.keys(HOMES).map(homeItem));
    fillList(pad, items);
  }

  function payApp() {
    const pad = appShell('pay');
    fillList(pad, [
      { html: `<div class="note blue"><small>Wallet balance</small><div class="big">${inr(S.player.money)}</div><small>Savings at Paisa Bank: ${inr(S.player.savings)}</small></div>` },
      { section: 'Recent transactions' },
      ...(S.txns.length ? S.txns.map((t) => ({ icon: t.amt >= 0 ? '⬇️' : '⬆️', label: t.label, sub: `Day ${dayOf(t.t)} · ${clock(t.t)}`, right: t.amt ? `<span style="color:${t.amt > 0 ? 'var(--good)' : 'var(--bad)'}">${t.amt > 0 ? '+' : ''}${inr(t.amt)}</span>` : '' })) : [{ note: 'No transactions yet.' }]),
    ]);
  }

  function yaariApp() {
    const pad = appShell('yaari');
    const known = Object.entries(S.friends).sort((a, b) => b[1].fs - a[1].fs);
    if (!known.length) { fillList(pad, [{ note: 'No contacts yet. Walk up to people around the city and press E to chat!' }]); return; }
    fillList(pad, [{ note: `${friendCount()} friend(s) · Social ${Math.round(S.player.social)}/100${S.partner ? ` · 💞 with ${esc(S.partner.name)}` : ''}${S.pet ? ` · 🐕 ${S.pet.name}` : ''}` },
      S.partner && { icon: '💞', label: `Date night with ${S.partner.name}`, sub: '2.5h · Social +60 · once a day', right: '₹1,200', disabled: S.partner.lastDate === dayOf(S.time), onClick: dateNight },
      ...known.filter(([name, f]) => f.fs >= 70 && !S.partner).map(([name]) => ({ icon: '💞', label: `Ask ${name} out`, sub: 'You two are close. Take the chance?', right: '₹1,500', onClick: () => askOut(name) })),
      ...known.map(([name, f]) => {
      const occ = (NPC_NAMES.find((n) => n[0] === name) || [])[1] || '';
      const today = dayOf(S.time);
      return { icon: f.fs >= 30 ? '💛' : '🙂', label: name, sub: `${occ} · <span class="progress" style="display:block"><s style="width:${f.fs}%"></s></span>`, right: f.lastCall === today ? 'Called' : '📞',
        disabled: f.lastCall === today, onClick: () => { f.lastCall = today; addFriend(name, 3); S.player.social = clamp(S.player.social + 6, 0, 100); toast(`📞 ${name}: "${pick(CHATTER)}"`); yaariApp(); } };
    })]);
  }

  function goalsApp() {
    const pad = appShell('goals');
    fillList(pad, GOALS.map((g) => ({ icon: S.goals[g.id] ? '✅' : '⬜', label: g.t, sub: g.d, right: inr(g.r) })));
  }

  function meApp() {
    const pad = appShell('me');
    const P = S.player;
    const bar = (k) => `<span class="progress" style="display:block"><s style="width:${(skillVal(k) / 5) * 100}%"></s></span>`;
    fillList(pad, [
      { html: `<div class="note blue"><div class="big">${esc(P.name)}</div>${S.job ? JOBS[S.job.id].title : 'Unemployed'} · ${S.home ? HOMES[S.home.key].title : 'No home'}<br>Net worth ${inr(P.money + P.savings)}</div>` },
      { section: 'Skills (max 5)' },
      ...['coding', 'comm', 'fitness', 'style'].map((k) => ({ icon: { coding: '💻', comm: '🗣️', fitness: '💪', style: '😎' }[k], label: `${SKILL_LABEL[k]} ${skillVal(k).toFixed(1)}`, sub: bar(k) })),
      { section: 'Stuff' },
      { icon: '🎒', label: 'Items', sub: P.items.length ? P.items.map((k) => ITEMS[k].name).join(', ') : 'Nothing yet' },
      { icon: '🛵', label: 'Vehicles', sub: [...P.vehicles.map((k) => VEHICLES[k].name), P.rental ? 'ZipZap e-bike (rental)' : ''].filter(Boolean).join(', ') || 'None — book rides or rent an e-bike' },
      { section: 'Stats' },
      { icon: '☕', label: `Golden Chai: ${S.chai.length}/${GOLDEN_CHAI.length} found`, sub: (() => { const n = nearestChaiHint(); return n ? `Nearest one is somewhere in ${n.district}, about ${n.km.toFixed(1)} km away` : 'You found them all!'; })() },
      { icon: '📈', label: `Portfolio ${inr(portfolio())}`, sub: `${S.driver.trips} passenger trips · ${S.driver.rating}★ driver` },
      { icon: '📊', label: `${S.stats.rides} rides · ${S.stats.deliveries} deliveries · ${S.stats.shifts} shifts`, sub: `${S.stats.km.toFixed(1)} km driven · ${friendCount()} friends` },
    ]);
  }

  function settingsApp() {
    const pad = appShell('settings');
    fillList(pad, [
      { icon: '💾', label: 'Save game', sub: 'Also autosaves every few seconds', onClick: () => { save(); toast('Game saved.', 'good'); } },
      { icon: '📖', label: 'Help guide', sub: 'Controls, navigation, money, daily life, tips', onClick: () => openHelp('controls') },
      { icon: '💡', label: `Tips & hints: ${store.tips === false ? 'Off' : 'On'}`, sub: 'Helpful pop-ups the first time things happen, plus an occasional tip', onClick: () => { store.tips = store.tips === false; saveStore(); settingsApp(); } },
      !isTouch() && { icon: '⌨️', label: `Key legend: ${store.legend === false ? 'Hidden' : 'Shown'}`, sub: 'The row of shortcut keys at the bottom left', onClick: () => { store.legend = store.legend === false; saveStore(); renderKeyLegend(); settingsApp(); } },
      use3D && { icon: '✨', label: `3D quality: ${{ high: 'High', medium: 'Medium', low: 'Low' }[window.GGL3D.quality]}`, sub: 'High = sharp shadows · Medium = lighter shadows · Low = fastest, for older phones',
        onClick: () => { const order = ['high', 'medium', 'low'], q = order[(order.indexOf(window.GGL3D.quality) + 1) % 3]; store.gfxq = q; saveStore(); window.GGL3D.setQuality(q); settingsApp(); toast(`3D quality set to ${q}.`); } },
      { icon: store.sound === false ? '🔇' : '🔊', label: `Sound effects: ${store.sound === false ? 'Off' : 'On'}`, onClick: () => { store.sound = store.sound === false; saveStore(); settingsApp(); } },
      { icon: '🔄', label: 'Replay first-time hints', onClick: () => { S.hints = {}; toast('Hints will show again as things come up.', 'good'); } },
      { icon: use3D ? '🧊' : '🗺️', label: `Graphics: ${use3D ? '3D city' : '2D classic'}`, sub: can3D() ? `Switch to ${use3D ? '2D classic (fastest, for older phones)' : '3D city'}` : '3D needs WebGL, which this device does not support',
        disabled: !can3D() && !use3D, onClick: () => { store.gfx = use3D ? '2d' : '3d'; saveStore(); setGraphics(store.gfx); settingsApp(); toast(`Graphics set to ${use3D ? '3D' : '2D'}.`); } },
      { icon: '🚪', label: 'Sign out', sub: `Signed in as ${esc(store.profiles[user].display)}`, onClick: signOut },
      { icon: '🗑️', label: 'Delete this save & start over', sub: 'Cannot be undone', onClick: () => {
        closePhone();
        showModal('Delete your progress?', 'Your character, money and home will be gone. This cannot be undone.', [
          { icon: '🗑️', label: 'Yes, delete my save', onClick: () => { store.profiles[user].save = null; saveStore(); running = false; S = null; closeModal(); openCreator(store.profiles[user].display); } },
          { icon: '↩️', label: 'Keep playing', onClick: closeModal },
        ]);
      } },
      { note: 'Gurugram Life is a work of fiction. All businesses, apps and brands are made up.', blue: true },
    ]);
  }

  function signOut() {
    save(); running = false; S = null; ride = null; user = null;
    closePhone(); closeModal(); closeMap();
    renderKeyLegend();
    renderProfiles();
    showScreen('screen-login');
  }

  // ---------- big map ----------
  const bm = $('#bigmap'), bctx = bm.getContext('2d');
  let mapMode = null, mapPick = null;
  function openMap(opts = {}) {
    if (busy) return;
    closeModal();
    mapMode = opts.pick || null; mapPick = null;
    $('#mapview').classList.remove('hidden');
    $('#map-hint').textContent = mapMode ? 'Tap where you want to go' : 'Tap a spot to set a waypoint or book a ride there · 🟠 you · 🟢 home · 🔵 work · 🩷 waypoint';
    $('#map-actions').innerHTML = '';
    const box = $('.map-box');
    const w = box.clientWidth - 20, maxH = window.innerHeight - 130;
    let cw = w, ch = (w * WORLD.h) / WORLD.w;
    if (ch > maxH) { ch = maxH; cw = (ch * WORLD.w) / WORLD.h; }
    bm.style.width = cw + 'px'; bm.style.height = ch + 'px';
    bm.width = Math.round(cw * DPR); bm.height = Math.round(ch * DPR);
    drawBigMap();
  }
  function closeMap() { $('#mapview').classList.add('hidden'); mapMode = null; }
  $('#map-x').onclick = closeMap;
  function drawBigMap() {
    const W = bm.width, H = bm.height, k = W / WORLD.w;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.drawImage(thumb, 0, 0, W, H);
    bctx.setTransform(k, 0, 0, k, 0, 0);
    const fs = 12 / k * DPR;
    for (const d of DISTRICTS) { bctx.globalAlpha = 0.85; drawLabelOn(bctx, d.name, d.x + d.w / 2, d.y + d.h / 2, fs * 1.1); bctx.globalAlpha = 1; }
    for (const r of ROADS_H) drawLabelOn(bctx, r.name, 700, r.y, fs * 0.9, '#ffe9a8');
    const mark = (x, y, col, label) => { bctx.fillStyle = col; bctx.beginPath(); bctx.arc(x, y, 22, 0, Math.PI * 2); bctx.fill(); bctx.strokeStyle = '#fff'; bctx.lineWidth = 6; bctx.stroke(); if (label) drawLabelOn(bctx, label, x, y - 50, fs); };
    if (S.home) { const d = door(BLD[HOMES[S.home.key].building]); mark(d.x, d.y, '#0f9d58', '🏠 Home'); }
    if (S.job) { const d = door(BLD[JOBS[S.job.id].building]); mark(d.x, d.y, '#2563eb', '💼 Work'); }
    if (S.waypoint) mark(S.waypoint.x, S.waypoint.y, '#ff3d71', '📌 ' + S.waypoint.label);
    if (mapPick) mark(mapPick.x, mapPick.y, '#ffd400', '📍 Selected');
    const me = ride && ride.status === 'onboard' ? ride.car : S.player;
    mark(me.x, me.y, '#ff8a3d', 'You');
  }
  function drawLabelOn(c, text, x, y, size, color = '#fff') {
    c.font = `700 ${size}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = size / 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
  }
  bm.addEventListener('pointerdown', (e) => {
    const r = bm.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * WORLD.w, y = ((e.clientY - r.top) / r.height) * WORLD.h;
    let label = placeName(x, y), pt = { x, y };
    let nearest = null, nd = 140;
    for (const b of BUILDINGS) { const d = door(b), dd = dist(d.x, d.y, x, y); if (dd < nd) { nd = dd; nearest = b; } }
    if (nearest) { pt = door(nearest); label = nearest.name; }
    if (mapMode) { const cb = mapMode; closeMap(); cb({ x: pt.x, y: pt.y, door: nearest ? pt : null, label }); return; }
    mapPick = { ...pt, label };
    drawBigMap();
    const acts = $('#map-actions');
    acts.innerHTML = `<b style="align-self:center">📍 ${esc(label)}</b>`;
    const mk = (txt, fn, cls = 'ghost') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = txt; b.onclick = fn; acts.appendChild(b); };
    mk('Set waypoint', () => { setWaypoint(pt, label); closeMap(); toast(`📌 Waypoint set: ${esc(label)}`); }, 'primary');
    mk('🚕 Chalo here', () => { closeMap(); openPhone('chalo'); rideQuote('chalo', { x: pt.x, y: pt.y, door: nearest ? pt : null, label }); });
    mk('🏍️ PhatPhat here', () => { closeMap(); openPhone('phatphat'); rideQuote('phatphat', { x: pt.x, y: pt.y, door: nearest ? pt : null, label }); });
    if (S.waypoint) mk('Clear waypoint', () => { S.waypoint = null; drawBigMap(); });
  });

  // ---------- progression: XP, daily rewards, hustles, fame, life events ----------
  const dstr = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const todayStr = () => dstr(new Date());
  const yesterdayStr = () => dstr(new Date(Date.now() - 864e5));
  const xpNeed = (lvl) => Math.round(120 * Math.pow(lvl, 1.45));
  const titleFor = (lvl) => LEVEL_TITLES.filter(([l]) => lvl >= l).pop()[1];
  const fmtNum = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n)));
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

  function ensureProg(s) {
    if (s.xp == null) s.xp = 0;
    if (s.level == null) s.level = 1;
    s.biz = s.biz || {};
    s.reelz = Object.assign({ followers: 0, posts: 0, best: 0, last: -9999, spots: {}, boost: 1, tier: 0, viral: 0 }, s.reelz);
    s.streak = s.streak || { last: '', count: 0, claimed: '' };
    if (s.spins == null) s.spins = 0;
    s.pending = s.pending || [];
    if (s.nextEvent == null) s.nextEvent = s.time + 240;
    s.flags = s.flags || {};
    return s;
  }

  // ----- sound + celebration -----
  let actx = null;
  function chime(kind = 'good') {
    if (store.sound === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'big' ? [523, 659, 784, 1047] : kind === 'bad' ? [330, 247] : [660, 880];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.09;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.3);
      });
    } catch (e) { /* audio unavailable */ }
  }
  function celebrate(big, small) {
    const el = $('#celebrate');
    el.innerHTML = `<b>${big}</b><span>${small || ''}</span>`;
    el.classList.remove('hidden', 'show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 2600);
    confetti();
    chime('big');
  }
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('#confetti'), g = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight; c.classList.remove('hidden');
    const cols = ['#ff8a3d', '#ffd400', '#22a06b', '#3b82f6', '#e23744', '#8e5cf5'];
    const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + rand(-80, 80), y: innerHeight * 0.35, vx: rand(-7, 7), vy: rand(-12, -3), r: rand(3, 7), c: pick(cols), a: rand(0, 6) }));
    const t0 = performance.now();
    (function step(now) {
      g.clearRect(0, 0, c.width, c.height);
      for (const p of ps) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
      if (now - t0 < 2200) requestAnimationFrame(step); else { g.clearRect(0, 0, c.width, c.height); c.classList.add('hidden'); }
    })(t0);
  }

  // ----- XP and levels -----
  function addXP(n) {
    if (!n) return;
    S.xp += n;
    while (S.xp >= xpNeed(S.level)) {
      S.xp -= xpNeed(S.level); S.level++;
      const bonus = 250 * S.level;
      earn(bonus, `Level ${S.level} bonus`);
      const unlocks = BUSINESSES.filter((b) => b.level === S.level).map((b) => `${b.icon} ${b.name}`);
      celebrate(`Level ${S.level}!`, `You're now a <b>${titleFor(S.level)}</b> · +${inr(bonus)}${unlocks.length ? ` · Unlocked ${unlocks.join(', ')}` : ''}`);
    }
  }

  // track() is the single hook for anything that counts toward XP or daily challenges.
  function track(kind, n = 1) {
    addXP((XP_FOR[kind] || 0) * (kind === 'earn' ? 0 : n));
    if (!S.daily) return;
    for (const t of S.daily.tasks) {
      if (t.k !== kind || t.p >= t.n) continue;
      t.p = Math.min(t.n, t.p + n);
      if (t.p >= t.n) { toast(`🎯 Daily challenge done: ${t.t}! Claim it in 🎁 Rewards.`, 'good'); chime(); }
    }
  }

  // ----- daily login, streak, challenges, spin -----
  function checkDaily() {
    const t = todayStr();
    if (S.daily && S.daily.date === t) return false;
    S.daily = { date: t, spun: false, bonus: false, tasks: shuffle(DAILY_TASKS).slice(0, 3).map((c) => ({ ...c, p: 0, claimed: false, cash: randi(3, 8) * 100, xp: randi(6, 12) * 10 })) };
    if (S.streak.last === yesterdayStr()) S.streak.count++;
    else if (S.streak.last !== t) S.streak.count = 1;
    S.streak.last = t;
    return true;
  }
  const loginDay = () => ((S.streak.count - 1) % 7) + 1;
  function rewardsPending() {
    if (!S.daily) return false;
    return S.streak.claimed !== S.daily.date || !S.daily.spun || S.spins > 0 || S.daily.tasks.some((t) => t.p >= t.n && !t.claimed);
  }
  function giveReward(r, label) {
    const bits = [];
    if (r.cash) { earn(r.cash, label); bits.push(inr(r.cash)); }
    if (r.xp) { addXP(r.xp); bits.push(`+${r.xp} XP`); }
    if (r.spins) { S.spins += r.spins; bits.push(`+${r.spins} spin`); }
    if (r.followers) { S.reelz.followers += r.followers; bits.push(`+${r.followers} fans`); }
    if (r.energy) { S.player.energy = 100; bits.push('full energy'); }
    return bits.join(' · ');
  }
  function openRewards() {
    closePhone(); closeMap();
    checkDaily();
    const day = loginDay(), claimedToday = S.streak.claimed === S.daily.date;
    const ladder = LOGIN_REWARDS.map((r, i) => {
      const d = i + 1, cls = d < day || (d === day && claimedToday) ? 'done' : d === day ? 'now' : '';
      const txt = r.cash ? inr(r.cash) : r.xp ? `${r.xp} XP` : '🎡';
      return `<div class="ladder-cell ${cls}"><small>Day ${d}</small><b>${d === 7 ? '🎁 ' : ''}${txt}</b></div>`;
    }).join('');
    const allDone = S.daily.tasks.every((t) => t.claimed);
    const items = [
      { html: `<div class="streak"><div class="big">🔥 ${S.streak.count}-day streak</div><small>Come back every day. Miss a day and the streak resets.</small><div class="ladder">${ladder}</div></div>` },
      { icon: '📅', label: claimedToday ? `Day ${day} reward claimed` : `Claim your Day ${day} reward`, sub: claimedToday ? 'Come back tomorrow for the next one' : 'Free, once per day',
        disabled: claimedToday, onClick: () => { S.streak.claimed = S.daily.date; const got = giveReward(LOGIN_REWARDS[day - 1], `Day ${day} login reward`); celebrate('Daily reward!', got); openRewards(); } },
      { section: 'Lucky Chai Spin' },
      { icon: '🎡', label: !S.daily.spun ? 'Spin the wheel (free today)' : S.spins > 0 ? `Use a bonus spin (${S.spins} left)` : 'Next free spin tomorrow', sub: 'Cash, XP, fans, energy — or the ₹10,000 jackpot',
        disabled: S.daily.spun && S.spins <= 0, onClick: openSpin },
      { section: `Today's challenges${allDone ? ' · all done!' : ''}` },
      ...S.daily.tasks.map((t) => ({ icon: t.claimed ? '✅' : t.p >= t.n ? '🎯' : '⬜', label: t.t,
        sub: `<span class="progress" style="display:block"><s style="width:${(t.p / t.n) * 100}%"></s></span>${t.k === 'earn' ? inr(t.p) + ' / ' + inr(t.n) : `${t.p} / ${t.n}`} · reward ${inr(t.cash)} + ${t.xp} XP`,
        right: t.claimed ? 'Done' : t.p >= t.n ? 'Claim' : '', disabled: t.claimed || t.p < t.n,
        onClick: () => { t.claimed = true; giveReward({ cash: t.cash, xp: t.xp }, `Challenge: ${t.t}`); chime();
          if (!S.daily.bonus && S.daily.tasks.every((x) => x.claimed)) { S.daily.bonus = true; S.spins++; celebrate('All 3 challenges done!', '+1 bonus spin'); }
          openRewards(); } })),
      { note: 'Finish all three for a bonus spin. New challenges every day at midnight (your time).', blue: true },
    ];
    showModal('🎁 Rewards', `Level ${S.level} ${titleFor(S.level)} · ${S.xp}/${xpNeed(S.level)} XP`, items);
  }
  function openSpin() {
    const free = !S.daily.spun;
    if (!free && S.spins <= 0) return;
    showModal('🎡 Lucky Chai Spin', 'Tap spin. One free spin a day; earn more from streaks and challenges.', [
      { html: '<div class="wheel-wrap"><div class="wheel-pin">▼</div><canvas id="wheel" width="280" height="280"></canvas></div>' },
      { html: '<button class="btn primary" id="spin-go" style="width:100%">Spin!</button>' },
    ]);
    const cv = $('#wheel'), g = cv.getContext('2d'), N = SPIN_PRIZES.length, R = 136, seg = (Math.PI * 2) / N;
    SPIN_PRIZES.forEach((p, i) => {
      g.beginPath(); g.moveTo(140, 140); g.arc(140, 140, R, -Math.PI / 2 + i * seg, -Math.PI / 2 + (i + 1) * seg); g.closePath();
      g.fillStyle = p.c; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
      g.save(); g.translate(140, 140); g.rotate(-Math.PI / 2 + (i + 0.5) * seg); g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '700 13px system-ui'; g.fillText(p.t, R - 10, 5); g.restore();
    });
    g.beginPath(); g.arc(140, 140, 22, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.font = '20px system-ui'; g.textAlign = 'center'; g.fillText('☕', 140, 147);
    $('#spin-go').onclick = () => {
      $('#spin-go').disabled = true;
      if (free) S.daily.spun = true; else S.spins--;
      let r = Math.random() * SPIN_PRIZES.reduce((s, p) => s + p.w, 0), idx = 0;
      for (; idx < N; idx++) { r -= SPIN_PRIZES[idx].w; if (r <= 0) break; }
      idx = Math.min(idx, N - 1);
      const deg = 360 * 6 - (idx + 0.5) * (360 / N) + rand(-8, 8);
      cv.style.transition = 'transform 3.4s cubic-bezier(.12,.7,.15,1)'; cv.style.transform = `rotate(${deg}deg)`;
      setTimeout(() => {
        const p = SPIN_PRIZES[idx], got = giveReward(p, `Lucky Chai Spin: ${p.t}`);
        if (p.t === 'JACKPOT') celebrate('💰 JACKPOT! 💰', got); else { toast(`🎡 You won ${got}!`, 'good'); chime(); }
        save(); setTimeout(openRewards, 900);
      }, 3500);
    };
  }

  // ----- businesses (idle income) -----
  const bizIncome = (b, lvl) => b.income * Math.pow(1.5, lvl - 1);
  const bizUpCost = (b, lvl) => Math.round(b.cost * 0.8 * Math.pow(1.7, lvl));
  const BIZ_CAP_H = 12;
  function accrueBiz(min) {
    for (const b of BUSINESSES) {
      const o = S.biz[b.id];
      if (!o) continue;
      const cap = bizIncome(b, o.lvl) * BIZ_CAP_H;
      const was = o.till;
      o.till = Math.min(cap, o.till + (bizIncome(b, o.lvl) * min) / 60);
      if (was < cap && o.till >= cap) toast(`${b.icon} ${b.name}'s cash box is full! Collect it in the Dhandha app.`);
    }
  }
  function collectAll() {
    let sum = 0;
    for (const b of BUSINESSES) { const o = S.biz[b.id]; if (o && o.till >= 1) { sum += o.till; o.till = 0; } }
    if (sum < 1) { toast('Nothing to collect yet.'); return; }
    earn(sum, 'Business earnings collected'); track('collect'); track('earn', sum);
    toast(`💰 Collected ${inr(sum)} from your businesses!`, 'good'); chime();
  }
  function dhandhaApp() {
    const pad = appShell('dhandha');
    const owned = BUSINESSES.filter((b) => S.biz[b.id]);
    const perH = owned.reduce((s, b) => s + bizIncome(b, S.biz[b.id].lvl), 0);
    const till = owned.reduce((s, b) => s + S.biz[b.id].till, 0);
    fillList(pad, [
      { html: `<div class="note blue"><small>Passive income</small><div class="big">${inr(perH)}/hr</div>Cash waiting: <b>${inr(till)}</b> · boxes fill up in ${BIZ_CAP_H} game hours, so collect often.</div>` },
      { icon: '💰', label: 'Collect all earnings', right: inr(till), disabled: till < 1, onClick: () => { collectAll(); dhandhaApp(); } },
      { section: 'Your hustles' },
      ...BUSINESSES.map((b) => {
        const o = S.biz[b.id];
        if (!o) {
          const locked = S.level < b.level;
          return { icon: b.icon, label: `${b.name}${locked ? ` · 🔒 Level ${b.level}` : ''}`, sub: `${b.where} · earns ${inr(b.income)}/hr`, right: inr(b.cost), disabled: locked || S.player.money < b.cost,
            onClick: () => { if (spend(b.cost, `Bought ${b.name}`)) { S.biz[b.id] = { lvl: 1, till: 0 }; celebrate(`${b.icon} ${b.name} is yours!`, `Earning ${inr(b.income)} every game hour`); checkGoals(); dhandhaApp(); } } };
        }
        const cap = bizIncome(b, o.lvl) * BIZ_CAP_H, up = bizUpCost(b, o.lvl);
        return { icon: b.icon, label: `${b.name} · Lv ${o.lvl}${o.lvl >= 5 ? ' (max)' : ''}`,
          sub: `${inr(bizIncome(b, o.lvl))}/hr · box ${inr(o.till)} / ${inr(cap)}<span class="progress" style="display:block"><s style="width:${(o.till / cap) * 100}%"></s></span>${o.lvl < 5 ? `Upgrade: +50% income for ${inr(up)}` : ''}`,
          right: o.lvl < 5 ? '⬆️' : '', disabled: o.lvl >= 5 || S.player.money < up,
          onClick: () => { if (spend(up, `Upgraded ${b.name}`)) { o.lvl++; toast(`⬆️ ${b.name} upgraded to level ${o.lvl}!`, 'good'); chime(); dhandhaApp(); } } };
      }),
    ]);
  }

  // ----- Reelz: influencer fame -----
  function nearSpot() {
    const P = S.player;
    for (const sp of PHOTO_SPOTS) { const b = BLD[sp.id], d = door(b); if (dist(P.x, P.y, d.x, d.y) < 130 || (!b.solid && P.x > b.x && P.x < b.x + b.w && P.y > b.y && P.y < b.y + b.h)) return { ...sp, b }; }
    return null;
  }
  function postReel(sp) {
    const R = S.reelz, day = dayOf(S.time);
    if (S.time - R.last < 60) { toast('Your followers need a breather — post again in a bit.', 'bad'); return; }
    if (R.spots[sp.id] === day) { toast('You already posted from here today. Try another spot!', 'bad'); return; }
    if (S.player.energy < 10) { toast('Too tired to film. Rest first.', 'bad'); return; }
    R.last = S.time; R.spots[sp.id] = day;
    activity(`Shooting a reel at ${sp.b.name}…`, 30, { energy: 1.5 }, () => {
      const P = S.player;
      const base = 220 + R.followers * 0.18;
      let views = base * sp.hype * (1 + styleScore() * 0.25) * (0.6 + P.social / 100) * (S.pet ? 1.3 : 1) * R.boost * Math.exp(rand(-0.6, 0.9));
      const viral = Math.random() < 0.04 + styleScore() * 0.01 + (R.boost > 1 ? 0.08 : 0);
      if (viral) views *= rand(15, 40);
      views = Math.round(views);
      const gained = Math.round(views * rand(0.015, 0.03));
      R.followers += gained; R.posts++; R.best = Math.max(R.best, views); R.boost = 1;
      P.social = clamp(P.social + 6, 0, 100);
      track('reel');
      if (viral) { R.viral++; celebrate('🔥 YOUR REEL WENT VIRAL! 🔥', `${fmtNum(views)} views · +${fmtNum(gained)} followers`); }
      else toast(`📸 Reel posted: ${fmtNum(views)} views, +${fmtNum(gained)} followers.${S.pet ? ` ${S.pet.name}'s cameo helped!` : ''}`, 'good');
      const tier = BRAND_DEALS.filter(([f]) => R.followers >= f).length;
      if (tier > R.tier) { R.tier = tier; const [, pay, brand] = BRAND_DEALS[tier - 1]; celebrate('🤝 Brand deal unlocked!', `${brand} pays you ${inr(pay)} every day`); }
      checkGoals();
    });
  }
  function reelzApp() {
    const pad = appShell('reelz');
    const R = S.reelz, sp = nearSpot(), day = dayOf(S.time);
    const deal = BRAND_DEALS.filter(([f]) => R.followers >= f).pop(), next = BRAND_DEALS.find(([f]) => R.followers < f);
    fillList(pad, [
      { html: `<div class="note reelz-card"><div class="big">${fmtNum(R.followers)} followers</div>${R.posts} reels · best ${fmtNum(R.best)} views · ${R.viral} viral hit${R.viral === 1 ? '' : 's'}${R.boost > 1 ? '<br>🔥 Trend boost active on your next reel!' : ''}</div>` },
      sp ? { icon: '🎬', label: `Post a reel at ${sp.b.name}`, sub: R.spots[sp.id] === day ? 'Already posted here today' : `Spot hype ×${sp.hype} · 30 min · Style and Social boost views`, disabled: R.spots[sp.id] === day, onClick: () => postReel(sp) }
        : { note: '📍 Go to a photo spot to post. Hot spots are listed below; tap one to set a waypoint.' },
      { section: 'Brand deals' },
      { icon: '🤝', label: deal ? `${deal[2]} pays ${inr(deal[1])}/day` : 'No brand deal yet', sub: next ? `Next: ${inr(next[1])}/day from ${next[2]} at ${fmtNum(next[0])} followers` : 'Top tier reached!' },
      { section: 'Photo spots' },
      ...PHOTO_SPOTS.slice().sort((a, b) => b.hype - a.hype).map((s) => ({ icon: R.spots[s.id] === day ? '✅' : '📸', label: BLD[s.id].name, sub: `Hype ×${s.hype}${R.spots[s.id] === day ? ' · posted today' : ''} · ${(dist(S.player.x, S.player.y, door(BLD[s.id]).x, door(BLD[s.id]).y) / PX_PER_KM).toFixed(1)} km`,
        onClick: () => { setWaypoint(door(BLD[s.id]), BLD[s.id].name); closePhone(); toast(`📌 Waypoint set: ${BLD[s.id].name}`); } })),
      { note: 'Tips: better clothes (Style) and a good mood (Social) mean more views. Trends from life events triple your viral odds.', blue: true },
    ]);
  }

  // ----- relationships & pet -----
  function askOut(name) {
    if (!spend(1500, `Date with ${name}`)) return;
    activity(`Dinner date with ${name} at Cyber Square…`, 180, { social: -10, indoor: true }, () => {
      const chance = 0.45 + styleScore() * 0.08 + S.player.social / 400;
      if (Math.random() < chance) { S.partner = { name, since: dayOf(S.time), lastDate: dayOf(S.time) }; addXP(100); celebrate(`💞 You and ${name} are together!`, 'Your social bar now drains slower'); checkGoals(); }
      else { addFriend(name, -5); toast(`${name}: "You're sweet, but let's stay friends 🙂" Try again later with better Style.`, 'bad'); }
    });
  }
  function dateNight() {
    const p = S.partner, today = dayOf(S.time);
    if (p.lastDate === today) { toast(`You already had a date with ${p.name} today.`); return; }
    if (!spend(1200, `Date night with ${p.name}`)) return;
    p.lastDate = today;
    activity(`Date night with ${p.name}…`, 150, { social: -20, indoor: true }, () => { addXP(40); toast(`💞 Lovely evening with ${p.name}.`, 'good'); });
  }

  // ----- random life events with choices -----
  const knownFriend = () => { const k = Object.keys(S.friends); return k.length ? pick(k) : pick(NPC_NAMES)[0]; };
  const EVENTS = [
    { id: 'otp', ok: () => true, make: () => ({ title: '📞 A "bank" is calling', text: '"Your card will be blocked today. Just read me the OTP we sent."', choices: [
      { t: 'Read out the OTP', fn: () => { const loss = Math.min(5000, Math.max(0, S.player.money)); S.player.money -= loss; txn('Lost to phone scam', -loss); toast(`😱 ${inr(loss)} vanished. Banks never ask for OTPs!`, 'bad'); chime('bad'); } },
      { t: 'Hang up and block', fn: () => { addXP(40); toast('🧠 Smart. Real banks never ask for OTPs. +40 XP', 'good'); } }] }) },
    { id: 'wedding', ok: () => true, make: () => { const f = knownFriend(); return { title: `💌 ${f}'s cousin is getting married`, text: 'A big fat farmhouse wedding in Badshahpur tonight. DJ, dhol and 600 guests.', choices: [
      { t: 'Go and dance (₹2,100 shagun)', fn: () => { if (!spend(2100, 'Wedding shagun')) return; activity('Dancing to dhol at the baraat…', 240, { social: -12, energy: 1.6 }, () => { addFriend(f, 12); addFriend(pick(NPC_NAMES)[0], 10); addXP(50); applyFood(40); toast('💃 Best night out in months. You made new friends.', 'good'); }); } },
      { t: 'Send wishes on chat', fn: () => { addFriend(f, -4); toast(`${f}: "Arre, you should have come!"`); } }] }; } },
    { id: 'loan', ok: () => S.player.money > 4000, make: () => { const f = knownFriend(); return { title: `🙏 ${f} needs help`, text: `"Bhai/behen, can you lend me ₹3,000 till salary day? I'll return it with a treat."`, choices: [
      { t: 'Lend ₹3,000', fn: () => { if (!spend(3000, `Loan to ${f}`)) return; S.pending.push({ kind: 'loan', who: f, day: dayOf(S.time) + 3 }); addFriend(f, 10); toast(`${f}: "You're a lifesaver!"`, 'good'); } },
      { t: 'Politely refuse', fn: () => { addFriend(f, -8); toast(`${f} looks disappointed.`); } }] }; } },
    { id: 'pitch', ok: () => S.player.money > 12000, make: () => ({ title: '🦄 A founder pitches you', text: '"We\'re building an app that delivers chai in 7 minutes. Want in at the ground floor? ₹10,000 for a tiny stake."', choices: [
      { t: 'Invest ₹10,000', fn: () => { if (!spend(10000, 'Angel investment')) return; S.pending.push({ kind: 'invest', day: dayOf(S.time) + 5 }); toast('📈 You\'re an angel investor now. Results in 5 days.'); } },
      { t: 'Pass', fn: () => toast('Maybe next unicorn.') }] }) },
    { id: 'stray', ok: () => !S.pet, make: () => ({ title: '🐕 A puppy follows you', text: 'A scruffy street puppy has followed you for three blocks, tail wagging.', choices: [
      { t: 'Adopt him — name him Sheru (₹1,000 vet visit)', fn: () => { if (!spend(1000, 'Vet visit for Sheru')) return; S.pet = { name: 'Sheru', since: dayOf(S.time) }; celebrate('🐕 Sheru is your dog now!', 'He follows you everywhere and boosts your reels'); checkGoals(); } },
      { t: 'Buy him a biscuit packet', fn: () => { S.player.social = clamp(S.player.social + 5, 0, 100); toast('🐕 Happy puppy. Happy you.'); } }] }) },
    { id: 'flood', ok: () => S.weather === 'rain', make: () => ({ title: '🌊 Knee-deep waterlogging', text: 'The road ahead has turned into a river. A tractor-trolley driver offers a lift.', choices: [
      { t: 'Pay ₹150 for the tractor ride', fn: () => { if (spend(150, 'Tractor-trolley ride')) toast('🚜 Dry feet, great story.', 'good'); } },
      { t: 'Wade through it', fn: () => { S.player.health = clamp(S.player.health - 8, 0, 100); addXP(15); toast('💦 Soaked. +15 XP for being a true Gurugram survivor.'); } }] }) },
    { id: 'powercut', ok: () => !!S.home && !S.player.items.includes('inverter'), make: () => ({ title: '🔌 Power cut, again', text: 'No electricity in your building. It\'s 38°C and the fan is dead.', choices: [
      { t: 'Buy an inverter (₹4,500, better sleep)', fn: () => { if (spend(4500, 'Inverter')) { S.player.items.push('inverter'); toast('🔋 Inverter installed. Sleep restores more energy now.', 'good'); } } },
      { t: 'Sweat it out', fn: () => { S.player.energy = clamp(S.player.energy - 12, 0, 100); toast('🥵 Long sweaty night.'); } }] }) },
    { id: 'raise', ok: () => !!S.job, make: () => ({ title: '📨 A recruiter slides into your DMs', text: '"We\'ll pay 20% more. Interested?" You could use this to ask your boss for a raise.', choices: [
      { t: 'Negotiate a raise (needs Communication 2)', fn: () => { if (S.player.skills.comm >= 2 || Math.random() < 0.3) { S.job.level++; celebrate('💼 Raise approved!', 'Your pay just went up 15%'); } else { S.job.missed = Math.min(2, S.job.missed + 1); toast('😬 Your boss was not impressed. One warning added.', 'bad'); } } },
      { t: 'Stay loyal', fn: () => { addXP(30); toast('Loyalty noted. +30 XP'); } }] }) },
    { id: 'trend', ok: () => true, make: () => ({ title: '📈 A dance trend is blowing up', text: 'Everyone on Reelz is doing the "Rapid Metro shuffle". Jump on it?', choices: [
      { t: 'Learn it (next reel gets a 3× boost)', fn: () => { S.reelz.boost = 3; toast('🔥 Trend boost ready. Post a reel at a photo spot!', 'good'); } },
      { t: 'Too cringe, skip', fn: () => toast('Fair.') }] }) },
    { id: 'ipl', ok: () => hourF(S.time) > 17, make: () => ({ title: '🏏 Big cricket match tonight', text: 'Brew Bastion is screening the final on a giant screen.', choices: [
      { t: 'Go watch (₹600)', fn: () => { if (!spend(600, 'Match screening')) return; activity('Cheering every boundary…', 180, { social: -15, indoor: true }, () => { addFriend(pick(NPC_NAMES)[0], 10); addXP(30); toast('🏏 What a finish! You made a new friend.', 'good'); }); } },
      { t: 'Watch on your phone', fn: () => { S.player.social = clamp(S.player.social + 8, 0, 100); } }] }) },
    { id: 'festival', ok: () => Object.keys(S.friends).length >= 2, make: () => ({ title: '🪔 Festival season!', text: 'Lights everywhere, sweets everywhere. Your friends would love a gift box.', choices: [
      { t: 'Gift sweets to all friends (₹1,500)', fn: () => { if (!spend(1500, 'Festival sweets')) return; Object.keys(S.friends).forEach((n) => addFriend(n, 8)); addXP(40); toast('🪔 Everyone loved the kaju katli. Friendships +8.', 'good'); } },
      { t: 'Celebrate quietly', fn: () => { S.player.social = clamp(S.player.social + 10, 0, 100); } }] }) },
    { id: 'carpool', ok: () => !!S.job, make: () => { const f = knownFriend(); return { title: `🚗 ${f} offers a carpool`, text: 'Share rides to work and split fuel. Good company in traffic.', choices: [
      { t: 'Join (friendship +10)', fn: () => { addFriend(f, 10); S.player.social = clamp(S.player.social + 8, 0, 100); toast(`🚗 Commutes with ${f} are way more fun.`, 'good'); } },
      { t: 'No thanks', fn: () => {} }] }; } },
  ];
  function maybeEvent() {
    if (S.time < S.nextEvent || isUI() || (ride && ride.status === 'onboard')) return;
    S.nextEvent = S.time + randi(420, 780);
    const pool = EVENTS.filter((e) => e.ok() && S.flags.lastEvent !== e.id);
    if (!pool.length) return;
    const ev = pick(pool), d = ev.make();
    S.flags.lastEvent = ev.id;
    chime();
    showModal(d.title, 'Life in Gurugram', [{ note: d.text }, ...d.choices.map((c, i) => ({ icon: i ? '↩️' : '👉', label: c.t, onClick: () => { closeModal(); c.fn(); track('event'); save(); } }))]);
  }
  function resolvePending(day) {
    for (let i = S.pending.length - 1; i >= 0; i--) {
      const p = S.pending[i];
      if (p.day > day) continue;
      S.pending.splice(i, 1);
      if (p.kind === 'loan') {
        if (Math.random() < 0.75) { earn(3300, `${p.who} repaid the loan`); toast(`🙏 ${p.who} paid back ₹3,300 — with interest!`, 'good'); }
        else { addFriend(p.who, -10); toast(`😒 ${p.who} "forgot" about the ₹3,000 loan.`, 'bad'); }
      } else if (p.kind === 'invest') {
        const r = Math.random();
        if (r < 0.2) { earn(100000, 'Startup exit!'); celebrate('🦄 Your startup bet paid off!', 'The chai app got acquired. +₹1,00,000'); }
        else if (r < 0.6) { earn(12000, 'Startup investment returned'); toast('📈 The startup raised a round. You got ₹12,000 back.', 'good'); }
        else toast('📉 The chai-delivery startup shut down. Investment lost.', 'bad');
      }
    }
  }
  function onNewDayProg(day) {
    resolvePending(day);
    const deal = BRAND_DEALS.filter(([f]) => S.reelz.followers >= f).pop();
    if (deal) earn(deal[1], `Brand deal: ${deal[2]}`);
    if (S.partner) toast(`💌 ${S.partner.name}: "${pick(['Good morning! Have a great day ☀️', 'Don\'t forget to eat breakfast!', 'Momos tonight?', 'Proud of you 💛'])}"`);
    if (S.pet) S.player.social = clamp(S.player.social + 6, 0, 100);
  }

  // ----- life score, share card, rival codes, local hall of fame -----
  function lifeScore(s = S) {
    const bizVal = BUSINESSES.reduce((t, b) => t + (s.biz && s.biz[b.id] ? b.cost : 0), 0);
    const friends = Object.values(s.friends || {}).filter((f) => f.fs >= 30).length;
    return Math.round((s.player.money + s.player.savings + bizVal + portfolio(s)) / 1000 + ((s.reelz && s.reelz.followers) || 0) / 50 + (s.level || 1) * 40 + friends * 15);
  }
  const myCode = () => `${S.player.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase() || 'PLAYER'}-L${S.level}-S${lifeScore()}-D${dayOf(S.time)}`;
  function checkRival() {
    if (S.rival && !S.rival.beaten && lifeScore() > S.rival.score) {
      S.rival.beaten = true; addXP(200);
      celebrate(`🏆 You beat ${S.rival.name}!`, `Your Life Score ${lifeScore()} vs their ${S.rival.score}. Send them your code!`);
    }
  }
  function copyText(text, el) {
    const done = () => toast('📋 Copied! Paste it in WhatsApp, Instagram or X.', 'good');
    try { navigator.clipboard.writeText(text).then(done, () => { el.select(); toast('Press Ctrl/Cmd+C (or long-press → Copy) to copy.'); }); }
    catch (e) { el.select(); toast('Press Ctrl/Cmd+C (or long-press → Copy) to copy.'); }
  }
  function drawCard(cv) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, P = S.player;
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#ff8a3d'); gr.addColorStop(1, '#8e5cf5');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 7; i++) g.fillRect(W - 60 - i * 46, H - 40 - (i % 3) * 30 - i * 18, 32, 40 + (i % 3) * 30 + i * 18);
    g.fillStyle = '#fff'; g.font = '800 30px system-ui, sans-serif'; g.fillText('Gurugram Life', 28, 50);
    g.font = '600 15px system-ui, sans-serif'; g.globalAlpha = 0.85; g.fillText(`Day ${dayOf(S.time)} in the Millennium City`, 28, 74); g.globalAlpha = 1;
    drawPerson(g, 80, 190, P.look, 0, 3.2);
    g.font = '800 26px system-ui, sans-serif'; g.fillText(P.name, 150, 130);
    g.font = '600 16px system-ui, sans-serif';
    const lines = [`⭐ Level ${S.level} · ${titleFor(S.level)}`, `💰 Net worth ${inr(P.money + P.savings + portfolio())}`, `📸 ${fmtNum(S.reelz.followers)} followers`, `💼 ${S.job ? JOBS[S.job.id].title : 'Hustling'}`, `🏆 Life Score ${lifeScore()}`];
    lines.forEach((l, i) => g.fillText(l, 150, 160 + i * 25));
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, H - 44, W, 44);
    g.fillStyle = '#fff'; g.font = '700 15px system-ui, sans-serif'; g.fillText(`Beat my code: ${myCode()}`, 28, H - 16);
  }
  function openShare() {
    closePhone(); closeMap();
    const text = `I'm ${S.player.name}, a Level ${S.level} ${titleFor(S.level)} in Gurugram Life 🏙️ — ${inr(S.player.money + S.player.savings)} net worth, ${fmtNum(S.reelz.followers)} followers, Day ${dayOf(S.time)}. Life Score ${lifeScore()}. Think you can beat me? Enter my code ${myCode()} in the game${SHARE_URL ? ` 👉 ${SHARE_URL}` : ''}`;
    const hof = Object.values(store.profiles).filter((p) => p.save).map((p) => ({ n: p.display, s: lifeScore(ensureProg(JSON.parse(JSON.stringify(p.save)))) }));
    if (S.rival) hof.push({ n: `${S.rival.name} (rival)`, s: S.rival.score });
    hof.sort((a, b) => b.s - a.s);
    showModal('📣 Share & challenge', 'Screenshot the card or copy the text, then dare your friends to beat you.', [
      { html: '<canvas id="sharecard" width="560" height="300" class="sharecard"></canvas>' },
      { html: `<textarea id="brag" class="brag" readonly>${esc(text)}</textarea>` },
      { icon: '📋', label: 'Copy brag text + link', sub: 'Paste into WhatsApp, Instagram stories or X', onClick: () => copyText($('#brag').value, $('#brag')) },
      { icon: '🔑', label: `Your challenge code: ${myCode()}`, sub: 'Friends enter it in their game to race your Life Score', onClick: () => copyText(myCode(), $('#brag')) },
      { section: 'Accept a friend\'s challenge' },
      { html: '<div class="row"><input id="rival-in" placeholder="e.g. RAHUL-L7-S940-D6" style="flex:1;min-width:0"><button class="btn primary" id="rival-go">Accept</button></div>' },
      S.rival && { note: `${S.rival.beaten ? '🏆 You beat' : '⚔️ Racing'} <b>${esc(S.rival.name)}</b>: their score ${S.rival.score} (Day ${S.rival.day}) vs yours ${lifeScore()}.` },
      { section: 'Hall of fame (this device)' },
      ...hof.slice(0, 6).map((h, i) => ({ icon: ['🥇', '🥈', '🥉'][i] || '🏅', label: h.n, right: String(h.s) })),
    ]);
    drawCard($('#sharecard'));
    $('#rival-go').onclick = () => {
      const m = /^([A-Z0-9]{1,10})-L(\d{1,3})-S(\d{1,7})-D(\d{1,5})$/i.exec($('#rival-in').value.trim());
      if (!m) { toast('That code doesn\'t look right. It looks like NAME-L7-S940-D6.', 'bad'); return; }
      S.rival = { name: m[1].toUpperCase(), level: +m[2], score: +m[3], day: +m[4], beaten: false };
      toast(`⚔️ Challenge accepted! Beat ${S.rival.name}'s Life Score of ${S.rival.score}.`, 'good');
      save(); openShare();
    };
  }

  // ---------- more to do: Golden Chai hunt, street races, driving passengers, stocks ----------
  function ensureMore(s) {
    s.chai = s.chai || [];
    s.races = s.races || {};
    s.driver = Object.assign({ online: false, trips: 0, rating: 4.8, ratings: 0, trip: null }, s.driver);
    if (!s.market) {
      s.market = { prices: {}, open: {}, hist: {}, hold: {}, hour: Math.floor(s.time / 60) };
      for (const st of STOCKS) { s.market.prices[st.sym] = st.p; s.market.open[st.sym] = st.p; s.market.hist[st.sym] = [st.p]; }
    }
    return s;
  }

  // ----- Golden Chai cups -----
  function checkChai() {
    const P = S.player;
    for (const c of GOLDEN_CHAI) {
      if (S.chai.includes(c.id) || Math.abs(c.x - P.x) > 30 || Math.abs(c.y - P.y) > 30) continue;
      S.chai.push(c.id);
      const n = S.chai.length;
      earn(250, 'Found a Golden Chai cup'); track('chaicup');
      const milestone = { 10: 5000, 20: 15000, [GOLDEN_CHAI.length]: 50000 }[n];
      if (milestone) { earn(milestone, `Golden Chai milestone ${n}`); celebrate(`☕ ${n} Golden Chai cups!`, `Milestone bonus ${inr(milestone)}`); }
      else { toast(`☕✨ Golden Chai cup found! ${n}/${GOLDEN_CHAI.length} · +₹250`, 'good'); chime(); }
      checkGoals();
    }
  }
  function nearestChaiHint() {
    const P = S.player;
    let best = null, bd = 1e9;
    for (const c of GOLDEN_CHAI) { if (S.chai.includes(c.id)) continue; const d = dist(c.x, c.y, P.x, P.y); if (d < bd) { bd = d; best = c; } }
    return best ? { c: best, km: bd / PX_PER_KM, district: districtAt(best.x, best.y).name } : null;
  }

  // ----- street races -----
  let race = null;
  const raceLen = (r) => r.pts.reduce((s, p, i) => (i ? s + dist(p[0], p[1], r.pts[i - 1][0], r.pts[i - 1][1]) : s), dist(2110, 1319, r.pts[0][0], r.pts[0][1]));
  const raceTimes = (r) => { const g = raceLen(r) / 270; return [g, g * 1.25, g * 1.55]; };
  const fmtSec = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  function startRace(r) {
    const P = S.player;
    if (!P.riding) { toast('You need to be on a vehicle. Press F to ride (rent an e-bike at ZipZap, or buy one here).', 'bad'); return; }
    if (!spend(r.fee, `${r.name} entry fee`)) return;
    closeModal(); closePhone();
    race = { r, idx: 0, t0: performance.now() + 3000, countdown: true };
    celebrate('3… 2… 1…', `${r.name} · ${r.pts.length} checkpoints · gold under ${fmtSec(raceTimes(r)[0])}`);
    setWaypoint({ x: r.pts[0][0], y: r.pts[0][1] }, 'Checkpoint 1');
  }
  function updateRace() {
    if (!race) return;
    const P = S.player, now = performance.now();
    if (race.countdown) { if (now >= race.t0) { race.countdown = false; toast('🏁 GO GO GO!', 'good'); chime('big'); } return; }
    if (!P.riding) { toast('❌ Race abandoned — you got off your vehicle.', 'bad'); race = null; S.waypoint = null; return; }
    const [cx, cy] = race.r.pts[race.idx];
    if (dist(P.x, P.y, cx, cy) < 55) {
      race.idx++; chime();
      if (race.idx >= race.r.pts.length) return finishRace();
      const [nx, ny] = race.r.pts[race.idx];
      setWaypoint({ x: nx, y: ny }, `Checkpoint ${race.idx + 1}`);
    }
  }
  function finishRace() {
    const r = race.r, t = (performance.now() - race.t0) / 1000;
    race = null; S.waypoint = null;
    const [g, s2, b] = raceTimes(r), medal = t <= g ? 0 : t <= s2 ? 1 : t <= b ? 2 : -1;
    const prev = S.races[r.id] || { best: Infinity, medal: -1 }, pb = t < prev.best;
    S.races[r.id] = { best: Math.min(prev.best, t), medal: medal >= 0 && (prev.medal < 0 || medal < prev.medal) ? medal : prev.medal };
    track('race');
    if (medal >= 0) { earn(r.prize[medal], `${r.name} prize`); celebrate(`${['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'][medal]}!`, `${r.name} in ${fmtSec(t)} · +${inr(r.prize[medal])}${pb ? ' · new personal best' : ''}`); }
    else toast(`🏁 Finished ${r.name} in ${fmtSec(t)}. Bronze needs ${fmtSec(b)} — try a faster vehicle or avoid peak hours.`);
    checkGoals(); save();
  }
  function raceItems() {
    return RACES.map((r) => {
      const [g, s2, b] = raceTimes(r), best = S.races[r.id];
      return { icon: best && best.medal >= 0 ? ['🥇', '🥈', '🥉'][best.medal] : '🏁', label: `${r.name} · entry ${inr(r.fee)}`,
        sub: `🥇 ${fmtSec(g)} · 🥈 ${fmtSec(s2)} · 🥉 ${fmtSec(b)} · prizes ${inr(r.prize[0])}/${inr(r.prize[1])}/${inr(r.prize[2])}${best ? ` · your best ${fmtSec(best.best)}` : ''}`,
        disabled: !!race, onClick: () => startRace(r) };
    });
  }

  // ----- driving passengers (Chalo / PhatPhat driver partner) -----
  const myVehicle = () => S.player.vehicles.slice().sort((a, b) => VEHICLES[b].speed - VEHICLES[a].speed)[0] || null;
  let tripTimer = 0;
  function driverToggle() {
    const D = S.driver;
    if (!D.online && !myVehicle()) { toast('You need your own vehicle to drive for Chalo or PhatPhat. Raftaar Motors sells them.', 'bad'); return; }
    D.online = !D.online;
    if (!D.online) { if (D.trip) toast('Trip cancelled. Your rating dropped a little.', 'bad'); D.trip = null; S.waypoint = null; }
    else { tripTimer = 3; toast(`🟢 You're online as a ${VEHICLES[myVehicle()].two ? 'PhatPhat bike-taxi' : 'Chalo'} driver. Ride requests will pop up nearby.`, 'good'); }
  }
  function updateDriver(dt) {
    const D = S.driver;
    if (!D.online) return;
    const P = S.player;
    if (!D.trip) {
      tripTimer -= dt;
      if (tripTimer > 0) return;
      const near = BUILDINGS.filter((b) => b.solid && dist(door(b).x, door(b).y, P.x, P.y) > 250 && dist(door(b).x, door(b).y, P.x, P.y) < 1100);
      if (!near.length) { tripTimer = 5; return; }
      const pu = pick(near), pd = door(pu);
      const far = BUILDINGS.filter((b) => b.solid && b !== pu && dist(door(b).x, door(b).y, pd.x, pd.y) > 600 && dist(door(b).x, door(b).y, pd.x, pd.y) < 2600);
      const dest = pick(far), km = dist(pd.x, pd.y, door(dest).x, door(dest).y) / PX_PER_KM * 1.25;
      const car = !VEHICLES[myVehicle()].two;
      D.trip = { stage: 'pickup', name: pick(NPC_NAMES)[0], pu: { x: pd.x, y: pd.y, label: pu.name }, bid: dest.id, fare: Math.round(((car ? 60 : 30) + km * (car ? 28 : 16)) * surge()), km, t0: S.time, allowed: Math.round(10 + km * 3) };
      setWaypoint(pd, `Pickup: ${D.trip.name}`);
      toast(`📲 Ride request: ${D.trip.name} at ${pu.name} → ${dest.name} · ${inr(D.trip.fare)}`, 'good'); chime();
      return;
    }
    const T = D.trip;
    if (T.stage === 'pickup' && dist(P.x, P.y, T.pu.x, T.pu.y) < 45) {
      if (!P.riding) { hint('pickupride', 'Get on your vehicle (F) to pick up the passenger.'); return; }
      T.stage = 'drop'; T.t0 = S.time;
      const d = door(BLD[T.bid]); setWaypoint(d, `Drop: ${BLD[T.bid].name}`);
      toast(`🧍 ${T.name} hopped on. Drop them at ${BLD[T.bid].name}.`);
    } else if (T.stage === 'drop') {
      const d = door(BLD[T.bid]);
      if (dist(P.x, P.y, d.x, d.y) < 55) {
        const fast = S.time - T.t0 <= T.allowed, tip = fast ? randi(2, 8) * 10 : 0, stars = fast ? 5 : randi(3, 4);
        D.rating = Math.round(((D.rating * D.ratings + stars) / (D.ratings + 1)) * 100) / 100; D.ratings++; D.trips++;
        earn(T.fare + tip, `Driver trip with ${T.name}${tip ? ' + tip' : ''}`); track('drive'); track('earn', T.fare + tip);
        toast(`💸 Trip done! ${inr(T.fare + tip)} earned · ${T.name} rated you ${'★'.repeat(stars)} (avg ${D.rating})`, 'good'); chime();
        D.trip = null; S.waypoint = null; tripTimer = rand(4, 9);
        checkGoals();
      }
    }
  }

  // ----- Paisa Trade stock market -----
  const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
  const marketOpen = () => { const h = hourF(S.time); return weekday(dayOf(S.time)) !== 'Sun' && h >= 9 && h < 21; };
  function tickMarket() {
    const M = S.market, hr = Math.floor(S.time / 60);
    if (hr <= M.hour) return;
    const steps = Math.min(48, hr - M.hour);
    M.hour = hr;
    for (let i = 0; i < steps; i++) {
      for (const st of STOCKS) {
        let p = M.prices[st.sym] * Math.exp(st.drift - (st.vol * st.vol) / 2 + st.vol * gauss());
        M.prices[st.sym] = Math.max(5, Math.round(p * 100) / 100);
        const h = M.hist[st.sym]; h.push(M.prices[st.sym]); if (h.length > 30) h.shift();
      }
      if (Math.random() < 0.06) {
        const st = pick(STOCKS), up = Math.random() < 0.55, mv = rand(0.07, 0.2);
        M.prices[st.sym] = Math.round(M.prices[st.sym] * (up ? 1 + mv : 1 - mv) * 100) / 100;
        const news = up ? pick(['wins a giant government contract', 'reports record profits', 'raises a big funding round', 'goes viral on Reelz']) : pick(['faces a tax raid', 'misses earnings estimates', 'CEO resigns suddenly', 'gets hit by a data leak']);
        if (steps <= 2) toast(`${up ? '📈' : '📉'} Market news: ${st.name} ${news} (${up ? '+' : '−'}${Math.round(mv * 100)}%)${M.hold[st.sym] ? ' — you hold this!' : ''}`, up ? 'good' : 'bad');
      }
    }
  }
  const portfolio = (s = S) => !s.market ? 0 : Object.entries(s.market.hold).reduce((t, [k, h]) => t + h.q * s.market.prices[k], 0);
  function spark(arr, w = 90, h = 26) {
    const mn = Math.min(...arr), mx = Math.max(...arr), sp = mx - mn || 1;
    const pts = arr.map((v, i) => `${((i / Math.max(1, arr.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / sp) * (h - 4) - 2).toFixed(1)}`).join(' ');
    const up = arr[arr.length - 1] >= arr[0];
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${pts}" fill="none" stroke="${up ? '#16a34a' : '#dc2626'}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }
  function trade(sym, qty) {
    const M = S.market, price = M.prices[sym], fee = 20;
    if (!marketOpen()) { toast('Market is closed. Trading hours: 9 AM – 9 PM, Monday to Saturday.', 'bad'); return; }
    const h = M.hold[sym] || { q: 0, avg: 0 };
    if (qty > 0) {
      if (!spend(qty * price + fee, `Bought ${qty} ${sym}`)) return;
      h.avg = (h.avg * h.q + price * qty) / (h.q + qty); h.q += qty; M.hold[sym] = h;
    } else {
      const q = Math.min(h.q, -qty);
      if (q <= 0) return;
      earn(q * price - fee, `Sold ${q} ${sym}`);
      const pl = (price - h.avg) * q;
      h.q -= q; if (h.q <= 0) delete M.hold[sym];
      toast(`${pl >= 0 ? '🤑 Profit' : '😬 Loss'} on ${sym}: ${inr(pl)}`, pl >= 0 ? 'good' : 'bad');
    }
    track('trade'); checkGoals();
  }
  function tradeApp(sel) {
    const pad = appShell('trade');
    const M = S.market, open = marketOpen();
    const inv = Object.entries(M.hold).reduce((t, [k, h]) => t + h.q * h.avg, 0), val = portfolio();
    if (sel) {
      const st = STOCKS.find((x) => x.sym === sel), p = M.prices[sel], h = M.hold[sel], chg = (p / M.open[sel] - 1) * 100;
      const maxQ = Math.max(0, Math.floor((S.player.money - 20) / p));
      fillList(pad, [
        { html: `<div class="note blue"><b>${st.icon} ${st.name}</b> · ${sel}<div class="big">${inr(p)} <small style="color:${chg >= 0 ? 'var(--good)' : 'var(--bad)'}">${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}% today</small></div>${spark(M.hist[sel], 280, 70)}${h ? `<br>You own <b>${h.q}</b> @ avg ${inr(h.avg)} · P/L <b style="color:${p >= h.avg ? 'var(--good)' : 'var(--bad)'}">${inr((p - h.avg) * h.q)}</b>` : ''}</div>` },
        !open && { note: 'Market closed. Trading hours: 9 AM – 9 PM, Monday to Saturday.' },
        { icon: '🟢', label: 'Buy 1 share', right: inr(p + 20), disabled: !open || maxQ < 1, onClick: () => { trade(sel, 1); tradeApp(sel); } },
        { icon: '🟢', label: 'Buy 10 shares', right: inr(p * 10 + 20), disabled: !open || maxQ < 10, onClick: () => { trade(sel, 10); tradeApp(sel); } },
        { icon: '🟢', label: `Buy max (${maxQ})`, disabled: !open || maxQ < 1, onClick: () => { trade(sel, maxQ); tradeApp(sel); } },
        h && { icon: '🔴', label: 'Sell 1 share', disabled: !open, onClick: () => { trade(sel, -1); tradeApp(sel); } },
        h && { icon: '🔴', label: `Sell all (${h.q})`, right: inr(h.q * p - 20), disabled: !open, onClick: () => { trade(sel, -h.q); tradeApp(sel); } },
        { note: 'Flat ₹20 brokerage per order. Prices move every game hour; big news can swing them 7–20%. Never invest money you need for rent!', blue: true },
        { icon: '‹', label: 'All stocks', onClick: () => tradeApp() },
      ]);
      return;
    }
    fillList(pad, [
      { html: `<div class="note blue"><small>Portfolio value</small><div class="big">${inr(val)}</div>Invested ${inr(inv)} · P/L <b style="color:${val >= inv ? 'var(--good)' : 'var(--bad)'}">${inr(val - inv)}</b><br>${open ? '🟢 Market open' : '🔴 Market closed · opens 9 AM (Mon–Sat)'}</div>` },
      ...STOCKS.map((st) => {
        const p = M.prices[st.sym], chg = (p / M.open[st.sym] - 1) * 100, h = M.hold[st.sym];
        return { icon: st.icon, label: `${st.name}`, sub: `${spark(M.hist[st.sym])}<br>${st.sym}${h ? ` · you own ${h.q}` : ''}`,
          right: `${inr(p)}<br><small style="color:${chg >= 0 ? 'var(--good)' : 'var(--bad)'}">${chg >= 0 ? '▲' : '▼'}${Math.abs(chg).toFixed(1)}%</small>`, onClick: () => tradeApp(st.sym) };
      }),
    ]);
  }
  function marketNewDay() { for (const st of STOCKS) S.market.open[st.sym] = S.market.prices[st.sym]; }

  // ---------- help guide, hints and tips ----------
  const isTouch = () => document.body.classList.contains('is-touch');
  const kb = (k) => `<kbd class="k">${k}</kbd>`;
  const HELP_TABS = [
    { id: 'start', label: 'Start here' }, { id: 'controls', label: 'Controls' }, { id: 'travel', label: 'Getting around' },
    { id: 'money', label: 'Jobs & money' }, { id: 'fame', label: 'Hustle & fame' }, { id: 'life', label: 'Daily life' }, { id: 'tips', label: 'Tips & tricks' },
  ];
  function helpContent(tab) {
    const T = isTouch();
    if (tab === 'start') return [
      { note: 'You have just arrived in Gurugram. Your goal is to build a life: a roof, a job, friends and savings. The <b>task bar</b> under your stats always shows what to do next.', blue: true },
      { icon: '1️⃣', label: 'Rent a place on day one', sub: 'Basera Rooms is next to the bus stand (₹900/week). Without a home you sleep on park benches and barely recover.' },
      { icon: '2️⃣', label: 'Get a job you qualify for', sub: 'Phone → KaamDhanda. Barista (Chai Chaupal, 7 AM) and factory helper (Udyog Vihar, 8 AM) need no skills.' },
      { icon: '3️⃣', label: 'Earn while you wait for your shift', sub: 'Register at the ZipZap hub on Sohna Road and deliver orders. Rent their e-bike for ₹199 so you arrive on time.' },
      { icon: '4️⃣', label: 'Upskill, then move up', sub: 'SkillUp Academy (Sector 14) raises Coding and Communication. CodeKraft pays ₹3,300 a shift at Coding 3.' },
      { icon: '🏆', label: 'Follow your goals', sub: `Phone → Goals lists ${GOALS.length} milestones, and each one pays a cash reward.` },
      { icon: '⏱️', label: 'One game day = 15 real minutes', sub: 'Work shifts, sleep and long activities skip ahead. Rent is due every 7 game days.' },
      { icon: '🎮', label: 'Bored? There\'s always more', sub: 'Street races at Raftaar Motors, driving passengers, the Golden Chai hunt, stocks on Paisa Trade, reels, businesses and daily challenges. See "Hustle & fame".' },
    ];
    if (tab === 'controls') return [
      { section: T ? 'Touch controls' : 'Keyboard and mouse' },
      ...(T ? [
        { icon: '🕹️', label: 'Joystick (bottom left)', sub: 'Drag to walk. Push it all the way to move faster.' },
        { icon: '🟠', label: 'E button', sub: 'Enter buildings, talk to people and board your ride. A label above it says what it will do.' },
        { icon: '👆', label: 'Drag anywhere else on the screen', sub: use3D ? 'Turns and tilts the camera. Walking follows the direction the camera faces.' : 'Nothing in 2D. The map always faces north.' },
        { icon: '📱', label: 'Side buttons', sub: '📱 phone · 🗺️ city map · 🛵 get on or off your vehicle · ❓ this guide' },
      ] : [
        { html: `<div class="keys-grid">
          <span>${kb('W')}${kb('A')}${kb('S')}${kb('D')} or arrows</span><span>Walk${use3D ? ' (relative to the camera)' : ''}</span>
          <span>${kb('Shift')}</span><span>Jog (uses more energy)</span>
          <span>${kb('E')} or ${kb('Enter')}</span><span>Enter, talk, board a ride</span>
          <span>${kb('P')} or ${kb('Tab')}</span><span>Open or close your phone</span>
          <span>${kb('M')}</span><span>City map</span>
          <span>${kb('F')}</span><span>Get on or off your vehicle</span>
          <span>${kb('H')}</span><span>This help guide</span>
          <span>${kb('Esc')}</span><span>Close any window</span>
          ${use3D ? `<span>Mouse drag</span><span>Turn and tilt the camera</span>
          <span>${kb('Z')} ${kb('X')}</span><span>Turn the camera left or right</span>
          <span>Mouse wheel</span><span>Zoom in or out</span>` : ''}
        </div>` },
      ]),
      { section: 'Reading the screen' },
      { icon: '📊', label: 'Four bars, top left', sub: '❤️ health · 🍛 hunger · ⚡ energy · 💬 social. They turn yellow, then red, when low.' },
      { icon: '📍', label: 'Location chip', sub: 'Shows the road or district you are in, your vehicle, and the distance to your waypoint.' },
      { icon: '🗺️', label: 'Minimap, bottom right', sub: `🟠 you${use3D ? ' (the light cone is where the camera looks)' : ''} · 🟢 home · 🔵 work · 🩷 waypoint · 🟡 your ride` },
      { icon: '💬', label: 'Prompt at the bottom', sub: `Appears when you can do something here. ${T ? 'Tap E' : 'Press E'} to act on it.` },
      { icon: '🎯', label: 'Yellow rings', sub: 'Mark building entrances on the ground. Stand in one to go inside.' },
    ];
    if (tab === 'travel') return [
      { section: 'Finding your way' },
      { icon: '🗺️', label: 'Set a waypoint on the map', sub: `Open the map (${T ? '🗺️' : 'M'}), tap any spot or building, then choose <b>Set waypoint</b>. ${use3D ? 'A pink light beam marks it in the city' : 'A pink arrow at the screen edge points to it'}, and the location chip shows the distance.` },
      { icon: '📌', label: 'Quick waypoints', sub: 'KaamDhanda → <b>Navigate to work</b> and RoofRaja → <b>Navigate home</b>. Deliveries and errands set one automatically.' },
      { icon: '🧭', label: 'The city is a grid', sub: 'North–south: NH-48, Old Railway Rd, Sohna Rd, Golf Course Rd, Golf Course Ext. Rd. East–west: MG Road, Sector Road, Southern Peripheral Road.' },
      { section: 'Ways to travel' },
      { icon: '🚶', label: 'Walking', sub: 'Free but slow, about 3 game minutes per km. Fine inside a district.' },
      { icon: '🚕', label: 'Chalo or PhatPhat', sub: 'Phone → app → pick a place, Home, Work or your waypoint. Wait by the road, walk to the car with the yellow ring, and press E. You pay on arrival.' },
      { icon: '🚇', label: 'Rapid Link Metro', sub: '₹20–60 between Cyber City, MG Road, Sikanderpur, Golf Course Rd and Sector 54. Open 6 AM–11 PM. The fastest way across the north of the city.' },
      { icon: '🛵', label: 'Your own vehicle', sub: `Rent the ZipZap e-bike (₹199/day) or buy one at Raftaar Motors. Press ${T ? '🛵' : 'F'} to ride. Two-wheelers need a helmet from Sadar Bazaar.` },
      { icon: '🍱', label: 'Stay put and order food', sub: 'Bhookh delivers to wherever you are in about 30 minutes.' },
    ];
    if (tab === 'money') return [
      { icon: '🕘', label: 'Shifts have fixed times', sub: 'You can clock in from 1 hour before to 2 hours after the start. Late means 15% less pay. Missing 3 shifts in a row gets you fired. Sundays are off.' },
      { icon: '📈', label: 'Promotions', sub: 'Every 8 shifts you get a promotion worth +15% pay.' },
      { icon: '🎓', label: 'Skill requirements', sub: 'Coding and Communication come from SkillUp Academy, Fitness from the gym and parks, Style from clothes shops. Check Phone → Profile.' },
      { icon: '📦', label: 'Gig work', sub: 'ZipZap pays per order, plus a tip if you beat the timer. HustleHive freelancing (Coding 2) has no fixed hours.' },
      { icon: '🏠', label: 'Rent', sub: 'Paid automatically every 7 days. If you can\'t pay, you have 3 days before eviction and you lose your deposit.' },
      { icon: '🏦', label: 'Paisa Bank', sub: 'Savings earn 0.2% a day, and money in the bank can\'t be spent on impulse.' },
      { icon: '💸', label: 'PayKaro', sub: 'Every rupee in and out is listed there, including rent, fares, fuel and challans.' },
    ];
    if (tab === 'fame') return [
      { icon: '⭐', label: 'XP and levels', sub: 'Almost everything earns XP: shifts, deliveries, rides, chats, meals, reels and life events. Each level pays a cash bonus and unlocks bigger businesses.' },
      { icon: '🎁', label: 'Daily rewards (G)', sub: 'Come back every real day: a streak reward that grows to ₹6,000 on day 7, a free Lucky Chai Spin, and 3 daily challenges. Clear all 3 for a bonus spin.' },
      { icon: '🏪', label: 'Dhandha: passive income', sub: 'Buy a Chai Tapri, Momo Cart, Cloud Kitchen and more. They earn every game hour, and even while you are away (up to 8 hours). Cash boxes fill up in 12 game hours, so collect often and upgrade.' },
      { icon: '📸', label: 'Reelz: become an influencer', sub: 'Go to a photo spot (Cyber Square, Emerald Golf Club, Skyline Towers…) and post a reel. Style and a good mood mean more views. Viral hits explode your followers, and 1K / 10K / 100K / 1M followers unlock daily brand-deal pay.' },
      { icon: '🎲', label: 'Life events', sub: 'Every few game hours something happens: weddings, scam calls, a friend asking for a loan, a founder\'s pitch, a stray puppy. Your choice changes your money, friends and story.' },
      { icon: '💞', label: 'Love and pets', sub: 'Get a friend to 70 friendship and ask them out. A partner slows how fast your Social drains. Adopt Sheru the street dog when you meet him: he follows you and boosts your reels.' },
      { icon: '🏁', label: 'Night Runs street races', sub: 'At Raftaar Motors (Sohna Road). Ride your vehicle through every orange checkpoint ring. Beat the gold, silver or bronze time for cash prizes.' },
      { icon: '🚘', label: 'Drive passengers', sub: 'With your own vehicle, go online in KaamDhanda. Pick up the waving passenger and drop them at their stop. Fast trips earn tips and 5★.' },
      { icon: '☕', label: 'Golden Chai hunt', sub: `${GOLDEN_CHAI.length} glowing golden cups are hidden across every district. Each pays ₹250, with big bonuses at 10, 20 and all of them. Phone → Profile hints at the nearest one.` },
      { icon: '📈', label: 'Paisa Trade', sub: 'Buy and sell 6 fictional stocks (9 AM–9 PM, Mon–Sat). Prices move every game hour and news can swing them 7–20%.' },
      { icon: '📣', label: 'Share and challenge friends', sub: 'Phone → Share makes a brag card and a challenge code (like RAHUL-L7-S940-D6). Friends enter your code to race your Life Score, and you enter theirs.' },
    ];
    if (tab === 'life') return [
      { icon: '🍛', label: 'Hunger', sub: 'Drops about 4 points an hour. Eat at dhabas, cafés or the mall, or order on Bhookh. A PG includes breakfast.' },
      { icon: '⚡', label: 'Energy', sub: 'Work and jogging drain it. Sleep at home until 7 AM, or take a nap. Better homes restore more. At 0 you faint in the street.' },
      { icon: '❤️', label: 'Health', sub: 'Falls when you are starving, exhausted, hit by traffic or out on bad-AQI days without a mask. At 0 you are rushed to hospital (₹3,000).' },
      { icon: '💬', label: 'Social', sub: 'Chat with people, hang out at Cyber Square, the pub or the cinema, or call friends on Yaari.' },
      { icon: '🤝', label: 'Friends', sub: 'Chat once an hour (+6 friendship). At 25 you can hang out; at 30 they become a friend. People with ❗ have paid errands.' },
      { icon: '🌧️', label: 'Weather and AQI', sub: 'Rain floods roads (slow walking) and adds surge pricing. AQI above 300 harms health, so buy N95 masks.' },
    ];
    return [
      { icon: '💡', label: 'Book a ride before you leave', sub: 'The driver takes a few minutes. Book, then walk toward the nearest road while they come.' },
      { icon: '🏍️', label: 'Beat the jam on a bike', sub: 'At peak hours (8–11 AM, 5–9 PM) cars crawl on NH-48, MG Rd, Sohna Rd and Golf Course Rd. Bike taxis and scooters barely slow down, and surge less.' },
      { icon: '🦓', label: 'Cross at zebra crossings', sub: 'Traffic never stops for you. Getting hit costs 12 health.' },
      { icon: '⛑️', label: 'Buy a helmet first', sub: 'Police nakas (orange cones) fine riders without one ₹1,000, every time you pass.' },
      { icon: '🧾', label: 'Two jobs at once', sub: 'Work a morning shift, then do ZipZap deliveries or HustleHive sessions in the evening.' },
      { icon: '🌅', label: 'Morning yoga is free social', sub: 'Leisure Valley Park, 5–10 AM: social, fitness and a friend, all without spending money.' },
      { icon: '🏠', label: 'Live near work', sub: 'Commuting eats your money and time. Sector 14 and Sushant Lok are central and affordable.' },
      { icon: '💤', label: 'Sleep before a big day', sub: 'You can\'t start a shift with less than 20 energy.' },
      { icon: '🎯', label: 'Goal rewards add up', sub: 'Early goals pay ₹200–800 each, which is enough to cover your first week\'s rent.' },
      { icon: '🗺️', label: 'Use the map to book a ride', sub: 'Tap any spot on the map and choose 🚕 or 🏍️ to get a fare quote there instantly.' },
    ];
  }
  function openHelp(tab = 'start') {
    closePhone(); closeMap();
    const tabsHtml = `<div class="help-tabs">${HELP_TABS.map((t) => `<button data-tab="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.label}</button>`).join('')}</div>`;
    showModal('How to play', 'Gurugram Life guide', [{ html: tabsHtml }, ...helpContent(tab)]);
    $('.modal-box').classList.add('wide');
    $('#modal-body').querySelectorAll('.help-tabs button').forEach((b) => { b.onclick = () => openHelp(b.dataset.tab); });
  }

  // One-time hints that appear the first time something becomes relevant.
  function hint(id, html) {
    if (!S.hints) S.hints = {};
    if (S.hints[id] || store.tips === false) return;
    S.hints[id] = true;
    toast(`💡 ${html}`, 'tip', 9000);
  }
  let hintAt = 0, tipAt = performance.now(), playStart = 0;
  const TIPS = [
    'Book a ride before you leave the building — drivers take a few minutes to arrive.',
    'Bike taxis on PhatPhat skip most peak-hour jams and surge less.',
    'Tap anywhere on the map, then choose 🚕 to get a fare quote to that exact spot.',
    'Leisure Valley morning yoga (5–10 AM) is free social and fitness.',
    'Deposit spare cash at Paisa Bank: 0.2% interest a day.',
    'People with ❗ above their head pay you for quick errands.',
    'Rent the ZipZap e-bike to make delivery timers easily.',
    'Buy a helmet at Sadar Bazaar before riding — nakas fine ₹1,000.',
    'Press H any time for the full help guide.',
    'Order on Bhookh when you\'re far from food; it reaches you anywhere.',
  ];
  function runHints() {
    const now = performance.now();
    if (!playStart) playStart = now;
    if (now - hintAt < 1000) return;
    hintAt = now;
    const P = S.player, onboard = ride && ride.status === 'onboard';
    if (now - playStart > 3000) hint('move', isTouch() ? 'Drag the <b>joystick</b> to walk. Tap <b>❓</b> any time for the help guide.' : `Walk with <b>WASD</b>${use3D ? ', drag the mouse to look around, scroll to zoom' : ''}. Press <b>H</b> any time for the help guide.`);
    if (currentAct && promptEl.textContent.includes('Talk')) hint('npc', `Press <b>E</b> to talk. Chatting builds friendship, and people share job tips.`);
    else if (currentAct && !onboard) hint('door', `You're at an entrance. Press <b>E</b> to see what you can do inside.`);
    if (!onboard && !P.riding && roadAt(P.x, P.y)) hint('road', 'Careful — traffic never stops for you. Cross at the <b>zebra crossings</b> near junctions.');
    if (P.hunger < 35) hint('hungry', 'You\'re getting hungry. Eat at a 🍽️ place or order on <b>Bhookh</b> from your phone.');
    if (P.energy < 30) hint('tired', 'Energy is low. Sleep at home (enter your 🏠 and choose Sleep), or grab a chai for a quick boost.');
    if (darkness() > 0.3) hint('night', 'Night has fallen. The metro closes at 11 PM, and bars stay open until 2 AM.');
    if (S.weather === 'rain') hint('rain', 'It\'s raining: roads waterlog, walking slows down and cab fares surge. PhatPhat bikes surge less.');
    if (isPeak() && (P.riding || onboard)) hint('peak', 'Peak traffic! Cars crawl on the big roads 8–11 AM and 5–9 PM. Two-wheelers get through faster.');
    if (bestVehicle() && !P.riding) hint('vehicle', `You have a vehicle. Press <b>${isTouch() ? '🛵' : 'F'}</b> to ride it.`);
    if (S.waypoint) hint('waypoint', `Waypoint set! Follow the ${use3D ? 'pink light beam' : 'pink arrow'}; the 📍 chip shows how far it is.`);
    if (ride && ride.status === 'waiting') hint('board', 'Your driver is here. Walk to the car with the <b>yellow ring</b> and press <b>E</b> to get in.');
    if (P.money < 1500) hint('broke', 'Running low on cash? ZipZap deliveries pay right away, and goals (Phone → Goals) pay rewards.');
    if (S.home && S.home.nextDue - dayOf(S.time) <= 1 && P.money < HOMES[S.home.key].rent) hint('rentdue' + S.home.nextDue, `Rent of ${inr(HOMES[S.home.key].rent)} is due tomorrow and you can't cover it yet!`);
    if (S.job) hint('shift', 'Be at your workplace near your shift time, step into the yellow ring and press <b>E → Start shift</b>.');
    const nc = nearestChaiHint();
    if (nc && nc.km < 0.5) hint('chaicup', '✨ Something golden is glinting nearby… Golden Chai cups are hidden across the city. Find all of them for big bonuses!');
    if (myVehicle()) hint('races', '🏁 You have wheels! Try the Night Runs street races at Raftaar Motors (Sohna Road), or drive passengers from the KaamDhanda app.');
    if (S.level >= 3) hint('trade', '📈 New app: <b>Paisa Trade</b>. Buy fictional stocks and watch the market move every game hour.');
    if (S.level >= 2 || rewardsPending()) hint('rewards', 'Tap <b>🎁</b> (or press <b>G</b>) for your daily streak reward, a free spin and 3 daily challenges.');
    if (nearSpot()) hint('spot', '📸 This is a photo spot! Open <b>Reelz</b> on your phone and post a reel to gain followers.');
    if (S.level >= 2 && P.money >= 8000) hint('biz', '🏪 You can afford a hustle! Buy a Chai Tapri in the <b>Dhandha</b> app for passive income.');
    if (store.tips !== false && now - tipAt > 240000 && !isUI()) { tipAt = now; toast(`💡 Tip: ${pick(TIPS)}`, 'tip', 8000); }
  }

  function renderKeyLegend() {
    const el = $('#keylegend');
    const show = running && !isTouch() && store.legend !== false;
    el.classList.toggle('hidden', !show);
    if (!show) return;
    el.innerHTML = `<button class="kl-x" title="Hide (turn back on in Settings)">✕</button>
      <span>${kb('W')}${kb('A')}${kb('S')}${kb('D')} walk</span><span>${kb('E')} interact</span><span>${kb('P')} phone</span><span>${kb('M')} map</span><span>${kb('F')} vehicle</span>${use3D ? '<span>drag / ' + kb('Z') + kb('X') + ' camera</span>' : ''}<span>${kb('H')} help</span>`;
    el.querySelector('.kl-x').onclick = () => { store.legend = false; saveStore(); renderKeyLegend(); toast('Key legend hidden. Turn it back on in Phone → Settings.'); };
  }

  // ---------- save / loop ----------
  function save() {
    if (!S || !user || !store.profiles[user]) return;
    S.lastSeen = Date.now();
    store.profiles[user].save = S;
    store.profiles[user].last = Date.now();
    saveStore();
  }
  setInterval(() => { if (running) save(); }, 10000);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  let last = performance.now(), hudT = 0, goalT = 0, dailyT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running && S) {
      if (!isUI()) update(dt);
      if (use3D) render3D(); else render();
      hudT += dt; goalT += dt;
      if (hudT > 0.2) { hudT = 0; updateHUD(); }
      if (goalT > 1) { goalT = 0; checkGoals(); }
      if (!isUI()) { runHints(); maybeEvent(); }
      dailyT += dt; if (dailyT > 20) { dailyT = 0; if (checkDaily()) toast('🌅 New day, new rewards! Open 🎁 for your streak bonus and challenges.', 'good', 8000); checkRival(); }
    }
    requestAnimationFrame(frame);
  }

  renderProfiles();
  requestAnimationFrame(frame);

  // Exposed for automated smoke tests only.
  window.__ggl = { get use3D() { return use3D; }, get state() { return S; }, get ride() { return ride; }, passTime: (m) => passTime(m), openBuilding: (id) => openBuilding(BLD[id]) };
})();
