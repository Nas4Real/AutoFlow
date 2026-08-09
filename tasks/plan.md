# Implementation Plan: Production Engineering Baseline

## Overview

Harden AutoFlow without redesigning its side panel or Project Studio. Work proceeds in small, behavior-preserving slices: characterize defects, add regression coverage, fix confirmed bugs, tighten tooling and security boundaries, add CI, then verify the unpacked extension in Chrome.

## Architecture Decisions

- Preserve the Chrome MV3 page/bridge/background separation and classic-script loader order.
- Keep React Project Studio as the management surface and the side panel as the operational cockpit.
- Treat `TFProjectStudioState` as a compatibility facade; avoid a broad architecture rewrite in this baseline.
- Make security-sensitive HTML rendering and imported data explicit, escaped, and regression-tested.
- Ratchet quality gates around the current brownfield hotspots instead of making CI fail on known legacy size debt.

## Task List

### Phase 1: Characterize And Repair Visible Defects

- [ ] Add a failing source-encoding regression test that detects known mojibake markers.
- [ ] Repair corrupted user-facing strings without changing layout, controls, or workflow structure.
- [ ] Verify the side panel and Project Studio in Chrome with clean console output.

### Checkpoint: UI Correctness

- [ ] Encoding regression test passes.
- [ ] Existing smoke/contract tests pass.
- [ ] Studio build succeeds.
- [ ] Browser screenshots confirm unchanged layout and readable copy.

### Phase 2: Build And Security Hardening

- [ ] Remove the Windows `shell: true` build warning using a direct, argument-safe CLI invocation.
- [ ] Add repository syntax/static checks suitable for classic shared-global scripts.
- [ ] Audit dynamic HTML sinks, imported JSON rendering, message responses, storage mutations, and silent catches.
- [ ] Fix confirmed injection, validation, and user-visible error-handling defects with focused tests.

### Checkpoint: Runtime Safety

- [ ] Focused security/error-path tests pass.
- [ ] Full test suite and production Studio build pass.
- [ ] `npm audit` reports no actionable vulnerability at the configured threshold.

### Phase 3: Documentation And CI

- [ ] Reconcile `README.md`, `docs/architecture.md`, and `docs/code-map.md` with the active React Studio loader.
- [ ] Mark or remove legacy Studio assets only after loader and browser verification proves they are unused.
- [ ] Add GitHub Actions for clean install, tests, build, static checks, architecture reporting, and dependency audit.

### Checkpoint: Automated Baseline

- [ ] CI passes from a clean checkout on the supported Node LTS release.
- [ ] Architecture debt remains visible without blocking unrelated baseline fixes.
- [ ] Generated Studio assets remain ignored and reproducible.

### Phase 4: Final Review And Handoff

- [ ] Run adversarial code-quality and security reviews against the branch diff.
- [ ] Address all confirmed high/medium findings or document an explicit deferral.
- [ ] Repeat browser verification, full tests, build, static checks, and dependency audit.
- [ ] Push the atomic commit series and provide the exact verification evidence.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Mechanical encoding repair alters valid text | High | Failing marker test, syntax checks, focused diffs, browser verification |
| Classic global/load-order behavior regresses | High | Preserve loader order and run loader/contract smoke tests after each slice |
| Security cleanup changes imported JSON rendering | High | Characterization tests before edits and browser verification with hostile fixture text |
| CI blocks on known legacy file sizes | Medium | Keep architecture reporting visible and ratchet only new regressions |
| Browser verification triggers paid Flow work | High | Do not generate media or invoke credit-consuming operations |

## Open Questions

- None blocking. Exact supported Node/Chrome floors will be confirmed from official sources before CI is pinned.
