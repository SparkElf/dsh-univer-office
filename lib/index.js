/**
 * DSH × Univer integration plugin — node half.
 *
 * Runs inside the DSH host (Node process of the app). Owns the univer CLI
 * lifecycle for the preview UI: locating the CLI, reporting daemon/gateway
 * status, starting the daemon on demand, and serving per-file worktree state
 * (lifecycle status + embedded Viewer deep-links) for the live floating
 * windows and the session-end merge panel.
 *
 * Exposes these operations to the browser half over loopback HTTP routes
 * (`/univer-api/*`) registered on the host web server — the client-side
 * Typert remote namespace table is generated at compile time, so a plugin
 * cannot add a namespace at runtime; an HTTP endpoint is the stable seam.
 */
import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

/** Ports probed for an already-running univer daemon. */
const DEFAULT_GATEWAY_PORTS = [8000, 9123];
/** Known global install locations probed when `univer` is not on PATH. */
const GLOBAL_CANDIDATES = [
	join(homedir(), ".hermes/node/lib/node_modules/univer-cli/bin/univer.js"),
	join(homedir(), ".local/bin/univer")
];
/** Absolute node binaries used to drive the CLI when PATH has no node. */
const NODE_CANDIDATES = [
	join(homedir(), ".hermes/node/bin/node"),
	join(homedir(), ".local/bin/node")
];

/** How long a computed file state stays fresh; the client polls below this cadence. */
const STATE_TTL_MS = 1000;
/** How long a worktree unit list stays fresh (same poll cadence, coarser TTL). */
const UNITS_TTL_MS = 5000;
/** How long trunk unit names stay fresh (labels change rarely). */
const TRUNK_TTL_MS = 10000;

/** Run a command with a bounded timeout, never throwing. */
function run(cmd, args, timeoutMs = 15000) {
	return new Promise((resolve) => {
		execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
			if (error) resolve({ ok: false, stdout: String(stdout), stderr: String(stderr) });
			else resolve({ ok: true, stdout: String(stdout), stderr: String(stderr) });
		});
	});
}

/** Run a univer command expecting `--json` stdout; null on any failure. */
async function univerJson(args, timeoutMs = 30000) {
	const result = await run("univer", args, timeoutMs);
	if (!result.ok) return null;
	try {
		return JSON.parse(result.stdout);
	} catch (error) {
		return null;
	}
}

/** Gateway file key: base64url of the absolute .univer path (contract-shared encoding). */
function fileKeyOf(absPath) {
	return Buffer.from(absPath, "utf8").toString("base64url");
}

/** Probe candidate gateway origins; first HTTP 200 wins. */
async function probeGateway(ports) {
	for (const port of ports) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
			if (response.ok) return `http://127.0.0.1:${port}`;
		} catch (error) {
			/* unreachable port — try next */
		}
	}
	return null;
}

/** Spawn a detached background process (daemon outlives the host). */
function spawnDetached(cmd, args) {
	try {
		const child = spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true });
		child.unref();
	} catch (error) {
		/* caller handles readiness failure */
	}
}

/**
 * Univer service: CLI location, daemon status, gateway discovery, on-demand
 * daemon start, and per-file worktree state for the browser half.
 * Registering through the cordis Service base provides the `univer` service
 * (Typert markers included for future generated clients).
 */
class UniverService extends TypertRemoteService {
	constructor(ctx, config = {}) {
		super(ctx, "univer");
		this.gatewayPorts = Array.isArray(config.gatewayPorts) && config.gatewayPorts.length > 0
			? config.gatewayPorts
			: DEFAULT_GATEWAY_PORTS;
		this.autoStartDaemon = config.autoStartDaemon !== false;
		this.stateCache = new Map();
		this.unitsCache = new Map();
		this.trunkCache = new Map();
	}

