"""Small glTF 2.0 binary writer: skinned meshes, embedded images, animations."""
import json, struct, numpy as np

class Writer:
    def __init__(self):
        self.js = {'asset': {'version': '2.0', 'generator': 'gurugram-life people builder'}, 'buffers': [{'byteLength': 0}], 'bufferViews': [], 'accessors': [],
                   'nodes': [], 'meshes': [], 'materials': [], 'skins': [], 'images': [], 'textures': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
                   'animations': [], 'scenes': [{'nodes': []}], 'scene': 0}
        self.bin = bytearray()
    def view(self, data, target=None, stride=None):
        while len(self.bin) % 4: self.bin.append(0)
        off = len(self.bin); self.bin += data; v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target: v['target'] = target
        if stride: v['byteStride'] = stride
        self.js['bufferViews'].append(v); return len(self.js['bufferViews']) - 1
    def accessor(self, arr, kind, target=None, normalized=False, minmax=False):
        arr = np.ascontiguousarray(arr); ct = {np.float32: 5126, np.uint16: 5123, np.uint8: 5121, np.uint32: 5125, np.int16: 5122, np.int8: 5120}[arr.dtype.type]
        bv = self.view(arr.tobytes(), target); a = {'bufferView': bv, 'componentType': ct, 'count': int(arr.shape[0]), 'type': kind}
        if normalized: a['normalized'] = True
        if minmax: a['min'] = [float(x) for x in arr.reshape(arr.shape[0], -1).min(0)]; a['max'] = [float(x) for x in arr.reshape(arr.shape[0], -1).max(0)]
        self.js['accessors'].append(a); return len(self.js['accessors']) - 1
    def image(self, data, mime):
        bv = self.view(data); self.js['images'].append({'bufferView': bv, 'mimeType': mime}); self.js['textures'].append({'sampler': 0, 'source': len(self.js['images']) - 1}); return len(self.js['textures']) - 1
    def material(self, name, tex=None, normal=None, rough=0.8, alpha=None, double=False, color=None):
        m = {'name': name, 'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': rough}}
        if tex is not None: m['pbrMetallicRoughness']['baseColorTexture'] = {'index': tex}
        if color: m['pbrMetallicRoughness']['baseColorFactor'] = color
        if normal is not None: m['normalTexture'] = {'index': normal}
        if alpha: m['alphaMode'] = alpha; m['alphaCutoff'] = 0.5
        if double: m['doubleSided'] = True
        self.js['materials'].append(m); return len(self.js['materials']) - 1
    def normals8(self, nrm):
        # KHR_mesh_quantization: normals as normalized int8, padded to 4 bytes per vertex
        q = np.zeros((len(nrm), 4), np.int8); q[:, :3] = np.clip(np.round(nrm * 127), -127, 127)
        bv = self.view(q.tobytes(), 34962, 4); self.js['accessors'].append({'bufferView': bv, 'componentType': 5120, 'normalized': True, 'count': len(nrm), 'type': 'VEC3'})
        ext = self.js.setdefault('extensionsUsed', []); req = self.js.setdefault('extensionsRequired', [])
        if 'KHR_mesh_quantization' not in ext: ext.append('KHR_mesh_quantization'); req.append('KHR_mesh_quantization')
        return len(self.js['accessors']) - 1
    def mesh(self, name, pos, nrm, uv, joints, weights, index, mat, extras=None):
        w = np.clip(weights, 0, None); w = w / np.maximum(w.sum(1, keepdims=True), 1e-9); w8 = np.round(w * 255).astype(np.int32)
        big = w8.argmax(1); w8[np.arange(len(w8)), big] += 255 - w8.sum(1); w8 = w8.astype(np.uint8)  # sums to exactly 255
        okuv = uv.min() >= 0 and uv.max() <= 1
        uva = self.accessor(np.round(uv * 65535).astype(np.uint16), 'VEC2', 34962, normalized=True) if okuv else self.accessor(uv.astype(np.float32), 'VEC2', 34962)
        attrs = {'POSITION': self.accessor(pos.astype(np.float32), 'VEC3', 34962, minmax=True), 'NORMAL': self.normals8(nrm),
                 'TEXCOORD_0': uva, 'JOINTS_0': self.accessor(joints.astype(np.uint8), 'VEC4', 34962),
                 'WEIGHTS_0': self.accessor(w8, 'VEC4', 34962, normalized=True)}
        ix = index.astype(np.uint16 if index.max() < 65535 else np.uint32)
        p = {'attributes': attrs, 'indices': self.accessor(ix, 'SCALAR', 34963), 'material': mat}
        m = {'name': name, 'primitives': [p]}
        if extras: m['extras'] = extras
        self.js['meshes'].append(m); return len(self.js['meshes']) - 1
    def node(self, **kw):
        self.js['nodes'].append({k: v for k, v in kw.items() if v is not None}); return len(self.js['nodes']) - 1
    def save(self, path):
        js = {k: v for k, v in self.js.items() if not (isinstance(v, list) and not v and k not in ('buffers', 'scenes'))}
        while len(self.bin) % 4: self.bin.append(0)
        js['buffers'][0]['byteLength'] = len(self.bin)
        j = json.dumps(js, separators=(',', ':')).encode()
        while len(j) % 4: j += b' '
        out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(j) + 8 + len(self.bin)) + struct.pack('<I', len(j)) + b'JSON' + j + struct.pack('<I', len(self.bin)) + b'BIN\x00' + bytes(self.bin)
        open(path, 'wb').write(out); return len(out)
