# Screenshots for the info pages
- `views.js`: camera views per page (place slug → [view name, time of day, setup]).
- `shoot.cjs`: takes them from the real game (needs the server on :3122): `node shoot.cjs [slug,...]` → `raw/<slug>--<view>.png`.
- `build.py`: makes `public/img/places/<slug>-<n>.webp`, `<slug>-og.jpg` (share image with the place name) and `server/images.js` (alt text).
Run `node order.cjs` after editing `views.js`, then `python3 build.py`. Alt texts live in `build.py`.
