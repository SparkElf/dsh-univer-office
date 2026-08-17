# Vendored Univer collaboration

This directory is a pinned source snapshot and generated artifacts copied from
`dream-num/univer-cli` until the collaboration packages have an independent
release pipeline.

- `artifacts/gateway.mjs` is a Node bundle of `@univer/collab-gateway`. Only the
  native `libsql` dependency remains external and is declared by the plugin.
- `artifacts/viewer/` is the production `@univer/collab-web` build served by the
  Gateway. Its bundled Univer development credential follows the
  upstream build and must be refreshed with that build.
- `upstream/` contains the source packages needed to reproduce and review this
  snapshot. It is repository source material and is not included in the npm
  package.
- `SOURCE.json` records the exact upstream revision.

Run `npm run sync:collaboration -- /path/to/univer-cli` after updating the
upstream checkout. The sync command rebuilds the Viewer and Gateway, replaces
the snapshot, and updates `SOURCE.json`.

Do not edit the copied source or generated artifacts in place. Product-specific
adaptation belongs in the DSH plugin; fixes to the collaboration implementation belong
upstream and arrive through the next sync.
