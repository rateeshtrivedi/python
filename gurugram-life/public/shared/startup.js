// Startup: build a product by vibe coding at a laptop, call investors, pitch in their boardroom, take (or haggle) a deal.
// Shared by the browser and the server: the server scores every typed answer and makes every offer, so money stays honest.
// Questions and the game's lines come in English and Hindi (written in Roman letters, like the rest of the game's Hindi);
// answers can be typed in English, Hinglish or Devanagari.

export const LAPTOP_PRICE = 15000;      // a laptop of your own: code at home for free (needs a room, not the footpath)
export const COWORK_FEE = 150;          // Hustle Hub hot desk, per sitting
export const SESSION_SECS = 40 * 60;    // a sitting lasts this long on the server
export const FEAT_GAP = 3;              // seconds between two features (stops scripted spam)
export const NEED_FEATS = 6;            // features (including both core ones) before you can launch
export const MAX_FEATS = 10;
export const PITCH_QS = 8;              // questions per meeting; the last one is always the ask

// ---------------------------------------------------------------- product ideas (Gurugram problems)
// core: the two features this product can't do without; base: what a v1 is worth to an investor (₹) before quality and pitch
export const IDEAS = [
  { id: 'park', en: 'Parking finder', hi: 'Parking dhoondo app', pitch: { en: 'find and book a parking spot at Cyber Hub, malls and offices', hi: 'Cyber Hub, malls aur offices mein parking dhoondo aur book karo' }, core: ['map', 'booking'], base: 2400000, words: ['parking', 'park', 'spot', 'slot', 'car', 'gaadi', 'पार्किंग'] },
  { id: 'paani', en: 'Waterlogging alerts', hi: 'Paani bharne ka alert', pitch: { en: 'live waterlogging alerts and safe routes in the monsoon', hi: 'baarish mein paani bharne ke live alert aur safe raasta' }, core: ['map', 'alerts'], base: 1800000, words: ['water', 'paani', 'flood', 'baarish', 'rain', 'monsoon', 'route', 'पानी', 'बारिश'] },
  { id: 'tiffin', en: 'Home-cooked tiffin', hi: 'Ghar ka khana tiffin', pitch: { en: 'home-cooked tiffins from local aunties delivered to offices and PGs', hi: 'local aunties ka ghar ka khana offices aur PG tak' }, core: ['menu', 'payments'], base: 2200000, words: ['tiffin', 'food', 'khana', 'meal', 'cook', 'aunty', 'टिफिन', 'खाना'] },
  { id: 'flat', en: 'Broker-free rentals', hi: 'Bina broker flat', pitch: { en: 'rent a flat or PG straight from owners, no broker fee', hi: 'owner se seedha flat ya PG, broker ki fees nahi' }, core: ['search', 'chat'], base: 2800000, words: ['flat', 'rent', 'pg', 'broker', 'owner', 'room', 'kiraya', 'फ्लैट', 'किराया'] },
  { id: 'auto', en: 'Shared autos from Metro', hi: 'Metro se shared auto', pitch: { en: 'book a shared auto from the Metro to your office gate', hi: 'Metro se office gate tak shared auto book karo' }, core: ['map', 'tracking'], base: 2000000, words: ['auto', 'metro', 'ride', 'share', 'commute', 'office', 'ऑटो', 'मेट्रो'] },
  { id: 'kirana', en: 'Kirana khata', hi: 'Kirana khata app', pitch: { en: 'digital khata, stock and UPI collection for kirana shops', hi: 'kirana dukaan ke liye digital khata, stock aur UPI' }, core: ['dashboard', 'payments'], base: 2600000, words: ['kirana', 'shop', 'dukaan', 'khata', 'stock', 'udhaar', 'किराना', 'दुकान'] },
  { id: 'fit', en: 'Gym and akhara booking', hi: 'Gym aur akhara booking', pitch: { en: 'book gyms, akharas and trainers by the day, no yearly lock-in', hi: 'gym, akhara aur trainer din ke hisaab se book karo' }, core: ['booking', 'reviews'], base: 1600000, words: ['gym', 'akhara', 'fitness', 'trainer', 'workout', 'dangal', 'जिम'] },
  { id: 'own', en: 'My own idea', hi: 'Meri apni idea', pitch: { en: 'your own idea', hi: 'apni idea' }, core: ['login', 'dashboard'], base: 2000000, words: [] },
];
export const idea = id => IDEAS.find(i => i.id === id) || IDEAS[IDEAS.length - 1];

