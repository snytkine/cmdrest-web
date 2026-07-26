/**
 * The programmatic start/stop API for the word-rain banner.
 *
 * Each mounted `WordRainScene` registers its controller here under an
 * id, and any module can then control the animation:
 *
 *     import {
 *       startWordRainAnimation,
 *       stopWordRainAnimation,
 *       toggleWordRainAnimation,
 *       isWordRainAnimationRunning,
 *     } from './wordrain/wordRainController';
 *
 * Only one banner is mounted today (on the Features page), so the id is
 * optional everywhere and defaults to the sole registered scene; the
 * registry is here so several banners can coexist later.
 *
 * The default controller is also exposed as `window.cmdrestWordRain` so
 * the animation can be driven from the browser console, e.g.
 * `cmdrestWordRain.stop()`. All helpers are safe no-ops while no scene
 * is mounted.
 */

/** Imperative controls for one mounted word-rain scene. */
export interface WordRainAnimationController {
  /** Resumes the animation; restarts it from the top if it had finished. */
  start(): void;
  /** Freezes the animation on its current frame (no-op if stopped). */
  stop(): void;
  /** Starts if stopped, stops if running; returns the new state. */
  toggle(): boolean;
  /** Whether the animation is currently playing. */
  isRunning(): boolean;
}

/** The id used when a scene does not ask for a specific one. */
export const DEFAULT_WORD_RAIN_ID = 'features';

declare global {
  interface Window {
    /** Console access to the banner: `cmdrestWordRain.stop()`. */
    cmdrestWordRain?: WordRainAnimationController;
  }
}

/** Controllers of every currently mounted scene, keyed by id. */
const controllers = new Map<string, WordRainAnimationController>();

/** The controller a helper targets when given no id: the first mounted. */
function defaultController(): WordRainAnimationController | null {
  const first = controllers.values().next();
  return first.done ? null : first.value;
}

/** Called by WordRainScene on mount; also publishes the console global. */
export function registerWordRainController(
  id: string,
  controller: WordRainAnimationController,
): void {
  controllers.set(id, controller);
  window.cmdrestWordRain = defaultController() ?? undefined;
}

/** Called by WordRainScene on unmount; ignores stale controllers. */
export function unregisterWordRainController(
  id: string,
  controller: WordRainAnimationController,
): void {
  if (controllers.get(id) === controller) {
    controllers.delete(id);
  }
  const next = defaultController();
  if (next) {
    window.cmdrestWordRain = next;
  } else {
    delete window.cmdrestWordRain;
  }
}

/**
 * Returns a mounted scene's controller: the one registered under `id`,
 * or the first mounted scene when no id is given. Null before mount.
 */
export function getWordRainController(id?: string): WordRainAnimationController | null {
  if (id === undefined) {
    return defaultController();
  }
  return controllers.get(id) ?? null;
}

/** Starts the banner animation, if a scene is mounted. */
export function startWordRainAnimation(id?: string): void {
  getWordRainController(id)?.start();
}

/** Stops the banner animation, if a scene is mounted. */
export function stopWordRainAnimation(id?: string): void {
  getWordRainController(id)?.stop();
}

/**
 * Toggles the banner animation; returns true when it ends up running
 * (false when stopped or when no scene is mounted).
 */
export function toggleWordRainAnimation(id?: string): boolean {
  return getWordRainController(id)?.toggle() ?? false;
}

/** Whether the banner animation is currently playing. */
export function isWordRainAnimationRunning(id?: string): boolean {
  return getWordRainController(id)?.isRunning() ?? false;
}
