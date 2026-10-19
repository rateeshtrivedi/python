// Takes the SEO page screenshots from the real game: node shoot.cjs [slug,...]
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs'); const path = require('path');
const FONT = fs.readFileSync('../kit/fontcss.css', 'utf8'); const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
const HOOK = '\nwindow.__t={hFrustum,hSph,HU,get HFRAME(){return HFRAME},HCHARS,visibleChain,baraatZ,G,DAY,WX,setWeather,mount,dismount,serverNow,AKHARA,FIGHTERS,burst,punch,scene,camera,PERF,get PEHLWAN(){return PEHLWAN},get player(){return player}}; PERF.n=-1e12; PERF.acc=-1e15;';
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: FONT, contentType: 'text/css' })); await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [], bol: [], eng: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  let src = fs.readFileSync('/home/user/python/gurugram-life/public/js/game.js', 'utf8').replace('else { updateCamera(dt);', 'else { updateCamera(dt); if (window.__cam) window.__cam(camera);');
  await p.route('**/js/game.js', r => r.fulfill({ body: src + HOOK, contentType: 'application/javascript' }));
  await p.addInitScript(() => { localStorage.setItem('gl_lang', '"en"'); });
  await p.goto('http://localhost:3122/'); await p.waitForTimeout(1500); await p.fill('#nameIn', 'Bunty Sangwan').catch(() => {}); await p.click('#playBtn'); await p.waitForTimeout(600); if (await p.$('#cNext:visible')) await p.click('#cNext'); await p.waitForTimeout(400);
  await p.click('.splace >> text=Rajiv Chowk'); await p.waitForFunction(() => window.__t && window.__t.G.started, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas:not(#mini){visibility:visible!important}' });
  await p.addScriptTag({ path: path.join(__dirname, 'views.js') });
  const slugs = await p.evaluate(() => Object.keys(window.__VIEWS(window.__t)));
  for (const slug of slugs) { if (ONLY && !ONLY.includes(slug)) continue; const n = await p.evaluate(s => window.__VIEWS(window.__t)[s].length, slug);
    for (let k = 0; k < n; k++) {
      const name = await p.evaluate(([s, k]) => { const t = window.__t, v = window.__VIEWS(t)[s][k]; t.G.story = null; t.G.tut = false; t.G.donCallNext = 1e12; t.DAY.fixed = true; t.DAY.t = v[1];
        if (!/flood|rain/.test(v[0])) { t.setWeather(0, true); t.WX.wl = 0; t.WX.ww = 0; } t.WX.nextBolt = 1e12; const o = v[2](); const V = t.camera.position.constructor, P = new V(...o.cam), L = new V(...o.look);
        window.__fx = o; window.__fxT = 0; window.__cam = c => { c.position.copy(P); c.lookAt(L); const f = window.__fx, G = t.G; if (f.holi && Math.random() < 0.5) t.burst(G.x + (Math.random() - 0.5) * 8, 1 + Math.random() * 2.5, G.z + (Math.random() - 0.5) * 8, [0xff2bd6, 0x39ff14, 0xffd400, 0x00b4ff][Math.floor(Math.random() * 4)], 22, { speed: 5 });
          if ((f.dangal || f.fight) && Math.random() < 0.06) { G.hp = 100; if (f.dangal) { t.PEHLWAN.x = G.x - 1.5; t.PEHLWAN.z = G.z; } t.punch(); }
          if (f.fight && !f.n) { f.n = t.FIGHTERS.find(q => !q.pehl && !q.jack && !q.badla && !q.don); if (f.n) { f.n.state = 'aggro'; f.n.hp = 1e5; } } if (f.n) { f.n.x = G.x; f.n.z = G.z - 1.4; G.r = Math.PI; } };
        return v[0]; }, [slug, k]);
      await p.waitForTimeout(name === 'dangal' || name === 'chaupal' ? 9000 : 4200); if (name === 'dangal') console.log('frames', await p.evaluate(() => window.__t.HFRAME), await p.evaluate(() => new Promise(r => setTimeout(() => r(window.__t.HFRAME), 1500)))); if (name === 'dangal') console.log('pehlwan', await p.evaluate(() => { const u = window.__t.PEHLWAN.mesh.userData; const t = window.__t, c = t.camera.position, m = t.PEHLWAN.mesh.position; return JSON.stringify({ human: !!u.human, vis: u.human && u.human.root.visible, hd: u.hd, hk: t.PERF.hk, d: Math.hypot(c.x - m.x, c.z - m.z), st: t.PEHLWAN.state, idx: t.HCHARS.indexOf(t.PEHLWAN.mesh), n: t.HCHARS.length, gone: u.gone, par: !!t.PEHLWAN.mesh.parent, vc: t.visibleChain(t.PEHLWAN.mesh), ndc: (() => { const v = t.PEHLWAN.mesh.position.clone(); v.y += 1.2; v.project(t.camera); return [v.x, v.y, v.z].map(q => +q.toFixed(2)); })(), far: t.camera.far, near: t.camera.near, frame: t.HFRAME, ready: t.HU.HUMANS.ready, sph: [t.hSph.center.x, t.hSph.center.z, t.hSph.radius].map(q => +q.toFixed(1)), inF: (() => { const c = t.hSph.center.clone(); const r = t.hSph.radius; t.hSph.center.copy(t.PEHLWAN.mesh.position).setY(1.2); const o = t.hFrustum.intersectsSphere(t.hSph); const M = t.camera.projectionMatrix.clone().multiply(t.camera.matrixWorldInverse); t.hFrustum.setFromProjectionMatrix(M); const o2 = t.hFrustum.intersectsSphere(t.hSph); t.hSph.center.copy(c); return [o, o2, t.camera.matrixWorldInverse.elements.slice(12, 15).map(q => +q.toFixed(1)), t.camera.position.toArray().map(q => +q.toFixed(1))]; })() }); }));
      await p.screenshot({ path: `raw/${slug}--${name}.png` }); process.stdout.write(slug + '/' + name + ' ');
    }
  }
  console.log('\n' + (errs.length ? [...new Set(errs)].slice(0, 5).join(' | ') : 'noerr')); await b.close(); })();
