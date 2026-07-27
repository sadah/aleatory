# Adding a work

The vertical slice is done, so adding work N+1 is: **one manifest entry + one
HTML entry + a core/shell pair + a thumbnail + an OGP card.** The gallery and
the multi-page build pick up the page automatically (Vite globs
`works/*.html`).

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

Create `works/<slug>.html` by copying `works/lorenz-attractor.html`. Change:

- `<title>`, `description`, canonical URL, and author-facing title/description;
- `og:title`, `og:description`, `og:url`, `og:image`, and `og:image:alt`;
- the matching `twitter:*` fields;
- the module script path.

The canonical, `og:url`, and image URL are deliberately absolute production
URLs (`https://sadah.github.io/aleatory/...`) because social crawlers consume
the static HTML. Keep `og:image:width="1200"` and `og:image:height="630"`.
English is the static/default metadata language; keep `en_US` with `ja_JP` as
its alternate.

## 3. Add the sketch module — two files, not one

A work is a **render core** plus a **page shell**:

- `src/works/<slug>.core.ts` draws, and nothing else. No p5, no DOM, no
  module-level mutable state — everything lives in the closure returned by
  `create<Name>Core(ctx, opts)`. That is what lets the gallery run the same code
  in a 400 px canvas while the work page runs it at 1080, without the two
  interfering.
- `src/works/<slug>.ts` is the page: `buildFrame`, the p5 canvas host, controls,
  seed UI, exports, overlay, drag handlers, and a `renderFrame(n)` export that
  delegates to the core.

`src/works/schotter.core.ts` + `src/works/schotter.ts` are the cleanest pair to
copy; the contract is `WorkCore<P>` / `WorkCoreOptions<P>` in
`src/works/core-types.ts`.

Three things the split demands:

- **Take `size` from `opts`, not a constant.** Then hunt down every value that is
  a raw device pixel and does *not* derive from it — stroke widths, dot radii —
  and scale them by `size / 1080` with a floor. Each of the three works had a
  different story here, so work yours out rather than copying: Schotter divides
  its widths by `scale` *after* `ctx.scale`, which makes them absolute by design;
  Prime Spiral has no `ctx.scale` at all and pre-multiplies positions by `R`, so
  unscaled radii balloon relative to a smaller field. Verify every scaled value
  evaluates to exactly its old number at `size === 1080`.
- **Import `makeRng` from `../lib/rng`, not `../lib/seed`.** `seed.ts`
  side-effect-imports `controls.css`, and CSS survives tree-shaking, so the
  gallery bundle would pick up the controls stylesheet.
- **Return the overlay string, don't write it.** `getStatusText(n)` keeps the
  core DOM-free; the shell owns the element and the only-write-when-changed guard.

The shell then looks like:

```ts
import p5 from 'p5';
import { buildFrame } from '../lib/frame';
import { createSlider, createButton } from '../lib/controls';
import { createSeedUI } from '../lib/seed';       // the UI; the core owns the RNG
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { onPaletteChange } from '../lib/palette';
import { WORKS } from '../works';
import { create<Name>Core, <NAME>_DEFAULTS, type <Name>Core } from './<slug>.core';

const work = WORKS.find((w) => w.slug === '<slug>');
if (!work) throw new Error('Missing work metadata');
const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root');

const { stage, controlsBar, seedSlot, exportSlot } = buildFrame(app, work);
let core: <Name>Core | null = null;

/** The fixed-timestep hook (invariant 2), delegated to the core. */
export function renderFrame(n: number): void {
  core?.renderFrame(n);
}

onPaletteChange(() => core?.refreshPalette());
// ... controls -> core.setParams(), seed UI -> core.setSeed(), exports, p5 host
// that creates the core in p.setup once `ctx` exists ...
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
  `rebuildPaletteStyles()`. `prime-spiral.core.ts` sets `cachedK = -1` for exactly
  this reason; without it a settled field keeps its old colour.
- If you render a legend, generate it with
  `rampGradientCss(resolveRamp(RAMP_PROFILE))` and repaint it on palette change.
  Never write the gradient out as a literal — `lorenz-attractor` used to carry
  a second copy of its ramp in an injected stylesheet, which is exactly the kind
  of thing that silently desyncs.

To derive a profile from colours you already like, measure them:
`srgbToOklch([r, g, b])` from `src/lib/oklab.ts` gives you the `l` and `c`, and
`dh` is the measured hue minus the anchor (260° cool, 60° hot).

Wire `createPngButton` and `createRecordButton` into
`exportSlot`, with filenames `` `aleatory_${slug}_${seed}.png` `` /
`` .webm ``. Wire `createSeedUI` into `seedSlot`.

## 4. Give the card a live preview

Add `thumbPreview` to the manifest entry and register the core in `CORE_LOADERS`
in [`src/gallery.ts`](../src/gallery.ts). Omit `thumbPreview` and the card just
shows its JPEG — a fine place to stop if the piece does not read at card size.

```ts
thumbPreview: {
  mode: 'loop',                 // only if the motion is genuinely periodic
  window: [10, 729],            // inclusive, and exactly one period
  posterFrame: 300,
  params: { rows: 14, ghosts: 2 },   // cheaper settings for a small canvas
},
```

```ts
thumbPreview: {
  mode: 'forward',              // non-periodic, or the one-way opening is the point
  startFrame: 0,
  restartAfter: 960,            // optional; omit to run on forever
  posterFrame: 660,
  params: { nMax: 6000 },
},
```

Choosing between them is a judgement about the piece, not a technicality:

- **`loop` needs a real period, and the seam test differs by piece.** Where the
  motion settles at the loop point (Schotter) the wrap should measure ~0. Where
  it never settles (a rotating field) the wrap should instead look like *one
  normal frame step* — demanding zero there would be wrong. Measure it; do not
  assume. Schotter's window starts at 10, not 0, because its ghost trail is empty
  for the first `ghosts · GHOST_STEP` frames.
- **`forward` is the honest answer more often than it looks.** Prime Spiral had a
  provably seamless loop and it was still the wrong choice, because the window
  began after the reveal and threw away the part worth watching. Lorenz cannot
  loop at all — non-periodic *and* forward-only.
- **`restartAfter` only works for a core pure in `n`**, since it just rewinds the
  counter. A forward-only core would ignore the rewind and keep its state.

Keep the card cheap: it shares the frame budget with every other visible card.
Measure with `performance.now()` around a few hundred `renderFrame` calls at the
real card size — the three current works land at 0.02–0.8 ms.

## 5. Capture the thumbnail (manual, for now)

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

## 6. Create the sharing card

Add the work to the `cards` object in `scripts/og-cards.html`, using its gallery
thumbnail, label, and English title. Run the dev server and open:

```text
http://127.0.0.1:5173/aleatory/scripts/og-cards.html?card=<slug>
```

Capture the page at exactly 1200×630 CSS pixels with no browser chrome and save
it as `public/og/<slug>.png`. Confirm the resulting file is exactly 1200×630 and
that `works/<slug>.html` points at its absolute production URL.

## 7. Verify

```bash
npm run build      # tsc typecheck + vite build; the new page must appear in dist/
npm run preview    # check the card + page under the /aleatory/ base
```

Check on desktop Chrome and iPhone Safari (video export is Chrome-only by
design). Commit, push — the GitHub Actions workflow deploys to Pages.

Also inspect the built HTML for the canonical and OGP URLs; a green TypeScript
build cannot detect a misspelled social image path.

## 8. Credit the source

If the piece re-implements, studies, or pays tribute to an existing system or
artwork, add an entry to [`CREDITS.md`](../CREDITS.md).