	/** Locate a usable univer CLI: PATH first, then absolute node + script. */
	async locateCli() {
		const pathProbe = await run("univer", ["--version"]);
		if (pathProbe.ok) {
			return {
				ok: true,
				version: (pathProbe.stdout.trim().split(/\s+/)[1] ?? "unknown"),
				cliPath: "univer (PATH)",
				command: ["univer"],
				source: "global"
			};
		}
		// The app host often runs with a bare PATH (no node), so drive the CLI
		// with an absolute node binary instead of relying on `env node`.
		for (const node of NODE_CANDIDATES) {
			for (const candidate of GLOBAL_CANDIDATES) {
				const probe = await run(node, [candidate, "--version"]);
				if (probe.ok) {
					return {
						ok: true,
						version: (probe.stdout.trim().split(/\s+/)[1] ?? "unknown"),
						cliPath: `${node} ${candidate}`,
						command: [node, candidate],
						source: "global"
					};
				}
			}
		}
		return { ok: false, reason: "univer CLI not found (not on PATH, not in known global locations)" };
	}

	/** Report the installed CLI version and how it was located. */
	async cliInfo() {
		return this.locateCli();
	}

	/** Gateway origin of a running daemon, or null. */
	async gatewayUrl() {
		return probeGateway(this.gatewayPorts);
	}

	/** Whether a daemon gateway is currently reachable. */
	async daemonStatus() {
		const gateway = await probeGateway(this.gatewayPorts);
		return gateway === null
			? { running: false, gateway: null }
			: { running: true, gateway };
	}

	/**
	 * Daemon + gateway facts. The CLI's `daemon status --json` is authoritative
	 * (it reports the exact gateway origin and state); the port probe is the
	 * fallback for hosts where the daemon socket is unreachable but the gateway
	 * is up.
	 */
	async daemonInfo() {
		const status = await univerJson(["daemon", "status", "--json"], 30000);
		if (status !== null && status.gateway !== null && typeof status.gateway === "object"
			&& typeof status.gateway.origin === "string") {
			return { running: status.gateway.state === "running", gateway: status.gateway.origin };
		}
		const gateway = await probeGateway(this.gatewayPorts);
		return gateway === null ? { running: false, gateway: null } : { running: true, gateway };
	}

	/** Start the daemon on demand; reuse an already-running one. */
	async ensureDaemon() {
		const existing = await probeGateway(this.gatewayPorts);
		if (existing !== null) return { ok: true, gateway: existing, reused: true };
		const info = await this.locateCli();
		if (!info.ok) return { ok: false, reason: info.reason };
		const command = info.command ?? [info.cliPath.startsWith("/") ? info.cliPath : "univer"];
		spawnDetached(command[0], [...command.slice(1), "daemon", "start"]);
		for (let attempt = 0; attempt < 20; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			const gateway = await probeGateway(this.gatewayPorts);
			if (gateway !== null) return { ok: true, gateway, reused: false };
		}
		return { ok: false, reason: "daemon did not become ready within 20s" };
	}

	/**
	 * Per-file worktree state for the browser half: worktree list with
	 * lifecycle status and embedded Viewer deep-links. The gateway HTTP API is
	 * the primary source (it is what the Viewer itself renders, and it picks
	 * up CLI writes immediately); `univer worktree list --json` is the
	 * fallback when the gateway is unreachable. Cached briefly — the client
	 * polls on a sub-second cadence, so repeated requests must not spawn CLI
	 * processes or hammer the gateway.
	 * @param file - absolute .univer path.
	 * @returns the same promise for concurrent callers inside the TTL window.
	 */
	async state(file) {
		const cached = this.stateCache.get(file);
		if (cached !== undefined && Date.now() - cached.at < STATE_TTL_MS) return cached.value;
		const promise = this.computeState(file);
		this.stateCache.set(file, { at: Date.now(), value: promise });
		return promise;
	}

