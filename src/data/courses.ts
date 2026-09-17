// Opening courses: one per tile on the Openings screen. Each chapter is a main
// variation taught move by move; `notes` are spoken (and shown) after the given ply.
// Lines are space-separated SAN without move numbers. Videos are Dereque Kelley's
// (@kebuchess) lessons, the same ones ChessOpenings.com links to.

export type Side = 'w' | 'b'

export interface Chapter {
  name: string
  /** one sentence spoken before the moves start */
  intro: string
  line: string
  /** [ply, text]: spoken after that ply (1 = White's first move) */
  notes: [number, string][]
}

export interface Course {
  slug: string
  title: string
  side: Side
  /** ECO range, inclusive */
  eco: [string, string]
  video: string
  blurb: string
  intro: string
  chapters: Chapter[]
}

export const COURSES: Course[] = [
  {
    slug: 'english',
    title: 'English Opening',
    side: 'w',
    eco: ['A10', 'A39'],
    video: 'sVMWeenxN6M',
    blurb: '1.c4: flexible, positional, and full of transpositions.',
    intro:
      'The English starts with c4. White claims the d5 square from the side, keeps the center flexible, and usually fianchettoes the king bishop. Plans come from pawn structure rather than early tactics, which is why understanding a few setups beats memorizing long lines.',
    chapters: [
      {
        name: 'Reversed Sicilian: 1...e5',
        intro: 'Black takes the center with e5, so White plays a Sicilian with an extra move.',
        line: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O a3 Be6 b4',
        notes: [
          [1, 'c4 controls d5 without committing a center pawn. The d pawn stays home for now.'],
          [4, 'Nc3 adds a second attacker on d5. The Four Knights is the most common shape.'],
          [7, 'g3 prepares Bg2. The long diagonal bishop is the heart of the English.'],
          [10, 'After cxd5 Nxd5 the structure is a reversed Dragon. White has the extra tempo and will expand on the queenside.'],
          [12, 'Nb6 steps away from the bishop and the coming e4. Note the knight no longer covers the center.'],
          [17, 'a3 and b4 is the plan: gain queenside space, then push b5 to hit the c6 knight.'],
        ],
      },
      {
        name: 'Symmetrical: 1...c5',
        intro: 'When Black copies with c5, both sides fianchetto and the first break decides the game.',
        line: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d4 cxd4 Nxd4 Nxd4 Qxd4 d6',
        notes: [
          [2, 'Symmetry looks calm, but White has the move and will use it to break first.'],
          [8, 'Both bishops eye the long diagonals. The bishops on g2 and g7 stare at each other through d5 and d4.'],
          [13, 'd4 is the break. White opens the center while Black is still tied to symmetry.'],
          [17, 'Qxd4 centralizes the queen. It is safe because the g7 bishop is blocked by the knight on f6 and the pawn on d6.'],
        ],
      },
      {
        name: 'Botvinnik System',
        intro: 'A fixed structure with pawns on c4, d3, and e4 that gives White a clear plan.',
        line: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 e4 d6 Nge2 e5 d3 Nge7 O-O O-O Be3 Nd4 Qd2 Be6 f4',
        notes: [
          [9, 'e4 fixes the d5 square. Together with c4 the pawns form a clamp Black cannot easily break.'],
          [11, 'Nge2 keeps the f pawn free. In the Botvinnik setup the f4 break is the main lever.'],
          [17, 'Be3 and Qd2 connect the pieces. The g7 bishop is now biting on granite.'],
          [21, 'f4 at last. White gains space on the kingside while the structure keeps everything safe.'],
        ],
      },
      {
        name: 'Against ...e6: the Neo-Catalan setup',
        intro: 'When Black wants a Queen’s Gambit Declined, White fianchettoes anyway and keeps English character.',
        line: 'c4 e6 Nf3 d5 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3 b6 Nc3 Bb7 cxd5 Nxd5 Nxd5 Qxd5',
        notes: [
          [3, 'Nf3 before d4 avoids a straight Queen’s Gambit. White keeps the option of playing without d4.'],
          [11, 'b3 and Bb2: the double fianchetto. Both bishops point at the center from a distance.'],
          [15, 'e3 supports a later d4. Everything is flexible; White decides the structure later.'],
          [22, 'After the trades on d5 the position is open. White’s bishops are ready and Black’s queen is exposed to Qe2 and Rd1 ideas.'],
        ],
      },
      {
        name: 'Against the King’s Indian setup',
        intro: 'Black plays g6 and d6; White meets it with the fianchetto and queenside expansion.',
        line: 'c4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nf3 d6 O-O e5 d3 Nc6 Rb1 a5 a3 h6 b4 axb4 axb4 Be6',
        notes: [
          [7, 'Bg2 opposes the g7 bishop. With d3 rather than d4, White keeps the long diagonal open.'],
          [13, 'd3 keeps a compact center. White is not fighting for e5 directly; the fight is on the queenside.'],
          [15, 'Rb1 prepares b4. This is the standard English plan against a King’s Indian shape.'],
          [21, 'The a file opened, and b5 is coming next. Black’s kingside play with f5 is slower.'],
        ],
      },
    ],
  },
  {
    slug: 'sicilian',
    title: 'Sicilian Defense',
    side: 'b',
    eco: ['B20', 'B99'],
    video: '4MHicEPcn3c',
    blurb: '1...c5: the fighting reply to 1.e4.',
    intro:
      'The Sicilian answers e4 with c5. Black trades the c pawn for White’s d pawn, gets a half-open c file, and plays for counterattack rather than equality. You need one main line against the open Sicilian and a plan against the Alapin, Closed, and Grand Prix.',
    chapters: [
      {
        name: 'Najdorf: the main line',
        intro: 'The Najdorf with a6 keeps every option open and is the most respected Sicilian.',
        line: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7',
        notes: [
          [6, 'Black has traded the c pawn for the d pawn. The half-open c file is Black’s long-term asset.'],
          [10, 'a6 stops Nb5 and Bb5, and prepares b5. It looks slow but it is the point of the Najdorf.'],
          [12, 'e5 gains space and kicks the knight. The d5 hole is the price, and Be6 will cover it.'],
          [16, 'With Be6 and Be7 Black is solid. The plan is b5, Nbd7 to b6, and pressure on the c file.'],
          [20, 'Opposite side castling means a race. Black pushes b5 and b4; White pushes g4 and g5.'],
        ],
      },
      {
        name: 'Dragon',
        intro: 'The Dragon fianchettoes the bishop and races White on opposite wings.',
        line: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8',
        notes: [
          [10, 'g6 and Bg7: the Dragon bishop. It looks down the long diagonal at White’s queenside.'],
          [13, 'f3 stops Ng4 and prepares g4 and h4. White is going for a kingside pawn storm.'],
          [17, 'Bc4 eyes f7 and stops d5. This is the Yugoslav Attack, the most testing setup.'],
          [20, 'Rc8 lines up on the c file. Black’s ideas are Ne5, Nc4, and a rook sacrifice on c3.'],
        ],
      },
      {
        name: 'Against the Alapin: 2.c3',
        intro: 'c3 prepares d4 with a pawn recapture; Black hits e4 immediately with Nf6.',
        line: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb3 dxe5 Nxe5 Nxe5 dxe5 Qxd1+ Bxd1 Bf5',
        notes: [
          [4, 'Nf6 attacks e4. White cannot defend it with Nc3 because the knight belongs on c3 only after c3 is played.'],
          [8, 'Trading on d4 gives Black an isolated queen pawn target if the center opens, and a free game.'],
          [14, 'Nb6 gains time on the bishop. Black wants to exchange pieces because White’s space advantage shrinks in the endgame.'],
          [22, 'The queens are off and Black is comfortable. The e5 pawn is a target and Black’s bishops are free.'],
        ],
      },
      {
        name: 'Against the Closed Sicilian: 2.Nc3',
        intro: 'White fianchettoes and plays slowly, so Black mirrors and prepares d5 or a queenside push.',
        line: 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O Be3 Nd4 Rb1 Rb8',
        notes: [
          [8, 'Both bishops on the long diagonals. The Closed Sicilian is a slow game of plans.'],
          [12, 'e6 and Nge7: the knight goes to e7, not f6, so the f pawn and the g7 bishop are not blocked.'],
          [18, 'Nd4 is a great outpost. If White takes with the bishop, the c file opens for Black.'],
          [20, 'Rb8 prepares b5. Black attacks on the queenside while White pushes f5 on the other wing.'],
        ],
      },
      {
        name: 'Against the Grand Prix: 2.Nc3 and 3.f4',
        intro: 'f4 signals a kingside attack. Black meets Bb5 with the strong knight jump to d4.',
        line: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 O-O',
        notes: [
          [5, 'f4 aims at a quick f5 and Qe1 to h4. Take it seriously but do not panic.'],
          [10, 'Nd4 hits the bishop and the f3 knight. White usually trades on d4 or allows the bishop swap.'],
          [13, 'Black has the bishop pair and the g7 bishop is a monster on the long diagonal.'],
          [18, 'Castled and solid. Black’s plan is a6, Qb6, and pressure on the queenside and the long diagonal.'],
        ],
      },
    ],
  },
  {
    slug: 'ruy-lopez',
    title: 'Ruy Lopez',
    side: 'w',
    eco: ['C60', 'C99'],
    video: '_Bs7UtQR58Y',
    blurb: 'The Spanish: slow pressure on e5 that lasts all game.',
    intro:
      'After e4 e5 Nf3 Nc6, Bb5 attacks the knight that defends e5. The Ruy Lopez is about long term pressure on the center, a central pawn break with d4, and the famous Spanish knight maneuver Nb1 to d2 to f1 to g3.',
    chapters: [
      {
        name: 'Closed main line',
        intro: 'The classic Closed Lopez with the Chigorin setup on both sides.',
        line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2',
        notes: [
          [5, 'Bb5 is a threat only in the long run: Bxc6 and Nxe5 does not win a pawn yet because of Qd4.'],
          [11, 'Re1 protects e4 so the bishop is not lost to b5 and d5 tricks. Now Bxc6 and Nxe5 is a real threat.'],
          [15, 'c3 prepares d4 and gives the bishop a home on c2. This is the heart of the Closed Lopez.'],
          [17, 'h3 stops Bg4, which would pin the knight and pressure d4.'],
          [21, 'd4 at last. White has built the ideal center and Black has to fight for space.'],
          [23, 'Nbd2 begins the Spanish knight tour: d2, f1, g3 or e3, heading for f5.'],
        ],
      },
      {
        name: 'Anti-Berlin: 4.d3',
        intro: 'Against the Berlin Defense White avoids the endgame and plays a slow, rich middlegame.',
        line: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 Nbd2 a6 Ba4 Ba7 Re1 Ne7 h3 Ng6',
        notes: [
          [7, 'd3 defends e4 quietly. Taking on e4 no longer works for Black, and the Berlin endgame is avoided.'],
          [9, 'c3 prepares d4 and gives the bishop a retreat square on c2. Same idea as the main line.'],
          [13, 'Nbd2 to f1 to g3 is coming. Slow but every piece finds a good square.'],
          [20, 'Black reroutes too. This is a maneuvering game where the better planned side wins.'],
        ],
      },
      {
        name: 'Exchange Variation',
        intro: 'Bxc6 gives up the bishop pair for a better pawn structure and a favorable endgame.',
        line: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4 f3 Be6',
        notes: [
          [8, 'Black has doubled c pawns. In a pawn endgame White’s four against three on the kingside wins; Black’s queenside majority cannot make a passed pawn.'],
          [10, 'f6 holds e5 and avoids Nxe5. Bd6 is the alternative.'],
          [14, 'c5 kicks the knight but weakens d5. White is happy to trade queens.'],
          [20, 'Queens off. White will play Be3, Nc3, and Nd5, and the long term structure edge remains.'],
        ],
      },
      {
        name: 'Anti-Marshall: 8.a4',
        intro: 'When Black castles before d6, the Marshall gambit is coming. a4 sidesteps it.',
        line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 Bb7 d3 d6 Nbd2 Nd7 c3 Nc5',
        notes: [
          [14, 'O-O instead of d6 is the Marshall signal. After c3, d5 would sacrifice a pawn for a huge attack.'],
          [15, 'a4 hits b5 immediately. Black must react, and there is no time for d5.'],
          [17, 'd3 keeps e4 solid. White plays for a slow squeeze rather than a big center.'],
          [22, 'Black reroutes the knight to c5 to hit the bishop. White keeps the bishop with Bc2 or Ba2 and plays b4.'],
        ],
      },
    ],
  },
  {
    slug: 'italian',
    title: 'Italian Game',
    side: 'w',
    eco: ['C50', 'C54'],
    video: 'J39v_OHeb3c',
    blurb: 'Bc4 aims at f7; modern play is slow and strategic.',
    intro:
      'The Italian puts the bishop on c4, aiming at f7. Old Italians attacked at once; the modern approach with c3 and d3 builds slowly, castles, and only then pushes d4. Learn the quiet system first and the Evans Gambit for fun.',
    chapters: [
      {
        name: 'Giuoco Pianissimo: the modern system',
        intro: 'The slow Italian with c3 and d3 is the backbone of many grandmaster repertoires.',
        line: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Re8 Nf1 Be6 Ng3',
        notes: [
          [7, 'c3 prepares d4 and gives the bishop a retreat. Nothing is forced yet.'],
          [9, 'd3 first, d4 later. White keeps e4 solid and avoids early tactics on the a7 to g1 diagonal.'],
          [15, 'Bb3 retreats before Black plays Na5. Ba7 does the same for Black; both sides tuck the bishops away.'],
          [19, 'Nbd2 to f1 to g3: the same knight tour as in the Ruy Lopez, aiming for f5.'],
          [23, 'Ng3 done. White will consider d4 or the kingside push with Nh4 and Qf3.'],
        ],
      },
      {
        name: 'Evans Gambit',
        intro: 'b4 sacrifices a pawn to build a big center with tempo on the bishop.',
        line: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6 e5 Qg6 Nxc3 Nge7 Ba3',
        notes: [
          [7, 'b4 offers a pawn. If Black takes, c3 and d4 come with tempo and White gets a huge center.'],
          [11, 'd4 opens the center while Black’s king is still in the middle. Time matters more than the pawn.'],
          [15, 'Qb3 hits f7 and b7 at once. Black must defend, not develop.'],
          [17, 'e5 chases the queen and cuts the board in half. White is a pawn down but every piece is active.'],
          [21, 'Ba3 stops Black from castling. This is the point of the whole gambit.'],
        ],
      },
      {
        name: 'Two Knights: the quiet 4.d3',
        intro: 'Against Nf6, d3 avoids the wild Ng5 lines and keeps a healthy Italian structure.',
        line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 a4 Na5 Ba2 c5 c3 Nc6 Nbd2 h6 Nf1 Be6 Bxe6 fxe6 Ng3',
        notes: [
          [7, 'd3 defends e4 and keeps things calm. Ng5 is playable but you need to know a lot of theory.'],
          [13, 'a4 secures the bishop. If Black plays Na5, the bishop retreats to a2 and keeps the diagonal.'],
          [19, 'Nbd2 to f1 to g3 again. The knight maneuver is the same in every Italian.'],
          [25, 'After Bxe6 fxe6 Black has doubled e pawns. White’s knights will target e4 and the f5 square.'],
        ],
      },
      {
        name: 'Hungarian Defense: 3...Be7',
        intro: 'The passive Be7 lets White grab the center with d4 right away.',
        line: 'e4 e5 Nf3 Nc6 Bc4 Be7 d4 d6 Nc3 Nf6 h3 O-O O-O exd4 Nxd4 Nxd4 Qxd4 Be6 Bxe6 fxe6',
        notes: [
          [6, 'Be7 is solid but blocks nothing and pressures nothing. White gets a free hand.'],
          [7, 'd4 immediately. With the bishop on e7 there is no pressure on d4, so White takes the center.'],
          [11, 'h3 stops Bg4, the only annoying idea for Black.'],
          [20, 'White has more space, a better structure, and a clear plan: f4, e5, and pressure on e6.'],
        ],
      },
    ],
  },
  {
    slug: 'queens-gambit',
    title: "Queen's Gambit",
    side: 'w',
    eco: ['D06', 'D69'],
    video: 'RGNzRMAbpaY',
    blurb: '1.d4 d5 2.c4: the classical fight for the center.',
    intro:
      'The Queen’s Gambit offers the c pawn to deflect Black’s d pawn from the center. Black can decline with e6, accept with dxc4, or play the Slav with c6. Each needs its own plan, but the theme is the same: White gets the freer game and a central majority.',
    chapters: [
      {
        name: 'QGD Exchange: the minority attack',
        intro: 'Trading on d5 gives White a clear plan: push b4 and b5 to create a weak c6 pawn.',
        line: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 Nbd7 Qc2 O-O Nf3 Re8 O-O Nf8 Rab1 Ne4 Bxe7 Qxe7 b4',
        notes: [
          [8, 'The structure is fixed: White has a majority in the center, Black on the queenside. White’s plan is the minority attack.'],
          [9, 'Bg5 pins the knight and prepares e3 without blocking the bishop.'],
          [15, 'Qc2 supports Bd3 on the b1 to h7 diagonal and eyes the c file.'],
          [21, 'Rab1 prepares b4. The idea is b5, then bxc6, leaving Black with a weak c6 pawn.'],
          [25, 'b4 launches the minority attack. Two pawns attack three to create one weakness.'],
        ],
      },
      {
        name: 'Queen’s Gambit Accepted',
        intro: 'Black takes the pawn; White regains it with a lead in development.',
        line: 'd4 d5 c4 dxc4 e3 Nf6 Bxc4 e6 Nf3 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Bd6 e4',
        notes: [
          [4, 'dxc4 gives up the center. Black cannot hold the pawn, so the idea is quick development and c5.'],
          [7, 'Bxc4 regains the pawn. White is ahead in development and controls more of the center.'],
          [13, 'Qe2 prepares Rd1 and e4. The queen also supports the bishop after b5.'],
          [21, 'e4 gives White a big center. Black must be precise or get squeezed.'],
        ],
      },
      {
        name: 'Slav: 3.Nf3 and 5.a4',
        intro: 'The Slav keeps the c8 bishop free. White regains the pawn and fights the Bf5 setup.',
        line: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2 Bg6 e4 Nbd7 Bd3',
        notes: [
          [4, 'c6 supports d5 without blocking the c8 bishop. That is the whole point of the Slav.'],
          [9, 'a4 stops b5, which would hold the extra pawn. The cost is a weak b4 square.'],
          [10, 'Bf5 develops the bishop before e6. This is why Black played c6.'],
          [17, 'Qe2 prepares e4. When e4 comes, the f5 bishop must retreat and White gains the center.'],
          [21, 'Bd3 challenges the g6 bishop. White has the center; Black has a solid but passive position.'],
        ],
      },
      {
        name: 'Tarrasch Defense',
        intro: 'Black plays c5 for free piece play at the cost of an isolated d pawn.',
        line: 'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O Bg5 c4 Ne5 Be6',
        notes: [
          [6, 'c5 challenges the center at once. Black accepts an isolated d pawn for active pieces.'],
          [11, 'g3 and Bg2: the bishop pressures d5, the isolated pawn, from a distance.'],
          [17, 'Bg5 pins the knight that defends d5. Every piece aims at the isolated pawn.'],
          [19, 'Ne5 blocks the e file and eyes c6 and d5. White’s pieces are ideally placed against the isolani.'],
        ],
      },
    ],
  },
  {
    slug: 'kings-indian',
    title: "King's Indian Defense",
    side: 'b',
    eco: ['E60', 'E99'],
    video: 'Y0Bj3m8lXo8',
    blurb: 'Let White build a center, then attack it.',
    intro:
      'The King’s Indian gives White the center and then hits it with e5 or c5. Black castles fast and often launches a kingside pawn storm with f5 while White plays on the queenside. It is a counterattacking opening that rewards knowing the plans, not just the moves.',
    chapters: [
      {
        name: 'Classical: the Mar del Plata race',
        intro: 'After d5 the center closes and both sides attack on opposite wings.',
        line: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5 f3 f4 Bf2 g5',
        notes: [
          [8, 'd6 supports e5. Black has let White build a big center on purpose.'],
          [12, 'e5 strikes back. If White takes on e5 the game simplifies; d5 closes the center and starts the race.'],
          [16, 'Ne7 heads for g6 and supports f5. The knight on c6 had to move because of d5 anyway.'],
          [20, 'f5 is Black’s attack. Everything goes to the kingside: f4, g5, g4, and the pieces follow.'],
          [24, 'g5 and the storm is on. White’s play is on the queenside with c5; the faster attack wins.'],
        ],
      },
      {
        name: 'Sämisch: 5.f3',
        intro: 'f3 builds a wall on e4; Black hits the center with c5 and welcomes the queen trade.',
        line: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 c5 dxc5 dxc5 Qxd8 Rxd8 Bxc5 Nc6 Nd5 Nd7 Bxe7 Nxe7 Nxe7+ Kf8',
        notes: [
          [9, 'f3 supports e4 and prepares Be3, Qd2, and a kingside push. It also takes f3 from the knight.'],
          [12, 'c5 offers a pawn. If White takes twice and trades queens, Black gets huge activity for the pawn.'],
          [16, 'Queens are off. Black is a pawn down but the g7 bishop and the d file give full compensation.'],
          [24, 'After the complications Black gets the pawn back with active pieces. White’s dark squares are weak.'],
        ],
      },
      {
        name: 'Fianchetto Variation',
        intro: 'White fianchettoes too, so the attack is slower and Black plays in the center.',
        line: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nf3 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qb6 Re1 exd4 Nxd4 Ng4',
        notes: [
          [8, 'With Bg2 the kingside is well defended, so a pawn storm is unrealistic. Black plays in the center instead.'],
          [12, 'Nbd7 supports e5 without blocking the c pawn. c6 follows to control d5.'],
          [18, 'Qb6 hits d4 and b2. It is the classic pressure move against the fianchetto system.'],
          [22, 'Ng4 hits e3 and f2 ideas, and prepares Ne5. Black has active piece play.'],
        ],
      },
      {
        name: 'Four Pawns Attack',
        intro: 'White grabs all the space; Black must strike back at once with c5.',
        line: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Bg4 O-O Nbd7 h3 Bxf3 Bxf3 a6',
        notes: [
          [9, 'Four pawns in the center. It looks scary but it is overextended if Black hits back fast.'],
          [12, 'c5 immediately. Never let White play e5 with everything supported.'],
          [14, 'e6 undermines d5. After exd5 cxd5 the structure is a Benoni, where Black knows the plans.'],
          [24, 'Black traded the bishop for the knight to remove the e5 support. The plan is Re8, b5, and pressure on e4.'],
        ],
      },
      {
        name: 'Averbakh: 5.Be2 and 6.Bg5',
        intro: 'Bg5 stops e5 for a moment; Black reroutes with Na6 and plays e5 anyway.',
        line: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 Na6 Qd2 e5 d5 c6 f3 Qb6 Nh3 cxd5 cxd5 Bd7',
        notes: [
          [11, 'Bg5 pins nothing yet but makes e5 awkward because of dxe5 and Qxd8.'],
          [12, 'Na6 covers c5 and c7 and prepares e5 without allowing tricks on d6.'],
          [16, 'c6 hits d5. Black fights for the c file and the c5 square.'],
          [22, 'The c file is open and Black’s knight comes to c5. A comfortable King’s Indian.'],
        ],
      },
    ],
  },
  {
    slug: 'nimzo-indian',
    title: 'Nimzo-Indian Defense',
    side: 'b',
    eco: ['E20', 'E59'],
    video: 'kd_YWt50Cg4',
    blurb: 'Bb4 pins the knight and fights for e4 with pieces.',
    intro:
      'After d4 Nf6 c4 e6 Nc3, Bb4 pins the knight that would support e4. Black is ready to give up the bishop pair for a damaged pawn structure or a grip on the light squares. The Nimzo is flexible and hard to play against, which is why many White players avoid it with 3.Nf3.',
    chapters: [
      {
        name: 'Rubinstein: 4.e3',
        intro: 'The main line. White develops quietly and Black chooses a classical setup with d5 and c5.',
        line: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4 Nbd7 Qe2 b6 Rd1 cxd4 exd4 Bxc3 bxc3 Bb7',
        notes: [
          [6, 'Bb4 pins the knight. Now e4 is not possible without preparation.'],
          [10, 'd5 and c5 hit the center from both sides. This is the classical way to play the Nimzo.'],
          [14, 'dxc4 then Nbd7 and b6: Black develops the bishop to b7 and later plays cxd4 to open the c file.'],
          [22, 'Bxc3 gives White doubled c pawns. That structure is the long term target.'],
          [24, 'Bb7 pressures e4 and the long diagonal. White has the bishop pair; Black has the better pawns.'],
        ],
      },
      {
        name: 'Classical: 4.Qc2',
        intro: 'Qc2 prepares to recapture on c3 with the queen and keep the pawns intact.',
        line: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 f3 h6 Bh4 d5 e3 Nbd7 cxd5 exd5 Bd3 c5',
        notes: [
          [7, 'Qc2 guards c3 so Bxc3 will not double the pawns. The cost is a slow development.'],
          [10, 'Bxc3 gives up the bishop pair, but White has spent time on Qc2 and a3.'],
          [13, 'Bg5 pins the knight and hints at e4. Black answers with b6 and Bb7 to fight for e4.'],
          [20, 'Nbd7 and d5: Black builds a solid center. c5 next opens the position while White is behind in development.'],
          [24, 'c5 challenges d4. Black has easy play and White’s king is still in the center.'],
        ],
      },
      {
        name: '4.f3: the Sämisch style',
        intro: 'f3 prepares e4 by force; Black answers in the center with d5 and c5.',
        line: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5 a3 Bxc3+ bxc3 c5 cxd5 Nxd5 dxc5 Qa5 e4 Ne7 Be3 O-O Qb3 Qc7 Nh3 Nd7',
        notes: [
          [7, 'f3 says e4 is coming. Black must react in the center before the wall is built.'],
          [12, 'c5 hits the doubled pawns. White’s structure will be full of holes.'],
          [16, 'Qa5 pins the c3 pawn and attacks c5. Black recovers the pawn with active pieces.'],
          [24, 'Nd7 will take on c5. Black has the healthier pawns and clear targets.'],
        ],
      },
      {
        name: 'Sämisch: 4.a3',
        intro: 'White forces the exchange on c3 and accepts doubled pawns for the bishop pair and a big center.',
        line: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8 O-O Ba6 f4 f5',
        notes: [
          [8, 'Bxc3 is forced. White has the bishop pair; Black will attack the c4 pawn.'],
          [12, 'Nc6 pressures d4 and prepares Na5 against the weak c4 pawn.'],
          [16, 'b6 and Ba6: the bishop goes straight for c4, the weakest pawn on the board.'],
          [22, 'f5 fights against e4 and f4. Black blockades the center and plays against the doubled pawns.'],
        ],
      },
    ],
  },
  {
    slug: 'queens-indian',
    title: "Queen's Indian Defense",
    side: 'b',
    eco: ['E12', 'E19'],
    video: 'yAq7WGvNxZk',
    blurb: 'b6 and Bb7: control e4 from a distance.',
    intro:
      'When White avoids the Nimzo with 3.Nf3, the Queen’s Indian answers with b6. The bishop goes to b7 or a6, and Black controls e4 without committing pawns. It is a solid, positional opening that suits patient players.',
    chapters: [
      {
        name: '4.g3 Ba6: the modern main line',
        intro: 'Ba6 hits c4 and makes White spend time defending it.',
        line: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5 Ne5 Nfd7 Nxd7 Nxd7 Nd2 O-O O-O Rc8',
        notes: [
          [8, 'Ba6 attacks c4. White must defend it with b3, Qa4, Nbd2, or Qc2, and each costs something.'],
          [10, 'Bb4+ forces the bishop to d2, where it stands badly. Then Black retreats to e7 with a tempo gained.'],
          [16, 'c6 and d5: Black builds a solid center. The bishop on a6 keeps c4 under pressure.'],
          [24, 'Rc8 prepares c5. Black has equalized comfortably and has a clear plan on the c file.'],
        ],
      },
      {
        name: '4.g3 Bb7: the classical line',
        intro: 'Bb7 takes the long diagonal; Ne4 is the thematic knight jump.',
        line: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 c5 Rd1 d6 b3 Bf6',
        notes: [
          [8, 'Bb7 opposes the g2 bishop on the long diagonal. The fight is over e4.'],
          [14, 'Ne4 occupies the key square and offers a trade. Fewer pieces means a more comfortable game for Black.'],
          [18, 'c5 hits d4. Black plays on the c file and keeps the position flexible.'],
          [22, 'Bf6 pressures d4 and completes a harmonious setup. Nothing is weak in Black’s camp.'],
        ],
      },
      {
        name: 'Petrosian: 4.a3',
        intro: 'a3 stops Bb4, so Black strikes in the center with d5 at once.',
        line: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Nxc3 bxc3 Be7 e4 O-O Bd3 c5 O-O Qc8',
        notes: [
          [7, 'a3 prevents the pin. It costs a tempo, and Black uses it to play d5.'],
          [12, 'Nxd5 trades a pair of knights. Black wants simplification because White has more space.'],
          [17, 'e4 gives White a big center, but the c3 pawn is doubled and Black will hit d4 with c5.'],
          [22, 'Qc8 prepares Ba6 or Qc6. Black has pressure on the c file and the long diagonal.'],
        ],
      },
      {
        name: '4.e3: the quiet system',
        intro: 'White plays simply; Black gets the classical Bd6 setup and equal chances.',
        line: 'd4 Nf6 c4 e6 Nf3 b6 e3 Bb7 Bd3 d5 O-O Bd6 b3 O-O Bb2 Nbd7 Nc3 a6 Qe2 Ne4 Rfd1 f5',
        notes: [
          [7, 'e3 is modest. White just develops and keeps the bishop on d3.'],
          [12, 'Bd6 is the active square. It eyes h2 and supports a later e5 or Ne4.'],
          [20, 'Ne4 takes the outpost. Supported by d5 and f5, the knight is a monster.'],
          [22, 'f5 cements the knight and prepares Rf6 and a kingside attack. Black is fully equal.'],
        ],
      },
    ],
  },
  {
    slug: 'grunfeld',
    title: 'Grünfeld Defense',
    side: 'b',
    eco: ['D70', 'D99'],
    video: '2A-pYN5nCK4',
    blurb: 'd5 hits the center; the g7 bishop does the rest.',
    intro:
      'The Grünfeld plays d5 against d4 and c4, inviting White to build a big center and then attacking it with c5, Nc6, and the bishop on g7. It is dynamic and requires accuracy, but the plans are consistent: pressure on d4 all game long.',
    chapters: [
      {
        name: 'Exchange Variation',
        intro: 'White takes the center; Black attacks it with c5 and Qa5.',
        line: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2 O-O Bg4',
        notes: [
          [6, 'd5 challenges c4 and d4 immediately. After cxd5 Nxd5 e4, White has the big center and Black attacks it.'],
          [12, 'Bg7 hits d4 along the diagonal. c5 and Nc6 will add more pressure.'],
          [15, 'Rb1 gets the rook off the diagonal and eyes b7. The modern main line.'],
          [20, 'Qa5+ and Qxa2 grab a pawn. Black accepts a slightly worse development for material.'],
          [24, 'Bg4 pins the knight to weaken d4. Black has a pawn and counterplay; White has the center and activity.'],
        ],
      },
      {
        name: 'Russian System: 5.Qb3',
        intro: 'Qb3 keeps the center with the queen; Black counterattacks with a6 and b5.',
        line: 'd4 Nf6 c4 g6 Nc3 Bg7 Nf3 d5 Qb3 dxc4 Qxc4 O-O e4 a6 e5 b5 Qb3 Nfd7 e6 fxe6 Qxe6+ Kh8',
        notes: [
          [9, 'Qb3 puts the queen on the diagonal to defend c4 and keep e4 possible.'],
          [14, 'a6 prepares b5 to kick the queen. Black plays on the queenside with tempo.'],
          [16, 'b5 gains space and the queen must move again. Every tempo counts.'],
          [22, 'The e6 sacrifice looks scary but Black’s king is safe on h8. Black will play Nb6 and c5 with a good game.'],
        ],
      },
      {
        name: '4.Bf4',
        intro: 'Bf4 develops first; Black answers with c5 and the Qa5 pin.',
        line: 'd4 Nf6 c4 g6 Nc3 d5 Bf4 Bg7 e3 c5 dxc5 Qa5 Rc1 Ne4 cxd5 Nxc3 Qd2 Qxa2 bxc3 Qa5 Bc4 Nd7',
        notes: [
          [10, 'c5 strikes at once. If White takes, Qa5 pins the c3 knight and wins the pawn back.'],
          [14, 'Ne4 attacks the pinned knight. The tactics all work because of the g7 bishop.'],
          [18, 'Qxa2 grabs a pawn and the queen is safe. White has the center; Black has material and no weaknesses.'],
          [22, 'Nd7 and Nxc5 next. Black is fine.'],
        ],
      },
      {
        name: 'Fianchetto Variation',
        intro: 'Both sides fianchetto; Black plays Nb6 and Nc6 to pressure d4.',
        line: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 d5 cxd5 Nxd5 Nf3 Nb6 Nc3 Nc6 e3 O-O O-O Re8 Re1 a5 Qe2 e5',
        notes: [
          [8, 'd5 is still the right reply. White’s fianchetto is calmer, so the game is more positional.'],
          [12, 'Nb6 keeps the knight away from e4 tricks and prepares Nc6 with pressure on d4.'],
          [18, 'Re8 supports e5. Black will play e5 to hit d4 and free the position.'],
          [22, 'e5 is the freeing break. Black equalizes and the pieces come alive.'],
        ],
      },
    ],
  },
  {
    slug: 'french',
    title: 'French Defense',
    side: 'b',
    eco: ['C00', 'C19'],
    video: 'mMivcJQkGw8',
    blurb: 'e6 and d5: solid, then counterattack the center.',
    intro:
      'The French answers e4 with e6 and d5. Black gets a solid pawn chain and attacks White’s center with c5 and f6. The bad bishop on c8 is the price; the reward is a clear plan in every line.',
    chapters: [
      {
        name: 'Advance Variation',
        intro: 'e5 gains space; Black attacks the base of the chain with c5 and Qb6.',
        line: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6 b4 cxd4 cxd4 Nf5 Bb2 Be7 Bd3 O-O',
        notes: [
          [5, 'e5 fixes the center. White has space; Black will attack the d4 base with everything.'],
          [6, 'c5 hits d4 at once. If the base falls, the whole chain falls.'],
          [10, 'Qb6 adds pressure on d4 and b2. Nge7 or Nh6 heading for f5 adds more.'],
          [16, 'Nf5 attacks d4 a fourth time. White is stretched to hold it.'],
          [20, 'Castled and comfortable. Black plays f6 next to break the chain at its head.'],
        ],
      },
      {
        name: 'Winawer',
        intro: 'Bb4 pins the knight; Black accepts doubled pawns for White in exchange for the bishop.',
        line: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Qc7 Qg4 f5 Qg3 cxd4 cxd4 Ne7 Bd2 O-O Bd3 b6',
        notes: [
          [6, 'Bb4 pins the knight and threatens to ruin White’s pawns. The sharpest French.'],
          [10, 'Bxc3 doubles the pawns. White gets the bishop pair; Black gets targets on c3 and c2.'],
          [12, 'Qc7 covers e5 and the c file, and stops Qg4 ideas from winning g7 for free.'],
          [14, 'f5 blocks the queen’s attack. The kingside is safe and the center is closed.'],
          [22, 'b6 and Ba6 next: trade the bad bishop. Black then plays on the c file and the queenside.'],
        ],
      },
      {
        name: 'Tarrasch: 3.Nd2',
        intro: 'Nd2 avoids the pin; Black frees the game with c5 and an isolated pawn.',
        line: 'e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6 Bb5 Bd6 O-O Nge7 dxc5 Bxc5 Nb3 Bd6 Re1 O-O Bg5 Bg4',
        notes: [
          [5, 'Nd2 sidesteps Bb4 and keeps the c pawn free. It blocks the bishop for now.'],
          [6, 'c5 challenges the center at once. Black accepts an isolated d pawn for free development.'],
          [14, 'Nge7 keeps f6 free for f6 later and does not block the bishop. The knight can go to g6 or f5.'],
          [22, 'Bg4 pins the knight. Black’s pieces are active and the isolated pawn is well supported.'],
        ],
      },
      {
        name: 'Exchange Variation',
        intro: 'The symmetrical structure is quiet, so Black fights for the initiative with active pieces.',
        line: 'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 Bd3 Nf6 O-O O-O Bg5 Bg4 Nbd2 Nbd7 c3 c6 Qc2 Qc7 Rfe1 Rfe8',
        notes: [
          [6, 'The structure is symmetrical. Draws are common, but the side with better piece activity wins.'],
          [8, 'Bd6 is the most active square. It eyes h2 and supports Ne4.'],
          [14, 'Bg4 pins the knight. Do not rush; develop every piece to its best square.'],
          [22, 'Everything mirrors, but Black has kept the tension. Ideas: Ne4, Nf8 to g6, and Qf4.'],
        ],
      },
      {
        name: 'Classical: 3.Nc3 Nf6',
        intro: 'Nf6 invites e5; Black attacks the chain with c5 and gets a queenside attack.',
        line: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 cxd4 Nxd4 Bc5 Qd2 O-O O-O-O a6 h4 Nxd4 Bxd4 b5',
        notes: [
          [8, 'Nfd7 retreats to hit e5 later with f6. The knight also supports c5.'],
          [10, 'c5 attacks d4, the base. Standard French plan: attack the base of the chain.'],
          [16, 'Bc5 pins the d4 knight against the queen. Black’s pieces are hitting d4 from every angle.'],
          [24, 'b5 and the queenside storm is on. White attacks with g4 and f5; it is a race.'],
        ],
      },
    ],
  },
  {
    slug: 'caro-kann',
    title: 'Caro-Kann Defense',
    side: 'b',
    eco: ['B10', 'B19'],
    video: 'GFUfscMAZ7w',
    blurb: 'c6 and d5: the solid reply with a good bishop.',
    intro:
      'The Caro-Kann plays c6 then d5, like the French but with the c8 bishop free to develop. Black gets a solid structure and few weaknesses. The trade-off is less counterplay, so know the plans in each of White’s main tries.',
    chapters: [
      {
        name: 'Classical: 4...Bf5',
        intro: 'The main line. Black develops the bishop before e6 and plays a long, solid game.',
        line: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7',
        notes: [
          [8, 'Bf5 develops the problem bishop first. This is the whole idea of the Caro-Kann.'],
          [12, 'h6 gives the bishop a retreat square on h7 after h5. Do not forget it.'],
          [14, 'Nd7 first, then Ngf6. It stops Ne5 from being annoying and prepares to recapture on f6 with a knight.'],
          [18, 'The light square bishops are traded. Black has no bad bishop and a rock solid structure.'],
          [24, 'Be7 and O-O next. Black plays c5 later to free the game. Very solid.'],
        ],
      },
      {
        name: 'Advance Variation',
        intro: 'e5 gains space; Black develops the bishop, plays e6 and c5, and trades pieces.',
        line: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 c4 Nc6 Nc3 cxd4 Nxd4 Nxd4 Bxd4 dxc4 Bxc4 Nb6',
        notes: [
          [6, 'Bf5 before e6, of course. The bishop is outside the chain.'],
          [10, 'c5 attacks the base of the chain, just like in the French.'],
          [14, 'Ne7 to c6 puts more pressure on d4 and keeps f6 available.'],
          [24, 'Pieces are coming off and Black’s position is comfortable. The d5 square and the c file are Black’s.'],
        ],
      },
      {
        name: 'Exchange Variation',
        intro: 'After exd5 cxd5 the position is symmetrical; Black develops naturally and equalizes.',
        line: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6 Bxd6 Qxd6 O-O O-O',
        notes: [
          [6, 'Symmetrical pawns. Black has a good version of the Exchange French because the c file is half open.'],
          [12, 'Bg4 develops with a small threat: Bxf3 would damage the kingside if White recaptures with a pawn.'],
          [14, 'Qd7 defends b7 and keeps the pieces coordinated. Qb3 was hitting b7 and d5.'],
          [22, 'Equal and comfortable. Black plays on the c file with Rac8 and Na5 to c4.'],
        ],
      },
      {
        name: 'Panov-Botvinnik Attack',
        intro: 'c4 creates an isolated queen pawn for White; Black pins with Bb4 and blockades d5.',
        line: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Qc2 Nc6 Bd3 Ba5 O-O Nxc3 bxc3 Bxc3',
        notes: [
          [7, 'c4 goes for an open game. White will get an isolated d pawn and active pieces.'],
          [12, 'Bb4 pins the knight. It fights for d5 and prepares to castle.'],
          [14, 'Nxd5 blockades the isolated pawn. The d5 knight is the best piece on the board.'],
          [22, 'Black won a pawn but the bishop is on c3. Careful: after Rb1 and Bb2 White gets activity, so consolidate with d6 and O-O.'],
        ],
      },
      {
        name: 'Two Knights: 2.Nc3 and 3.Nf3',
        intro: 'White develops first; Black pins with Bg4 and trades on f3 to damage the structure.',
        line: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 Bd3 dxe4 Nxe4 Nxe4 Qxe4 Nd7 O-O Nf6 Qe2 Bd6',
        notes: [
          [6, 'Bg4 pins the knight. Black is happy to trade it for the bishop.'],
          [8, 'Bxf3 gives up the bishop pair, but the Caro-Kann structure is so solid that it does not matter.'],
          [16, 'Trading knights leaves Black with no weaknesses. White has the bishop pair as compensation for nothing.'],
          [22, 'Bd6 and O-O next. Black has a slightly passive but very safe position.'],
        ],
      },
    ],
  },
  {
    slug: 'dutch',
    title: 'Dutch Defense',
    side: 'b',
    eco: ['A80', 'A99'],
    video: '30nOIo7q-Ug',
    blurb: 'f5 against d4: fight for e4 and attack the king.',
    intro:
      'The Dutch plays f5 against d4 to control e4 and prepare a kingside attack. It is aggressive and slightly loosening; the king can be exposed, so know the setups: Leningrad with g6, Stonewall with d5, and the Classical with e6 and d6.',
    chapters: [
      {
        name: 'Leningrad Dutch',
        intro: 'The fianchetto Dutch: g6, Bg7, and a King’s Indian style attack.',
        line: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 c5 dxc6 bxc6',
        notes: [
          [2, 'f5 takes e4 away from White’s pieces. The cost is a slightly weaker king.'],
          [8, 'Bg7 completes the Leningrad setup. Black’s pieces point at the center and the queenside.'],
          [14, 'Qe8 is the key move: it supports e5 and can swing to h5 or g6 for a kingside attack.'],
          [20, 'After the trade on c6 Black has the center. The plan is e5 and pressure on the e file.'],
        ],
      },
      {
        name: 'Stonewall Dutch',
        intro: 'The Stonewall pawns on d5, e6, and f5 give a rock solid center and the e4 square.',
        line: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7 Bb2 b6 Ne5 Bb7 Nd2 O-O',
        notes: [
          [8, 'd5 completes the wall. e4 is Black’s square forever; e5 is White’s.'],
          [10, 'Bd6 is the active square. It supports e5 and eyes the kingside.'],
          [14, 'Qe7 prepares Ne4 and keeps the bishop guarded. b6 and Bb7 fix the bad bishop.'],
          [20, 'Castled and solid. Black plays Ne4, Nd7, and a kingside plan with g5 and Rf6.'],
        ],
      },
      {
        name: 'Classical Dutch',
        intro: 'e6 and d6 with Be7: flexible, aiming for e5 or a kingside attack.',
        line: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6 Nc3 Qe8 Re1 Qg6 e4 fxe4 Nxe4 Nxe4 Rxe4 Nc6',
        notes: [
          [8, 'Be7 keeps the bishop flexible. d6 and Qe8 to g6 or h5 is the plan.'],
          [14, 'Qe8 is the Dutch queen move. It prepares e5 and can go to the kingside.'],
          [17, 'e4 breaks the center. Black trades on e4 and gets an open position with active pieces.'],
          [22, 'Nc6 and e5 next. Black has equalized and has ideas like Bf5 and Rae8.'],
        ],
      },
      {
        name: 'Against 2.Bg5',
        intro: 'Bg5 tries to punish f5 by pressuring e7; Black kicks it and grabs space.',
        line: 'd4 f5 Bg5 h6 Bh4 g5 e3 Nf6 Bg3 d6 h4 Rg8 hxg5 hxg5 Nf3 Nc6 c3 Qd7 Nbd2 e5',
        notes: [
          [3, 'Bg5 is an annoying sideline. It eyes e7 and stops the natural Nf6.'],
          [6, 'g5 gains space and kicks the bishop. It looks loose but Black gets a strong center.'],
          [12, 'Rg8 protects g5 and prepares to use the open h file later.'],
          [20, 'e5 is the point: Black has a big center and the pieces are active. White’s bishop on g3 is out of play.'],
        ],
      },
      {
        name: 'Staunton Gambit',
        intro: 'e4 sacrifices a pawn for a lead in development; Black defends and keeps the pawn.',
        line: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qd4 Nf7 Bxf6 exf6 Nxe4 f5 Ng3 Qe7+ Kd1 Qe5',
        notes: [
          [4, 'fxe4 accepts. Declining is fine too, but the pawn is worth taking with care.'],
          [8, 'Nc6 develops and prepares to hit the queen after d5 with Ne5.'],
          [12, 'Nf7 defends and keeps the knight. After Bxf6 exf6 Black’s king is fine.'],
          [20, 'Qe5 trades queens or keeps the extra pawn. White’s king is stuck in the center.'],
        ],
      },
    ],
  },
  {
    slug: 'pirc',
    title: 'Pirc Defense',
    side: 'b',
    eco: ['B07', 'B09'],
    video: 'k85OuQFXef0',
    blurb: 'd6 and g6: let White build, then strike.',
    intro:
      'The Pirc gives White the center with d6, Nf6, and g6, then attacks it with e5 or c5. It is a hypermodern opening like the King’s Indian, but against e4. Know the Classical, Austrian Attack, and the 150 Attack.',
    chapters: [
      {
        name: 'Classical: 4.Nf3 and 5.Be2',
        intro: 'White develops normally; Black completes the setup and plays e5.',
        line: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5 Be3 Qc7 Qd2 Re8',
        notes: [
          [6, 'g6 and Bg7: the Pirc bishop. Together with d6 it controls e5 from a distance.'],
          [12, 'c6 supports a later d5 or b5 and gives the queen the c7 square.'],
          [16, 'e5 is the freeing move. Black hits d4 and the game is a normal middlegame.'],
          [20, 'Re8 supports e5. Black is solid and can play exd4, a6, and b5.'],
        ],
      },
      {
        name: 'Austrian Attack: 4.f4',
        intro: 'f4 goes for a big center and an attack; Black hits back with Nc6 and e5.',
        line: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Nc6 O-O Bg4 Be3 e5 fxe5 dxe5 d5 Nd4',
        notes: [
          [7, 'f4 signals a pawn storm with e5. Black needs counterplay in the center now.'],
          [12, 'Nc6 hits d4. Bg4 next pins the knight that defends it.'],
          [16, 'e5 strikes back. White’s center must move and Black’s pieces come alive.'],
          [20, 'Nd4 is a monster outpost. Black is comfortable with pieces on great squares.'],
        ],
      },
      {
        name: '150 Attack: 4.Be3 and Qd2',
        intro: 'Be3, Qd2, and Bh6 aim to trade the Pirc bishop; Black plays on the queenside.',
        line: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6 Bb7 a3 e5',
        notes: [
          [7, 'Be3 and Qd2 threaten Bh6 to trade the g7 bishop, then h4 and h5.'],
          [10, 'c6 and b5: Black plays on the queenside immediately. There is no time to waste.'],
          [16, 'Bxh6 and the bishop is gone, but White’s queen is offside on h6.'],
          [20, 'e5 hits d4 while the queen is away. Black has good counterplay.'],
        ],
      },
      {
        name: 'Against 4.Bg5',
        intro: 'Bg5 aims at f6 and e7; Black kicks it with h6 and g5 and gains space.',
        line: 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 h6 Bh4 g5 Bg3 Nh5 O-O-O Nc6 Nge2 Nxg3 hxg3 e5',
        notes: [
          [7, 'Bg5 pins nothing yet but prepares Qd2 and Bh6. Black takes the initiative with h6 and g5.'],
          [12, 'g5 gains space and gives the knight the h5 square to trade the bishop.'],
          [18, 'Nxg3 removes the bishop pair. Black’s structure looks loose but White has no targets.'],
          [20, 'e5 challenges the center. Black has the bishop pair and active play.'],
        ],
      },
    ],
  },
  {
    slug: 'alekhine',
    title: "Alekhine's Defence",
    side: 'b',
    eco: ['B02', 'B05'],
    video: 'BI4VDewk82Y',
    blurb: 'Nf6 provokes e5 and then attacks the overextended pawns.',
    intro:
      'Alekhine’s Defence attacks e4 with the knight on move one. White chases it with e5 and gains space, and Black attacks the advanced pawns. It is provocative and needs accurate play, but it leads to original positions where White can overreach.',
    chapters: [
      {
        name: 'Modern Variation: 4.Nf3',
        intro: 'The main line. Black pins the knight with Bg4 and plays a solid setup.',
        line: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 d5 c5 Bxf3 Bxf3 Nc4',
        notes: [
          [4, 'Nd5 is the only square. White gains time but the pawns get overextended.'],
          [8, 'Bg4 pins the knight that supports e5. Black is attacking the pawn that cramps the position.'],
          [14, 'Nb6 attacks c4. White usually needs b3 or Nc3 to hold it.'],
          [18, 'd5 closes the center. Black’s knight will land on c4 or d5 and the position is solid.'],
          [22, 'Nc4 hits the bishop and b2. Black has an active knight and a good game.'],
        ],
      },
      {
        name: 'Exchange Variation',
        intro: 'exd6 gives up the space advantage; Black gets easy development.',
        line: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7 Bd3 Nc6 Nge2 Bg4 f3 Bh5 O-O O-O b3 Bf6',
        notes: [
          [10, 'exd6 exd6: the center is quiet. Black keeps the extra tempo of a developed knight.'],
          [14, 'Nc6 hits d4. The d4 pawn is isolated and will be a target.'],
          [18, 'Bh5 retreats and keeps pressure on e2 and f3. Black wants Bg6 to trade the d3 bishop.'],
          [22, 'Bf6 hits d4 again. Black is fully developed and has a clear target.'],
        ],
      },
      {
        name: 'Four Pawns Attack',
        intro: 'White grabs four center pawns; Black undermines them with dxe5 and c5.',
        line: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Be7 d5 exd5 cxd5 Nb4',
        notes: [
          [9, 'f4 supports e5 with a pawn. Four pawns in the center is a lot to defend.'],
          [12, 'Nc6 hits d4. Bf5 and e6 develop with pressure; the pawns are targets, not assets.'],
          [19, 'd5 pushes forward, but the pawns are now loose. Black attacks with Nb4.'],
          [22, 'Nb4 hits d5 and c2. White is overextended and Black has the initiative.'],
        ],
      },
      {
        name: 'Chase Variation: 3.c4 and 4.c5',
        intro: 'White chases the knight with pawns; Black lets the pawns get weak.',
        line: 'e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 Bc4 e6 Nc3 d6 Nxd5 exd5 Bxd5 c6 Bb3 dxc5 Qh5 Qe7',
        notes: [
          [6, 'Nb6 is fine. c5 will chase it back but every pawn move loosens White.'],
          [12, 'd6 attacks the pawns. The e5 and c5 pawns are targets now.'],
          [16, 'c6 kicks the bishop. Black will get the pawn back with dxc5 and be comfortable.'],
          [20, 'Qe7 covers everything. Black is at least equal with the bishop pair coming.'],
        ],
      },
    ],
  },
  {
    slug: 'vienna',
    title: 'Vienna Game',
    side: 'w',
    eco: ['C25', 'C29'],
    video: 'EJU7otpRqsw',
    blurb: 'Nc3 first, then f4: a King’s Gambit with the knight ready.',
    intro:
      'The Vienna plays Nc3 before Nf3 so that f4 can come with support. It leads to open, attacking games that are easier to learn than the King’s Gambit. Know the Vienna Gambit against Nf6, and the quieter Bc4 and g3 systems.',
    chapters: [
      {
        name: 'Vienna Gambit: 2...Nf6 3.f4',
        intro: 'f4 attacks e5; after d5 the game opens and White gets a big center.',
        line: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 f5 exf6 Bxf6 O-O Nc6 Ne2 Bg4',
        notes: [
          [5, 'f4 is the point. Because Nf3 is not played yet, Qh4+ is not a problem after g3.'],
          [6, 'd5 is Black’s best. Anything else lets White take on e5 with a strong center.'],
          [11, 'd4 supports e5 and takes the center. White has space and the e5 pawn cramps Black.'],
          [16, 'After f5 exf6 the position opens. White is well developed and the e4 knight is a target.'],
          [20, 'Ne2 avoids the trade and aims for f4. White has a good game with pressure on e4.'],
        ],
      },
      {
        name: 'Against 2...Nc6: 3.f4',
        intro: 'When Black defends e5 with the knight, f4 exd... no, Black recaptures and White gains the center.',
        line: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5 h6 Nxf7 Kxf7 d4 d5 Bxf4 Bb4 Be2 Nf6',
        notes: [
          [6, 'exf4 accepts. Now it is a King’s Gambit with Nc3 already in.'],
          [8, 'g5 tries to keep the pawn. It weakens the kingside, and White strikes at once.'],
          [14, 'Nxf7 is the Hamppe-Allgaier sacrifice. Two pawns and the exposed king for a knight.'],
          [20, 'White has a big center and Black’s king is loose. Only for players who like attacking.'],
        ],
      },
      {
        name: 'Bishop’s Vienna: 3.Bc4',
        intro: 'Bc4 with d3 and f4 gives a King’s Gambit structure with the bishop already on c4.',
        line: 'e4 e5 Nc3 Nc6 Bc4 Bc5 d3 d6 f4 Nf6 Nf3 O-O f5 a6 a4 Na5 Ba2 c6 g4 b5 g5',
        notes: [
          [5, 'Bc4 eyes f7. With d3 and f4 White builds a slow attack.'],
          [9, 'f4 hits e5 with the bishop on c5 pinned to nothing. Black usually keeps the tension.'],
          [13, 'f5 gains space and prepares g4 and g5. The kingside pawn storm is White’s plan.'],
          [21, 'g5 kicks the knight. With the center closed, the attack plays itself.'],
        ],
      },
      {
        name: 'Fianchetto Vienna: 3.g3',
        intro: 'g3 and Bg2 build a quiet position and keep f4 for later.',
        line: 'e4 e5 Nc3 Nc6 g3 Bc5 Bg2 d6 Nge2 a6 d3 Nf6 O-O O-O h3 Be6 Kh2 Qd7 f4 exf4 gxf4',
        notes: [
          [5, 'g3 is the positional Vienna. The bishop on g2 defends the king and eyes the queenside.'],
          [9, 'Nge2 keeps the f pawn free. f4 is coming later with support.'],
          [16, 'Kh2 steps off the diagonal before f4. Now the pawn push is safe.'],
          [21, 'gxf4 gives White a strong center and the half open g file. A comfortable attacking setup.'],
        ],
      },
    ],
  },
  {
    slug: 'four-knights',
    title: 'Four Knights Game',
    side: 'w',
    eco: ['C46', 'C49'],
    video: 'm_ZU5S2bqEg',
    blurb: 'Simple development, then a plan: Spanish, Scotch, or Italian style.',
    intro:
      'The Four Knights develops both knights before deciding the bishop. It is solid and easy to learn, and it can transpose into Spanish, Scotch, or Italian structures depending on move four. A great opening for building good habits.',
    chapters: [
      {
        name: 'Spanish Four Knights: 4.Bb5',
        intro: 'Bb5 pins nothing yet but pressures e5 in the Ruy Lopez style.',
        line: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7 Re1 Nd8 d4 Ne6 Bc1 c5',
        notes: [
          [7, 'Bb5 attacks the c6 knight, the defender of e5. Symmetry looks harmless but White is a tempo up.'],
          [13, 'Bg5 pins the knight and threatens Nd5. This is the main idea of the Spanish Four Knights.'],
          [16, 'Qe7 unpins and defends. Black’s knight will go to d8 and e6.'],
          [19, 'd4 takes the center. White has the bishop pair and a strong center.'],
          [22, 'c5 hits d4. White plays d5 and gets space, or keeps tension with Bd3.'],
        ],
      },
      {
        name: 'Scotch Four Knights: 4.d4',
        intro: 'd4 opens the center at once and leads to an active, easy to play position.',
        line: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6 Qf3 Be7',
        notes: [
          [7, 'd4 opens the center immediately. All pieces come out fast.'],
          [12, 'Nxc6 bxc6 damages the structure. Black gets the center pawns but they can become weak.'],
          [16, 'The center is open and both sides have an isolated pawn on the d file. Piece activity decides.'],
          [21, 'Qf3 pressures d5 and f6. White’s pieces are all active and the plan is Rae1 and Qh3 or Ne2 to f4.'],
        ],
      },
      {
        name: 'Italian Four Knights: 4.Bc4 and the fork trick',
        intro: 'Bc4 allows Nxe4, the fork trick. White must know how to handle it.',
        line: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6 d4 exd4 Bxc6+ bxc6 Qxd4 O-O',
        notes: [
          [8, 'Nxe4 is the fork trick. After Nxe4 d5 Black regains the piece.'],
          [11, 'Bd3 keeps the bishop and after dxe4 Bxe4 White has an equal but active position.'],
          [15, 'd4 opens the center. White plays for activity and the better structure.'],
          [20, 'Black has doubled c pawns and the bishop pair. Play is equal; White has the easier plan.'],
        ],
      },
      {
        name: 'Glek System: 4.g3',
        intro: 'The fianchetto Four Knights keeps things quiet and aims for a slow kingside attack.',
        line: 'e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O h3 Be6 Kh2 Qd7 Be3 Bxe3 fxe3 Ne7',
        notes: [
          [7, 'g3 delays the bishop decision. The g2 bishop is safe and solid.'],
          [11, 'd3 keeps a compact center. White will play Nh4, f4, and maybe g4 later.'],
          [16, 'Kh2 is prophylaxis before f4. The king steps off the c5 to g1 diagonal.'],
          [22, 'fxe3 opens the f file. White attacks with Nh4, Qe1, and the rooks on the f file.'],
        ],
      },
    ],
  },
  {
    slug: 'kings-gambit',
    title: "King's Gambit",
    side: 'w',
    eco: ['C30', 'C39'],
    video: 'kViwcjLy1eQ',
    blurb: 'f4 on move two: a pawn for the center and an attack.',
    intro:
      'The King’s Gambit offers the f pawn on move two to deflect e5, build a center with d4, and open the f file against f7. It is romantic and risky. Learn the main accepted line, the Fischer defense, the Bishop’s Gambit, and what to do when Black declines.',
    chapters: [
      {
        name: 'Accepted: Kieseritzky',
        intro: 'After g5 White plays h4 and Ne5, the classical handling of the King’s Gambit.',
        line: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6 d4 Nh5 O-O Qxh4 Qe1 Qxe1 Rxe1',
        notes: [
          [5, 'Nf3 stops Qh4+. Now d4 is coming and White will attack on the f file.'],
          [7, 'h4 attacks g5. Black must push g4, and the knight jumps to e5.'],
          [11, 'Bc4 aims at f7. Everything White plays is aimed at f7 and the f file.'],
          [17, 'O-O and the rook is on the f file. Black’s extra pawn on f4 is a target.'],
          [21, 'Queens are off and White has development and open files. Black’s g and h pawns are weak.'],
        ],
      },
      {
        name: 'Accepted: Fischer Defense 3...d6',
        intro: 'd6 prepares g5 without allowing Ne5; White plays d4 and gets a big center anyway.',
        line: 'e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng1 Bh6 Nc3 c6 Nge2 Qf6 g3 fxg3 Nxg3',
        notes: [
          [6, 'd6 is Fischer’s idea. After g5 and g4 the knight cannot go to e5 because of dxe5.'],
          [11, 'Ng1 retreats, but White has the center and the pawns on g4 and f4 are overextended.'],
          [16, 'Qf6 holds f4. White strikes with g3 to open lines.'],
          [19, 'Nxg3 and White has a lead in development. Bc4, Qd3, and O-O-O follow.'],
        ],
      },
      {
        name: 'Declined: 2...Bc5',
        intro: 'Bc5 stops O-O for now; White plays Nf3, c3, and d4 to push the bishop back.',
        line: 'e4 e5 f4 Bc5 Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 O-O Bd3 Re8 O-O Nc6',
        notes: [
          [4, 'Bc5 declines and eyes g1. White cannot castle until the bishop is dealt with.'],
          [7, 'c3 prepares d4 to hit the bishop. The center will be big.'],
          [14, 'The bishops are traded and White can castle. The center with e4 and d4 is White’s asset.'],
          [20, 'White has space and a solid center. The plan is e5 or f5 with the rook on the f file.'],
        ],
      },
      {
        name: 'Falkbeer and 2...d5',
        intro: 'd5 counterattacks the center; the modern exf4 line gives Black an equal game White can play for a win.',
        line: 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6 Bc4 Nxd5 O-O Be7 Bxd5 Qxd5 Nc3 Qd8 d4 O-O Bxf4 c6',
        notes: [
          [4, 'd5 challenges e4 at once. Black returns the pawn to open the game.'],
          [10, 'Nxd5 regains the pawn. White has quick development and the f file.'],
          [14, 'Bxd5 gives up the bishop pair to gain time. Nc3 comes with tempo.'],
          [20, 'White has a big center and active pieces. Qd2, Rae1, and Ne5 are the plan.'],
        ],
      },
      {
        name: 'Bishop’s Gambit: 3.Bc4',
        intro: 'Bc4 allows Qh4+ but the king is safe on f1 and White gains time later.',
        line: 'e4 e5 f4 exf4 Bc4 Nf6 Nc3 c6 Bb3 d5 exd5 cxd5 d4 Bd6 Nge2 O-O O-O g5 Nxd5 Nxd5 Bxd5',
        notes: [
          [5, 'Bc4 invites Qh4+. After Kf1 White will play Nf3 with tempo on the queen.'],
          [8, 'c6 prepares d5. Black wants to open the center while White’s king is uncastled.'],
          [13, 'd4 takes the center. White has space and development for the pawn.'],
          [21, 'White regains the pawn and has a strong bishop. The f4 pawn is still a target.'],
        ],
      },
    ],
  },
  {
    slug: 'catalan',
    title: 'Catalan Opening',
    side: 'w',
    eco: ['E01', 'E09'],
    video: 'pQI-DWNe_2I',
    blurb: 'd4, c4, and g3: the queen’s pawn game with a long diagonal.',
    intro:
      'The Catalan combines d4 and c4 with a fianchettoed bishop on g2. The bishop pressures the queenside along the long diagonal and makes dxc4 hard to hold. It is positional, low risk, and rewards patience.',
    chapters: [
      {
        name: 'Open Catalan: 4...dxc4',
        intro: 'Black takes the pawn; White regains it with Qc2 and keeps a long lasting bind.',
        line: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7 O-O O-O Qc2 a6 Qxc4 b5 Qc2 Bb7 Bd2 Be4 Qc1 Nbd7',
        notes: [
          [8, 'dxc4 grabs a pawn. The g2 bishop makes it hard to keep; b5 is the only way and it weakens c5 and c6.'],
          [13, 'Qc2 prepares Qxc4. White is in no hurry; development comes first.'],
          [16, 'b5 gains time on the queen and prepares Bb7. Black’s queenside is loose though.'],
          [20, 'Be4 harasses the queen. White keeps calm with Qc1 and plans Bg5 or Ne5.'],
          [22, 'The pawn is back and White has a small edge. Rd1, Nc3, and e4 or a4 next.'],
        ],
      },
      {
        name: 'Closed Catalan',
        intro: 'Black keeps d5 with c6 and b6; White plays e4 to open the center.',
        line: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4 Bb7 e5 Ne8 cxd5 cxd5',
        notes: [
          [8, 'Be7 and O-O keep the center closed. Black defends d5 with c6 and later frees with c5 or e5.'],
          [13, 'Qc2 supports e4. The knight goes to d2, not c3, to keep the c pawn protected.'],
          [17, 'e4 is the break. Now Black must decide about d5 and White gains space.'],
          [22, 'The c file is open and White has space. Nb3 or Nf1 to e3, and the bishop pair may come later.'],
        ],
      },
      {
        name: 'Against 4...Bb4+',
        intro: 'Bb4+ misplaces the bishop to d2, but the retreat to e7 keeps a normal Catalan.',
        line: 'd4 Nf6 c4 e6 g3 d5 Bg2 Bb4+ Bd2 Be7 Nf3 O-O O-O c6 Qc2 b6 Bf4 Ba6 Nbd2 Nbd7 Rfd1 Rc8',
        notes: [
          [8, 'Bb4+ forces Bd2. Black retreats to e7 later, but the bishop on d2 is not bad.'],
          [17, 'Bf4 moves the bishop to a better diagonal. White has a nice square for it.'],
          [18, 'Ba6 attacks c4 and prepares to trade the g2 bishop’s target. Careful with Ba6 and c5 ideas.'],
          [22, 'White has the standard plan: e4, and pressure along the c file and the diagonal.'],
        ],
      },
      {
        name: 'Against 4...c5',
        intro: 'c5 fights for d4 at once; White trades and gets an open game with the g2 bishop.',
        line: 'd4 Nf6 c4 e6 g3 d5 Bg2 c5 Nf3 cxd4 Nxd4 e5 Nf3 d4 O-O Nc6 e3 Be7 exd4 exd4 Bf4 O-O',
        notes: [
          [8, 'c5 is the Tarrasch approach. Black hits d4 before White consolidates.'],
          [12, 'e5 chases the knight and grabs the center, but the pawns are now targets.'],
          [17, 'e3 undermines d4. White’s pieces will attack the advanced pawn.'],
          [22, 'The d pawn is isolated and White’s pieces aim at it. Re1, Nbd2, and Nb3 are the plan.'],
        ],
      },
    ],
  },
  {
    slug: 'benoni',
    title: 'Benoni Defense',
    side: 'b',
    eco: ['A56', 'A79'],
    video: 'CK4_orY-bsA',
    blurb: 'c5 against d4: an imbalanced fight with a queenside majority.',
    intro:
      'The Benoni plays c5 against d4 and lets White push d5. Black gets a queenside pawn majority and a dark square bishop on g7; White gets central space and the e4 to e5 break. It is unbalanced and full of counterplay.',
    chapters: [
      {
        name: 'Modern Benoni: Classical',
        intro: 'The main line with e4, Nf3, and Be2; Black plays Re8, Na6 to c7, and b5.',
        line: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O O-O Re8 Nd2 Na6 f3 Nc7 a4 b6',
        notes: [
          [6, 'e6 challenges d5 at once. After exd5 cxd5 the structure is set: White has the center, Black has the queenside.'],
          [12, 'g6 and Bg7: the bishop on the long diagonal is the best piece in the Benoni.'],
          [18, 'Re8 pressures e4. The main plan is Nbd7, Ne5 or Na6 to c7, and b5.'],
          [22, 'Nc7 supports b5. Everything Black plays aims at the queenside majority.'],
          [24, 'b6 prepares a6 and b5. Black’s queenside pawns will roll.'],
        ],
      },
      {
        name: 'Taimanov Attack: f4 and Bb5+',
        intro: 'The sharpest try; the bishop check disrupts Black, so know the Nfd7 and Na6 plan.',
        line: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nb4 Re1 a6 Bf1 Nf6',
        notes: [
          [13, 'f4 prepares e5. This is the most dangerous plan against the Benoni.'],
          [15, 'Bb5+ interferes with development. Nfd7 blocks and heads for f6 later.'],
          [20, 'Na6 to b4 hits the loose pieces and the d3 square. Black gets counterplay fast.'],
          [26, 'Nf6 is back and Black has a normal Benoni with the bishop on f1 having lost time.'],
        ],
      },
      {
        name: 'Fianchetto Variation',
        intro: 'White fianchettoes; Black plays a6, Nbd7, and the standard queenside plan.',
        line: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O a6 a4 Nbd7 Nd2 Re8 h3 Rb8',
        notes: [
          [13, 'g3 and Bg2 defend the king and pressure d5 from behind. A safer plan for White.'],
          [18, 'a6 prepares b5. White answers a4 to stop it, which weakens b4.'],
          [22, 'Re8 and Nbd7 to e5 or c5. Black has the standard active setup.'],
          [24, 'Rb8 prepares b5 anyway. Black will sacrifice a pawn for activity if needed.'],
        ],
      },
      {
        name: 'Benko Gambit',
        intro: 'b5 sacrifices a pawn for lasting pressure on the a and b files.',
        line: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3 Nbd7 Re1 Qa5',
        notes: [
          [6, 'b5 gives a pawn. Black gets the a and b files and the long diagonal for the whole game.'],
          [10, 'Bxa6 develops with tempo. The bishop trades White’s best defender later.'],
          [14, 'Bxf1 costs White the right to castle. Kxf1 and g3 spends time.'],
          [24, 'Qa5, Rfb8, and Ne8 to c7 next. Black’s pressure is worth more than a pawn.'],
        ],
      },
    ],
  },
  {
    slug: 'kia',
    title: "King's Indian Attack",
    side: 'w',
    eco: ['A07', 'A08'],
    video: 'e95SLI3fcgk',
    blurb: 'One setup against everything: Nf3, g3, Bg2, d3, e4.',
    intro:
      'The King’s Indian Attack is a system: knight to f3, pawn to g3, bishop to g2, castle, pawn to d3, knight to d2, pawn to e4. White plays it against almost anything and then attacks on the kingside with e5, Nf1, h4, and the knights.',
    chapters: [
      {
        name: 'Against the French setup',
        intro: 'The classic KIA: e5 gains space and the pieces flood to the kingside.',
        line: 'e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1 a5 h4 b4 Bf4 a4',
        notes: [
          [3, 'd3 instead of d4. White will play a King’s Indian setup with the extra tempo.'],
          [9, 'g3 and Bg2: the bishop points at the queenside and defends the king.'],
          [17, 'e5 gains space and pushes the knight away. Now the kingside attack begins.'],
          [19, 'Nf1 is the key maneuver: the knight goes to h2 or e3, then g4, joining the attack.'],
          [23, 'h4 and Bf4 support e5 and prepare Ng5 and Qg4. Black attacks on the queenside; White is usually faster.'],
        ],
      },
      {
        name: 'Against the Sicilian setup',
        intro: 'Against c5 and e6 the same plan works; the knight reroutes through h2.',
        line: 'e4 c5 Nf3 e6 d3 Nc6 g3 d5 Nbd2 Nf6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1 a5 h4 b4 N1h2 a4',
        notes: [
          [5, 'd3 keeps the center closed. White has the same setup no matter what Black does.'],
          [15, 'Re1 supports e4 and e5. The rook stands behind the pawn that will lead the attack.'],
          [17, 'e5 again. The d7 knight is passive and White’s pieces head to the kingside.'],
          [23, 'N1h2 to g4 is the standard route. Bf4, Qg4 or Qe2, and Ng5 follow.'],
        ],
      },
      {
        name: 'Reti move order: 1.Nf3 d5',
        intro: 'Starting with Nf3 avoids some lines; after d5 White still gets the KIA.',
        line: 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4 d3 Nbd7 Nbd2 e5 e4 Bd6 h3 Bh5 Qe1 O-O Nh4 Re8',
        notes: [
          [1, 'Nf3 first keeps every option. Black cannot play the French setup easily.'],
          [8, 'Bg4 pins the knight. h3 and g4 will chase it and gain kingside space later.'],
          [13, 'e4 gets the KIA structure. If Black takes on e4, White recaptures and the g2 bishop opens up.'],
          [19, 'Nh4 heads for f5. With Qe1 and f4 White has a kingside plan.'],
        ],
      },
      {
        name: 'Against the mirror: ...g6',
        intro: 'When Black fianchettoes too, the fight is in the center with e4 and d5.',
        line: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4 Nc6 Re1 e5 exd5 Nxd5 Nc4 Re8',
        notes: [
          [8, 'Symmetrical fianchettoes. White’s extra tempo shows in the center first.'],
          [13, 'e4 challenges d5. Black must decide: take, push, or hold.'],
          [17, 'exd5 opens the g2 bishop. The long diagonal hits c6 and b7.'],
          [19, 'Nc4 hits e5 and d6. White’s pieces are active and Black’s center is under pressure.'],
        ],
      },
    ],
  },
]

export function courseBySlug(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug)
}
