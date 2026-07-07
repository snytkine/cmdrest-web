/**
 * Pure simulation logic for the hero's "Matrix rain" animation.
 *
 * This module contains no canvas or React code — it models the falling
 * binary rain, the bitmap word masks ("CmdRest", "Test") and the phase
 * machine that loops rain → form → hold → dissolve. Keeping the logic
 * pure makes every part unit-testable without a canvas context, while
 * `MatrixScene.tsx` simply consumes the output to paint pixels.
 */

/** Durations (in seconds, at speed 1) of each phase of a word cycle. */
export interface MatrixPhaseDurations {
  /** Pure binary rain before the word starts forming. */
  readonly rain: number;
  /** Word characters lock into place, top to bottom. */
  readonly form: number;
  /** The fully formed word stays on screen. */
  readonly hold: number;
  /** Word characters release back into the rain. */
  readonly dissolve: number;
}

/** Everything the animation needs to run; see `matrixSettings.ts`. */
export interface MatrixRainSettings {
  /** Global speed multiplier: 1 = normal, 2 = twice as fast. */
  readonly speed: number;
  /** Canvas background color (any CSS color). */
  readonly backgroundColor: string;
  /** Bright green: drop heads and most word characters. */
  readonly headColor: string;
  /** Darker green: drop trails and the remaining word characters. */
  readonly trailColor: string;
  /** Preferred glyph cell size in CSS pixels (shrinks to fit the word). */
  readonly fontSize: number;
  /** Words that form out of the rain, one per cycle, looping forever. */
  readonly words: readonly string[];
  /** Phase durations of one word cycle. */
  readonly phases: MatrixPhaseDurations;
}

/**
 * Deterministic pseudo-random number generator (mulberry32).
 * A seeded PRNG keeps drop behavior stable across renders and makes
 * the simulation assertable in unit tests.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic per-cell hash in [0, 1). Used for the binary digit a
 * cell shows, and for the jitter that staggers form/dissolve order,
 * without having to store per-cell state.
 */
