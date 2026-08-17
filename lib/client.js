window.__ModuleLoader__.load({
  id: "@univer-cli/dsh-univer-plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // src/client/index.tsx
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(index_exports);
    var React9 = require("react");

    // src/client/components/preview-card.tsx
    var React3 = __toESM(require("react"), 1);

    // src/client/api/univer-api.ts
    async function request(path, init) {
      const response = await fetch(`${window.location.origin}${path}`, init);
      const body = await response.json();
      if (!response.ok) {
        const error = body;
        throw new Error(error.message ?? `Univer API HTTP ${String(response.status)}`);
      }
      return body;
    }
    function getUniverStatus() {
      return request("/univer-api/status");
    }
    function startGateway() {
      return request("/univer-api/gateway/start", { method: "POST" });
    }
    function getFileState(file, sessionId) {
      return request(`/univer-api/state?file=${encodeURIComponent(file)}&sessionId=${encodeURIComponent(sessionId)}`);
    }
    function performWorktreeAction(action, file, worktreeId, sessionId) {
      return request("/univer-api/worktree-action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, file, worktreeId, sessionId })
      });
    }

    // src/client/conversation/univer-target-definition.ts
    var univerTargetDefinition = {
      kind: "univerTarget",
      match(event) {
        if (event.type === "turn/start") return { id: String(event.data.turn), role: "start" };
        if (event.type === "tool/call" || event.type === "tool/result") return { id: String(event.data.turn), role: "update" };
        return null;
      },
      start(_context, match) {
        return { turn: match.event.data.turn, targets: [] };
      },
      update(context, match) {
        const additions = targetsFromEvent(match.event);
        return additions.length === 0 ? context.state : { ...context.state, targets: mergeTargets(context.state.targets, additions) };
      },
      buildLocationData(context, scope) {
        if (scope !== "turn" || context.state === void 0) return null;
        return { kind: "turn", turn: context.state.turn, key: "univerTarget", value: { targets: context.state.targets } };
      }
    };
    function selectUniverPreview(owner) {
      const data = owner.turn.data.get("univerTarget");
      if (!isTurnData(data) || data.targets.length === 0) return null;
      return { targets: data.targets };
    }
    function targetsOfSession(session, cwd) {
      const files = [];
      const worktreeIds = /* @__PURE__ */ new Set();
      const turns = session?.chat?.timeline?.turns;
      if (turns === void 0) return { files, worktreeIds };
      for (const turn of turns.values()) {
        const data = turn.data?.get("univerTarget");
        if (!isTurnData(data)) continue;
        for (const target of data.targets) {
          const file = resolveTargetFile(target.file, cwd);
          if (!files.includes(file)) files.push(file);
          if (target.worktreeId !== null) worktreeIds.add(target.worktreeId);
        }
      }
      return { files, worktreeIds };
    }
    function targetsFromEvent(event) {
      if (event.type === "tool/call") return targetsFromCall(event.data);
      if (event.type === "tool/result") return targetsFromResult(event.data);
      return [];
    }
    function targetsFromCall(data) {
      if (typeof data.name !== "string" || typeof data.arguments !== "string") return [];
      let args;
      try {
        const parsed = JSON.parse(data.arguments);
        if (!isRecord(parsed)) return [];
        args = parsed;
      } catch (error) {
        return [];
      }
      if (data.name.startsWith("univer_") && typeof args.file === "string") {
        return [{ file: args.file, worktreeId: typeof args.worktreeId === "string" ? args.worktreeId : null }];
      }
      return [];
    }
    function targetsFromResult(data) {
      const message = isRecord(data.message) ? data.message : null;
      const content = message !== null && Array.isArray(message.content) ? message.content : [];
      const text = content.flatMap((block) => isRecord(block) && typeof block.text === "string" ? [block.text] : []).join("\n");
      if (text.length === 0) return [];
      const structured = parseStructuredResult(text);
      if (structured !== null && typeof structured.file === "string") {
        const result = isRecord(structured.result) ? structured.result : null;
        const worktree = result !== null && typeof result.worktreeId === "string" ? result.worktreeId : null;
        return [{ file: structured.file, worktreeId: worktree }];
      }
      return [];
    }
    function parseStructuredResult(text) {
      const firstBrace = text.indexOf("{");
      if (firstBrace === -1) return null;
      try {
        const value = JSON.parse(text.slice(firstBrace));
        return isRecord(value) ? value : null;
      } catch (error) {
        return null;
      }
    }
    function mergeTargets(previous, additions) {
      const merged = [...previous];
      for (const target of additions) {
        const index = merged.findIndex((entry) => entry.file === target.file);
        if (index === -1) merged.push(target);
        else merged[index] = target;
      }
      return merged;
    }
    function resolveTargetFile(file, cwd) {
      if (isAbsolute(file) || cwd === void 0 || cwd === "") return file;
      return `${cwd.replace(/\/+$/, "")}/${file.replace(/^\.\//, "")}`;
    }
    function isAbsolute(file) {
      return file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(file);
    }
    function basename(file) {
      const at = Math.max(file.lastIndexOf("/"), file.lastIndexOf("\\"));
      return at === -1 ? file : file.slice(at + 1);
    }
    function isTurnData(value) {
      return isRecord(value) && Array.isArray(value.targets);
    }
    function isRecord(value) {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    // src/client/hooks/use-univer-state.ts
    var React = __toESM(require("react"), 1);
    function useUniverStates(files, sessionId, intervalMs = 900) {
      const [states, setStates] = React.useState({});
      const key = files.join("\0");
      React.useEffect(() => {
        if (files.length === 0) {
          setStates({});
          return;
        }
        let active = true;
        const poll = async () => {
          for (const file of files) {
            try {
              const state = await getFileState(file, sessionId);
              if (!active) return;
              setStates((previous) => ({ ...previous, [file]: state }));
            } catch (error) {
              if (!active) return;
            }
          }
        };
        void poll();
        const timer = window.setInterval(() => void poll(), intervalMs);
        const onVisibility = () => {
          if (document.visibilityState === "visible") void poll();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
          active = false;
          window.clearInterval(timer);
          document.removeEventListener("visibilitychange", onVisibility);
        };
      }, [key, sessionId, intervalMs]);
      return {
        states,
        applyState: React.useCallback((state) => setStates((previous) => ({ ...previous, [state.file]: state })), [])
      };
    }
    function useGatewayStatus() {
      const [phase, setPhase] = React.useState("checking");
      React.useEffect(() => {
        let active = true;
        void getUniverStatus().then((status) => {
          if (active) setPhase(status.gateway.phase);
        }).catch(() => {
          if (active) setPhase("failed");
        });
        return () => {
          active = false;
        };
      }, []);
      const start = React.useCallback(async () => {
        setPhase("starting");
        try {
          const result = await startGateway();
          setPhase(result.ok ? "running" : "failed");
        } catch (error) {
          setPhase("failed");
        }
      }, []);
      return { phase, start };
    }

    // src/client/components/preview-dialog.tsx
    var React2 = __toESM(require("react"), 1);
    var import_jsx_runtime = require("react/jsx-runtime");
    function PreviewDialog(props) {
      const [frameKey, setFrameKey] = React2.useState(0);
      const closeRef = React2.useRef(null);
      React2.useEffect(() => {
        closeRef.current?.focus();
        const onKeyDown = (event) => {
          if (event.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
      }, [props.onClose]);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "unvT_overlay", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "unvT_mask", onClick: props.onClose }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "unvT_panel", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "unvT_panelHead", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "unvT_panelTitle", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GridIcon, { size: 16 }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "unvT_panelFile", children: basename(props.file) }),
              props.worktreeId === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "unvT_panelWt", children: props.worktreeId })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "unvT_panelActions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "unvT_panelTool", type: "button", title: props.t("refresh"), onClick: () => setFrameKey((value) => value + 1), children: "\u27F3" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { ref: closeRef, className: "unvT_panelTool", type: "button", title: props.t("collapse"), onClick: props.onClose, children: "\u2715" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", { className: "unvT_frame", src: props.url, title: props.t("title"), onLoad: () => closeRef.current?.focus() }, frameKey)
        ] })
      ] });
    }
    function GridIcon({ size }) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.2, "aria-hidden": true, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: 2, y: 2, width: 5, height: 5, rx: 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: 9, y: 2, width: 5, height: 5, rx: 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: 2, y: 9, width: 5, height: 5, rx: 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: 9, y: 9, width: 5, height: 5, rx: 1 })
      ] });
    }

    // src/client/components/preview-card.tsx
    var import_jsx_runtime2 = require("react/jsx-runtime");
    function PreviewCard(props) {
      const targets = props.matched.targets;
      const [selected, setSelected] = React3.useState(0);
      const [open, setOpen] = React3.useState(false);
      const [url, setUrl] = React3.useState(null);
      const gateway = useGatewayStatus();
      const active = targets[Math.min(selected, Math.max(0, targets.length - 1))];
      React3.useEffect(() => {
        if (active === void 0) return;
        let mounted = true;
        void getFileState(active.file, props.sessionId).then((state) => {
          if (!mounted) return;
          const openUrl = active.worktreeId === null ? null : state.worktrees.find((entry) => entry.worktreeId === active.worktreeId)?.openUrl;
          setUrl(openUrl ?? state.viewerUrl);
        }).catch(() => {
          if (mounted) setUrl(null);
        });
        return () => {
          mounted = false;
        };
      }, [active?.file, active?.worktreeId, props.sessionId, gateway.phase]);
      if (active === void 0) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, {});
      const toggle = () => setOpen((value) => !value);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "unvT_card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "unvT_head", onClick: toggle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "unvT_titleRow", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "span",
              {
                className: "unvT_dot",
                "data-gateway": gateway.phase,
                title: props.t(`gateway.${gateway.phase}`),
                onClick: gateway.phase === "stopped" || gateway.phase === "failed" ? (event) => {
                  event.stopPropagation();
                  void gateway.start();
                } : void 0
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "unvT_title", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(GridIcon, { size: 16 }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "unvT_file", children: basename(active.file) }),
              active.worktreeId === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "unvT_wt", children: active.worktreeId })
            ] }),
            targets.length <= 1 ? null : targets.map((target, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                className: "unvT_chip",
                "data-active": index === selected || void 0,
                onClick: (event) => {
                  event.stopPropagation();
                  setSelected(index);
                },
                children: basename(target.file)
              },
              `${target.file}:${String(target.worktreeId)}`
            )),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "unvT_actions", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "unvT_expandBtn", onClick: (event) => {
              event.stopPropagation();
              toggle();
            }, children: [
              props.t(open ? "collapse" : "expand"),
              " ",
              open ? "\u25B4" : "\u25BE"
            ] }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "unvT_path", children: active.file })
        ] }),
        open && url !== null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PreviewDialog, { file: active.file, worktreeId: active.worktreeId, url, t: props.t, onClose: () => setOpen(false) }) : null
      ] });
    }

    // src/client/components/univer-dock.tsx
    var React8 = __toESM(require("react"), 1);

    // src/client/components/review-panel.tsx
    var React6 = __toESM(require("react"), 1);

    // src/client/hooks/use-worktree-action.ts
    var React4 = __toESM(require("react"), 1);
    function useWorktreeAction(file, worktreeId, sessionId) {
      const [busy, setBusy] = React4.useState(null);
      const [error, setError] = React4.useState(null);
      const perform = React4.useCallback(async (action) => {
        if (busy !== null) return null;
        setBusy(action);
        setError(null);
        try {
          const result = await performWorktreeAction(action, file, worktreeId, sessionId);
          if (!result.ok) setError(result.reason);
          return result;
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : String(caught));
          return null;
        } finally {
          setBusy(null);
        }
      }, [busy, file, worktreeId, sessionId]);
      return { busy, error, perform };
    }

    // src/client/components/unit-chips.tsx
    var React5 = require("react");
    var import_jsx_runtime3 = require("react/jsx-runtime");
    var ICONS = { added: "\uFF0B", modified: "\u270E", deleted: "\uFF0D", conflict: "\u26A0" };
    function UnitChips(props) {
      if (props.units.length <= 1) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "uvf_units", children: props.units.map((unit) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: `uvf_unit${unit.unitId === props.selected ? " uvf_unit_on" : ""}`,
          "data-kind": unit.kind,
          title: props.t(`dock.unit.${unit.kind}`),
          onClick: () => props.onSelect(unit.unitId),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "uvf_unit_icon", children: ICONS[unit.kind] }),
            unit.name || props.t(`dock.unit.${unit.kind}`)
          ]
        },
        unit.unitId
      )) });
    }
    function unitViewerUrl(url, units, unitId, scope) {
      if (unitId === void 0) return url;
      const unit = units.find((entry) => entry.unitId === unitId);
      return scope === "merge" ? unit?.mergeUrl ?? url : unit?.worktreeUrl ?? url;
    }

    // src/client/components/review-panel.tsx
    var import_jsx_runtime4 = require("react/jsx-runtime");
    function ReviewPanel(props) {
      const [open, setOpen] = React6.useState(true);
      const [selected, setSelected] = React6.useState();
      const action = useWorktreeAction(props.file, props.worktree.worktreeId, props.sessionId);
      const ready = props.worktree.status === "ready";
      const selectedUnit = selected !== void 0 && props.worktree.units.some((unit) => unit.unitId === selected) ? selected : props.worktree.units[0]?.unitId;
      const url = unitViewerUrl(ready ? props.worktree.mergeUrl : props.worktree.worktreeUrl, props.worktree.units, selectedUnit, ready ? "merge" : "worktree");
      const run = async (name) => {
        const result = await action.perform(name);
        if (result?.ok) props.applyState(result.state);
      };
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "uvf_panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "uvf_panelHead", onClick: () => setOpen((value) => !value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "uvf_panelTitle", children: [
            "\u{1F9FE} ",
            props.t(ready ? "dock.mergeTitle" : "dock.reviewTitle"),
            "\u300C",
            props.worktree.name || props.worktree.worktreeId,
            "\u300D",
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "uvf_file", children: [
              " \xB7 ",
              basename(props.file)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "uvf_panelChip", "data-status": props.worktree.status, children: props.t(ready ? "dock.mergeReady" : "dock.draft") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "uvf_btn", children: open ? "\u25BE" : "\u25B4" })
        ] }),
        open ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(UnitChips, { units: props.worktree.units, selected: selectedUnit, t: props.t, onSelect: setSelected }),
          url === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("iframe", { className: "uvf_panelFrame", src: url, title: props.worktree.name || props.worktree.worktreeId }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "uvf_panelFoot", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: action.error === null ? "uvf_hint" : "uvf_error", children: action.error ?? (ready ? "" : props.t("dock.notReady")) }),
            ready ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "uvf_action", "data-kind": "reopen", disabled: action.busy !== null, onClick: () => void run("reopen"), children: props.t("dock.reopen") }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "uvf_action", "data-kind": "discard", disabled: action.busy !== null, onClick: () => void run("discard"), children: props.t("dock.discard") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "uvf_action", "data-kind": ready ? "merge" : "ready", disabled: action.busy !== null, onClick: () => void run(ready ? "merge" : "ready"), children: props.t(ready ? "dock.merge" : "dock.markReady") })
          ] })
        ] }) : null
      ] });
    }

    // src/client/components/worktree-window.tsx
    var React7 = __toESM(require("react"), 1);
    var import_jsx_runtime5 = require("react/jsx-runtime");
    var HANDLES = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];
    function WorktreeWindow(props) {
      const [folded, setFolded] = React7.useState(false);
      const [maximized, setMaximized] = React7.useState(false);
      const [offset, setOffset] = React7.useState({ x: 0, y: 0 });
      const [size, setSize] = React7.useState({ width: 480, height: 340 });
      const [selected, setSelected] = React7.useState();
      const units = props.worktree.units;
      const selectedUnit = selected !== void 0 && units.some((unit) => unit.unitId === selected) ? selected : units[0]?.unitId;
      const url = unitViewerUrl(props.worktree.worktreeUrl, units, selectedUnit, "worktree");
      const title = props.worktree.name || props.worktree.worktreeId;
      const onDragStart = (event) => {
        if (event.button !== 0 || event.target.closest("button") !== null) return;
        const element = event.currentTarget;
        const start = { x: event.clientX, y: event.clientY, offset, moved: false };
        try {
          element.setPointerCapture(event.pointerId);
        } catch (error) {
        }
        const move = (next) => {
          const dx = next.clientX - start.x;
          const dy = next.clientY - start.y;
          if (Math.abs(dx) >= 5 || Math.abs(dy) >= 5) start.moved = true;
          if (start.moved) setOffset({ x: start.offset.x + dx, y: start.offset.y + dy });
        };
        const up = () => {
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerup", up);
          element.removeEventListener("pointercancel", up);
          if (!start.moved && !maximized) setMaximized(true);
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerup", up);
        element.addEventListener("pointercancel", up);
      };
      const resize = (direction) => (event) => {
        event.preventDefault();
        event.stopPropagation();
        const element = event.currentTarget;
        const start = { x: event.clientX, y: event.clientY, size, offset };
        const move = (next) => {
          const dx = next.clientX - start.x;
          const dy = next.clientY - start.y;
          let width = start.size.width;
          let height = start.size.height;
          let x = start.offset.x;
          let y = start.offset.y;
          if (direction.includes("e")) {
            width = clamp(start.size.width + dx, 280, 1600);
            x = start.offset.x + width - start.size.width;
          }
          if (direction.includes("w")) width = clamp(start.size.width - dx, 280, 1600);
          if (direction.includes("s")) height = clamp(start.size.height + dy, 180, 1e3);
          if (direction.includes("n")) {
            height = clamp(start.size.height - dy, 180, 1e3);
            y = start.offset.y + start.size.height - height;
          }
          setSize({ width, height });
          setOffset({ x, y });
        };
        const up = () => {
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerup", up);
          element.removeEventListener("pointercancel", up);
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerup", up);
        element.addEventListener("pointercancel", up);
      };
      const className = ["uvf_win", folded ? "uvf_win_folded" : "", maximized ? "uvf_win_max" : ""].filter(Boolean).join(" ");
      const style = maximized ? void 0 : folded ? { transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)` } : { width: size.width, height: size.height, transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)` };
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className, style, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "uvf_bar", onPointerDown: onDragStart, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "uvf_pulse", title: props.t("dock.live") }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "uvf_title", children: [
            title,
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "uvf_file", children: [
              " \xB7 ",
              basename(props.file)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "uvf_chip", "data-status": props.worktree.status, children: props.t(`dock.${props.worktree.status}`) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "uvf_btn", title: props.t(folded ? "dock.expand" : "dock.fold"), onClick: () => setFolded((value) => !value), children: folded ? "+" : "\u2212" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "uvf_btn", title: props.t(maximized ? "dock.restore" : "dock.maximize"), onClick: () => setMaximized((value) => !value), children: maximized ? "\u2921" : "\u2922" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "uvf_btn", title: props.t("dock.close"), onClick: props.onDismiss, children: "\u2715" })
        ] }),
        folded ? null : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(UnitChips, { units, selected: selectedUnit, t: props.t, onSelect: setSelected }),
          url === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "uvf_note", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: props.t("dock.gatewayDown") }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => void startGateway(), children: props.t("dock.startGateway") })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("iframe", { className: "uvf_frame", src: url, title })
        ] }),
        !folded && !maximized ? HANDLES.map((direction) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: `uvf_handle uvf_h_${direction}`, onPointerDown: resize(direction) }, direction)) : null
      ] });
    }
    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    // src/client/components/univer-dock.tsx
    var import_jsx_runtime6 = require("react/jsx-runtime");
    function UniverDock(props) {
      const cwd = props.useSessions?.((state) => state.byId[props.sessionId]?.cwd);
      const targets = React8.useMemo(() => targetsOfSession(props.session ?? null, cwd), [props.session, cwd]);
      const { states, applyState } = useUniverStates(targets.files, props.sessionId);
      const [dismissed, setDismissed] = React8.useState({});
      const windows = [];
      const panels = [];
      const running = props.session?.running === true;
      for (const file of targets.files) {
        const state = states[file];
        if (state === void 0) continue;
        for (const worktree of state.worktrees) {
          if (worktree.status !== "draft" && worktree.status !== "ready") continue;
          if (targets.worktreeIds.size > 0 && !targets.worktreeIds.has(worktree.worktreeId)) continue;
          if (running) {
            if (dismissed[worktree.worktreeId] !== worktree.status) windows.push({ file, worktree });
          } else {
            panels.push({ file, worktree });
          }
        }
      }
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
        windows.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "uvf_root", children: windows.map(({ file, worktree }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          WorktreeWindow,
          {
            file,
            worktree,
            t: props.t,
            onDismiss: () => setDismissed((previous) => ({ ...previous, [worktree.worktreeId]: worktree.status }))
          },
          worktree.worktreeId
        )) }),
        panels.map(({ file, worktree }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ReviewPanel, { sessionId: props.sessionId, file, worktree, t: props.t, applyState }, `review:${worktree.worktreeId}`))
      ] });
    }

    // src/client/locales/en.ts
    var en = {
      title: "Univer Preview",
      expand: "Expand preview",
      collapse: "Collapse preview",
      refresh: "Refresh",
      "gateway.running": "Univer Gateway running",
      "gateway.stopped": "Univer Gateway stopped \u2014 click to start",
      "gateway.starting": "Starting Univer Gateway\u2026",
      "gateway.checking": "Checking Univer Gateway\u2026",
      "gateway.failed": "Univer Gateway unavailable \u2014 click to retry",
      "dock.live": "live sync",
      "dock.draft": "Editing",
      "dock.ready": "Ready",
      "dock.mergeReady": "Ready",
      "dock.unit.added": "A",
      "dock.unit.modified": "M",
      "dock.unit.deleted": "D",
      "dock.unit.conflict": "Conflict",
      "dock.fold": "Collapse",
      "dock.expand": "Expand",
      "dock.maximize": "Maximize",
      "dock.restore": "Restore",
      "dock.close": "Close",
      "dock.gatewayDown": "Univer Gateway is not running; live preview is unavailable",
      "dock.startGateway": "Start Gateway",
      "dock.mergeTitle": "Merge preview",
      "dock.reviewTitle": "Modification in progress",
      "dock.markReady": "Submit for confirmation",
      "dock.notReady": "Submit this modification for confirmation before merging or discarding it",
      "dock.merge": "Merge into current version",
      "dock.reopen": "Resume editing",
      "dock.discard": "Discard"
    };

    // src/client/locales/zh.ts
    var zh = {
      title: "Univer \u9884\u89C8",
      expand: "\u5C55\u5F00\u9884\u89C8",
      collapse: "\u6536\u8D77\u9884\u89C8",
      refresh: "\u5237\u65B0",
      "gateway.running": "Univer Gateway \u8FD0\u884C\u4E2D",
      "gateway.stopped": "Univer Gateway \u672A\u8FD0\u884C\uFF0C\u70B9\u51FB\u542F\u52A8",
      "gateway.starting": "\u6B63\u5728\u542F\u52A8 Univer Gateway\u2026",
      "gateway.checking": "\u6B63\u5728\u68C0\u67E5 Univer Gateway\u2026",
      "gateway.failed": "Univer Gateway \u4E0D\u53EF\u7528\uFF0C\u70B9\u51FB\u91CD\u8BD5",
      "dock.live": "\u5B9E\u65F6\u540C\u6B65",
      "dock.draft": "\u4FEE\u6539\u4E2D",
      "dock.ready": "\u5F85\u786E\u8BA4",
      "dock.mergeReady": "\u5F85\u786E\u8BA4",
      "dock.unit.added": "\u65B0",
      "dock.unit.modified": "\u6539",
      "dock.unit.deleted": "\u5220",
      "dock.unit.conflict": "\u51B2\u7A81",
      "dock.fold": "\u6298\u53E0",
      "dock.expand": "\u5C55\u5F00",
      "dock.maximize": "\u653E\u5927",
      "dock.restore": "\u8FD8\u539F",
      "dock.close": "\u5173\u95ED",
      "dock.gatewayDown": "Univer Gateway \u672A\u8FD0\u884C\uFF0C\u65E0\u6CD5\u5B9E\u65F6\u9884\u89C8",
      "dock.startGateway": "\u542F\u52A8 Gateway",
      "dock.mergeTitle": "\u5408\u5E76\u9884\u89C8",
      "dock.reviewTitle": "\u6B63\u5728\u8FDB\u884C\u7684\u4FEE\u6539",
      "dock.markReady": "\u63D0\u4EA4\u786E\u8BA4",
      "dock.notReady": "\u63D0\u4EA4\u786E\u8BA4\u540E\uFF0C\u53EF\u4EE5\u5408\u5165\u6216\u4E22\u5F03\u8FD9\u5904\u4FEE\u6539",
      "dock.merge": "\u5408\u5165\u5F53\u524D\u7248\u672C",
      "dock.reopen": "\u6062\u590D\u7F16\u8F91",
      "dock.discard": "\u4E22\u5F03"
    };

    // src/client/styles/preview.ts
    var previewStyles = `
    .unvT_card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;margin:8px 0 4px;overflow:hidden}
    .unvT_head{padding:10px 12px;cursor:pointer}.unvT_head:hover{background:var(--dsw-alias-interactive-bg-subtle)}
    .unvT_titleRow,.unvT_title,.unvT_actions,.unvT_panelHead,.unvT_panelTitle,.unvT_panelActions{display:flex;align-items:center;gap:8px;min-width:0}
    .unvT_title,.unvT_panelTitle{flex:1;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}.unvT_file,.unvT_panelFile{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .unvT_wt,.unvT_panelWt{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;background:var(--dsw-alias-interactive-bg-subtle);border-radius:999px;padding:1px 8px}
    .unvT_path{color:var(--dsw-alias-label-tertiary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
    .unvT_dot{width:10px;height:10px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:#c4c9d2;display:inline-block;flex:none}.unvT_dot[data-gateway=running]{background:#22a06b;border-color:#22a06b}.unvT_dot[data-gateway=stopped],.unvT_dot[data-gateway=failed]{background:#d9a13b;border-color:#d9a13b;cursor:pointer}.unvT_dot[data-gateway=checking],.unvT_dot[data-gateway=starting]{border-top-color:#22a06b;background:transparent;animation:unvT_spin .9s linear infinite}@keyframes unvT_spin{to{transform:rotate(360deg)}}
    .unvT_chip,.unvT_expandBtn,.unvT_panelTool{font:13px/20px inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:var(--dsw-alias-interactive-bg-subtle);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 10px}.unvT_chip{font-size:12px;border-radius:999px;padding:2px 9px}.unvT_chip[data-active]{background:var(--dsw-alias-interactive-bg-hover)}.unvT_actions{margin-left:auto}
    .unvT_overlay{position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center}.unvT_mask{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}
    .unvT_panel{position:relative;z-index:1;width:min(1280px,calc(100vw - 48px));height:min(860px,calc(100vh - 64px));border-radius:16px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv3);display:flex;flex-direction:column}.unvT_panelHead{padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base)}.unvT_frame{flex:1;min-height:0;width:100%;border:0;background:#fff}
    `;

    // src/client/styles/worktree.ts
    var worktreeStyles = `
    .uvf_root{position:fixed;right:16px;top:20px;z-index:1200;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}.uvf_win{pointer-events:auto;position:relative;width:480px;height:340px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.3);display:flex;flex-direction:column}.uvf_win_folded{width:auto!important;height:auto!important;min-width:240px}.uvf_win_max{position:fixed;inset:20px;width:auto!important;height:auto!important;z-index:1300}
    .uvf_bar{display:flex;align-items:center;gap:8px;height:34px;padding:0 8px 0 12px;background:#0f172a;color:#e2e8f0;cursor:grab;user-select:none;flex:none}.uvf_pulse,.uvf_dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex:none}.uvf_title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600}.uvf_file{color:#94a3b8;font-weight:400}.uvf_chip{font-size:10.5px;border:1px solid #334155;border-radius:999px;padding:1px 8px;color:#94a3b8}.uvf_chip[data-status=ready]{color:#86efac;border-color:#15803d}.uvf_chip[data-status=draft]{color:#fcd34d;border-color:#b45309}.uvf_btn{width:22px;height:22px;border:0;border-radius:6px;background:#1e293b;color:#e2e8f0;cursor:pointer}.uvf_btn:hover{background:#334155}
    .uvf_units{display:flex;gap:4px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-x:auto}.uvf_unit{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-interactive-bg-subtle);color:var(--dsw-alias-label-secondary);font:11px/16px inherit;padding:0 10px;cursor:pointer;white-space:nowrap}.uvf_unit_on{background:#e3f4ea;border-color:#1a7f4b;color:#1a7f4b}.uvf_frame{flex:1;min-height:0;width:100%;border:0;background:var(--dsw-alias-bg-base)}
    .uvf_handle{position:absolute;z-index:5}.uvf_h_nw,.uvf_h_ne,.uvf_h_sw,.uvf_h_se{width:16px;height:16px}.uvf_h_nw{left:0;top:0;cursor:nwse-resize}.uvf_h_ne{right:0;top:0;cursor:nesw-resize}.uvf_h_sw{left:0;bottom:0;cursor:nesw-resize}.uvf_h_se{right:0;bottom:0;cursor:nwse-resize}.uvf_h_n{left:8px;right:8px;top:0;height:6px;cursor:ns-resize}.uvf_h_s{left:8px;right:8px;bottom:0;height:6px;cursor:ns-resize}.uvf_h_w{left:0;top:8px;bottom:8px;width:6px;cursor:ew-resize}.uvf_h_e{right:0;top:8px;bottom:8px;width:6px;cursor:ew-resize}
    .uvf_panel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;margin:8px auto 4px;max-width:900px;width:100%;overflow:hidden}.uvf_panelHead,.uvf_panelFoot{display:flex;align-items:center;gap:8px;padding:8px 12px}.uvf_panelHead{cursor:pointer}.uvf_panelTitle{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}.uvf_panelChip{font-size:11px;border-radius:999px;padding:1px 8px;background:var(--dsw-alias-interactive-bg-subtle)}.uvf_panelFrame{width:100%;height:440px;border:0}.uvf_panelFoot{border-top:1px solid var(--dsw-alias-border-l2)}.uvf_hint,.uvf_error{flex:1;font-size:12px;color:var(--dsw-alias-label-tertiary)}.uvf_error{color:#c0392b}.uvf_action{font:12px/18px inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 14px;cursor:pointer;background:var(--dsw-alias-interactive-bg-subtle)}.uvf_action[data-kind=merge],.uvf_action[data-kind=ready]{background:#1a7f4b;border-color:#1a7f4b;color:#fff}.uvf_action:disabled{opacity:.55}
    `;

    // src/client/index.tsx
    var NAMESPACE = "univer";
    var inject = ["slots", "locale", "conversationEvents"];
    function apply(ctx) {
      injectStyles("@univer-cli/dsh-univer-plugin/styles", `${previewStyles}
    ${worktreeStyles}`);
      try {
        ctx.conversationEvents.register(univerTargetDefinition);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("already registered")) throw error;
      }
      ctx.effect(() => ctx.locale.register(NAMESPACE, { zh, en }), "univer: dictionaries");
      ctx.effect(() => ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
        name: "conversation.chat.turnTail",
        id: "univer",
        priority: -10,
        locale: NAMESPACE,
        select: selectUniverPreview,
        inject: () => ({})
      }, PreviewCard)), "univer: turn preview");
      ctx.effect(() => ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
        name: "conversation.input.dock",
        id: "univer-dock",
        order: 400,
        inject: () => ({ t: ctx.locale.bind(NAMESPACE) })
      }, UniverDock)), "univer: worktree dock");
    }
    function injectStyles(id, css) {
      if (document.querySelector(`style[data-plugin-css=${JSON.stringify(id)}]`) !== null) return;
      const style = document.createElement("style");
      style.dataset.plugin = "@univer-cli/dsh-univer-plugin";
      style.dataset.pluginCss = id;
      style.textContent = css;
      document.head.appendChild(style);
    }

    return module.exports;
  }
});
