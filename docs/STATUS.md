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
    one seamless loop. Verified by recording an actual `.webm`. Caveat:
    `durationMs` is fixed at construction, so moving the **Fall** slider
    desynchronises the recording length from the cycle.
  - Break times spread over `phase − RISE`, not the whole phase. Spreading over
    the full phase left the bottom rows mid-ramp at the branch flip and they
    snapped — measured as a 2× frame-to-frame jump into the hold and a 4× jump
    across the loop seam. Both are gone; the seam measures ~0 motion **as long as
    the frame counter keeps increasing**, which the live page does.
  - **The trail does not wrap the cycle, so `[0, 719]` is not a seamless loop.**
    `drawGhostLayer` returns early when `n − k·GHOST_STEP` is negative, so frame 0
    renders with no trail while frame 720 renders with a full one. Confirmed by
    scaling: wrap 719→0 measures 0 with `ghosts: 0`, 4.07 with 3, 8.53 with 6,
    while 719→720 stays at 0.002 — the pose cycle itself closes fine. It only
    bites a consumer that resets to 0, i.e. a looping player. (Drift was the first
    suspect and is innocent: the wrap is 4.07 at drift 0 and at drift 1.0 alike.)
    The gallery preview sidesteps it by looping `[10, 729]` instead — any 720-long
    window starting at or after `ghosts · GHOST_STEP` is bit-exact seamless, and
    729→10 measures **exactly 0** against a median in-window motion of 1.56. An
    offline renderer would need the same offset, or a real fix wrapping `past`
    modulo the cycle.
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

