#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliRoot = resolve(process.env.UNIVER_CLI_SOURCE ?? join(packageRoot, '..', 'univer-cli'))
const vendorRoot = join(packageRoot, 'vendor', 'unit-content')
const upstreamRoot = join(vendorRoot, 'upstream')
const artifactsRoot = join(vendorRoot, 'artifacts')
const workerSource = join(packageRoot, 'src', 'workers', 'unit-content', 'entry.ts')
const requireFromPlugin = createRequire(join(packageRoot, 'package.json'))

assertExists(join(cliRoot, 'apps', 'cli', 'src', 'license.ts'))
rmSync(upstreamRoot, { force: true, recursive: true })
copyTree(
  join(cliRoot, 'apps', 'cli', 'src', 'runtime'),
  join(upstreamRoot, 'application', 'runtime'),
)
cpSync(
  join(cliRoot, 'apps', 'cli', 'src', 'license.ts'),
  join(upstreamRoot, 'application', 'license.ts'),
)

rmSync(artifactsRoot, { force: true, recursive: true })
mkdirSync(artifactsRoot, { recursive: true })
await build({
  absWorkingDir: packageRoot,
  banner: {
    js: [
      'import { createRequire as __createRequire } from "node:module";',
      'import { dirname as __pathDirname } from "node:path";',
      'import { fileURLToPath as __fileURLToPath } from "node:url";',
      'const require = __createRequire(import.meta.url);',
      'const __filename = __fileURLToPath(import.meta.url);',
      'const __dirname = __pathDirname(__filename);',
    ].join('\n'),
  },
  bundle: true,
  entryPoints: [workerSource],
  external: [
    '@univerjs-pro/cli-assets',
    '@univerjs-pro/engine-formula-rust-binding',
    '@univerjs-pro/uexcli',
  ],
  format: 'esm',
  legalComments: 'none',
  outfile: join(artifactsRoot, 'unit-content-worker.mjs'),
  platform: 'node',
  sourcemap: false,
  target: 'node22.19',
  tsconfigRaw: {
    compilerOptions: {
      experimentalDecorators: true,
      useDefineForClassFields: false,
    },
  },
})

copyPackage('@univerjs-pro/cli-assets', requireFromPlugin)
const formulaRoot = copyPackage(
  '@univerjs-pro/engine-formula-rust-binding',
  requireFromPlugin,
)
copySiblingPackage(formulaRoot, formulaPlatformPackage())
const exchangeRoot = copyPackage('@univerjs-pro/uexcli', requireFromPlugin)
copySiblingPackage(exchangeRoot, exchangePlatformPackage())

writeFileSync(
  join(vendorRoot, 'SOURCE.json'),
  `${JSON.stringify(
    {
      application: {
        repository: 'https://github.com/dream-num/univer-cli.git',
        revision: revision(cliRoot),
      },
      sdkPackages: sdkPackageVersions(),
      generated: 'artifacts/unit-content-worker.mjs',
      platform: `${process.platform}-${process.arch}`,
    },
    null,
    2,
  )}\n`,
)

console.log(`Synced package-local Unit content artifacts for ${process.platform}-${process.arch}`)

function copyPackage(name, requireFrom) {
  const source = packageRootOf(name, requireFrom)
  copyTree(source, join(artifactsRoot, 'node_modules', ...name.split('/')))
  return source
}

function copySiblingPackage(parentRoot, name) {
  const source = join(dirname(realpathSync(parentRoot)), name.split('/').at(-1))
  assertExists(join(source, 'package.json'))
  copyTree(source, join(artifactsRoot, 'node_modules', ...name.split('/')))
}

function packageRootOf(name, requireFrom) {
  const installed = join(packageRoot, 'node_modules', ...name.split('/'))
  if (existsSync(join(installed, 'package.json'))) return installed
  let cursor = dirname(requireFrom.resolve(name))
  for (;;) {
    const manifestPath = join(cursor, 'package.json')
    if (existsSync(manifestPath)) {
      const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'))
      if (parsed.name === name) return cursor
    }
    const parent = dirname(cursor)
    if (parent === cursor) throw new Error(`package root not found for ${name}`)
    cursor = parent
  }
}

function sdkPackageVersions() {
  return Object.fromEntries([
    '@univer-cli/content-execution',
    '@univer-cli/content-inspection',
    '@univer-cli/headless-univer',
    '@univer-cli/unit-exchange',
    '@univer-cli/univer-collaboration-runtime',
  ].map((name) => [name, packageVersion(name)]))
}

function packageVersion(name) {
  const packageRoot = packageRootOf(name, requireFromPlugin)
  return JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version
}

function formulaPlatformPackage() {
  const target = new Map([
    ['darwin-arm64', 'darwin-arm64'],
    ['linux-x64', 'linux-x64-gnu'],
    ['linux-arm64', 'linux-arm64-gnu'],
    ['win32-x64', 'win32-x64-msvc'],
  ]).get(`${process.platform}-${process.arch}`)
  if (target === undefined) throw new Error('Unsupported formula native platform')
  return `@univerjs-pro/engine-formula-rust-binding-${target}`
}

function exchangePlatformPackage() {
  const target = new Map([
    ['darwin-arm64', 'darwin-arm64'],
    ['linux-x64', 'linux-x64'],
    ['linux-arm64', 'linux-arm64'],
    ['win32-x64', 'windows-x64'],
  ]).get(`${process.platform}-${process.arch}`)
  if (target === undefined) throw new Error('Unsupported Office exchange platform')
  return `@univerjs-pro/uexcli-${target}`
}

function copyTree(source, target) {
  rmSync(target, { force: true, recursive: true })
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target, { dereference: true, recursive: true })
}

function revision(root) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
}

function assertExists(path) {
  if (!existsSync(path)) throw new Error(`Required source is missing: ${path}`)
}
