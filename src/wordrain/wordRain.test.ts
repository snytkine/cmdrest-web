/**
 * Tests for the pure word-rain simulation: the bitmap font, the grid
 * layout, the relay timeline and the word reveal. None of this needs a
 * canvas, so the whole animation's behavior is assertable here.
 */
import { describe, expect, it } from 'vitest';
import {
  GLYPHS,
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  buildWordMask,
  canRenderWord,
  maxWordColumns,
} from './glyphFont';
import {
  FIELD_CHARS,
  FIELD_LIGHT_RATIO,
  MIN_CELL_SIZE,
  cellFlickerSalt,
  computeCellSize,
  computeWordRow,
  computeWordSlots,
  fieldChar,
  fieldIsLight,
  getRelayState,
  hashCell,
  isMaskCellLit,
  passDuration,
  totalPasses,
  wordCellAlpha,
  wordCellIsLight,
  wordCycleDuration,
} from './wordRain';
import type { WordRainSettings } from './wordRain';
import { wordRainSettings } from './wordRainSettings';

/** Settings with round numbers, so timeline assertions read clearly. */
const testSettings: WordRainSettings = {
  ...wordRainSettings,
  words: ['One', 'Two', 'Three'],
  introSeconds: 2,
  wordIntervalSeconds: 1,
  phases: { form: 0.5, hold: 0.4, dissolve: 0.4 },
  loopAnimation: -1,
};