export function hashCell(col: number, row: number, salt = 0): number {
  let h = (col * 374761393 + row * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The binary digit ('0' or '1') a given cell displays. */
export function cellDigit(col: number, row: number, salt = 0): string {
  return hashCell(col, row, salt) < 0.5 ? '0' : '1';
}

/* ---- Bitmap glyphs ------------------------------------------------------ */

/** Width of every bitmap glyph in mask cells. */
export const GLYPH_WIDTH = 5;
/** Height of every bitmap glyph in mask cells. */
export const GLYPH_HEIGHT = 7;
/** Blank columns between adjacent glyphs in a word mask. */
export const GLYPH_SPACING = 1;

/**
 * 5×7 bitmap font covering exactly the letters needed by the hero
 * words. `#` marks a lit cell. Add rows here to support more letters.
 */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.'],
};

/** A word rendered as lit cells on a small grid. */
export interface WordMask {
  /** Width of the mask in cells. */
  readonly columns: number;
  /** Height of the mask in cells (always GLYPH_HEIGHT). */
  readonly rows: number;
  /** Coordinates of every lit cell, relative to the mask's top-left. */
  readonly cells: ReadonlyArray<readonly [number, number]>;
}

/**
 * Builds the lit-cell mask for a word from the bitmap font.
 *
 * @throws if the word contains a character the font does not define.
 */
export function buildWordMask(word: string): WordMask {
  const cells: Array<[number, number]> = [];
  const letters = [...word];
  letters.forEach((letter, index) => {
    const glyph = GLYPHS[letter];
    if (!glyph) {
      throw new Error(`No bitmap glyph for character "${letter}"`);
    }
    const originCol = index * (GLYPH_WIDTH + GLYPH_SPACING);
    glyph.forEach((bitmapRow, row) => {
      for (let col = 0; col < GLYPH_WIDTH; col += 1) {
        if (bitmapRow[col] === '#') {
          cells.push([originCol + col, row]);
        }
      }
    });
  });
  const columns = letters.length * (GLYPH_WIDTH + GLYPH_SPACING) - GLYPH_SPACING;
  return { columns, rows: GLYPH_HEIGHT, cells };
}

/** Widest word mask, in cells, over all configured words. */
export function maxWordColumns(words: readonly string[]): number {
  return words.reduce((max, word) => Math.max(max, buildWordMask(word).columns), 0);
}

/* ---- Cycle phase machine ------------------------------------------------ */

/** The phase the animation is in at a given moment. */
export type MatrixPhase = 'rain' | 'form' | 'hold' | 'dissolve';

/** Where the looping animation is at a given simulation time. */
export interface CycleState {
  /** Index into `settings.words` of the word this cycle displays. */
  readonly wordIndex: number;
  /** Current phase of that word's cycle. */
  readonly phase: MatrixPhase;
  /** Progress through the current phase in [0, 1). */
  readonly progress: number;
}

/**
 * Maps an absolute simulation time to the looping cycle state.
 * One cycle = rain → form → hold → dissolve for one word; cycles
 * advance through `words` and wrap around forever.
 */
export function getCycleState(
  timeSeconds: number,
  wordCount: number,
  phases: MatrixPhaseDurations,
): CycleState {
  const cycleDuration = phases.rain + phases.form + phases.hold + phases.dissolve;
  const loopDuration = cycleDuration * Math.max(1, wordCount);
  const loopTime = ((timeSeconds % loopDuration) + loopDuration) % loopDuration;
  const wordIndex = Math.floor(loopTime / cycleDuration);
  let phaseTime = loopTime - wordIndex * cycleDuration;

  const order: ReadonlyArray<readonly [MatrixPhase, number]> = [
    ['rain', phases.rain],
    ['form', phases.form],
    ['hold', phases.hold],
    ['dissolve', phases.dissolve],
  ];
  for (const [phase, duration] of order) {
    if (phaseTime < duration) {
      return { wordIndex, phase, progress: duration > 0 ? phaseTime / duration : 0 };
    }
    phaseTime -= duration;
  }
  // Floating-point edge: land exactly on the cycle boundary.
  return { wordIndex, phase: 'dissolve', progress: 1 };
}

/**
 * Whether a mask cell is lit at the current cycle state.
 *
 * During `form` cells switch on top-to-bottom with per-cell jitter (so
 * the word appears to condense out of the falling rain); during `hold`
 * every cell is lit; during `dissolve` they release in the same
 * staggered order; during `rain` none are lit.
 */
export function isMaskCellLit(
  cell: readonly [number, number],
  maskRows: number,
  state: CycleState,
): boolean {
  if (state.phase === 'rain') {
    return false;
  }
  if (state.phase === 'hold') {
    return true;
  }
  const [col, row] = cell;
  // Threshold in [0, 1): mostly ordered by row, softened by jitter.
  const threshold = (row / Math.max(1, maskRows)) * 0.6 + hashCell(col, row, 7) * 0.4;
  return state.phase === 'form' ? state.progress >= threshold : state.progress < threshold;
}

/* ---- Falling drops ------------------------------------------------------ */

/** One falling "drop" (the bright head of a rain column). */
export interface Drop {
  /** Head position in rows; fractional while falling. */
  row: number;
  /** Fall speed in rows per second (at speed 1). */
  speed: number;
}

/** Slowest / fastest drop speeds in rows per second. */
export const DROP_MIN_SPEED = 6;
export const DROP_MAX_SPEED = 16;

/** Creates one drop per column, staggered above the top of the grid. */
export function createDrops(columns: number, random: () => number): Drop[] {
  return Array.from({ length: columns }, () => ({
    row: -random() * 40,
    speed: DROP_MIN_SPEED + random() * (DROP_MAX_SPEED - DROP_MIN_SPEED),
  }));
}

/**
 * Advances every drop by `deltaSeconds`. A drop that has fully left the
 * bottom of the grid respawns above the top with a fresh speed.
 */
export function stepDrops(
  drops: Drop[],
  rows: number,
  deltaSeconds: number,
  random: () => number,
): void {
  for (const drop of drops) {
    drop.row += drop.speed * deltaSeconds;
    if (drop.row > rows + 2) {
      drop.row = -random() * 20;
      drop.speed = DROP_MIN_SPEED + random() * (DROP_MAX_SPEED - DROP_MIN_SPEED);
    }
  }
}
