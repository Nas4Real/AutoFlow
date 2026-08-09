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

const persistedTemplateSources = new Map(
  [
    "02-tour-library.js",
    "03a-picker-core.js",
    "04b-gallery-render-select.js",
    "05c-queue-ui-actions.js",
  ].map((fileName) => [
    fileName,
    fs.readFileSync(path.join(sidepanelAppRoot, fileName), "utf8"),
  ]),
);

for (const [fileName, unsafePatterns] of new Map([
  [
    "02-tour-library.js",
    [/data-lib-tag-id="\$\{e\.id\}"/, /data-tag-(?:add|input|remove)="\$\{e\.id\}"/, /library-item-mediaid">\$\{n\}/],
  ],
  [
    "03a-picker-core.js",
    [/media-id">\$\{l\.startFrameMediaId/, /media-id">\$\{l\.endFrameMediaId/],
  ],
  [
    "04b-gallery-render-select.js",
    [/\$\{e\.ratioClass \|\|/, /alt="#\$\{r\}"/, /data-prompt-index="\$\{e\.promptIndex\}"/],
  ],
  [
    "05c-queue-ui-actions.js",
    [/data-bid="\$\{e\.id\}"/, /`bps-\$\{t\.status\}`/, /bc-\$\{e\.status\}/, /batch-tag">\$\{e\}<\/span>/],
  ],
])) {
  const fileSource = persistedTemplateSources.get(fileName);
  for (const unsafePattern of unsafePatterns) {
    assert.doesNotMatch(
      fileSource,
      unsafePattern,
      `${fileName} renders a persisted value without encoding or allowlisting`,
    );
  }
}

console.log("HTML safety smoke tests passed");
