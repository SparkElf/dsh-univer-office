// Assembles the final lib/client.js for dsh-univer-plugin v0.2 from the
// original 0.1.0 file (the card CSS/UI regions are reused verbatim) plus the
// new dock regions (floating windows + merge panel with review actions).
// Run from the repo root against the PRISTINE 0.1.0 source, never against an
// already-assembled file:
//
//   git show HEAD:lib/client.js > /tmp/orig-client.js
//   node tools/assemble-client.mjs /tmp/orig-client.js
//
// Writes the result to lib/client.js next to this script's directory.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourcePath = process.argv[2]
if (sourcePath === undefined) {
  console.error('usage: node tools/assemble-client.mjs <original lib/client.js>')
  process.exit(1)
}
const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const src = readFileSync(sourcePath, 'utf8')

function insertOnce(text, anchor, insertion) {
  const index = text.indexOf(anchor)
  if (index === -1) throw new Error(`anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`)
  if (text.indexOf(anchor, index + 1) !== -1) throw new Error(`anchor not unique: ${JSON.stringify(anchor.slice(0, 80))}`)
  return text.slice(0, index) + insertion + text.slice(index)
}

function insertAfter(text, anchor, insertion) {
  const index = text.indexOf(anchor)
  if (index === -1) throw new Error(`anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`)
  if (text.indexOf(anchor, index + 1) !== -1) throw new Error(`anchor not unique: ${JSON.stringify(anchor.slice(0, 80))}`)
  return text.slice(0, index + anchor.length) + insertion + text.slice(index + anchor.length)
}

