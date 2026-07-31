/**
 * Tests for the WordRainScene component and its start/stop controller.
 *
 * jsdom provides no canvas 2D context, so `getContext` is stubbed with
 * a minimal fake that records nothing but satisfies the drawing calls.
 * This lets the tests exercise the real render path, the click toggle
 * and the programmatic controller API. The animation's timing and
 * geometry are covered by `wordRain.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WordRainScene } from './WordRainScene';
import {
  DEFAULT_WORD_RAIN_ID,
  getWordRainController,
  isWordRainAnimationRunning,
  startWordRainAnimation,
  stopWordRainAnimation,
  toggleWordRainAnimation,
} from './wordRainController';
import { wordRainSettings } from './wordRainSettings';
import { FIELD_CHARS } from './wordRain';
import { captureLogs } from '../test/helpers';
import type { CaptureTransport } from '../test/helpers';

/** Minimal stand-in for CanvasRenderingContext2D. */
function createFakeContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

let fakeContext: CanvasRenderingContext2D;
let capture: CaptureTransport;
let restoreLogs: () => void;

beforeEach(() => {
  fakeContext = createFakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeContext as unknown as ReturnType<HTMLCanvasElement['getContext']>,
  );
  ({ capture, restore: restoreLogs } = captureLogs());
});

afterEach(() => {
  cleanup();
  restoreLogs();
  vi.restoreAllMocks();
});

describe('WordRainScene', () => {
  it('renders an accessible canvas at the configured height', () => {
    render(<WordRainScene />);
    const canvas = screen.getByTestId('wordrain-scene');
    expect(canvas).toHaveAccessibleName(
      new RegExp(wordRainSettings.words.join(', ')),
    );
    expect(canvas).toHaveStyle({ height: `${wordRainSettings.height}px` });
  });

  it('paints the background and a field of characters on mount', () => {
    render(<WordRainScene />);
    expect(fakeContext.fillRect).toHaveBeenCalled();
    // Every field character is drawn once into the glyph atlas...
    expect(vi.mocked(fakeContext.fillText).mock.calls.length).toBe(FIELD_CHARS.length * 2);
    // ...and the first frame blits one of them into every grid cell.
    expect(vi.mocked(fakeContext.drawImage).mock.calls.length).toBeGreaterThan(100);
  });

  it('starts running on mount and stops when clicked', () => {
    render(<WordRainScene />);
    expect(isWordRainAnimationRunning()).toBe(true);
    fireEvent.click(screen.getByTestId('wordrain-scene'));
    expect(isWordRainAnimationRunning()).toBe(false);
    fireEvent.click(screen.getByTestId('wordrain-scene'));
    expect(isWordRainAnimationRunning()).toBe(true);
  });

  it('logs a wordrain-toggle interaction on click', () => {
    render(<WordRainScene />);
    fireEvent.click(screen.getByTestId('wordrain-scene'));
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'wordrain-toggle', data: { running: false } }),
    );
  });

  it('exposes the documented programmatic start/stop API', () => {
    render(<WordRainScene />);
    stopWordRainAnimation();
    expect(isWordRainAnimationRunning()).toBe(false);
    startWordRainAnimation();
    expect(isWordRainAnimationRunning()).toBe(true);
    expect(toggleWordRainAnimation()).toBe(false);
    expect(toggleWordRainAnimation()).toBe(true);
  });

  it('registers under its id and answers helpers addressed to it', () => {
    render(<WordRainScene />);
    const controller = getWordRainController(DEFAULT_WORD_RAIN_ID);
    expect(controller).not.toBeNull();
    expect(getWordRainController()).toBe(controller);
    stopWordRainAnimation(DEFAULT_WORD_RAIN_ID);
    expect(isWordRainAnimationRunning(DEFAULT_WORD_RAIN_ID)).toBe(false);
    // An id no scene registered under is a safe no-op.
    expect(getWordRainController('nope')).toBeNull();
    expect(toggleWordRainAnimation('nope')).toBe(false);
  });

  it('exposes the controller on window for console use', () => {
    render(<WordRainScene />);
    expect(window.cmdrestWordRain).toBe(getWordRainController());
    window.cmdrestWordRain?.stop();
    expect(isWordRainAnimationRunning()).toBe(false);
  });

  it('stops itself after a finite loop, and replays from the top on click', () => {
    // Drive the frame loop by hand so the whole pass runs synchronously.
    const pending: { callback: FrameRequestCallback | null } = { callback: null };
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      pending.callback = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      pending.callback = null;
    });

    render(<WordRainScene settings={{ ...wordRainSettings, loopAnimation: 1 }} />);
    expect(isWordRainAnimationRunning()).toBe(true);

    // Each step advances the clamped maximum of 100ms; 20s is well past
    // the ~6s single pass.
    let now = 0;
    for (let step = 0; step < 200 && pending.callback !== null; step += 1) {
      const callback = pending.callback;
      pending.callback = null;
      now += 100;
      callback(now);
    }

    // The sequence played out and the scene stopped its own loop.
    expect(isWordRainAnimationRunning()).toBe(false);
    expect(pending.callback).toBeNull();

    // Clicking a finished animation starts it over rather than resuming.
    fireEvent.click(screen.getByTestId('wordrain-scene'));
    expect(isWordRainAnimationRunning()).toBe(true);
    expect(pending.callback).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it('clears the controller and the window global on unmount', () => {
    const { unmount } = render(<WordRainScene />);
    expect(getWordRainController()).not.toBeNull();
    unmount();
    expect(getWordRainController()).toBeNull();
    expect(window.cmdrestWordRain).toBeUndefined();
    // The module-level helpers degrade gracefully with no scene mounted.
    expect(isWordRainAnimationRunning()).toBe(false);
    expect(toggleWordRainAnimation()).toBe(false);
    startWordRainAnimation();
    stopWordRainAnimation();
  });

  it('renders a static first-word frame when reduced motion is preferred', () => {
    // jsdom does not implement matchMedia, so stub it in wholesale.
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }) as unknown as MediaQueryList),
    );
    render(<WordRainScene />);
    // Painted once, but not animating until the visitor opts in.
    expect(fakeContext.fillText).toHaveBeenCalled();
    expect(isWordRainAnimationRunning()).toBe(false);
    fireEvent.click(screen.getByTestId('wordrain-scene'));
    expect(isWordRainAnimationRunning()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('renders without crashing when no 2D context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<WordRainScene />);
    expect(screen.getByTestId('wordrain-scene')).toBeInTheDocument();
    expect(getWordRainController()).toBeNull();
    // Clicking is a safe no-op without a controller.
    fireEvent.click(screen.getByTestId('wordrain-scene'));
  });

  it('pauses while the strip is scrolled out of view', () => {
    const observers: Array<(entries: IntersectionObserverEntry[]) => void> = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
          observers.push(callback);
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    render(<WordRainScene />);
    expect(observers).toHaveLength(1);
    const [notify] = observers;
    const paintsWhileVisible = vi.mocked(fakeContext.fillText).mock.calls.length;

    // Scrolled away: the intent is still "running", but no frames are drawn.
    notify?.([{ isIntersecting: false } as IntersectionObserverEntry]);
    expect(isWordRainAnimationRunning()).toBe(true);
    expect(vi.mocked(fakeContext.fillText).mock.calls.length).toBe(paintsWhileVisible);

    notify?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    expect(isWordRainAnimationRunning()).toBe(true);
    vi.unstubAllGlobals();
  });
});
