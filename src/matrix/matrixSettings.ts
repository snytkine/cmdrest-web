/**
 * User-tunable settings for the hero's Matrix rain animation.
 *
 * Edit this file to change how the animation looks and behaves — the
 * scene reads every value from here at mount. See the "Hero Matrix
 * animation" section of the README for the full reference.
 */
import type { MatrixRainSettings } from './matrixRain';

export const matrixSettings: MatrixRainSettings = {
  /**
   * Global speed multiplier. 1 is the designed pace; 2 runs everything
   * (falling rain and word cycle) twice as fast, 0.5 at half speed.
   */
  speed: 1,

  /** Terminal background. Default: dark gray. */
  backgroundColor: '#1f2937',

  /**
   * The two shades of green used for the characters (the same greens
   * as the site's accent palette): `headColor` paints the bright drop
   * heads and most of the formed word, `trailColor` paints the fading
   * trails and the rest of the word.
   */
  headColor: '#4ade80',
  trailColor: '#16a34a',

  /**
   * Preferred character cell size in CSS pixels. On narrow screens the
   * scene shrinks cells automatically so the widest word still fits.
   */
  fontSize: 15,

  /** Words that condense out of the rain, one per cycle, in a loop. */
  words: ['CmdRest', 'Test'],

  /** How long (seconds, at speed 1) each phase of a word cycle lasts. */
  phases: {
    rain: 2,
    form: 1.6,
    hold: 3,
    dissolve: 1.4,
  },
};
