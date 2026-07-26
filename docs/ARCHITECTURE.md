# Architecture

How `aleatory` fits together. This is the map to read before changing shared
code or adding a work.

## Overview

A multi-page Vite app. Each work is an independent HTML entry plus a TypeScript
sketch module, all sharing a common library. A typed `WORKS` manifest is the
single source of truth for the gallery.

```
aleatory/
├─ index.html                  # gallery shell
├─ works/
│  └─ lorenz-attractor.html    # one HTML entry per work
├─ src/
│  ├─ works.ts                 # WORKS manifest (pure data, type-only imports)
│  ├─ types.ts                 # Work, Locale, Label
│  ├─ gallery.ts + gallery.css # renders index cards (base-safe URLs)
│  ├─ works/
│  │  └─ lorenz-attractor.ts   # the sketch (p5 instance mode, fixed-timestep)
│  └─ lib/
│     ├─ frame.ts + frame.css  # shared page layout
│     ├─ controls.ts + .css    # slider / button / toggle factory
│     ├─ export-image.ts       # PNG capture
│     ├─ export-video.ts       # MediaRecorder -> WebM, 9:16 compositing
│     ├─ seed.ts               # deterministic RNG + seed UI
│     ├─ i18n.ts               # en/ja strings + locale toggle (persisted)
│     └─ theme.css             # dark design tokens
├─ public/
│  ├─ favicon.svg
│  └─ thumbs/<slug>.jpg        # gallery thumbnails (captured stills)
├─ .github/workflows/deploy.yml
├─ vite.config.ts              # inputs from glob('works/*.html'); base '/aleatory/'
└─ tsconfig.json               # strict; noEmit (tsc = typecheck gate)
```

## The `Work` type

`src/types.ts` defines the contract the gallery is built from:

```ts
export type Locale = 'en' | 'ja';
export type Label = 'Study' | 'Tribute' | 'Original' | 'Reproduction';

export interface Work {
  slug: string;                 // -> works/<slug>.html, src/works/<slug>.ts, thumbs/<slug>.jpg
  label: Label;
  date: string;                 // ISO 'YYYY-MM-DD'
  animated: boolean;            // true -> video export enabled
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  tags: string[];
}
```

No absolute URLs live in the manifest. Paths are derived from `slug` +
`import.meta.env.BASE_URL` at render time.

## Two rules that run through everything

1. **Base-safe URLs.** Vite rewrites `base` for imported assets and HTML/CSS
   `url()`, but not for plain runtime strings. Any runtime URL is built as
   `` `${import.meta.env.BASE_URL}works/${slug}.html` `` /
   `` `${import.meta.env.BASE_URL}thumbs/${slug}.jpg` ``. A hardcoded
   `/thumbs/...` would 404 under the `/aleatory/` base on Pages.

2. **Fixed-timestep `renderFrame(n)`.** Every animated sketch drives its
   simulation and camera from an integer frame index, decoupled from
   `requestAnimationFrame`. This keeps a future offline renderer add-only.

## Rendering model

Each sketch instantiates p5.js in **instance mode** solely as a canvas host:

- `createCanvas(1080, 1080)` with `pixelDensity(1)` — the backing store is
  exactly 1080×1080 regardless of display DPI, so exports are resolution-stable.
  The canvas is CSS-scaled (`width/height: 100%`) into a square stage.
- **All drawing goes through `p.drawingContext`** (the raw `CanvasRenderingContext2D`)
  — Path2D strokes, `globalCompositeOperation = 'lighter'` for additive glow,
  reset to `'source-over'` at the end of every frame. No p5 shape or
  `background()` calls are mixed in.

Geometry (centre, scale, perspective) is computed from the fixed 1080 size, not
from live DOM width, so the still, the video, and the on-screen render are
identical.

## Determinism scope

Given a seed, the initial condition and the trajectory (fixed `dt`, fixed step
count) are identical run to run, and the reset / frame-0 still is reproducible.
The live animation phase and camera angle at wall-clock time *T* are **not**
reproduced frame-for-frame — `requestAnimationFrame` is real time. The
fixed-timestep `renderFrame(n)` is the path an offline renderer would call with
`n = 0..N` for a deterministic sequence.

The RNG (`src/lib/seed.ts`) is `xmur3` (string hash) seeding `mulberry32`. It is
the only randomness source a sketch uses at runtime; `Math.random()` is confined
to minting a fresh seed when the user clicks "New seed".

