# Vehicle and cow models

`public/models/rides/*.glb` are made from Sketchfab models (CC BY 4.0, credits in `public/shared/credits.js`,
shown in Menu → Credits and on /about). The originals are on the GitHub release `models`:
https://github.com/rateeshtrivedi/python/releases/tag/models

To rebuild them (for example after changing a length or the simplify ratio):

```sh
mkdir -p /tmp/gt && cd /tmp/gt && npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer@0.21 sharp
for f in ace_11_-_low_poly_model autorikshaw_-_indian_tuk_tuk bus eugene_mk6_65_-_low_poly_model kiri_10_-_low_poly_model lct_3000_95_-_low_poly_model old_motorcycle old_scooter zebu_bull; do
  curl -sLo /tmp/sk/$f.glb --create-dirs https://github.com/rateeshtrivedi/python/releases/download/models/$f.glb; done
cp <repo>/gurugram-life/promo/models/rides.mjs . && node rides.mjs /tmp/sk/ <repo>/gurugram-life/public/models/rides/
```

The script drops the ground plates and foreign number plates, bakes every model to face +Z with its wheels on y = 0 at
the game's length, merges parts by material, cuts triangles, and shrinks textures to 512 px. Adding a new model: add a
line to `LIST` in `rides.mjs`, map the game vehicle to it in `MODEL_OF` (`public/js/rides.js`) and add its credit to
`public/shared/credits.js`.
