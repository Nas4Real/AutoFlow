"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const relativePath = "src/sidepanel/app/00-html-safety.js";
const source = fs.readFileSync(path.join(root, relativePath), "utf8");
const context = vm.createContext({ URL });
context.globalThis = context;
vm.runInContext(source, context, { filename: relativePath });

const safety = context.TFHtmlSafety;
assert.ok(safety, "TFHtmlSafety global missing");

assert.equal(
  safety.escapeHtml("'\"><img src=x onerror=\"globalThis.pwned=true\">"),
  "&apos;&quot;&gt;&lt;img src=x onerror=&quot;globalThis.pwned=true&quot;&gt;",
);
assert.equal(safety.safeMediaUrl("javascript:alert(1)"), "");
assert.equal(safety.safeMediaUrl("data:image/svg+xml;base64,PHN2Zz4="), "");
assert.equal(
  safety.safeMediaUrl("data:image/png;base64,iVBORw0KGgo="),
  "data:image/png;base64,iVBORw0KGgo=",
);
assert.equal(
  safety.safeMediaUrl('https://example.test/image.png" onerror="alert(1)'),
  "https://example.test/image.png%22%20onerror=%22alert(1)",
);
assert.equal(
  safety.safeMediaUrl("filesystem:https://example.test/temporary/image.png"),
  "filesystem:https://example.test/temporary/image.png",
  "legacy filesystem previews must remain renderable",
);
assert.equal(
  safety.allowlistedToken('done\" onclick=\"alert(1)', ["pending", "done"], "pending"),
  "pending",
  "class and status tokens must fail closed",
);

const sidepanelHtml = fs.readFileSync(path.join(root, "src/sidepanel/index.html"), "utf8");
const safetyIndex = sidepanelHtml.indexOf("app/00-html-safety.js");
const stateIndex = sidepanelHtml.indexOf("app/00-state-storage.js");
assert.ok(safetyIndex >= 0, "side panel does not load HTML safety module");
assert.ok(safetyIndex < stateIndex, "HTML safety module must load before state/render helpers");

const sidepanelAppRoot = path.join(root, "src/sidepanel/app");

function extractFunctionSource(fileSource, name) {
  const start = fileSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const bodyStart = fileSource.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < fileSource.length; index += 1) {
    if (fileSource[index] === "{") depth += 1;
    if (fileSource[index] === "}") depth -= 1;
    if (depth === 0) return fileSource.slice(start, index + 1);
  }
  assert.fail(`${name} has an unterminated body`);
}

function createElement() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    className: "",
    innerHTML: "",
    style: {},
    textContent: "",
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function runRenderer(fileSource, functionNames, globals, entryPoint) {
  const rendererContext = vm.createContext({ ...globals });
  rendererContext.globalThis = rendererContext;
  const functions = functionNames
    .map((name) => extractFunctionSource(fileSource, name))
    .join("\n");
  vm.runInContext(
    `${functions}\nglobalThis.__renderPersistedValues = ${entryPoint};`,
    rendererContext,
  );
  rendererContext.__renderPersistedValues();
  return rendererContext;
}

function decodeHtml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function attributeValue(markup, name) {
  const match = markup.match(new RegExp(`${name}="([^"]*)"`));
  assert.ok(match, `${name} is missing from rendered markup`);
  return decodeHtml(match[1]);
}

function assertInert(markup, label) {
  assert.doesNotMatch(markup, /<script\b/i, `${label} emitted executable markup`);
}

const unsafeMediaTemplates = fs
  .readdirSync(sidepanelAppRoot)
  .filter((fileName) => fileName.endsWith(".js"))
  .flatMap((fileName) => {
    const fileSource = fs.readFileSync(path.join(sidepanelAppRoot, fileName), "utf8");
    const findings = [];
    const mediaAttribute = /\b(?:poster|src)\s*=\s*(["'])[^"']*\$\{([^}]*)\}[^"']*\1/g;
    for (const match of fileSource.matchAll(mediaAttribute)) {
      if (!match[2].includes("TFHtmlSafety.safeMediaUrl")) {
        findings.push({ fileName, expression: match[2] });
      }
    }
    return findings;
  });
assert.deepEqual(unsafeMediaTemplates, [], "dynamic media source bypasses TFHtmlSafety");

const hostileId = 'id"><script data-pwn="id">1</script>';
const hostileTag = 'tag</span><script data-pwn="tag">2</script>';
const hostileFileName = 'file"><script data-pwn="file">3</script>.png';
const hostileMediaId = 'media"><script data-pwn="media">4</script>';
const hostileStatus = 'done"><script data-pwn="status">5</script>';

const librarySource = fs.readFileSync(
  path.join(sidepanelAppRoot, "02-tour-library.js"),
  "utf8",
);
function renderLibrary(sourceToRender = librarySource) {
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) elements.set(selector, createElement());
    return elements.get(selector);
  };
  runRenderer(
    sourceToRender,
    ["kt"],
    {
      TFHtmlSafety: safety,
      ct: () => "1 KB",
      r: getElement,
      se: safety.escapeHtml,
      y: [
        {
          fileName: hostileFileName,
          hiddenInLibrary: false,
          id: hostileId,
          mediaId: hostileMediaId,
          tag: hostileTag,
          thumbnail: "https://example.test/preview.png",
          uploading: false,
        },
      ],
    },
    "kt",
  );
  return elements.get("#library-grid").innerHTML;
}

