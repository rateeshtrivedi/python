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

**Radio**: real Haryanvi, Punjabi and Bollywood songs from live internet radio stations (found through the public radio-browser.info directory by `server/stations.js`, cached 6 hours, HTTPS streams only), starting at low volume, plus "Meri Playlist" for players' own song files.

**Joining**: name → character creator (ladka/ladki, skin, 5 hairstyles each, hair colour, T-shirt/kurta/jacket or kurti/jacket/saree, colours, pants, moonchh/daadhi or bindi/jhumke, cap/pagdi/dupatta, kaala chashma, and Chacha's car) with a live 3D preview → choose where to start (Ambience Mall runs the Pehla Din story).

**Controls**: click once for mouse-look (if the browser refuses mouse lock, drag to look and click to punch); W A S D, Space jump (handbrake in a car), Shift run (NOS in a car), left-click or Q punch, E action, F car, Tab menu, M 3D map. Phones: joystick, Jump/NOS, Punch, Gaadi, a contextual Action button and one Menu button.

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

## Testing

`npm test` boots the server and checks the rules with two WebSocket players. `npm run test:controls` (server running, Playwright installed) presses real keys, clicks and taps in a browser: walking, running, jumping, mouse look, punching NPCs, passers-by, real and AI players, vehicles, menu, map, chat, the phone joystick and buttons. `NOLOCK=1` repeats it for a browser that refuses mouse lock. `GL_LANG=hi` or `GL_LANG=en` runs it with the game translated.

## How it's built

- `server/index.js`: Express serves the page; a WebSocket server runs the world. The server owns money, purchases, missions, leaderboards, auctions, crews, turf, the belt, battles and events. It checks every purchase against the shared price list, limits how much and how often each job pays, checks punch range and rate-limits messages.
- `public/shared/data.js`: the catalogue (prices, vehicles, homes, caps, missions, districts) used by both the server and the browser.
- `public/js/game.js`: the 3D city (three.js), controls, interface and client side of every system.
- `public/js/audio.js`: radio stations, the player's own songs and sound effects.
- `public/js/net.js`: WebSocket connection with automatic reconnect.
- `public/js/i18n.js` and `public/js/lang/`: the language picker and the Hindi and English packs. Each pack is a list of [Haryanvi text, translation] pairs; `{}` stands for a name or number and `{1}` `{2}` let a translation reorder them. Text that is added to the game and not yet in a pack shows in Haryanvi.

Players log in with just a name. The browser keeps a private login key, so the same device returns to the same character.
