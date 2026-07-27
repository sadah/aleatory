# AGENTS.md

Guidance for Codex working in this repository.

## Before starting work

1. Read [`CLAUDE.md`](CLAUDE.md) for the repository's stable technical rules.
2. Read [`docs/STATUS.md`](docs/STATUS.md) for the current state, next work, and
   known issues.
3. Inspect the working tree before editing and preserve unrelated user changes.

All technical invariants, rendering conventions, language conventions, commands,
and documentation requirements in `CLAUDE.md` apply to Codex.

The **Delegation notes** section of `CLAUDE.md` describes the historical Claude
Code → Codex rescue workflow. It does not apply when Codex is already the primary
agent.

## Verification

- Run `npm run build` after implementation changes.
- A successful build is not sufficient verification for visual or animation
  changes. Verify the affected page and behaviour directly.
- For loop or fixed-timestep changes, inspect frame-boundary behaviour where
  relevant.

## Handoff

Update `docs/STATUS.md` before finishing a session when the implementation state,
next work, measurements, or known issues have materially changed.
