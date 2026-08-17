---
name: univer
description: Create, inspect, edit, import, export, and hand off multi-Unit .univer files with isolated worktrees and version-matched Facade API lookup. Use for any Univer file task before loading a Unit-specific skill.
---

# Univer files

Use the structured `univer_*` tools. Do not invoke a global `univer` CLI, edit `.univer` storage directly, or substitute unrelated Office writers.

## Addressing model

- Treat a `.univer` file as a multi-Unit container. Address every content operation with `file`, `unitId`, and an explicit trunk or `worktreeId` scope.
- Treat trunk as reviewed content. Perform all Unit creation, removal, import, and Facade mutation in a draft worktree.
- Treat `ready` as submission for review, `reopen` as the explicit return to editing, and `merged` or `discarded` as terminal.

## Workflow

1. Call `univer_status` before editing an existing file or continuing a known worktree.
2. For a new target, call `univer_new`, then `univer_worktree` with `action: "create"`.
3. Create an empty Unit with `univer_unit`, or import an Office file with `univer_import`.
4. Load the matching Unit skill before authoring Facade code.
5. Use `univer_api` with `action: "find"`, then `action: "show"`, whenever an exact method or type is not already established by the loaded skill.
6. Mutate only through `univer_execute` with the explicit draft worktree and Unit IDs.
7. Read the changed scope back with `univer_inspect`. Command success alone is not correctness evidence.
8. Export with `univer_export` only when requested, using the same verified scope.
9. Call `univer_worktree` with `action: "ready"`, then confirm `ready` with `univer_status`.

For feedback on the same ready worktree, confirm its state, call `reopen`, edit and inspect again, then mark it ready again. Never reuse a terminal worktree.

`merge` and `discard` require user approval. Do not call either unless the user explicitly requests that outcome.

## Current verification limit

Use structured inspection to verify stored content, formulas, identifiers, ordering, dimensions, and other model fields. Screenshot-based visual verification is not available in this plugin version; state that limitation when appearance is material.

## Import and export

- Import `.xlsx`, `.csv`, `.tsv`, `.docx`, or `.pptx` into an existing draft worktree.
- Export Sheet or Base to `.xlsx`, `.csv`, or `.tsv`; Doc to `.docx`; Slide to `.pptx`.
- Board export is unsupported.
