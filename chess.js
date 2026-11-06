/* chess.js - complete chess rules (0x88 board). Works in the page, in a Web Worker and in Node.
   Moves are ints: from | to<<7 | promo<<14   (squares are 0x88 indexes: a1=0 ... h1=7, a2=16 ... h8=119)
   Pieces: +1..+6 = white P N B R Q K, -1..-6 = black. */
(function (root) {
  'use strict';
  const WHITE = 1, BLACK = -1, P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const FILES = 'abcdefgh';
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const LETTERS = ' PNBRQK';
  const KN = [33, 31, 18, 14, -33, -31, -18, -14], KI = [1, -1, 16, -16, 17, 15, -17, -15];
  const BD = [17, 15, -17, -15], RD = [1, -1, 16, -16];

  // castling rights bits: 1 = white O-O, 2 = white O-O-O, 4 = black O-O, 8 = black O-O-O
  const KEEP = new Int8Array(128).fill(15);
  KEEP[0] = 13; KEEP[7] = 14; KEEP[4] = 12; KEEP[112] = 7; KEEP[119] = 11; KEEP[116] = 3;

  // ---- zobrist (two independent 32-bit halves)
  let seed = 0x2f6b9a1d;
  function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  const ZP1 = new Int32Array(13 * 128), ZP2 = new Int32Array(13 * 128);
  const ZC1 = new Int32Array(16), ZC2 = new Int32Array(16), ZE1 = new Int32Array(128), ZE2 = new Int32Array(128);
  for (let i = 0; i < ZP1.length; i++) { ZP1[i] = rnd(); ZP2[i] = rnd(); }
  for (let i = 0; i < 16; i++) { ZC1[i] = rnd(); ZC2[i] = rnd(); }
  for (let i = 0; i < 128; i++) { ZE1[i] = rnd(); ZE2[i] = rnd(); }
  const ZS1 = rnd(), ZS2 = rnd();

  const sqName = (s) => FILES[s & 7] + ((s >> 4) + 1);
  const nameSq = (n) => (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97);
  const mk = (from, to, promo) => from | (to << 7) | ((promo || 0) << 14);
  const mFrom = (m) => m & 127, mTo = (m) => (m >> 7) & 127, mPromo = (m) => (m >> 14) & 7;
  const uci = (m) => sqName(m & 127) + sqName((m >> 7) & 127) + (mPromo(m) ? 'nbrq'[mPromo(m) - 2] : '');
  const PROMO_LETTER = { n: N, b: B, r: R, q: Q };

  class Board {
    constructor(fen) {
      this.sq = new Int8Array(128);
      this.uM = new Int32Array(1024); this.uC = new Int8Array(1024); this.uCa = new Int8Array(1024);
      this.uEp = new Int16Array(1024); this.uHalf = new Int16Array(1024);
      this.hist1 = new Int32Array(1025); this.hist2 = new Int32Array(1025);
      this.setFen(fen || START_FEN);
    }

    setFen(fen) {
      const parts = fen.trim().split(/\s+/);
      this.sq.fill(0);
      this.king = [-1, -1];
      const rows = parts[0].split('/');
      if (rows.length !== 8) throw new Error('bad FEN');
      for (let i = 0; i < 8; i++) {
        let f = 0; const r = 7 - i;
        for (const ch of rows[i]) {
          if (ch >= '1' && ch <= '8') { f += +ch; continue; }
          const color = ch === ch.toUpperCase() ? 1 : -1;
          const t = LETTERS.indexOf(ch.toUpperCase());
          if (t < 1) throw new Error('bad FEN');
          this.sq[r * 16 + f] = color * t;
          if (t === K) this.king[color === 1 ? 0 : 1] = r * 16 + f;
          f++;
        }
      }
      this.turn = (parts[1] || 'w') === 'w' ? WHITE : BLACK;
      const c = parts[2] || '-';
      this.castling = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
      this.ep = parts[3] && parts[3] !== '-' ? nameSq(parts[3]) : -1;
      this.half = +(parts[4] || 0);
      this.full = +(parts[5] || 1);
      this.ply = 0;
      this.computeHash();
      this.hist1[0] = this.h1; this.hist2[0] = this.h2;
    }

    computeHash() {
      let a = 0, b = 0;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = this.sq[s];
        if (p) { a ^= ZP1[(p + 6) * 128 + s]; b ^= ZP2[(p + 6) * 128 + s]; }
      }
      a ^= ZC1[this.castling]; b ^= ZC2[this.castling];
      if (this.ep >= 0) { a ^= ZE1[this.ep]; b ^= ZE2[this.ep]; }
      if (this.turn === BLACK) { a ^= ZS1; b ^= ZS2; }
      this.h1 = a; this.h2 = b;
    }

    fen() {
      let out = '';
      for (let r = 7; r >= 0; r--) {
        let e = 0;
        for (let f = 0; f < 8; f++) {
          const p = this.sq[r * 16 + f];
          if (!p) { e++; continue; }
          if (e) { out += e; e = 0; }
          const l = LETTERS[Math.abs(p)];
          out += p > 0 ? l : l.toLowerCase();
        }
        if (e) out += e;
        if (r) out += '/';
      }
      const c = (this.castling & 1 ? 'K' : '') + (this.castling & 2 ? 'Q' : '') + (this.castling & 4 ? 'k' : '') + (this.castling & 8 ? 'q' : '');
      return `${out} ${this.turn === 1 ? 'w' : 'b'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
    }

    // is square s attacked by pieces of colour `by`?
    attacked(s, by) {
      const sq = this.sq;
      let p = s - 16 * by - 1; if (!(p & 0x88) && sq[p] === by * P) return true;
      p = s - 16 * by + 1; if (!(p & 0x88) && sq[p] === by * P) return true;
      for (let i = 0; i < 8; i++) {
        p = s + KN[i]; if (!(p & 0x88) && sq[p] === by * N) return true;
        p = s + KI[i]; if (!(p & 0x88) && sq[p] === by * K) return true;
      }
      for (let i = 0; i < 4; i++) {
        let d = BD[i]; p = s + d;
        while (!(p & 0x88)) { const c = sq[p]; if (c) { if (c === by * B || c === by * Q) return true; break; } p += d; }
        d = RD[i]; p = s + d;
        while (!(p & 0x88)) { const c = sq[p]; if (c) { if (c === by * R || c === by * Q) return true; break; } p += d; }
      }
      return false;
    }

    inCheck(color) { color = color || this.turn; return this.attacked(this.king[color === 1 ? 0 : 1], -color); }

    // pseudo-legal moves into `out` (ints). capsOnly: captures and queen promotions only (for quiescence)
    gen(out, capsOnly) {
      const us = this.turn, sq = this.sq;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = sq[s] * us;
        if (p <= 0) continue;
        if (p === P) {
          const dir = 16 * us, rank = s >> 4;
          const last = us === 1 ? 6 : 1, start = us === 1 ? 1 : 6;
          let to = s + dir;
          if (sq[to] === 0) {
            if (rank === last) {
              out.push(mk(s, to, Q)); if (!capsOnly) out.push(mk(s, to, N), mk(s, to, R), mk(s, to, B));
            } else if (!capsOnly) {
              out.push(mk(s, to));
              if (rank === start && sq[to + dir] === 0) out.push(mk(s, to + dir));
            }
          }
          for (let k = -1; k <= 1; k += 2) {
            to = s + dir + k;
            if (to & 0x88) continue;
            const c = sq[to] * us;
            if (c < 0) {
              if (rank === last) { out.push(mk(s, to, Q)); if (!capsOnly) out.push(mk(s, to, N), mk(s, to, R), mk(s, to, B)); }
              else out.push(mk(s, to));
            } else if (to === this.ep) out.push(mk(s, to));
          }
        } else if (p === N || p === K) {
          const d = p === N ? KN : KI;
          for (let i = 0; i < 8; i++) {
            const to = s + d[i];
            if (to & 0x88) continue;
            const c = sq[to] * us;
            if (c > 0) continue;
            if (c < 0 || !capsOnly) out.push(mk(s, to));
          }
        } else {
          const start = p === B ? 0 : p === R ? 4 : 0, end = p === B ? 4 : p === R ? 8 : 8;
          for (let i = start; i < end; i++) {
            const d = i < 4 ? BD[i] : RD[i - 4];
            let to = s + d;
            while (!(to & 0x88)) {
              const c = sq[to] * us;
              if (c > 0) break;
              if (c < 0) { out.push(mk(s, to)); break; }
              if (!capsOnly) out.push(mk(s, to));
              to += d;
            }
          }
        }
      }
      if (!capsOnly) {
        const base = us === 1 ? 0 : 112, kbit = us === 1 ? 1 : 4, qbit = us === 1 ? 2 : 8, them = -us;
        if (this.castling & (kbit | qbit) && sq[base + 4] === us * K && !this.attacked(base + 4, them)) {
          if (this.castling & kbit && sq[base + 5] === 0 && sq[base + 6] === 0 && sq[base + 7] === us * R && !this.attacked(base + 5, them))
            out.push(mk(base + 4, base + 6));
          if (this.castling & qbit && sq[base + 3] === 0 && sq[base + 2] === 0 && sq[base + 1] === 0 && sq[base] === us * R && !this.attacked(base + 3, them))
            out.push(mk(base + 4, base + 2));
        }
      }
      return out;
    }

    legalMoves() {
      const pseudo = this.gen([]), out = [], us = this.turn;
      for (let i = 0; i < pseudo.length; i++) {
        this.make(pseudo[i]);
        if (!this.attacked(this.king[us === 1 ? 0 : 1], -us)) out.push(pseudo[i]);
        this.unmake();
      }
      return out;
    }

    make(m) {
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, sq = this.sq;
      const p = sq[from], us = this.turn, t = p * us, d = this.ply++;
      this.uM[d] = m; this.uC[d] = sq[to]; this.uCa[d] = this.castling; this.uEp[d] = this.ep; this.uHalf[d] = this.half;
      let a = this.h1, b = this.h2;
      a ^= ZC1[this.castling]; b ^= ZC2[this.castling];
      if (this.ep >= 0) { a ^= ZE1[this.ep]; b ^= ZE2[this.ep]; }
      const cap = sq[to];
      if (cap) { const z = (cap + 6) * 128 + to; a ^= ZP1[z]; b ^= ZP2[z]; }
      let z = (p + 6) * 128 + from; a ^= ZP1[z]; b ^= ZP2[z];
      const np = promo ? us * promo : p;
      z = (np + 6) * 128 + to; a ^= ZP1[z]; b ^= ZP2[z];
      sq[from] = 0; sq[to] = np;
      if (t === P && to === this.ep && cap === 0 && ((to ^ from) & 7)) {
        const cs = to - 16 * us; z = (sq[cs] + 6) * 128 + cs; a ^= ZP1[z]; b ^= ZP2[z]; sq[cs] = 0;
      }
      if (t === K) {
        this.king[us === 1 ? 0 : 1] = to;
        if (to - from === 2) { sq[to - 1] = sq[to + 1]; sq[to + 1] = 0; this._rk(a, b, us, to + 1, to - 1); a = this._a; b = this._b; }
        else if (from - to === 2) { sq[to + 1] = sq[to - 2]; sq[to - 2] = 0; this._rk(a, b, us, to - 2, to + 1); a = this._a; b = this._b; }
      }
      this.castling &= KEEP[from] & KEEP[to];
      this.ep = (t === P && (to - from === 32 || from - to === 32)) ? (from + to) >> 1 : -1;
      a ^= ZC1[this.castling]; b ^= ZC2[this.castling];
      if (this.ep >= 0) { a ^= ZE1[this.ep]; b ^= ZE2[this.ep]; }
      a ^= ZS1; b ^= ZS2;
      this.half = (t === P || cap) ? 0 : this.half + 1;
      if (us === BLACK) this.full++;
      this.turn = -us;
      this.h1 = a; this.h2 = b;
      this.hist1[this.ply] = a; this.hist2[this.ply] = b;
    }
    _rk(a, b, us, from, to) {
      const r = us * R;
      let z = (r + 6) * 128 + from; a ^= ZP1[z]; b ^= ZP2[z];
      z = (r + 6) * 128 + to; a ^= ZP1[z]; b ^= ZP2[z];
      this._a = a; this._b = b;
    }

    unmake() {
      const d = --this.ply, m = this.uM[d], from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, sq = this.sq;
      const us = -this.turn, cap = this.uC[d];
      const p = promo ? us * P : sq[to];
      const t = p * us;
      sq[from] = p; sq[to] = cap;
      if (t === P && to === this.uEp[d] && cap === 0 && ((to ^ from) & 7)) sq[to - 16 * us] = -us * P;
      if (t === K) {
        this.king[us === 1 ? 0 : 1] = from;
        if (to - from === 2) { sq[to + 1] = sq[to - 1]; sq[to - 1] = 0; }
        else if (from - to === 2) { sq[to - 2] = sq[to + 1]; sq[to + 1] = 0; }
      }
      this.castling = this.uCa[d]; this.ep = this.uEp[d]; this.half = this.uHalf[d];
      if (us === BLACK) this.full--;
      this.turn = us;
      this.h1 = this.hist1[d]; this.h2 = this.hist2[d];
    }

    // how many times the current position has occurred (this one included)
    repetitions() {
      let n = 1;
      const lim = Math.max(0, this.ply - this.half);
      for (let i = this.ply - 2; i >= lim; i -= 2)
        if (this.hist1[i] === this.h1 && this.hist2[i] === this.h2) n++;
      return n;
    }

    insufficient() {
      let minors = 0, bishopsOn = [0, 0];
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const t = Math.abs(this.sq[s]);
        if (t === P || t === R || t === Q) return false;
        if (t === N) minors++;
        if (t === B) { minors++; bishopsOn[(s + (s >> 4)) & 1]++; }
      }
      if (minors <= 1) return true;
      return minors === (bishopsOn[0] + bishopsOn[1]) && (bishopsOn[0] === 0 || bishopsOn[1] === 0);
    }

    // returns {result:'w'|'b'|'d', reason} or null
    outcome(legal) {
      legal = legal || this.legalMoves();
      if (!legal.length) return this.inCheck() ? { result: this.turn === 1 ? 'b' : 'w', reason: 'checkmate' } : { result: 'd', reason: 'stalemate' };
      if (this.insufficient()) return { result: 'd', reason: 'insufficient' };
      if (this.half >= 100) return { result: 'd', reason: 'fifty' };
      if (this.repetitions() >= 3) return { result: 'd', reason: 'repetition' };
      return null;
    }

    findMove(from, to, promo) {
      const f = typeof from === 'string' ? nameSq(from) : from, t = typeof to === 'string' ? nameSq(to) : to;
      const list = this.legalMoves().filter((m) => mFrom(m) === f && mTo(m) === t);
      if (!list.length) return null;
      if (list.length === 1) return list[0];
      return list.find((m) => mPromo(m) === (promo || Q)) || null;
    }
    isPromotion(from, to) {
      const f = typeof from === 'string' ? nameSq(from) : from, t = typeof to === 'string' ? nameSq(to) : to;
      return this.legalMoves().some((m) => mFrom(m) === f && mTo(m) === t && mPromo(m));
    }
    fromUci(s) {
      return this.findMove(s.slice(0, 2), s.slice(2, 4), s[4] ? PROMO_LETTER[s[4]] : 0);
    }

    // SAN of a legal move (call BEFORE making it)
    san(m, legal) {
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, p = this.sq[from], t = Math.abs(p);
      const isCap = this.sq[to] !== 0 || (t === P && ((to ^ from) & 7) !== 0);
      let s;
      if (t === K && Math.abs(to - from) === 2) s = to > from ? 'O-O' : 'O-O-O';
      else {
        s = t === P ? (isCap ? FILES[from & 7] : '') : LETTERS[t];
        if (t !== P) {
          const others = (legal || this.legalMoves()).filter((x) => x !== m && mTo(x) === to && this.sq[mFrom(x)] === p);
          if (others.length) {
            const sameFile = others.some((x) => (mFrom(x) & 7) === (from & 7));
            const sameRank = others.some((x) => (mFrom(x) >> 4) === (from >> 4));
            if (!sameFile) s += FILES[from & 7];
            else if (!sameRank) s += (from >> 4) + 1;
            else s += sqName(from);
          }
        }
        if (isCap) s += 'x';
        s += sqName(to);
        if (promo) s += '=' + LETTERS[promo];
      }
      this.make(m);
      if (this.inCheck()) s += this.legalMoves().length ? '+' : '#';
      this.unmake();
      return s;
    }

    perft(depth) {
      if (depth === 0) return 1;
      const moves = this.legalMoves();
      if (depth === 1) return moves.length;
      let n = 0;
      for (const m of moves) { this.make(m); n += this.perft(depth - 1); this.unmake(); }
      return n;
    }
  }

  const api = { Board, WHITE, BLACK, P, N, B, R, Q, K, START_FEN, sqName, nameSq, mk, mFrom, mTo, mPromo, uci, KEEP, FILES, LETTERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Chess = api;
})(typeof self !== 'undefined' ? self : this);
