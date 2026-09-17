# Chess Coach

A personal, Chessmaster-style chess trainer built as an installable web app (PWA) for iPhone and iPad. Everything runs on the device: Stockfish in a web worker, games and progress in IndexedDB, no accounts and no server.

Live at https://skillion98.github.io/chesscoach/ (add to home screen from Safari's share sheet).

## What it does

- **Play** rated games against eight named opponents with distinct styles and weaknesses, or against any strength from 400 to 2400. Hints explain the idea behind the best move and make the game unrated.
- **Analysis** of every game: eval graph, per-move judgments, phase and mistake tags, explained key moments.
- **Openings**: 20 courses mirroring ChessOpenings.com, with narrated lessons, drills with spaced repetition, mastery grades, links to NM Dereque Kelley's videos, and a weak-lines report fed by drills and by your real games.
- **Puzzles**: 31,500 Lichess puzzles by theme with a separate puzzle rating.
- **Coach**: a six-axis radar (Opening, Tactics, Calculation, Strategy, Endgame, Safety), a style reading, a short weekly plan, and an adaptive opponent suggestion.

## Develop

```bash
npm install
npm run dev
```

Build with `npm run build`; the GitHub Actions workflow deploys `main` to GitHub Pages at `/chesscoach/`.

Data build scripts (outputs are committed):

- `node scripts/build-eco.mjs <dir with a.tsv..e.tsv>` from [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0)
- `node scripts/build-puzzles.mjs lichess_db_puzzle.csv.zst` from [database.lichess.org](https://database.lichess.org/#puzzles) (CC0)
- `node scripts/make-icons.mjs` regenerates the app icons

## Credits

- Engine: [Stockfish 19](https://github.com/nmrugg/stockfish.js) WASM build (GPLv3), lite single-thread flavor in `public/engine`.
- Board: [chessground](https://github.com/lichess-org/chessground) (GPLv3). Rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD).
- Opening names and puzzles: Lichess (CC0). Opening videos: NM Dereque Kelley, [@kebuchess](https://www.youtube.com/@kebuchess).
