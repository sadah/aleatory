# Adding a work

The vertical slice is done, so adding work N+1 is: **one manifest entry + two
files + a thumbnail.** The gallery and the multi-page build pick it up
automatically (Vite globs `works/*.html`).

Pick a `slug` — lowercase kebab-case, e.g. `magnetic-field`. It is used for the
HTML entry, the sketch module, and the thumbnail filename.

## 1. Add the manifest entry

In [`src/works.ts`](../src/works.ts), append to `WORKS`:

```ts
{
  slug: 'magnetic-field',
  label: 'Study',                 // Study | Tribute | Original | Reproduction
  date: '2026-08-01',             // ISO date
  title: { en: 'Magnetic Field', ja: '磁場' },
  description: {
    en: 'One-sentence English description (also used as the sr-only long text).',
    ja: '日本語の説明。',
  },
  // Optional: visible "About this work" prose, one string per paragraph.
  // The frame renders it below the controls; omit it for a bare piece.
  about: {
    en: ['First paragraph — what it is and the intent.', 'Second paragraph.'],
    ja: ['一段落目。作品の意図。', '二段落目。'],
  },
  // Optional: a parameter glossary rendered as a definition list under About.
  // `term` matches the on-screen control label (shared across locales).
  parameters: [
    { term: 'Density', desc: { en: 'What the Density slider does.', ja: 'Density スライダーの説明。' } },
  ],
}
```

Both `about` and `parameters` are optional. When present, the shared frame shows
an **About this work** section (prose + a **Parameters** list) below the controls,
and re-renders it on locale change — so explaining a piece is manifest-only, no
per-page markup. Explaining the intent and the controls helps viewers; the Lorenz
entry in `src/works.ts` is a worked example.

## 2. Add the HTML entry

Create `works/<slug>.html` (copy `works/lorenz-attractor.html` and change the
title + script path):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><Work Title> · aleatory</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/works/<slug>.ts"></script>
  </body>
</html>
```

## 3. Add the sketch module

Create `src/works/<slug>.ts`. Use `src/works/lorenz-attractor.ts` as the
template. The shape is:

```ts
import p5 from 'p5';
import { buildFrame } from '../lib/frame';
import { createSlider, createButton } from '../lib/controls';
import { createSeedUI, makeRng } from '../lib/seed';
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { WORKS } from '../works';

const work = WORKS.find((w) => w.slug === '<slug>');
if (!work) throw new Error('Missing work metadata');
const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root');

const { stage, controlsBar, seedSlot, exportSlot } = buildFrame(app, work);
// ... build(), renderFrame(n), controls, seed UI, export buttons, p5 host ...
```

Hold the two project rules while writing it:

- **Base-safe URLs** — any runtime path via `import.meta.env.BASE_URL`.
- **Fixed-timestep `renderFrame(n)`** — drive the sim and camera from an integer
  frame index, not from `requestAnimationFrame`, so offline export stays
  add-only.

And the rendering conventions:

- `createCanvas(1080, 1080)`, `pixelDensity(1)`, canvas CSS-filled into `stage`.
- Draw everything through `p.drawingContext`; reset
  `globalCompositeOperation = 'source-over'` at the end of each frame.
- Derive the initial condition from the seed via `makeRng(seed)` — no bare
  `Math.random()` in the sketch.

### Colour

No literal RGB or hex anywhere in the sketch. Declare a `RampProfile` and let
`src/lib/palette.ts` supply hue and chroma — you supply the lightness curve. See
the Palette section of [`ARCHITECTURE.md`](ARCHITECTURE.md) for why.

```ts
import {
  makeRamp, onPaletteChange, resolveChrome, resolveColor, rgbCsv,
  type ColorSpec, type RampProfile,
} from '../lib/palette';

// x = ramp position, side = which anchor it hangs off, dh = hue offset from that
// anchor in degrees, l/c = OKLCH lightness and chroma.
const RAMP_PROFILE: RampProfile = [
  { x: 0, side: 'cool', dh: 2, l: 0.88, c: 0.05 },
  { x: 0.5, side: 'hot', dh: 30, l: 0.97, c: 0.03 },  // the near-neutral pivot
  { x: 1, side: 'hot', dh: -5, l: 0.77, c: 0.16 },
];
const SOME_OFF_RAMP_COLOUR: ColorSpec = { side: 'cool', dh: 4, l: 0.85, c: 0.08 };

let styles: Array<{ rgb: string; alpha: number }> = [];
let groundInner = '';
let groundOuter = '';

function rebuildPaletteStyles(): void {
  const ramp = makeRamp(RAMP_PROFILE);
  styles = Array.from({ length: NC }, (_, c) => {
    const ratio = c / (NC - 1);
    const [r, g, b] = ramp(ratio);
    return { rgb: `${r},${g},${b}`, alpha: 0.6 + 0.3 * ratio };
  });
  const chrome = resolveChrome();
  groundInner = `rgb(${rgbCsv(chrome.ground[3])})`;
  groundOuter = `rgb(${rgbCsv(chrome.ground[1])})`;
}
rebuildPaletteStyles();
onPaletteChange(rebuildPaletteStyles);
```

Three things that bite:

- The style table must be `let` and rebuilt, not a module-level `const` — a
  `const` built at import time cannot follow a palette swap.
- If radii or widths are baked into `Path2D` geometry, invalidate that cache from
  `rebuildPaletteStyles()`. `prime-spiral.ts` sets `cachedK = -1` for exactly
  this reason; without it a settled field keeps its old colour.
- If you render a legend, generate it with
  `rampGradientCss(resolveRamp(RAMP_PROFILE))` and repaint it on palette change.
  Never write the gradient out as a literal — `lorenz-attractor.ts` used to carry
  a second copy of its ramp in an injected stylesheet, which is exactly the kind
  of thing that silently desyncs.

To derive a profile from colours you already like, measure them:
`srgbToOklch([r, g, b])` from `src/lib/oklab.ts` gives you the `l` and `c`, and
`dh` is the measured hue minus the anchor (260° cool, 60° hot).

Wire `createPngButton` and `createRecordButton` into
`exportSlot`, with filenames `` `aleatory_${slug}_${seed}.png` `` /
`` .webm ``. Wire `createSeedUI` into `seedSlot`.

## 4. Capture the thumbnail (manual, for now)

Automation is deferred; the manual step:

1. `npm run dev` and open the work page. Let it render a nice frame.
2. Save a still and downscale it to a ~600×600 gallery thumbnail. Either:
   - use the page's **Download PNG** button (F7) to get the 1080×1080 still, then
     downscale on disk, e.g. `sips -Z 600 in.png --out thumb.jpg`; or
   - grab a JPEG directly from the canvas in the browser console.
3. Save it as `public/thumbs/<slug>.jpg`.

JPEG is preferred for these gradient-heavy dark stills — it keeps each card
light (~25 KB) where an equivalent PNG is ~15× larger. The gallery references
`thumbs/<slug>.jpg`.

## 5. Verify

```bash
npm run build      # tsc typecheck + vite build; the new page must appear in dist/
npm run preview    # check the card + page under the /aleatory/ base
```

Check on desktop Chrome and iPhone Safari (video export is Chrome-only by
design). Commit, push — the GitHub Actions workflow deploys to Pages.

## 6. Credit the source

If the piece re-implements, studies, or pays tribute to an existing system or
artwork, add an entry to [`CREDITS.md`](../CREDITS.md).
