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
  const MIN_PER_SEC = 2; // one real second = two in-game minutes

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
    s.orders = s.orders || []; s.quests = s.quests || {}; s.naka = s.naka || {}; s.goals = s.goals || {};
    return s;
  }

  let use3D = false;
  const can3D = () => !!(window.GGL3D && window.GGL3D.supported());
  function setGraphics(mode) {
    use3D = mode === '3d' && can3D();
    if (use3D && !window.GGL3D.ready) {
      try { window.GGL3D.init($('#game3d'), { trees, puddles }); } catch (e) { console.warn('3D init failed, using 2D', e); use3D = false; }
    }
    if (use3D) window.GGL3D.setNPCs(npcs);
    $('#game3d').classList.toggle('hidden', !use3D);
    $('#game').classList.toggle('hidden', use3D);
    resize();
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
    updateHUD();
    if (fresh) welcome();
    else toast(`Welcome back, ${esc(S.player.name)}! ${weekday(dayOf(S.time))} ${clock(S.time)}.`, 'good');
  }

  function welcome() {
    const P = S.player;
    showModal(`Swagat hai, ${P.name}! 🙏`, 'You just stepped off the bus at Old Gurugram Bus Adda.', [
      { note: `You have <b>${inr(P.money)}</b> in your PayKaro wallet. Gurugram is expensive — spend wisely.` },
      { icon: '🏠', label: 'Find a place to stay', sub: 'Basera Rooms is right next door, or browse the RoofRaja app.' },
      { icon: '💼', label: 'Get a job', sub: 'Open KaamDhanda on your phone. Chai Chaupal and ZipZap hire freshers.' },
      { icon: '🚕', label: 'Book rides', sub: 'Chalo (cabs & autos) or PhatPhat (bike taxis). Beware peak-hour surge!' },
      { icon: '👋', label: 'Make friends', sub: 'Walk up to people and press E. Some have errands for you (❗).' },
      { note: '<b>Controls:</b> WASD / arrows to walk · Shift to jog · E interact · P phone · M map · F ride your vehicle. On mobile use the joystick and buttons.', blue: true },
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
      P.social -= 0.03 * m * (mods.social == null ? 1 : mods.social);
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
      S.time += step; left -= step;
      if (dayOf(S.time) !== S.lastDay) newDay();
    }
    for (let i = S.orders.length - 1; i >= 0; i--) {
      const o = S.orders[i];
      if (S.time >= o.at) { S.orders.splice(i, 1); applyFood(o.h, o.fx); toast(`🛵 Your Bhookh order arrived: ${o.name}. Delicious!`, 'good'); }
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
  function toast(html, kind) {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.innerHTML = html;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.remove(), 5000);
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
          } else activity(`Eating ${n}…`, 20, { indoor: true }, () => { applyFood(h, fx); toast(`😋 ${n} — ekdum mast!`, 'good'); });
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
      { icon: '🏃', label: 'Go for a jog', sub: '1h · Fitness +0.2, Energy −', onClick: () => activity('Jogging…', 60, { energy: 3, hunger: 1.6 }, () => gainSkill('fitness', 0.2)) },
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
        onClick: () => { if (spend(fare, `Rapid Link Metro`)) activity('Riding the Rapid Link Metro…', 4 + hops * 4, { indoor: true }, () => { const d = door(x); S.player.x = d.x; S.player.y = d.y; S.player.riding = null; arrivalChecks(); }); } };
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
        onClick: () => { if (spend(300, 'Iron Paradise session')) activity('Leg day. No skipping.', 90, { energy: 3, hunger: 1.5, indoor: true }, () => { gainSkill('fitness', 0.35); addFriend('Harsh', 3); }); } },
      { icon: '🥤', label: 'Protein shake', sub: 'Hunger +15, Energy +5', right: '₹180', onClick: () => { if (spend(180, 'Protein shake')) { applyFood(15, { energy: 5 }); toast('💪 Gains!'); closeModal(); } } },
    ]);
  }

  function skillMenu(b) {
    const P = S.player;
    const course = (label, k, cost, mins, gain) => ({
      icon: '🎓', label, sub: `${mins / 60}h · ${SKILL_LABEL[k]} +${gain} (now ${P.skills[k].toFixed(1)}/5)`, right: cost ? inr(cost) : 'Free', disabled: P.skills[k] >= 5 || P.energy < 15,
      onClick: () => { if (cost && !spend(cost, `SkillUp: ${label}`)) return; activity(`Studying ${label}…`, mins, { energy: 1.4, indoor: true }, () => { gainSkill(k, gain); S.stats.courses++; toast(`📚 ${SKILL_LABEL[k]} is now ${P.skills[k].toFixed(1)}!`, 'good'); }); },
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
    showModal(b.name, 'Zero down-payment? No. Full payment only.', [{ note: 'Two-wheelers dodge traffic jams better; cars stay slow in peak hours. Ride without a helmet and the traffic police nakas will fine you ₹1,000.' }, ...items]);
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
        toast(`💬 Nice chat with ${n.name}.`, 'good'); closeModal();
      } },
      { icon: '💡', label: 'Ask about jobs', onClick: () => { toast(`${n.name}: "${JOB_TIPS[n.occ] || 'Check KaamDhanda on your phone — and learn skills at SkillUp Academy.'}"`); addFriend(n.name, 1); closeModal(); } },
      { icon: '☕', label: 'Hang out over chai & snacks', sub: f.fs >= 25 ? '2h · Friendship +12 · Social +30' : 'Become closer first (friendship 25)', right: '₹400', disabled: f.fs < 25,
        onClick: () => { if (spend(400, `Hangout with ${n.name}`)) activity(`Hanging out with ${n.name}…`, 120, { social: -8 }, () => { addFriend(n.name, 12); applyFood(15); }); } },
    ];
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
        toast(late ? `📦 Delivered, but late. ${g.cust} rated you 3★. Earned ${inr(pay)}.` : `📦 Delivered on time! ${g.cust} tipped ${inr(tip)}. Earned ${inr(pay + tip)}.`, late ? '' : 'good');
        checkGoals();
      }
    }
    if (S.errand) {
      const d = door(BLD[S.errand.bid]);
      if (dist(P.x, P.y, d.x, d.y) < 55) {
        earn(S.errand.reward, `Errand for ${S.errand.npc}`);
        addFriend(S.errand.npc, 15);
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
    for (const b of BUILDINGS) if (b.solid && vis(b.x - 10, b.y - 10, b.w + 30, b.h + 30)) drawBuilding(ctx, b, night);
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
      vehTwo: P.riding ? VEHICLES[P.riding].two : false,
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
    if (S.gig) { const left = Math.round(S.gig.allowed - (S.time - S.gig.start)); return `📦 Deliver ${esc(S.gig.item)} to ${BLD[S.gig.bid].name} · ${left > 0 ? left + ' min left' : 'LATE'}`; }
    if (S.errand) return `❗ Errand for ${S.errand.npc}: ${esc(S.errand.label)} → ${BLD[S.errand.bid].name}`;
    if (S.player.hunger < 20) return '🍛 You\'re starving! Eat something (or order on Bhookh).';
    if (S.player.energy < 20) return '⚡ You\'re exhausted. Head home and sleep.';
    if (S.job && !JOBS[S.job.id].flexible) {
      const J = JOBS[S.job.id], h = hourF(S.time), until = (J.start - h + 24) % 24;
      if (until < 3 && S.time - S.job.lastShiftAt > 12 * 60) return `🕘 Shift at ${BLD[J.building].name} starts ${fmtHour(J.start)} (${until < 1 ? 'soon!' : `in ${Math.floor(until)}h`})`;
    }
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
      maps: () => { closePhone(); openMap(); } })[id](id, ...args);
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
    fillList(pad, [{ note: `${friendCount()} friend(s) · Social ${Math.round(S.player.social)}/100` }, ...known.map(([name, f]) => {
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
      { icon: '📊', label: `${S.stats.rides} rides · ${S.stats.deliveries} deliveries · ${S.stats.shifts} shifts`, sub: `${S.stats.km.toFixed(1)} km driven · ${friendCount()} friends` },
    ]);
  }

  function settingsApp() {
    const pad = appShell('settings');
    fillList(pad, [
      { icon: '💾', label: 'Save game', sub: 'Also autosaves every few seconds', onClick: () => { save(); toast('Game saved.', 'good'); } },
      { icon: '🎮', label: 'Controls', sub: 'WASD/arrows move · Shift jog · E interact · P phone · M map · F vehicle · Esc close · 3D: drag or Z/X to turn the camera, scroll to zoom' },
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
    $('#map-hint').textContent = mapMode ? 'Tap where you want to go' : 'Tap anywhere to set a waypoint';
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

  // ---------- save / loop ----------
  function save() {
    if (!S || !user || !store.profiles[user]) return;
    store.profiles[user].save = S;
    store.profiles[user].last = Date.now();
    saveStore();
  }
  setInterval(() => { if (running) save(); }, 10000);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  let last = performance.now(), hudT = 0, goalT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running && S) {
      if (!isUI()) update(dt);
      if (use3D) render3D(); else render();
      hudT += dt; goalT += dt;
      if (hudT > 0.2) { hudT = 0; updateHUD(); }
      if (goalT > 1) { goalT = 0; checkGoals(); }
    }
    requestAnimationFrame(frame);
  }

  renderProfiles();
  requestAnimationFrame(frame);

  // Exposed for automated smoke tests only.
  window.__ggl = { get use3D() { return use3D; }, get state() { return S; }, get ride() { return ride; }, passTime: (m) => passTime(m), openBuilding: (id) => openBuilding(BLD[id]) };
})();
