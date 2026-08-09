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
  ], "background runtime");

  assertOrder(read("src/project-studio/index.html"), [
    "app/studio-bootstrap.js",
    ...sharedOrder,
    "app/00-studio-state.js",
    "generated/studio.bundle.js",
  ], "Project Studio");

  assertOrder(read("src/sidepanel/index.html"), [
    ...sharedOrder,
    "app/00-html-safety.js",
    "app/00-state-storage.js",
    "app/00a-project-studio-link.js",
  ], "side panel");

  console.log("loader order smoke tests passed");
}

run();