	/** One worktree entry: identity + lifecycle status + units + deep-links. */
	worktreeEntry(gateway, fileKey, file, worktree, units) {
		const entry = {
			worktreeId: worktree.worktreeId,
			name: typeof worktree.name === "string" ? worktree.name : "",
			status: worktree.status
		};
		if (Array.isArray(units)) entry.units = units;
		if (gateway === null) return entry;
		const base = `${gateway}/?file=${encodeURIComponent(fileKey)}`;
		const wid = encodeURIComponent(worktree.worktreeId);
		// draft/ready are the only viewable statuses; the Viewer's embedded
		// mode renders read-only worktree scope (live) and the read-only
		// merge preview (scope=mergePreview), and falls back to trunk once a
		// worktree is merged (terminal). The unit is chosen client-side from
		// the units list (a worktree may touch several units).
		if (worktree.status === "draft" || worktree.status === "ready") {
			entry.worktreeUrl = `${base}&worktree=${wid}&mode=embedded&scope=worktree`;
		}
		if (worktree.status === "ready") {
			entry.mergeUrl = `${base}&worktree=${wid}&mode=embedded&scope=mergePreview`;
		}
		if (worktree.status === "merged") {
			entry.trunkUrl = `${base}&mode=embedded&scope=trunk`;
		}
		return entry;
	}

	/**
	 * The CHANGED unit list of one worktree view (the client renders
	 * navigation chips): only added / modified / deleted / conflict units,
	 * with the change kind. The gateway merge-preview endpoint is the primary
	 * source (per-unit merge status + names, same data the Viewer shows); the
	 * CLI baseline diff is the fallback (deleted units then lack names).
	 * Cached briefly — same poll cadence as the state route.
	 */
	async unitsOf(file, worktreeId) {
		const key = `${file}\u0000${worktreeId}`;
		const cached = this.unitsCache.get(key);
		if (cached !== undefined && Date.now() - cached.at < UNITS_TTL_MS) return cached.value;
		let value = null;
		const daemon = await this.daemonInfo();
		if (daemon.gateway !== null) {
			try {
				const response = await fetch(
					`${daemon.gateway}/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId)}/preview`,
					{ signal: AbortSignal.timeout(3000) }
				);
				if (response.ok) {
					const body = await response.json();
					if (body !== null && body.error !== null && typeof body.error === "object"
						&& body.error.code === 1 && Array.isArray(body.units)) {
						value = body.units
							.filter((unit) => unit.status !== "unchanged")
							.map((unit) => ({
								unitId: unit.unitId,
								name: typeof unit.name === "string" ? unit.name : "",
								type: unit.type,
								kind: unit.status === "created" ? "added"
									: unit.status === "modified" ? "modified"
										: unit.status === "deleted" ? "deleted"
											: "conflict"
							}));
					}
				}
			} catch (error) {
				/* gateway unreachable — fall through to the CLI diff */
			}
		}
		if (value === null) {
			const status = await univerJson(["status", file, "--worktree", worktreeId, "--json"], 30000);
			value = [];
			if (status !== null) {
				const baseline = status.worktree !== null && typeof status.worktree === "object"
					&& status.worktree.baseline !== null && typeof status.worktree.baseline === "object"
					? status.worktree.baseline
					: {};
				const units = Array.isArray(status.units) ? status.units : [];
				// Presence set: EVERY unit in the worktree view, changed or not.
				// Only baseline entries missing from it are genuinely deleted.
				const seen = new Set();
				for (const unit of units) seen.add(unit.unitId);
				for (const unit of units) {
					const baseRev = baseline[unit.unitId];
					let kind = null;
					if (baseRev === undefined) kind = "added";
					else if (typeof baseRev === "number" && unit.headRev > baseRev) kind = "modified";
					if (kind === null) continue;
					value.push({
						unitId: unit.unitId,
						name: typeof unit.name === "string" ? unit.name : "",
						type: unit.type,
						kind
					});
				}
				for (const unitId of Object.keys(baseline)) {
					if (seen.has(unitId)) continue;
					value.push({ unitId, name: "", type: null, kind: "deleted" });
				}
				// Deleted units have no name in the baseline; resolve them from
				// the trunk unit list so the chips show a real label.
				if (value.some((unit) => unit.name === "")) {
					const names = await this.trunkNames(file);
					value = value.map((unit) => (unit.name === "" && typeof names[unit.unitId] === "string" && names[unit.unitId] !== ""
						? { ...unit, name: names[unit.unitId] }
						: unit));
				}
			}
		}
		this.unitsCache.set(key, { at: Date.now(), value });
		return value;
	}

