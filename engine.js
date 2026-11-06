/* engine.js - alpha-beta chess engine with 10 strength levels. Runs inside a Web Worker (or Node). */
(function (root) {
  'use strict';
  const C = typeof require !== 'undefined' ? require('./chess.js') : root.Chess;
  const { Board, P, N, B, R, Q, K } = C;
  const INF = 30000, MATE = 29000;

  // level: depth (max plies), ms (time cap), margin (levels 1-5 pick randomly among moves within `margin` centipawns of the best)
  const LEVELS = {
    1: { depth: 1, ms: 300, margin: 450 },
    2: { depth: 1, ms: 300, margin: 220 },
    3: { depth: 2, ms: 400, margin: 130 },
    4: { depth: 2, ms: 500, margin: 60 },
    5: { depth: 3, ms: 700, margin: 50 },
    6: { depth: 4, ms: 600, margin: 0 },
    7: { depth: 5, ms: 800, margin: 0 },
    8: { depth: 6, ms: 1100, margin: 0 },
    9: { depth: 8, ms: 1800, margin: 0 },
    10: { depth: 14, ms: 3600, margin: 0 },
  };

  const VAL = [0, 100, 320, 330, 500, 900, 0];
  // piece-square tables from white's point of view, listed rank 8 -> rank 1
  const PST = {
    1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  const KING_END = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
  // flat lookup indexed by 0x88 square, per piece type and colour
  const T = {};
  for (const t of [1, 2, 3, 4, 5, 6, 7]) {
    T[t] = [new Int16Array(128), new Int16Array(128)];
    const src = t === 7 ? KING_END : PST[t];
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      T[t][0][r * 16 + f] = src[(7 - r) * 8 + f];
      T[t][1][r * 16 + f] = src[r * 8 + f];
    }
  }

  function evaluate(b) {
    const sq = b.sq;
    let score = 0, mat = 0, bishops = [0, 0];
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = sq[s];
      if (!p) continue;
      const t = p > 0 ? p : -p;
      if (t !== K && t !== P) mat += VAL[t];
      if (t === B) bishops[p > 0 ? 0 : 1]++;
    }
    const endgame = mat <= 2600;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = sq[s];
      if (!p) continue;
      const white = p > 0, t = white ? p : -p, ci = white ? 0 : 1;
      let v = VAL[t] + T[t === K && endgame ? 7 : t][ci][s];
      if (t === P) { // passed-pawn bonus
        const dir = white ? 16 : -16, rank = white ? (s >> 4) : 7 - (s >> 4);
        let passed = true;
        for (let ahead = s + dir; !(ahead & 0x88) && passed; ahead += dir)
          for (let df = -1; df <= 1; df++) { const x = ahead + df; if (!(x & 0x88) && sq[x] === -p) { passed = false; break; } }
        if (passed) v += rank * rank * 2;
      }
      score += white ? v : -v;
    }
    if (bishops[0] >= 2) score += 30;
    if (bishops[1] >= 2) score -= 30;
    return b.turn === 1 ? score : -score;
  }

  class Searcher {
    constructor() {
      this.size = 1 << 18;
      this.tk = new Int32Array(this.size); this.tv = new Int16Array(this.size); this.td = new Int8Array(this.size);
      this.tf = new Int8Array(this.size); this.tm = new Int32Array(this.size);
      this.killers = new Int32Array(128 * 2); this.hist = new Int32Array(2 * 128 * 128);
    }
    scoreMove(b, m, ply, ttMove) {
      if (m === ttMove) return 1e7;
      const to = (m >> 7) & 127, from = m & 127, cap = b.sq[to], promo = (m >> 14) & 7;
      if (cap) return 1e6 + Math.abs(cap) * 16 - Math.abs(b.sq[from]);
      if (promo) return 9e5 + promo;
      if (m === this.killers[ply * 2]) return 8e5;
      if (m === this.killers[ply * 2 + 1]) return 7e5;
      return this.hist[(b.turn === 1 ? 0 : 16384) + from * 128 + to];
    }
    order(b, moves, ply, ttMove) {
      const sc = moves.map((m) => this.scoreMove(b, m, ply, ttMove));
      const idx = moves.map((_, i) => i).sort((x, y) => sc[y] - sc[x]);
      return idx.map((i) => moves[i]);
    }
    timeUp() {
      if (this.stop) return true;
      if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
      return this.stop;
    }
    qsearch(b, alpha, beta, ply) {
      if (this.timeUp()) return 0;
      const inChk = b.inCheck();
      let best = -INF;
      if (!inChk) {
        best = evaluate(b);
        if (best >= beta) return best;
        if (best > alpha) alpha = best;
      }
      const moves = this.order(b, b.gen([], !inChk), ply, 0);
      const us = b.turn;
      let any = false;
      for (const m of moves) {
        if (!inChk) { const cap = Math.abs(b.sq[(m >> 7) & 127]); if (best + VAL[cap] + 200 < alpha && !((m >> 14) & 7)) continue; }
        b.make(m);
        if (b.attacked(b.king[us === 1 ? 0 : 1], -us)) { b.unmake(); continue; }
        any = true;
        const v = -this.qsearch(b, -beta, -alpha, ply + 1);
        b.unmake();
        if (this.stop) return 0;
        if (v > best) best = v;
        if (v > alpha) { alpha = v; if (alpha >= beta) break; }
      }
      if (inChk && !any) return -MATE + ply;
      return best;
    }
    search(b, depth, alpha, beta, ply, allowNull) {
      if (this.timeUp()) return 0;
      const pv = beta - alpha > 1;
      if (ply > 0) {
        if (b.half >= 100 || b.repetitions() >= 2 || b.insufficient()) return 0;
        alpha = Math.max(alpha, -MATE + ply); beta = Math.min(beta, MATE - ply - 1);
        if (alpha >= beta) return alpha;
      }
      const inChk = b.inCheck();
      if (inChk) depth++;
      if (depth <= 0) return this.qsearch(b, alpha, beta, ply);
      const slot = (b.h1 >>> 0) & (this.size - 1);
      let ttMove = 0;
      if (this.tk[slot] === b.h2 && this.tf[slot] !== 0) {
        ttMove = this.tm[slot];
        if (this.td[slot] >= depth && !pv && ply > 0) {
          let v = this.tv[slot];
          if (v > MATE - 200) v -= ply; else if (v < -MATE + 200) v += ply;
          const f = this.tf[slot];
          if (f === 1 || (f === 2 && v >= beta) || (f === 3 && v <= alpha)) return v;
        }
      }
      const us = b.turn;
      if (allowNull && !inChk && !pv && depth >= 3) {
        let mat = 0;
        for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = b.sq[s] * us; if (p > 1 && p < 6) mat++; }
        if (mat > 0 && evaluate(b) >= beta) {
          const ep = b.ep;
          b.turn = -us; b.ep = -1; b.h1 ^= 1; // cheap fake hash change so the null position is not confused with a real one
          const v = -this.search(b, depth - 3, -beta, -beta + 1, ply + 1, false);
          b.turn = us; b.ep = ep; b.h1 ^= 1;
          if (this.stop) return 0;
          if (v >= beta) return v >= MATE - 200 ? beta : v;
        }
      }
      const moves = this.order(b, b.gen([], false), ply, ttMove);
      let best = -INF, bestMove = 0, legal = 0;
      const origAlpha = alpha;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i], cap = b.sq[(m >> 7) & 127] !== 0;
        b.make(m);
        if (b.attacked(b.king[us === 1 ? 0 : 1], -us)) { b.unmake(); continue; }
        legal++;
        let v;
        const quiet = !cap && !((m >> 14) & 7);
        if (legal === 1) v = -this.search(b, depth - 1, -beta, -alpha, ply + 1, true);
        else {
          let red = 0;
          if (depth >= 3 && legal > 4 && quiet && !inChk) red = 1;
          v = -this.search(b, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
          if (v > alpha && !this.stop) v = -this.search(b, depth - 1, -beta, -alpha, ply + 1, true);
        }
        b.unmake();
        if (this.stop) return 0;
        if (v > best) { best = v; bestMove = m; }
        if (v > alpha) {
          alpha = v;
          if (alpha >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
              this.hist[(us === 1 ? 0 : 16384) + (m & 127) * 128 + ((m >> 7) & 127)] += depth * depth;
            }
            break;
          }
        }
      }
      if (!legal) return inChk ? -MATE + ply : 0;
      let flag = 1;
      if (best <= origAlpha) flag = 3; else if (best >= beta) flag = 2;
      let sv = best;
      if (sv > MATE - 200) sv += ply; else if (sv < -MATE + 200) sv -= ply;
      this.tk[slot] = b.h2; this.tv[slot] = sv; this.td[slot] = depth; this.tf[slot] = flag; this.tm[slot] = bestMove;
      return best;
    }

    // returns { move, score }
    think(b, level, rng) {
      rng = rng || Math.random;
      const cfg = LEVELS[Math.max(1, Math.min(10, level))];
      const legal = b.legalMoves();
      if (!legal.length) return { move: 0, score: 0 };
      if (legal.length === 1) return { move: legal[0], score: 0 };
      this.tk.fill(0); this.tf.fill(0); this.killers.fill(0); this.hist.fill(0);
      this.nodes = 0; this.stop = false; this.deadline = Date.now() + cfg.ms;

      if (cfg.margin > 0) {                       // weak levels: score every root move, then pick one of the decent ones at random
        const scored = [], total = Date.now() + cfg.ms * 2;   // one overall budget for ALL root moves
        for (const m of legal) {
          b.make(m);
          let v;
          const o = b.outcome();
          if (o) v = o.result === 'd' ? 0 : MATE;
          else if (Date.now() > total) v = -evaluate(b);              // out of time: static score only
          else { this.stop = false; this.deadline = Math.min(total, Date.now() + cfg.ms); v = -this.search(b, cfg.depth - 1, -INF, INF, 1, true); if (this.stop) v = -evaluate(b); }
          b.unmake();
          scored.push([v, m]);
        }
        scored.sort((x, y) => y[0] - x[0]);
        const best = scored[0][0];
        if (best >= MATE - 200) return { move: scored[0][1], score: best };   // always finish a forced mate
        const pool = scored.filter((x) => x[0] >= best - cfg.margin);
        return { move: pool[Math.floor(rng() * pool.length)][1], score: best };
      }

      let bestMove = legal[0], bestScore = 0;
      let rootMoves = this.order(b, legal, 0, 0);
      for (let d = 1; d <= cfg.depth; d++) {
        let alpha = -INF, bestHere = 0, scoreHere = -INF;
        for (let i = 0; i < rootMoves.length; i++) {
          const m = rootMoves[i];
          b.make(m);
          let v;
          if (i === 0) v = -this.search(b, d - 1, -INF, -alpha, 1, true);
          else {
            v = -this.search(b, d - 1, -alpha - 1, -alpha, 1, true);
            if (v > alpha && !this.stop) v = -this.search(b, d - 1, -INF, -alpha, 1, true);
          }
          b.unmake();
          if (this.stop) break;
          if (i === 0 || v > alpha) { alpha = Math.max(alpha, v); }
          if (v > scoreHere) { scoreHere = v; bestHere = m; }
        }
        if (this.stop) { if (bestHere && scoreHere > bestScore - 150) { bestMove = bestHere; bestScore = scoreHere; } break; }
        bestMove = bestHere; bestScore = scoreHere;
        rootMoves = [bestHere].concat(rootMoves.filter((x) => x !== bestHere));
        if (Math.abs(bestScore) > MATE - 200) break;
        if (Date.now() > this.deadline) break;
      }
      return { move: bestMove, score: bestScore };
    }
  }

  const api = { LEVELS, Searcher, evaluate, MATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ChessEngine = api;
})(typeof self !== 'undefined' ? self : this);
