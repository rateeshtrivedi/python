// Sapno ka Shehar story rules, run in-process against the shared world (no server needed): a new player starts on the
// footpath with an empty pocket; the day's kaam pay but the story moves through Bade Kaam, each one a new home, and some
// open up guns, a gang and land deals; the rishta needs a home and a car.
import { createWorld } from '../public/shared/world.js';
import * as D from '../public/shared/data.js';
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew; // a Bada Kaam takes at least a minute: move the clock on instead of waiting
let n = 0; const rid = k => (++n).toString(36).padStart(k, 'x'); let W = createWorld({ rid, load: () => null, save: () => {} });
function join(token) {
  const inbox = []; const c = W.connect(m => inbox.push(m), () => {}, { ip: '1.2.3.' + (++n) });
  c.message({ t: 'hello', name: 'Story Test', color: 1, token }); const wel = inbox.find(m => m.t === 'welcome');
  let rid = 0; const req = (t, d) => { const id = ++rid; c.message({ t, rid: id, ...d }); return inbox.filter(m => m.t === 'reply' && m.rid === id).pop(); };
  return { c, inbox, wel, req, prof: () => inbox.filter(m => m.t === 'profile').pop()?.p || wel.profile };
}
// the day's kaam: mark all but the kamai task done by hand (the in-process missions object is shared), then earn to finish it
function finishDay(pl) { const act = pl.wel.profile.missions.active; for (const a of act) if (a.k !== 'earned') a.done = true; else a.base -= 1e7; pl.req('earn', { reason: 'delivery', amount: 500 }); return pl.inbox.some(m => m.t === 'daydone'); }
// a Bada Kaam: start it, try to finish at once (refused), then a minute later (accepted)
function bade(pl, i) { const s = pl.req('bkstart', { i }); if (!s.ok) return { start: s }; const fast = pl.req('bkdone', { i }); skew += 61e3; const done = pl.req('bkdone', { i }); return { start: s, fast, done, chapter: pl.inbox.filter(m => m.t === 'chapter').pop() }; }

const A = join(); const p0 = A.wel.profile;
check(p0.home === 'street' && p0.houses.join() === 'street' && p0.money === 0 && p0.bk === 0 && p0.outfit && p0.bling && p0.mods, 'new player starts on the footpath with an empty pocket');
check(!A.req('buy', { kind: 'house', id: 'pg' }).ok, 'the PG room cannot be bought: the story gives it');
check(!A.req('rishta', { s: 'call', g: 'f' }).ok, 'no rishta without a home and a car');
check(finishDay(A) && !A.inbox.some(m => m.t === 'chapter') && A.prof().home === 'street', "finishing the day's kaam pays the bonus, but homes come from Bade Kaam");
check(!A.req('bkstart', { i: 2 }).ok, 'Bade Kaam go in order');
const b1 = bade(A, 0); const pa = A.prof();
check(b1.start.ok && !b1.fast.ok && b1.done.ok, 'Bada Kaam 1 (Pehli Kamai) cannot be rushed, then it counts');
check(b1.chapter && b1.chapter.prize.id === 'pg' && pa.home === 'pg' && pa.bk === 1 && pa.money >= D.BADE[0].pay, 'Pehli Kamai pays and hands over the Sharma PG room');
check(!A.req('buy', { kind: 'gun', id: 'katta' }).ok, 'no katta before Udhaar Vasooli');
const b2 = bade(A, 1); check(b2.done.ok && A.prof().bk === 2 && D.unlocked(A.prof(), 'guns') && A.prof().houses.includes('room'), 'Udhaar Vasooli opens Bittu Hathiyaar wala and the 1BHK');

