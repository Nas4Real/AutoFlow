"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "src");
const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".mjs"]);
const mojibakeMarkers = [
  "ðŸ",
  "â€",
  "âš",
  "âœ",
  "â",
  "âž",
  "â†",
  "â",
  "â„",
  "âŸ",
  "Â·",
  "ï¸",
];

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolutePath);
    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) return [];
    return [absolutePath];
  });
}

function relativeLineFor(source, index) {
  return source.slice(0, index).split(/\r\n|\r|\n/).length;
}

function run() {
  const findings = [];

  for (const absolutePath of listSourceFiles(sourceRoot)) {
    const source = fs.readFileSync(absolutePath, "utf8");
    for (const marker of mojibakeMarkers) {
      let index = source.indexOf(marker);
      while (index >= 0) {
        findings.push({
          file: path.relative(root, absolutePath),
          line: relativeLineFor(source, index),
          marker,
        });
        index = source.indexOf(marker, index + marker.length);
      }
    }
  }

  assert.equal(
    findings.length,
    0,
    `source contains mojibake:\n${findings
      .slice(0, 25)
      .map((finding) => `${finding.file}:${finding.line} (${finding.marker})`)
      .join("\n")}${findings.length > 25 ? `\n...and ${findings.length - 25} more` : ""}`,
  );

  console.log("source encoding smoke tests passed");
}

run();
