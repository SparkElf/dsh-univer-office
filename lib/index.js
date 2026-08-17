var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name5 in all)
    __defProp(target, name5, { get: all[name5], enumerable: true });
};

// src/host/config.ts
import z from "@deepseek-ai/schemastery";
var Config = z.object({
  gatewayPorts: z.array(z.natural().max(65535)).default([9123, 8e3]),
  autoStartGateway: z.boolean().default(true),
  gatewayStartupTimeoutMs: z.natural().default(1e4),
  gatewayRequestTimeoutMs: z.natural().default(3e3),
  gatewayMutationTimeoutMs: z.natural().default(6e4),
  unitContentOperationTimeoutMs: z.natural().default(12e4),
  unitContentCommitTimeoutMs: z.natural().default(5e3),
  stateCacheTtlMs: z.natural().default(1e3),
  unitCacheTtlMs: z.natural().default(5e3),
  tools: z.boolean().default(true)
});
function resolveConfig(config = {}) {
  const resolved = {
    gatewayPorts: config.gatewayPorts ?? [9123, 8e3],
    autoStartGateway: config.autoStartGateway ?? true,
    gatewayStartupTimeoutMs: config.gatewayStartupTimeoutMs ?? 1e4,
    gatewayRequestTimeoutMs: config.gatewayRequestTimeoutMs ?? 3e3,
    gatewayMutationTimeoutMs: config.gatewayMutationTimeoutMs ?? 6e4,
    unitContentOperationTimeoutMs: config.unitContentOperationTimeoutMs ?? 12e4,
    unitContentCommitTimeoutMs: config.unitContentCommitTimeoutMs ?? 5e3,
    stateCacheTtlMs: config.stateCacheTtlMs ?? 1e3,
    unitCacheTtlMs: config.unitCacheTtlMs ?? 5e3,
    tools: config.tools ?? true
  };
  if (resolved.gatewayPorts.length === 0) throw new Error("univer: gatewayPorts must not be empty");
  for (const port of resolved.gatewayPorts) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("univer: every Gateway port must be an integer between 1 and 65535");
    }
  }
  for (const [name5, value] of Object.entries({
    gatewayStartupTimeoutMs: resolved.gatewayStartupTimeoutMs,
    gatewayRequestTimeoutMs: resolved.gatewayRequestTimeoutMs,
    gatewayMutationTimeoutMs: resolved.gatewayMutationTimeoutMs,
    unitContentOperationTimeoutMs: resolved.unitContentOperationTimeoutMs,
    unitContentCommitTimeoutMs: resolved.unitContentCommitTimeoutMs,
    stateCacheTtlMs: resolved.stateCacheTtlMs,
    unitCacheTtlMs: resolved.unitCacheTtlMs
  })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`univer: ${name5} must be a positive integer`);
  }
  return resolved;
}

// src/host/provider/plugin.ts
var plugin_exports = {};
__export(plugin_exports, {
  apply: () => apply,
  name: () => name
});

// src/host/service/errors.ts
var UniverError = class extends Error {
  /** Stable machine-readable failure code. */
  code;
  /** Create a classified Univer error. */
  constructor(message, code, options) {
    super(message, options);
    this.name = "UniverError";
    this.code = code;
  }
};

