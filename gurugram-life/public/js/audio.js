// Sound: live Haryanvi, Punjabi, Bollywood and English internet radio (real songs) that plays in vehicles like GTA, with an RJ
// and spoof ads between songs; the player's own song files; city sounds on foot; situation music (fight, chase, bhangra); SFX.
export const hooks = { toast: () => {}, label: () => {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export const Music = { ctx: null, vol: 0.22, sfx: null }; // music starts quiet; the player can turn it up in Radio
export const STATIONS = [
  { id: 'har', name: 'Haryanvi Live', freq: 'LIVE', sub: 'Asli Haryanvi gaane, live internet radio se' },
  { id: 'bol', name: 'Bollywood Live', freq: 'LIVE', sub: 'Bollywood hits, live internet radio se' },
  { id: 'pun', name: 'Punjabi Live', freq: 'LIVE', sub: 'Punjabi aur bhangra hits, live' },
  { id: 'eng', name: 'English Hits Live', freq: 'LIVE', sub: 'Angrezi top hits, pop aur dance, live' },
  { id: 'mine', name: 'Meri Playlist', freq: 'MP3', sub: 'Your own Haryanvi & Punjabi songs' },
];
export const Radio = { carOnly: lsGet('gl_caronly') !== false, street: false, foot: false, st: 'har', playing: false, audio: null, live: null, list: [], idx: 0, src: null, override: null, chans: { har: [], pun: [], bol: [], eng: [] }, ci: { har: 0, pun: 0, bol: 0, eng: 0 }, loading: null, fails: 0 };
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
  const pick = list => list.filter(s => /^https:\/\//.test(s.url_resolved || '') && /mp3|aac/i.test(s.codec || '') && !/gurbani|kirtan|gurdwara|sikh|paath|bhajan|news|talk|christ|church|sport/i.test((s.name || '') + ' ' + (s.tags || ''))).slice(0, 15).map(s => ({ name: String(s.name || 'Live radio').trim().slice(0, 40), url: s.url_resolved }));
  const [h, p, b, bw, hn, t4, pop] = await Promise.all([q('haryanvi'), q('punjabi'), q('bhangra'), q('bollywood'), q('hindi'), q('top 40'), q('pop')]);
  return { har: pick(h), pun: pick([...p, ...b]), bol: pick([...bw, ...hn]), eng: pick([...t4, ...pop].filter(s => /english/i.test(s.language || ''))) };
}
export function loadStations() {
  if (Radio.loading) return Radio.loading;
  Radio.loading = (async () => {
    let d = null; try { const r = await fetch('/api/stations'); if (r.ok) d = await r.json(); } catch {}
    if (!d || !(d.har || []).length && !(d.pun || []).length && !(d.bol || []).length && !(d.eng || []).length) { try { d = await fetchDirect(); } catch {} }
    d = d || {}; Radio.chans.har = d.har || []; Radio.chans.pun = d.pun || []; Radio.chans.bol = d.bol || []; Radio.chans.eng = d.eng || [];
    if (!Radio.chans.har.length) Radio.chans.har = Radio.chans.pun.slice(); // no Haryanvi stream up right now: fall back to Punjabi
    if (!Radio.chans.pun.length) Radio.chans.pun = Radio.chans.har.slice();
    if (!Radio.chans.bol.length) Radio.chans.bol = Radio.chans.har.slice(); // no Bollywood stream up: desi beats it is
    if (!Radio.chans.eng.length) Radio.chans.eng = Radio.chans.bol.slice(); // no English stream up: Bollywood instead
    const saved = lsGet('gl_chan'); if (saved) for (const k of ['har', 'pun', 'bol', 'eng']) { const i = Radio.chans[k].findIndex(c => c.url === saved[k]); if (i >= 0) Radio.ci[k] = i; }
    return Radio.chans;
  })();
  Radio.loading.then(c => { if (!c.har.length && !c.bol.length) Radio.loading = null; }); // retry later if nothing came back
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
  const st = liveSt(); hooks.label(); if (Radio.street) return; await loadStations(); if (!Radio.playing || Radio.street || liveSt() !== st) return;
  const L = Radio.chans[st]; if (!L.length) { Radio.playing = false; hooks.label(); hooks.toast('Live radio nahi mila. Radio mein apne gaane add kar sakte ho.', 'bad'); return; }
  const ch = L[Radio.ci[st] % L.length]; const a = liveAudio(); a.src = ch.url; a.volume = radioVol();
  clearTimeout(Radio.stallT); Radio.stallT = setTimeout(() => { if (a.paused || a.readyState < 3) a.dispatchEvent(new Event('error')); }, 12000);
  const p = a.play(); if (p && p.catch) p.catch(e => { if (e && e.name === 'NotAllowedError') { Radio.blocked = true; clearTimeout(Radio.stallT); hooks.label(); } else if (e && e.name !== 'AbortError') a.dispatchEvent(new Event('error')); });
  lsSet('gl_chan', { har: (Radio.chans.har[Radio.ci.har] || {}).url, pun: (Radio.chans.pun[Radio.ci.pun] || {}).url, bol: (Radio.chans.bol[Radio.ci.bol] || {}).url, eng: (Radio.chans.eng[Radio.ci.eng] || {}).url });
}
function stopLive() { clearTimeout(Radio.stallT); if (Radio.live) { Radio.live.pause(); Radio.live.removeAttribute('src'); Radio.live.load(); } }
export function nextChannel(d, auto) { const st = liveSt(); if (st === 'mine') return mineNext(d); const n = Radio.chans[st].length; if (!n) return; Radio.ci[st] = (Radio.ci[st] + d + n) % n; if (!auto) Radio.fails = 0; if (Radio.playing) playLive(); hooks.label(); }
export function channelList() { const st = liveSt(); return st === 'mine' ? [] : Radio.chans[st]; }
export function playChannel(i) { const st = liveSt(); Radio.ci[st] = i; Radio.fails = 0; if (!Radio.playing) radioOn(); else playLive(); hooks.label(); }
export function liveLoading() { const st = liveSt(); return st !== 'mine' && Radio.playing && Radio.live && (Radio.live.paused || Radio.live.readyState < 3); }
function activeSt() { return Radio.override || Radio.st; }
export function nowPlaying() { const s = liveSt(); if (s === 'mine') return (Radio.list[Radio.idx] || {}).name || ''; const L = Radio.chans[s]; return L.length ? L[Radio.ci[s] % L.length].name : 'Tuning…'; }
export function radioOn() { initAudio(); if (Radio.st === 'mine' && !Radio.list.length) Radio.st = 'har'; Radio.playing = true; if (Radio.street) { hooks.label(); lsSet('gl_radio', { on: true, st: Radio.st }); return; } if (liveSt() === 'mine') { stopLive(); playMine(); } else { stopMine(); playLive(); } hooks.label(); lsSet('gl_radio', { on: true, st: Radio.st }); }
export function radioOff() { Radio.playing = false; stopLive(); stopMine(); hooks.label(); lsSet('gl_radio', { on: false, st: Radio.st }); }
export function toggleMusic() { if (Radio.playing) radioOff(); else radioOn(); }
export function setStation(id) { if (id === 'mine' && !Radio.list.length) { hooks.toast('Pehle apne gaane add kar (Radio → Meri Playlist)'); return; } stopLive(); stopMine(); Radio.st = id; Radio.fails = 0; radioOn(); }
// The station that goes with the player's language; switches now if the radio is on, else remembers it for next time.
export function preferStation(id) { if (!STATIONS.some(s => s.id === id) || Radio.st === id) return; if (Radio.playing && !Radio.override) setStation(id); else { Radio.st = id; const rs = lsGet('gl_radio'); lsSet('gl_radio', { on: rs ? rs.on !== false : true, st: id }); } }
export function nextStation() { const ids = STATIONS.map(s => s.id).filter(id => id !== 'mine' || Radio.list.length); const i = ids.indexOf(Radio.st); setStation(ids[(i + 1) % ids.length]); }
// The club plays Punjabi live while you are inside, then hands back to your station.
export function setOverride(st) { if (Radio.override === st) return; const before = liveSt(); Radio.override = st; if (Radio.street !== streetMute()) return setOnFoot(Radio.foot); if (!Radio.playing || liveSt() === before) return; stopLive(); stopMine(); if (liveSt() === 'mine') playMine(); else playLive(); hooks.label(); }
export function skipTrack(d) { nextChannel(d); }
function mineAudio() { if (!Radio.audio) { const a = new Audio(); a.preload = 'auto'; a.addEventListener('ended', () => mineNext(1)); a.addEventListener('error', () => { if (Radio.playing && liveSt() === 'mine' && a.getAttribute('src')) playDecoded(); }); Radio.audio = a; } return Radio.audio; }
export function playMine() { const s = Radio.list[Radio.idx]; if (!s || Radio.street) return; stopMine(); const a = mineAudio(); if (!s.url) s.url = URL.createObjectURL(s.blob); a.src = s.url; a.volume = radioVol(); const p = a.play(); if (p && p.catch) p.catch(e => { if (e && e.name !== 'AbortError') playDecoded(); }); hooks.label(); }
async function playDecoded() {
  const s = Radio.list[Radio.idx]; if (!s || s.decoding) return; s.decoding = true; if (Radio.audio) { Radio.audio.pause(); Radio.audio.removeAttribute('src'); } initAudio();
  try { const buf = await Music.ctx.decodeAudioData(await s.blob.arrayBuffer()); if (!Radio.playing || Radio.street || liveSt() !== 'mine' || Radio.list[Radio.idx] !== s) return; const src = Music.ctx.createBufferSource(); src.buffer = buf; const g = Music.ctx.createGain(); g.gain.value = Music.vol; src.connect(g); g.connect(Music.ctx.destination); Radio.srcGain = g; src.onended = () => { if (Radio.src === src) { Radio.src = null; mineNext(1); } }; src.start(); Radio.src = src; }
  catch { hooks.toast('Yeh file nahi chal rahi: ' + s.name, 'bad'); } finally { s.decoding = false; }
}
function stopMine() { if (Radio.audio) Radio.audio.pause(); if (Radio.src) { const s = Radio.src; Radio.src = null; try { s.stop(); } catch {} } }
export function mineNext(d) { if (!Radio.list.length) return; Radio.idx = (Radio.idx + d + Radio.list.length) % Radio.list.length; if (Radio.playing && liveSt() === 'mine') playMine(); hooks.label(); }
export function setVolume(v) { Music.vol = v; if (Radio.audio) Radio.audio.volume = radioVol(); if (Radio.live) Radio.live.volume = radioVol(); if (Radio.srcGain) Radio.srcGain.gain.value = v; lsSet('gl_vol', v); }
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
  else if (k === 'punch') { noise(t, 0.1, 0.3 * v, 320, 1, 'lowpass', d); osc('sine', 95, t, 0.12, 0.28 * v, d); } // a low, soft thud
  else if (k === 'step') { noise(t, 0.05, 0.05 * v, 150 + Math.random() * 80, 1, 'lowpass', d); noise(t, 0.02, 0.012 * v, 2400, 1.5, 'bandpass', d); } // barely-there footsteps
  else if (k === 'stepwet') { noise(t, 0.08, 0.04 * v, 1700 + Math.random() * 400, 1.2, 'bandpass', d); noise(t, 0.05, 0.03 * v, 200, 1, 'lowpass', d); }
  else if (k === 'swing') noise(t, 0.1, 0.12, 1500, 1, 'bandpass', d);
  else if (k === 'ko') { noise(t, 0.18, 0.45, 260, 1, 'lowpass', d); const o = osc('sine', 80, t, 0.3, 0.35, d); o.frequency.exponentialRampToValueAtTime(45, t + 0.25); } // a body hitting the ground (the groan is a real voice)
  else if (k === 'level') [0, 4, 7, 12].forEach((n, i) => osc('triangle', mtof(72 + n), t + i * 0.09, 0.25, 0.25, d));
  else if (k === 'ok') { osc('triangle', 880, t, 0.1, 0.2, d); osc('triangle', 1320, t + 0.07, 0.12, 0.2, d); }
  else if (k === 'tick') osc('square', 1200, t, 0.04, 0.08, d);
  else if (k === 'err') osc('square', 180, t, 0.18, 0.12, d);
  else if (k === 'horn') { osc('square', 420, t, 0.25, 0.07 * v, d); osc('square', 530, t, 0.25, 0.07 * v, d); }
  else if (k === 'pressure') { for (let i = 0; i < 3; i++) { osc('sawtooth', 620, t + i * 0.18, 0.15, 0.12 * v, d); osc('sawtooth', 830, t + i * 0.18, 0.15, 0.1 * v, d); } }
  else if (k === 'crash') noise(t, 0.3, 0.5, 600, 0.7, 'lowpass', d);
  else if (k === 'eat') { noise(t, 0.05, 0.2, 2000, 2, 'bandpass', d); noise(t + 0.12, 0.05, 0.2, 2200, 2, 'bandpass', d); }
  else if (k === 'engine') { const o = osc('sawtooth', 60, t, 0.5, 0.15, d); o.frequency.exponentialRampToValueAtTime(140, t + 0.4); }
  else if (k === 'bark') for (const o of [0, 0.2]) { noise(t + o, 0.07, 0.35, 900, 2, 'bandpass', d); const b = osc('sawtooth', 340, t + o, 0.1, 0.1, d); b.frequency.exponentialRampToValueAtTime(210, t + o + 0.09); }
  else if (k === 'yelp') { const b = osc('triangle', 900, t, 0.22, 0.12, d); b.frequency.exponentialRampToValueAtTime(1500, t + 0.06); b.frequency.exponentialRampToValueAtTime(700, t + 0.2); }
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
  // police chase: a pulsing bass that is always there, drums from mid intensity, siren-like stabs and fills when they're on your bumper
  chase: { step: 60 / 150 / 4, len: 64, play(s, t, d) { const k = Theme.int, b = s % 16, bar = Math.floor(s / 16) % 4, root = [40, 36, 38, 35][bar];
    if (b % 2 === 0) { const o = osc('sawtooth', mtof(root - 12), t, 0.09, 0.09 + 0.05 * k, d); o.frequency.setValueAtTime(mtof(root - 12 + (b % 8 === 6 ? 12 : 0)), t); }
    noise(t, 0.025, b % 4 === 2 ? 0.07 : 0.035, 9000, 1, 'highpass', d);
    if (k > 0.35) { if (b === 0 || b === 8 || (k > 0.7 && b === 11)) taiko(t, d, 0.6 + 0.4 * k); if (b === 4 || b === 12) clap(t, d, 0.8 + 0.4 * k); }
    if (k > 0.65) { if (b % 8 === 0) { const o = osc('square', mtof(root + 24), t, 0.22, 0.035, d); o.frequency.linearRampToValueAtTime(mtof(root + 31), t + 0.2); } if (bar === 3 && b >= 12) taiko(t, d, 0.5); }
    if (s % 64 === 0) stab(t, root + 12, d, 0.6 + 0.4 * k); } },
  bhangra: { step: 60 / 104 / 3, len: 24, play(s, t, d) { const k = s % 12, pos = k % 3, beat = Math.floor(k / 3); if (pos === 0) dholBass(t, d, beat % 2 === 0 ? 0.95 : 0.7); if (pos === 2) dholBass(t, d, 0.5); if (pos === 1 || (pos === 2 && beat === 3)) dholTilli(t, d, pos === 1 ? 1 : 0.7); if (pos === 0 && (beat === 1 || beat === 3)) { chimta(t, d); clap(t, d, 0.7); } if (s % 24 === 21) dholTilli(t + 0.07, d, 0.8); } },
};
const Theme = { cur: null, timer: null, step: 0, next: 0, gain: null, int: 0.5 };
const themeLevel = () => Theme.cur ? clamp(Music.vol * 1.6, 0.18, 0.55) * (Theme.cur === 'chase' ? 0.8 : 1) : 0;
export function setTheme(id, k) {
  if (k !== undefined) Theme.int += (k - Theme.int) * 0.08; // intensity eases toward the target (called every frame)
  if (Theme.cur === id) return; Theme.cur = id; if (id && k !== undefined) Theme.int = Math.min(k, 0.4); if (!Music.ctx) return; const c = Music.ctx;
  if (!Theme.gain) { Theme.gain = c.createGain(); Theme.gain.gain.value = 0; Theme.gain.connect(c.destination); }
  const g = Theme.gain.gain; g.cancelScheduledValues(c.currentTime);
  if (id) {
    g.setTargetAtTime(themeLevel() * (VOX.live.length ? 0.4 : 1), c.currentTime, 0.25); Theme.step = 0; Theme.next = c.currentTime + 0.05;
    if (!Theme.timer) Theme.timer = setInterval(() => { const T = THEMES[Theme.cur]; if (!T) return; while (Theme.next < c.currentTime + 0.12) { T.play(Theme.step, Theme.next, Theme.gain); Theme.next += T.step; Theme.step++; } }, 25);
    for (const a of [Radio.live, Radio.audio]) if (a) a.volume = radioVol();
  } else {
    g.setTargetAtTime(0, c.currentTime, 0.35); setTimeout(() => { if (!Theme.cur) { clearInterval(Theme.timer); Theme.timer = null; } }, 1500);
    for (const a of [Radio.live, Radio.audio]) if (a) a.volume = radioVol();
  }
}

// ---- rain: looping filtered noise whose loudness follows the weather; thunder for heavy rain
const RainS = { src: null, gain: null };
export function setRain(level) {
  if (!Music.ctx) return; const c = Music.ctx;
  if (!RainS.src) {
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    const g = c.createGain(); g.gain.value = 0; src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(c.destination); src.start(); RainS.src = src; RainS.gain = g;
  }
  const radioOn = [Radio.live, Radio.audio].some(a => a && !a.paused); // a soft hiss; even softer under the radio so songs stay clear
  RainS.gain.gain.setTargetAtTime(clamp(level, 0, 1) * (radioOn ? 0.035 : 0.07), c.currentTime, 0.5);
}
export function thunder() { if (!Music.ctx) return; const t = Music.ctx.currentTime; noise(t, 1.6, 0.5, 120, 0.7, 'lowpass', Music.sfx); noise(t + 0.15, 1.2, 0.35, 260, 0.8, 'lowpass', Music.sfx); }

// ---- GTA-style radio: it plays in vehicles (and indoors); walking the streets you hear the city instead
const radioVol = () => Music.vol * (Theme.cur ? 0.25 : 1) * (RJ.on ? 0.18 : 1);
const streetMute = () => Radio.carOnly && Radio.foot && !Radio.override;
export function setOnFoot(onFoot) {
  Radio.foot = onFoot; const mute = streetMute(); if (mute === Radio.street) return; Radio.street = mute;
  if (Radio.playing) { if (mute) { stopLive(); stopMine(); rjStop(); } else { if (liveSt() === 'mine') playMine(); else playLive(); if (Math.random() < 0.4) rjSoon(5); } } // sometimes the RJ greets you as you get in
  hooks.label();
}
export function setCarOnly(on) { Radio.carOnly = on; lsSet('gl_caronly', on); setOnFoot(Radio.foot); }

const CLIP_VER = 3; // bump when the RJ/ad/vendor clips are regenerated under the same names (browsers cache /audio for a week)
// ---- the RJ: station idents, spoof ads for the game's own businesses and a few jokes, talked over the song every few minutes
const RJ = { on: false, el: null, next: performance.now() / 1000 + 75, recent: [], line: '' };
const RJ_LINES = { desi: ['rj_id1', 'rj_id2', 'rj_id3', 'rj_id4', 'rj_wx', 'rj_sig'], ads: ['ad_motors', 'ad_sweets', 'ad_estate', 'ad_food', 'ad_gold', 'ad_police', 'ad_metro', 'ad_chaat', 'ad_ride'], eng: ['en_id1', 'en_id2', 'en_id3', 'en_ad1', 'en_ad2', 'en_ad3'] };
export const rjLine = () => RJ.on ? RJ.line : '';
export function rjSoon(sec) { RJ.next = Math.min(RJ.next, performance.now() / 1000 + sec); }
function rjPick(st) { const pool = st === 'eng' ? RJ_LINES.eng : Math.random() < 0.45 ? RJ_LINES.desi : RJ_LINES.ads; const ok = pool.filter(k => !RJ.recent.includes(k)); const k = (ok.length ? ok : pool)[Math.floor(Math.random() * (ok.length || pool.length))]; RJ.recent = [k, ...RJ.recent].slice(0, 8); return k; }
function rjStop() { if (RJ.el) { RJ.el.pause(); RJ.el = null; } if (RJ.on) { RJ.on = false; for (const a of [Radio.live, Radio.audio]) if (a) a.volume = radioVol(); hooks.label(); } }
function rjTick() {
  const t = performance.now() / 1000, st = liveSt(), a = Radio.live;
  if (RJ.on || t < RJ.next || !Radio.playing || Radio.street || Theme.cur || st === 'mine' || Radio.override || !a || a.paused || a.readyState < 3) return;
  const k = rjPick(st), el = new Audio('/audio/' + k + '.mp3?v=' + CLIP_VER); RJ.el = el; RJ.on = true; RJ.line = k.includes('ad') ? 'Ad break' : 'RJ on air'; a.volume = radioVol(); hooks.label();
  el.volume = clamp(Music.vol * 2.4, 0.3, 1); const done = () => { if (RJ.el !== el) return; RJ.el = null; RJ.next = performance.now() / 1000 + 200 + Math.random() * 160; rjStop(); };
  el.addEventListener('ended', done); el.addEventListener('error', done); const p = el.play(); if (p && p.catch) p.catch(done);
}
setInterval(rjTick, 1000);

// ---- city sounds on foot: traffic rumble and horns near roads, autos passing, crows, koels, sparrows and crickets, crowd murmur
// and vendors calling in markets, bells near temples. Everything but the vendors' voices is synthesised.
const City = { bus: null, rumble: null, murmur: null, crick: null, last: 0, on: lsGet('gl_city') !== false, mix: null, recentV: [] };
const VENDORS = ['v_sabzi', 'v_bhutte', 'v_chai', 'v_kabadi', 'v_golgappe', 'v_kele', 'v_side'];
export const citySoundsOn = () => City.on;
export function setCitySounds(on) { City.on = on; lsSet('gl_city', on); }
function loopNoise(c, color) { const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = color === 'brown' ? (last + 0.02 * w) / 1.02 : w; d[i] = color === 'brown' ? last * 3.5 : w; } const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
function cityInit() {
  const c = Music.ctx; City.bus = c.createGain(); City.bus.gain.value = 0; City.bus.connect(c.destination);
  const chain = (src, nodes) => { let n = src; for (const x of nodes) { n.connect(x); n = x; } const g = c.createGain(); g.gain.value = 0; n.connect(g); g.connect(City.bus); return g; };
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; City.rumble = chain(loopNoise(c, 'brown'), [lp]);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7; City.murmur = chain(loopNoise(c, 'white'), [bp]);
  const co = c.createOscillator(); co.frequency.value = 4400; const am = c.createGain(); am.gain.value = 0; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 28; const lg = c.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); co.connect(am); co.start(); lfo.start(); City.crick = chain(am, []);
}
function panned(v) { const c = Music.ctx, p = c.createStereoPanner ? c.createStereoPanner() : c.createGain(); if (p.pan) p.pan.value = Math.random() * 1.6 - 0.8; const g = c.createGain(); g.gain.value = v; g.connect(p); p.connect(City.bus); return g; }
const C_EV = {
  horn(t) { const d = panned(0.25 + Math.random() * 0.4), r = Math.random(); if (r < 0.15) sfx('pressure', 0.4); else if (r < 0.5) { for (let i = 0; i < (Math.random() < 0.5 ? 1 : 2); i++) { osc('square', 980, t + i * 0.16, 0.1, 0.05, d); osc('square', 1180, t + i * 0.16, 0.1, 0.04, d); } } else { const f = 380 + Math.random() * 140; osc('square', f, t, 0.3 + Math.random() * 0.4, 0.06, d); osc('square', f * 1.26, t, 0.3, 0.05, d); } },
  auto(t) { const d = panned(0.5), g = Music.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8); g.connect(d); for (let i = 0; i < 60; i++) noise(t + i * 0.045, 0.03, 0.18, 220, 1.5, 'bandpass', g); },
  crow(t) { const d = panned(0.3 + Math.random() * 0.3); for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) { const c = Music.ctx, f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 2.5; f.connect(d); const o = osc('sawtooth', 640, t + i * 0.42, 0.26, 0.2, f, 0.02); o.frequency.exponentialRampToValueAtTime(480, t + i * 0.42 + 0.25); } },
  koel(t) { const d = panned(0.2); for (let i = 0; i < 3; i++) { const s = t + i * 0.9, o = osc('sine', 700 + i * 90, s, 0.5, 0.12, d, 0.08); o.frequency.exponentialRampToValueAtTime(1100 + i * 120, s + 0.4); } },
  sparrow(t) { const d = panned(0.25); for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) { const o = osc('sine', 3600 + Math.random() * 1500, t + i * 0.09, 0.05, 0.05, d); o.frequency.exponentialRampToValueAtTime(2800, t + i * 0.09 + 0.05); } },
  bell(t) { const d = panned(0.3); for (const [m, a] of [[1, 0.12], [2.76, 0.06], [5.4, 0.03], [8.93, 0.015]]) osc('sine', 520 * m, t, 2.6 / Math.sqrt(m), a, d, 0.003); },
  vendor() { const ok = VENDORS.filter(k => !City.recentV.includes(k)); const k = ok[Math.floor(Math.random() * ok.length)]; City.recentV = [k, ...City.recentV].slice(0, 4); const el = new Audio('/audio/' + k + '.mp3?v=' + CLIP_VER); el.volume = 0.25 + Math.random() * 0.3; try { const src = Music.ctx.createMediaElementSource(el); src.connect(panned(1)); } catch {} el.play().catch(() => {}); },
};
// mix = { out, veh, traffic, nature, market, temple, night } (0..1), from the game a few times a second
export function setCity(m) {
  if (!Music.ctx) return; if (!City.bus) cityInit(); const c = Music.ctx, t = c.currentTime, on = City.on && m.out;
  City.bus.gain.setTargetAtTime(on ? 1.6 * (Theme.cur ? 0.5 : 1) * (m.veh ? 0.55 : 1) : 0, t, 0.6);
  City.rumble.gain.setTargetAtTime(0.09 * m.traffic, t, 0.8); City.crick.gain.setTargetAtTime(0.01 * m.night * (0.4 + m.nature), t, 1);
  City.murmur.gain.setTargetAtTime(0.03 * m.market * (0.6 + Math.random() * 0.6) * (1 - 0.6 * m.night), t, 0.3);
  const dt = Math.min(1, c.currentTime - (City.last || c.currentTime)); City.last = c.currentTime; if (!on || !dt) return;
  const roll = (rate, ev) => { if (Math.random() < rate * dt) C_EV[ev](t + Math.random() * 0.2); }, day = 1 - m.night;
  roll(0.45 * m.traffic * (0.5 + 0.5 * day), 'horn'); roll(0.05 * m.traffic, 'auto'); roll((0.1 * m.nature + 0.03 * m.market) * day, 'crow'); roll(0.025 * m.nature * day, 'koel');
  roll(0.25 * m.nature * day, 'sparrow'); roll(0.07 * m.temple + 0.003, 'bell'); if (!m.veh) roll(0.05 * m.market * (0.3 + 0.7 * day), 'vendor');
}