- **Live gallery previews: Schotter and Prime Spiral done, Lorenz still to go**
  (2026-07-27). Each converted card loads a DOM-free render core on hover/focus
  and animates at card size; Lorenz falls through to its JPEG because it has no
  `thumbPreview` yet. `src/works/core-types.ts` + `<slug>.core.ts` (the cores) +
  `<slug>.ts` (thin page shells) + `src/lib/thumb-preview.ts`.
  - **Prime Spiral** is byte-identical at 1080 too: frames 0/300/719 hash
    `a23e6df3` / `8e567241` / `8bdd3ed9`.
    - **Its preview is `forward` from frame 0, not a loop** — corrected after
      review. It first looped `[660, 1379]`, which starts *after* the reveal
      saturates (frame 660 exactly: `revRate = P / (REVEAL_SECONDS · FPS)` = P/660,
      and the lit count measurably plateaus 655 → 660, flat through 900). That
      loop was seamless — wrap 8.278 vs a median in-window step of 8.289 at size
      480, ratio 1.00 — but seamlessness was the wrong thing to optimise: it threw
      away the outward reveal, which *is* the piece, leaving a card that only
      spun. Running forward from 0 shows the constellation drawing itself over
      11 s; mean lit radius grows 4.9 → 62.3 px at size 273. Forward playback
      restarts whenever the card re-enters the viewport, so it is not a one-time
      event a visitor can miss.
    - Spin is back to the work's own default, **0.001 rad/frame = 105 s per turn**.
      The loop had forced TAU/720 = 12 s per turn, which read as frantic. Nothing
      needs a period now, so nothing has to be forced.
    - `spinPerFrame` stays a core param **in radians**, not the slider's 0..1
      value — a lesson from the loop attempt worth keeping. The slider maps
      `value * 0.004` capped at 1, so the UI tops out at 0.004 while the loop
      needed 2.18× that. The shell keeps the mapping; the core is not boxed in by
      a UI range.
    - Cost is **0.024 ms/frame at size 480**, not the ~1.5 ms first estimated. The
      estimate assumed `rebuildPaths` runs every frame, but it is cached on K.
    - Opposite scaling problem to Schotter: there is **no `ctx.scale`** here, star
      positions are pre-multiplied by `R = 0.44 · size`, so the field shrinks with
      the canvas while `coreRadius` / `glowRadius` / `LINK_WIDTH` / `GRID_WIDTH`
      are raw device pixels. Unscaled they would balloon relative to the field and
      the spiral would read as a blob. All four now scale by `size / 1080` with
      floors.
    - `nMax: 6000` (783 stars, vs ~2760 at the page default). The 44-arm structure
      still reads at card size — arguably better, since individual stars separate
      instead of mushing.
  - Codex minified both Prime Spiral files (a 621-character line, 1-space code
    indent). Reformatted by hand to match `schotter.core.ts`, and the byte-identity
    gate re-run afterwards to prove the reformat changed nothing. Worth telling it
    explicitly to match surrounding formatting next time.
  - **The core is byte-identical to the page at size 1080**: frames 0/300/719
    hash `19c928a7` / `b3e450e4` / `d1f669a`, unchanged from before the split.
    Three cores at 1080/320/512 with different params coexist without disturbing
    each other, which is the whole point of the split.
  - Cost is **0.82 ms/frame at size 320** with `rows: 14, ghosts: 2`.
  - `STROKE_WIDTH` and `LATTICE_WIDTH` are absolute device-pixel widths (they are
    divided by `scale` *after* `ctx.scale`), so shrinking the canvas makes them
    relatively **heavier**, not fainter — at 1080/22 rows the 1.55 px stroke is
    4.2% of a square edge, at 320/14 rows it would be 9.0%. Both now scale with
    the canvas and are floored.
  - `src/lib/rng.ts` was split out of `seed.ts` first: `seed.ts` side-effect
    imports `controls.css`, and CSS survives tree-shaking, so a core importing
    `makeRng` from there would drag the controls stylesheet onto the gallery
    bundle. `seed.ts` re-exports, so no call site changed.
  - Verified: index chunk carries **no p5** (8 kB + 28 kB, the core is a separate
    4.4 kB chunk fetched on hover); canvas created on hover/focus and released
    ~140 ms after leaving; the `<img>` stays underneath so leaving fades back;
    the live canvas follows a palette change within a frame; no canvas or heap
    accumulation over repeated hovers.
  - **Cards animate whenever they are on screen — hover is not required** (changed
    after review; it was hover-gated at first, which left the gallery still until
    you happened to point at something). The IntersectionObserver at threshold
    0.25 is what bounds the cost: off-screen cards run nothing and release their
    canvas, and scrolling back in re-creates it. `prefers-reduced-motion` still
    creates no canvas at all.
  - The hover lift (`transform: translateY(-3px)`) is gone. With the cards moving
    on their own, nudging one upward misaligned it against its neighbours while
    the eye was already on it; the border and glow carry the hover state instead.
  - **Not yet verified at runtime:** the actual animation, `prefers-reduced-motion`
    and the touch/no-hover path. The browser pane runs hidden
    (`visibilityState: "hidden"`, **0 rAF ticks per 500 ms**), so playback cannot
    be observed there — the frame-advance arithmetic and the loop seam were
    checked directly instead, and the two media-query paths are code-inspected
    only. Worth a look on a real visible browser.

