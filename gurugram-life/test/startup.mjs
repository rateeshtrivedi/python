// Startup feature: the question bank, typed-answer marking, reading the ask, investor decisions, and the whole server
// flow (laptop, home vs Hustle Hub co-working fee, vibe-coded features, launch, phone calls, the pitch, haggling, the money).
import { createWorld } from '../public/shared/world.js';
import * as S from '../public/shared/startup.js';
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew; const tick = (s = 1) => { skew += s * 1000; };

// ---- the bank
check(S.QUESTIONS.length === 50 && new Set(S.QUESTIONS.map(q => q.id)).size === 50, '50 questions with unique ids');
check(S.QUESTIONS.every(q => q.en && q.hi && q.en !== q.hi && q.w.length), 'every question has English and Hindi text and marking words');
check(S.QUESTIONS.every(q => !/\b(a\)|b\)|option)/i.test(q.en)), 'questions are open (typed answers, no options)');
const qs = S.pickQuestions('bansal'); check(qs.length === S.PITCH_QS && qs[qs.length - 1] === S.ASK_Q && new Set(qs).size === qs.length, 'a meeting asks 8 different questions and ends with the ask');
check(S.question(qs[0]).cat === 'intro', 'the first question is an opener');

// ---- marking
const su = { idea: 'park', name: 'ParkKaro', feats: ['map', 'booking', 'login', 'payments', 'reviews', 'dark', 'hindi'], funded: 0 };
const mk = (id, a, prev) => S.scoreAnswer(S.question(id), a, su, prev).s;
check(mk(4, 'People waste 30 minutes finding parking at Cyber Hub every day, it is a real problem for office users and we solve it with live slots') >= 8, 'a specific, on-topic answer scores high');
check(mk(13, 'pata nahi') <= 1 && mk(13, "I don't know") <= 1, '"don\'t know" in English or Hindi scores 1');
check(mk(13, 'ok') <= 1, 'a one-word answer scores almost nothing');
check(mk(13, 'Gurugram mein 25 lakh gaadiyan hain, NCR mein parking 500 crore ka market hai') > mk(13, 'Gurugram mein bahut saari gaadiyan hain aur market bada hai'), 'a market answer with a number beats one without');
check(mk(4, 'लोग पार्किंग ढूंढने में बहुत परेशान होते हैं, हमारा ऐप यह समस्या हल करता है') >= 6, 'Devanagari answers are marked too');
const same = 'Our app helps users find parking near offices easily'; check(mk(9, same, [same]) <= 1, 'repeating an earlier answer word for word scores 1');
check(mk(49, '10 lakh for 10% to hire developers and marketing') >= 9 && mk(49, 'give me money') < 3, 'the ask scores on a clear amount and equity');

// ---- reading the ask
const ask = a => S.parseAsk(a);
check(ask('10 lakh for 10%').amount === 1000000 && ask('10 lakh for 10%').equity === 10, '"10 lakh for 10%"');
check(ask('₹5,00,000 for 8 percent').amount === 500000 && ask('₹5,00,000 for 8 percent').equity === 8, '"₹5,00,000 for 8 percent"');
check(ask('5 लाख 10 प्रतिशत').amount === 500000 && ask('5 लाख 10 प्रतिशत').equity === 10, '"5 लाख 10 प्रतिशत" (Devanagari)');
check(ask('I want 2 crore valuation and 5 lakh').equity === 2.5, 'valuation + amount gives the equity');
check(ask('valued at 50 lakh, asking 5 lakh').equity === 10, '"valued at 50 lakh, asking 5 lakh"');

// ---- decisions
const good = [8, 7, 8, 7, 8, 7, 8, 9], bad = [2, 3, 2, 1, 3, 2, 2, 1];
const d1 = S.decide('sharma', su, good, '3 lakh for 10%'); check(d1.kind === 'deal' && d1.amount === 300000 && d1.equity === 10, 'a strong pitch with a fair ask gets the deal as asked');
const d2 = S.decide('sharma', su, good, '3 lakh for 1%'); check(d2.kind === 'counter' && d2.equity > 1 && d2.amount <= 300000, 'a sky-high valuation gets a counter for more equity');
check(S.decide('sharma', su, bad, '3 lakh for 10%').kind === 'pass', 'a weak pitch is a pass');
check(S.decide('sharma', su, good, 'give me money').why === 'noask', 'no clear ask: the investor names the terms');
check(S.decide('bansal', { ...su, feats: ['map', 'booking', 'login', 'search', 'chat', 'menu'] }, good, '5 lakh for 10%').why === 'product', 'a thin product falls short of a tougher investor');
check(S.decide('bansal', su, good, '50 lakh for 10%').amount <= S.investor('bansal').cheque, 'no investor goes over their cheque size');
check(S.haggle({ amount: 300000, equity: 12 }, 11).kind === 'deal' && S.haggle({ amount: 300000, equity: 12 }, 5).kind === 'final', 'haggling: close counters are met, greedy ones get a final offer');

