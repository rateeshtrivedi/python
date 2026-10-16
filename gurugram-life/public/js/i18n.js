// Language: the game is written in Haryanvi; Hindi and English players get it translated on the fly.
// Hindi is written in Roman letters (Hinglish), the same way the Haryanvi is.
// Every piece of text that reaches the screen (DOM text, a few attributes, canvas text) is looked up in
// a dictionary of the game's own strings, so the game code and the server keep speaking Haryanvi.
// Dictionary entries may contain {} holes for names and numbers; a translation can reorder them as {1} {2}.
export const LANGS = [
  { id: 'har', name: 'Haryanvi', sub: 'Desi swag · Haryanvi radio' },
  { id: 'hi', name: 'Hindi', sub: 'Hindi mein khelo · Bollywood radio' },
  { id: 'en', name: 'English', sub: 'Play in English · Bollywood radio' },
];
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const saved = lsGet('gl_lang');
export let LANG = LANGS.some(l => l.id === saved) ? saved : 'har';
export const langChosen = () => LANGS.some(l => l.id === lsGet('gl_lang'));

let EXACT = null, TMPL = [], cache = new Map();
const norm = s => s.replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EDGE = /^([\s·:,\-–—|•(]*)([\s\S]*?)([\s·:,\-–—|•).!?]*)$/;

function compile(pairs) {
  EXACT = new Map(); TMPL = []; cache = new Map();
  for (const [src, out] of pairs) {
    const k = norm(src); if (!k || out == null) continue;
    if (!k.includes('{}')) { EXACT.set(k, out); continue; }
    const lits = k.split('{}'); const need = lits.reduce((a, b) => b.length > a.length ? b : a, '');
    if (!/[A-Za-z]{2}/.test(need)) continue; // a template has to have some real words to anchor on
    TMPL.push({ re: new RegExp('^' + lits.map(esc).join('(.+?)') + '$'), need, out, w: lits.join('').length });
  }
  TMPL.sort((a, b) => b.w - a.w); // most specific first
}
function fill(out, vals) { let i = 0; return out.replace(/\{(\d*)\}/g, (_, n) => { const v = vals[n ? +n - 1 : i++]; return v == null ? '' : exactOnly(v); }); }
function exactOnly(v) { const m = v.match(EDGE); const t = EXACT.get(norm(m[2])); return t == null ? v : m[1] + t + m[3]; }
function one(s) {
  let t = EXACT.get(s); if (t != null) return t;
  for (const T of TMPL) { if (!s.includes(T.need)) continue; const m = s.match(T.re); if (m) return fill(T.out, m.slice(1)); }
  return null;
}
function trCore(s) {
  let t = one(s); if (t != null) return t;
  const m = s.match(EDGE); if (m[1] || m[3]) { t = one(m[2]); if (t != null) return m[1] + t + m[3]; }
  if (/ · |\n|: /.test(s)) { // stitched lines: translate each piece on its own
    let hit = false; const parts = s.split(/( · |\n|: )/).map((p, i) => { if (i % 2) return p; const q = p && trCore(p); if (q != null && q !== p) { hit = true; return q; } return p; });
    if (hit) return parts.join('');
  }
  return null;
}
// Translate one string (Haryanvi source -> current language). Unknown text (names, numbers) comes back as is.
export function tr(s) {
  if (!EXACT || LANG === 'har' || typeof s !== 'string' || !/[A-Za-z]{2}/.test(s)) return s;
  let r = cache.get(s); if (r !== undefined) return r;
  const lead = s.match(/^\s*/)[0], trail = s.slice(lead.length).match(/\s*$/)[0]; const core = norm(s);
  const t = core ? trCore(core) : null; r = t == null ? s : lead + t + trail;
  if (cache.size > 5000) cache.clear(); cache.set(s, r); return r;
}

// ---- the screen: watch the page and translate text as the game writes it
const SRC = new WeakMap(); // text node / element+attr -> { src, out }
const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);
function doText(n) {
  const p = n.parentNode; if (!p || SKIP.has(p.nodeName) || p.closest && p.closest('[data-notr]')) return;
  const v = n.nodeValue, rec = SRC.get(n); if (rec && rec.out === v) return;
  const out = tr(v); SRC.set(n, { src: v, out }); if (out !== v) n.nodeValue = out;
}
function doAttr(e, a) {
  const v = e.getAttribute(a); if (v == null) return; const key = SRC.get(e) || {}; const rec = key[a]; if (rec && rec.out === v) return;
  const out = tr(v); key[a] = { src: v, out }; SRC.set(e, key); if (out !== v) e.setAttribute(a, out);
}
function walkTree(root) {
  if (root.nodeType === 3) return doText(root); if (root.nodeType !== 1 || SKIP.has(root.nodeName) && root.nodeName !== 'INPUT') return;
  if (root.nodeName === 'INPUT') { doAttr(root, 'placeholder'); return; }
  for (const a of ATTRS) if (root.hasAttribute(a)) doAttr(root, a);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else for (const a of ATTRS) if (n.hasAttribute(a)) doAttr(n, a); }
}
let obs = null;
function watch() {
  if (obs || typeof MutationObserver === 'undefined') return;
  obs = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
      else for (const n of m.addedNodes) walkTree(n);
    }
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
function retranslate() { // after a language switch: put every remembered source back through the new dictionary
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) {
    const rec = SRC.get(n); if (!rec) { if (n.nodeType === 3) doText(n); continue; }
    if (n.nodeType === 3) { if (n.nodeValue === rec.out) n.nodeValue = rec.src; SRC.delete(n); doText(n); }
    else for (const a of ATTRS) { const r = rec[a]; if (r && n.getAttribute(a) === r.out) { n.setAttribute(a, r.src); delete rec[a]; doAttr(n, a); } }
  }
}
// canvas text (share card, signs drawn into textures) goes through the same dictionary
if (typeof CanvasRenderingContext2D !== 'undefined') {
  const P = CanvasRenderingContext2D.prototype;
  for (const f of ['fillText', 'strokeText', 'measureText']) { const o = P[f]; P[f] = function (t, ...r) { return o.call(this, tr(t), ...r); }; }
}

const LOAD = { hi: () => import('./lang/hi.js'), en: () => import('./lang/en.js') };
let switchNo = 0;
async function loadDict(id) { const m = await LOAD[id](); return m.default; }
// Switch language (also used at startup). Resolves once the page is translated.
export async function setLang(id, remember = true) {
  if (!LANGS.some(l => l.id === id)) id = 'har';
  if (remember) lsSet('gl_lang', id);
  const no = ++switchNo;
  return (async () => {
    let pairs = null; if (id !== 'har') { try { pairs = await loadDict(id); } catch (e) { console.warn('Gurugram Life: could not load language', id, e); id = 'har'; } }
    if (no !== switchNo) return; // a newer switch won
    LANG = id; if (pairs) compile(pairs); else { EXACT = null; cache = new Map(); }
    document.documentElement.lang = id === 'en' ? 'en' : 'hi-Latn'; // Hindi and Haryanvi are both written in Roman letters
    if (id !== 'har') watch(); if (document.body) retranslate();
  })();
}
export const ready = setLang(LANG, false);
