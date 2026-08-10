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
- [x] Generated Studio assets remain versioned and reproducible so a clean checkout is directly loadable.

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
- [x] [Review][Patch] Package required Studio assets in Git so a fresh checkout opens without a local build [README.md:5]
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

---

# Implementation Plan: Studio UX Completion

## Objective

Complete the Studio-first workflow using the approved dark AutoFlow design system. The Studio owns channel-level project management, imports, reference resolution, project production, and diagnostics. The side panel and generation runtime contracts remain unchanged.

## Commands

- Build: `npm run build:studio`
- Focused Studio test: `node test/studio-workspace.smoke.js`
- Full test suite: `npm test`
- Syntax check: `npm run check:syntax`

## Delivery slices

1. **UX contract and shared primitives**: keep the approved token system, rail hierarchy, card styling, radius scale, and status vocabulary consistent across all Studio views.
2. **Imports**: add Import JSON, Needs References, Import History, and Reference Library subviews. Import remains non-credit-spending.
3. **Settings**: add channel, generation-default, Flow connection, storage/cache, diagnostics, and advanced-data sections using existing state APIs only.
4. **Project workspace**: retain Overview, Image Review, Video Queue, and Media. Add lightweight sub-navigation only where it supports a distinct task: Generate/Select in Image Review and All/Images/Videos in Media. Do not auto-start generation from a selection.
5. **Verification**: source/regression assertions, build, full suite, browser verification where the environment permits, code review, and atomic commits.

## Boundaries

- Always: preserve project scoping, explicit image/video confirmations, accessible native controls, and the Studio token system.
- Ask first: new dependencies, changed runtime messages, changed storage schema, side-panel changes, or paid-generation behavior.
- Never: start generation from Dashboard/Overview, use a global project selector, or redesign the side panel.

## Success criteria

- Every Studio destination follows the documented dark theme, spacing, border, radius, typography, and status tokens.
- Imports exposes a clear path from validation to reference resolution to opening the created project.
- Settings exposes existing operational controls without duplicating runtime logic.
- All project subviews retain the opened project's context and manual checkpoints.
- The focused Studio test, full test suite, build, and syntax checks pass.

---

# Proposed Plan: Studio Dashboard And Project Overview Redesign

## Scope

Implement the two supplied Superdesign references in Project Studio only: the channel-level Video Projects Dashboard and the opened video project's Overview. The side panel and the existing Image Review, Video Queue, and Media content remain functionally unchanged in this slice.

## Ordered slices

1. **Design-system foundation** — introduce documented semantic Studio tokens and shared layout primitives without changing runtime contracts.
2. **Dashboard** — replace the current channel list landing view with the searchable/filterable Video Projects command center and project milestone summaries.
3. **Project overview** — add the project header, secondary project navigation, milestone tracker, status cards, active-work state, and activity timeline.
4. **Navigation integration** — make project cards and rail entries open/select the project and route to its workspace; keep existing Image Review, Video Queue, and Media as project subviews.
5. **Quality pass** — add focused state/navigation tests, build Studio, inspect in the browser at practical widths, run accessibility checks, and commit/push atomically.

## Acceptance criteria

- Dashboard shows every project for the active channel with a text-labelled five-stage milestone.
- Opening a card selects that project and opens its Overview without a top-level video selector.
- Project Overview routes to existing Image Review, Video Queue, and Media without changing generation behavior.
- The new documented token system is used by both new Studio surfaces.
- Manual credit-spending checkpoints remain explicit.
- Side panel source and styling are untouched.

---

# Implementation Plan: Studio-First Media Workflow

## Goal

Make Project Studio the complete daily workflow for importing prompt JSON, generating and selecting image variants, generating videos, and reviewing or downloading media. Keep the side panel available as an optional compatibility fallback.

## Product Invariants

- Preserve the existing Studio navigation, layout, and visual language.
- Keep image generation and video generation as separate manual, credit-spending checkpoints.
- Scope settings, queues, progress, retry, and review to the currently selected video/import.
- Let active runtime jobs continue while the user navigates between Studio pages.
- Reuse background/runtime contracts and shared project state; do not duplicate the side-panel orchestration.
- Keep the legacy side panel functional without making it part of the required workflow.

## Ordered Slices

### Slice 1: Lock The Contracts

- [x] Add failing tests for selected-video image readiness and batch construction.
- [x] Cover settings normalization, prompt ordering, blocked prompts, and retryable failures.
- [x] Use the four-prompt offline-cache JSON shape as an acceptance fixture.

### Slice 2: Share Image Orchestration

- [x] Extract pure image batch construction into a shared project-generation service.
- [x] Preserve the existing `START_BATCH` and `STOP_BATCH` background messages.
- [x] Adapt the side panel to consume the shared service.

### Slice 3: Complete Studio Runtime State

- [x] Add selected-video image generation, stop, and failed-prompt retry commands.
- [x] Persist generation settings and image-run progress in project state.
- [x] Map preview, cache, completion, and error events to the exact Studio run.
- [x] Guard the background runner's global stop boundary against conflicting image/video starts.

### Slice 4: Complete Image Review

- [x] Add Flow connection status and refresh action.
- [x] Add image model, aspect ratio, and variant-count controls.
- [x] Add ready/blocked counts, explicit generate action, queue/progress, stop, and retry.
- [x] Preserve existing image cards and variant-selection behavior.

### Slice 5: Verify And Harden

- [x] Run focused tests after each slice, then the full test/build/static suite.
- [ ] Verify import through media review in the unpacked extension without redesigning Studio.
- [x] Run code-quality and security reviews and address confirmed findings.
- [x] Push small atomic commits and verify GitHub Actions on Ubuntu and Windows.

## Acceptance Criteria

- Importing `examples/offline-cache-test-prompt-index.json` creates and selects one video with four ready image prompts.
- Image Review can configure and explicitly start a run for only that selected video.
- Navigating away does not lose or stop the active run.
- Progress, cached previews, completion, stopping, and retry are reflected in Studio.
- Successful prompts are not regenerated when retrying failures.
- Selecting image variants does not automatically start video generation.
- Video Queue remains the explicit second checkpoint.
- Media can be reviewed and downloaded without opening the side panel.
- The legacy side panel remains operational.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Global background stop affects an unrelated run | High | Enforce one active generation owner and disable conflicting starts |
| Runtime event is applied to the wrong video | High | Correlate every event by batch/run ID and selected import ownership |
| Shared extraction changes legacy behavior | High | Characterization tests before adapting the side panel |
| Studio reload loses progress | Medium | Persist run state and reconcile it with background stats/events |
| UI change becomes a redesign | Medium | Extend existing Image Review components and CSS patterns only |