	/**
	 * Trunk unit names (unitId → name) for one .univer file; used to label
	 * deleted units, whose names the worktree baseline cannot provide.
	 * Cached with a coarse TTL — names change rarely.
	 */
	async trunkNames(file) {
		const cached = this.trunkCache.get(file);
		if (cached !== undefined && Date.now() - cached.at < TRUNK_TTL_MS) return cached.value;
		const status = await univerJson(["status", file, "--json"], 30000);
		const map = {};
		if (status !== null && Array.isArray(status.units)) {
			for (const unit of status.units) {
				map[unit.unitId] = typeof unit.name === "string" ? unit.name : "";
			}
		}
		this.trunkCache.set(file, { at: Date.now(), value: map });
		return map;
	}

	/** Compute fresh state for one .univer file (gateway first, CLI fallback). */
	async computeState(file) {
		const key = fileKeyOf(file);
		const daemon = await this.daemonInfo();
		let worktrees = null;
		if (daemon.gateway !== null) {
			try {
				const response = await fetch(`${daemon.gateway}/uf/${key}/worktrees`, { signal: AbortSignal.timeout(3000) });
				if (response.ok) {
					const body = await response.json();
					if (body !== null && Array.isArray(body.worktrees)) worktrees = body.worktrees;
				}
			} catch (error) {
				/* gateway unreachable — fall through to the CLI */
			}
		}
		if (worktrees === null) {
			const list = await univerJson(["worktree", "list", file, "--json"], 15000);
			worktrees = list !== null && Array.isArray(list.worktrees) ? list.worktrees : [];
		}
		const units = await Promise.all(worktrees.map((worktree) => {
			if (worktree.status === "draft" || worktree.status === "ready") {
				return this.unitsOf(file, worktree.worktreeId);
			}
			return Promise.resolve([]);
		}));
		return {
			ok: true,
			file,
			gateway: daemon.gateway,
			daemonRunning: daemon.running,
			worktrees: worktrees.map((worktree, index) => this.worktreeEntry(daemon.gateway, key, file, worktree, units[index]))
		};
	}

	/**
	 * Human review decision: mark ready / merge / reopen / discard one worktree, then the
	 * refreshed state (bypassing the poll cache so the panel re-renders the
	 * post-action truth immediately). The CLI reports success as
	 * `{filePath,status}` / `{merged:true,revisions}` and a merge conflict as
	 * `{merged:false,failedUnit}`; the failure envelope is `{ok:false,error}`.
	 */
	async worktreeAction(action, file, worktree) {
		const result = await run("univer", ["worktree", action, file, "--worktree", worktree, "--json"], 60000);
		const nextState = await this.computeState(file).catch((error) => ({
			ok: false,
			reason: error instanceof Error ? error.message : String(error),
			worktrees: []
		}));
		if (!result.ok) return { ok: false, reason: "univer command failed", state: nextState };
		let parsed = null;
		try {
			parsed = JSON.parse(result.stdout);
		} catch (error) {
			/* non-JSON output */
		}
		if (parsed !== null && parsed.ok === false) {
			const message = parsed.error !== null && typeof parsed.error === "object"
				&& typeof parsed.error.message === "string" ? parsed.error.message : "";
			return { ok: false, reason: message !== "" ? message : "univer rejected the action", state: nextState };
		}
		if (action === "merge" && parsed !== null && parsed.merged === false) {
			return { ok: false, reason: `merge conflict in unit ${String(parsed.failedUnit ?? "unknown")}`, state: nextState };
		}
		return { ok: true, action, worktree, state: nextState };
	}
}

