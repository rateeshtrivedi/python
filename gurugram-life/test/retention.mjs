// Retention rules (QA tracker RET-01..14), run in-process against the shared world: the cold-open reward and the starter
// car, welcome-back info, back-to-back job streaks, mini-game medals and leaderboards, the gift every few minutes, the
// 7-day calendar and gold wrap, the free daily lucky draw, offline business income, wanted-level bribes, cheap crews,
// invite rewards, the weekly sector war, the Don trophy and the owner funnel with its A/B split.
import { createWorld } from '../public/shared/world.js';
import * as D from '../public/shared/data.js';
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew; // move the clock instead of waiting
let n = 0; const rid = k => (++n).toString(36).padStart(k, 'x'); let saved = null; const W = createWorld({ rid, load: () => saved, save: j => { saved = JSON.parse(j); } });
function join(hello) {
  const inbox = []; const c = W.connect(m => inbox.push(m), () => {}, { ip: '9.9.9.' + (++n) });
  c.message({ t: 'hello', name: 'Ret Test', color: 1, ...hello }); const wel = inbox.find(m => m.t === 'welcome');
  let r = 0; const req = (t, d) => { const id = ++r; c.message({ t, rid: id, ...d }); return inbox.filter(m => m.t === 'reply' && m.rid === id).pop(); };
  return { c, inbox, wel, req, send: (t, d) => c.message({ t, ...d }), prof: () => inbox.filter(m => m.t === 'profile').pop()?.p || wel.profile };
}
const st = (pl, x = 0, z = 0) => pl.send('st', { x, z, r: 0, a: 0, v: null, in: null, hp: 100 });

// RET-01 / RET-05: the cold open pays ₹1,000 once and hands over the Khatara
const A = join({ ab: 'cold' }); st(A);
const c1 = A.req('earn', { reason: 'coldopen', amount: 5 });
check(c1.ok && c1.amount === 1000 && A.prof().money === 1000, 'cold open pays exactly ₹1,000 (whatever the client asks)');
check(A.prof().vehicles.includes('khatara') && D.hasCar(A.prof()) && A.prof().cur === 'khatara', 'cold open gives the starter car (Khatara 800) and selects it');
skew += 10e3; check(!A.req('earn', { reason: 'coldopen', amount: 1000 }).ok, 'the cold-open reward cannot be claimed twice');
check(A.prof().ab === 'cold', 'the A/B variant is stored on the profile');
check(!D.BUY_VEHICLES.includes('khatara') && !A.req('buy', { kind: 'vehicle', id: 'khatara' }).ok, 'the Khatara is a gift, never sold');

// RET-13: funnel steps, event counters, the owner page split
for (const k of ['landing', 'name_ok', 'avatar_done', 'ab_cold', 'play', 'first_move', 'cold_go', 'cold_done', 'first_reward']) A.send('step', { k });
A.send('evc', { k: 'death' }); A.send('evc', { k: 'camstuck' }); A.send('evc', { k: 'nonsense' });
const s1 = W.stats(); const f = k => s1.funnel.find(x => x.k === k);
check(f('landing').n >= 1 && f('cold_done').cold >= 1 && f('cold_done').classic === 0, 'funnel counts pre-connect steps and splits them by A/B variant');
check(s1.evc.death === 1 && s1.evc.camstuck === 1 && !s1.evc.nonsense, 'deaths and stuck cameras are counted; unknown events are ignored');
check(s1.today >= 1, 'players today are counted');

// RET-07: back-to-back jobs pay more
skew += 20e3; const j1 = A.req('earn', { reason: 'delivery', amount: 300 }); skew += 20e3; const j2 = A.req('earn', { reason: 'delivery', amount: 300 }); skew += 20e3; const j3 = A.req('earn', { reason: 'ride', amount: 300 });
check(j1.ok && j1.mult === 1 && j2.mult === 1.5 && j2.amount === 450 && j3.mult === 2 && j3.amount === 600, 'job streak: x1, x1.5, x2 for jobs within 3 minutes');
skew += 200e3; const j4 = A.req('earn', { reason: 'delivery', amount: 300 }); check(j4.mult === 1, 'a gap of more than 3 minutes resets the streak');

