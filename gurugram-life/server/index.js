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
fs.mkdirSync(DATA_DIR, { recursive: true });
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
function shutdown() { world.persist(true); setTimeout(() => process.exit(0), 300); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
app.get('/healthz', (req, res) => res.json({ ok: true, players: world.players() }));
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules/three/build'), { maxAge: '7d' }));
app.use(express.static(path.join(ROOT, 'public'), { maxAge: '5m' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });

wss.on('connection', ws => {
  const conn = world.connect(msg => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }, () => ws.close());
  let msgs = 0; let windowStart = Date.now();
  ws.on('message', raw => {
    const t = Date.now(); if (t - windowStart > 1000) { windowStart = t; msgs = 0; } if (++msgs > 60) return; // flood guard
    let m; try { m = JSON.parse(raw); } catch { return; }
    conn.message(m);
  });
  ws.on('close', () => conn.close());
  ws.on('error', () => {});
});

server.listen(PORT, () => console.log('Gurugram Life server on http://localhost:' + PORT));
export { server };
