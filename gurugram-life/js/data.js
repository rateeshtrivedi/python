'use strict';
// Static world data for Gurugram Life.
// Every business, brand and app name below is fictional.

const WORLD = { w: 3600, h: 2600 };
const PX_PER_KM = 200; // the map is roughly 18 km x 13 km

const ROADS_V = [
  { name: 'NH-48 Expressway', x: 200, w: 120, hw: true, jam: true },
  { name: 'Old Railway Road', x: 900, w: 70 },
  { name: 'Sohna Road', x: 1650, w: 80, jam: true },
  { name: 'Golf Course Road', x: 2400, w: 90, jam: true },
  { name: 'Golf Course Ext. Road', x: 3150, w: 80 },
];
const ROADS_H = [
  { name: 'MG Road', y: 350, w: 90, jam: true },
  { name: 'Sector Road', y: 1100, w: 70 },
  { name: 'Southern Peripheral Road', y: 1850, w: 90 },
];

// City blocks sit between the roads.
const COLS = [[0, 140], [260, 865], [935, 1610], [1690, 2355], [2445, 3110], [3190, 3600]];
const ROWS = [[0, 305], [395, 1065], [1135, 1805], [1895, 2600]];

function cellRect(c0, c1, r0, r1) {
  return { x: COLS[c0][0], y: ROWS[r0][0], w: COLS[c1][1] - COLS[c0][0], h: ROWS[r1][1] - ROWS[r0][0] };
}

const DISTRICTS = [
  { name: 'Dwarka Expressway Fields', ...cellRect(0, 0, 0, 3), color: '#b7c98a', farm: true },
  { name: 'Udyog Vihar', ...cellRect(1, 1, 0, 0), color: '#cfc8b8' },
  { name: 'Cyber City', ...cellRect(2, 2, 0, 0), color: '#c3cdd8' },
  { name: 'MG Road', ...cellRect(3, 3, 0, 0), color: '#d8c9c0' },
  { name: 'Sikanderpur', ...cellRect(4, 4, 0, 0), color: '#cfd3c2' },
  { name: 'Aravalli Biodiversity Park', ...cellRect(5, 5, 0, 1), color: '#86b86b', green: true },
  { name: 'Sector 14', ...cellRect(1, 1, 1, 1), color: '#dcd1bd' },
  { name: 'Sector 29', ...cellRect(2, 2, 1, 1), color: '#d6cbd8' },
  { name: 'Golf Course Road', ...cellRect(3, 3, 1, 1), color: '#c6d6c4' },
  { name: 'Sector 54', ...cellRect(4, 4, 1, 1), color: '#d3d0c6' },
  { name: 'Sadar Bazaar (Old Gurugram)', ...cellRect(1, 1, 2, 2), color: '#e0c8aa' },
  { name: 'Sushant Lok', ...cellRect(2, 2, 2, 2), color: '#d9d2c3' },
  { name: 'Sohna Road', ...cellRect(3, 3, 2, 2), color: '#d6cdbd' },
  { name: 'Golf Course Extension', ...cellRect(4, 4, 2, 2), color: '#cdd2d9' },
  { name: 'Badshahpur', ...cellRect(5, 5, 2, 2), color: '#cfc6a6' },
  { name: 'New Gurugram', ...cellRect(1, 2, 3, 3), color: '#d4cfc2' },
  { name: 'Southern Sectors', ...cellRect(3, 4, 3, 3), color: '#cbcfbe' },
  { name: 'Aravalli Foothills', ...cellRect(5, 5, 3, 3), color: '#a9b77f', green: true },
];

function B(id, col, row, dx, dy, w, h, props) {
  return Object.assign({ id, x: COLS[col][0] + dx, y: ROWS[row][0] + dy, w, h, solid: true }, props);
}

