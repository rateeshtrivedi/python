# Original desi beat: dhol (dagga + tilli), chimta, bass and a tumbi riff. Synthesised from scratch.
# usage: python3 music.py out.wav seconds bpm root_midi seed
import sys, wave
import numpy as np

out, secs, bpm, root, seed = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
SR = 44100
rng = np.random.default_rng(seed)
n = int(secs * SR)
mix = np.zeros(n)
step = 60 / bpm / 4  # sixteenth note

def add(sig, t):
    i = int(t * SR)
    if i >= n: return
    j = min(n, i + len(sig)); mix[i:j] += sig[: j - i]

def env(length, attack, decay):
    t = np.arange(int(length * SR)) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)

def dagga(v=1.0):  # low dhol stroke with falling pitch
    L = 0.45; t = np.arange(int(L * SR)) / SR
    f = 48 + 60 * np.exp(-t * 18); ph = 2 * np.pi * np.cumsum(f) / SR
    return v * 0.9 * np.sin(ph) * env(L, 0.002, 0.16) + v * 0.15 * rng.standard_normal(len(t)) * env(L, 0.001, 0.01)

def tilli(v=1.0):  # high stick on the dhol
    L = 0.12; t = np.arange(int(L * SR)) / SR
    noise = rng.standard_normal(len(t)); noise = np.diff(noise, prepend=0)
    return v * (0.35 * np.sin(2 * np.pi * 380 * t) + 0.25 * noise) * env(L, 0.001, 0.03)

def chimta():
    L = 0.15; t = np.arange(int(L * SR)) / SR
    return 0.12 * (np.sin(2 * np.pi * 3100 * t) + np.sin(2 * np.pi * 4350 * t)) * env(L, 0.001, 0.05)

def tumbi(freq, v=1.0):  # bright plucked string with a quick pitch drop
    L = 0.3; t = np.arange(int(L * SR)) / SR
    f = freq * (1 + 0.04 * np.exp(-t * 60)); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * 0.5 + 0.5 * np.sin(2 * ph)
    return v * 0.22 * s * env(L, 0.002, 0.09)

def bass(freq):
    L = 0.32; t = np.arange(int(L * SR)) / SR
    return 0.32 * np.sin(2 * np.pi * freq * t) * env(L, 0.005, 0.18)

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
scale = [0, 2, 4, 7, 9, 12, 14]  # pentatonic, bright and folk-like
dagga_steps = [0, 3, 6, 8, 11, 14]; tilli_steps = [2, 5, 7, 10, 13, 15]; chimta_steps = [4, 12]
# a one-bar riff, varied on alternate bars
riff = [(0, 2), (2, 3), (3, 4), (6, 3), (8, 2), (10, 1), (11, 2), (14, 0)]
riff_b = [(0, 4), (2, 5), (3, 4), (6, 3), (8, 2), (10, 3), (12, 2), (14, 1)]
total = int(secs / step)
for s in range(total):
    t = s * step; b = s % 16; bar = s // 16
    if b in dagga_steps: add(dagga(1.0 if b in (0, 8) else 0.7), t)
    if b in tilli_steps: add(tilli(0.8 + 0.2 * rng.random()), t)
    if b in chimta_steps: add(chimta(), t)
    if b in (0, 8): add(bass(mtof(root - 24 + (5 if bar % 4 == 3 and b == 8 else 0))), t)
    if bar >= 1:
        for (pos, deg) in (riff if bar % 2 else riff_b):
            if pos == b: add(tumbi(mtof(root + 12 + scale[deg % len(scale)])), t)

mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.85
fade = int(0.8 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
stereo = np.stack([mix, np.roll(mix, 220) * 0.96], axis=1)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
print('wrote', out)
