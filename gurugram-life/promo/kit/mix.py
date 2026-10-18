# Daily reel soundtrack. Reads days/<DAY>/scenes.json (timeline) and days/<DAY>/sound.json:
#   {"beat": "filmy", "seed": 7, "end": 4.0, "sfx": [["punch", scene, at], ["siren", scene, at, dur], ...]}
# Writes audio_music.wav (original beat + SFX) and audio_sfx.wav (SFX only, for adding a licensed song in the app).
import wave, subprocess, os, sys, json, numpy as np
KIT = os.path.dirname(os.path.abspath(__file__)); DIR = os.path.join(KIT, 'days', sys.argv[1]); SR = 44100; rng = np.random.default_rng(11)
SC = json.load(open(os.path.join(DIR, 'scenes.json'))); SD = json.load(open(os.path.join(DIR, 'sound.json')))
starts = np.cumsum([0] + [s['dur'] for s in SC]); END = float(starts[-1]); total = END + SD.get('end', 4.0); n = int(total * SR); t = np.arange(n) / SR
fx = np.zeros(n)
def load(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    return a.reshape(-1, 2).mean(1) if w.getnchannels() == 2 else a
def add(sig, at, g=1.0):
    i = int(at * SR); j = min(n, i + len(sig))
    if 0 <= i < n: fx[i:j] += g * sig[:j - i]
env = lambda L, a, d: (lambda x: np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d))(np.arange(int(L * SR)) / SR)
def tone(f, L, d=0.1): x = np.arange(int(L * SR)) / SR; return np.sin(2 * np.pi * f * x) * env(L, 0.003, d)
def lpn(L, k): s = rng.standard_normal(int(L * SR) + k); c = np.cumsum(s); return ((c[k:] - c[:-k]) / k)[:int(L * SR)]
def whoosh(L=0.3): x = np.arange(int(L * SR)) / SR; return lpn(L, 6) * 3 * np.sin(np.pi * x / L) ** 2
def punch(L=0): s = lpn(0.16, 4) * env(0.16, 0.001, 0.03) * 2; s[:len(tone(95, 0.14, 0.05))] += tone(95, 0.14, 0.05); return s
def thud(L=0): s = tone(55, 0.6, 0.18) * 1.4; s += lpn(0.6, 40) * env(0.6, 0.002, 0.08) * 6; return s
def horn(L=0.45): f0 = 380 + rng.random() * 140; x = np.arange(int(L * SR)) / SR; s = (np.sign(np.sin(2 * np.pi * f0 * x)) + np.sign(np.sin(2 * np.pi * f0 * 1.26 * x))) * 0.5; return np.convolve(s, np.ones(6) / 6, 'same') * np.minimum(1, x / 0.01) * np.minimum(1, (L - x) / 0.03)
def carpass(L=1.2): x = np.arange(int(L * SR)) / SR; return lpn(L, 30) * 8 * np.exp(-((x - L / 2) / (L / 5)) ** 2)
def siren(L=2.5): x = np.arange(int(L * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(760 + 260 * np.sin(2 * np.pi * 0.9 * x)) / SR) * np.minimum(1, x / 0.2) * np.minimum(1, (L - x) / 0.3)
def engine(L=2.5): x = np.arange(int(L * SR)) / SR; f = 55 + 15 * np.minimum(1, x / 1.5); ph = 2 * np.pi * np.cumsum(f) / SR; return (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.3 * lpn(L, 40) * 6) * np.minimum(1, x / 0.1) * np.minimum(1, (L - x) / 0.2) * 0.5
def keys(L=2.5):
    s = np.zeros(int(L * SR)); k = 0.0
    while k < L - 0.1: c = lpn(0.03, 2) * env(0.03, 0.0005, 0.006) * 2; i = int(k * SR); s[i:i + len(c)] += c; k += 0.06 + rng.random() * 0.14
    return s
def chatter(L=2.5): x = np.arange(int(L * SR)) / SR; return lpn(L, 25) * 6 * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * x) * np.sin(2 * np.pi * 1.7 * x)) * np.minimum(1, x / 0.3) * np.minimum(1, (L - x) / 0.3)
def clink(L=0): return (tone(2600, 0.25, 0.06) + 0.6 * tone(3900, 0.25, 0.04)) * 0.5
def pop(L=0): s = lpn(0.5, 3) * env(0.5, 0.001, 0.05) * 3; s += tone(70, 0.5, 0.15) * 0.6; c = np.zeros(int(1.2 * SR)); c[:len(s)] += s; cr = rng.standard_normal(int(0.8 * SR)) * (rng.random(int(0.8 * SR)) < 0.004) * env(0.8, 0.01, 0.35); c[int(0.15 * SR):int(0.15 * SR) + len(cr)] += cr * 0.8; return c
def moo(L=1.1): x = np.arange(int(L * SR)) / SR; f = 150 - 40 * x / L + 4 * np.sin(2 * np.pi * 5 * x); ph = 2 * np.pi * np.cumsum(f) / SR; return (np.sin(ph) + 0.5 * np.sin(2 * ph)) * np.minimum(1, x / 0.15) * np.minimum(1, (L - x) / 0.25) * 0.5
def rain(L=2.5): return rng.standard_normal(int(L * SR)) * 0.5
def crowd(L=1.5): x = np.arange(int(L * SR)) / SR; return lpn(L, 10) * 3 * np.minimum(1, x / 0.15) * np.exp(-x / max(0.3, L / 2))
def scratch(L=0.45): x = np.arange(int(L * SR)) / SR; f = 900 * (1 - x / L) ** 2 + 120; ph = 2 * np.pi * np.cumsum(f) / SR; return (np.sign(np.sin(ph)) * 0.4 + lpn(L, 3) * 1.5) * np.minimum(1, x / 0.01) * np.minimum(1, (L - x) / 0.05)
LIB = dict(punch=(punch, .4), thud=(thud, .4), horn=(horn, .06), carpass=(carpass, .12), siren=(siren, .05), engine=(engine, .12), keys=(keys, .25), chatter=(chatter, .05), clink=(clink, .12), pop=(pop, .2), moo=(moo, .3), rain=(rain, .03), crowd=(crowd, .2), scratch=(scratch, .22), whoosh=(whoosh, .16))
for k in range(1, len(SC) + 1): add(whoosh(), starts[k] - 0.12, 0.14)
def voice(name):  # 'vo:<clip>' plays one of the game's recorded NPC lines (public/audio/v/<clip>.mp3)
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(os.environ.get('GAME', '/home/user/python/gurugram-life'), 'public/audio/v', name + '.mp3'), '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(float) / 32768
for e in SD['sfx']:
    if e[0].startswith('vo:'): add(voice(e[0][3:]), starts[e[1]] + e[2], 0.9 * (e[3] if len(e) > 3 else 1)); continue
    name, sc, at = e[0], e[1], e[2]; L = e[3] if len(e) > 3 else 0; f, gain = LIB[name]; sig = f(L) if L else f()
    add(sig, starts[sc] + at, gain * (e[4] if len(e) > 4 else 1))
bp = os.path.join(DIR, 'beat.wav'); subprocess.run(['python3', os.path.join(KIT, 'bolly.py'), bp, str(total + 0.5), SD['beat'], str(SD.get('seed', 1))], check=True)
beat = load(bp)[:n]; beat = np.concatenate([beat, np.zeros(n - len(beat))])
def master(x):
    x = x * np.minimum(1, np.minimum(t / 0.02, (total - t) / 0.5)); x = x / max(1e-6, np.percentile(np.abs(x), 99.95)) * 0.88; return np.clip(x, -0.98, 0.98)
def write(p, x): w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
write(os.path.join(DIR, 'audio_music.wav'), master(beat * 0.55 + fx)); write(os.path.join(DIR, 'audio_sfx.wav'), master(fx) * 0.7)
print('audio', round(total, 2), 'END', END)