// ---------------------------------------------------------------- what you can ask the AI to build
// keys: words in a prompt that ask for it (English, Hinglish, Devanagari); file + code: what streams onto the laptop
export const FEATURES = [
  { id: 'login', en: 'Login with OTP', hi: 'OTP se login', keys: ['login', 'log in', 'sign in', 'signup', 'sign up', 'otp', 'account', 'register', 'लॉगिन'], file: 'auth.js',
    code: ['import { sendOtp, verifyOtp } from "./sms";', '', 'export async function login(phone) {', '  const id = await sendOtp(phone);   // +91 only', '  return { id, expires: Date.now() + 120000 };', '}', 'export const verify = (id, code) => verifyOtp(id, code);'] },
  { id: 'payments', en: 'UPI payments', hi: 'UPI payment', keys: ['upi', 'payment', 'pay', 'paytm', 'gpay', 'phonepe', 'checkout', 'wallet', 'paise', 'पेमेंट', 'भुगतान'], file: 'pay.js',
    code: ['export function upiLink(amount, note) {', '  const q = new URLSearchParams({', '    pa: "merchant@upi", pn: APP_NAME,', '    am: amount.toFixed(2), cu: "INR", tn: note });', '  return "upi://pay?" + q;', '}'] },
  { id: 'map', en: 'Live map', hi: 'Live map', keys: ['map', 'location', 'gps', 'nearby', 'naksha', 'location', 'जगह', 'नक्शा', 'मैप'], file: 'Map.jsx',
    code: ['export default function LiveMap({ spots }) {', '  const me = useLocation();', '  return <MapView center={me ?? GURUGRAM} zoom={14}>', '    {spots.map(s => <Pin key={s.id} at={s} />)}', '  </MapView>;', '}'] },
  { id: 'booking', en: 'Booking and slots', hi: 'Booking aur slot', keys: ['book', 'booking', 'slot', 'reserve', 'reservation', 'appointment', 'बुकिंग'], file: 'book.js',
    code: ['export async function book(userId, slotId) {', '  const slot = await db.slots.get(slotId);', '  if (slot.taken) throw new Error("Slot gaya, doosra chuno");', '  await db.slots.update(slotId, { taken: userId });', '  return notify(userId, "Booked: " + slot.time);', '}'] },
  { id: 'alerts', en: 'Push alerts', hi: 'Push alert', keys: ['alert', 'notification', 'notify', 'push', 'reminder', 'sms', 'whatsapp', 'अलर्ट', 'सूचना'], file: 'alerts.js',
    code: ['export function watchArea(area, user) {', '  return feed.on(area, ev => {', '    if (ev.level >= user.minLevel)', '      push(user, `${ev.title} near ${area}`);', '  });', '}'] },
  { id: 'menu', en: 'Menu and cart', hi: 'Menu aur cart', keys: ['menu', 'cart', 'order', 'catalog', 'catalogue', 'items', 'list', 'मेनू', 'ऑर्डर'], file: 'Cart.jsx',
    code: ['export function Cart({ items }) {', '  const total = items.reduce((s, i) => s + i.price * i.qty, 0);', '  return <Sheet>', '    {items.map(i => <Row key={i.id} {...i} />)}', '    <Pay amount={total} />', '  </Sheet>;', '}'] },
  { id: 'search', en: 'Search and filters', hi: 'Search aur filter', keys: ['search', 'filter', 'find', 'dhoondo', 'khojo', 'sort', 'खोज', 'सर्च'], file: 'search.js',
    code: ['export function search(list, q, f) {', '  const t = q.trim().toLowerCase();', '  return list', '    .filter(x => x.title.toLowerCase().includes(t))', '    .filter(x => !f.maxRent || x.rent <= f.maxRent)', '    .sort((a, b) => b.score - a.score);', '}'] },
  { id: 'chat', en: 'In-app chat', hi: 'App mein chat', keys: ['chat', 'message', 'messaging', 'talk', 'baat', 'inbox', 'चैट', 'बात'], file: 'chat.js',
    code: ['const socket = new WebSocket(CHAT_URL);', 'export function send(to, text) {', '  socket.send(JSON.stringify({ to, text, at: Date.now() }));', '}', 'socket.onmessage = e => inbox.push(JSON.parse(e.data));'] },
  { id: 'tracking', en: 'Live tracking', hi: 'Live tracking', keys: ['track', 'tracking', 'live', 'eta', 'where is', 'kahan', 'ट्रैक'], file: 'track.js',
    code: ['export function trackRide(rideId, onMove) {', '  return db.rides.doc(rideId).onSnapshot(r => {', '    onMove({ at: r.pos, eta: etaMinutes(r.pos, r.drop) });', '  });', '}'] },
  { id: 'reviews', en: 'Ratings and reviews', hi: 'Rating aur review', keys: ['review', 'rating', 'ratings', 'stars', 'feedback', 'रेटिंग', 'रिव्यू'], file: 'reviews.js',
    code: ['export async function rate(placeId, user, stars, text) {', '  if (stars < 1 || stars > 5) throw new Error("1 se 5");', '  await db.reviews.add({ placeId, user, stars, text });', '  return recalcAverage(placeId);', '}'] },
  { id: 'dashboard', en: 'Owner dashboard', hi: 'Dashboard', keys: ['dashboard', 'admin', 'report', 'stats', 'analytics', 'graph', 'chart', 'hisaab', 'डैशबोर्ड', 'हिसाब'], file: 'Dashboard.jsx',
    code: ['export function Dashboard({ shop }) {', '  const { sales, dues } = useStats(shop.id);', '  return <Grid>', '    <Card title="Aaj ki sale" value={rupee(sales)} />', '    <Card title="Udhaar baaki" value={rupee(dues)} />', '  </Grid>;', '}'] },
  { id: 'hindi', en: 'Hindi language', hi: 'Hindi bhasha', keys: ['hindi', 'language', 'bhasha', 'translate', 'regional', 'हिंदी', 'भाषा'], file: 'i18n.js',
    code: ['export const strings = {', '  en: { book: "Book now", pay: "Pay" },', '  hi: { book: "Abhi book karo", pay: "Payment karo" },', '};', 'export const t = k => strings[lang()][k] ?? k;'] },
  { id: 'dark', en: 'Dark mode', hi: 'Dark mode', keys: ['dark', 'theme', 'night mode', 'colour', 'color', 'design', 'ui', 'sundar', 'डार्क'], file: 'theme.css',
    code: [':root { --bg: #ffffff; --ink: #1b1410; --brand: #f6c026; }', '@media (prefers-color-scheme: dark) {', '  :root { --bg: #14100c; --ink: #f4eadb; }', '}', 'body { background: var(--bg); color: var(--ink); }'] },
  { id: 'offline', en: 'Works offline', hi: 'Offline chalega', keys: ['offline', 'no internet', 'network', 'cache', 'slow internet', 'ऑफलाइन'], file: 'sw.js',
    code: ['self.addEventListener("fetch", e => {', '  e.respondWith(caches.match(e.request)', '    .then(hit => hit || fetch(e.request)));', '});'] },
];
export const feature = id => FEATURES.find(f => f.id === id);
const normTxt = s => ' ' + String(s || '').toLowerCase().replace(/[^\p{L}\p{N}%₹.\s]/gu, ' ').replace(/\s+/g, ' ') + ' ';
// which feature a typed prompt asks for (first match not yet built), or null
export function featureFor(prompt, built) {
  const t = normTxt(prompt); const have = new Set(built || []);
  for (const f of FEATURES) if (!have.has(f.id) && f.keys.some(k => t.includes(k.length <= 3 ? ' ' + k + ' ' : k))) return f;
  return null;
}
export const FIX_WORDS = ['fix', 'bug', 'error', 'crash', 'debug', 'theek', 'thik', 'sahi', 'solve', 'repair', 'ठीक', 'बग'];
export const isFix = p => { const t = normTxt(p); return FIX_WORDS.some(k => t.includes(k)); };

