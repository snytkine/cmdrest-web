/**
 * The programmatic start/stop API for the hero's Matrix rain animation.
 *
 * The mounted `MatrixScene` registers its controller here, and any
 * module can then control the animation:
 *
 *     import {
 *       startMatrixAnimation,
 *       stopMatrixAnimation,
 *       toggleMatrixAnimation,
 *       isMatrixAnimationRunning,
 *     } from './matrix/matrixController';
 *
 * The controller is also exposed as `window.cmdrestMatrix` so the
 * animation can be driven from the browser console, e.g.
 * `cmdrestMatrix.stop()`. All helpers are safe no-ops while no scene
 * is mounted.
 */

/** Imperative controls for the mounted Matrix scene. */
export interface MatrixAnimationController {
  /** Resumes the animation (no-op if already running). */
  start(): void;
  /** Freezes the animation on its current frame (no-op if stopped). */
  stop(): void;
  /** Starts if stopped, stops if running; returns the new state. */
  toggle(): boolean;
  /** Whether the animation is currently playing. */
  isRunning(): boolean;
}

declare global {
  interface Window {
    /** Console access to the hero animation: `cmdrestMatrix.stop()`. */
    cmdrestMatrix?: MatrixAnimationController;
  }
}

/** The controller of the currently mounted scene, if any. */
let activeController: MatrixAnimationController | null = null;

/** Called by MatrixScene on mount; also publishes the console global. */
export function registerMatrixAnimationController(controller: MatrixAnimationController): void {
  activeController = controller;
  window.cmdrestMatrix = controller;
}

/** Called by MatrixScene on unmount; ignores stale controllers. */
export function unregisterMatrixAnimationController(controller: MatrixAnimationController): void {
  if (activeController === controller) {
    activeController = null;
  }
  if (window.cmdrestMatrix === controller) {
    delete window.cmdrestMatrix;
  }
}

/** Returns the mounted scene's controller, or null before mount. */
export function getMatrixAnimationController(): MatrixAnimationController | null {
  return activeController;
}

/** Starts the hero animation, if a scene is mounted. */
export function startMatrixAnimation(): void {
  activeController?.start();
}

/** Stops the hero animation, if a scene is mounted. */
export function stopMatrixAnimation(): void {
  activeController?.stop();
}

/**
 * Toggles the hero animation; returns true when it ends up running
 * (false when stopped or when no scene is mounted).
 */
export function toggleMatrixAnimation(): boolean {
  return activeController?.toggle() ?? false;
}

/** Whether the hero animation is currently playing. */
export function isMatrixAnimationRunning(): boolean {
  return activeController?.isRunning() ?? false;
}
