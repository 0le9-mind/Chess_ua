/* sound.js - chess sounds synthesised with the Web Audio API (no audio files needed).
   Sound.play('move'|'capture'|'castle'|'check'|'mate'|'promote'|'over') */
(function () {
  'use strict';
  let ctx = null, master = null, noiseBuf = null;
  const Sound = { enabled: true, volume: 0.9 };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = Sound.volume;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    return ctx;
  }
  function noise(c) {
    if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
    const len = Math.floor(c.sampleRate * 0.25); noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuf.getChannelData(0); let s = 12345;
    for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    return noiseBuf;
  }

  // ---- building blocks (take any BaseAudioContext + destination so they can be rendered offline in tests)
  // wooden "tok": filtered noise click + short low thump
  function knock(c, out, t, vol, tone, len) {
    tone = tone || 1; len = len || 1;
    const src = c.createBufferSource(); src.buffer = noise(c);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100 * tone; bp.Q.value = 2.2;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07 * len);
    src.connect(bp); bp.connect(g); g.connect(out); src.start(t); src.stop(t + 0.1 * len);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(230 * tone, t); o.frequency.exponentialRampToValueAtTime(85 * tone, t + 0.09);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.9, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.11 * len);
    o.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.14 * len);
  }
  // soft bell/ping
  function ping(c, out, t, freq, vol, dur, type) {
    const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  const recipes = {
    move(c, o, t) { knock(c, o, t, 0.8, 1, 1); },
    capture(c, o, t) { knock(c, o, t, 1.0, 0.85, 1.5); knock(c, o, t + 0.05, 0.75, 1.25, 1.1); },
    castle(c, o, t) { knock(c, o, t, 0.8, 0.95, 1); knock(c, o, t + 0.13, 0.85, 1.1, 1); },
    promote(c, o, t) { knock(c, o, t, 0.7, 1, 1); [660, 830, 990, 1320].forEach((f, i) => ping(c, o, t + 0.1 + i * 0.07, f, 0.28, 0.5)); },
    check(c, o, t) { knock(c, o, t, 0.85, 1, 1); ping(c, o, t + 0.09, 988, 0.32, 0.35); ping(c, o, t + 0.2, 1319, 0.34, 0.5); },
    mate(c, o, t) {
      knock(c, o, t, 1.0, 0.8, 1.6);
      ping(c, o, t + 0.12, 988, 0.3, 0.3); ping(c, o, t + 0.22, 1319, 0.3, 0.4);
      [110, 164.8, 220, 277.2].forEach((f, i) => ping(c, o, t + 0.45 + i * 0.015, f, 0.3 - i * 0.04, 2.2, 'triangle'));
      ping(c, o, t + 0.45, 55, 0.35, 2.4);
    },
    over(c, o, t) { [392, 330, 262].forEach((f, i) => ping(c, o, t + i * 0.16, f, 0.28, 0.6, 'triangle')); },
    start(c, o, t) { knock(c, o, t, 0.6, 1.1, 1); knock(c, o, t + 0.09, 0.6, 0.9, 1); },
  };
  Sound.recipes = recipes;
  Sound.unlock = function () { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  Sound.play = function (kind) {
    if (!Sound.enabled) return;
    const c = ensure(); if (!c || !recipes[kind]) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    try { recipes[kind](c, master, c.currentTime + 0.01); } catch (e) { /* never break the game over a sound */ }
  };
  window.Sound = Sound;
  // browsers only allow audio after a user gesture: unlock on the first tap
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, Sound.unlock, { passive: true }));
})();
