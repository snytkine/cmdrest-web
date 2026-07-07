/**
 * The hero's Matrix rain scene: binary digits (0/1) raining down inside
 * a terminal-style canvas, with the words from `matrixSettings.words`
 * ("CmdRest", "Test") repeatedly condensing out of the rain and
 * dissolving back into it.
 *
 * All simulation math lives in the pure `matrixRain.ts` module; this
 * file only handles the canvas, the animation-frame loop and the
 * start/stop controller.
 *
 * Controlling the animation
 * -------------------------
 * - Clicking anywhere inside the animation toggles it.
 * - Programmatically via the helpers in `matrixController.ts`
 *   (`startMatrixAnimation()`, `stopMatrixAnimation()`, ...).
 * - From the browser console: `window.cmdrestMatrix.stop()` etc.
 */
import { useEffect, useRef } from 'react';
import { matrixSettings } from './matrixSettings';
import {
  registerMatrixAnimationController,
  unregisterMatrixAnimationController,
} from './matrixController';
import type { MatrixAnimationController } from './matrixController';
import {
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
import type { Drop, MatrixRainSettings, WordMask } from './matrixRain';
import { logInteraction } from '../logging';

/** Everything derived from the canvas size, rebuilt on resize. */
interface GridLayout {
  cellSize: number;
  columns: number;
  rows: number;
}

/**
 * Picks the character cell size for a canvas width: the configured
 * `fontSize` when it fits, otherwise shrunk so the widest word (plus a
 * small margin) always fits on screen.
 */
function computeCellSize(width: number, settings: MatrixRainSettings): number {
  const widest = maxWordColumns(settings.words) + 4;
  const fitting = Math.floor(width / widest);
  return Math.max(6, Math.min(settings.fontSize, fitting));
}

/** Reads the user's reduced-motion preference (false where unsupported). */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Renders the Matrix rain animation, filling its parent element.
 *
 * Respects `prefers-reduced-motion`: users who ask for less motion get
 * a static frame with the first word formed, and can still start the
 * animation with a click.
 */
export function MatrixScene({
  settings = matrixSettings,
}: {
  /** Injection point for tests; the app always uses `matrixSettings`. */
  settings?: MatrixRainSettings;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<MatrixAnimationController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return undefined;
    }

    const random = createRandom(20260707);
    const masks: WordMask[] = settings.words.map(buildWordMask);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let layout: GridLayout = { cellSize: settings.fontSize, columns: 1, rows: 1 };
    let drops: Drop[] = [];
    /** Simulation clock in seconds, already scaled by `settings.speed`. */
    let simTime = 0;
    let lastFrame: number | null = null;
    let frameId: number | null = null;
    let running = false;

    /** Rebuilds the grid and repaints the background for a new size. */
    const applySize = (): void => {
      const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
      const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 400;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cellSize = computeCellSize(width, settings);
      layout = {
        cellSize,
        columns: Math.max(1, Math.ceil(width / cellSize)),
        rows: Math.max(1, Math.ceil(height / cellSize)),
      };
      drops = createDrops(layout.columns, random);
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    };

    /** Draws one character in a grid cell. */
    const drawChar = (char: string, col: number, row: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.fillText(char, (col + 0.5) * layout.cellSize, (row + 0.5) * layout.cellSize);
    };

    /** Advances the simulation and paints one frame. */
    const renderFrame = (deltaSeconds: number): void => {
      simTime += deltaSeconds;
      stepDrops(drops, layout.rows, deltaSeconds, random);

      const { cellSize, columns, rows } = layout;
      ctx.font = `bold ${Math.max(cellSize - 3, 5)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Translucent background pass: previously drawn characters fade a
      // little every frame, which is what produces the falling trails.
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, columns * cellSize, rows * cellSize);
      ctx.globalAlpha = 1;

      // Rain: each column's drop head is a bright digit, with a darker
      // digit just behind it; the fade pass turns the rest into trails.
      // The digit salt changes a few times per second so heads flicker.
      const flickerSalt = Math.floor(simTime * 8);
      drops.forEach((drop, col) => {
        const headRow = Math.floor(drop.row);
        if (headRow >= 0 && headRow < rows) {
          drawChar(cellDigit(col, headRow, flickerSalt), col, headRow, settings.headColor);
        }
        if (headRow - 1 >= 0 && headRow - 1 < rows) {
          drawChar(cellDigit(col, headRow - 1, flickerSalt), col, headRow - 1, settings.trailColor);
        }
      });

      // Word overlay: lit mask cells repaint at full opacity every frame
      // so they hold steady against the fade pass, making the word appear
      // to solidify out of the rain and later dissolve back into it.
      const cycle = getCycleState(simTime, settings.words.length, settings.phases);
      const mask = masks[cycle.wordIndex];
      if (mask) {
        const originCol = Math.floor((columns - mask.columns) / 2);
        const originRow = Math.floor((rows - mask.rows) / 2);
        for (const cell of mask.cells) {
          if (!isMaskCellLit(cell, mask.rows, cycle)) {
            continue;
          }
          const [col, row] = cell;
          // Mostly bright green with darker sparks mixed in, so the word
          // uses the same two shades as the rain itself.
          const color = hashCell(col, row, cycle.wordIndex) < 0.8
            ? settings.headColor
            : settings.trailColor;
          drawChar(cellDigit(col, row, cycle.wordIndex), originCol + col, originRow + row, color);
        }
      }
    };

    /** requestAnimationFrame callback while the animation is running. */
    const onFrame = (now: number): void => {
      const deltaMs = lastFrame === null ? 16 : now - lastFrame;
      lastFrame = now;
      // Clamp long gaps (background tab) and apply the speed setting.
      renderFrame(Math.min(deltaMs, 100) / 1000 * settings.speed);
      frameId = window.requestAnimationFrame(onFrame);
    };

    const start = (): void => {
      if (running || typeof window.requestAnimationFrame !== 'function') {
        running = true;
        return;
      }
      running = true;
      lastFrame = null;
      frameId = window.requestAnimationFrame(onFrame);
    };

    const stop = (): void => {
      running = false;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const controller: MatrixAnimationController = {
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
    registerMatrixAnimationController(controller);

    applySize();
    // Warm-up: simulate a couple of seconds in fixed steps so the very
    // first visible frame already has trails and (for reduced-motion
    // visitors, who see only this frame) the first word fully formed.
    const warmupTarget = settings.phases.rain + settings.phases.form + settings.phases.hold / 2;
    for (let t = 0; t < warmupTarget; t += 1 / 30) {
      renderFrame(1 / 30);
    }

    if (!prefersReducedMotion()) {
      start();
    }

    // Re-layout when the container changes size (jsdom lacks the API).
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        applySize();
        renderFrame(0);
      });
      resizeObserver.observe(canvas);
    }

    return () => {
      stop();
      resizeObserver?.disconnect();
      controllerRef.current = null;
      unregisterMatrixAnimationController(controller);
    };
  }, [settings]);

  /** Click anywhere inside the animation to stop/restart it. */
  const handleClick = (): void => {
    const nowRunning = controllerRef.current?.toggle() ?? false;
    logInteraction('matrix-toggle', { running: nowRunning });
  };

  return (
    <canvas
      ref={canvasRef}
      className="matrix-scene"
      data-testid="matrix-scene"
      role="img"
      aria-label="Matrix-style animation of binary rain forming the words CmdRest and Test. Click to pause or resume."
      onClick={handleClick}
    />
  );
}
