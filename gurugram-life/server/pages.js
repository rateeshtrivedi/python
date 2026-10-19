// Plain HTML pages for search engines and people who want to read before playing: /about, /how-to-play, /places,
// plus robots.txt, sitemap.xml and a 404 page. The game itself is a 3D canvas, so these pages carry the words
// Google ranks. Everything here is visible text (no hidden keyword blocks); keep it true to the game.
import { PLACE_PAGES } from './places.js';
import { EXTRA } from './place-extra.js';
import { IMAGES } from './images.js';
import { HI_NAMES, HI_FAQ, HI_HOME, HI_HOW } from './hindi.js';
import { DIST } from '../public/shared/data.js';
export const SITE = (process.env.SITE_URL || 'https://gurugramlife.com').replace(/\/+$/, ''); // the address the domain host serves (www redirects here)
// When each page's content last really changed (sitemap <lastmod>). Bump the date when you edit a page; Google stops trusting
// lastmod that changes on every request. Pages not listed use EDITED.
const EDITED = '2026-10-19';
const LASTMOD = { '/': '2026-10-19', '/updates': '2026-10-19' };

const PLACES = [
  ['DLF Cyber City', 'Glass towers, office jobs at TechNova Towers and the evening rush.'],
  ['Cyber Hub', 'IPL screenings on the big screen and the city\'s nightlife crowd.'],
  ['Golf Course Road', 'Wide road for street races, neon underglow cruises and the baraat on wedding nights.'],
  ['Golf Course Extension', 'Newer high-rises; one of the first areas to flood in the monsoon.'],
  ['Sohna Road', 'Holi celebrations, the Gali ke Don finale and busy traffic.'],
  ['Iffco Chowk', 'The famous jam. During a "mahajam" event nobody moves for minutes.'],
  ['Rajiv Chowk', 'The giant GURUGRAM sign where most players start.'],
  ['Huda City Centre', 'Rapid Metro station and a waterlogging hotspot in the monsoon.'],
  ['Sector 29', 'Neon Nights club, dance floor and late-night fights.'],
  ['Sector 14 Market', 'Shops, street food and a gangster demanding hafta in the story.'],
  ['Galleria Market', 'Chaat, mithai and evening crowds.'],
  ['Sadar Bazaar', 'The old market, packed lanes and the first boss of Gali ke Don.'],
  ['Old Gurgaon', 'Narrow streets, old shops and Sandy Gunda\'s turf in the Gali ke Don story.'],
  ['Badshahpur', 'Village-style lanes, side jobs from Ramphal Ahlawat and roast battles at the chaupal.'],
  ['Leisure Valley Park', 'The akhara: wrestle the pehlwan in a dangal for the champion belt.'],
  ['Ambience Island', 'Ambience Mall for clothes, caps and showing off.'],
  ['NH-48 Auto Mile', 'Car showrooms: buy a Thar-style SUV, a superbike or a boat.'],
  ['DLF Phase 3', 'Residential blocks, PGs and quick rides for cab players.'],
  ['Sikanderpur', 'Rapid Metro stop and the quick way into Cyber City.'],
  ['Sushant Lok', 'Homes, markets and flooded roads when it pours.'],
  ['Sector 56', 'Sector 55-56 Rapid Metro stop; floods fast when it rains.'],
  ['Civil Hospital', 'Where you wake up after losing a fight.'],
  ['Bhondsi', 'Farmhouses that throw private parties.'],
  ['Aravali Biodiversity Park', 'Green hills on the edge of the city.'],
  ['Manesar', 'Factories and the long drive out of town.'],
];
const FAQ = [
  ['What is Gurugram Life?', 'Gurugram Life is a free 3D multiplayer life game set in Gurugram (Gurgaon), Haryana. You play in your web browser on a phone or a laptop, earn money with jobs, buy cars and clothes, race, party, fight and take over areas with your crew, in one shared city with other players.'],
  ['Is Gurugram Life free?', 'Yes. The game is free to play in the browser. There is nothing to download and no app store install.'],
  ['Can I play Gurugram Life on my phone?', 'Yes. It works in the mobile browser (Chrome, Safari) with an on-screen joystick and buttons, and on laptops and desktops with the keyboard and mouse.'],
  ['Which languages does the game support?', 'English, Hindi and Haryanvi. You pick the language on the first screen and can change it any time in Menu → Bhasha.'],
  ['Are the places real?', 'The areas are real Gurugram places such as DLF Cyber City, Golf Course Road, Sohna Road, Iffco Chowk, Rajiv Chowk and Sadar Bazaar. The shops and businesses inside the game are made up, except Ambience Mall.'],
  ['Is it like GTA or Lagos Life?', 'It is a desi city life game in that spirit: open city, cars, jobs and fights, with Gurugram humour like waterlogged roads, traffic jams, baraats and the weekly Gali ke Don story.'],
];

