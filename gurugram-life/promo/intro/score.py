# 20-second score for the intro film: a soft pad and a bansuri line for the dream, a dhol that builds from the car shot and
# a hit on the title; the narrator on top with the music ducked under each line. Writes intro.wav (mono 44.1 kHz).
import numpy as np, wave
SR = 44100; T = 20.2; N = int(SR * T); bed = np.zeros(N); vo = np.zeros(N); rng = np.random.default_rng(7)
def add(buf, sig, t, g=1.0):
    i = int(t * SR); j = min(N, i + len(sig)); buf[i:j] += sig[:j - i] * g
def env(n, a, r):
    e = np.ones(n); A = max(1, int(a * SR)); R = max(1, int(r * SR)); e[:A] = np.linspace(0, 1, A); e[-R:] *= np.linspace(1, 0, R); return e
def tone(f, d, a, r, h):
    t = np.arange(int(d * SR)) / SR; return sum(w * np.sin(2 * np.pi * f * (k + 1) * t) for k, w in enumerate(h)) * env(len(t), a, r)
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
CH = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]]  # Dm Bb F C
for i, c in enumerate(CH * 2):
    for n in c: add(bed, tone(NOTE(n), 2.7, 0.6, 1.0, (1, .18, .06)), i * 2.08, 0.05)
for n in [41, 53, 57, 60, 65, 69]: add(bed, tone(NOTE(n), 3.6, 0.03, 2.6, (1, .25, .1)), 16.6, 0.08)  # F major on the title
def flute(f, d):
    t = np.arange(int(d * SR)) / SR; ph = 2 * np.pi * f * (t + 0.0012 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 3, 0, 1))
    return (np.sin(ph) + 0.15 * np.sin(2 * ph) + rng.standard_normal(len(t)) * 0.03) * env(len(t), 0.08, 0.25)
for t0, n, d in [(0.4, 74, .9), (1.4, 77, .5), (1.9, 76, .5), (2.4, 74, 1.2), (4.0, 72, .6), (4.6, 74, .6), (5.2, 77, 1.4), (7.0, 79, .5), (7.5, 81, .9), (8.5, 79, .6), (9.1, 77, 1.0)]:
    add(bed, flute(NOTE(n), d), t0, 0.09)
def dagga():
    t = np.arange(int(0.35 * SR)) / SR; f = 110 * np.exp(-t * 7) + 55; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def tilli():
    t = np.arange(int(0.08 * SR)) / SR; return (rng.standard_normal(len(t)) * 0.5 + np.sin(2 * np.pi * 900 * t)) * np.exp(-t * 60)
b = 60 / 104
for k in range(int((16.4 - 9.2) / b * 2)):
    t = 9.2 + k * b / 2; g = 0.35 + 0.4 * (t - 9.2) / 7
    add(bed, dagga() if k % 2 == 0 else tilli(), t, (0.45 if k % 2 == 0 else 0.25) * g)
for k in range(12): add(bed, tilli(), 15.7 + k * 0.07, 0.2 + k * 0.02)
t = np.arange(int(3.4 * SR)) / SR; add(bed, np.sin(2 * np.pi * (45 + 30 * np.exp(-t * 4)) * t) * np.exp(-t * 1.6), 16.6, 0.6); add(bed, rng.standard_normal(len(t)) * np.exp(-t * 2.2), 16.6, 0.06)
duck = np.ones(N)
for k, t0 in [(1, 0.25), (2, 3.5), (3, 6.9), (4, 9.5), (5, 11.9), (6, 14.25), (7, 16.9)]:
    w = wave.open(f'vo{k}.wav'); sr = w.getframerate(); s = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0; w.close()
    s = np.interp(np.arange(int(len(s) * SR / sr)) * sr / SR, np.arange(len(s)), s); add(vo, s, t0)
    i = int(t0 * SR); duck[max(0, i - 3000):min(N, i + len(s) + 6000)] = 0.5
k = int(0.12 * SR); duck = np.convolve(duck, np.ones(k) / k, mode='same')
out = bed / max(1e-6, np.abs(bed).max()) * 0.5 * duck + vo / max(1e-6, np.abs(vo).max()) * 0.85
out *= env(N, 0.02, 0.6); out /= max(1.0, np.abs(out).max() / 0.95)
w = wave.open('intro.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close(); print('ok', T)
