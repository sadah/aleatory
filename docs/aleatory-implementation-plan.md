# aleatory — Implementation Plan (Foundation + First Work) · rev.2

> Scope: build the shared foundation for the **aleatory** generative-art gallery and ship the first
> piece — a re-implementation of the Lorenz attractor — end to end (dev → sketch → export → gallery →
> GitHub Pages). This is a **vertical slice**: once it works, every later piece is "add one entry +
> one file."
>
> Implementation phase runs in **Claude Code** (orchestrator: Opus 4.8; coding/edits delegated to
> **Codex** via plugin; Sonnet used where appropriate). This document is the handoff spec.
>
> **rev.2** folds in a technical review: base-path safety, realistic determinism, fixed-timestep render
> for future offline export, fixed internal canvas resolution, MediaRecorder codec fallback + 9:16 frame
> pump, filesystem-driven Vite inputs, licensing (MIT + CC BY-NC + CREDITS), and finer task granularity.

---

## 1. Locked Decisions

| Topic | Decision |
|---|---|
| Project name | `aleatory` (meaning: *relating to chance / randomness in art*) |
| Local path | `/Users/sadah/git/aleatory` (new; reference-only: `gen-art-practice`, `p5js-practice`) |
| Repo visibility | Public (required for GitHub Pages) |
| Stack | Vite + TypeScript + p5.js (**pin `p5@^1.x`**), multi-page build |
| Rendering per sketch | p5.js **instance mode** as canvas host; **all drawing via `drawingContext`** (Path2D + `globalCompositeOperation='lighter'`), reset to `'source-over'` each frame |
| Canvas | **Fixed internal resolution 1080×1080, `pixelDensity(1)`**, CSS-scaled to a square stage |
| Design language | Dark aesthetic ported from `gen-art-practice` (CSS variables, Tabler icons, glow) |
| Gallery index | Built from a `works` manifest; **no mock** — implement directly; PNG still thumbnails |
| Site language | **English default**, Japanese toggle. Each work carries `en` + `ja` metadata |
| Docs / README | **English only** |
| Labels | `Study` / `Tribute` / `Original` / `Reproduction`. Lorenz = **Study** |
| Determinism | Seed fixes initial condition + trajectory + reset still; **not** wall-clock frame-identical (see §4) |
| Still export | PNG on every page (all browsers) |
| Video export | **Desktop Chrome only**, `MediaRecorder` → WebM (vp9→vp8→webm fallback). Square art composited into fixed **1080×1920** (9:16) offscreen at export |
| Offline hi-quality export | Deferred, but sketches expose a fixed-timestep `renderFrame(n)` so it is **add-only** later |
| Mobile | iPhone Safari = view + interact only (no video export) |
| Deployment | Claude Code creates repo + GitHub Actions → Pages; Vite `base:'/aleatory/'` |
| **License — code** | **MIT** (`LICENSE`) |
| **License — artworks/images/video** | **CC BY-NC 4.0** (`LICENSE-ART` + noted in README); attribution required, non-commercial |
| **Attribution** | `CREDITS.md` crediting sources of Reproductions/Tributes; clarifies the license covers our own code/expression only, not underlying ideas or original artists' works |
| First work | Lorenz attractor (velocity-colored glowing ribbon), label `Study` |

---

## 2. Architecture Overview

Multi-page Vite app. Each work is its own HTML entry + TS sketch module, sharing a common library
(frame, controls, export, i18n, seed). A typed `works` manifest is the single source of truth for the
gallery. **Vite page inputs are derived from the filesystem** (glob of `works/*.html`), not by importing
the app module into the Node config — this keeps the config immune to any future browser-global import.

