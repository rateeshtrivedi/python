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
  naav:    { name: 'Jugaadu Naav (boat)',       price: 35000,  speed: 24, kind: 5, color: 0xf28c1b }, // fast on water, crawls on dry road
  // not for sale: only taken off the road (stop a vehicle, beat the driver)
  auto:    { name: 'Auto Rickshaw',             price: 0,      speed: 19, kind: 4, color: 0x2e9e4a, street: true },
  bus:     { name: 'Haryana Roadways Bus',      price: 0,      speed: 21, kind: 4, color: 0x2563b8, street: true },
  truck:   { name: 'Trala (truck)',             price: 0,      speed: 20, kind: 4, color: 0xd7331f, street: true },
};
export const BUY_VEHICLES = ['scooty', 'dhakad', 'chhotu', 'naav', 'desert', 'cruiser'];

export const HOUSES = {
  street: { name: 'Footpath, Rajiv Chowk',      price: 0,       daily: 0,    at: [0, 0], street: true },
  pg:    { name: 'Sharma PG, DLF Phase 3',      price: 0,       daily: 0,    at: [-2, -1] },
  room:  { name: '1BHK, Sector 14',             price: 30000,   daily: 100,  at: [-1, 1] },
  flat:  { name: '2BHK flat, Sushant Lok',      price: 80000,   daily: 300,  at: [0, 2] },
  pent:  { name: 'Penthouse, Golf Course Road', price: 500000,  daily: 1500, at: [-2, 0] },
  kothi: { name: 'Kothi, Golf Course Extension', price: 900000, daily: 2500, at: [-2, 1] },
  farm:  { name: 'Farmhouse, Bhondsi',          price: 1200000, daily: 4000, at: [1, 2] },
};
// Sapno ka Shehar, the main story: you get off the bus with a bag, an empty pocket and a night on the footpath. Every Bada Kaam
// (BADE below) you pull off moves you one home up this ladder, free. Bigger homes can also be bought sooner.
export const LADDER = ['street', 'pg', 'room', 'flat', 'pent', 'kothi', 'farm'];
export const homeRank = p => Math.max(0, ...(p.houses || []).map(h => LADDER.indexOf(h)));
export const START_MONEY = 0; // khaali jeb: the first rupee comes from work
// one game day (sun up to sun up, and one set of aaj ke kaam) is 15 real minutes, timed by the server so everyone shares it
export const DAY_SECS = 900;
export const gameDay = (ms = Date.now()) => Math.floor(ms / 1000 / DAY_SECS);
export const dayFrac = (ms = Date.now()) => (ms / 1000 % DAY_SECS) / DAY_SECS; // 0 = midnight, 0.5 = noon
// chapter n is played on the way to LADDER[n]; the last chapter's prize is the diamond set
export const CHAPTERS = [
  { title: 'Bus Adda', intro: 'Haryana Roadways ki bus ne Rajiv Chowk pe utaar diya. Jeb khaali, haath mein ek bag, aankhon mein sapne. Aaj ki raat footpath pe.', prize: 'Sharma PG ka kamra' },
  { title: 'Pehli Chhat', intro: 'Sir pe chhat aa gayi! Par PG mein chhe log aur ek bathroom. Apna kamra chahiye.', prize: '1BHK, Sector 14' },
  { title: 'Apna Kamra', intro: 'Apna darwaza, apni chaabi. Ab ghar waale bhi aana chahte hain: bada ghar chahiye.', prize: '2BHK flat, Sushant Lok' },
  { title: 'Ghar Basao', intro: 'Sushant Lok ka 2BHK. Mausi ji ne rishte ki baat chhed di. Ab sapna aasmaan ka: penthouse!', prize: 'Penthouse, Golf Course Road' },
  { title: 'Aasmaan Chhoo', intro: 'Golf Course Road ki 30vi manzil se poora Gurugram dikhta se. Par asli rutba kothi waalon ka.', prize: 'Kothi, Golf Course Extension' },
  { title: 'Kothi Waale', intro: 'Lawn, jhoomar, garage. Log ab Saab bolte hain. Bas ek sapna baaki: Bhondsi ka farmhouse.', prize: 'Farmhouse, Bhondsi' },
  { title: 'Gurugram ka Chaudhary', intro: 'Footpath se farmhouse tak. Ek aakhri Bada Kaam: Dalal Bhai. Jeet, aur heeron ka haar tera.', prize: 'Heeron ka haar' },
];
// Bade Kaam: the story missions. Mission n is played on the way to LADDER[n + 1] (the last one's prize is the diamond set),
// and some open up new things to do: guns (Bittu Hathiyaar wala), a gang of your own, and land deals.
export const BADE = [
  { id: 'pump', title: 'Pehli Kamai', giver: 'Chaudhary Saab, Chaudhary Filling Station', pay: 1500,
    brief: 'Khaali jeb. Chaudhary Filling Station pe kaam mil sakta se: gaadiyon mein petrol bharo, aur jo bina paise bhaage usse vasool karo.' },
  { id: 'vasooli', title: 'Udhaar Vasooli', giver: 'Sharma ji, Galleria Market', pay: 5000, unlock: 'guns',
    brief: 'Pappu Paaji ne Sharma ji ke ₹20,000 dabaa rakhe hain. Sector 14 Market mein usse aur uske chelon se vasool kar, police se bach ke laut.' },
  { id: 'thar', title: 'Chori ki Thar', giver: 'Bittu Hathiyaar wala, Sohna Road', pay: 15000, unlock: 'gang',
    brief: 'Cyber Hub ki parking mein ek kaali Desert King khadi se. Uthaa, police ko chakma de, aur NH-48 ke Jugaad Garage pahuncha. 3 minute.' },
  { id: 'kabza', title: 'Pump pe Kabza', giver: 'Chaudhary Saab', pay: 25000, unlock: 'land', gang: 1,
    brief: 'Kallu Kaanpur ke aadmi pump pe kabza karne aa rahe hain, do ke paas katta. Apni gang le ke aa aur pump bacha.' },
  { id: 'sauda', title: 'Zameen ka Sauda', giver: 'Bansal ji, Yadav Estates', pay: 30000, plot: 'sohna',
    brief: 'Bansal ji ko gaadi mein Sohna Road ke plot tak le ja. Wahan Sandy Gunda ke shooter baithe hain: Bansal ji ko kuch nahi hona chahiye.' },
  { id: 'chanda', title: 'Chunav ka Chanda', giver: 'Netaji, Old Gurgaon', pay: 50000,
    brief: 'Netaji ka nakad bhara bag Bhondsi farmhouse pahunchana se, 4 minute mein. Raste mein police ke naake: unse door reh, pakda gaya to bag gaya.' },
  { id: 'dalal', title: 'Dalal Bhai ka Khatma', giver: 'Poora Gurugram', pay: 100000, gang: 2,
    brief: 'Dalal Bhai ne tere pump aur zameen pe nazar daali se. Badshahpur ke godown pe uske shooter. Gang le, hathiyaar le, aur khel khatam kar.' },
];
export const UNLOCK_AT = { guns: 2, gang: 3, land: 4 }; // Bade Kaam done before each opens up
export const unlocked = (p, what) => (p.bk || 0) >= UNLOCK_AT[what];
// Haryanvi hathiyaar: sold by Bittu Hathiyaar wala once Udhaar Vasooli is done. Firing in public brings the police.
export const GUNS = {
  katta:  { name: 'Desi Katta', price: 12000, dmg: 38, cd: 0.8, range: 26, round: 'goli', roundPrice: 60 },
  dunali: { name: 'Dunali (12 bore)', price: 40000, dmg: 70, cd: 1.4, range: 15, round: 'kartoos', roundPrice: 150 },
};
// your gang: chhore from Bhola Pehlwan's akhara who follow you, fight with you and are seen by everyone
export const GANG_NAMES = ['Bunty', 'Sonu', 'Lucky', 'Rocky', 'Pintu', 'Deepu', 'Vicky', 'Bablu', 'Titu', 'Happy', 'Ankit', 'Sandeep', 'Mohit', 'Kala', 'Sheru'];
export const gangMax = p => unlocked(p, 'gang') ? Math.min(6, 1 + Math.floor((p.level || 1) / 3) + Math.max(0, (p.bk || 0) - UNLOCK_AT.gang)) : 0;
export const gangCost = p => 3000 + 2000 * ((p.gang || []).length);
// land: plots for sale around the city. Prices move every game day (the same for everyone); buy low, sell high.
export const PLOTS = [
  { id: 'sohna', name: 'Plot 7, Sohna Road', at: [1, 0], base: 160000, ph: 0.4 },
  { id: 'badshah', name: 'Kheti ki zameen, Badshahpur', at: [1, 1], base: 90000, ph: 2.1 },
  { id: 'gcx', name: 'Corner plot, Golf Course Extension', at: [-2, 1], base: 420000, ph: 4.0 },
  { id: 'manesar', name: 'Industrial plot, IMT Manesar', at: [2, 1], base: 260000, ph: 1.2 },
  { id: 'sec14', name: 'Dukaan plot, Sector 14 Market', at: [-1, 1], base: 140000, ph: 5.3 },
  { id: 'bhondsi', name: 'Farm plot, Bhondsi', at: [1, 2], base: 120000, ph: 3.2 },
  { id: 'phase3', name: 'Residential plot, DLF Phase 3', at: [-2, -1], base: 380000, ph: 0.9 },
  { id: 'sadar', name: 'Godown plot, Sadar Bazaar', at: [2, 0], base: 110000, ph: 2.7 },
];
export const plotPrice = (pl, day = gameDay()) => Math.round(pl.base * (1 + 0.22 * Math.sin(day * 0.9 + pl.ph) + 0.1 * Math.sin(day * 2.3 + pl.ph * 2)) / 1000) * 1000;
export const plotRent = pl => Math.round(pl.base * 0.004 / 10) * 10; // paid every game day you own it
// petrol: every motor vehicle has a tank; fill up at a petrol pump
export const PETROL_RATE = 100; // ₹ a litre
// a knocked-down NPC drops his batua (or her purse): a little cash to pick up. A player knocked down by an NPC loses a bit the same way.
export const DROP = { min: 40, max: 160, perLevel: 5, big: [300, 900], keep: 120 };
export const robAmount = money => Math.min(money, Math.max(50, Math.round(money * 0.06)), 3000);
export const TANK = { scooty: 6, dhakad: 13, chhotu: 30, desert: 50, cruiser: 60, auto: 8, bus: 120, truck: 160, naav: 20 };
export const FUEL_RANGE = { 2: 2600, 4: 2100, 5: 1800 }; // game units on a full tank, by vehicle kind
export const SPOUSE_NAMES = { f: ['Simran', 'Pooja', 'Neha', 'Anjali', 'Kavya', 'Riya', 'Priya'], m: ['Rohit', 'Aman', 'Vikram', 'Karan', 'Arjun', 'Rahul', 'Sahil'] };
export const SHAADI_COST = 25000;
// rishta steps: Mausi ji calls (home 2BHK or better + a car) → meet at Cyber Hub → long drive to Leisure Valley → ring from Goyal Jewellers → shaadi
export const RISHTA_STEPS = ['call', 'meet', 'date', 'ring', 'shaadi'];
export const rishtaReady = p => homeRank(p) >= LADDER.indexOf('flat') && (p.vehicles || []).some(v => VEH[v] && VEH[v].kind === 4);
export const PG_RENT = 200;