// product quality 0..100: both core features, how much is built, the extras that make it feel finished
export function quality(su) {
  const I = idea(su.idea), f = su.feats || []; const core = I.core.filter(c => f.includes(c)).length;
  const polish = ['hindi', 'dark', 'offline', 'reviews', 'alerts'].filter(x => f.includes(x)).length;
  return Math.min(100, Math.round(core * 20 + Math.min(f.length, 8) * 5 + polish * 4));
}
export const canLaunch = su => !!su && (su.feats || []).length >= NEED_FEATS && idea(su.idea).core.every(c => su.feats.includes(c));

// ---------------------------------------------------------------- investors (made-up firms)
// cheque: the most they put in; minQ: product quality they want before they meet; tough: how hard they mark answers
export const INVESTORS = [
  { id: 'sharma', name: 'Sharma Angels', who: 'Rakesh Sharma', office: 'Skyline Tower, Floor 21, Cyber City', cheque: 300000, minQ: 55, tough: 0.9, rounds: 1,
    line: { en: 'I back first-time founders from Gurugram.', hi: 'Main Gurugram ke naye founders pe paisa lagata hoon.' } },
  { id: 'bansal', name: 'Bansal Ventures', who: 'Neha Bansal', office: 'Skyline Tower, Floor 21, Cyber City', cheque: 1000000, minQ: 78, tough: 1.0, rounds: 1,
    line: { en: 'Show me numbers, not dreams.', hi: 'Sapne nahi, numbers dikhao.' } },
  { id: 'skyline', name: 'Skyline Capital', who: 'Vikram Chaudhary', office: 'Skyline Tower, Floor 21, Cyber City', cheque: 2500000, minQ: 85, tough: 1.15, rounds: 2,
    line: { en: 'We write big cheques for founders who have done it before.', hi: 'Jo pehle kar chuke hain, unhe bada cheque dete hain.' } },
];
export const investor = id => INVESTORS.find(v => v.id === id);

