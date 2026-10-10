// Gurugram Life game server: serves the client and runs the shared multiplayer world.
// The server owns money, purchases, missions, leaderboards, auctions, crews, turf and events.
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as D from '../public/shared/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const TICK_MS = 100;
const INTERIORS = ['mall', 'office', 'theka', 'dhaba', 'club'];

// ------------------------------------------------------------------ persistence
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'world.json');
let db = { profiles: {}, crews: {}, belt: null, plates: {}, turf: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch { /* first run */ }
let dirty = false;
function persist() {
  if (!dirty) return;
  dirty = false;
  const tmp = DB_FILE + '.tmp';
  fs.writeFile(tmp, JSON.stringify(db), err => { if (!err) fs.rename(tmp, DB_FILE, () => {}); });
}
setInterval(persist, 20000);
function shutdown() { dirty = true; try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch {} process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);

// ------------------------------------------------------------------ helpers
const now = () => Date.now() / 1000;
const rid = (n = 8) => crypto.randomBytes(n).toString('base64url').slice(0, n);
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
function send(c, msg) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
function broadcast(msg, filter) { const s = JSON.stringify(msg); for (const c of conns.values()) if (c.ws.readyState === 1 && (!filter || filter(c))) c.ws.send(s); }
function announce(text, kind) {
  const a = { text, kind: kind || 'info', at: Date.now() };
  announcements.push(a); if (announcements.length > 25) announcements.shift();
  broadcast({ t: 'ann', ...a });
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function placeName(st) {
  if (st.in) return { mall: 'Metro Grand Mall', office: 'TechNova Towers', theka: 'Desi Theka No.1', dhaba: 'Sher-e-Haryana Dhaba', club: 'Neon Nights' }[st.in] || 'Gurugram';
  const d = D.districtAt(st.x, st.z); return d ? d[2] : 'Gurugram ki sadak';
}
function crewOf(p) { return p.crew && db.crews[p.crew] ? db.crews[p.crew] : null; }
function pinfo(c) {
  const p = c.p; const cr = crewOf(p);
  return {
    t: 'pi', id: p.id, name: p.name, color: p.color, outfit: p.outfit, bling: p.bling, plate: p.plate, level: p.level,
    title: D.respectTitle(p.respect), crew: cr ? { tag: cr.tag, color: cr.color } : null,
    mods: (p.cur && p.mods[p.cur]) || {}, belt: !!(db.belt && db.belt.id === p.id), tint: c.tint && c.tint.until > now() ? c.tint.color : null,
  };
}
function sendProfile(c) { send(c, { t: 'profile', p: publicProfile(c.p) }); }

// ------------------------------------------------------------------ economy
function addXP(c, n) {
  const p = c.p; p.xp += n; let up = false;
  while (p.xp >= D.xpNeed(p.level)) { p.xp -= D.xpNeed(p.level); p.level++; up = true; }
  if (up) { const bonus = 200 * p.level; p.money += bonus; send(c, { t: 'toast', text: 'Level up! Ab tu Level ' + p.level + ' se. Bonus ' + fmt(bonus), kind: 'money', sfx: 'level' }); broadcast(pinfo(c)); }
  dirty = true;
}
function track(c, k, n = 1) {
  const p = c.p; p.c[k] = (p.c[k] || 0) + n; dirty = true;
  let done = false;
  for (const a of p.missions.active.slice()) {
    const m = D.MISSIONS[a.id]; if (!m) continue;
    if ((p.c[m.k] || 0) - a.base >= missionN(a)) {
      p.missions.active.splice(p.missions.active.indexOf(a), 1);
      const r = Math.round(m.r * (1 + a.round * 0.6));
      p.money += r; addXP(c, 40);
      send(c, { t: 'toast', text: 'Mission poora: ' + m.t + ' · +' + fmt(r), kind: 'money', sfx: 'cash' });
      done = true;
    }
  }
  if (done) ensureMissions(p);
}
function missionN(a) { const m = D.MISSIONS[a.id]; return m.k === 'earned' ? m.n * (1 + a.round) : Math.ceil(m.n * (1 + a.round * 0.5)); }
function ensureMissions(p) {
  while (p.missions.active.length < 3) {
    const id = p.missions.next % D.MISSIONS.length;
    if (p.missions.next > 0 && id === 0) p.missions.round++;
    p.missions.next++;
    p.missions.active.push({ id, base: p.c[D.MISSIONS[id].k] || 0, round: p.missions.round });
  }
}
function credit(c, amount, why) {
  amount = Math.round(amount); c.p.money += amount; track(c, 'earned', amount);
  send(c, { t: 'toast', text: '+' + fmt(amount) + (why ? ' · ' + why : ''), kind: 'money', sfx: 'cash' });
}
function charge(c, amount) { if (c.p.money < amount) return false; c.p.money -= amount; dirty = true; return true; }

// ------------------------------------------------------------------ world event schedule
let worldEvent = null; // {type,start,end,data}
let eventIdx = 0;
let nextEventAt = now() + 90;
function startEvent() {
  const type = D.EVENT_ORDER[eventIdx++ % D.EVENT_ORDER.length];
  const def = D.WORLD_EVENTS[type]; const t = now();
  worldEvent = { type, name: def.name, start: t, end: t + def.dur, data: {} };
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
  quest_start: { cd: 5 }, office_chai: { cd: 40 },
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
      if (prize) credit(c, prize, 'Lucky draw'); c.lastPrize = prize; if (prize >= 1000) announce(p.name + ' ne Metro Grand Mall lucky draw mein ' + fmt(prize) + ' jeete!', 'showoff');
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
      const v = m.v; st.v = v && (p.vehicles.includes(v) || v === 'rent') ? v : null;
      if (st.v && st.v !== 'rent' && p.cur !== st.v) { p.cur = st.v; broadcast(pinfo(c)); }
      st.hp = clamp(Math.round(num(m.hp, 100)), 0, 100); st.fx = m.fx === 1 ? 1 : 0; st.ts = now();
      break;
    }
    case 'chat': {
      if (!rateOk(c, 'chat', 0.9)) return;
      const text = D.cleanText(m.text, 120); if (!text) return;
      track(c, 'chats'); const cr = crewOf(p);
      broadcast({ t: 'chat', id: p.id, name: p.name, tag: cr ? cr.tag : null, text, near: placeName(c.st || {}) });
      break;
    }
    case 'hit': {
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
      const h = c.lastHitBy; c.st && (c.st.hp = 0);
      if (h && now() - h.at < 5) {
        const k = conns.get(h.id); if (!k) return;
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

// ------------------------------------------------------------------ http + ws
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
app.get('/healthz', (req, res) => res.json({ ok: true, players: conns.size }));
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules/three/build'), { maxAge: '7d' }));
app.use(express.static(path.join(ROOT, 'public'), { maxAge: '5m' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });

wss.on('connection', ws => {
  let c = null; let msgs = 0; let windowStart = Date.now();
  ws.on('message', raw => {
    const t = Date.now(); if (t - windowStart > 1000) { windowStart = t; msgs = 0; } if (++msgs > 60) return; // flood guard
    let m; try { m = JSON.parse(raw); } catch { return; } if (!m || typeof m !== 'object') return;
    if (!c) {
      if (m.t !== 'hello') return;
      let p = typeof m.token === 'string' ? Object.values(db.profiles).find(x => x.token === m.token) : null;
      const name = D.cleanText(m.name, 16) || ('Chhora ' + Math.floor(Math.random() * 90 + 10));
      if (!p) { p = newProfile(name, clamp(Math.floor(num(m.color, 0)), 0, D.SHIRTS.length - 1)); db.profiles[p.id] = p; }
      else if (m.name && name !== p.name) p.name = name;
      if (m.color !== undefined) p.color = clamp(Math.floor(num(m.color, p.color)), 0, D.SHIRTS.length - 1);
      const old = conns.get(p.id); if (old) { send(old, { t: 'kicked', reason: 'Yeh account doosre tab mein khul gaya' }); old.ws.close(); conns.delete(p.id); }
      c = { ws, p, st: null, cool: {} }; conns.set(p.id, c);
      p.lastSeen = Date.now(); ensureMissions(p); beltCheckDay();
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
        players: [...conns.values()].filter(x => x !== c).map(pinfo), event: worldEvent, auction, party: partyView(), roast: roastState(),
        turf: turfView(), crews: crewList(), ann: announcements.slice(-8), belt: db.belt, lb: lbCache || leaderboards(), serverTime: now(),
      });
      broadcast(pinfo(c));
      if (conns.size > 1) broadcast({ t: 'toast', text: p.name + ' Gurugram mein aa gaya! (' + conns.size + ' online)' }, x => x !== c);
      return;
    }
    try { handle(c, m); } catch (e) { console.error('handler error', m && m.t, e); }
  });
  ws.on('close', () => {
    if (!c) return; if (conns.get(c.p.id) === c) { conns.delete(c.p.id); broadcast({ t: 'left', id: c.p.id }); }
    c.p.lastSeen = Date.now(); dirty = true;
  });
  ws.on('error', () => {});
});
function partyView() { return party ? { host: party.host, hostName: party.hostName, ends: party.ends, guests: party.guests.size } : null; }

// snapshot tick: positions to everyone (interest-managed)
setInterval(() => {
  const list = [...conns.values()].filter(c => c.st);
  for (const c of conns.values()) {
    if (c.ws.readyState !== 1) continue; const me = c.st; const out = [];
    for (const o of list) {
      if (o === c) continue; const s = o.st;
      if (me && s.in !== me.in) { out.push([o.p.id, null]); continue; }
      if (me && !s.in && dist(s, me) > 320) { out.push([o.p.id, null]); continue; }
      out.push([o.p.id, Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10, Math.round(s.r * 100) / 100, s.a, s.v, s.in, s.hp, s.fx]);
    }
    c.ws.send(JSON.stringify({ t: 's', p: out, n: conns.size }));
  }
}, TICK_MS);

// slow ticks: events, auctions, turf, battles, leaderboards
let slow = 0;
setInterval(() => {
  slow++; const t = now();
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
}, 1000);

server.listen(PORT, () => console.log('Gurugram Life server on http://localhost:' + PORT));
export { server };
