/* Chess Mini App - UI and game flow. Rules: chess.js, computer: worker.js/engine.js, friends: net.js (Firebase REST). */
(function () {
  'use strict';
  const { Board, START_FEN, WHITE, BLACK, P, N, B, R, Q, K, uci, mFrom, mTo, mPromo, sqName } = Chess;
  const { Profile, safe } = Store;
  const T = (k, p) => I18N.t(k, p);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
  const CFG = window.CHESS_CONFIG || {};
  const RAPID = [10, 20, 30, 60], CORR = [1, 3, 7];

  /* ------------------------------------------------------------------ identity / settings */
  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  let guestId = safe.get('chess.guest', null);
  if (!guestId) { guestId = 'g' + Math.random().toString(36).slice(2, 10); safe.set('chess.guest', guestId); }
  const me = { id: tgUser ? String(tgUser.id) : guestId, name: tgUser ? ([tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Player') : 'Player', photo: tgUser && tgUser.photo_url };
  const settings = Object.assign({ lang: tgUser && tgUser.language_code === 'en' ? 'en' : 'uk', theme: 'sand', sound: 1, level: 5, side: 0, tc: { kind: 'rapid', amount: 10 }, sideF: 0 }, safe.get('chess.settings', {}));
  const saveSettings = () => safe.set('chess.settings', settings);

  /* ------------------------------------------------------------------ small helpers */
  let toastTimer = null;
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2400); }
  function haptic(kind) { try { if (!tg || !tg.HapticFeedback) return; if (kind === 'ok') tg.HapticFeedback.notificationOccurred('success'); else if (kind === 'err') tg.HapticFeedback.notificationOccurred('error'); else tg.HapticFeedback.impactOccurred('light'); } catch (e) { /* ignore */ } }
  function showModal(html, bind) { const m = $('#modal'); $('#mbox').innerHTML = html; m.hidden = false; if (bind) bind($('#mbox')); }
  function hideModal() { $('#modal').hidden = true; }
  const newId = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const colorKey = (c) => (c === WHITE ? 'w' : 'b');
  function fmtClock(ms, kind) {
    ms = Math.max(0, ms);
    if (kind === 'corr' && ms >= 36e5) {
      const en = I18N.lang === 'en', d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
      if (d) return en ? `${d}d ${h}h` : `${d}д ${h}г`;
      return en ? `${h}h ${m}m` : `${h}г ${m}хв`;
    }
    const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (x) => String(x).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
  }
  const tcLabel = (tc) => (tc ? (tc.kind === 'corr' ? I18N.days(tc.amount) + ' / ' + T('move_n') : I18N.mins(tc.amount)) : '');

  function applyI18n() {
    $$('[data-i18n]').forEach((el) => { el.textContent = T(el.dataset.i18n); });
    document.title = T('app');
    $('#lvName').textContent = T('level_' + settings.level);
  }

  /* ------------------------------------------------------------------ screens */
  let screen = 'home';
  function show(id) {
    screen = id;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    if (tg) { try { if (id === 'home') tg.BackButton.hide(); else tg.BackButton.show(); } catch (e) { /* old client */ } }
    if (id !== 'game' && id !== 'waiting') stopListening();
    if (id === 'home') renderHome();
    if (id === 'profileScr') renderProfile();
    if (id === 'topScr') renderTop();
    if (id === 'setupFriend') { $('#friendOff').hidden = Net.enabled; $('#friendOn').hidden = !Net.enabled; renderChips(); }
  }
  function goHome() { hideModal(); cancelEngine(); show('home'); }

  /* ================================================================== GAME STATE */
  let G = null;                 // persisted game object (see newGameObject)
  let board = null, sans = [], legal = [], flip = false, selected = -1, targets = {}, lastMove = null, busy = false, busySince = 0, engineId = 0, engineTimer = null;
  let pieceEls = {}, sqEls = {};

  function newGameObject(o) {
    return Object.assign({ id: newId(), mode: 'ai', start: START_FEN, moves: [], myColor: WHITE, level: 5, tc: null, white: null, black: null, status: 'active', result: '', reason: '', clocks: { w: 0, b: 0 }, ts: 0, drawOffer: '', next: '', created: Date.now() }, o);
  }
  function rebuild() {
    board = new Board(G.start || START_FEN); sans = []; lastMove = null;
    for (const u of G.moves) {
      const m = board.fromUci(u);
      if (!m) break;
      sans.push(board.san(m)); board.make(m); lastMove = m;
    }
    legal = board.legalMoves();
  }
  function saveLocal() {
    if (!G) return;
    if (G.mode === 'ai') { if (G.status === 'over') safe.del('chess.ai'); else safe.set('chess.ai', G); }
    else safe.set('chess.pvp.' + G.id, G);
  }
  const turnColor = () => board.turn;
  const isMyTurn = () => G && G.status === 'active' && board.turn === G.myColor;

  /* ------------------------------------------------------------------ opening a game */
  function openGame(g) {
    cancelEngine(); hideModal();
    G = g; flip = G.myColor === BLACK; selected = -1; targets = {}; busy = false;
    rebuild(); show('game'); buildBoard(); renderAll(); startClockTimer();
    if (!G.moves.length) Sound.play('start');
    if (G.mode === 'ai') requestEngine();
    if (G.mode === 'pvp') listenGame(G.id);
  }
  function startAI(level, sideChoice) {
    const side = sideChoice === 0 ? (Math.random() < 0.5 ? WHITE : BLACK) : sideChoice;
    openGame(newGameObject({ mode: 'ai', level, myColor: side, white: { id: side === WHITE ? me.id : 'cpu', name: side === WHITE ? me.name : '' }, black: { id: side === BLACK ? me.id : 'cpu', name: side === BLACK ? me.name : '' } }));
    saveLocal();
  }

  /* ------------------------------------------------------------------ board drawing */
  const fileOf = (s) => s & 7, rankOf = (s) => s >> 4;
  const colOf = (s) => (flip ? 7 - fileOf(s) : fileOf(s)), rowOf = (s) => (flip ? rankOf(s) : 7 - rankOf(s));
  const allSquares = (() => { const a = []; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) a.push(r * 16 + f); return a; })();
  function place(el, s) { el.style.transform = `translate(${colOf(s) * 100}%,${rowOf(s) * 100}%)`; }

  function buildBoard() {
    const bd = $('#board'); bd.innerHTML = ''; sqEls = {}; pieceEls = {};
    for (const s of allSquares) {
      const d = document.createElement('div'); d.className = 'sq'; d.style.left = colOf(s) * 12.5 + '%'; d.style.top = rowOf(s) * 12.5 + '%';
      const dark = (fileOf(s) + rankOf(s)) % 2 === 0;
      if (colOf(s) === 0) { const c = document.createElement('div'); c.className = 'coord r'; c.textContent = rankOf(s) + 1; c.style.color = dark ? 'var(--coord-d)' : 'var(--coord-l)'; d.appendChild(c); }
      if (rowOf(s) === 7) { const c = document.createElement('div'); c.className = 'coord f'; c.textContent = 'abcdefgh'[fileOf(s)]; c.style.color = dark ? 'var(--coord-d)' : 'var(--coord-l)'; d.appendChild(c); }
      bd.appendChild(d); sqEls[s] = d;
    }
    renderPieces(); renderHighlights();
  }
  function makePieceEl(p) {
    const el = document.createElement('div'); el.className = 'pc'; el.innerHTML = pieceSVG(Math.abs(p), p > 0 ? WHITE : BLACK); return el;
  }
  function renderPieces() {
    for (const s in pieceEls) pieceEls[s].remove();
    pieceEls = {};
    for (const s of allSquares) {
      const p = board.sq[s]; if (!p) continue;
      const el = makePieceEl(p); place(el, s); $('#board').appendChild(el); pieceEls[s] = el;
    }
  }
  function renderHighlights() {
    for (const s of allSquares) sqEls[s].className = 'sq';
    if (lastMove) { sqEls[mFrom(lastMove)].classList.add('last'); sqEls[mTo(lastMove)].classList.add('last'); }
    if (selected >= 0) {
      sqEls[selected].classList.add('sel');
      for (const t in targets) { sqEls[t].classList.add('hint'); if (board.sq[t] || (Math.abs(board.sq[selected]) === P && fileOf(+t) !== fileOf(selected))) sqEls[t].classList.add('cap'); }
    }
    if (board.inCheck()) sqEls[board.king[board.turn === 1 ? 0 : 1]].classList.add('chk');
  }
  function computeTargets(from) {
    const t = {};
    for (const m of legal) if (mFrom(m) === from) (t[mTo(m)] = t[mTo(m)] || []).push(m);
    return t;
  }

  /* visual update for one move, then make it on the logical board */
  function applyMove(m) {
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), p = board.sq[from], us = board.turn;
    const el = pieceEls[from]; delete pieceEls[from];
    const info = { capture: board.sq[to] !== 0 || (Math.abs(p) === P && fileOf(from) !== fileOf(to)), castle: Math.abs(p) === K && Math.abs(to - from) === 2, promo: !!promo };
    if (pieceEls[to]) { pieceEls[to].remove(); delete pieceEls[to]; }
    if (Math.abs(p) === P && fileOf(from) !== fileOf(to) && !board.sq[to]) { const cs = to - 16 * us; if (pieceEls[cs]) { pieceEls[cs].remove(); delete pieceEls[cs]; } }
    if (Math.abs(p) === K && Math.abs(to - from) === 2) {
      const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1;
      if (pieceEls[rf]) { pieceEls[rt] = pieceEls[rf]; delete pieceEls[rf]; place(pieceEls[rt], rt); }
    }
    if (el) { pieceEls[to] = el; el.classList.remove('drag'); el.style.zIndex = ''; place(el, to); if (promo) el.innerHTML = pieceSVG(promo, us); }
    sans.push(board.san(m, legal)); board.make(m); lastMove = m; legal = board.legalMoves();
    return info;
  }
  // pick and play the sound for the move that was just made (board/legal already updated)
  function moveSound(info) {
    const chk = board.inCheck();
    if (chk && !legal.length) Sound.play('mate');
    else if (chk) Sound.play('check');
    else if (info.promo) Sound.play('promote');
    else if (info.castle) Sound.play('castle');
    else if (info.capture) Sound.play('capture');
    else Sound.play('move');
  }

  /* ------------------------------------------------------------------ player move flow */
  function commitMove(m, source) {
    if (!G || G.status !== 'active') return;
    selected = -1; targets = {};
    const mover = board.turn;
    moveSound(applyMove(m));
    G.moves.push(uci(m));
    if (G.mode === 'pvp' && source === 'me') updateClocksAfterMove(mover);
    const o = board.outcome(legal);
    haptic(board.inCheck() ? 'ok' : 'tap');
    if (o) finishGame(o.result, o.reason, source === 'me'); else { G.drawOffer = G.mode === 'pvp' && source === 'me' ? '' : G.drawOffer; }
    renderHighlights(); renderBars(); renderMoves(); renderStatus(); renderActions(); renderBanner();
    saveLocal();
    if (G.mode === 'pvp' && source === 'me') pushState();
    if (G.mode === 'ai' && G.status === 'active') requestEngine();
  }
  function tryUserMove(from, to) {
    const ms = targets[to] || computeTargets(from)[to];
    if (!ms) return false;
    if (ms.length > 1 || mPromo(ms[0])) {
      askPromotion(ms[0] && mPromo(ms[0]) ? ms : ms, (promo) => { const m = ms.find((x) => mPromo(x) === promo); if (m) commitMove(m, 'me'); });
      return true;
    }
    commitMove(ms[0], 'me'); return true;
  }
  function askPromotion(ms, cb) {
    const layer = $('#promoLayer'), color = G.myColor;
    layer.innerHTML = '<div class="pbox">' + [Q, R, B, N].map((t) => `<button class="opt" data-t="${t}">${pieceSVG(t, color)}</button>`).join('') + '</div>';
    layer.hidden = false;
    layer.onclick = (e) => { const b = e.target.closest('.opt'); if (!b && e.target !== layer) return; layer.hidden = true; if (b) cb(+b.dataset.t); else { selected = -1; targets = {}; renderHighlights(); } };
  }

  /* ------------------------------------------------------------------ pointer input (tap or drag) */
  (function wireInput() {
    const box = $('.boardbox');
    let drag = null;
    const sqAt = (x, y) => {
      const r = $('#board').getBoundingClientRect();
      const c = Math.floor((x - r.left) / r.width * 8), rw = Math.floor((y - r.top) / r.height * 8);
      if (c < 0 || c > 7 || rw < 0 || rw > 7) return -1;
      const f = flip ? 7 - c : c, rk = flip ? rw : 7 - rw; return rk * 16 + f;
    };
    box.addEventListener('pointerdown', (e) => {
      if (!G || !$('#promoLayer').hidden || $('#modal').hidden === false) return;
      const s = sqAt(e.clientX, e.clientY); if (s < 0) return;
      if (selected >= 0 && targets[s]) { if (tryUserMove(selected, s)) return; }
      const p = board.sq[s];
      if (isMyTurn() && p * G.myColor > 0) {
        const wasSel = selected === s;
        selected = s; targets = computeTargets(s); renderHighlights();
        drag = { s, wasSel, el: pieceEls[s], x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId };
        try { box.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      } else { selected = -1; targets = {}; renderHighlights(); }
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.moved = true;
      const r = $('#board').getBoundingClientRect(), sz = r.width / 8;
      drag.el.classList.add('drag');
      drag.el.style.transform = `translate(${e.clientX - r.left - sz / 2}px,${e.clientY - r.top - sz / 2}px)`;
      const over = sqAt(e.clientX, e.clientY);
      for (const s of allSquares) sqEls[s].classList.toggle('over', s === over && !!targets[s]);
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      for (const s of allSquares) sqEls[s].classList.remove('over');
      if (!d.moved) { if (d.wasSel) { selected = -1; targets = {}; renderHighlights(); } return; }
      const to = sqAt(e.clientX, e.clientY);
      if (to >= 0 && targets[to]) {
        const ok = tryUserMove(d.s, to);
        if (ok) { if (!$('#promoLayer').hidden) { d.el.classList.remove('drag'); place(d.el, d.s); } return; }
      }
      d.el.classList.remove('drag'); place(d.el, d.s); selected = -1; targets = {}; renderHighlights();
    };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  })();

  /* ------------------------------------------------------------------ computer opponent */
  // ---- engine plumbing. Goal: the computer ALWAYS answers, even if the Web Worker misbehaves (slow PC, old WebView, lost message).
  let worker = null, workerFails = 0, pending = null, mainSearcher = null;
  const LEVEL_MS = (lvl) => (ChessEngine.LEVELS[lvl] || ChessEngine.LEVELS[5]).ms;
  function killWorker() { if (worker) { try { worker.terminate(); } catch (e) { /* ignore */ } worker = null; } }
  function makeWorker() {
    if (workerFails >= 3 || typeof Worker === 'undefined') return null;
    try {
      const w = new Worker('js/worker.js');
      w.onmessage = (ev) => { if (pending && ev.data && ev.data.id === pending.id) { const q = pending; pending = null; clearTimeout(q.timer); q.cb(ev.data.error ? null : ev.data.move); } };
      w.onerror = w.onmessageerror = () => { workerFails++; killWorker(); failPending(); };
      return w;
    } catch (e) { workerFails = 9; return null; }
  }
  function runMain(fen, level, cb) {            // fallback: search on the page thread (briefly blocks the UI, but never hangs)
    setTimeout(() => { let mv = null; try { mainSearcher = mainSearcher || new ChessEngine.Searcher(); mv = uci(mainSearcher.think(new Board(fen), level).move); } catch (e) { mv = null; } cb(mv); }, 30);
  }
  function failPending() { if (!pending) return; const q = pending; pending = null; clearTimeout(q.timer); runMain(q.fen, q.level, q.cb); }
  function engineSearch(fen, level, cb) {
    const id = ++engineId;
    if (pending) { clearTimeout(pending.timer); pending = null; }
    const done = (mv) => { if (id === engineId) cb(mv); };
    if (!worker) worker = makeWorker();
    if (!worker) { runMain(fen, level, done); return id; }
    pending = { id, fen, level, cb: done, timer: setTimeout(() => { workerFails = 9; killWorker(); failPending(); }, LEVEL_MS(level) * 2 + 4000) };
    worker.postMessage({ id, fen, level });
    return id;
  }
  function cancelEngine() {
    engineId++; busy = false; clearTimeout(engineTimer);
    if (pending) { clearTimeout(pending.timer); pending = null; killWorker(); }   // a half-finished search must not delay the next one
  }
  function requestEngine() {
    if (!G || G.mode !== 'ai' || G.status !== 'active' || board.turn === G.myColor || !legal.length) { busy = false; renderStatus(); return; }
    busy = true; busySince = Date.now(); renderStatus();
    const t0 = Date.now(), gid = G.id, plies = G.moves.length;
    engineSearch(board.fen(), G.level, (u) => {
      engineTimer = setTimeout(() => {
        busy = false;
        if (!G || G.id !== gid || G.moves.length !== plies || G.status !== 'active') return;
        let m = u ? board.fromUci(u) : null;
        if (!m) m = legal[0];
        commitMove(m, 'engine');
      }, Math.max(0, 450 - (Date.now() - t0)));
    });
  }

  /* ------------------------------------------------------------------ finishing */
  function myOutcome() {
    if (!G || G.result === '' || G.result === 'x') return null;
    if (G.result === 'd') return 'draw';
    return (G.result === 'w') === (G.myColor === WHITE) ? 'win' : 'loss';
  }
  function finishGame(result, reason, iAmWriter) {
    if (G.status === 'over') return;
    G.status = 'over'; G.result = result; G.reason = reason; G.drawOffer = '';
    cancelEngine(); stopClockTimer();
    const oc = myOutcome();
    const pts = oc ? Profile.record(G.id, oc) : null;
    haptic(oc === 'win' ? 'ok' : oc === 'loss' ? 'err' : 'tap');
    if (reason !== 'checkmate') setTimeout(() => Sound.play('over'), 150);
    saveLocal();
    setTimeout(() => showResult(pts), 650);
    if (G.mode === 'pvp' && iAmWriter) pushState();
  }
  function reasonText(r) {
    if (r === 'resign') return G.result && (G.result === 'w') === (G.myColor === WHITE) ? T('why_resign') : T('why_resign_me');
    return T('why_' + r);
  }
  function resultTitle() {
    const oc = myOutcome();
    return oc === 'win' ? T('r_win') : oc === 'loss' ? T('r_loss') : T('r_draw');
  }
  function showResult(pts) {
    if (!G || G.status !== 'over' || screen !== 'game') return;
    const oc = myOutcome(), p = pts != null ? pts : Store.POINTS[oc] || 0;
    showModal(`<h3>${resultTitle()}</h3><p>${reasonText(G.reason)}</p><div class="pts">+${p} ${T('points')}</div>
      <button class="big primary" id="mRematch">${T('rematch')}</button>
      <div class="btnrow"><button class="big" id="mClose">${T('close')}</button><button class="big" id="mMenu">${T('to_menu')}</button></div>`, (box) => {
      $('#mRematch', box).onclick = () => { hideModal(); rematch(); };
      $('#mClose', box).onclick = hideModal; $('#mMenu', box).onclick = goHome;
    });
  }
  function rematch() {
    if (!G) return;
    if (G.mode === 'ai') { startAI(G.level, -G.myColor); return; }
    if (!Net.enabled) return;
    createFriendGame(G.tc, -G.myColor, G.id);
  }

  /* ------------------------------------------------------------------ rendering of bars / status / moves */
  const START_COUNT = { 1: 8, 2: 2, 3: 2, 4: 2, 5: 1 }, VALUE = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9 };
  function materialInfo() {
    const cnt = { 1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, '-1': { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    for (const s of allSquares) { const p = board.sq[s]; if (p && Math.abs(p) < 6) cnt[p > 0 ? 1 : -1][Math.abs(p)]++; }
    const res = { 1: { list: [], pts: 0 }, '-1': { list: [], pts: 0 } };
    for (const c of [1, -1]) for (const t of [5, 4, 3, 2, 1]) { res[c].pts += cnt[c][t] * VALUE[t]; }
    for (const c of [1, -1]) for (const t of [5, 4, 3, 2, 1]) { const miss = Math.max(0, START_COUNT[t] - cnt[-c][t]); for (let i = 0; i < miss; i++) res[c].list.push(t); } // pieces captured BY colour c
    return res;
  }
  function seatName(c) {
    const seat = c === WHITE ? G.white : G.black;
    if (G.mode === 'ai') return c === G.myColor ? me.name : T('computer') + ' · ' + T('level') + ' ' + G.level;
    if (!seat) return '…';
    return seat.id === me.id ? me.name : (seat.name || T('opponent'));
  }
  function renderBars() {
    const bottom = flip ? BLACK : WHITE, top = -bottom, mat = materialInfo();
    for (const [sel, c] of [['#barTop', top], ['#barBot', bottom]]) {
      const bar = $(sel);
      $('.pav', bar).innerHTML = pieceSVG(K, c);
      $('.pn', bar).textContent = seatName(c);
      const adv = mat[c].pts - mat[-c].pts;
      $('.cap', bar).innerHTML = mat[c].list.map((t) => pieceSVG(t, -c)).join('') + (adv > 0 ? `<span class="adv">+${adv}</span>` : '');
    }
    renderClocks();
  }
  function remaining(c) {
    if (!G.tc) return null;
    const base = G.clocks[colorKey(c)];
    if (G.status === 'active' && board.turn === c && G.ts) return base - (Net.now() - G.ts);
    return base;
  }
  function renderClocks() {
    if (!G) return;
    const bottom = flip ? BLACK : WHITE;
    for (const [sel, c] of [['#barTop', -bottom], ['#barBot', bottom]]) {
      const el = $('.clock', $(sel));
      if (G.mode !== 'pvp' || !G.tc) { el.textContent = ''; continue; }
      const rem = remaining(c);
      el.textContent = rem == null ? '' : fmtClock(rem, G.tc.kind);
      const act = G.status === 'active' && board.turn === c;
      el.classList.toggle('active', act); el.classList.toggle('low', act && G.tc.kind === 'rapid' && rem < 20000);
    }
  }
  function renderStatus() {
    const el = $('#gStatus'); if (!G) return;
    let txt = '', cls = '';
    if (G.status === 'over') txt = resultTitle() + ' · ' + reasonText(G.reason);
    else if (G.status === 'waiting') txt = T('waiting_status');
    else if (busy) txt = T('thinking');
    else {
      const mine = isMyTurn();
      txt = (board.inCheck() ? T('check') + ' ' : '') + (G.mode === 'ai' || G.mode === 'pvp' ? (mine ? T('your_turn') : T('opp_turn')) : '');
      cls = mine ? 'me' : '';
      if (board.inCheck()) cls += ' chk';
    }
    el.textContent = txt; el.className = 'status ' + cls;
  }
  function renderMoves() {
    const box = $('#gMoves'); let h = '';
    for (let i = 0; i < sans.length; i++) {
      if (i % 2 === 0) h += `<span class="mv"><span class="no">${i / 2 + 1}.</span>`;
      h += `<span class="m${i === sans.length - 1 ? ' cur' : ''}">${esc(sans[i])}</span>`;
      if (i % 2 === 1 || i === sans.length - 1) h += '</span> ';
    }
    box.innerHTML = h; box.scrollTop = box.scrollHeight; box.scrollLeft = 0;
  }
  function renderActions() {
    const over = G.status !== 'active', ai = G.mode === 'ai';
    $('#aUndo').classList.toggle('hide', !ai || over); $('#aUndo').disabled = !(ai && G.moves.length >= 1);
    $('#aDraw').classList.toggle('hide', over); $('#aDraw').disabled = G.status !== 'active' || (G.mode === 'pvp' && !!G.drawOffer && G.drawOffer === colorKey(G.myColor));
    const rs = $('#aResign'); rs.querySelector('span').textContent = over ? '↻' : '⚑'; rs.querySelector('small').textContent = over ? T('rematch') : T('resign');
    rs.dataset.mode = over ? 'rematch' : 'resign'; rs.classList.toggle('hide', over && G.mode === 'pvp' && !Net.enabled);
  }
  function renderBanner() {
    const el = $('#gBanner'); el.hidden = true; el.innerHTML = '';
    if (!G || G.status !== 'active' || G.mode !== 'pvp') { if (G && G.mode === 'pvp' && G.status === 'over' && G.next && !G.nextSeen) offerRematchJoin(); return; }
    if (G.drawOffer && G.drawOffer !== colorKey(G.myColor)) {
      el.hidden = false;
      el.innerHTML = `<span>½ ${T('draw_offered')}</span><button id="bAcc">${T('accept')}</button><button class="no" id="bDec">${T('decline')}</button>`;
      $('#bAcc').onclick = () => { finishGame('d', 'agreement', true); renderAll(); };
      $('#bDec').onclick = () => { G.drawOffer = ''; pushState(); renderBanner(); toast(T('draw_declined')); };
    } else if (G.drawOffer) { el.hidden = false; el.innerHTML = `<span>${T('draw_wait')}</span>`; }
  }
  function renderAll() {
    if (screen !== 'game' || !G || !board) return;
    renderHighlights(); renderBars(); renderMoves(); renderStatus(); renderActions(); renderBanner();
  }

  /* ------------------------------------------------------------------ action buttons */
  $('#aMenu').onclick = goHome;
  $('#aFlip').onclick = () => { flip = !flip; selected = -1; targets = {}; buildBoard(); renderBars(); };
  $('#aUndo').onclick = () => {
    if (!G || G.mode !== 'ai' || G.status !== 'active' || !G.moves.length) return;
    cancelEngine();
    const n = board.turn === G.myColor ? Math.min(2, G.moves.length) : 1;
    G.moves.splice(G.moves.length - n, n); selected = -1; targets = {};
    rebuild(); renderPieces(); renderAll(); saveLocal(); requestEngine();
  };
  $('#aDraw').onclick = () => {
    if (!G || G.status !== 'active') return;
    if (G.mode === 'ai') {
      const cc = -G.myColor, ev = ChessEngine.evaluate(board) * (board.turn === cc ? 1 : -1);
      if (ev <= -120 || (ev <= 0 && G.level <= 3 && Math.random() < 0.5)) { toast(T('draw_ai_yes')); finishGame('d', 'agreement', true); renderAll(); } else toast(T('draw_ai_no'));
    } else { G.drawOffer = colorKey(G.myColor); pushState(); renderBanner(); renderActions(); toast(T('draw_sent')); }
  };
  $('#aResign').onclick = () => {
    if (!G) return;
    if ($('#aResign').dataset.mode === 'rematch') { rematch(); return; }
    if (G.status !== 'active') return;
    showModal(`<h3>${T('resign')}</h3><p>${T('confirm_resign')}</p><div class="btnrow"><button class="big" id="mNo">${T('no')}</button><button class="big primary" id="mYes">${T('yes')}</button></div>`, (box) => {
      $('#mNo', box).onclick = hideModal;
      $('#mYes', box).onclick = () => { hideModal(); finishGame(G.myColor === WHITE ? 'b' : 'w', 'resign', true); renderAll(); };
    });
  };

  /* ================================================================== FRIEND GAMES (Firebase) */
  let stopListen = null, clockTimer = null, timeoutBusy = false, pendingPush = false;
  function stopListening() { if (stopListen) { stopListen(); stopListen = null; } }
  function listenGame(gid) { stopListening(); stopListen = Net.listen('games/' + gid, () => refreshGame(gid)); refreshGame(gid); }
  const startMs = (tc) => (tc.kind === 'corr' ? tc.amount * 864e5 : tc.amount * 6e4);
  function docToGame(doc, gid) {
    const g = newGameObject({ id: gid, mode: 'pvp', start: doc.start || START_FEN, moves: (doc.moves || '').split(' ').filter(Boolean), tc: doc.tc, white: doc.white || null, black: doc.black || null, status: doc.status || 'waiting', result: doc.result || '', reason: doc.reason || '', clocks: doc.clocks || { w: 0, b: 0 }, ts: doc.ts || 0, drawOffer: doc.drawOffer || '', next: doc.next || '', created: doc.created });
    g.myColor = g.white && g.white.id === me.id ? WHITE : g.black && g.black.id === me.id ? BLACK : WHITE;
    return g;
  }
  async function refreshGame(gid) {
    if (!Net.enabled) return;
    let doc; try { doc = await Net.get('games/' + gid); } catch (e) { return; }
    if (!doc || !G || G.id !== gid) return;
    applyDoc(doc);
  }
  function applyDoc(doc) {
    const was = G.status, remote = docToGame(doc, G.id);
    // seats / clocks / flags always follow the server
    G.white = remote.white; G.black = remote.black; G.tc = remote.tc; G.clocks = remote.clocks; G.ts = remote.ts; G.next = remote.next;
    G.myColor = remote.myColor;
    const localPrefix = G.moves.every((u, i) => remote.moves[i] === u);
    if (!localPrefix || remote.moves.length < G.moves.length) {
      if (remote.moves.length >= G.moves.length || !localPrefix) { G.moves = remote.moves; rebuild(); renderPieces(); }
    } else if (remote.moves.length > G.moves.length) {
      for (let i = G.moves.length; i < remote.moves.length; i++) { const m = board.fromUci(remote.moves[i]); if (!m) { G.moves = remote.moves; rebuild(); renderPieces(); break; } commitRemote(m); }
    }
    G.drawOffer = remote.drawOffer;
    if (was === 'waiting' && remote.status === 'active') { G.status = 'active'; toast(T('opp_joined')); haptic('ok'); if (screen === 'waiting') { flip = G.myColor === BLACK; show('game'); buildBoard(); startClockTimer(); } }
    if (remote.status === 'over' && G.status !== 'over') { G.status = 'active'; finishGame(remote.result, remote.reason, false); }
    else if (remote.status === 'active') G.status = 'active';
    if (screen === 'waiting') renderWaiting();
    saveLocal(); renderAll();
  }
  function commitRemote(m) {
    const mover = board.turn;
    selected = -1; targets = {};
    moveSound(applyMove(m)); G.moves.push(uci(m)); haptic('tap');
  }
  function updateClocksAfterMove(mover) {
    const now = Net.now();
    if (G.tc.kind === 'rapid') G.clocks[colorKey(mover)] = Math.max(0, G.clocks[colorKey(mover)] - (now - G.ts));
    else { G.clocks.w = G.clocks.b = startMs(G.tc); }
    G.ts = now;
  }
  async function pushState(tries) {
    if (!Net.enabled || !G || G.mode !== 'pvp') return;
    const body = { moves: G.moves.join(' '), clocks: G.clocks, ts: G.ts, drawOffer: G.drawOffer || '', status: G.status, result: G.result || '', reason: G.reason || '' };
    try { await Net.patch('games/' + G.id, body); pendingPush = false; }
    catch (e) { pendingPush = true; if ((tries || 0) < 6) setTimeout(() => pushState((tries || 0) + 1), 2500); else toast(T('error_net')); }
  }
  async function createFriendGame(tc, sideChoice, prevId) {
    if (!Net.enabled) { toast(T('friend_off')); return; }
    const side = sideChoice === 0 ? (Math.random() < 0.5 ? WHITE : BLACK) : sideChoice;
    const g = newGameObject({ mode: 'pvp', tc, myColor: side, status: 'waiting', clocks: { w: startMs(tc), b: startMs(tc) } });
    g[side === WHITE ? 'white' : 'black'] = { id: me.id, name: me.name };
    const doc = { created: g.created, start: g.start, tc, white: g.white, black: g.black, moves: '', status: 'waiting', result: '', reason: '', clocks: g.clocks, ts: 0, drawOffer: '' };
    try {
      await Net.put('games/' + g.id, doc);
      if (prevId) Net.patch('games/' + prevId, { next: g.id }).catch(() => {});
      Net.put(`players/${me.id}/games/${g.id}`, g.created).catch(() => {});
    } catch (e) { toast(T('error_net')); return; }
    rememberGame(g.id); G = g; rebuild(); saveLocal();
    show('waiting'); renderWaiting(); listenGame(g.id);
  }
  async function joinFriendGame(gid) {
    gid = (gid || '').trim().toUpperCase();
    if (!gid) return;
    if (!Net.enabled) { toast(T('friend_off')); return; }
    let doc; try { doc = await Net.get('games/' + gid); } catch (e) { toast(T('error_net')); return; }
    if (!doc) { toast(T('game_not_found')); return; }
    const amWhite = doc.white && doc.white.id === me.id, amBlack = doc.black && doc.black.id === me.id;
    if (!amWhite && !amBlack) {
      if (doc.status !== 'waiting' || (doc.white && doc.black)) { toast(T('game_full')); return; }
      const seat = doc.white ? 'black' : 'white', now = Net.now();
      try { await Net.patch('games/' + gid, { [seat]: { id: me.id, name: me.name }, status: 'active', ts: now }); await Net.put(`players/${me.id}/games/${gid}`, now); doc = await Net.get('games/' + gid); }
      catch (e) { toast(T('error_net')); return; }
    }
    rememberGame(gid);
    const g = docToGame(doc, gid);
    if (g.status === 'waiting') { G = g; rebuild(); show('waiting'); renderWaiting(); listenGame(gid); return; }
    openGame(g);
  }
  function offerRematchJoin() {
    if (!G || G.nextSeen) return; G.nextSeen = true;
    const nid = G.next;
    showModal(`<h3>${T('rematch')}?</h3><p>${esc(seatName(-G.myColor))}</p><div class="btnrow"><button class="big" id="mNo">${T('no')}</button><button class="big primary" id="mYes">${T('join')}</button></div>`, (box) => {
      $('#mNo', box).onclick = hideModal; $('#mYes', box).onclick = () => { hideModal(); joinFriendGame(nid); };
    });
  }
  function rememberGame(gid) { const l = safe.get('chess.mygames', []); if (!l.includes(gid)) { l.unshift(gid); safe.set('chess.mygames', l.slice(0, 30)); } }

  /* waiting screen */
  const inviteLink = (gid) => (CFG.TG_APP_LINK ? CFG.TG_APP_LINK.replace(/\/+$/, '') + '?startapp=g_' + gid : '');
  function renderWaiting() {
    $('#waitCode').textContent = G.id;
    $('#waitInfo').textContent = `${T('your_color_is')}: ${G.myColor === WHITE ? T('white') : T('black')} · ${tcLabel(G.tc)}`;
  }
  $('#btnShare').onclick = () => {
    const link = inviteLink(G.id), text = `♟ ${T('app')}: ${T('code')} ${G.id}`;
    if (link && tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text));
    else if (navigator.share) navigator.share({ title: T('app'), text: link ? text + '\n' + link : text }).catch(() => {});
    else copyText(link || G.id);
  };
  $('#btnCopy').onclick = () => copyText(G.id);
  $('#btnCancelWait').onclick = async () => {
    const gid = G && G.id; cancelEngine();
    if (gid && Net.enabled) { try { await Net.del('games/' + gid); await Net.del(`players/${me.id}/games/${gid}`); } catch (e) { /* ignore */ } }
    safe.del('chess.pvp.' + gid); G = null; goHome();
  };
  function copyText(t) {
    const done = () => toast(T('copied'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); done(); }
  }

  /* chess clocks for friend games */
  function startClockTimer() { stopClockTimer(); if (G && G.mode === 'pvp') clockTimer = setInterval(clockTick, 500); }
  function stopClockTimer() { clearInterval(clockTimer); clockTimer = null; }
  function canMate(color) {
    let minors = 0;
    for (const s of allSquares) { const p = board.sq[s] * color; if (p === P || p === R || p === Q) return true; if (p === N || p === B) minors++; }
    return minors >= 2;
  }
  function clockTick() {
    if (!G || G.mode !== 'pvp' || screen !== 'game') return;
    renderClocks();
    if (G.status === 'active' && G.tc && G.ts && remaining(board.turn) <= 0 && !timeoutBusy) claimTimeout();
  }
  async function claimTimeout() {
    timeoutBusy = true;
    try {
      const gid = G.id, doc = await Net.get('games/' + gid);
      if (!doc || doc.status !== 'active' || !G || G.id !== gid) return;
      const loser = board.turn, winner = -loser;
      const result = canMate(winner) ? (winner === WHITE ? 'w' : 'b') : 'd';
      if (G.moves.length !== (doc.moves || '').split(' ').filter(Boolean).length) { applyDoc(doc); return; }
      const rem = (doc.clocks[colorKey(loser)] || 0) - (Net.now() - doc.ts);
      if (rem > 0) return;
      await Net.patch('games/' + gid, { status: 'over', result, reason: 'timeout' });
      G.clocks[colorKey(loser)] = 0; finishGame(result, 'timeout', false); renderAll();
    } catch (e) { /* retry on the next tick */ }
    finally { setTimeout(() => { timeoutBusy = false; }, 3000); }
  }

  /* ------------------------------------------------------------------ self-healing heartbeat (every second while a game is open) */
  function domMatchesBoard() {
    const els = $$('#board .pc'); let n = 0;
    for (const sq of allSquares) if (board.sq[sq]) n++;
    if (els.length !== n) return false;
    for (const sq of allSquares) if (board.sq[sq] && !pieceEls[sq]) return false;
    return true;
  }
  function heartbeat() {
    if (!G || screen !== 'game' || !board) return;
    try {
      if (!domMatchesBoard()) { renderPieces(); renderAll(); }
      if (G.mode === 'ai' && G.status === 'active' && board.turn !== G.myColor && legal.length) {
        // computer should be thinking; if nothing is pending (lost callback) or it took far too long, start again
        if (!busy || (Date.now() - busySince > LEVEL_MS(G.level) * 3 + 9000)) { cancelEngine(); requestEngine(); }
      }
      if (G.status === 'active') { const o = board.outcome(legal); if (o) { finishGame(o.result, o.reason, G.mode === 'pvp'); renderAll(); } }
    } catch (e) { /* keep the loop alive */ }
  }
  setInterval(heartbeat, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(heartbeat, 100); });
  window.addEventListener('focus', () => setTimeout(heartbeat, 100));

  /* ================================================================== HOME / PROFILE / TOP */
  async function renderHome() {
    const box = $('#continueBox'), list = $('#continueList'); list.innerHTML = ''; box.hidden = true;
    const cards = [];
    const ai = safe.get('chess.ai', null);
    if (ai && ai.status === 'active' && ai.moves) cards.push(cardAI(ai));
    const gids = new Set(safe.get('chess.mygames', []));
    const cached = [];
    for (const gid of gids) { const g = safe.get('chess.pvp.' + gid, null); if (g && g.status !== 'over') cached.push(g); }
    const addCards = (arr) => { list.innerHTML = ''; arr.forEach((c) => list.appendChild(c)); box.hidden = !arr.length; };
    cached.forEach((g) => cards.push(cardPVP(g)));
    addCards(cards);
    if (!Net.enabled) return;
    // refresh friend games from the server
    try {
      const remoteList = (await Net.get(`players/${me.id}/games`)) || {};
      Object.keys(remoteList).forEach((g) => gids.add(g));
      const docs = await Promise.all(Array.from(gids).map((gid) => Net.get('games/' + gid).then((d) => [gid, d]).catch(() => [gid, undefined])));
      const fresh = [];
      for (const [gid, d] of docs) {
        if (d === undefined) continue;
        if (!d) { safe.del('chess.pvp.' + gid); continue; }
        const g = docToGame(d, gid); safe.set('chess.pvp.' + gid, g);
        if (g.status !== 'over') fresh.push(g);
      }
      if (screen !== 'home') return;
      const out = []; if (ai && ai.status === 'active' && ai.moves) out.push(cardAI(ai));
      fresh.sort((a, b) => (b.ts || b.created) - (a.ts || a.created)).forEach((g) => out.push(cardPVP(g)));
      addCards(out);
      safe.set('chess.mygames', fresh.map((g) => g.id));
    } catch (e) { /* offline - keep cached cards */ }
  }
  function mkCard(icon, title, sub, cls, onclick) {
    const b = document.createElement('button'); b.className = 'card ' + cls;
    b.innerHTML = `<span class="ci">${icon}</span><span class="ct"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="go">›</span>`; b.onclick = onclick; return b;
  }
  function cardAI(g) {
    const n = Math.ceil(g.moves.length / 2), b = new Board(g.start); for (const u of g.moves) { const m = b.fromUci(u); if (!m) break; b.make(m); }
    const mine = b.turn === g.myColor;
    return mkCard('🖥', `${T('vs_computer')} · ${T('level')} ${g.level}`, `${T('move_n')} ${n || 1} · ${mine ? T('your_move') : T('their_move')}`, mine ? '' : 'wait', () => openGame(g));
  }
  function cardPVP(g) {
    const opp = g.myColor === WHITE ? g.black : g.white;
    if (g.status === 'waiting') return mkCard('⏳', `${T('code')} ${g.id}`, `${T('waiting_friend')} · ${tcLabel(g.tc)}`, 'wait', () => { G = g; rebuild(); show('waiting'); renderWaiting(); listenGame(g.id); });
    const b = new Board(g.start); for (const u of g.moves) { const m = b.fromUci(u); if (!m) break; b.make(m); }
    const mine = b.turn === g.myColor;
    let sub = `${mine ? T('your_move') : T('their_move')} · ${tcLabel(g.tc)}`;
    if (g.tc && g.ts) { const rem = g.clocks[b.turn === 1 ? 'w' : 'b'] - (Net.now() - g.ts); sub += ' · ' + fmtClock(rem, g.tc.kind); }
    return mkCard('👥', opp && opp.name ? opp.name : T('opponent'), sub, mine ? '' : 'wait', () => openGame(g));
  }
  function renderProfile() {
    const d = Profile.data;
    $('#pName').textContent = me.name; $('#pRate').textContent = d.pts; $('#pPlayed').textContent = d.played; $('#pW').textContent = d.w; $('#pD').textContent = d.d; $('#pL').textContent = d.l;
    const av = $('#pAvatar'); if (me.photo) { av.style.backgroundImage = `url("${me.photo}")`; av.textContent = ''; } else { av.style.backgroundImage = ''; av.textContent = '♟'; }
    Profile.pull().then(() => { const x = Profile.data; $('#pRate').textContent = x.pts; $('#pPlayed').textContent = x.played; $('#pW').textContent = x.w; $('#pD').textContent = x.d; $('#pL').textContent = x.l; });
  }
  async function renderTop() {
    const box = $('#topList'); box.innerHTML = `<div class="empty">${T('loading')}</div>`;
    try {
      const rows = await Profile.top(30);
      box.innerHTML = rows.length ? rows.map((r, i) => `<div class="toprow${r.id === me.id ? ' me' : ''}"><span class="n">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="nm">${esc(r.name)}</span><span class="sc">${r.pts}</span></div>`).join('') : `<div class="empty">${T('no_players')}</div>`;
    } catch (e) { box.innerHTML = `<div class="empty">${T('error_net')}</div>`; }
  }

  /* ================================================================== SETUP SCREENS */
  function segSet(sel, value, cb) {
    const seg = $(sel);
    const paint = () => $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.v === String(value())));
    seg.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cb(b.dataset.v); paint(); };
    paint(); return paint;
  }
  function renderChips() {
    const mk = (box, arr, kind, label) => {
      box.innerHTML = arr.map((n) => `<button class="chip${settings.tc.kind === kind && settings.tc.amount === n ? ' on' : ''}" data-k="${kind}" data-n="${n}">${label(n)}</button>`).join('');
    };
    mk($('#chipsRapid'), RAPID, 'rapid', (n) => I18N.mins(n)); mk($('#chipsCorr'), CORR, 'corr', (n) => I18N.days(n));
  }
  $('#chipsRapid').onclick = $('#chipsCorr').onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; settings.tc = { kind: c.dataset.k, amount: +c.dataset.n }; saveSettings(); renderChips(); };
  $('#lvRange').oninput = (e) => { settings.level = +e.target.value; $('#lvNum').textContent = settings.level; $('#lvName').textContent = T('level_' + settings.level); saveSettings(); };
  $('#goAI').onclick = () => startAI(settings.level, settings.side);
  $('#goFriend').onclick = () => createFriendGame(settings.tc, settings.sideF);
  $('#goJoin').onclick = () => joinFriendGame($('#joinCode').value);
  $('#joinCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinFriendGame($('#joinCode').value); });
  $('#btnAI').onclick = () => { $('#lvRange').value = settings.level; $('#lvNum').textContent = settings.level; $('#lvName').textContent = T('level_' + settings.level); show('setupAI'); };
  $('#btnFriend').onclick = () => show('setupFriend');
  $('#btnProfile').onclick = () => show('profileScr');
  $('#btnTop').onclick = () => show('topScr');
  $$('[data-go]').forEach((b) => { b.onclick = () => (b.dataset.go === 'home' ? goHome() : show(b.dataset.go)); });
  segSet('#segSideAI', () => settings.side, (v) => { settings.side = +v; saveSettings(); });
  segSet('#segSideF', () => settings.sideF, (v) => { settings.sideF = +v; saveSettings(); });
  segSet('#segLang', () => settings.lang, (v) => { settings.lang = v; I18N.set(v); saveSettings(); applyI18n(); renderChips(); if (screen === 'home') renderHome(); });
  segSet('#segSound', () => settings.sound, (v) => { settings.sound = +v; Sound.enabled = !!settings.sound; saveSettings(); Sound.play('move'); });
  segSet('#segTheme', () => settings.theme, (v) => { settings.theme = v; document.documentElement.dataset.theme = v; saveSettings(); });

  /* ================================================================== BOOT */
  function setViewport() {
    const h = tg && tg.viewportStableHeight ? tg.viewportStableHeight : window.innerHeight;
    document.documentElement.style.setProperty('--vh', h + 'px');
  }
  window.addEventListener('resize', setViewport);
  window.addEventListener('orientationchange', () => setTimeout(setViewport, 150));
  window.addEventListener('pagehide', saveLocal);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveLocal(); else if (G && G.mode === 'pvp') refreshGame(G.id); });

  async function boot() {
    I18N.set(settings.lang); document.documentElement.dataset.theme = settings.theme; Sound.enabled = !!settings.sound;
    if (tg) {
      try { tg.ready(); tg.expand(); tg.setHeaderColor('#262421'); tg.setBackgroundColor('#262421'); if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); tg.BackButton.onClick(() => { if (screen === 'home') return; goHome(); }); tg.onEvent('viewportChanged', setViewport); } catch (e) { /* older client */ }
    }
    setViewport(); applyI18n(); Profile.init(me.id, me.name);
    window.__chess = { get G() { return G; }, get board() { return board; }, me, Profile, Sound, show, openGame, startAI, commitMove, tryUserMove, get screen() { return screen; } };
    show('home');
    await Net.syncClock(); Profile.pull();
    const param = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || new URLSearchParams(location.search).get('join') || (location.hash.match(/join=([A-Za-z0-9]+)/) || [])[1] || '';
    const code = param.replace(/^g_/, '');
    if (code && code !== safe.get('chess.lastJoin', '')) { safe.set('chess.lastJoin', code); joinFriendGame(code); }
    else renderHome();
  }
  boot();
})();