// ---------------------------------------------------------------- the question bank
// Word groups an answer can hit (English, Hinglish, Devanagari). A question lists the groups a good answer touches.
const W = {
  problem: ['problem', 'pain', 'issue', 'dikkat', 'pareshani', 'pareshan', 'mushkil', 'takleef', 'samasya', 'struggle', 'waste', 'समस्या', 'परेशानी', 'दिक्कत'],
  solve: ['solve', 'solution', 'fix', 'help', 'easy', 'asaan', 'simple', 'hal', 'save', 'bachat', 'faster', 'jaldi', 'आसान', 'हल', 'मदद'],
  users: ['user', 'users', 'customer', 'customers', 'client', 'log', 'people', 'grahak', 'employee', 'student', 'shop', 'family', 'ग्राहक', 'लोग', 'यूज़र'],
  market: ['market', 'size', 'crore', 'lakh', 'million', 'billion', 'tam', 'city', 'cities', 'india', 'gurugram', 'gurgaon', 'ncr', 'delhi', 'बाजार', 'करोड़', 'लाख'],
  money: ['revenue', 'income', 'kamai', 'earn', 'paisa', 'paise', 'price', 'pricing', 'fee', 'commission', 'subscription', 'charge', 'margin', 'profit', 'munafa', '₹', 'rs', 'rupee', 'rupees', 'कमाई', 'पैसा', 'मुनाफा', 'कीमत'],
  compete: ['competitor', 'competition', 'rival', 'other apps', 'already', 'alternative', 'different', 'better', 'unique', 'alag', 'behtar', 'mukabla', 'प्रतियोगी', 'अलग', 'बेहतर'],
  growth: ['grow', 'growth', 'scale', 'expand', 'marketing', 'ads', 'referral', 'word of mouth', 'instagram', 'whatsapp', 'social', 'partner', 'partnership', 'badhana', 'failana', 'प्रचार', 'बढ़'],
  team: ['team', 'cofounder', 'co founder', 'founder', 'developer', 'engineer', 'experience', 'tajurba', 'hire', 'friend', 'dost', 'टीम', 'अनुभव'],
  traction: ['users', 'downloads', 'signups', 'orders', 'pilot', 'beta', 'launched', 'customers', 'waitlist', 'week', 'month', 'mahine', 'hafte', 'daily', 'retention', 'ग्राहक', 'ऑर्डर'],
  risk: ['risk', 'danger', 'fail', 'challenge', 'khatra', 'chunauti', 'competition', 'regulation', 'law', 'police', 'monsoon', 'जोखिम', 'चुनौती', 'खतरा'],
  use: ['hire', 'team', 'marketing', 'servers', 'tech', 'product', 'expand', 'city', 'salary', 'office', 'growth', 'kharch', 'लगाऊंगा', 'खर्च'],
  plan: ['plan', 'next', 'month', 'year', 'saal', 'mahine', 'goal', 'target', 'milestone', 'roadmap', 'agle', 'योजना', 'लक्ष्य'],
  tech: ['app', 'website', 'ai', 'data', 'algorithm', 'tech', 'technology', 'cloud', 'android', 'iphone', 'upi', 'map', 'gps', 'tech', 'ऐप', 'टेक'],
  why: ['because', 'kyunki', 'experience', 'myself', 'khud', 'faced', 'jhela', 'local', 'know', 'jaanta', 'passion', 'understand', 'क्योंकि', 'खुद'],
  cost: ['cost', 'kharcha', 'kharch', 'spend', 'burn', 'salary', 'server', 'cac', 'acquisition', 'lagat', 'खर्च', 'लागत'],
};
// q: id, cat, en, hi, w: word groups, n: wants a number in the answer
const Q = (id, cat, en, hi, w, n) => ({ id, cat, en, hi, w, n: !!n });
export const QUESTIONS = [
  // opening: what is it
  Q(1, 'intro', 'Tell us what your product does in two lines.', 'Do line mein batao, tumhara product kya karta hai?', ['solve', 'users', 'tech']),
  Q(2, 'intro', 'Who is this for, and why would they use it every week?', 'Yeh kiske liye hai, aur woh har hafte ise kyun use karenge?', ['users', 'solve', 'why']),
  Q(3, 'intro', 'Explain your product to my mother. What does it do for her?', 'Meri mummy ko samjhao, yeh product unke liye kya karega?', ['solve', 'users']),
  // the problem
  Q(4, 'problem', 'What exact problem are you solving?', 'Exactly kaunsi problem solve kar rahe ho?', ['problem', 'users', 'solve']),
  Q(5, 'problem', 'How do people deal with this problem today, without you?', 'Aaj tumhare bina log is problem ka kya karte hain?', ['problem', 'compete', 'users']),
  Q(6, 'problem', 'How painful is this problem? Would someone pay to make it go away?', 'Yeh problem kitni badi hai? Kya koi ise khatam karne ke liye paise dega?', ['problem', 'money', 'users']),
  Q(7, 'problem', 'Why does this problem exist in Gurugram specifically?', 'Yeh problem khaas Gurugram mein kyun hai?', ['problem', 'market', 'why']),
  // the product
  Q(8, 'product', 'Walk me through how a new user uses the app, step by step.', 'Ek naya user app kaise use karta hai, step by step batao.', ['users', 'tech', 'solve']),
  Q(9, 'product', 'Which feature do users love the most, and why?', 'Users ko kaunsa feature sabse zyada pasand hai, aur kyun?', ['users', 'tech', 'why']),
  Q(10, 'product', 'What did you build first, and what did you leave out on purpose?', 'Sabse pehle kya banaya, aur jaan-boojh ke kya chhoda?', ['tech', 'plan']),
  Q(11, 'product', 'What happens if your app goes down for a day?', 'Agar tumhara app ek din band ho jaye to kya hoga?', ['risk', 'tech', 'users']),
  Q(12, 'product', 'How is your technology hard to copy?', 'Tumhari technology ko copy karna mushkil kyun hai?', ['tech', 'compete']),
  // the market
  Q(13, 'market', 'How big is this market? Give me a number.', 'Yeh market kitna bada hai? Number batao.', ['market', 'users'], true),
  Q(14, 'market', 'How many people in Gurugram have this problem?', 'Gurugram mein kitne logon ko yeh problem hai?', ['market', 'users'], true),
  Q(15, 'market', 'After Gurugram, which cities will you go to, and why?', 'Gurugram ke baad kaunse shehar jaoge, aur kyun?', ['market', 'growth', 'plan']),
  Q(16, 'market', 'Is this a big business or a small side business? Convince me.', 'Yeh bada business hai ya chhota side business? Mujhe convince karo.', ['market', 'money', 'growth']),
  Q(17, 'market', 'Why is now the right time for this product?', 'Yeh product abhi hi kyun? Sahi time kyun hai?', ['market', 'tech', 'why']),
  // customers
  Q(18, 'customers', 'Who is your ideal customer? Describe one person.', 'Tumhara perfect customer kaun hai? Ek insaan describe karo.', ['users', 'why']),
  Q(19, 'customers', 'How will you get your first 1,000 customers?', 'Pehle 1,000 customers kaise laoge?', ['growth', 'users'], true),
  Q(20, 'customers', 'How much does it cost you to get one customer?', 'Ek customer laane mein kitna kharcha aata hai?', ['cost', 'growth', 'money'], true),
  Q(21, 'customers', 'Why would a customer come back after the first use?', 'Pehli baar ke baad customer wapas kyun aayega?', ['users', 'solve', 'traction']),
  Q(22, 'customers', 'Have you spoken to real customers? What did they tell you?', 'Kya asli customers se baat ki? Unhone kya bola?', ['users', 'traction', 'problem']),
  // competition
  Q(23, 'compete', 'Who are your competitors?', 'Tumhare competitors kaun hain?', ['compete', 'market']),
  Q(24, 'compete', 'A big company could build this in a month. Why won\'t they crush you?', 'Badi company ise ek mahine mein bana sakti hai. Tumhe kyun nahi kuchlegi?', ['compete', 'why', 'users']),
  Q(25, 'compete', 'What do you do better than anyone else?', 'Tum kya sabse behtar karte ho?', ['compete', 'solve']),
  Q(26, 'compete', 'If I gave this money to your competitor instead, what would happen?', 'Agar yeh paisa tumhare competitor ko de doon to kya hoga?', ['compete', 'why', 'team']),
  // money
  Q(27, 'money', 'How do you make money?', 'Paisa kaise kamaoge?', ['money', 'users']),
  Q(28, 'money', 'What will you charge, and why that price?', 'Kitna charge karoge, aur yahi price kyun?', ['money', 'users', 'why'], true),
  Q(29, 'money', 'What is your revenue today?', 'Aaj tumhari revenue kitni hai?', ['money', 'traction'], true),
  Q(30, 'money', 'How much do you spend every month to run this?', 'Ise chalane mein har mahine kitna kharcha hota hai?', ['cost', 'money'], true),
  Q(31, 'money', 'When will you make a profit?', 'Profit kab tak aayega?', ['money', 'plan'], true),
  Q(32, 'money', 'What is your margin on each order or customer?', 'Har order ya customer pe kitna margin hai?', ['money', 'cost'], true),
  // traction
  Q(33, 'traction', 'How many users do you have right now?', 'Abhi kitne users hain?', ['traction', 'users'], true),
  Q(34, 'traction', 'What has grown the most in the last month?', 'Pichhle mahine sabse zyada kya badha?', ['traction', 'growth'], true),
  Q(35, 'traction', 'How many users come back every week?', 'Har hafte kitne users wapas aate hain?', ['traction', 'users'], true),
  // team
  Q(36, 'team', 'Why are you the right person to build this?', 'Yeh banane ke liye tum hi sahi insaan kyun ho?', ['why', 'team']),
  Q(37, 'team', 'Who is on your team, and who do you need to hire next?', 'Team mein kaun hai, aur agla kise hire karoge?', ['team', 'plan']),
  Q(38, 'team', 'Tell us about a time you failed, and what you learned.', 'Kabhi fail hue ho? Usse kya seekha?', ['why', 'team', 'risk']),
  Q(39, 'team', 'Are you working on this full-time?', 'Kya tum ispe full-time kaam kar rahe ho?', ['team', 'why', 'plan']),
  // growth and plan
  Q(40, 'growth', 'Where will this company be in three years?', 'Teen saal mein yeh company kahan hogi?', ['plan', 'growth', 'market'], true),
  Q(41, 'growth', 'What is your marketing plan with no big budget?', 'Bina bade budget ke marketing kaise karoge?', ['growth', 'users']),
  Q(42, 'growth', 'Which partnership would change everything for you?', 'Kaunsi partnership tumhare liye sab kuch badal degi?', ['growth', 'market']),
  Q(43, 'growth', 'What is the one number you check every morning?', 'Woh ek number kaunsa hai jo tum har subah dekhte ho?', ['traction', 'money', 'users']),
  // risk
  Q(44, 'risk', 'What is the biggest risk to this business?', 'Is business ka sabse bada risk kya hai?', ['risk', 'plan']),
  Q(45, 'risk', 'What will you do if this fails in six months?', 'Agar chhe mahine mein fail ho gaya to kya karoge?', ['risk', 'plan', 'why']),
  Q(46, 'risk', 'Is there any law or permission that could stop you?', 'Koi kanoon ya permission jo tumhe rok sake?', ['risk', 'market']),
  // use of funds
  Q(47, 'funds', 'If we invest, how exactly will you spend the money?', 'Agar hum paisa lagayein to exactly kahan kharch karoge?', ['use', 'plan'], true),
  Q(48, 'funds', 'How long will this money last you?', 'Yeh paisa kitne mahine chalega?', ['cost', 'plan'], true),
  // the ask
  Q(49, 'ask', 'How much money are you asking for, and for how much equity?', 'Kitna paisa maang rahe ho, aur kitne percent equity ke badle?', ['money'], true),
  Q(50, 'ask', 'What is your company worth today, and how did you get that number?', 'Aaj tumhari company ki value kitni hai, aur yeh number kaise nikala?', ['money', 'market', 'why'], true),
];
export const question = id => QUESTIONS.find(q => q.id === id);
export const ASK_Q = 49;

