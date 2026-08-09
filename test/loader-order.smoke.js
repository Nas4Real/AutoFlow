"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const sharedOrder = [
  "00-project-domain.js",
  "01-project-json-contract.js",
  "02-project-prompt-import.js",
  "project-services/project-schema.js",
  "project-services/command-result.js",
  "project-services/read-model-contracts.js",
  "project-services/media-link-contracts.js",
  "project-services/migration-shims.js",
  "project-services/legacy-project-normalizer.js",
];

function assertOrder(source, expected, label) {
  let previousIndex = -1;
  expected.forEach((needle) => {
    const index = source.indexOf(needle);
    assert.ok(index >= 0, `${label} missing ${needle}`);
    assert.ok(index > previousIndex, `${label} loads ${needle} out of order`);
    previousIndex = index;
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function run() {
  assertOrder(read("src/background/runtime.js"), [
    ...sharedOrder,
    "runtime/contracts/runtime-events.js",
    "runtime/00-state-connection.js",
    "runtime/03-downloads-cache.js",
    "runtime/03b-intercept-security.js",
    "runtime/04-message-router.js",
  ], "background runtime");

  const studioHtml = read("src/project-studio/index.html");
  assertOrder(studioHtml, [
    "app/studio-bootstrap.js",
    ...sharedOrder,
    "app/00-studio-state.js",
    "generated/studio.bundle.js",
  ], "Project Studio");
  assert.match(
    studioHtml,
    /href="generated\/studio\.bundle\.css"/,
    "Project Studio must load its generated stylesheet",
  );
  assert.doesNotMatch(
    studioHtml,
    /href="(?:\.\/)?studio\.css"/,
    "Project Studio must not load the removed legacy stylesheet",
  );

  const sidepanelHtml = read("src/sidepanel/index.html");
  assertOrder(sidepanelHtml, [
    ...sharedOrder,
    "app/00-html-safety.js",
    "app/00-state-storage.js",
    "app/00a-project-studio-link.js",
  ], "side panel");
  for (const className of ["loading-logo", "auth-logo", "header-icon"]) {
    assert.match(
      sidepanelHtml,
      new RegExp(`class="${className}"[^>]*aria-hidden="true"`),
      `${className} is decorative and must be hidden from assistive technology`,
    );
  }

  console.log("loader order smoke tests passed");
}

run();
