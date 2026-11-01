"""Retarget the game's animation clips (Quaternius UAL, Unreal-style bones) onto the Mixamo-named MakeHuman rig.
Bone directions are matched frame by frame in world space (so different rest poses, A vs T, don't matter); each bone's
twist follows the source; the hips move like the source's pelvis, scaled by leg length."""
import numpy as np
import glb

MAP = {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'Head': 'Head',
       'clavicle_l': 'LeftShoulder', 'upperarm_l': 'LeftArm', 'lowerarm_l': 'LeftForeArm', 'hand_l': 'LeftHand',
       'clavicle_r': 'RightShoulder', 'upperarm_r': 'RightArm', 'lowerarm_r': 'RightForeArm', 'hand_r': 'RightHand',
       'thigh_l': 'LeftUpLeg', 'calf_l': 'LeftLeg', 'foot_l': 'LeftFoot', 'ball_l': 'LeftToeBase',
       'thigh_r': 'RightUpLeg', 'calf_r': 'RightLeg', 'foot_r': 'RightFoot', 'ball_r': 'RightToeBase'}
# the child each bone points at (source), for its direction
SCHILD = {'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'Head', 'clavicle_l': 'upperarm_l', 'upperarm_l': 'lowerarm_l',
          'lowerarm_l': 'hand_l', 'hand_l': 'middle_01_l', 'clavicle_r': 'upperarm_r', 'upperarm_r': 'lowerarm_r', 'lowerarm_r': 'hand_r', 'hand_r': 'middle_01_r',
          'thigh_l': 'calf_l', 'calf_l': 'foot_l', 'foot_l': 'ball_l', 'thigh_r': 'calf_r', 'calf_r': 'foot_r', 'foot_r': 'ball_r'}

# ---- quaternions [x, y, z, w]
def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0); bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz], -1)
def qinv(q): return q * np.array([-1, -1, -1, 1.0])
def qrot(q, v):
    u = q[..., :3]; w = q[..., 3:4]; t = 2 * np.cross(u, v); return v + w * t + np.cross(u, t)
def qnorm(q): return q / np.linalg.norm(q, axis=-1, keepdims=True)
def qarc(a, b):
    """shortest rotation taking unit vector a onto b"""
    a = a / np.linalg.norm(a, axis=-1, keepdims=True); b = b / np.linalg.norm(b, axis=-1, keepdims=True)
    c = np.cross(a, b); d = (a * b).sum(-1, keepdims=True)
    q = np.concatenate([c, 1 + d], -1)
    bad = (1 + d)[..., 0] < 1e-6
    if np.any(bad):
        ax = np.cross(a[bad] if a.ndim > 1 else a, [1, 0, 0]);
        if np.linalg.norm(ax) < 1e-6: ax = np.cross(a, [0, 1, 0])
        q[bad] = np.concatenate([ax / np.linalg.norm(ax, axis=-1, keepdims=True), np.zeros(ax.shape[:-1] + (1,))], -1)
    return qnorm(q)
def slerp(a, b, t):
    d = (a * b).sum(-1, keepdims=True); b = np.where(d < 0, -b, b); d = np.abs(d)
    lin = d > 0.9995; th = np.arccos(np.clip(d, -1, 1)); s = np.sin(th); s[s == 0] = 1
    wa = np.where(lin, 1 - t, np.sin((1 - t) * th) / s); wb = np.where(lin, t, np.sin(t * th) / s)
    return qnorm(wa * a + wb * b)

class SrcSkel:
    def __init__(self, path):
        js, bn = glb.read(path); self.js, self.bn = js, bn; self.nodes = js['nodes']; n = len(self.nodes)
        self.parent = [-1] * n
        for i, nd in enumerate(self.nodes):
            for c in nd.get('children', []): self.parent[c] = i
        self.name = [nd.get('name', str(i)) for i, nd in enumerate(self.nodes)]; self.idx = {nm: i for i, nm in enumerate(self.name)}
        self.rt = np.array([nd.get('translation', [0, 0, 0]) for nd in self.nodes], float); self.rr = np.array([nd.get('rotation', [0, 0, 0, 1]) for nd in self.nodes], float)
        self.rs = np.array([nd.get('scale', [1, 1, 1]) for nd in self.nodes], float)
        self.order = []; seen = set()
        def visit(i):
            if i in seen: return
            if self.parent[i] >= 0: visit(self.parent[i])
            seen.add(i); self.order.append(i)
        for i in range(n): visit(i)
    def clips(self):
        out = {}
        for a in self.js['animations']:
            ch = {}
            for c in a['channels']:
                s = a['samplers'][c['sampler']]; t = glb.acc(self.js, self.bn, s['input']).astype(float); v = glb.acc(self.js, self.bn, s['output']).astype(float)
                ch[(c['target']['node'], c['target']['path'])] = (t, v, s.get('interpolation', 'LINEAR'))
            out[a['name']] = ch
        return out
    def fk(self, T, R):
        """T,R: per node local translation/rotation arrays (F, n, 3/4) -> world pos/rot (F, n, ...), uniform scale assumed per node"""
        F, n = T.shape[:2]; WP = np.zeros((F, n, 3)); WR = np.zeros((F, n, 4)); WS = np.ones((F, n, 1))
        for i in self.order:
            p = self.parent[i]
            if p < 0: WP[:, i] = T[:, i]; WR[:, i] = R[:, i]; WS[:, i] = self.rs[i, :1]
            else: WP[:, i] = WP[:, p] + qrot(WR[:, p], T[:, i] * WS[:, p]); WR[:, i] = qmul(WR[:, p], R[:, i]); WS[:, i] = WS[:, p] * self.rs[i, :1]
        return WP, WR

