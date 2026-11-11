// Owner page numbers: coming back (2+ visits, another day, next day), play time and weekly new players.
import { createWorld } from '../public/shared/world.js';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const day = 864e5, t = Date.now(), ist = ms => new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10);
const P = (id, o) => ({ id, name: 'P' + id, level: 1, money: 0, respect: 0, visits: 1, playMs: 6e5, ...o });
const profiles = {
  a: P('a', { created: t - 10 * day, lastSeen: t - 10 * day }), // came once
  b: P('b', { created: t - 5 * day, lastSeen: t - 4 * day, visits: 3, days: [ist(t - 5 * day), ist(t - 4 * day)], firstMs: 9 * 6e4, playMs: 30 * 6e4 }), // came back the next day
  c: P('c', { created: t - 60e3, lastSeen: t - 60e3 }), // joined just now: not counted for next-day yet
  d: P('d', { created: t - 3 * day, lastSeen: t - 1 * day, visits: 2, firstMs: 3 * 6e4 }), // came back two days later
  bot: P('bot', { bot: true, created: t - day, lastSeen: t, visits: 9 }),
};
const w = createWorld({ rid: () => Math.random().toString(36).slice(2), load: () => ({ profiles }), save: () => {} });
const s = w.stats(), r = s.retention;
ok(s.total === 4, 'bots are not players (' + s.total + ')');
ok(r.ret2 === 2, 'two players came back (' + r.ret2 + ')');
ok(r.later === 2, 'two came back on another day (' + r.later + ')');
ok(r.d1Base === 3 && r.d1 === 1, 'one of three eligible came back the next day (' + r.d1 + '/' + r.d1Base + ')');
ok(r.medFirst === 9 || r.medFirst === 3, 'median first session from recorded players (' + r.medFirst + ')');
ok(r.firstN === 2, 'first session known for two players');
ok(r.weeks.length === 6 && r.weeks.reduce((a, x) => a + x.n, 0) === 4, 'weekly new players add up');
ok(r.weeks[5].n === 4 - 1 && r.weeks[4].n === 1, 'this week 3 joined, last week 1 (' + r.weeks.map(x => x.n) + ')');
console.log(bad ? bad + ' of ' + n + ' owner-stats checks failed' : 'owner stats checks passed (' + n + ')'); process.exit(bad ? 1 : 0);
