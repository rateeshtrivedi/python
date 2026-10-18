# Original Bollywood-style beats, synthesised from scratch (no samples, no copyrighted material).
# usage: python3 bolly.py out.wav seconds style seed
# styles: filmy (dhol + harmonium hook), item (tabla + synth bass + whistle lead), edm (four-on-floor + supersaw + shehnai drop),
#         action (taiko + brass stabs + strings), gangster (slow heavy 808 + sarangi-ish lead), baraat (brass band + dhol + tasha),
#         retro (80s disco Bollywood: syn-drums + bass octaves + string pad), haryanvi (dhol + tumbi + 808)
import sys, wave
import numpy as np

out, secs, style, seed = sys.argv[1], float(sys.argv[2]), sys.argv[3], int(sys.argv[4])
SR = 44100; rng = np.random.default_rng(seed); n = int(secs * SR); L = np.zeros(n); R = np.zeros(n)
CFG = {  # bpm, root midi, scale (semitones), swing
    'filmy': (112, 62, [0, 1, 4, 5, 7, 8, 11], 0.08), 'item': (104, 60, [0, 2, 3, 5, 7, 8, 10], 0.12), 'edm': (124, 57, [0, 2, 3, 5, 7, 8, 10], 0),
    'action': (96, 55, [0, 1, 3, 5, 7, 8, 10], 0), 'gangster': (86, 53, [0, 1, 4, 5, 7, 8, 10], 0.05), 'baraat': (132, 62, [0, 2, 4, 5, 7, 9, 10], 0.1),
    'retro': (118, 60, [0, 2, 3, 5, 7, 8, 10], 0), 'haryanvi': (100, 64, [0, 2, 3, 5, 7, 9, 10], 0.1)}
bpm, root, scale, swing = CFG[style]; bpm *= 1 + (rng.random() - 0.5) * 0.04; root += int(rng.integers(-2, 3))
beat = 60 / bpm; step = beat / 4; bars = int(secs / (4 * beat)) + 1
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def note(deg, octv=0): return root + scale[deg % 7] + 12 * (deg // 7 + octv)
def env(Ln, a, d): t = np.arange(int(Ln * SR)) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def put(sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= n or i < 0: return
    j = min(n, i + len(sig)); s = sig[:j - i] * g; L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))
def noise(Ln): return rng.standard_normal(int(Ln * SR))
def lp(x, k): c = np.cumsum(np.concatenate([[0], x])); y = (c[k:] - c[:-k]) / k; return np.concatenate([y, np.zeros(len(x) - len(y))])
def osc(f, Ln, kind='sin', vib=0.0):
    t = np.arange(int(Ln * SR)) / SR; fr = f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.25)); ph = 2 * np.pi * np.cumsum(fr) / SR
    if kind == 'sin': return np.sin(ph)
    if kind == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == 'sq': return np.sign(np.sin(ph)) * 0.7
    if kind == 'reed': return np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.35 * np.sin(3 * ph) + 0.25 * np.sign(np.sin(ph)) * 0.4  # harmonium / shehnai-ish