## Shared library

- **frame.ts** — builds the standard page (sr-only description, header with title
  + label chip, square stage, controls bar, footer with seed/export slots and the
  locale toggle) and re-renders text in place on locale change.
- **controls.ts** — framework-agnostic slider / button / toggle factory.
- **i18n.ts** — `en`/`ja` string table, `t(key)`, locale persisted in
  `localStorage`, subscriber notification so the frame and sketches relabel live.
- **seed.ts** — the RNG plus the seed UI (display / new / manual input).
- **export-image.ts** — PNG capture (all browsers).
- **export-video.ts** — desktop-Chrome-only WebM: codec fallback
  (vp9 → vp8 → webm), a fixed 1080×1920 offscreen canvas, a per-frame pump that
  letterboxes the square art (drawn at y=420), and `captureStream(fps)` feeding
  `MediaRecorder`.
- **oklab.ts** — sRGB ↔ OKLab/OKLCH. Gamut mapping reduces chroma by bisection
  rather than clamping channels, so hue and lightness survive; clamping moves the
  hue, which is how a palette rotated towards orange comes back green.
- **palette.ts** — the palette engine (see below).
- **palette-picker.ts** — the topbar swatch popover plus the Custom sliders. The
  swatches are drawn from `SWATCH_PROFILE`, a display-only ramp with a shallow
  symmetric lightness arc — *not* one of the works' profiles, which climb from a
  dim ground to a white pivot and back and so read as a dark cap at each end of a
  14 px bar.
- **theme.css** — dark, low-chroma, glow-friendly tokens; Tabler icon webfont.

## Palette

The split of concerns is the whole design:

- **The work owns lightness.** Every ramp encodes a scalar — speed, prime gap,
  activity — as a climb from a dim cool ground through a white-hot pivot to a
  warm peak. That climb *is* the reading, so a palette must not touch it.
- **The palette owns hue and chroma.** It says where "cool" and "hot" point and
  how saturated to be, and nothing else.

A work ships a `RampProfile`: per stop, `{ x, side, dh, l, c }` — position, which
end it hangs off, hue offset from that end, and the OKLCH lightness/chroma
measured off the colour it used to hardcode. `resolveRamp` recombines them.

Hue is deliberately **not** interpolated across the white pivot. Measured in
OKLCH the ramps jump from ~260° to ~60° there rather than sweeping through green,
and the pivot itself is a near-neutral cream. Anchoring each stop to one end
reproduces that; one interpolated hue axis would not.

Six presets plus a Custom mode (cool hue / hot hue / chroma). The Custom chroma
knob is a fraction of `chromaHeadroom` at the chosen hues, so it stays meaningful
all the way round the wheel instead of going dead where sRGB is narrow. State
mirrors `i18n.ts`: `aleatory:palette` (+ `aleatory:palette-custom` for the
knobs), a `Set` of subscribers, `onPaletteChange` returning an unsubscribe.
`?palette=<id>` is read at boot but never written — a shared link shows what the
sender saw without overwriting the visitor's own choice.

`applyPaletteTokens` writes `--ground-0-rgb`…`--ground-5-rgb`, `--accent-rgb`,
`--ramp-cool-rgb`, `--ramp-hot-rgb` as inline properties on the root element. The
ground ladder is one near-black family: 0 stage, 1 page background / sketch
gradient outer / video letterbox, 2 surface, 3 sketch gradient inner, 4 raised
surface, 5 button hover. The literals in `theme.css:root` are the Ember values
kept as a pre-JS fallback.

**Label chips do not follow the palette.** They are a categorical set saying what
kind of work this is; rotating them made "Study" read teal under Aurora and
orange under Terracotta — still distinguishable, but no longer learnable.

## Build and deploy

`vite.config.ts` derives `rollupOptions.input` by globbing `works/*.html` (plus
`index.html`) at config time — it never imports `src/works.ts`, keeping the Node
config free of any browser-global import. `base` is `/aleatory/`.

`.github/workflows/deploy.yml` runs `npm ci` + `npm run build` and deploys `dist/`
to GitHub Pages via `upload-pages-artifact` + `deploy-pages`, with
`pages: write` + `id-token: write` permissions and the `github-pages`
environment. Pages source is set to GitHub Actions.
