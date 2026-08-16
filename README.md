# DeepSeek Harness (DSH) × Univer Plugin

> **The DeepSeek Harness window into Univer's office runtime.**

[English](README.md) · [中文](README.zh-CN.md)

Preview Univer office files (sheets, docs, slides, bases) directly inside DeepSeek Harness: after a turn that runs `univer` commands, a preview card automatically appears at the turn's tail — click it to expand fullscreen in-app, no browser or manual server needed. Worktree work gets a live window: the moment the agent creates a worktree, a small floating window opens with the real-time worktree page, and when the worktree is ready and the session ends, the window closes and the merge review page embeds below the conversation.

```
┌────────────────────────────────────────┐
│ 📊 sales.univer  [wt-xxx]  [Expand ▾]  │  ← card at the turn tail
│ /Users/.../sales.univer                │
└────────────────────────────────────────┘

┌──────────────────────────────┐
│ ● agent-draft · sales.univer │  ← floating live window (draft worktree)
│ [in progress]  [−] [⤢] [✕]  │
│ ┌──────────────────────────┐ │
│ │   live worktree Viewer   │ │     click the bar to enlarge,
│ │   (read-only, real-time) │ │     drag / fold / dismiss anytime
│ └──────────────────────────┘ │
└──────────────────────────────┘

┌────────────────────────────────────────┐
│ 🧾 Merge review「agent-draft」 [awaiting] ▾ │  ← session-end merge panel
│ ┌────────────────────────────────────┐ │
│ │   merge preview page (embedded)    │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

## Features

- **Inline preview cards** — a card appears at the end of any turn whose bash calls mention a `.univer` file (worktrees supported via `--worktree`).
- **In-app fullscreen viewer** — click the card to open the sheet in an in-app iframe; close with ✕ / mask / Esc.
- **Live floating worktree window** — when the agent creates a worktree (`univer worktree add` / `execute --worktree`), a small window pops up in the **top-right corner** embedding the live read-only worktree page. CLI edits appear in the window in real time. When one worktree touches several units (e.g. a sheet plus a deck), the window and the review panel show **unit chips** that list ONLY changed units (＋ added / ✎ modified / － deleted / ⚠ conflict) with status icons, defaulting to the first one.
- **Window interactions** — drag the dark bar to move; click the bar (without dragging) to enlarge; `−` folds down to the bare title bar, `⤢` maximizes, **drag the bottom-right corner to resize**, `✕` dismisses until the worktree status changes.
- **Ready + session end → close, then merge panel** — once the session goes idle, every **non-terminal** worktree moves into the review dock below the conversation: `ready` shows the merge review page (`scope=mergePreview`) plus Reopen / Discard / Merge actions; **`draft` shows up too**, with the live worktree page plus Mark-ready / Discard actions (so a worktree the agent forgot to mark ready is still reviewable). While the session is still running, non-terminal worktrees stay as top-right windows. **Merged or discarded worktrees (terminal states) show nothing — no window, no panel.**
- **Daemon management** — green dot = daemon running; yellow dot = stopped, click to auto-start.
- **Multi-session** — each session shows its own turn's cards, windows, and merge panels.
- **Bilingual UI** — the card follows the app locale (zh / en).

## Requirements

- macOS (or Linux) with DeepSeek Harness installed
- [univer-cli](https://github.com/dream-num/univer-cli) recommended: `npm i -g univer-cli`; without it the plugin still installs and prompts when needed

## Install

This is a standard [DSH bundle](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/user/develop/basic/publish.md): it declares `dsh.bundle` and ships its own `cordis.patch.yml`, so it installs through the canonical loader:

### From a git checkout

```sh
dsh plugin --profile web add github:dream-num/dsh-univer-plugin
```

### From npm

```sh
dsh plugin --profile web add @univer-cli/dsh-univer-plugin
```

### From a local checkout (development)

```sh
dsh plugin --profile web add /path/to/dsh-univer-plugin
```

> The first use of a profile initializes it; `dsh` appends the bundle to
> `dsh.profile.bundles` and pnpm links the package, so the loader resolves the
> plugin's `cordis.patch.yml` layer automatically. Verify with
> `dsh --profile web --dump-config` (you should see a `# == @univer-cli/dsh-univer-plugin` layer).

