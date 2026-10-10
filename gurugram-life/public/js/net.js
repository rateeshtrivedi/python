// Connection to the game world: a WebSocket to the server (multiplayer), or the same world
// rules running inside this browser (solo mode). The rest of the game can't tell the difference.
export const net = {
  ws: null, id: null, connected: false, solo: false, handlers: {}, pending: new Map(), seq: 0, hello: null, retry: 0, kicked: false, local: null,
  on(t, fn) { (this.handlers[t] || (this.handlers[t] = [])).push(fn); },
  emit(t, m) { for (const fn of this.handlers[t] || []) { try { fn(m); } catch (e) { console.error(e); } } },
  receive(m) {
    if (m.t === 'welcome') { this.connected = true; this.id = m.id; this.emit('status', true); }
    if (m.t === 'reply') { const p = this.pending.get(m.rid); if (p) { this.pending.delete(m.rid); clearTimeout(p.timer); p.resolve(m); } return; }
    if (m.t === 'kicked') this.kicked = true;
    if (m.t === 'full') { this.kicked = true; this.emit('unreachable'); return; }
    this.emit(m.t, m);
  },
  transmit(obj) {
    if (this.local) { this.local.message(JSON.parse(JSON.stringify(obj))); return true; }
    if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(obj)); return true; }
    return false;
  },
  connect(hello) {
    this.hello = hello;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws; try { ws = new WebSocket(proto + '//' + location.host + '/ws'); } catch { this.emit('unreachable'); return; }
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; ws.send(JSON.stringify({ t: 'hello', ...this.hello() })); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } this.receive(m); };
    ws.onclose = () => {
      const was = this.connected; this.connected = false; if (was) this.emit('status', false); else if (this.retry === 0) this.emit('unreachable');
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.resolve({ ok: false, error: 'Connection toot gaya, dobara koshish kar' }); }
      this.pending.clear();
      if (this.kicked || this.local) return;
      const delay = Math.min(10000, 500 * Math.pow(2, this.retry++));
      setTimeout(() => { if (!this.local) this.connect(this.hello); }, delay);
    };
    ws.onerror = () => {};
  },
  // Solo mode: run the shared world rules locally; progress is kept in this browser.
  async connectLocal(hello) {
    if (this.local) return;
    if (this.ws) { try { this.ws.onclose = null; this.ws.close(); } catch {} this.ws = null; }
    const { createWorld } = await import('../shared/world.js');
    const KEY = 'gl_world';
    const world = createWorld({
      rid: (n = 8) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'[b & 63]).join(''); },
      load: () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
      save: json => { try { localStorage.setItem(KEY, json); } catch {} },
      bots: true,
    });
    this.solo = true;
    this.local = world.connect(msg => { const copy = JSON.parse(JSON.stringify(msg)); queueMicrotask(() => this.receive(copy)); }, () => {});
    setInterval(() => world.tick100(), 100);
    setInterval(() => world.tick1s(), 1000);
    setInterval(() => world.persist(), 5000);
    addEventListener('pagehide', () => world.persist(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) world.persist(true); });
    this.local.message({ t: 'hello', ...hello() });
  },
  send(t, data) { if (this.connected) this.transmit({ t, ...data }); },
  req(t, data) {
    return new Promise(resolve => {
      if (!this.connected) return resolve({ ok: false, error: 'Server se connect nahi hai. Thodi der mein try kar.' });
      const rid = ++this.seq;
      const timer = setTimeout(() => { this.pending.delete(rid); resolve({ ok: false, error: 'Server ne jawab nahi diya' }); }, 8000);
      this.pending.set(rid, { resolve, timer });
      if (!this.transmit({ t, rid, ...data })) { clearTimeout(timer); this.pending.delete(rid); resolve({ ok: false, error: 'Server se connect nahi hai' }); }
    });
  },
};
