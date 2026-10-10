// Gurugram Life server: serves the game and runs the shared multiplayer world over WebSockets.
// All game rules live in public/shared/world.js (the browser runs the same file in solo mode).
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createWorld } from '../public/shared/world.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 300;   // beyond this, new visitors play solo
const MAX_PER_IP = Number(process.env.MAX_PER_IP) || 20;      // tabs/devices from one network (homes, offices, colleges share IPs)
const BACKUP_DAYS = 14;
fs.mkdirSync(path.join(DATA_DIR, 'backups'), { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'world.json');

const world = createWorld({
  rid: (n = 8) => crypto.randomBytes(n).toString('base64url').slice(0, n),
  load: () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8')),
  save: json => { const tmp = DB_FILE + '.tmp'; fs.writeFile(tmp, json, err => { if (!err) fs.rename(tmp, DB_FILE, () => {}); }); },
  bots: false,
});
setInterval(() => world.tick100(), 100);
setInterval(() => world.tick1s(), 1000);
setInterval(() => world.persist(), 20000);

// Daily backup copy of the save file, keeping the last two weeks.
function backup() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const day = new Date().toISOString().slice(0, 10); const dir = path.join(DATA_DIR, 'backups');
    const target = path.join(dir, 'world-' + day + '.json'); if (!fs.existsSync(target)) fs.copyFileSync(DB_FILE, target);
    const files = fs.readdirSync(dir).filter(f => /^world-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of files.slice(0, Math.max(0, files.length - BACKUP_DAYS))) fs.unlinkSync(path.join(dir, f));
  } catch (e) { console.error('backup failed', e.message); }
}
backup(); setInterval(backup, 3600e3);

function shutdown() { world.persist(true); setTimeout(() => process.exit(0), 300); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
const VERSION = (process.env.RENDER_GIT_COMMIT || '').slice(0, 7) || 'local';
app.get('/healthz', (req, res) => res.json({ ok: true, players: world.players(), version: VERSION, websocket: '/ws' }));
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules/three/build'), { maxAge: '7d', immutable: true }));
app.use(express.static(path.join(ROOT, 'public'), { maxAge: '5m' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });

function clientIp(req) {
  const cf = req.headers['cf-connecting-ip']; if (typeof cf === 'string' && cf) return cf;
  const xff = req.headers['x-forwarded-for']; if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}
const perIp = new Map();
wss.on('connection', (ws, req) => {
  const ip = clientIp(req);
  if (wss.clients.size > MAX_PLAYERS || (perIp.get(ip) || 0) >= MAX_PER_IP) {
    console.warn('refused connection: full or per-IP limit', ip); ws.send(JSON.stringify({ t: 'full' })); ws.close(); return;
  }
  perIp.set(ip, (perIp.get(ip) || 0) + 1);
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  const conn = world.connect(msg => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }, () => ws.close(), { ip });
  let msgs = 0; let windowStart = Date.now();
  ws.on('message', raw => {
    const t = Date.now(); if (t - windowStart > 1000) { windowStart = t; msgs = 0; } if (++msgs > 60) return; // flood guard
    let m; try { m = JSON.parse(raw); } catch { return; }
    conn.message(m);
  });
  ws.on('close', () => { conn.close(); const n = (perIp.get(ip) || 1) - 1; if (n > 0) perIp.set(ip, n); else perIp.delete(ip); });
  ws.on('error', () => {});
});
// Drop connections that went silent (phone locked, network lost) so they don't linger as ghosts.
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch {} } }, 30000);
setInterval(() => console.log(new Date().toISOString(), 'players online:', world.players()), 600000);

server.listen(PORT, () => console.log('Gurugram Life server on http://localhost:' + PORT + ' version ' + VERSION + ' data ' + DATA_DIR));
export { server };