# ---- drums
def kick(v=1): Ln = 0.35; t = np.arange(int(Ln * SR)) / SR; f = 45 + 90 * np.exp(-t * 30); return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(Ln, 0.001, 0.12)
def k808(v=1): Ln = 0.8; t = np.arange(int(Ln * SR)) / SR; f = 42 + 40 * np.exp(-t * 20); return v * np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * env(Ln, 0.002, 0.35)
def clap(v=1): x = noise(0.2); s = (lp(x, 3) - lp(x, 14)) * env(0.2, 0.001, 0.05) * 2.2; return v * 0.5 * s
def hat(v=1, o=False): Ln = 0.3 if o else 0.06; x = noise(Ln); s = (x - lp(x, 3)) * env(Ln, 0.0005, 0.08 if o else 0.015); return v * 0.07 * s
def dagga(v=1): Ln = 0.45; t = np.arange(int(Ln * SR)) / SR; f = 50 + 60 * np.exp(-t * 18); return v * (0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(Ln, 0.002, 0.16) + 0.12 * lp(noise(Ln), 6) * env(Ln, 0.001, 0.01))
def tilli(v=1): Ln = 0.1; t = np.arange(int(Ln * SR)) / SR; x = noise(Ln); return v * (0.4 * np.sin(2 * np.pi * 390 * t) + 0.25 * (lp(x, 2) - lp(x, 10))) * env(Ln, 0.001, 0.03)
def tabla_na(v=1): Ln = 0.3; t = np.arange(int(Ln * SR)) / SR; return v * (np.sin(2 * np.pi * 520 * t) + 0.4 * np.sin(2 * np.pi * 1310 * t)) * env(Ln, 0.001, 0.07)
def tabla_ge(v=1): Ln = 0.5; t = np.arange(int(Ln * SR)) / SR; f = 95 + 40 * np.exp(-t * 6) + 8 * np.sin(2 * np.pi * 3 * t); return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(Ln, 0.003, 0.2)
def taiko(v=1): Ln = 0.9; t = np.arange(int(Ln * SR)) / SR; f = 60 + 50 * np.exp(-t * 12); return v * (np.sin(2 * np.pi * np.cumsum(f) / SR) * env(Ln, 0.002, 0.3) + 0.3 * lp(noise(Ln), 20) * env(Ln, 0.001, 0.05))
def tasha(v=1): Ln = 0.12; x = noise(Ln); return v * 0.6 * (lp(x, 2) - lp(x, 8)) * env(Ln, 0.0005, 0.025)
def chimta(v=1): Ln = 0.25; t = np.arange(int(Ln * SR)) / SR; return v * 0.25 * (np.sin(2 * np.pi * 2100 * t) + np.sin(2 * np.pi * 3170 * t)) * env(Ln, 0.001, 0.05)
# ---- tonal
def bass(m, Ln, kind='saw'): return lp(osc(mtof(m), Ln, kind), 30) * env(Ln, 0.005, Ln * 0.6) * 1.4
def pluck(m, Ln=0.3): return lp(osc(mtof(m), Ln, 'saw'), 6) * env(Ln, 0.002, 0.09) * 0.55
def lead(m, Ln, kind='reed', vib=0.012): s = osc(mtof(m), Ln, kind, vib); a = np.minimum(1, np.arange(len(s)) / (0.03 * SR)) * np.minimum(1, (len(s) - np.arange(len(s))) / (0.05 * SR)); return lp(s * a, 6) * 0.38
def pad(ms, Ln): s = sum(osc(mtof(m) * (1 + d), Ln, 'saw') for m in ms for d in (-0.004, 0.004)); return lp(s, 40) * np.minimum(1, np.arange(len(s)) / (0.2 * SR)) * np.minimum(1, (len(s) - np.arange(len(s))) / (0.2 * SR)) * 0.08
def brass(ms, Ln=0.25): s = sum(osc(mtof(m), Ln, 'saw') for m in ms); return lp(s, 8) * env(Ln, 0.01, 0.12) * 0.35
def whistle(m, Ln): return osc(mtof(m + 12), Ln, 'sin', 0.02) * np.minimum(1, np.arange(int(Ln * SR)) / (0.02 * SR)) * 0.22
def tumbi(m): Ln = 0.35; t = np.arange(int(Ln * SR)) / SR; return (np.sin(2 * np.pi * mtof(m) * t) + 0.6 * np.sin(2 * np.pi * 2 * mtof(m) * t) + 0.4 * np.sin(2 * np.pi * 3 * mtof(m) * t)) * env(Ln, 0.001, 0.08) * 0.3
# chord progression (scale degrees), different per seed
PROGS = [[0, 5, 3, 4], [0, 3, 4, 3], [0, 6, 5, 4], [0, 4, 5, 3], [5, 3, 0, 4]]; prog = PROGS[int(rng.integers(len(PROGS)))]
motif = [int(x) for x in rng.choice([0, 1, 2, 3, 4, 5, 6, 7], 8)]; rhythm = [int(x) for x in rng.choice([1, 2, 2, 3, 4], 8)]
def T(bar, s): return bar * 16 * step + s * step + (swing * step if s % 2 else 0)
for b in range(bars):
    ch = prog[b % 4]; tri = [note(ch, -1), note(ch + 2, -1), note(ch + 4, -1)]; drop = b >= 2; t0 = T(b, 0)
    if style == 'filmy':
        for s, v in [(0, 1), (6, .7), (8, .9), (11, .6), (14, .7)]: put(dagga(v), T(b, s), .55)
        for s in range(0, 16, 2): put(tilli(.6 + .4 * (s % 4 == 2)), T(b, s), .35, .3)
        put(bass(note(ch, -2), 4 * beat), t0, .32); put(pad(tri, 4 * beat), t0, .6)
        if drop:
            for k in range(8): put(lead(note(motif[k] + ch, 0), rhythm[k] * step * .9), T(b, 2 * k), .55, -.2)
    elif style == 'item':
        for s, f in [(0, tabla_ge), (3, tabla_na), (6, tabla_ge), (8, tabla_na), (10, tabla_ge), (11, tabla_na), (14, tabla_na)]: put(f(), T(b, s), .4, .2)
        for s in (0, 8): put(k808(.9), T(b, s), .45)
        put(clap(), T(b, 4), .5); put(clap(), T(b, 12), .5)
        for s in range(0, 16, 2): put(bass(note(ch, -2) + (12 if s % 4 == 2 else 0), step * 1.6, 'sq'), T(b, s), .18)
        if drop:
            for k in range(6): put(whistle(note(motif[k], 0), step * 2 * .9), T(b, k * 2 + 2), .55, -.3)
    elif style == 'edm':
        for q in range(4): put(kick(1), T(b, 4 * q), .7); put(hat(.9, True), T(b, 4 * q + 2), .5, .3)
        put(clap(), T(b, 4), .45); put(clap(), T(b, 12), .45)
        for s in range(16): put(pluck(note(ch + (s % 3) * 2, 0), .2), T(b, s), .25 if drop else .12, -.2 + .4 * (s % 2))
        put(bass(note(ch, -2), 4 * beat), t0, .3); put(pad([m + 12 for m in tri], 4 * beat), t0, .7)
        if b % 2 == 1 and drop:
            for k in range(4): put(lead(note(motif[k] + 7, 0), step * 3.5, 'reed', .02), T(b, k * 4), .5, .2)
    elif style == 'action':
        for s, v in [(0, 1), (3, .6), (6, .8), (8, 1), (10, .6), (12, .9), (14, .7), (15, .5)]: put(taiko(v), T(b, s), .5)
        put(pad(tri, 4 * beat), t0, 1.0)
        for s in (0, 3, 6): put(brass([note(ch, 0), note(ch + 2, 0), note(ch + 4, 0)], .3), T(b, s), .7 if drop else .4)
        for s in range(0, 16): put(lp(osc(mtof(note(ch, -1)), step * .9, 'saw'), 8) * env(step * .9, .002, step * .5) * .14, T(b, s), 1, .3)
    elif style == 'gangster':
        put(k808(1), t0, .6); put(k808(.7), T(b, 7), .5); put(k808(.8), T(b, 10), .5)
        put(clap(), T(b, 8), .55)
        for s in range(0, 16, 2): put(hat(.8), T(b, s), .5, .3)
        put(pad(tri, 4 * beat), t0, .7)
        if drop:
            for k in range(4): put(lead(note(motif[k], 0), step * 3.6, 'reed', .03), T(b, 4 * k), .55, -.2)
    elif style == 'baraat':
        for s, v in [(0, 1), (4, .8), (8, 1), (12, .8)]: put(dagga(v), T(b, s), .55)
        for s in range(16): put(tasha(.6 + .4 * (s % 2 == 0)), T(b, s), .4, .25)
        for s in (0, 2, 4, 6, 8, 10, 12, 14): put(brass([note(ch, 0), note(ch + 2, 0)], .18), T(b, s), .45 if s % 4 else .65, -.2)
        put(bass(note(ch, -2), 2 * beat, 'sq'), t0, .2); put(bass(note(ch + 4, -2), 2 * beat, 'sq'), T(b, 8), .2)
        if drop:
            for k in range(8): put(lead(note(motif[k] + ch, 0), step * 1.8, 'reed', .015), T(b, 2 * k), .5, .2)
    elif style == 'retro':
        for q in range(4): put(kick(.9), T(b, 4 * q), .6); put(hat(.8), T(b, 4 * q + 2), .5, .2)
        put(clap(1), T(b, 4), .55); put(clap(1), T(b, 12), .55)
        for s in range(0, 16, 2): put(bass(note(ch, -2) + (12 if s % 4 else 0), step * 1.8, 'saw'), T(b, s), .2)
        put(pad([m + 12 for m in tri], 4 * beat), t0, 1.0)
        if drop:
            for k in range(8): put(pluck(note(motif[k], 1), .25), T(b, 2 * k), .4, -.3)
    elif style == 'haryanvi':
        for s, v in [(0, 1), (3, .6), (8, .9), (11, .6)]: put(dagga(v), T(b, s), .5)
        for s in range(0, 16, 2): put(chimta(.7), T(b, s + 1), .5, .35)
        put(k808(.9), t0, .45); put(k808(.7), T(b, 8), .4)
        for k in range(8): put(tumbi(note(motif[k] % 5, 0)), T(b, 2 * k), .6 if drop else .35, -.25)
        put(pad(tri, 4 * beat), t0, .5)
# gentle intro filter sweep + master
fade = np.minimum(1, np.minimum(np.arange(n) / (0.15 * SR), (n - np.arange(n)) / (1.2 * SR)))
L *= fade; R *= fade; peak = max(np.abs(L).max(), np.abs(R).max(), 1e-6); L = np.tanh(L / peak * 1.3) * 0.8; R = np.tanh(R / peak * 1.3) * 0.8
st = (np.stack([L, R], 1) * 32767).astype(np.int16); w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print('beat', style, round(bpm, 1), 'bpm root', root, 'prog', prog)
