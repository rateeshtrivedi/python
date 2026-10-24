// Day 8 · POV: You finally bought a Thar in Gurugram (the "Thar starter pack" checklist: car, VIP plate, mods, chain, race, crew photo)
window.__SCENES = h => { const { g, G, K, S } = h;
  const at = (x, z, r) => { G.x = x; G.z = z; G.r = G.yaw = r; };
  const rich = () => { g.setP({ vehicles: ['desert'], cur: 'desert', plate: 'HR26 0001', mods: { desert: { film: 1, bull: 1, horn: 1, sticker: 4 } }, bling: ['chain', 'kada', 'watch'], gang: [] }); g.applyMyLook(); g.syncGang(); };
  const day = t => { h.reset(); h.weather(0, 0); g.DAY.t = t; rich(); };
  return [
  // 0 hook: the new Thar rolls out, low front shot
  { setup() { day(0.45); at(-222, -190, 0); g.mount('desert'); G.vs = 6; },
    tick(h, t) { K.KeyW = false; G.vs = 6; const u = Math.max(0, t); h.camAt(G.x - 2.6 + u * 0.6, 0.9, G.z + 8.5, G.x, 1.3, G.z, 6); } },
  // 1 the VIP plate close-up (the back plate: the bull bar covers the front one)
  { setup() { day(0.48); at(-222, -120, 0); g.mount('desert'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; const u = Math.max(0, t); h.camAt(G.x + 0.4 - u * 0.2, 1.05, G.z - 4.4 + u * 0.35, G.x, 1.0, G.z - 2.0, 4); } },
  // 2 mods: black film, bull bar, sticker; slow orbit
  { setup() { day(0.55); at(-222, -60, 0); g.mount('desert'); G.vs = 0; },
    tick(h, t) { K.KeyW = false; G.vs = 0; const a = 0.9 + Math.max(0, t) * 0.55; h.camAt(G.x + Math.sin(a) * 7, 2.0, G.z + Math.cos(a) * 7, G.x, 1.0, G.z, 3); } },
  // 3 the gold chain at Goyal Jewellers
  { setup() { day(0.62); at(-300, 52, 0); },
    tick(h, t) { const u = Math.max(0, t); h.camAt(G.x + 0.5 - u * 0.25, 1.5, G.z + 3.3 - u * 0.3, G.x, 1.35, G.z, 4); } },
  // 4 race win on Golf Course Road
  { setup() { day(0.7); at(-222, -200, 0); g.mount('desert'); G.vs = 26; },
    tick(h, t) { K.KeyW = true; K.ShiftLeft = true; h.camAt(G.x - 2.2, 0.6, G.z - 3.4, G.x + 0.3, 1.0, G.z + 8, 8); } },
  // 5 crew photo by the Thar at sunset
  { setup() { day(0.74); at(-222, -40, 0); g.mount('desert'); G.vs = 0; S.t = 0;
      g.setP({ gang: [{ n: 'Monu', s: 1 }, { n: 'Sonu', s: 2 }, { n: 'Pinku', s: 4 }, { n: 'Lucky', s: 5 }] }); },
    tick(h, t) { K.KeyW = false; G.vs = 0; if (G.veh && t > -0.6) { g.dismount(); G.r = G.yaw = 0; } if (!G.veh && !S.gang) { S.gang = 1; g.syncGang(); S.car = g.makeVehicle('desert', null, { film: 1, bull: 1, sticker: 4 }, 'HR26 0001'); S.car.position.set(G.x + 4.2, 0, G.z - 6.5); S.car.rotation.y = -Math.PI * 0.8; g.scene.add(S.car); }
      const cv = document.querySelector('canvas:not(#mini)'), fl = [1.3, 2.1].some(f => t >= f && t < f + 0.1); cv.style.filter = fl ? 'brightness(2.2) saturate(0.6)' : 'saturate(1.12) contrast(1.04)'; /* the phone camera flash */
      G.dance = t > 0.3; const u = Math.max(0, t); h.camAt(G.x - 0.6, 2.4, G.z + 8.8 - u * 0.4, G.x + 1.2, 1.4, G.z - 3, 4); },
    done() { if (S.car) g.scene.remove(S.car); } },
]; };
