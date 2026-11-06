/* Inline SVG piece set (own drawings). White pieces: ivory with dark outline. Black pieces: dark with a light halo so they stay visible on any square. */
(function () {
  const base = '<path class="pf" d="M11 38.5h23v-3.2c0-1.4-1.1-2.3-2.6-2.3H13.6c-1.5 0-2.6.9-2.6 2.3z"/>';
  const sym = {
    P: '<circle class="pf" cx="22.5" cy="12.6" r="5.5"/><path class="pf" d="M17.4 19.4h10.2v2.6H17.4z"/><path class="pf" d="M19.2 22c-4.2 2-6.6 6-6.6 11.2h19.8c0-5.2-2.4-9.2-6.6-11.2z"/>' + base,
    R: '<path class="pf" d="M13 17.5V9h4.6v3.4h3.6V9h2.6v3.4h3.6V9H32v8.5z"/><path class="pf" d="M15 17.5h15l1.2 15.5H13.8z"/><path class="pd" d="M15.4 21.5h14.2"/>' + base,
    B: '<circle class="pf" cx="22.5" cy="8.6" r="2.7"/><path class="pf" d="M22.5 11.4c5.4 3.7 8.8 8.5 6.6 14.4-.6 1.6-1.7 3-2.3 4.4h-8.6c-.6-1.4-1.7-2.8-2.3-4.4-2.2-5.9 1.2-10.7 6.6-14.4z"/><path class="pf" d="M15.8 30.2h13.4v3H15.8z"/><path class="pd" d="M22.5 15.4v6M19.7 18.4h5.6"/>' + base,
    N: '<path class="pf" d="M13.5 34c0-5.2.4-10 4.2-13.6-2-.5-4.3.9-6.2 3.9-1.2-2.2.2-5.4 2.6-8l1.1-4.6 3.4 2.2c1.8-3.4 5.2-4.6 8.4-3.8 5.6 1.4 8.4 7 8.4 13.2 0 4.2-.2 7.2-.2 10.7z"/><circle class="pe" cx="22" cy="14.6" r="1.35"/><path class="pd" d="M12.6 22.4l2.2-.9M26.5 12.5c3 1.4 5.2 5 5.4 9.4"/>' + base,
    Q: '<path class="pf" d="M12.2 33.2L9.4 15.2l5 9.8 1.9-14 3.4 14 2.8-15.4 2.8 15.4 3.4-14 1.9 14 5-9.8-2.8 18z"/><circle class="pf" cx="9.4" cy="13.8" r="2.2"/><circle class="pf" cx="16.3" cy="10.6" r="2.2"/><circle class="pf" cx="22.5" cy="9" r="2.2"/><circle class="pf" cx="28.7" cy="10.6" r="2.2"/><circle class="pf" cx="35.6" cy="13.8" r="2.2"/><path class="pd" d="M13 29.4h19"/>' + base,
    K: '<path class="pf" d="M21 3.6h3v3h3v3h-3v3.4h-3V9.6h-3v-3h3z"/><path class="pf" d="M22.5 13.6c-8 0-12 5.6-11.4 11.6.3 3 1.6 5 1.6 8h19.6c0-3 1.3-5 1.6-8 .6-6-3.4-11.6-11.4-11.6z"/><path class="pd" d="M14 28.6h17M22.5 13.8v3.5"/>' + base,
  };
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
  for (const k in sym) s += `<symbol id="pc-${k}" viewBox="0 0 45 45">${sym[k]}</symbol>`;
  s += '</defs></svg>';
  document.body.insertAdjacentHTML('afterbegin', s);
  // black pieces get a light halo drawn as a thick underlay (cheaper than CSS filters on weak devices)
  window.pieceSVG = (t, color) => { const id = '#pc-' + 'PNBRQK'[t - 1]; return `<svg viewBox="0 0 45 45" class="pcs ${color === 1 ? 'pw' : 'pb'}">${color === 1 ? '' : `<use class="halo" href="${id}"/>`}<use href="${id}"/></svg>`; };
})();
