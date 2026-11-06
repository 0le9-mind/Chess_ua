/* Local persistence + player profile (local cache, mirrored to Firebase when configured). */
(function () {
  const safe = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const POINTS = { win: 10, draw: 5, loss: 0 };
  const Profile = {
    uid: null, name: 'Guest', data: null,
    init(uid, name) {
      this.uid = String(uid); this.name = name || 'Guest';
      this.data = safe.get('chess.profile.' + this.uid, null) || { pts: 0, played: 0, w: 0, d: 0, l: 0, scored: {} };
      this.data.name = this.name;
    },
    save() { safe.set('chess.profile.' + this.uid, this.data); },
    async pull() {
      if (!Net.enabled) return;
      try {
        const r = await Net.get('players/' + this.uid);
        if (r && (r.played || 0) >= this.data.played) {
          this.data = Object.assign({ pts: 0, played: 0, w: 0, d: 0, l: 0 }, r, { name: this.name, scored: Object.assign({}, this.data.scored, r.scored || {}) });
        } else if (!r || this.data.played) this.push();
        this.save();
      } catch (e) { /* offline: keep local */ }
    },
    push() {
      if (!Net.enabled) return Promise.resolve();
      const d = this.data;
      return Net.patch('players/' + this.uid, { name: this.name, pts: d.pts, played: d.played, w: d.w, d: d.d, l: d.l, scored: d.scored }).catch(() => {});
    },
    // outcome: 'win'|'draw'|'loss'. Idempotent per game id. Returns points added (0 if already counted).
    record(gid, outcome) {
      if (this.data.scored[gid]) return null;
      const pts = POINTS[outcome];
      this.data.scored[gid] = 1; this.data.pts += pts; this.data.played++;
      if (outcome === 'win') this.data.w++; else if (outcome === 'draw') this.data.d++; else this.data.l++;
      const keys = Object.keys(this.data.scored); if (keys.length > 400) delete this.data.scored[keys[0]];
      this.save(); this.push();
      return pts;
    },
    async top(n) {
      if (!Net.enabled) return [{ id: this.uid, name: this.name, pts: this.data.pts, played: this.data.played }];
      const all = (await Net.get('players')) || {};
      return Object.keys(all).map((id) => ({ id, name: all[id].name || '—', pts: all[id].pts || 0, played: all[id].played || 0 }))
        .filter((x) => x.played > 0).sort((a, b) => b.pts - a.pts || a.played - b.played).slice(0, n || 20);
    },
  };
  window.Store = { safe, Profile, POINTS };
})();
