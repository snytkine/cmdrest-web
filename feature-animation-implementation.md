# Word Rain — animated character-field banner for the Features page

Implementation document for the feature described in `features-animation.md`.

## Context

`features-animation.md` asks for a second canvas animation on the site, modelled on
the existing hero Matrix rain (`src/matrix/`) but with a different look and purpose:
a short, wide strip of flickering random alphanumeric characters out of which the
words **Request → Response → Assertions → Report** emerge as pixel-art, one after the
other, left to right. It tells the CmdRest story (a request is sent, a response comes
back, assertions run, a report is produced) in a single glance at the top of the
Features page.

The existing hero animation already establishes every pattern this needs — pure
simulation logic separated from canvas code, a settings file, a start/stop controller,
click-to-toggle, reduced-motion support, and unit tests against a fake 2D context. This
feature mirrors that structure in a new self-contained module and leaves `src/matrix/`
completely untouched.

### Decisions confirmed with the user

| Question | Decision |
| --- | --- |
| Placement | **One** strip, spanning the container width, above the first category on the Features page. |
| Word sequencing | **Relay**: each word forms at its own slot, holds, dissolves as the next forms further right. |
| Code reuse | **New self-contained `src/wordrain/`**; `src/matrix/` is not modified. |
| Canvas height | **80px default** (configurable). |

### Canvas height — answer to the open question in the spec

Yes, there is a minimum. Words are drawn as **7-cell-tall** bitmap glyphs, so the
canvas needs `7 × cellSize` plus margin. Practical floor is ~50px (7 rows of 6px +
margin); below that the words are illegible. 60px works; **80px** was chosen so there
is visible character rain above and below the word instead of the word filling the
whole strip. The cell size is derived from both width and height, so the strip stays
correct at any size.

---

## Files

**New — `src/wordrain/`** (mirrors the `src/matrix/` file layout):

| File | Contents |
| --- | --- |
| `glyphFont.ts` | 5×7 bitmap font covering `A–Z`, `a–z`, `0–9` and space; `buildWordMask`, `maxWordColumns`. |
| `wordRain.ts` | Pure simulation: PRNG, cell hashing, the relay timeline machine, mask-cell reveal, word slot layout, cell sizing. No canvas, no React. |
| `wordRainSettings.ts` | The single user-editable settings object. |
| `wordRainController.ts` | Programmatic start/stop API + `window.cmdrestWordRain`. |
| `WordRainScene.tsx` | Canvas element, `requestAnimationFrame` loop, click toggle, controller registration. |
| `wordRain.test.ts` | Unit tests for the pure module. |
| `WordRainScene.test.tsx` | Component/controller tests against a fake 2D context. |

**Modified:**

- `src/pages/FeaturesPage.tsx` — render `<WordRainScene />` in a wrapper div above the category loop.
- `src/styles/global.css` — `.wordrain-strip` wrapper + `.wordrain-scene` canvas rules.
- `src/pages/pages.test.tsx` — add a `vi.mock('../wordrain/WordRainScene', ...)` alongside the existing `MatrixScene` mock (jsdom has no 2D context).
- `README.md` — a "Features page word rain" section mirroring the existing "Hero Matrix animation" section.

---

## Settings (`src/wordrain/wordRainSettings.ts`)

Every value the spec asked for is configurable here, with doc comments in the same
style as `src/matrix/matrixSettings.ts`:

```ts
export const wordRainSettings: WordRainSettings = {
  speed: 1,                    // global multiplier, as in matrixSettings
  height: 80,                  // strip height in CSS px (width always 100%)
  backgroundColor: '#1f2937',  // same dark gray as the hero
  textColorLight: '#4ade80',   // bright green
  textColorDark: '#16a34a',    // dark green
  fontSize: 7,                 // preferred cell size in px; auto-shrinks to fit
  fieldOpacity: 0.45,          // dimness of the background character field
  frameRate: 30,               // cap for the character field (perf; see below)
  flickerRate: 12,             // character/color re-rolls per second
  words: ['Request', 'Response', 'Assertions', 'Report'],
  introSeconds: 2,             // pure random characters before the first word
  wordIntervalSeconds: 1,      // gap between the START of consecutive words
  phases: { form: 0.45, hold: 0.35, dissolve: 0.45 },
  loopAnimation: -1,           // negative = forever; N > 0 = N passes then stop
};
```

`loopAnimation` semantics: negative → loop forever; otherwise the word sequence plays
`Math.max(1, loopAnimation)` times and then freezes. **On the final pass the last word
skips its dissolve and stays lit**, so the animation ends on a readable frame rather
than on empty noise.

Words may only use characters present in `glyphFont.ts`. `buildWordMask` throws a
descriptive error for an unknown character (same contract as
`src/matrix/matrixRain.ts:111`), and `wordRain.test.ts` asserts every default word is
renderable — so a typo in settings fails a test rather than blanking the banner.

---

## `glyphFont.ts` — the bitmap font