const BUILDINGS = [
  // Udyog Vihar
  B('talksphere', 1, 0, 30, 30, 220, 160, { name: 'TalkSphere BPO', type: 'job', job: 'bpo', color: '#7d8fa8' }),
  B('precision', 1, 0, 300, 30, 260, 130, { name: 'Precision Auto Components', type: 'job', job: 'factory', color: '#9a8f7a' }),
  B('truckdhaba', 1, 0, 320, 200, 150, 65, { name: 'Highway Truckers Dhaba', type: 'food', menu: 'dhaba', color: '#c48a4a' }),
  // Cyber City
  B('codekraft', 2, 0, 30, 25, 210, 190, { name: 'CodeKraft Technologies', type: 'job', job: 'dev', color: '#4f74b3' }),
  B('cybersquare', 2, 0, 280, 25, 210, 150, { name: 'Cyber Square', type: 'social', venue: 'cybersquare', color: '#8a5bb5' }),
  B('metro_cyber', 2, 0, 300, 215, 130, 50, { name: 'Rapid Link – Cyber City', type: 'metro', color: '#2a9d8f' }),
  B('glasstower', 2, 0, 530, 25, 120, 200, { name: 'Infinity Glass Tower', type: 'landmark', color: '#6fa3c9',
    text: 'Home to 40 startups, 3 unicorns and 1 very tired lift. The security guard knows everyone\'s funding round.' }),
  // MG Road
  B('galaxymall', 3, 0, 30, 25, 300, 200, { name: 'Galaxy Mall', type: 'mall', job: 'retail', shop: 'mall', menu: 'foodcourt', color: '#d07a6a' }),
  B('bhatura', 3, 0, 380, 40, 170, 100, { name: 'Bhatura Junction', type: 'food', menu: 'bhatura', color: '#e0a34a' }),
  B('metro_mg', 3, 0, 390, 200, 130, 50, { name: 'Rapid Link – MG Road', type: 'metro', color: '#2a9d8f' }),
  // Sikanderpur
  B('aravallifin', 4, 0, 30, 25, 220, 200, { name: 'Aravalli Fintech HQ', type: 'job', job: 'analyst', color: '#3f6e5e' }),
  B('paisabank', 4, 0, 300, 40, 170, 110, { name: 'Paisa Bank', type: 'bank', color: '#c9a227' }),
  B('metro_sik', 4, 0, 320, 200, 130, 50, { name: 'Rapid Link – Sikanderpur', type: 'metro', color: '#2a9d8f' }),
  // Aravalli Biodiversity Park
  B('aravallipark', 5, 0, 40, 40, 330, 980, { name: 'Aravalli Biodiversity Park', type: 'park', park: 'aravalli', solid: false, color: '#5f9e4f' }),
  // Sector 14
  B('shantipg', 1, 1, 30, 30, 190, 150, { name: 'Shanti PG (Sector 14)', type: 'home', home: 'pg', color: '#d9b38c' }),
  B('chaichaupal', 1, 1, 280, 30, 170, 110, { name: 'Chai Chaupal', type: 'job', job: 'barista', menu: 'chai', color: '#b5651d' }),
  B('skillup', 1, 1, 30, 290, 230, 150, { name: 'SkillUp Academy', type: 'skill', color: '#5a7d9a' }),
  B('sec14market', 1, 1, 310, 290, 260, 130, { name: 'Sector 14 Market', type: 'shop', shop: 'market', color: '#c27c5a' }),
  B('kirana14', 1, 1, 310, 500, 150, 90, { name: 'Lala Ji Kirana Store', type: 'food', menu: 'kirana', color: '#a3b14b' }),
  // Sector 29
  B('leisure', 2, 1, 30, 30, 380, 270, { name: 'Leisure Valley Park', type: 'park', park: 'leisure', solid: false, color: '#6aab55' }),
  B('brewbastion', 2, 1, 450, 30, 190, 130, { name: 'Brew Bastion Pub', type: 'social', venue: 'pub', color: '#7a4b8c' }),
  B('momomahal', 2, 1, 450, 220, 170, 100, { name: 'Momo Mahal', type: 'food', menu: 'momo', color: '#e07a5f' }),
  B('ironparadise', 2, 1, 30, 370, 210, 140, { name: 'Iron Paradise Gym', type: 'gym', color: '#555c6b' }),
  B('natak', 2, 1, 300, 380, 330, 180, { name: 'Natak Nagri Theatre', type: 'social', venue: 'theatre', color: '#b0413e' }),
  // Golf Course Road
  B('skyline', 3, 1, 30, 30, 170, 280, { name: 'Skyline Towers', type: 'home', home: 'penthouse', color: '#8fa9c4' }),
  B('emerald', 3, 1, 250, 30, 380, 270, { name: 'Emerald Golf Club', type: 'social', venue: 'golf', color: '#3d8b3d' }),
  B('grandorchid', 3, 1, 30, 380, 240, 150, { name: 'Grand Orchid Hotel', type: 'food', menu: 'fine', color: '#a77d4d' }),
  B('metro_gcr', 3, 1, 330, 560, 130, 50, { name: 'Rapid Link – Golf Course Rd', type: 'metro', color: '#2a9d8f' }),
  // Sector 54
  B('sanjeevani', 4, 1, 30, 30, 250, 180, { name: 'Sanjeevani Hospital', type: 'hospital', color: '#e6e9ee' }),
  B('palmres', 4, 1, 340, 30, 200, 220, { name: 'Palm Residency', type: 'home', home: 'twobhk', color: '#c8b28f' }),
  B('mithaas', 4, 1, 30, 300, 170, 90, { name: 'Mithaas Sweets', type: 'food', menu: 'sweets', color: '#f0b44c' }),
  B('metro_54', 4, 1, 330, 560, 130, 50, { name: 'Rapid Link – Sector 54 Chowk', type: 'metro', color: '#2a9d8f' }),
  // Sadar Bazaar
  B('sadar', 1, 2, 30, 30, 360, 160, { name: 'Sadar Bazaar', type: 'shop', shop: 'bazaar', color: '#d9734e' }),
  B('sharmaji', 1, 2, 430, 30, 150, 110, { name: 'Sharma Ji ka Dhaba', type: 'food', menu: 'dhaba', color: '#c48a4a' }),
  B('basera', 1, 2, 30, 270, 190, 150, { name: 'Basera Rooms', type: 'home', home: 'room', color: '#b39b7d' }),
  B('busadda', 1, 2, 290, 280, 280, 130, { name: 'Old Gurugram Bus Adda', type: 'landmark', color: '#8d8d8d',
    text: 'Buses to Rewari, Jaipur and "wherever, bhaiya". The conductor\'s whistle is louder than the horns.' }),
  // Sushant Lok
  B('sushantnest', 2, 2, 30, 30, 210, 180, { name: 'Sushant Nest Apartments', type: 'home', home: 'onebhk', color: '#d4b896' }),
  B('biryanibros', 2, 2, 300, 30, 170, 100, { name: 'Biryani Brothers', type: 'food', menu: 'biryani', color: '#c86b3c' }),
  B('plaza', 2, 2, 30, 300, 300, 140, { name: 'Sushant Plaza Market', type: 'shop', shop: 'market', color: '#b98a6a' }),
  // Sohna Road
  B('zipzap', 3, 2, 30, 30, 210, 130, { name: 'ZipZap Delivery Hub', type: 'job', job: 'delivery', color: '#f2c14e' }),
  B('raftaar', 3, 2, 300, 30, 240, 140, { name: 'Raftaar Motors', type: 'dealer', color: '#c0392b' }),
  B('omnix', 3, 2, 30, 260, 320, 180, { name: 'Omnix Mall', type: 'mall', shop: 'mall', menu: 'foodcourt', color: '#d68a9c' }),
  // Golf Course Extension
  B('hustlehive', 4, 2, 30, 30, 220, 160, { name: 'HustleHive Coworking', type: 'job', job: 'freelance', color: '#e76f51' }),
  B('horizon', 4, 2, 320, 30, 200, 250, { name: 'Horizon Heights', type: 'home', home: 'threebhk', color: '#9bb0c8' }),
  B('caffeinelab', 4, 2, 30, 280, 170, 100, { name: 'Caffeine Lab', type: 'food', menu: 'cafe', color: '#6d4c41' }),
  // Badshahpur
  B('chaupal', 5, 2, 50, 60, 300, 220, { name: 'Badshahpur Village Chaupal', type: 'park', park: 'chaupal', solid: false, color: '#a8b45a' }),
  B('taulassi', 5, 2, 60, 340, 170, 90, { name: 'Tau Ki Lassi', type: 'food', menu: 'lassi', color: '#e8d8a8' }),
  // New Gurugram
  B('harmony', 1, 3, 40, 60, 230, 200, { name: 'Harmony Homes (Sector 84)', type: 'home', home: 'flat', color: '#c9b9a0' }),
  B('site82', 1, 3, 330, 60, 240, 220, { name: 'Sector 82 Construction Site', type: 'job', job: 'construction', color: '#d4a017' }),
  B('cineplex', 2, 3, 60, 60, 270, 170, { name: 'Aravalli Cineplex', type: 'social', venue: 'cinema', color: '#3b3f6b' }),
  B('rajma', 2, 3, 400, 60, 170, 100, { name: 'Rajma Chawal Point', type: 'food', menu: 'bhatura', color: '#c27a3a' }),
  // Southern Sectors
  B('cricket', 3, 3, 60, 60, 420, 300, { name: 'Sector 70 Cricket Maidan', type: 'park', park: 'cricket', solid: false, color: '#7cb35a' }),
  B('trafficbhawan', 4, 3, 60, 60, 220, 140, { name: 'Traffic Police Bhawan', type: 'landmark', color: '#5b6fa8',
    text: 'Notice board: "No helmet? ₹1,000. Wrong side? ₹5,000. Honking near hospital? Shame." Nakas are set up on major roads.' }),
  // Aravalli Foothills
  B('foothills', 5, 3, 40, 60, 330, 400, { name: 'Aravalli Foothills Trail', type: 'park', park: 'trail', solid: false, color: '#8ea65e' }),
];

