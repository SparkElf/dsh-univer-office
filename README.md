# DSH × Univer Office

> Give DeepSeek Harness the ability to create, edit, inspect, and deliver spreadsheets, documents, presentations, databases, and canvases.

English · [简体中文](README.zh-CN.md)

[![npm](https://img.shields.io/npm/v/dsh-univer-office)](https://www.npmjs.com/package/dsh-univer-office)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.19-339933?logo=node.js&logoColor=white)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

`dsh-univer-office` is the Univer office plugin for DeepSeek Harness (DSH). Tell the agent what you need and it can create or edit spreadsheets, documents, presentations, multidimensional tables, and canvases, or work with existing Excel, Word, and PowerPoint files. Every change is verified and stays in the conversation for you to preview, approve, or discard.

After installation, describe the result you want in natural language. The agent handles creation, editing, and verification while you follow the work live and review the result in the conversation. Deliver spreadsheets as Excel (`.xlsx`), documents as Word (`.docx`), and presentations as PowerPoint (`.pptx`) files when needed.

## See it in action

The agent created this spreadsheet from a natural-language request, then added conditional formatting and a chart in the same conversation. The result can be previewed, revised, merged into the current version, or discarded in place.

![Reviewing a spreadsheet with conditional formatting and a chart in DSH](docs/assets/readme/chart-and-formatting.png)

> **Deliver a standard Excel file:** after review, ask the agent to export the spreadsheet as `.xlsx` so it can be opened and edited in Excel, WPS Office, and other compatible office applications.

<details>
<summary>See the complete workflow from request to review</summary>

### 1. Describe the task in natural language

![Asking the agent to create a class score sheet](docs/assets/readme/spreadsheet-request.png)

### 2. Follow the result live while the agent works

![A live spreadsheet window while the agent works](docs/assets/readme/live-worktree.png)

### 3. Approve or discard the changes in the conversation

![The spreadsheet review card after the task completes](docs/assets/readme/review-result.png)

</details>

### Generate a presentation from one request

Give the agent a topic, audience, page count, content outline, and visual direction. It can build the complete presentation, verify content and layout page by page, and leave the result in the conversation for review.

![Reviewing a bubble sort teaching presentation in DSH](docs/assets/readme/presentation-review.png)

> **Deliver a standard PowerPoint file:** after review, ask the agent to export the presentation as `.pptx` so it can be presented and edited in PowerPoint, WPS Office, and other compatible office applications.

<details>
<summary>See the presentation workflow from request to finished deck</summary>

#### 1. Specify the topic, audience, and page requirements

![Asking the agent to create a bubble sort teaching presentation](docs/assets/readme/presentation-request.png)

#### 2. Follow and verify the pages while the agent works

![A live presentation window while the agent works](docs/assets/readme/presentation-live.png)

</details>

## What can it do?

- **Analyze and build spreadsheets** — read or create Excel data, clean fields, write formulas, apply formatting and validation, create tables, charts, pivots, filters, sparklines, conditional formatting, and images, then export the result as `.xlsx`, `.csv`, or `.tsv`.
- **Write and lay out documents** — create paragraphs, rich text, lists, tasks, tables, images, charts, headers, footers, pagination, and page layouts.
- **Create and revise presentations** — generate a deck from an outline, redesign selected pages, edit text, shapes, images, tables, charts, and transitions, then detect off-page, overflowing, and overlapping text.
- **Build lightweight databases** — create Base tables, fields, records, and views with formula fields, filters, sorting, grouping, and Sheet-backed references.
- **Draw editable canvases** — create shapes, text, connectors, images, native charts, and diagrams, with connector and layout analysis.
- **Compose several content types** — one `.univer` file can contain Sheet, Doc, Slide, Base, and Board Units. Formulas and embedded content can reference other Units in the same file.
- **Work with Office files** — import `.xlsx`, `.csv`, `.tsv`, `.docx`, and `.pptx`, then export the edited content in the matching format.
- **Review agent changes safely** — every write starts in an isolated worktree. Watch changes live, then merge or discard them from the conversation instead of letting the agent overwrite the current version.

### Example requests

```text
Analyze sales.xlsx, fix the date and currency columns, add monthly trends, a regional comparison chart, and a summary sheet, then deliver an xlsx file.

Turn brief.md into an eight-slide investor deck with a dark-blue visual system. Check every page for layout problems and export it as pptx.

Convert meeting-notes.md into a formal weekly report with an executive summary, risk table, next-week plan, headers, and footers. Deliver a docx file.

Create a customer-tracking Base with company, contact, stage, expected value, and next action fields, plus a view grouped by stage.

Create a sales Sheet and a summary Slide in the same .univer file, with the Slide chart reading the Sheet data.
```

## Capabilities

| Content | Create and edit | Verify and review | Import | Export |
| --- | --- | --- | --- | --- |
| Sheet | Cells, formulas, styles, tables, charts, pivots, filters, validation, images, and more | Structured range inspection, recalculation, live preview | `.xlsx` `.csv` `.tsv` | `.xlsx` `.csv` `.tsv` |
| Doc | Paragraphs, rich text, lists, tasks, tables, images, charts, headers, footers, pagination | Document readback, live preview | `.docx` | `.docx` |
| Slide | Pages, text, shapes, images, tables, charts, SVG layouts, transitions | Structure inspection, text bounds/overflow/overlap lint, live preview | `.pptx` | `.pptx` |
| Base | Tables, fields, records, views, formulas, filters, sorting, grouping | Facade readback, live preview | — | `.xlsx` `.csv` `.tsv` |
| Board | Shapes, text, connectors, images, native charts, routing | Element and connector analysis, live preview | — | — |

Every content type supports isolated worktree editing, review submission, reopening, merging, and discarding. Base and Board currently use exact Facade readback for structural verification. Board file export is not yet supported.

## Get started in 3 minutes

### 1. Install the plugin

Install from npm:

```sh
dsh plugin --profile web add dsh-univer-office
```

Or install the latest version directly from GitHub:

```sh
dsh plugin --profile web add github:dream-num/dsh-univer-office
```

After installation, refresh DeepSeek Harness with **Cmd+R / Ctrl+R**.

### 2. Describe the result you want

```text
Create reports/q2-review.univer. Read data/q2-sales.xlsx and build a management dashboard with summary metrics, monthly trends, and regional rankings.
```

The agent automatically loads the relevant skills and selects the `univer_*` tools. A typical task creates the file and a worktree, imports or creates a Unit, edits it, reads the result back for verification, and submits the worktree for review.

### 3. Review it in the conversation

- While the agent works, a floating window in the top-right shows the worktree updating live.
- At the end of a turn, every touched `.univer` file gets a preview card that opens fullscreen inside DSH.
- When the agent submits its work, a full review card appears in the conversation. Merge after you approve the result, ask for another revision, or discard it.

## How it works

A `.univer` file is a composable office container that can hold several Units of different types. The plugin puts each agent task in an isolated worktree:

```text
Your request
   ↓
Load the matching Univer skill
   ↓
Create / import / edit in a draft worktree
   ↓
Readback + recalculation + Slide layout lint
   ↓
Live preview and in-conversation review
   ↓
Revise / merge / discard
```

Only `merge` and `discard` end a worktree, and both require an explicit user request plus DSH approval. `ready` only submits the worktree for review; it does not change the trunk.

## Built-in tools

You do not need to call tools manually in normal use; DSH selects them from your request. This list shows what the plugin exposes to the agent.

| Tool | Purpose |
| --- | --- |
| `univer_new` | Create an empty `.univer` file without overwriting an existing file |
| `univer_status` | List Units and worktrees in trunk or a selected worktree |
| `univer_worktree` | Create, submit, reopen, merge, or discard an isolated worktree |
| `univer_unit` | Create or remove a Sheet, Doc, Slide, Base, or Board Unit |
| `univer_import` | Import an Office file as a new Unit |
| `univer_inspect` | Read document structure or a selected Sheet range |
| `univer_execute` | Read or modify content with the exact Univer Facade API |
| `univer_export` | Export a Sheet, Doc, Slide, or Base Unit |
| `univer_lint` | Detect off-page, overflowing, and overlapping Slide text |
| `univer_compile_svg` | Compile SVG into an explicit Slide page with real font metrics |
| `univer_api` | Search the exact Univer Facade API bundled with this plugin |

The plugin also ships eight version-matched, lazily loaded skills: core orchestration, Sheet, Doc, Slide, Base, Board, Embed, and cross-Unit formulas.

## Preview and review experience

- **Live worktree window** — drag, resize, fold, or maximize it. If a worktree changes several Units, it lists only those that changed.
- **Per-turn preview cards** — every touched `.univer` file has its own card, so artifacts stay next to the work that produced them.
- **End-of-session review** — both `draft` and `ready` worktrees remain inspectable in the conversation. Cards stay as history after merge or discard.
- **Session isolation** — each DSH session shows only its own windows, cards, and review state.
- **English and Chinese UI** — the plugin shell and every open Viewer follow the DSH locale.

## Requirements and current limits

- DeepSeek Harness and Node.js `>=22.19.0`.
- Slide layout lint and real SVG text measurement require a local Chrome/Chromium executable. Set `UNIVER_RENDER_BROWSER` to use a specific browser path.
- The plugin does not currently expose screenshots to the model. Structural and layout checks are not a substitute for pixel-level visual approval; you can still inspect the result in the live Viewer.
- Slide master pages, layout pages, and speaker notes are outside the current editing scope.
- Board mind maps, tables, ink, advanced editing, and file export are not yet supported.

## Configuration

The defaults are designed for local use: the Gateway starts on the first file-state request and tries ports `9123` and `8000` in order. Configure the bundle's Cordis layer when you need different values:

| Field | Default | Purpose |
| --- | --- | --- |
| `gatewayPorts` | `[9123, 8000]` | Candidate loopback ports for the bundled Gateway |
| `autoStartGateway` | `true` | Start the Gateway on first use |
| `gatewayStartupTimeoutMs` | `10000` | Gateway startup timeout |
| `gatewayRequestTimeoutMs` | `3000` | State-read timeout |
| `gatewayMutationTimeoutMs` | `60000` | Gateway mutation timeout |
| `unitContentOperationTimeoutMs` | `120000` | Import, export, inspection, and execution timeout |
| `tools` | `true` | Register the `univer_*` tools |
| `skills` | `true` | Register the bundled Univer skills |

See [`src/host/config.ts`](src/host/config.ts) for the remaining cache and commit-confirmation options.

## Uninstall

```sh
dsh plugin --profile web remove dsh-univer-office
```

## Development

This project is a standard [DSH bundle](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/user/develop/basic/publish.md). Its Host composes the Univer Service Provider, Tools Consumer, webServer Consumer, and Skill Provider. The bundle includes its Gateway, Viewer, headless Unit Content Worker, and Slide render machine. See the [architecture document](docs/architecture.md) for dependency directions and runtime boundaries.

```sh
pnpm install
pnpm run build
pnpm run test
```

Build the npm tarball and zip distribution:

```sh
bash scripts/build-dist.sh
```

`lib/`, `artifacts/`, `dist/`, `*.tgz`, and `univer-dsh-plugin.zip` are generated and are not committed.

## Official package name

Install only `dsh-univer-office`. The following similar names are deprecated npm placeholders reserved by this project to prevent impersonation; they contain no plugin code:

- `dsh-univer-plugin`
- `dsh-univer-office-suite`
- `dsh-univer-suite`
- `univer-office-suite`
- `univer-office`

## License

[Apache-2.0](LICENSE)
