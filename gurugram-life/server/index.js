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
import { stations } from './stations.js';

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
  newAccountsPerIpHour: Number(process.env.NEW_ACCOUNTS_PER_IP_HOUR) || 30,
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
app.get('/api/stations', async (req, res) => { res.setHeader('Cache-Control', 'public, max-age=3600'); res.json(await stations().catch(() => ({ har: [], pun: [] }))); });
// Owner page: who has played. Set ADMIN_KEY on the host to turn it on; the browser asks for it as the password.
const ADMIN_KEY = process.env.ADMIN_KEY || '';
function adminOk(req) {
  const m = /^Basic (.+)$/.exec(req.headers.authorization || ''); if (!m) return false;
  const pass = Buffer.from(m[1], 'base64').toString().replace(/^[^:]*:/, '');
  const a = crypto.createHash('sha256').update(pass).digest(), b = crypto.createHash('sha256').update(ADMIN_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}
app.use('/admin', (req, res, next) => {
  if (ADMIN_KEY.length < 8) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
  if (!adminOk(req)) { res.setHeader('WWW-Authenticate', 'Basic realm="Gurugram Life owner"'); return res.status(401).send('Password chahiye'); }
  next();
});
const esc = s => String(s).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';');
const ist = ms => new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
app.get('/admin/players.csv', (req, res) => {
  const s = world.stats(), q = v => '"' + String(v).replace(/^([=+\-@])/, "'$1").replace(/"/g, '""') + '"'; // ' stops spreadsheet formulas in names
  const rows = [['name', 'level', 'money', 'respect', 'crew', 'plate', 'joined_ist', 'last_seen_ist', 'visits', 'minutes_played', 'online_now']]
    .concat(s.players.map(p => [p.name, p.level, p.money, p.respect, p.crew, p.plate, ist(p.created), ist(p.lastSeen), p.visits, p.playMin, p.online ? 'yes' : 'no']));
  res.type('text/csv').attachment('gurugram-life-players.csv').send(rows.map(r => r.map(q).join(',')).join('\n'));
});
app.get('/admin', (req, res) => {
  const s = world.stats();
  const card = (n, l) => `<div class=c><b>${n}</b><span>${l}</span></div>`;
  const rows = s.players.map((p, i) => `<tr><td>${i + 1}</td><td>${p.online ? '<i></i>' : ''}${esc(p.name)}${p.crew ? ' <em>[' + esc(p.crew) + ']</em>' : ''}</td><td>${p.level}</td><td>₹${p.money.toLocaleString('en-IN')}</td><td>${p.visits}</td><td>${p.playMin}</td><td>${ist(p.created)}</td><td>${p.online ? 'online' : ist(p.lastSeen)}</td></tr>`).join('');
  res.type('html').send(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Gurugram Life players</title>
<style>body{margin:0;font:15px system-ui,sans-serif;background:#1b1410;color:#fff4d8;padding:16px}h1{color:#f6c026;margin:0 0 4px}p{margin:0 0 14px;opacity:.75}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px}.c{background:#2a201a;border-radius:12px;padding:12px;border-bottom:4px solid #d7331f}.c b{display:block;font-size:28px;color:#f6c026}.c span{opacity:.8;font-size:13px}
.w{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:640px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #3a2d24;white-space:nowrap}th{color:#f6c026;position:sticky;top:0;background:#1b1410}em{color:#8fd1ff;font-style:normal}i{display:inline-block;width:9px;height:9px;border-radius:50%;background:#3ddc6a;margin-right:6px}a{color:#f6c026}</style>
<h1>Gurugram Life: players</h1><p>Times in IST. Visits and minutes played are counted from the day this page was added. <a href="/admin/players.csv">Download CSV</a></p>
<div class=g>${card(s.total, 'players ever')}${card(s.online, 'online now')}${card(s.active24h, 'played in last 24h')}${card(s.active7d, 'played in last 7 days')}${card(s.new24h, 'new in last 24h')}${card(s.new7d, 'new in last 7 days')}</div>
<div class=w><table><tr><th>#</th><th>Name</th><th>Level</th><th>Money</th><th>Visits</th><th>Minutes</th><th>Joined</th><th>Last seen</th></tr>${rows || '<tr><td colspan=8>Abhi koi nahi</td></tr>'}</table></div>`);
});
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules/three/build'), { maxAge: '7d', immutable: true }));
// The page needs absolute links for share previews (WhatsApp, Instagram, X): fill in this site's address.
// PUBLIC_URL (e.g. https://gurugramlife.com) pins it; otherwise it comes from the request's host.
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
function siteOrigin(req) {
  if (/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(PUBLIC_URL)) return PUBLIC_URL;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return '';
  return (req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http') + '://' + host;
}
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache'); res.type('html').send(INDEX_HTML.split('__ORIGIN__').join(siteOrigin(req)));
});
// Game code and the page must always be fresh after a deploy: browsers and Cloudflare revalidate (cheap 304s).
app.use(express.static(path.join(ROOT, 'public'), { etag: true, lastModified: true, setHeaders: (res, file) => { res.setHeader('Cache-Control', file.includes(path.sep + 'img' + path.sep) ? 'public, max-age=86400' : 'no-cache'); if (file.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json'); } }));
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
  const conn = world.connect(msg => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }, () => ws.close(), { ip }, text => { if (ws.readyState === 1) ws.send(text); });
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