const HOMES = {
  room: { building: 'basera', title: 'Shared room', rent: 900, comfort: 0.6, desc: 'Two roommates, one cooler. Old Gurugram charm.' },
  pg: { building: 'shantipg', title: 'PG bed + breakfast', rent: 1600, comfort: 0.75, meals: true, desc: 'Aunty makes aloo parathas. 10:30 PM curfew (not enforced).' },
  flat: { building: 'harmony', title: 'Affordable 1RK', rent: 2300, comfort: 0.8, desc: 'Cheap, quiet, and very far from everything.' },
  onebhk: { building: 'sushantnest', title: '1BHK apartment', rent: 3800, comfort: 0.9, desc: 'Own kitchen, own balcony, own power backup.' },
  twobhk: { building: 'palmres', title: '2BHK apartment', rent: 6500, comfort: 1.0, desc: 'Gated society with a swimming pool nobody uses.' },
  threebhk: { building: 'horizon', title: '3BHK high-rise', rent: 11000, comfort: 1.05, desc: '24th floor. Aravalli view on a good AQI day.' },
  penthouse: { building: 'skyline', title: 'Golf Course Rd penthouse', rent: 22000, comfort: 1.2, mood: true, desc: 'Infinity pool, concierge, neighbours with three surnames.' },
};

