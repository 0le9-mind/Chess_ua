/* Web Worker: keeps the engine search off the UI thread. */
importScripts('chess.js', 'engine.js');
const searcher = new ChessEngine.Searcher();
self.onmessage = (e) => {
  const { id, fen, level, keys } = e.data;
  try {
    const board = new Chess.Board(fen);
    const res = searcher.think(board, level);
    self.postMessage({ id, move: Chess.uci(res.move), score: res.score });
  } catch (err) { self.postMessage({ id, error: String(err) }); }
};