def sample(t, v, times, interp):
    if len(t) == 1: return np.repeat(v[:1], len(times), 0)
    i = np.clip(np.searchsorted(t, times, 'right') - 1, 0, len(t) - 2); a = np.clip((times - t[i]) / np.maximum(t[i + 1] - t[i], 1e-9), 0, 1)[:, None]
    if interp == 'STEP': return v[i]
    if v.shape[1] == 4: return slerp(v[i], v[i + 1], a)
    return v[i] * (1 - a) + v[i + 1] * a

def retarget(src, clips, tgt_names, tgt_parent, tgt_rest_wpos, tgt_rest_wrot, tgt_dir, fps=30):
    """tgt_*: target rest pose in world space (MakeHuman metres); tgt_dir[name] = rest bone direction (head->tail).
    Returns {clip: {'times': t, 'rot': {bone: (F,4) local}, 'hips': (F,3) local translation}}."""
    nS = len(src.name); res = {}
    rest_T = np.repeat(src.rt[None], 1, 0); rest_R = np.repeat(src.rr[None], 1, 0)
    WP0, WR0 = src.fk(rest_T, rest_R); WP0 = WP0[0]; WR0 = WR0[0]
    sdir = {s: WP0[src.idx[SCHILD[s]]] - WP0[src.idx[s]] for s in SCHILD}
    # leg length ratio for the hips' motion
    s_leg = WP0[src.idx['pelvis']][1] - WP0[src.idx['foot_l']][1]; ti = {n: i for i, n in enumerate(tgt_names)}
    t_leg = tgt_rest_wpos[ti['Hips']][1] - tgt_rest_wpos[ti['LeftFoot']][1]; k = t_leg / s_leg
    up = np.array([0, 1.0, 0])
    for name, ch in clips.items():
        dur = max(t[-1] for (t, v, _) in ch.values()); F = max(2, int(round(dur * fps)) + 1); times = np.linspace(0, dur, F)
        T = np.repeat(src.rt[None], F, 0).copy(); R = np.repeat(src.rr[None], F, 0).copy()
        for (node, path), (t, v, ip) in ch.items():
            if path == 'rotation': R[:, node] = sample(t, qnorm(v), times, ip)
            elif path == 'translation': T[:, node] = sample(t, v, times, ip)
        WP, WR = src.fk(T, R)
        tw = {}  # target world rotations per mapped bone
        for s, tn in MAP.items():
            if s not in src.idx: continue
            si = src.idx[s]; D = qmul(WR[:, si], qinv(WR0[si])[None])  # source world delta from rest
            if s in SCHILD and tn in tgt_dir:
                A = qarc(tgt_dir[tn], sdir[s])  # target rest dir -> source rest dir
                tw[tn] = qnorm(qmul(D, qmul(np.repeat(A[None], F, 0), np.repeat(tgt_rest_wrot[ti[tn]][None], F, 0))))
            else: tw[tn] = qnorm(qmul(D, np.repeat(tgt_rest_wrot[ti[tn]][None], F, 0)))
        # locals: walk the target hierarchy; unmapped bones keep their rest local rotation
        rest_local = {}
        for i, n in enumerate(tgt_names):
            p = tgt_parent[i]; rest_local[n] = tgt_rest_wrot[i] if p < 0 else qmul(qinv(tgt_rest_wrot[p]), tgt_rest_wrot[i])
        world = {}; loc = {}
        for i, n in enumerate(tgt_names):
            p = tgt_parent[i]; pw = world[tgt_names[p]] if p >= 0 else np.repeat(np.array([[0, 0, 0, 1.0]]), F, 0)
            if n in tw: world[n] = tw[n]; loc[n] = qnorm(qmul(qinv(pw), tw[n]))
            else: loc[n] = np.repeat(rest_local[n][None], F, 0); world[n] = qmul(pw, loc[n])
        hp = WP[:, src.idx['pelvis']] - WP0[src.idx['pelvis']]
        res[name] = {'times': times, 'rot': {n: loc[n] for n in tw}, 'hips': tgt_rest_wpos[ti['Hips']][None] + hp * k}
    return res