// shift start hour, hours of work, pay per shift (₹), requirements.
const JOBS = {
  factory: { title: 'Assembly Line Helper', building: 'precision', pay: 850, start: 8, hours: 8, req: {}, energy: 1.9, fitness: 0.08 },
  construction: { title: 'Site Helper', building: 'site82', pay: 950, start: 8, hours: 8, req: { fitness: 1 }, energy: 2.1, fitness: 0.15 },
  barista: { title: 'Barista', building: 'chaichaupal', pay: 750, start: 7, hours: 7, req: {}, energy: 1.5, comm: 0.05 },
  retail: { title: 'Retail Associate', building: 'galaxymall', pay: 1050, start: 11, hours: 8, req: { comm: 1, style: 1 }, energy: 1.5, comm: 0.08 },
  bpo: { title: 'Night-shift Support Associate', building: 'talksphere', pay: 1450, start: 21, hours: 8, req: { comm: 2 }, energy: 1.7, comm: 0.1 },
  freelance: { title: 'Freelance Web Developer', building: 'hustlehive', pay: 1800, start: -1, hours: 5, req: { coding: 2 }, energy: 1.4, coding: 0.06, flexible: true },
  dev: { title: 'Software Engineer', building: 'codekraft', pay: 3300, start: 10, hours: 9, req: { coding: 3, comm: 1 }, energy: 1.5, coding: 0.08 },
  analyst: { title: 'Fintech Analyst', building: 'aravallifin', pay: 4600, start: 9, hours: 9, req: { coding: 2, comm: 3, style: 2 }, energy: 1.6, comm: 0.06 },
};

// [name, price, hunger restored, extra effects]
const MENUS = {
  dhaba: [['Dal Makhani + 2 Butter Roti', 130, 38], ['Paneer Paratha + Lassi', 160, 48], ['Full Thali', 230, 72]],
  chai: [['Cutting Chai', 20, 4, { energy: 8 }], ['Bun Maska', 45, 14], ['Masala Chai + Samosa', 60, 20, { energy: 6 }]],
  momo: [['Steamed Momos', 100, 26], ['Tandoori Momos', 160, 36], ['Momo Platter (sharing)', 280, 62, { social: 4 }]],
  bhatura: [['Chole Bhature', 140, 46], ['Rajma Chawal', 120, 42], ['Kadhi Chawal', 110, 38]],
  sweets: [['Samosa', 25, 9], ['Jalebi (250 g)', 90, 16, { mood: 6 }], ['Kaju Katli box', 480, 20, { social: 8 }]],
  fine: [['Butter Chicken Buffet', 1800, 85, { social: 10 }], ['High Tea for one', 950, 35, { social: 6 }]],
  cafe: [['Cold Coffee', 220, 10, { energy: 12 }], ['Avocado Toast (very Gurugram)', 450, 30, { social: 4 }], ['Oat-milk Flat White', 280, 6, { energy: 14 }]],
  biryani: [['Chicken Dum Biryani', 290, 58], ['Veg Biryani', 230, 50], ['Biryani Bucket (party)', 750, 70, { social: 10 }]],
  lassi: [['Malai Lassi', 60, 18], ['Kachori + Lassi', 95, 36]],
  kirana: [['Instant Noodles', 25, 15], ['Bread, Eggs & Milk', 90, 32], ['Seasonal Fruits', 110, 24, { health: 4 }]],
  foodcourt: [['Food-court Burger Combo', 320, 45], ['South Indian Thali', 260, 50], ['Pizza Slice + Soda', 240, 34]],
};

const ITEMS = {
  helmet: { name: 'ISI Helmet', price: 1100, desc: 'Needed on two-wheelers. Saves you ₹1,000 challans.' },
  mask: { name: 'N95 Masks (pack)', price: 250, desc: 'Halves health damage on bad AQI days.' },
  tshirt: { name: 'Graphic Tee', price: 600, style: 0.5 },
  kurta: { name: 'Festive Kurta', price: 1800, style: 1 },
  sunglasses: { name: 'Aviators', price: 2000, style: 0.5 },
  formals: { name: 'Office Formals', price: 3500, style: 1.5 },
  sneakers: { name: 'Branded-ish Sneakers', price: 4500, style: 1 },
  watch: { name: 'Smart Watch', price: 8000, style: 1 },
  blazer: { name: 'Designer Blazer', price: 12000, style: 2 },
  inverter: { name: 'Home inverter', price: 4500, desc: 'Power backup: better sleep.' },
};
const SHOPS = {
  bazaar: ['helmet', 'mask', 'tshirt', 'kurta', 'sunglasses'],
  market: ['mask', 'tshirt', 'formals', 'sneakers'],
  mall: ['formals', 'sneakers', 'watch', 'blazer', 'sunglasses'],
};

