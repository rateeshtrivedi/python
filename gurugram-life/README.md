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

The game is a single Node.js server that serves the page and runs the multiplayer world over WebSockets. Any host that runs Node and supports WebSockets works.

**Render (simplest, free tier available)**
1. Sign in at render.com with GitHub.
2. New → Blueprint → pick this repository. Render reads `render.yaml` at the repo root.
3. Deploy. You get a public `https://….onrender.com` link to share.

On the free plan the server sleeps after 15 minutes without visitors (the next visitor waits about a minute) and has no permanent disk, so player progress resets when it restarts. For a launch, use a paid plan and turn on the disk block in `render.yaml`.

**Docker (Railway, Fly.io, a VPS…)**
```bash
docker build -t gurugram-life gurugram-life
docker run -p 3000:3000 -v gurugram-data:/data gurugram-life
```
Mount a volume at `/data` so progress survives restarts.

Settings (environment variables): `PORT` (default 3000) and `DATA_DIR` (where `world.json` is saved; default `./data`).

## What's in the game

**City and earning**
- 25 real Gurugram areas, Rapid Metro stations, day–night cycle, autos, buses, trucks and cows on the road.
- Jhatpat food delivery, Chalo rides, office shifts and promotions at TechNova Towers, side jobs from Ramphal Ahlawat (a land-rich crorepati in Badshahpur), and missions that never run out.
- Walk-in interiors: Metro Grand Mall, TechNova office, Desi Theka No.1, Sher-e-Haryana Dhaba and Neon Nights club.

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

**Radio**: two stations of original Haryanvi and Punjabi-style music generated in the browser, plus "Meri Playlist" for players' own song files.

## How it's built

- `server/index.js`: Express serves the page; a WebSocket server runs the world. The server owns money, purchases, missions, leaderboards, auctions, crews, turf, the belt, battles and events. It checks every purchase against the shared price list, limits how much and how often each job pays, checks punch range and rate-limits messages.
- `public/shared/data.js`: the catalogue (prices, vehicles, homes, caps, missions, districts) used by both the server and the browser.
- `public/js/game.js`: the 3D city (three.js), controls, interface and client side of every system.
- `public/js/audio.js`: radio stations, the player's own songs and sound effects.
- `public/js/net.js`: WebSocket connection with automatic reconnect.

Players log in with just a name. The browser keeps a private login key, so the same device returns to the same character.
