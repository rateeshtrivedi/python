"""Read the MakeHuman-derived human package (CC0 data): base shape, morphs, body, bones, proxies.
Mirrors the package's documented layout (manifest.json + shapes.bin + glTF primitives)."""
import gzip, json, os, numpy as np
import glb

def _unplane16(b, at, n, signed):
    lo = np.frombuffer(b, np.uint8, n, at).astype(np.uint32); hi = np.frombuffer(b, np.uint8, n, at + n).astype(np.uint32)
    v = np.cumsum(lo | (hi << 8), dtype=np.uint64) & 0xffff
    v = v.astype(np.uint16)
    return v.view(np.int16) if signed else v
def _unplane8(b, at, n):
    v = (np.cumsum(np.frombuffer(b, np.uint8, n, at).astype(np.uint32), dtype=np.uint64) & 0xff).astype(np.uint8)
    return v.view(np.int8).astype(np.int16)

class Pkg:
    def __init__(self, root):
        self.root = root; self.man = json.load(open(os.path.join(root, 'manifest.json')))
        m = self.man; N = m['vertexCount']; sh = m['shapes']
        b = gzip.decompress(open(os.path.join(root, sh['file']), 'rb').read())
        base = np.zeros((N, 3), np.float64)
        for k in range(3): base[:, k] = sh['baseMin'][k] + _unplane16(b, sh['baseOffset'] + k * N * 2, N, False).astype(np.float64) * sh['baseScale'][k]
        self.base = base; self.morphs = {}
        for mo in sh['morphs']:
            c = mo['count']; idx = _unplane16(b, mo['offset'], c, False).astype(np.int64); at = mo['offset'] + c * 2; d = np.zeros((c, 3), np.float64)
            for k in range(3):
                v = _unplane8(b, at, c) if mo['bits'] == 8 else _unplane16(b, at, c, True); at += c * (1 if mo['bits'] == 8 else 2); d[:, k] = v
            self.morphs[mo['name']] = (idx, d * mo['scale'])
        js, bn = glb.read(os.path.join(root, m['body']['file'])); self.body = prim(js, bn)
        self.bones = m['bones']
    def proxy(self, kind, pid):
        meta = next(p for p in self.man['proxies'] if p['kind'] == kind and p['id'] == pid)
        js, bn = glb.read(os.path.join(self.root, meta['file'])); return meta, prim(js, bn)
    def shape(self, cfg):
        """cfg like the package's HumanConfig macros: gender, age, muscle, weight, height, proportions, cupSize, firmness, african, asian, caucasian."""
        P = self.base.copy()
        for name, w in macro_weights(cfg).items():
            if abs(w) < 1e-4 or name not in self.morphs: continue
            idx, d = self.morphs[name]; np.add.at(P, idx, d * w)
        for name, w in (cfg.get('detail') or {}).items():
            if name in self.morphs: idx, d = self.morphs[name]; np.add.at(P, idx, d * w)
        gy = P[self.man['groundVerts'], 1].mean(); P[:, 1] -= gy
        return P

def prim(js, bn):
    p = js['meshes'][0]['primitives'][0]; out = {k: glb.acc(js, bn, v) for k, v in p['attributes'].items()}; out['index'] = glb.acc(js, bn, p['indices']).astype(np.int64)
    node = next((n for n in js['nodes'] if 'mesh' in n), {}); out['node'] = node
    return out

def macro_weights(c):
    cl = lambda v: min(1, max(0, v)); g = cl(c.get('gender', .5)); w = {}
    w['macro/sexF'] = max(0, 1 - 2 * g); w['macro/sexM'] = max(0, 2 * g - 1)
    def split(v, up, down):
        x = cl(v); k, amt = (up, 2 * x - 1) if x >= .5 else (down, 1 - 2 * x)
        w['macro/%sF' % k] = w.get('macro/%sF' % k, 0) + amt * (1 - g); w['macro/%sM' % k] = w.get('macro/%sM' % k, 0) + amt * g
    split(c.get('muscle', .5), 'muscleUp', 'muscleDown'); split(c.get('weight', .5), 'weightUp', 'weightDown')
    split(.5 + (cl(c.get('height', .5)) - .5) * .36, 'heightUp', 'heightDown'); split(c.get('proportions', .5), 'proportionsUp', 'proportionsDown')
    split(c.get('cupSize', .5), 'cupUp', 'cupDown'); split(c.get('firmness', .5), 'firmUp', 'firmDown')
    yrs = 18 + 72 * cl(c.get('age', .15))
    if yrs < 25: t = (25 - yrs) / 7; w['macro/ageYoungF'] = t * (1 - g); w['macro/ageYoungM'] = t * g
    else: t = (yrs - 25) / 65; w['macro/ageOldF'] = t * (1 - g); w['macro/ageOldM'] = t * g
    rs = (c.get('african', 1/3) + c.get('asian', 1/3) + c.get('caucasian', 1/3)) or 1
    for r in ('african', 'asian', 'caucasian'): x = c.get(r, 1/3) / rs; w['macro/%sF' % r] = x * (1 - g); w['macro/%sM' % r] = x * g
    return w

def fit_proxy(P, meta, pr):
    """Proxy vertex positions for shape P (MakeHuman's reference-triangle + scaled offset fit)."""
    s = [abs(P[a, k] - P[b, k]) / d for k, (a, b, d) in enumerate(meta['scale'])]
    r = pr['_REFS'].astype(np.int64); w = pr['_REFW']; o = pr['_OFFS']
    return (P[r[:, 0]] * w[:, :1] + P[r[:, 1]] * w[:, 1:2] + P[r[:, 2]] * w[:, 2:3]) + o * np.array(s)

def hidden_mask(N, meta):
    h = np.zeros(N, bool)
    dv = meta.get('deleteVerts')
    if isinstance(dv, str): dv = json.loads(dv)
    for a, b in dv or []: h[a:b + 1] = True
    return h

def normals(pos, idx):
    t = idx.reshape(-1, 3); fn = np.cross(pos[t[:, 1]] - pos[t[:, 0]], pos[t[:, 2]] - pos[t[:, 0]]); n = np.zeros_like(pos)
    for k in range(3): np.add.at(n, t[:, k], fn)
    l = np.linalg.norm(n, axis=1, keepdims=True); l[l == 0] = 1; return n / l
