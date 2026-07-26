/**
 * The Features page's word-rain banner: a wide strip of flickering
 * alphanumeric characters out of which the words from
 * `wordRainSettings.words` ("Request", "Response", "Assertions",
 * "Report") condense as pixel art, one after another from left to
 * right, then release back into the noise.
 *
 * The words are drawn from the very same characters as the background
 * field — only brighter — so they read as large letters made of small
 * ones rather than as spelled-out text.
 *
 * All simulation math lives in the pure `wordRain.ts` module; this file
 * only handles the canvas, the animation-frame loop and the start/stop
 * controller.
 *
 * Controlling the animation
 * -------------------------
 * - Clicking anywhere inside the animation toggles it (and restarts a
 *   sequence that has already finished).
 * - Programmatically via the helpers in `wordRainController.ts`
 *   (`startWordRainAnimation()`, `stopWordRainAnimation()`, ...).
 * - From the browser console: `window.cmdrestWordRain.stop()` etc.
 */
import { useEffect, useRef } from 'react';
import { wordRainSettings } from './wordRainSettings';
import {
  DEFAULT_WORD_RAIN_ID,
  registerWordRainController,
  unregisterWordRainController,
} from './wordRainController';
import type { WordRainAnimationController } from './wordRainController';
import { buildWordMask } from './glyphFont';
import type { WordMask } from './glyphFont';
import {
  FIELD_CHARS,
  cellFlickerSalt,
  computeCellSize,
  computeWordRow,
  computeWordSlots,
  fieldCharIndex,
  fieldIsLight,
  getRelayState,
  isMaskCellLit,
  wordCellAlpha,
  wordCellIsLight,
} from './wordRain';
import type { WordRainSettings } from './wordRain';
import { logInteraction } from '../logging';

/** Everything derived from the canvas size, rebuilt on resize. */
interface GridLayout {
  /** Strip size in CSS pixels. */
  width: number;
  height: number;
  /** Character cell size in CSS pixels. */
  cellSize: number;
  columns: number;
  rows: number;
  /** Left edge of each word, in cells. */
  slots: number[];
  /** Top edge shared by every word, in cells. */
  wordRow: number;
}

/** Reads the user's reduced-motion preference (false where unsupported). */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Renders the word-rain banner, filling the width of its parent at the
 * configured height.
 *
 * Respects `prefers-reduced-motion`: users who ask for less motion get
 * a static frame with the first word formed, and can still start the
 * animation with a click.
 */
