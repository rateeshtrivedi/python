# Gurugram Life 🏙️

A lightweight, browser-based 3D life-sim / open-world game set in **Gurugram, Haryana**.
Create a character, find a job, pay rent, make friends, book rides and explore the Millennium City.

**No build step and no downloaded assets.** The game's own code is about 190 KB of plain HTML, CSS and JavaScript. The 3D city uses [Three.js](https://threejs.org) r128, loaded from a CDN (about 150 KB gzipped). Every building facade, road and texture is generated in code, so there are no model or image files to download.

## Play

Open `index.html` in any modern browser (double-clicking it works), or serve the folder:

```bash
cd gurugram-life
python3 -m http.server 8000   # then visit http://localhost:8000
```

It works on desktop and mobile. Touch devices get a joystick and action buttons.

### Graphics

- **3D city (default):** a dense skyline (130+ background buildings), palm-lined Golf Course Road, hedged medians, rooftop billboards and highway hoardings, drifting clouds and a sun, glowing street-light pools and headlights at night, and a third-person camera with real-time sun shadows and a full day/night cycle. Office windows light up at night, and you get sunset skies, stars, monsoon rain with puddles, and AQI smog that thickens the haze. Buildings have rooftop water tanks, there is an elevated Rapid Link metro with a moving train, street lights, and traffic (cars, autos, buses, bikes) driving on the left.
- **2D classic:** a top-down view for older phones. Switch in *Phone → Settings → Graphics*, where you can also set 3D quality to High, Medium or Low. The game also falls back to 2D automatically if WebGL or the CDN isn't available.

## Features

