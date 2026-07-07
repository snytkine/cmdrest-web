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