// which questions a meeting asks: one opener, six from different topics (tougher investors lean on money and numbers), the ask
export function pickQuestions(invId, rnd = Math.random) {
  const v = investor(invId) || INVESTORS[0]; const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const intro = shuffle(QUESTIONS.filter(q => q.cat === 'intro'))[0];
  const cats = shuffle(['problem', 'product', 'market', 'customers', 'compete', 'money', 'traction', 'team', 'growth', 'risk', 'funds']);
  if (v.tough >= 1) { cats.splice(cats.indexOf('money'), 1); cats.unshift('money'); }
  const mid = cats.slice(0, PITCH_QS - 2).map(c => shuffle(QUESTIONS.filter(q => q.cat === c))[0]);
  return [intro, ...mid, question(ASK_Q)].map(q => q.id);
}

// ---------------------------------------------------------------- marking a typed answer (0..10)
const DUNNO = ['dont know', 'don t know', 'no idea', 'not sure', 'pata nahi', 'nahi pata', 'maloom nahi', 'पता नहीं', 'मालूम नहीं', 'idk', 'skip', 'pass'];
const NUMRE = /(\d|₹|%|\blakh|\bcrore|\bthousand|\bhazaar|\bhazar|\bmillion|\bbillion|\bpercent|\bk\b|लाख|करोड़|हज़ार|हजार|प्रतिशत)/i;
export function scoreAnswer(q, text, su, prev) {
  const t = normTxt(text); const words = t.trim() ? t.trim().split(' ').length : 0; const why = [];
  if (words < 3) return { s: words ? 1 : 0, why: ['short'] };
  if (DUNNO.some(d => t.includes(' ' + d + ' ') || t.includes(d))) return { s: 1, why: ['dunno'] };
  if (prev && prev.some(p => normTxt(p) === t)) return { s: 1, why: ['repeat'] };
  if (q.id === ASK_Q) { const a = parseAsk(text); const s = (a.amount && a.equity ? 8 : a.amount || a.equity ? 4.5 : 1.5) + (words >= 8 ? 1 : 0) + (W.use.some(k => t.includes(k)) ? 1 : 0); return { s: Math.min(10, s), why: a.amount && a.equity ? ['clear-ask'] : ['vague-ask'] }; }
  let s = Math.min(3, words / 6);
  const hits = (q.w || []).filter(g => W[g] && W[g].some(k => t.includes(k.length <= 3 ? ' ' + k + ' ' : k))).length;
  s += hits >= 2 ? 4.5 : hits === 1 ? 2.5 : 0; if (hits) why.push('on-topic'); else why.push('off-topic');
  if (q.n) { if (NUMRE.test(text)) { s += 2; why.push('number'); } else { s -= 1; why.push('no-number'); } } else s += 0.5;
  const I = su ? idea(su.idea) : null; const own = [...(I ? I.words : []), ...(su && su.name ? [su.name.toLowerCase()] : [])];
  if (own.some(k => k && t.includes(k))) { s += 1; why.push('specific'); }
  if (words > 120) s -= 0.5; // rambling
  return { s: Math.max(0, Math.min(10, Math.round(s * 10) / 10)), why };
}

