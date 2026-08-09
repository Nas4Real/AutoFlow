# TurboFlow Code Map

Use this file before editing. It points to the smallest responsible shard so the extension does not drift into broad rewrites.

## Loading Model

TurboFlow uses two deliberate loading models: ordered classic scripts for the background and side panel, and a local React/esbuild bundle for Project Studio.

- `src/background/service-worker.js` imports `src/background/runtime.js`.
- `src/background/runtime.js` imports `src/shared/project-domain/00-project-domain.js`, `src/shared/project-domain/01-project-json-contract.js`, then `src/background/runtime/*.js` with `importScripts()` in numeric order.
- `src/sidepanel/index.html` loads `src/shared/project-domain/00-project-domain.js`, `src/shared/project-domain/01-project-json-contract.js`, then `src/sidepanel/app/*.js` in listed order.
- `src/project-studio/index.html` loads `app/studio-bootstrap.js`, shared project-domain/service scripts, `app/00-studio-state.js`, then `generated/studio.bundle.js`. The bundle is built from `src/project-studio/react/studio.jsx` by `npm run build:studio`.
- `src/sidepanel/sidepanel.css` imports `src/sidepanel/styles/*.css` in numeric order.

Numeric prefixes are part of the classic-script architecture. Preserve global execution order while keeping loader files tiny; do not hand-edit generated Studio assets.

## Shared Project Domain

| File | Purpose |
| --- | --- |
| `src/shared/project-domain/00-project-domain.js` | DOM-free shared project-domain foundation loaded by background runtime, side panel, and Project Studio. Owns `autoflowProjectStateV1`, schema normalization, stable project IDs, active project state, Project-scoped assets, image generation run plans, Image Variant records, and `globalThis.TFProjectDomain`. |
| `src/shared/project-domain/01-project-json-contract.js` | DOM-free executable contract for project-aware prompt JSON. Owns accepted reference fields, alias scope, prompt record normalization, and `globalThis.TFProjectJsonContract`. |

## Project Studio

| File | Purpose |
| --- | --- |
| `src/project-studio/index.html` | Standalone extension page shell. Loads the bootstrap guard, shared domain/services, state facade, and generated React JS/CSS bundles. |
| `src/project-studio/app/studio-bootstrap.js` | Shows a local diagnostic if the generated React Studio fails to mount. |
| `src/project-studio/app/00-studio-state.js` | Studio state helpers. Reads, switches, and updates active project through `TFProjectDomain`; owns typed Asset creation/filter/edit/disable helpers, manual Asset File attachment/primary helpers, project-aware prompt JSON import helpers, reference resolution/blocking, manual reference-to-Asset mapping, ready-only image generation run planning, Project Image Variant filename mapping, selected variant metadata/finalization, Flow context media-cache checks, Project media Sync Folder repair, stale start-frame repair, Video Draft / Ready Video Job state, Project Gallery derivation, run/stop/retry bridge, and manual queue controls; no direct storage duplication. |
| `src/project-studio/react/studio.jsx` | Maintained React/HeroUI Studio shell, navigation, workspace views, dialogs, and state-facade integration. |
| `src/project-studio/react/studio-app.css` | Maintained Studio layout and component styling. |
| `src/project-studio/react/studio-tailwind.css` | Tailwind entrypoint used to generate the packaged Studio stylesheet. |
| `src/project-studio/generated/` | Ignored build outputs produced by `npm run build:studio`; package them, but never edit them directly. |

## Side Panel JS

| File | Open when editing |
| --- | --- |
| `src/sidepanel/app/00-state-storage.js` | Global state, Chrome storage save/load, shared helpers, thumbnail/upload utilities. |
| `src/sidepanel/app/00a-project-studio-link.js` | Side-panel header entry point that opens `src/project-studio/index.html`, including direct Video Queue deep links. |
| `src/sidepanel/app/00b-project-selector.js` | Side-panel active Project selector, default Project creation, compact Project queue summary, Project switching warning, `TF_PROJECT_CHANGED` event. |
| `src/sidepanel/app/01-logs-connection-auth.js` | Logs tab, connection badge, Flow connection checks, local auth shell. |
| `src/sidepanel/app/02-tour-library.js` | Tour text, image library, Jack reference detection/upload metadata. |
| `src/sidepanel/app/03a-picker-core.js` | Image picker modal, uploads, shared/reference frame picker entry points. |
| `src/sidepanel/app/03b-mapper-render-save.js` | Per-prompt mapper rendering, mapper save flow, assignment UI. |
| `src/sidepanel/app/03c-mapper-automation-state.js` | 1:1, same-for-all, and auto-tag mapper behavior. |
| `src/sidepanel/app/04a-animation-gallery-state.js` | Preview-ready thumbnail/cache state. |
| `src/sidepanel/app/04b-gallery-render-select.js` | Gallery grouping/rendering, select/delete behavior. |
| `src/sidepanel/app/04c-gallery-download-preview.js` | Gallery download and preview actions. |
| `src/sidepanel/app/05a-batch-model.js` | Retry/reset/import/export batch model. |
| `src/sidepanel/app/05b-json-folder-sync.js` | Prompt-index JSON, account-switch, folder sync, start-frame relinking. |
| `src/sidepanel/app/05c-queue-ui-actions.js` | Queue row behavior, failed/remaining actions. |
| `src/sidepanel/app/06a-gallery-global-events.js` | Gallery/global event handling. |
| `src/sidepanel/app/06b-control-runner.js` | Auto-chain control runner. |
| `src/sidepanel/app/06c-settings-events.js` | Settings, start/stop, speed/concurrency UI. |
| `src/sidepanel/app/07-runtime-boot.js` | Single prompt mode, speed mode, background messages, boot/recovery. |

