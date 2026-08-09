"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workflowPath = path.join(root, ".github/workflows/ci.yml");

assert.ok(fs.existsSync(workflowPath), "GitHub Actions CI workflow is missing");

const workflow = fs.readFileSync(workflowPath, "utf8");
for (const expected of [
  "permissions:",
  "contents: read",
  "npm ci --ignore-scripts",
  "npm run check:syntax",
  "npm test",
  "npm run test:build",
  "npm run build:studio",
  "npm run architecture:check",
  "npm audit --audit-level=high",
]) {
  assert.ok(workflow.includes(expected), `CI workflow is missing: ${expected}`);
}

console.log("CI workflow smoke tests passed");