// ── manual Typert markers (equivalent to `@Remote("name")` decorators) ──────
function remoteMethod(proto, name, exportName) {
	const context = {
		kind: "method",
		name,
		static: false,
		private: false,
		access: { has: (obj) => name in obj, get: (obj) => obj[name] },
		metadata: typeof Symbol === "function" && Symbol.metadata
			? Object.create(proto.constructor[Symbol.metadata] ?? null)
			: void 0,
		addInitializer(fn) {
			fn.call(Object.create(proto));
		}
	};
	(exportName === void 0 ? Remote(name) : Remote(exportName))(proto[name], context);
}
remoteMethod(UniverService.prototype, "cliInfo");
remoteMethod(UniverService.prototype, "gatewayUrl");
remoteMethod(UniverService.prototype, "daemonStatus");
remoteMethod(UniverService.prototype, "ensureDaemon");

/** Send a JSON response. */
function sendJson(res, status, payload) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" });
	res.end(JSON.stringify(payload));
}

/** Read a small JSON request body. */
async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	if (chunks.length === 0) return {};
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch (error) {
		return {};
	}
}

/**
 * Loopback HTTP routes: /univer-api/status (GET), /univer-api/ensure-daemon
 * (POST), /univer-api/state?file=<abs .univer path> (GET, worktrees with
 * lifecycle status and Viewer deep-links), and /univer-api/worktree-action
 * (POST { action: ready|merge|reopen|discard, file, worktree } — the human review
 * decisions the merge panel exposes).
 */
function createApiHandler(service) {
	return async (req, res) => {
		let pathname = "/";
		try {
			pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
		} catch (error) {
			/* keep "/" */
		}
		try {
			if (req.method === "GET" && pathname === "/univer-api/status") {
				const [daemon, cli] = await Promise.all([service.daemonStatus(), service.locateCli()]);
				sendJson(res, 200, { daemon, cli });
				return;
			}
			if (req.method === "POST" && pathname === "/univer-api/ensure-daemon") {
				const result = await service.ensureDaemon();
				sendJson(res, 200, result);
				return;
			}
			if (req.method === "GET" && pathname === "/univer-api/state") {
				const file = new URL(req.url ?? "/", "http://x").searchParams.get("file");
				if (typeof file !== "string" || file === "") {
					sendJson(res, 400, { ok: false, reason: "file query parameter is required", worktrees: [] });
					return;
				}
				sendJson(res, 200, await service.state(file));
				return;
			}
			if (req.method === "POST" && pathname === "/univer-api/worktree-action") {
				const body = await readJsonBody(req);
				const { action, file, worktree } = body;
				if (action !== "merge" && action !== "reopen" && action !== "discard" && action !== "ready") {
					sendJson(res, 400, { ok: false, reason: "action must be merge | reopen | discard | ready" });
					return;
				}
				if (typeof file !== "string" || file === "" || typeof worktree !== "string" || worktree === "") {
					sendJson(res, 400, { ok: false, reason: "file and worktree are required" });
					return;
				}
				sendJson(res, 200, await service.worktreeAction(action, file, worktree));
				return;
			}
			res.writeHead(404);
			res.end();
		} catch (error) {
			sendJson(res, 500, { ok: false, reason: error instanceof Error ? error.message : String(error), worktrees: [] });
		}
	};
}

/** Services required by the node half. */
const inject = ["webServer"];

/** Plugin entry: instantiate the service and register the loopback API route. */
function apply(ctx, config) {
	const service = new UniverService(ctx, config);
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/univer-api",
		handler: createApiHandler(service)
	}), "univer: api route");
	return () => {
		/* service disposal is owned by the cordis fiber */
	};
}
export { UniverService, apply, inject };