```
aleatory/
├─ index.html                  # gallery shell (mounts gallery from works manifest)
├─ works/
│  └─ lorenz-attractor.html    # one HTML entry per work
├─ src/
│  ├─ works.ts                 # WORKS manifest (pure data; type-only imports)
│  ├─ types.ts                 # Work, Locale, Label
│  ├─ gallery.ts               # renders index cards from WORKS (base-safe URLs)
│  ├─ i18n.ts                  # en/ja strings + locale toggle (persisted)
│  ├─ works/
│  │  └─ lorenz-attractor.ts   # the sketch (p5 instance mode, fixed-timestep)
│  └─ lib/
│     ├─ frame.ts              # shared page layout (sr-only h2, title/label, stage, controls, footer)
│     ├─ controls.ts           # slider/button/toggle factory (ported + extended from p5js-practice)
│     ├─ export-image.ts       # PNG capture
│     ├─ export-video.ts       # MediaRecorder → WebM, 9:16 compositing, Chrome-only guard
│     ├─ seed.ts               # deterministic RNG + seed UI (display / new / manual input)
│     └─ theme.css             # dark design tokens (ported from gen-art-practice)
├─ public/
│  ├─ favicon.svg
│  └─ thumbs/
│     └─ lorenz-attractor.png  # gallery thumbnail (captured PNG)
├─ docs/
│  ├─ ARCHITECTURE.md          # how the system fits together (English)
│  ├─ ADD_A_WORK.md            # step-by-step recipe to add work N+1 (English)
│  └─ taste-notes.md           # ported aesthetic notes (English translation of note/)
├─ .github/workflows/deploy.yml
├─ vite.config.ts              # inputs from glob('works/*.html'); base = '/aleatory/'
├─ tsconfig.json               # strict; noEmit (tsc = typecheck gate)
├─ package.json                # build = "tsc && vite build"
├─ .gitignore                  # node_modules, dist
├─ LICENSE                     # MIT (code)
├─ LICENSE-ART                 # CC BY-NC 4.0 (artworks)
├─ CREDITS.md
└─ README.md                   # English
```

### `Work` type (drives the gallery)

```ts
export type Locale = 'en' | 'ja';
export type Label = 'Study' | 'Tribute' | 'Original' | 'Reproduction';

export interface Work {
  slug: string;                 // 'lorenz-attractor' → works/<slug>.html, src/works/<slug>.ts, thumbs/<slug>.png
  label: Label;
  date: string;                 // ISO 'YYYY-MM-DD'
  animated: boolean;            // true → video export enabled; false → PNG only
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  tags: string[];
  // NOTE: no absolute URLs here. Paths are derived from slug + import.meta.env.BASE_URL at render time.
}

export const WORKS: Work[] = [ /* lorenz-attractor entry */ ];
```

**Base-safe URL rule (critical for Pages):** never store or hardcode absolute `/thumbs/...` or
`/works/...` strings for runtime use. In `gallery.ts` build them as:
```ts
const href  = `${import.meta.env.BASE_URL}works/${w.slug}.html`;
const thumb = `${import.meta.env.BASE_URL}thumbs/${w.slug}.png`;
```
(Vite rewrites `base` for imported assets and HTML/CSS `url()`, **not** for plain runtime strings — so we
must prepend `BASE_URL` ourselves. Favicon is referenced from HTML so Vite handles it.)

---

## 3. Foundation Layer — Task Breakdown

Each task lists **acceptance criteria** so Codex has a clear "done" bar.

### F1. Project scaffold
- Init Vite + TS at `/Users/sadah/git/aleatory`; add `p5@^1.x` + `@types/p5@^1.x` (avoid p5 2.x API changes).
- `tsconfig.json` strict + `noEmit:true`; `package.json` scripts: `dev`, `build = "tsc && vite build"`,
  `preview`. Add `.gitignore` (`node_modules`, `dist`).
- **Done when:** `npm run dev` serves an empty index; `npm run build` type-checks then builds successfully.

### F2. Design tokens / theme (`lib/theme.css`)
- Port the dark palette + CSS variables from `gen-art-practice` (backgrounds `#03040a`/`#05060e`,
  `--color-border-tertiary`, `--color-text-secondary`, `--border-radius-lg`, etc.).
- Include Tabler icons (prefer local dep `@tabler/icons-webfont` over CDN for offline/dev reliability).
- **Done when:** a page using the tokens matches the gen-art dark look (glow-friendly, low-chroma UI).

### F3. Shared frame (`lib/frame.ts`)
- One function building the standard page: an `sr-only` `<h2>` long-description (accessibility, as in the
  original), header (work title in active locale + label chip), centered square canvas stage
  (`aspect-ratio:1/1`), controls bar area, footer (locale toggle, back-to-gallery link [base-safe], seed
  UI slot, export buttons).