const VEHICLES = {
  ebike: { name: 'ZipZap e-bike (day rental)', speed: 250, two: true, fuel: 0, rental: true },
  scooter: { name: 'Raftaar Zest 110 scooter', price: 68000, speed: 300, two: true, fuel: 2 },
  bike: { name: 'Raftaar Thunder 350 motorbike', price: 185000, speed: 360, two: true, fuel: 3 },
  car: { name: 'Used hatchback (2017 model)', price: 320000, speed: 340, two: false, fuel: 6 },
};

// Ride-hailing. Two fictional apps compete on price and vehicle types.
const RIDE_APPS = {
  chalo: { name: 'Chalo', icon: '🚕', bg: '#14161c', fg: '#ffd400', types: ['auto', 'mini', 'sedan', 'xl'], mult: 1.0, tag: 'Cabs & autos, door to door' },
  phatphat: { name: 'PhatPhat', icon: '🏍️', bg: '#ffcc00', fg: '#14161c', types: ['bike', 'auto'], mult: 0.92, tag: 'Bike taxis that zip past jams' },
};
const RIDE_TYPES = {
  bike: { label: 'Bike Taxi', icon: '🏍️', base: 20, perKm: 7, jam: 0.85, color: '#f4a300', len: 16, wid: 8 },
  auto: { label: 'Auto Rickshaw', icon: '🛺', base: 35, perKm: 12, jam: 0.65, color: '#2d9c3c', len: 22, wid: 15 },
  mini: { label: 'Mini (hatchback)', icon: '🚗', base: 55, perKm: 15, jam: 0.45, color: '#f0f0f0', len: 30, wid: 17 },
  sedan: { label: 'Sedan', icon: '🚘', base: 75, perKm: 19, jam: 0.45, color: '#2f3640', len: 34, wid: 18 },
  xl: { label: 'XL SUV (6 seats)', icon: '🚙', base: 110, perKm: 25, jam: 0.45, color: '#1f3b70', len: 38, wid: 20 },
};

const BACKSTORIES = [
  { id: 'fresher', title: 'Fresh graduate', desc: 'From Lucknow. ₹15,000, decent English.', money: 15000, skills: { comm: 1.5 } },
  { id: 'coder', title: 'Self-taught coder', desc: 'From Indore. ₹12,000, some coding.', money: 12000, skills: { coding: 2 } },
  { id: 'local', title: 'Gurugram local', desc: '₹9,000, owns a scooter + helmet.', money: 9000, skills: { comm: 1 }, vehicle: 'scooter', items: ['helmet'] },
  { id: 'hustler', title: 'Small-town hustler', desc: 'From Bihar. ₹7,000, very fit.', money: 7000, skills: { fitness: 2.2 } },
];

const LOOKS = {
  skin: ['#f6d2b4', '#e4b48e', '#c98f62', '#a46c45', '#6f4428'],
  hair: ['#1b1410', '#4a2d1a', '#8a5a2b', '#b9b2a8', '#7a2e2e'],
  hairStyle: ['short', 'long', 'bun', 'cap'],
  shirt: ['#e94f37', '#3b82f6', '#22a06b', '#f2c14e', '#8e5cf5', '#ffffff', '#1d2230'],
  pants: ['#2f3a56', '#3b3b3b', '#7a6248', '#c9b48a', '#1d4e89'],
};

const NPC_NAMES = [
  ['Aarav', 'software tester'], ['Priya', 'HR manager'], ['Rohit', 'delivery partner'], ['Neha', 'startup founder'],
  ['Vikram', 'auto driver'], ['Simran', 'yoga teacher'], ['Karan', 'BPO team lead'], ['Ananya', 'UX designer'],
  ['Mohit', 'real-estate broker'], ['Pooja', 'nurse'], ['Sandeep', 'security guard'], ['Ishita', 'law student'],
  ['Deepak', 'chaiwala'], ['Megha', 'data analyst'], ['Harsh', 'gym trainer'], ['Ritu', 'school teacher'],
  ['Tarun', 'stand-up comic'], ['Kavya', 'product manager'], ['Manoj', 'construction foreman'], ['Shreya', 'chef'],
  ['Arjun', 'cricket coach'], ['Nisha', 'banker'], ['Gaurav', 'influencer'], ['Tanvi', 'architect'],
  ['Rakesh Tau', 'retired farmer'], ['Sunita Aunty', 'PG owner'], ['Faizan', 'mechanic'], ['Jaspreet', 'cab driver'],
];

