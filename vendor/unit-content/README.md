# Vendored Univer Unit content

This directory contains a pinned `dream-num/univer-cli` application-source snapshot and a generated one-shot Unit Content Worker.

- `artifacts/unit-content-worker.mjs` is generated from `src/workers/unit-content/entry.ts` and the exact `@univer-cli/*` SDK package versions in `package.json`.
- `artifacts/node_modules/` contains the target-platform formula engine, Office converter, and their JavaScript loaders.
- `upstream/` contains only the unpublished Univer CLI application helpers and development license used to reproduce and review the worker. It is not included in the npm package.
- `SOURCE.json` records the Univer CLI revision, installed SDK package versions, and native target platform.

Run `npm run sync:unit-content` with `UNIVER_CLI_SOURCE` pointing to a compatible checkout. The sync command uses SDK packages installed from the internal npm registry, replaces the application snapshot and generated artifacts, and leaves the plugin-owned Worker entry under `src/workers/unit-content/`.

Do not edit generated artifacts in place. Product-specific orchestration belongs under `src/`; SDK fixes should be published from `univer-cli-sdk` and adopted by updating the exact package versions.