export const RANKS = [['Intern', 400], ['Associate', 600], ['Sr. Associate', 850], ['Team Lead', 1200], ['Manager', 1700], ['VP', 2500], ['CEO Saab', 4000]];
export const RESPECT = [[0, 'Naya Chhora'], [50, 'Gali ka Don'], [200, 'Sector ka Sher'], [600, 'Gurugram ka Chaudhary'], [1500, 'Haryana ka Baadshah']];

// Show-off items
export const BLING = {
  chain:  { name: 'Moti gold chain',      price: 25000, show: 25 },
  kada:   { name: 'Gold kada',            price: 15000, show: 15 },
  watch:  { name: 'Heavy gold watch',     price: 60000, show: 50 },
  gshades:{ name: 'Gold-frame chashma',   price: 12000, show: 12 },
  ring:   { name: 'Sagaai ki angoothi',   price: 15000, show: 10 },
  heera:  { name: 'Heeron ka haar',       price: 300000, show: 120 },
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
  challan: ['Drunk-driving challan', 2000], challan_big: ['Challan after argument', 4000], challan_chase: ['Challan after chase', 5000], arrest: ['Jurmana (arrest)', 1500], challan_film: ['Black film challan', 1000],
  bottle: ['Bottle service for the whole club', 15000], notes: ['Note udao at the baraat', 1000], party: ['Host a farmhouse party', 20000],
  firework: ['Diwali rocket', 200], don_auto: ['Auto to the Gali ke Don fight', 50], dangal: ['Dangal entry', 100], plate: ['Random HR26 number plate', RANDOM_PLATE_PRICE], ko_bill: ['Hospital bill', 200],
};

