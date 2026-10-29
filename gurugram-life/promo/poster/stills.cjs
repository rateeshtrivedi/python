// Hi-res stills from the real game, reusing the reel kit's scripted scenes. usage: DIR=<days/DAY> PICK=scene:frame,... node stills.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const KIT = path.join(__dirname, '..'), GAME = path.join(__dirname, '../..'); const DIR = process.env.DIR; const TAG = path.basename(DIR);
const seed = JSON.parse(fs.readFileSync(path.join(KIT, 'seed.json'), 'utf8')); const SC = JSON.parse(fs.readFileSync(path.join(DIR, 'scenes.json'), 'utf8'));
const PICK = process.env.PICK.split(',').map(s => s.split(':').map(Number));
const extra = `\nwindow.__g = { goInside: typeof goInside === 'function' ? goInside : null, setP: o => Object.assign(P, o), G, keys, DAY, WX, setWeather, mount, dismount, startChase, CARS, FIGHTERS, startJack, takeJacked, carAt, punch, toggleDance, enterInterior, exitInterior, DOORS, INTERIOR, AKHARA, say, bigText, firework, burst, camera, PERF, scene, PEDS, CROWD, makeFighter, makeChar, setLook, JAM, COWS, startRace, serverNow, applyMyLook, syncGang, GANG, makeVehicle, get CJ() { return chaseJeep; }, get PEHLWAN() { return PEHLWAN; }, get PV() { return playerVeh; }, get player() { return player; } }; PERF.n = -1e12; PERF.acc = -1e15;`;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 3 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(s => { localStorage.setItem('gl_world', s.world); localStorage.setItem('gl_token', JSON.stringify(s.token)); localStorage.setItem('gl_name', JSON.stringify('Bunty Sangwan')); localStorage.setItem('gl_lookset', '1'); localStorage.setItem('gl_avatar', JSON.stringify(s.avatar)); localStorage.setItem('gl_color', '0'); localStorage.setItem('gl_local', JSON.stringify({ locked: 1, loanerOK: 1, hunger: 80 })); localStorage.setItem('gl_lang', '"en"'); }, seed);
  await p.addInitScript({ path: path.join(KIT, 'clock.js') });
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: fs.readFileSync(path.join(KIT, 'fontcss.css'), 'utf8'), contentType: 'text/css' }));
  await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [], bol: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  let src = fs.readFileSync(path.join(GAME, 'public/js/game.js'), 'utf8'); src = src.replace('else { updateCamera(dt);', 'else { updateCamera(dt); if (window.__cam) window.__cam(camera, dt);');
  await p.route('**/js/game.js', r => r.fulfill({ body: src + extra, contentType: 'application/javascript' }));
  await p.goto('http://localhost:3120/');
  const step = (n, ms = 1000 / 30) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__step(ms); }, [n, ms]);
  for (let i = 0; i < 60 && !(await p.evaluate(() => !!window.__g)); i++) await step(10);
  await step(30); await p.click('#playBtn'); await step(20); await p.click('.splace >> text=Rajiv Chowk');
  for (let i = 0; i < 300 && !(await p.evaluate(() => window.__g.G.started)); i++) await step(2);
  await step(30); await p.evaluate(sc => { window.__SC = sc; }, SC); await p.addScriptTag({ path: path.join(KIT, 'lib.js') }); await p.addScriptTag({ path: path.join(DIR, 'scenes.js') });
  const scenes = [...new Set(PICK.map(x => x[0]))];
  for (const sn of scenes) { const i = sn - 1; const s = SC[i]; const frames = PICK.filter(x => x[0] === sn).map(x => x[1]); const last = Math.max(...frames);
    await p.evaluate(i => { window.__speed = 1; window.__R.setup(i); }, i); for (let k = 0; k < Math.round((s.pre || 0.6) * 30); k++) await p.evaluate(i => { window.__R.tick(i, -1); window.__step(1000 / 30); }, i);
    for (let f = 0; f <= last; f++) { await p.evaluate(([i, f]) => { window.__R.tick(i, f / 30); window.__step(1000 / 30); }, [i, f]);
      if (frames.includes(f)) { await p.evaluate(() => { const o = document.getElementById('reelOv'); if (o) o.style.display = 'none'; }); await p.screenshot({ path: `shots/${TAG}_s${sn}_f${f}.jpg`, type: 'jpeg', quality: 94 }); await p.evaluate(() => { const o = document.getElementById('reelOv'); if (o) o.style.display = ''; }); console.log('shot', TAG, sn, f); } }
  }
  console.log(errs.length ? 'errors: ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'ok'); await b.close();
})();
