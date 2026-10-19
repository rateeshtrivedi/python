// Screenshot list for the SEO pages. Each view: [file, day time (0..1), setup(t) -> {cam:[x,y,z], look:[x,y,z]}, alt text]
// t = window.__t (game internals). Places: district centre = grid * 150.
window.__VIEWS = t => { const { G } = t; const C = (i, j) => [i * 150, j * 150];
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r || 0; };
  const plain = () => { t.scene.fog.near = 160; t.scene.fog.far = 560; t.G.ev = null; t.AKHARA.fight = false; t.G.dance = false; if (t.G.veh) t.dismount(); };
  const ev = type => { const s = t.serverNow(); t.G.ev = { type, id: 'shot', name: type, start: s - 30, end: s + 600, data: {} }; };
  const street = (i, j, name) => ['street', 0.42, () => { plain(); const [x, z] = C(i, j); at(x + 64, z + 40, -2.2); return { cam: [x + 76, 2.6, z + 52], look: [x + 30, 7, z + 10] }; }];
  const wide = (i, j, name) => ['wide', 0.45, () => { plain(); const [x, z] = C(i, j); at(x + 70, z + 70, 0); return { cam: [x + 98, 46, z + 98], look: [x - 5, 4, z - 5] }; }];
  return {
    'dlf-cyber-city': [street(0, -2), wide(0, -2), ['towers', 0.4, () => { plain(); at(20, -268, Math.PI); return { cam: [26, 1.7, -258], look: [0, 30, -314] }; }]],
    'cyber-hub': [street(1, -2), wide(1, -2), ['ipl', 0.73, () => { plain(); ev('ipl'); at(150, -280, Math.PI); return { cam: [156, 3, -268], look: [150, 6, -305] }; }]],
    'golf-course-road': [['baraat', 0.62, () => { plain(); ev('baraat'); const bz = t.baraatZ(); at(-219, bz + 10, Math.PI); return { cam: [-215, 3.6, bz + 16], look: [-224, 1.6, bz] }; }], street(-2, 0), wide(-2, 0)],
    'golf-course-extension': [['flood', 0.42, () => { plain(); t.setWeather(3, true); t.WX.wl = 0.75; t.WX.ww = 0.9; at(-226, 160, Math.PI); return { cam: [-223, 3.6, 178], look: [-226, 1, 135] }; }], street(-2, 1), wide(-2, 1)],
    'sohna-road': [['holi', 0.7, () => { plain(); ev('holi'); at(150, 28, Math.PI); G.dance = true; return { cam: [154, 2.2, 22], look: [150, 1.4, 28], holi: 1 }; }], street(1, 0), wide(1, 0)],
    'iffco-chowk': [['jam', 0.45, () => { plain(); at(-8, -74, Math.PI / 2); return { cam: [-24, 3.2, -72], look: [8, 1.6, -76] }; }], street(0, -1), wide(0, -1)],
    'rajiv-chowk': [['sign', 0.42, () => { plain(); at(0, 40, Math.PI); return { cam: [6, 2.4, 52], look: [0, 3, 30] }; }], ['fountain', 0.7, () => { plain(); at(14, 14, -2.3); return { cam: [24, 6, 26], look: [0, 2, 0] }; }], wide(0, 0)],
    'huda-city-centre': [street(-1, -1), wide(-1, -1), ['flood', 0.4, () => { plain(); t.setWeather(4, true); t.WX.wl = 1; t.WX.ww = 1; at(-76, -140, Math.PI); return { cam: [-73, 3.6, -122], look: [-76, 1, -165] }; }]],
    'sector-29': [['club', 0.9, () => { plain(); at(195, -98, Math.PI); return { cam: [200, 2.6, -86], look: [195, 4, -108] }; }], street(1, -1), wide(1, -1)],
    'sector-14-market': [street(-1, 1), ['lanes', 0.6, () => { plain(); at(-150, 168, Math.PI); return { cam: [-144, 2.6, 180], look: [-155, 2, 150] }; }], wide(-1, 1)],
    'galleria-market': [['carts', 0.45, () => { plain(); at(-150, 18, -Math.PI / 2); return { cam: [-138, 3.2, 32], look: [-155, 1.3, 10] }; }], street(-1, 0), wide(-1, 0)],
    'sadar-bazaar': [['bazaar', 0.62, () => { plain(); at(300, 22, Math.PI); return { cam: [306, 2.6, 34], look: [298, 2, 5] }; }], street(2, 0), wide(2, 0)],
    'old-gurgaon': [['temple', 0.72, () => { plain(); at(300, 166, Math.PI); return { cam: [306, 2.8, 178], look: [300, 4, 150] }; }], street(2, 1), wide(2, 1)],
    'badshahpur': [['chaupal', 0.6, () => { plain(); at(145, 157, Math.PI); return { cam: [150, 2.6, 165], look: [143, 2, 147] }; }], street(1, 1), wide(1, 1)],
    'leisure-valley-park': [['dangal', 0.42, () => { plain(); const A = t.AKHARA, P = t.PEHLWAN; A.fight = true; P.state = 'aggro'; P.hp = 1e6; at(A.x + 1.6, A.z, -Math.PI / 2); return { cam: [A.x + 0.8, 1.9, A.z + 5.6], look: [A.x + 0.4, 1.3, A.z], dangal: 1 }; }], street(2, -1), wide(2, -1)],
    'ambience-island': [['mall', 0.42, () => { plain(); at(-150, -280, Math.PI); return { cam: [-140, 3, -262], look: [-150, 10, -312] }; }], street(-1, -2), wide(-1, -2)],
    'nh-48-auto-mile': [['showroom', 0.45, () => { plain(); at(300, -306, Math.PI); return { cam: [310, 3, -290], look: [300, 4, -318] }; }], ['toll', 0.45, () => { plain(); at(282, -372, Math.PI / 2); return { cam: [266, 4, -369], look: [300, 2, -375] }; }], wide(2, -2)],
    'dlf-phase-3': [street(-2, -1), wide(-2, -1), ['homes', 0.66, () => { plain(); at(-364, -190, 2.4); return { cam: [-376, 2.6, -202], look: [-330, 7, -160] }; }]],
    'sikanderpur': [street(-2, -2), wide(-2, -2), ['towers', 0.42, () => { plain(); at(-280, -270, Math.PI); return { cam: [-272, 1.7, -258], look: [-300, 28, -310] }; }]],
    'sushant-lok': [street(0, 2), wide(0, 2), ['rain', 0.42, () => { plain(); t.setWeather(3, true); t.WX.wl = 0.75; t.WX.ww = 0.85; at(-76, 290, Math.PI); return { cam: [-73, 3.6, 308], look: [-76, 1, 265] }; }]],
    'sector-56': [street(-2, 2), wide(-2, 2), ['towers', 0.7, () => { plain(); at(-280, 330, Math.PI); return { cam: [-272, 1.7, 342], look: [-300, 25, 290] }; }]],
    'civil-hospital': [['hospital', 0.42, () => { plain(); at(0, 175, Math.PI); return { cam: [8, 2.6, 186], look: [0, 4, 160] }; }], street(0, 1), wide(0, 1)],
    'bhondsi': [['farm', 0.68, () => { plain(); at(150, 330, Math.PI); G.dance = true; return { cam: [156, 3, 342], look: [150, 2, 320] }; }], street(1, 2), wide(1, 2)],
    'aravali-biodiversity-park': [['lake', 0.45, () => { plain(); at(-150, 285, 0); t.mount('naav'); return { cam: [-140, 4, 270], look: [-150, 0.5, 290] }; }], street(-1, 2), wide(-1, 2)],
    'manesar': [street(2, 2), wide(2, 2), ['factory', 0.4, () => { plain(); at(300, 330, Math.PI); return { cam: [310, 3, 345], look: [300, 6, 300] }; }]],
    'how-to-play': [['drive', 0.42, () => { plain(); at(75.5, -200, 0); t.mount('desert'); G.vs = 0; return { cam: [70, 3, -212], look: [75.5, 1, -196] }; }], ['map', 0.45, () => { plain(); t.scene.fog.near = 900; t.scene.fog.far = 3000; t.camera.far = 3000; t.camera.updateProjectionMatrix(); at(0, 40, Math.PI); return { cam: [50, 120, 190], look: [0, 0, 10] }; }]],
  }; };
