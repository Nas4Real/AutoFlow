import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "src");

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "generated") {
        files.push(...(await collectJavaScriptFiles(absolutePath)));
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(absolutePath);
    }
  }

  return files;
}

const files = await collectJavaScriptFiles(sourceRoot);
const failures = [];

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failures.push(`${path.relative(root, file)}\n${result.stderr.trim()}`);
  }
}

if (failures.length > 0) {
  console.error(`JavaScript syntax check failed:\n\n${failures.join("\n\n")}`);
  process.exitCode = 1;
} else {
  console.log(`JavaScript syntax check passed (${files.length} source files)`);
}