// Earning caps the server enforces: reason -> {max per event, cooldown seconds}
export const EARN = {
  ride: { max: 1100, cd: 14 }, delivery: { max: 700, cd: 10 }, loot: { max: 150, cd: 6 }, dangal: { max: 1000, cd: 45 },
  quest: { max: 1600, cd: 90 }, flood: { max: 1200, cd: 30 }, chai: { max: 60, cd: 4 }, prasad: { max: 251, cd: 3600 }, ipl: { max: 300, cd: 120 },
};


// Aaj ke kaam: seven tasks a day (one from each slot), the same all day, new at midnight Gurugram time.
// Roughly 30-40 minutes of play; {n} is filled from the player's level. go = where the task's GPS points.
export const DAILY = {
  kamai:  [{ k: 'earned', t: 'Aaj {n} kamao: kaam, race, delivery, sab chalega', n: l => 800 + 300 * Math.min(l, 12), money: 1, r: 400 }],
  badla:  [{ k: 'badla', t: '{enemy} ne tere dost {friend} ko {place} pe peeta! Dhoond ke sabak sikha', n: () => 1, r: 900, go: 'badla' }],
  shop:   [{ k: 'mallbuy', t: 'Ambience Mall se naye kapde ya topi le', n: () => 1, r: 400, go: 'mall' }],
  club:   [{ k: 'dance', t: 'Neon Nights, Sector 29 pe 1 minute naacho', n: () => 3, r: 500, go: 'club' },
           { k: 'baraat', t: 'Kisi ki baraat mein naacho (Events dekh)', n: () => 1, r: 600, min: 3, go: 'events' }],
  job:    [{ k: 'deliveries', t: 'Jhatpat ki deliveries karo', n: l => 2 + (l > 5 ? 1 : 0), r: 600, go: 'jhatpat' },
           { k: 'rides', t: 'Chalo pe sawaari chalao', n: l => 2 + (l > 5 ? 1 : 0), r: 700, go: 'chalo' },
           { k: 'shifts', t: 'TechNova office mein shift lagao', n: () => 1, r: 500, go: 'office' }],
  thrill: [{ k: 'race_wins', t: 'Ek street race jeeto', n: () => 1, r: 700, go: 'races' },
           { k: 'wrestle', t: 'Leisure Valley akhare mein dangal jeeto', n: () => 1, r: 1000, min: 3, go: 'akhara' },
           { k: 'jacks', t: 'Sadak pe kisi ki gaadi chheeno (E dabao)', n: () => 1, r: 600 },
           { k: 'npc_ko', t: 'Gali ke do chhore dhobi pachhad karo', n: () => 2, r: 500 },
           { k: 'badla', t: '{enemy} ne tere dost {friend} ko {place} pe peeta! Dhoond ke sabak sikha', n: () => 1, r: 900, go: 'badla' }],
  food:   [{ k: 'eat_dhaba', t: 'Sher-e-Haryana Dhaba pe khana khao', n: () => 1, r: 300, go: 'dhaba' },
           { k: 'eat_market', t: 'Galleria ya Sadar Bazaar mein chaat-mithai khao', n: () => 1, r: 300, go: 'market' }],
};
export const DAILY_SLOTS = ['job', 'thrill', 'kamai']; // a game day is 15 minutes: three quick kaam (two open the next level); the story moves through Bade Kaam
export const BADLA_ENEMY = ['Rinku Chhapri', 'Lalit Lambu', 'Sandy Gunda', 'Bittu Bawli', 'Kallu Kaanpur', 'Pintu Pataka', 'Sonu Supari'];
export const BADLA_FRIEND = ['Golu', 'Monu', 'Deepu', 'Happy', 'Sunny', 'Neha', 'Pinky'];
export const BADLA_SPOTS = [[300, 0, 'Sadar Bazaar'], [-150, 0, 'Galleria Market'], [-150, 150, 'Sector 14 Market'], [150, -150, 'Sector 29'], [150, 150, 'Badshahpur'], [300, 150, 'Old Gurgaon']]; // street chhora corners
export const dailyBonus = (lvl, streak) => Math.round((600 + 150 * Math.min(lvl, 12)) * (1 + 0.25 * Math.min(streak, 4)));

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
  thaila: { name: 'Paison ka thaila gira!', dur: 120 },
};
export const EVENT_ORDER = ['baraat', 'thaila', 'jam', 'holi', 'thaila', 'ipl', 'flood', 'baraat', 'thaila', 'diwali', 'jam'];
// where each event happens: the first three players to get there win cash (the baraat moves along Golf Course Road)
export const EVENT_SPOTS = { baraat: { x: -225, z: 0, line: 1 }, jam: { x: 0, z: -75 }, holi: { x: 150, z: 0 }, ipl: { x: 150, z: -295 }, diwali: { x: 0, z: 40 } };
export const RUSH_PRIZE = [700, 400, 250];
// Gali ke Don: a five-chapter gang story, one chapter a day, new every Monday (Gurugram time)
export const DON = [
  { boss: 'Rinku Chhapri', at: [300, 0, 'Sadar Bazaar'], hench: 0, hp: 120, dmg: 7, r: 1500,
    intro: 'Rinku Chhapri ne tere dost Golu ka phone cheen liya. Sadar Bazaar mein ghoom rya se.', taunt: 'Phone chahiye? Pehle mujhe hara!', outro: 'Rinku: "Mera bhai Lalit tujhe chhodega nahi!"' },
  { boss: 'Lalit Lambu', at: [150, -150, 'Sector 29'], hench: 1, hp: 150, dmg: 8, r: 2000,
    intro: 'Rinku ka bhai Lalit Lambu apne chele ke saath Sector 29 mein badla lene aaya se.', taunt: 'Mere bhai ko maara? Ab dekh!', outro: 'Lalit: "Sandy bhai ko pata chal gaya to tera kya hoga..."' },
  { boss: 'Sandy Gunda', at: [300, 150, 'Old Gurgaon'], hench: 2, hp: 180, dmg: 9, r: 2600,
    intro: 'Sandy Gunda, Dalal Bhai ka right hand. Old Gurgaon mein do chelon ke saath khada se.', taunt: 'Chhore, galat gali mein aa gaya!', outro: 'Sandy: "Kallu ko bhej diya hai Sector 14... dukaanein bacha sake to bacha!"' },
  { boss: 'Kallu Kaanpur', at: [-150, 150, 'Sector 14 Market'], hench: 2, hp: 210, dmg: 10, r: 3200,
    intro: 'Kallu Kaanpur ne Sector 14 Market mein hafta vasooli shuru kar di. Dukaanwale pareshan se.', taunt: 'Hafta de, warna dukaan band!', outro: 'Kallu: "Kal Dalal Bhai khud Sohna Road aayega. Bach sake to bach!"' },
  { boss: 'Dalal Bhai', at: [150, 0, 'Sohna Road'], hench: 3, hp: 280, dmg: 11, r: 6000, final: true,
    intro: 'FINALE! Dalal Bhai, Sohna Road ka don. Teen chele, ek sapna: tera haarna.', taunt: 'Aaja Gali ke Don... aaj dekhte se kaun asli!', outro: 'Dalal Bhai: "Aaj se tu hi Gali ka Don se..." 👑' },
];
// who phones the player for each chapter (the call is how new players discover the story)
export const DON_CALLS = [
  ['Golu', '🧑', 'Bhai! Rinku Chhapri ne mera phone cheen liya... tere paas hi ghoom rya se. Madad kar!'],
  ['Golu', '🧑', 'Bhai, Rinku ka bhai Lalit Lambu aa gaya chele ke saath! Mujhe dhoond rya se. Bacha le!'],
  ['Sharma ji (dukaandar)', '👴', 'Beta, Sandy Gunda ne dukaan ke aage tamasha laga diya. Tu hi kuch kar sake!'],
  ['Gupta ji (kirana)', '🧔', 'Kallu Kaanpur hafta maang rya se! Poora mohalla pareshan. Aaja jaldi!'],
  ['Unknown number', '🕶️', 'Main Dalal Bhai bol rya hoon. Mere aadmi bahut maar liye tune... aaja, aakhri faisla.'],
];
// corners where a chapter can play out; the boss turns up at the one nearest the player who takes the call
export const DON_SPOTS = [[300, 0, 'Sadar Bazaar'], [-150, 0, 'Galleria Market'], [-150, 150, 'Sector 14 Market'], [150, -150, 'Sector 29'], [150, 150, 'Badshahpur'], [300, 150, 'Old Gurgaon'], [150, 0, 'Sohna Road'], [0, 0, 'Rajiv Chowk']];
export const donScale = lvl => 1 + 0.08 * Math.min(lvl, 10);
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
// names that can't sit on a public leaderboard (Hinglish and English vulgarities); such a name is replaced at join
const BAD_NAME = /havas|chut|chod|bhosd|madarch|behench|bhenc|lund|lauda|lawd|loda|gaand|randi|fuck|bitch|dick|pussy|porn|nude|boob|sexy|\bsex\b|\bmc\b|\bbc\b/i;
export const badName = n => BAD_NAME.test(String(n || '').replace(/[^a-z\s]/gi, ''));
export function cleanName(n, max = 16) { const t = cleanText(n, max); return badName(t) ? '' : t; }
export function cleanText(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Street races: checkpoints follow real roads (corners sit on junctions). Each win unlocks the next rival.
// minMs: no car can finish faster (route length / 52 units per second, top speed with NOS), so the server rejects anything quicker.
export const RACES = [
  { id: 'ambience', name: 'Ambience Mall Sprint', rival: 'Monu Dahiya', veh: 'chhotu', color: 0xdedede, skill: 0.98, prize: 600,
    pts: [[-150, -225], [-75, -225], [-75, 75], [40, 75]], // out of the Ambience Mall gate, down MG Road, onto Sheetla Mata Road
    taunt: ['Oye naye! Race lagegi? Haar gaya to chai tere taraf se!', 'Chal dekh lete hain kitna dum se tere mein'],
    win: ["Arre! Beginner's luck se yeh. Rematch kar!", 'Theek se, agli baar dekh lunga'], lose: ['Ghar ja ke cycle chala, chhore!', 'Chai tere taraf se. Rematch?'] },
  { id: 'golf', name: 'Golf Course Road Run', rival: 'Jassi Sandhu', veh: 'desert', color: 0x2e6bd1, skill: 1.06, prize: 1000,
    pts: [[-225, 330], [-225, -225], [-75, -225], [-75, -375], [60, -375]],
    taunt: ['Golf Course Road meri se, paaji. Aaja!', 'Thar di power dekhega?'],
    win: ['Oye hoye! Changa chalaya', 'Lucky si tu, rematch kar'], lose: ['Balle balle! Mera road, meri race', 'Hor practice kar, paaji'] },
  { id: 'cyber', name: 'Cyber City Loop', rival: 'Pinky Yadav', veh: 'desert', color: 0xff5fa2, skill: 1.1, prize: 1400,
    pts: [[-75, -280], [-75, -375], [75, -375], [75, -225], [-75, -225], [-75, -300]],
    taunt: ['Office se pehle ek loop? Haarne ke liye ready?', 'Corners pe brake lagana seekh le pehle'],
    win: ['Hmm, not bad. Kal phir', 'Ok ok, maan gayi'], lose: ['Corners pe dheela pad gaya!', 'Bye bye, slowpoke'] },
  { id: 'nh48', name: 'NH-48 Drag', rival: 'Rocky Gujjar', veh: 'cruiser', color: 0x151515, skill: 1.15, prize: 2000,
    pts: [[-420, -375], [260, -375]],
    taunt: ['Seedhi sadak, full race. NOS hai tere paas?', 'Highway ka raja main hoon'],
    win: ['Kaise?! NOS mein kya daala tha?', 'Rematch, abhi ke abhi!'], lose: ['Highway pe bachche nahi chalte', 'Drift karke NOS bhar, fir aaiyo'] },
  { id: 'badshahpur', name: 'Badshahpur Night Run', rival: 'Chaudhary Saab', veh: 'cruiser', color: 0xf6c026, skill: 1.22, prize: 3500,
    pts: [[375, -300], [375, 75], [225, 75], [225, 375], [-75, 375], [-75, 300]],
    taunt: ['Gurugram ka street king banna se? Pehle mujhe hara', 'Badshahpur mera ilaaka se, chhore'],
    win: ['Aaj se tu Gurugram ka Street King. Ram Ram!', 'Jeet gaya... par kal fir aaunga'], lose: ['Abhi bachcha se tu', 'Street King ka taj itna sasta nahi'] },
];
export function raceLen(r) { let s = 0; for (let i = 1; i < r.pts.length; i++) s += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); return s; }
for (const r of RACES) r.minMs = Math.round(raceLen(r) / 52 * 1000);

