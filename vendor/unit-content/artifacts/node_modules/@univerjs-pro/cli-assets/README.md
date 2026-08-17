# @univerjs-pro/cli-assets

`@univerjs-pro/cli-assets` is the versioned default visual asset catalog consumed by Univer CLI resource commands. The package contains data only; SVG, PNG, JPEG, and other resource payloads continue to be referenced by catalog metadata and are not bundled here.

## Public path

Resolve the manifest through the public package subpath and read it only when the resource library is opened:

```js
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const manifestPath = require.resolve("@univerjs-pro/cli-assets/manifest.json");
```

The package does not expose a JavaScript API or a root export.

## Versioning

The first public release is `0.1.0`. Existing registry IDs, resource IDs, canonical handles, and manifest fields required by the current CLI loader remain compatible throughout `0.1.x`. A breaking catalog protocol change starts a new minor series such as `0.2.0`.

## Build and release

```bash
pnpm --filter @univerjs-pro/cli-assets build -- --version=0.1.0
(cd packages/cli-assets/dist && npm pack --dry-run --json)
```

A stable `cli-assets-vX.Y.Z` tag on a commit contained in `origin/dev` publishes `@univerjs-pro/cli-assets@X.Y.Z` to npmjs through the dedicated workflow.
