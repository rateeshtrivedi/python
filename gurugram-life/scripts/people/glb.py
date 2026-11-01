"""Minimal GLB reader/writer (numpy) for the character builder."""
import json, struct, gzip, numpy as np
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def read(path):
    b = open(path, 'rb').read()
    if path.endswith('.gz'): b = gzip.decompress(b)
    assert b[:4] == b'glTF'; n = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + n]); o = 20 + n
    bin_ = b''
    if o < len(b): bl = struct.unpack('<I', b[o:o + 4])[0]; bin_ = b[o + 8:o + 8 + bl]
    return js, bin_
def acc(js, bin_, i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]; dt = CT[a['componentType']]; nc = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); cnt = a['count']; stride = bv.get('byteStride')
    isz = np.dtype(dt).itemsize * nc
    if stride and stride != isz:
        raw = np.frombuffer(bin_, np.uint8, count=stride * (cnt - 1) + isz, offset=off)
        arr = np.lib.stride_tricks.as_strided(raw, (cnt, isz), (stride, 1)).copy().view(dt).reshape(cnt, nc)
    else: arr = np.frombuffer(bin_, dt, count=cnt * nc, offset=off).reshape(cnt, nc).copy()
    if a.get('normalized') and dt in (np.uint8, np.uint16, np.int8, np.int16): arr = arr.astype(np.float32) / np.iinfo(dt).max
    return arr if nc > 1 else arr[:, 0]
