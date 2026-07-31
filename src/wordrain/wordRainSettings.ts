/**
 * User-tunable settings for the Features page's word-rain banner.
 *
 * Edit this file to change how the animation looks and behaves — the
 * scene reads every value from here at mount. See the "Features page
 * word rain" section of the README for the full reference.
 */
import type { WordRainSettings } from './wordRain';

export const wordRainSettings: WordRainSettings = {
  /**
   * Global speed multiplier. 1 is the designed pace; 2 runs the whole
   * sequence twice as fast, 0.5 at half speed.
   */
  speed: 0.5,

  /**
   * Height of the strip in CSS pixels; the width always fills the
   * container. Words are seven cells tall, so anything below about 50
   * leaves them illegible.
   */
  height: 80,

  /** Strip background. Default: the same dark gray as the hero. */
  backgroundColor: '#1f2937',

  /**
   * The two shades of green used for the characters (the same greens as
   * the site's accent palette): `textColorLight` paints the formed
   * words and roughly half the background field, `textColorDark` the
   * rest of the field and a few sparks inside each word.
   */
  textColorLight: '#4ade80',
  textColorDark: '#16a34a',

  /**
   * Preferred character cell size in CSS pixels. On narrow screens the
   * scene shrinks cells automatically so the widest word still fits.
   */
  fontSize: 7,

  /**
   * Opacity of the background character field. The words are drawn from
   * the very same characters at full opacity, so this value is what
   * makes them stand out — lower it for more contrast.
   */
  fieldOpacity: 0.3,

  /**
   * Repaint cap in frames per second. The field redraws every cell, so
   * capping it well below 60 keeps the banner cheap without any visible
   * difference to the shimmer.
   */
  frameRate: 15,

  /** How many times per second a field cell re-rolls its character. */
  flickerRate: 3,

  /**
   * Words that condense out of the field, left to right, one per slot.
   * Only characters present in the bitmap font in `glyphFont.ts`
   * (A–Z, a–z, 0–9 and space) may be used.
   */
  words: ['REQUEST', 'RESPONSE', 'TESTS', 'REPORT'],

  /** Seconds of pure character field before the first word appears. */
  introSeconds: 0.5,

  /**
   * Seconds between the starts of consecutive words. Shorter than one
   * word's full cycle below, so words briefly overlap as they hand over.
   */
  wordIntervalSeconds: 1.40,

  /** How long (seconds, at speed 1) each phase of one word lasts. */
  phases: {
    form: 0.35,
    hold: 1.30,
    dissolve: 0.15,
  },

  /**
   * How many times to play the whole word sequence before stopping.
   * Negative loops forever; a positive number plays that many passes
   * and then freezes with the last word lit.
   */
  loopAnimation: 3,
};
