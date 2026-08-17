import { fileURLToPath } from 'node:url'

/** Vendored Gateway executable in the published package. */
export const GATEWAY_ENTRY = fileURLToPath(new URL('../vendor/collaboration/artifacts/gateway.mjs', import.meta.url))

/** Vendored Viewer assets served by the Gateway. */
export const VIEWER_ROOT = fileURLToPath(new URL('../vendor/collaboration/artifacts/viewer/', import.meta.url))

/** Vendored one-shot worker used for content inspection, execution, and export. */
export const UNIT_CONTENT_WORKER_ENTRY = fileURLToPath(new URL('../vendor/unit-content/artifacts/unit-content-worker.mjs', import.meta.url))

/** Package-local modules loaded dynamically by vendored native integrations. */
export const UNIT_CONTENT_NODE_MODULES = fileURLToPath(new URL('../vendor/unit-content/artifacts/node_modules/', import.meta.url))

/** Native formula binding shared by the Gateway projection engine and Content Worker. */
export const FORMULA_BINDING_PATH = fileURLToPath(new URL(
  `../vendor/unit-content/artifacts/node_modules/@univerjs-pro/engine-formula-rust-binding-${formulaTarget()}/univer-formula.${formulaTarget()}.node`,
  import.meta.url,
))

function formulaTarget(): string {
  const target = new Map<string, string>([
    ['darwin-arm64', 'darwin-arm64'],
    ['linux-x64', 'linux-x64-gnu'],
    ['linux-arm64', 'linux-arm64-gnu'],
    ['win32-x64', 'win32-x64-msvc'],
  ]).get(`${process.platform}-${process.arch}`)
  if (target === undefined) throw new Error(`univer: unsupported formula platform ${process.platform}-${process.arch}`)
  return target
}