const CHATTER = [
  'Bhai, I left Sector 29 at 6 and reached Cyber City at 7:15. Two kilometres.',
  'Rent on Golf Course Road is more than my salary. Literally.',
  'Have you tried the tandoori momos at Momo Mahal? Life-changing.',
  'AQI crossed 300 again. Wear a mask, yaar.',
  'I\'m building a startup — chai delivered in 7 minutes. Pre-revenue, post-vibes.',
  'Monsoon aaya, and Sohna Road became Sohna River.',
  'Friday nights at Cyber Square are packed. You should come!',
  'My PG aunty knows my salary before my manager does.',
  'Bike taxis on PhatPhat are the only way to beat the MG Road jam.',
  'The Rapid Link metro is quick, but the walk to the station is the real cardio.',
  'Leisure Valley at 6 AM: half the city is doing yoga, the other half is filming it.',
  'I got a ₹1,000 challan for riding without a helmet. Learn from my mistakes.',
  'They say Gurugram has more malls than parks. Have you counted?',
  'Sharma Ji ka Dhaba has the best paranthas in Old Gurugram. Fight me.',
  'Every second building here is a coworking space.',
  'Work from office is back. My scooter is not happy.',
];

const JOB_TIPS = {
  'HR manager': 'Recruiters at Aravalli Fintech love good communication and sharp clothes (Style 2).',
  'software tester': 'CodeKraft wants Coding 3. SkillUp Academy in Sector 14 runs bootcamps.',
  'BPO team lead': 'TalkSphere is always hiring night shift. You need Communication 2.',
  'delivery partner': 'ZipZap hub on Sohna Road pays per order. Rent their e-bike — walking is a trap.',
  'startup founder': 'HustleHive takes freelancers with Coding 2. Flexible hours, no boss.',
  'construction foreman': 'The Sector 82 site needs strong people. Hit the gym or jog in the park first.',
  'chaiwala': 'Chai Chaupal needs a morning barista. No experience needed!',
  'real-estate broker': 'Basera Rooms is the cheapest. Skyline Towers if you\'re loaded.',
};

const ERRANDS = [
  ['Drop off this tiffin box', 'tiffin'], ['Return my borrowed book', 'book'], ['Deliver these wedding sweets', 'sweets'],
  ['Hand over my laptop charger', 'charger'], ['Pick up my dry-cleaning receipt and drop it off', 'receipt'],
];
const ORDERS = ['2 Butter Naan & Dal', 'a phone charger', 'groceries for a PG', 'a birthday cake', 'office lunch boxes', 'a pharmacy order', '3 cold coffees', 'a cricket bat'];

// Traffic police check-points on major roads.
const NAKAS = [
  { x: 900, y: 720 }, { x: 1650, y: 1480 }, { x: 2400, y: 760 }, { x: 200, y: 1380 }, { x: 2000, y: 1850 },
];

// ---------- progression & hustle data ----------
// Public link added to brag text. Empty until the game is launched publicly.
const SHARE_URL = '';

const LEVEL_TITLES = [[1, 'Fresher'], [3, 'Hustler'], [5, 'Local Pro'], [8, 'Corporate Warrior'], [12, 'Startup Wala'], [16, 'Influencer'], [20, 'Gurugram Royalty'], [25, 'Millennium City Legend']];
const XP_FOR = { deliver: 25, shift: 40, ride: 10, metro: 10, chat: 8, eat: 5, reel: 15, social: 20, train: 25, errand: 30, collect: 4, event: 15 };

// Passive-income hustles. income = ₹ per in-game hour at level 1.
const BUSINESSES = [
  { id: 'chai', name: 'Chai Tapri', icon: '☕', cost: 8000, income: 60, level: 1, where: 'a footpath in Cyber City' },
  { id: 'momo', name: 'Momo Cart', icon: '🥟', cost: 25000, income: 170, level: 3, where: 'Sector 29 market' },
  { id: 'kitchen', name: 'Cloud Kitchen', icon: '🍳', cost: 120000, income: 700, level: 5, where: 'a basement on Sohna Road' },
  { id: 'pg', name: 'PG Building', icon: '🏘️', cost: 600000, income: 3000, level: 8, where: 'Sector 14' },
  { id: 'cowork', name: 'Coworking Floor', icon: '🧑‍💻', cost: 2000000, income: 9000, level: 12, where: 'Golf Course Ext. Road' },
  { id: 'startup', name: 'Your Own Startup', icon: '🦄', cost: 5000000, income: 24000, level: 16, where: 'Cyber City' },
];