// the ask, read out of free text: "10 lakh for 10%", "₹5,00,000 for 8 percent", "2 crore valuation", "5 लाख 10 प्रतिशत"
export function parseAsk(text) {
  const t = String(text || '').toLowerCase().replace(/,/g, '').replace(/लाख/g, ' lakh').replace(/करोड़/g, ' crore').replace(/हज़ार|हजार/g, ' thousand').replace(/प्रतिशत/g, '%');
  let equity = null, amount = null, valuation = null;
  const eq = t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|pc\b|per cent|pratishat)/); if (eq) equity = parseFloat(eq[1]);
  const unit = u => /crore|cr\b/.test(u) ? 1e7 : /lakh|lac|lakhs/.test(u) ? 1e5 : /thousand|hazaar|hazar|k\b/.test(u) ? 1e3 : /million|mn/.test(u) ? 1e6 : 1;
  const nums = [...t.matchAll(/(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(crore|cr\b|lakhs?|lac|thousand|hazaa?r|k\b|million|mn)?/g)].map(m => ({ v: parseFloat(m[1]) * unit(m[2] || ''), at: m.index, hasUnit: !!m[2] || /₹|rs/.test(m[0]), raw: m[0] }));
  const isEq = n => eq && Math.abs(n.at - eq.index) < 2;
  const money = nums.filter(n => !isEq(n) && (n.hasUnit || n.v >= 1000));
  for (const n of money) { const after = t.slice(n.at + n.raw.length, n.at + n.raw.length + 14), before = t.slice(Math.max(0, n.at - 16), n.at);
    if (/^\s*(valuation|value|worth|valued|keemat|मूल्य)/.test(after) || /(valuation of|valued at|worth|valuation)\s*(is\s*|hai\s*)?$/.test(before)) { if (valuation == null) valuation = n.v; } else if (amount == null) amount = n.v; }
  if (amount == null && valuation != null && equity) amount = valuation * equity / 100;
  if (equity == null && amount && valuation) equity = Math.round(amount / valuation * 1000) / 10;
  if (valuation == null && amount && equity) valuation = amount / (equity / 100);
  return { amount: amount ? Math.round(amount) : null, equity, valuation: valuation ? Math.round(valuation) : null };
}

