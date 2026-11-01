"""Build the game's realistic people from the MakeHuman CC0 package: public/models/people-m.glb and people-f.glb.
Each file: one rig (Mixamo bone names), the body, every outfit (top/bottom split so the game can tint shirt and pants),
hairstyles, eyes, eyebrows, eyelashes, the skin textures and the game's animation clips retargeted onto this rig.
usage: python3 scripts/people/build_people.py <humanforge assets/human dir> <anims.glb> <out dir>  (see README.md)"""
import base64, io, json, os, sys, numpy as np
from PIL import Image, ImageOps, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
import mhpkg, retarget as RT, glbw
from retarget import qarc, qmul, qinv

PKG, ANIMS, OUT = sys.argv[1:4]
pk = mhpkg.Pkg(PKG); N = pk.man['vertexCount']
SRC = RT.SrcSkel(ANIMS); CLIPS = SRC.clips()

# body shapes: an average adult from Gurugram (MakeHuman ethnic mix leaning South Asian), a little taller for men
SHAPE = {'m': dict(gender=1, age=0.2, muscle=0.55, weight=0.52, height=0.55, proportions=0.55, african=0.3, asian=0.4, caucasian=0.3),
         'f': dict(gender=0, age=0.14, muscle=0.45, weight=0.5, height=0.48, proportions=0.55, cupSize=0.5, african=0.3, asian=0.4, caucasian=0.3)}
# outfits: list of (proxy id, part) where part = 'top' | 'bottom' | 'all' | 'split' (cut at the waist into top+bottom) | 'kurta' (cut at the knee)
OUTFITS = {
  'm': {'tee': [('male_casualsuit06', 'split'), ('shoes05', 'all')],            # white T-shirt + jeans: tint shirt and pants
        'kurta': [('jalabiya01', 'kurta'), ('male_casualsuit06', 'bottomonly'), ('shoes01', 'all')],
        'jacket': [('male_casualsuit05', 'split'), ('shoes02', 'all')],
        'shirt': [('male_casualsuit01', 'all'), ('shoes01', 'all')],
        'polo': [('male_casualsuit03', 'all'), ('shoes03', 'all')],
        'office': [('male_elegantsuit01', 'all'), ('shoes04', 'all')],
        'work': [('male_worksuit01', 'all'), ('shoes02', 'all')]},
  'f': {'kurti': [('dress_knee01', 'top'), ('female_sportsuit01', 'bottomonly'), ('shoes06', 'all')],
        'top': [('female_casualsuit01', 'split'), ('shoes05', 'all')],
        'saree': [('dress_maxi01', 'top'), ('shoes01', 'all')],
        'shirt': [('female_elegantsuit01', 'all'), ('shoes03', 'all')],
        'sport': [('female_sportsuit01', 'all'), ('shoes06', 'all')]},
}
TINT = {'jalabiya01': 'top', 'dress_knee01': 'top', 'dress_maxi01': 'top'}  # garments whose whole texture is tinted with the shirt colour
HAIR = {'m': ['short02', 'short01', 'short03', 'ponytail01', None], 'f': ['long01', 'ponytail01', 'braid01', 'rehmanpolanski_hair_bun_brown', 'bob02']}
SKINS = {'m': ['young_asian_male', 'middleage_asian_male', 'young_african_male', 'old_asian_male'],
         'f': ['young_asian_female', 'middleage_asian_female', 'young_african_female', 'old_asian_female']}
NOLOGO = {'clothes-male_casualsuit06', 'clothes-female_casualsuit01', 'clothes-female_casualsuit02'}
BROW = {'m': 'eyebrow001', 'f': 'eyebrow006'}; LASH = 'eyelashes01'