// saved players (a world loaded from disk): an old one with a flat and a car, and one who owns the farmhouse
const old = (id, o) => ({ ...JSON.parse(JSON.stringify(p0)), id, token: 'tok_' + id, story: undefined, bk: undefined, gang: undefined, missions: { active: [], next: 0, round: 0 }, ...o });
W = createWorld({ rid, load: () => ({ profiles: { b1: old('b1', { houses: ['pg', 'flat'], home: 'flat', vehicles: ['chhotu'], money: 900000, visits: 3 }), c1: old('c1', { houses: ['street', 'pg', 'farm'], home: 'farm', money: 900000, visits: 3 }) } }), save: () => {} });
const B = join('tok_b1'), pb = B.wel.profile;
check(pb.bk === 3 && D.unlocked(pb, 'gang') && !D.unlocked(pb, 'land'), 'an old player with a flat counts three Bade Kaam done (progress kept)');
const k0 = bade(B, 3); check(k0.start.ok && !k0.done.ok, 'Pump pe Kabza needs a gang');
const g1 = B.req('buy', { kind: 'gang', id: 'x' }); check(g1.ok && B.prof().gang.length === 1 && B.inbox.some(m => m.t === 'pi' && m.gang && m.gang.length === 1), 'recruit a chela from the akhara: everyone sees him');
const k1 = bade(B, 3); check(k1.done.ok && k1.chapter.prize.id === 'pent' && B.prof().home === 'pent' && D.unlocked(B.prof(), 'land'), 'Pump pe Kabza: the penthouse, and land deals open');
const plots = B.req('plots', {}); const pl = plots.plots.find(x => x.id === 'badshah');
const buyP = B.req('buy', { kind: 'plot', id: 'badshah' }); check(buyP.ok && buyP.price === pl.price, 'buy a plot at today\'s price');
const sell = B.req('sellplot', { id: 'badshah' }); check(sell.ok && sell.price === Math.round(pl.price * 0.97), 'sell it back at the day\'s price, less 3% dalali');
const r1 = B.req('rishta', { s: 'call', g: 'm' }); check(r1.ok && r1.spouse.g === 'm' && r1.spouse.stage === 1 && D.SPOUSE_NAMES.m.includes(r1.spouse.name), 'Mausi ji brings a rishta once there is a home and a car');
check(!B.req('rishta', { s: 'meet' }).ok, 'meeting needs you at the Cyber Hub cafe');
B.c.message({ t: 'st', x: 102, z: -259, r: 0, a: 0, in: '' }); check(B.req('rishta', { s: 'meet' }).ok, 'meet at the cafe');
B.c.message({ t: 'st', x: 300, z: -150, r: 0, a: 0, v: 'chhotu', in: '' }); check(B.req('rishta', { s: 'date' }).ok, 'long drive to Leisure Valley');
check(!B.req('rishta', { s: 'ring' }).ok && B.req('buy', { kind: 'bling', id: 'ring' }).ok && B.req('rishta', { s: 'ring' }).ok, 'the ring from Goyal Jewellers seals the sagaai');
const m0 = B.prof().money; const sh = B.req('rishta', { s: 'shaadi' }); check(sh.ok && sh.spouse.stage === 5 && B.prof().money === m0 - D.SHAADI_COST, 'shaadi costs 25000 and the spouse moves in');

// top of the ladder: the last Bada Kaam (with a gang of two) gives the diamond set, then the story is done
const C = join('tok_c1');
check(C.wel.profile.bk === 6, 'the farmhouse owner is on the last Bada Kaam');
C.req('buy', { kind: 'gang', id: 'x' }); C.req('buy', { kind: 'gang', id: 'x' });
const c3 = bade(C, 6); const pc = C.prof(); check(c3.done.ok && c3.chapter.prize.id === 'heera' && pc.bling.includes('heera') && pc.story.done && c3.chapter.ch === D.CHAPTERS.length, 'Dalal Bhai ka Khatma wins the diamond set and finishes the story');
console.log(fails ? fails + ' story check(s) failed' : 'story checks passed'); process.exit(fails ? 1 : 0);
