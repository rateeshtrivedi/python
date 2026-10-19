// Sapno ka Shehar story rules, run in-process against the shared world (no server needed):
// a new player starts on the footpath, finishing all of a day's kaam hands over the next home, the rishta needs a home and a car.
import { createWorld } from '../public/shared/world.js';
import * as D from '../public/shared/data.js';
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
let n = 0; const rid = k => (++n).toString(36).padStart(k, 'x'); let W = createWorld({ rid, load: () => null, save: () => {} });
function join(token) {
  const inbox = []; const c = W.connect(m => inbox.push(m), () => {}, { ip: '1.2.3.' + (++n) });
  c.message({ t: 'hello', name: 'Story Test', color: 1, token }); const wel = inbox.find(m => m.t === 'welcome');
  let rid = 0; const req = (t, d) => { const id = ++rid; c.message({ t, rid: id, ...d }); return inbox.filter(m => m.t === 'reply' && m.rid === id).pop(); };
  return { c, inbox, wel, req };
}
// finish every task but the badla one by hand (the in-process profile is shared), then beat the goon
function finishDay(pl) { const act = pl.wel.profile.missions.active; for (const a of act) if (a.k !== 'badla') a.done = true; pl.c.message({ t: 'ev', k: 'badla' }); return pl.inbox.filter(m => m.t === 'chapter').pop(); }

const A = join(); const p0 = A.wel.profile;
check(p0.home === 'street' && p0.houses.join() === 'street' && p0.money < 2000 && p0.outfit && p0.bling && p0.mods, 'new player starts on the footpath with little money');
check(!A.req('buy', { kind: 'house', id: 'pg' }).ok, 'the PG room cannot be bought: the story gives it');
check(!A.req('rishta', { s: 'call', g: 'f' }).ok, 'no rishta without a home and a car');
const c1 = finishDay(A); const prof = A.inbox.filter(m => m.t === 'profile').pop().p;
check(c1 && c1.prize.kind === 'house' && c1.prize.id === 'pg' && prof.home === 'pg' && prof.houses.includes('pg'), 'finishing all of day 1 hands over the Sharma PG room and moves you in');
check(c1 && c1.ch === 1 && A.inbox.some(m => m.t === 'daydone'), 'chapter moves to Din 2 and the day bonus is still paid');

// saved players (a world loaded from disk): an old one with a flat and a car, and one who owns the farmhouse
const old = (id, o) => ({ ...JSON.parse(JSON.stringify(p0)), id, token: 'tok_' + id, story: undefined, missions: { active: [], next: 0, round: 0 }, ...o });
W = createWorld({ rid, load: () => ({ profiles: { b1: old('b1', { houses: ['pg', 'flat'], home: 'flat', vehicles: ['chhotu'], money: 100000 }), c1: old('c1', { houses: ['street', 'pg', 'farm'], home: 'farm' }) } }), save: () => {} });
const B = join('tok_b1'), pb = B.wel.profile;
const c2 = finishDay(B); check(c2 && c2.prize.id === 'pent' && B.inbox.filter(m => m.t === 'profile').pop().p.home === 'pent', 'an old player with a flat gets the penthouse next (progress kept)');
const r1 = B.req('rishta', { s: 'call', g: 'm' }); check(r1.ok && r1.spouse.g === 'm' && r1.spouse.stage === 1 && D.SPOUSE_NAMES.m.includes(r1.spouse.name), 'Mausi ji brings a rishta once there is a home and a car');
check(!B.req('rishta', { s: 'meet' }).ok, 'meeting needs you at the Cyber Hub cafe');
B.c.message({ t: 'st', x: 102, z: -259, r: 0, a: 0, in: '' }); check(B.req('rishta', { s: 'meet' }).ok, 'meet at the cafe');
B.c.message({ t: 'st', x: 300, z: -150, r: 0, a: 0, v: 'chhotu', in: '' }); check(B.req('rishta', { s: 'date' }).ok, 'long drive to Leisure Valley');
check(!B.req('rishta', { s: 'ring' }).ok && B.req('buy', { kind: 'bling', id: 'ring' }).ok && B.req('rishta', { s: 'ring' }).ok, 'the ring from Goyal Jewellers seals the sagaai');
const m0 = B.inbox.filter(m => m.t === 'profile').pop().p.money; const sh = B.req('rishta', { s: 'shaadi' }); check(sh.ok && sh.spouse.stage === 5 && B.inbox.filter(m => m.t === 'profile').pop().p.money === m0 - D.SHAADI_COST, 'shaadi costs ' + D.SHAADI_COST + ' and the spouse moves in');

// top of the ladder: the diamond set, then the story is done
const C = join('tok_c1');
const c3 = finishDay(C); const pc = C.inbox.filter(m => m.t === 'profile').pop().p; check(c3 && c3.prize.id === 'heera' && pc.bling.includes('heera') && pc.story.done && c3.ch === D.CHAPTERS.length, 'the farmhouse owner wins the diamond set and finishes the story');
console.log(fails ? fails + ' story check(s) failed' : 'story checks passed'); process.exit(fails ? 1 : 0);