// Reelz photo spots: building id and how much the spot boosts views.
const PHOTO_SPOTS = [
  { id: 'cybersquare', hype: 1.8 }, { id: 'glasstower', hype: 1.5 }, { id: 'leisure', hype: 1.3 }, { id: 'emerald', hype: 2.0 },
  { id: 'galaxymall', hype: 1.4 }, { id: 'aravallipark', hype: 1.6 }, { id: 'skyline', hype: 1.9 }, { id: 'natak', hype: 1.5 },
  { id: 'cricket', hype: 1.2 }, { id: 'chaupal', hype: 1.3 }, { id: 'momomahal', hype: 1.2 }, { id: 'sadar', hype: 1.4 },
];
const BRAND_DEALS = [[1000, 500, 'a local chai brand'], [10000, 3000, 'a sneaker label'], [100000, 15000, 'a fintech app'], [1000000, 60000, 'a national cola brand']];

const DAILY_TASKS = [
  { k: 'deliver', n: 3, t: 'Complete 3 ZipZap deliveries' }, { k: 'shift', n: 1, t: 'Work a full shift' },
  { k: 'ride', n: 2, t: 'Take 2 Chalo or PhatPhat rides' }, { k: 'metro', n: 1, t: 'Ride the Rapid Link Metro' },
  { k: 'chat', n: 4, t: 'Chat with 4 people' }, { k: 'eat', n: 3, t: 'Eat 3 meals' }, { k: 'reel', n: 2, t: 'Post 2 reels on Reelz' },
  { k: 'social', n: 1, t: 'Hang out at a social venue' }, { k: 'earn', n: 3000, t: 'Earn ₹3,000' }, { k: 'train', n: 1, t: 'Work out, jog or take a course' },
  { k: 'collect', n: 2, t: 'Collect business earnings twice' }, { k: 'errand', n: 1, t: 'Run an errand for someone' },
];
const LOGIN_REWARDS = [{ cash: 500 }, { cash: 800 }, { xp: 150 }, { cash: 1500 }, { spins: 1 }, { cash: 3000 }, { cash: 6000, spins: 1, xp: 300 }];
const SPIN_PRIZES = [
  { t: '₹200', w: 22, cash: 200, c: '#ffb27a' }, { t: '₹500', w: 20, cash: 500, c: '#8e5cf5' }, { t: '+60 XP', w: 16, xp: 60, c: '#22a06b' },
  { t: '₹1,000', w: 14, cash: 1000, c: '#3b82f6' }, { t: 'Full energy', w: 10, energy: true, c: '#f2c14e' }, { t: '+500 fans', w: 8, followers: 500, c: '#e23744' },
  { t: '₹2,500', w: 7, cash: 2500, c: '#0ea5e9' }, { t: 'JACKPOT', w: 3, cash: 10000, c: '#111827' },
];

// ---------- city fill, collectibles, races, stocks ----------
// Background buildings that make blocks feel dense. Deterministic, so every
// player sees the same city. Kept separate from BUILDINGS: no doors, no menus.
const FILLERS = (() => {
  let seed = 20260705;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = [];
  const roadHit = (x, y, w, h) => ROADS_V.some((r) => x < r.x + r.w / 2 + 16 && x + w > r.x - r.w / 2 - 16) || ROADS_H.some((r) => y < r.y + r.w / 2 + 16 && y + h > r.y - r.w / 2 - 16);
  const blocked = (x, y, w, h) => BUILDINGS.some((b) => x < b.x + b.w + 24 && x + w > b.x - 24 && y < b.y + b.h + 70 && y + h > b.y - 24)
    || out.some((f) => x < f.x + f.w + 16 && x + w > f.x - 16 && y < f.y + f.h + 16 && y + h > f.y - 16)
    || NAKAS.some((n) => Math.abs(n.x - (x + w / 2)) < w / 2 + 40 && Math.abs(n.y - (y + h / 2)) < h / 2 + 40);
  const TALL = ['Cyber City', 'Golf Course Road', 'Sikanderpur', 'Golf Course Extension', 'MG Road', 'Sector 54'];
  const MID = ['New Gurugram', 'Sohna Road', 'Sushant Lok', 'Southern Sectors', 'Udyog Vihar'];
  const tones = ['#d9cfc0', '#cbb9a0', '#e3d6c3', '#c4a98c', '#d8c4b6', '#bfc6c9', '#e6e0d4', '#c9b8a8'];
  for (const d of DISTRICTS) {
    if (d.farm || d.green) continue;
    const tall = TALL.includes(d.name), mid = MID.includes(d.name);
    const cell = tall ? 150 : 100;
    const lots = [];
    for (let gy = d.y + 18; gy + cell * 0.5 < d.y + d.h - 18; gy += cell) for (let gx = d.x + 18; gx + cell * 0.5 < d.x + d.w - 18; gx += cell) lots.push([gx, gy]);
    for (const [gx, gy] of lots) {
      const w = Math.min(cell * (0.55 + rnd() * 0.3), d.x + d.w - 18 - gx), h = Math.min(cell * (0.5 + rnd() * 0.3), d.y + d.h - 18 - gy);
      if (w < 34 || h < 30) continue;
      const x = gx + rnd() * (cell - w) * 0.5, y = gy + rnd() * (cell - h) * 0.5;
      if (roadHit(x, y, w, h) || blocked(x, y, w, h)) continue;
      const r = rnd();
      const style = tall ? (r < 0.55 ? 'glass' : r < 0.85 ? 'office' : 'resi') : mid ? (r < 0.6 ? 'resi' : r < 0.8 ? 'office' : 'shop') : (r < 0.6 ? 'shop' : 'resi');
      const height = style === 'glass' ? 140 + rnd() * 260 : style === 'office' ? 70 + rnd() * 160 : style === 'resi' ? (mid || tall ? 90 + rnd() * 220 : 30 + rnd() * 40) : 22 + rnd() * 26;
      out.push({ id: 'f' + out.length, x, y, w, h, solid: true, filler: true, style, height: Math.round(height), color: tones[Math.floor(rnd() * tones.length)] });
    }
  }
  return out;
})();

