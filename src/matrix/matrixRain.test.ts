/**
 * Unit tests for the pure Matrix rain simulation logic: PRNG and cell
 * hashing determinism, bitmap word masks, the looping phase machine,
 * mask-cell lighting and the falling-drop model.
 */
import { describe, expect, it } from 'vitest';
import {
  DROP_MAX_SPEED,
  DROP_MIN_SPEED,
  GLYPH_HEIGHT,
  GLYPH_SPACING,
  GLYPH_WIDTH,
  buildWordMask,
  cellDigit,
  createDrops,
  createRandom,
  getCycleState,
  hashCell,
  isMaskCellLit,
  maxWordColumns,
  stepDrops,
} from './matrixRain';
import type { MatrixPhaseDurations } from './matrixRain';
import { matrixSettings } from './matrixSettings';

/** Simple round-number phase timings used across the cycle tests. */
const phases: MatrixPhaseDurations = { rain: 2, form: 1, hold: 3, dissolve: 1 };

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    for (let i = 0; i < 20; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('hashCell / cellDigit', () => {
  it('is deterministic and salt-sensitive', () => {
    expect(hashCell(3, 5, 1)).toBe(hashCell(3, 5, 1));
    expect(hashCell(3, 5, 1)).not.toBe(hashCell(3, 5, 2));
  });

  it('stays in [0, 1) across many cells', () => {
    for (let col = 0; col < 30; col += 1) {
      for (let row = 0; row < 30; row += 1) {
        const value = hashCell(col, row, 3);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
  });

  it('only ever yields the binary digits', () => {
    const digits = new Set<string>();
    for (let col = 0; col < 40; col += 1) {
      digits.add(cellDigit(col, col * 3, 1));
    }
    expect([...digits].sort()).toEqual(['0', '1']);
  });
});

describe('buildWordMask', () => {
  it('builds masks for both configured hero words', () => {
    for (const word of matrixSettings.words) {
      const mask = buildWordMask(word);
      expect(mask.rows).toBe(GLYPH_HEIGHT);
      expect(mask.columns).toBe([...word].length * (GLYPH_WIDTH + GLYPH_SPACING) - GLYPH_SPACING);
      expect(mask.cells.length).toBeGreaterThan(0);
    }
  });

  it('keeps every lit cell inside the mask bounds', () => {
    const mask = buildWordMask('CmdRest');
    for (const [col, row] of mask.cells) {
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(mask.columns);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(mask.rows);
    }
  });

  it('renders the T glyph with its full top bar and center stem', () => {
    const mask = buildWordMask('T');
    // Top row: all five columns lit.
    for (let col = 0; col < GLYPH_WIDTH; col += 1) {
      expect(mask.cells).toContainEqual([col, 0]);
    }
    // Stem: center column lit on every following row.
    for (let row = 1; row < GLYPH_HEIGHT; row += 1) {
      expect(mask.cells).toContainEqual([2, row]);
    }
  });

  it('throws for characters missing from the bitmap font', () => {
    expect(() => buildWordMask('Cmd!')).toThrow(/No bitmap glyph/);
  });

  it('reports the widest word via maxWordColumns', () => {
    expect(maxWordColumns(['Test', 'CmdRest'])).toBe(buildWordMask('CmdRest').columns);
  });
});

describe('getCycleState', () => {
  it('walks through all four phases of the first word', () => {
    expect(getCycleState(0.5, 2, phases)).toMatchObject({ wordIndex: 0, phase: 'rain' });
    expect(getCycleState(2.5, 2, phases)).toMatchObject({ wordIndex: 0, phase: 'form' });
    expect(getCycleState(4, 2, phases)).toMatchObject({ wordIndex: 0, phase: 'hold' });
    expect(getCycleState(6.5, 2, phases)).toMatchObject({ wordIndex: 0, phase: 'dissolve' });
  });

  it('moves to the second word after one full cycle', () => {
    // One cycle lasts 2+1+3+1 = 7 seconds.
    expect(getCycleState(7.5, 2, phases)).toMatchObject({ wordIndex: 1, phase: 'rain' });
  });

  it('loops back to the first word after all words have played', () => {
    // Two words * 7 seconds: time 14.5 is 0.5s into the next loop.
    const state = getCycleState(14.5, 2, phases);
    expect(state).toMatchObject({ wordIndex: 0, phase: 'rain' });
    expect(state.progress).toBeCloseTo(0.25);
  });

  it('reports phase progress in [0, 1)', () => {
    for (let t = 0; t < 30; t += 0.37) {
      const state = getCycleState(t, 2, phases);
      expect(state.progress).toBeGreaterThanOrEqual(0);
      expect(state.progress).toBeLessThanOrEqual(1);
    }
  });
});

describe('isMaskCellLit', () => {
  const cell: readonly [number, number] = [3, 2];

  it('is unlit while raining and lit while holding', () => {
    expect(isMaskCellLit(cell, GLYPH_HEIGHT, { wordIndex: 0, phase: 'rain', progress: 0.9 })).toBe(
      false,
    );
    expect(isMaskCellLit(cell, GLYPH_HEIGHT, { wordIndex: 0, phase: 'hold', progress: 0.1 })).toBe(
      true,
    );
  });

  it('lights every cell by the end of the form phase and releases all by the end of dissolve', () => {
    const mask = buildWordMask('Test');
    for (const maskCell of mask.cells) {
      expect(
        isMaskCellLit(maskCell, mask.rows, { wordIndex: 0, phase: 'form', progress: 1 }),
      ).toBe(true);
      expect(
        isMaskCellLit(maskCell, mask.rows, { wordIndex: 0, phase: 'dissolve', progress: 1 }),
      ).toBe(false);
    }
  });

  it('lights progressively more cells as the form phase advances', () => {
    const mask = buildWordMask('CmdRest');
    const litCount = (progress: number): number =>
      mask.cells.filter((maskCell) =>
        isMaskCellLit(maskCell, mask.rows, { wordIndex: 0, phase: 'form', progress }),
      ).length;
    expect(litCount(0.05)).toBeLessThan(litCount(0.5));
    expect(litCount(0.5)).toBeLessThan(litCount(0.99));
  });
});

describe('drops', () => {
  it('creates one drop per column, above the grid, within the speed range', () => {
    const drops = createDrops(24, createRandom(1));
    expect(drops).toHaveLength(24);
    for (const drop of drops) {
      expect(drop.row).toBeLessThanOrEqual(0);
      expect(drop.speed).toBeGreaterThanOrEqual(DROP_MIN_SPEED);
      expect(drop.speed).toBeLessThanOrEqual(DROP_MAX_SPEED);
    }
  });

  it('advances drops by speed * delta', () => {
    const drops = [{ row: 0, speed: 10 }];
    stepDrops(drops, 100, 0.5, createRandom(1));
    expect(drops[0]?.row).toBeCloseTo(5);
  });

  it('respawns a drop above the top after it falls past the bottom', () => {
    const drops = [{ row: 50, speed: 10 }];
    stepDrops(drops, 20, 1, createRandom(1));
    expect(drops[0]?.row).toBeLessThanOrEqual(0);
  });

  it('keeps every drop cycling forever without leaving the band', () => {
    const random = createRandom(9);
    const rows = 30;
    const drops = createDrops(10, random);
    for (let frame = 0; frame < 1000; frame += 1) {
      stepDrops(drops, rows, 1 / 60, random);
      for (const drop of drops) {
        expect(drop.row).toBeLessThanOrEqual(rows + 2 + DROP_MAX_SPEED / 60 + 1e-9);
      }
    }
  });
});
