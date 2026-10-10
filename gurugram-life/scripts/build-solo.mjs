// Builds dist/gurugram-life-solo.html: the whole game (three.js, client, world rules) in one
// self-contained page that plays single-player with no server. Used for the shareable artifact.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shareUrl = process.argv[2] || '';
const out = await build({
  entryPoints: [path.join(root, 'public/js/game.js')], bundle: true, format: 'iife', minify: true, write: false,
  target: ['es2020'], legalComments: 'none', logLevel: 'warning',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="module"'));
const page = `<title>Gurugram Life</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Mukta:wght@400;600;700&display=swap">
<style>
${css}
</style>
${body.trim()}
<script>window.GL_SOLO = true; window.GL_SHARE_URL = ${JSON.stringify(shareUrl)};</script>
<script>
${js}
</script>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const file = path.join(root, 'dist/gurugram-life-solo.html');
fs.writeFileSync(file, page);
console.log('wrote', path.relative(root, file), (page.length / 1024).toFixed(0) + ' KB');
