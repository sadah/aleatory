# CLAUDE.md

Guidance for Claude Code working in this repository.

**Before starting work, read [`docs/STATUS.md`](docs/STATUS.md)** — current state,
next-up work, and known issues. Update it at the end of a session.

## What this is

`aleatory` — a generative-art gallery. Vite + TypeScript (strict) + p5.js
(`^1.x`), multi-page (one HTML entry + one sketch module per work). English
default with a Japanese toggle. Live: https://sadah.github.io/aleatory/

## Invariants (do not break)

1. **Base-safe URLs.** Any runtime path string is built as
   `` `${import.meta.env.BASE_URL}...` `` — never a hardcoded `/thumbs/...` or
   `/works/...`. Vite does not rewrite plain runtime strings, and the site is
   served under the `/aleatory/` base on Pages. (HTML-authored `href`/`src` are
   fine — Vite rewrites those.)
2. **Fixed-timestep `renderFrame(n)`.** Every animated sketch drives its
   simulation and camera from an integer frame index, decoupled from
   `requestAnimationFrame`, so offline export stays add-only.

## Rendering conventions

- p5.js in **instance mode** as a canvas host only. **All drawing via
  `p.drawingContext`** (Path2D + `globalCompositeOperation`); reset to
  `'source-over'` at the end of every frame. No p5 shape / `background()` calls.
- Canvas fixed **1080×1080**, `pixelDensity(1)`, CSS-scaled into a square stage.
  Compute geometry from the fixed size, not from live DOM width.
- Randomness comes only from `src/lib/seed.ts` (`makeRng`); no bare
  `Math.random()` in a sketch (the seed UI's "New seed" is the sole exception).
- **Colour comes only from `src/lib/palette.ts`.** No literal RGB or hex in a
  sketch, and none in CSS for anything the palette drives. A sketch declares a
  `RampProfile` (and `ColorSpec`s for off-ramp colours), builds its style table
  in a `rebuildPaletteStyles()`, and re-runs that from `onPaletteChange`.
  Backgrounds use the ground ladder (`resolveChrome().ground[3]` inner,
  `ground[1]` outer), never their own near-black.
- Keep p5 pinned to `^1.x` (2.x has breaking API changes).

## Commands

```bash
npm run dev       # dev server (base /aleatory/)
npm run build     # tsc typecheck gate, then vite build
npm run preview   # preview the production build under /aleatory/
```

## Adding a work

One `WORKS` entry (`src/works.ts`) + `works/<slug>.html` +
`src/works/<slug>.ts` + `public/thumbs/<slug>.jpg`. Full recipe:
[`docs/ADD_A_WORK.md`](docs/ADD_A_WORK.md). Optional `about` / `parameters`
manifest fields render an explainer section via the shared frame. Aesthetic
guidance: [`docs/taste-notes.md`](docs/taste-notes.md). Credit sources in
[`CREDITS.md`](CREDITS.md).

**Japanese copy** (work titles/descriptions/about/parameters) is written in
polite form (ですます調), not plain (である) form. Put a half-width space between
Japanese and adjacent Latin letters/numbers. English UI docs stay English.

## Deploy

Automatic on push to `main` (GitHub Actions → Pages). No manual step. Git remote
is SSH, so pushing `.github/workflows/*` needs no `workflow` token scope.

## Docs index

- [`docs/STATUS.md`](docs/STATUS.md) — living handoff (read first, update last).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system map, types, models.
- [`docs/ADD_A_WORK.md`](docs/ADD_A_WORK.md) — the N+1 recipe.
- [`docs/taste-notes.md`](docs/taste-notes.md) — what makes a piece worth keeping.

## Delegation notes

**Delegate implementation to the Codex rescue subagent by default.** Plan and
agree the design first, write it down, then hand Codex the plan file plus the
templates it should copy (`src/works/prime-spiral.ts` for a new work) and the
exact lib signatures — it should not have to guess an API.

Two things stay yours, always:

- **Verification.** Codex reporting a green `npm run build` is not verification.
  Drive the page yourself and check the behaviour the plan actually asked for.
- **Small fixes.** Anything a few lines wide that review turns up, fix directly
  rather than round-tripping — but say in the summary what you changed and why.

Practical constraint: the **Codex sandbox has no network** — `npm install` hangs
there. Run installs yourself; tell Codex deps are installed and to verify with
`npm run build` only. Also tell it not to start `npm run dev` (long-running) and
not to commit.

Worked example — work #3 `schotter` (2026-07-26): Codex implemented the whole
piece from an approved plan and the build was green, but review found the
per-square break times were spread over the whole phase, so the bottom rows were
still mid-ramp when the cycle branch flipped and snapped into the lattice — a 4×
frame-to-frame jump right at the loop seam. A build gate cannot see that; a
frame-difference sweep across the phase boundaries can.