const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const CSS = `*{box-sizing:border-box}body{margin:0;background:#1b1410;color:#fff4d8;font:17px/1.6 "Mukta",system-ui,sans-serif}
a{color:#f6c026}header{background:#d7331f;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
header a.logo{font:800 26px/1 "Baloo 2",system-ui,sans-serif;color:#f6c026;text-decoration:none}header a.logo span{color:#fff}
nav{display:flex;gap:14px;flex-wrap:wrap;font-weight:700}nav a{color:#fff;text-decoration:none}nav a[aria-current]{text-decoration:underline}
main{max-width:860px;margin:0 auto;padding:22px 18px 40px}h1{font:800 clamp(30px,6vw,44px)/1.1 "Baloo 2",system-ui,sans-serif;color:#f6c026;margin:8px 0 12px}
h2{font:800 26px/1.2 "Baloo 2",system-ui,sans-serif;color:#f6c026;margin:28px 0 8px}h3{margin:18px 0 4px;font-size:19px}
.play{display:inline-block;background:#f6c026;color:#1b1410;font:800 22px "Baloo 2",system-ui,sans-serif;padding:10px 26px 6px;border-radius:14px;text-decoration:none;box-shadow:0 5px 0 #9b7410;margin:8px 0 14px}
.hero{width:100%;height:auto;border-radius:16px;border:3px solid #f6c026;display:block;margin:10px 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.card{background:#2a201a;border-radius:12px;padding:12px 14px;border-left:5px solid #f6c026}
.card b{display:block;color:#f6c026}kbd{background:#fff4d8;color:#1b1410;border-radius:5px;padding:0 6px;font-weight:800}
footer{border-top:1px solid #3a2d24;padding:18px;text-align:center;color:#d9c7a3;font-size:15px}
.crumbs{font-size:14px;color:#d9c7a3;margin:0 0 4px}.crumbs a{color:#d9c7a3}figure{margin:14px 0}figure img{width:100%;height:auto;border-radius:12px;display:block}figcaption{font-size:14px;color:#d9c7a3;margin-top:4px}
.gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.gal figure{margin:0}table{width:100%;border-collapse:collapse;margin:8px 0 14px}th,td{border:1px solid #3a2d24;padding:8px 10px;text-align:left;vertical-align:top}th{background:#2a201a;color:#f6c026}
video{width:100%;max-width:360px;border-radius:14px;display:block;margin:10px auto}`;
// alt: the same page in the other language ({ hi: '/hi/...' } or { en: '/...' }); trail: visible breadcrumb [[path, name], ...]
function page(req, { path, title, desc, h1, body, ld, image, imageAlt, lang = 'en-IN', alt, trail }) {
  const url = SITE + path, hi = lang === 'hi'; const lds = [].concat(ld || []).map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  const link = (p, t) => `<a href="${p}"${p === path ? ' aria-current="page"' : ''}>${t}</a>`;
  const og = SITE + (image || '/img/og-image.jpg');
  const langs = alt ? `<link rel="alternate" hreflang="${hi ? 'hi' : 'en-IN'}" href="${url}"><link rel="alternate" hreflang="${hi ? 'en-IN' : 'hi'}" href="${SITE}${alt.hi || alt.en}"><link rel="alternate" hreflang="x-default" href="${hi ? SITE + alt.en : url}">` : '';
  const nav = hi ? `${link('/', 'फ़्री खेलें')}${link('/hi', 'गेम के बारे में')}${link('/hi/how-to-play', 'कैसे खेलें')}${link('/hi/places', 'जगहें')}${link('/about', 'English')}`
    : `${link('/', 'Play free')}${link('/about', 'About')}${link('/how-to-play', 'How to play')}${link('/places', 'Places')}${link('/updates', 'Updates')}${link('/hi', 'हिंदी')}`;
  const crumbsHtml = trail ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Gurugram Life</a>${trail.map(([p, n], i) => i === trail.length - 1 ? ` › <span aria-current="page">${esc(n)}</span>` : ` › <a href="${p}">${esc(n)}</a>`).join('')}</nav>` : '';
  return `<!doctype html><html lang="${hi ? 'hi' : 'en-IN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">${langs}
<meta property="og:type" content="website"><meta property="og:locale" content="${hi ? 'hi_IN' : 'en_IN'}"><meta property="og:site_name" content="Gurugram Life"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(imageAlt || title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${og}"><meta name="theme-color" content="#d7331f">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png"><link rel="alternate" type="application/rss+xml" title="Gurugram Life updates" href="/updates.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Mukta:wght@400;700&display=swap">
<style>${CSS}</style>${lds}${analytics()}</head><body>
<header><a class="logo" href="/">Gurugram <span>Life</span></a><nav>${nav}</nav></header>
<main>${crumbsHtml}<h1>${h1}</h1>${body}</main>
<footer>${hi ? 'गुरुग्राम लाइफ़ · गुरुग्राम (गुड़गाँव), हरियाणा पर बना फ़्री 3D गेम · <a href="/">अभी खेलें</a>' : 'Gurugram Life · a free 3D city life game set in Gurugram (Gurgaon), Haryana · <a href="/">Play now</a> · <a href="/updates.xml">RSS</a>'}</footer></body></html>`;
}
// Google Analytics 4, only when the GA_ID environment variable is set (e.g. G-XXXXXXX on Render)
const GA_ID = (process.env.GA_ID || '').trim();
export function analytics() { return /^G-[A-Z0-9]+$/.test(GA_ID) ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>` : ''; }
// screenshots in the page: [{ src, alt, w, h }] -> figures (the first loads eagerly, the rest lazily)
const figs = list => list.map((f, i) => `<figure><img src="${f.src}" width="${f.w}" height="${f.h}" alt="${esc(f.alt)}"${i ? ' loading="lazy"' : ''} decoding="async"><figcaption>${esc(f.alt)}</figcaption></figure>`).join('');
const crumbs = (path, name, mid) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Gurugram Life', item: SITE + '/' }, ...(mid ? [{ '@type': 'ListItem', position: 2, name: mid[1], item: SITE + mid[0] }] : []), { '@type': 'ListItem', position: mid ? 3 : 2, name, item: SITE + path }] });
const BY_NAME = Object.fromEntries(PLACE_PAGES.map(p => [p.name, p]));
// areas next to this one on the game map (the city is a 5 x 5 grid of real areas)
function neighbours(name) { const d = DIST.find(x => x[2] === name); if (!d) return []; return DIST.filter(x => Math.abs(x[0] - d[0]) + Math.abs(x[1] - d[1]) === 1 && BY_NAME[x[2]]).map(x => BY_NAME[x[2]]); }
// "Getting there": direction and distance from Rajiv Chowk on the 5 x 5 game grid, the nearest Rapid Metro stop and start points
const METRO = [[-2, -2, 'Sikanderpur'], [0, -2, 'Cyber City'], [-1, -1, 'Huda City Centre'], [-2, 2, 'Sector 55-56']];
const STARTS = [[-1, -2, 'Ambience Mall'], [1, -1, 'Sector 29'], [1, -2, 'Cyber Hub'], [0, 0, 'Rajiv Chowk'], [1, 0, 'Sohna Road'], [-2, 0, 'Golf Course Road'], [1, 1, 'Badshahpur'], [2, -1, 'Leisure Valley']];
function gettingThere(P) {
  const d = DIST.find(x => x[2] === P.name); if (!d) return ''; const [i, j] = d, blocks = Math.abs(i) + Math.abs(j);
  const dir = (j < 0 ? 'north' : j > 0 ? 'south' : '') + (i > 0 ? (j ? '-east' : 'east') : i < 0 ? (j ? '-west' : 'west') : '');
  const near = (L) => L.map(m => [Math.abs(m[0] - i) + Math.abs(m[1] - j), m[2]]).sort((a, b) => a[0] - b[0])[0];
  const [md, mname] = near(METRO), st = STARTS.filter(q => q[0] === i && q[1] === j)[0], [sd, sname] = near(STARTS);
  const where = blocks ? `${P.name} is ${blocks} block${blocks > 1 ? 's' : ''} ${dir} of Rajiv Chowk, where most players start, so it is a ${blocks > 2 ? 'longer drive or a metro ride' : 'short drive or a bike ride'} away.` : `${P.name} is the centre of the game map, where most players start.`;
  const metro = md === 0 ? `It has its own Rapid Metro stop, ${mname}, with tickets at ₹30.` : `The nearest Rapid Metro stop is ${mname}, ${md} block${md > 1 ? 's' : ''} away (₹30 a ticket).`;
  const start = st ? `You can also choose ${st[2]} as your start place on the first screen and begin right here.` : `The closest start place you can pick on the first screen is ${sname}, ${sd} block${sd > 1 ? 's' : ''} away.`;
  return `<h2>Getting there</h2><p>${esc(where)} ${esc(metro)} ${esc(start)} Set the GPS from the map (press M, or Menu → Map) and follow the arrow.</p>`;
}
const placeFaq = P => [[`Can I visit ${P.name} in Gurugram Life?`, `Yes. ${P.name} is one of the 25 real Gurugram areas in the free game. Open gurugramlife.com in your phone or laptop browser, pick a start place and drive or walk there, or use the map to set your GPS.`],
  [`Is ${P.name} in the game the same as the real place?`, `It is a game version, not a map copy: the area, its feel and its landmarks are inspired by the real ${P.name}, while the shops and businesses are made up, except Ambience Mall.`]];
function placePage(req, P) {
  const path = '/places/' + P.slug, nb = neighbours(P.name), X = EXTRA[P.slug] || {}, img = IMAGES[P.slug] || [];
  return page(req, { path, title: `${P.name}, Gurugram in Gurugram Life: missions, money and tips`, desc: `${P.name} in Gurugram Life, the free 3D Gurugram (Gurgaon) game: ${P.todo.slice(0, 3).join(', ').toLowerCase()}. Missions, earnings, tips and screenshots.`.slice(0, 300),
    h1: `${esc(P.name)} in Gurugram Life`, image: img.length ? `/img/places/${P.slug}-og.jpg` : null, imageAlt: img[0] && img[0].alt, trail: [['/places', 'Places'], [path, P.name]],
    body: `${img[0] ? figs([img[0]]) : ''}
<h2>About ${esc(P.name)}</h2><p>${esc(P.real)}</p>
<h2>${esc(P.name)} in the game</h2><p>${esc(P.game)}</p>
${X.missions ? `<h2>Missions and jobs in ${esc(P.name)}</h2><ul>${X.missions.map(([m, r]) => `<li><b>${esc(m)}</b>: ${esc(r)}</li>`).join('')}</ul>` : ''}
${X.earn ? `<h2>What you can earn and spend</h2><p>${esc(X.earn)}</p>` : ''}
${img.length > 1 ? `<div class="gal">${figs(img.slice(1))}</div>` : ''}
<h2>Things to do</h2><ul>${P.todo.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
${X.tips ? `<h2>Tips for ${esc(P.name)}</h2><ul>${X.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
${X.compare ? `<h2>Real ${esc(P.name)} vs the game</h2><table><thead><tr><th>Real Gurugram</th><th>In Gurugram Life</th></tr></thead><tbody>${X.compare.map(([r, g]) => `<tr><td>${esc(r)}</td><td>${esc(g)}</td></tr>`).join('')}</tbody></table>` : ''}
${gettingThere(P)}
<h2>Questions about ${esc(P.name)}</h2>${placeFaq(P).map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}
${nb.length ? `<h2>Nearby on the map</h2><div class="grid">${nb.map(n => `<div class="card"><b><a href="/places/${n.slug}">${esc(n.name)}</a></b>${esc(n.todo[0])}.</div>`).join('')}</div>` : ''}
<p>New to the game? Read <a href="/how-to-play">how to play</a> or <a href="/about">what Gurugram Life is</a>. Shops and businesses in the game are made up, except Ambience Mall. Prices and rewards are from the current version (see <a href="/updates">updates</a>).</p>
<a class="play" href="/">Play in ${esc(P.name)} now →</a>`,
    ld: [crumbs(path, P.name, ['/places', 'Places']), { '@context': 'https://schema.org', '@type': 'TouristAttraction', name: P.name, description: P.real, ...(img.length ? { image: img.map(i => SITE + i.src) } : {}), containedInPlace: { '@type': 'City', name: 'Gurugram', alternateName: 'Gurgaon' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: placeFaq(P).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] });
}
// what changed in the game, newest first (keep adding to the top)
export const UPDATES = [
  ['2026-10-19', 'Screenshots, Hindi pages and a trailer', ['Every place page now has real in-game screenshots, missions, earnings, tips and a real-vs-game comparison.', 'Hindi pages: गुरुग्राम लाइफ़ (/hi), कैसे खेलें and जगहें.', 'A 20-second gameplay trailer on the About page, and an RSS feed for these updates.', 'Fix: people right in front of a fast-moving camera now always show their realistic body.']],
  ['2026-10-19', 'A page for every place', ['Every Gurugram area in the game now has its own page with real-life background, things to do and nearby places.', 'New Updates page (this one).']],
  ['2026-10-18', 'Sound like GTA, street dogs and talking NPCs', ['Sound now starts with your first tap on phones.', 'Street fighters, drivers, race rivals and the Gali ke Don bosses speak their lines out loud in Hindi and Haryanvi.', 'Radio plays in vehicles, with RJ Bunty, station idents and funny ads for in-game businesses. New English Hits channel.', 'City sounds on foot: horns, autos, crows, koels, vendors calling and temple bells. Soft footsteps and punches.', 'Chase music that builds up as the police close in.', 'Desi street dogs that sniff around, bark and run away from speeding cars.']],
  ['2026-10-18', 'Realistic world and 3D people', ['Realistic 3D people with clothes, hair, skin tones and real animations.', 'Sky with clouds, sun shadows, reflective glass towers and shiny cars.', 'Detailed roads, zebra crossings, black-and-yellow kerbs, pavers and building walls with AC units.', 'A proper CNG auto, better cars, buses and trucks, and desi cows.']],
  ['2026-10-18', 'Cleaner screen on phones', ['A smaller, less crowded HUD on phones so you can see the city, with one notification at a time.']],
  ['2026-10-16', 'Languages and the Gali ke Don story', ['Pick English, Hindi or Haryanvi on the first screen. Hindi is written in Roman letters.', 'Bollywood radio for Hindi and English players.', 'Gali ke Don, a five-chapter gangster story: it starts with a phone call and the boss comes to the nearest corner.']],
  ['2026-10-12', 'Monsoon and boats', ['Weather for everyone in the city, from drizzle to extreme rain, with roads that flood as it pours.', 'Buy a boat and outrun the Jal Police on the water.']],
  ['2026-10-11', 'Avatar creator, races and daily tasks', ['Make your own avatar and choose where to start.', 'Street races against five rivals, daily tasks that unlock the next level, and AI players when you are alone.', 'Easy GTA-style controls on phone and laptop, and a 3D city map.']],
];
function updatesPage(req) {
  return page(req, { path: '/updates', trail: [['/updates', 'Updates']], title: 'Gurugram Life updates: new features and patch notes', desc: 'What is new in Gurugram Life, the free 3D Gurugram (Gurgaon) game: latest features, fixes and patch notes, newest first.',
    h1: 'Updates and patch notes',
    body: `<p>Gurugram Life gets new features every few days. Here is what changed, newest first.</p>
${UPDATES.map(([d, t, items]) => `<h2 id="u-${d}">${esc(t)}</h2><p><time datetime="${d}">${new Date(d + 'T12:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</time></p><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('\n')}
<p>See the <a href="/places">places</a> you can visit and <a href="/how-to-play">how to play</a>.</p><a class="play" href="/">Play the latest version →</a>`,
    ld: [crumbs('/updates', 'Updates')] });
}

// the gameplay trailer on /about (a cut of the 18 Oct reel with its original beat)
const TRAILER = { '@context': 'https://schema.org', '@type': 'VideoObject', name: 'Gurugram Life gameplay: a "chill Sunday" in Gurugram', description: 'Twenty seconds of the free 3D Gurugram game: cow traffic, chaat at Galleria Market, a dangal with the pehlwan, a roast at the village chaupal and Holi on Sohna Road.',
  thumbnailUrl: [SITE + '/media/trailer.jpg'], uploadDate: '2026-10-18T19:00:00+05:30', duration: 'PT20S', contentUrl: SITE + '/media/trailer.mp4', embedUrl: SITE + '/about', inLanguage: 'en-IN' };
export const PAGES = {
  '/about': req => page(req, { path: '/about', trail: [['/about', 'About']], title: 'About Gurugram Life: free 3D Gurugram (Gurgaon) life game',
    desc: 'Gurugram Life is a free 3D multiplayer life game set in real Gurugram (Gurgaon). Earn, race, party and fight in Cyber City, Golf Course Road and Sohna Road, in English, Hindi or Haryanvi.',
    h1: 'Gurugram Life: the free 3D Gurugram life game',
    body: `<p><b>Gurugram Life</b> is a free 3D multiplayer game set in <b>Gurugram (Gurgaon), Haryana</b>. Open it in your browser on a phone or a laptop and you are dropped into one shared city with other players: earn money, buy cars and clothes, race on Golf Course Road, party at Neon Nights in Sector 29, survive the Iffco Chowk jam and the monsoon waterlogging, and fight your way up in the weekly Gali ke Don story.</p>
<a class="play" href="/">Play free now →</a>
<img class="hero" src="/img/og-image.jpg" width="1200" height="630" alt="Players at the GURUGRAM sign at Rajiv Chowk in the Gurugram Life game">
<h2>Watch: 20 seconds of Gurugram Life</h2><video controls preload="none" playsinline poster="/media/trailer.jpg" width="360" height="640"><source src="/media/trailer.mp4" type="video/mp4">Your browser cannot play this video.</video>
<h2>What you can do</h2><div class="grid">
<div class="card"><b>Earn money</b>Office shifts at TechNova Towers in Cyber City, Chalo cab rides, Jhatpat deliveries, races and dangal fights.</div>
<div class="card"><b>Drive and race</b>Hatchbacks, SUVs, superbikes, autos, buses and boats. Street races with NOS and police chases.</div>
<div class="card"><b>Show off</b>VIP HR26 number plates by live auction, gold chains, caps, car mods, leaderboards and a selfie card to share.</div>
<div class="card"><b>Party and festivals</b>Neon Nights club, baraats on Golf Course Road, Holi on Sohna Road, Diwali fireworks and IPL screenings at Cyber Hub.</div>
<div class="card"><b>Fight and crews</b>Punch it out with road-ragers, take any car from its driver, form a crew and take over sectors.</div>
<div class="card"><b>Daily tasks and story</b>New tasks every day and Gali ke Don, a five-chapter gangster story that starts with a phone call.</div></div>
<h2>Real Gurugram places</h2><p>The city is built from real Gurugram areas: DLF Cyber City, Cyber Hub, Golf Course Road, Sohna Road, Iffco Chowk, Rajiv Chowk, Huda City Centre, Sector 29, Sadar Bazaar, Old Gurgaon, Leisure Valley and more. The shops in them are made up (except Ambience Mall). <a href="/places">See all places in the game</a>.</p>
<h2>English, Hindi or Haryanvi</h2><p>Pick your language on the first screen. Hindi is written in Roman letters (Hinglish), the way people chat. Hindi and English players start with Bollywood radio, Haryanvi players with Haryanvi songs.</p>
<p><i>Gurugram Life ek free 3D game hai jo asli Gurugram (Gurgaon) mein set hai. Phone ya laptop ke browser mein kholo aur khelo: paise kamao, gaadi lo, race karo, party karo aur Gali ke Don se lado.</i></p>
<h2>Questions</h2>${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}
<h2>Credits</h2><p>People: Quaternius Universal Base Characters and Universal Animation Library (CC0). Street dogs: the Khronos "Fox" glTF sample, model by PixelMannen (CC0), rigging and animation by tomkranis, glTF conversion by @AsoboStudio and @scurest (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>), recoloured for the game. Radio songs come from live internet radio stations.</p>
<a class="play" href="/">Start playing Gurugram Life →</a>`,
    ld: [crumbs('/about', 'About'), TRAILER, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] }),

  '/how-to-play': req => page(req, { path: '/how-to-play', alt: { hi: '/hi/how-to-play' }, trail: [['/how-to-play', 'How to play']], image: (IMAGES['how-to-play'] || []).length ? '/img/how/how-to-play-og.jpg' : null, title: 'How to play Gurugram Life: controls, money, cars and tips',
    desc: 'Controls for phone and laptop, how to earn money fast, get a car, finish daily tasks and beat the Gali ke Don story in Gurugram Life, the free Gurugram (Gurgaon) browser game.',
    h1: 'How to play Gurugram Life',
    body: `<p>Gurugram Life runs in the browser. Open <a href="/">${SITE.replace(/^https?:\/\//, '')}</a>, choose English, Hindi or Haryanvi, type a name, make your avatar and pick where to start.</p>
<h2>Controls on a phone</h2><p>Left joystick to walk (push it all the way to run). Drag on the right side to look around. Buttons: <b>Jump</b> (NOS in a car), <b>Punch</b>, <b>Gaadi</b> (get in or out of a vehicle), <b>Action</b> when something is nearby, and <b>Menu</b> for everything else. Tap the small stats card for health, food and XP.</p>
${figs((IMAGES['how-to-play'] || []).slice(0, 1))}<h2>Controls on a laptop</h2><p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move, <kbd>Shift</kbd> run (NOS in a car), <kbd>Space</kbd> jump (handbrake drift in a car), left-click or <kbd>Q</kbd> punch, <kbd>E</kbd> action, <kbd>F</kbd> get in or out of a car, <kbd>Tab</kbd> menu, <kbd>M</kbd> 3D map, <kbd>T</kbd> chat. Click the game once to look with the mouse; <kbd>Esc</kbd> frees the mouse.</p>
<h2>Earn money fast</h2><ul><li>Daily tasks (Menu → Aaj ke kaam) pay the most and unlock the next level.</li><li>Chalo cab rides and Jhatpat deliveries pay per trip.</li><li>Office shifts at TechNova Towers in DLF Cyber City.</li><li>Street races and the dangal at Leisure Valley akhara.</li><li>City events: be among the first three to reach the baraat, Holi or the dropped money bag.</li></ul>
${(IMAGES['how-to-play'] || []).length > 1 ? `<div class="gal">${figs(IMAGES['how-to-play'].slice(1))}</div>` : ''}<h2>Get a car</h2><p>Walk up to any car on the road and press Action to pull the driver out. Beat him and the car is yours for the ride (the police may chase you). Or buy your own at the NH-48 Auto Mile showrooms.</p>
<h2>Gali ke Don</h2><p>A five-chapter story, one chapter a day, new every Monday. Someone calls you for help; accept and the boss and his chele come to the nearest street corner. Win all five to become this week's Gali ka Don.</p>
<h2>Monsoon and floods</h2><p>When it rains, roads in Huda City Centre, Sushant Lok, Sector 56 and Golf Course Extension fill with water. Wade, drive slowly or buy a boat. Watch out for the Jal Police.</p>
<a class="play" href="/">Play now →</a>`,
    ld: [crumbs('/how-to-play', 'How to play')] }),

  '/places': req => page(req, { path: '/places', alt: { hi: '/hi/places' }, trail: [['/places', 'Places']], title: 'Gurugram places in Gurugram Life: Cyber City, Golf Course Road, Sohna Road',
    desc: 'All the real Gurugram (Gurgaon) areas you can visit in the Gurugram Life game, from DLF Cyber City and Golf Course Road to Iffco Chowk, Sadar Bazaar and Old Gurgaon.',
    h1: 'Gurugram places in the game',
    body: `<p>Gurugram Life is built from ${PLACES.length} real areas of Gurugram (Gurgaon). Here is what you will find in each one in the game.</p>
<div class="grid">${PLACES.map(([n, d]) => `<div class="card"><b>${BY_NAME[n] ? `<a href="/places/${BY_NAME[n].slug}">${esc(n)}</a>` : esc(n)}</b>${esc(d)}</div>`).join('')}</div>
<p>Businesses and shop names inside the game are made up for fun, except Ambience Mall.</p><a class="play" href="/">Explore Gurugram now →</a>`,
    ld: [crumbs('/places', 'Places'), { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Gurugram areas in Gurugram Life', itemListElement: PLACES.map(([n], i) => ({ '@type': 'ListItem', position: i + 1, name: n })) }] }),
};

// Hindi pages: [path, English partner] (hreflang pairs); '/' (the game) is the English partner of /hi
const HINDI = [['/hi', '/'], ['/hi/how-to-play', '/how-to-play'], ['/hi/places', '/places']];
PAGES['/hi'] = req => page(req, { path: '/hi', lang: 'hi', alt: { en: '/' }, title: 'गुरुग्राम लाइफ़: गुरुग्राम (गुड़गाँव) का फ़्री 3D गेम, मोबाइल और लैपटॉप पर',
  desc: 'गुरुग्राम लाइफ़ असली गुरुग्राम (गुड़गाँव) पर बना फ़्री 3D मल्टीप्लेयर गेम है। साइबर सिटी, गोल्फ़ कोर्स रोड और सोहना रोड पर पैसे कमाओ, रेस लगाओ, पार्टी करो। हिंदी, हरियाणवी और अंग्रेज़ी में।',
  h1: 'गुरुग्राम लाइफ़: गुरुग्राम का फ़्री 3D गेम', image: '/img/og-image.jpg', trail: [['/hi', 'हिंदी']],
  body: `${HI_HOME}<a class="play" href="/">अभी फ़्री खेलें →</a><h2>सवाल-जवाब</h2>${HI_FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}`,
  ld: [crumbs('/hi', 'हिंदी'), { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'hi', mainEntity: HI_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] });
PAGES['/hi/how-to-play'] = req => page(req, { path: '/hi/how-to-play', lang: 'hi', alt: { en: '/how-to-play' }, title: 'गुरुग्राम लाइफ़ कैसे खेलें: कंट्रोल, पैसे, गाड़ी और टिप्स',
  desc: 'गुरुग्राम लाइफ़ गेम के मोबाइल और लैपटॉप कंट्रोल, जल्दी पैसे कमाने के तरीके, गाड़ी कैसे लें, गली के डॉन की कहानी और बारिश में खेलने के टिप्स।',
  h1: 'गुरुग्राम लाइफ़ कैसे खेलें', trail: [['/hi', 'हिंदी'], ['/hi/how-to-play', 'कैसे खेलें']], body: `${HI_HOW}<a class="play" href="/">अभी खेलें →</a>`, ld: [crumbs('/hi/how-to-play', 'कैसे खेलें', ['/hi', 'हिंदी'])] });
PAGES['/hi/places'] = req => page(req, { path: '/hi/places', lang: 'hi', alt: { en: '/places' }, title: 'गुरुग्राम लाइफ़ गेम में गुरुग्राम की जगहें: साइबर सिटी, गोल्फ़ कोर्स रोड, सोहना रोड',
  desc: 'गुरुग्राम लाइफ़ गेम के 25 असली गुरुग्राम (गुड़गाँव) इलाके: डीएलएफ़ साइबर सिटी, गोल्फ़ कोर्स रोड, इफ़को चौक, सदर बाज़ार, पुराना गुड़गाँव और भी बहुत कुछ।',
  h1: 'गेम में गुरुग्राम की जगहें', trail: [['/hi', 'हिंदी'], ['/hi/places', 'जगहें']],
  body: `<p>गुरुग्राम लाइफ़ असली गुरुग्राम (गुड़गाँव) के ${PLACE_PAGES.length} इलाकों से बना है। हर इलाके की पूरी जानकारी (मिशन, कमाई, टिप्स और स्क्रीनशॉट) अंग्रेज़ी पेज पर है।</p>
<div class="grid">${PLACE_PAGES.map(P => { const h = HI_NAMES[P.slug] || [P.name, '']; return `<div class="card"><b><a href="/places/${P.slug}" hreflang="en">${esc(h[0])}</a></b>${esc(h[1])}</div>`; }).join('')}</div>
<p>गेम की दुकानें और कंपनियाँ काल्पनिक हैं, सिर्फ़ एम्बिएंस मॉल को छोड़कर।</p><a class="play" href="/">गुरुग्राम घूमो →</a>`,
  ld: [crumbs('/hi/places', 'जगहें', ['/hi', 'हिंदी'])] });
for (const P of PLACE_PAGES) PAGES['/places/' + P.slug] = req => placePage(req, P);
PAGES['/updates'] = updatesPage;

// Structured data for the home page: the game, the website and who makes it.
export function homeLD() {
  return [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Gurugram Life', alternateName: ['Gurgaon Life', 'Gurugram Life game'], url: SITE + '/', inLanguage: ['en-IN', 'hi-Latn'] },
    { '@context': 'https://schema.org', '@type': 'VideoGame', name: 'Gurugram Life', alternateName: ['Gurgaon Life', 'Gurugram Life 3D'], url: SITE + '/', image: SITE + '/img/og-image.jpg',
      description: 'Free 3D multiplayer life game set in Gurugram (Gurgaon), Haryana. Earn, race, party and fight in Cyber City, Golf Course Road and Sohna Road, in your browser on phone or laptop.',
      genre: ['Life simulation', 'Open world', 'Action', 'Racing'], gamePlatform: ['Web browser', 'Android', 'iOS', 'Windows', 'macOS'], applicationCategory: 'GameApplication', operatingSystem: 'Any (web browser)',
      playMode: ['MultiPlayer', 'SinglePlayer'], inLanguage: ['en-IN', 'hi-Latn'], isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
      contentLocation: { '@type': 'City', name: 'Gurugram', alternateName: 'Gurgaon', containedInPlace: { '@type': 'State', name: 'Haryana' } } }];
}
export function robots() { return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /ws\n\nSitemap: ${SITE}/sitemap.xml\n`; }
export function sitemap() {
  const urls = ['/', '/about', '/how-to-play', '/places', '/updates', ...PLACE_PAGES.map(P => '/places/' + P.slug), ...HINDI.map(h => h[0])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${LASTMOD[p] || EDITED}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}
// RSS feed of /updates (newest first)
export function rss() {
  const item = ([d, t, items]) => `<item><title>${esc(t)}</title><link>${SITE}/updates#u-${d}</link><guid isPermaLink="false">gurugramlife-${d}-${esc(t).replace(/\W+/g, '-').toLowerCase()}</guid><pubDate>${new Date(d + 'T12:00:00+05:30').toUTCString()}</pubDate><description>${esc(items.join(' '))}</description></item>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Gurugram Life updates</title><link>${SITE}/updates</link><description>New features and patch notes for Gurugram Life, the free 3D Gurugram (Gurgaon) game.</description><language>en-in</language>${UPDATES.map(item).join('')}</channel></rss>\n`;
}
// llms.txt: a short plain-text guide to the site for AI assistants and crawlers
export function llms() {
  return `# Gurugram Life\n\n> Free 3D multiplayer city life game set in real Gurugram (Gurgaon), Haryana, India. Plays in the web browser on phone or laptop, in English, Hindi or Haryanvi. No download.\n\n## Pages\n- [Play the game](${SITE}/)\n- [About Gurugram Life](${SITE}/about): what the game is, features, FAQ\n- [How to play](${SITE}/how-to-play): phone and laptop controls, earning money, cars, story\n- [Gurugram places](${SITE}/places): the 25 real areas in the game\n${PLACE_PAGES.map(P => `- [${P.name}](${SITE}/places/${P.slug}): ${P.todo[0]}`).join('\n')}\n- [Updates](${SITE}/updates): patch notes ([RSS](${SITE}/updates.xml))\n- [Hindi: गुरुग्राम लाइफ़](${SITE}/hi)\n\n## Notes\n- Places are real Gurugram areas; shops and businesses in the game are made up, except Ambience Mall.\n- Songs on the in-game radio come from live internet radio stations.\n`;
}
export function notFound(req) {
  return page(req, { path: '/404', title: 'Page not found · Gurugram Life', desc: 'This page does not exist. Play Gurugram Life, the free 3D Gurugram game.', h1: 'Galat gali mein aa gaye! (404)',
    body: '<p>This page does not exist. Maybe the link is old.</p><a class="play" href="/">Go to the game →</a>' }).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"');
}
