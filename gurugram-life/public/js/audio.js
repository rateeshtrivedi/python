// Sound: live Haryanvi and Punjabi internet radio (real songs), the player's own song files, and SFX.
export const hooks = { toast: () => {}, label: () => {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export const Music = { ctx: null, vol: 0.22, sfx: null }; // music starts quiet; the player can turn it up in Radio
export const STATIONS = [
  { id: 'har', name: 'Haryanvi Live', freq: 'LIVE', sub: 'Asli Haryanvi gaane, live internet radio se' },
  { id: 'pun', name: 'Punjabi Live', freq: 'LIVE', sub: 'Punjabi aur bhangra hits, live' },
  { id: 'mine', name: 'Meri Playlist', freq: 'MP3', sub: 'Your own Haryanvi & Punjabi songs' },
];
export const Radio = { st: 'har', playing: false, audio: null, live: null, list: [], idx: 0, src: null, override: null, chans: { har: [], pun: [] }, ci: { har: 0, pun: 0 }, loading: null, fails: 0 };
let NOISE = null;
export function initAudio() {
  if (Music.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  Music.ctx = new C(); Music.sfx = Music.ctx.createGain(); Music.sfx.gain.value = 0.5; Music.sfx.connect(Music.ctx.destination);
  const len = Music.ctx.sampleRate * 0.5; NOISE = Music.ctx.createBuffer(1, len, Music.ctx.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function osc(type, f, t, dur, peak, dest, a) { const c = Music.ctx; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); env(g, t, a || 0.005, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
function noise(t, dur, peak, freq, q, type, dest) { const c = Music.ctx; const s = c.createBufferSource(); s.buffer = NOISE; const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; const g = c.createGain(); env(g, t, 0.002, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05); }
function dholBass(t, dest, v = 0.9) { const o = osc('sine', 95, t, 0.38, v, dest); o.frequency.exponentialRampToValueAtTime(48, t + 0.25); noise(t, 0.05, 0.25 * v, 300, 1, 'lowpass', dest); }

// ---- live stations: the server keeps a fresh list of working HTTPS streams (radio-browser.info directory)
const RB_HOSTS = ['de1.api.radio-browser.info', 'de2.api.radio-browser.info', 'fi1.api.radio-browser.info', 'nl1.api.radio-browser.info'];
async function fetchDirect() { // solo build without our server: ask the public directory straight from the browser
  const q = async tag => { for (const h of RB_HOSTS) { try { const r = await fetch('https://' + h + '/json/stations/search?tag=' + encodeURIComponent(tag) + '&hidebroken=true&order=clickcount&reverse=true&limit=40'); if (r.ok) return await r.json(); } catch {} } return []; };
  const pick = list => list.filter(s => /^https:\/\//.test(s.url_resolved || '') && /mp3|aac/i.test(s.codec || '') && !/gurbani|kirtan|gurdwara|sikh|paath|bhajan|news|talk/i.test((s.name || '') + ' ' + (s.tags || ''))).slice(0, 15).map(s => ({ name: String(s.name || 'Live radio').trim().slice(0, 40), url: s.url_resolved }));
  const [h, p, b] = await Promise.all([q('haryanvi'), q('punjabi'), q('bhangra')]);
  return { har: pick(h), pun: pick([...p, ...b]) };
}
export function loadStations() {
  if (Radio.loading) return Radio.loading;
  Radio.loading = (async () => {
    let d = null; try { const r = await fetch('/api/stations'); if (r.ok) d = await r.json(); } catch {}
    if (!d || !(d.har || []).length && !(d.pun || []).length) { try { d = await fetchDirect(); } catch {} }
    d = d || {}; Radio.chans.har = d.har || []; Radio.chans.pun = d.pun || [];
    if (!Radio.chans.har.length) Radio.chans.har = Radio.chans.pun.slice(); // no Haryanvi stream up right now: fall back to Punjabi
    if (!Radio.chans.pun.length) Radio.chans.pun = Radio.chans.har.slice();
    const saved = lsGet('gl_chan'); if (saved) for (const k of ['har', 'pun']) { const i = Radio.chans[k].findIndex(c => c.url === saved[k]); if (i >= 0) Radio.ci[k] = i; }
    return Radio.chans;
  })();
  Radio.loading.then(c => { if (!c.har.length) Radio.loading = null; }); // retry later if nothing came back
  return Radio.loading;
}
function liveSt() { const s = activeSt(); return s === 'club' ? 'pun' : s; }
function liveAudio() {
  if (Radio.live) return Radio.live; const a = new Audio(); a.preload = 'none'; Radio.live = a;
  const fail = () => { if (!Radio.playing || liveSt() === 'mine' || a !== Radio.live || !a.getAttribute('src')) return; Radio.fails++; if (Radio.fails > 6) { radioOff(); hooks.toast('Live radio abhi nahi chal raha. Radio mein apne gaane add kar sakte ho.', 'bad'); return; } nextChannel(1, true); };
  a.addEventListener('error', fail); a.addEventListener('ended', fail); a.addEventListener('playing', () => { Radio.fails = 0; clearTimeout(Radio.stallT); hooks.label(); });
  a.addEventListener('stalled', () => { clearTimeout(Radio.stallT); Radio.stallT = setTimeout(fail, 9000); });
  return a;
}
async function playLive() {
  const st = liveSt(); hooks.label(); await loadStations(); if (!Radio.playing || liveSt() !== st) return;
  const L = Radio.chans[st]; if (!L.length) { Radio.playing = false; hooks.label(); hooks.toast('Live radio nahi mila. Radio mein apne gaane add kar sakte ho.', 'bad'); return; }
  const ch = L[Radio.ci[st] % L.length]; const a = liveAudio(); a.src = ch.url; a.volume = Music.vol;
  clearTimeout(Radio.stallT); Radio.stallT = setTimeout(() => { if (a.paused || a.readyState < 3) a.dispatchEvent(new Event('error')); }, 12000);
  const p = a.play(); if (p && p.catch) p.catch(e => { if (e && e.name === 'NotAllowedError') { Radio.playing = false; hooks.label(); } else if (e && e.name !== 'AbortError') a.dispatchEvent(new Event('error')); });
  lsSet('gl_chan', { har: (Radio.chans.har[Radio.ci.har] || {}).url, pun: (Radio.chans.pun[Radio.ci.pun] || {}).url });
}
function stopLive() { clearTimeout(Radio.stallT); if (Radio.live) { Radio.live.pause(); Radio.live.removeAttribute('src'); Radio.live.load(); } }
export function nextChannel(d, auto) { const st = liveSt(); if (st === 'mine') return mineNext(d); const n = Radio.chans[st].length; if (!n) return; Radio.ci[st] = (Radio.ci[st] + d + n) % n; if (!auto) Radio.fails = 0; if (Radio.playing) playLive(); hooks.label(); }
export function channelList() { const st = liveSt(); return st === 'mine' ? [] : Radio.chans[st]; }
export function playChannel(i) { const st = liveSt(); Radio.ci[st] = i; Radio.fails = 0; if (!Radio.playing) radioOn(); else playLive(); hooks.label(); }
export function liveLoading() { const st = liveSt(); return st !== 'mine' && Radio.playing && Radio.live && (Radio.live.paused || Radio.live.readyState < 3); }
function activeSt() { return Radio.override || Radio.st; }
export function nowPlaying() { const s = liveSt(); if (s === 'mine') return (Radio.list[Radio.idx] || {}).name || ''; const L = Radio.chans[s]; return L.length ? L[Radio.ci[s] % L.length].name : 'Tuning…'; }
export function radioOn() { initAudio(); if (Radio.st === 'mine' && !Radio.list.length) Radio.st = 'har'; Radio.playing = true; if (liveSt() === 'mine') { stopLive(); playMine(); } else { stopMine(); playLive(); } hooks.label(); lsSet('gl_radio', { on: true, st: Radio.st }); }
export function radioOff() { Radio.playing = false; stopLive(); stopMine(); hooks.label(); lsSet('gl_radio', { on: false, st: Radio.st }); }
export function toggleMusic() { if (Radio.playing) radioOff(); else radioOn(); }
export function setStation(id) { if (id === 'mine' && !Radio.list.length) { hooks.toast('Pehle apne gaane add kar (Radio → Meri Playlist)'); return; } stopLive(); stopMine(); Radio.st = id; Radio.fails = 0; radioOn(); }
export function nextStation() { const ids = STATIONS.map(s => s.id).filter(id => id !== 'mine' || Radio.list.length); const i = ids.indexOf(Radio.st); setStation(ids[(i + 1) % ids.length]); }
// The club plays Punjabi live while you are inside, then hands back to your station.
export function setOverride(st) { if (Radio.override === st) return; const before = liveSt(); Radio.override = st; if (!Radio.playing || liveSt() === before) return; stopLive(); stopMine(); if (liveSt() === 'mine') playMine(); else playLive(); hooks.label(); }
export function skipTrack(d) { nextChannel(d); }
function mineAudio() { if (!Radio.audio) { const a = new Audio(); a.preload = 'auto'; a.addEventListener('ended', () => mineNext(1)); a.addEventListener('error', () => { if (Radio.playing && liveSt() === 'mine' && a.getAttribute('src')) playDecoded(); }); Radio.audio = a; } return Radio.audio; }
export function playMine() { const s = Radio.list[Radio.idx]; if (!s) return; stopMine(); const a = mineAudio(); if (!s.url) s.url = URL.createObjectURL(s.blob); a.src = s.url; a.volume = Music.vol; const p = a.play(); if (p && p.catch) p.catch(e => { if (e && e.name !== 'AbortError') playDecoded(); }); hooks.label(); }
async function playDecoded() {
  const s = Radio.list[Radio.idx]; if (!s || s.decoding) return; s.decoding = true; if (Radio.audio) { Radio.audio.pause(); Radio.audio.removeAttribute('src'); } initAudio();
  try { const buf = await Music.ctx.decodeAudioData(await s.blob.arrayBuffer()); if (!Radio.playing || liveSt() !== 'mine' || Radio.list[Radio.idx] !== s) return; const src = Music.ctx.createBufferSource(); src.buffer = buf; const g = Music.ctx.createGain(); g.gain.value = Music.vol; src.connect(g); g.connect(Music.ctx.destination); Radio.srcGain = g; src.onended = () => { if (Radio.src === src) { Radio.src = null; mineNext(1); } }; src.start(); Radio.src = src; }
  catch { hooks.toast('Yeh file nahi chal rahi: ' + s.name, 'bad'); } finally { s.decoding = false; }
}
function stopMine() { if (Radio.audio) Radio.audio.pause(); if (Radio.src) { const s = Radio.src; Radio.src = null; try { s.stop(); } catch {} } }
export function mineNext(d) { if (!Radio.list.length) return; Radio.idx = (Radio.idx + d + Radio.list.length) % Radio.list.length; if (Radio.playing && liveSt() === 'mine') playMine(); hooks.label(); }
export function setVolume(v) { Music.vol = v; if (Radio.audio) Radio.audio.volume = v; if (Radio.live) Radio.live.volume = v; if (Radio.srcGain) Radio.srcGain.gain.value = v; lsSet('gl_vol', v); }
export function restoreRadio() { const v = lsGet('gl_vol'); setVolume(typeof v === 'number' && lsGet('gl_vol_v') === 2 ? clamp(v, 0, 1) : 0.22); lsSet('gl_vol_v', 2); const rs = lsGet('gl_radio'); if (rs && STATIONS.some(x => x.id === rs.st)) Radio.st = rs.st; if (!rs || rs.on !== false) radioOn(); else initAudio(); }
// song files persist in this browser's IndexedDB
function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open('gl_radio', 1); r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function idbTx(mode, fn) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('songs', mode); const q = fn(t.objectStore('songs')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); }
export async function loadSongs() { try { const all = await idbTx('readonly', s => s.getAll()); Radio.list = (all || []).sort((a, b) => a.added - b.added).map(s => ({ id: s.id, name: s.name, blob: s.blob })); } catch {} }
export async function addSongs(files) {
  let n = 0;
  for (const f of files) {
    if (!(f.type || '').startsWith('audio/') && !/\.(mp3|m4a|aac|ogg|oga|wav|opus|webm|flac)$/i.test(f.name)) continue;
    const s = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), name: f.name.replace(/\.[^.]+$/, '').replace(/[\u0000-\u001f]/g, '').slice(0, 60), blob: f, added: Date.now() + n }; Radio.list.push(s); n++;
    try { await idbTx('readwrite', st => st.put({ id: s.id, name: s.name, blob: f, added: s.added })); } catch { s.temp = true; }
  }
  if (!n) { hooks.toast('Audio file nahi mili. MP3, M4A, OGG ya WAV chuno.', 'bad'); return; }
  hooks.toast(n + ' gaane playlist mein add ho gaye', 'money'); if (Radio.st !== 'mine' || !Radio.playing) { Radio.idx = Radio.list.length - n; setStation('mine'); }
}
export async function removeSong(id) {
  const i = Radio.list.findIndex(s => s.id === id); if (i < 0) return; const s = Radio.list[i]; const cur = i === Radio.idx && Radio.st === 'mine'; if (cur) stopMine(); if (s.url) URL.revokeObjectURL(s.url);
  Radio.list.splice(i, 1); if (Radio.idx >= Radio.list.length) Radio.idx = 0; if (i < Radio.idx) Radio.idx--;
  try { await idbTx('readwrite', st => st.delete(id)); } catch {}
  if (!Radio.list.length && Radio.st === 'mine') setStation('har'); else if (cur && Radio.playing) playMine();
}

export function sfx(k, vol = 1) {
  if (!Music.ctx) return; const t = Music.ctx.currentTime, d = Music.sfx; const v = clamp(vol, 0, 1.5);
  if (k === 'cash') { osc('triangle', 1320, t, 0.12, 0.25 * v, d); osc('triangle', 1980, t + 0.08, 0.2, 0.25 * v, d); }
  else if (k === 'punch') { noise(t, 0.12, 0.6 * v, 400, 1, 'lowpass', d); osc('sine', 120, t, 0.12, 0.5 * v, d); }
  else if (k === 'swing') noise(t, 0.1, 0.12, 1500, 1, 'bandpass', d);
  else if (k === 'ko') { const o = osc('sawtooth', 400, t, 0.6, 0.2, d); o.frequency.exponentialRampToValueAtTime(80, t + 0.6); }
  else if (k === 'level') [0, 4, 7, 12].forEach((n, i) => osc('triangle', mtof(72 + n), t + i * 0.09, 0.25, 0.25, d));
  else if (k === 'ok') { osc('triangle', 880, t, 0.1, 0.2, d); osc('triangle', 1320, t + 0.07, 0.12, 0.2, d); }
  else if (k === 'tick') osc('square', 1200, t, 0.04, 0.08, d);
  else if (k === 'err') osc('square', 180, t, 0.18, 0.12, d);
  else if (k === 'horn') { osc('square', 420, t, 0.25, 0.07 * v, d); osc('square', 530, t, 0.25, 0.07 * v, d); }
  else if (k === 'pressure') { for (let i = 0; i < 3; i++) { osc('sawtooth', 620, t + i * 0.18, 0.15, 0.12 * v, d); osc('sawtooth', 830, t + i * 0.18, 0.15, 0.1 * v, d); } }
  else if (k === 'crash') noise(t, 0.3, 0.5, 600, 0.7, 'lowpass', d);
  else if (k === 'eat') { noise(t, 0.05, 0.2, 2000, 2, 'bandpass', d); noise(t + 0.12, 0.05, 0.2, 2200, 2, 'bandpass', d); }
  else if (k === 'engine') { const o = osc('sawtooth', 60, t, 0.5, 0.15, d); o.frequency.exponentialRampToValueAtTime(140, t + 0.4); }
  else if (k === 'moo') { const o = osc('sawtooth', 160, t, 0.9, 0.15, d, 0.1); o.frequency.exponentialRampToValueAtTime(110, t + 0.8); }
  else if (k === 'chat') osc('sine', 990, t, 0.08, 0.12, d);
  else if (k === 'siren') { for (let i = 0; i < 4; i++) { const o = osc('square', 700, t + i * 0.5, 0.45, 0.06, d); o.frequency.linearRampToValueAtTime(1100, t + i * 0.5 + 0.25); o.frequency.linearRampToValueAtTime(700, t + i * 0.5 + 0.45); } }
  else if (k === 'firework') { const o = osc('sine', 300, t, 0.6, 0.08, d); o.frequency.exponentialRampToValueAtTime(1600, t + 0.55); noise(t + 0.6, 0.5, 0.5 * v, 800, 0.5, 'lowpass', d); }
  else if (k === 'cheer') { for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.6, 0.08, 1200 + i * 300, 0.8, 'bandpass', d); }
  else if (k === 'bass') dholBass(t, d, 0.5 * v);
  else if (k === 'thunder') { noise(t, 1.6, 0.5, 120, 0.7, 'lowpass', d); noise(t + 0.15, 1.2, 0.35, 260, 0.8, 'lowpass', d); }
  else if (k === 'beep') osc('square', 660, t, 0.18, 0.12, d);
  else if (k === 'go') { osc('square', 1320, t, 0.45, 0.14, d); osc('square', 990, t, 0.45, 0.08, d); }
  else if (k === 'cp') { osc('triangle', 1175, t, 0.09, 0.18, d); osc('triangle', 1568, t + 0.06, 0.14, 0.18, d); }
  else if (k === 'whoosh') noise(t, 0.35, 0.35, 900, 0.6, 'bandpass', d);
  else if (k === 'nos') { noise(t, 0.9, 0.22, 500, 0.4, 'lowpass', d); const o = osc('sawtooth', 70, t, 0.8, 0.06, d); o.frequency.exponentialRampToValueAtTime(160, t + 0.7); }
  else if (k === 'shutter') { noise(t, 0.04, 0.4, 3000, 1, 'highpass', d); noise(t + 0.07, 0.04, 0.3, 2500, 1, 'highpass', d); }
}

// ---- situation music: a fight theme (drums + low riff) and a dhol bhangra for baraats and dancing.
// Percussion-led on purpose; the radio ducks while one plays and comes back after.
function dholTilli(t, dest, v = 1) { osc('triangle', 430, t, 0.07, 0.22 * v, dest).frequency.exponentialRampToValueAtTime(320, t + 0.05); noise(t, 0.05, 0.22 * v, 2600, 2, 'bandpass', dest); }
function chimta(t, dest, v = 1) { noise(t, 0.1, 0.09 * v, 7200, 5, 'bandpass', dest); osc('square', 3150, t, 0.05, 0.02 * v, dest); }
function clap(t, dest, v = 1) { for (let i = 0; i < 3; i++) noise(t + i * 0.012, 0.06, 0.18 * v, 1500, 1.2, 'bandpass', dest); }
function taiko(t, dest, v = 1) { const o = osc('sine', 120, t, 0.45, 0.9 * v, dest); o.frequency.exponentialRampToValueAtTime(42, t + 0.3); noise(t, 0.08, 0.3 * v, 400, 0.8, 'lowpass', dest); }
function stab(t, midi, dest, v = 1) { const c = Music.ctx; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.25); lp.connect(dest); for (const k of [0, 7, 12]) osc('sawtooth', mtof(midi + k), t, 0.28, 0.07 * v, lp); }
const THEMES = {
  fight: { step: 60 / 142 / 4, len: 32, play(s, t, d) { const b = s % 16; if ([0, 3, 6, 8, 10, 14].includes(b)) taiko(t, d, b === 0 ? 1 : 0.75); if (b === 4 || b === 12) clap(t, d, 1.1); if (b % 2 === 0) noise(t, 0.03, 0.06, 9000, 1, 'highpass', d); const riff = [40, 0, 0, 40, 0, 0, 43, 0, 45, 0, 46, 0, 45, 0, 43, 0]; const n = riff[b]; if (n) { const o = osc('sawtooth', mtof(n - 12), t, 0.16, 0.12, d); o.frequency.setValueAtTime(mtof(n - 12), t); } if (s % 32 === 0) stab(t, 52, d); } },
  bhangra: { step: 60 / 104 / 3, len: 24, play(s, t, d) { const k = s % 12, pos = k % 3, beat = Math.floor(k / 3); if (pos === 0) dholBass(t, d, beat % 2 === 0 ? 0.95 : 0.7); if (pos === 2) dholBass(t, d, 0.5); if (pos === 1 || (pos === 2 && beat === 3)) dholTilli(t, d, pos === 1 ? 1 : 0.7); if (pos === 0 && (beat === 1 || beat === 3)) { chimta(t, d); clap(t, d, 0.7); } if (s % 24 === 21) dholTilli(t + 0.07, d, 0.8); } },
};
const Theme = { cur: null, timer: null, step: 0, next: 0, gain: null };
export function setTheme(id) {
  if (Theme.cur === id) return; Theme.cur = id; if (!Music.ctx) return; const c = Music.ctx;
  if (!Theme.gain) { Theme.gain = c.createGain(); Theme.gain.gain.value = 0; Theme.gain.connect(c.destination); }
  const g = Theme.gain.gain; g.cancelScheduledValues(c.currentTime);
  if (id) {
    g.setTargetAtTime(clamp(Music.vol * 1.6, 0.18, 0.55), c.currentTime, 0.25); Theme.step = 0; Theme.next = c.currentTime + 0.05;
    if (!Theme.timer) Theme.timer = setInterval(() => { const T = THEMES[Theme.cur]; if (!T) return; while (Theme.next < c.currentTime + 0.12) { T.play(Theme.step, Theme.next, Theme.gain); Theme.next += T.step; Theme.step++; } }, 25);
    for (const a of [Radio.live, Radio.audio]) if (a) a.volume = Music.vol * 0.25;
  } else {
    g.setTargetAtTime(0, c.currentTime, 0.35); setTimeout(() => { if (!Theme.cur) { clearInterval(Theme.timer); Theme.timer = null; } }, 1500);
    for (const a of [Radio.live, Radio.audio]) if (a) a.volume = Music.vol;
  }
}

// ---- rain: looping filtered noise whose loudness follows the weather; thunder for heavy rain
const RainS = { src: null, gain: null };
export function setRain(level) {
  if (!Music.ctx) return; const c = Music.ctx;
  if (!RainS.src) {
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    const g = c.createGain(); g.gain.value = 0; src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(c.destination); src.start(); RainS.src = src; RainS.gain = g;
  }
  RainS.gain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.16, c.currentTime, 0.5);
}
export function thunder() { if (!Music.ctx) return; const t = Music.ctx.currentTime; noise(t, 1.6, 0.5, 120, 0.7, 'lowpass', Music.sfx); noise(t + 0.15, 1.2, 0.35, 260, 0.8, 'lowpass', Music.sfx); }
