// Smoke test: boots the server on a temp port and drives two WebSocket players through the core flows.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const PORT = 3999;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-'));
const srv = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'inherit'] });
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
  const e1 = await a.req('earn', { reason: 'delivery', amount: 999999 }); check(e1.ok && e1.amount === 700, 'earning is capped by the server');
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
  const three = await fetch(`http://localhost:${PORT}/vendor/three/three.module.js`); check(three.ok, 'three.js served from /vendor');
  a2.ws.close(); b.ws.close();
} catch (e) { console.error(e); failures++; }
srv.kill('SIGTERM'); await new Promise(r => srv.on('exit', r));
check(fs.existsSync(path.join(dataDir, 'world.json')), 'world saved to disk on shutdown');
console.log(failures ? failures + ' check(s) failed' : 'all checks passed'); process.exit(failures ? 1 : 0);
