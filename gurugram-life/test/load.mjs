// Load test: N simulated players walking around one spot (worst case: everyone sees everyone).
// Reports server CPU and how steady the 10-per-second position updates stay.  Usage: node test/load.mjs 50 100 200
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import WebSocket from 'ws';
const PORT = 3998; const sizes = process.argv.slice(2).map(Number).filter(Boolean); if (!sizes.length) sizes.push(50, 100, 200);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-load-'));
const srv = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, MAX_PLAYERS: '2000', MAX_PER_IP: '5000', NEW_ACCOUNTS_PER_IP_HOUR: '100000' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => String(d).includes('server on') && r()));
const cpuTicks = () => { const f = fs.readFileSync(`/proc/${srv.pid}/stat`, 'utf8').split(') ')[1].split(' '); return Number(f[11]) + Number(f[12]); };
const HZ = Number(execSync('getconf CLK_TCK')) || 100;
const bots = [];
function bot(i) {
  return new Promise(res => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`); const b = { ws, x: Math.random() * 20 - 10, z: 40 + Math.random() * 20, gaps: [], last: 0, bytes: 0 };
    ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', name: 'Bot' + i, color: i % 8 })));
    ws.on('message', d => { b.bytes += d.length; const m = JSON.parse(d); if (m.t === 'welcome') { b.timer = setInterval(() => { b.x += Math.random() - 0.5; b.z += Math.random() - 0.5; ws.send(JSON.stringify({ t: 'st', x: b.x, z: b.z, r: 0, a: 1, v: null, in: '', hp: 100 })); }, 100); res(b); } if (m.t === 's') { const t = performance.now(); if (b.last) b.gaps.push(t - b.last); b.last = t; } });
    ws.on('error', () => res(b)); ws.on('close', () => res(b));
  });
}
console.log('players | server CPU | update gap avg / p95 (ideal 100 ms) | download per player');
for (const n of sizes) {
  while (bots.length < n) { const batch = []; for (let k = 0; k < 25 && bots.length + batch.length < n; k++) batch.push(bot(bots.length + batch.length)); bots.push(...await Promise.all(batch)); }
  await new Promise(r => setTimeout(r, 2000));
  for (const b of bots) { b.gaps = []; b.bytes = 0; }
  const c0 = cpuTicks(), t0 = performance.now(); await new Promise(r => setTimeout(r, 10000)); const cpu = (cpuTicks() - c0) / HZ / ((performance.now() - t0) / 1000);
  const gaps = bots.flatMap(b => b.gaps).sort((a, b) => a - b); const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length; const p95 = gaps[Math.floor(gaps.length * 0.95)];
  const kbps = bots.reduce((a, b) => a + b.bytes, 0) / bots.length / 10 / 1024;
  console.log(`${String(n).padStart(7)} | ${(cpu * 100).toFixed(0).padStart(6)}% of 1 core | ${avg.toFixed(0)} / ${p95.toFixed(0)} ms | ${kbps.toFixed(0)} KB/s`);
}
for (const b of bots) { clearInterval(b.timer); b.ws.close(); }
srv.kill('SIGTERM'); process.exit(0);
