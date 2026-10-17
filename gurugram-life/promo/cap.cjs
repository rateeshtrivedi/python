// Daily reel capture: the real game in a vertical 1080x1920 window, scripted scenes from days/<DAY>/scenes.js,
// virtual clock (every frame exactly 1/30 s), HUD hidden, POV text drawn on top. Needs the game server on :3120.
// usage: DAY=2026-10-17 [LOWRES=1] [ONLY=1,3] [OUT=file.mp4] node cap.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs'); const path = require('path'); const { spawn } = require('child_process');
const KIT = __dirname, GAME = process.env.GAME || '/home/user/python/gurugram-life'; const DIR = path.join(KIT, 'days', process.env.DAY);
const seed = JSON.parse(fs.readFileSync(path.join(KIT, 'seed.json'), 'utf8')); const SC = JSON.parse(fs.readFileSync(path.join(DIR, 'scenes.json'), 'utf8'));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null; const LOWRES = !!process.env.LOWRES;
const extra = `\nwindow.__g = { G, keys, DAY, WX, setWeather, mount, dismount, startChase, CARS, FIGHTERS, startJack, takeJacked, carAt, punch, toggleDance, enterInterior, exitInterior, DOORS, INTERIOR, AKHARA, say, bigText, firework, burst, camera, PERF, scene, PEDS, CROWD, makeFighter, makeChar, setLook, JAM, COWS, startRace, serverNow, get CJ() { return chaseJeep; }, get PEHLWAN() { return PEHLWAN; }, get PV() { return playerVeh; }, get player() { return player; } }; PERF.n = -1e12;`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: LOWRES ? 1 : 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(s => { localStorage.setItem('gl_world', s.world); localStorage.setItem('gl_token', JSON.stringify(s.token)); localStorage.setItem('gl_name', JSON.stringify('Bunty Sangwan')); localStorage.setItem('gl_lookset', '1'); localStorage.setItem('gl_avatar', JSON.stringify(s.avatar)); localStorage.setItem('gl_color', '0'); localStorage.setItem('gl_local', JSON.stringify({ locked: 1, loanerOK: 1, hunger: 80 })); localStorage.setItem('gl_lang', '"en"'); }, seed);
  await p.addInitScript({ path: path.join(KIT, 'clock.js') });
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: fs.readFileSync(path.join(KIT, 'fontcss.css'), 'utf8'), contentType: 'text/css' }));
  await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [], bol: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  let src = fs.readFileSync(path.join(GAME, 'public/js/game.js'), 'utf8'); src = src.replace('else { updateCamera(dt);', 'else { updateCamera(dt); if (window.__cam) window.__cam(camera, dt);'); if (!src.includes('window.__cam')) throw new Error('camera hook not applied');
  await p.route('**/js/game.js', r => r.fulfill({ body: src + extra, contentType: 'application/javascript' }));
  await p.goto('http://localhost:3120/');
  const step = (n, ms = 1000 / 30) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__step(ms); }, [n, ms]);
  for (let i = 0; i < 60 && !(await p.evaluate(() => !!window.__g)); i++) await step(10);
  await step(30); await p.click('#playBtn'); await step(20); await p.click('.splace >> text=Rajiv Chowk');
  for (let i = 0; i < 300 && !(await p.evaluate(() => window.__g.G.started)); i++) await step(2);
  await step(30); await p.evaluate(sc => { window.__SC = sc; }, SC); await p.addScriptTag({ path: path.join(KIT, 'lib.js') }); await p.addScriptTag({ path: path.join(DIR, 'scenes.js') });
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', process.env.OUT || path.join(DIR, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const shot = async () => { const buf = await p.screenshot({ type: 'jpeg', quality: 90 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); };
  for (let i = 0; i < SC.length; i++) {
    if (ONLY && !ONLY.includes(i + 1)) continue; const s = SC[i]; const n = Math.round(s.dur * 30);
    await p.evaluate(i => window.__R.setup(i), i); for (let k = 0; k < Math.round((s.pre || 0.6) * 30); k++) await p.evaluate(i => { window.__R.tick(i, -1); window.__step(1000 / 30); }, i);
    for (let f = 0; f < n; f++) { await p.evaluate(([i, f]) => { window.__R.tick(i, f / 30); window.__step(1000 / 30); }, [i, f]); await shot(); }
    console.log('scene', i + 1, 'done', n, 'frames', JSON.stringify(await p.evaluate(() => window.__R.info())));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log(errs.length ? 'page errors:\n' + [...new Set(errs)].slice(0, 8).join('\n') : 'no page errors'); await b.close();
})();
