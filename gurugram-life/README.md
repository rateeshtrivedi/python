# Gurugram Life

A free 3D multiplayer life game set in Gurugram, played in the browser on desktop and phone. Earn money, show off, party, fight and take over sectors with your crew. Everyone who opens the site plays in one shared city.

Place names are real Gurugram localities and roads (Cyber City, Sector 29, Iffco Chowk, Sohna Road, Golf Course Road, Badshahpur, Bhondsi and more). Every shop, office, app and restaurant has a made-up name.

## Run it locally

Needs Node.js 18 or newer.

```bash
cd gurugram-life
npm install
npm start          # http://localhost:3000
```

Open the address in two browser windows to see multiplayer working.

`npm test` boots the server on a spare port and drives two simulated players through chat, fights, purchases, earning limits, reconnects and saving.

## Put it online

Step-by-step production guide (Render + your own .com domain + Cloudflare): see [DEPLOY.md](DEPLOY.md).

`render.yaml` at the repo root deploys an always-on Starter service in Singapore with a 1 GB disk for player progress. For other hosts, the `Dockerfile` works anywhere Docker runs; mount a volume at `/data`.

Settings (environment variables): `PORT` (default 3000), `DATA_DIR` (save location, default `./data`), `MAX_PLAYERS` (default 300) and `MAX_PER_IP` (default 8).

`npm run build:solo` writes `dist/gurugram-life-solo.html`, a single self-contained page that plays in solo mode with no server.

## What's in the game

**City and earning**
- 25 real Gurugram areas, Rapid Metro stations, day and night that follow real Gurugram time (IST), autos, buses, trucks and cows on the road.
- Jhatpat food delivery, Chalo rides, office shifts and promotions at TechNova Towers, side jobs from Ramphal Ahlawat (a land-rich crorepati in Badshahpur), and missions that never run out.
- Walk-in interiors: Ambience Mall (where every player starts), TechNova office, Desi Theka No.1, Sher-e-Haryana Dhaba and Neon Nights club.

**Show-off**
- Live VIP number plate auctions (HR26 0001, 0007, 0786…) and random HR26 plates.
- Car mods at Sandhu Car Accessories: pressure horn others can hear, black film, bull bar, bass speaker, neon underglow, stickers.
- Gold chain, kada, watch and gold sunglasses from Goyal Jewellers, visible to every player.
- Leaderboards: Richest, Fighters, Party Kings, Respect, Crews.
- "Mera Gurugram" selfie card to download or share on WhatsApp and Instagram.

**Party and drinks**
- Neon Nights club: DJ, light-up dance floor, bar, VIP bottle service announced to everyone, and dance-off battles.
- Farmhouse parties hosted by Bhondsi farmhouse owners; everyone gets an invite.
- Baraat on Golf Course Road: dance along or throw notes.
- Drinking makes you tipsy. The Traffic Police naka at Iffco Chowk checks drivers: pay the challan, argue, or run and get chased. Three drinks means a hangover until nimbu paani or sleep.

**Fights**
- Punch anyone; knockouts earn respect and send the loser to Civil Hospital.
- Road rage when two players' cars bump.
- Crews fight for control of sectors and earn an area bonus.
- Daily akhara champion belt at Leisure Valley, taken by knocking out the holder in the ring.
- Roast battles at Badshahpur Chaupal, voted on by everyone online.

**City-wide events** (every few minutes, same for everyone): baraat, Iffco Chowk mahajam, monsoon flood with surge pay, Holi colours, Diwali fireworks, IPL screening at Cyber Hub.

**Language**: the login screen (and Menu → Bhasha) lets players pick Haryanvi, Hindi or English. Hindi is written in Roman letters (Hinglish), like the Haryanvi. The game is written in Haryanvi; for Hindi and English every piece of text on screen is translated as it appears, using the language packs in `public/js/lang/`. Names of people, places and shops stay as they are. Hindi and English players join with the Bollywood station on.

