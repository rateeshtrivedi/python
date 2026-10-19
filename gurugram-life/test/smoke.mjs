// Smoke test: boots the server on a temp port and drives two WebSocket players through the core flows.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import http from 'node:http';

const PORT = 3999;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-'));
const srv = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, GL_FIRST_EVENT_S: '4', GL_FIRST_EVENT_IDX: '1' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => String(d).includes('server on') && r()));

let failures = 0;
const check = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) failures++; };
function player(name) {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`); const inbox = []; let rid = 0; const waiters = [];
  ws.on('message', d => { const m = JSON.parse(d); inbox.push(m); for (const w of waiters.slice()) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.res(m); } });
  const p = {
    ws, inbox,
    open: () => new Promise(r => ws.on('open', r)),
    send: (t, d) => ws.send(JSON.stringify({ t, ...d })),
    wait: (pred, ms = 3000) => new Promise((res, rej) => { const hit = inbox.find(pred); if (hit) return res(hit); const w = { pred, res }; waiters.push(w); setTimeout(() => rej(new Error('timeout')), ms); }),
    req: (t, d) => { const id = ++rid; ws.send(JSON.stringify({ t, rid: id, ...d })); return p.wait(m => m.t === 'reply' && m.rid === id); },
  };
  return p;
}
try {
  const a = player('A'), b = player('B'); await a.open(); await b.open();
  a.send('hello', { name: 'Bunty', color: 1 }); const wa = await a.wait(m => m.t === 'welcome');
  b.send('hello', { name: 'Pinky', color: 3 }); const wb = await b.wait(m => m.t === 'welcome');
  check(wa.profile.money > 2000 && wa.daily, 'new player gets starting money + daily reward');
  check(!!wa.token && !('token' in wa.profile), 'token returned separately, not in public profile');
  const tasks = wa.profile.missions.active; const bad = tasks.find(t => t.k === 'badla');
  check(wa.profile.missions.v === 2 && tasks.length === 7 && new Set(tasks.map(t => t.slot)).size === 7, 'seven daily tasks, one per slot');
  check(!!bad && bad.enemy && Number.isFinite(bad.x) && bad.t.includes(bad.enemy) && !bad.t.includes('{'), 'badla task names the goon, the friend and the place');
  check(tasks.every(t => t.n > 0 && t.r > 0 && !t.done), 'every task has a target and a reward');
  a.send('ev', { k: 'badla' }); const kp = await a.wait(m => m.t === 'toast' && /Kaam poora/.test(m.text)); const pr = await a.wait(m => m.t === 'profile' && m.p.missions.active.find(t => t.k === 'badla').done);
  check(!!kp && !!pr && pr.p.money > wa.profile.money, 'beating the badla goon completes the task and pays');
  await a.wait(m => m.t === 'pi' && m.id === wb.id); check(true, 'A sees B appear');
  a.send('st', { x: 0, z: 0, r: 0, a: 0, v: null, in: '', hp: 100 }); b.send('st', { x: 1.5, z: 0, r: 0, a: 0, v: null, in: '', hp: 100 });
  const snap = await b.wait(m => m.t === 's' && m.p.some(e => e[0] === wa.id && e[1] === 0)); check(!!snap, 'positions broadcast in snapshots');
  a.send('chat', { text: 'Ram Ram bhai!​' }); const ch = await b.wait(m => m.t === 'chat'); check(ch.text === 'Ram Ram bhai!', 'chat relayed and cleaned');
  await new Promise(r => setTimeout(r, 300));
  a.send('hit', { target: wb.id }); const dmg = await b.wait(m => m.t === 'dmg'); check(dmg.d >= 9 && dmg.by === wa.id, 'punch in range delivers damage');
  b.send('st', { x: 50, z: 0, r: 0, a: 0, v: null, in: '', hp: 90 }); await new Promise(r => setTimeout(r, 450)); const before = b.inbox.filter(m => m.t === 'dmg').length;
  a.send('hit', { target: wb.id }); await new Promise(r => setTimeout(r, 300)); check(b.inbox.filter(m => m.t === 'dmg').length === before, 'punch out of range is rejected');
  const food = await a.req('buy', { kind: 'food', id: 'd_lassi', shop: 'dhaba' }); check(food.ok && food.price === 50, 'buy food at the dhaba');
  const wrong = await a.req('buy', { kind: 'food', id: 't_whisky', shop: 'dhaba' }); check(!wrong.ok, 'cannot buy theka items at the dhaba');
  const car = await a.req('buy', { kind: 'vehicle', id: 'cruiser' }); check(!car.ok, 'cannot buy a ₹4 lakh car with starter money');
  const scooty = await a.req('buy', { kind: 'vehicle', id: 'scooty' }); check(!scooty.ok || scooty.price === 8000, 'scooty purchase validated');
  // Gali ke Don: chapter 1 only counts next to the boss, once a day
  check(wa.profile.don && wa.profile.don.ch === 0, 'Gali ke Don starts at chapter 1');
  const ds = await a.req('donstart', { spot: 1 }); check(ds.ok && ds.spot === 1, 'taking the call puts the chapter at the chosen corner');
  a.send('st', { x: 300, z: 2, r: 0, a: 0, v: null, in: '', hp: 100 }); await new Promise(r => setTimeout(r, 150)); a.send('donko', { ch: 0 }); await new Promise(r => setTimeout(r, 300));
  check(!a.inbox.some(m => m.t === 'don'), 'a Don chapter away from the chosen corner is rejected');
  a.send('st', { x: -150, z: 2, r: 0, a: 0, v: null, in: '', hp: 100 }); await new Promise(r => setTimeout(r, 150)); a.send('donko', { ch: 0 }); const dn = await a.wait(m => m.t === 'don');
  check(dn.ch === 1 && dn.reward >= 1500, 'beating Rinku Chhapri at that corner completes chapter 1 and pays');
  const ds2 = await a.req('donstart', { spot: 2 }); check(!ds2.ok, 'no second chapter call on the same day');
  a.send('donko', { ch: 1 }); await new Promise(r => setTimeout(r, 300)); check(a.inbox.filter(m => m.t === 'don').length === 1, 'only one Don chapter per day');
  // live events: 30 s warning, then the money bag goes to whoever reaches it first
  const soon = await a.wait(m => m.t === 'evsoon', 8000); check(soon.type === 'thaila' && soon.in > 0, 'players get a countdown before a city event');
  const bag = await a.wait(m => m.t === 'event' && m.ev && m.ev.type === 'thaila', 9000); const bd = bag.ev.data;
  check(Number.isFinite(bd.x) && bd.prize >= 1500 && bd.place, 'money bag event has a spot, a place and a prize');
  const m0 = a.inbox.filter(m => m.t === 'toast').length; a.send('st', { x: bd.x + 2, z: bd.z, r: 0, a: 0, v: null, in: '', hp: 100 }); await new Promise(r => setTimeout(r, 150)); a.send('evreach', {});
  const won = await a.wait(m => m.t === 'toast' && /thaila/.test(m.text)); const over = await a.wait(m => m.t === 'event' && m.ev === null, 5000);
  check(!!won && !!over, 'first player to the money bag takes it and the event ends');
  a.send('st', { x: 300, z: 2, r: 0, a: 0, v: null, in: '', hp: 100 });
  const e1 = await a.req('earn', { reason: 'delivery', amount: 999999 }); check(e1.ok && e1.amount === 700, 'earning is capped by the server');
  const mp = await a.wait(m => m.t === 'mprog' && m.k === 'earned'); check(mp.v >= 700, 'earning shows live progress on the kamai task');
  const e2 = await a.req('earn', { reason: 'delivery', amount: 300 }); check(!e2.ok, 'earning cooldown enforced');
  const crew = await b.req('buy', { kind: 'crew', id: 'new', name: 'Sector 29 Sher', tag: 's29' }); check(!crew.ok, 'crew needs ₹25,000');
  const lb = await a.req('lb', {}); check(lb.ok && Array.isArray(lb.lb.rich), 'leaderboards available');
  const bid = await a.req('bid', { amount: 5 }); check(!bid.ok, 'bad bid rejected');
  // reconnect with token keeps the same account
  a.ws.close(); await new Promise(r => setTimeout(r, 200));
  const a2 = player('A2'); await a2.open(); a2.send('hello', { token: wa.token, name: 'Bunty' }); const wa2 = await a2.wait(m => m.t === 'welcome');
  check(wa2.id === wa.id && wa2.profile.c.deliveries === 1, 'token login restores the same profile');
  check(wa2.daily === null, 'daily reward only once per day');
  const health = await (await fetch(`http://localhost:${PORT}/healthz`)).json(); check(health.ok && health.players === 2, 'health endpoint');
  const page = await (await fetch(`http://localhost:${PORT}/`)).text(); check(page.includes('Gurugram Life') && !/\bTau\b/.test(page), 'page served, no "Tau" anywhere');
  for (const L of ['hi', 'en']) { // language packs: served, every pair keeps its {} holes, no "Tau"
    const r = await fetch(`http://localhost:${PORT}/js/lang/${L}.js`); const pairs = (await import(`../public/js/lang/${L}.js`)).default; const holes = s => (s.match(/\{\d*\}/g) || []).length;
    check(r.ok && pairs.length > 500 && pairs.every(([a, b]) => holes(a) === holes(b)) && !pairs.some(([, b]) => /\bTau\b|ताऊ|[\u0900-\u097F]/.test(b)), `${L} language pack served, well-formed, Roman script`);
  }
  { // search: canonical address, structured data, crawlable pages, robots and sitemap
    const home = await (await fetch(`http://localhost:${PORT}/`)).text(); const lds = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])['@type']);
    check(/<link rel="canonical" href="https:\/\/gurugramlife\.com\/">/.test(home) && lds.includes('VideoGame') && lds.includes('WebSite') && !home.includes('__CANON__') && !home.includes('__LD__'), 'home page: canonical URL and structured data');
    const pages = await Promise.all(['/about', '/how-to-play', '/places', '/updates', '/places/dlf-cyber-city', '/places/sadar-bazaar', '/hi', '/hi/how-to-play', '/hi/places'].map(async p => { const r = await fetch(`http://localhost:${PORT}${p}`); const t = await r.text(); return r.ok && /<h1>/.test(t) && t.includes('rel="canonical"') && !/\bTau\b/.test(t); }));
    const rb = await (await fetch(`http://localhost:${PORT}/robots.txt`)).text(), sm = await (await fetch(`http://localhost:${PORT}/sitemap.xml`)).text(), nf = await fetch(`http://localhost:${PORT}/no-such-page`);
    check(pages.every(Boolean) && rb.includes('Sitemap: https://gurugramlife.com/sitemap.xml') && (sm.match(/<loc>/g) || []).length === 33 && !sm.includes('<priority>') && nf.status === 404, 'about/how-to-play/places pages, robots.txt, sitemap, 404');
    const bare = await new Promise(res => http.get({ host: 'localhost', port: PORT, path: '/about', headers: { host: 'gurugramlife.com' } }, r => { r.resume(); res(r); })); // fetch() can't set Host
    const www = await new Promise(res => http.get({ host: 'localhost', port: PORT, path: '/about', headers: { host: 'www.gurugramlife.com' } }, r => { r.resume(); res(r); }));
    check(bare.statusCode === 200 && www.statusCode === 200, 'no domain redirects from the game (the host handles www, avoids a redirect loop)');
    const get = (p, h) => new Promise(res => http.get({ host: 'localhost', port: PORT, path: p, headers: h || {} }, r => { r.resume(); res(r); }));
    const slash = await get('/about/'), tls = await get('/about', { 'x-forwarded-proto': 'https' }), plain = await get('/about');
    check(slash.statusCode === 301 && slash.headers.location === '/about' && /max-age=31536000/.test(tls.headers['strict-transport-security'] || '') && !plain.headers['strict-transport-security'], 'trailing slash 301s to one address; HSTS over HTTPS only');
    const feed = await (await fetch(`http://localhost:${PORT}/updates.xml`)).text(), llm = await fetch(`http://localhost:${PORT}/llms.txt`), hi = await (await fetch(`http://localhost:${PORT}/hi`)).text(), how = await (await fetch(`http://localhost:${PORT}/how-to-play`)).text();
    check(/<rss[\s\S]*<item>/.test(feed) && llm.ok && hi.includes('lang="hi"') && hi.includes('hreflang="en-IN"') && how.includes('hreflang="hi" href="https://gurugramlife.com/hi/how-to-play"') && home.includes('hreflang="hi"'), 'RSS feed, llms.txt, Hindi pages with hreflang pairs');
    { const { CREDITS } = await import('../public/shared/credits.js'); const about = await (await fetch(`http://localhost:${PORT}/about`)).text(); const glb = await Promise.all(['auto', 'hatch', 'sedan', 'jeep', 'truck', 'bus', 'bike', 'scooter', 'cow'].map(f => fetch(`http://localhost:${PORT}/models/rides/${f}.glb`, { method: 'HEAD' })));
      check(CREDITS.every(c => about.includes(c.url) && about.includes(c.author.replace(/'/g, '&#39;'))) && glb.every(r => r.ok), 'credits on /about name every model author; vehicle and cow models served'); }
  }
  const three = await fetch(`http://localhost:${PORT}/vendor/three/three.module.js`); check(three.ok, 'three.js served from /vendor');
  a2.ws.close(); b.ws.close();
} catch (e) { console.error(e); failures++; }
srv.kill('SIGTERM'); await new Promise(r => srv.on('exit', r));
check(fs.existsSync(path.join(dataDir, 'world.json')), 'world saved to disk on shutdown');
console.log(failures ? failures + ' check(s) failed' : 'all checks passed'); process.exit(failures ? 1 : 0);
