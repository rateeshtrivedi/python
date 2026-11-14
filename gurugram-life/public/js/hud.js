// Shaant HUD: the screen stays clear until something matters (the GTA way, with a Gurugram twist).
// - Calm: after 6 quiet seconds the stats card shrinks to name, level and money, and the kaam list to the one you're on.
// - Pop on change: money, health or bhookh changing brings the card back for 5 s; money flies up as "+₹300".
// - Danger stays: health under 40 or bhookh under 30 stays on screen and pulses.
// - Rings: health (left) and bhookh (right) always live as two arcs around the minimap, so nothing is ever really hidden.
// - Hold J (or hover the left edge) to see everything. Fast driving fades the HUD out for a film-like view.
// - Key hints learn: a key fades after you've used it 3 times; the box goes once you know them all, or after 4 minutes.
// It reads the HUD the game already draws (#money, #hpt, #hut, #spd), so it needs no hooks into the game loop.

const QUIET = 6, POP = 5, KEYS_MAX = 240, LEARN = 3;
const HINTS = [ // [label, keys that count as using it]
  ['<kbd>W A S D</kbd> chalo', ['KeyW', 'KeyA', 'KeyS', 'KeyD']], ['<kbd>← →</kbd> ghoomo', ['ArrowLeft', 'ArrowRight']], ['<kbd>Shift</kbd> daudo', ['ShiftLeft', 'ShiftRight']],
  ['<kbd>Space</kbd> jump', ['Space']], ['<kbd>Click</kbd> punch', ['mouse', 'KeyQ']], ['<kbd>E</kbd> action', ['KeyE']], ['<kbd>F</kbd> gaadi', ['KeyF']],
  ['<kbd>M</kbd> map', ['KeyM']], ['<kbd>Tab</kbd> phone · chats', ['Tab']], ['<kbd>T</kbd> chat', ['KeyT']], ['<kbd>J</kbd> (hold) sab dikhao', ['KeyJ']],
];
const $ = id => document.getElementById(id);
const num = id => { const e = $(id); return e ? Number(String(e.textContent).replace(/[^0-9.-]/g, '')) || 0 : 0; };
const t = () => performance.now() / 1000;

