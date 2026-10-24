// Translation check: the story (chapters, Bade Kaam, Gali ke Don) has English, and the dictionaries load clean.
import * as D from '../public/shared/data.js';
const dicts = {}; for (const l of ['en', 'hi', 'har']) dicts[l] = (await import('../public/js/lang/' + l + '.js')).default;
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
for (const [l, pairs] of Object.entries(dicts)) {
  const seen = new Map(), dup = [], empty = [];
  for (const [a, b] of pairs) { if (!a || !b) empty.push(a); const k = a.replace(/\s+/g, ' ').trim(); if (seen.has(k) && seen.get(k) !== b) dup.push(k); seen.set(k, b); }
  check(!empty.length, l + '.js: no empty entries' + (empty.length ? ' (' + empty.slice(0, 3).join(' | ') + ')' : ''));
  check(!dup.length, l + '.js: no key translated two different ways' + (dup.length ? ' (' + dup.slice(0, 3).join(' | ') + ')' : ''));
}
const en = new Set(dicts.en.map(p => p[0].replace(/\s+/g, ' ').trim()));
const story = [...D.CHAPTERS.flatMap(c => [c.title, c.intro, c.prize]), ...D.BADE.flatMap(b => [b.title, b.brief]), ...D.DON.flatMap(d => [d.intro, d.taunt])];
const hinglish = s => /\b(ka|ki|ke|se|mein|pe|ko|ne|tera|teri|aur)\b/i.test(s); // place names like "Farmhouse, Bhondsi" read the same in English
const missing = story.filter(s => hinglish(s) && !en.has(s.replace(/\s+/g, ' ').trim()));
check(!missing.length, 'every chapter, Bada Kaam and Gali ke Don line has English (' + story.length + ' lines)' + (missing.length ? ': missing ' + missing.slice(0, 5).join(' | ') : ''));
console.log(fails ? fails + ' i18n check(s) failed' : 'i18n checks passed'); process.exit(fails ? 1 : 0);