## Background Runtime

| File | Purpose |
| --- | --- |
| `src/background/runtime/00-state-connection.js` | Background state, connection state, Flow tab detection. |
| `src/background/runtime/01-flow-api.js` | Flow API helpers, upload/upscale API calls. |
| `src/background/runtime/02a-generation-common.js` | Generation shared helpers, safety/error classification, request scheduler. |
| `src/background/runtime/02b-image-generation.js` | Image generation paths, reference image upload, image prompt status handling. |
| `src/background/runtime/02c-video-generation.js` | Video generation polling and prompt status handling. |
| `src/background/runtime/03-downloads-cache.js` | Exact filename rules, local frame cache, auto-download workers, download-history lookup. |
| `src/background/runtime/04-message-router.js` | Chrome download listeners, cached-frame reads, and `chrome.runtime.onMessage` routing. |

## Side Panel CSS

CSS is split by source order to preserve cascade. Names describe the dominant zone, but order matters more than category.

| File | Purpose |
| --- | --- |
| `src/sidepanel/styles/00-foundation-layout.css` | Imports, base layout, early controls. |
| `src/sidepanel/styles/01-controls-prompts-settings.css` | Control tab, prompt box, settings. |
| `src/sidepanel/styles/02-modals-library-picker.css` | Modals, library, picker surfaces. |
| `src/sidepanel/styles/03-queue-gallery.css` | Queue and gallery styling. |
| `src/sidepanel/styles/04-mapper-project-sync.css` | Mapper project/folder UI. |
| `src/sidepanel/styles/05-badges-fixes-animation.css` | Badges, warnings, remaining late-added UI, header Project Studio button override, side-panel Project strip. |

## Common Edits

- Project-domain storage, stable project IDs, active project state: `src/shared/project-domain/00-project-domain.js`.
- Project-aware JSON reference contract and parser: `src/shared/project-domain/01-project-json-contract.js` and `docs/project-json-contract.md`.
- Project Studio UI, navigation, dialogs, workspaces, and styling: `src/project-studio/react/studio.jsx` and `src/project-studio/react/studio-app.css`.
- Project Studio state/domain commands and runtime bridges: `src/project-studio/app/00-studio-state.js` and the relevant `src/shared/project-services/*.js` contract.
- Project Studio build output: `scripts/build-studio.mjs` and `src/project-studio/react/studio-tailwind.css`; never edit `src/project-studio/generated/` directly.
- Side-panel Project Studio opener and Video Queue deep link: `src/sidepanel/app/00a-project-studio-link.js` and the header/Project strip buttons in `src/sidepanel/index.html`.
- Side-panel active Project selector/create/switch and compact Project queue summary: `src/sidepanel/app/00b-project-selector.js` and the Project strip in `src/sidepanel/index.html`.
- JSON import, exact filenames, `__1`/`__2` variants: `src/sidepanel/app/05b-json-folder-sync.js` and `src/background/runtime/03-downloads-cache.js`.
- Queue row behavior, retry, failed/remaining visibility: `src/sidepanel/app/05c-queue-ui-actions.js`.
- Mode/settings: `src/sidepanel/app/06c-settings-events.js`.
- Gallery/preview: `src/sidepanel/app/04a-animation-gallery-state.js`, `src/sidepanel/app/04b-gallery-render-select.js`, and `src/sidepanel/app/05b-json-folder-sync.js`.
- Image/video generation: `src/background/runtime/02b-image-generation.js` and `src/background/runtime/02c-video-generation.js`.
- Download/cache behavior: `src/background/runtime/03-downloads-cache.js` and `src/sidepanel/app/05b-json-folder-sync.js`.
- Start-frame relinking: `src/sidepanel/app/05b-json-folder-sync.js`.

## Search Recipes

```powershell
rtk rg -n "TFProjectDomain|autoflowProjectStateV1|active_project_id" src docs
rtk rg -n "TFProjectStudio|project-studio|btn-open-project-studio" src docs
rtk rg -n "tfImportPromptIndexJson|tfSyncJsonMedia|tfRelinkJsonFrames" src/sidepanel/app/05b-json-folder-sync.js
rtk rg -n "tfExactDownloadName|CHECK_DOWNLOAD_HISTORY|DOWNLOAD_COMPLETE" src/background/runtime/03-downloads-cache.js src/background/runtime/04-message-router.js
rtk rg -n "PROMPT_STATUS|PREVIEW_READY|BATCH_GENERATION_DONE" src/background/runtime src/sidepanel/app
```

## Rules For Future Files

- Prefer adding a focused shard only when the file grows past roughly 1,500 lines or the feature boundary is clean.
- Keep numeric order stable. Add new files in the loader explicitly, then update this map.
- Shared project-domain scripts must stay DOM-free and attach APIs under `globalThis.TFProjectDomain`.
- Project Studio's compatibility facade remains a classic script under `globalThis.TFProjectStudio*`; maintained Studio UI is React source bundled locally for MV3.
- Do not move top-level event listener blocks above functions they reference.
- Keep loader/bootstrap files tiny: `src/background/runtime.js`, `src/sidepanel/sidepanel.js`, `src/sidepanel/sidepanel.css`, and `src/project-studio/app/studio-bootstrap.js` should stay maps/guards only.