// ---- stingers when a chase ends: you got away, or you got caught
export function stinger(kind) { if (!Music.ctx) return; const t = Music.ctx.currentTime, d = Music.sfx;
  if (kind === 'escape') [0, 4, 7, 12, 16].forEach((n, i) => osc('triangle', mtof(64 + n), t + i * 0.08, 0.6, 0.16, d));
  else [12, 8, 5, 0].forEach((n, i) => osc('sawtooth', mtof(50 + n), t + i * 0.22, 0.4, 0.07, d)); }

// ---- spoken NPC lines: decoded once and cached, panned to where the speaker stands, quieter with distance.
// One line per speaker at a time and at most three at once, so a big fight doesn't turn into noise.
const VOX = { cache: new Map(), live: [] };
async function voxBuf(url) { if (!VOX.cache.has(url)) VOX.cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => Music.ctx.decodeAudioData(b))); return VOX.cache.get(url); }
export async function voice(url, who, vol, pan, rate) {
  if (!Music.ctx) return false; const c = Music.ctx;
  for (const v of VOX.live.filter(v => v.who === who)) { try { v.src.stop(); } catch {} }
  VOX.live = VOX.live.filter(v => v.who !== who); if (VOX.live.length >= 3) return true; // busy: this line is skipped, not shown as text
  let buf; try { buf = await voxBuf(url); } catch { VOX.cache.delete(url); return false; }
  const src = c.createBufferSource(); src.buffer = buf; if (rate) src.playbackRate.value = rate; const g = c.createGain(); g.gain.value = clamp(vol, 0, 1) * 1.7;
  const p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) { p.pan.value = clamp(pan, -0.85, 0.85); src.connect(p); p.connect(g); } else src.connect(g);
  g.connect(Music.sfx); const v = { src, who }; VOX.live.push(v); themeDuck(); src.onended = () => { VOX.live = VOX.live.filter(x => x !== v); themeDuck(); }; src.start(); return true;
}

// fight / chase music dips while someone is talking so the words come through
function themeDuck() { if (!Theme.gain || !Theme.cur) return; Theme.gain.gain.setTargetAtTime(themeLevel() * (VOX.live.length ? 0.4 : 1), Music.ctx.currentTime, 0.08); }

// ---- phones only let a page make sound after a tap: unlock (and retry the radio) on every tap until sound is running
export function unlock() {
  initAudio(); const c = Music.ctx; if (!c) return;
  if (c.state !== 'running') { c.resume().catch(() => {}); try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); } catch {} }
  if (Radio.blocked && Radio.playing && !Radio.street) { Radio.blocked = false; if (liveSt() === 'mine') playMine(); else playLive(); }
}
export const audioRunning = () => !!Music.ctx && Music.ctx.state === 'running';