**Radio**: real Haryanvi, Punjabi, Bollywood and English hit songs from live internet radio stations (found through the public radio-browser.info directory by `server/stations.js`, cached 6 hours, HTTPS streams only), starting at low volume, plus "Meri Playlist" for players' own song files.

**GTA-style sound**: the radio plays in vehicles and indoors. Walking the streets you hear the city instead: traffic rumble and horns near roads, autos passing, crows, koels and sparrows by day, crickets at night, crowd murmur and vendors calling ("Sabzi le lo!", "Chai, chai!") in markets, and bells near temples. Everything except the vendors' voices is synthesised. Every few minutes RJ Bunty (or an English RJ on English Hits) talks over the song with station idents, jokes and spoof ads for the game's own businesses (Chaudhary Motors, Bansal Sweets, Jhatpat Food…). The voice clips are in `public/audio/` (28 small MP3s, about 850 KB, each loaded only when it plays, made with the Kokoro text-to-speech voices). In police chases the music builds as the police close in, with a stinger when you escape or get caught. Races use the same chase music. Radio settings have switches for radio only in vehicles (on by default) and for city sounds.

**Joining**: name → character creator (ladka/ladki, skin, 5 hairstyles each, hair colour, T-shirt/kurta/jacket or kurti/jacket/saree, colours, pants, moonchh/daadhi or bindi/jhumke, cap/pagdi/dupatta, kaala chashma, and Chacha's car) with a live 3D preview → choose where to start (Ambience Mall runs the Pehla Din story).

**Controls**: click once for mouse-look (if the browser refuses mouse lock, drag to look and click to punch); W A S D, Space jump (handbrake in a car), Shift run (NOS in a car), left-click or Q punch, E action, F car, Tab menu, M 3D map. Phones: joystick, Jump/NOS, Punch, Gaadi, a contextual Action button and one Menu button.

**Realistic people**: characters near the camera are rigged 3D humans (Quaternius Universal Base Characters and Universal Animation Library, CC0 public domain; `public/models/`, about 2.7 MB, cached for a week). `public/js/humans.js` builds clothes from the body's own surface (smoothed and pushed out so they bend with the skeleton: T-shirt, kurta, jacket, kurti, saree with a flared hem, jeans or pyjama, shoes), adds real hairstyles and beards on the head bone, tints the skin to the five avatar skin tones, hides skin under clothes, and plays real animation clips (idle, walk, jog, sprint, jab/cross punches, dance, sit). Hats, glasses, chains and watches from the avatar creator follow the head, chest and wrists. The old box figure stays inside every character for people far away: `updateHumans` shows the real body only for the nearest people in view (22 on computers, 9 on phones), a small pool of realistic stand-ins replaces the nearest members of the instanced pavement crowds, and when the frame rate stays low at the lowest resolution the counts drop automatically. `?simple` in the address turns realistic people off. The game waits (up to 25 s) for the people models before entering the city, so nobody appears as a block figure first. The packs were shrunk with glTF-Transform (textures 1024/512, only the animations the game uses).

**Spoken lines**: NPCs speak instead of showing speech bubbles. Street fighters taunt, yelp and beg; carjacked drivers, the pehlwan, the Gali ke Don bosses, race rivals (Pinky Yadav in a female voice), pedestrians and drivers all have their own lines. The 146 lines are in `public/js/voices.js`, each recorded in 4 men's and 3 women's voices (`public/audio/v/`, Sarvam AI Bulbul v4 from Devanagari scripts, made by `promo/voices/sarvam.py`, each clip fetched only when first spoken). Every person keeps one voice for all their lines. **Fights use real recorded voices**: the player, other players, NPCs and passers-by grunt when hit and groan when knocked out, from CC0 recordings by voice actors (`public/audio/g/`, 5 men's and 2 women's voices, credited in Menu → Credits), with a slight pitch change each time so repeats don't sound copied. Clips are panned to where the speaker stands and fade with distance. Each speaker says one line at a time, with at most three voices at once. `VOX_VER` in `voices.js` changes the clip URLs when clips are regenerated, so browsers don't keep old ones from their cache. Player chat still shows as a bubble.

**Street dogs** (`public/js/dogs.js`): desi street dogs made from the Khronos "Fox" glTF sample (`public/models/dog.glb`, 160 KB; model CC0 by PixelMannen, rigging and animation CC BY 4.0 by tomkranis, credited on /about and in `public/models/LICENSE-Fox-dog.txt`), recoloured tan, brown, black or white. They patrol the footpaths, stop to sniff, bark when you walk up, and bolt from a speeding vehicle or a running player. 14 on computers, 8 on phones; far-away dogs skip their animation.

**Sapno ka Shehar** (main story; rules in `public/shared/world.js` `storyPrize` and `rishta`, homes in `public/js/homes.js`): new players get off the bus at Rajiv Chowk with ₹500 and sleep at a footpath camp. Finishing all seven daily tasks hands over the next home on `D.LADDER` for free (Sharma PG → 1BHK Sector 14 → 2BHK Sushant Lok → penthouse → kothi → farmhouse), and the last chapter's prize is the diamond set. Each home has its own interior, built when you walk in (more furniture, chandeliers, a jewellery case with what you own, a garage with your cars, an indoor pool at the farmhouse), and every session starts in bed there. Menu → Sapne tracks five dreams (home, car, jeevansathi, money, jewellery). With a 2BHK and a car, Mausi ji's rishta opens: meet at the Cyber Hub cafe, drive to Leisure Valley, buy the ring, pay for the shaadi; the spouse then lives at home. Players who already owned homes keep them and continue from their rung. `npm test` also runs `test/story.mjs`. A brand-new player first sees a 20-second intro film, played in the engine with their own avatar (off the bus at Rajiv Chowk, a night at the footpath camp, then the dream: farmhouse, long car, shaadi, money and jewellery, and the title), with a Hindi narrator and score in `public/audio/intro/intro.mp3` (made by `promo/intro/vo.py` and `score.py`). It plays once per device (`gl_intro` in localStorage) and has a Skip button (Esc, Enter or Space also skip).

**Real vehicles and cows** (`public/js/rides.js`): traffic, showroom, police and the player's rides use Sketchfab models (CC BY 4.0): an auto rickshaw, hatchback, sedan, 4x4 jeep (also the Haryana Police jeep), truck, city bus, Bullet-style motorcycle and scooter, plus a zebu bull for the cows on the road (idle, grazing and tail-swish animations). They were shrunk for phones with `promo/models/rides.mjs` (about 4 MB in `public/models/rides/`, loaded one at a time after the people, traffic first). Until a model arrives, and with `?simple`, the box-built vehicle is shown and swapped in place when the model loads. Every artist is credited in Menu → Credits and on /about from one list, `public/shared/credits.js`.

**Realistic world** (`public/js/realism.js`, no downloads): a sky dome with sun glow, drifting clouds that thicken with rain, and stars at night. The sun casts shadows in a box that follows the player. Windows, glass towers, car paint and chrome reflect a small cube map of the same sky, refreshed as the day moves. The road, footpath, kerb, ground and wall surfaces are generated in the browser: asphalt with lane marks and wheel tracks, zebra crossings at every chowk, black-and-yellow kerbs, interlocking pavers, plaster with AC units and rain streaks, brick and curtain-wall facades. Cars have shaped bodies, glass cabins, bumpers, lights and chrome rims; there is a proper CNG auto with its yellow hood, a bus, a truck, and desi cows with a hump and horns. When frames stay slow at the lowest resolution, shadows switch off first. `?simple` turns off shadows and clouds as well as realistic people.

**Phone layout**: on touch screens the HUD shrinks so the city stays visible: a small stats card (name, level, money, health and food bars; tap it for the full panel), a small map with the place name under it, no top chips (Online, Radio and Help are in Menu), one notification at a time (they queue and the plain ones drop first if many arrive), one line of chat, no news feed, and smaller see-through controls. Upright phones get a wider camera so buildings and people at the sides stay in view, and name tags and speech bubbles are smaller. Phones held sideways move messages to the free space at the top.

**Fighting**: punches auto-aim at whoever is closest in front of the camera (or right next to you) and turn you to face them: street chhore, any passer-by (they square up and fight back), people in crowds (they fall), (AI) players (they stop and hit back) and real players.

**City**: shop rows with local signboards along every block, a skyline ring, ~170 instanced pedestrians plus crowds near doors, more traffic, potholes, waterlogging and garbage piles, a police thana. Cars knock people down and crash into traffic. The 3D map (M) flies over the city with pins for work, food, police, shopping, party, races, cars, hospital and metro; tap a pin to set GPS.

**GPS**: tap a pin on the 3D map, or pick a category (Gaadi, Khana, Police...) and close the map to route to the nearest one. A small white-and-teal double arrow on the road beside you points the way (also for races and the flood run), and a chip under the minimap shows the place, distance and an ✕ to cancel.

**Gaadi chheeno**: walk up to any vehicle in traffic (it stops when you stand in its way) and press E / Action. The driver gets out and fights; knock him out and the auto, bus, truck or car is yours until you get off, and sometimes the police come after the stolen ride. Other players and AI players driving past can be pulled out the same way: they fight for it, and the vehicle is yours if you KO them.

**Computer players**: with fewer than 4 people online, up to 3 "(AI)" players walk and drive the roads nearby, chat, greet newcomers, reply sometimes and fight back. They are not counted as online players.

**Aaj ke kaam (daily tasks)**: seven tasks a day, the same all day, new at midnight Gurugram time (about 30-40 minutes): earn ₹X (scaled to level), *badla* (a named goon beat up your friend at a real market: find him with GPS and KO him), shopping at Ambience Mall, dancing at Neon Nights, a job (deliveries / Chalo rides / office shift), a thrill (race, dangal, taking a vehicle, beating street chhore) and street food. Live progress in the panel (desktop) or the "Aaj ke kaam" button (phones); tapping a task sets GPS or opens the right app. Each task pays; three unlock the next level (XP waits at full until then); all seven pay a big bonus that grows with a daily streak.

**Gali ke Don (weekly story)**: five chapters, one a day, new every Monday (Gurugram time): Rinku Chhapri (Sadar Bazaar) → Lalit Lambu + a chela (Sector 29) → Sandy Gunda + two (Old Gurgaon) → Kallu Kaanpur's hafta vasooli (Sector 14 Market) → finale, Dalal Bhai + three on Sohna Road. New players find it through a phone call: about 20 seconds into a session someone rings (Golu, a shopkeeper, finally Dalal Bhai himself) and asks for help; taking the call brings that day's boss and his chele to the street corner nearest the player, sets GPS and offers a ₹50 auto straight to the fight (declined calls ring once more later, at most twice a day). The fight is also pinned on the 3D map. Each chapter ends on a cliffhanger; beating the finale announces the player as this week's Gali ka Don. Phone → Gali ke Don, or the top row of Aaj ke kaam.

**City event rush**: a 30-second countdown before every city event; when it starts GPS points there and the first three to arrive win cash. New event "Paison ka thaila gira!": a money bag at a random corner, the first player to reach it takes it all.

**Aaj ka Hisaab card**: a 9:16 story card of the day (money made, fights, races, Don chapters...) with a funny title (Gurugram ka Seth, Gali ka Gunda, Naav King...) and Share / WhatsApp buttons. Offered after finishing the daily tasks or a Don chapter, or any time from the phone.

**Controls help** stays on screen (bottom-left) on laptops.

**Weather and water**: the server changes the weather every 3-7 minutes for everyone: clear, boonda-baandi (drizzle), halki, tez and moosladhaar baarish. Rain falls (GPU shader, no per-frame cost), the sky greys, visibility drops, thunder and lightning come with heavy rain, and rain sound follows. Water rises at Gurugram's famous waterlogging spots (Hero Honda Chowk, Golf Course Road underpass, Sohna Road, Narsinghpur, Sheetla Mata Road, Iffco Chowk) and drains slowly after. Deep water slows walkers and cars, can stall engines, and bikes struggle. "Paani paar karo" (Menu, or the marker at a flooded chowk) is a timed run straight through the water; it is also a daily task.

**Boat**: the Jugaadu Naav (₹35,000 at Chaudhary Motors or the Naav Ghat) is fast on water and only scrapes along dry roads. Ride it on the Biodiversity Park lake any time, or through flooded chowks in the rain. Jal Police boats patrol and give chase; they can't leave the water, so getting onto dry road is one way out.

**Music**: a fight theme during fights and a dhol bhangra at baraats or when dancing outdoors; the radio ducks under them.

**Street races**: five races on real roads (Sheetla Mata Road, Golf Course Road, Cyber City, NH-48, Badshahpur), each against a named rival; winning unlocks the next one. New players start straight into the first race. Driving has NOS (filled by drifting, near misses with traffic and checkpoints), drift smoke and a speed camera. Personal bests and the top 20 times per race are kept on the server.

**Search (SEO)**: the canonical address is `https://gurugramlife.com` (override with `SITE_URL`; it must be the address that actually serves the page, since the domain host sends www there). The game page carries a keyword title and description, a canonical link, and structured data (`WebSite` + `VideoGame`, free, browser, Gurugram/Gurgaon). `server/pages.js` serves readable pages for search engines and visitors: `/about` (with FAQ), `/how-to-play` and `/places` (all 25 in-game Gurugram areas), linked from the start screen, plus `robots.txt`, `sitemap.xml` and a real 404. The game does no www/bare-domain redirect itself (the domain host does; doing both caused a redirect loop), and the `onrender.com` copy sends `X-Robots-Tag: noindex` so ranking isn't split. `GOOGLE_SITE_VERIFICATION` adds the Search Console meta tag. Steps to get indexed are in DEPLOY.md.

## Testing

`npm test` boots the server and checks the rules with two WebSocket players. `npm run test:controls` (server running, Playwright installed) presses real keys, clicks and taps in a browser: walking, running, jumping, mouse look, punching NPCs, passers-by, real and AI players, vehicles, menu, map, chat, the phone joystick and buttons. `NOLOCK=1` repeats it for a browser that refuses mouse lock. `GL_LANG=hi` or `GL_LANG=en` runs it with the game translated. `npm run test:regress` (server on a fresh `DATA_DIR`) plays the whole game as a new player: sign-up, avatar, the intro film, Day 1, every Menu app, every action spot in the city, rides, fights, a race, the map, chat, every interior, moving home, language switch and the screen layout, with a screenshot per step; `PHONE=1` does the same on a 390×844 touch phone.

## How it's built

- `server/index.js`: Express serves the page; a WebSocket server runs the world. The server owns money, purchases, missions, leaderboards, auctions, crews, turf, the belt, battles and events. It checks every purchase against the shared price list, limits how much and how often each job pays, checks punch range and rate-limits messages.
- `public/shared/data.js`: the catalogue (prices, vehicles, homes, caps, missions, districts) used by both the server and the browser.
- `public/js/game.js`: the 3D city (three.js), controls, interface and client side of every system.
- `public/js/audio.js`: radio stations, the player's own songs and sound effects.
- `public/js/net.js`: WebSocket connection with automatic reconnect.
- `public/js/i18n.js` and `public/js/lang/`: the language picker and the Hindi and English packs. Each pack is a list of [Haryanvi text, translation] pairs; `{}` stands for a name or number and `{1}` `{2}` let a translation reorder them. Text that is added to the game and not yet in a pack shows in Haryanvi.

Players log in with just a name. The browser keeps a private login key, so the same device returns to the same character.
