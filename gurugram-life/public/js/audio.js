// Sound: original procedural desi FM stations (dhol, tumbi, algoza), the player's own song files, and SFX.
export const hooks = { toast: () => {}, label: () => {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export const Music = { ctx: null, on: false, ti: 0, vol: 0.55, step: 0, next: 0, timer: null, drone: null, master: null, sfx: null };
export const TRACKS = [
  { name: 'Desi Dhamaal', sub: 'Haryanvi beat', bpm: 104, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], lead: 'tumbi', bass: [0, 3, 8, 11], tilli: [2, 6, 10, 12, 14], chimta: [4, 12], seed: 7, st: 'har' },
  { name: 'Dhol Di Dhamak', sub: 'Punjabi bhangra', bpm: 112, root: 62, scale: [0, 2, 4, 5, 7, 9, 10], lead: 'tumbi', bass: [0, 3, 6, 8, 11, 14], tilli: [2, 5, 10, 13], chimta: [4, 12], seed: 21, st: 'pun' },
  { name: 'Ragini Raat', sub: 'Haryanvi folk', bpm: 90, root: 55, scale: [0, 1, 4, 5, 7, 8, 10], lead: 'flute', bass: [0, 7, 8], tilli: [4, 10, 12, 15], chimta: [8], seed: 33, st: 'har' },
  { name: 'Gabru Express', sub: 'Punjabi pop', bpm: 120, root: 60, scale: [0, 2, 4, 7, 9], lead: 'tumbi', bass: [0, 4, 8, 10, 12], tilli: [2, 6, 14], chimta: [4, 12], seed: 48, st: 'pun' },
  { name: 'Chaupal Beats', sub: 'Haryanvi swag', bpm: 98, root: 58, scale: [0, 3, 5, 7, 10], lead: 'flute', bass: [0, 6, 8, 14], tilli: [3, 7, 11, 15], chimta: [4, 12], seed: 61, st: 'har' },
  { name: 'Jhoti Jhankaar', sub: 'Haryanvi dance', bpm: 100, root: 56, scale: [0, 2, 3, 7, 8], lead: 'tumbi', bass: [0, 3, 8, 10, 14], tilli: [2, 6, 11, 13], chimta: [4, 12], seed: 104, st: 'har' },
  { name: 'Tractor Te Gabru', sub: 'Punjabi bhangra', bpm: 116, root: 59, scale: [0, 2, 4, 7, 9], lead: 'tumbi', bass: [0, 3, 6, 10, 12], tilli: [2, 8, 14], chimta: [4, 12], seed: 77, st: 'pun' },
  { name: 'Lohri Di Raat', sub: 'Punjabi folk', bpm: 106, root: 64, scale: [0, 2, 4, 5, 7, 9, 11], lead: 'flute', bass: [0, 3, 8, 11], tilli: [2, 6, 10, 14], chimta: [4, 12], seed: 90, st: 'pun' },
  { name: 'Club Dhamaka', sub: 'Desi club mix', bpm: 124, root: 57, scale: [0, 3, 5, 7, 10], lead: 'tumbi', bass: [0, 4, 8, 12], tilli: [2, 6, 10, 14], chimta: [4, 12], seed: 133, st: 'club' },
];
export const STATIONS = [
  { id: 'har', name: 'Haryanvi Dhamaal FM', freq: '98.3', sub: 'Desi beats, Haryana approved' },
  { id: 'pun', name: 'Punjabi Bhangra FM', freq: '104.8', sub: 'Dhol, tumbi, full bhangra' },
  { id: 'mine', name: 'Meri Playlist', freq: 'MP3', sub: 'Your own Haryanvi & Punjabi songs' },
];
const JINGLES = { har: 'Ram Ram Gurugram! Tu sun rya se 98.3 Haryanvi Dhamaal FM', pun: 'Sat Sri Akal ji! Tuned in to 104.8 Punjabi Bhangra FM', mine: 'Meri Playlist: tere apne gaane', club: 'Neon Nights DJ: Club Dhamaka' };
export const Radio = { st: 'har', playing: false, audio: null, list: [], idx: 0, src: null, override: null };

function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function buildMelody(tr) {
  const R = seeded(tr.seed); const rA = [0, 2, 3, 6, 8, 10, 11, 14], rB = [0, 3, 4, 6, 8, 12, 14];
  const mk = (rh, start) => { const n = []; let deg = start; for (let s = 0; s < 32; s++) { const b = s % 16; if ((s < 16 ? rh : rB).includes(b) && R() < 0.92) { deg += Math.round((R() - 0.5) * 3); deg = clamp(deg, -2, 9); n.push(deg); } else n.push(null); } return n; };
  const A = mk(rA, 2), B = mk(rB, 4); const A2 = A.map((d, i) => (i >= 24 && d != null ? 0 : d)); tr.mel = [...A, ...B, ...A, ...A2];
}
TRACKS.forEach(buildMelody);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function noteOf(tr, deg, oct) { const n = tr.scale.length; const o = Math.floor(deg / n); const i = ((deg % n) + n) % n; return mtof(tr.root + tr.scale[i] + 12 * (o + (oct || 0))); }
let NOISE = null;
export function initAudio() {
  if (Music.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  Music.ctx = new C(); Music.master = Music.ctx.createGain(); Music.master.gain.value = Music.vol; Music.master.connect(Music.ctx.destination);
  Music.sfx = Music.ctx.createGain(); Music.sfx.gain.value = 0.7; Music.sfx.connect(Music.ctx.destination);
  const len = Music.ctx.sampleRate * 0.5; NOISE = Music.ctx.createBuffer(1, len, Music.ctx.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function osc(type, f, t, dur, peak, dest, a) { const c = Music.ctx; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); env(g, t, a || 0.005, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
function noise(t, dur, peak, freq, q, type, dest) { const c = Music.ctx; const s = c.createBufferSource(); s.buffer = NOISE; const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; const g = c.createGain(); env(g, t, 0.002, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05); }
function dholBass(t, dest, v = 0.9) { const o = osc('sine', 95, t, 0.38, v, dest); o.frequency.exponentialRampToValueAtTime(48, t + 0.25); noise(t, 0.05, 0.25 * v, 300, 1, 'lowpass', dest); }
function dholTilli(t, dest) { osc('triangle', 420, t, 0.08, 0.28, dest).frequency.exponentialRampToValueAtTime(300, t + 0.06); noise(t, 0.06, 0.3, 2600, 2, 'bandpass', dest); }
function chimta(t, dest) { noise(t, 0.12, 0.12, 7000, 4, 'bandpass', dest); osc('square', 3100, t, 0.06, 0.03, dest); }
function tumbi(t, f, dest) { const c = Music.ctx; const o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(); o.type = 'square'; o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035); bp.type = 'bandpass'; bp.frequency.value = f * 2.5; bp.Q.value = 3; env(g, t, 0.002, 0.32, 0.22); o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3); }
function flute(t, f, dur, dest) { const c = Music.ctx; const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'sine'; o.frequency.value = f; l.frequency.value = 5.5; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.05); g.gain.setValueAtTime(0.2, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05); osc('triangle', f * 2, t, dur * 0.8, 0.03, dest, 0.05); }
function bassNote(t, f, dest) { osc('triangle', f, t, 0.3, 0.35, dest); }
function playStep(st, t) {
  const tr = TRACKS[Music.ti]; const s = st % 16, bar = Math.floor(st / 16) % 8; const dest = Music.master;
  if (tr.bass.includes(s)) dholBass(t, dest); if (tr.tilli.includes(s)) dholTilli(t, dest); if (tr.chimta.includes(s)) chimta(t, dest);
  if (s % 2 === 1 && Math.random() < 0.4) noise(t, 0.03, 0.05, 9000, 1, 'highpass', dest);
  if (s === 0 || s === 8) bassNote(t, noteOf(tr, bar % 4 === 3 ? 4 : 0, -2), dest);
  const deg = tr.mel[((bar % 8) * 16 + s) % tr.mel.length];
  if (deg != null && bar >= 1) { const f = noteOf(tr, deg, 0); if (tr.lead === 'tumbi') tumbi(t, f * 2, dest); else flute(t, f * 2, 60 / tr.bpm * 0.5, dest); }
  if (tr.lead === 'tumbi' && bar >= 4 && (s === 0 || s === 6 || s === 12) && deg == null) tumbi(t, noteOf(tr, 7, 0) * 2, dest);
}
function startDrone() { stopDrone(); const tr = TRACKS[Music.ti]; const c = Music.ctx; const g = c.createGain(); g.gain.value = 0.05; g.connect(Music.master); const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = mtof(tr.root - 24); o2.frequency.value = mtof(tr.root - 17); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o1.connect(lp); o2.connect(lp); lp.connect(g); o1.start(); o2.start(); Music.drone = [o1, o2, g]; }
function stopDrone() { if (Music.drone) { try { Music.drone[0].stop(); Music.drone[1].stop(); } catch {} Music.drone = null; } }
function activeSt() { return Radio.override || Radio.st; }
export function stTracks() { const s = activeSt(); return TRACKS.map((t, i) => i).filter(i => TRACKS[i].st === s); }
function musicTick() {
  const c = Music.ctx; const tr = TRACKS[Music.ti]; const stepDur = 60 / tr.bpm / 4;
  while (Music.next < c.currentTime + 0.12) {
    playStep(Music.step, Music.next); Music.next += stepDur; Music.step++;
    if (Music.step >= 16 * 8 * 3) { Music.step = 0; const L = stTracks(); Music.ti = L[(L.indexOf(Music.ti) + 1) % L.length]; startDrone(); hooks.label(); hooks.toast('Now playing: ' + TRACKS[Music.ti].name); }
  }
}
function procOn() { initAudio(); if (!Music.ctx) return; Music.ctx.resume(); if (Music.on) return; const L = stTracks(); if (!L.includes(Music.ti)) Music.ti = L[0]; Music.on = true; Music.next = Music.ctx.currentTime + 0.1; Music.step = 0; startDrone(); Music.timer = setInterval(musicTick, 30); }
function procOff() { Music.on = false; clearInterval(Music.timer); stopDrone(); }
export function nowPlaying() { const s = activeSt(); return s === 'mine' ? ((Radio.list[Radio.idx] || {}).name || '') : TRACKS[Music.ti].name; }
export function radioOn() { initAudio(); if (Radio.st === 'mine' && !Radio.list.length) Radio.st = 'har'; Radio.playing = true; if (activeSt() === 'mine') { procOff(); playMine(); } else { stopMine(); procOn(); } hooks.label(); lsSet('gl_radio', { on: true, st: Radio.st }); }
export function radioOff() { Radio.playing = false; procOff(); stopMine(); hooks.label(); lsSet('gl_radio', { on: false, st: Radio.st }); }
export function toggleMusic() { if (Radio.playing) radioOff(); else { radioOn(); hooks.toast(JINGLES[activeSt()]); } }
export function setStation(id) { if (id === 'mine' && !Radio.list.length) { hooks.toast('Pehle apne gaane add kar (Radio → Meri Playlist)'); return; } procOff(); stopMine(); Radio.st = id; Music.step = 0; radioOn(); hooks.toast(JINGLES[id]); }
export function nextStation() { const ids = STATIONS.map(s => s.id).filter(id => id !== 'mine' || Radio.list.length); const i = ids.indexOf(Radio.st); setStation(ids[(i + 1) % ids.length]); }
// The club plays its own DJ set while you are inside, then hands back to your station.
export function setOverride(st) { if (Radio.override === st) return; Radio.override = st; if (!Radio.playing) return; procOff(); stopMine(); Music.step = 0; if (activeSt() === 'mine') playMine(); else procOn(); hooks.label(); }
export function skipTrack(d) { if (activeSt() === 'mine') return mineNext(d); const L = stTracks(); Music.ti = L[(L.indexOf(Music.ti) + d + L.length) % L.length]; Music.step = 0; if (Music.on) startDrone(); else radioOn(); hooks.label(); }
export function playTrack(i) { Music.ti = i; Music.step = 0; if (!Radio.playing) radioOn(); else startDrone(); hooks.label(); }
function mineAudio() { if (!Radio.audio) { const a = new Audio(); a.preload = 'auto'; a.addEventListener('ended', () => mineNext(1)); a.addEventListener('error', () => { if (Radio.playing && activeSt() === 'mine' && a.getAttribute('src')) playDecoded(); }); Radio.audio = a; } return Radio.audio; }
export function playMine() { const s = Radio.list[Radio.idx]; if (!s) return; stopMine(); const a = mineAudio(); if (!s.url) s.url = URL.createObjectURL(s.blob); a.src = s.url; a.volume = Music.vol; const p = a.play(); if (p && p.catch) p.catch(e => { if (e && e.name !== 'AbortError') playDecoded(); }); hooks.label(); }
async function playDecoded() {
  const s = Radio.list[Radio.idx]; if (!s || s.decoding) return; s.decoding = true; if (Radio.audio) { Radio.audio.pause(); Radio.audio.removeAttribute('src'); } initAudio();
  try { const buf = await Music.ctx.decodeAudioData(await s.blob.arrayBuffer()); if (!Radio.playing || activeSt() !== 'mine' || Radio.list[Radio.idx] !== s) return; const src = Music.ctx.createBufferSource(); src.buffer = buf; src.connect(Music.master); src.onended = () => { if (Radio.src === src) { Radio.src = null; mineNext(1); } }; src.start(); Radio.src = src; }
  catch { hooks.toast('Yeh file nahi chal rahi: ' + s.name, 'bad'); } finally { s.decoding = false; }
}
function stopMine() { if (Radio.audio) Radio.audio.pause(); if (Radio.src) { const s = Radio.src; Radio.src = null; try { s.stop(); } catch {} } }
export function mineNext(d) { if (!Radio.list.length) return; Radio.idx = (Radio.idx + d + Radio.list.length) % Radio.list.length; if (Radio.playing && activeSt() === 'mine') playMine(); hooks.label(); }
export function setVolume(v) { Music.vol = v; if (Music.master) Music.master.gain.value = v; if (Radio.audio) Radio.audio.volume = v; lsSet('gl_vol', v); }
export function restoreRadio() { const v = lsGet('gl_vol'); if (typeof v === 'number') setVolume(clamp(v, 0, 1)); const rs = lsGet('gl_radio'); if (rs && STATIONS.some(x => x.id === rs.st)) Radio.st = rs.st; if (!rs || rs.on !== false) radioOn(); else initAudio(); }
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
  else if (k === 'shutter') { noise(t, 0.04, 0.4, 3000, 1, 'highpass', d); noise(t + 0.07, 0.04, 0.3, 2500, 1, 'highpass', d); }
}
