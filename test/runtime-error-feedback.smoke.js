"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const controlRunner = fs.readFileSync(
  path.join(root, "src/sidepanel/app/06b-control-runner.js"),
  "utf8",
);
const runtimeBoot = fs.readFileSync(
  path.join(root, "src/sidepanel/app/07-runtime-boot.js"),
  "utf8",
);

assert.match(
  controlRunner,
  /Unable to read generation status\. Retrying/,
  "generation status polling failures must be visible to the user",
);
assert.match(
  controlRunner,
  /Generation status connection restored/,
  "generation status polling must report recovery after a visible failure",
);
assert.match(
  runtimeBoot,
  /Could not restore the previous generation state/,
  "startup recovery failures must tell the user how to retry",
);

console.log("Runtime error feedback smoke tests passed");
