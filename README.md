# Chess Coach

A personal, Chessmaster-style chess trainer built as an installable web app (PWA) for iPhone and iPad.

## Milestones

1. **Play** (this build): rated games against Stockfish at eight strength levels, game history, in-app Elo, offline install.
2. Game analysis: engine review with mistakes tagged by phase and type.
3. Opening courses: tile grid of openings with lessons, narration, drills, and a weak-lines report.
4. Puzzles: themed puzzles from the Lichess database with a puzzle rating.
5. AI personalities: distinct styles and weaknesses.
6. Radar chart and virtual coach.

## Develop

```bash
npm install
npm run dev
```

Build for production with `npm run build`; output goes to `dist/`. The GitHub Actions workflow deploys `main` to GitHub Pages at `/chesscoach/`.

## Icons

`node scripts/make-icons.mjs` regenerates the PNG icons in `public/icons`.

## Credits

- Engine: [Stockfish 19](https://github.com/nmrugg/stockfish.js) WASM build (GPLv3), lite single-thread flavor in `public/engine`.
- Board: [chessground](https://github.com/lichess-org/chessground) (GPLv3).
- Rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD).
