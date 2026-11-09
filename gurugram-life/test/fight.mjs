// Street fight mode rules: styles, blocks, throws, rounds, boss levels and the opponent's AI.
import * as F from '../public/shared/fight.js';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
// three styles, each with punch, kick, special
ok(F.STYLE_IDS.join() === 'kungfu,karate,judo', 'three styles');
for (const id of F.STYLE_IDS) for (const k of ['punch', 'kick', 'special']) { const m = F.move(id, k); ok(m && m.dmg > 0 && m.range > 1 && F.total(m) > 0.2, id + ' ' + k + ' is a real move'); ok(m.range >= F.MIN_GAP, id + ' ' + k + ' reaches past the minimum gap'); }
for (const id of F.STYLE_IDS) ok(F.move(id, 'special').cd > 0, id + ' special has a cooldown');
// blocks, guard breaks and throws
const punch = F.move('karate', 'punch'), chop = F.move('karate', 'special'), thr = F.move('judo', 'special'), sweep = F.move('judo', 'kick');
ok(F.resolveHit(punch, false).dmg === punch.dmg, 'clean punch does full damage');
ok(F.resolveHit(punch, true).blocked && F.resolveHit(punch, true).dmg < punch.dmg / 3, 'blocked punch is mostly stopped');
const br = F.resolveHit(chop, true); ok(br.broke && !br.blocked && br.dmg > F.resolveHit(punch, true).dmg, 'the karate chop breaks a guard');
const t = F.resolveHit(thr, true); ok(t.thrown && t.down && t.dmg === thr.dmg, 'a judo throw cannot be blocked and knocks down');
ok(F.resolveHit(sweep, false).down && !F.resolveHit(sweep, true).down, 'a sweep knocks down unless blocked');
ok(F.resolveHit(punch, false, 1.5).dmg === Math.round(punch.dmg * 1.5), 'damage multiplier applies');
ok(F.move('kungfu', 'special').hits >= 3, 'kung fu flurry hits several times');
ok(F.inReach(punch, punch.range) && !F.inReach(punch, punch.range + 0.01), 'reach is exact');
ok(F.move('karate', 'kick').range > F.move('karate', 'punch').range, 'kicks reach further than punches');
// rounds and the match
ok(F.roundWinner(50, 0, 10) === 'a' && F.roundWinner(0, 50, 10) === 'b', 'KO wins the round');
ok(F.roundWinner(60, 40, 0) === 'a' && F.roundWinner(40, 60, 0) === 'b' && F.roundWinner(50, 50, 0) === 'draw', 'time out: more health wins');
ok(F.roundWinner(60, 40, 5) === null, 'round goes on while both stand and time is left');
ok(F.matchWinner(2, 0, 2) === 'a' && F.matchWinner(1, 2, 3) === 'b' && F.matchWinner(1, 1, 3) === null, 'best of three');
ok(F.matchWinner(1, 1, F.ROUNDS + 2) === 'a', 'endless draws end in the player\'s favour');
// boss levels: later chapters are tougher; under-levelled players get a softer boss
const b0 = F.bossLevel(0, 1), b4 = F.bossLevel(4, 10); ok(b4.hp > b0.hp && b4.block > b0.block && b4.think < b0.think, 'Dalal Bhai is tougher than Rinku');
ok(F.bossLevel(4, 1).dmg < F.bossLevel(4, 10).dmg, 'a low-level player faces a softer final boss');
ok(F.BOSS_STYLE.length === 5 && F.BOSS_STYLE.every(s => F.STYLES[s]), 'every Don boss has a style');
// the AI
let r = 0; const seq = a => () => a[r++ % a.length]; const lv = F.bossLevel(2, 6);
ok(F.aiDecide({ gap: 4, foeAttacking: null, cd: 0, style: 'karate', foeStyle: 'judo', hpFrac: 1 }, lv, seq([0.1])) === 'fwd', 'far away: closes in');
r = 0; ok(F.aiDecide({ gap: 1.5, foeAttacking: 'punch', cd: 0, style: 'karate', foeStyle: 'karate', hpFrac: 1 }, lv, seq([0.0])) === 'block', 'blocks an incoming punch');
r = 0; ok(['punch', 'kick', 'special'].includes(F.aiDecide({ gap: 1.4, foeAttacking: null, cd: 0, style: 'kungfu', foeStyle: 'karate', hpFrac: 1 }, lv, seq([0.9, 0.1, 0.2]))), 'in range: attacks');
const counts = {}; for (let i = 0; i < 4000; i++) { const d = F.aiDecide({ gap: 1.3, foeAttacking: null, cd: 0, style: 'judo', foeStyle: 'karate', hpFrac: 1 }, lv); counts[d] = (counts[d] || 0) + 1; }
ok(counts.special > 0 && counts.punch > 0 && counts.kick > 0, 'AI mixes all its moves ' + JSON.stringify(counts));
console.log(bad ? bad + ' of ' + n + ' fight checks failed' : 'fight checks passed (' + n + ')'); process.exit(bad ? 1 : 0);
