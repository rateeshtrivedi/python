// Shared game data. Imported by the browser client AND the Node server, so prices,
// caps and rules are defined once. The server is the authority on money.

export const SHIRTS = [0xe2412b, 0xf3b61f, 0x1d8a4e, 0x2e6bd1, 0x8b3fc4, 0xff6fa5, 0x1c1c1c, 0xf5f5f5];
export const SHIRT_NAMES = ['Lal', 'Peela', 'Hara', 'Neela', 'Jamuni', 'Gulabi', 'Kaala', 'Safed'];
export const HATS = { none: ['No hat', 0], cap: ['Cricket cap', 300], pagdi: ['Haryanvi pagdi', 900], safa: ['Rajasthani safa', 1200] };

export const VEH = {
  rent:    { name: 'Bhaago e-Scooter (rented)', price: 50,     speed: 14, kind: 2, color: 0x2fc46b },
  scooty:  { name: 'Scooty Pep-Pep',            price: 8000,   speed: 17, kind: 2, color: 0xff5fa2 },
  dhakad:  { name: 'Dhakad 350 Bullet',         price: 25000,  speed: 23, kind: 2, color: 0x262626 },
  chhotu:  { name: 'Chhotu Hatchback',          price: 60000,  speed: 27, kind: 4, color: 0xdedede },
  desert:  { name: 'Desert King 4x4',           price: 150000, speed: 31, kind: 4, color: 0x8b1e1e },
  cruiser: { name: 'Chaudhary Cruiser',         price: 400000, speed: 37, kind: 4, color: 0x151515 },
};
export const BUY_VEHICLES = ['scooty', 'dhakad', 'chhotu', 'desert', 'cruiser'];

export const HOUSES = {
  pg:    { name: 'Sharma PG, DLF Phase 3',      price: 0,       daily: 0,    at: [-2, -1] },
  flat:  { name: '2BHK flat, Sushant Lok',      price: 80000,   daily: 300,  at: [0, 2] },
  pent:  { name: 'Penthouse, Golf Course Road', price: 500000,  daily: 1500, at: [-2, 0] },
  farm:  { name: 'Farmhouse, Bhondsi',          price: 1200000, daily: 4000, at: [1, 2] },
};
export const PG_RENT = 200;

export const RANKS = [['Intern', 400], ['Associate', 600], ['Sr. Associate', 850], ['Team Lead', 1200], ['Manager', 1700], ['VP', 2500], ['CEO Saab', 4000]];
export const RESPECT = [[0, 'Naya Chhora'], [50, 'Gali ka Don'], [200, 'Sector ka Sher'], [600, 'Gurugram ka Chaudhary'], [1500, 'Haryana ka Baadshah']];

// Show-off items
export const BLING = {
  chain:  { name: 'Moti gold chain',      price: 25000, show: 25 },
  kada:   { name: 'Gold kada',            price: 15000, show: 15 },
  watch:  { name: 'Heavy gold watch',     price: 60000, show: 50 },
  gshades:{ name: 'Gold-frame chashma',   price: 12000, show: 12 },
};
export const MODS = {
  horn:    { name: 'Pressure horn',            price: 3000,  desc: 'Press H. Everyone nearby hears it.' },
  film:    { name: 'Black film',               price: 2500,  desc: 'Dark windows. Police may challan you.' },
  bull:    { name: 'Bull bar',                 price: 6000,  desc: 'Steel guard on the front' },
  speaker: { name: 'Bass speaker',             price: 9000,  desc: 'Your radio thumps for people nearby' },
  glow:    { name: 'Neon underglow',           price: 7000,  desc: 'Lights under the car' },
  sticker: { name: 'Back-glass sticker',       price: 1500,  desc: 'Pick your line' },
};
export const STICKERS = ['JAAT BOY', 'CHAUDHARY', 'GURJAR ZINDABAD', 'YADAV SAAB', 'HARYANVI CHHORA', 'PAPA KI PARI', 'DESI BOYZ', 'NO DARU NO PARTY'];
export const GLOW_COLORS = [0x00e5ff, 0xff2bd6, 0x39ff14, 0xffd400, 0xff3b30];
export const RANDOM_PLATE_PRICE = 5000;
export const VIP_PLATES = ['HR26 0001', 'HR26 0007', 'HR26 0786', 'HR26 9999', 'HR26 1111', 'HR26 0002', 'HR26 0101', 'HR26 5555', 'HR26 0420', 'HR26 7777', 'HR26 0009', 'HR26 2626'];
export const PLATE_START_BID = 20000;

export const CREW_PRICE = 25000;

