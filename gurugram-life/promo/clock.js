// Virtual clock: the page only advances when __step(ms) is called, so every captured frame is exactly 1/30 s apart.
(() => {
  let vt = 0; const start = Date.now();
  window.GL_SOLO = true;
  performance.now = () => vt;
  Date.now = () => start + vt;
  const raf = []; window.requestAnimationFrame = cb => { raf.push(cb); return raf.length; }; window.cancelAnimationFrame = () => {};
  const timers = []; let tid = 1;
  window.setTimeout = (fn, ms, ...a) => { const id = tid++; timers.push({ id, t: vt + Math.max(0, +ms || 0), fn, a }); return id; };
  window.setInterval = (fn, ms, ...a) => { const iv = Math.max(1, +ms || 1); const id = tid++; timers.push({ id, t: vt + iv, fn, a, iv }); return id; };
  window.clearTimeout = window.clearInterval = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
  window.__step = ms => {
    const target = vt + ms;
    for (;;) { timers.sort((a, b) => a.t - b.t); const t = timers[0]; if (!t || t.t > target) break; vt = t.t; if (t.iv) t.t += t.iv; else timers.shift(); try { if (typeof t.fn === 'function') t.fn(...t.a); } catch (e) { console.error(e); } }
    vt = target; const list = raf.splice(0); for (const cb of list) { try { cb(vt); } catch (e) { console.error(e); } }
  };
})();
