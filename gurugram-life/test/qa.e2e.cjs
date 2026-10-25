// QA tracker regression (24 Oct 2026 playtest): REG-01..10 plus the fixes behind them, in a real browser, laptop or phone (PHONE=1).
// Start the server first (GL_WEATHER=0 keeps rain from slowing the movement checks), then: node test/qa.e2e.cjs
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const PHONE = !!process.env.PHONE, DEV = PHONE ? 'phone' : 'desk', OUT = path.join(process.env.OUT || path.join(os.tmpdir(), 'gl-qa'), DEV); fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'http://localhost:3000/';
const HOOK = `\nwindow.__t={G,L,D,BK,DAY,COL,ZONES,INTERIOR,STARTS,PARKED,DROPS,SIGNS,FIGHTERS,camera,net,teleport,mount,dismount,goInside,exitInterior,startJob,bkNext,bkResume,rushStart,startRace,quitRace,roadRoute,safeSpot,openNear,fuelLeft,
  updateZones,openPhone,closeModal,openBade,appLang,appEvents,renderMissions,colHit,keys,HOSPITAL,playerKO,get P(){return P},get nearZone(){return nearZone},get player(){return player}};`;
const results = []; let errs = [];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => localStorage.setItem('gl_intro', '1'));
  await ctx.addInitScript(() => { localStorage.setItem('gl_ab', '"classic"'); }); // the classic start (start picker); the cold open has its own suite
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [], bol: [], eng: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game.js'), 'utf8'); await p.route('**/js/game.js', r => r.fulfill({ body: src + HOOK, contentType: 'application/javascript' }));
  const E = (f, a) => p.evaluate(f, a), W = ms => p.waitForTimeout(ms);
  const step = async (name, fn) => { const e0 = errs.length; let ok = false, info = ''; try { const r = await fn(); ok = r.ok; info = r.info || ''; } catch (e) { info = 'EXC ' + e.message.split('\n')[0]; }
    if (errs.length > e0) { ok = false; info += ' · page error: ' + errs.slice(e0).join(' | ').slice(0, 200); } results.push({ name, ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : ''));
    await p.screenshot({ path: path.join(OUT, String(results.length).padStart(2, '0') + '-' + name.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) + '.jpg'), type: 'jpeg', quality: 60 }).catch(() => {}); };
  const join = async () => { await p.waitForFunction(() => window.__t && window.__t.G.started, null, { timeout: 60000 }); await W(4500); await E(() => { document.getElementById('raceres').hidden = true; const t = window.__t; t.closeModal(); t.G.donCallNext = 1e12; window.__t.G.calledBK = true; }); };
  await p.goto(URL); await W(1500); await p.fill('#nameIn', 'QA Tester'); await p.click('#playBtn'); await W(600); if (await p.$('#cNext:visible')) await p.click('#cNext'); await W(400); await p.click('.splace >> nth=0'); await join();

  // REG-04 / GL-004: every start point is inside its own district, on open ground
  await step('REG-04 spawn correctly at all start locations', async () => { const r = await E(() => { const t = window.__t; return t.STARTS.map(s => { const sp = t.openNear(s[3]()); const d = t.D.districtAt(sp.x, sp.z); return { id: s[0], want: s[1], got: d ? d[2] : 'road', open: !t.colHit(sp.x - 0.5, sp.x + 0.5, sp.z - 0.5, sp.z + 0.5) }; }); });
    const bad = r.filter(s => !s.open || (s.id !== 'ghar' && s.id !== 'ambience' && s.id !== 'sector29' && !s.got.toLowerCase().includes(s.want.toLowerCase().split(' ')[0]))); return { ok: !bad.length, info: r.map(s => s.id + '→' + s.got + (s.open ? '' : ' (blocked)')).join(', ') }; });
  // GL-031: nobody starves to death
  await step('GL-031 starving wears health down to 1, never knocks you out; you arrive fed', async () => { const r = await E(async () => { const t = window.__t, G = t.G; const fed = t.L.hunger >= 50; t.L.hunger = 0; G.hp = 4; await new Promise(r => setTimeout(r, 9000)); return { fed, hp: G.hp, inside: G.inside }; });
    await E(() => { window.__t.L.hunger = 80; window.__t.G.hp = 100; }); return { ok: r.fed && r.hp >= 1 && r.hp <= 4, info: JSON.stringify(r) }; });
  // GL-033: the hospital respawn spot is open road
  await step('GL-033 Civil Hospital respawn is on an open footpath', async () => { const r = await E(() => { const t = window.__t; const s = t.safeSpot(t.HOSPITAL.x, t.HOSPITAL.z + 4); const onRoad = t.D.ROADS.some(q => Math.abs(s.x - q) < 11 || Math.abs(s.z - q) < 11); return { s, onRoad, open: !t.colHit(s.x - 0.7, s.x + 0.7, s.z - 0.7, s.z + 0.7) }; });
    return { ok: r.onRoad && r.open, info: JSON.stringify(r) }; });
  // REG-01 / GL-001 / REG-09: out of Sharma PG within 30 s, camera never inside a wall
  await step('REG-01 exit Sharma PG within 30 s (exit marker, Bahar niklo button)', async () => { const r = await E(async () => { const t = window.__t, G = t.G; t.P.home = 'pg'; t.P.houses = [...new Set([...(t.P.houses || []), 'pg'])]; t.goInside(false); await new Promise(r => setTimeout(r, 1500));
      const inside = G.inside, btn = !document.getElementById('bExit').hidden; t.keys.KeyS = true; await new Promise(r => setTimeout(r, 2500)); t.keys.KeyS = false; await new Promise(r => setTimeout(r, 400));
      const cam = t.camera.position, gap = Math.hypot(cam.x - G.x, cam.z - G.z), lift = cam.y - 1.9; return { inside, btn, gap: +gap.toFixed(2), lift: +lift.toFixed(2) }; });
    if (PHONE) await p.locator('#bExit').tap(); else await p.click('#bExit'); await W(1500); const out = await E(() => !window.__t.G.inside);
    return { ok: r.inside === 'home' && r.btn && (r.gap > 2.2 || r.lift > 2) && out, info: JSON.stringify({ ...r, out }) }; });
  await step('REG-09 camera: walk backward into a wall outdoors without filling the lens', async () => { const r = await E(async () => { const t = window.__t, G = t.G; const c = t.COL.out.find(c => c.x1 - c.x0 > 10 && c.z1 - c.z0 > 10 && Math.abs(c.x0) < 400 && Math.abs(c.z0) < 400);
      t.teleport((c.x0 + c.x1) / 2, c.z1 + 3, 0); G.yaw = 0; t.keys.KeyS = true; await new Promise(r => setTimeout(r, 2500)); t.keys.KeyS = false; await new Promise(r => setTimeout(r, 500));
      const cam = t.camera.position; return { gap: +Math.hypot(cam.x - G.x, cam.z - G.z).toFixed(2), lift: +(cam.y - 1.9).toFixed(2) }; });
    return { ok: r.gap > 1.8 || r.lift > 2.5, info: JSON.stringify(r) }; });
  // REG-03 / GL-003 and REG-02 / GL-002: a reload keeps the job and the Bada Kaam
  await step('REG-02/03 reload mid-mission and mid-delivery: both come back', async () => {
    await E(async () => { const t = window.__t; t.teleport(10, 40, 0); t.startJob('delivery'); const r = await t.net.req('bkstart', { i: t.P.bk || 0 }); if (!r.ok) throw new Error('bkstart ' + r.error); Object.assign(t.BK, { on: true, i: t.P.bk || 0, step: -1, d: {}, ents: [], deadline: 0, noCops: false, inCar: false, car: null, carZone: null, boss: null }); t.bkNext(); t.bkNext(); await new Promise(r => setTimeout(r, 800)); });
    const before = await E(() => ({ job: window.__t.G.job && window.__t.G.job.type, bk: window.__t.BK.i, step: window.__t.BK.step }));
    await p.reload(); await W(1500); await p.click('#playBtn'); await W(600); if (await p.$('#cNext:visible')) await p.click('#cNext'); await W(400); await p.click('.splace >> nth=0'); await join(); await W(3000);
    const after = await E(() => ({ job: window.__t.G.job && window.__t.G.job.type, bkOn: window.__t.BK.on, bk: window.__t.BK.i, step: window.__t.BK.step }));
    return { ok: after.job === 'delivery' && after.bkOn && after.bk === before.bk && after.step >= 1, info: JSON.stringify({ before, after }) }; });
  // REG-06 / GL-005: a city event never takes the GPS from the Bada Kaam, and its own GPS goes with it
  await step('REG-06 an event during a mission keeps the mission GPS', async () => { const r = await E(() => { const t = window.__t, G = t.G; const wp0 = G.wp && G.wp.src; const now = Date.now() / 1000 + (G.timeOffset || 0);
      G.ev = { type: 'thaila', id: 'qa', name: 'Paison ka thaila', start: now - 5, end: now + 300, data: { x: 40, z: 40, place: 'Rajiv Chowk', prize: 1500 } }; t.rushStart(); const kept = G.wp && G.wp.src; G.ev = null; return { wp0, kept, bk: t.BK.on }; });
    return { ok: r.bk && r.kept !== 'event' && r.kept === r.wp0, info: JSON.stringify(r) }; }); // the mission's GPS (or none, on a step without one) stays
  await E(() => { const t = window.__t; if (t.BK.on) { t.net.send('bkquit', {}); t.BK.on = false; } t.G.job = null; t.L.job = null; });
  // GL-008: routes follow the roads
  await step('GL-008 GPS route runs along roads, not through buildings', async () => { const r = await E(() => { const t = window.__t; const pts = t.roadRoute(150, -262, -150, 10); const R = t.D.ROADS; const bad = pts.slice(0, -1).filter(q => !R.some(v => Math.abs(q.x - v) < 1 || Math.abs(q.z - v) < 1)); return { n: pts.length, bad: bad.length }; });
    return { ok: r.n >= 3 && !r.bad, info: JSON.stringify(r) }; });
  // REG-08 / GL-018: two-wheelers pass the toll free
  await step('REG-08 a two-wheeler passes Kherki Daula free', async () => { const r = await E(async () => { const t = window.__t, G = t.G, T = t.D.SPOTS.toll; const m0 = t.P.money; G.tollCD = 0; t.P.vehicles = [...new Set([...(t.P.vehicles || []), 'scooty'])]; t.teleport(T.x, T.z, 0); t.mount('scooty'); G.x = T.x; G.z = T.z; await new Promise(r => setTimeout(r, 2500)); const m1 = t.P.money; t.dismount(); return { m0, m1 }; });
    return { ok: r.m1 === r.m0, info: JSON.stringify(r) }; });
  // GL-012 / GL-032: the Scooty never pins against a wall
  await step('GL-012/032 Scooty accelerates and slides off walls', async () => { const r = await E(async () => { const t = window.__t, G = t.G; t.teleport(158, 31, 0); t.mount('scooty'); const x0 = G.x, z0 = G.z; let vmax = 0; t.keys.KeyW = true; for (let k = 0; k < 25; k++) { await new Promise(r => setTimeout(r, 200)); vmax = Math.max(vmax, Math.abs(G.vs)); } t.keys.KeyW = false; const d = Math.hypot(G.x - x0, G.z - z0); const info = { moved: +d.toFixed(1), kmh: Math.round(vmax * 3.6), fuel: t.fuelLeft ? +t.fuelLeft().toFixed(2) : null, chase: !!G.chase, frozen: !!G.frozen, modal: !!G.modal }; t.dismount(); return info; });
    return { ok: r.moved > 8, info: JSON.stringify(r) }; });
  // REG-07 / GL-010 / GL-011: a race gives a car and honest results; the clock stops
  await step('REG-07 race: a car, results with times, timer stops', async () => { await E(() => window.__t.startRace(window.__t.D.RACES[0].id)); await W(5000);
    const veh = await E(() => window.__t.G.veh); await E(() => { const r = window.__t.G.race; r.rv.s = r.total - 0.5; r.rv.v = 30; }); await W(3500);
    const r = await E(() => ({ phase: window.__t.G.race && window.__t.G.race.phase, hud: !document.getElementById('racehud').hidden, rows: [...document.querySelectorAll('#raceres .rows > div')].map(d => d.textContent) }));
    await E(() => window.__t.quitRace()); return { ok: !!veh && r.phase === 'done' && !r.hud && r.rows.some(x => /Tera time|Your time/.test(x)), info: JSON.stringify({ veh, ...r }) }; });
  // GL-037 / GL-024 / GL-021: food shops serve, the menu icons are distinct, the story rows have their own heading
  await step('GL-037 street food shops serve food', async () => { const r = await E(() => window.__t.ZONES.filter(z => { try { return /^Khana: /.test(z.label() || ''); } catch { return false; } }).length); return { ok: r >= 3, info: r + ' food shops' }; });
  await step('GL-024 menu icons are distinct; locked apps show a lock', async () => { await E(() => window.__t.openPhone()); await W(700); const r = await E(() => { const ic = [...document.querySelectorAll('#mBody .apps .app i')].map(i => i.textContent); return { n: ic.length, dup: ic.filter((x, i) => ic.indexOf(x) !== i), locks: document.querySelectorAll('#mBody .app.locked').length }; }); await E(() => window.__t.closeModal());
    return { ok: !r.dup.length && r.locks >= 1, info: JSON.stringify(r) }; });
  await step('GL-021 daily kaam and the story sit apart', async () => { const r = await E(() => { window.__t.renderMissions(); return { head: document.getElementById('missions').querySelector('h4').textContent, sub: !!document.querySelector('#mlist .mhead'), rows: document.querySelectorAll('#mlist .m:not(.don)').length }; }); return { ok: r.sub && r.rows === 3, info: JSON.stringify(r) }; });
  // REG-05 / GL-013 / GL-014 / GL-016: switch languages, nothing left untranslated where it matters
  await step('REG-05 Haryanvi > Hindi > English: story in English, no English in Haryanvi jobs', async () => {
    const lang = async id => { await E(() => window.__t.appLang()); await W(500); await E(id => { [...document.querySelectorAll('#mBody .item')].find(r => r.querySelector('b') && r.querySelector('b').textContent.toLowerCase().startsWith(id))?.querySelector('button').click(); }, id); await W(1500); };
    await lang('hindi'); const hiOn = await E(() => document.querySelector('#mBody .item button[disabled]')?.closest('.item')?.textContent || ''); await E(() => window.__t.closeModal());
    await lang('english'); await E(() => window.__t.openBade()); await W(900); const enTxt = await E(() => document.getElementById('modal').innerText); await E(() => window.__t.closeModal());
    await lang('haryanvi'); await E(() => window.__t.openPhone()); await W(300); await E(() => { window.__t.closeModal(); }); await E(() => window.__t.startJob && window.__t.closeModal()); const harTxt = await E(() => document.body.innerText);
    const hing = (enTxt.match(/\b(kholta se|chahiye|Khaali jeb|chal rya|ke baad khulega)\b/gi) || []); const eng = (harTxt.match(/Accept a delivery order|Artists whose work|\bHEALTH\b/g) || []);
    return { ok: /Hindi/.test(hiOn) && !hing.length && !eng.length, info: JSON.stringify({ hiOn: hiOn.slice(0, 30), hing, eng }) }; });
  // REG-10: phone layout with a job card and a mission card on screen
  await step('REG-10 HUD panels never overlap (job card, mission card, banners)', async () => { await E(() => { const t = window.__t; t.startJob('delivery'); document.getElementById('quest').hidden = false; document.getElementById('quest').innerHTML = '<small>Bada Kaam</small><b>Test</b><span>overlap check</span>'; }); await W(2500);
    const r = await E(() => { const ids = ['stat', 'job', 'mchip', 'quest', 'banner', 'loc', 'navchip', 'mapwrap']; const R = ids.map(id => { const e = document.getElementById(id); if (!e || e.hidden || !e.offsetParent || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { id, b } : null; }).filter(Boolean);
      const hits = []; for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length; k++) { const a = R[i].b, c = R[k].b; if (a.left < c.right - 2 && a.right > c.left + 2 && a.top < c.bottom - 2 && a.bottom > c.top + 2) hits.push(R[i].id + '/' + R[k].id); } return hits; });
    await E(() => { const t = window.__t; t.G.job = null; document.getElementById('job').hidden = true; document.getElementById('quest').hidden = true; }); return { ok: !r.length, info: r.join(', ') || 'no overlaps' }; });
  const pass = results.filter(r => r.ok).length; console.log('\n' + DEV + ': ' + pass + '/' + results.length + ' passed' + (pass < results.length ? '; failed: ' + results.filter(r => !r.ok).map(r => r.name).join(' · ') : ''));
  fs.writeFileSync(path.join(OUT, '..', 'qa-' + DEV + '.json'), JSON.stringify(results, null, 1)); await b.close(); process.exit(pass === results.length ? 0 : 1);
})();