// Simple shop items (food, drinks, outfits) validated by the server: id -> [name, price, hunger, extra]
export const FOOD = {
  // Sher-e-Haryana Dhaba (Sector 29)
  d_paratha: ['Aloo paratha + makhan', 80, 35], d_dal: ['Dal makhani + 2 naan', 150, 50], d_kadhi: ['Kadhi chawal', 90, 30],
  d_lassi: ['Meethi lassi (bada gilaas)', 50, 15], d_bajra: ['Bajre ki roti + saag', 110, 40], d_nimbu: ['Nimbu paani (hangover cure)', 30, 5, 'cure'],
  // Mall food court
  m_chole: ['Chole bhature', 120, 40], m_lassi: ['Lassi', 60, 15], m_momos: ['Steam momos', 90, 25], m_tmomos: ['Tandoori momos', 130, 30],
  m_pizza: ['Paneer pizza', 220, 35], m_garlic: ['Garlic bread', 120, 18], m_chai: ['Cutting chai', 20, 10],
  // Cyber Hub
  c_beer: ['Chilled beer pint', 220, 8, 'drink'], c_tikka: ['Chicken tikka', 260, 35], c_paneer: ['Paneer tikka', 220, 32], c_peanuts: ['Masala peanuts', 90, 10],
  // Markets
  k_katli: ['Kaju katli (250g)', 220, 15], k_gulab: ['Gulab jamun (2)', 60, 18], k_jalebi: ['Jalebi + rabri', 90, 25], k_lassi: ['Lassi', 50, 15],
  k_golgappe: ['Gol gappe (6)', 40, 12], k_tikki: ['Aloo tikki chaat', 70, 22], k_kachori: ['Raj kachori', 90, 28], k_kulche: ['Chole kulche', 80, 32], k_nimbu: ['Nimbu soda (hangover cure)', 30, 5, 'cure'],
  // Desi Theka
  t_soda: ['Thanda soda', 30, 5], t_namkeen: ['Namkeen packet', 20, 10], t_beer: ['Chilled beer', 150, 0, 'drink'], t_santra: ['Desi Santra Special', 120, 0, 'drink'], t_whisky: ['Whisky quarter', 350, 0, 'drink'],
  // Neon Nights club bar
  n_beer: ['Pint at the club', 400, 5, 'drink'], n_shots: ['Round of shots', 900, 0, 'drink'], n_mocktail: ['Mocktail', 250, 8],
};
export const FOOD_SHOPS = {
  dhaba: ['d_paratha', 'd_dal', 'd_kadhi', 'd_lassi', 'd_bajra', 'd_nimbu'],
  chole: ['m_chole', 'm_lassi'], momo: ['m_momos', 'm_tmomos'], pizza: ['m_pizza', 'm_garlic'], chai: ['m_chai'],
  cyberhub: ['c_beer', 'c_tikka', 'c_paneer', 'c_peanuts'],
  sweets: ['k_katli', 'k_gulab', 'k_jalebi', 'k_lassi'], chaat: ['k_golgappe', 'k_tikki', 'k_kachori', 'k_kulche', 'k_nimbu'],
  theka: ['t_soda', 't_namkeen', 't_beer', 't_santra', 't_whisky'],
  clubbar: ['n_beer', 'n_shots', 'n_mocktail'],
};

// Other fixed-price purchases: id -> [name, price]
export const MISC = {
  movie: ['Movie ticket', 250], lucky: ['Lucky draw scratch card', 200], metro: ['Rapid Metro ticket', 30], rent: ['Bhaago e-scooter rental', 50],
  hospital: ['Civil Hospital treatment', 100], shirt: ['New shirt', 600], toll: ['Kherki Daula toll', 50],
  challan: ['Drunk-driving challan', 2000], challan_big: ['Challan after argument', 4000], challan_chase: ['Challan after chase', 5000], challan_film: ['Black film challan', 1000],
  bottle: ['Bottle service for the whole club', 15000], notes: ['Note udao at the baraat', 1000], party: ['Host a farmhouse party', 20000],
  firework: ['Diwali rocket', 200], dangal: ['Dangal entry', 100], plate: ['Random HR26 number plate', RANDOM_PLATE_PRICE], ko_bill: ['Hospital bill', 200],
};

// Earning caps the server enforces: reason -> {max per event, cooldown seconds}
export const EARN = {
  ride: { max: 1100, cd: 14 }, delivery: { max: 700, cd: 10 }, loot: { max: 150, cd: 6 }, dangal: { max: 1000, cd: 45 },
  quest: { max: 1600, cd: 90 }, chai: { max: 60, cd: 4 }, prasad: { max: 251, cd: 3600 }, ipl: { max: 300, cd: 120 },
};

