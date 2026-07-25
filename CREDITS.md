# Credits

`aleatory` is a personal generative-art gallery. Some pieces re-implement,
study, or pay tribute to existing systems, artworks, or ideas. This file records
those sources.

## Licensing clarification

The dual license (see [LICENSE](LICENSE) for code, [LICENSE-ART](LICENSE-ART) for
artworks) covers **our own code and creative expression only** — the specific
implementation and the particular visual treatment of each piece. It does **not**
extend to, and makes no ownership claim over:

- the underlying **mathematical or physical systems** a piece is built on;
- the **ideas, equations, or algorithms** those systems embody; or
- the **original works of other artists** that a piece studies or references.

Those remain the property (where applicable) of their respective originators and,
in the case of mathematics and natural law, of no one.

This is not legal advice. If commercial stakes or redistribution questions arise,
confirm with a professional.

## Per-work sources

### Lorenz Attractor — *Study*

- **System:** the Lorenz system, introduced by Edward N. Lorenz, *"Deterministic
  Nonperiodic Flow"*, Journal of the Atmospheric Sciences, 1963. The equations
  (σ, ρ, β parameters) and the resulting strange attractor are established
  mathematics, in the public domain as ideas.
- **What is ours:** the p5.js / Canvas2D re-implementation, the RK4 integration
  and ring-buffer trail, the velocity-based colour mapping and additive glow, the
  camera/projection and interaction, and the resulting rendered stills and video.
- **Prior implementation referenced:** an earlier personal sketch,
  `gen-art-practice/lorenz_attractor_velocity_colored.html`, by the same author.

---

*New works append their entry here as they are added — see
[docs/ADD_A_WORK.md](docs/ADD_A_WORK.md).*
