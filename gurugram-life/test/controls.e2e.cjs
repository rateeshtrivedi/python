// Controls regression: drives the game ONLY through real keyboard / mouse / touch events and checks the effect.
// Start the server first (npm start), then: npm run test:controls   (NOLOCK=1 also tests a browser that refuses pointer lock)
// GL_LANG=hi or en runs the same checks with the game translated.
// Needs Playwright with Chromium: PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chrome are optional overrides.
const path = require('path'); const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const URL = process.env.URL || 'http://localhost:3000/'; const GAME_JS = path.join(__dirname, '..', 'public', 'js', 'game.js');
const HOOK = '\nwindow.__t={G,FIGHTERS,REMOTES,PEDS,CROWD,DOORS,AKHARA,get P(){return P},get PV(){return playerVeh},get player(){return player}};';
const results = []; const rec = (id, ok, info) => { results.push([id, ok, info]); console.log((ok ? 'PASS ' : 'FAIL ') + id + (info ? '  — ' + info : '')); };
async function open(browser, opts, name, noLock, film) {
  const ctx = await browser.newContext(opts); if (!film) await ctx.addInitScript(() => localStorage.setItem('gl_intro', '1')); /* the intro film has its own check (F1) */ if (process.env.GL_LANG) await ctx.addInitScript(l => localStorage.setItem('gl_lang', JSON.stringify(l)), process.env.GL_LANG); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' })); await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  await p.route('**/js/game.js', r => r.fulfill({ body: fs.readFileSync(GAME_JS, 'utf8') + HOOK, contentType: 'application/javascript' }));
  await p.route('**/models/rides/**', r => r.abort()); // input checks only: the box-built vehicles keep three software-rendered tabs fast enough
  if (noLock) await p.addInitScript(() => { HTMLCanvasElement.prototype.requestPointerLock = function () { setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')), 10); }; });
  await p.goto(URL); await p.waitForTimeout(1200); await p.fill('#nameIn', name).catch(() => {}); await p.click('#playBtn'); await p.waitForTimeout(500); if (await p.$('#cNext:visible')) await p.click('#cNext'); await p.waitForTimeout(300);
  await p.click('.splace >> text=Rajiv Chowk'); await p.waitForFunction(() => window.__t && window.__t.G.started, null, { timeout: 30000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('#modal').forEach(m => m.hidden = true); const G = window.__t.G; G.story = null; G.tut = false; G.donCallNext = 1e12; }); // no Gali ke Don phone call during the checks
  return p;
}
const E = (p, f, a) => p.evaluate(f, a);
const st = p => E(p, () => { const G = window.__t.G; return { x: G.x, z: G.z, r: G.r, yaw: G.yaw, y: window.__t.player.position.y, veh: G.veh, hp: G.hp, modal: !document.getElementById('modal').hidden, map: !!G.map, chat: !document.getElementById('chatbar').hidden, frozen: !!G.frozen }; });
const place = (p, x, z, yaw) => E(p, ([x, z, yaw]) => { const G = window.__t.G; G.x = x; G.z = z; G.yaw = yaw; G.r = yaw; G.vs = 0; }, [x, z, yaw]);
// a street chhora parked in front of the CAMERA, body turned away
const chhora = (p, ahead = 1.7) => E(p, ahead => { const t = window.__t, G = t.G; const n = t.FIGHTERS.find(f => !f.pehl && !f.jack && !f.badla && f.state !== 'ko'); n.hp = n.max; n.state = 'wander'; n.x = G.x + Math.sin(G.yaw) * ahead; n.z = G.z + Math.cos(G.yaw) * ahead; n.tx = n.x; n.tz = n.z; n.hx = n.x; n.hz = n.z; G.r = G.yaw + 2.4; window.__n = n; return n.hp; }, ahead);
const hold = async (p, key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); };
module.exports = { open, rec, results, E, st, place, chhora, hold };
if (require.main === module) (async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const NOLOCK = !!process.env.NOLOCK;
  // ---------------- desktop
  // ---------------- intro film: a first-timer sees it once, Skip ends it and hands over the controls
  { const q = await open(b, { viewport: { width: 1280, height: 720 } }, 'Tester Film', false, true);
    const seen = await q.waitForSelector('#film .skip', { timeout: 15000 }).then(() => true, () => false); await q.waitForTimeout(800); await q.click('#film .skip').catch(() => {}); await q.waitForTimeout(1500);
    const after = await E(q, () => ({ gone: !document.getElementById('film'), frozen: window.__t.G.frozen, once: localStorage.getItem('gl_intro') }));
    rec('F1 a first-timer sees the intro film and Skip ends it', seen && after.gone && !after.frozen && after.once === '1', JSON.stringify(after)); await q.context().close(); }
  const p = await open(b, { viewport: { width: 1280, height: 720 } }, 'Tester Ek', NOLOCK);
  await place(p, 0, 20, 0); await p.waitForTimeout(300);
  let a = await st(p); await hold(p, 'KeyW', 1500); let c = await st(p); const walk = Math.hypot(c.x - a.x, c.z - a.z); rec('D1 W walks forward', walk > 2, 'moved ' + walk.toFixed(1));
  a = c; await hold(p, 'KeyD', 700); c = await st(p); rec('D2 D moves/turns right', Math.hypot(c.x - a.x, c.z - a.z) > 0.8 || Math.abs(c.r - a.r) > 0.3, 'dpos ' + Math.hypot(c.x - a.x, c.z - a.z).toFixed(1));
  await place(p, 0, 20, 0); a = await st(p); await p.keyboard.down('ShiftLeft'); await hold(p, 'KeyW', 1500); await p.keyboard.up('ShiftLeft'); c = await st(p); const run = Math.hypot(c.x - a.x, c.z - a.z); rec('D3 Shift runs faster', run > walk * 1.2, 'run ' + run.toFixed(1) + ' vs walk ' + walk.toFixed(1));
  await place(p, 0, 20, 0); await p.keyboard.press('Space'); let peak = 0; for (let i = 0; i < 10; i++) { await p.waitForTimeout(60); peak = Math.max(peak, (await st(p)).y); } rec('D4 Space jumps', peak > 0.4, 'peak y ' + peak.toFixed(2));
  // mouse: click into the game, then look around
  await p.mouse.click(640, 360); await p.waitForTimeout(300); const lockOK = await E(p, () => document.pointerLockElement === document.querySelector('canvas'));
  a = await st(p); await p.mouse.move(640, 360); await p.mouse.down(); await p.mouse.move(760, 360, { steps: 8 }); await p.mouse.up(); await p.mouse.move(900, 360, { steps: 8 }); await p.waitForTimeout(200); c = await st(p);
  rec('D5 mouse turns the camera', Math.abs(c.yaw - a.yaw) > 0.15, (lockOK ? 'pointer locked' : 'NO pointer lock') + ', yaw change ' + (c.yaw - a.yaw).toFixed(2));
  // fight: chhora in front of the camera, body facing away
  await place(p, 0, 20, 0); let hp0 = await chhora(p); await p.mouse.click(640, 360); await p.waitForTimeout(500); await p.mouse.click(640, 360); await p.waitForTimeout(500); let hp1 = await E(p, () => window.__n.hp);
  rec('D6 left-click punches an NPC in front of the camera', hp1 < hp0, 'chhora hp ' + hp0 + ' -> ' + hp1);
  await place(p, 0, 20, 0); hp0 = await chhora(p); await p.keyboard.press('KeyQ'); await p.waitForTimeout(500); await p.keyboard.press('KeyQ'); await p.waitForTimeout(300); hp1 = await E(p, () => window.__n.hp);
  rec('D7 Q punches an NPC in front of the camera', hp1 < hp0, 'chhora hp ' + hp0 + ' -> ' + hp1);
  const pedHit = await E(p, () => { const t = window.__t, G = t.G; const pd = t.PEDS.find(q => q.mesh.visible) || t.PEDS[0]; const q = pd.mesh.position; G.x = q.x - 1.4; G.z = q.z; G.yaw = G.r = Math.PI / 2; window.__ped = pd; return true; });
  await p.keyboard.press('KeyQ'); await p.waitForTimeout(700);
  rec('D8 a street pedestrian can be punched and fights back', await E(p, () => window.__t.FIGHTERS.some(f => f.fromPed && f.state === 'aggro')));
  const crowdHit = await E(p, () => { const t = window.__t, G = t.G; const c = t.CROWD[5]; G.x = c.x - 1.3; G.z = c.z; G.yaw = G.r = Math.PI / 2; window.__c = c; return true; }); await p.keyboard.press('KeyQ'); await p.waitForTimeout(500);
  rec('D8b a person in a crowd can be punched (falls)', await E(p, () => window.__c.knock > 0));
  // E action at a door
  await E(p, () => { const t = window.__t, G = t.G, d = t.DOORS.dhaba; G.x = d.x; G.z = d.z; G.yaw = G.r = Math.PI; }); await p.waitForTimeout(400); await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
  rec('D9 E enters the dhaba', await E(p, () => window.__t.G.inside === 'dhaba')); await E(p, () => { const G = window.__t.G; }); await p.waitForTimeout(200);
  await p.keyboard.press('KeyE'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await E(p, () => { const G = window.__t.G; if (G.inside) { G.inside = null; } }); await place(p, 75, 60, 0); await p.waitForTimeout(500);
  // vehicle
  await p.keyboard.press('KeyF'); await p.waitForTimeout(400); c = await st(p); rec('D10 F gets into a vehicle', !!c.veh, 'veh ' + c.veh);
  a = c; await hold(p, 'KeyW', 1500); c = await st(p); rec('D11 W drives the vehicle', Math.hypot(c.x - a.x, c.z - a.z) > 3, 'moved ' + Math.hypot(c.x - a.x, c.z - a.z).toFixed(1));
  await p.keyboard.down('KeyW'); await p.keyboard.down('Space'); await p.waitForTimeout(400); await p.keyboard.up('Space'); await p.keyboard.up('KeyW'); rec('D12 Space handbrake while driving (no error)', p.errs.length === 0);
  await E(p, () => { window.__t.G.vs = 0; }); await p.keyboard.press('KeyF'); await p.waitForTimeout(300); rec('D13 F gets out', !(await st(p)).veh);
  await p.keyboard.press('Tab'); await p.waitForTimeout(400); rec('D14 Tab opens the phone menu', (await st(p)).modal);
  a = await st(p); await hold(p, 'KeyW', 400); c = await st(p); rec('D15 W does not walk while the menu is open', Math.hypot(c.x - a.x, c.z - a.z) < 0.2);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); rec('D16 Esc closes the menu', !(await st(p)).modal);
  await p.keyboard.press('KeyM'); await p.waitForTimeout(600); rec('D17 M opens the 3D map', (await st(p)).map); await p.keyboard.press('KeyM'); await p.waitForTimeout(400); rec('D18 M closes the map', !(await st(p)).map);
  await p.keyboard.press('KeyT'); await p.waitForTimeout(300); rec('D19 T opens chat', (await st(p)).chat); a = await st(p); await p.keyboard.type('www ram ram'); c = await st(p); rec('D20 typing in chat does not move the player', Math.hypot(c.x - a.x, c.z - a.z) < 0.2);
  await p.keyboard.press('Enter'); await p.waitForTimeout(300); rec('D21 Enter sends and closes chat', !(await st(p)).chat);
  a = await st(p); await hold(p, 'KeyW', 600); c = await st(p); rec('D22 W works again after chat', Math.hypot(c.x - a.x, c.z - a.z) > 1, 'moved ' + Math.hypot(c.x - a.x, c.z - a.z).toFixed(1) + (c.frozen ? ' frozen' : ''));
  // ---------------- multiplayer: a second real player
  const q = await open(b, { viewport: { width: 1280, height: 720 } }, 'Tester Do', NOLOCK);
  await place(q, 30, 30, Math.PI); await place(p, 30, 28.4, 0); await p.waitForTimeout(2500);
  const seen = await E(p, () => { for (const [id, R] of window.__t.REMOTES) if (R.info && R.info.name === 'Tester Do') return { id, vis: R.visible, x: R.mesh.position.x, z: R.mesh.position.z }; return null; });
  rec('M0 player 1 sees player 2', !!seen && seen.vis, JSON.stringify(seen));
  const qhp0 = (await st(q)).hp; await E(p, () => { window.__t.G.r += 2.4; }); for (let i = 0; i < 3; i++) { await p.keyboard.press('KeyQ'); await p.waitForTimeout(500); } await q.waitForTimeout(500); const qhp1 = (await st(q)).hp;
  rec('M1 punching a real player hurts them', qhp1 < qhp0, 'player 2 hp ' + qhp0 + ' -> ' + qhp1);
  const php0 = (await st(p)).hp; for (let i = 0; i < 3; i++) { await q.mouse.click(640, 360); await q.waitForTimeout(500); } await p.waitForTimeout(400); const php1 = (await st(p)).hp;
  rec('M2 player 2 can hit back with the mouse', php1 < php0, 'player 1 hp ' + php0 + ' -> ' + php1);
  // AI player: search the city for one on foot, walk up, punch with Q
  const spots = []; for (const x of [-225, -75, 75, 225]) for (const z of [-225, -75, 75, 225]) spots.push([x, z]); let ai = null;
  for (let round = 0; round < 2 && !ai; round++) for (const [x, z] of spots) { await place(p, x, z, 0); await p.waitForTimeout(1500); ai = await E(p, () => { for (const [id, R] of window.__t.REMOTES) if (R.info && /\(AI\)/.test(R.info.name) && !R.veh && R.visible && R.hp > 0) return { id, name: R.info.name }; return null; }); if (ai) break; }
  if (ai) { let hp0 = null, hp = null; for (let i = 0; i < 40; i++) { const s = await E(p, id => { const R = window.__t.REMOTES.get(id), G = window.__t.G; if (!R) return null; const q = R.mesh.position; G.x = q.x + 1.4; G.z = q.z; G.yaw = -Math.PI / 2; G.hp = Math.max(G.hp, 30); return R.hp; }, ai.id); if (s == null) break; if (hp0 == null) hp0 = s; hp = s; if (i > 2) await p.keyboard.press('KeyQ'); await p.waitForTimeout(550); if (hp0 - hp >= 20) break; }
    rec('M3 punching an (AI) player works', hp < hp0, ai.name + ' hp ' + hp0 + ' -> ' + hp); } else rec('M3 punching an (AI) player works', false, 'no AI on foot found');
  // ---------------- phone (the two laptop tabs close first: three software-rendered games at once starve the phone tab; their error lists are kept)
  await p.context().close(); await q.context().close();
  const m = await open(b, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'Tester Teen', false);
  const tapEl = async sel => { const bx = await m.locator(sel).boundingBox(); await m.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); };
  await place(m, 0, 20, 0); a = await st(m); const jb = await m.locator('#joy').boundingBox(); const cx = jb.x + jb.width / 2, cy = jb.y + jb.height / 2;
  const cdp = await m.context().newCDPSession(m); const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', cx, cy); for (let i = 1; i <= 6; i++) { await touch('touchMove', cx, cy - i * 9); await m.waitForTimeout(30); } await m.waitForTimeout(1000); await touch('touchEnd'); c = await st(m);
  rec('T1 joystick walks', Math.hypot(c.x - a.x, c.z - a.z) > 1.5, 'moved ' + Math.hypot(c.x - a.x, c.z - a.z).toFixed(1));
  a = await st(m); const rx = 330, ry = 420; await touch('touchStart', rx, ry); for (let i = 1; i <= 6; i++) { await touch('touchMove', rx - i * 12, ry); await m.waitForTimeout(30); } await touch('touchEnd'); c = await st(m); rec('T2 swipe on the right turns the camera', Math.abs(c.yaw - a.yaw) > 0.15, 'yaw ' + (c.yaw - a.yaw).toFixed(2));
  await place(m, 0, 20, 0); hp0 = await chhora(m); await tapEl('#bPunch'); await m.waitForTimeout(500); await tapEl('#bPunch'); await m.waitForTimeout(300); hp1 = await E(m, () => window.__n.hp); rec('T3 Punch button hits an NPC in front of the camera', hp1 < hp0, 'hp ' + hp0 + ' -> ' + hp1);
  await E(m, () => { window.__n.x += 50; }); await place(m, 0, 20, 0); await tapEl('#bRun'); peak = 0; for (let i = 0; i < 10; i++) { await m.waitForTimeout(60); peak = Math.max(peak, (await st(m)).y); } rec('T4 Jump button jumps', peak > 0.4, 'peak ' + peak.toFixed(2));
  await place(m, 75, 60, 0); await tapEl('#bVeh'); await m.waitForTimeout(400); rec('T5 Gaadi button gets into a vehicle', !!(await st(m)).veh); await E(m, () => { window.__t.G.vs = 0; }); await tapEl('#bVeh'); await m.waitForTimeout(300); rec('T6 Gaadi button gets out', !(await st(m)).veh);
  await E(m, () => { const t = window.__t, G = t.G, d = t.DOORS.dhaba; G.x = d.x; G.z = d.z; }); await m.waitForTimeout(500); const actVis = await m.locator('#bAct').isVisible(); rec('T7 Action button shows at a door', actVis); if (actVis) { await tapEl('#bAct'); await m.waitForTimeout(1500); rec('T8 Action button enters the dhaba', await E(m, () => window.__t.G.inside === 'dhaba')); }
  await tapEl('#bMenu'); await m.waitForTimeout(400); rec('T9 Menu button opens the phone', (await st(m)).modal);
  for (const [nm, pg] of [['desktop', p], ['player2', q], ['phone', m]]) rec('ERR ' + nm + ' page errors', pg.errs.length === 0, pg.errs.slice(0, 3).join(' | '));
  const f = results.filter(r => !r[1]); console.log('\n' + (results.length - f.length) + '/' + results.length + ' passed' + (f.length ? '; failed: ' + f.map(r => r[0].split(' ')[0]).join(', ') : ''));
  await b.close(); process.exitCode = f.length ? 1 : 0;
})();
