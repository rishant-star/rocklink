// Copies @mediapipe/hands' runtime assets (wasm/data/tflite/binarypb —
// exact filenames vary slightly by version, so this copies everything
// that isn't source/type-definition/doc/package-manifest noise) from
// node_modules into public/models, where handsClient.ts's
// `locateFile: (file) => \`/models/${file}\`` expects to find them.
//
// Runs automatically as a "postinstall" step (see package.json) so
// `pnpm install` alone is enough — no manual copy step required.
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, "..", "node_modules", "@mediapipe", "hands");
const DEST_DIR = join(__dirname, "..", "public", "models");

// Runtime assets only — explicitly excludes .ts/.d.ts/.md/.json/.mjs/.cjs
// source and manifest files that also live in this package directory.
const RUNTIME_EXTENSIONS = new Set([".wasm", ".data", ".tflite", ".binarypb", ".js"]);
// .js is ambiguous (the package also ships a couple of small ES-module
// helper files); restrict it to the actual solution/loader bundles.
const JS_ALLOWLIST_PATTERN = /^hands_solution.*\.js$/;

function isRuntimeAsset(filename) {
  const ext = extname(filename);
  if (ext === ".js") return JS_ALLOWLIST_PATTERN.test(filename);
  return RUNTIME_EXTENSIONS.has(ext);
}

function main() {
  if (!existsSync(SOURCE_DIR)) {
    // Not an error: this happens harmlessly on `pnpm install` in any
    // environment where @mediapipe/hands hasn't been fetched yet (e.g.
    // a partial/offline install). The app will simply show its own
    // "Hand tracking failed to load" error until a real install runs.
    console.warn(
      `[copy-mediapipe-assets] ${SOURCE_DIR} not found — skipping. ` +
        `Run "pnpm install" with network access, then "pnpm --filter @rocklink/client run copy-mediapipe-assets" to retry.`,
    );
    return;
  }

  mkdirSync(DEST_DIR, { recursive: true });

  const files = readdirSync(SOURCE_DIR).filter(isRuntimeAsset);
  if (files.length === 0) {
    console.warn(
      `[copy-mediapipe-assets] No runtime assets matched in ${SOURCE_DIR}. ` +
        `@mediapipe/hands may have changed its file layout — check that directory by hand.`,
    );
    return;
  }

  for (const file of files) {
    copyFileSync(join(SOURCE_DIR, file), join(DEST_DIR, file));
  }
  console.log(`[copy-mediapipe-assets] Copied ${files.length} file(s) into public/models/:`);
  for (const file of files) console.log(`  - ${file}`);
}

main();