| | |
|---|---|
| **One-tap sign-in** | Pick a username (and an optional 4-digit PIN) or tap *Play as guest*. Progress autosaves in the browser (localStorage). |
| **Character creator** | Skin, hair, hairstyle, clothes and a backstory (fresher, coder, local, hustler) that sets your starting money and skills. |
| **Open world** | Districts include Cyber City, MG Road, Golf Course Road, Sohna Road, Sector 29, Sadar Bazaar, Sushant Lok, Udyog Vihar and New Gurugram. There are roads like NH-48 and Golf Course Road, plus left-hand traffic, NPCs, a day/night cycle, monsoon rain with waterlogging, and AQI. |
| **Jobs** | Eight jobs, from barista and factory helper to software engineer and fintech analyst, each with shift timings, skill requirements, promotions and warnings for missed shifts. There is also ZipZap delivery gig work with timed drop-offs and tips. |
| **Money** | PayKaro wallet with a transaction history, Paisa Bank savings with daily interest, goal rewards, fuel costs and traffic challans. |
| **Housing** | Seven homes, from a shared room in Old Gurugram to a Golf Course Road penthouse. Weekly rent is paid automatically, with a deposit and eviction if you don't pay. |
| **Ride-hailing** | **Chalo** (autos and cabs) and **PhatPhat** (bike taxis). You get fare quotes, peak-hour and rain surge, a driver with an HR-26 number plate and a car that drives to you. You then ride across the map. |
| **Needs** | Health, hunger, energy and social. Eat at dhabas or order on **Bhookh**, sleep at home, and hang out to stay happy. |
| **Social** | Chat with about 28 residents, build friendships, hang out, call friends on **Yaari** and run ❗ errands for rewards. |
| **GTA-style touches** | Buy a scooter, motorbike or car, or rent an e-bike, and ride it yourself. Traffic can knock you over, police nakas fine you for riding without a helmet, and you can run delivery and errand missions. |
| **Upskilling** | SkillUp Academy (coding, communication), Iron Paradise Gym, parks (yoga, jogging, cricket, treks), clothes that raise your Style, and a golf club with a dress code. |
| **Levels & XP** | Almost every action earns XP. Levels pay cash bonuses, give you a title (Fresher → Hustler → … → Millennium City Legend) and unlock bigger businesses, with a confetti celebration. |
| **Daily rewards** | A 7-day login streak (up to ₹6,000 on day 7), a free daily Lucky Chai Spin with a ₹10,000 jackpot, and 3 random daily challenges with a bonus spin for clearing all of them. They reset at local midnight. |
| **Dhandha (hustles)** | Buy and upgrade a Chai Tapri, Momo Cart, Cloud Kitchen, PG Building, Coworking Floor and your own Startup. They earn every game hour and keep earning while you're offline (up to 8 hours). Cash boxes cap at 12 hours, so come back and collect. |
| **Reelz (fame)** | Post reels at 12 photo spots. Style, mood and trends drive views, with a chance of going viral. Brand deals pay daily at 1K, 10K, 100K and 1M followers. |
| **Life events** | 12 choice-driven events: scam calls, weddings, loans to friends, angel investing, a stray puppy, floods, power cuts, raises, dance trends, cricket nights, festivals and carpools. Some pay off days later. |
| **Love & pets** | Date a close friend (a partner slows your Social drain and texts you good morning). Adopt Sheru the dog, who follows you around the 3D city and boosts your reels. |
| **Share & challenge** | A brag card to screenshot, copy-ready brag text with the game link, and challenge codes (e.g. `RAHUL-L7-S940-D6`) that friends enter to race your Life Score. There is also a hall of fame for players on the same device. |
| **Street races** | Night Runs at Raftaar Motors: three checkpoint routes with gold, silver and bronze times, cash prizes and personal bests. |
| **Drive passengers** | Go online as a Chalo or PhatPhat driver with your own vehicle: pick up waving passengers, drop them off, and earn fares, tips and ratings. |
| **Golden Chai hunt** | 37 glowing collectible cups hidden across every district, with bonuses at 10, 20 and all of them. |
| **Paisa Trade** | Six fictional stocks that move every game hour, with market news shocks and flat ₹20 brokerage. Open 9 AM–9 PM, Mon–Sat. |
| **Help & tips** | A six-section guide (press **H**, tap **❓**, or open *Phone → Help*): Start here, Controls, Getting around, Jobs & money, Daily life, Tips & tricks. First-time hints pop up when something becomes relevant (your first entrance, crossing a road, getting hungry, rain, peak traffic, your ride arriving). There is also an occasional tip, a key legend on desktop and a legend on the map. Hints and the legend can be turned off in Settings. |
| **Goals** | Eleven milestones with cash rewards, such as saving ₹1,00,000, becoming a software engineer and living on Golf Course Road. |

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move (relative to the camera in 3D) | WASD / arrow keys (Shift to jog) | Joystick |
| Turn / tilt camera (3D) | Drag with the mouse, or Z / X | Drag on the screen |
| Zoom camera (3D) | Mouse wheel | — |
| Interact / enter / talk | E | **E** button |
| Phone (rides, jobs, rent, food…) | P | 📱 |
| City map / waypoint / book ride to a spot | M | 🗺️ |
| Ride your own vehicle | F | 🛵 |
| Rewards (streak, spin, challenges) | G | 🎁 |
| Help guide | H | ❓ |
| Close menus | Esc | ✕ |

## Notes

- **All business, brand and app names are fictional.** Examples are Chalo, PhatPhat, Bhookh, ZipZap, CodeKraft, Galaxy Mall and Paisa Bank. Any resemblance to real companies is coincidental. Place and road names refer to real Gurugram geography, but the map is stylised and not to scale.
- Accounts are stored **locally on the device**. The optional PIN only keeps other people on the same browser out of your save; it is not real security. Cross-device accounts or multiplayer would need a small backend.

## Files

```
gurugram-life/
├── index.html      # screens, HUD, phone and modal shells
├── css/style.css   # all styling
└── js/
    ├── data.js     # map, districts, businesses, jobs, homes, menus, rides
    ├── render3d.js # Three.js 3D city: procedural buildings, people, vehicles, lighting
    └── game.js     # simulation, input, 2D renderer, UI, saving
```
