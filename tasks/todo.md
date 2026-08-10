# Production Baseline Checklist

- [x] Add failing mojibake regression test
- [x] Repair corrupted source strings
- [x] Run focused test, full suite, and Studio build
- [x] Verify side panel and Studio UI in Chrome
- [x] Remove unsafe Windows shell build invocation
- [x] Add syntax/static checks
- [x] Audit and fix confirmed HTML injection/error-path defects
- [x] Reconcile active-loader documentation and legacy assets
- [x] Add GitHub Actions CI and validate its structure locally
- [x] Run code-quality and security reviews
- [x] Complete final browser and automated verification
- [x] Push atomic commits and hand off results

## Studio-First Media Workflow

- [x] Add selected-video image-generation contract tests
- [x] Extract shared image batch construction and orchestration
- [x] Add Studio image generation, stop, retry, and runtime progress state
- [x] Add settings, connection status, and queue controls to Image Review
- [x] Keep the side panel working through the shared service
- [ ] Run full automated and browser verification
- [x] Run code/security review, address findings, and push atomic commits

## Proposed Studio Redesign

- [x] Establish documented Studio design tokens and shared layout primitives
- [x] Implement the Video Projects Dashboard reference
- [x] Implement the Video Project Overview reference
- [x] Integrate project-scoped Studio navigation
- [x] Add verification and accessibility coverage for the new surfaces

## Studio UX Completion

- [x] Implement Imports subviews: Import JSON, Needs References, History, and Reference Library
- [x] Implement Settings sections using existing Studio state APIs
- [x] Add Image Review Generate/Select sub-navigation without changing checkpoints
- [x] Add Media All/Images/Videos sub-navigation and project-scoped filtering
- [ ] Verify, review, commit, and push each completed slice