export const MISSIONS = [
  { t: 'Eat at Sher-e-Haryana Dhaba', k: 'eat_dhaba', n: 1, r: 300 },
  { t: 'Complete Jhatpat deliveries', k: 'deliveries', n: 2, r: 450 },
  { t: 'Visit Ambience Mall', k: 'visit_mall', n: 1, r: 200 },
  { t: 'Work a shift at TechNova', k: 'shifts', n: 1, r: 400 },
  { t: 'Throw punches', k: 'punches', n: 6, r: 150 },
  { t: 'Knock someone out', k: 'kos', n: 1, r: 350 },
  { t: 'Complete Chalo rides', k: 'rides', n: 2, r: 700 },
  { t: 'Ride the Rapid Metro', k: 'metro', n: 1, r: 150 },
  { t: 'Dance at Neon Nights club', k: 'dance', n: 1, r: 250 },
  { t: 'Send chat messages', k: 'chats', n: 3, r: 150 },
  { t: 'Watch a movie at Reel Star', k: 'movies', n: 1, r: 300 },
  { t: 'Win a dangal at the akhara', k: 'wrestle', n: 1, r: 1000 },
  { t: 'Buy a vehicle or upgrade', k: 'vehbuy', n: 1, r: 600 },
  { t: 'Earn money', k: 'earned', n: 3000, r: 800 },
  { t: 'Join a baraat and dance', k: 'baraat', n: 1, r: 400 },
  { t: 'Show off: buy bling or a car mod', k: 'showoff', n: 1, r: 500 },
  { t: 'Share your Mera Gurugram card', k: 'card', n: 1, r: 300 },
  { t: 'Eat street food in a market', k: 'eat_market', n: 1, r: 200 },
];

// District grid: i,j in -2..2; block centre = (i*150, j*150). Place names are real Gurugram localities.
export const DIST = [
  [-2, -2, 'Sikanderpur', 'towers', { metro: 'Sikanderpur' }],
  [-1, -2, 'Ambience Island', 'mall'],
  [0, -2, 'DLF Cyber City', 'office', { metro: 'Cyber City' }],
  [1, -2, 'Cyber Hub', 'cyberhub'],
  [2, -2, 'NH-48 Auto Mile', 'dealer'],
  [-2, -1, 'DLF Phase 3', 'res', { prop: 1 }],
  [-1, -1, 'Huda City Centre', 'towers', { metro: 'Huda City Centre' }],
  [0, -1, 'Iffco Chowk', 'hub'],
  [1, -1, 'Sector 29', 'dhaba'],
  [2, -1, 'Leisure Valley Park', 'park'],
  [-2, 0, 'Golf Course Road', 'luxury'],
  [-1, 0, 'Galleria Market', 'market', { shop: 'Bansal Sweets', menu: 'sweets' }],
  [0, 0, 'Rajiv Chowk', 'plaza'],
  [1, 0, 'Sohna Road', 'theka'],
  [2, 0, 'Sadar Bazaar', 'market', { shop: 'Raju Chaat Bhandar', menu: 'chaat', busy: 1 }],
  [-2, 1, 'Golf Course Extension', 'luxury'],
  [-1, 1, 'Sector 14 Market', 'market', { shop: 'Gupta Chaat Corner', menu: 'chaat' }],
  [0, 1, 'Civil Hospital', 'hospital'],
  [1, 1, 'Badshahpur', 'village', { chaupal: 1 }],
  [2, 1, 'Old Gurgaon', 'temple'],
  [-2, 2, 'Sector 56', 'towers', { metro: 'Sector 55-56' }],
  [-1, 2, 'Aravali Biodiversity Park', 'forest'],
  [0, 2, 'Sushant Lok', 'res'],
  [1, 2, 'Bhondsi', 'village', { farm: 1 }],
  [2, 2, 'Manesar', 'industrial'],
];
export const ROADS = [-375, -225, -75, 75, 225, 375];

export function districtAt(x, z) {
  const i = Math.round(x / 150), j = Math.round(z / 150);
  if (Math.abs(i) > 2 || Math.abs(j) > 2) return null;
  if (Math.abs(x - i * 150) > 68 || Math.abs(z - j * 150) > 68) return null;
  return DIST.find(d => d[0] === i && d[1] === j) || null;
}

// Fixed world spots shared by client and server checks
export const SPOTS = {
  akhara: { x: 300, z: -140, r: 11 },
  chaupal: { x: 144, z: 152, r: 8 },
  farmLawn: { x: 150, z: 330 },
  hospital: { x: 0, z: 160 },
  naka: { x: 0, z: -75 },
  toll: { x: 300, z: -375 },
  clubDoor: { x: 195, z: -105 },
};