// 1. dockCss const right after the card css line (module scope, before use).
const dockCssDeclaration = `		/** Floating windows + merge panel styles; theme tokens only, no literal UI colors besides the dark bar. */
		const dockCss = ".uvf_root{position:fixed;right:16px;top:20px;z-index:1200;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}.uvf_win{pointer-events:auto;position:relative;width:480px;height:340px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.30);display:flex;flex-direction:column}.uvf_win_folded{width:auto;height:auto;min-width:240px}.uvf_win_max{position:fixed;left:20px;top:20px;right:20px;bottom:20px;width:auto;height:auto;z-index:1300}.uvf_bar{display:flex;align-items:center;gap:8px;height:34px;padding:0 8px 0 12px;background:#0f172a;color:#e2e8f0;cursor:grab;user-select:none;flex:none;box-sizing:border-box}.uvf_bar:active{cursor:grabbing}.uvf_pulse{flex:none;width:7px;height:7px;border-radius:50%;background:#22a06b}.uvf_title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600}.uvf_file{color:#94a3b8;font-weight:400}.uvf_chip{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:10.5px;border-radius:999px;padding:1px 8px;border:1px solid #334155;color:#94a3b8}.uvf_chip[data-status=ready]{color:#86efac;border-color:#15803d;background:rgba(21,128,61,.35)}.uvf_chip[data-status=draft]{color:#fcd34d;border-color:#b45309;background:rgba(180,83,9,.30)}.uvf_dot{flex:none;width:6px;height:6px;border-radius:50%;background:#94a3b8}.uvf_chip[data-status=ready] .uvf_dot{background:#22c55e}.uvf_chip[data-status=draft] .uvf_dot{background:#f59e0b}.uvf_btn{flex:none;width:22px;height:22px;border:0;border-radius:6px;background:#1e293b;color:#e2e8f0;font:12px/1 ui-monospace,monospace;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}.uvf_btn:hover{background:#334155}.uvf_units{flex:none;display:flex;gap:4px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-x:auto;background:var(--dsw-alias-bg-base)}.uvf_unit{flex:none;display:inline-flex;align-items:center;gap:4px;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-interactive-bg-subtle);color:var(--dsw-alias-label-secondary);font:11px/16px inherit;padding:0 10px;cursor:pointer}.uvf_unit_on{background:#e3f4ea;border-color:#1a7f4b;color:#1a7f4b}.uvf_unit_icon{flex:none;font-size:11px}.uvf_unit[data-kind=added] .uvf_unit_icon{color:#16a34a}.uvf_unit[data-kind=modified] .uvf_unit_icon{color:#2563eb}.uvf_unit[data-kind=deleted] .uvf_unit_icon{color:#dc2626}.uvf_unit[data-kind=conflict] .uvf_unit_icon{color:#ea580c}.uvf_frame{flex:1;min-height:0;width:100%;border:0;display:block;background:var(--dsw-alias-bg-base)}.uvf_note{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:14px;color:var(--dsw-alias-label-tertiary);font-size:12.5px;text-align:center}.uvf_start{color:var(--dsw-alias-brand-text, var(--dsw-alias-label-primary));cursor:pointer;background:var(--dsw-alias-interactive-bg-subtle);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 12px;font-family:inherit;font-size:12px;line-height:18px}.uvf_start:hover{background:var(--dsw-alias-interactive-bg-hover)}.uvf_handle{position:absolute;z-index:5;opacity:.55}.uvf_handle:hover{opacity:1}.uvf_h_nw{left:0;top:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(315deg,transparent 50%,var(--dsw-alias-label-tertiary) 50%)}.uvf_h_ne{right:0;top:0;width:16px;height:16px;cursor:nesw-resize;background:linear-gradient(45deg,transparent 50%,var(--dsw-alias-label-tertiary) 50%)}.uvf_h_sw{left:0;bottom:0;width:16px;height:16px;cursor:nesw-resize;background:linear-gradient(45deg,transparent 50%,var(--dsw-alias-label-tertiary) 50%)}.uvf_h_se{right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(315deg,transparent 50%,var(--dsw-alias-label-tertiary) 50%)}.uvf_h_n{left:8px;right:8px;top:0;height:6px;cursor:ns-resize}.uvf_h_s{left:8px;right:8px;bottom:0;height:6px;cursor:ns-resize}.uvf_h_w{left:0;top:8px;bottom:8px;width:6px;cursor:ew-resize}.uvf_h_e{right:0;top:8px;bottom:8px;width:6px;cursor:ew-resize}.uvf_panel{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;margin:8px auto 4px;max-width:900px;width:100%;overflow:hidden}.uvf_panelHead{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer}.uvf_panelHead:hover{background:var(--dsw-alias-interactive-bg-subtle)}.uvf_panelTitle{flex:1;min-width:0;display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.uvf_panelChip{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-variant-numeric:tabular-nums;background:var(--dsw-alias-interactive-bg-subtle);color:var(--dsw-alias-label-tertiary);border-radius:999px;padding:1px 8px}.uvf_panelChip[data-status=ready]{color:#1a7f4b;background:#e3f4ea}.uvf_panelChip[data-status=draft]{color:#b45309;background:#fef3c7}.uvf_panelChip .uvf_dot{width:6px;height:6px;border-radius:50%;background:#94a3b8}.uvf_panelChip[data-status=ready] .uvf_dot{background:#22c55e}.uvf_panelChip[data-status=draft] .uvf_dot{background:#f59e0b}.uvf_panelFrame{width:100%;height:440px;border:0;display:block;background:var(--dsw-alias-bg-base)}.uvf_panelFoot{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--dsw-alias-border-l2)}.uvf_hint{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.uvf_error{flex:1;min-width:0;color:#c0392b;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.uvf_action{font-family:inherit;font-size:12px;line-height:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 14px;cursor:pointer;background:var(--dsw-alias-interactive-bg-subtle);color:var(--dsw-alias-label-primary)}.uvf_action:hover{background:var(--dsw-alias-interactive-bg-hover)}.uvf_action:disabled{opacity:.55;cursor:default}.uvf_action[data-kind=merge]{background:#1a7f4b;border-color:#1a7f4b;color:#fff}.uvf_action[data-kind=merge]:hover{background:#16683e}.uvf_action[data-kind=ready]{background:#1a7f4b;border-color:#1a7f4b;color:#fff}.uvf_action[data-kind=ready]:hover{background:#16683e}.uvf_action[data-kind=discard]{color:var(--dsw-alias-label-tertiary)}";
`
let out = insertOnce(src, '\t\tconst tagId = "@univer-cli/dsh-univer-plugin/card.css";', dockCssDeclaration)

// 2. Dock style tag: mirror the card style block right after it.
const dockStyleBlock = `		const dockTagId = "@univer-cli/dsh-univer-plugin/dock.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(dockTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@univer-cli/dsh-univer-plugin";
			tag.dataset.pluginCss = dockTagId;
			tag.textContent = dockCss;
			document.head.appendChild(tag);
		}
`
out = insertOnce(out, '\t\tconst cardCss = {', dockStyleBlock)

