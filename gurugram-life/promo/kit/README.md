# Gurugram Life reel kit

Makes the daily English POV + hook Instagram Reel / YouTube Short from real gameplay.

- `cap.cjs`: captures `days/<DAY>/scenes.js` from the real game (vertical 1080x1920, virtual clock, HUD hidden, POV text overlay from `lib.js`).
- `bolly.py`: original Bollywood-style beats (filmy, item, edm, action, gangster, baraat, retro, haryanvi), synthesised, no samples.
- `mix.py`: beat + scene sound effects from `days/<DAY>/sound.json`; writes a with-beat and a no-music (SFX only) track.
- `cards.cjs`: renders `end.html`, `thumb.html`, `thumb_wide.html` (thumbnail uses `bg.jpg`, a frame from the video).
- `make.sh`: `DAY=2026-10-17 N=1 ./make.sh` → `days/<DAY>/out/` (reel, short, no-music versions, thumbnails, texts).
- `plan.json`: the 17-24 Oct plan. `log.json`: what was already made (never repeat a concept, beat style or song).

Real Bollywood songs are not put in the files (copyright): each day's texts name the song to add in the Instagram / YouTube app.

## Restore on a fresh machine
1. Copy this folder to the scratchpad as `kit/`.
2. Start the game server: `cd gurugram-life && PORT=3120 DATA_DIR=$(mktemp -d) node server/index.js &`
3. Needs Playwright + Chromium (`/opt/node-tools/node_modules/playwright`, `/opt/pw-browsers/chromium-*`), ffmpeg, python3 + numpy.
4. `DAY=<date> LOWRES=1 OUT=days/<date>/test.mp4 node cap.cjs` to preview, then without LOWRES for the final, then `make.sh`.
