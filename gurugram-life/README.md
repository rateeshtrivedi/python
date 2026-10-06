# Gurugram Life 🏙️

A lightweight, browser-based life-sim / open-world game set in **Gurugram, Haryana**.
Create a character, find a job, pay rent, make friends, book rides and explore the Millennium City.

**No build step, no libraries, no downloads.** About 110 KB of plain HTML, CSS and JavaScript, with every graphic drawn on a canvas.

## Play

Open `index.html` in any modern browser (double-clicking it works), or serve the folder:

```bash
cd gurugram-life
python3 -m http.server 8000   # then visit http://localhost:8000
```

It works on desktop and mobile. Touch devices get a joystick and action buttons.

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
| **Goals** | Eleven milestones with cash rewards, such as saving ₹1,00,000, becoming a software engineer and living on Golf Course Road. |

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD / arrow keys (Shift to jog) | Joystick |
| Interact / enter / talk | E | **E** button |
| Phone (rides, jobs, rent, food…) | P | 📱 |
| City map / waypoint / book ride to a spot | M | 🗺️ |
| Ride your own vehicle | F | 🛵 |
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
    └── game.js     # engine: rendering, input, simulation, UI, saving
```
