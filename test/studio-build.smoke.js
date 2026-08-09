"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autoflow-studio-build-"));
const buildSource = fs.readFileSync(path.join(root, "scripts/build-studio.mjs"), "utf8");
const syntaxSource = fs.readFileSync(
  path.join(root, "scripts/check-source-syntax.mjs"),
  "utf8",
);

assert.doesNotMatch(buildSource, /shell\s*:\s*true/, "Studio builds must not enable a shell");
assert.match(
  buildSource,
  /outdirValue[\s\S]*throw new Error\(["']--outdir requires a non-empty path/,
  "empty Studio output paths must fail before any files are written",
);
assert.doesNotMatch(
  buildSource,
  /["']dist["']\s*,\s*["']index\.mjs["']/,
  "Tailwind must be resolved through its declared executable metadata",
);
assert.match(
  buildSource,
  /tailwindPackage\.bin(?:\.tailwindcss|\?\.tailwindcss)/,
  "Tailwind executable metadata is not used",
);
assert.match(
  syntaxSource,
  /result\.error/,
  "syntax-check spawn failures must preserve the original process error",
);

try {
  const result = spawnSync(
    process.execPath,
    ["scripts/build-studio.mjs", `--outdir=${tempRoot}`],
    { cwd: root, encoding: "utf8" },
  );
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;

  assert.equal(result.status, 0, output);
  assert.doesNotMatch(output, /DEP0190|shell option true can lead to security vulnerabilities/);
  assert.ok(fs.existsSync(path.join(tempRoot, "studio.bundle.js")), "Studio JS bundle missing");
  assert.ok(fs.existsSync(path.join(tempRoot, "studio.bundle.css")), "Studio CSS bundle missing");
  console.log("Studio build smoke tests passed");
} finally {
  const resolvedTempRoot = path.resolve(tempRoot);
  const resolvedSystemTemp = path.resolve(os.tmpdir());
  assert.ok(resolvedTempRoot.startsWith(`${resolvedSystemTemp}${path.sep}`));
  fs.rmSync(resolvedTempRoot, { recursive: true, force: true });
}