const libraryMarkup = renderLibrary();
assertInert(libraryMarkup, "library renderer");
assert.equal(attributeValue(libraryMarkup, "data-lib-id"), hostileId);
assert.equal(attributeValue(libraryMarkup, "alt"), hostileFileName);
assert.match(libraryMarkup, new RegExp(`@${safety.escapeHtml(hostileTag)}`));
assert.match(libraryMarkup, new RegExp(safety.escapeHtml(hostileMediaId.slice(0, 12))));

const unsafeLibrarySource = librarySource.replace("${se(e.id)}", "${e.id}");
assert.throws(
  () => assertInert(renderLibrary(unsafeLibrarySource), "mutated library renderer"),
  /emitted executable markup/,
  "the behavioral harness must fail when persisted IDs bypass encoding",
);

const pickerSource = fs.readFileSync(
  path.join(sidepanelAppRoot, "03a-picker-core.js"),
  "utf8",
);
const pickerElements = new Map();
const pickerElement = (selector) => {
  if (!pickerElements.has(selector)) pickerElements.set(selector, createElement());
  return pickerElements.get(selector);
};
runRenderer(
  pickerSource,
  ["Ft"],
  {
    $t: false,
    Dt() {},
    E: [],
    TFHtmlSafety: safety,
    r: pickerElement,
    se: safety.escapeHtml,
    y: [
      {
        fileName: hostileFileName,
        mediaId: hostileMediaId,
        thumbnail: "https://example.test/picker.png",
        uploading: false,
      },
    ],
  },
  "Ft",
);
const pickerMarkup = pickerElements.get("#picker-grid").innerHTML;
assertInert(pickerMarkup, "picker renderer");
assert.equal(attributeValue(pickerMarkup, "data-picker-media"), hostileMediaId);
assert.equal(attributeValue(pickerMarkup, "alt"), hostileFileName);

const gallerySource = fs.readFileSync(
  path.join(sidepanelAppRoot, "04b-gallery-render-select.js"),
  "utf8",
);
const galleryElement = createElement();
runRenderer(
  gallerySource,
  ["tfGalleryRatioClass", "Ba"],
  {
    $a: () => false,
    TFHtmlSafety: safety,
    Ua: () => [
      {
        batchId: hostileId,
        batchKind: "image",
        projectFolder: hostileTag,
        projectName: hostileFileName,
        showProjectHeader: true,
        sortedPrompts: [
          {
            items: [
              {
                fifeUrl: "",
                isPlaceholder: true,
                localFile: false,
                mediaId: hostileMediaId,
                promptIndex: hostileId,
                ratioClass: hostileStatus,
                status: hostileStatus,
                suffix: "",
                type: "image",
              },
            ],
            prompt: hostileTag,
            promptIndex: hostileId,
          },
        ],
      },
    ],
    Ya() {},
    b: new Set(),
    g: new Set(),
    ja() {},
    r: () => galleryElement,
    se: safety.escapeHtml,
    tfBatchKindLabel: () => "Image",
    u: new Map([["item", {}]]),
    v: new Set(),
    xa: () => false,
  },
  "Ba",
);
const galleryMarkup = galleryElement.innerHTML;
assertInert(galleryMarkup, "gallery renderer");
assert.equal(attributeValue(galleryMarkup, "data-media-id"), hostileMediaId);
assert.equal(attributeValue(galleryMarkup, "data-prompt-index"), hostileId);
assert.match(galleryMarkup, /shimmer-placeholder ratio-16-9/);
assert.doesNotMatch(galleryMarkup, /shimmer-placeholder [^\"]*data-pwn/);

const queueSource = fs.readFileSync(
  path.join(sidepanelAppRoot, "05c-queue-ui-actions.js"),
  "utf8",
);
const queueElements = new Map();
const queueElement = (selector) => {
  if (!queueElements.has(selector)) queueElements.set(selector, createElement());
  return queueElements.get(selector);
};
const hostileBatch = {
  collapsed: false,
  folder: hostileTag,
  id: hostileId,
  name: hostileFileName,
  prompts: [{ lastError: hostileTag, status: hostileStatus, text: hostileFileName }],
  settings: {
    imageCount: 1,
    imageModel: hostileTag,
    imageRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
    mode: "image",
    naming: "numbered",
    referenceMode: "shared",
  },
  status: hostileStatus,
};
runRenderer(
  queueSource,
  ["tfQueueBatchStatusToken", "tfQueuePromptStatusToken", "Sn"],
  {
    In: () => null,
    Ln() {},
    TFHtmlSafety: safety,
    X() {},
    _n() {},
    l: { batches: [hostileBatch] },
    r: queueElement,
    se: safety.escapeHtml,
    tfBatchPromptHasExpectedMedia: () => false,
    tfPromptFailureReason: (prompt) => prompt.lastError || "",
    tfQueueBatchHasVisibleItems: () => true,
    tfQueuePromptEntries: (batch) => batch.prompts.map((prompt, index) => ({ index, prompt })),
    tfQueuePromptIsMissingMedia: () => false,
    tfReconcileBatchGalleryStatus: () => false,
    tfRepairQueueMarkup: (markup) => markup,
    tfShortPromptFailure: (prompt) => prompt.lastError || "",
  },
  "Sn",
);
const queueMarkup = queueElements.get("#batch-list").innerHTML;
assertInert(queueMarkup, "queue renderer");
assert.equal(attributeValue(queueMarkup, "data-bid"), hostileId);
assert.match(queueMarkup, /batch-card expanded bc-pending/);
assert.match(queueMarkup, /bp-status bps-pending/);
assert.match(queueMarkup, new RegExp(safety.escapeHtml(hostileTag)));
assert.doesNotMatch(queueMarkup, /bc-[^\"]*data-pwn|bps-[^\"]*data-pwn/);

console.log("HTML safety smoke tests passed");
