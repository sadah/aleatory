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

## Deploy

Automatic on push to `main` (GitHub Actions → Pages). No manual step. Git remote
is SSH, so pushing `.github/workflows/*` needs no `workflow` token scope.

## Docs index

- [`docs/STATUS.md`](docs/STATUS.md) — living handoff (read first, update last).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system map, types, models.
- [`docs/ADD_A_WORK.md`](docs/ADD_A_WORK.md) — the N+1 recipe.
- [`docs/taste-notes.md`](docs/taste-notes.md) — what makes a piece worth keeping.

## Delegation notes

Heavy implementation can be delegated to the Codex rescue subagent, but the
**Codex sandbox has no network** — `npm install` hangs there. Run installs
yourself; tell Codex deps are installed and to verify with `npm run build` only.