Same shape as the 8-glyph font in `src/matrix/matrixRain.ts:85`, but complete, since
`words` is user-editable:

```ts
export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
export const GLYPH_SPACING = 1;

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  // ... A–Z, a–z, 0–9 written as 7 rows of 5 chars, '#' = lit
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
```

Use a classic 5×7 terminal font (HD44780/`font5x7` style) as the reference shape set —
it is public-domain-style, universally documented, and needs no dependency. Port
`buildWordMask` and `maxWordColumns` from `src/matrix/matrixRain.ts:111-135` verbatim
(reading from this font); they already do exactly the right thing.

No external library: everything is a string table plus arithmetic.

---

## `wordRain.ts` — the pure simulation

Reuse the proven helpers, copied from `src/matrix/matrixRain.ts` (self-contained module
by decision):

- `createRandom(seed)` — mulberry32 (`matrixRain.ts:46`).
- `hashCell(col, row, salt)` — deterministic per-cell value in `[0,1)` (`matrixRain.ts:61`).

New logic:

**Character field.** `export const FIELD_CHARS = 'ABC…XYZabc…xyz0123456789';`
`fieldChar(col, row, salt)` indexes it via `hashCell`; `fieldIsLight(col, row, salt)`
picks light vs dark. Per-cell flicker phase (`salt = floor(time*flickerRate + hashCell(col,row,3)*4)`)
so cells change value at staggered moments rather than all at once.

**Layout.**

```ts
computeCellSize(width, height, settings): number
// min(fontSize, floor(height / (GLYPH_HEIGHT + 2)), floor(width / (maxWordColumns + 4))), min 4
```

At a 1072px container and 80px height this yields cell = 7 → 154 × 12 cells, word 49px
tall. On a 375px phone (~327px content) it yields cell = 5 → 66 × 16 cells, and
`Assertions` (59 columns) still fits.

```ts
computeWordSlots(masks, columns, margin): number[]
```
Left edges spread evenly across `[margin, columns - margin - maskColumns]` so word 0
sits at the left and the last word at the right. With one word, or when the widest word
nearly fills the grid, the range collapses and slots converge — a graceful degradation,
not an error. Vertical origin is always `floor((rows - GLYPH_HEIGHT) / 2)`.

**Timeline.** One "pass" = intro + all words relayed:

```
passDuration = introSeconds + (wordCount - 1) * wordIntervalSeconds
             + phases.form + phases.hold + phases.dissolve
word i starts at introSeconds + i * wordIntervalSeconds
```

With the defaults (interval 1s, cycle 1.25s) consecutive words overlap by 0.25s — one
dissolving as the next forms, which is what makes it read as a relay.

```ts
export interface ActiveWord {
  readonly index: number;
  readonly phase: 'form' | 'hold' | 'dissolve';
  readonly progress: number;   // 0..1 within the phase
}
export interface RelayState {
  readonly pass: number;
  readonly finished: boolean;  // all passes done — scene stops the rAF loop
  readonly active: readonly ActiveWord[];
}
export function getRelayState(timeSeconds, wordCount, settings): RelayState;
```

Modelled on `getCycleState` (`matrixRain.ts:157`) but returning **all** words active at
that instant (usually 0 or 1, briefly 2) instead of a single index, plus loop
accounting. When `loopAnimation >= 0` and the last pass ends, `finished` is true and the
final word is reported as `{ phase: 'hold', progress: 1 }` so it stays lit.

**Reveal.** `isMaskCellLit(cell, maskRows, active)` — port of `matrixRain.ts:192`:
row-ordered threshold softened by per-cell jitter, so a word condenses top-to-bottom
out of the noise and releases the same way.

---

## `WordRainScene.tsx` — canvas + loop

Structurally a slimmer `MatrixScene.tsx`; the same skeleton (effect that grabs the 2D
context, `applySize` on resize via `ResizeObserver`, `renderFrame(delta)`, `onFrame`
rAF callback, `start`/`stop`/`toggle`/`isRunning` controller, cleanup on unmount, safe
no-op when `getContext` returns null). Differences:

1. **No falling drops.** There is no `Drop`/`stepDrops` equivalent — instead every frame
   repaints the full background then draws every cell of the character field at
   `globalAlpha = fieldOpacity`, colored light/dark by `fieldIsLight`.
2. **Word overlay at full opacity.** Lit mask cells redraw the *same* field character in
   the same cell but at `globalAlpha = 1` (mostly `textColorLight`, ~20% `textColorDark`
   sparks, as `MatrixScene.tsx:170` does). The word is therefore made *of* the field —
   pixel-art formed purely by brightness, exactly as the spec requires. During `form`,
   ramp alpha from `fieldOpacity` → 1 across `progress` so words "become more and more
   obvious".
3. **Frame-rate cap.** ~1850 `fillText` calls per frame is the one real cost here. Skip
   frames so the field repaints at `frameRate` (30fps default) while still advancing
   `simTime` from the real delta. Reuse the `Math.min(deltaMs, 100)` background-tab clamp
   from `MatrixScene.tsx:183`.
