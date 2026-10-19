// view order per slug, from views.js (evaluated with a fake game object)
const fs = require('fs'); const src = fs.readFileSync(__dirname + '/views.js', 'utf8'); const window = {}; eval(src);
const fake = new Proxy({}, { get: () => new Proxy(() => ({}), { get: () => () => ({}), apply: () => ({}) }) });
const V = window.__VIEWS({ G: {}, serverNow: () => 0 }); const out = {}; for (const k in V) out[k] = V[k].map(v => v[0]); fs.writeFileSync(__dirname + '/order.json', JSON.stringify(out)); console.log(Object.keys(out).length);