// 3. New regions before the locales region.
const newRegions = `		//#region dock css map
		/** Class tokens for the floating windows and merge panel styles above. */
		const dockCssClass = {
			"root": "uvf_root",
			"win": "uvf_win",
			"winFolded": "uvf_win_folded",
			"winMax": "uvf_win_max",
			"bar": "uvf_bar",
			"pulse": "uvf_pulse",
			"title": "uvf_title",
			"file": "uvf_file",
			"chip": "uvf_chip",
			"dot": "uvf_dot",
			"btn": "uvf_btn",
			"units": "uvf_units",
			"unit": "uvf_unit",
			"unitOn": "uvf_unit_on",
			"unitIcon": "uvf_unit_icon",
			"frame": "uvf_frame",
			"note": "uvf_note",
			"start": "uvf_start",
			"handle": "uvf_handle",
			"hNw": "uvf_h_nw",
			"hNe": "uvf_h_ne",
			"hSw": "uvf_h_sw",
			"hSe": "uvf_h_se",
			"hN": "uvf_h_n",
			"hS": "uvf_h_s",
			"hW": "uvf_h_w",
			"hE": "uvf_h_e",
			"panel": "uvf_panel",
			"panelHead": "uvf_panelHead",
			"panelTitle": "uvf_panelTitle",
			"panelChip": "uvf_panelChip",
			"panelFrame": "uvf_panelFrame",
			"panelFoot": "uvf_panelFoot",
			"hint": "uvf_hint",
			"error": "uvf_error",
			"action": "uvf_action"
		};
		//#endregion
		//#region session targets
		/** Resolve a possibly relative target against the session cwd. */
		function resolveTargetFile(file, cwd) {
			if (file === "" || file[0] === "/" || /^[a-zA-Z]:/.test(file)) return file;
			if (cwd === void 0 || cwd === null || cwd === "") return file;
			return cwd.replace(/\\/+$/, "") + "/" + file.replace(/^\\.\\//, "");
		}
		/**
		 * .univer target files (plus the worktree ids this session mentioned)
		 * derived from the engine-owned turn data of every turn in the window.
		 * Pure over the ConversationSnapshot + cwd — replay-safe, no
		 * subscriptions. Relative paths (agents often cd into a subdir and run
		 * univer with no tool workdir) resolve against the session cwd so the
		 * node half can address the file from the server process.
		 */
		function univerTargetsOf(session, cwd) {
			const files = [];
			const worktreeIds = new Set();
			const timeline = session === null || session === void 0 || session.chat === void 0 ? void 0 : session.chat.timeline;
			if (timeline === void 0 || timeline.turns === void 0) return { files, worktreeIds };
			for (const turn of timeline.turns.values()) {
				const data = turn.data === void 0 ? void 0 : turn.data.get("univerPreview");
				if (data === void 0 || !Array.isArray(data.targets)) continue;
				for (const target of data.targets) {
					if (typeof target.file !== "string" || target.file === "") continue;
					const file = resolveTargetFile(target.file, cwd);
					if (files.indexOf(file) === -1) files.push(file);
					if (typeof target.worktree === "string" && target.worktree !== "") worktreeIds.add(target.worktree);
				}
			}
			return { files, worktreeIds };
		}
		//#endregion
		//#region float window
		/** Worktree display name: the agent-given name, else the worktree id. */
		function worktreeTitle(worktree) {
			return worktree.name !== "" && worktree.name !== void 0 && worktree.name !== null ? worktree.name : worktree.worktreeId;
		}
		/** Append the selected unit to a viewer deep-link (host URLs carry none). */
		function unitUrlOf(baseUrl, unitId) {
			if (typeof baseUrl !== "string") return baseUrl;
			if (unitId === void 0 || unitId === null) return baseUrl;
			return baseUrl + "&unit=" + encodeURIComponent(unitId);
		}
		/** Icons per change kind on the unit chips (mirrors the Viewer's badges). */
		const UNIT_ICONS = { added: "\uff0b", modified: "\u270e", deleted: "\uff0d", conflict: "\u26a0" };
		/**
		 * Unit navigation chips: only the units this worktree actually changed
		 * (added / modified / deleted / conflict). The default selection is the
		 * first entry; each chip carries a kind icon and a localized kind label.
		 */
		function UnitChips(props) {
			const units = Array.isArray(props.units) ? props.units : [];
			if (units.length <= 1) return null;
			return (0, react_jsx_runtime.jsx)("div", {
				className: dockCssClass.units,
				children: units.map((unit) => (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: dockCssClass.unit + (unit.unitId === props.selected ? " " + dockCssClass.unitOn : ""),
					"data-kind": unit.kind,
					title: props.t("dock.unit." + unit.kind),
					onClick: () => props.onSelect(unit.unitId),
					children: [
						(0, react_jsx_runtime.jsx)("span", { className: dockCssClass.unitIcon, children: UNIT_ICONS[unit.kind] ?? "" }),
						unit.name !== "" ? unit.name : props.t("dock.unit." + unit.kind)
					]
				}, unit.unitId))
			});
		}
		/** Window resize bounds in px (viewport-safe upper bounds, no window reads). */
		const WINDOW_MIN_W = 280;
		const WINDOW_MIN_H = 180;
		const WINDOW_MAX_W = 1600;
		const WINDOW_MAX_H = 1000;
		/** Resize handles: four corners + four edges (dir letters = affected sides). */
		const RESIZE_HANDLES = [
			{ dir: "nw", cls: "hNw" },
			{ dir: "n", cls: "hN" },
			{ dir: "ne", cls: "hNe" },
			{ dir: "w", cls: "hW" },
			{ dir: "e", cls: "hE" },
			{ dir: "sw", cls: "hSw" },
			{ dir: "s", cls: "hS" },
			{ dir: "se", cls: "hSe" }
		];
		/**
		 * One draft/ready worktree window: dark draggable bar, click-to-maximize,
		 * − fold, ⤢ maximize, ✕ dismiss, and a live read-only Viewer iframe
		 * (remounted on status transitions so a draft<->ready flip rebuilds the
		 * collaboration session).
		 */
		function UniverFloatWindow(props) {
			const worktree = props.worktree;
			const t = props.t;
			const [folded, setFolded] = react.useState(false);
			const [maximized, setMaximized] = react.useState(false);
			const [offset, setOffset] = react.useState({ x: 0, y: 0 });
			const [size, setSize] = react.useState({ w: 480, h: 340 });
			const [starting, setStarting] = react.useState(false);
			const [unitId, setUnitId] = react.useState(null);
			const downRef = react.useRef(null);
			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				// Buttons own their clicks: capture would reroute the pointerup to
				// the bar and swallow the button's click event.
				if (event.target !== null && typeof event.target.closest === "function" && event.target.closest("button") !== null) return;
				const startX = event.clientX;
				const startY = event.clientY;
				downRef.current = { startX, startY, base: offset, moved: false };
				const bar = event.currentTarget;
				// Pointer capture keeps moves/up routing to the bar while the cursor
				// travels over the cross-origin Viewer iframe (otherwise the parent
				// document stops receiving pointer events mid-drag).
				try {
					bar.setPointerCapture(event.pointerId);
				} catch (error) {
					/* jsdom lacks setPointerCapture; listeners degrade gracefully */
				}
				const move = (ev) => {
					const down = downRef.current;
					if (down === null) return;
					const dx = ev.clientX - down.startX;
					const dy = ev.clientY - down.startY;
					// A press smaller than the slop is a click (maximize), not a drag.
					if (!down.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
					down.moved = true;
					setOffset({ x: down.base.x + dx, y: down.base.y + dy });
				};
				const up = () => {
					const down = downRef.current;
					downRef.current = null;
					bar.removeEventListener("pointermove", move);
					bar.removeEventListener("pointerup", up);
					bar.removeEventListener("pointercancel", up);
					if (down !== null && !down.moved && !maximized) setMaximized(true);
				};
				bar.addEventListener("pointermove", move);
				bar.addEventListener("pointerup", up);
				bar.addEventListener("pointercancel", up);
			};
			const onResizeDown = (dir) => (event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.stopPropagation();
				const startX = event.clientX;
				const startY = event.clientY;
				const baseSize = size;
				const baseOffset = offset;
				const handle = event.currentTarget;
				// Pointer capture keeps moves routing to the handle over the
				// cross-origin iframe while the cursor leaves it mid-drag.
				try {
					handle.setPointerCapture(event.pointerId);
				} catch (error) {
					/* jsdom lacks setPointerCapture; listeners degrade gracefully */
				}
				const clampW = (v) => Math.min(WINDOW_MAX_W, Math.max(WINDOW_MIN_W, v));
				const clampH = (v) => Math.min(WINDOW_MAX_H, Math.max(WINDOW_MIN_H, v));
				const move = (ev) => {
					const dx = ev.clientX - startX;
					const dy = ev.clientY - startY;
					let w = baseSize.w;
					let h = baseSize.h;
					let x = baseOffset.x;
					let y = baseOffset.y;
					// The window stack is RIGHT-anchored: west resizes keep the right
					// edge fixed (no x shift); east resizes move the window with the
					// growth so the left edge stays fixed. Vertically the stack is
					// top-anchored: north resizes shift up (bottom fixed), south
					// keeps the top fixed.
					if (dir.includes("e")) {
						const next = clampW(baseSize.w + dx);
						x = baseOffset.x + (next - baseSize.w);
						w = next;
					}
					if (dir.includes("w")) {
						w = clampW(baseSize.w - dx);
					}
					if (dir.includes("s")) {
						h = clampH(baseSize.h + dy);
					}
					if (dir.includes("n")) {
						const next = clampH(baseSize.h - dy);
						y = baseOffset.y + (baseSize.h - next);
						h = next;
					}
					setSize({ w, h });
					setOffset({ x, y });
				};
				const up = () => {
					handle.removeEventListener("pointermove", move);
					handle.removeEventListener("pointerup", up);
					handle.removeEventListener("pointercancel", up);
				};
				handle.addEventListener("pointermove", move);
				handle.addEventListener("pointerup", up);
				handle.addEventListener("pointercancel", up);
			};
			const startGateway = async () => {
				if (starting) return;
				setStarting(true);
				try {
					await univerApi("/univer-api/ensure-daemon", { method: "POST" });
				} catch (error) {
					/* next poll reflects the real daemon state either way */
				}
				setStarting(false);
			};
			const name = worktreeTitle(worktree);
			const units = Array.isArray(worktree.units) ? worktree.units : [];
			const selectedUnit = unitId !== null && units.some((u) => u.unitId === unitId)
				? unitId
				: units[0]?.unitId;
			const frameUrl = unitUrlOf(worktree.worktreeUrl, selectedUnit);
			const cls = [dockCssClass.win];
			if (folded) cls.push(dockCssClass.winFolded);
			if (maximized) cls.push(dockCssClass.winMax);
			const style = maximized ? void 0 : {
				// Folded windows collapse to their bar (the CSS class sizes them).
				...(folded ? {} : { width: size.w + "px", height: size.h + "px" }),
				transform: "translate(" + offset.x + "px, " + offset.y + "px)"
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: cls.join(" "),
				style,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: dockCssClass.bar,
						onPointerDown,
						children: [
							(0, react_jsx_runtime.jsx)("span", { className: dockCssClass.pulse, title: t("dock.live") }),
							(0, react_jsx_runtime.jsxs)("span", {
								className: dockCssClass.title,
								children: [
									name,
									(0, react_jsx_runtime.jsx)("span", {
										className: dockCssClass.file,
										children: "  \u00b7 " + basenameOf(props.file)
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: dockCssClass.chip,
								"data-status": worktree.status,
								children: [
									(0, react_jsx_runtime.jsx)("span", { className: dockCssClass.dot }),
									worktree.status === "ready" ? t("dock.ready") : t("dock.draft")
								]
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dockCssClass.btn,
								"aria-label": folded ? t("dock.expand") : t("dock.fold"),
								title: folded ? t("dock.expand") : t("dock.fold"),
								onClick: () => setFolded(!folded),
								children: folded ? "+" : "\u2212"
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dockCssClass.btn,
								"aria-label": maximized ? t("dock.restore") : t("dock.maximize"),
								title: maximized ? t("dock.restore") : t("dock.maximize"),
								onClick: () => setMaximized(!maximized),
								children: maximized ? "\u2921" : "\u2922"
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dockCssClass.btn,
								"aria-label": t("dock.close"),
								title: t("dock.close"),
								onClick: () => props.onDismiss(),
								children: "\u2715"
							})
						]
					}),
					folded ? null : (0, react_jsx_runtime.jsxs)(react.Fragment, {
						children: [
							(0, react_jsx_runtime.jsx)(UnitChips, { units, selected: selectedUnit, t, onSelect: setUnitId }),
							(0, react_jsx_runtime.jsxs)("div", {
								style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
								children: [
									typeof frameUrl === "string"
										? (0, react_jsx_runtime.jsx)("iframe", {
											className: dockCssClass.frame,
											src: frameUrl,
											title: name
										}, worktree.worktreeId + ":" + worktree.status + ":" + String(selectedUnit))
										: (0, react_jsx_runtime.jsxs)("div", {
											className: dockCssClass.note,
											children: [
												(0, react_jsx_runtime.jsx)("span", { children: t("dock.gatewayDown") }),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: dockCssClass.start,
													disabled: starting,
													onClick: startGateway,
													children: starting ? t("dock.startingGateway") : t("dock.startGateway")
												})
											]
										})
								]
							})
						]
					}),
					!folded && !maximized ? RESIZE_HANDLES.map((h) => (0, react_jsx_runtime.jsx)("div", {
						className: dockCssClass.handle + " " + dockCssClass[h.cls],
						title: t("dock.resize"),
						onPointerDown: onResizeDown(h.dir)
					}, h.dir)) : null
				]
			});
		}
		//#endregion
		//#region merge panel
		/**
		 * Session-end merge panel: embedded Viewer merge-preview page for a ready
		 * worktree, or the trunk page once it merged. The footer carries the
		 * human review decisions (merge / reopen / discard) — these belong to the
		 * user, not to a model tool. Collapsible; a merged panel closes with ✕.
		 */
		function UniverMergePanel(props) {
			const worktree = props.worktree;
			const t = props.t;
			const [open, setOpen] = react.useState(true);
			const [busy, setBusy] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [unitId, setUnitId] = react.useState(null);
			const name = worktreeTitle(worktree);
			const ready = worktree.status === "ready";
			const units = Array.isArray(worktree.units) ? worktree.units : [];
			const selectedUnit = unitId !== null && units.some((u) => u.unitId === unitId)
				? unitId
				: units[0]?.unitId;
			const url = unitUrlOf(ready ? worktree.mergeUrl : worktree.worktreeUrl, selectedUnit);
			const runAction = async (action) => {
				if (busy !== null) return;
				setBusy(action);
				setError(null);
				try {
					const result = await props.performAction(action);
					if (result !== null && typeof result === "object" && result.ok === true) {
						props.applyState(result.state);
					} else {
						setError(result !== null && typeof result === "object" && typeof result.reason === "string"
							? result.reason
							: "action failed");
					}
				} catch (err) {
					setError(String(err));
				}
				setBusy(null);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: dockCssClass.panel,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: dockCssClass.panelHead,
						onClick: () => setOpen(!open),
						children: [
							(0, react_jsx_runtime.jsxs)("span", {
								className: dockCssClass.panelTitle,
								children: [
									"\ud83e\uddfe " + (ready ? t("dock.mergeTitle") : t("dock.reviewTitle")) + "\u300c" + name + "\u300d",
									(0, react_jsx_runtime.jsx)("span", {
										className: dockCssClass.file,
										children: "  \u00b7 " + basenameOf(props.file)
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: dockCssClass.panelChip,
								"data-status": worktree.status,
								children: [
									(0, react_jsx_runtime.jsx)("span", { className: dockCssClass.dot }),
									ready ? t("dock.mergeReady") : t("dock.draft")
								]
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dockCssClass.btn,
								"aria-label": open ? t("dock.collapse") : t("dock.expand"),
								title: open ? t("dock.collapse") : t("dock.expand"),
								onClick: () => setOpen(!open),
								children: open ? "\u25be" : "\u25b4"
							})
						]
					}),
					open ? (0, react_jsx_runtime.jsx)(UnitChips, { units, selected: selectedUnit, t, onSelect: setUnitId }) : null,
					open && typeof url === "string" ? (0, react_jsx_runtime.jsx)("iframe", {
						className: dockCssClass.panelFrame,
						src: url,
						title: name
					}, worktree.worktreeId + ":" + worktree.status + ":" + String(selectedUnit)) : null,
					open ? (0, react_jsx_runtime.jsxs)("div", {
						className: dockCssClass.panelFoot,
						children: [
							error !== null
								? (0, react_jsx_runtime.jsx)("span", {
									className: dockCssClass.error,
									children: t("dock.conflict") + error
								})
								: (0, react_jsx_runtime.jsx)("span", {
									className: dockCssClass.hint,
									children: ready ? "" : t("dock.notReady")
								}),
							ready ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dockCssClass.action,
								"data-kind": "reopen",
								disabled: busy !== null,
								onClick: () => { void runAction("reopen"); },
								children: busy === "reopen" ? t("dock.doing") : t("dock.reopen")
							}) : null,
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: dockCssClass.action,
								"data-kind": "discard",
								disabled: busy !== null,
								onClick: () => { void runAction("discard"); },
								children: busy === "discard" ? t("dock.doing") : t("dock.discard")
							}),
							ready
								? (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: dockCssClass.action,
									"data-kind": "merge",
									disabled: busy !== null,
									onClick: () => { void runAction("merge"); },
									children: busy === "merge" ? t("dock.doing") : t("dock.merge")
								})
								: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: dockCssClass.action,
									"data-kind": "ready",
									disabled: busy !== null,
									onClick: () => { void runAction("ready"); },
									children: busy === "ready" ? t("dock.doing") : t("dock.markReady")
								})
						]
					}) : null
				]
			});
		}
		//#endregion
		//#region dock entry
		/**
		 * The input-region dock entry: derives this session's .univer targets from
		 * the conversation snapshot, polls /univer-api/state per file (~900ms,
		 * server-side TTL keeps the CLI load bounded), then renders:
		 *  - a floating live window per draft worktree (and per ready worktree
		 *    while the session is still running);
		 *  - the session-end merge panel per ready/merged worktree once the
		 *    session goes idle (ready + session end closes the window), whose
		 *    footer actions round-trip through /univer-api/worktree-action.
		 */
		function UniverDock(props) {
			const session = props.session;
			const t = props.t;
			const sessionCwd = typeof props.useSessions === "function"
				? props.useSessions((s) => (s.byId[props.sessionId] !== void 0 ? s.byId[props.sessionId].cwd : void 0))
				: void 0;
			const [states, setStates] = react.useState({});
			const [dismissed, setDismissed] = react.useState({});
			const derived = react.useMemo(() => univerTargetsOf(session === void 0 ? null : session, sessionCwd), [session, sessionCwd]);
			const files = derived.files;
			const worktreeIds = derived.worktreeIds;
			const filesKey = files.join("\u0000");
			react.useEffect(() => {
				if (files.length === 0) return;
				setStates({});
				let alive = true;
				const poll = async () => {
					for (const file of files) {
						try {
							const state = await univerApi("/univer-api/state?file=" + encodeURIComponent(file));
							if (!alive) return;
							setStates((prev) => (prev[file] === state ? prev : { ...prev, [file]: state }));
						} catch (error) {
							/* node half not mounted yet — next poll retries */
						}
					}
				};
				void poll();
				const timer = window.setInterval(() => { void poll(); }, 900);
				return () => {
					alive = false;
					window.clearInterval(timer);
				};
			}, [filesKey]);
			const windows = [];
			const panels = [];
			const running = session !== null && session !== void 0 && session.running === true;
			for (const file of files) {
				const state = states[file];
				if (state === void 0 || !Array.isArray(state.worktrees)) continue;
				for (const wt of state.worktrees) {
					if (typeof wt.worktreeId !== "string") continue;
					// Worktrees this session never mentioned (other agents' work) stay hidden.
					if (worktreeIds.size > 0 && !worktreeIds.has(wt.worktreeId)) continue;
					// Non-terminal worktrees: floating window while the session runs,
					// the review panel once it goes idle. Terminal states (merged /
					// discarded) render nowhere.
					if (wt.status === "draft" || wt.status === "ready") {
						if (running) {
							if (dismissed[wt.worktreeId] === wt.status) continue;
							windows.push({ file, worktree: wt });
						} else {
							panels.push({ file, worktree: wt });
						}
					}
				}
			}
			const dismiss = (worktreeId, status) => setDismissed((prev) => ({ ...prev, [worktreeId]: status }));
			return (0, react_jsx_runtime.jsxs)(react.Fragment, {
				children: [
					windows.length > 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: dockCssClass.root,
						children: windows.map((item) => (0, react_jsx_runtime.jsx)(UniverFloatWindow, {
							file: item.file,
							worktree: item.worktree,
							t,
							onDismiss: () => dismiss(item.worktree.worktreeId, item.worktree.status)
						}, item.worktree.worktreeId))
					}) : null,
					panels.map((item) => (0, react_jsx_runtime.jsx)(UniverMergePanel, {
						file: item.file,
						worktree: item.worktree,
						t,
						performAction: (action) => univerApi("/univer-api/worktree-action", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ action, file: item.file, worktree: item.worktree.worktreeId })
						}),
						applyState: (state) => setStates((prev) => ({ ...prev, [item.file]: state }))
					}, "merge:" + item.worktree.worktreeId))
				]
			});
		}
		//#endregion
`
out = insertOnce(out, '\t\t//#region locales', newRegions)

