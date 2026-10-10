// WebSocket client with request/response, auto-reconnect and handler registry.
export const net = {
  ws: null, id: null, connected: false, handlers: {}, pending: new Map(), seq: 0, hello: null, retry: 0, kicked: false,
  on(t, fn) { (this.handlers[t] || (this.handlers[t] = [])).push(fn); },
  emit(t, m) { for (const fn of this.handlers[t] || []) { try { fn(m); } catch (e) { console.error(e); } } },
  connect(hello) {
    this.hello = hello;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(proto + '//' + location.host + '/ws');
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; ws.send(JSON.stringify({ t: 'hello', ...this.hello() })); };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'welcome') { this.connected = true; this.id = m.id; this.emit('status', true); }
      if (m.t === 'reply') { const p = this.pending.get(m.rid); if (p) { this.pending.delete(m.rid); clearTimeout(p.timer); p.resolve(m); } return; }
      if (m.t === 'kicked') this.kicked = true;
      this.emit(m.t, m);
    };
    ws.onclose = () => {
      const was = this.connected; this.connected = false; if (was) this.emit('status', false);
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.resolve({ ok: false, error: 'Connection toot gaya, dobara koshish kar' }); }
      this.pending.clear();
      if (this.kicked) return;
      const delay = Math.min(10000, 500 * Math.pow(2, this.retry++));
      setTimeout(() => this.connect(this.hello), delay);
    };
    ws.onerror = () => {};
  },
  send(t, data) { if (this.ws && this.ws.readyState === 1 && this.connected) this.ws.send(JSON.stringify({ t, ...data })); },
  req(t, data) {
    return new Promise(resolve => {
      if (!this.ws || this.ws.readyState !== 1 || !this.connected) return resolve({ ok: false, error: 'Server se connect nahi hai. Thodi der mein try kar.' });
      const rid = ++this.seq;
      const timer = setTimeout(() => { this.pending.delete(rid); resolve({ ok: false, error: 'Server ne jawab nahi diya' }); }, 8000);
      this.pending.set(rid, { resolve, timer });
      this.ws.send(JSON.stringify({ t, rid, ...data }));
    });
  },
};
