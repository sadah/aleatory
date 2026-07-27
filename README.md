# aleatory

A personal generative-art gallery. *Aleatory* means relating to chance and
randomness in art — the pieces here are systems given a measured amount of
autonomy, sitting somewhere on the line between order and disorder.

**Live:** https://sadah.github.io/aleatory/

The site is English by default with a Japanese toggle. Each work is its own page;
the gallery index is built from a typed manifest. The first piece is a
re-implementation of the **Lorenz attractor**, drawn as a velocity-coloured
glowing ribbon.

## Stack

- **Vite** + **TypeScript** (strict) + **p5.js** (pinned `^1.x`)
- Multi-page build: one HTML entry per work, page inputs derived from the
  filesystem (`works/*.html`)
- Each sketch uses p5.js in **instance mode** purely as a canvas host; all
  drawing goes through `drawingContext` (Path2D + additive compositing)
- Fixed internal canvas resolution **1080×1080**, CSS-scaled to a square stage
- Deployed to **GitHub Pages** via GitHub Actions, served under base `/aleatory/`

## Run and build

Install (Node 18+ recommended; CI uses Node 20):

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Type-check and build for production (the build runs `tsc` as a gate, then Vite):

```bash
npm run build
```

Preview the production build locally (serves under `/aleatory/`):

```bash
npm run preview
```

## Page model

- `index.html` — the gallery shell; `src/gallery.ts` renders cards from the
  `WORKS` manifest.
- `about.html` — the bilingual profile page for `sadah`.
- `works/<slug>.html` + `src/works/<slug>.ts` — one HTML entry and one sketch
  module per work.
- `src/works.ts` — the `WORKS` manifest, the single source of truth for the
  gallery. Pure data with type-only imports.
- `src/lib/` — the shared foundation: page frame, controls, i18n, seed RNG,
  PNG/video export, palette, and site footer.

**Base-safe URLs (important for Pages).** Vite rewrites `base` for imported
assets and HTML/CSS `url()`, but **not** for plain runtime path strings. So any
runtime URL (thumbnails, work links) is built as
`` `${import.meta.env.BASE_URL}...` `` — never a hardcoded `/thumbs/...` string.

## Export

- **PNG still** — on every page, in every browser. Exports the 1080×1080 canvas.
- **Video (WebM)** — desktop **Chrome only** (Safari emits mp4/H.264, not WebM).
  The square art is composited into a fixed **1080×1920** (9:16) frame at export.
  The button is disabled elsewhere with an explanatory tooltip. Offline
  high-quality export is deferred but designed to be add-only: each sketch
  exposes a fixed-timestep `renderFrame(n)`.

## Adding a work

See [docs/ADD_A_WORK.md](docs/ADD_A_WORK.md). In short: add one manifest entry,
one HTML entry, a render core + page shell, a thumbnail, and a 1200×630 sharing
card — the gallery and build pick up the page automatically.

## Sharing metadata

The gallery, profile, and every work page carry static Open Graph and X card
metadata in their HTML `<head>`. Sharing images live in `public/og/`; their
reproducible browser-rendered source is `scripts/og-cards.html`. Metadata is
English-first to match the site's default locale, with Japanese declared as an
alternate locale.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the system fits together.
- [docs/ADD_A_WORK.md](docs/ADD_A_WORK.md) — the recipe for work N+1.
- [docs/taste-notes.md](docs/taste-notes.md) — aesthetic guidance for the pieces.

## Licensing

This project is **dual-licensed**:

- **Code** — [MIT](LICENSE).
- **Artworks** (the rendered stills and videos, and the visual output of the
  sketches) — [CC BY-NC 4.0](LICENSE-ART): attribution required, non-commercial.

The licenses cover our own code and expression only — not the underlying
mathematical/physical systems, ideas, or original artists' works. Sources are
credited in [CREDITS.md](CREDITS.md). Not legal advice.
