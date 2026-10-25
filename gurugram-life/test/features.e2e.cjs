// Browser checks for the new systems: empty-pocket start, the 15-minute day, petrol pumps and fuel, arrests (no impounding),
// guns, the gang, Bada Kaam 1 played end to end, land and Bittu (locked until their Bada Kaam), and street people who stop and turn.
// Start the server on a fresh DATA_DIR first (npm start), then: npm run test:features   (PHONE=1 for a 390x844 touch phone)
// Needs Playwright with Chromium: PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chrome are optional overrides.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const PHONE = !!process.env.PHONE, DEV = PHONE ? 'phone' : 'desk', ROOT = process.env.OUT || path.join(os.tmpdir(), 'gl-features'), OUT = path.join(ROOT, DEV); fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'http://localhost:3000/';
const HOOK = `\nwindow.__t={G,L,D,BK,DAY,FIGHTERS,DROPS,get ROB(){return ROB},npcKO,takeHit,CROWD,PEDS,ZONES,PUMPS,THANA,PLOT_AT,BITTU,GANG,PEHLWAN:()=>PEHLWAN,mount,dismount,teleport,startChase,closeModal,openBade,syncGang,weaponHUD,setWeapon,shoot,makeFighter,fuelLeft,pumpLabel,pumpAct,appGuns,appGang,appZameen,plotDeal,updateZones,
  get nearZone(){return nearZone},get P(){return P},get player(){return player},get gunMesh(){return gunMesh}};`;
