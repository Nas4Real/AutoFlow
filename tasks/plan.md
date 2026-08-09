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

- [x] Add a failing source-encoding regression test that detects known mojibake markers.
- [x] Repair corrupted user-facing strings without changing layout, controls, or workflow structure.
- [x] Verify the side panel and Project Studio in Chrome with clean console output.

### Checkpoint: UI Correctness

- [x] Encoding regression test passes.
- [x] Existing smoke/contract tests pass.
- [x] Studio build succeeds.
- [x] Browser screenshots confirm unchanged layout and readable copy.

### Phase 2: Build And Security Hardening

- [x] Remove the Windows `shell: true` build warning using a direct, argument-safe CLI invocation.
- [x] Add repository syntax/static checks suitable for classic shared-global scripts.
- [x] Audit dynamic HTML sinks, imported JSON rendering, message responses, storage mutations, and silent catches.
- [x] Fix confirmed injection, validation, and user-visible error-handling defects with focused tests.

### Checkpoint: Runtime Safety

- [x] Focused security/error-path tests pass.
- [x] Full test suite and production Studio build pass.
- [x] `npm audit` reports no actionable vulnerability at the configured threshold.

### Phase 3: Documentation And CI

- [x] Reconcile `README.md`, `docs/architecture.md`, and `docs/code-map.md` with the active React Studio loader.
- [x] Mark or remove legacy Studio assets only after loader and browser verification proves they are unused.
- [x] Add GitHub Actions for clean install, tests, build, static checks, architecture reporting, and dependency audit.

### Checkpoint: Automated Baseline

- [x] CI passes from a clean checkout on the supported Node LTS release.
- [x] Architecture debt remains visible without blocking unrelated baseline fixes.
- [x] Generated Studio assets remain ignored and reproducible.

### Phase 4: Final Review And Handoff

- [x] Run adversarial code-quality and security reviews against the branch diff.
- [x] Address all confirmed high/medium findings or document an explicit deferral.
- [x] Repeat browser verification, full tests, build, static checks, and dependency audit.
- [x] Push the atomic commit series and provide the exact verification evidence.

### Review Findings

- [x] [Review][Patch] Escape or allowlist every persisted/imported value rendered through side-panel HTML templates [src/sidepanel/app/02-tour-library.js:574]
- [x] [Review][Patch] Preserve supported legacy `filesystem:` preview URLs through the media URL sanitizer [src/sidepanel/app/00-html-safety.js:5]
- [x] [Review][Patch] Serialize generation-status polling and derive recovery feedback from the authoritative response [src/sidepanel/app/06b-control-runner.js:160]
- [x] [Review][Patch] Treat an empty startup state response as a visible recovery failure [src/sidepanel/app/07-runtime-boot.js:601]
- [x] [Review][Patch] Replace source-string-only HTML/runtime feedback checks with focused executable regression coverage [test/html-safety.smoke.js:42]
- [x] [Review][Patch] Reject malformed UTF-8 and common mojibake forms in the source encoding gate [test/source-encoding.smoke.js:10]
- [x] [Review][Patch] Hide decorative TurboFlow brand icons from assistive technology [src/sidepanel/index.html:12]
- [x] [Review][Patch] Assert that Project Studio loads only the generated active stylesheet [test/studio-workspace.smoke.js:394]
- [x] [Review][Patch] Harden build and syntax-check process error paths, empty output arguments, and the no-shell regression guard [scripts/build-studio.mjs:11]
- [x] [Review][Patch] Make the fresh-checkout install sequence build ignored Studio assets before loading the extension [README.md:5]
- [x] [Review][Patch] Disable persisted checkout credentials in pull-request CI [/.github/workflows/ci.yml:23]
- [x] [Review][Patch] Pin third-party GitHub Actions to immutable commit SHAs [/.github/workflows/ci.yml:24]
- [x] [Review][Patch] Parse the CI workflow and assert its effective jobs, permissions, runtime, and commands [test/ci-workflow.smoke.js:12]
- [x] [Review][Patch] Exercise the Windows-specific build path in GitHub Actions [/.github/workflows/ci.yml:17]
- [x] [Review][Patch] Reconcile Node LTS, syntax-check scope, packaging-platform, and dependency-audit documentation [README.md:47]
- [x] [Review][Patch] Resolve the Tailwind executable through package metadata instead of an internal path [scripts/build-studio.mjs:33]
- [x] [Review][Patch] Validate intercepted page events, enforce exact batch/media correlation, and bound runtime queues [src/background/runtime/03b-intercept-security.js:1]
- [x] [Review][Patch] Update baseline tracking with completed work and final verification evidence [tasks/todo.md:3]

## Verification Evidence

- Clean install: 99 packages, 0 vulnerabilities (`npm ci --ignore-scripts`).
- Syntax: 50 classic JavaScript source files parsed successfully.
- Tests: all 11 smoke/contract suites passed, including executable HTML safety, recovery feedback, intercept security, loader order, and CI workflow coverage.
- Builds: temporary Studio build and production Studio bundle completed successfully.
- Architecture: generated bundles are within baseline growth budgets; existing large-file debt remains report-only and visible.
- Browser: extension-context side panel and local Project Studio were visually checked without paid generation; Project Studio had zero console warnings or errors and exposed named controls/headings in the accessibility snapshot.
- Reviews: independent code-quality and security re-reviews approved the final changes with no required findings.
- GitHub Actions: pull-request run `31331045894` passed on Ubuntu and Windows with Node-24-native action releases and no deprecation annotation.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Mechanical encoding repair alters valid text | High | Failing marker test, syntax checks, focused diffs, browser verification |
| Classic global/load-order behavior regresses | High | Preserve loader order and run loader/contract smoke tests after each slice |
| Security cleanup changes imported JSON rendering | High | Characterization tests before edits and browser verification with hostile fixture text |
| CI blocks on known legacy file sizes | Medium | Keep architecture reporting visible and ratchet only new regressions |
| Browser verification triggers paid Flow work | High | Do not generate media or invoke credit-consuming operations |

## Open Questions

- None blocking. The project supports Node.js 22 and 24 LTS; the GitHub matrix pins Node.js 22 across Ubuntu and Windows.
