/**
 * DSH × Univer integration plugin — node half.
 *
 * Runs inside the DSH host (Node process of the app). Owns the univer CLI
 * lifecycle for the preview UI: locating the CLI, reporting daemon/gateway
 * status, and starting the daemon on demand.
 *
 * Exposes these operations to the browser half over a loopback HTTP route
 * (`/api/univer/*`) registered on the host web server — the client-side
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

/** Run a command with a bounded timeout, never throwing. */
function run(cmd, args, timeoutMs = 15000) {
	return new Promise((resolve) => {
		execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
			if (error) resolve({ ok: false, stdout: String(stdout), stderr: String(stderr) });
			else resolve({ ok: true, stdout: String(stdout), stderr: String(stderr) });
		});
	});
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
 * daemon start. Registering through the cordis Service base provides the
 * `univer` service (Typert markers included for future generated clients).
 */
class UniverService extends TypertRemoteService {
	constructor(ctx, config = {}) {
		super(ctx, "univer");
		this.gatewayPorts = Array.isArray(config.gatewayPorts) && config.gatewayPorts.length > 0
			? config.gatewayPorts
			: DEFAULT_GATEWAY_PORTS;
		this.autoStartDaemon = config.autoStartDaemon !== false;
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

/** Loopback HTTP route: /api/univer/status (GET) and /api/univer/ensure-daemon (POST). */
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
			res.writeHead(404);
			res.end();
		} catch (error) {
			sendJson(res, 500, { ok: false, reason: error instanceof Error ? error.message : String(error) });
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