const results = []; let errs = [];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => localStorage.setItem('gl_intro', '1')); // the intro film has its own check
  await ctx.addInitScript(() => { localStorage.setItem('gl_ab', '"classic"'); }); // the classic start (start picker); the cold open has its own suite
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ').trim()));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|TUNNEL|ERR_/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [], bol: [], eng: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game.js'), 'utf8'); await p.route('**/js/game.js', r => r.fulfill({ body: src + HOOK, contentType: 'application/javascript' }));
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms);
  async function step(name, fn) { errs = []; let ok = true, info = '';
    try { const r = await fn(); if (r && typeof r === 'object') { ok = r.ok !== false; info = r.info || ''; } else if (r === false) ok = false; } catch (e) { ok = false; info = 'EXC ' + e.message.split('\n')[0]; }
    await p.screenshot({ path: `${OUT}/${String(results.length).padStart(2, '0')}-${name.replace(/\W+/g, '_').slice(0, 40)}.jpg`, type: 'jpeg', quality: 60 }).catch(() => {}); if (errs.length) ok = false;
    results.push({ name, ok, info, errs: [...new Set(errs)].slice(0, 5) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '') + (errs.length ? '\n   errors: ' + [...new Set(errs)].slice(0, 3).join(' | ') : '')); }
  const closeCards = () => E(() => { document.getElementById('raceres').hidden = true; if (!document.getElementById('modal').hidden) window.__t.closeModal(); });
  const act = () => E(() => { const t = window.__t; t.updateZones(); const z = t.nearZone; if (z) z.act(); return z ? z.label() : null; });
  const at = (x, z) => E(([x, z]) => { const t = window.__t; if (t.G.veh) t.dismount(); t.teleport(x, z, 0); t.updateZones(); }, [x, z]);

  await p.goto(URL); await W(1500); await p.fill('#nameIn', 'Feature Tester'); await p.click('#playBtn'); await W(600); if (await p.$('#cNext:visible')) await p.click('#cNext'); await W(500);
  await p.click('.splace >> nth=0'); await p.waitForFunction(() => window.__t && window.__t.G.started, null, { timeout: 40000 }); await W(2500);
  await E(() => { const t = window.__t; t.G.donCallNext = 1e12; window.__t.G.calledBK = true; t.G.weather = { lvl: 0, since: 0, until: 1e12 }; }); await closeCards();

  await step('khaali jeb: a new player starts with ₹0 on Bada Kaam 1', async () => { const r = await E(() => ({ money: window.__t.P.money, bk: window.__t.P.bk, chip: document.getElementById('mchip').textContent, tasks: window.__t.P.missions.active.length }));
    return { ok: r.money === 0 && r.bk === 0 && /Bada Kaam 1/.test(r.chip) && r.tasks === 3, info: JSON.stringify(r) }; });
  await step('the sun follows a 15-minute game day', async () => { const r = await E(() => ({ t: window.__t.DAY.t, want: window.__t.D.dayFrac(Date.now() + (window.__t.G.timeOffset || 0) * 1000), clock: document.getElementById('mchip').textContent.match(/\d+:\d\d [ap]m · \d+m/)?.[0] }));
    return { ok: Math.abs(r.t - r.want) < 0.01 && !!r.clock, info: JSON.stringify(r) }; });
  await step('street people stop, wait and turn back (no endless laps)', async () => { const s0 = await E(() => window.__t.CROWD.filter(p => !p.still).map(p => p.dir)); await W(9000);
    const r = await E(s0 => { const w = window.__t.CROWD.filter(p => !p.still); return { waiting: w.filter(p => p.wait > 0).length, turned: w.filter((p, i) => p.dir !== s0[i]).length, peds: window.__t.PEDS.filter(p => p.wait > 0).length }; }, s0);
    return { ok: r.waiting > 0 && r.turned > 0, info: JSON.stringify(r) }; });
  await step('the pehlwan looks around instead of spinning', async () => { const r0 = await E(() => window.__t.PEHLWAN() && window.__t.PEHLWAN().r); await W(6000); const r1 = await E(() => window.__t.PEHLWAN() && window.__t.PEHLWAN().r);
    return { ok: r0 != null && Math.abs(r1 - r0) < Math.PI * 1.5, info: 'turned ' + (r1 - r0).toFixed(2) + ' rad in 6 s' }; });
  await step('four petrol pumps stand in the city', async () => { const r = await E(() => window.__t.PUMPS.map(q => q.name + ' @' + Math.round(q.x) + ',' + Math.round(q.z)));
    const pm = await E(() => window.__t.PUMPS[0]); await E(pm => { const t = window.__t; t.teleport(pm.x + pm.fx * 18 + pm.fz * 6, pm.z + pm.fz * 18 - pm.fx * 6, 0); t.G.yaw = Math.atan2(-pm.fx * 18 - pm.fz * 6, -pm.fz * 18 + pm.fx * 6) + Math.PI; }, pm); await W(1500);
    return { ok: r.length === 4, info: r.join(' · ') }; });
  await step('petrol burns while driving; a pump offers to fill up', async () => { const pm = await E(() => window.__t.PUMPS[0]);
    const r = await E(async pm => { const t = window.__t, G = t.G; t.teleport(pm.x + pm.fx * 30, pm.z + pm.fz * 30, Math.atan2(pm.fx, pm.fz)); t.mount('chhotu'); const f0 = t.fuelLeft(); G.vs = 20; await new Promise(r => setTimeout(r, 2500)); const f1 = t.fuelLeft();
      G.x = pm.x + pm.fx * 1.5; G.z = pm.z + pm.fz * 1.5; G.vs = 0; t.updateZones(); return { f0: +f0.toFixed(2), f1: +f1.toFixed(2), label: t.nearZone && t.nearZone.label() }; }, pm);
    return { ok: r.f1 < r.f0 && /Petrol bharwao|Tanki full/.test(r.label || ''), info: JSON.stringify(r) }; });
  await step('an empty tank crawls and offers the petrol-wala bhaiya', async () => { const r = await E(async () => { const t = window.__t, G = t.G; t.L.fuel._tmp = 0.01; G.vs = 20; for (let k = 0; k < 24 && (k < 6 || Math.abs(G.vs) >= 3); k++) await new Promise(r => setTimeout(r, 500)); /* slows to a push, however slow the renderer */ return { vs: +Math.abs(G.vs).toFixed(1), card: document.querySelector('#raceres h2')?.textContent }; });
    await closeCards(); await E(() => window.__t.dismount()); return { ok: r.vs < 3 && /Petrol khatam/.test(r.card || ''), info: JSON.stringify(r) }; });
  await step('police catch you: arrest at the thana and a fine, the car stays yours', async () => {
    await E(() => { const t = window.__t, G = t.G; t.teleport(30, 40, 0); t.mount('chhotu'); G.loaner = true; t.startChase({ near: true, secs: 30 }); G.chase.wait = 0; G.chase.x = G.x + 1; G.chase.z = G.z; }); await W(9000);
    const r = await E(() => { const t = window.__t; return { at: [Math.round(t.G.x), Math.round(t.G.z)], thana: [Math.round(t.THANA.x), Math.round(t.THANA.z)], card: document.querySelector('#raceres h2')?.textContent, impound: !!(t.G.impound > Date.now() / 1000) }; });
    await closeCards(); return { ok: Math.hypot(r.at[0] - r.thana[0], r.at[1] - r.thana[1]) < 6 && /Hawalaat|Jurmana/.test(r.card || '') && !r.impound, info: JSON.stringify(r) }; });
  await step('police keep chasing when you leave the car', async () => { const r = await E(async () => { const t = window.__t, G = t.G; t.teleport(30, 40, 0); t.mount('chhotu'); t.startChase({ near: true, secs: 30 }); await new Promise(r => setTimeout(r, 400)); t.dismount(); await new Promise(r => setTimeout(r, 1200)); const on = !!G.chase; G.chase && (G.chase.until = 0); return { stillChasing: on }; });
    await W(800); await closeCards(); return { ok: r.stillChasing, info: JSON.stringify(r) }; });
  await step('Bittu and the land plots stand in the city, locked until their Bada Kaam', async () => { const r = await E(() => ({ bittu: window.__t.BITTU.ok, plots: Object.keys(window.__t.PLOT_AT).length }));
    await E(() => window.__t.appGuns()); await W(400); const g = await E(() => document.getElementById('mBody').textContent); await closeCards();
    await E(() => window.__t.appZameen()); await W(600); const z = await E(() => document.getElementById('mBody').textContent); await closeCards();
    const B = await E(() => window.__t.BITTU); await at(B.x, B.z + 6); await W(1200);
    return { ok: r.bittu && r.plots >= 5 && /Udhaar Vasooli/.test(g) && /Pump pe Kabza/.test(z), info: JSON.stringify(r) }; });
  await step('guns: draw a katta, shoot a chhora down, people run, police come', async () => {
    const r = await E(async () => { const t = window.__t, G = t.G; let P = t.P; t.teleport(10, 40, 0); P.guns = ['katta']; P.ammo = { katta: 8 }; t.weaponHUD(); t.setWeapon(1); const keep = setInterval(() => { const Q = t.P; if (!Q.guns.includes('katta')) { Q.guns = ['katta']; Q.ammo = { katta: P.ammo.katta }; P = Q; G.weapon = 1; t.weaponHUD(); } }, 50); /* a server profile push (a new game day) would take the test gun away */
      const n = t.makeFighter('Test Chhora', G.x, G.z + 8, 60, 3, 0x555555); n.state = 'wander'; t.FIGHTERS.push(n); G.r = G.yaw = 0; let shots = 0;
      for (let k = 0; k < 8 && n.state !== 'ko'; k++) { G.gunCD = 0; G.r = G.yaw = Math.atan2(n.x - G.x, n.z - G.z); t.shoot(); shots++; await new Promise(r => setTimeout(r, 350)); }
      const panic = t.CROWD.concat(t.PEDS).filter(p => p.panic > performance.now() / 1000).length; await new Promise(r => setTimeout(r, 3200));
      clearInterval(keep); return { ko: n.state === 'ko', shots, ammo: t.P.ammo.katta, gun: !!t.gunMesh, hud: document.getElementById('weap').textContent, panic, police: !!G.chase }; });
    await E(() => { const t = window.__t; if (t.G.chase) t.G.chase.until = 0; t.setWeapon(0); }); await W(600); await closeCards();
    return { ok: r.ko && r.gun && r.ammo < 8 && /Desi Katta/.test(r.hud) && r.police, info: JSON.stringify(r) }; });
  await step('an enemy with a katta keeps his distance and fires', async () => {
    const r = await E(async () => { const t = window.__t, G = t.G; t.teleport(10, 40, 0); G.hp = 100; const n = t.makeFighter('Shooter', G.x, G.z + 14, 60, 4, 0x222222); n.gun = 'katta'; n.state = 'aggro'; t.FIGHTERS.push(n);
      for (let k = 0; k < 40 && G.hp >= 100; k++) await new Promise(r => setTimeout(r, 500)); /* about half his shots land */ const d = Math.hypot(n.x - G.x, n.z - G.z); n.state = 'ko'; n.t = 0.01; return { hp: G.hp, d: +d.toFixed(1) }; });
    return { ok: r.hp < 100 && r.d > 2.4, info: JSON.stringify(r) }; });
  await step('the gang follows you and joins the fight', async () => {
    const r = await E(async () => { const t = window.__t, G = t.G, P = t.P; t.teleport(10, 40, 0); G.hp = 100; const crew = [{ name: 'Bunty', shirt: 2, g: 'm' }, { name: 'Sonu', shirt: 5, g: 'm' }]; P.gang = crew; t.syncGang(); const keep = setInterval(() => { if (t.P.gang.length < 2) { t.P.gang = crew; t.syncGang(); } }, 50); /* the gang lives on the server: hold the test one */
      await new Promise(r => setTimeout(r, 600)); G.x += 12; for (let k = 0; k < 16 && (k < 7 || t.GANG.some(m => Math.hypot(m.x - G.x, m.z - G.z) >= 7)); k++) await new Promise(r => setTimeout(r, 500)); const follow = t.GANG.map(m => +Math.hypot(m.x - G.x, m.z - G.z).toFixed(1));
      const n = t.makeFighter('Gunda', G.x + 4, G.z + 4, 80, 2, 0x444444); n.state = 'aggro'; t.FIGHTERS.push(n); const h0 = n.hp; await new Promise(r => setTimeout(r, 6000));
      clearInterval(keep); return { follow, enemyHp: [h0, n.hp], state: n.state, visible: t.GANG.every(m => m.mesh.visible) }; });
    return { ok: r.follow.every(d => d < 7) && r.enemyHp[1] < r.enemyHp[0] && r.visible, info: JSON.stringify(r) }; });
  await E(() => { const t = window.__t; t.P.gang = []; t.syncGang(); t.P.guns = []; t.weaponHUD(); for (const n of t.FIGHTERS) if (n.name === 'Gunda' || n.name === 'Test Chhora') { n.state = 'ko'; } });
  await step('a knocked-down chhora drops his batua; walking over it takes the cash', async () => {
    const r = await E(async () => { const t = window.__t, G = t.G; t.teleport(30, 40, 0); for (const d of t.DROPS) if (d.m.parent) d.m.parent.remove(d.m); t.DROPS.length = 0; /* earlier fights' batue */ await new Promise(r => setTimeout(r, 2600)); const m0 = t.P.money;
      const n = t.makeFighter('Chhora Batua', G.x, G.z + 3, 60, 0, 0x555555); n.state = 'aggro'; t.FIGHTERS.push(n); n.hp = 0; t.npcKO(n);
      for (let k = 0; k < 20 && !t.DROPS.length; k++) await new Promise(r => setTimeout(r, 200)); const d = t.DROPS[0]; if (!d) return { err: 'no batua' };
      const seen = { amt: d.amt, visible: d.m.visible && !!d.m.parent }; G.x = d.x; G.z = d.z;
      for (let k = 0; k < 30 && (t.DROPS.includes(d) || t.P.money === m0); k++) await new Promise(r => setTimeout(r, 200));
      n.t = 0.01; return { ...seen, gone: !t.DROPS.includes(d), got: t.P.money - m0 }; });
    return { ok: r.amt > 0 && r.visible && r.gone && r.got >= r.amt, info: JSON.stringify(r) }; }); // the knockdown can also finish the day's 'beat two chhore' kaam, which pays on top
  await step('knocked down by a chhora: he grabs your batua before the ambulance comes', async () => {
    const r = await E(async () => { const t = window.__t, G = t.G; t.teleport(30, 60, 0); await new Promise(r => setTimeout(r, 2600)); G.hp = 100; const m0 = t.P.money;
      const n = t.makeFighter('Chhora Chor', G.x, G.z + 2, 60, 0, 0x333333); n.state = 'aggro'; t.FIGHTERS.push(n); t.takeHit(200, n.name, n);
      const rob = !!t.ROB; let picked = false; for (let k = 0; k < 40 && !picked; k++) { await new Promise(r => setTimeout(r, 150)); if (t.ROB && !t.ROB.m.parent) picked = true; }
      for (let k = 0; k < 60 && G.hp <= 0; k++) await new Promise(r => setTimeout(r, 200)); await new Promise(r => setTimeout(r, 1500)); n.state = 'ko'; n.t = 0.01;
      return { rob, picked, lost: m0 - t.P.money, want: t.D.robAmount(m0), hp: G.hp, toast: [...document.querySelectorAll('#toasts > *')].map(e => e.textContent).join(' | ') }; });
    return { ok: r.rob && r.picked && r.lost >= r.want && r.hp > 0, info: JSON.stringify(r) }; }); // lost = his share + the hospital bill
  // Bada Kaam 1, played: the pump job, three cars, the runner, back to Chaudhary Saab
  await step('Bada Kaam 1: the menu lists 7 missions and starts the first', async () => { await E(() => window.__t.openBade()); await W(500); const rows = await E(() => document.querySelectorAll('#mBody .item').length);
    await E(() => [...document.querySelectorAll('#mBody .item button')].find(b => /Shuru/.test(b.textContent)).click()); await W(1500); const card = await E(() => document.querySelector('#raceres h2')?.textContent);
    await E(() => [...document.querySelectorAll('#raceres button')].find(b => /Chalo/.test(b.textContent)).click()); await W(800); const r = await E(() => ({ on: window.__t.BK.on, step: window.__t.BK.step, wp: window.__t.G.wp && window.__t.G.wp.name }));
    return { ok: rows === 7 && /Pehli Kamai/.test(card || '') && r.on && r.step === 0 && /Chaudhary/.test(r.wp || ''), info: rows + ' rows · ' + card + ' · ' + JSON.stringify(r) }; });
  const t0 = Date.now();
  await step('Bada Kaam 1: meet Chaudhary Saab, fill three cars', async () => { const pm = await E(() => window.__t.PUMPS.find(q => q.name.startsWith('Chaudhary'))); await at(pm.x + pm.fx * 1.5, pm.z + pm.fz * 1.5); await W(1500);
    let filled = 0; for (let k = 0; k < 120 && filled < 3; k++) { await W(700); const s = await E(pm => { const t = window.__t; t.teleport(pm.x + pm.fx * 1.5, pm.z + pm.fz * 1.5, 0); t.updateZones(); const lb = t.pumpLabel(t.PUMPS.find(q => q.name === pm.name)); if (/Petrol bharo/.test(lb || '')) t.pumpAct(t.PUMPS.find(q => q.name === pm.name)); return { step: t.BK.step, cars: t.BK.d.cars || 0 }; }, pm); filled = s.cars; if (s.step >= 2) break; }
    const r = await E(() => ({ step: window.__t.BK.step, cars: window.__t.BK.d.cars })); return { ok: r.cars >= 3, info: JSON.stringify(r) }; });
  await step('Bada Kaam 1: the fourth driver runs; catch him and knock him down', async () => { const pm = await E(() => window.__t.PUMPS.find(q => q.name.startsWith('Chaudhary')));
    for (let k = 0; k < 40; k++) { await W(700); const s = await E(pm => { const t = window.__t; const P0 = t.PUMPS.find(q => q.name === pm.name); t.teleport(pm.x + pm.fx * 1.5, pm.z + pm.fz * 1.5, 0); if (/Petrol bharo/.test(t.pumpLabel(P0) || '')) t.pumpAct(P0); return t.BK.step; }, pm); if (s >= 3) break; }
    const r = await E(async () => { const t = window.__t, G = t.G, n = t.BK.d.foe; if (!n) return { err: 'no runner' }; for (let k = 0; k < 30 && n.state !== 'ko'; k++) { G.x = n.x - 1.2; G.z = n.z; G.r = G.yaw = Math.PI / 2; n.hp = Math.min(n.hp, 8); G.punchCD = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' })); await new Promise(r => setTimeout(r, 450)); } return { state: n.state, step: t.BK.step }; });
    return { ok: r.state === 'ko' && r.step >= 4, info: JSON.stringify(r) }; }); // standing at the pump, the walk back is already done
  await step('Bada Kaam 1: back to Chaudhary Saab: paid and moved into the Sharma PG', async () => { const wait = 56000 - (Date.now() - t0); if (wait > 0) await W(wait); // the server wants a real minute's work
    const pm = await E(() => window.__t.PUMPS.find(q => q.name.startsWith('Chaudhary'))); await at(pm.x + pm.fx * 1.5, pm.z + pm.fz * 1.5); await W(9000);
    const r = await E(() => ({ bk: window.__t.P.bk, home: window.__t.P.home, money: window.__t.P.money, on: window.__t.BK.on, card: document.querySelector('#raceres h2')?.textContent }));
    return { ok: r.bk === 1 && r.home === 'pg' && r.money >= 1500 && !r.on, info: JSON.stringify(r) }; });

  fs.writeFileSync(path.join(ROOT, `features-${DEV}.json`), JSON.stringify(results, null, 1));
  const f = results.filter(r => !r.ok); console.log(`\n${DEV}: ${results.length - f.length}/${results.length} passed` + (f.length ? '; failed: ' + f.map(r => r.name).join(' · ') : '')); process.exitCode = f.length ? 1 : 0;
  await b.close();
})();