- **Done when:** two throwaway pages built from `frame` are visually identical except content.

### F4. Controls library (`lib/controls.ts`)
- Port `createControlRow` from `p5js-practice/src/lib/controls.ts`; extend with labeled slider (live
  value), button, checkbox/toggle. Framework-agnostic DOM (not p5-bound) so frame + sketches share it.
- **Done when:** slider/button/toggle render in the controls bar and fire callbacks.

### F5. i18n (`lib/i18n.ts`)
- `en` default, `ja` toggle. UI strings table + `t(key)`; work title/description pulled from manifest by
  active locale. Persist choice in `localStorage`; toggle re-renders text in place (no reload).
- **Done when:** toggling locale switches all UI + current work's title/description without reload.

### F6. Seed utility (`lib/seed.ts`)
- Deterministic seedable RNG (e.g. `xmur3` hash → `mulberry32`) exposed to sketches; seed UI = display
  current seed, "New seed" (random), manual numeric input (apply → rebuild). Seed drives
  `p.randomSeed`/`p.noiseSeed` **and** sketch-specific initial conditions.
- **Done when:** same seed → identical initial condition + identical trajectory + identical reset still
  (see determinism scope in §4); changing seed changes it deterministically.

### F7. PNG export (`lib/export-image.ts`)
- Capture the 1080×1080 sketch canvas to PNG. Filename `aleatory_<slug>_<seed>.png`.
- **Done when:** button downloads a correct 1080×1080 PNG on desktop Chrome, desktop Safari, iPhone Safari.

### F8a. Video record core (`lib/export-video.ts`, part 1) — desktop Chrome only
- `MediaRecorder` with codec fallback chain via `MediaRecorder.isTypeSupported`:
  `video/webm;codecs=vp9` → `vp8` → `video/webm`; if none, disable the button.
- Feature-guard non-Chromium/Safari (Safari emits mp4/H.264, not WebM) → disable with tooltip
  "Video export: desktop Chrome only." PNG stays available everywhere.
- Fixed default duration with start/stop (e.g. 12 s), loop-friendly. Filename `aleatory_<slug>_<seed>.webm`.
- **Done when:** on desktop Chrome, recording the square canvas downloads a playable WebM; button disabled
  elsewhere with the tooltip.

### F8b. 9:16 compositing pump (`lib/export-video.ts`, part 2)
- Create a **single fixed 1080×1920** offscreen canvas (never resized mid-stream — `captureStream` dislikes
  size changes). Run a per-frame pump: fill background from theme, `drawImage(liveCanvas)` centered
  (letterboxed top/bottom). `captureStream(fps)` on the **offscreen** canvas feeds the recorder.
- **Done when:** output is exactly 1080×1920, art centered on themed background, correct fps, plays in Chrome.

### F9. Works manifest + gallery (`src/works.ts`, `src/types.ts`, `src/gallery.ts`, `index.html`)
- Define `Work`/`WORKS` as **pure data with type-only imports**. `gallery.ts` renders cards (thumb, title,
  label chip, date) with **base-safe URLs** (`import.meta.env.BASE_URL`); respects locale.
- **Done when:** index shows the Lorenz card, correct thumbnail + locale text, links to its page in both
  dev (`/`) and built (`/aleatory/`) bases.

### F10. Vite multi-page wiring (`vite.config.ts`)
- Generate `rollupOptions.input` by globbing `works/*.html` (+ `index.html`) at config time — do **not**
  import `src/works.ts` into the Node config. Set `base:'/aleatory/'`.
- **Done when:** `npm run build` emits index + each work page under the correct base path.

### F11. Deployment (`.github/workflows/deploy.yml`)
- Claude Code: create public GitHub repo `aleatory`, push, add Actions workflow (build → deploy to Pages).
  Workflow needs `permissions: { pages: write, id-token: write }`, the `github-pages` environment, and
  `actions/upload-pages-artifact` + `actions/deploy-pages`. Set Pages source = GitHub Actions.
