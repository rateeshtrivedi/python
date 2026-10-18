// Plain HTML pages for search engines and people who want to read before playing: /about, /how-to-play, /places,
// plus robots.txt, sitemap.xml and a 404 page. The game itself is a 3D canvas, so these pages carry the words
// Google ranks. Everything here is visible text (no hidden keyword blocks); keep it true to the game.
export const SITE = (process.env.SITE_URL || 'https://www.gurugramlife.com').replace(/\/+$/, '');
const UPDATED = new Date().toISOString().slice(0, 10); // deploy date: pages change only when the code does

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
footer{border-top:1px solid #3a2d24;padding:18px;text-align:center;color:#d9c7a3;font-size:15px}`;
function page(req, { path, title, desc, h1, body, ld }) {
  const url = SITE + path; const lds = [].concat(ld || []).map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  const link = (p, t) => `<a href="${p}"${p === path ? ' aria-current="page"' : ''}>${t}</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Gurugram Life"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/img/og-image.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#d7331f">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Mukta:wght@400;700&display=swap">
<style>${CSS}</style>${lds}</head><body>
<header><a class="logo" href="/">Gurugram <span>Life</span></a><nav>${link('/', 'Play free')}${link('/about', 'About')}${link('/how-to-play', 'How to play')}${link('/places', 'Places')}</nav></header>
<main><h1>${h1}</h1>${body}</main>
<footer>Gurugram Life · a free 3D city life game set in Gurugram (Gurgaon), Haryana · <a href="/">Play now</a></footer></body></html>`;
}
const crumbs = (path, name) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Gurugram Life', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name, item: SITE + path }] });

export const PAGES = {
  '/about': req => page(req, { path: '/about', title: 'About Gurugram Life: free 3D Gurugram (Gurgaon) life game',
    desc: 'Gurugram Life is a free 3D multiplayer life game set in real Gurugram (Gurgaon). Earn, race, party and fight in Cyber City, Golf Course Road and Sohna Road, in English, Hindi or Haryanvi.',
    h1: 'Gurugram Life: the free 3D Gurugram life game',
    body: `<p><b>Gurugram Life</b> is a free 3D multiplayer game set in <b>Gurugram (Gurgaon), Haryana</b>. Open it in your browser on a phone or a laptop and you are dropped into one shared city with other players: earn money, buy cars and clothes, race on Golf Course Road, party at Neon Nights in Sector 29, survive the Iffco Chowk jam and the monsoon waterlogging, and fight your way up in the weekly Gali ke Don story.</p>
<a class="play" href="/">Play free now →</a>
<img class="hero" src="/img/og-image.jpg" width="1200" height="630" alt="Players at the GURUGRAM sign at Rajiv Chowk in the Gurugram Life game">
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
<a class="play" href="/">Start playing Gurugram Life →</a>`,
    ld: [crumbs('/about', 'About'), { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] }),

  '/how-to-play': req => page(req, { path: '/how-to-play', title: 'How to play Gurugram Life: controls, money, cars and tips',
    desc: 'Controls for phone and laptop, how to earn money fast, get a car, finish daily tasks and beat the Gali ke Don story in Gurugram Life, the free Gurugram (Gurgaon) browser game.',
    h1: 'How to play Gurugram Life',
    body: `<p>Gurugram Life runs in the browser. Open <a href="/">${SITE.replace(/^https?:\/\//, '')}</a>, choose English, Hindi or Haryanvi, type a name, make your avatar and pick where to start.</p>
<h2>Controls on a phone</h2><p>Left joystick to walk (push it all the way to run). Drag on the right side to look around. Buttons: <b>Jump</b> (NOS in a car), <b>Punch</b>, <b>Gaadi</b> (get in or out of a vehicle), <b>Action</b> when something is nearby, and <b>Menu</b> for everything else. Tap the small stats card for health, food and XP.</p>
<h2>Controls on a laptop</h2><p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move, <kbd>Shift</kbd> run (NOS in a car), <kbd>Space</kbd> jump (handbrake drift in a car), left-click or <kbd>Q</kbd> punch, <kbd>E</kbd> action, <kbd>F</kbd> get in or out of a car, <kbd>Tab</kbd> menu, <kbd>M</kbd> 3D map, <kbd>T</kbd> chat. Click the game once to look with the mouse; <kbd>Esc</kbd> frees the mouse.</p>
<h2>Earn money fast</h2><ul><li>Daily tasks (Menu → Aaj ke kaam) pay the most and unlock the next level.</li><li>Chalo cab rides and Jhatpat deliveries pay per trip.</li><li>Office shifts at TechNova Towers in DLF Cyber City.</li><li>Street races and the dangal at Leisure Valley akhara.</li><li>City events: be among the first three to reach the baraat, Holi or the dropped money bag.</li></ul>
<h2>Get a car</h2><p>Walk up to any car on the road and press Action to pull the driver out. Beat him and the car is yours for the ride (the police may chase you). Or buy your own at the NH-48 Auto Mile showrooms.</p>
<h2>Gali ke Don</h2><p>A five-chapter story, one chapter a day, new every Monday. Someone calls you for help; accept and the boss and his chele come to the nearest street corner. Win all five to become this week's Gali ka Don.</p>
<h2>Monsoon and floods</h2><p>When it rains, roads in Huda City Centre, Sushant Lok, Sector 56 and Golf Course Extension fill with water. Wade, drive slowly or buy a boat. Watch out for the Jal Police.</p>
<a class="play" href="/">Play now →</a>`,
    ld: [crumbs('/how-to-play', 'How to play')] }),

  '/places': req => page(req, { path: '/places', title: 'Gurugram places in Gurugram Life: Cyber City, Golf Course Road, Sohna Road',
    desc: 'All the real Gurugram (Gurgaon) areas you can visit in the Gurugram Life game, from DLF Cyber City and Golf Course Road to Iffco Chowk, Sadar Bazaar and Old Gurgaon.',
    h1: 'Gurugram places in the game',
    body: `<p>Gurugram Life is built from ${PLACES.length} real areas of Gurugram (Gurgaon). Here is what you will find in each one in the game.</p>
<div class="grid">${PLACES.map(([n, d]) => `<div class="card"><b>${esc(n)}</b>${esc(d)}</div>`).join('')}</div>
<p>Businesses and shop names inside the game are made up for fun, except Ambience Mall.</p><a class="play" href="/">Explore Gurugram now →</a>`,
    ld: [crumbs('/places', 'Places'), { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Gurugram areas in Gurugram Life', itemListElement: PLACES.map(([n], i) => ({ '@type': 'ListItem', position: i + 1, name: n })) }] }),
};

// Structured data for the home page: the game, the website and who makes it.
export function homeLD() {
  return [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Gurugram Life', alternateName: ['Gurgaon Life', 'Gurugram Life game'], url: SITE + '/', inLanguage: ['en', 'hi'] },
    { '@context': 'https://schema.org', '@type': 'VideoGame', name: 'Gurugram Life', alternateName: ['Gurgaon Life', 'Gurugram Life 3D'], url: SITE + '/', image: SITE + '/img/og-image.jpg',
      description: 'Free 3D multiplayer life game set in Gurugram (Gurgaon), Haryana. Earn, race, party and fight in Cyber City, Golf Course Road and Sohna Road, in your browser on phone or laptop.',
      genre: ['Life simulation', 'Open world', 'Action', 'Racing'], gamePlatform: ['Web browser', 'Android', 'iOS', 'Windows', 'macOS'], applicationCategory: 'GameApplication', operatingSystem: 'Any (web browser)',
      playMode: ['MultiPlayer', 'SinglePlayer'], inLanguage: ['en', 'hi'], isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
      contentLocation: { '@type': 'City', name: 'Gurugram', alternateName: 'Gurgaon', containedInPlace: { '@type': 'State', name: 'Haryana' } } }];
}
export function robots() { return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /ws\n\nSitemap: ${SITE}/sitemap.xml\n`; }
export function sitemap() {
  const urls = [['/', '1.0', 'daily'], ['/about', '0.8', 'weekly'], ['/how-to-play', '0.7', 'weekly'], ['/places', '0.7', 'monthly']];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, pr, f]) => `  <url><loc>${SITE}${p}</loc><lastmod>${UPDATED}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`;
}
export function notFound(req) {
  return page(req, { path: '/404', title: 'Page not found · Gurugram Life', desc: 'This page does not exist. Play Gurugram Life, the free 3D Gurugram game.', h1: 'Galat gali mein aa gaye! (404)',
    body: '<p>This page does not exist. Maybe the link is old.</p><a class="play" href="/">Go to the game →</a>' }).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"');
}
