# STATUS

Living handoff for the next session. **Read this before starting; update it
before finishing.** Stable rules live in [`../CLAUDE.md`](../CLAUDE.md); this file
is the volatile "where things stand / what's next" state.

_Last updated: 2026-07-26._

## Where things stand

- Foundation is complete and deployed (Vite/TS/p5 scaffold, shared frame,
  controls, i18n, seed RNG, PNG + 9:16 WebM export, gallery, GitHub Actions →
  Pages). Live: https://sadah.github.io/aleatory/
- **Work #1 — Lorenz Attractor** (`Study`) is done end to end: sketch, exports,
  gallery card + thumbnail, plus a manifest-driven **About / Parameters**
  explainer section (`Work.about` / `Work.parameters`).
- **Work #2 — Prime Spiral Constellations** (`Study`) is done end to end: ported
  from `gen-art-practice/polar_prime_spiral_constellations.html`. Controls are
  Primes / Links / **Twist** / Spin / Grid (`createToggle`'s first use). Its
  `renderFrame(n)` is fully pure in `n` — no integration state — so it can seek
  in either direction, unlike Lorenz.
  - Because primes are deterministic, the **seed** drives a twist offset smaller
    than one slider notch (±0.0025 rad), the starting rotation, and per-star
    scintillation phase. Enough to make every seed a different sky without
    touching the arithmetic.
  - Star colour maps the **prime gap**, normalised as `gap / ln(p)` (the Cramér
    merit). Merit is scale-free, so the Primes slider does not shift the whole
    field's colour the way a raw gap would — measured cool-star share stays ~86%
    at n = 4,000 / 25,000 / 60,000. Thresholds (`MERIT_MAX` 3.2, `MERIT_GAMMA`
    1.7) were tuned against the measured distribution to land ~2% hot stars;
    the first attempt (2.6 / 0.9) put ~10% warm and read as garish.
  - The source sketch's neighbour search packed distance and index into one
    float and could not recover the index; this port selects the k nearest
    neighbours by insertion instead. Build at max settings is ~13 ms, render
    ~11 ms at 60,000 primes (12 colour × 4 twinkle buckets ⇒ ≤60 fills/frame).
- Language toggle lives in the header top bar (gallery and work pages), labelled
  with the target language's English name (`Japanese` / `English`).

## Next up

Pick the next work — a creative call. Cleanest path: port one of the 4 remaining
sketches in `/Users/sadah/git/gen-art-practice/` (same dark-glow physics/math
family as Lorenz, `drawingContext` + additive glow already fits):

- `chladni_plate_frequency_sweep.html`
- `gray_scott_reaction_diffusion_coral.html` — reaction-diffusion; uses
  pixel/ImageData, a different render path from the others
- `magnetic_field_line_particle_flow.html`
- `triple_pendulum_chaos_glowing_trails.html`

Choose per `taste-notes.md` (phenomenon over meaning; order → disorder;
"what is that?" emergence), then plan → implement per `ADD_A_WORK.md`.

## Known issues (non-blocking)

- **iPhone Safari real-device check still pending** (owner's device): PNG export,
  the video button being disabled + its tooltip, and drag-to-rotate. Everything
  was verified on desktop Chrome.
- Tabler icon webfont is heavy (CSS ~192 KB + ttf ~2.8 MB) for the handful of
  icons actually used. Consider subsetting or inlining SVG icons.
- Vite warns the Lorenz JS chunk is >500 KB (p5 bundled, ~1 MB). Cosmetic; raise
  `build.chunkSizeWarningLimit` or split p5 via `manualChunks` if it bothers.

## Deferred by design

- Offline high-quality video export via the fixed-timestep `renderFrame(n)`
  (add-only when built).
- Automated thumbnail capture (currently a manual step — see `ADD_A_WORK.md`).
- Per-work permalinks beyond the static pages; custom domain; analytics.
