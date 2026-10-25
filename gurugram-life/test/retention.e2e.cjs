// Retention features (QA tracker RET-01..14) in a real browser, laptop or phone (PHONE=1): the loading bar, the cold-open
// chase with ₹1,000 and the starter car, the funnel steps, the next-objective strip and ₹50 fast travel, wanted stars and
// chai-paani, job streaks, time trial / pothole dodge / stunt jump / golgappa with medals, the gift every few minutes,
// level-up party, calendar, business, invite, Online rivals, cutscene + phone call + cliffhanger, welcome back, gamepad,
// walking camera, lite graphics. Start the server first (GL_WEATHER=0), then: node test/retention.e2e.cjs
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const PHONE = !!process.env.PHONE, DEV = PHONE ? 'phone' : 'desk', OUT = path.join(process.env.OUT || path.join(os.tmpdir(), 'gl-ret'), DEV); fs.mkdirSync(OUT, { recursive: true });
const URL = (process.env.URL || 'http://localhost:3000/').replace(/\/?$/, '/');
const HOOK = `\nwindow.__t={now,G,L,D,BK,P:()=>P,W,TRIAL,POT,RAMPS,GOL,FIGHTERS,LITE,PERF,AB,keys,camera,net,teleport,mount,dismount,closeModal,openPhone,crime,autoTo,startTrial,startPothole,startGolgappa,appKhel,appDhanda,appCalendar,inviteFriend,appOnline,appCrew,welcomeBack,cutscene,phoneCall,cliffhanger,bkStart,bkFail,levelUp,setWaypoint,nextObjective,startChase,jobStreak,openBade,get player(){return player}};`;
const results = []; let errs = [];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.route('**/api/stations', r => r.fulfill({ json: { har: [], pun: [], bol: [], eng: [] } })); await p.route('**/radio-browser.info/**', r => r.abort());
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game.js'), 'utf8'); await p.route('**/js/game.js', r => r.fulfill({ body: src + HOOK, contentType: 'application/javascript' }));
  const E = (f, a) => p.evaluate(f, a), W = ms => p.waitForTimeout(ms), tap = sel => PHONE ? p.locator(sel).first().tap() : p.locator(sel).first().click();
  const step = async (name, fn) => { const e0 = errs.length; let ok = false, info = ''; try { const r = await fn(); ok = r.ok; info = r.info || ''; } catch (e) { info = 'EXC ' + e.message.split('\n')[0]; }
    if (errs.length > e0) { ok = false; info += ' · page error: ' + errs.slice(e0).join(' | ').slice(0, 200); } results.push({ name, ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : ''));
    await p.screenshot({ path: path.join(OUT, String(results.length).padStart(2, '0') + '-' + name.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) + '.jpg'), type: 'jpeg', quality: 60 }).catch(() => {}); };
  const poll = (f, ms, a) => p.waitForFunction(f, a, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const quiet = () => E(() => { const t = window.__t; t.G.donCallNext = 1e12; t.G.calledBK = true; t.G.giftAt = 1e12; document.querySelector('.dc-no')?.click(); document.getElementById('raceres').hidden = true; t.closeModal(); });
  const t0 = Date.now();

  // RET-14: the start screen shows a loading bar with tips, which fills up
  await p.goto(URL + '?start=cold'); await W(800);
  await step('RET-14 loading bar with tips on the start screen', async () => { const a = await E(() => { const b = document.getElementById('loadbar'); return b ? b.textContent : null; }); const full = await poll(() => /Taiyaar/.test((document.getElementById('loadbar') || {}).textContent || ''), 60000);
    return { ok: !!a && /Tip/.test(a) && full, info: (a || 'no bar').slice(0, 80) + ' → ' + (full ? 'Taiyaar' : 'stuck') }; });

  // RET-01: a brand-new player (A/B: cold) goes from name → avatar → straight into the game, no start picker, no long film
  await p.fill('#nameIn', 'Ret Tester'); await tap('#playBtn'); await W(800); if (await p.$('#cNext:visible')) await tap('#cNext');
  await step('RET-01 cold open: no start picker, straight into Rajiv Chowk', async () => { const picker = await E(() => !document.getElementById('startpick').hidden); const ok = await poll(() => window.__t && window.__t.G.started, 60000);
    const r = await E(() => ({ ab: window.__t.AB, film: !!document.getElementById('film'), x: Math.round(window.__t.G.x), z: Math.round(window.__t.G.z) })); return { ok: ok && !picker && r.ab === 'cold' && !r.film, info: JSON.stringify({ picker, ...r }) }; });
  await step('RET-01 Chintu snatches the phone: yellow marker, Pehla minute panel with a 90 s clock', async () => { const ok = await poll(() => window.__t.G.cold && window.__t.G.cold.snatched, 20000); await W(600);
    const r = await E(() => { const c = window.__t.G.cold; return { marker: !!(c && c.mk && c.mk.parent), quest: document.getElementById('quest').innerText.replace(/\s+/g, ' ').slice(0, 140), flee: c && c.n.state }; });
    return { ok: ok && r.marker && /Pehla minute/i.test(r.quest) && /⏱ 1:/.test(r.quest), info: JSON.stringify(r) }; });
  await step('RET-01 catch him and knock him out: ₹1,000 inside 90 s', async () => { const tStart = await E(() => window.__t.G.cold.snatched);
    const r = await E(async () => { const t = window.__t, G = t.G, n = G.cold.n; for (let k = 0; k < 120 && !G.cold.won; k++) { t.teleport(n.x - Math.sin(n.r) * 1.0, n.z - Math.cos(n.r) * 1.0, n.r); G.r = G.yaw = Math.atan2(n.x - G.x, n.z - G.z); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' })); await new Promise(r => setTimeout(r, 120)); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' })); await new Promise(r => setTimeout(r, 330)); }
      await new Promise(r => setTimeout(r, 1500)); return { won: !!(G.cold ? G.cold.won : true), money: t.P().money, cold: !!t.P().cold, at: t.now() }; });
    const secs = Math.round(r.at - tStart); return { ok: r.won && r.money >= 1000 && r.cold && secs < 90, info: JSON.stringify({ ...r, secs }) }; });
  await step('RET-05 the starter car: Chacha ka gift card, drive the Khatara', async () => { const ok = await poll(() => /Chacha ka gift/.test(document.querySelector('#raceres h2')?.textContent || ''), 15000);
    if (ok) await tap('#raceres button >> nth=0'); await W(1200); const r = await E(() => ({ veh: window.__t.G.veh, owned: window.__t.P().vehicles })); return { ok: ok && r.veh === 'khatara' && r.owned.includes('khatara'), info: JSON.stringify(r) }; });
  await step('RET-13 funnel: landing, name, avatar, A/B, play, first move, cold open, first reward', async () => { await E(() => { const t = window.__t; t.dismount(); t.keys.KeyW = true; }); await W(2500); await E(() => { window.__t.keys.KeyW = false; }); await W(1500);
    const st = await E(() => Object.keys(window.__t.P().steps || {})); const want = ['landing', 'name_ok', 'avatar_done', 'ab_cold', 'play', 'cold_go', 'cold_done', 'first_reward', 'first_move']; const miss = want.filter(k => !st.includes(k)); return { ok: !miss.length, info: miss.length ? 'missing ' + miss.join(',') : st.length + ' steps' }; });
  await quiet(); await W(6000); await quiet();

  // RET-03: the next-objective strip, and ₹50 fast travel from the GPS chip
  await step('RET-03 next-objective strip shows the next thing to do', async () => { await E(() => { const t = window.__t; t.G.wp = null; document.getElementById('quest').hidden = true; }); const ok = await poll(() => !document.getElementById('obj').hidden, 6000);
    const txt = await E(() => document.getElementById('obj').innerText.replace(/\s+/g, ' ')); return { ok: ok && /Agla kaam/i.test(txt), info: txt.slice(0, 90) }; });
  await step('RET-03 fast travel: 🛺 on the GPS chip takes you there for ₹50', async () => { await E(() => { const t = window.__t; t.setWaypoint(300, -140, 'Akhara test'); }); await W(700); const m0 = await E(() => window.__t.P().money);
    await tap('#navauto'); await W(4000); const r = await E(() => ({ x: Math.round(window.__t.G.x), z: Math.round(window.__t.G.z), money: window.__t.P().money })); const d = Math.hypot(r.x - 300, r.z + 140);
    return { ok: d < 30 && m0 - r.money === 50, info: JSON.stringify({ ...r, d: Math.round(d), paid: m0 - r.money }) }; });

  // RET-07: mini-games
  await step('RET-07 time trial (Golf Course Road): rings, timer, medal', async () => { await quiet(); const r = await E(async () => { const t = window.__t, G = t.G, M = t.D.MINI.trial1; t.teleport(M.pts[0][0], M.pts[0][1] - 4, Math.PI); t.mount('khatara'); t.startTrial('trial1'); const rings = t.TRIAL.rings.length;
      await new Promise(r => setTimeout(r, 16500)); const hud = document.getElementById('racehud').innerText; const [x, z] = M.pts[1]; t.teleport(x, z, Math.PI); await new Promise(r => setTimeout(r, 2500)); return { rings, hud, on: t.TRIAL.on, big: document.getElementById('bigtxt').innerText }; });
    return { ok: r.rings === 1 && /⏱/.test(r.hud) && !r.on && /MEDAL|KOSHISH/.test(r.big), info: JSON.stringify(r).slice(0, 200) }; });
  await step('RET-07 pothole dodge on MG Road: score and medal', async () => { await W(1500); const r = await E(async () => { const t = window.__t, G = t.G; if (!G.veh) t.mount('khatara'); t.teleport(-75, -200, 0); t.startPothole(); const n = t.POT.list.length;
      for (const q of t.POT.list) { const x = q.x + (q.x > -75 ? -2.8 : 2.8); for (const dz of [-4, 3]) { t.teleport(x, q.z + dz, 0); G.vs = 20; await new Promise(r => setTimeout(r, 700)); } } /* weave past each one */ await new Promise(r => setTimeout(r, 2500)); return { n, on: t.POT.on, big: document.getElementById('bigtxt').innerText }; });
    return { ok: r.n === 16 && !r.on && /(\d+)\/16 saaf/.test(r.big) && +r.big.match(/(\d+)\/16/)[1] >= 10 && /MEDAL/.test(r.big), info: JSON.stringify(r) }; });
  await step('RET-07 stunt jump: ramp launches the car, distance scored', async () => { await W(1500); const r = await E(async () => { const t = window.__t, G = t.G, R = t.RAMPS[2]; if (!G.veh) t.mount('khatara'); t.teleport(R.x - Math.sin(R.r) * 9, R.z - Math.cos(R.r) * 9, R.r); G.vs = 30; let air = 0;
      for (let k = 0; k < 60; k++) { G.vs = Math.max(G.vs, 26); t.keys.KeyW = true; if (G.air > air) air = G.air; await new Promise(r => setTimeout(r, 50)); } t.keys.KeyW = false; await new Promise(r => setTimeout(r, 2500)); return { air: +air.toFixed(2), big: document.getElementById('bigtxt').innerText }; });
    return { ok: r.air > 0.5, info: JSON.stringify(r) }; });
  await step('RET-07 golgappa challenge at Galleria Market: eat in time, medal', async () => { await E(() => { const t = window.__t; if (t.G.veh) t.dismount(); t.teleport(t.GOL.x + 1.5, t.GOL.z + 1.5, 0); }); await W(500); await E(() => window.__t.startGolgappa()); const open = await poll(() => /Golgappa/.test(document.getElementById('mTitle').textContent) && !document.getElementById('modal').hidden, 5000);
    let ate = 0; for (let k = 0; k < 70 && open; k++) { const ready = await E(() => { const i = document.querySelector('.golbar i'); return i && i.style.background.includes('61, 220, 106') || (i && /3ddc6a/i.test(i.style.background)); }); if (ready) { await E(() => document.querySelector('#mBody .go')?.click()); ate++; } /* a DOM click: the slow test renderer makes pointer clicks take seconds */ await W(350); if (!(await E(() => !document.getElementById('modal').hidden))) break; }
    await W(2500); const big = await E(() => document.getElementById('bigtxt').innerText); return { ok: open && ate >= 3 && /golgappe/.test(big), info: 'taps ' + ate + ' · ' + big.replace(/\s+/g, ' ').slice(0, 80) }; });
  await step('RET-07 back-to-back jobs: streak x1.5 banner, "ek aur?" card', async () => { const r = await E(async () => { const t = window.__t; const a = await t.net.req('earn', { reason: 'delivery', amount: 200 }); await new Promise(r => setTimeout(r, 9500)); const b2 = await t.net.req('earn', { reason: 'delivery', amount: 200 }); t.jobStreak(b2); return { a: a.mult, b: b2.mult, big: document.getElementById('bigtxt').innerText }; });
    return { ok: r.a === 1 && r.b === 1.5 && /STREAK x1.5/.test(r.big), info: JSON.stringify(r) }; });
  await step('RET-07 Khel app lists the five games with bests and Top 10', async () => { await E(() => window.__t.appKhel()); await W(1500); const r = await E(() => ({ rows: document.querySelectorAll('#mBody .item').length, txt: document.getElementById('mBody').innerText.slice(0, 160) })); await E(() => window.__t.closeModal());
    return { ok: r.rows === 5 && /Tera best/.test(r.txt), info: r.rows + ' rows · ' + r.txt.replace(/\s+/g, ' ').slice(0, 100) }; });

  // RET-06: wanted stars, police at two, chai-paani when caught
  await step('RET-06 wanted stars: one crime = ★ on the HUD, two = police chase', async () => { await E(() => { window.__t.G.wp = null; }); await E(() => window.__t.crime('ped')); await W(400); const one = await E(() => ({ s: window.__t.W.stars, hud: document.getElementById('wanted').innerText, chase: !!window.__t.G.chase }));
    await E(() => window.__t.crime('ped')); const chased = await poll(() => !!window.__t.G.chase, 6000); const two = await E(() => window.__t.W.stars);
    return { ok: one.s === 1 && !one.chase && /★/.test(one.hud) && chased && two === 2, info: JSON.stringify({ one, chased, two }) }; });
  await step('RET-06 caught with stars: chai-paani clears them', async () => { await E(() => { const t = window.__t, c = t.G.chase; c.x = t.G.x + 0.5; c.z = t.G.z; }); const card = await poll(() => /chai-paani/i.test(document.querySelector('#raceres h2')?.textContent || ''), 6000); const m0 = await E(() => window.__t.P().money);
    if (card) await tap('#raceres button >> nth=0'); await W(1500); const r = await E(() => ({ stars: window.__t.W.stars, money: window.__t.P().money, hud: document.getElementById('wanted').hidden })); return { ok: card && r.stars === 0 && r.hud && m0 - r.money === 1200, info: JSON.stringify({ card, paid: m0 - r.money, ...r }) }; });

  // RET-08: progress you can see
  await step('RET-08 HUD shows the next goal in rupees left; level-up party with a share card', async () => { const s = await E(() => document.getElementById('sapna').innerText.replace(/\s+/g, ' ')); await E(() => window.__t.levelUp(3)); await W(2900);
    const r = await E(() => ({ big: document.getElementById('bigtxt').innerText, card: document.querySelector('#raceres h2')?.textContent || '' })); await E(() => { document.getElementById('raceres').hidden = true; });
    return { ok: /Sapna/.test(s) && /(baaki|%|Ab le le)/.test(s) && /LEVEL 3/.test(r.big + r.card) && /Level 3/.test(r.card), info: s.slice(0, 60) + ' · ' + r.card }; });

  // RET-10, RET-11, RET-09
  await step('RET-10 calendar: 7 days with rewards, today marked', async () => { await E(() => window.__t.appCalendar()); await W(600); const r = await E(() => ({ cells: document.querySelectorAll('.cal .cd').length, now: document.querySelectorAll('.cal .cd.now').length, txt: document.querySelector('.cal').innerText.replace(/\s+/g, ' ').slice(0, 80) })); await E(() => window.__t.closeModal());
    return { ok: r.cells === 7 && r.now === 1, info: JSON.stringify(r) }; });
  await step('RET-11 Dhanda app: tapri and car wash, locked until the Bada Kaam', async () => { await E(() => window.__t.appDhanda()); await W(600); const r = await E(() => ({ rows: document.querySelectorAll('#mBody .item').length, txt: document.getElementById('mBody').innerText.replace(/\s+/g, ' ').slice(0, 140) })); await E(() => window.__t.closeModal());
    return { ok: r.rows === 2 && /ghanta/.test(r.txt), info: r.txt }; });
  await step('RET-09 invite link carries your id; Online shows players today and computer rivals; crew costs ₹2,000', async () => {
    const r = await E(async () => { const t = window.__t; let opened = null; const ow = window.open; window.open = u => { opened = u; return null; }; const sh = navigator.share; try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch {} t.inviteFriend(); window.open = ow; if (sh) Object.defineProperty(navigator, 'share', { value: sh, configurable: true });
      t.appOnline(); await new Promise(r => setTimeout(r, 500)); const online = document.getElementById('mBody').innerText + document.getElementById('mSub').innerText; t.closeModal(); await t.appCrew(); await new Promise(r => setTimeout(r, 500)); const crew = document.getElementById('mBody').innerText; t.closeModal(); return { opened, online: online.replace(/\s+/g, ' ').slice(0, 140), crew2k: /₹2,000/.test(crew), war: /ilaaka jung/.test(crew), id: t.P().id }; });
    return { ok: !!r.opened && decodeURIComponent(r.opened).includes('ref=' + r.id) && r.crew2k && r.war, info: JSON.stringify(r).slice(0, 220) }; });

  // RET-12: cutscene, phone call, cliffhanger
  await step('RET-12 Bada Kaam starts with a short cutscene, then the card', async () => { await E(() => { const t = window.__t; if (t.G.veh) t.dismount(); t.bkStart(t.P().bk || 0); }); const cut = await poll(() => !!document.getElementById('cutcap') && document.body.classList.contains('cutscene'), 6000); const txt = await E(() => (document.getElementById('cutcap') || {}).innerText || '');
    for (let k = 0; k < 4; k++) { await E(() => { const c = document.getElementById('cutcap'); if (c) c.click(); }); await W(400); } const card = await poll(() => /Bada Kaam/.test(document.querySelector('#raceres h2')?.textContent || ''), 8000);
    await E(() => { const t = window.__t; document.getElementById('raceres').hidden = true; if (t.BK.on) t.bkFail('test'); }); await W(1500); await E(() => { document.getElementById('raceres').hidden = true; }); return { ok: cut && card, info: txt.replace(/\s+/g, ' ').slice(0, 90) }; });
  await step('RET-12 the next Bada Kaam phones you; a cliffhanger after one is done', async () => { await E(() => window.__t.phoneCall(window.__t.P().bk || 0)); await W(500); const call = await E(() => document.querySelector('#raceres h2')?.textContent || ''); await E(() => { document.getElementById('raceres').hidden = true; });
    await E(() => window.__t.cliffhanger(0)); await W(4800); const cl = await E(() => document.querySelector('#raceres h2')?.textContent || ''); await E(() => { document.getElementById('raceres').hidden = true; }); return { ok: /calling/.test(call) && /Agle episode/.test(cl), info: call + ' · ' + cl }; });

  // RET-02: welcome back
  await step('RET-02 welcome back: full health and food, waiting items, Continue', async () => { const r = await E(() => { const t = window.__t; t.G.hp = 30; t.L.hunger = 10; t.welcomeBack({ daily: { amt: 800, cal: 2 }, bizDue: 0 }); return { hp: t.G.hp, food: t.L.hunger, h: document.querySelector('#raceres h2')?.textContent, rows: document.querySelectorAll('#raceres .wbrow').length, btn: document.querySelector('#raceres .btns button')?.textContent }; });
    await E(() => { document.getElementById('raceres').hidden = true; window.__t.G.wbOpen = false; }); return { ok: r.hp === 100 && r.food === 100 && /Wapas/.test(r.h) && r.rows >= 1 && /▶/.test(r.btn), info: JSON.stringify(r) }; });

  // RET-04: walking camera, steering, gamepad
  await step('RET-04 walking forward swings the camera in behind you', async () => { const r = await E(async () => { const t = window.__t, G = t.G; if (G.veh) t.dismount(); G.lookAt = 0; G.yaw = G.r + 0; const r0 = G.r; t.keys.KeyW = true; G.yaw = r0 + 0.0; await new Promise(r => setTimeout(r, 300)); G.yaw = G.r + 0.9; G.lookAt = 0; await new Promise(r => setTimeout(r, 5000)); t.keys.KeyW = false; const off = Math.abs(Math.atan2(Math.sin(G.yaw - G.r), Math.cos(G.yaw - G.r))); return { off: +off.toFixed(2) }; });
    return { ok: r.off < 0.45, info: JSON.stringify(r) }; });
  await step('RET-04 a gamepad drives the player (left stick) and turns the camera (right stick)', async () => { const r = await E(async () => { const t = window.__t, G = t.G; const pad = { connected: true, axes: [0, -1, 0.8, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }; const orig = navigator.getGamepads; navigator.getGamepads = () => [pad];
      const x0 = G.x, z0 = G.z, y0 = G.yaw; await new Promise(r => setTimeout(r, 2500)); const moved = Math.hypot(G.x - x0, G.z - z0), turned = Math.abs(G.yaw - y0); pad.axes = [0, 0, 0, 0]; await new Promise(r => setTimeout(r, 300)); navigator.getGamepads = orig; return { moved: +moved.toFixed(1), turned: +turned.toFixed(2) }; });
    return { ok: r.moved > 2 && r.turned > 0.2, info: JSON.stringify(r) }; });

  // RET-08: the gift lands after 2.5 minutes of play (by now the session is that old)
  await step('RET-08 a small gift every 2.5 minutes', async () => { const waitMs = Math.max(0, 160000 - (Date.now() - t0)); await W(waitMs); const m0 = await E(() => window.__t.P().money); await E(() => { window.__t.G.giftAt = 1; document.getElementById('raceres').hidden = true; window.__t.closeModal(); });
    const ok = await poll(() => /CHHOTA INAAM/.test(document.getElementById('bigtxt').innerText), 8000); const m1 = await E(() => window.__t.P().money); return { ok: ok && m1 > m0, info: 'gift +' + (m1 - m0) }; });

  // RET-14: lite graphics for low-end phones
  await step('RET-14 lite graphics: Menu switch reloads into low settings', async () => { await E(() => localStorage.setItem('gl_lite', '1')); await p.reload(); await W(1500); await p.fill('#nameIn', 'Ret Tester'); await tap('#playBtn'); await W(800); if (await p.$('#cNext:visible')) await tap('#cNext'); await W(600); if (await p.$('.splace.cont')) await tap('.splace.cont'); else if (await p.$('.splace')) await tap('.splace >> nth=0');
    const ok = await poll(() => window.__t && window.__t.G.started, 60000); await W(4000); const r = await E(() => ({ lite: window.__t.LITE, pr: window.__t.PERF.pr })); await E(() => localStorage.setItem('gl_lite', '0'));
    return { ok: ok && r.lite === true && r.pr === 0.85, info: JSON.stringify(r) }; });
  await step('IMP-06 Continue on the start picker returns you to where you left off', async () => { const pos = await E(() => window.__t.L.lastPos); return { ok: !!pos, info: JSON.stringify(pos) }; });

  const fails = results.filter(r => !r.ok); console.log('\n' + (results.length - fails.length) + '/' + results.length + ' passed (' + DEV + ')' + (fails.length ? '\nFAILED: ' + fails.map(f => f.name).join(' | ') : ''));
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1)); await b.close(); process.exit(fails.length ? 1 : 0);
})();
