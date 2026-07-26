/**
 * The 5×7 bitmap font used to draw words as pixel art in the Features
 * page's word-rain animation.
 *
 * Every glyph is seven strings of five characters where `#` marks a lit
 * cell and `.` an unlit one. Unlike the hero animation's font — which
 * only covers the letters of "CmdRest" and "Test" — this one is
 * complete (A–Z, a–z, 0–9 and space) because `wordRainSettings.words`
 * is meant to be edited freely.
 *
 * Lowercase letters sit on the baseline with two blank rows above them;
 * descenders (g, j, p, q, y) shift up by one row so the tail still fits
 * inside the seven-row cell.
 */

/** Width of every bitmap glyph in mask cells. */
export const GLYPH_WIDTH = 5;
/** Height of every bitmap glyph in mask cells. */
export const GLYPH_HEIGHT = 7;
/** Blank columns between adjacent glyphs in a word mask. */
export const GLYPH_SPACING = 1;

/**
 * The font itself. `glyphFont.test.ts` asserts every entry is exactly
 * GLYPH_HEIGHT rows of GLYPH_WIDTH characters, so a typo here fails a
 * test rather than drawing a corrupted word.
 */
export const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],

  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],

  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.###.', '#....', '#....', '#....', '.###.'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#...', '####.', '.#...', '.#...', '.#...', '.#...'],
  g: ['.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '#..#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '####.', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],

  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};

/** Whether the font can draw every character of `word`. */
export function canRenderWord(word: string): boolean {
  return [...word].every((letter) => GLYPHS[letter] !== undefined);
}

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
 * @throws if the word contains a character the font does not define,
 *   which surfaces a typo in `wordRainSettings.words` immediately
 *   instead of silently blanking part of the banner.
 */
export function buildWordMask(word: string): WordMask {
  const cells: Array<[number, number]> = [];
  const letters = [...word];
  if (letters.length === 0) {
    return { columns: 0, rows: GLYPH_HEIGHT, cells };
  }
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