// RET-07: mini-games
const m1 = A.req('mini', { g: 'trial1', score: 23000 }); check(m1.ok && m1.medal === 3 && m1.pay === D.MEDAL_PAY[3] && m1.top[0].score === 23000, 'time trial under 24 s: gold medal, paid, on the leaderboard');
skew += 10e3; const m2 = A.req('mini', { g: 'trial1', score: 22000 }); check(m2.ok && m2.pay === 0 && m2.best === 22000, 'a better time later the same day: new best, no second payout');
skew += 10e3; check(!A.req('mini', { g: 'trial1', score: 3000 }).ok, 'an impossible time is refused');
skew += 10e3; const m3 = A.req('mini', { g: 'golgappa', score: 21 }); check(m3.ok && m3.medal === 2 && m3.pay === D.MEDAL_PAY[2], 'golgappa: 21 = silver');
skew += 10e3; const m4 = A.req('mini', { g: 'golgappa', score: 30 }); check(m4.pay === D.MEDAL_PAY[3] - D.MEDAL_PAY[2], 'moving up to gold pays only the difference');
check(A.req('minis', {}).top.trial1.length === 1, 'leaderboards come back with the mini-game list');

// RET-08: a small gift every 2.5 minutes, checked on the server
{ const N = join({}); st(N); check(!N.req('earn', { reason: 'gift', amount: 0 }).ok, 'no gift before 2.5 minutes of play'); }
skew += (D.GIFT_EVERY + 2) * 1e3; const g1 = A.req('earn', { reason: 'gift', amount: 0 }); check(g1.ok && g1.amount === D.giftAmt(A.prof().level, 1), 'gift arrives after 2.5 minutes, server-sized');
skew += 30e3; check(!A.req('earn', { reason: 'gift', amount: 0 }).ok, 'and not again 30 seconds later');

// RET-06: chai-paani grows with the stars
const mBefore = A.prof().money; const br = A.req('buy', { kind: 'misc', id: 'bribe', stars: 3 }); check(br.ok && br.price === D.bribeCost(3) && A.prof().money === mBefore - D.bribeCost(3), 'chai-paani for 3 stars costs ' + D.bribeCost(3));
skew += 2e3; const au = A.req('buy', { kind: 'misc', id: 'auto' }); check(au.ok && au.price === 50, 'fast travel (auto) costs ₹50');

// RET-10: one free lucky draw a day
skew += 2e3; const l1 = A.req('buy', { kind: 'misc', id: 'lucky' }); skew += 2e3; const l2 = A.req('buy', { kind: 'misc', id: 'lucky' });
check(l1.ok && l1.price === 0 && l2.price === 200, 'lucky draw: the first card of the day is free, the next costs ₹200');

// RET-09: crews are cheap now; RET-11 business needs the first Bada Kaam
check(D.CREW_PRICE === 2000, 'making a crew costs ₹2,000');
check(!A.req('buy', { kind: 'biz', id: 'chai' }).ok, 'no chai tapri before Bada Kaam 1');
A.req('bkstart', { i: 0 }); skew += 61e3; const bk = A.req('bkdone', { i: 0 }); check(bk.ok, 'Bada Kaam 1 done');
for (let k = 0; k < 4; k++) { skew += 20e3; A.req('earn', { reason: 'ride', amount: 1000 }); } // enough for the tapri whatever the lucky draw paid
skew += 2e3; const bz = A.req('buy', { kind: 'biz', id: 'chai' }); check(bz.ok && A.prof().biz.length === 1, 'chai tapri bought after Bada Kaam 1' + (bz.ok ? '' : ': ' + bz.error + ' (wallet ' + A.prof().money + ')'));
skew += 2 * 3600e3; skew += 0; const col = A.req('earn', { reason: 'biz', amount: 0 }); check(col.ok && Math.abs(col.amount - 2 * D.BIZ.chai.perHour) <= 2, 'two hours away: the tapri made ' + col.amount);
skew += 30 * 3600e3; skew += 10e3; const col2 = A.req('earn', { reason: 'biz', amount: 0 }); check(col2.ok && col2.amount === D.BIZ.chai.capHours * D.BIZ.chai.perHour, 'a day and more away: capped at ' + D.BIZ.chai.capHours + ' hours');
skew += 10e3; check(!A.req('earn', { reason: 'biz', amount: 0 }).ok, 'nothing to collect right after collecting');