- **Done when:** `https://<user>.github.io/aleatory/` serves the gallery; Lorenz page loads and animates;
  thumbnails and links resolve (base-safe).

### F12. Docs + license files
- English README (what it is, run/build/deploy, page model, dual-license note). `ARCHITECTURE.md`,
  `ADD_A_WORK.md` (the N+1 recipe incl. manual thumbnail step), `taste-notes.md` (English port of
  `p5js-practice/note` aesthetic guidance for Codex context).
- `LICENSE` (MIT), `LICENSE-ART` (CC BY-NC 4.0), `CREDITS.md` (per-work sources + the "license covers our
  own expression only" clarification).
- **Done when:** a fresh reader can add a new work via `ADD_A_WORK.md`; licenses + credits present and
  cross-referenced from README.

### F13. Thumbnail (manual for now)
- Capture Lorenz PNG (F7) → `public/thumbs/lorenz-attractor.png`. Document the manual step in
  `ADD_A_WORK.md`; automation deferred.
- **Done when:** the gallery card shows a real thumbnail in dev and prod.

---

## 4. First Work — Lorenz Attractor (`Study`)

**Concept:** a rotating 3D Lorenz strange attractor traced as a glowing ribbon, colored by instantaneous
speed (deep blue = slow → white-hot orange = fast). Source: `gen-art-practice/lorenz_attractor_velocity_colored.html`.

**Determinism scope (explicit — do not overpromise):**
> Given a seed, the initial condition and the RK4 trajectory (fixed `dt`, fixed step count) are identical
> run-to-run, and the **reset/frame-0 still is reproducible**. The live **animation phase and camera angle
> at wall-clock time T are NOT reproduced frame-for-frame** (rAF is real-time). To keep future offline
> export add-only, the sketch exposes a **fixed-timestep `renderFrame(n)`** (integer frame index → fixed
> steps/frame, `yaw = baseYaw + spinPerFrame * n`), decoupled from `requestAnimationFrame`. The live loop
> calls `renderFrame` with an incrementing counter; an offline renderer can call it with `n = 0..N`.

**Re-implementation notes (raw-Canvas2D → p5 instance mode):**
- **Integration:** RK4 of Lorenz, `σ=10, β=8/3, ρ` adjustable, `dt≈0.005`. Ring buffer of points +
  per-point speed `|f(x,y,z)|`. (Port `deriv`/`advance`/`build`.)
- **Initial condition:** derive from **seed** (replace the original `Math.random()` jitter) → reproducible.
- **Canvas:** fixed 1080×1080 internal, `pixelDensity(1)`, CSS-scaled to the stage. Compute geometry
  (`cx`, `cy`, `S`, `C`) from the fixed size — **not** from live DOM width — so PNG/video/geometry are
  resolution-independent. (Original recomputed on resize; we intentionally drop that.)
- **Projection:** yaw/pitch rotation + perspective (`scaleP = C/(C+depth)`); auto-spin (frame-indexed) +
  drag-to-rotate (pointer events; `touch-action:none` for iPhone).
- **Coloring / glow:** normalize speed → 16-bucket blue→cyan→white→orange ramp; per-bucket `Path2D`,
  stroke via `p.drawingContext` with `globalCompositeOperation='lighter'`, `lineCap='round'`, width/alpha
  rising with speed; bright head dot + halo. **Reset `globalCompositeOperation='source-over'` at end of
  each frame.** Do all drawing through `drawingContext`; do not mix p5 shape/`background()` calls.
- **Background:** radial gradient (near-black center → black edge) redrawn each frame.
- **Controls:** `Trail` (2000–14000), `Speed` (steps/frame 2–20), `Spin` (0–1), `ρ` (14–45). Buttons:
  Play/Pause, Reset. Shared: seed UI, PNG, Record (Chrome). Overlay label `σ=10  ρ=<value>  β=8/3`.

**Metadata (`works.ts`):**
```ts
{
  slug: 'lorenz-attractor',
  label: 'Study',
  date: '<build date>',
  animated: true,
  title: { en: 'Lorenz Attractor', ja: 'ローレンツ・アトラクター' },
  description: {
    en: 'A rotating 3D Lorenz strange attractor traced as a glowing ribbon, colored by instantaneous speed.',
    ja: '速度に応じて色づく発光リボンとして描いた、回転する3Dローレンツ・アトラクター。'
  },
  tags: ['strange-attractor', 'chaos', 'rk4', 'glow']
}
```

**Sub-tasks (split for Codex):**
- **W1a — sim core:** fixed-timestep integration + RK4 + ring buffer + speed array; seed-driven IC; expose
  `renderFrame(n)` sim step. *Done:* same seed → identical trajectory/reset still; `renderFrame` is
  rAF-independent.
- **W1b — render + interaction:** projection, frame-indexed spin, drag-rotate, 16-bucket glow via
  `drawingContext`, background, overlay label; controls Trail/Speed/Spin/ρ + Play/Pause/Reset. *Done:*
  animates smoothly on desktop Chrome + iPhone Safari; drag rotates; controls behave; composite op reset.
- **W1c — export + manifest wiring:** seed UI wired; PNG (all browsers) + WebM 9:16 (desktop Chrome only,
  disabled elsewhere); add `WORKS` entry; page built from shared `frame`. *Done:* exports work per §3
  F7/F8; card appears in gallery with base-safe links + thumbnail.

---

## 5. Execution Order (dependencies)

```
F1 → F2 → { F3, F4, F5, F6 }            (F3–F6 parallelizable after F2)
                     ↘ F7 ┐
                       F8a → F8b ┐
                                 ↘  W1a → W1b → W1c        (W1c needs F7 + F8a/F8b)
F5,F6 ─────────────────────────↗
F9 → F10                        (gallery + build wiring; F9 needs the WORKS entry from W1c or a stub)
W1c → F13 (thumbnail) → F11 (deploy) → F12 (docs/licenses)
```

Explicit edges to note: **F7, F8a, F8b → W1c** (W1c's acceptance includes PNG + 9:16 export). F13 follows
W1 (needs a live canvas to capture). Deploy(F11) → docs(F12) is fine (docs can trail the first deploy).

**Slice checkpoints (verify before proceeding):**
1. **Runs locally:** F1–F7 + W1a/W1b → Lorenz animates with controls + PNG locally.
2. **Export complete:** F8a/F8b + W1c → 9:16 WebM export works on desktop Chrome.
3. **Gallery complete:** F9–F10 + F13 → index links to Lorenz with thumbnail in dev **and** built base.
4. **Public:** F11 → live on Pages (check thumbnails/links resolve under `/aleatory/`).
5. **Documented + licensed:** F12.

Verification at each checkpoint = `npm run build` + manual check on **desktop Chrome and iPhone Safari**
(export disabled on Safari as designed).

---

## 6. Orchestration Notes (Claude Code)
- Opus 4.8 = orchestrator; hand each F#/W# task to **Codex** with its acceptance criteria as the contract.
- Use Sonnet for lighter mechanical edits (config, wiring, doc prose) where full reasoning isn't needed.
- Keep two rules visible across all tasks: **(a) base-safe URLs** (`import.meta.env.BASE_URL`), and
  **(b) fixed-timestep `renderFrame(n)`** so offline export stays add-only.
- After each slice checkpoint, verify against acceptance criteria on Chrome + iPhone Safari before moving on.

---

## 7. Explicitly Deferred (not in this slice)
- Offline high-quality video (Node + ffmpeg frame render via `renderFrame(n)`).
- Automated thumbnail capture.
- Works #2+ (each repeats the W1 pattern via `ADD_A_WORK.md`).
- Custom domain, analytics, per-work permalinks beyond the static pages.

---

## Appendix — Licensing summary
- **Code:** MIT (`LICENSE`). Permissive; standard for a personal/learning gallery.
- **Artworks (images/video output):** CC BY-NC 4.0 (`LICENSE-ART`). Attribution required; non-commercial;
  sharing/adaptation allowed. Prevents third parties from monetizing the pieces.
- **CREDITS.md:** lists the source artist/work behind each Reproduction/Tribute and states that the licenses
  cover *our own code and expression only* — not the underlying mathematical/physical systems, ideas, or
  the original artists' works. Not legal advice; confirm with a professional if commercial stakes arise.