// Weather: everyone sees the same sky. lvl 0 clear … 4 "most heavy" rain; water at the flood spots rises with it.
export const WEATHER = [
  { name: 'Saaf mausam', short: 'Saaf', rain: 0, water: 0 },
  { name: 'Boonda-baandi (drizzle)', short: 'Boonda-baandi', rain: 0.18, water: 0.15 },
  { name: 'Halki baarish', short: 'Halki baarish', rain: 0.45, water: 0.4 },
  { name: 'Tez baarish', short: 'Tez baarish', rain: 0.75, water: 0.75 },
  { name: 'Moosladhaar baarish!', short: 'Moosladhaar!', rain: 1, water: 1 },
];
// Places that famously go under water in Gurugram, placed on the matching junctions and roads of the game map
export const FLOOD_SPOTS = [
  { name: 'Hero Honda Chowk', x: 75, z: 225, r: 46 },
  { name: 'Golf Course Road underpass', x: -225, z: -75, r: 40 },
  { name: 'Sohna Road', x: 75, z: 75, r: 38 },
  { name: 'Narsinghpur, NH-48', x: 225, z: -375, r: 44 },
  { name: 'Sheetla Mata Road', x: -75, z: 75, r: 34 },
  { name: 'Iffco Chowk', x: 75, z: -75, r: 36 },
];