// RET-02: coming back after a while: the welcome says how long, and what the business made
const tok = A.wel.token; A.c.close(); skew += 5 * 3600e3; const A2 = join({ token: tok });
check(A2.wel.away >= 5 * 3600 - 5 && Math.abs(A2.wel.bizDue - 5 * D.BIZ.chai.perHour) <= 2, 'welcome back: away ' + Math.round(A2.wel.away / 3600) + ' h, business waiting ' + A2.wel.bizDue);
check(A2.wel.daily && A2.wel.daily.cal >= 1 && A2.wel.daily.amt >= D.CALENDAR[0].amt - D.PG_RENT, 'the daily reward follows the 7-day calendar');

// RET-10: day 7 of the calendar paints the car gold; the wrap toggles on a car you own
const B = join({}); st(B); const pB = () => B.prof(); // the calendar: come back seven days in a row
for (let d = 0; d < 7; d++) { const tk = B.wel.token; B.c.close(); skew += 24 * 3600e3; const nb = join({ token: tk }); Object.assign(B, nb); }
check((pB().skins || []).includes('sona'), 'a 7-day streak unlocks the gold wrap');
B.req('earn', { reason: 'coldopen', amount: 0 }); B.send('wrap', { v: 'khatara' }); check(pB().mods.khatara && pB().mods.khatara.wrap === true, 'the gold wrap goes on the Khatara');

// RET-09: invite a friend: both get a Bullet when the friend does their first kaam
const host = join({}); const hid = host.wel.profile.id; const fr = join({ ref: hid }); st(fr);
const fr1 = fr.req('earn', { reason: 'coldopen', amount: 0 }); check(fr1.ok && fr.prof().vehicles.includes('dhakad'), 'the invited friend gets a Bullet on the first kaam');
check(host.prof().vehicles.includes('dhakad'), 'and so does the friend who invited them');
const self = join({ ref: 'nobody-here' }); st(self); self.req('earn', { reason: 'coldopen', amount: 0 }); check(!self.prof().vehicles.includes('dhakad'), 'an unknown invite code gives nothing');

// RET-05: anyone past the first Bada Kaam without a car gets the Khatara on their next visit
{ const old = join({}); const id = old.wel.profile.id, tk = old.wel.token; old.c.close(); W.persist(true); const p = saved.profiles[id]; p.bk = 2; p.vehicles = ['scooty']; const W2 = createWorld({ rid, load: () => saved, save: () => {} });
  const inbox = []; const c = W2.connect(m => inbox.push(m), () => {}, { ip: '8.8.8.8' }); c.message({ t: 'hello', name: 'Old Timer', token: tk }); const wel = inbox.find(m => m.t === 'welcome');
  check(wel.profile.vehicles.includes('khatara'), 'an older player past Bada Kaam 1 with only a Scooty gets the Khatara'); }

// RET-09: weekly sector war state is reported with the crews
check('war' in A2.req('crews', {}), 'the crew list carries the weekly war');

console.log(fails ? fails + ' retention check(s) failed' : 'retention checks passed'); process.exit(fails ? 1 : 0);
