/**
 * Pure simulation logic for the Features page's "word rain" banner.
 *
 * The banner is a short, wide field of flickering alphanumeric
 * characters out of which the configured words ("Request", "Response",
 * "Assertions", "Report") condense as pixel art, one after another from
 * left to right, then release back into the noise.
 *
 * This module contains no canvas and no React code — it models the
 * character field, the grid layout, the word slots and the relay
 * timeline, so every part is unit-testable without a canvas context.
 * `WordRainScene.tsx` consumes the output and paints pixels.
 */
import { GLYPH_HEIGHT, maxWordColumns } from './glyphFont';
import type { WordMask } from './glyphFont';

/** Durations (seconds, at speed 1) of the phases one word goes through. */
export interface WordRainPhaseDurations {
  /** The word condenses out of the character field. */
  readonly form: number;
  /** The fully formed word stays lit. */
  readonly hold: number;
  /** The word releases back into the field. */
  readonly dissolve: number;
}

/** Everything the animation needs to run; see `wordRainSettings.ts`. */
export interface WordRainSettings {
  /** Global speed multiplier: 1 = normal, 2 = twice as fast. */
  readonly speed: number;
  /** Height of the strip in CSS pixels (the width always fills the parent). */
  readonly height: number;
  /** Canvas background color (any CSS color). */
  readonly backgroundColor: string;
  /** Bright text color: formed words and roughly half the field. */
  readonly textColorLight: string;
  /** Dark text color: the rest of the field and occasional word sparks. */
  readonly textColorDark: string;
  /** Preferred glyph cell size in CSS pixels (shrinks to fit the strip). */
  readonly fontSize: number;
  /** Opacity of the background character field, in [0, 1]. */
  readonly fieldOpacity: number;
  /** Upper bound on repaints per second (the field is redraw-heavy). */
  readonly frameRate: number;
  /** How many times per second a field cell re-rolls its character. */
  readonly flickerRate: number;
  /** Words that form out of the field, left to right. */
  readonly words: readonly string[];
  /** Seconds of pure character field before the first word starts. */
  readonly introSeconds: number;
  /** Seconds between the *starts* of consecutive words. */
  readonly wordIntervalSeconds: number;
  /** Phase durations of a single word. */
  readonly phases: WordRainPhaseDurations;
  /**
   * How many times to play the whole word sequence before stopping.
   * Negative means loop forever; otherwise the sequence plays
   * `max(1, loopAnimation)` times.
   */
  readonly loopAnimation: number;
}

/* ---- Character field ---------------------------------------------------- */

/**
 * Deterministic per-cell hash in [0, 1). Used for the character a cell
 * shows, its color and its flicker phase, so the field needs no
 * per-cell state and renders identically for a given time.
 */
