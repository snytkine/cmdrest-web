/**
 * Tests for the MatrixScene component and its start/stop controller.
 *
 * jsdom provides no canvas 2D context, so `getContext` is stubbed with
 * a minimal fake that records nothing but satisfies the drawing calls.
 * This lets the tests exercise the real animation loop, the click
 * toggle and the programmatic controller API.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MatrixScene } from './MatrixScene';
import {
  getMatrixAnimationController,
  isMatrixAnimationRunning,
  startMatrixAnimation,
  stopMatrixAnimation,
  toggleMatrixAnimation,
} from './matrixController';
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

describe('MatrixScene', () => {
  it('renders an accessible canvas and draws frames on it', () => {
    render(<MatrixScene />);
    const canvas = screen.getByTestId('matrix-scene');
    expect(canvas).toHaveAccessibleName(/binary rain forming the words CmdRest and Test/i);
    // The mount warm-up alone paints many characters.
    expect(fakeContext.fillText).toHaveBeenCalled();
    expect(fakeContext.fillRect).toHaveBeenCalled();
  });

  it('starts running on mount and stops when clicked', () => {
    render(<MatrixScene />);
    expect(isMatrixAnimationRunning()).toBe(true);
    fireEvent.click(screen.getByTestId('matrix-scene'));
    expect(isMatrixAnimationRunning()).toBe(false);
    fireEvent.click(screen.getByTestId('matrix-scene'));
    expect(isMatrixAnimationRunning()).toBe(true);
  });

  it('logs a matrix-toggle interaction on click', () => {
    render(<MatrixScene />);
    fireEvent.click(screen.getByTestId('matrix-scene'));
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'matrix-toggle', data: { running: false } }),
    );
  });

  it('exposes the documented programmatic start/stop API', () => {
    render(<MatrixScene />);
    stopMatrixAnimation();
    expect(isMatrixAnimationRunning()).toBe(false);
    startMatrixAnimation();
    expect(isMatrixAnimationRunning()).toBe(true);
    expect(toggleMatrixAnimation()).toBe(false);
    expect(toggleMatrixAnimation()).toBe(true);
  });

  it('exposes the controller on window for console use', () => {
    render(<MatrixScene />);
    expect(window.cmdrestMatrix).toBe(getMatrixAnimationController());
    window.cmdrestMatrix?.stop();
    expect(isMatrixAnimationRunning()).toBe(false);
  });

  it('clears the controller and the window global on unmount', () => {
    const { unmount } = render(<MatrixScene />);
    expect(getMatrixAnimationController()).not.toBeNull();
    unmount();
    expect(getMatrixAnimationController()).toBeNull();
    expect(window.cmdrestMatrix).toBeUndefined();
    // The module-level helpers degrade gracefully with no scene mounted.
    expect(isMatrixAnimationRunning()).toBe(false);
    expect(toggleMatrixAnimation()).toBe(false);
    startMatrixAnimation();
    stopMatrixAnimation();
  });

  it('renders without crashing when no 2D context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<MatrixScene />);
    expect(screen.getByTestId('matrix-scene')).toBeInTheDocument();
    expect(getMatrixAnimationController()).toBeNull();
    // Clicking is a safe no-op without a controller.
    fireEvent.click(screen.getByTestId('matrix-scene'));
  });
});