// src/host/adapters/gateway/client.ts
var GatewayClient = class {
  constructor(origin, timeoutMs) {
    this.origin = origin;
    this.timeoutMs = timeoutMs;
  }
  origin;
  timeoutMs;
  /** Execute a JSON GET request. */
  async get(path) {
    return this.request(path, "GET");
  }
  /** Execute a JSON POST request. */
  async post(path, body = {}) {
    return this.request(path, "POST", body);
  }
  async request(path, method, body) {
    const response = await fetch(`${this.origin}${path}`, {
      method,
      ...body === void 0 ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    let value;
    try {
      value = await response.json();
    } catch (error) {
      throw new UniverError(`Gateway returned invalid JSON for ${method} ${path}`, "GATEWAY_INVALID_RESPONSE", { cause: error });
    }
    if (!response.ok) {
      const message = gatewayErrorMessage(value) ?? `Gateway HTTP ${String(response.status)}`;
      throw new UniverError(message, "GATEWAY_REQUEST_FAILED");
    }
    return value;
  }
};
function gatewayErrorMessage(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const error = value.error;
  if (typeof error !== "object" || error === null || Array.isArray(error)) return null;
  return typeof error.message === "string" && error.message.length > 0 ? error.message : null;
}

// src/host/adapters/gateway/file-api.ts
function fileKeyOf(file) {
  return Buffer.from(file, "utf8").toString("base64url");
}
var GatewayFileApi = class {
  constructor(client) {
    this.client = client;
  }
  client;
  /** Return the raw worktree listing for one file. */
  listWorktrees(file) {
    return this.client.get(`/uf/${fileKeyOf(file)}/worktrees`);
  }
  /** Return trunk Units for one file. */
  listUnits(file) {
    return this.client.get(`/uf/${fileKeyOf(file)}/units`);
  }
  /** Create an empty Univer file in the bundled collaboration store. */
  create(file) {
    return this.client.post(`/uf/${fileKeyOf(file)}`, {});
  }
  /** Create the first trunk Unit after the file container exists. */
  createUnit(file, kind, name5) {
    return this.client.post(
      `/uf/${fileKeyOf(file)}/universer-api/snapshot/${String(unitType(kind))}/unit/-/create`,
      { name: name5 }
    );
  }
};
function unitType(kind) {
  if (kind === "doc") return 1;
  if (kind === "sheet") return 2;
  if (kind === "slide") return 3;
  if (kind === "base") return 5;
  return 6;
}

// src/host/adapters/gateway/worktree-api.ts
var GatewayWorktreeApi = class {
  constructor(client) {
    this.client = client;
  }
  client;
  /** Return merge-preview metadata for one worktree. */
  preview(file, worktreeId2) {
    return this.client.get(`/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId2)}/preview`);
  }
  /** Create an isolated worktree for agent edits. */
  create(file, name5) {
    return this.client.post(`/uf/${fileKeyOf(file)}/worktrees`, {
      agentId: "dsh-agent",
      name: name5 ?? "DSH agent worktree"
    });
  }
  /** Return Units visible inside one worktree. */
  listUnits(file, worktreeId2) {
    return this.client.get(`/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId2)}/units`);
  }
  /** Apply one human review decision. */
  action(file, worktreeId2, action) {
    return this.client.post(`/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId2)}/${action}`);
  }
};

// src/host/adapters/gateway/mapping.ts
function mapWorktrees(value) {
  if (!isRecord(value) || !Array.isArray(value.worktrees)) return [];
  return value.worktrees.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.worktreeId !== "string" || !isWorktreeStatus(entry.status)) return [];
    return [{ worktreeId: entry.worktreeId, name: typeof entry.name === "string" ? entry.name : "", status: entry.status }];
  });
}
function mapUnits(value) {
  if (!isRecord(value) || !Array.isArray(value.units)) return [];
  return value.units.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.unitId !== "string" || typeof entry.type !== "number") return [];
    return [{
      unitId: entry.unitId,
      name: typeof entry.name === "string" ? entry.name : "",
      type: entry.type
    }];
  });
}
function mapChangedUnits(value) {
  if (!isRecord(value) || !Array.isArray(value.units)) return [];
  return value.units.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.unitId !== "string" || entry.status === "unchanged") return [];
    const kind = changeKind(entry.status);
    if (kind === null) return [];
    return [{
      unitId: entry.unitId,
      name: typeof entry.name === "string" ? entry.name : "",
      type: unitKind(entry.type),
      kind
    }];
  });
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isWorktreeStatus(value) {
  return value === "draft" || value === "ready" || value === "merged" || value === "discarded";
}
function changeKind(value) {
  if (value === "created") return "added";
  if (value === "modified") return "modified";
  if (value === "deleted") return "deleted";
  if (value === "conflict") return "conflict";
  return null;
}
function unitKind(value) {
  if (value === 1) return "doc";
  if (value === 2) return "sheet";
  if (value === 3) return "slide";
  if (value === 5) return "base";
  if (value === 6) return "board";
  return null;
}

// src/host/service/univer-service.ts
import { Service } from "@deepseek-ai/cordis";
var UniverService = class extends Service {
  constructor(ctx) {
    super(ctx, "univer");
  }
};

// src/host/processes/gateway/gateway-process.ts
import { spawn } from "node:child_process";

// src/host/processes/gateway/launcher.ts
import { delimiter } from "node:path";

// src/host/artifacts/paths.ts
import { fileURLToPath } from "node:url";
var GATEWAY_ENTRY = fileURLToPath(new URL("../vendor/collaboration/artifacts/gateway.mjs", import.meta.url));
var VIEWER_ROOT = fileURLToPath(new URL("../vendor/collaboration/artifacts/viewer/", import.meta.url));
var UNIT_CONTENT_WORKER_ENTRY = fileURLToPath(new URL("../vendor/unit-content/artifacts/unit-content-worker.mjs", import.meta.url));
var UNIT_CONTENT_NODE_MODULES = fileURLToPath(new URL("../vendor/unit-content/artifacts/node_modules/", import.meta.url));
var FORMULA_BINDING_PATH = fileURLToPath(new URL(
  `../vendor/unit-content/artifacts/node_modules/@univerjs-pro/engine-formula-rust-binding-${formulaTarget()}/univer-formula.${formulaTarget()}.node`,
  import.meta.url
));
function formulaTarget() {
  const target = (/* @__PURE__ */ new Map([
    ["darwin-arm64", "darwin-arm64"],
    ["linux-x64", "linux-x64-gnu"],
    ["linux-arm64", "linux-arm64-gnu"],
    ["win32-x64", "win32-x64-msvc"]
  ])).get(`${process.platform}-${process.arch}`);
  if (target === void 0) throw new Error(`univer: unsupported formula platform ${process.platform}-${process.arch}`);
  return target;
}

// src/host/processes/gateway/launcher.ts
function gatewayLaunch(port) {
  const inherited = ["HOME", "LANG", "LC_ALL", "PATH", "TMPDIR"].flatMap((key) => {
    const value = process.env[key];
    return value === void 0 ? [] : [[key, value]];
  });
  return {
    command: process.execPath,
    args: [GATEWAY_ENTRY],
    options: {
      env: {
        ...Object.fromEntries(inherited),
        UNIVER_COLLAB_GATEWAY_PORT: String(port),
        UNIVER_VIEW_ASSETS_ROOT: VIEWER_ROOT,
        NAPI_RS_NATIVE_LIBRARY_PATH: FORMULA_BINDING_PATH,
        NODE_PATH: [UNIT_CONTENT_NODE_MODULES, process.env.NODE_PATH].filter((value) => value !== void 0 && value.length > 0).join(delimiter)
      },
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true
    }
  };
}