export function WordRainScene({
  settings = wordRainSettings,
  id = DEFAULT_WORD_RAIN_ID,
}: {
  /** Injection point for tests; the app always uses `wordRainSettings`. */
  settings?: WordRainSettings;
  /** Registry key, so several banners could coexist later. */
  id?: string;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<WordRainAnimationController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return undefined;
    }

    const masks: WordMask[] = settings.words.map(buildWordMask);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let layout: GridLayout = {
      width: 0,
      height: settings.height,
      cellSize: settings.fontSize,
      columns: 1,
      rows: 1,
      slots: [],
      wordRow: 0,
    };

    /** Simulation clock in seconds, already scaled by `settings.speed`. */
    let simTime = 0;
    /** Seconds of simulation since the last repaint (frame-rate cap). */
    let sinceRepaint = 0;
    let lastFrame: number | null = null;
    let frameId: number | null = null;
    /** Whether the animation is *meant* to be playing. */
    let running = false;
    /** Whether the strip is on screen; off-screen strips stop painting. */
    let visible = true;
    /** True once a finite `loopAnimation` has played out. */
    let finished = false;

    /**
     * Glyph atlas: every field character pre-rendered once in both
     * colors, laid out as a strip of `cellSize` squares (top row light,
     * bottom row dark).
     *
     * A full field repaint touches every cell — around 1800 of them on
     * a desktop-width strip — and `fillText` is far too slow to do that
     * dozens of times a second. Blitting from this atlas instead keeps
     * the banner cheap enough to leave the main thread free.
     */
    let atlas: HTMLCanvasElement | null = null;

    /** Renders the atlas for a cell size; null if canvas is unavailable. */
    const buildAtlas = (cellSize: number): HTMLCanvasElement | null => {
      const sheet = document.createElement('canvas');
      sheet.width = Math.max(1, Math.round(FIELD_CHARS.length * cellSize * dpr));
      sheet.height = Math.max(1, Math.round(2 * cellSize * dpr));
      const sheetCtx = sheet.getContext('2d');
      if (!sheetCtx) {
        return null;
      }
      sheetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sheetCtx.font = `bold ${Math.max(cellSize - 1, 5)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      sheetCtx.textAlign = 'center';
      sheetCtx.textBaseline = 'middle';
      [settings.textColorLight, settings.textColorDark].forEach((color, colorRow) => {
        sheetCtx.fillStyle = color;
        for (let index = 0; index < FIELD_CHARS.length; index += 1) {
          sheetCtx.fillText(
            FIELD_CHARS.charAt(index),
            (index + 0.5) * cellSize,
            (colorRow + 0.5) * cellSize,
          );
        }
      });
      return sheet;
    };

    /** Rebuilds the grid and the word slots for a new size. */
    const applySize = (): void => {
      const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 960;
      const height = settings.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cellSize = computeCellSize(width, height, settings);
      const columns = Math.max(1, Math.ceil(width / cellSize));
      const rows = Math.max(1, Math.ceil(height / cellSize));
      if (!atlas || cellSize !== layout.cellSize) {
        atlas = buildAtlas(cellSize);
      }
      layout = {
        width,
        height,
        cellSize,
        columns,
        rows,
        slots: computeWordSlots(masks, columns),
        wordRow: computeWordRow(rows),
      };
    };

    /** Blits one pre-rendered character into a grid cell. */
    const drawCell = (charIndex: number, light: boolean, col: number, row: number): void => {
      if (!atlas) {
        return;
      }
      const size = layout.cellSize;
      const source = Math.round(size * dpr);
      ctx.drawImage(
        atlas,
        charIndex * source,
        light ? 0 : source,
        source,
        source,
        col * size,
        row * size,
        size,
        size,
      );
    };

    /** Starts or cancels the frame loop to match the current intent. */
    const syncLoop = (): void => {
      const shouldRun = running && visible;
      if (shouldRun && frameId === null) {
        if (typeof window.requestAnimationFrame !== 'function') {
          return;
        }
        lastFrame = null;
        frameId = window.requestAnimationFrame(onFrame);
      } else if (!shouldRun && frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    /** Paints one frame from the current simulation time. */
    const paint = (): void => {
      const { columns, rows, slots, wordRow, width, height } = layout;

      ctx.globalAlpha = 1;
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Background field: every cell shows a random character in one of
      // the two greens, re-rolled a few times a second on its own beat.
      ctx.globalAlpha = settings.fieldOpacity;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const salt = cellFlickerSalt(simTime, col, row, settings.flickerRate);
          drawCell(fieldCharIndex(col, row, salt), fieldIsLight(col, row, salt), col, row);
        }
      }

      // Word overlay: the lit mask cells repaint the *same* characters
      // at (nearly) full opacity, so a large word appears to burn its
      // way out of the field without any new glyphs being introduced.
      const state = getRelayState(simTime, settings);
      for (const word of state.active) {
        const mask = masks[word.index];
        if (!mask) {
          continue;
        }
        const originCol = slots[word.index] ?? 0;
        ctx.globalAlpha = wordCellAlpha(word, settings.fieldOpacity);
        for (const cell of mask.cells) {
          if (!isMaskCellLit(cell, mask.rows, word)) {
            continue;
          }
          const col = originCol + cell[0];
          const row = wordRow + cell[1];
          const salt = cellFlickerSalt(simTime, col, row, settings.flickerRate);
          // Mostly bright green with a few darker sparks mixed in, so the
          // word uses the same two shades as the field itself.
          const light = wordCellIsLight(col, row, word.index);
          drawCell(fieldCharIndex(col, row, salt), light, col, row);
        }
      }
      ctx.globalAlpha = 1;

      // A finite `loopAnimation` has played out: freeze on this frame.
      if (state.finished) {
        finished = true;
        if (running) {
          running = false;
          syncLoop();
        }
      }
    };

    /** requestAnimationFrame callback while the animation is running. */
    function onFrame(now: number): void {
      frameId = window.requestAnimationFrame(onFrame);
      const deltaMs = lastFrame === null ? 16 : now - lastFrame;
      lastFrame = now;
      // Clamp long gaps (background tab) and apply the speed setting.
      const delta = (Math.min(deltaMs, 100) / 1000) * settings.speed;
      simTime += delta;
      sinceRepaint += delta;
      // Redrawing every cell is the expensive part, so repaint at the
      // configured frame rate while the clock keeps real time.
      const minInterval = settings.frameRate > 0 ? 1 / settings.frameRate : 0;
      if (sinceRepaint + 1e-6 < minInterval) {
        return;
      }
      sinceRepaint = 0;
      paint();
    }

    const start = (): void => {
      if (finished) {
        // Replay from the top rather than resuming a finished sequence.
        simTime = 0;
        sinceRepaint = 0;
        finished = false;
      }
      running = true;
      syncLoop();
    };

    const stop = (): void => {
      running = false;
      syncLoop();
    };

    const controller: WordRainAnimationController = {
      start,
      stop,
      toggle: () => {
        if (running) {
          stop();
        } else {
          start();
        }
        return running;
      },
      isRunning: () => running,
    };
    controllerRef.current = controller;
    registerWordRainController(id, controller);

    applySize();
    if (prefersReducedMotion()) {
      // Static frame with the first word fully formed; a click opts in.
      simTime = settings.introSeconds + settings.phases.form + settings.phases.hold / 2;
      paint();
    } else {
      paint();
      start();
    }

    // Re-layout when the container changes size (jsdom lacks the API).
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        applySize();
        paint();
      });
      resizeObserver.observe(canvas);
    }

    // Stop burning frames while the strip is scrolled out of view.
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        syncLoop();
      });
      intersectionObserver.observe(canvas);
    }

    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      controllerRef.current = null;
      unregisterWordRainController(id, controller);
    };
  }, [settings, id]);

  /** Click anywhere inside the animation to stop/restart it. */
  const handleClick = (): void => {
    const nowRunning = controllerRef.current?.toggle() ?? false;
    logInteraction('wordrain-toggle', { running: nowRunning });
  };

  return (
    <canvas
      ref={canvasRef}
      className="wordrain-scene"
      data-testid="wordrain-scene"
      style={{ height: settings.height }}
      role="img"
      aria-label={`Animated field of characters out of which the words ${settings.words.join(', ')} appear in turn. Click to pause or resume.`}
      onClick={handleClick}
    />
  );
}