// ---- vibe coding
check(S.featureFor('add UPI payments please', []).id === 'payments' && S.featureFor('mujhe login chahiye', []).id === 'login' && !S.featureFor('hello there', []), 'prompts map to features (English and Hinglish), nonsense maps to none');
check(S.featureFor('add a map', ['map']) === null || S.featureFor('add a map', ['map']).id !== 'map', 'an already-built feature is not built twice');
check(S.isFix('please fix this bug') && S.isFix('error theek karo') && !S.isFix('add chat'), 'fix prompts are recognised');

// ---- the server flow
let n = 0; const rid = k => (++n).toString(36).padStart(k, 'x'); let saved = null; const W = createWorld({ rid, load: () => saved, save: j => { saved = JSON.parse(j); } });
function join() {
  const inbox = []; const c = W.connect(m => inbox.push(m), () => {}, { ip: '8.8.8.' + (++n) }); c.message({ t: 'hello', name: 'Founder', color: 1 });
  let r = 0; const req = (t, d) => { tick(0.5); const id = ++r; c.message({ t, rid: id, ...d }); return inbox.filter(m => m.t === 'reply' && m.rid === id).pop(); };
  return { c, inbox, req, send: (t, d) => c.message({ t, ...d }), prof: () => inbox.filter(m => m.t === 'profile').pop()?.p };
}
const at = (pl, inside) => pl.send('st', { x: 0, z: 0, r: 0, a: 0, v: null, in: inside, hp: 100 });
const A = join(); at(A, null);
const su0 = A.req('su', { op: 'get' }); check(su0.ok && !su0.laptop && su0.su.feats.length === 0, 'a new player has no laptop and no product');
check(!A.req('su', { op: 'sit' }).ok, 'cannot sit to code before choosing an idea');
check(A.req('su', { op: 'idea', idea: 'park', name: 'ParkKaro' }).ok, 'choose an idea and name the product');
at(A, 'home'); check(/Laptop/.test(A.req('su', { op: 'sit' }).error || ''), 'at home without a laptop: told to buy one or go to co-working');
at(A, 'cowork'); check(/chahiye/.test(A.req('su', { op: 'sit' }).error || ''), 'co-working with no money: the fee is needed');
W.__test = true; const prof = () => A.prof() || {}; A.req('earn', { reason: 'coldopen' }); // ₹1,000 to work with
const m0 = (A.req('su', { op: 'get' })).money; const s1 = A.req('su', { op: 'sit' }); check(s1.ok && s1.money === m0 - S.COWORK_FEE, 'Hustle Hub hot desk charges ' + S.COWORK_FEE);
at(A, null); check(!A.req('su', { op: 'sit' }).ok, 'cannot sit down to code out on the street');
check(!A.req('su', { op: 'feat', f: 'teleport' }).ok, 'unknown features are refused');
let fr = A.req('su', { op: 'feat', f: 'map' }); check(fr.ok && fr.su.feats.includes('map'), 'a feature is built during the sitting');
check(!A.req('su', { op: 'feat', f: 'booking' }).ok, 'features come no faster than one every few seconds');
for (const f of ['booking', 'login', 'payments', 'reviews']) { tick(S.FEAT_GAP); A.req('su', { op: 'feat', f }); }
check(!A.req('su', { op: 'launch' }).ok, 'cannot launch with fewer than ' + S.NEED_FEATS + ' features');
for (const f of ['dark', 'hindi']) { tick(S.FEAT_GAP); A.req('su', { op: 'feat', f }); }
const ln = A.req('su', { op: 'launch' }); check(ln.ok && ln.su.launched && ln.su.q >= 80, 'launch with both core features: quality ' + ln.su.q);
tick(S.FEAT_GAP); check(!A.req('su', { op: 'feat', f: 'chat' }).ok, 'no features after launch');
const cs = A.req('su', { op: 'call', inv: 'skyline' }); check(cs.call.key === 'later', 'the big fund only meets founders who have raised before');
const c1 = A.req('su', { op: 'call', inv: 'sharma' }); check(c1.call.key === 'yes' && c1.su.meet.inv === 'sharma', 'the angel invites you to the office');
check(A.req('su', { op: 'call', inv: 'sharma' }).call.key === 'busy', 'one call per investor per day');
check(!A.req('su', { op: 'pitchstart' }).ok, 'the pitch only starts in the investor office');
at(A, 'vc'); const ps = A.req('su', { op: 'pitchstart' }); check(ps.ok && ps.qs.length === 8 && ps.qs[7] === S.ASK_Q, 'in the boardroom: 8 questions, the ask last');
const ANS = { intro: 'ParkKaro is an app that helps office users in Gurugram find and book a parking slot at Cyber Hub, malls and offices so they save time and stress', problem: 'The problem is people waste 30 minutes daily looking for parking, users are pareshan and late, we solve it with live slots', product: 'A user opens the app, sees live parking slots on the map, books one with UPI and drives straight there, the booking feature is what users love', market: 'Gurugram has 25 lakh cars and parking in NCR is a 500 crore market, after Gurugram we will expand to Noida and Bangalore', customers: 'Our first 1000 customers come from office partnerships and WhatsApp groups, it costs us 40 rupees per customer and they come back daily', compete: 'Competitors are generic map apps, we are different because we have live slot booking with building owners, which is better and unique', money: 'We charge a 10% commission on each booking, average 60 rupees, our margin is 70% and revenue is 2 lakh per month', traction: 'We have 800 users and 300 come back every week, orders grew 40% last month', team: 'I am the founder, I faced this problem myself every day, my team has two developers and I will hire a marketing lead next', growth: 'In 3 years we will be in 10 cities with 10 lakh users, marketing through referral, Instagram and office partnerships', risk: 'The biggest risk is competition and building owners saying no, our plan is long contracts and a backup of street parking', funds: 'We will spend the money on hiring two engineers, marketing and servers, it will last 12 months' };
const answers = ps.qs.map(id => { const q = S.question(id); return id === S.ASK_Q ? '3 lakh for 10% to hire engineers and marketing' : id === 50 ? 'We are worth 30 lakh based on our revenue' : ANS[q.cat]; });
check(!A.req('su', { op: 'pitch', a: answers }).ok, 'answers sent in seconds are refused (no copy-paste speedruns)');
tick(60); const before = (A.req('su', { op: 'get' })).money; const pr = A.req('su', { op: 'pitch', a: answers });
check(pr.ok && pr.marks.length === 8 && pr.marks.every(x => x.s >= 5), 'every typed answer is marked by the server (avg ' + (pr.marks.reduce((a, b) => a + b.s, 0) / 8).toFixed(1) + ')');
check(pr.decision.kind === 'deal' || pr.decision.kind === 'counter', 'a good pitch gets an offer: ' + pr.decision.kind + ' ' + pr.decision.amount + ' for ' + pr.decision.equity + '%');
if (pr.decision.kind === 'counter') { const h = A.req('su', { op: 'deal', do: 'counter', equity: pr.decision.equity * 0.9 }); check(h.ok && h.counter === 'yes', 'a close counter-offer is accepted'); check(!A.req('su', { op: 'deal', do: 'counter', equity: 1 }).ok, 'only one counter-offer'); }
const dl = A.req('su', { op: 'deal', do: 'accept' }); check(dl.ok && dl.done === 'deal' && dl.money >= before + dl.deal.amount, 'accepting the deal pays ' + dl.deal.amount + ' into your account');
check(dl.su.equity < 100 && dl.su.funded === 1 && dl.su.raised === dl.deal.amount, 'founder equity drops, the round is recorded');
check(!A.req('su', { op: 'deal', do: 'accept' }).ok, 'a deal cannot be taken twice');
check(A.req('su', { op: 'call', inv: 'bansal' }).call.key === 'funded', 'a funded product sends you to build the next one');
check(A.req('su', { op: 'idea', idea: 'tiffin', name: 'GharKaKhana' }).su.feats.length === 0, 'the next product starts fresh, keeping the round count');
// a weak pitch
const B = join(); at(B, null); B.req('earn', { reason: 'coldopen' }); B.req('su', { op: 'idea', idea: 'fit', name: 'DangalFit' }); at(B, 'cowork'); B.req('su', { op: 'sit' });
for (const f of ['booking', 'reviews', 'login', 'map', 'payments', 'dark', 'hindi']) { tick(S.FEAT_GAP); B.req('su', { op: 'feat', f }); } B.req('su', { op: 'launch' });
B.req('su', { op: 'call', inv: 'sharma' }); at(B, 'vc'); const pb = B.req('su', { op: 'pitchstart' }); tick(60);
const wk = B.req('su', { op: 'pitch', a: pb.qs.map(() => 'pata nahi') }); check(wk.ok && wk.decision.kind === 'pass' && !wk.su.offer, '"pata nahi" to everything: the investor passes');
// home coding with a laptop and a room
const Cc = join(); at(Cc, null); Cc.req('su', { op: 'idea', idea: 'kirana', name: 'KhataPro' });
const prC = W.__profile ? null : null; // (no direct profile access: give money through the cold open + a jackpot is not available, so check the price gate only)
check(/chahiye/.test(Cc.req('su', { op: 'laptop' }).error || ''), 'the laptop costs ' + S.LAPTOP_PRICE + ' (refused without the money)');
console.log(fails ? fails + ' startup check(s) FAILED' : 'startup checks passed'); process.exit(fails ? 1 : 0);
