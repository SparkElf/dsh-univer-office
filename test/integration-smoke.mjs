import { mkdtemp, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

const { Context } = await import("@deepseek-ai/cordis");
const packageRoot = process.env.UNIVER_PLUGIN_ROOT;
if (packageRoot !== undefined && !isAbsolute(packageRoot)) throw new Error("UNIVER_PLUGIN_ROOT must be absolute");
const entry = packageRoot === undefined
	? new URL("../lib/index.js", import.meta.url).href
	: pathToFileURL(join(packageRoot, "lib", "index.js")).href;
const { GatewayUniverService, resolveConfig } = await import(entry);
const scratch = await mkdtemp(join(tmpdir(), "dsh-univer-integration-smoke-"));
const workspace = await realpath(scratch);
const file = join(workspace, "smoke.univer");
const source = join(workspace, "import.csv");
const svgSource = join(workspace, "slide.svg");
const exported = join(workspace, "smoke.xlsx");
await writeFile(source, "name,value\nalpha,1\nbeta,2\n");
await writeFile(svgSource, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="#f7f8fb"/><text x="80" y="160" font-family="Arial" font-size="54" fill="#182230">Bundled SVG</text></svg>');

const foreign = createHttpServer((_request, response) => response.end("not a Univer Gateway"));
await new Promise((resolve, reject) => {
	foreign.once("error", reject);
	foreign.listen(0, "127.0.0.1", resolve);
});
const foreignAddress = foreign.address();
if (foreignAddress === null || typeof foreignAddress === "string") throw new Error("foreign server did not receive a TCP port");
const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;
const service = new GatewayUniverService(new Context(), resolveConfig({ gatewayPorts: [foreignAddress.port, port], tools: false }));
const scoped = { workspace, file };

try {
	const started = await service.ensureGateway();
	if (!started.ok || started.gateway !== origin || started.reused !== false) {
		throw new Error(`plugin failed to start bundled Gateway: ${JSON.stringify(started)}`);
	}
	const reused = await service.ensureGateway();
	if (!reused.ok || reused.gateway !== origin || reused.reused !== true) {
		throw new Error(`plugin failed to reuse its own Gateway: ${JSON.stringify(reused)}`);
	}
	const viewer = await fetch(`${origin}/`);
	if (!viewer.ok || !(await viewer.text()).includes("<html")) {
		throw new Error("bundled Viewer index was not served");
	}

	const created = await service.newFile(scoped);
	if (!created.ok || created.operation !== "new" || created.result?.created !== true) {
		throw new Error(`new Univer file failed: ${JSON.stringify(created)}`);
	}
	const empty = await service.status(scoped);
	if (empty.result?.trunk?.units?.length !== 0) throw new Error(`new file must be empty: ${JSON.stringify(empty)}`);

	const worktreeOperation = await service.worktree({ ...scoped, action: "create", name: "integration smoke" });
	const worktree = worktreeOperation.result;
	if (worktree === null || typeof worktree !== "object" || Array.isArray(worktree)
		|| typeof worktree.worktreeId !== "string" || worktree.status !== "draft") {
		throw new Error(`create worktree failed: ${JSON.stringify(worktree)}`);
	}
	const worktreeId = worktree.worktreeId;

	const createdUnit = await service.unit({ ...scoped, action: "create", worktreeId, kind: "sheet", name: "Smoke" });
	const unitId = createdUnit.result?.unitId;
	if (typeof unitId !== "string") throw new Error(`create Unit failed: ${JSON.stringify(createdUnit)}`);

	const temporary = await service.unit({ ...scoped, action: "create", worktreeId, kind: "doc", name: "Temporary" });
	if (typeof temporary.result?.unitId !== "string") throw new Error(`temporary Unit failed: ${JSON.stringify(temporary)}`);
	const removed = await service.unit({ ...scoped, action: "remove", worktreeId, unitId: temporary.result.unitId });
	if (removed.result?.removed !== true) throw new Error(`remove Unit failed: ${JSON.stringify(removed)}`);

	const slide = await service.unit({ ...scoped, action: "create", worktreeId, kind: "slide", name: "Rendered" });
	const slideUnitId = slide.result?.unitId;
	if (typeof slideUnitId !== "string") throw new Error(`Slide Unit failed: ${JSON.stringify(slide)}`);
	const compiledSvg = await service.compileSvg({
		...scoped,
		source: svgSource,
		sourceWorkspace: workspace,
		worktreeId,
		unitId: slideUnitId,
		page: 1,
	});
	if (compiledSvg.operation !== "compile-svg" || compiledSvg.result?.execution?.committed !== true) {
		throw new Error(`SVG compile/apply failed: ${JSON.stringify(compiledSvg)}`);
	}
	const layout = await service.lintUnitLayout({ ...scoped, worktreeId, unitId: slideUnitId });
	if (layout.operation !== "lint" || layout.result?.kind !== "unit-layout-lint"
		|| layout.result?.coverage?.pages?.length !== 1 || !Array.isArray(layout.result?.findings)) {
		throw new Error(`Slide layout lint failed: ${JSON.stringify(layout)}`);
	}

	const executed = await service.executeUnitContent({
		...scoped,
		worktreeId,
		unitId,
		code: 'workbook.getActiveSheet().getRange("A1").setValue("bundled"); return "ok";',
	});
	if (executed.result?.committed !== true || executed.result?.value !== "ok") {
		throw new Error(`package-local execute failed: ${JSON.stringify(executed)}`);
	}
	const [leftExecution, rightExecution] = await Promise.all([
		service.executeUnitContent({
			...scoped,
			worktreeId,
			unitId,
			code: 'workbook.getActiveSheet().getRange("A2").setValue("left"); return "left";',
		}),
		service.executeUnitContent({
			...scoped,
			worktreeId,
			unitId,
			code: 'workbook.getActiveSheet().getRange("B2").setValue("right"); return "right";',
		}),
	]);
	if (leftExecution.result?.committed !== true || leftExecution.result?.value !== "left"
		|| rightExecution.result?.committed !== true || rightExecution.result?.value !== "right") {
		throw new Error(`concurrent Collaboration SDK execution failed: ${JSON.stringify({ leftExecution, rightExecution })}`);
	}

	const imported = await service.importUnitContent({
		...scoped,
		source,
		sourceWorkspace: workspace,
		worktreeId,
		name: "Imported",
	});
	const importedUnitId = imported.result?.unitId;
	if (typeof importedUnitId !== "string" || imported.result?.kind !== "sheet") {
		throw new Error(`import Unit failed: ${JSON.stringify(imported)}`);
	}

	const selected = await service.status({ ...scoped, worktreeId });
	if (selected.result?.selectedWorktree?.units?.length !== 3) {
		throw new Error(`worktree status did not return explicit Units: ${JSON.stringify(selected)}`);
	}
	const inspected = await service.inspectUnitContent({ ...scoped, worktreeId, unitId, range: "A1:B2" });
	const values = inspected.result?.ranges?.[0]?.displayValues;
	if (values?.[0]?.[0] !== "bundled" || values?.[1]?.[0] !== "left" || values?.[1]?.[1] !== "right") {
		throw new Error(`package-local inspect failed: ${JSON.stringify(inspected)}`);
	}
	const inspectedImport = await service.inspectUnitContent({ ...scoped, worktreeId, unitId: importedUnitId, range: "A1:B3" });
	if (inspectedImport.result?.ranges?.[0]?.displayValues?.[1]?.[0] !== "alpha") {
		throw new Error(`import readback failed: ${JSON.stringify(inspectedImport)}`);
	}

	const found = await service.apiReference({ action: "find", queries: ["setValue"], unit: "sheet", limit: 3 });
	if (found.result?.[0]?.matches?.[0]?.label !== "FRange.setValue") throw new Error(`API find failed: ${JSON.stringify(found)}`);
	const reference = await service.apiReference({ action: "show", queries: ["FRange.setValue"] });
	if (reference.result?.[0]?.status !== "found") throw new Error(`API reference failed: ${JSON.stringify(reference)}`);

	await service.exportUnitContent({ ...scoped, worktreeId, unitId, output: exported, outputWorkspace: workspace });
	if ((await stat(exported)).size === 0) throw new Error("package-local export produced an empty file");

	await expectTransition(worktreeId, "ready", "ready");
	await expectTransition(worktreeId, "reopen", "draft");
	await expectTransition(worktreeId, "ready", "ready");
	await expectTransition(worktreeId, "merge", "merged");
	const merged = await service.status(scoped);
	if (merged.result?.trunk?.units?.length !== 3) throw new Error(`merge did not publish Units: ${JSON.stringify(merged)}`);

	const disposable = await service.worktree({ ...scoped, action: "create", name: "discard me" });
	const disposableId = disposable.result?.worktreeId;
	if (typeof disposableId !== "string") throw new Error(`disposable worktree failed: ${JSON.stringify(disposable)}`);
	const discarded = await service.worktreeAction({ ...scoped, action: "discard", worktreeId: disposableId });
	if (!discarded.ok || discarded.state.worktrees.find((entry) => entry.worktreeId === disposableId)?.status !== "discarded") {
		throw new Error(`discard transition failed: ${JSON.stringify(discarded)}`);
	}

	console.log("integration smoke OK (new/status/Unit/import/API/execute/inspect/export/lint/compile-svg/Worktree lifecycle, no global CLI)");
} finally {
	await service.dispose();
	await new Promise((resolve, reject) => foreign.close((error) => error === undefined ? resolve() : reject(error)));
	await rm(scratch, { recursive: true, force: true });
}

async function reservePort() {
	const server = createNetServer();
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (address === null || typeof address === "string") throw new Error("failed to reserve a TCP port");
	await new Promise((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
	return address.port;
}

async function expectTransition(worktreeId, action, expectedStatus) {
	const result = await service.worktree({ ...scoped, action, worktreeId });
	const status = await service.status({ ...scoped, worktreeId });
	if (!result.ok || status.result?.selectedWorktree?.status !== expectedStatus) {
		throw new Error(`${action} transition failed: ${JSON.stringify({ result, status })}`);
	}
}
