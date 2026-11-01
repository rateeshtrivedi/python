# Realistic people builder

Builds `public/models/people-m.glb.gz` and `people-f.glb.gz` (the game's men and women) from MakeHuman / MPFB2 assets
(CC0 1.0, public domain) as packaged by humanforge 0.5.0 (`assets/human/`, fetched from
`https://cdn.jsdelivr.net/gh/abdulrehman043/humanforge@0.5.0/assets/human/...`, file list in its `files.json`).

```
python3 scripts/people/build_people.py <humanforge assets/human dir> public/models/anims.glb <out dir>
gzip -9 -c <out dir>/people-m.glb > public/models/people-m.glb.gz   # same for people-f
```

Needs Python 3 with numpy and Pillow. What it does:

- shapes one average adult man and woman with the MakeHuman macro morphs (`mhpkg.py`);
- fits the clothes, hair, eyes, eyebrows and eyelashes onto that shape (MakeHuman's reference-triangle fit);
- cuts two-piece suits at the real hem (by the garment texture) so the game can tint shirt and pants separately,
  removes printed logos, and hides the body skin under each outfit (bitmask in the body's extras);
- makes a stubble beard and moustache from the face around the mouth;
- retargets the Quaternius Universal Animation Library clips in `public/models/anims.glb` onto the rig (`retarget.py`);
- writes compact glTF: per-mesh vertex compaction, int8 normals (KHR_mesh_quantization), 8-bit weights,
  16-bit UVs, 512 px clothes, 1k skins.

The server sends the `.gz` files as they are with `Content-Encoding: gzip` (`server/index.js`).