def tex_bytes(path, size, gray=False, keep_alpha=False, q=82):
    im = Image.open(path); im.load()
    if im.width > size: im = im.resize((size, size * im.height // im.width), Image.LANCZOS)
    b = io.BytesIO()
    if keep_alpha:
        im = im.convert('RGBA')
        if gray:  # luminance, stretched, so the game's tint gives the exact hair colour
            a = im.getchannel('A'); l = ImageOps.autocontrast(im.convert('L'), cutoff=1); l = l.point(lambda v: int(90 + v * 165 / 255)); im = Image.merge('RGBA', (l, l, l, a))
        im = im.quantize(64, method=Image.FASTOCTREE, dither=Image.NONE)  # palette + alpha: a quarter of the size
        im.save(b, 'PNG', optimize=True); return b.getvalue(), 'image/png'
    im = im.convert('RGB')
    if gray:
        if os.path.basename(path).split('.')[0] in NOLOGO: im = unprint(im)
        l = ImageOps.autocontrast(im.convert('L'), cutoff=1)
        l = l.point(lambda v: int(60 + v * 195 / 255)); im = Image.merge('RGB', (l, l, l))
    im.save(b, 'JPEG', quality=q, optimize=True, progressive=True); return b.getvalue(), 'image/jpeg'

def unprint(im):
    """Remove printed logos and coloured trim from a garment texture: pixels far from the local cloth colour (orange print,
    dark lettering on a white tee) are refilled from the surrounding cloth, so the game's tint gives a plain shirt."""
    a = np.asarray(im).astype(np.float32); med = np.asarray(im.filter(ImageFilter.MedianFilter(31))).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mask = ((r > b + 40) & (r > g + 10)) | (np.abs(a - med).sum(-1) > 70)
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)); mask = np.asarray(m) > 0
    keep = (~mask).astype(np.float32)[..., None]; out = a.copy()
    for rad in (6, 14, 30):  # normalized blur of the clean cloth fills the holes
        num = np.asarray(Image.fromarray(np.clip(a * keep, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))).astype(np.float32)
        den = np.asarray(Image.fromarray((keep[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))).astype(np.float32)[..., None] / 255
        fill = num / np.maximum(den, 1e-3); ok = (den[..., 0] > 0.15) & mask; out[ok] = fill[ok]; mask = mask & ~ok
        keep = np.maximum(keep, ok[..., None].astype(np.float32)); a = out.copy()
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def bitmask(m): return base64.b64encode(np.packbits(m.astype(np.uint8), bitorder='little').tobytes()).decode()

def build(g):
    P = pk.shape(SHAPE[g]); W = glbw.Writer()
    names = [b['name'] for b in pk.bones]; par = [b['parent'] for b in pk.bones]
    head = np.array([P[b['head']].mean(0) for b in pk.bones]); tail = np.array([P[b['tail']].mean(0) for b in pk.bones])
    up = np.tile([0, 1.0, 0], (len(names), 1)); wrot = qarc(up, tail - head)  # +Y down each bone, like the package's rig
    short = [n.replace('mixamorig:', '') for n in names]
    # rest pose locals
    lt, lr = [], []
    for i in range(len(names)):
        p = par[i]
        if p < 0: lt.append(head[i]); lr.append(wrot[i])
        else: lt.append(RT.qrot(qinv(wrot[p]), head[i] - head[p])); lr.append(qmul(qinv(wrot[p]), wrot[i]))
    # nodes: scene root -> rig root (scale applied by the game) -> bones; meshes are siblings of the bones under the rig
    bone_nodes = [W.node(name=short[i], translation=[float(x) for x in lt[i]], rotation=[float(x) for x in lr[i]]) for i in range(len(names))]
    for i in range(len(names)):
        ch = [bone_nodes[j] for j in range(len(names)) if par[j] == i]
        if ch: W.js['nodes'][bone_nodes[i]]['children'] = ch
    ibm = []
    for i in range(len(names)):  # inverse bind = inverse(world rest matrix)
        x, y, z, w = wrot[i]; R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        M = np.eye(4); M[:3, :3] = R; M[:3, 3] = head[i]; ibm.append(np.linalg.inv(M).T.reshape(16))
    W.js['skins'].append({'joints': bone_nodes, 'inverseBindMatrices': W.accessor(np.array(ibm, np.float32), 'MAT4'), 'skeleton': bone_nodes[0]})
    meshes = []; mcache = {}
    def add(name, pos, idx, uv, j, w, mat, extras=None, compact=True, key=None):
        if key is not None and key in mcache: meshes.append(W.node(name=name, mesh=mcache[key], skin=0)); return
        nrm = mhpkg.normals(pos, idx)
        if compact:
            used = np.unique(idx); remap = np.full(len(pos), -1, np.int64); remap[used] = np.arange(len(used))
            pos, nrm, uv, j, w, idx = pos[used], nrm[used], uv[used], j[used], w[used], remap[idx]
        mi = W.mesh(name, pos, nrm, uv, j, w, idx, mat, extras); meshes.append(W.node(name=name, mesh=mi, skin=0))
        if key is not None: mcache[key] = mi
    # skins (textures) and the body
    skin_tex = {s: W.image(*tex_bytes(os.path.join(PKG, 'skins', s + '_1k.webp'), 1024, q=76)) for s in SKINS[g]}
    body_mat = W.material('Skin', skin_tex[SKINS[g][0]], rough=0.55)
    mh = pk.body['_MH'].astype(np.int64)
    # body normals from the full MakeHuman mesh (so texture seams don't show), then mapped to render vertices
    bpos = P[mh]; bidx = pk.body['index']
    hide = {}
    def proxy_geo(pid, kind='clothes'):
        meta, pr = pk.proxy(kind, pid); pos = mhpkg.fit_proxy(P, meta, pr); idx = pr['index'].astype(np.int64)
        uv = pr['TEXCOORD_0'].astype(np.float64)
        return meta, pr, pos, idx, uv
    tex_cache = {}; mat_cache = {}; CL = 512
    BR = pk.man['bodyVertexRange']; BP = P[BR[0]:BR[1] + 1]
    def behind(pos, idx, t):
        """body vertices right under this garment (within 2 cm and not in front of it): hidden, so tight fits never show skin through"""
        # garment edges (collar, cuffs, hem) and two rings around them never hide skin: there the body must show
        e = np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), 1); ue, cnt = np.unique(e, axis=0, return_counts=True)
        edge = np.zeros(len(pos), bool); edge[ue[cnt == 1].ravel()] = True
        for _ in range(2): edge[e[edge[e].any(1)].ravel()] = True
        used = np.unique(t); gp = pos[used]; gn = mhpkg.normals(pos, idx)[used]; ge = edge[used]; out = np.zeros(N, bool); g2 = (gp ** 2).sum(1)
        for a in range(0, len(BP), 1500):
            b = BP[a:a + 1500]; d2 = (b ** 2).sum(1)[:, None] + g2[None] - 2 * b @ gp.T; k = d2.argmin(1); dist = np.sqrt(np.maximum(d2[np.arange(len(b)), k], 0))
            side = ((b - gp[k]) * gn[k]).sum(1); out[BR[0] + a:BR[0] + a + len(b)] = (dist < 0.02) & (side < 0.004) & ~ge[k]
        return out
    def mat(name, t, rough):
        if name not in mat_cache: mat_cache[name] = W.material(name, t, rough=rough)
        return mat_cache[name]
    def tex(path, size, gray=False, alpha=False):
        k = (path, size, gray, alpha)
        if k not in tex_cache: tex_cache[k] = W.image(*tex_bytes(path, size, gray, alpha))
        return tex_cache[k]
    waist_y = (head[short.index('Hips')][1] + head[short.index('Spine')][1]) / 2; knee_y = head[short.index('LeftLeg')][1]
    for oid, items in OUTFITS[g].items():
        hidden = np.zeros(N, bool)
        for pid, part in items:
            meta, pr, pos, idx, uv = proxy_geo(pid)
            texp = os.path.join(PKG, meta['texture']) if meta.get('texture') else None
            j, w = pr['_JOINTS'], pr['_WEIGHTS']
            h = mhpkg.hidden_mask(N, meta)
            t = idx.reshape(-1, 3); cy = pos[t].mean(1)[:, 1]
            if part == 'kurta':  # a knee-length kurta from the long tunic: drop what hangs below the knee, keep the legs' skin hidden by the pyjama instead
                keep = cy > knee_y + 0.02; t = t[keep]; h &= P[:, 1] > knee_y + 0.03
            if part == 'bottomonly': t = t[cy < waist_y + 0.02]; h &= P[:, 1] < waist_y
            hidden |= h | behind(pos, idx, t)
            pos = pos + mhpkg.normals(pos, idx) * 0.003  # a hair off the skin
            tint_top = TINT.get(pid) == 'top' or part in ('kurta', 'top')
            if part in ('split', 'bottomonly'):
                ty = pos[t].mean(1)[:, 1]; isbot = ty <= waist_y
                if part == 'split' and texp:  # follow the real hem: near the waist, a triangle is pants if its texture is denim-blue / dark
                    im = np.asarray(Image.open(texp).convert('RGB').resize((256, 256))).astype(int); c = uv[t].mean(1)
                    px = im[np.clip((c[:, 1] * 255).astype(int), 0, 255), np.clip((c[:, 0] * 255).astype(int), 0, 255)]
                    pantsy = (px[:, 2] > px[:, 0] + 12) | (px.sum(1) < 200)
                    near = np.abs(ty - waist_y) < 0.14; isbot = np.where(near, pantsy, isbot)
                top = t[~isbot]; bot = t[isbot]
                if part == 'split' and len(top): add('outfit__%s__top__%s' % (oid, pid), pos, top.reshape(-1), uv, j, w, mat(pid + '-top', tex(texp, CL, gray=True), 0.85), key=(pid, 'top'))
                if len(bot): add('outfit__%s__bottom__%s' % (oid, pid), pos, bot.reshape(-1), uv, j, w, mat(pid + '-bottom', tex(texp, CL, gray=True), 0.9), key=(pid, 'bottom'))
            else:
                kind = 'top' if tint_top else 'all'
                gray = tint_top and pid not in TINT  # tinted garments' textures are already pale
                add('outfit__%s__%s__%s' % (oid, kind, pid), pos, t.reshape(-1), uv, j, w,
                    W.material(pid, tex(texp, CL, gray=gray) if texp else None, rough=0.85, double=bool(meta.get('doubleSided')), color=[1, 1, 1, 1] if not texp else None), key=(pid, part, kind))
        hide[oid] = bitmask(hidden)
    add('body', bpos, bidx, pk.body['TEXCOORD_0'].astype(np.float64), pk.body['JOINTS_0'], pk.body['WEIGHTS_0'], body_mat,
        {'hide': hide, 'skins': {s: skin_tex[s] for s in SKINS[g]}}, compact=False)
    W.js['meshes'][W.js['nodes'][meshes[-1]]['mesh']]['extras']['mhIndex'] = base64.b64encode(mh.astype(np.uint16).tobytes()).decode()
    if g == 'm':  # beard and moustache: a thin stubble shell over the lower face (MakeHuman has no beard proxies); the mouth comes from the teeth
        _, tpr = pk.proxy('teeth', 'teeth_base'); tmeta = next(p for p in pk.man['proxies'] if p['kind'] == 'teeth')
        mouth = mhpkg.fit_proxy(P, tmeta, tpr).mean(0); hb = short.index('Head'); BJ, BW = pk.body['JOINTS_0'].astype(int), pk.body['WEIGHTS_0']
        hw = (BW * (BJ == hb)).sum(1); bn = mhpkg.normals(bpos, bidx); x, y, z = bpos[:, 0] - mouth[0], bpos[:, 1] - mouth[1], bpos[:, 2] - mouth[2]
        lips = (np.abs(x) < 0.027) & (y > -0.011) & (y < 0.008) & (z > -0.02)
        stache = (hw > 0.3) & (np.abs(x) < 0.03) & (y > 0.004) & (y < 0.021) & (z > -0.02) & (bn[:, 2] > 0.2) & ~lips
        full = (hw > 0.05) & (y < 0.021) & (y > -0.085) & (z > -0.075) & ~lips & (np.abs(x) < 0.075) & ~((y > 0.0) & (np.abs(x) > 0.045)) & ~((y < -0.05) & (z < -0.03))
        st = np.random.RandomState(7); a = st.rand(128, 128); a = (a > 0.42).astype(np.uint8) * 255; rgb = np.full((128, 128, 3), 150, np.uint8)
        im = Image.fromarray(np.dstack([rgb, a]), 'RGBA'); b = io.BytesIO(); im.save(b, 'PNG', optimize=True); btex = W.image(b.getvalue(), 'image/png')
        bmat = W.material('beard', btex, rough=0.8, alpha='MASK', double=False)
        for nm, sel in (('beard', full | stache), ('moonchh', stache)):
            t = bidx.reshape(-1, 3); t = t[sel[t].all(1)]
            add(nm, bpos + bn * 0.0018, t.reshape(-1), np.c_[bpos[:, 0] * 30, bpos[:, 1] * 30], BJ, BW, bmat)
    for k, hid in enumerate(HAIR[g]):
        if not hid: continue
        meta, pr, pos, idx, uv = proxy_geo(hid, 'hair'); texp = os.path.join(PKG, meta['texture'])
        add('hair__%d__%s' % (k, hid), pos, idx, uv, pr['_JOINTS'], pr['_WEIGHTS'], W.material('hair-' + hid, tex(texp, 512, gray=True, alpha=True), rough=0.6, alpha='MASK', double=True))
    for kind, pid, mname in (('eyes', 'high-poly', 'eyes'), ('eyebrows', BROW[g], 'brows'), ('eyelashes', LASH, 'lashes')):
        meta, pr, pos, idx, uv = proxy_geo(pid, kind)
        texp = os.path.join(PKG, 'eyes', 'brown.webp') if kind == 'eyes' else os.path.join(PKG, meta['texture'])
        m = W.material(mname, tex(texp, 256 if kind != 'eyes' else 512, gray=kind != 'eyes', alpha=kind != 'eyes'), rough=0.15 if kind == 'eyes' else 0.7, alpha=None if kind == 'eyes' else 'MASK', double=True)
        add(mname, pos, idx, uv, pr['_JOINTS'], pr['_WEIGHTS'], m)
    rig = W.node(name='rig', children=[bone_nodes[0]] + meshes)
    W.js['scenes'][0]['nodes'] = [rig]
    # animations
    tdir = {short[i]: tail[i] - head[i] for i in range(len(names))}
    res = RT.retarget(SRC, CLIPS, short, par, head, wrot, tdir)
    for cname, r in res.items():
        tin = W.accessor(r['times'].astype(np.float32), 'SCALAR', minmax=True); ch, sm = [], []
        for bn, q in r['rot'].items():
            sm.append({'input': tin, 'output': W.accessor(q.astype(np.float32), 'VEC4'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(sm) - 1, 'target': {'node': bone_nodes[short.index(bn)], 'path': 'rotation'}})
        sm.append({'input': tin, 'output': W.accessor(r['hips'].astype(np.float32), 'VEC3'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(sm) - 1, 'target': {'node': bone_nodes[0], 'path': 'translation'}})
        W.js['animations'].append({'name': cname, 'channels': ch, 'samplers': sm})
    W.js['extras'] = {'height': float(bpos[:, 1].max()), 'source': 'MakeHuman / MPFB2 assets (CC0 1.0), built for Gurugram Life'}
    n = W.save(os.path.join(OUT, 'people-%s.glb' % g)); print(g, 'people-%s.glb' % g, round(n / 1e6, 2), 'MB', len(meshes), 'meshes', len(res), 'clips', 'height', round(float(bpos[:, 1].max()), 3))

os.makedirs(OUT, exist_ok=True)
for g in ('m', 'f'): build(g)
