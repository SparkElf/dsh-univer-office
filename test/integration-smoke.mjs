import { mkdtemp, rm, stat } from "node:fs/promises";
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
const file = join(scratch, "smoke.univer");
const fileKey = Buffer.from(file, "utf8").toString("base64url");
const foreign = createHttpServer((_request, response) => response.end("not a Univer Gateway"));
await new Promise((resolve, reject) => {
	foreign.once("error", reject);
	foreign.listen(0, "127.0.0.1", resolve);
});
const foreignAddress = foreign.address();
if (foreignAddress === null || typeof foreignAddress === "string") throw new Error("foreign server did not receive a TCP port");
const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;
const exported = join(scratch, "smoke.xlsx");
const service = new GatewayUniverService(new Context(), resolveConfig({ gatewayPorts: [foreignAddress.port, port], tools: false }));

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

	const created = await service.createFile({ file, kind: "sheet", name: "Smoke" });
	if (!created.ok || created.operation !== "create") throw new Error(`create content failed: ${JSON.stringify(created)}`);
	if (typeof created.result?.unitID !== "string") throw new Error(`create Unit failed: ${JSON.stringify(created)}`);
	const unitId = created.result.unitID;

	const worktreeOperation = await service.createWorktree(file, "integration smoke");
	const worktree = worktreeOperation.result;
	if (worktree === null || typeof worktree !== "object" || Array.isArray(worktree)
		|| typeof worktree.worktreeId !== "string" || worktree.status !== "draft") {
		throw new Error(`create worktree failed: ${JSON.stringify(worktree)}`);
	}
	const executed = await service.executeUnitContent({
		file,
		worktreeId: worktree.worktreeId,
		unitId,
		code: 'workbook.getActiveSheet().getRange("A1").setValue("bundled"); return "ok";',
	});
	if (executed.result?.committed !== true || executed.result?.value !== "ok") {
		throw new Error(`package-local execute failed: ${JSON.stringify(executed)}`);
	}
	const [leftExecution, rightExecution] = await Promise.all([
		service.executeUnitContent({
			file,
			worktreeId: worktree.worktreeId,
			unitId,
			code: 'workbook.getActiveSheet().getRange("A2").setValue("left"); return "left";',
		}),
		service.executeUnitContent({
			file,
			worktreeId: worktree.worktreeId,
			unitId,
			code: 'workbook.getActiveSheet().getRange("B2").setValue("right"); return "right";',
		}),
	]);
	if (leftExecution.result?.committed !== true || leftExecution.result?.value !== "left"
		|| rightExecution.result?.committed !== true || rightExecution.result?.value !== "right") {
		throw new Error(`concurrent Collaboration SDK execution failed: ${JSON.stringify({ leftExecution, rightExecution })}`);
	}
	const inspected = await service.inspectUnitContent({
		file,
		worktreeId: worktree.worktreeId,
		unitId,
		range: "A1:B2",
	});
	const values = inspected.result?.ranges?.[0]?.displayValues;
	if (values?.[0]?.[0] !== "bundled" || values?.[1]?.[0] !== "left" || values?.[1]?.[1] !== "right") {
		throw new Error(`package-local inspect failed: ${JSON.stringify(inspected)}`);
	}
	await service.exportUnitContent({
		file,
		worktreeId: worktree.worktreeId,
		unitId,
		output: exported,
	});
	if ((await stat(exported)).size === 0) {
		throw new Error("package-local export produced an empty file");
	}

	await expectAction(worktree.worktreeId, "ready", "ready");
	await expectAction(worktree.worktreeId, "reopen", "draft");
	await expectAction(worktree.worktreeId, "discard", "discarded");
	const listed = await fetch(`${origin}/uf/${fileKey}/worktrees`);
	const listing = await listed.json();
	const discarded = listing.worktrees?.find((entry) => entry.worktreeId === worktree.worktreeId);
	if (!listed.ok || discarded?.status !== "discarded") {
		throw new Error(`discard transition failed: ${JSON.stringify(listing)}`);
	}

	console.log("integration smoke OK (Viewer + Gateway + concurrent SDK workers + Worktree lifecycle, no global CLI)");
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

async function expectAction(worktreeId, action, expectedStatus) {
	const result = await service.worktreeAction({ action, file, worktreeId });
	const entry = result.state?.worktrees?.find((worktree) => worktree.worktreeId === worktreeId);
	if (!result.ok || (expectedStatus !== undefined && entry?.status !== expectedStatus)) {
		throw new Error(`${action} transition failed: ${JSON.stringify(result)}`);
	}
}
