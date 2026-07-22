# MediaPipe Hands model assets

`handsClient.ts` self-hosts these assets (`locateFile: (file) => \`/models/${file}\``)
rather than pulling them from a CDN at runtime, per the Blueprint's
performance decision — matches shouldn't depend on a third-party network
request mid-game.

**This is now automatic.** `apps/client/package.json` runs
`scripts/copy-mediapipe-assets.mjs` as a `postinstall` step, so a plain

```bash
pnpm install
```

at the repo root copies every runtime asset from
`node_modules/@mediapipe/hands/` (pinned at `^0.4.1675469240`) into this
directory by itself — no manual copy step.

If your `pnpm` version doesn't run workspace `postinstall` hooks
automatically, run it directly:

```bash
pnpm --filter @rocklink/client run copy-mediapipe-assets
```

**Verifying it worked:** this directory should contain several `.wasm`,
`.data`, `.tflite`, and `.binarypb` files (plus a couple of
`hands_solution_*.js` loader files) — if it still contains only this
README and `.gitkeep`, the copy step didn't run; check the console
output of `pnpm install` for a `[copy-mediapipe-assets]` warning
explaining why (most commonly: `node_modules/@mediapipe/hands` wasn't
installed at all, e.g. an offline/partial install).

Exact filenames can vary slightly by `@mediapipe/hands` version — the
copy script doesn't hardcode a filename list; it copies whatever runtime
asset files that package version actually ships, so this stays correct
across version bumps without edits here.