### Alternative: one-command installer (no dsh CLI)

If you cannot run the `dsh` CLI, a convenience installer is provided:

```sh
bash install.sh
```

Or for macOS users of the zip distribution: double-click `install.command` (see `packaging/INSTALL.txt`).

After any install: **refresh DeepSeek Harness (Cmd+R / Ctrl+R)**.

## Usage

1. Run `univer` commands in a session (`univer new/import/execute/inspect/...`)
2. When the turn ends, a preview card appears at its tail
3. Click the card → in-app fullscreen preview
4. Create a worktree → the floating live window appears in the corner; watch the agent's edits in real time
5. `univer worktree ready` → the window shows a ready chip; when the session ends it closes and the merge review panel embeds below the conversation
6. If the daemon is not running, the card shows a yellow dot; click it to start the daemon

## Uninstall

```sh
univer-dsh uninstall
```

Or remove the plugin manually: delete `~/.dsh/profiles/node_modules/@univer-cli/dsh-univer-plugin` and the matching `cordis.patch.yml` entry.

## Architecture

This is a dual-half DSH plugin:

- **Node half** (`lib/index.js`) — a `dsh.client`-declared package; exposes an `univer` service and loopback `/univer-api/*` HTTP routes on the host web server:
  - `GET /univer-api/status` — daemon + CLI facts;
  - `POST /univer-api/ensure-daemon` — on-demand daemon start;
  - `GET /univer-api/state?file=<abs path>` — worktrees with lifecycle status (`draft`/`ready`/`merged`/`discarded`) and embedded Viewer deep-links (`worktreeUrl`/`mergeUrl`/`trunkUrl`), gateway-first with a CLI fallback and a 1s TTL cache.
- **Client half** (`lib/client.js`) — two contributions:
  - the `conversation.chat.turnTail` preview card + fullscreen overlay (scans bash tool calls per turn for `.univer` targets through a pure, replayable conversation-events definition);
  - the `conversation.input.dock` entry: derives the session's targets from the conversation snapshot, polls `/univer-api/state` every ~900ms, and renders the floating live windows (draft, or ready while the session runs) and the session-end merge panels (ready/merged once the session is idle).

The Viewer page itself (`packages/collab-web` in univer-cli) is the live-sync engine: it subscribes to the gateway's lifecycle WebSocket and comb channel, so CLI writes are reflected in the iframe without any plugin-side refresh.

## Development

`dist/` and the archives (`univer-dsh-plugin.zip`, `*.tgz`) are **generated** — they are gitignored and never committed. Source lives in `lib/`, `package.json`, `README*.md`, `cordis.patch.yml`, `install.sh`, and `packaging/`. After changing any source file, rebuild the artifacts:

```sh
bash scripts/build-dist.sh
```

This regenerates `dist/univer/` (the shipped package contents), the npm tarball `dist/univer-cli-dsh-univer-plugin-<version>.tgz`, and the zip distribution `univer-dsh-plugin.zip` (package contents + `install.command` + `INSTALL*.txt` from `packaging/`).

Smoke tests (host smoke requires the real `univer` CLI + daemon; the client smoke runs under jsdom with react resolved from a local `deepseek-harness` checkout — adjust `repoRoot` in the test headers):

```sh
node test/host-smoke.mjs
node test/client-smoke.mjs
```

Publish the package with `npm publish` (respects the `files` allowlist); attach the zip/tgz to a GitHub Release for end users.

## Reserved npm name

The unscoped name [`dsh-univer-plugin`](https://www.npmjs.com/package/dsh-univer-plugin) is reserved by this project as a typosquatting guard — `redirects/dsh-univer-plugin/` holds a placeholder package (deprecated, pointing to the official name) that contains no code. **Always install the official package:**

```sh
dsh plugin --profile web add github:dream-num/dsh-univer-plugin   # from git
dsh plugin --profile web add @univer-cli/dsh-univer-plugin        # from npm
```

## Metadata

- **Topic**: [`dsh-plugin`](https://github.com/topics/dsh-plugin)
- **Bundle manifest**: `dsh.bundle.patch` → `./cordis.patch.yml`
- **Client manifest**: `dsh.client` (`platform: "web"` + `inject`)

## License

[Apache-2.0](LICENSE)
