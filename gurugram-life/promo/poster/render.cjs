// poster.html -> print PDF (with bleed), trim-size PDF, 300 dpi PNG, small preview. usage: node render.cjs [preview]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const prev = process.argv[2] === 'preview';
  const pxW = Math.round(303 / 25.4 * 96), pxH = Math.round(426 / 25.4 * 96);
  const ctx = await b.newContext({ viewport: { width: pxW, height: pxH }, deviceScaleFactor: prev ? 1 : 300 / 96 }); const p = await ctx.newPage();
  await p.goto('file://' + path.resolve('poster.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  await p.screenshot({ path: prev ? 'preview.png' : 'out/GurugramLife_A3_poster_300dpi.png' });
  if (!prev) {
    await p.pdf({ path: 'out/GurugramLife_A3_poster_print_bleed.pdf', width: '303mm', height: '426mm', printBackground: true, pageRanges: '1' });
    // trim-size version for normal printers: shift the page by the 3 mm bleed
    await p.addStyleTag({ content: '@page{size:297mm 420mm}html,body{width:297mm;height:420mm}body>*{translate:-3mm -3mm}' });
    await p.pdf({ path: 'out/GurugramLife_A3_poster.pdf', width: '297mm', height: '420mm', printBackground: true, pageRanges: '1' });
  }
  await b.close();
})();