4. **Auto-stop.** When `getRelayState(...).finished` is true, paint the final frame then
   `stop()` — no wasted frames after a finite `loopAnimation`.
5. **Restart on click.** `toggle()` on a *finished* animation resets `simTime = 0` and
   starts again (a finished strip must be restartable, per the spec).
6. **Sizing.** Height comes from `settings.height` (set as an inline style on the
   wrapper) rather than from a CSS-only parent, so the setting is the single source of
   truth. Keep the `devicePixelRatio` handling from `MatrixScene.tsx:90,104-106`.
7. **Reduced motion.** Same as the hero (`MatrixScene.tsx:58,230`): warm up to a frame
   where the first word is formed, render it statically, and let a click opt in.
8. **Accessibility / logging.** `role="img"` with an `aria-label` naming the words and
   the click behavior; `data-testid="wordrain-scene"`; `logInteraction('wordrain-toggle', { running })`
   on click, matching `MatrixScene.tsx:255`.

*Optional improvement worth including:* pause via `IntersectionObserver` when the strip
scrolls out of view, and resume on re-entry. Cheap, and it stops the loop burning frames
while the visitor reads the cards below. Guard for its absence like the existing
`ResizeObserver` guard (`MatrixScene.tsx:236`).

---

## `wordRainController.ts`

Same public shape and `window` exposure as `matrixController.ts`, with one difference:
keep an **id-keyed registry** (`Map<string, WordRainAnimationController>`) instead of a
single active controller, and let every helper take an optional id defaulting to the
sole registered scene. Only one scene is mounted today, but the spec floated a strip per
category, and the registry costs ~20 lines now versus a rewrite later.

```ts
startWordRainAnimation(id?)   // resume
stopWordRainAnimation(id?)    // freeze on the current frame
toggleWordRainAnimation(id?)  // flip; returns true when now running
isWordRainAnimationRunning(id?)
```

All helpers are safe no-ops when nothing is mounted. Expose `window.cmdrestWordRain`
for console use, as `matrixController.ts:45` does.

---

## Page + styles

`src/pages/FeaturesPage.tsx` — inside the existing `<section className="section">`
`<div className="container">`, before the `[...grouped.entries()].map(...)` loop:

```tsx
<div className="wordrain-strip">
  <WordRainScene />
</div>
```

`src/styles/global.css` — next to the existing `.matrix-scene` rule (line 398):

```css
/* Animated character strip above the feature categories. */
.wordrain-strip {
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 56px;
  box-shadow: var(--shadow-card);
}

.wordrain-scene {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;   /* hints that clicking toggles the animation */
}
```

---

## Tests

Follow the existing split exactly — pure logic in one file, component in another.

`src/wordrain/wordRain.test.ts`:
- Every default word builds a mask; an unknown character throws.
- `maxWordColumns(['Assertions'])` === 59 (10 glyphs × 6 − 1).
- `computeCellSize` respects `fontSize`, the height floor, the width floor, and its 4px minimum.
- `computeWordSlots` is monotonically increasing and stays inside the grid.
- `getRelayState`: nothing active during the intro; word *i* active around its start; the brief two-word overlap; `finished` false while `loopAnimation < 0`; `finished` true after N passes with the last word held.
- `isMaskCellLit`: none lit at `form` progress 0, all lit during `hold`, none at the end of `dissolve`.
- `hashCell` / `fieldChar` are deterministic and stay in range.

`src/wordrain/WordRainScene.test.tsx` — copy the fake-context harness from
`MatrixScene.test.tsx:23-52` and cover: accessible canvas that paints; running on mount;
click stops and restarts; `wordrain-toggle` logged; the programmatic API; the `window`
global; controller cleared on unmount; no crash when `getContext` returns null.

`src/pages/pages.test.tsx` — mock the scene so the existing FeaturesPage assertions keep
passing without a canvas.

---

## Verification

```bash
npm run lint          # oxlint
npm test              # vitest run — all suites, including the new ones
npm run test:coverage # keep the module in line with the repo's coverage
npm run dev           # then open http://localhost:5173/features
```

In the browser, on `/features`:

1. The strip renders full container width, 80px tall, filled with flickering green
   alphanumerics on dark gray.
2. After ~2s `Request` condenses out of the noise near the left, then `Response`,
   `Assertions` and `Report` follow one per second, each further right; with
   `loopAnimation: -1` the sequence repeats forever.
3. Clicking the strip freezes it; clicking again resumes. A finished run (set
   `loopAnimation: 1`) restarts from the beginning on click.
4. From the console: `cmdrestWordRain.stop()` / `.start()` / `.toggle()`.
5. Narrow the window to ~375px — the cells shrink and `Assertions` still fits inside the
   strip; nothing overflows horizontally.
6. Enable "Reduce motion" in the OS — the strip shows a static formed-word frame and
   starts only on click.
7. Edit `wordRainSettings.ts` (e.g. `height: 60`, `speed: 2`, a different `words` array)
   and confirm each knob takes effect on reload.
