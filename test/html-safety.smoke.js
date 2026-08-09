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
    return fileSource
      .split(/\r\n|\r|\n/)
      .map((line, index) => ({ fileName, line, lineNumber: index + 1 }))
      .filter(({ line }) => line.includes('src="${') && !line.includes("TFHtmlSafety.safeMediaUrl"));
  });
assert.deepEqual(unsafeMediaTemplates, [], "dynamic media source bypasses TFHtmlSafety");

console.log("HTML safety smoke tests passed");