- **Themeable palettes** are done end to end (2026-07-26). Six presets — Ember
  (残り火, the original blue/orange), Aurora (極光), Peony (牡丹), Verdigris
  (緑青), Terracotta (素焼き), Argent (銀) — plus a Custom mode, in a topbar popover
  on the gallery and every work page. `src/lib/oklab.ts` + `src/lib/palette.ts` +
  `src/lib/palette-picker.ts`; design rationale in `ARCHITECTURE.md`, authoring
  recipe in `ADD_A_WORK.md`.
  The replaced preset was removed because its anchors sat within 5–20° of
  Ember's with only reduced chroma, making it read as a paler Ember rather than
  a distinct palette: cool-half mean chroma was 0.0765 versus Ember's 0.1397
  and Peony's 0.1384.
  - **The work owns lightness, the palette owns hue and chroma.** Each work ships
    a `RampProfile` of `{x, side, dh, l, c}` derived by measuring its old RGB
    literals in OKLCH, so Ember reproduces the previous look exactly.
  - **Ember is byte-exact:** 17/17 ramp stops, all 36 style-table strings, and
    the whole ground ladder / accent / placeholder wash resolve to the values the
    works shipped with. Verified against a `git worktree` of the pre-change tree
    running on a second dev server: max scanline deviation ≤ 1.000 per pixel on
    all three works, and the per-channel breakdown matches the intended near-black
    consolidation exactly (lorenz R+1/G+1, prime & schotter G+1/B−1).
  - **Hue is not interpolated across the white pivot.** Measured in OKLCH the
    ramps jump ~260° → ~60° there; the first design (one interpolated hue axis)
    would have swept through green. Each stop is anchored to the cool or hot end
    instead.
  - **Gamut mapping is chroma bisection, not channel clamping.** Clamping moves
    the hue, which is how a palette rotated towards orange comes back green.
    Preset chroma multipliers were fitted so no stop loses more than 0.008 chroma;
    worst case across all six is 0.0083.
  - **The additive-over-near-black guard is calibrated against Ember, not against
    absolute thresholds.** The first attempt used absolute cut-offs and Ember
    failed two of them — proof the guard was wrong, since Ember *is* the
    reference. These are sparse line drawings (3–8% of pixels lit), so a
    percentile over the whole canvas just reports the background. Measured over
    lit pixels and compared to Ember, all 36 rows (3 works × 6 palettes × 2
    frames) hold: ground within 0.0032 L, lit coverage within ~2% relative, peak
    L identical, high-chroma share ≤ 0.002%.
  - **Label chips deliberately do not follow the palette.** Rotating them made
    "Study" read teal under Aurora and orange under Terracotta — distinguishable,
    but no longer learnable. The gallery's lighter fill-less chip variant is also
    intentional, not a duplicate of the frame's, so both rule sets stay as they
    were.
  - `?palette=<id>` is read at boot but never written, so a shared link shows what
    the sender saw without overwriting the visitor's stored choice.
  - **Codex delegation gotcha, worth knowing before the next hand-off.** The
    `codex-rescue` subagent forwards to `scripts/codex-companion.mjs`, which
    defaults to `sandbox: "read-only"` and only becomes write-capable when
    `--write` is passed. Its own agent definition says to add `--write` by
    default, but it did not, and the run failed with `patch rejected: writing is
    blocked by read-only sandbox` having changed nothing. Saying `--write`
    explicitly in the request fixed it. Project trust level is not the problem —
    `~/.codex/config.toml` already has this repo as `trusted`.
  - **Verifying a palette change from the browser console needs care.** Do not
    `await import('…/palette.ts')` and call `setPalette` on it: after any HMR
    edit, Vite serves the sketch's copy under a `?t=` cache-buster, so a plain
    dynamic import is a *second module instance*. Its subscribers are not the
    sketch's, so the canvas never repaints and a contact sheet comes out with six
    identical tiles. Click the picker's own radios instead. The same trap
    produced a phantom "Custom's ends are swapped" report against `i18n` and
    `palette` both.

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

- The additive-over-near-black guard is asserted for the **six presets only**.
  Custom mode accepts any hue pair, and no automated check bounds that; the
  chroma knob being a fraction of `chromaHeadroom` is what keeps it sane.
- `GAMUT_PROBE` in `palette.ts` is the chroma envelope of everything the site
  draws today. A new work with a more saturated stop belongs in that list —
  `npm run build` will not catch its absence, the Custom slider will just promise
  saturation the gamut cannot deliver.
- The three `public/thumbs/*.jpg` are stills captured under Ember, so they do not
  follow a palette change. Cosmetic, and the planned live-canvas thumbnails
  (below) remove the problem rather than needing 18 re-captures.

## Deferred by design

- **Live-canvas hover thumbnails for Prime Spiral and Lorenz** remain deferred.
  Schotter now has the first implementation, using a pure render core
  (`<slug>.core.ts`, no p5, no DOM). Notes worth keeping for extending it:
  prime-spiral *does* loop once the reveal front saturates (nMax 6000 → K settles
  at frame 660; `spin = TAU/720` gives one turn in 720 frames and the twinkle
  period 240 divides it exactly); lorenz is non-periodic *and* forward-only so it
  cannot loop at all and should just run forward while hovered; extracting
  `src/lib/rng.ts` is a prerequisite, because `seed.ts` side-effect-imports
  `controls.css` and CSS survives tree-shaking onto the index bundle.
- Offline high-quality video export via the fixed-timestep `renderFrame(n)`
  (add-only when built).
- Automated thumbnail capture (currently a manual step — see `ADD_A_WORK.md`).
- Per-work permalinks beyond the static pages; custom domain; analytics.
