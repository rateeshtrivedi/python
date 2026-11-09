// Street fight mode: the rules of a face-to-face fight (styles, moves, damage, blocks, throws, rounds, the opponent's AI).
// Pure functions, no three.js: the client (js/streetfight.js) animates it and test/fight.mjs checks it.

// Every move: wind (start-up, s), act (the window it can land in), rec (recovery), range (how far it reaches),
// dmg (per hit), hits (multi-hit), kb (knockback), and flags: breaks (gets through a block), grab (a throw: can't be
// blocked, only escaped by being out of reach), down (knocks down).
export const STYLES = {
  kungfu: { id: 'kungfu', icon: '🐉', name: { en: 'Kung Fu', hi: 'Kung Fu' }, tag: { en: 'Fast hands, flying kicks', hi: 'Tez haath, udti kick' },
    moves: {
      punch: { name: { en: 'Palm strike', hi: 'Palm strike' }, wind: 0.08, act: 0.1, rec: 0.16, range: 1.65, dmg: 6, kb: 0.25 },
      kick: { name: { en: 'Side kick', hi: 'Side kick' }, wind: 0.18, act: 0.12, rec: 0.28, range: 2.05, dmg: 10, kb: 0.7 },
      special: { name: { en: 'Dragon flurry', hi: 'Dragon flurry' }, wind: 0.12, act: 0.5, rec: 0.35, range: 1.70, dmg: 5, hits: 4, kb: 0.9, cd: 4 },
    } },
  karate: { id: 'karate', icon: '🥋', name: { en: 'Karate', hi: 'Karate' }, tag: { en: 'Heavy punches, the chop breaks guards', hi: 'Bhaari punch, chop guard tod de' },
    moves: {
      punch: { name: { en: 'Straight punch', hi: 'Seedha punch' }, wind: 0.1, act: 0.1, rec: 0.2, range: 1.70, dmg: 8, kb: 0.35 },
      kick: { name: { en: 'Front kick', hi: 'Front kick' }, wind: 0.2, act: 0.12, rec: 0.3, range: 2.00, dmg: 12, kb: 0.8 },
      special: { name: { en: 'Karate chop', hi: 'Karate chop' }, wind: 0.32, act: 0.12, rec: 0.35, range: 1.65, dmg: 18, kb: 1.0, breaks: true, cd: 4 },
    } },
  judo: { id: 'judo', icon: '🤼', name: { en: 'Judo', hi: 'Judo' }, tag: { en: 'Sweeps and throws nobody can block', hi: 'Sweep aur throw, block na hove' },
    moves: {
      punch: { name: { en: 'Grip jab', hi: 'Grip jab' }, wind: 0.1, act: 0.1, rec: 0.2, range: 1.60, dmg: 6, kb: 0.25 },
      kick: { name: { en: 'Foot sweep', hi: 'Foot sweep' }, wind: 0.2, act: 0.12, rec: 0.32, range: 1.80, dmg: 8, kb: 0.4, down: true },
      special: { name: { en: 'Hip throw', hi: 'Hip throw' }, wind: 0.18, act: 0.1, rec: 0.9, range: 1.45, dmg: 22, kb: 1.4, grab: true, down: true, cd: 4.5 },
    } },
};
export const STYLE_IDS = Object.keys(STYLES);
export const ROUNDS = 3, WINS = 2, ROUND_SECS = 45, HP = 100, BLOCK_CHIP = 0.15, BREAK_KEEP = 0.6, MIN_GAP = 1.25, ARENA = 5.2, WALK = 2.4;
// the Gali ke Don bosses each fight in their own style
export const BOSS_STYLE = ['karate', 'kungfu', 'judo', 'karate', 'kungfu'];
export const move = (style, kind) => STYLES[style].moves[kind];
export const total = m => m.wind + m.act + m.rec;

// what a landed move does to someone: blocking takes a little chip damage, a breaking move gets most of the way
// through and stops the block, a grab can't be blocked at all
export function resolveHit(m, blocking, mul = 1) {
  const raw = Math.round(m.dmg * mul);
  if (m.grab) return { dmg: raw, blocked: false, down: true, kb: m.kb, thrown: true };
  if (blocking && m.breaks) return { dmg: Math.round(raw * BREAK_KEEP), blocked: false, broke: true, down: false, kb: m.kb * 0.6 };
  if (blocking) return { dmg: Math.max(1, Math.round(raw * BLOCK_CHIP)), blocked: true, down: false, kb: m.kb * 0.3 };
  return { dmg: raw, blocked: false, down: !!m.down, kb: m.kb };
}
export const inReach = (m, gap) => gap <= m.range;

// a round ends on a KO or when the clock runs out (then whoever has more health left wins it; a tie goes to nobody)
export function roundWinner(hpA, hpB, timeLeft) {
  if (hpA <= 0 && hpB <= 0) return 'draw'; if (hpB <= 0) return 'a'; if (hpA <= 0) return 'b';
  if (timeLeft > 0) return null; return hpA > hpB ? 'a' : hpB > hpA ? 'b' : 'draw';
}
export function matchWinner(winsA, winsB, round) {
  if (winsA >= WINS) return 'a'; if (winsB >= WINS) return 'b';
  if (round >= ROUNDS + 2) return winsA > winsB ? 'a' : winsB > winsA ? 'b' : 'a'; // after sudden-death rounds, the player gets it
  return null;
}
// how hard each Don boss is: health and damage multipliers, reaction (block chance) and how often he attacks
export function bossLevel(ch, playerLevel) {
  const soft = Math.min(1, (playerLevel + 3) / (ch * 2 + 4)); // under-levelled players get an easier fight, as in the normal brawl
  return { hp: Math.round(HP * (0.85 + ch * 0.12)), dmg: +(0.75 + ch * 0.08) * soft, block: Math.min(0.55, 0.18 + ch * 0.08), aggr: Math.min(0.9, 0.45 + ch * 0.1), think: Math.max(0.28, 0.6 - ch * 0.07) };
}
// the opponent's next decision (called every `think` seconds). me/foe: { gap, busy, hp, cd (special cooldown left), attacking (what the foe is doing) }
export function aiDecide(st, lv, rnd = Math.random) {
  const { gap, foeAttacking, cd, style, hpFrac } = st; const M = STYLES[style].moves;
  if (foeAttacking && gap < 2.3 && rnd() < lv.block) return 'block';
  if (foeAttacking === 'special' && STYLES[st.foeStyle]?.moves.special.grab && gap < 1.6 && rnd() < 0.5) return 'back'; // step out of a throw
  if (hpFrac < 0.3 && gap < 1.5 && rnd() < 0.25) return 'back';
  if (gap > M.kick.range) return rnd() < lv.aggr ? 'fwd' : 'idle';
  if (cd <= 0 && gap <= M.special.range && rnd() < 0.3) return 'special';
  if (gap <= M.punch.range && rnd() < lv.aggr) return rnd() < 0.55 ? 'punch' : 'kick';
  if (gap <= M.kick.range && rnd() < lv.aggr) return 'kick';
  return rnd() < 0.5 ? 'fwd' : 'idle';
}