export function startHUD() {
  if (startHUD.on) return; startHUD.on = true;
  const body = document.body, stat = $('stat'), hud = $('hud');
  let last = { money: num('money'), hp: num('hpt'), hu: num('hut') }, calmAt = t() + QUIET, popUntil = 0, peek = false;

  // rings around the minimap
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.id = 'maprings'; svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
  const arc = (cls) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); svg.append(p); return p; };
  const hpBg = arc('bg'), huBg = arc('bg'), hpA = arc('hp'), huA = arc('hu'); hud.append(svg);
  const R = 47, pt = a => (50 + R * Math.cos(a)).toFixed(2) + ' ' + (50 + R * Math.sin(a)).toFixed(2);
  const path = (a0, a1) => 'M ' + pt(a0) + ' A ' + R + ' ' + R + ' 0 ' + (Math.abs(a1 - a0) > Math.PI ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + pt(a1);
  const SPAN = Math.PI * 0.8, LB = Math.PI / 2 + 0.12, RB = Math.PI / 2 - 0.12; // both arcs start at the bottom and climb the sides
  hpBg.setAttribute('d', path(LB, LB + SPAN)); huBg.setAttribute('d', path(RB, RB - SPAN));
  const rings = (hp, hu) => { hpA.setAttribute('d', path(LB, LB + SPAN * Math.max(0.001, hp / 100))); huA.setAttribute('d', path(RB, RB - SPAN * Math.max(0.001, hu / 100))); svg.classList.toggle('lowhp', hp < 40); svg.classList.toggle('lowhu', hu < 30); };
  const place = () => { const m = $('mapwrap'); if (!m) return; const r = m.getBoundingClientRect(), h = hud.getBoundingClientRect(), pad = r.width * 0.09; Object.assign(svg.style, { left: (r.left - h.left - pad) + 'px', top: (r.top - h.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' }); };
  addEventListener('resize', place); setTimeout(place, 300);

  // "+₹300" flying up from the money
  const fly = (d) => { const m = $('money'); if (!m || !d) return; const f = document.createElement('div'); f.className = 'moneyfly' + (d < 0 ? ' neg' : ''); f.textContent = (d > 0 ? '+' : '−') + '₹' + Math.abs(d).toLocaleString('en-IN'); const r = m.getBoundingClientRect(), h = hud.getBoundingClientRect(); f.style.left = (r.right - h.left + 8) + 'px'; f.style.top = (r.top - h.top) + 'px'; hud.append(f); setTimeout(() => f.remove(), 1600); };

  // hold J / hover the left edge: everything
  addEventListener('keydown', e => { if (e.code === 'KeyJ' && !/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '')) peek = true; });
  addEventListener('keyup', e => { if (e.code === 'KeyJ') peek = false; });
  let hover = false; addEventListener('mousemove', e => { hover = !document.pointerLockElement && e.clientX < 260; });

  // key hints that learn
  const kh = $('keyhint'); const used = {}; let kStart = t(); try { Object.assign(used, JSON.parse(localStorage.getItem('gl_keysLearnt') || '{}')); } catch {}
  const learnt = i => HINTS[i][1].reduce((n, k) => n + (used[k] || 0), 0) >= LEARN;
  const drawHints = () => { if (!kh) return; kh.innerHTML = HINTS.map((h, i) => '<span data-i="' + i + '"' + (learnt(i) ? ' class="got"' : '') + '>' + h[0] + '</span>').join(''); };
  drawHints(); let saveT = 0;
  const use = code => { const i = HINTS.findIndex(h => h[1].includes(code)); if (i < 0) return; const was = learnt(i); used[code] = (used[code] || 0) + 1; if (!was && learnt(i) && kh) { const s = kh.querySelector('[data-i="' + i + '"]'); if (s) s.classList.add('got'); } if (t() - saveT > 3) { saveT = t(); try { localStorage.setItem('gl_keysLearnt', JSON.stringify(used)); } catch {} } };
  addEventListener('keydown', e => { if (!e.repeat) use(e.code); }); addEventListener('mousedown', () => use('mouse'));

  const loop = () => {
    const now = t(), money = num('money'), hp = num('hpt'), hu = num('hut');
    if (money !== last.money) { fly(money - last.money); popUntil = now + POP; }
    if (Math.abs(hp - last.hp) >= 1 || Math.abs(hu - last.hu) >= 3) popUntil = Math.max(popUntil, now + POP);
    last = { money, hp, hu }; rings(hp, hu);
    // anything on the screen that wants attention resets the quiet timer: a mission card, a prompt, a modal
    const busy = !$('raceres').hidden || ($('modal') && !$('modal').hidden);
    if (busy || now < popUntil) calmAt = now + QUIET;
    const calm = now > calmAt && !peek && !hover;
    body.classList.toggle('hudcalm', calm); body.classList.toggle('hudpeek', peek || hover); body.classList.toggle('hudall', peek); // hold J: everything, the full kaam list too
    stat && stat.classList.toggle('pop', now < popUntil); stat && stat.classList.toggle('lowhp', hp < 40); stat && stat.classList.toggle('lowhu', hu < 30);
    const kmh = num('spd'); body.classList.toggle('hudcine', !!$('speedo') && !$('speedo').hidden && kmh > 70 && !peek);
    if (kh && !kh.hidden && (HINTS.every((h, i) => learnt(i)) || now - kStart > KEYS_MAX)) { kh.classList.add('gone'); setTimeout(() => { kh.hidden = true; }, 900); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { show: () => { kStart = t(); drawHints(); if (kh) { kh.hidden = false; kh.classList.remove('gone'); } } };
}