// ---------------------------------------------------------------- the decision
// su: the player's startup; scores: marks 0..10; askText: the answer to the ask. Returns { kind: 'deal'|'counter'|'pass', amount, equity, why }
export function decide(invId, su, scores, askText) {
  const v = investor(invId) || INVESTORS[0]; const I = idea(su.idea); const q = quality(su);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0; const adj = avg / v.tough;
  const round = (su.funded || 0); const worth = I.base * (1 + 0.6 * round) * (0.4 + q / 100) * (0.25 + Math.min(10, adj) / 10 * 1.25); // what they think it's worth
  const r1000 = x => Math.round(x / 1000) * 1000;
  if (adj < 4.2) return { kind: 'pass', why: 'weak', avg, worth: r1000(worth) };
  if (q < v.minQ) return { kind: 'pass', why: 'product', avg, worth: r1000(worth) };
  const ask = parseAsk(askText);
  let amount, equity;
  if (!ask.amount || !ask.equity) { // no clear ask: they name their terms
    amount = Math.min(v.cheque, worth * 0.12); equity = amount / worth * 100;
    return { kind: 'counter', why: 'noask', amount: r1000(amount), equity: Math.round(equity * 10) / 10, avg, worth: r1000(worth), ask };
  }
  amount = Math.min(ask.amount, v.cheque); const implied = ask.amount / (ask.equity / 100);
  if (implied <= worth * 1.15) { equity = ask.amount > v.cheque ? amount / implied * 100 : ask.equity; return { kind: 'deal', why: 'fair', amount: r1000(amount), equity: Math.round(equity * 10) / 10, avg, worth: r1000(worth), ask }; }
  if (implied > worth * 3 && adj < 6.5) return { kind: 'pass', why: 'greedy', avg, worth: r1000(worth), ask };
  equity = amount / worth * 100; if (equity > 35) { equity = 35; amount = worth * 0.35; amount = Math.min(amount, v.cheque); }
  return { kind: 'counter', why: 'valuation', amount: r1000(amount), equity: Math.round(equity * 10) / 10, avg, worth: r1000(worth), ask };
}
// the founder's reply to a counter: they meet you if you're within 15% of their equity, otherwise it's their final offer
export function haggle(offer, wantEquity) {
  const e = Number(wantEquity); if (!(e > 0 && e < 100)) return { kind: 'bad' };
  if (e >= offer.equity) return { kind: 'deal', amount: offer.amount, equity: offer.equity };
  if (e >= offer.equity * 0.85) return { kind: 'deal', amount: offer.amount, equity: Math.round(e * 10) / 10 };
  return { kind: 'final', amount: offer.amount, equity: offer.equity };
}

