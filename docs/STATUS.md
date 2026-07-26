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
- **Work #3 — Schotter** (`Tribute`) is done end to end: ported from
  `p5js-practice/src/schotter.ts`, but re-conceived rather than copied. Controls
  are Disorder / Rows / Fall / Drift / Trail + a `Lattice` toggle.
  - **The differentiating rule:** the collapse itself is the subject and it
    happens in time. Nees' `rowProgress²` amplitude envelope is untouched; what
    the animation adds is *when* each square breaks. Every square has a seeded
    break time ordered mostly by row (`FRONT_FUZZ = 0.25` keeps the front
    granular), so a fuzzy front descends and the classic static Schotter is a
    frame this animation passes through. The source sketch's Perlin wobble —
    which animated the squares but not the transition — was dropped.
  - **12.0 s loop** at 60 fps: collapse 420 → hold 90 → recrystallise 210 = 720
    frames, matching `createRecordButton`'s default duration so one recording is
    one seamless loop. Caveat: `durationMs` is fixed at construction, so moving
    the **Fall** slider desynchronises the recording length from the cycle.
  - Break times spread over `phase − RISE`, not the whole phase. Spreading over
    the full phase left the bottom rows mid-ramp at the branch flip and they
    snapped — measured as a 2× frame-to-frame jump into the hold and a 4× jump
    across the loop seam. Both are gone; the seam now measures ~0 motion.
  - Colour maps *instantaneous* activity (analytic `|pose(n) − pose(n−1)|`), so
    the front reads as a travelling warm band that is never drawn. `ACT_REF` was
    lowered from `0.03·PITCH` to `0.019·PITCH`: at the higher value only the last
    row or two ever warmed (1.7% warm pixels at peak) and it read as a flicker;
    now the warm band covers the lower third (5.6% at peak, 10.7% during the
    faster recrystallise phase).
  - `renderFrame(n)` is fully pure in `n` — verified bit-exact over 4,665,600
    bytes, with and without a decoy frame in between. The ghost trail depends on
    this: it re-evaluates poses at `n − k·GHOST_STEP` rather than leaving pixels
    on the canvas. Render cost is 1.8 ms/frame at defaults, 3.0 ms at 40 rows ×
    6 trail layers.
- Language toggle lives in the header top bar (gallery and work pages), labelled
  with the target language's English name (`Japanese` / `English`).

## Next up

Work #3's video export has **not been recorded end to end yet** — the Record
button is enabled and wired to a 12 s duration, but no `.webm` has been produced
and checked for loop seamlessness. Do that first (it is wall-clock/rAF driven, so
it only stays seamless if the tab holds 60 fps).

Then pick the next work — a creative call. Cleanest path: port one of the 4
remaining sketches in `/Users/sadah/git/gen-art-practice/` (same dark-glow
physics/math family as Lorenz, `drawingContext` + additive glow already fits):

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
