# A3 poster

Print poster for gaming parlours, cafes and colleges. The QR code opens `https://gurugramlife.com/?utm_source=poster&utm_medium=qr` (tested: decodes even when the image is shrunk to 12%, i.e. scanned from a distance).

## Files in `out/`
- `GurugramLife_A3_poster.pdf`: A3 (297 x 420 mm), for any office/shop printer. Print at "Actual size", not "Fit".
- `GurugramLife_A3_poster_print_bleed.pdf`: 303 x 426 mm with 3 mm bleed on every side, for a print shop (they trim to A3). Text stays 12 mm inside the trim.
- `GurugramLife_A3_poster_300dpi.png`: 3578 x 5031 px image of the bleed version, for WhatsApp or print shops that want an image.

Ask the printer for 170-250 gsm gloss or matte paper; for walls in sunlight, lamination.

## Edit and re-render
- `poster.html` is the design (sizes in mm). `qr.svg` is the QR code; `shots/` are real game stills.
- Re-render: `NODE_PATH=$(npm root -g) node render.cjs` (writes `out/`); `node render.cjs preview` writes a quick `preview.png`.
- New QR: `python3 -c "import segno; segno.make('<url>', error='q').save('qr.svg', scale=10, border=0, dark='#120c08', light=None)"`.
- New stills from the game: start the server on port 3120 (see `../README.md`), then `DIR=../days/<DAY> PICK=scene:frame,... node stills.cjs` (saves 1620 x 2880 jpgs in `shots/`).