// 4. Locale keys.
const zhKeys = `			"dock.live": "实时同步",
			"dock.draft": "进行中",
			"dock.ready": "待确认",
			"dock.mergeReady": "待确认",
			"dock.unit.added": "新增",
			"dock.unit.modified": "修改",
			"dock.unit.deleted": "删除",
			"dock.unit.conflict": "冲突",
			"dock.fold": "折叠",
			"dock.expand": "展开",
			"dock.maximize": "放大",
			"dock.restore": "还原",
			"dock.close": "关闭",
			"dock.resize": "拖动调整大小",
			"dock.gatewayDown": "Univer Gateway 未运行，无法实时预览",
			"dock.startGateway": "启动 Gateway",
			"dock.startingGateway": "正在启动…",
			"dock.mergeTitle": "合并审阅",
			"dock.reviewTitle": "worktree 审阅",
			"dock.markReady": "标记为待确认",
			"dock.notReady": "尚未确认 —— 确认后即可查看合并预览并合并",
			"dock.collapse": "收起",
			"dock.merge": "合并到 trunk",
			"dock.reopen": "重新打开",
			"dock.discard": "丢弃",
			"dock.doing": "处理中…",
			"dock.conflict": "合并冲突：",
`
out = insertOnce(out, '\t\t\t"cliMissing": "未检测到 univer CLI，请先安装 univer-cli"', zhKeys)

