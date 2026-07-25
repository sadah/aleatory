# Taste Notes

Working aesthetic guidance for `aleatory`. Distilled and translated from the research and
planning notes kept in the earlier `p5js-practice` repository (`note/`). This file exists so that
anyone — human or agent — implementing a new work has the same taste context the author does.

It is not a style guide for the site chrome (see `ARCHITECTURE.md` for that). It is about what
makes a piece worth keeping.

---

## 1. The one principle

Generative art is not a look, it is a **method**: the artist builds a system, hands it a measured
amount of autonomy, and the system contributes to the result. Philip Galanter's framing is the
useful one — the interesting region of any generative system sits on the continuum **between
order and disorder**. Pure repetition is inert; pure randomness is noise. The work lives in the
gradient between them.

Georg Nees' *Schotter* (1968) is the canonical demonstration. Its subject is not "random squares"
— it is the **transition** from a rigid grid at the top to collapse at the bottom. Apply the same
disorder amplitude to every row and the piece dies. The meta-rule (disorder increases along one
axis) is what must be preserved, not the exact seed or row count.

**Practical test for any new work:** can you name the ordering force and the disordering force,
and the axis along which their balance shifts? If not, the piece will read as either wallpaper or
static.

---

## 2. Author's taste profile

Observed across earlier sketches. Treat as a strong prior, not a rule.

**Reliably lands:**
- **Order collapsing into disorder** — `schotter`, `math` (Disorder). The *Schotter* principle above.
- **A strange form emerging that wasn't drawn** — `mohr` (4D hypercube projection), `math3d`
  (Möbius). The pleasure is "what *is* that?", produced by projection or constraint rather than
  by depiction.
- **Watching colour evolve over time** — `bloom`. Time as a first-class material, not a loading bar.

**Reliably falls flat:**
- **Concept-first pieces** — `molnar`, `nake`, `reas`. When the idea has to be explained before the
  image works, the image is not working.

**The governing rule: phenomenon over meaning.** Prefer a system whose behaviour is visible to a
system whose behaviour has to be described.

**The one exception, and its trap:** systems thinking is the author's own professional domain, so
system-shaped subjects (flow, accumulation, bottlenecks, strata) are genuinely interesting to
them — but only if the visual stands on its own first. A systems subject that needs its caption
lands in exactly the same place as `reas` did.

---

## 3. Trap-avoidance rules

These were written per-piece during planning, and generalise well:

- **Keep the concept in the title and the caption. Never let it into the image.** If a piece is
  about task accumulation, the image is a geological cross-section — not nodes, not arrows, not
  flow diagrams, not labels reading "task".
- **Never let a new piece degrade into a recombination of previous ones.** If work N is "A plus B",
  the *junction* has to be the subject, not the two halves.
- **State the differentiating rule before implementation and hold it through every commit.** For
  `ripple-bloom` it was: "droplet events, waves, interference and afterimage are the subject —
  if it drifts toward a gallery of static rose curves, the direction is wrong."
- **Variation needs at least four independent axes** to avoid feeling like one image with a
  parameter wobble (e.g. petal count / edge sharpness / doubling / draw style).

---

## 4. Time and duration

For animated pieces, the lifecycle matters as much as the frame:

    ignite → peak → disperse → afterimage lingers

Aim for something a viewer can watch for **5–10 seconds** without it resolving or repeating
obviously. A long, low-opacity afterimage layer is the cheapest way to buy that — and it inherits
the "watching colour evolve" pleasure noted above.

---

## 5. Determinism and seeds

Practice borrowed from on-chain generative platforms (Art Blocks, fxhash), where a work must
render identically forever from a single hash.

- **All randomness flows from one seed.** No bare `Math.random()` anywhere in a sketch — including
  in the initial condition, which is the easiest place to forget.
- Seed the noise field too, not just the RNG. Offset very small seed values (fxhash convention:
  `seed = 10000 + rand() * 9999999`) to avoid degenerate behaviour at the low end.
- The value of this is not novelty control — it is that a specific output can be **found again**,
  which is what makes selection (rather than generation) possible.

In `aleatory` this is deliberately scoped: seed fixes the initial condition, the trajectory, and
the frame-0 still. It does **not** promise that the live animation is frame-identical at wall-clock
time T. See `ARCHITECTURE.md` on `renderFrame(n)` for the fixed-timestep path that makes
reproducible rendering possible.

---

## 6. Palette

The site is dark by design; pieces are lit rather than printed. Additive compositing
(`globalCompositeOperation = 'lighter'`) over a near-black ground is the default idiom — light
accumulates where paths overlap, which does the tonal work for free.

Colour ranges that have worked: indigo, sumi black, pale water blue, white (quiet pieces); dried
earth, clay, ash, iron, white (material pieces); deep blue → cyan → white-hot → orange when
mapping a scalar like velocity.

Restraint beats saturation. Low chroma with a few hot pixels reads as luminous; high chroma
everywhere reads as cheap.

---

## 7. Reference lineage

Worth knowing, mostly as a source of constraints rather than styles to copy:

| Figure | What to steal |
|---|---|
| Georg Nees (*Schotter*, 1968) | The order→disorder gradient as subject |
| Vera Molnár | Deliberate noise injected into strict symmetry; erasure and omission as material |
| Casey Reas (*Process*) | Element + behaviour as a grammar — describe rules, not pictures |
| Tyler Hobbs (*Fidenza*) | Flow fields; non-overlap as a compositional force; probabilistic palettes; "painterly" texture built from thousands of thin strokes |
| Dmitri Cherniak (*Ringers*) | Extreme constraint yielding emergent figuration |
| Inigo Quilez | Form from pure mathematics — SDFs, no meshes |
| Shunsuke Takawo | Daily practice; small sketches as a legitimate body of work |

The through-line across all of them: **the artist's contribution is the design of the constraint,
not the rendering of the output.**
