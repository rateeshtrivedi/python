// Gurugram Life world rules, shared by the Node server (multiplayer) and the browser (solo mode).
// Owns money, purchases, missions, leaderboards, auctions, crews, turf, the belt, battles and events.
import * as D from './data.js';

const INTERIORS = ['mall', 'office', 'theka', 'dhaba', 'club'];

// opts: { rid(n) -> random id string, load() -> saved world object or null, save(jsonString), bots: boolean }
export function createWorld(opts) {
const rid = opts.rid;
let db = { profiles: {}, crews: {}, belt: null, plates: {}, turf: {} };
try { const saved = opts.load(); if (saved) db = { ...db, ...saved }; } catch { /* fresh world */ }
let dirty = false;
function persist(force) { if (!dirty && !force) return; dirty = false; opts.save(JSON.stringify(db)); }

// ------------------------------------------------------------------ helpers
const now = () => Date.now() / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
const pick = a => a[Math.floor(Math.random() * a.length)];

function newProfile(name, color) {
  return {
    id: rid(10), token: rid(32), name, color, money: 2000, xp: 0, level: 1, respect: 0, rank: 0,
    vehicles: [], cur: null, houses: ['pg'], home: 'pg', outfit: { shirt: null, hat: 'none', shades: false },
    bling: [], mods: {}, plate: null, crew: null, c: {}, missions: { active: [], next: 0, round: 0 },
    daily: { last: '', streak: 0 }, blessed: '', party: 0, tutDone: false, created: Date.now(), lastSeen: Date.now(),
  };
}
function publicProfile(p) { const { token, ...rest } = p; return rest; }


// ------------------------------------------------------------------ live state
const conns = new Map(); // id -> conn
let announcements = [];
function send(c, msg) { c.out(msg); }
function broadcast(msg, filter) { for (const c of conns.values()) if (!filter || filter(c)) c.out(msg); }
function announce(text, kind) {
  const a = { text, kind: kind || 'info', at: Date.now() };
  announcements.push(a); if (announcements.length > 25) announcements.shift();
  broadcast({ t: 'ann', ...a });
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function placeName(st) {
  if (st.in) return { mall: 'Ambience Mall', office: 'TechNova Towers', theka: 'Desi Theka No.1', dhaba: 'Sher-e-Haryana Dhaba', club: 'Neon Nights' }[st.in] || 'Gurugram';
  const d = D.districtAt(st.x, st.z); return d ? d[2] : 'Gurugram ki sadak';
}
function crewOf(p) { return p.crew && db.crews[p.crew] ? db.crews[p.crew] : null; }
function pinfo(c) {
  const p = c.p; const cr = crewOf(p);
  return {
    t: 'pi', id: p.id, name: p.name, color: p.color, look: p.look || null, outfit: p.outfit, bling: p.bling, plate: p.plate, level: p.level,
    title: D.respectTitle(p.respect), crew: cr ? { tag: cr.tag, color: cr.color } : null,
    mods: (p.cur && p.mods[p.cur]) || {}, belt: !!(db.belt && db.belt.id === p.id), tint: c.tint && c.tint.until > now() ? c.tint.color : null,
  };
}
function sendProfile(c) { send(c, { t: 'profile', p: publicProfile(c.p) }); }

// ------------------------------------------------------------------ economy
function addXP(c, n) {
  const p = c.p; p.xp += n; let up = false; ensureMissions(p);
  while (p.xp >= D.xpNeed(p.level)) {
    if (!tasksDone(p)) { p.xp = D.xpNeed(p.level); if (n > 0 && rateOk(c, 'xpcap', 60)) send(c, { t: 'toast', text: 'XP full! Level ' + (p.level + 1) + ' ke liye aaj ke kaam mein se 3 poore kar' }); break; }
    p.xp -= D.xpNeed(p.level); p.level++; up = true; ensureMissions(p);
  }
  if (up) { const bonus = 200 * p.level; p.money += bonus; send(c, { t: 'toast', text: 'Level up! Ab tu Level ' + p.level + ' se. Bonus ' + fmt(bonus), kind: 'money', sfx: 'level' }); broadcast(pinfo(c)); }
  dirty = true;
}
function track(c, k, n = 1) {
  const p = c.p; p.c[k] = (p.c[k] || 0) + n; dirty = true;
  ensureMissions(p); const ms = p.missions; let done = false, hit = false;
  for (const a of ms.active) {
    if (a.k !== k || a.done) continue; hit = true;
    if ((p.c[k] || 0) - a.base >= a.n) { a.done = true; p.money += a.r; done = true; send(c, { t: 'toast', text: 'Kaam poora: ' + a.t + ' · +' + fmt(a.r), kind: 'money', sfx: 'cash' }); }
  }
  if (hit && !done) send(c, { t: 'mprog', k, v: p.c[k] });
  if (!done) return;
  const nDone = ms.active.filter(a => a.done).length;
  if (nDone === ms.active.length && !ms.bonusPaid) {
    ms.bonusPaid = true; const st = p.streak && p.streak.day === prevDay(ms.day) ? p.streak : { n: 0 }; p.streak = { n: st.n + 1, day: ms.day };
    const bonus = D.dailyBonus(p.level, p.streak.n - 1); p.money += bonus; p.respect += 10;
    send(c, { t: 'daydone', bonus, streak: p.streak.n }); announce(p.name + ' ne aaj ke saare kaam poore kar diye! Streak: ' + p.streak.n + ' din', 'event');
  } else if (nDone === 3) send(c, { t: 'toast', text: 'Teen kaam poore! Ab XP poora hote hi level up hoga. Baaki kaam = bada bonus.', kind: 'money', sfx: 'level' });
  addXP(c, 40); sendProfile(c);
}
// Aaj ke kaam: seven tasks a day from D.DAILY, picked per player per day (Gurugram date). Three done unlock the next level; all seven pay a streak bonus.
const istDay = (t = Date.now()) => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10);
const prevDay = d => new Date(Date.parse(d + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
function tasksDone(p) { const a = p.missions.active; return a.length > 0 && a.filter(x => x.done).length >= Math.min(3, a.length); }
const istWeek = () => { const d = new Date(Date.now() + 5.5 * 3600e3); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
function ensureDon(p) { const wk = istWeek(); if (!p.don || p.don.wk !== wk) p.don = { wk, ch: 0, last: null, champ: p.don && p.don.champ || null }; }
function ensureMissions(p) {
  const ms = p.missions; const day = istDay(); ensureDon(p); if (!p.dayBase || p.dayBase.day !== day) p.dayBase = { day, c: { ...p.c }, money: p.money }; if (ms.v === 2 && ms.day === day && ms.active.length) return;
  let seed = 7; for (const ch of p.id + day) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const pk = a => a[Math.floor(r() * a.length)];
  const lvl = p.level;
  ms.active = D.DAILY_SLOTS.map(slot => {
    const o = pk(D.DAILY[slot].filter(x => !(x.min && lvl < x.min))); const n = o.n(lvl);
    const a = { slot, k: o.k, n, r: Math.round(o.r * (1 + 0.1 * Math.min(lvl, 10)) / 10) * 10, base: p.c[o.k] || 0, done: false, go: o.go || null };
    if (o.k === 'badla') { const s = pk(D.BADLA_SPOTS); Object.assign(a, { enemy: pk(D.BADLA_ENEMY), friend: pk(D.BADLA_FRIEND), x: s[0], z: s[1], place: s[2] }); }
    a.t = o.t.replace('{n}', o.money ? fmt(n) : n).replace('{enemy}', a.enemy).replace('{friend}', a.friend).replace('{place}', a.place); return a;
  });
  Object.assign(ms, { v: 2, day, lvl, bonusPaid: false });
}
function credit(c, amount, why) {
  amount = Math.round(amount); c.p.money += amount; track(c, 'earned', amount);
  send(c, { t: 'toast', text: '+' + fmt(amount) + (why ? ' · ' + why : ''), kind: 'money', sfx: 'cash' });
}
function charge(c, amount) { if (c.p.money < amount) return false; c.p.money -= amount; dirty = true; return true; }

// ------------------------------------------------------------------ world event schedule
let worldEvent = null; // {type,start,end,data}
// weather: random and unpredictable. Random start, spells of ~1-15 minutes, rain usually builds up or eases off
// a step at a time, but now and then a sudden cloudburst or an abrupt stop, like Gurugram in the monsoon.
const W_PICK = () => { const r = Math.random(); return r < 0.4 ? 0 : r < 0.58 ? 1 : r < 0.74 ? 2 : r < 0.9 ? 3 : 4; };
const W_SPELL = lvl => Math.min(1200, (lvl >= 3 ? 50 + Math.random() * 400 : 70 + Math.random() * 830) * (0.6 + Math.random() * 0.8));
let weather = (() => { const lvl = W_PICK(), t = now(); return { lvl, since: t, until: t + W_SPELL(lvl) * Math.random() }; })();
function weatherTick() {
  const t = now(); if (t < weather.until) return; const cur = weather.lvl; let lvl; const r = Math.random();
  if (r < 0.12) lvl = W_PICK(); // sudden jump: cloudburst out of nowhere, or rain stops dead
  else if (r < 0.3 && t - weather.since < 1200) lvl = cur; // the same weather carries on a while longer (never past ~20 min)
  else { const step = Math.random() < 0.75 ? 1 : 2; lvl = Math.max(0, Math.min(4, cur + (Math.random() < (cur === 0 ? 0.55 : cur === 4 ? 0.15 : 0.45) ? step : -step))); if (lvl === cur) lvl = cur === 0 ? 1 : cur - 1; }
  const since = lvl === cur ? weather.since : t; weather = { lvl, since, until: Math.min(t + W_SPELL(lvl), since + 1200) }; if (lvl !== cur) broadcast({ t: 'weather', w: weather });
}
let eventIdx = Number((globalThis.process && globalThis.process.env && globalThis.process.env.GL_FIRST_EVENT_IDX) || 0);
const ENV = (globalThis.process && globalThis.process.env) || {}; // tests can start the event loop early at a chosen event
let nextEventAt = now() + (Number(ENV.GL_FIRST_EVENT_S) || 90), soonSent = false;
function startEvent() {
  const type = D.EVENT_ORDER[eventIdx++ % D.EVENT_ORDER.length];
  const def = D.WORLD_EVENTS[type]; const t = now();
  worldEvent = { type, name: def.name, start: t, end: t + def.dur, data: {}, rush: [] }; soonSent = false;
  if (type === 'thaila') { const R = [-375, -225, -75, 75, 225, 375]; const x = pick(R.slice(1, 5)), z = pick(R.slice(1, 5)); const d = D.districtAt(x + 20, z + 20); worldEvent.data = { x, z, place: d ? d[2] : 'Gurugram', prize: 1500 + Math.floor(Math.random() * 6) * 250 }; worldEvent.name = 'Paison ka thaila gira at ' + worldEvent.data.place + '!'; }
  if (type === 'flood') worldEvent.data.districts = D.FLOOD_DISTRICTS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
  if (type === 'ipl') worldEvent.data = { teams: D.IPL_TEAMS, runs: [0, 0], wkts: [0, 0], balls: 0, inn: 0, target: 0, cheers: [0, 0], last: '' };
  broadcast({ t: 'event', ev: worldEvent });
  announce('Abhi shuru: ' + def.name + '!', 'event');
}
function endEvent() {
  if (!worldEvent) return;
  if (worldEvent.type === 'ipl') { const d = worldEvent.data; const w = d.runs[1] > d.runs[0] ? 1 : 0; announce(D.IPL_TEAMS[w] + ' ne match jeet liya! ' + d.runs[0] + '/' + d.wkts[0] + ' vs ' + d.runs[1] + '/' + d.wkts[1], 'event'); }
  worldEvent = null; nextEventAt = now() + 120;
  broadcast({ t: 'event', ev: null });
}
function iplTick() {
  const d = worldEvent.data; if (d.inn > 1) return;
  const r = Math.random(); let txt;
  if (r < 0.06) { d.wkts[d.inn]++; txt = 'OUT! Wicket gir gaya'; }
  else if (r < 0.2) { d.runs[d.inn] += 4; txt = 'CHAUKA!'; }
  else if (r < 0.28) { d.runs[d.inn] += 6; txt = 'CHHAKKA! Ball Cyber Hub ke bahar'; }
  else { const s = pick([0, 1, 1, 2, 1, 0, 3]); d.runs[d.inn] += s; txt = s ? s + ' run' : 'Dot ball'; }
  d.balls++; d.last = txt;
  if (d.balls >= 60 || d.wkts[d.inn] >= 10 || (d.inn === 1 && d.runs[1] > d.runs[0])) { d.inn++; d.balls = 0; }
  broadcast({ t: 'ipl', d });
}

// ------------------------------------------------------------------ VIP plate auction
let auction = null; // {plate, ends, bid, by, byName}
let nextAuctionAt = now() + 45;
function freePlates() { return D.VIP_PLATES.filter(pl => !db.plates[pl]); }
function startAuction() {
  const free = freePlates(); if (!free.length) { nextAuctionAt = now() + 600; return; }
  auction = { plate: pick(free), ends: now() + 180, bid: 0, by: null, byName: null };
  broadcast({ t: 'auction', a: auction });
  announce('VIP number plate ki boli shuru: ' + auction.plate + '. Phone → Plates', 'auction');
}
function endAuction() {
  const a = auction; auction = null; nextAuctionAt = now() + 75;
  if (a.by) {
    const p = Object.values(db.profiles).find(x => x.id === a.by);
    if (p && p.money >= a.bid) {
      p.money -= a.bid; if (p.plate && db.plates[p.plate] === p.id) delete db.plates[p.plate];
      p.plate = a.plate; db.plates[a.plate] = p.id; dirty = true;
      announce(p.name + ' ne ' + fmt(a.bid) + ' mein VIP plate ' + a.plate + ' le li! Ab gaadi pe chamkegi.', 'showoff');
      const c = conns.get(p.id); if (c) { track(c, 'showoff'); addXP(c, 100); p.respect += 25; sendProfile(c); broadcast(pinfo(c)); }
    } else announce('Boli fail: ' + (a.byName || 'Bidder') + ' ke paas paise kam pad gaye. ' + a.plate + ' agli baar.', 'auction');
  } else announce('Plate ' + a.plate + ' pe kisi ne boli nahi lagayi.', 'auction');
  broadcast({ t: 'auction', a: null });
}
function randomPlate() {
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  for (;;) { const pl = 'HR26 ' + L[Math.floor(Math.random() * L.length)] + L[Math.floor(Math.random() * L.length)] + ' ' + String(Math.floor(Math.random() * 9000) + 1000); if (!db.plates[pl]) return pl; }
}

// ------------------------------------------------------------------ crews & turf ("ilaaka")
function crewList() {
  const owned = {}; for (const [d, t] of Object.entries(db.turf)) if (t.owner) owned[t.owner] = (owned[t.owner] || 0) + 1;
  return Object.values(db.crews).map(cr => ({ id: cr.id, name: cr.name, tag: cr.tag, color: cr.color, members: cr.members.length, leader: cr.leaderName, turf: owned[cr.id] || 0 }));
}
function turfView() { const o = {}; for (const [d, t] of Object.entries(db.turf)) if (t.owner && db.crews[t.owner]) o[d] = { tag: db.crews[t.owner].tag, color: db.crews[t.owner].color }; return o; }
function turfPoints(district, crewId, pts) {
  const t = db.turf[district] || (db.turf[district] = { pts: {}, owner: null });
  t.pts[crewId] = (t.pts[crewId] || 0) + pts;
}
function turfTick() {
  for (const c of conns.values()) {
    if (!c.p.crew || !c.st || c.st.in) continue; const d = D.districtAt(c.st.x, c.st.z); if (d) turfPoints(d[2], c.p.crew, 1);
  }
  let changed = false;
  for (const [name, t] of Object.entries(db.turf)) {
    for (const k of Object.keys(t.pts)) { t.pts[k] *= 0.985; if (t.pts[k] < 0.5 || !db.crews[k]) delete t.pts[k]; }
    let best = null, bp = 0; for (const [k, v] of Object.entries(t.pts)) if (v > bp) { bp = v; best = k; }
    const owner = bp >= 10 ? best : (t.owner && t.pts[t.owner] >= 5 ? t.owner : null);
    if (owner !== t.owner) {
      t.owner = owner; changed = true;
      if (owner) announce('Crew [' + db.crews[owner].tag + '] ' + db.crews[owner].name + ' ne ' + name + ' pe kabza kar liya!', 'crew');
    }
  }
  if (changed) { dirty = true; broadcast({ t: 'turf', turf: turfView(), crews: crewList() }); }
}
function turfIncome() {
  const owned = {}; for (const t of Object.values(db.turf)) if (t.owner) owned[t.owner] = (owned[t.owner] || 0) + 1;
  for (const c of conns.values()) { const n = owned[c.p.crew]; if (n) { const amt = 20 * Math.min(10, n); c.p.money += amt; send(c, { t: 'toast', text: 'Ilaaka bonus: +' + fmt(amt) + ' (' + n + ' areas)', kind: 'money' }); sendProfile(c); } }
}

// ------------------------------------------------------------------ belt (akhara champion of the day)
function beltCheckDay() { if (db.belt && db.belt.day !== today()) { announce('Naya din: akhara ka belt wapas Pehlwan Bhola ke paas. Jeeto aur champion bano!', 'fight'); db.belt = null; dirty = true; broadcast({ t: 'belt', belt: null }); } }
function giveBelt(c) {
  const old = db.belt; db.belt = { id: c.p.id, name: c.p.name, day: today() }; dirty = true;
  announce(c.p.name + ' ab Leisure Valley akhara ka CHAMPION se! Belt unke paas.', 'fight');
  c.p.respect += 40; addXP(c, 120); sendProfile(c); broadcast(pinfo(c)); broadcast({ t: 'belt', belt: db.belt });
  if (old) { const oc = conns.get(old.id); if (oc) broadcast(pinfo(oc)); }
}
function inAkhara(st) { return st && !st.in && Math.hypot(st.x - D.SPOTS.akhara.x, st.z - D.SPOTS.akhara.z) < D.SPOTS.akhara.r + 2; }

// ------------------------------------------------------------------ party, roast battle, dance-off
let party = null; // {host, hostName, ends, guests:Set}
let roast = null; // {id,a,b,aName,bName,phase,round,lines:[[a,b]...],deadline,votes:{a:Set,b:Set}}
const invites = new Map(); // key target:kind -> {from, until}
let dance = null; // {a,b,seq,start,scores:{}}

function roastState() {
  if (!roast) return null;
  return { id: roast.id, a: roast.a, b: roast.b, aName: roast.aName, bName: roast.bName, phase: roast.phase, round: roast.round, lines: roast.lines, deadline: roast.deadline, votes: [roast.votes.a.size, roast.votes.b.size] };
}
function roastAdvance() {
  if (!roast) return;
  const r = roast; const t = now();
  if (r.phase === 'write') {
    const cur = r.lines[r.round - 1];
    if ((cur[0] && cur[1]) || t >= r.deadline) {
      if (!cur[0]) cur[0] = '(chup reh gaya)'; if (!cur[1]) cur[1] = '(chup reh gaya)';
      if (r.round < 3) { r.round++; r.lines.push(['', '']); r.deadline = t + 30; }
      else { r.phase = 'vote'; r.deadline = t + 25; announce('Roast battle: ' + r.aName + ' vs ' + r.bName + '. Vote karo! Phone → Battles', 'fight'); }
      broadcast({ t: 'roast', r: roastState() });
    }
  } else if (r.phase === 'vote' && t >= r.deadline) {
    const va = r.votes.a.size, vb = r.votes.b.size; const ca = conns.get(r.a), cb = conns.get(r.b);
    let msg;
    if (va === vb) { msg = 'Roast battle draw: ' + r.aName + ' ' + va + ' - ' + vb + ' ' + r.bName; for (const c of [ca, cb]) if (c) { c.p.respect += 5; addXP(c, 25); sendProfile(c); } }
    else { const w = va > vb ? ca : cb, wn = va > vb ? r.aName : r.bName; msg = wn + ' ne roast battle jeeti! (' + Math.max(va, vb) + ' - ' + Math.min(va, vb) + ')'; if (w) { w.p.respect += 15; addXP(w, 60); sendProfile(w); } }
    announce(msg, 'fight'); roast = null; broadcast({ t: 'roast', r: null });
  }
}
function danceAdvance() {
  if (!dance) return; const t = now();
  if (t >= dance.start + 14 || (dance.scores[dance.a] && dance.scores[dance.b])) {
    const sa = dance.scores[dance.a] || { hits: 0, ms: 1e9 }, sb = dance.scores[dance.b] || { hits: 0, ms: 1e9 };
    const aWins = sa.hits > sb.hits || (sa.hits === sb.hits && sa.ms < sb.ms);
    const w = conns.get(aWins ? dance.a : dance.b), l = conns.get(aWins ? dance.b : dance.a);
    if (w) { w.p.party += 20; w.p.respect += 5; addXP(w, 40); sendProfile(w); }
    announce((w ? w.p.name : 'Koi') + ' ne Neon Nights mein dance-off jeeta' + (l ? ' vs ' + l.p.name : '') + ' (' + Math.max(sa.hits, sb.hits) + '/10)!', 'party');
    broadcast({ t: 'dance', d: null, result: { winner: w ? w.p.id : null } }, c => c.p.id === dance.a || c.p.id === dance.b);
    dance = null;
  }
}

// ------------------------------------------------------------------ leaderboards
let lbCache = null;
function leaderboards() {
  const ps = Object.values(db.profiles).filter(p => p.lastSeen > Date.now() - 30 * 864e5);
  const top = (fn, n = 10) => ps.map(p => ({ id: p.id, name: p.name, v: fn(p), crew: crewOf(p) ? crewOf(p).tag : null })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n);
  lbCache = { rich: top(D.netWorth), fight: top(p => p.c.kos || 0), party: top(p => p.party || 0), respect: top(p => p.respect || 0), crews: crewList().sort((a, b) => b.turf - a.turf || b.members - a.members).slice(0, 10) };
  return lbCache;
}

// ------------------------------------------------------------------ message handlers
const EV = { // client-reported events: counters, small xp/respect, cooldown seconds
  visit_mall: { cd: 30 }, visit_club: { cd: 30 }, dance: { cd: 20, xp: 5, party: 1 }, punches: { cd: 0.3 }, eat_market: { cd: 5 }, eat_dhaba: { cd: 5 },
  gyaan: { cd: 60, xp: 15 }, tut: { cd: 1, xp: 15 }, npc_ko: { cd: 4, xp: 25, respect: 6 }, card: { cd: 60, xp: 30 },
  baraat: { cd: 10, xp: 10, respect: 2, party: 2 }, ipl_watch: { cd: 30, xp: 10 }, escape: { cd: 60, respect: 10, xp: 30 }, chaupal: { cd: 60 },
  quest_start: { cd: 5 }, office_chai: { cd: 40 }, jacks: { cd: 20, xp: 10, respect: 3 }, badla: { cd: 20, xp: 30, respect: 8 },
};
function rateOk(c, key, cd) { const t = now(); c.cool = c.cool || {}; if ((c.cool[key] || 0) > t) return false; c.cool[key] = t + cd; return true; }

function handleBuy(c, m) {
  const p = c.p; const kind = m.kind, id = m.id; let name, price, after;
  const fail = text => ({ ok: false, error: text });
  if (kind === 'food') {
    const f = D.FOOD[id]; if (!f) return fail('Yeh menu mein nahi hai');
    if (m.shop && !(D.FOOD_SHOPS[m.shop] || []).includes(id)) return fail('Yeh yahan nahi milta');
    name = f[0]; price = f[1];
    after = () => { if (m.shop === 'dhaba') track(c, 'eat_dhaba'); if (m.shop === 'sweets' || m.shop === 'chaat') track(c, 'eat_market'); if (m.shop === 'theka') track(c, 'theka'); addXP(c, 6); };
  } else if (kind === 'misc') {
    const it = D.MISC[id]; if (!it) return fail('Unknown item'); name = it[0]; price = it[1];
    if (id === 'bottle' && c.st?.in !== 'club') return fail('Bottle service sirf club mein');
    if (id === 'notes' && worldEvent?.type !== 'baraat') return fail('Abhi koi baraat nahi chal rahi');
    if (id === 'firework' && worldEvent?.type !== 'diwali') return fail('Rocket sirf Diwali pe');
    if (id === 'party') { if (!p.houses.includes('farm')) return fail('Party ke liye Bhondsi farmhouse chahiye'); if (party) return fail('Ek party pehle se chal rahi se'); }
    if (id === 'plate') { after = () => { if (p.plate && db.plates[p.plate] === p.id) delete db.plates[p.plate]; p.plate = randomPlate(); db.plates[p.plate] = p.id; broadcast(pinfo(c)); track(c, 'showoff'); }; }
    if (id === 'movie') after = () => { track(c, 'movies'); addXP(c, 50); p.respect += 3; };
    if (id === 'metro') after = () => { track(c, 'metro'); addXP(c, 10); };
    if (id === 'lucky') after = () => {
      const r = Math.random(); const prize = r < 0.45 ? 0 : r < 0.7 ? 100 : r < 0.86 ? 300 : r < 0.95 ? 500 : r < 0.99 ? 1000 : 5000;
      if (prize) credit(c, prize, 'Lucky draw'); c.lastPrize = prize; if (prize >= 1000) announce(p.name + ' ne Ambience Mall lucky draw mein ' + fmt(prize) + ' jeete!', 'showoff');
    };
    if (id === 'bottle') after = () => { p.party += 50; p.respect += 10; announce(p.name + ' ne Neon Nights mein poore club ke liye bottle mangwayi! Sab ki taraf se cheers!', 'party'); broadcast({ t: 'fx', fx: 'bottle', by: p.id }, x => x.st?.in === 'club'); };
    if (id === 'notes') after = () => { p.party += 5; p.respect += 10; track(c, 'showoff'); announce(p.name + ' ne baraat mein ' + fmt(1000) + ' ke note udaye!', 'party'); broadcast({ t: 'fx', fx: 'notes', x: c.st?.x, z: c.st?.z }); };
    if (id === 'firework') after = () => broadcast({ t: 'fx', fx: 'firework', x: c.st?.x, z: c.st?.z });
    if (id === 'party') after = () => { party = { host: p.id, hostName: p.name, ends: now() + 300, guests: new Set() }; announce(p.name + ' ki Bhondsi farmhouse party shuru! Phone → Events → Join party', 'party'); broadcast({ t: 'party', party: partyView() }); };
    if (id === 'challan_chase' || id === 'challan' || id === 'challan_big' || id === 'challan_film' || id === 'ko_bill') { price = Math.min(price, p.money); }
  } else if (kind === 'vehicle') {
    const v = D.VEH[id]; if (!v || !D.BUY_VEHICLES.includes(id)) return fail('Yeh gaadi nahi bikti'); if (p.vehicles.includes(id)) return fail('Yeh gaadi pehle se teri se');
    name = v.name; price = v.price; after = () => { p.vehicles.push(id); p.cur = id; track(c, 'vehbuy'); addXP(c, 80); p.respect += 10; if (price >= 150000) announce(p.name + ' ne nayi ' + v.name + ' kharidi! Dekho kya swag se.', 'showoff'); };
  } else if (kind === 'house') {
    const h = D.HOUSES[id]; if (!h) return fail('Unknown property'); if (p.houses.includes(id)) return fail('Pehle se tera se');
    name = h.name; price = h.price; after = () => { p.houses.push(id); p.home = id; addXP(c, 150); p.respect += 25; if (price >= 500000) announce(p.name + ' ab ' + h.name + ' ke maalik hain!', 'showoff'); };
  } else if (kind === 'hat') {
    const h = D.HATS[id]; if (!h) return fail('Unknown hat'); name = h[0]; price = p.outfit.hat === id ? 0 : h[1];
    after = () => { p.outfit.hat = id; track(c, 'mallbuy'); broadcast(pinfo(c)); };
  } else if (kind === 'shirt') {
    const i = Math.floor(num(id, -1)); if (i < 0 || i >= D.SHIRTS.length) return fail('Unknown shirt'); name = D.SHIRT_NAMES[i] + ' shirt'; price = D.MISC.shirt[1];
    after = () => { p.outfit.shirt = i; track(c, 'mallbuy'); broadcast(pinfo(c)); };
  } else if (kind === 'shades') {
    name = 'Kaala chashma'; price = p.outfit.shades ? 0 : 1200; after = () => { p.outfit.shades = !p.outfit.shades; p.respect += 2; broadcast(pinfo(c)); };
  } else if (kind === 'bling') {
    const b = D.BLING[id]; if (!b) return fail('Unknown item'); if (p.bling.includes(id)) return fail('Pehle se pehna hua se');
    name = b.name; price = b.price; after = () => { p.bling.push(id); p.respect += Math.round(b.show / 2); track(c, 'showoff'); broadcast(pinfo(c)); if (price >= 25000) announce(p.name + ' ne ' + b.name + ' pehen li. Chamak dekh lo!', 'showoff'); };
  } else if (kind === 'mod') {
    const veh = m.veh, mod = D.MODS[id]; if (!mod) return fail('Unknown mod'); if (!p.vehicles.includes(veh)) return fail('Pehle gaadi to le');
    const cur = p.mods[veh] || {}; let val = true;
    if (id === 'glow') { val = clamp(Math.floor(num(m.opt, 0)), 0, D.GLOW_COLORS.length - 1); }
    if (id === 'sticker') { val = clamp(Math.floor(num(m.opt, 0)), 0, D.STICKERS.length - 1); }
    const owned = cur[id] !== undefined && cur[id] !== false;
    name = mod.name; price = owned && (id === 'glow' || id === 'sticker') ? 500 : owned ? 0 : mod.price;
    if (owned && id !== 'glow' && id !== 'sticker') return fail('Yeh mod pehle se laga hai');
    after = () => { p.mods[veh] = { ...cur, [id]: val }; p.respect += 3; track(c, 'showoff'); broadcast(pinfo(c)); };
  } else if (kind === 'crew') {
    if (p.crew) return fail('Pehle purani crew chhod');
    const cname = D.cleanText(m.name, 18), tag = D.cleanText(m.tag, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cname.length < 3) return fail('Crew ka naam kam se kam 3 akshar'); if (tag.length < 2) return fail('Tag 2-4 akshar (A-Z, 0-9)');
    if (Object.values(db.crews).some(x => x.tag === tag || x.name.toLowerCase() === cname.toLowerCase())) return fail('Yeh naam ya tag le liya gaya se');
    name = 'Crew ' + cname; price = D.CREW_PRICE;
    after = () => { const id2 = rid(8); db.crews[id2] = { id: id2, name: cname, tag, color: D.GLOW_COLORS[Math.floor(Math.random() * D.GLOW_COLORS.length)], leader: p.id, leaderName: p.name, members: [p.id], created: Date.now() }; p.crew = id2; announce('Nayi crew bani: [' + tag + '] ' + cname + ', leader ' + p.name + '. Ilaake ki ladai shuru!', 'crew'); broadcast(pinfo(c)); broadcast({ t: 'turf', turf: turfView(), crews: crewList() }); };
  } else return fail('Unknown purchase');
  if (!charge(c, price)) return fail('Paise kam se! Chahiye ' + fmt(price));
  if (after) after();
  addXP(c, 0); dirty = true; sendProfile(c);
  return { ok: true, name, price, prize: c.lastPrize };
}

function handleEarn(c, m) {
  const reason = m.reason; const p = c.p; let cap;
  if (reason === 'shift') cap = { max: D.RANKS[p.rank][1], cd: 18 };
  else cap = D.EARN[reason];
  if (!cap) return { ok: false, error: 'Unknown' };
  let max = cap.max; if (worldEvent?.type === 'flood' && (reason === 'ride' || reason === 'delivery')) max *= 2;
  if (!rateOk(c, 'earn:' + reason, cap.cd * 0.85)) return { ok: false, error: 'Thoda ruk ke' };
  if (reason === 'prasad') { if (p.blessed === today()) return { ok: false, error: 'Aaj ka aashirwad mil gaya' }; p.blessed = today(); }
  if (reason === 'dangal') { track(c, 'wrestle'); if (!db.belt || !conns.has(db.belt.id)) giveBelt(c); }
  const amt = clamp(Math.round(num(m.amount)), 0, max);
  if (reason === 'ride') { track(c, 'rides'); addXP(c, 45); }
  if (reason === 'delivery') { track(c, 'deliveries'); addXP(c, 30); }
  if (reason === 'shift') { track(c, 'shifts'); addXP(c, 35); }
  if (reason === 'quest') { addXP(c, 80); p.respect += 5; }
  if (reason === 'flood') { if (weather.lvl < 2) return { ok: false, error: 'Paani hi nahi se, baarish mein aaiyo' }; track(c, 'flood_runs'); addXP(c, 60); p.respect += 3; }
  if (reason === 'loot') { /* xp via npc_ko */ }
  if (amt > 0) credit(c, amt, m.why ? D.cleanText(m.why, 60) : null);
  sendProfile(c);
  return { ok: true, amount: amt };
}

function handle(c, m) {
  const p = c.p; const t = m.t;
  const reply = data => { if (m.rid) send(c, { t: 'reply', rid: m.rid, ...data }); };
  switch (t) {
    case 'st': { // position/state ~10Hz
      const st = c.st || (c.st = {});
      st.x = clamp(num(m.x, st.x || 0), -3200, 3200); st.z = clamp(num(m.z, st.z || 0), -3200, 3200); st.r = num(m.r, 0);
      st.a = clamp(Math.floor(num(m.a, 0)), 0, 4); st.in = INTERIORS.includes(m.in) ? m.in : '';
      const v = m.v; st.v = v && (p.vehicles.includes(v) || ['rent', 'chhotu', 'desert', 'dhakad', 'scooty', 'cruiser', 'auto', 'bus', 'truck'].includes(v)) ? v : null; // owned, rented, Chacha's loaner or one taken off the road (a boat must be owned)
      if (st.v && st.v !== 'rent' && p.cur !== st.v) { p.cur = st.v; broadcast(pinfo(c)); }
      st.hp = clamp(Math.round(num(m.hp, 100)), 0, 100); st.fx = m.fx === 1 ? 1 : 0; st.ts = now();
      break;
    }
    case 'chat': {
      if (!rateOk(c, 'chat', 0.9)) return;
      const text = D.cleanText(m.text, 120); if (!text) return;
      track(c, 'chats'); const cr = crewOf(p);
      broadcast({ t: 'chat', id: p.id, name: p.name, tag: cr ? cr.tag : null, text, near: placeName(c.st || {}) });
      if (ais.size && Math.random() < 0.45) aiGreets.push({ at: now() + 2 + Math.random() * 3, text: pick(AI_REPLIES) });
      break;
    }
    case 'hit': {
      const ai = ais.get(m.target);
      if (ai) { if (!c.st || c.st.in || c.st.v || ai.hp <= 0 || !rateOk(c, 'hit', 0.35)) return; const p0 = aiPos(ai); if (dist(c.st, p0) > 4.4) return; // a little slack: the AI walks while the punch is in flight
        const dmg = 9 + Math.floor(Math.random() * 6); ai.hp = Math.max(0, ai.hp - dmg); ai.foe = p.id; ai.foeUntil = now() + 8; ai.wait = 0; track(c, 'punches');
        broadcast({ t: 'fx', fx: 'punch', by: p.id, target: ai.id }, x => x.st && dist(x.st, c.st) < 60);
        if (ai.hp <= 0) { if (ai.jackBy === p.id && ai.jackV) send(c, { t: 'jackwin', v: ai.jackV, name: ai.name }); ai.jackBy = null; ai.jackV = null; ai.downUntil = now() + 8; ai.foe = null; p.respect += 3; track(c, 'kos'); addXP(c, 15); send(c, { t: 'toast', text: 'Tune ' + ai.name + ' ko dhobi pachhad maar diya! +3 respect', kind: 'money', sfx: 'ko' }); }
        return; }
      const tc = conns.get(m.target); if (!tc || tc === c || !c.st || !tc.st) return;
      if (!rateOk(c, 'hit', 0.35)) return;
      if (c.st.in !== tc.st.in || c.st.v || tc.st.v || tc.st.hp <= 0 || c.st.hp <= 0) return;
      if (dist(c.st, tc.st) > 3.6) return;
      const dmg = 9 + Math.floor(Math.random() * 6) + Math.min(6, Math.floor(p.respect / 100)) + (p.bling.includes('kada') ? 1 : 0);
      tc.lastHitBy = { id: p.id, at: now(), akhara: inAkhara(c.st) && inAkhara(tc.st) };
      send(tc, { t: 'dmg', by: p.id, name: p.name, d: dmg });
      broadcast({ t: 'fx', fx: 'punch', by: p.id, target: tc.p.id }, x => x.st && x.st.in === c.st.in && dist(x.st, c.st) < 60);
      track(c, 'punches');
      break;
    }
    case 'ko': { // I (sender) got knocked out
      const h = c.lastHitBy, jb = c.jackBy; c.st && (c.st.hp = 0); c.jackBy = null;
      if (h && now() - h.at < 5) {
        const k = conns.get(h.id); if (!k) return;
        if (jb && jb.id === k.p.id && now() - jb.at < 120) send(k, { t: 'jackwin', v: jb.v, name: p.name }); // won the fight for my vehicle
        track(k, 'kos'); k.p.respect += 15; addXP(k, 60);
        const beef = c.beef && c.beef.with === k.p.id && c.beef.until > now();
        const d = c.st && !c.st.in ? D.districtAt(c.st.x, c.st.z) : null;
        if (k.p.crew && d) turfPoints(d[2], k.p.crew, 5);
        if (beef) { k.p.respect += 20; announce('Road rage: ' + k.p.name + ' ne ' + p.name + ' ko sadak pe sabak sikha diya (' + placeName(c.st) + ')', 'fight'); }
        else if (Math.random() < 0.5 || (p.c.kos || 0) > 5) announce(k.p.name + ' ne ' + p.name + ' ko dhobi pachhad maar diya at ' + placeName(c.st) + '!', 'fight');
        send(k, { t: 'toast', text: 'Tune ' + p.name + ' ko dhobi pachhad maar diya! +15 respect', kind: 'money', sfx: 'ko' });
        if (h.akhara && db.belt && db.belt.id === p.id) giveBelt(k);
        sendProfile(k);
      }
      c.lastHitBy = null;
      break;
    }
    case 'jack': { // pulled a driver out of their vehicle: they get out and fight for it
      if (!c.st || c.st.v || c.st.in || c.st.hp <= 0 || !rateOk(c, 'jack', 2)) return;
      const ai = ais.get(m.target);
      if (ai) { if (!ai.v || ai.hp <= 0) return; const p0 = aiPos(ai); if (dist(c.st, p0) > 9) return;
        ai.jackV = ai.v; ai.v = null; ai.jackBy = p.id; ai.foe = p.id; ai.foeUntil = now() + 25; ai.wait = 0;
        broadcast({ t: 'chat', id: ai.id, name: ai.name, tag: null, text: pick(JACK_LINES) }, x => x.st && dist(x.st, p0) < 80);
        send(c, { t: 'toast', text: ai.name + ' gaadi se utar aaya. KO kar, gaadi teri!', kind: 'bad' }); return; }
      const tc = conns.get(m.target); if (!tc || tc === c || !tc.st || !tc.st.v || tc.st.v === 'naav' || tc.st.in || tc.st.hp <= 0) return;
      if (dist(c.st, tc.st) > 9) return;
      tc.jackBy = { id: p.id, at: now(), v: tc.st.v };
      send(tc, { t: 'jacked', by: p.id, name: p.name });
      send(c, { t: 'toast', text: tc.p.name + ' ko gaadi se kheench liya! KO kar, gaadi teri.', kind: 'money' });
      break;
    }
    case 'donko': { // beat today's Gali ke Don boss
      ensureMissions(p); const dn = p.don, ch = dn.ch; if (m.ch !== ch || ch >= D.DON.length || dn.last === istDay() || !c.st || c.st.in) return;
      const C = D.DON[ch]; if (dist(c.st, { x: C.at[0], z: C.at[1] }) > 60 || !rateOk(c, 'donko', 20)) return;
      const r = Math.round(C.r * (1 + 0.1 * Math.min(p.level, 10)) / 10) * 10; p.money += r; p.respect += 10 + ch * 5; dn.ch++; dn.last = istDay(); track(c, 'don'); addXP(c, 60 + ch * 20);
      if (C.final) { dn.champ = dn.wk; announce('👑 ' + p.name + ' ne Dalal Bhai ko hara diya! Is hafte ka GALI KA DON!', 'fight'); }
      else if (ch >= 2) announce(p.name + ' ne ' + C.boss + ' ko ' + C.at[2] + ' mein dhobi pachhad maara (Gali ke Don, chapter ' + (ch + 1) + ')', 'fight');
      send(c, { t: 'don', ch: dn.ch, reward: r, final: !!C.final }); sendProfile(c); dirty = true; break;
    }
    case 'evreach': { // first three to an event spot win; the money bag goes to the first one only
      const e = worldEvent; if (!e || !c.st || c.st.in || e.rush.includes(p.id) || !rateOk(c, 'evreach', 2)) return;
      if (e.type === 'thaila') { if (e.data.taken || dist(c.st, e.data) > 8) return; e.data.taken = p.name; e.rush.push(p.id); credit(c, e.data.prize, 'Paison ka thaila!'); sendProfile(c); announce('💰 ' + p.name + ' ne ' + e.data.place + ' pe thaila utha liya (' + fmt(e.data.prize) + ')!', 'event'); e.end = Math.min(e.end, now() + 2); break; }
      const sp = D.EVENT_SPOTS[e.type]; if (!sp || e.rush.length >= 3) return; const ok = sp.line ? Math.abs(c.st.x - sp.x) < 20 : dist(c.st, sp) < 28; if (!ok) return;
      e.rush.push(p.id); const k = e.rush.length; credit(c, Math.round(D.RUSH_PRIZE[k - 1] * (1 + 0.1 * Math.min(p.level, 10))), '#' + k + ' pahuncha · ' + e.name); sendProfile(c);
      if (k === 1) announce(p.name + ' sabse pehle pahuncha: ' + e.name + '!', 'event'); break;
    }
    case 'bump': { // vehicle collision with another player's vehicle -> road rage
      const tc = conns.get(m.target); if (!tc || tc === c || !c.st?.v || !tc.st?.v || c.st.in || tc.st.in) return;
      if (dist(c.st, tc.st) > 9) return;
      const key = [c.p.id, tc.p.id].sort().join(':'); if (!rateOk(c, 'bump:' + key, 45)) return;
      const until = now() + 60; c.beef = { with: tc.p.id, until }; tc.beef = { with: c.p.id, until };
      send(c, { t: 'roadrage', with: tc.p.id, name: tc.p.name }); send(tc, { t: 'roadrage', with: c.p.id, name: p.name });
      announce('Road rage alert at ' + placeName(c.st) + ': ' + p.name + ' ki gaadi ' + tc.p.name + ' se bhid gayi!', 'fight');
      break;
    }
    case 'buy': reply(handleBuy(c, m)); break;
    case 'earn': reply(handleEarn(c, m)); break;
    case 'ev': {
      const e = EV[m.k]; if (!e) return; if (!rateOk(c, 'ev:' + m.k, e.cd)) return;
      track(c, m.k); if (e.xp) addXP(c, e.xp); if (e.respect) p.respect += e.respect; if (e.party) p.party += e.party;
      if (m.k === 'baraat') track(c, 'baraat');
      sendProfile(c); break;
    }
    case 'promote': {
      const need = (p.rank + 1) * 3;
      if (p.rank >= D.RANKS.length - 1) return reply({ ok: false, error: 'Tu to CEO se!' });
      if ((p.c.shifts || 0) >= need && p.level >= p.rank + 2) { p.rank++; addXP(c, 120); p.respect += 15; sendProfile(c); if (p.rank >= 4) announce(p.name + ' ka promotion: ab TechNova mein ' + D.RANKS[p.rank][0] + '!', 'showoff'); return reply({ ok: true, rank: p.rank }); }
      return reply({ ok: false, error: 'Abhi nahi. ' + Math.max(0, need - (p.c.shifts || 0)) + ' aur shifts kar aur Level ' + (p.rank + 2) + ' tak pahunch.' });
    }
    case 'setcur': { if (p.vehicles.includes(m.v)) { p.cur = m.v; dirty = true; sendProfile(c); broadcast(pinfo(c)); } break; }
    case 'sethome': { if (p.houses.includes(m.h)) { p.home = m.h; dirty = true; sendProfile(c); } break; }
    case 'unshade': { if (p.outfit.shades) { p.outfit.shades = false; dirty = true; sendProfile(c); broadcast(pinfo(c)); } break; }
    case 'name': { const n = D.cleanText(m.name, 16); if (n.length >= 2 && rateOk(c, 'name', 30)) { p.name = n; dirty = true; sendProfile(c); broadcast(pinfo(c)); } break; }
    case 'tutdone': { p.tutDone = true; dirty = true; break; }
    case 'step': { // first-session funnel for the owner page: the first time each player reaches a milestone
      const k = String(m.k || ''); if (!FUNNEL.some(f => f[0] === k)) return; p.steps = p.steps || {}; if (!p.steps[k]) { p.steps[k] = Date.now(); dirty = true; } break;
    }
    case 'look': { // avatar from the character creator; hat and kaala chashma are free only the first time
      const a = m.look || {}; const g = a.g === 'f' ? 'f' : 'm'; const ix = (v, n) => clamp(Math.floor(num(v, 0)), 0, n - 1);
      p.look = { g, skin: ix(a.skin, 5), hair: ix(a.hair, 5), hc: ix(a.hc, 5), top: ix(a.top, 3), pants: ix(a.pants, 4), acc: ix(a.acc, 3) };
      if (m.color !== undefined) { p.color = ix(m.color, D.SHIRTS.length); p.outfit.shirt = null; }
      if (!p.lookSet) { p.lookSet = true; const hats = g === 'f' ? ['none', 'dupatta'] : ['none', 'cap', 'pagdi']; if (hats.includes(m.hat)) p.outfit.hat = m.hat; if (m.shades) p.outfit.shades = true; }
      dirty = true; sendProfile(c); broadcast(pinfo(c)); reply({ ok: true }); break;
    }
    case 'races': { reply({ ok: true, rec: raceTops(), best: p.raceBest || {}, wins: p.raceWins || {} }); break; }
    case 'race': { // a finished street race: personal best, route record, prize
      const R = D.RACES.find(r => r.id === m.id); if (!R) return reply({ ok: false, error: 'Unknown race' });
      const ms = Math.round(num(m.ms)); if (!(ms >= R.minMs && ms < 600000)) return reply({ ok: false, error: 'Time not valid' });
      if (!rateOk(c, 'race', R.minMs / 1000 * 0.8)) return reply({ ok: false, error: 'Thoda ruk ke' });
      const won = !!m.won; p.raceBest = p.raceBest || {}; p.raceWins = p.raceWins || {};
      const pb = p.raceBest[R.id]; const newPb = !pb || ms < pb; if (newPb) p.raceBest[R.id] = ms;
      const firstWin = won && !p.raceWins[R.id]; if (won) p.raceWins[R.id] = (p.raceWins[R.id] || 0) + 1;
      db.races = db.races || {}; const top = db.races[R.id] || (db.races[R.id] = []);
      const oldRec = top[0] ? top[0].ms : Infinity; const mine = top.find(e => e.id === p.id);
      if (mine) { if (ms < mine.ms) { mine.ms = ms; mine.name = p.name; } } else top.push({ id: p.id, name: p.name, ms });
      top.sort((a, b) => a.ms - b.ms); if (top.length > 20) top.length = 20;
      const rank = top.findIndex(e => e.id === p.id) + 1;
      if (ms < oldRec && oldRec !== Infinity) announce(p.name + ' ne ' + R.name + ' ka record tod diya: ' + (ms / 1000).toFixed(1) + 's!', 'showoff');
      if (won) track(c, 'race_wins');
      const amt = won ? R.prize * (firstWin ? 2 : 1) : Math.round(R.prize * 0.15);
      credit(c, amt, (won ? 'Race jeeti: ' : 'Race: ') + R.name); addXP(c, won ? 60 : 20); if (won) p.respect += firstWin ? 10 : 2;
      dirty = true; sendProfile(c);
      reply({ ok: true, ms, pb: p.raceBest[R.id], newPb, rank, top: top.slice(0, 5).map(e => ({ name: e.name, ms: e.ms })), amt, firstWin });
      break;
    }
    case 'bid': {
      if (!auction) return reply({ ok: false, error: 'Abhi koi boli nahi chal rahi' });
      const min = Math.max(D.PLATE_START_BID, Math.ceil(auction.bid * 1.1 / 1000) * 1000);
      const amt = Math.round(num(m.amount));
      if (amt < min) return reply({ ok: false, error: 'Kam se kam ' + fmt(min) });
      if (p.money < amt) return reply({ ok: false, error: 'Itne paise nahi hain' });
      auction.bid = amt; auction.by = p.id; auction.byName = p.name; if (auction.ends - now() < 20) auction.ends = now() + 20;
      broadcast({ t: 'auction', a: auction }); reply({ ok: true });
      break;
    }
    case 'crew_join': {
      const cr = db.crews[m.id]; if (!cr) return reply({ ok: false, error: 'Crew nahi mili' }); if (p.crew) return reply({ ok: false, error: 'Pehle purani crew chhod' });
      if (cr.members.length >= 20) return reply({ ok: false, error: 'Crew full se (20)' });
      cr.members.push(p.id); p.crew = cr.id; dirty = true; sendProfile(c); broadcast(pinfo(c));
      broadcast({ t: 'ann', text: p.name + ' crew [' + cr.tag + '] mein shamil ho gaye', kind: 'crew', at: Date.now() }, x => x.p.crew === cr.id);
      broadcast({ t: 'turf', turf: turfView(), crews: crewList() }); return reply({ ok: true });
    }
    case 'crew_leave': {
      const cr = crewOf(p); if (!cr) return reply({ ok: false });
      cr.members = cr.members.filter(x => x !== p.id); p.crew = null;
      if (!cr.members.length) { delete db.crews[cr.id]; for (const tt of Object.values(db.turf)) { delete tt.pts[cr.id]; if (tt.owner === cr.id) tt.owner = null; } }
      else if (cr.leader === p.id) { cr.leader = cr.members[0]; const np = Object.values(db.profiles).find(x => x.id === cr.leader); cr.leaderName = np ? np.name : '?'; }
      dirty = true; sendProfile(c); broadcast(pinfo(c)); broadcast({ t: 'turf', turf: turfView(), crews: crewList() }); return reply({ ok: true });
    }
    case 'horn': {
      if (!c.st?.v || !rateOk(c, 'horn', 1.5)) return; const mods = p.mods[c.st.v] || {}; if (!mods.horn) return;
      broadcast({ t: 'fx', fx: 'horn', x: c.st.x, z: c.st.z, by: p.id }, x => x.st && !x.st.in && dist(x.st, c.st) < 90);
      break;
    }
    case 'holi': {
      if (worldEvent?.type !== 'holi') return; const tc = conns.get(m.target); if (!tc || !tc.st || !c.st || dist(c.st, tc.st) > 7 || !rateOk(c, 'holi', 1)) return;
      const color = pick([0xff2bd6, 0x39ff14, 0xffd400, 0x00b4ff, 0xff7a00]);
      tc.tint = { color, until: now() + 120 }; broadcast(pinfo(tc)); send(tc, { t: 'toast', text: p.name + ' ne tujhpe rang daal diya! Bura na mano, Holi hai!' });
      track(c, 'holi'); addXP(c, 5); broadcast({ t: 'fx', fx: 'gulal', x: tc.st.x, z: tc.st.z, color });
      break;
    }
    case 'cheer': { if (worldEvent?.type === 'ipl' && rateOk(c, 'cheer', 3)) { const i = m.team === 1 ? 1 : 0; worldEvent.data.cheers[i]++; broadcast({ t: 'ipl', d: worldEvent.data }); } break; }
    case 'party_join': {
      if (!party) return reply({ ok: false, error: 'Koi party nahi chal rahi' });
      if (party.host !== p.id && !party.guests.has(p.id)) { party.guests.add(p.id); const h = conns.get(party.host); if (h) { h.p.party += 10; sendProfile(h); send(h, { t: 'toast', text: p.name + ' teri party mein aaya! (' + party.guests.size + ' guests)' }); } addXP(c, 20); }
      return reply({ ok: true, at: D.SPOTS.farmLawn });
    }
    case 'challenge': { // roast or dance-off invite
      const kind = m.kind; const tc = conns.get(m.target); if (!tc || tc === c || !c.st || !tc.st) return reply({ ok: false, error: 'Woh player yahan nahi se' });
      if (!rateOk(c, 'challenge', 8)) return reply({ ok: false, error: 'Thoda ruk' });
      if (kind === 'roast') { if (roast) return reply({ ok: false, error: 'Ek roast battle pehle se chal rahi se' }); const sp = D.SPOTS.chaupal; if (Math.hypot(c.st.x - sp.x, c.st.z - sp.z) > 14 || Math.hypot(tc.st.x - sp.x, tc.st.z - sp.z) > 14) return reply({ ok: false, error: 'Dono ko Badshahpur chaupal pe hona chahiye' }); }
      else if (kind === 'dance') { if (dance) return reply({ ok: false, error: 'Dance floor busy se' }); if (c.st.in !== 'club' || tc.st.in !== 'club') return reply({ ok: false, error: 'Dono ko Neon Nights club mein hona chahiye' }); }
      else return reply({ ok: false });
      invites.set(tc.p.id + ':' + kind, { from: p.id, until: now() + 30 });
      send(tc, { t: 'invite', kind, from: p.id, name: p.name });
      return reply({ ok: true });
    }
    case 'accept': {
      const kind = m.kind; const inv = invites.get(p.id + ':' + kind); invites.delete(p.id + ':' + kind);
      if (!inv || inv.until < now()) return reply({ ok: false, error: 'Challenge expire ho gaya' });
      const fc = conns.get(inv.from); if (!fc) return reply({ ok: false, error: 'Challenger chala gaya' });
      if (kind === 'roast') {
        if (roast) return reply({ ok: false, error: 'Roast pehle se chal raha' });
        roast = { id: rid(6), a: fc.p.id, b: p.id, aName: fc.p.name, bName: p.name, phase: 'write', round: 1, lines: [['', '']], deadline: now() + 30, votes: { a: new Set(), b: new Set() } };
        announce('Roast battle shuru at Badshahpur chaupal: ' + fc.p.name + ' vs ' + p.name + '!', 'fight');
        broadcast({ t: 'roast', r: roastState() });
      } else if (kind === 'dance') {
        if (dance) return reply({ ok: false, error: 'Dance floor busy' });
        const seq = Array.from({ length: 10 }, () => Math.floor(Math.random() * 4));
        dance = { a: fc.p.id, b: p.id, seq, start: now() + 3, scores: {} };
        const msg = { t: 'dance', d: { a: fc.p.id, b: p.id, aName: fc.p.name, bName: p.name, seq, start: dance.start } };
        send(fc, msg); send(c, msg);
        announce('Dance-off at Neon Nights: ' + fc.p.name + ' vs ' + p.name + '!', 'party');
      }
      return reply({ ok: true });
    }
    case 'roast_line': {
      if (!roast || roast.phase !== 'write') return; const side = roast.a === p.id ? 0 : roast.b === p.id ? 1 : -1; if (side < 0) return;
      const line = D.cleanText(m.text, 100); if (!line) return; const cur = roast.lines[roast.round - 1]; if (cur[side]) return;
      cur[side] = line; broadcast({ t: 'roast', r: roastState() }); roastAdvance(); break;
    }
    case 'roast_vote': {
      if (!roast || roast.phase !== 'vote' || p.id === roast.a || p.id === roast.b) return;
      roast.votes.a.delete(p.id); roast.votes.b.delete(p.id); (m.side === 1 ? roast.votes.b : roast.votes.a).add(p.id);
      broadcast({ t: 'roast', r: roastState() }); break;
    }
    case 'dance_score': {
      if (!dance || (p.id !== dance.a && p.id !== dance.b) || dance.scores[p.id]) return;
      dance.scores[p.id] = { hits: clamp(Math.floor(num(m.hits)), 0, 10), ms: clamp(num(m.ms, 1e9), 300, 1e9) }; track(c, 'dance'); danceAdvance(); break;
    }
    case 'lb': reply({ ok: true, lb: rateOk(c, 'lb', 2) ? leaderboards() : lbCache || leaderboards() }); break;
    case 'crews': reply({ ok: true, crews: crewList(), turf: turfView() }); break;
    case 'ping': reply({ ok: true }); break;
  }
}


function partyView() { return party ? { host: party.host, hostName: party.hostName, ends: party.ends, guests: party.guests.size } : null; }

// ------------------------------------------------------------------ rival profiles for solo play
const BOT_NAMES = [['Bunty Chaudhary', 'cruiser'], ['Pinky Yadav', 'desert'], ['Sonu Dahiya', 'dhakad'], ['Monu Ahlawat', 'desert'], ['Rinku Sangwan', 'chhotu'], ['Jassi Sandhu', 'cruiser'], ['Lalit Hooda', 'scooty'], ['Neha Malik', 'chhotu']];
function seedBots() {
  if (!opts.bots || Object.values(db.profiles).some(p => p.bot)) return;
  BOT_NAMES.forEach(([name, car], i) => {
    const p = newProfile(name, i % D.SHIRTS.length); p.bot = true; p.token = rid(32);
    p.money = 20000 + Math.floor(Math.random() * 400000); p.level = 2 + Math.floor(Math.random() * 12); p.respect = Math.floor(Math.random() * 700);
    p.party = Math.floor(Math.random() * 400); p.c.kos = Math.floor(Math.random() * 40); p.vehicles = [car]; p.cur = car;
    if (i < 3) p.bling = ['chain', 'watch'].slice(0, 1 + (i % 2));
    db.profiles[p.id] = p;
  });
  const bots = Object.values(db.profiles).filter(p => p.bot);
  const mk = (name, tag, color, members, areas) => { const id = rid(8); db.crews[id] = { id, name, tag, color, leader: members[0].id, leaderName: members[0].name, members: members.map(m => m.id), created: Date.now(), bot: true }; for (const m of members) m.crew = id; for (const a of areas) db.turf[a] = { pts: { [id]: 120 }, owner: id }; };
  mk('Sector 29 Sher', 'S29', D.GLOW_COLORS[1], bots.slice(0, 3), ['Sector 29', 'Sohna Road', 'Leisure Valley Park']);
  mk('DLF Daddies', 'DLF', D.GLOW_COLORS[3], bots.slice(3, 6), ['Golf Course Road', 'DLF Phase 3', 'Cyber Hub']);
  dirty = true;
}
seedBots();
function botTick() {
  if (!opts.bots) return;
  const bots = Object.values(db.profiles).filter(p => p.bot);
  for (const b of bots) b.lastSeen = Date.now();
  // rival crews keep a hold on their areas so the player has to work to take them
  if (slow % 30 === 0) for (const cr of Object.values(db.crews)) if (cr.bot) for (const t of Object.values(db.turf)) if (t.owner === cr.id) t.pts[cr.id] = (t.pts[cr.id] || 0) + 1.5;
  // rivals bid in plate auctions
  if (auction && Math.random() < 0.04) {
    const b = pick(bots); const next = Math.max(D.PLATE_START_BID, Math.ceil(auction.bid * 1.15 / 1000) * 1000);
    if (auction.by !== b.id && next <= Math.min(b.money, 60000 + (b.money % 150000))) { auction.bid = next; auction.by = b.id; auction.byName = b.name; if (auction.ends - now() < 20) auction.ends = now() + 20; broadcast({ t: 'auction', a: auction }); announce(b.name + ' ne ' + auction.plate + ' pe ' + fmt(next) + ' ki boli lagayi!', 'auction'); }
  }
  // the city talks: occasional rival show-off news
  if (Math.random() < 0.006) { const b = pick(bots); announce(pick([b.name + ' ne Neon Nights mein poore club ke liye bottle mangwayi!', b.name + ' ki nayi gaadi pe pressure horn lag gaya. Sector 29 hil gaya!', b.name + ' ne akhara mein ek chhore ko dhobi pachhad maara!', b.name + ' Golf Course Road pe neon underglow ke saath ghoom rahe hain', b.name + ' ki farmhouse party mein 40 log aaye!']), pick(['showoff', 'party', 'fight'])); b.party += 5; }
}

// ------------------------------------------------------------------ connections
// token -> profile index, and a per-IP cap on new accounts so nobody can flood the save file
const byToken = new Map(Object.values(db.profiles).map(x => [x.token, x]));
const newByIp = new Map();
function mayCreate(ip) { if (!ip) return true; const t = Date.now(); const list = (newByIp.get(ip) || []).filter(x => t - x < 3600e3); if (list.length >= (opts.newAccountsPerIpHour || 30)) return false; list.push(t); newByIp.set(ip, list); return true; }
function connect(out, closeFn, meta, outRaw) {
  let c = null;
  return {
    message(m) {
      if (!m || typeof m !== 'object') return;
      if (!c) {
        if (m.t !== 'hello') return;
      if (m.t !== 'hello') return;
      let p = typeof m.token === 'string' ? byToken.get(m.token) || null : null;
      const name = D.cleanText(m.name, 16) || ('Chhora ' + Math.floor(Math.random() * 90 + 10));
      if (!p) { if (!mayCreate(meta && meta.ip)) { out({ t: 'kicked', reason: 'Is network se bahut naye account ban gaye. Thodi der baad try karo' }); closeFn(); return; } p = newProfile(name, clamp(Math.floor(num(m.color, 0)), 0, D.SHIRTS.length - 1)); db.profiles[p.id] = p; byToken.set(p.token, p); }
      else if (m.name && name !== p.name) p.name = name;
      if (m.color !== undefined) p.color = clamp(Math.floor(num(m.color, p.color)), 0, D.SHIRTS.length - 1);
      const old = conns.get(p.id); if (old) { send(old, { t: 'kicked', reason: 'Yeh account doosre tab mein khul gaya' }); old.close(); conns.delete(p.id); }
      c = { out, outRaw, close: closeFn, p, st: null, cool: {}, since: Date.now() }; conns.set(p.id, c);
      p.lastSeen = Date.now(); p.visits = (p.visits || 0) + 1; ensureMissions(p); beltCheckDay();
      // daily reward (with PG rent)
      let daily = null; const td = today();
      if (p.daily.last !== td) {
        const yd = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        p.daily.streak = p.daily.last === yd ? p.daily.streak + 1 : 1; p.daily.last = td;
        let prop = 0; for (const h of p.houses) prop += D.HOUSES[h] ? D.HOUSES[h].daily : 0;
        const base = 300 * Math.min(p.daily.streak, 10); const rent = p.home === 'pg' ? D.PG_RENT : 0;
        const amt = base + prop - rent; p.money += amt; daily = { base, prop, rent, amt, streak: p.daily.streak };
      }
      dirty = true;
      send(c, {
        t: 'welcome', id: p.id, token: p.token, profile: publicProfile(p), daily,
        players: [...conns.values()].filter(x => x !== c).map(pinfo).concat([...ais.values()].map(aiInfo)), event: worldEvent, auction, party: partyView(), roast: roastState(),
        weather, turf: turfView(), crews: crewList(), ann: announcements.slice(-8), belt: db.belt, lb: lbCache || leaderboards(), serverTime: now(),
      });
      broadcast(pinfo(c));
      aiGreets.push({ at: now() + 7, text: pick(['Ram Ram ' + p.name + '! Naya aaya ke?', p.name + ', aaja race lagate hain!', 'Oye ' + p.name + ', Gurugram mein swagat se!']) });
      if (conns.size > 1) broadcast({ t: 'toast', text: p.name + ' Gurugram mein aa gaya! (' + conns.size + ' online)', kind: 'join' }, x => x !== c);
      return;
      }
      try { handle(c, m); } catch (e) { console.error('handler error', m && m.t, e); }
    },
    close() {
      if (!c) return; if (conns.get(c.p.id) === c) { conns.delete(c.p.id); broadcast({ t: 'left', id: c.p.id }); }
      c.p.lastSeen = Date.now(); c.p.playMs = (c.p.playMs || 0) + (Date.now() - c.since); dirty = true;
    },
  };
}

// snapshot tick (every 100 ms): positions to everyone (interest-managed)
const VIEW_RADIUS = 160, VIEW_MAX = 40; // each player receives at most the 40 nearest players in sight
function tick100() {
  let raw = false; for (const c of conns.values()) { raw = !!c.outRaw; break; } // Node server: send pre-encoded text, encoding each player once per tick
  aiTick(0.1); const list = aiEntries(raw); for (const o of conns.values()) if (o.st) { const s = o.st; o.entry = [o.p.id, Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10, Math.round(s.r * 100) / 100, s.a, s.v, s.in, s.hp, s.fx]; if (raw) o.entryJson = JSON.stringify(o.entry); list.push(o); }
  for (const c of conns.values()) {
    const me = c.st; let near = [];
    for (const o of list) {
      if (o === c) continue; const s = o.st;
      if (me && s.in !== me.in) continue;
      const d = me && !s.in ? dist(s, me) : 0; if (d > VIEW_RADIUS) continue;
      near.push([d, o]);
    }
    if (near.length > VIEW_MAX) { near.sort((a, b) => a[0] - b[0]); near = near.slice(0, VIEW_MAX); }
    const out = []; const seen = new Set();
    for (const [, o] of near) { out.push(c.outRaw ? o.entryJson : o.entry); seen.add(o.p.id); }
    if (c.seen) for (const id of c.seen) if (!seen.has(id)) out.push(c.outRaw ? JSON.stringify([id, null]) : [id, null]); // tell the client once when someone leaves view
    c.seen = seen;
    if (c.outRaw) c.outRaw('{"t":"s","p":[' + out.join(',') + '],"n":' + conns.size + '}');
    else c.out({ t: 's', p: out, n: conns.size });
  }
}

// slow tick (every second): events, auctions, turf, battles, leaderboards
let slow = 0;
function tick1s() {
  slow++; const t = now();
  weatherTick();
  if (!worldEvent && !soonSent && t >= nextEventAt - 30) { soonSent = true; const type = D.EVENT_ORDER[eventIdx % D.EVENT_ORDER.length]; broadcast({ t: 'evsoon', type, name: D.WORLD_EVENTS[type].name, in: Math.round(nextEventAt - t) }); }
  if (!worldEvent && t >= nextEventAt) startEvent();
  if (worldEvent && t >= worldEvent.end) endEvent();
  if (worldEvent?.type === 'ipl' && slow % 5 === 0) iplTick();
  if (!auction && t >= nextAuctionAt && conns.size > 0) startAuction();
  if (auction && t >= auction.ends) endAuction();
  if (party && t >= party.ends) { announce(party.hostName + ' ki farmhouse party khatam: ' + party.guests.size + ' guests aaye!', 'party'); party = null; broadcast({ t: 'party', party: null }); }
  roastAdvance(); danceAdvance();
  for (const [k, v] of invites) if (v.until < t) invites.delete(k);
  if (slow % 30 === 0) turfTick();
  if (slow % 60 === 0) turfIncome();
  if (slow % 15 === 0) broadcast({ t: 'lb', lb: leaderboards() });
  if (slow % 60 === 0) beltCheckDay();
  botTick(); aiTalk();
}

function raceTops() { const o = {}; for (const R of D.RACES) o[R.id] = ((db.races || {})[R.id] || []).slice(0, 5).map(e => ({ name: e.name, ms: e.ms })); return o; }

const FUNNEL = [['play', 'Pressed Khelo'], ['story_start', 'Story started (new player)'], ['race1_go', 'First race: GO'], ['race1_done', 'First race finished'], ['b_fight', 'Road rage started'], ['fight_ko', 'Knocked out Monu'], ['b_swag', 'Swag shop shown'], ['swag_buy', 'Bought swag'], ['b_chase', 'Police chase started'], ['chase_escape', 'Escaped police'], ['chase_caught', 'Caught by police'], ['b_club', 'Sent to the club'], ['club_in', 'Entered the club'], ['debut_done', 'Finished Pehla Din'], ['story_skip', 'Skipped the story'], ['start_other', 'Started somewhere else (no story)'], ['race2_won', 'Won race 2'], ['min1', 'Played 1 minute'], ['min2', 'Played 2 minutes'], ['min5', 'Played 5 minutes'], ['min10', 'Played 10 minutes']];


// ------------------------------------------------------------------ computer players: nobody should walk an empty city
// With fewer than 4 people online, up to 3 "(AI)" players roam the roads near them, chat, dance and fight back.
const AI_NAMES = [['Sonu', 'm'], ['Pinky', 'f'], ['Jassi', 'm'], ['Neha', 'f'], ['Bittu', 'm'], ['Rinku', 'm'], ['Simran', 'f'], ['Golu', 'm']];
const AI_LINES = ['Ram Ram sabne!', 'Koi race lagayega? Ambience Mall ke bahar mil', 'Aaj Sector 29 mein party se, aa jaiyo', 'Gaddhe dekh ke chala, warna gaadi gayi', 'Mere paas Thar hai, tere paas ke se?', 'Chai peeni se kisi ne?', 'Iffco Chowk pe phir jam lag rya se', 'Level up karna se to aaj ke kaam poore kar', 'Pehlwan Bhola ko hara diya maine aaj!', 'Kaun hai jo mujhse lad sake?', 'Sohna Road pe paani bhar gaya, bach ke', 'Cyber Hub mein aaj bahut bheed se'];
const AI_REPLIES = ['Haan bhai, sahi baat', 'Ke kah rya se tu?', 'Oye hoye!', 'Chal race lagate hain', 'Hahaha, mast', 'Pakka?', 'Chal Sector 29 mil'];
const ais = new Map(); const aiGreets = [];
const RG = D.ROADS, RMIN = RG[0], RMAX = RG[RG.length - 1];
function aiInfo(a) { return { t: 'pi', id: a.id, name: a.name, color: a.color, look: a.look, outfit: a.outfit, bling: [], plate: null, level: a.level, title: 'Computer player', crew: null, mods: {}, belt: false, tint: null, ai: true }; }
function aiPos(a) { const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz) || 1; const off = a.v ? 3 : 5.6; return { x: a.x + dz / d * off, z: a.z - dx / d * off }; }
const snapRoad = v => RG.reduce((b, r) => Math.abs(r - v) < Math.abs(b - v) ? r : b, RG[0]);
function aiNext(a) {
  const opts = [[a.tx + 150, a.tz], [a.tx - 150, a.tz], [a.tx, a.tz + 150], [a.tx, a.tz - 150]].filter(([x, z]) => x >= RMIN && x <= RMAX && z >= RMIN && z <= RMAX && !(x === a.px && z === a.pz));
  let pickp = opts[Math.floor(Math.random() * opts.length)]; const hs = [...conns.values()].filter(c => c.st && !c.st.in);
  if (hs.length && Math.random() < 0.6) { const h = hs[0].st; pickp = opts.reduce((b, o) => Math.hypot(o[0] - h.x, o[1] - h.z) < Math.hypot(b[0] - h.x, b[1] - h.z) ? o : b, pickp); }
  a.px = a.tx; a.pz = a.tz; a.tx = pickp[0]; a.tz = pickp[1];
}
function aiSpawn() {
  const hs = [...conns.values()].filter(c => c.st && !c.st.in); if (!hs.length) return; const used = new Set([...ais.values()].map(a => a.base));
  const pool = AI_NAMES.filter(n => !used.has(n[0])); if (!pool.length) return; const [nm, g] = pool[Math.floor(Math.random() * pool.length)]; const h = hs[Math.floor(Math.random() * hs.length)].st;
  const sx = clamp(snapRoad(h.x) + pick([-150, 0, 150]), RMIN, RMAX), sz = clamp(snapRoad(h.z) + pick([-150, 150]), RMIN, RMAX);
  const r = () => Math.floor(Math.random() * 5);
  const a = { id: 'ai' + rid(6), base: nm, name: nm + ' (AI)', color: Math.floor(Math.random() * D.SHIRTS.length), look: { g, skin: r(), hair: r(), hc: Math.floor(Math.random() * 3), top: Math.floor(Math.random() * 3), pants: Math.floor(Math.random() * 4), acc: Math.floor(Math.random() * 3) },
    outfit: { shirt: null, hat: g === 'f' ? pick(['none', 'dupatta']) : pick(['none', 'cap', 'pagdi']), shades: Math.random() < 0.5 }, level: 2 + Math.floor(Math.random() * 12),
    x: sx, z: sz, tx: sx, tz: sz, px: null, pz: null, r: 0, v: Math.random() < 0.45 ? pick(['scooty', 'chhotu', 'desert', 'dhakad', 'cruiser']) : null, a: 1, hp: 100, wait: 0, chatT: now() + 15 + Math.random() * 40, foe: null };
  aiNext(a); ais.set(a.id, a); broadcast(aiInfo(a));
}
function aiDrop(a) { ais.delete(a.id); broadcast({ t: 'left', id: a.id }); }
function aiTick(dt) {
  const humans = [...conns.values()].filter(c => c.st); const want = humans.length === 0 ? 0 : Math.max(0, 4 - humans.length);
  if (ais.size > want) aiDrop([...ais.values()][0]); else if (ais.size < want && Math.random() < dt / 3) aiSpawn();
  const t = now();
  for (const a of ais.values()) {
    const outside = humans.filter(c => !c.st.in); if (outside.length && outside.every(c => Math.hypot(c.st.x - a.x, c.st.z - a.z) > 420)) { aiDrop(a); continue; }
    if (a.hp <= 0) { if (t > a.downUntil) a.hp = 100; else continue; }
    if (a.foe) { const fc = conns.get(a.foe); if (!fc || !fc.st || fc.st.in || t > a.foeUntil || fc.st.hp <= 0) { a.foe = null; if (a.jackV) { a.v = a.jackV; a.jackV = null; a.jackBy = null; } } else { a.v = null; const p0 = aiPos(a); const dx = fc.st.x - p0.x, dz = fc.st.z - p0.z, d = Math.hypot(dx, dz); a.r = Math.atan2(dx, dz); if (d > 1.9) { a.x += dx / d * 5.5 * dt; a.z += dz / d * 5.5 * dt; a.tx = a.x + dx; a.tz = a.z + dz; a.a = 1; } else { a.a = 0; if (t > (a.punchAt || 0)) { a.punchAt = t + 1.3; send(fc, { t: 'dmg', by: a.id, name: a.name, d: 4 + Math.floor(Math.random() * 4) }); broadcast({ t: 'fx', fx: 'punch', by: a.id, target: fc.p.id }, x => x.st && dist(x.st, p0) < 60); } } continue; } }
    if (a.wait > 0) { a.wait -= dt; if (a.wait <= 0) a.a = 1; continue; }
    { const p0 = aiPos(a); if (outside.some(c => !c.st.v && Math.hypot(c.st.x - p0.x, c.st.z - p0.z) < (a.v ? 7 : 3.6))) { a.a = 0; continue; } } // stops for someone standing in the way (drivers brake, walkers face up)
    const sp = a.v ? (a.v === 'scooty' ? 14 : 20) : 5; const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.5) { a.x = a.tx; a.z = a.tz; if (!a.v && Math.random() < 0.25) { a.wait = 5 + Math.random() * 8; a.a = Math.random() < 0.5 ? 3 : 0; } aiNext(a); }
    else { const k = Math.min(d, sp * dt); a.x += dx / d * k; a.z += dz / d * k; a.r = Math.atan2(dx, dz); a.a = a.v ? 0 : 1; }
  }
}
const JACK_LINES = ['Meri gaadi? Pehle mujhse nipat!', 'Abe utaarega mujhe? Aaja fir!', 'Gaadi chheenega? Tera baap bhi na le sake!', 'Ruk ja, abhi batata hoon!'];
function aiTalk() {
  const t = now(); if (!ais.size) return; const list = [...ais.values()];
  for (let i = aiGreets.length - 1; i >= 0; i--) if (aiGreets[i].at < t) { const g = aiGreets.splice(i, 1)[0]; const a = list[Math.floor(Math.random() * list.length)]; broadcast({ t: 'chat', id: a.id, name: a.name, tag: null, text: g.text }); }
  for (const a of list) if (t > a.chatT && a.hp > 0) { a.chatT = t + 60 + Math.random() * 70; broadcast({ t: 'chat', id: a.id, name: a.name, tag: null, text: pick(AI_LINES) }); }
}
function aiEntries(raw) { const out = []; for (const a of ais.values()) { const p0 = aiPos(a); const st = { x: p0.x, z: p0.z, in: '' }; const entry = [a.id, Math.round(p0.x * 10) / 10, Math.round(p0.z * 10) / 10, Math.round(a.r * 100) / 100, a.a, a.v, '', a.hp, 0]; out.push({ p: { id: a.id }, st, entry, entryJson: raw ? JSON.stringify(entry) : null }); } return out; }

// owner stats (server /admin page): every real player, newest activity first
function stats() {
  const t = Date.now(), day = 864e5, list = [];
  for (const p of Object.values(db.profiles)) {
    if (p.bot) continue;
    const c = conns.get(p.id), cr = p.crew && db.crews[p.crew];
    list.push({ name: p.name, level: p.level, money: p.money, respect: p.respect, crew: cr ? cr.tag : '', plate: p.plate || '',
      created: p.created, lastSeen: c ? t : p.lastSeen, visits: p.visits || 0, playMin: Math.round(((p.playMs || 0) + (c ? t - c.since : 0)) / 6e4), online: !!c });
  }
  list.sort((a, b) => b.lastSeen - a.lastSeen);
  const since = ms => list.filter(p => p.lastSeen > t - ms).length, joined = ms => list.filter(p => p.created > t - ms).length;
  const real = Object.values(db.profiles).filter(p => !p.bot); const funnel = FUNNEL.map(([k, label]) => ({ k, label, n: real.filter(p => p.steps && p.steps[k]).length }));
  return { funnel, total: list.length, online: conns.size, active24h: since(day), active7d: since(7 * day), new24h: joined(day), new7d: joined(7 * day), players: list };
}

return { connect, tick100, tick1s, persist, stats, players: () => conns.size };
}