// ---------------------------------------------------------------- what the investors say (English / Hindi)
export const LINES = {
  react: { // after each answer, by mark
    hi: [[8, ['Bahut badhiya. Yeh clear tha.', 'Haan, yeh number mujhe pasand aaya.', 'Achha jawab. Aage badhte hain.']], [5, ['Theek hai, par thoda aur detail chahiye tha.', 'Hmm. Chalo, aage.', 'Samajh gaya, lekin convince nahi hua.']], [0, ['Yeh jawab nahi hua.', 'Tayyari karke aana chahiye tha.', 'Mujhe samajh nahi aaya tum kya keh rahe ho.']]],
    en: [[8, ['Very good. That was clear.', 'Yes, I like that number.', 'Good answer. Let\'s move on.']], [5, ['Okay, but I wanted more detail.', 'Hmm. Fine, next.', 'I follow, but I\'m not convinced.']], [0, ['That isn\'t an answer.', 'You should have come prepared.', 'I don\'t understand what you\'re saying.']]],
  },
  pass: {
    weak: { en: 'Thank you for coming. Your answers weren\'t strong enough for us. Work on your pitch and come back.', hi: 'Aane ke liye shukriya. Tumhare jawab abhi kamzor the. Pitch pe kaam karo aur dobara aao.' },
    product: { en: 'The product needs more work before we can invest. Build more and come back.', hi: 'Product pe abhi aur kaam chahiye. Aur banao, phir aana.' },
    greedy: { en: 'Your valuation is far too high for where you are. We\'ll pass.', hi: 'Tumhari valuation abhi bahut zyada hai. Hum is baar nahi karenge.' },
  },
  deal: { en: 'We like it. We\'re in: {amount} for {equity}%. Welcome aboard!', hi: 'Humein pasand aaya. Deal pakki: {amount} mein {equity}%. Welcome!' },
  counter: { en: 'We like you, but not at that price. We\'ll put in {amount} for {equity}%.', hi: 'Tum pasand aaye, par is price pe nahi. Hum {amount} denge, {equity}% ke badle.' },
  noask: { en: 'You never told us your ask. Here\'s our offer: {amount} for {equity}%.', hi: 'Tumne apni demand batayi hi nahi. Humara offer: {amount} mein {equity}%.' },
  final: { en: 'That\'s our final offer: {amount} for {equity}%. Take it or leave it.', hi: 'Yeh humara aakhri offer hai: {amount} mein {equity}%. Lena hai to lo.' },
  call: {
    nobuild: { en: 'Build a product first, then call me.', hi: 'Pehle product banao, phir phone karna.' },
    weak: { en: 'I looked at your app. It needs more features before we meet.', hi: 'App dekha. Milne se pehle isme aur features chahiye.' },
    busy: { en: 'You already called today. Try again tomorrow.', hi: 'Aaj phone kar chuke ho. Kal try karna.' },
    funded: { en: 'This product already has investors. Build your next one!', hi: 'Is product mein paisa lag chuka hai. Agla product banao!' },
    later: { en: 'We only meet founders who have raised before. Come back after your first round.', hi: 'Hum unse milte hain jo pehle funding le chuke hain. Pehla round karke aana.' },
    yes: { en: 'Interesting! Come to my office today: {office}. Ask for {who}.', hi: 'Interesting! Aaj hi office aa jao: {office}. {who} ko poochna.' },
  },
};
export const say = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars && vars[k] != null ? vars[k] : '');
