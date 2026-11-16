/**
 * Test polyfills that must be installed before React DOM is loaded, so
 * this file is listed first in Vitest's `setupFiles`.
 *
 * jsdom has no `AnimationEvent`. Without it React listens for the legacy
 * `webkitAnimationEnd` event instead of `animationend`, so the
 * `onAnimationEnd` handler that drives page transitions would never see
 * the events that tests (and real browsers) fire.
 */
if (!('AnimationEvent' in window)) {
  Object.defineProperty(window, 'AnimationEvent', {
    value: class AnimationEvent extends Event {},
    writable: true,
  });
}
