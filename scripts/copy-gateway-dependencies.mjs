#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(script), "..");
const requireFromPlugin = createRequire(join(packageRoot, "package.json"));
const nativePackages = [
	"@libsql/darwin-arm64",
	"@libsql/darwin-x64",
	"@libsql/linux-arm64-gnu",
	"@libsql/linux-arm64-musl",
	"@libsql/linux-x64-gnu",
	"@libsql/linux-x64-musl",
	"@libsql/linux-arm-gnueabihf",
	"@libsql/linux-arm-musleabihf",
	"@libsql/win32-x64-msvc",
];

/** Copy libsql's JavaScript packages, platform binary, and bundled license files. */
export function copyGatewayDependencies(targetRoot) {
	const libsql = locatePackage("libsql", requireFromPlugin);
	const requireFromLibsql = createRequire(join(libsql, "index.js"));
	for (const name of ["libsql", "@neon-rs/load", "detect-libc"]) {
		const source = name === "libsql" ? libsql : locatePackage(name, requireFromLibsql);
		copyPackage(source, join(targetRoot, "node_modules", ...name.split("/")));
	}
	let nativeCount = 0;
	for (const name of nativePackages) {
		try {
			copyPackage(locatePackage(name, requireFromLibsql), join(targetRoot, "node_modules", ...name.split("/")));
			nativeCount++;
		} catch (error) {
			if (error?.code !== "MODULE_NOT_FOUND") throw error;
		}
	}
	if (nativeCount === 0) throw new Error("libsql platform package is not installed");
	return nativeCount;
}

function locatePackage(name, requireFrom) {
	let cursor = dirname(requireFrom.resolve(name));
	for (;;) {
		const manifest = join(cursor, "package.json");
		if (existsSync(manifest)) {
			const parsed = JSON.parse(readFileSync(manifest, "utf8"));
			if (parsed.name === name) return cursor;
		}
		const parent = dirname(cursor);
		if (parent === cursor) throw new Error(`package root not found for ${name}`);
		cursor = parent;
	}
}

function copyPackage(source, destination) {
	rmSync(destination, { recursive: true, force: true });
	mkdirSync(dirname(destination), { recursive: true });
	cpSync(source, destination, { recursive: true, dereference: true });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === script) {
	const target = process.argv[2];
	if (target === undefined) throw new Error("usage: copy-gateway-dependencies.mjs <package-root>");
	const count = copyGatewayDependencies(resolve(target));
	console.log(`Copied Gateway dependencies (${count} platform package${count === 1 ? "" : "s"})`);
}