describe('glyphFont', () => {
  it('defines every glyph as a well-formed 5x7 bitmap', () => {
    for (const [char, rows] of Object.entries(GLYPHS)) {
      expect(rows, `glyph "${char}" row count`).toHaveLength(GLYPH_HEIGHT);
      for (const row of rows) {
        expect(row, `glyph "${char}" row "${row}"`).toHaveLength(GLYPH_WIDTH);
        expect(row, `glyph "${char}" row "${row}"`).toMatch(/^[.#]+$/);
      }
    }
  });

  it('covers the full alphanumeric range plus space', () => {
    const expected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    for (const char of expected) {
      expect(GLYPHS[char], `missing glyph for "${char}"`).toBeDefined();
    }
  });

  it('can render every word shipped in the settings', () => {
    for (const word of wordRainSettings.words) {
      expect(canRenderWord(word), `cannot render "${word}"`).toBe(true);
      expect(() => buildWordMask(word)).not.toThrow();
    }
  });

  it('throws a helpful error for a character the font lacks', () => {
    expect(canRenderWord('Wow!')).toBe(false);
    expect(() => buildWordMask('Wow!')).toThrow(/No bitmap glyph for character "!"/);
  });

  it('lays glyphs out side by side with one blank column between them', () => {
    // 10 glyphs * (5 wide + 1 spacing) - the trailing spacing.
    expect(maxWordColumns(['Assertions'])).toBe(59);
    const mask = buildWordMask('II');
    expect(mask.columns).toBe(11);
    expect(mask.rows).toBe(GLYPH_HEIGHT);
    // The second I starts six columns right of the first.
    expect(mask.cells.some(([col]) => col === 2)).toBe(true);
    expect(mask.cells.some(([col]) => col === 8)).toBe(true);
    // The spacing column between the two glyphs stays blank.
    expect(mask.cells.some(([col]) => col === 5)).toBe(false);
  });

  it('treats a space as blank columns and an empty word as empty', () => {
    expect(buildWordMask(' ').cells).toHaveLength(0);
    expect(buildWordMask('').columns).toBe(0);
    expect(maxWordColumns([])).toBe(0);
  });
});

describe('character field', () => {
  it('hashes cells deterministically into [0, 1)', () => {
    for (let col = 0; col < 20; col += 1) {
      for (let row = 0; row < 12; row += 1) {
        const value = hashCell(col, row, 3);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
        expect(hashCell(col, row, 3)).toBe(value);
      }
    }
  });

  it('only ever draws characters from the field alphabet', () => {
    for (let salt = 0; salt < 5; salt += 1) {
      for (let col = 0; col < 30; col += 1) {
        expect(FIELD_CHARS).toContain(fieldChar(col, salt, salt));
      }
    }
  });

  it('keeps the field mostly dark so the words can stand out', () => {
    let light = 0;
    for (let col = 0; col < 40; col += 1) {
      for (let row = 0; row < 10; row += 1) {
        if (fieldIsLight(col, row, 1)) {
          light += 1;
        }
      }
    }
    // Roughly FIELD_LIGHT_RATIO of 400 cells; the hash is uniform, not exact.
    const expected = 400 * FIELD_LIGHT_RATIO;
    expect(light).toBeGreaterThan(expected * 0.7);
    expect(light).toBeLessThan(expected * 1.3);
  });

  it('draws the great majority of a word in the light color', () => {
    let light = 0;
    for (let col = 0; col < 40; col += 1) {
      for (let row = 0; row < 10; row += 1) {
        if (wordCellIsLight(col, row, 0)) {
          light += 1;
        }
      }
    }
    // Word cells must be far lighter than the field, or the letters
    // read as slightly brighter noise instead of as shapes.
    expect(light / 400).toBeGreaterThan(FIELD_LIGHT_RATIO * 2);
    expect(light / 400).toBeLessThan(1);
  });

  it('advances the flicker salt over time and staggers it per cell', () => {
    const early = cellFlickerSalt(0, 4, 2, 12);
    const later = cellFlickerSalt(1, 4, 2, 12);
    expect(later).toBeGreaterThan(early);
    // Neighboring cells re-roll on their own beat, not all together.
    const neighbors = new Set([
      cellFlickerSalt(0.5, 0, 0, 12),
      cellFlickerSalt(0.5, 1, 0, 12),
      cellFlickerSalt(0.5, 2, 0, 12),
      cellFlickerSalt(0.5, 3, 0, 12),
    ]);
    expect(neighbors.size).toBeGreaterThan(1);
  });
});

describe('grid layout', () => {
  it('uses the preferred font size when the strip has room', () => {
    expect(computeCellSize(1072, 80, testSettings)).toBe(testSettings.fontSize);
  });

  it('shrinks cells so the widest word fits across a narrow strip', () => {
    const settings = { ...testSettings, words: ['Assertions'] };
    // 59 columns + 2 * SLOT_MARGIN = 63 cells must fit in 315px.
    const cellSize = computeCellSize(315, 80, settings);
    expect(cellSize).toBe(5);
    expect(63 * cellSize).toBeLessThanOrEqual(315);
  });

  it('shrinks cells so the seven glyph rows fit a short strip', () => {
    expect(computeCellSize(1072, 45, testSettings)).toBe(5);
  });

  it('never goes below the minimum legible cell size', () => {
    expect(computeCellSize(10, 10, testSettings)).toBe(MIN_CELL_SIZE);
  });

  it('spreads word slots left to right without leaving the grid', () => {
    const masks = wordRainSettings.words.map(buildWordMask);
    const slots = computeWordSlots(masks, 154);
    expect(slots).toHaveLength(4);
    let previous = -1;
    slots.forEach((slot, index) => {
      expect(slot).toBeGreaterThan(previous);
      previous = slot;
      expect(slot + (masks[index]?.columns ?? 0)).toBeLessThanOrEqual(154);
    });
  });

  it('centers a single word and keeps oversized words on screen', () => {
    const [only] = computeWordSlots([buildWordMask('One')], 40);
    expect(only).toBe(Math.floor((40 - buildWordMask('One').columns) / 2));
    // A word wider than the grid still starts at the left edge.
    expect(computeWordSlots([buildWordMask('Assertions')], 20)).toEqual([0]);
    expect(computeWordSlots([], 40)).toEqual([]);
  });

  it('centers the words vertically in the grid', () => {
    expect(computeWordRow(11)).toBe(2);
    // A grid shorter than the glyphs still starts at the top row.
    expect(computeWordRow(5)).toBe(0);
  });
});

describe('relay timeline', () => {
  const cycle = wordCycleDuration(testSettings.phases); // 1.3s
  const pass = passDuration(testSettings.words.length, testSettings); // 2 + 2 + 1.3

  it('derives the pass duration from the intro, intervals and phases', () => {
    expect(cycle).toBeCloseTo(1.3);
    expect(pass).toBeCloseTo(5.3);
  });

  it('shows nothing but the field during the intro', () => {
    expect(getRelayState(0, testSettings).active).toEqual([]);
    expect(getRelayState(1.99, testSettings).active).toEqual([]);
    expect(getRelayState(0, testSettings).finished).toBe(false);
  });

  it('forms each word one interval after the previous one', () => {
    // Word 0 starts at 2s, word 1 at 3s, word 2 at 4s.
    expect(getRelayState(2.01, testSettings).active[0]).toMatchObject({
      index: 0,
      phase: 'form',
    });
    expect(getRelayState(3.01, testSettings).active.at(-1)).toMatchObject({
      index: 1,
      phase: 'form',
    });
    expect(getRelayState(4.01, testSettings).active.at(-1)).toMatchObject({
      index: 2,
      phase: 'form',
    });
  });

  it('walks one word through form, hold and dissolve', () => {
    const phases = ['form', 'hold', 'dissolve'] as const;
    const samples = [2.25, 2.7, 3.2].map(
      (time) => getRelayState(time, testSettings).active.find((word) => word.index === 0)?.phase,
    );
    expect(samples).toEqual([...phases]);
    // Past its cycle the word is gone.
    expect(
      getRelayState(2 + cycle + 0.01, testSettings).active.some((word) => word.index === 0),
    ).toBe(false);
  });

  it('overlaps consecutive words as one hands over to the next', () => {
    // Word 0 is dissolving (started 2s, dissolve from 2.9s) while word 1
    // is still forming (started 3s, forms until 3.5s).
    const active = getRelayState(3.2, testSettings).active;
    expect(active.map((word) => word.index)).toEqual([0, 1]);
    expect(active.map((word) => word.phase)).toEqual(['dissolve', 'form']);
  });

  it('reports progress within the current phase', () => {
    const [word] = getRelayState(2.25, testSettings).active;
    expect(word?.phase).toBe('form');
    expect(word?.progress).toBeCloseTo(0.5);
  });

  it('loops forever while loopAnimation is negative', () => {
    expect(totalPasses(testSettings)).toBe(Infinity);
    const second = getRelayState(pass + 2.01, testSettings);
    expect(second.pass).toBe(1);
    expect(second.finished).toBe(false);
    expect(second.active[0]).toMatchObject({ index: 0, phase: 'form' });
    const hundredth = getRelayState(pass * 99 + 2.01, testSettings);
    expect(hundredth.finished).toBe(false);
  });

  it('stops after the configured number of passes', () => {
    const twice = { ...testSettings, loopAnimation: 2 };
    expect(totalPasses(twice)).toBe(2);
    expect(getRelayState(pass + 2.01, twice).finished).toBe(false);
    const done = getRelayState(pass * 2 + 0.01, twice);
    expect(done.finished).toBe(true);
    expect(done.pass).toBe(1);
    // It freezes on the last word, fully lit, rather than on empty noise.
    expect(done.active).toEqual([{ index: 2, phase: 'hold', progress: 1 }]);
  });

  it('holds the last word instead of dissolving it on the final pass', () => {
    const once = { ...testSettings, loopAnimation: 1 };
    // 4s + form + hold = the moment word 2 would start dissolving.
    const state = getRelayState(4.95, once);
    expect(state.finished).toBe(false);
    expect(state.active.at(-1)).toEqual({ index: 2, phase: 'hold', progress: 1 });
    // Earlier words still dissolve normally on that same pass.
    expect(getRelayState(3.2, once).active[0]?.phase).toBe('dissolve');
  });

  it('treats loopAnimation 0 as a single pass', () => {
    expect(totalPasses({ ...testSettings, loopAnimation: 0 })).toBe(1);
  });

  it('handles an empty word list without dividing by zero', () => {
    const empty = getRelayState(5, { ...testSettings, words: [] });
    expect(empty).toEqual({ pass: 0, finished: true, active: [] });
  });

  it('clamps negative times to the start of the sequence', () => {
    expect(getRelayState(-5, testSettings).active).toEqual([]);
  });
});

describe('word reveal', () => {
  const mask = buildWordMask('One');

  /** Number of lit cells in the mask for the given word state. */
  const litCount = (phase: 'form' | 'hold' | 'dissolve', progress: number): number =>
    mask.cells.filter((cell) => isMaskCellLit(cell, mask.rows, { index: 0, phase, progress }))
      .length;

  it('condenses the word out of the field while forming', () => {
    expect(litCount('form', 0)).toBe(0);
    expect(litCount('form', 0.5)).toBeGreaterThan(0);
    expect(litCount('form', 0.5)).toBeLessThan(mask.cells.length);
    expect(litCount('form', 1)).toBe(mask.cells.length);
  });

  it('lights the whole word while it is held', () => {
    expect(litCount('hold', 0)).toBe(mask.cells.length);
    expect(litCount('hold', 1)).toBe(mask.cells.length);
  });

  it('releases the word back into the field while dissolving', () => {
    expect(litCount('dissolve', 0)).toBe(mask.cells.length);
    expect(litCount('dissolve', 0.5)).toBeLessThan(mask.cells.length);
    expect(litCount('dissolve', 1)).toBe(0);
  });

  it('reveals cells roughly top to bottom', () => {
    const lit = mask.cells.filter((cell) =>
      isMaskCellLit(cell, mask.rows, { index: 0, phase: 'form', progress: 0.35 }),
    );
    const averageRow = lit.reduce((sum, [, row]) => sum + row, 0) / lit.length;
    expect(averageRow).toBeLessThan((mask.rows - 1) / 2);
  });

  it('fades word cells up from the field opacity and back down', () => {
    const opacity = 0.4;
    expect(wordCellAlpha({ index: 0, phase: 'form', progress: 0 }, opacity)).toBeCloseTo(0.4);
    expect(wordCellAlpha({ index: 0, phase: 'form', progress: 1 }, opacity)).toBeCloseTo(1);
    expect(wordCellAlpha({ index: 0, phase: 'hold', progress: 0.5 }, opacity)).toBe(1);
    expect(wordCellAlpha({ index: 0, phase: 'dissolve', progress: 1 }, opacity)).toBeCloseTo(0.4);
  });
});