// src/host/processes/gateway/protocol.ts
async function gatewayIsHealthy(origin, timeoutMs) {
  try {
    const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return false;
    const html = await response.text();
    return html.includes("<title>Univer</title>") && html.includes('<div id="app"></div>');
  } catch (error) {
    if (error instanceof Error) return false;
    return false;
  }
}

// src/host/processes/gateway/gateway-process.ts
var GatewayProcess = class {
  child = null;
  /** Start on one port and wait until the Viewer health endpoint responds. */
  async start(port, startupTimeoutMs, probeTimeoutMs) {
    const launch = gatewayLaunch(port);
    const child = spawn(launch.command, [...launch.args], launch.options);
    this.child = child;
    const origin = `http://127.0.0.1:${String(port)}`;
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-4e3);
      if (process.env.UNIVER_DSH_GATEWAY_DEBUG === "1") process.stderr.write(chunk);
    });
    const startedAt = Date.now();
    while (Date.now() - startedAt < startupTimeoutMs) {
      if (child.exitCode !== null || child.signalCode !== null) {
        if (this.child === child) this.child = null;
        const detail = stderr.trim();
        return { ok: false, reason: detail || `bundled Gateway exited (${String(child.signalCode ?? child.exitCode ?? "unknown")})` };
      }
      await new Promise((resolve2) => setTimeout(resolve2, 200));
      if (child.exitCode !== null || child.signalCode !== null) continue;
      if (await gatewayIsHealthy(origin, probeTimeoutMs)) return { ok: true, gateway: origin, reused: false };
    }
    await this.stop();
    return { ok: false, reason: `bundled Gateway did not become ready within ${String(startupTimeoutMs)}ms` };
  }
  /** Stop only the child process this instance created. */
  async stop() {
    const child = this.child;
    this.child = null;
    if (child === null || child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise((resolve2) => child.once("exit", () => resolve2()));
    child.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve2) => setTimeout(resolve2, 3e3))]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
};

// src/host/processes/gateway/supervisor.ts
var GatewaySupervisor = class {
  constructor(config) {
    this.config = config;
  }
  config;
  process = new GatewayProcess();
  starting = null;
  lastFailure;
  ownedGateway = null;
  /** Return current Gateway availability without starting it. */
  async status() {
    if (this.starting !== null) return { phase: "starting", gateway: null, owned: false };
    if (this.ownedGateway !== null && await gatewayIsHealthy(this.ownedGateway, this.config.gatewayRequestTimeoutMs)) {
      return { phase: "running", gateway: this.ownedGateway, owned: true };
    }
    this.ownedGateway = null;
    if (this.lastFailure !== void 0) return { phase: "failed", gateway: null, owned: false, reason: this.lastFailure };
    return { phase: "stopped", gateway: null, owned: false };
  }
  /** Reuse this supervisor's healthy Gateway or start the vendored one once for concurrent callers. */
  async ensure() {
    if (this.ownedGateway !== null && await gatewayIsHealthy(this.ownedGateway, this.config.gatewayRequestTimeoutMs)) {
      return { ok: true, gateway: this.ownedGateway, reused: true };
    }
    this.ownedGateway = null;
    if (this.starting !== null) return this.starting;
    this.starting = this.start();
    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }
  async start() {
    let failure = "bundled Gateway did not start";
    for (const port of this.config.gatewayPorts) {
      const result = await this.process.start(port, this.config.gatewayStartupTimeoutMs, this.config.gatewayRequestTimeoutMs);
      if (result.ok) {
        this.ownedGateway = result.gateway;
        this.lastFailure = void 0;
        return result;
      }
      failure = result.reason;
    }
    this.lastFailure = failure;
    return { ok: false, reason: failure };
  }
  /** Stop the plugin-owned process and forget Gateway state. */
  async dispose() {
    await this.process.stop();
    this.ownedGateway = null;
    this.lastFailure = void 0;
  }
};

// src/host/provider/unit-content-operations.ts
import { isAbsolute, normalize } from "node:path";

// src/host/adapters/unit-content/worker.ts
import { spawn as spawn2 } from "node:child_process";

