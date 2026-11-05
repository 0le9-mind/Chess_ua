/* Firebase Realtime Database over plain REST + server-sent events (no SDK, no account login). Rules must allow read/write (README step 3). */
(function () {
  const url = (window.CHESS_CONFIG.FIREBASE_URL || '').replace(/\/+$/, '');
  const Net = {
    enabled: !!url, skew: 0,
    async req(method, path, body) {
      const r = await fetch(`${url}/${path}.json`, { method, headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
      if (!r.ok) throw new Error('net ' + r.status);
      return r.json();
    },
    get(p) { return this.req('GET', p); }, put(p, v) { return this.req('PUT', p, v); }, patch(p, v) { return this.req('PATCH', p, v); }, del(p) { return this.req('DELETE', p); },
    now() { return Date.now() + this.skew; },
    async syncClock() {
      if (!this.enabled) return;
      try { const t0 = Date.now(); const v = await this.req('PUT', '_ping/t', { '.sv': 'timestamp' }); const t1 = Date.now(); this.skew = v - Math.round((t0 + t1) / 2); } catch (e) { /* keep 0 */ }
    },
    // calls cb() whenever something under `path` changes (SSE with polling fallback). returns stop().
    listen(path, cb) {
      if (!this.enabled) return () => {};
      let es = null, timer = null, poll = null, stopped = false;
      const fire = () => { if (timer) return; timer = setTimeout(() => { timer = null; if (!stopped) cb(); }, 120); };
      try { es = new EventSource(`${url}/${path}.json`); es.addEventListener('put', fire); es.addEventListener('patch', fire); es.onerror = () => {}; } catch (e) { es = null; }
      poll = setInterval(() => { if (!stopped) cb(); }, es ? 8000 : 3000);
      return () => { stopped = true; if (es) es.close(); clearInterval(poll); };
    },
  };
  window.Net = Net;
})();