const enKeys = `			"dock.live": "live sync",
			"dock.draft": "in progress",
			"dock.ready": "awaiting confirmation",
			"dock.mergeReady": "awaiting confirmation",
			"dock.unit.added": "Added",
			"dock.unit.modified": "Modified",
			"dock.unit.deleted": "Deleted",
			"dock.unit.conflict": "Conflict",
			"dock.fold": "Collapse",
			"dock.expand": "Expand",
			"dock.maximize": "Maximize",
			"dock.restore": "Restore",
			"dock.close": "Close",
			"dock.resize": "Drag to resize",
			"dock.gatewayDown": "Univer Gateway is not running; live preview unavailable",
			"dock.startGateway": "Start Gateway",
			"dock.startingGateway": "Starting…",
			"dock.mergeTitle": "Merge review",
			"dock.reviewTitle": "Worktree review",
			"dock.markReady": "Confirm",
			"dock.notReady": "Not confirmed yet — confirm it to review the merge preview and merge",
			"dock.collapse": "Collapse",
			"dock.merge": "Merge into trunk",
			"dock.reopen": "Reopen",
			"dock.discard": "Discard",
			"dock.doing": "Working…",
			"dock.conflict": "Merge conflict: ",
`
out = insertOnce(out, '\t\t\t"cliMissing": "univer CLI not detected; install univer-cli first"', enKeys)

// 5. Dock registration in apply.
const dockRegistration = `			ctx.effect(() => ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "univer-dock",
				order: 400,
				inject: () => ({ t: ctx.locale.bind(NS) })
			}, UniverDock)), "univer: live dock");
`
out = insertAfter(out, '\t\t\t}, UniverPreviewCard)), "univer: turn tail card");', dockRegistration)

mkdirSync(join(root, 'lib'), { recursive: true })
// Absolute same-origin URL: identical behavior in the browser, but also
// resolvable by Node's global fetch under jsdom smoke tests.
out = out.replace(
  'const res = await fetch(path, options)',
  'const res = await fetch(window.location.origin + path, options)',
)
writeFileSync(join(root, 'lib/client.js'), out)
console.log('wrote lib/client.js (' + out.length + ' chars)')
