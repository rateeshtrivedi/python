// Live Haryanvi and Punjabi radio for the in-game Radio. The game can't ship hit songs itself (copyright),
// so it tunes into stations that broadcast them live, found through the public radio-browser.info directory.
// The list is cached for 6 hours; only HTTPS MP3/AAC streams that passed the directory's last check are kept.
const HOSTS = ['de1.api.radio-browser.info', 'de2.api.radio-browser.info', 'fi1.api.radio-browser.info', 'nl1.api.radio-browser.info'];
const SKIP = /gurbani|kirtan|gurdwara|sikh|paath|bhajan|news|talk|sport|quran|islam|christ|church/i;
const TTL = 6 * 3600e3;
let cache = { at: 0, data: null }, pending = null;

async function query(params) {
  for (const h of HOSTS) {
    try {
      const r = await fetch('https://' + h + '/json/stations/search?' + params + '&hidebroken=true&order=clickcount&reverse=true&limit=60', { headers: { 'User-Agent': 'GurugramLife/1.0' }, signal: AbortSignal.timeout(8000) });
      if (r.ok) return await r.json();
    } catch { /* try the next mirror */ }
  }
  return [];
}
export function cleanStations(list, max = 15) {
  const out = [], seen = new Set();
  for (const s of list) {
    const url = String(s.url_resolved || s.url || ''); const name = String(s.name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!/^https:\/\/[^\s"'<>]+$/.test(url) || !name || seen.has(url) || seen.has(name.toLowerCase())) continue;
    if (s.lastcheckok !== undefined && Number(s.lastcheckok) !== 1) continue;
    if (!/^(mp3|aac\+?|aac)$/i.test(String(s.codec || '').trim())) continue;
    if (SKIP.test(name + ' ' + (s.tags || ''))) continue;
    seen.add(url); seen.add(name.toLowerCase()); out.push({ name, url });
    if (out.length >= max) break;
  }
  return out;
}
export async function stations() {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  if (!pending) pending = (async () => {
    const [h1, h2, p1, p2] = await Promise.all([query('tag=haryanvi'), query('name=haryanvi'), query('tag=punjabi'), query('tag=bhangra')]);
    const data = { har: cleanStations([...h1, ...h2]), pun: cleanStations([...p1, ...p2]) };
    if (data.har.length || data.pun.length) cache = { at: Date.now(), data };
    pending = null; return cache.data || data;
  })();
  return pending;
}
