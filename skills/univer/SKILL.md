---
name: univer
description: Create, inspect, edit, import, export, and hand off multi-Unit .univer files through DSH tools and isolated worktrees. Use proactively for any task involving .univer files, spreadsheets or .xlsx/.csv/.tsv data, presentations or .pptx slides, .docx documents, Base databases, Board canvases, cross-Unit content, or exact Univer Facade API authoring; load this before the matching Unit skill.
---

# Univer files

Use the structured `univer_*` tools whenever the task creates, reads, changes, converts, or reviews office content. Do not wait for the user to name a tool. Do not invoke a global `univer` CLI, edit `.univer` storage directly, or substitute openpyxl, python-pptx, python-docx, ZIP manipulation, or another writer.

## Start immediately

- Existing `.univer`: call `univer_status` before selecting a Unit or worktree.
- New `.univer`: call `univer_new`, then `univer_worktree` with `action: "create"`.
- Office source (`.xlsx`, `.csv`, `.tsv`, `.docx`, `.pptx`): create the target `.univer` and draft worktree, then call `univer_import`.
- Before authoring content, load the matching Unit skill: `univer-sheet`, `univer-doc`, `univer-slide`, `univer-base`, or `univer-board`.
- For an Embed, also load `univer-embed`. For formulas that read another Unit, also load `univer-cross-unit-formula`.

## Mental model

- A `.univer` file is the authoritative multi-Unit container. Each Sheet, Doc, Slide, Base, or Board is a top-level Unit with a stable `unitId`.
- Sheet names, pages, paragraphs, tables, ranges, shapes, fields, records, and views live inside a Unit; none substitutes for `unitId`.
- `trunk` is the reviewed main line. A worktree is an isolated scope for agent changes. There is no implicit current worktree.
- Every content write requires the complete address: `file`, draft `worktreeId`, and `unitId`.
- `univer_execute` persists only when Facade mutations occurred. A read-only execution produces no revision.
- `ready` rejects writes until `reopen`. `merged` and `discarded` are terminal; never reuse them.
- Tool success is not correctness evidence. Read the changed model back and verify task-specific assertions.

## Required workflow

1. Call `univer_status` to discover Unit IDs and worktree states.
2. Create or select one draft worktree. Continue an existing worktree only after confirming its state.
3. Create a Unit with `univer_unit`, or import one with `univer_import`.
4. Load the matching Unit skill before writing Facade code.
5. Use `univer_api` with `action: "find"` when the symbol is unknown and `action: "show"` for exact symbols. Never guess an unfamiliar signature, parameter type, or enum.
6. Mutate through `univer_execute`, or through `univer_compile_svg` for generated Slide page content.
7. Read the changed scope with `univer_inspect`; use a fresh read-only `univer_execute` when inspection omits a required model field.
8. For every changed Slide page, call `univer_lint` and resolve or explicitly justify each finding.
9. Export with `univer_export` only when requested and only from the verified scope.
10. Mark the worktree `ready` and confirm it with `univer_status`.

The DSH client automatically renders live worktree content and the ready review panel from tool results. Treat that preview as the visual handoff surface; there is no model-facing show/open tool. Screenshot evidence is not available in this plugin version, so never claim pixel-level visual verification.

Merge or discard only when the user explicitly requests that outcome. Both operations change review state and are not routine completion steps.

## Rework after feedback

Continue in the same worktree only for changes to the same task and only after `univer_status` confirms that it is still `ready` or `draft`.

1. If it is `ready`, call `univer_worktree` with `action: "reopen"`.
2. If it is already `draft`, continue directly.
3. Make the remaining changes and repeat the complete readback and Unit-specific verification.
4. Mark it `ready` again and confirm the final status.

Never reopen or reuse a merged or discarded worktree; create a new worktree instead.

## Tool map

| Stage | Tool | Use |
| --- | --- | --- |
| Start | `univer_new` | Create an empty `.univer`; never overwrites and never creates an implicit Unit. |
| Start | `univer_status` | List trunk Units and worktrees, or inspect one explicit scope. |
| Start | `univer_worktree` | `create`, `ready`, `reopen`, `merge`, or `discard`. |
| Start | `univer_unit` | Create or remove a Sheet, Doc, Slide, Base, or Board in a draft worktree. |
| Start | `univer_import` | Import local xlsx, csv, tsv, docx, or pptx as a new Unit. |
| Write | `univer_execute` | Run version-matched Facade JavaScript against one Unit in a draft worktree. |
| Write | `univer_compile_svg` | Compile workspace SVG into one explicit Slide page with browser text metrics. |
| Verify | `univer_inspect` | Read structured Unit content from trunk or one worktree. |
| Verify | `univer_lint` | Check Slide text off-page, container escape, and text overlap. |
| Reference | `univer_api` | Find or show exact version-matched Facade symbols. |
| Deliver | `univer_export` | Export Sheet/Base to xlsx/csv/tsv, Doc to docx, or Slide to pptx. |

## Facade execution

`univer_execute` injects `univerAPI`, `api` (the same object), and one Unit-specific handle:

- Sheet: `workbook`
- Doc: `doc`
- Slide: `presentation`
- Board: `board`

Do not redeclare injected variables. Execution is ESM and has no `require`. Resolve exact methods with `univer_api`; use public Facade surfaces, check boolean/null returns, and retain generated stable IDs needed by later operations.

## Import and export

- Import accepts workspace files only; URL import is unavailable.
- Export Sheet or Base to `.xlsx`, `.csv`, or `.tsv`; Doc to `.docx`; Slide to `.pptx`.
- Board export is unsupported.
- Export uses an explicit Unit and an explicit trunk or worktree scope. Recalculate formulas and finish readback before exporting.

## Unsupported CLI-only capabilities

Do not invent equivalents for CLI maintenance, daemon/configuration, resource registry search/export, `compile-typst`, screenshots, optimization, or shell command help. Use the bundled skills and tools available in DSH; if the task requires a missing capability, report that exact gap.