// src/host/adapters/unit-content/protocol.ts
function parseUnitContentWorkerEnvelope(value) {
  if (!isRecord2(value) || typeof value.ok !== "boolean") return null;
  if (value.ok === true && "result" in value) return value;
  if (value.ok !== false || !isRecord2(value.error)) return null;
  if (typeof value.error.code !== "string" || typeof value.error.message !== "string") return null;
  return value;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/host/adapters/unit-content/worker.ts
var UnitContentWorker = class {
  constructor(timeoutMs) {
    this.timeoutMs = timeoutMs;
  }
  timeoutMs;
  /** Run one request and return its JSON result. */
  async run(request, signal) {
    signal?.throwIfAborted();
    const child = spawn2(process.execPath, [UNIT_CONTENT_WORKER_ENTRY], {
      env: unitContentWorkerEnvironment(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    const completed = new Promise((resolve2, reject) => {
      child.once("error", reject);
      child.once("close", () => resolve2());
    });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, this.timeoutMs);
    const abort = () => {
      child.kill();
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stdin.end(JSON.stringify(request));
    try {
      await completed;
      signal?.throwIfAborted();
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
    if (timedOut) {
      throw new UniverError(`Unit content operation timed out after ${String(this.timeoutMs)}ms.`, "UNIT_CONTENT_WORKER_TIMEOUT");
    }
    let envelope;
    try {
      envelope = parseUnitContentWorkerEnvelope(JSON.parse(Buffer.concat(stdout).toString("utf8")));
    } catch (error) {
      throw new UniverError(workerDiagnostic(stderr, "Unit content worker returned invalid JSON."), "UNIT_CONTENT_WORKER_INVALID_RESPONSE", { cause: error });
    }
    if (envelope === null) {
      throw new UniverError(workerDiagnostic(stderr, "Unit content worker returned an invalid response."), "UNIT_CONTENT_WORKER_INVALID_RESPONSE");
    }
    if (!envelope.ok) throw new UniverError(envelope.error.message, envelope.error.code);
    return envelope.result;
  }
};
function workerDiagnostic(stderr, fallback) {
  const diagnostic = Buffer.concat(stderr).toString("utf8").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "").trim();
  if (diagnostic.length === 0) return fallback;
  const limit = 2e3;
  return `${fallback} ${diagnostic.length <= limit ? diagnostic : `${diagnostic.slice(0, limit)}\u2026`}`;
}
function unitContentWorkerEnvironment() {
  return Object.fromEntries(["HOME", "LANG", "LC_ALL", "PATH", "TMPDIR"].flatMap((key) => {
    const value = process.env[key];
    return value === void 0 ? [] : [[key, value]];
  }));
}

// src/host/service/identifiers.ts
function univerFilePath(value) {
  return value;
}
function worktreeId(value) {
  return value;
}

// src/host/provider/unit-content-operations.ts
function resolveUniverFile(value) {
  const file = normalize(value);
  if (!isAbsolute(file)) throw new UniverError("Univer file path must be absolute.", "INVALID_FILE_PATH");
  if (!file.toLowerCase().endsWith(".univer")) throw new UniverError("Univer file path must end in .univer.", "INVALID_FILE_PATH");
  return univerFilePath(file);
}
function resolveExportFile(value) {
  const file = normalize(value);
  if (!isAbsolute(file)) throw new UniverError("Export path must be absolute.", "INVALID_EXPORT_PATH");
  return file;
}
var UnitContentOperations = class {
  constructor(gatewayRequestTimeoutMs, unitContentCommitTimeoutMs, unitContentOperationTimeoutMs) {
    this.gatewayRequestTimeoutMs = gatewayRequestTimeoutMs;
    this.unitContentCommitTimeoutMs = unitContentCommitTimeoutMs;
    this.worker = new UnitContentWorker(unitContentOperationTimeoutMs);
  }
  gatewayRequestTimeoutMs;
  unitContentCommitTimeoutMs;
  worker;
  /** Inspect one file, unit, or Sheet range. */
  async inspect(gateway, request, signal) {
    const target = await this.resolveTarget(gateway, request.file, request.unitId, request.worktreeId);
    const result = await this.worker.run({
      ...target,
      operation: "inspect",
      query: inspectionQuery(target.unitType, request.range)
    }, signal);
    return { ok: true, operation: "inspect", file: request.file, result };
  }
  /** Execute Facade code and commit its mutations to a draft worktree. */
  async execute(gateway, file, code, worktreeId2, unitId, signal) {
    const target = await this.resolveTarget(gateway, file, unitId, worktreeId2);
    const result = await this.worker.run({ ...target, operation: "execute", code, worktreeId: worktreeId2 }, signal);
    return { ok: true, operation: "execute", file, result };
  }
  /** Export one Unit to a user-facing Office or delimited file. */
  async export(gateway, request, signal) {
    const target = await this.resolveTarget(gateway, request.file, request.unitId, request.worktreeId);
    const result = await this.worker.run({
      ...target,
      operation: "export",
      outputPath: resolveExportFile(request.output)
    }, signal);
    return { ok: true, operation: "export", file: request.file, result };
  }
  async resolveTarget(gatewayOrigin, filePath, unitId, worktreeId2) {
    const client = new GatewayClient(gatewayOrigin, this.gatewayRequestTimeoutMs);
    const listing = worktreeId2 === void 0 ? await new GatewayFileApi(client).listUnits(filePath) : await new GatewayWorktreeApi(client).listUnits(filePath, worktreeId2);
    const unit = selectUnit(mapUnits(listing), unitId);
    return {
      gatewayOrigin,
      commitTimeoutMs: this.unitContentCommitTimeoutMs,
      fileKey: fileKeyOf(filePath),
      filePath,
      unitId: unit.unitId,
      unitType: unit.type,
      ...worktreeId2 === void 0 ? {} : { worktreeId: worktreeId2 }
    };
  }
};
function selectUnit(units, requested) {
  if (requested !== void 0) {
    const unit = units.find((candidate) => candidate.unitId === requested);
    if (unit !== void 0) return unit;
    throw new UniverError(`Unit ${requested} was not found in the selected scope.`, "UNIT_NOT_FOUND");
  }
  if (units.length === 1) return units[0];
  throw new UniverError("Specify unitId when the selected scope has zero or multiple Units.", "UNIT_REQUIRED");
}
function inspectionQuery(unitType2, range) {
  if (range !== void 0) {
    if (unitType2 !== 2) throw new UniverError("Range inspection requires a Sheet Unit.", "INSPECTION_UNIT_TYPE_MISMATCH");
    const split = range.lastIndexOf("!");
    const selector = split < 0 ? { index: 0 } : { name: unquoteSheetName(range.slice(0, split)) };
    const address = split < 0 ? range : range.slice(split + 1);
    if (address.trim().length === 0) throw new UniverError("Inspection range must not be empty.", "INSPECTION_RANGE_INVALID");
    return { kind: "worksheet-range", ranges: [{ range: address, worksheet: selector }] };
  }
  if (unitType2 === 2) return { kind: "workbook" };
  if (unitType2 === 3) return { kind: "presentation" };
  if (unitType2 === 1) return { kind: "document" };
  throw new UniverError(`Unit type ${String(unitType2)} does not support structured inspection.`, "INSPECTION_UNIT_TYPE_UNSUPPORTED");
}
function unquoteSheetName(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("'") && trimmed.endsWith("'") ? trimmed.slice(1, -1).replace(/''/gu, "'") : trimmed;
}

// src/host/provider/state-cache.ts
var StateCache = class {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
  }
  ttlMs;
  entries = /* @__PURE__ */ new Map();
  /** Return a fresh cached promise or compute and cache one. */
  get(key, compute) {
    const cached = this.entries.get(key);
    if (cached !== void 0 && Date.now() - cached.at < this.ttlMs) return cached.value;
    const value = compute();
    this.entries.set(key, { at: Date.now(), value });
    void value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }
  /** Remove one entry after a mutation. */
  delete(key) {
    this.entries.delete(key);
  }
  /** Remove all cached state during disposal. */
  clear() {
    this.entries.clear();
  }
};

// src/host/provider/worktree-operations.ts
var WorktreeOperations = class {
  constructor(gatewayTimeoutMs, gatewayMutationTimeoutMs) {
    this.gatewayTimeoutMs = gatewayTimeoutMs;
    this.gatewayMutationTimeoutMs = gatewayMutationTimeoutMs;
  }
  gatewayTimeoutMs;
  gatewayMutationTimeoutMs;
  /** Read changed units from the Gateway merge preview. */
  async changedUnits(gateway, file, worktreeId2) {
    return mapChangedUnits(
      await new GatewayWorktreeApi(new GatewayClient(gateway, this.gatewayTimeoutMs)).preview(file, worktreeId2)
    );
  }
  /** Apply one human review action through Gateway. */
  async action(gateway, file, worktreeId2, action) {
    const value = await new GatewayWorktreeApi(new GatewayClient(gateway, this.gatewayMutationTimeoutMs)).action(file, worktreeId2, action);
    if (isRecord(value) && (value.ok === false || isRecord(value.error) && value.error.code === 0)) {
      throw new UniverError(gatewayErrorMessage(value) ?? "Gateway rejected the worktree action.", "WORKTREE_ACTION_REJECTED");
    }
  }
};

// src/host/provider/gateway-univer-service.ts
var GatewayUniverService = class extends UniverService {
  constructor(ctx, config) {
    super(ctx);
    this.config = config;
    this.gatewaySupervisor = new GatewaySupervisor(config);
    this.unitContent = new UnitContentOperations(
      config.gatewayRequestTimeoutMs,
      config.unitContentCommitTimeoutMs,
      config.unitContentOperationTimeoutMs
    );
    this.worktrees = new WorktreeOperations(config.gatewayRequestTimeoutMs, config.gatewayMutationTimeoutMs);
    this.stateCache = new StateCache(config.stateCacheTtlMs);
    this.unitCache = new StateCache(config.unitCacheTtlMs);
    ctx.effect(() => async () => this.dispose(), "univer: Gateway supervisor");
  }
  config;
  gatewaySupervisor;
  unitContent;
  worktrees;
  stateCache;
  unitCache;
  /** Current Gateway status. */
  gatewayStatus() {
    return this.gatewaySupervisor.status();
  }
  /** Ensure the bundled Gateway is available. */
  ensureGateway() {
    return this.gatewaySupervisor.ensure();
  }
  /** Return cached collaboration state for one file. */
  fileState(request) {
    return this.stateCache.get(request.file, () => this.computeFileState(request.file));
  }
  /** Apply a human review decision and return the refreshed state. */
  async worktreeAction(request) {
    const available = await this.ensureGateway();
    if (!available.ok) return { ok: false, reason: available.reason };
    try {
      await this.worktrees.action(available.gateway, request.file, request.worktreeId, request.action);
      this.invalidate(request.file, request.worktreeId);
      return {
        ok: true,
        action: request.action,
        worktreeId: request.worktreeId,
        state: await this.fileState({ file: request.file })
      };
    } catch (error) {
      this.invalidate(request.file, request.worktreeId);
      const state = await this.fileState({ file: request.file }).catch(() => void 0);
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        ...state === void 0 ? {} : { state }
      };
    }
  }
  createFile(request, signal) {
    return this.createFileInGateway(request, signal);
  }
  async inspectUnitContent(request, signal) {
    const gateway = await this.requireGateway();
    return this.unitContent.inspect(gateway, request, signal);
  }
  async executeUnitContent(request, signal) {
    const gateway = await this.requireGateway();
    const result = await this.unitContent.execute(gateway, request.file, request.code, request.worktreeId, request.unitId, signal);
    this.invalidate(request.file, request.worktreeId);
    return result;
  }
  async exportUnitContent(request, signal) {
    const gateway = await this.requireGateway();
    return this.unitContent.export(gateway, request, signal);
  }
  createWorktree(file, name5, signal) {
    return this.createWorktreeInGateway(file, name5, signal);
  }
  /** Stop Gateway ownership and clear transient state. */
  async dispose() {
    this.stateCache.clear();
    this.unitCache.clear();
    await this.gatewaySupervisor.dispose();
  }
  /** Status value used by the Web Consumer. */
  async unitContentStatus() {
    return "bundled";
  }
  async computeFileState(file) {
    let status = await this.gatewaySupervisor.status();
    if (status.gateway === null && this.config.autoStartGateway) {
      const started = await this.gatewaySupervisor.ensure();
      if (started.ok) status = { phase: "running", gateway: started.gateway, owned: !started.reused };
    }
    if (status.gateway === null) throw new UniverError(status.reason ?? "Univer Gateway is not available.", "GATEWAY_UNAVAILABLE");
    const gateway = status.gateway;
    const listing = await new GatewayFileApi(new GatewayClient(gateway, this.config.gatewayRequestTimeoutMs)).listWorktrees(file);
    const records = mapWorktrees(listing);
    const entries = await Promise.all(records.map(async (record) => {
      const base = `${gateway}/?file=${encodeURIComponent(fileKeyOf(file))}`;
      const worktree = encodeURIComponent(record.worktreeId);
      const worktreeUrl = `${base}&worktree=${worktree}&mode=embedded&scope=worktree`;
      const mergeUrl = `${base}&worktree=${worktree}&mode=embedded&scope=mergePreview`;
      const changedUnits = record.status === "draft" || record.status === "ready" ? await this.unitCache.get(`${file}\0${record.worktreeId}`, () => this.worktrees.changedUnits(gateway, file, record.worktreeId)) : [];
      const units = changedUnits.map((unit) => ({
        ...unit,
        worktreeUrl: `${worktreeUrl}&unit=${encodeURIComponent(unit.unitId)}`,
        ...record.status === "ready" ? { mergeUrl: `${mergeUrl}&unit=${encodeURIComponent(unit.unitId)}` } : {}
      }));
      return {
        worktreeId: record.worktreeId,
        name: record.name,
        status: record.status,
        units,
        ...record.status === "draft" || record.status === "ready" ? { worktreeUrl } : {},
        ...record.status === "ready" ? { mergeUrl } : {}
      };
    }));
    return {
      ok: true,
      file,
      gateway,
      gatewayRunning: true,
      viewerUrl: `${gateway}/?file=${encodeURIComponent(fileKeyOf(file))}`,
      worktrees: entries
    };
  }
  invalidate(file, worktreeId2) {
    this.stateCache.delete(file);
    this.unitCache.delete(`${file}\0${worktreeId2}`);
  }
  async createFileInGateway(request, signal) {
    signal?.throwIfAborted();
    const available = await this.ensureGateway();
    if (!available.ok) throw new UniverError(available.reason, "GATEWAY_UNAVAILABLE");
    const api = new GatewayFileApi(new GatewayClient(available.gateway, this.config.gatewayMutationTimeoutMs));
    await api.create(request.file);
    const result = await api.createUnit(request.file, request.kind, request.name);
    signal?.throwIfAborted();
    this.stateCache.delete(request.file);
    return { ok: true, operation: "create", file: request.file, result };
  }
  async createWorktreeInGateway(file, name5, signal) {
    signal?.throwIfAborted();
    const available = await this.ensureGateway();
    if (!available.ok) throw new UniverError(available.reason, "GATEWAY_UNAVAILABLE");
    const result = await new GatewayWorktreeApi(new GatewayClient(available.gateway, this.config.gatewayMutationTimeoutMs)).create(file, name5);
    signal?.throwIfAborted();
    this.stateCache.delete(file);
    return { ok: true, operation: "worktree", file, result };
  }
  async requireGateway() {
    const available = await this.ensureGateway();
    if (!available.ok) throw new UniverError(available.reason, "GATEWAY_UNAVAILABLE");
    return available.gateway;
  }
};

// src/host/provider/plugin.ts
function apply(ctx, config) {
  new GatewayUniverService(ctx, config);
}
var name = "univer-provider";

// src/host/tools/plugin.ts
var plugin_exports2 = {};
__export(plugin_exports2, {
  apply: () => apply2,
  inject: () => inject,
  name: () => name2
});

// src/host/tools/definitions/create.ts
import { defineTool } from "@deepseek-ai/dsh-tools";

// src/host/tools/presentation.ts
var operationOutput = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      ok: { type: "boolean", required: true, const: true },
      operation: {
        type: "string",
        required: true,
        enum: ["create", "inspect", "execute", "export", "worktree"]
      },
      file: { type: "string", required: true },
      result: { type: "json", required: true }
    }
  },
  render: (_args, value) => [{ type: "text", text: renderOperationResult(value) }]
};
function renderOperationResult(value) {
  return JSON.stringify(value, null, 2);
}
function operationTitle(operation, file) {
  return `Univer ${operation}: ${file}`;
}

