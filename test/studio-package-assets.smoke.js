"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const requiredStudioAssets = [
  "src/project-studio/generated/studio.bundle.js",
  "src/project-studio/generated/studio.bundle.css",
  "src/project-studio/generated/assets/poppins-400.woff2",
  "src/project-studio/generated/assets/poppins-500.woff2",
  "src/project-studio/generated/assets/poppins-600.woff2",
  "src/project-studio/generated/assets/poppins-700.woff2",
];

for (const relativePath of requiredStudioAssets) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} is missing from the extension`);
  assert.ok(fs.statSync(absolutePath).size > 0, `${relativePath} is empty`);

  const tracked = spawnSync(
    "git",
    ["ls-files", "--error-unmatch", "--", relativePath],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  assert.equal(
    tracked.status,
    0,
    `${relativePath} must be committed so Studio works from a clean checkout`,
  );
}

console.log("Studio package asset smoke tests passed");
