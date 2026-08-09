import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const require = createRequire(import.meta.url);
const outdirArgument = process.argv.find((argument) => argument.startsWith("--outdir="));
const outdirValue = outdirArgument?.slice("--outdir=".length).trim();
if (outdirArgument && !outdirValue) {
  throw new Error("--outdir requires a non-empty path.");
}
const outdir = outdirValue
  ? path.resolve(root, outdirValue)
  : path.join(root, "src", "project-studio", "generated");

await mkdir(path.join(outdir, "assets"), { recursive: true });

await build({
  entryPoints: [path.join(root, "src", "project-studio", "react", "studio.jsx")],
  bundle: true,
  format: "iife",
  target: ["chrome120"],
  outdir,
  entryNames: "studio.bundle",
  assetNames: "assets/[name]-[hash]",
  jsx: "automatic",
  legalComments: "none",
  minify: false,
  sourcemap: false,
  logLevel: "info",
});

const tailwindPackagePath = require.resolve("@tailwindcss/cli/package.json");
const tailwindPackageRoot = path.dirname(tailwindPackagePath);
const tailwindPackage = require(tailwindPackagePath);
const tailwindBin =
  typeof tailwindPackage.bin === "string"
    ? tailwindPackage.bin
    : tailwindPackage.bin?.tailwindcss;
if (!tailwindBin) {
  throw new Error("@tailwindcss/cli does not declare a tailwindcss executable.");
}
const tailwindEntryPoint = path.resolve(tailwindPackageRoot, tailwindBin);
const cssResult = spawnSync(
  process.execPath,
  [
    tailwindEntryPoint,
    "-i",
    path.join(root, "src", "project-studio", "react", "studio-tailwind.css"),
    "-o",
    path.join(outdir, "studio.bundle.css"),
    "--minify",
  ],
  { cwd: root, encoding: "utf8", windowsHide: true },
);
if (cssResult.error || cssResult.status !== 0) {
  if (cssResult.error) throw cssResult.error;
  throw new Error(cssResult.stderr || cssResult.stdout || "Studio CSS build failed.");
}

for (const weight of [400, 500, 600, 700]) {
  await copyFile(
    path.join(
      root,
      "node_modules",
      "@fontsource",
      "poppins",
      "files",
      `poppins-latin-${weight}-normal.woff2`,
    ),
    path.join(outdir, "assets", `poppins-${weight}.woff2`),
  );
}