// World events cycle (server-scheduled, everyone sees the same thing)
export const WORLD_EVENTS = {
  baraat: { name: 'Shaadi ki baraat on Golf Course Road', dur: 240 },
  jam:    { name: 'Mahajam at Iffco Chowk', dur: 180 },
  flood:  { name: 'Monsoon flood: Gurugram ka Venice', dur: 240 },
  holi:   { name: 'Holi on Sohna Road', dur: 240 },
  diwali: { name: 'Diwali night', dur: 240 },
  ipl:    { name: 'IPL screening at Cyber Hub', dur: 240 },
};
export const EVENT_ORDER = ['baraat', 'jam', 'holi', 'ipl', 'flood', 'baraat', 'diwali', 'jam'];
export const FLOOD_DISTRICTS = ['Sector 56', 'Sushant Lok', 'Golf Course Extension', 'Huda City Centre', 'Sector 14 Market', 'Civil Hospital'];
export const IPL_TEAMS = ['Gurugram Gladiators', 'Faridabad Falcons'];

export function xpNeed(l) { return 100 + (l - 1) * 90; }
export function respectTitle(r) { let t = RESPECT[0][1]; for (const x of RESPECT) if (r >= x[0]) t = x[1]; return t; }
export function netWorth(p) {
  let w = p.money || 0;
  for (const v of p.vehicles || []) w += (VEH[v] && VEH[v].price) || 0;
  for (const h of p.houses || []) w += (HOUSES[h] && HOUSES[h].price) || 0;
  for (const b of p.bling || []) w += (BLING[b] && BLING[b].price) || 0;
  return w;
}
export function cleanText(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Street races: checkpoints follow real roads (corners sit on junctions). Each win unlocks the next rival.
// minMs: no car can finish faster (route length / 52 units per second, top speed with NOS), so the server rejects anything quicker.
export const RACES = [
  { id: 'ambience', name: 'Ambience Mall Sprint', rival: 'Monu Dahiya', veh: 'chhotu', color: 0xdedede, skill: 0.9, prize: 600,
    pts: [[-150, -225], [-75, -225], [-75, 75], [40, 75]], // out of the Ambience Mall gate, down MG Road, onto Sheetla Mata Road
    taunt: ['Oye naye! Race lagegi? Haar gaya to chai tere taraf se!', 'Chal dekh lete hain kitna dum se tere mein'],
    win: ["Arre! Beginner's luck se yeh. Rematch kar!", 'Theek se, agli baar dekh lunga'], lose: ['Ghar ja ke cycle chala, chhore!', 'Chai tere taraf se. Rematch?'] },
  { id: 'golf', name: 'Golf Course Road Run', rival: 'Jassi Sandhu', veh: 'desert', color: 0x2e6bd1, skill: 0.98, prize: 1000,
    pts: [[-225, 330], [-225, -225], [-75, -225], [-75, -375], [60, -375]],
    taunt: ['Golf Course Road meri se, paaji. Aaja!', 'Thar di power dekhega?'],
    win: ['Oye hoye! Changa chalaya', 'Lucky si tu, rematch kar'], lose: ['Balle balle! Mera road, meri race', 'Hor practice kar, paaji'] },
  { id: 'cyber', name: 'Cyber City Loop', rival: 'Pinky Yadav', veh: 'desert', color: 0xff5fa2, skill: 1.02, prize: 1400,
    pts: [[-75, -280], [-75, -375], [75, -375], [75, -225], [-75, -225], [-75, -300]],
    taunt: ['Office se pehle ek loop? Haarne ke liye ready?', 'Corners pe brake lagana seekh le pehle'],
    win: ['Hmm, not bad. Kal phir', 'Ok ok, maan gayi'], lose: ['Corners pe dheela pad gaya!', 'Bye bye, slowpoke'] },
  { id: 'nh48', name: 'NH-48 Drag', rival: 'Rocky Gujjar', veh: 'cruiser', color: 0x151515, skill: 1.06, prize: 2000,
    pts: [[-420, -375], [260, -375]],
    taunt: ['Seedhi sadak, full race. NOS hai tere paas?', 'Highway ka raja main hoon'],
    win: ['Kaise?! NOS mein kya daala tha?', 'Rematch, abhi ke abhi!'], lose: ['Highway pe bachche nahi chalte', 'Drift karke NOS bhar, fir aaiyo'] },
  { id: 'badshahpur', name: 'Badshahpur Night Run', rival: 'Chaudhary Saab', veh: 'cruiser', color: 0xf6c026, skill: 1.1, prize: 3500,
    pts: [[375, -300], [375, 75], [225, 75], [225, 375], [-75, 375], [-75, 300]],
    taunt: ['Gurugram ka street king banna se? Pehle mujhe hara', 'Badshahpur mera ilaaka se, chhore'],
    win: ['Aaj se tu Gurugram ka Street King. Ram Ram!', 'Jeet gaya... par kal fir aaunga'], lose: ['Abhi bachcha se tu', 'Street King ka taj itna sasta nahi'] },
];
export function raceLen(r) { let s = 0; for (let i = 1; i < r.pts.length; i++) s += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); return s; }
for (const r of RACES) r.minMs = Math.round(raceLen(r) / 52 * 1000);
