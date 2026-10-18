// Renders days/<DAY>/end.html and thumb.html (written by the day's build) to PNG. usage: DAY=... node cards.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs'); const path = require('path');
const DIR = path.join(__dirname, 'days', process.env.DAY);
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'fontcss.css'), 'utf8'), contentType: 'text/css' }));
  for (const f of fs.readdirSync(DIR).filter(f => /^(end|thumb).*\.html$/.test(f))) { await p.setViewportSize(f.includes('wide') ? { width: 1280, height: 720 } : { width: 1080, height: 1920 }); await p.goto('file://' + path.join(DIR, f)); await p.waitForTimeout(600); await p.screenshot({ path: path.join(DIR, f.replace('.html', '.png')) }); console.log('card', f); }
  await b.close(); })();
