"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("yaml");

const root = path.resolve(__dirname, "..");
const workflowPath = path.join(root, ".github/workflows/ci.yml");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const checkoutRevision = "11d5960a326750d5838078e36cf38b85af677262";
const setupNodeRevision = "49933ea5288caeca8642d1e84afbd3f7d6820020";

assert.ok(fs.existsSync(workflowPath), "GitHub Actions CI workflow is missing");

const workflow = parse(fs.readFileSync(workflowPath, "utf8"));
assert.deepEqual(workflow.permissions, { contents: "read" });
assert.ok(
  Object.hasOwn(workflow.on || {}, "pull_request"),
  "CI must run for pull requests",
);
assert.deepEqual(workflow.on?.push?.branches, ["main"]);

const verify = workflow.jobs?.verify;
assert.ok(verify, "CI verify job is missing");
assert.equal(verify["runs-on"], "${{ matrix.os }}");
assert.deepEqual(verify.strategy?.matrix?.os, ["ubuntu-latest", "windows-latest"]);
assert.equal(verify["timeout-minutes"], 15);

const steps = verify.steps;
assert.ok(Array.isArray(steps), "CI verify steps are missing");
const checkout = steps.find((step) => step.name === "Check out repository");
assert.equal(checkout?.uses, `actions/checkout@${checkoutRevision}`);
assert.equal(
  checkout?.with?.["persist-credentials"],
  false,
  "checkout credentials must not persist while pull-request scripts execute",
);

const setupNode = steps.find((step) => step.name === "Set up Node.js");
assert.equal(setupNode?.uses, `actions/setup-node@${setupNodeRevision}`);
assert.equal(setupNode?.with?.["node-version"], 22);
assert.equal(setupNode?.with?.cache, "npm");

const commands = steps.filter((step) => step.run).map((step) => step.run);
assert.deepEqual(commands, [
  "npm ci --ignore-scripts",
  "npm run check:syntax",
  "npm test",
  "npm run test:build",
  "npm run build:studio",
  "npm run architecture:check",
  "npm audit --audit-level=high",
]);

assert.equal(
  packageJson.engines?.node,
  "^22.0.0 || ^24.0.0",
  "package metadata must declare the supported Node LTS lines",
);
assert.ok(
  readme.indexOf("npm run build:studio") < readme.indexOf('Click "Load unpacked"'),
  "fresh-checkout instructions must build ignored Studio assets before Chrome loads them",
);
assert.match(readme, /Node\.js 22 or 24 LTS/);
assert.match(
  readme,
  /On Windows, .*scripts\/build-extension\.ps1/,
  "PowerShell packaging must be documented as Windows-specific",
);

console.log("CI workflow smoke tests passed");
