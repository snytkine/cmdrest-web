# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Hero Matrix animation

The home-page hero renders a Matrix-style animation (`src/matrix/`):
binary digits rain down inside a terminal-style canvas, and the words
**CmdRest** and **Test** repeatedly condense out of the falling digits,
hold, then dissolve back into the rain — in an endless loop.

### Settings

All knobs live in [`src/matrix/matrixSettings.ts`](src/matrix/matrixSettings.ts):

| Setting | Default | Meaning |
| --- | --- | --- |
| `speed` | `1` | Global speed multiplier (`2` = twice as fast, `0.5` = half speed). |
| `backgroundColor` | `#1f2937` | Terminal background (dark gray). |
| `headColor` | `#4ade80` | Bright green: drop heads and most word characters. |
| `trailColor` | `#16a34a` | Dark green: trails and the remaining word characters. |
| `fontSize` | `15` | Preferred character cell size in px (auto-shrinks so the widest word always fits). |
| `words` | `['CmdRest', 'Test']` | Words that form out of the rain, one per cycle. |
| `phases` | `rain 2s, form 1.6s, hold 3s, dissolve 1.4s` | Duration of each phase of a word cycle, at `speed: 1`. |

Words may only use characters defined in the bitmap font in
`src/matrix/matrixRain.ts` (`C d e m R s t T`); add glyph rows there to
support more letters.

### Starting and stopping

Clicking anywhere inside the animation stops it (freezing the current
frame); clicking again restarts it. Visitors with
`prefers-reduced-motion` get a static frame and can opt in by clicking.

The same controls are available programmatically from
[`src/matrix/matrixController.ts`](src/matrix/matrixController.ts):

```ts
import {
  startMatrixAnimation,   // resume (no-op if already running)
  stopMatrixAnimation,    // freeze on the current frame
  toggleMatrixAnimation,  // flip state; returns true when now running
  isMatrixAnimationRunning,
} from './matrix/matrixController';

stopMatrixAnimation();
```

All helpers are safe no-ops while no scene is mounted. For quick
experiments the controller is also exposed on the browser console as
`window.cmdrestMatrix`, e.g. `cmdrestMatrix.stop()` / `cmdrestMatrix.start()`.

## Features page word rain

The Features page opens with a wide strip of flickering alphanumeric
characters (`src/wordrain/`). After a short intro of pure noise the
words **Request**, **Response**, **Assertions** and **Report** condense
out of it one at a time, left to right — each one drawn as pixel art
made of the very same small characters, only brighter, so it reads as a
large word rather than as spelled-out text.

### Settings

All knobs live in [`src/wordrain/wordRainSettings.ts`](src/wordrain/wordRainSettings.ts):

| Setting | Default | Meaning |
| --- | --- | --- |
| `speed` | `1` | Global speed multiplier (`2` = twice as fast, `0.5` = half speed). |
| `height` | `80` | Strip height in px; the width always fills the container. |
| `backgroundColor` | `#1f2937` | Strip background (dark gray). |
| `textColorLight` | `#4ade80` | Bright green: the formed words and about half the field. |
| `textColorDark` | `#16a34a` | Dark green: the rest of the field and a few sparks inside each word. |
| `fontSize` | `7` | Preferred character cell size in px (auto-shrinks so the widest word always fits). |
| `fieldOpacity` | `0.3` | Opacity of the background field — lower it for more contrast against the words. |
| `frameRate` | `30` | Repaint cap in frames per second (the field redraws every cell). |
| `flickerRate` | `12` | How many times per second a field cell re-rolls its character. |
| `words` | `['Request', 'Response', 'Assertions', 'Report']` | Words that form out of the field, one per slot, left to right. |
| `introSeconds` | `2` | Seconds of pure character field before the first word appears. |
| `wordIntervalSeconds` | `1` | Seconds between the *starts* of consecutive words. |
| `phases` | `form 0.45s, hold 0.35s, dissolve 0.45s` | Duration of each phase of a single word, at `speed: 1`. |
| `loopAnimation` | `-1` | Passes through the word list before stopping; negative loops forever. |

Contrast is what makes the words readable: the field is mostly the dark
green (`FIELD_LIGHT_RATIO` in `wordRain.ts`) and dimmed by
`fieldOpacity`, while a word is almost entirely the light green at full
opacity. Raising `fieldOpacity` much above the default makes the letters
dissolve into the noise.

Because one word's full cycle (1.25s) is longer than
`wordIntervalSeconds`, consecutive words briefly overlap — one
dissolving as the next forms, which is what makes the sequence read as a
hand-off. With a positive `loopAnimation` the last word of the last pass
skips its dissolve and stays lit, so the strip freezes on a readable
frame.

Unlike the hero animation, the bitmap font in
[`src/wordrain/glyphFont.ts`](src/wordrain/glyphFont.ts) is complete
(`A–Z`, `a–z`, `0–9` and space), so `words` can be edited freely. A
character the font lacks throws on mount rather than silently blanking
part of the banner.

The strip needs `7 × cellSize` pixels for the glyph rows, so heights
below about 50 leave the words illegible. The cell size is derived from
the strip's width *and* height, so words stay inside the canvas on
phone-sized screens.

### Starting and stopping

Clicking anywhere inside the strip stops it (freezing the current
frame); clicking again restarts it — and a sequence that has already
finished replays from the top. Visitors with `prefers-reduced-motion`
get a static frame with the first word formed and can opt in by
clicking. The animation also pauses on its own while scrolled out of
view.

The same controls are available programmatically from
[`src/wordrain/wordRainController.ts`](src/wordrain/wordRainController.ts):

```ts
import {
  startWordRainAnimation,   // resume, or replay a finished sequence
  stopWordRainAnimation,    // freeze on the current frame
  toggleWordRainAnimation,  // flip state; returns true when now running
  isWordRainAnimationRunning,
} from './wordrain/wordRainController';

stopWordRainAnimation();
```

Each helper takes an optional scene id and defaults to the only mounted
strip; the registry is there so several banners can coexist later. All
helpers are safe no-ops while no scene is mounted, and the controller is
exposed on the console as `window.cmdrestWordRain`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
