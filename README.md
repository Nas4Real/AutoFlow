# TurboFlow

TurboFlow is a Chrome MV3 extension for batch image and video generation on Google Flow. It runs from the side panel, uses the current Google Flow browser session, queues prompts, tracks generated media, and can download results automatically.

## Install

Use Node.js 22 or 24 LTS. From a fresh checkout, build the ignored Project Studio assets before loading the extension:

```powershell
npm ci --ignore-scripts
npm run build:studio
```

1. Open `chrome://extensions`.
2. Remove any old TurboFlow build.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select the cloned repository folder.
6. Refresh the Google Flow tab and reopen the side panel.

## File Map

```text
manifest.json
src/
  background/
    service-worker.js       Chrome service worker entry point
    runtime.js              Tiny loader for runtime/*.js
    runtime/                Background runtime shards
  content/
    page-fetch-interceptor.js  MAIN-world fetch interceptor for Google Flow API calls
    flow-page-bridge.js        ISOLATED-world bridge between page events and background
  sidepanel/
    index.html              Side panel markup
    sidepanel.css           Tiny loader for styles/*.css
    sidepanel.js            Breadcrumb only; index.html loads app/*.js
    app/                    Side panel JavaScript shards
    styles/                 Side panel CSS shards
  project-studio/
    index.html              React Studio extension-page shell
    app/                    Bootstrap and classic state compatibility facade
    react/                  Maintained React Studio source and styles
    generated/              Ignored local bundles produced before packaging
  shared/
    project-domain/         DOM-free project storage and JSON contracts
    project-services/       Shared schemas, adapters, and read-model contracts
assets/
  icons/                    Extension icons
docs/
  architecture.md           How the extension pieces communicate
  code-map.md               Which shard to edit for each feature
  research-notes.md         Refactor source notes and architecture decisions
  connection-fix-*.md       Historical connection-fix audits
```

Start future edits with [`docs/code-map.md`](docs/code-map.md), then open only the shard for the feature you are changing.

## Development

Install the pinned dependencies with `npm ci`, then use these repository checks:

| Command | Purpose |
| --- | --- |
| `npm test` | Run the smoke and contract test suite. |
| `npm run check:syntax` | Parse-check the classic `.js` source shards. |
| `npm run test:build` | Build Studio into a temporary directory and verify its outputs. |
| `npm run build:studio` | Generate the local React Studio JavaScript and CSS bundles. |
| `npm run architecture:check` | Report source and generated-asset architecture budgets. |

Project Studio generated assets are intentionally ignored by Git. Run `npm run build:studio` before loading the extension from a fresh checkout. On Windows, run `scripts/build-extension.ps1` to build and package the complete extension.

## Prompt Index JSON

Use the JSON import button beside the text import button to load a `prompt-index.json` array with `file_name`, `image_prompt`, and optional `animation_prompt` fields. TurboFlow queues an image batch that uses bundled `assets/reference/Jack.jpg` as the shared character reference and downloads to the exact JSON `.png` paths, then queues an 8 second start-frame video batch for entries with animation prompts and saves the videos as matching `.mp4` files in the same folder.

## Switching Accounts

Use the Queue tab's Account button to open Google's account chooser without clearing local batches. After choosing the account, open a Flow project in that account, click Sync Folder if the Gallery or progress looks stale, then use Retry Failed. TurboFlow checks Chrome downloads and can scan the downloaded `media` folder to repair progress/thumbnails; for animation retries it uploads the still images to the current account/project and rewires failed clip prompts to those new start-frame media IDs.

## Version

Current manifest version: `2.2.21`.