// src/host/tools/definitions/create.ts
function createTool(ctx, timeoutMs) {
  return defineTool({
    name: "univer_create",
    description: "Create a .univer document with its first Unit at an absolute path.",
    timeoutMs,
    parameters: {
      file: { type: "string", required: true, description: "Absolute output path ending in .univer." },
      kind: {
        type: "string",
        required: true,
        enum: ["sheet", "doc", "slide", "base", "board"],
        description: "Type of the first Unit."
      },
      name: { type: "string", required: true, description: "Name of the first Unit." }
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.createFile({
      file: resolveUniverFile(args.file),
      kind: args.kind,
      name: args.name
    }, exec.signal),
    presentCall: (args) => ({ card: "generic", title: operationTitle("create", args.file), kind: "execute" })
  });
}

// src/host/tools/definitions/execute.ts
import { defineTool as defineTool2 } from "@deepseek-ai/dsh-tools";
function executeTool(ctx, timeoutMs) {
  return defineTool2({
    name: "univer_execute",
    description: "Execute Univer Facade code and commit mutations to a draft agent worktree.",
    timeoutMs,
    parameters: {
      file: { type: "string", required: true, description: "Absolute .univer path." },
      code: { type: "string", required: true, description: "Facade API JavaScript to execute." },
      worktreeId: { type: "string", required: true, description: "Writable agent worktree id." },
      unitId: { type: "string", required: true, description: "Target unit id." }
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.executeUnitContent({
      file: resolveUniverFile(args.file),
      code: args.code,
      worktreeId: worktreeId(args.worktreeId),
      unitId: args.unitId
    }, exec.signal),
    presentCall: (args) => ({ card: "generic", title: operationTitle("execute", args.file), kind: "execute" })
  });
}

// src/host/tools/definitions/export.ts
import { defineTool as defineTool3 } from "@deepseek-ai/dsh-tools";
function exportTool(ctx, timeoutMs) {
  return defineTool3({
    name: "univer_export",
    description: "Export a .univer document or unit to a user-facing file format.",
    timeoutMs,
    parameters: {
      file: { type: "string", required: true, description: "Absolute .univer path." },
      output: { type: "string", required: true, description: "Absolute output file path." },
      unitId: { type: "string", description: "Optional unit id." },
      worktreeId: { type: "string", description: "Optional worktree scope; omit to export trunk." }
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.exportUnitContent({
      file: resolveUniverFile(args.file),
      output: args.output,
      ...args.unitId === void 0 ? {} : { unitId: args.unitId },
      ...args.worktreeId === void 0 ? {} : { worktreeId: worktreeId(args.worktreeId) }
    }, exec.signal),
    presentCall: (args) => ({ card: "generic", title: operationTitle("export", args.file), kind: "execute" })
  });
}

// src/host/tools/definitions/inspect.ts
import { defineTool as defineTool4 } from "@deepseek-ai/dsh-tools";
function inspectTool(ctx, timeoutMs) {
  return defineTool4({
    name: "univer_inspect",
    description: "Inspect structured content from a .univer document, optionally narrowed to a unit or range.",
    timeoutMs,
    parameters: {
      file: { type: "string", required: true, description: "Absolute .univer path." },
      unitId: { type: "string", description: "Optional unit id." },
      range: { type: "string", description: "Optional unit range such as Sheet1!A1:D20." },
      worktreeId: { type: "string", description: "Optional worktree scope; omit to inspect trunk." }
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.inspectUnitContent({
      file: resolveUniverFile(args.file),
      ...args.unitId === void 0 ? {} : { unitId: args.unitId },
      ...args.range === void 0 ? {} : { range: args.range },
      ...args.worktreeId === void 0 ? {} : { worktreeId: worktreeId(args.worktreeId) }
    }, exec.signal),
    presentCall: (args) => ({ card: "generic", title: operationTitle("inspect", args.file), kind: "read" })
  });
}

// src/host/tools/definitions/worktree.ts
import { defineTool as defineTool5 } from "@deepseek-ai/dsh-tools";
function worktreeTool(ctx, timeoutMs) {
  return defineTool5({
    name: "univer_worktree",
    description: "Create an isolated Univer worktree for agent edits. User review actions such as merge and discard are intentionally unavailable.",
    timeoutMs,
    parameters: {
      file: { type: "string", required: true, description: "Absolute .univer path." },
      name: { type: "string", description: "Optional human-readable worktree name." }
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.createWorktree(resolveUniverFile(args.file), args.name, exec.signal),
    presentCall: (args) => ({ card: "generic", title: operationTitle("worktree", args.file), kind: "execute" })
  });
}

// src/host/tools/plugin.ts
var inject = ["univer", "tools"];
var name2 = "univer-tools";
function apply2(ctx, config) {
  ctx.tools.register(createTool(ctx, config.unitContentOperationTimeoutMs));
  ctx.tools.register(inspectTool(ctx, config.unitContentOperationTimeoutMs));
  ctx.tools.register(executeTool(ctx, config.unitContentOperationTimeoutMs));
  ctx.tools.register(exportTool(ctx, config.unitContentOperationTimeoutMs));
  ctx.tools.register(worktreeTool(ctx, config.unitContentOperationTimeoutMs));
}

// src/host/webServer/plugin.ts
var plugin_exports3 = {};
__export(plugin_exports3, {
  apply: () => apply3,
  inject: () => inject2,
  name: () => name3
});

// src/host/webServer/routes/gateway.ts
function gatewayStartRoute(service) {
  return service.ensureGateway();
}

// src/host/webServer/session-scope.ts
import { realpath } from "node:fs/promises";
import { isAbsolute as isAbsolute2, relative, resolve, sep } from "node:path";
import { SessionId } from "@deepseek-ai/dsh-session";
async function resolveAuthorizedFile(value, sessionId, sessions) {
  if (typeof value !== "string" || value.length === 0) {
    throw new UniverError("file is required", "INVALID_REQUEST");
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new UniverError("sessionId is required", "INVALID_REQUEST");
  }
  const cwd = sessions.get(SessionId(sessionId))?.header.cwd;
  if (cwd === void 0) throw new UniverError("session is unavailable or has no workspace", "SESSION_SCOPE_UNAVAILABLE");
  const candidate = isAbsolute2(value) ? value : resolve(cwd, value);
  let workspace;
  let file;
  try {
    ;
    [workspace, file] = await Promise.all([realpath(cwd), realpath(candidate)]);
  } catch (error) {
    throw new UniverError("file or session workspace does not exist", "INVALID_FILE_PATH", { cause: error });
  }
  const fromWorkspace = relative(workspace, file);
  if (fromWorkspace === ".." || fromWorkspace.startsWith(`..${sep}`) || isAbsolute2(fromWorkspace)) {
    throw new UniverError("file is outside the session workspace", "SESSION_SCOPE_DENIED");
  }
  return resolveUniverFile(file);
}

// src/host/webServer/routes/state.ts
async function stateRoute(service, sessions, file, sessionId) {
  return service.fileState({ file: await resolveAuthorizedFile(file, sessionId, sessions) });
}

// src/host/webServer/routes/status.ts
async function statusRoute(service) {
  const [gateway, unitContent] = await Promise.all([
    service.gatewayStatus(),
    service.unitContentStatus()
  ]);
  return { gateway, unitContent };
}

// src/host/webServer/routes/worktree-action.ts
async function worktreeActionRoute(service, sessions, body) {
  if (!isObject(body)) throw new UniverError("JSON object body is required", "INVALID_REQUEST");
  const action = body.action;
  if (action !== "ready" && action !== "reopen" && action !== "discard" && action !== "merge") {
    throw new UniverError("action must be ready | reopen | discard | merge", "INVALID_REQUEST");
  }
  if (typeof body.worktreeId !== "string" || body.worktreeId.length === 0) {
    throw new UniverError("worktreeId is required", "INVALID_REQUEST");
  }
  return service.worktreeAction({
    action,
    file: await resolveAuthorizedFile(body.file, body.sessionId, sessions),
    worktreeId: worktreeId(body.worktreeId)
  });
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/host/webServer/router.ts
var MAX_BODY_BYTES = 64 * 1024;
function createUniverRouter(service, sessions) {
  return async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/univer-api/status") {
        sendJson(response, 200, await statusRoute(service));
        return;
      }
      if (request.method === "POST" && url.pathname === "/univer-api/gateway/start") {
        sendJson(response, 200, await gatewayStartRoute(service));
        return;
      }
      if (request.method === "GET" && url.pathname === "/univer-api/state") {
        sendJson(response, 200, await stateRoute(service, sessions, url.searchParams.get("file"), url.searchParams.get("sessionId")));
        return;
      }
      if (request.method === "POST" && url.pathname === "/univer-api/worktree-action") {
        sendJson(response, 200, await worktreeActionRoute(service, sessions, await readJsonBody(request)));
        return;
      }
      response.writeHead(404);
      response.end();
    } catch (error) {
      const rejected = error instanceof UniverError && (error.code === "INVALID_REQUEST" || error.code === "INVALID_FILE_PATH" || error.code === "SESSION_SCOPE_UNAVAILABLE" || error.code === "SESSION_SCOPE_DENIED");
      sendJson(response, rejected ? error.code === "SESSION_SCOPE_DENIED" ? 403 : 400 : 500, {
        ok: false,
        code: error instanceof UniverError ? error.code : "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value));
}
async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new UniverError("request body is too large", "INVALID_REQUEST");
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new UniverError("JSON body is required", "INVALID_REQUEST");
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new UniverError("request body must be valid JSON", "INVALID_REQUEST", { cause: error });
  }
}

// src/host/webServer/plugin.ts
var inject2 = ["univer", "webServer", "sessions"];
var name3 = "univer-web";
function apply3(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/univer-api",
    handler: createUniverRouter(ctx.univer, ctx.sessions)
  }), "univer: browser api");
}

// src/host/index.ts
var name4 = "dsh-univer-plugin";
function apply4(ctx, config = {}) {
  const resolved = resolveConfig(config);
  ctx.plugin(plugin_exports, resolved);
  ctx.plugin(plugin_exports3);
  if (resolved.tools) ctx.plugin(plugin_exports2, resolved);
}
export {
  Config,
  GatewayUniverService,
  UniverService,
  apply4 as apply,
  createUniverRouter,
  name4 as name,
  resolveConfig
};
//# sourceMappingURL=index.js.map