// Hidden collectibles: Golden Chai cups scattered across the city.
const GOLDEN_CHAI = (() => {
  let seed = 4242;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const solid = (x, y) => BUILDINGS.concat(FILLERS).some((b) => b.solid && x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 14 && y < b.y + b.h + 14);
  const road = (x, y) => ROADS_V.some((r) => Math.abs(x - r.x) < r.w / 2 + 10) || ROADS_H.some((r) => Math.abs(y - r.y) < r.w / 2 + 10);
  const out = [];
  for (const d of DISTRICTS) {
    let placed = 0;
    for (let i = 0; i < 80 && placed < (d.farm ? 3 : 2); i++) {
      const x = d.x + 30 + rnd() * (d.w - 60), y = d.y + 30 + rnd() * (d.h - 60);
      if (solid(x, y) || road(x, y)) continue;
      out.push({ id: 'c' + out.length, x: Math.round(x), y: Math.round(y) });
      placed++;
    }
  }
  return out;
})();

// Street races start at Raftaar Motors. Checkpoints sit on roads.
const RACES = [
  { id: 'sohna', name: 'Sohna Sprint', fee: 300, prize: [2500, 1200, 600], pts: [[2110, 1100], [1650, 1100], [1650, 1850], [2400, 1850], [2400, 1100], [2110, 1100]] },
  { id: 'cyber', name: 'Cyber City Loop', fee: 500, prize: [4500, 2200, 1000], pts: [[2400, 1100], [2400, 350], [1650, 350], [900, 350], [900, 1100], [1650, 1100], [2110, 1100]] },
  { id: 'nh48', name: 'Expressway Dash', fee: 800, prize: [7000, 3500, 1500], pts: [[1650, 1100], [900, 1100], [200, 1100], [200, 1850], [200, 2450], [200, 1850], [900, 1850], [1650, 1850], [1650, 1100]] },
];

// Fictional stocks for the Paisa Trade app.
const STOCKS = [
  { sym: 'GGNI', name: 'GGN Infra', p: 420, vol: 0.03, drift: 0.0006, icon: '🏗️' },
  { sym: 'CDKR', name: 'CodeKraft Tech', p: 1180, vol: 0.025, drift: 0.0008, icon: '💻' },
  { sym: 'ZIPZ', name: 'ZipZap Delivery', p: 96, vol: 0.06, drift: 0.0005, icon: '📦' },
  { sym: 'RFTR', name: 'Raftaar Motors', p: 640, vol: 0.02, drift: 0.0004, icon: '🛵' },
  { sym: 'MOMO', name: 'Momo Mahal Foods', p: 210, vol: 0.035, drift: 0.0005, icon: '🥟' },
  { sym: 'ARVF', name: 'Aravalli Fintech', p: 1520, vol: 0.04, drift: 0.0007, icon: '🏦' },
];

const BILLBOARDS = [
  ['Chalo', 'Your ride in 2 minutes', '#14161c', '#ffd400'], ['Bhookh', 'Hungry? 30-min delivery', '#e23744', '#fff'],
  ['PayKaro', 'Pay anyone. Instantly.', '#5f259f', '#fff'], ['Reelz', 'Go viral today', '#dd2a7b', '#fff'],
  ['PhatPhat', 'Beat the jam', '#ffcc00', '#14161c'], ['Raftaar Motors', 'Zest 110 · ₹68,000', '#c0392b', '#fff'],
  ['ZipZap', 'Deliver & earn', '#f2c14e', '#14161c'], ['Skyline Towers', 'Live above it all', '#1f3b70', '#fff'],
];

DAILY_TASKS.push(
  { k: 'race', n: 1, t: 'Finish a street race' }, { k: 'chaicup', n: 2, t: 'Find 2 Golden Chai cups' },
  { k: 'drive', n: 2, t: 'Complete 2 passenger trips as a driver' }, { k: 'trade', n: 1, t: 'Make a trade on Paisa Trade' },
);
Object.assign(XP_FOR, { race: 50, chaicup: 20, drive: 30, trade: 5 });