export function hashCell(col: number, row: number, salt = 0): number {
  let h = (col * 374761393 + row * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The alphabet the background field is drawn from. */
export const FIELD_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Index into `FIELD_CHARS` of the character a cell shows. The scene
 * pre-renders every character once and blits it by index, so this is
 * the form it actually uses; `fieldChar` is the readable equivalent.
 */
export function fieldCharIndex(col: number, row: number, salt = 0): number {
  const index = Math.floor(hashCell(col, row, salt) * FIELD_CHARS.length);
  return Math.min(index, FIELD_CHARS.length - 1);
}

/** The character a field cell shows at a given flicker salt. */
export function fieldChar(col: number, row: number, salt = 0): string {
  return FIELD_CHARS.charAt(fieldCharIndex(col, row, salt));
}

/**
 * Share of field cells drawn in the light color. Kept well below half
 * so the dim field reads as a dark texture and the words — which are
 * almost entirely light — stand out as shapes rather than as slightly
 * brighter noise.
 */
export const FIELD_LIGHT_RATIO = 0.3;

/** Whether a field cell uses the light color (rather than the dark one). */
export function fieldIsLight(col: number, row: number, salt = 0): boolean {
  return hashCell(col, row, salt + 911) < FIELD_LIGHT_RATIO;
}

/**
 * Share of a word's cells drawn in the light color; the rest are dark
 * "sparks" that tie the word back to the field it grew out of.
 */
export const WORD_LIGHT_RATIO = 0.88;

/** Whether a word cell uses the light color (rather than a dark spark). */
export function wordCellIsLight(col: number, row: number, wordIndex: number): boolean {
  return hashCell(col, row, wordIndex) < WORD_LIGHT_RATIO;
}

/**
 * The flicker salt for one cell at a moment in time. The per-cell hash
 * offset staggers when cells re-roll, so the field shimmers instead of
 * changing everywhere at once.
 */
export function cellFlickerSalt(
  timeSeconds: number,
  col: number,
  row: number,
  flickerRate: number,
): number {
  return Math.floor(timeSeconds * flickerRate + hashCell(col, row, 3) * 4);
}

/* ---- Grid layout -------------------------------------------------------- */

/** Blank cells kept clear at the left and right of the word slots. */
export const SLOT_MARGIN = 2;

/** Smallest character cell we will ever draw, in CSS pixels. */
export const MIN_CELL_SIZE = 4;

/**
 * Picks the character cell size for a strip of the given size: the
 * configured `fontSize` when it fits, otherwise shrunk so the widest
 * word fits both across the strip and within its seven glyph rows.
 */
export function computeCellSize(
  width: number,
  height: number,
  settings: WordRainSettings,
): number {
  const widest = maxWordColumns(settings.words) + 2 * SLOT_MARGIN;
  const byWidth = Math.floor(width / Math.max(1, widest));
  const byHeight = Math.floor(height / (GLYPH_HEIGHT + 2));
  return Math.max(MIN_CELL_SIZE, Math.min(settings.fontSize, byWidth, byHeight));
}

/**
 * Left edge (in cells) of each word's slot, spread evenly across the
 * grid so the first word sits at the left and the last at the right.
 *
 * All words share one travel range — derived from the *widest* mask —
 * which keeps the slots evenly spaced and strictly ordered whatever mix
 * of long and short words is configured.
 */
export function computeWordSlots(
  masks: readonly WordMask[],
  columns: number,
  margin: number = SLOT_MARGIN,
): number[] {
  if (masks.length === 0) {
    return [];
  }
  const widest = masks.reduce((max, mask) => Math.max(max, mask.columns), 0);
  const span = Math.max(0, columns - 2 * margin - widest);
  return masks.map((mask, index) => {
    const offset =
      masks.length === 1
        ? Math.floor(span / 2)
        : Math.round((span * index) / (masks.length - 1));
    // Clamp so a word wider than the grid still starts on screen.
    const limit = Math.max(0, columns - mask.columns);
    return Math.max(0, Math.min(margin + offset, limit));
  });
}

/** Top row of every word: vertically centered in the grid. */
export function computeWordRow(rows: number): number {
  return Math.max(0, Math.floor((rows - GLYPH_HEIGHT) / 2));
}

/* ---- Relay timeline ----------------------------------------------------- */

/** The phase a word is in at a given moment. */
export type WordPhase = 'form' | 'hold' | 'dissolve';

/** A word that is (at least partly) visible right now. */
export interface ActiveWord {
  /** Index into `settings.words`. */
  readonly index: number;
  /** Which part of its life the word is in. */
  readonly phase: WordPhase;
  /** Progress through that phase, in [0, 1]. */
  readonly progress: number;
}

/** Where the relay is at a given simulation time. */
export interface RelayState {
  /** Zero-based index of the current pass through the word list. */
  readonly pass: number;
  /** True once every configured pass has played; the scene then stops. */
  readonly finished: boolean;
  /** Words visible now — usually one, briefly two while they hand over. */
  readonly active: readonly ActiveWord[];
}

/** Seconds one word takes from first appearing to fully gone. */
export function wordCycleDuration(phases: WordRainPhaseDurations): number {
  return phases.form + phases.hold + phases.dissolve;
}

/** Seconds one full pass through every word takes, intro included. */
export function passDuration(wordCount: number, settings: WordRainSettings): number {
  const words = Math.max(1, wordCount);
  return (
    settings.introSeconds +
    (words - 1) * settings.wordIntervalSeconds +
    wordCycleDuration(settings.phases)
  );
}

/** How many passes will play; Infinity when `loopAnimation` is negative. */
export function totalPasses(settings: WordRainSettings): number {
  return settings.loopAnimation < 0 ? Infinity : Math.max(1, settings.loopAnimation);
}

/** Splits the time since a word started into a phase and its progress. */
function phaseAt(
  elapsed: number,
  phases: WordRainPhaseDurations,
): { phase: WordPhase; progress: number } {
  if (elapsed < phases.form) {
    return { phase: 'form', progress: phases.form > 0 ? elapsed / phases.form : 1 };
  }
  const afterForm = elapsed - phases.form;
  if (afterForm < phases.hold) {
    return { phase: 'hold', progress: phases.hold > 0 ? afterForm / phases.hold : 1 };
  }
  const afterHold = afterForm - phases.hold;
  return {
    phase: 'dissolve',
    progress: phases.dissolve > 0 ? Math.min(1, afterHold / phases.dissolve) : 1,
  };
}

/**
 * Maps an absolute simulation time to the state of the relay.
 *
 * Words start one `wordIntervalSeconds` apart after the intro; because
 * a word's own cycle is usually a little longer than that interval,
 * consecutive words briefly overlap — one dissolving as the next forms,
 * which is what makes the sequence read as a hand-off.
 *
 * On the very last pass of a finite `loopAnimation` the last word skips
 * its dissolve and stays lit, so the animation freezes on a readable
 * frame rather than on empty noise.
 */
export function getRelayState(timeSeconds: number, settings: WordRainSettings): RelayState {
  const wordCount = settings.words.length;
  if (wordCount === 0) {
    return { pass: 0, finished: true, active: [] };
  }

  const duration = passDuration(wordCount, settings);
  const passes = totalPasses(settings);
  const time = Math.max(0, timeSeconds);
  const pass = duration > 0 ? Math.floor(time / duration) : 0;

  // Every requested pass has played: freeze with the last word lit.
  if (pass >= passes) {
    return {
      pass: passes - 1,
      finished: true,
      active: [{ index: wordCount - 1, phase: 'hold', progress: 1 }],
    };
  }

  const localTime = time - pass * duration;
  const isFinalPass = pass === passes - 1;
  const cycle = wordCycleDuration(settings.phases);
  const active: ActiveWord[] = [];

  for (let index = 0; index < wordCount; index += 1) {
    const elapsed = localTime - (settings.introSeconds + index * settings.wordIntervalSeconds);
    if (elapsed < 0 || elapsed >= cycle) {
      continue;
    }
    const { phase, progress } = phaseAt(elapsed, settings.phases);
    if (isFinalPass && index === wordCount - 1 && phase === 'dissolve') {
      // Last word of the last pass: hold instead of dissolving.
      active.push({ index, phase: 'hold', progress: 1 });
      continue;
    }
    active.push({ index, phase, progress });
  }

  return { pass, finished: false, active };
}

/* ---- Word reveal -------------------------------------------------------- */

/**
 * Whether a mask cell is lit for a word in the given state.
 *
 * Cells switch on top-to-bottom with per-cell jitter while forming (so
 * the word condenses out of the field rather than blinking on), stay on
 * while held, and release in the same staggered order while dissolving.
 */
export function isMaskCellLit(
  cell: readonly [number, number],
  maskRows: number,
  word: ActiveWord,
): boolean {
  if (word.phase === 'hold') {
    return true;
  }
  const [col, row] = cell;
  // Threshold in [0, 1): mostly ordered by row, softened by jitter.
  const threshold = (row / Math.max(1, maskRows)) * 0.6 + hashCell(col, row, 7) * 0.4;
  return word.phase === 'form' ? word.progress >= threshold : word.progress < threshold;
}

/**
 * Opacity of a lit word cell: the word fades up out of the field while
 * forming, burns at full strength while held, and fades back down while
 * dissolving. This is what makes the words "become more obvious".
 */
export function wordCellAlpha(word: ActiveWord, fieldOpacity: number): number {
  const range = 1 - fieldOpacity;
  if (word.phase === 'form') {
    return fieldOpacity + range * Math.min(1, Math.max(0, word.progress));
  }
  if (word.phase === 'dissolve') {
    return 1 - range * Math.min(1, Math.max(0, word.progress));
  }
  return 1;
}
