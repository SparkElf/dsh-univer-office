#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstream = resolve(process.argv[2] ?? join(root, "..", "univer-cli"));
const packageFile = join(upstream, "apps", "cli", "package.json");
if (!existsSync(packageFile)) {
	throw new Error(`univer-cli checkout not found: ${upstream}`);
}

execFileSync("pnpm", ["--dir", upstream, "--filter", "@univer/collab-web", "build"], { stdio: "inherit" });

const requireFromCli = createRequire(packageFile);
const { build } = requireFromCli("esbuild");
const scratch = mkdtempSync(join(tmpdir(), "dsh-univer-collaboration-"));
const gatewayOutput = join(scratch, "gateway.mjs");
await build({
	stdin: {
		contents: [
			'import { startServer } from "@univer/collab-gateway";',
			'import process from "node:process";',
			'const port = Number(process.env.UNIVER_COLLAB_GATEWAY_PORT ?? 9123);',
			'const allowedRoot = process.env.UNIVER_ALLOWED_ROOT || undefined;',
			'const viewAssetsRoot = process.env.UNIVER_VIEW_ASSETS_ROOT;',
			'if (!viewAssetsRoot) throw new Error("UNIVER_VIEW_ASSETS_ROOT is required");',
			'const server = await startServer({ port, allowedRoot, viewAssetsRoot });',
			'process.stdout.write(JSON.stringify({ kind: "ready", port: server.port }) + "\\n");',
			'let closing = false;',
			'const close = () => {',
			'  if (closing) return;',
			'  closing = true;',
			'  void server.close().finally(() => process.exit());',
			'};',
			'process.once("SIGINT", close);',
			'process.once("SIGTERM", close);',
		].join("\n"),
		resolveDir: join(upstream, "apps", "cli"),
		sourcefile: "dsh-gateway-entry.ts",
		loader: "ts",
	},
	bundle: true,
	banner: {
		js: [
			'import { createRequire as __dshCreateRequire } from "node:module";',
			'import { dirname as __dshDirname } from "node:path";',
			'import { fileURLToPath as __dshFileURLToPath } from "node:url";',
			'const require = __dshCreateRequire(import.meta.url);',
			'const __filename = __dshFileURLToPath(import.meta.url);',
			'const __dirname = __dshDirname(__filename);',
		].join("\n"),
	},
	external: ["libsql"],
	format: "esm",
	logLevel: "warning",
	outfile: gatewayOutput,
	platform: "node",
	target: "node22",
});

const vendor = join(root, "vendor", "collaboration");
const artifacts = join(vendor, "artifacts");
const source = join(vendor, "upstream");
rmSync(artifacts, { recursive: true, force: true });
rmSync(source, { recursive: true, force: true });
mkdirSync(artifacts, { recursive: true });
mkdirSync(source, { recursive: true });
cpSync(gatewayOutput, join(artifacts, "gateway.mjs"));
cpSync(join(upstream, "apps", "cli", "dist", "collab-web"), join(artifacts, "viewer"), { recursive: true });

const sourcePaths = [
	"packages/collab-gateway",
	"packages/collab-gateway-contract",
	"packages/univerfile-sqlite",
	"packages/collab-web",
	"packages/render-preset",
	"packages/importrange-formula",
];
for (const relative of sourcePaths) {
	const from = join(upstream, relative);
	const to = join(source, relative);
	mkdirSync(dirname(to), { recursive: true });
	cpSync(from, to, {
		recursive: true,
		filter(path) {
			const name = path.slice(from.length).replaceAll("\\", "/");
			return !name.startsWith("/dist")
				&& !name.startsWith("/node_modules")
				&& !name.startsWith("/test")
				&& !name.endsWith(".tsbuildinfo");
		},
	});
}
const credential = "apps/cli/src/license.ts";
mkdirSync(dirname(join(source, credential)), { recursive: true });
cpSync(join(upstream, credential), join(source, credential));

const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: upstream, encoding: "utf8" }).trim();
const sourceManifest = JSON.parse(readFileSync(join(vendor, "SOURCE.json"), "utf8"));
sourceManifest.revision = revision;
sourceManifest.copiedAt = new Date().toISOString().slice(0, 10);
writeFileSync(join(vendor, "SOURCE.json"), `${JSON.stringify(sourceManifest, null, 2)}\n`);
rmSync(scratch, { recursive: true, force: true });
console.log(`Synced Univer collaboration artifacts at ${revision}`);
