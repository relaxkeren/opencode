# File & Folder Structure Overview

This document explains **what exists**, **why it exists**, and **how responsibilities are divided** across the OpenCode repository filesystem. It is a structural and semantic map, not an exhaustive file listing.

**Directory tree used (depth-limited):**
- Root: `.github/`, `.husky/`, `.opencode/`, `github/`, `infra/`, `knowledge/`, `nix/`, `packages/`, `patches/`, `script/`, `sdks/`, `specs/`, `themes/`
- `packages/`: `app/`, `console/` (app, core, function, mail, resource), `containers/`, `desktop/`, `docs/`, `enterprise/`, `extensions/zed/`, `function/`, `identity/`, `opencode/`, `plugin/`, `script/`, `sdk/`, `slack/`, `ui/`, `util/`, `web/`
- Excluded from analysis: `node_modules/`, `dist/`, `build/`, `.git/`, `.venv/`, `__pycache__/` (per scope)

---

## 1) High-level layout

The repository is a **monorepo** organized primarily by **package boundaries**: product source lives under `packages/`, with top-level **config**, **CI/CD** (`.github/`), **infrastructure** (`infra/`, `nix/`), **release/tooling** (`script/`), **documentation** (`specs/`, `knowledge/`), and **integrations** (`github/`, `sdks/`) at the root.

**Main zones:**
- **App/runtime code**: `packages/opencode` (CLI + server + TUI), `packages/app` (web UI), `packages/desktop` (Tauri wrapper), `packages/console/*` (console/zen app + backend).
- **Libraries**: `packages/ui` (shared UI components), `packages/util` (shared utilities), `packages/sdk` (generated API client), `packages/plugin` (plugin API).
- **Config & tooling**: Root `package.json`, `turbo.json`, `bunfig.toml`, `tsconfig.json`, `sst.config.ts`; `script/` for release/generate/changelog; `nix/` for Nix tooling.
- **Infrastructure**: `infra/` (SST: app, console, enterprise), `packages/containers/` (Docker for CI), `packages/function/` (Cloudflare Worker API).
- **Tests**: Co-located in `packages/opencode/test/`, `packages/app/src/**/*.test.*`, `packages/app/e2e/` (Playwright).
- **Docs**: `specs/` (engineering specs), `knowledge/` (overview + this file), root READMEs and CONTRIBUTING/SECURITY/AGENTS.

**Organizing principle:** Package-based monorepo with Turborepo; clear split between core product (`opencode`, `app`, `desktop`), shared libs (`ui`, `util`, `sdk`), and deployment/integration surfaces (`infra`, `github`, `sdks`, `containers`). (source: CONTRIBUTING.md, package.json workspaces, turbo.json)

---

## 2) Top-level directory responsibilities

### `.github/`
- **Primary responsibility:** GitHub-specific automation: workflows (CI, publish, triage, review, deploy), issue/PR templates, and actions.
- **What belongs here:** Workflow YAML, action definitions, ISSUE_TEMPLATE, pull_request_template.
- **What should NOT:** Product source code, shared scripts (those live in `script/` or package `script/`).
- **Who touches:** Infra/DevOps, maintainers (release/triage automation).

### `.husky/`
- **Primary responsibility:** Git hooks (e.g. pre-commit) for repo-wide checks.
- **What belongs here:** Hook scripts invoked by Husky.
- **What should NOT:** Business logic.
- **Who touches:** Tooling/maintainers.

### `.opencode/`
- **Primary responsibility:** Repo-local OpenCode automation: agent playbooks, commands, skills, and tools used when working in this repo (e.g. triage, docs, commit conventions, spellcheck).
- **What belongs here:** Agent markdown (`.opencode/agent/`), command docs (`.opencode/command/`), skills (`.opencode/skill/`), custom tools (`.opencode/tool/`), themes (`.opencode/themes/`).
- **What should NOT:** Product code or CI workflow definitions.
- **Who touches:** Contributors and AI agents following repo conventions. (source: knowledge/overview.md)

### `github/`
- **Primary responsibility:** The **opencode GitHub Action** that runs opencode from issue/PR comments (e.g. `/opencode explain`, `/opencode fix`).
- **What belongs here:** Action entrypoint, action.yml, README for the Action, publish/release scripts for the Action.
- **What should NOT:** Core CLI/server logic (lives in `packages/opencode`).
- **Who touches:** Integration maintainers, consumers of the Action. (source: github/README.md)

### `infra/`
- **Primary responsibility:** SST (Ion) infrastructure definitions: app worker, console, enterprise, secrets, and stage/domain wiring.
- **What belongs here:** `app.ts`, `console.ts`, `enterprise.ts`, `secret.ts`, `stage.ts` — Cloudflare Workers, buckets, secrets, domain config.
- **What should NOT:** Application source; infra only references package paths (e.g. `packages/function/src/api.ts`).
- **Who touches:** Platform/infra engineers. (source: sst.config.ts, infra/app.ts)

### `knowledge/`
- **Primary responsibility:** Human-readable knowledge and documentation about the repo (e.g. doc index, file-structure map).
- **What belongs here:** Overview, file-structure, and similar structural/semantic maps.
- **What should NOT:** User-facing docs (those live in `packages/web` or `packages/docs`); product code.
- **Who touches:** Contributors, onboarding, AI agents.

### `nix/`
- **Primary responsibility:** Nix expressions and scripts for Nix-based builds (opencode, desktop) and dependency pinning (e.g. node_modules, hashes).
- **What belongs here:** `.nix` files, `hashes.json`, scripts like `canonicalize-node-modules.ts`, `normalize-bun-binaries.ts`.
- **What should NOT:** General-purpose scripts unrelated to Nix (use `script/`).
- **Who touches:** Nix users, release/maintainers. (source: README.md install options, nix/ folder layout)

### `packages/`
- **Primary responsibility:** All product and shared library packages: core CLI/server, web app, desktop app, console app, UI library, SDK, plugin, integrations (Slack), containers, docs, etc.
- **What belongs here:** Each package is a workspace member with its own `package.json`, source, and tests.
- **What should NOT:** Root-level config that applies to the whole repo (that stays at root).
- **Who touches:** App devs, library authors, integration authors. (source: package.json workspaces, CONTRIBUTING.md)

### `patches/`
- **Primary responsibility:** npm/bun patch files for third-party dependencies (e.g. `@standard-community/standard-openapi`, `ghostty-web`).
- **What belongs here:** `.patch` files referenced by `patchedDependencies` in root `package.json`.
- **What should NOT:** In-repo source code.
- **Who touches:** Maintainers when upgrading or fixing upstream deps.

### `script/`
- **Primary responsibility:** Repo-root scripts for release, versioning, changelog, SDK generation, formatting, and sync (e.g. generate, publish, changelog, version, sync-zed).
- **What belongs here:** Scripts that orchestrate multiple packages or repo-wide operations (e.g. `./script/generate.ts` runs SDK build + openapi export + format).
- **What should NOT:** Package-internal scripts (those live in `packages/<pkg>/script/`).
- **Who touches:** Maintainers, CI. (source: script/generate.ts, CONTRIBUTING.md)

### `sdks/`
- **Primary responsibility:** **Editor/IDE SDKs** that are consumers of the OpenCode CLI or API — e.g. VS Code extension. Distinct from `packages/sdk`, which is the generated API client.
- **What belongs here:** `sdks/vscode/` (VS Code extension source, build, publish).
- **What should NOT:** Core CLI/server (in `packages/opencode`); generated SDK client (in `packages/sdk`).
- **Who touches:** Extension developers, IDE integration maintainers. (source: sdks/vscode/README.md, CONTRIBUTING.md)

### `specs/`
- **Primary responsibility:** Engineering specs and roadmaps: performance, decomposition, i18n, testing, parallel workstreams. Numbered specs (01–18) and meta-docs (perf-roadmap, parallel-agent-plan, project).
- **What belongs here:** Markdown specs that describe planned or in-progress work; referenced by agents and contributors.
- **What should NOT:** User-facing documentation (packages/web), code.
- **Who touches:** Engineers, PM, agents. (source: specs/perf-roadmap.md, specs/18-parallel-workstream-map.md)

### `themes/`
- **Primary responsibility:** Repo-level theme JSON files (e.g. deltarune, undertale) that may be referenced or bundled; distinct from package-owned themes (e.g. `packages/ui/src/theme/themes/`, `packages/opencode/src/cli/cmd/tui/context/theme/`).
- **What belongs here:** Committed theme definitions used by the product or tooling.
- **What should NOT:** Generated assets or build artifacts.
- **Who touches:** Theming, contributors.

### Root config files
- **`package.json`**: Workspaces, root scripts (`dev`, `typecheck`), catalog, dependencies (e.g. `@opencode-ai/sdk`, `@opencode-ai/plugin`), patchedDependencies. (source: package.json)
- **`turbo.json`**: Turborepo task config (typecheck, build, test) and env. (source: turbo.json)
- **`bunfig.toml`**, **`tsconfig.json`**: Bun and TypeScript root config.
- **`sst.config.ts`**: SST app config; loads `infra/app.js`, `infra/console.js`, `infra/enterprise.js`. (source: sst.config.ts)
- **`AGENTS.md`**: Repo-wide style guide and agent rules (naming, control flow, testing, SDK regeneration). (source: AGENTS.md)
- **`README.md`**, **`README.*.md`**: Product overview, install, agents; translations.
- **`CONTRIBUTING.md`**, **`SECURITY.md`**: Contribution workflow, security model.

---

## 3) Nested structure (drill-down)

### `packages/opencode/`
Core CLI, server, and TUI. Entry: `src/index.ts` (yargs CLI); server: `src/server/server.ts`; TUI: `src/cli/cmd/tui/`.

- **`src/acp/`** — Agent Client Protocol implementation (agent, session, types); integration boundary for editors (e.g. Zed). (source: packages/opencode/src/acp/README.md)
- **`src/agent/`** — Agent logic and prompt fragments (e.g. explore, summary, title).
- **`src/cli/`** — CLI bootstrap, UI helpers, and **`cmd/`**: one module per command (serve, web, tui, acp, auth, models, github, pr, session, debug/*, etc.). **`cmd/tui/`** is the terminal UI: routes (home, session), components (dialogs, prompt), context (theme, sdk, sync), OpenTUI-based. Represents the **TUI surface** and depends on server via SDK.
- **`src/server/`** — HTTP server and **`routes/`**: config, file, global, session, provider, pty, mcp, permission, question, tui, etc. API boundary; changing routes requires SDK regeneration via `./script/generate.ts`. (source: packages/opencode/AGENTS.md)
- **`src/session/`** — Session lifecycle, messages, prompts, compaction, retry, system prompts (e.g. plan, build, provider-specific .txt).
- **`src/tool/`** — Built-in tools (bash, read, write, edit, grep, glob, codesearch, webfetch, skill, etc.) and their .txt descriptions; **tool registry** and execution.
- **`src/provider/`** — Provider abstraction; **`provider/sdk/copilot/`** — GitHub Copilot–specific provider (temporary, Copilot-only per README).
- **`src/lsp/`**, **`src/mcp/`**, **`src/plugin/`** — LSP client, MCP auth/callbacks, plugin/codex/copilot integration.
- **`src/project/`**, **`src/file/`**, **`src/storage/`** — Project/instance state, file ignore/ripgrep/watcher, storage.
- **`src/util/`** — Internal utilities (abort, log, timeout, token, etc.).
- **`script/`** — Package scripts (e.g. `build.ts` for standalone binary, model snapshot).
- **`test/`** — Unit tests mirroring `src/` (acp, agent, cli, config, file, provider, session, tool, util, etc.). (source: packages/opencode/test/)

**Pattern:** Domain-oriented folders (session, tool, server, provider) with a clear **technical layer**: CLI → commands → TUI or server routes; tools and session are core domains.

### `packages/app/`
Web UI (SolidJS) that talks to the OpenCode server via SDK. Entry: `src/entry.tsx` / `src/app.tsx`; Vite in `vite.js`.

- **`src/pages/`** — Route-level components: **`layout.tsx`** (main layout), **`session.tsx`** (session page), **`layout/`** (sidebar, deep-links, project/workspace helpers), **`session/`** (timeline, prompt dock, terminal panel, scroll-spy, file tabs, review tab). Specs 09–11 target session/layout decomposition and prompt-input. (source: specs/09-session-page-decomposition.md, specs/18-parallel-workstream-map.md)
- **`src/context/`** — React-style context providers: **file** (content-cache, tree-store, watcher), **global-sync** (bootstrap, queue, event-reducer, session-trim), **layout**, **sync**, **server**, **terminal**, **prompt**, **sdk**, **settings**, etc. **global-sync** and **file** are called out as domain-split targets in specs 12–13.
- **`src/components/`** — Reusable UI components (prompt-input, terminal, dialogs, etc.); some co-located `.test.ts` files.
- **`src/i18n/`** — Locale dictionaries (ar, en, zh, …); parity and hardening in specs 06–07, 16.
- **`src/utils/`** — App-level utils (runtime-adapters, server-health, scoped-cache, worktree, etc.); several unit tests.
- **`src/hooks/`** — e.g. use-providers.
- **`e2e/`** — Playwright E2E tests by feature (app, files, projects, prompt, session, settings, sidebar, terminal, etc.). (source: packages/app/e2e/, packages/app/README.md)

**Pattern:** Page/context/component layering; context modules are **domain boundaries** (file, global-sync, layout). Tests mirror source (context/*.test.ts, utils/*.test.ts, e2e by feature).

### `packages/ui/`
Shared UI component library: buttons, dialogs, diff, markdown, tabs, theme, i18n, etc. Consumed by `packages/app` and TUI-related surfaces.

- **`src/components/`** — Reusable components (accordion, button, code, diff, dropdown-menu, icon, list, markdown, session-turn, tabs, toast, etc.) with co-located CSS.
- **`src/theme/`** — Theme resolution, loader, default themes (aura, dracula, nord, tokyonight, etc.); **themes/** JSON files.
- **`src/context/`** — Shared context (code, dialog, diff, i18n, marked, worker-pool).
- **`src/i18n/`** — Locale files aligned with app.
- **`src/assets/`** — Icons (file-types, app-icons, provider-icons), fonts, other assets.
- **`src/styles/`** — Base, colors, tailwind, animations.

**Pattern:** **Technical layer** (shared presentation); **domain** is “UI primitives and theming.” No server dependency; used by app and potentially TUI/desktop.

### `packages/console/`
Console/zen product: SolidStart app + backend (core, function, mail, resource).

- **`app/`** — SolidStart frontend: routes, public assets, `.opencode/agent/css.md` for CSS conventions. (source: packages/console/app/README.md)
- **`core/`** — Backend/core assets (SQL, JSON — likely schema or static data).
- **`function/`** — Serverless function(s) (e.g. auth, log-processor).
- **`mail/`** — Email templates and static assets (fonts, images).
- **`resource/`** — Resource definitions (Cloudflare vs Node adapters).

**Pattern:** **Domain-based** (console product) with sub-folders by **technical role** (app = frontend, function = serverless, mail = emails, resource = infra adapter).

### `packages/desktop/`
Tauri v2 desktop app wrapping the web UI. **`src/`** — TypeScript/TSX entry and shell logic; **`src-tauri/`** — Rust side (icons, config). Build via `tauri build`; dev via `tauri dev`. (source: packages/desktop/README.md)

### `packages/sdk/`
Generated API client for the OpenCode server. **`openapi.json`** at package root; **`js/`** contains the TypeScript client: **`script/build.ts`** (and publish), **`src/gen/`** (generated types and client). Regeneration: root `./script/generate.ts` → `packages/sdk/js/script/build.ts` and `bun dev generate > ../sdk/openapi.json` from `packages/opencode`. (source: script/generate.ts, AGENTS.md)

### `packages/web/`
Marketing/docs site (Astro/Starlight). **`src/content/docs/`** — MDX docs (cli, agents, config, mcp, providers, etc.); **`src/pages/`** — Astro pages; **`src/components/`** — Head, Hero, share components. Serves opencode.ai content. (source: packages/web structure)

### `packages/plugin/`
Source for `@opencode-ai/plugin`: example plugin, shell, tool. Published separately; used by opencode core. (source: package.json workspaces)

### `packages/util/`
Shared utilities (array, binary, encode, error, fn, identifier, iife, lazy, path, retry, slug). Consumed by other packages; **technical layer** with no UI.

### `packages/containers/`
Docker images for CI: base, bun-node, rust, tauri-linux, publish. **script/build.ts** for building. (source: packages/containers/README.md)

### `packages/function/`
Single Cloudflare Worker entry: **`src/api.ts`** — linked from `infra/app.ts` as the Api worker handler. **Deployment/runtime** boundary. (source: infra/app.ts)

### `github/`
**`index.ts`** — Action entry; **action.yml** — Action metadata; **script/publish**, **script/release** — Release scripts for the Action. (source: github/README.md)

### `infra/`
**`stage.ts`** — Domain/stage config; **`app.ts`** — Api worker, bucket, secrets; **`console.ts`**, **`enterprise.ts`** — Additional stacks; **`secret.ts`** — Secret refs. Composes into single SST app. (source: sst.config.ts, infra/app.ts)

### `nix/`
**`opencode.nix`**, **`desktop.nix`** — Package definitions; **`node_modules.nix`**, **hashes.json`** — Pinning; **scripts/** — Canonicalize/normalize scripts. Nix-specific **tooling**. (source: nix/ layout)

### `script/`
**`generate.ts`** — SDK build + openapi export + format; **`publish.ts`** — Release (can call SDK build/publish); **`version.ts`**, **`changelog.ts`** — Version and changelog; **`beta.ts`**, **`release`** — Beta/release; **`format.ts`** — Formatting; **`sync-zed.ts`**, **`duplicate-pr.ts`**, **`stats.ts`** — Misc automation. **Cross-cutting build/release**. (source: script/generate.ts, script/ contents)

### `sdks/vscode/`
VS Code extension: **`src/extension.ts`** — Entry; **esbuild.js** — Build; **script/publish**, **script/release** — Publish. Depends on opencode CLI. (source: sdks/vscode/README.md)

### `specs/`
**Numbered specs** (01–18): persistence, cache, throttling, scroll-spy, modularization, i18n, e2e, session/layout decomposition, global-sync/file domain split, server health, runtime adapters, terminal cache, unit tests, workstream map. **Meta**: perf-roadmap, parallel-agent-plan, project (API sketch). (source: specs/ filenames, specs/18-parallel-workstream-map.md)

---

## 4) Architectural signals inferred from structure

- **Observed:** **Client–server split**: `packages/opencode` (server + CLI + TUI) exposes HTTP API; `packages/app` and desktop consume it via `@opencode-ai/sdk`. SDK is generated from server routes (`script/generate.ts`, `packages/opencode/src/server/`). (source: CONTRIBUTING.md, packages/opencode/AGENTS.md)
- **Observed:** **Layered UI**: Shared primitives in `packages/ui` (theme, components); app-specific pages/context in `packages/app`; TUI in `packages/opencode/src/cli/cmd/tui/`. Both app and TUI use SolidJS. (source: CONTRIBUTING.md, packages/opencode/src/cli/cmd/tui/)
- **Observed:** **Domain-oriented core**: In `packages/opencode`, session, tool, provider, project, file, server/routes are separate folders; in `packages/app`, context/global-sync and context/file are explicit domains with submodules. (source: specs/12-global-sync-domain-split.md, specs/13-file-context-domain-split.md)
- **Inference:** **Hexagonal-style** at core: server routes as adapters; session/tool as core; provider/LSP/MCP/plugin as external adapters. Not strictly hexagonal but clear **integration boundaries** (acp, provider/sdk/copilot, mcp, lsp).
- **Inference:** **Deployment boundaries**: `infra/` and `packages/function/` define what runs where (Cloudflare Workers, SST); `packages/containers/` and `sdks/vscode/` are separate delivery surfaces. **Intentionally isolated**: console (packages/console) is a separate product surface from the main CLI/web/desktop.

---

## 5) Cross-cutting folders and patterns

- **Configuration:** Root: `package.json`, `turbo.json`, `bunfig.toml`, `tsconfig.json`, `sst.config.ts`. Package-level: each package has its own `package.json` and usually `tsconfig.json`. OpenCode runtime config is loaded in `packages/opencode/src/config/`. Themes: root `themes/`, `packages/ui/src/theme/themes/`, `packages/opencode/src/cli/cmd/tui/context/theme/` — **themes exist in three places** (see §7).
- **Logging / telemetry:** `packages/opencode/src/util/log.ts` (Log.create); no single “telemetry” folder; logging is code-level. (source: packages/opencode/AGENTS.md)
- **Error handling:** `packages/opencode/src/cli/error.ts`, `server/error.ts`; `packages/util` has `error.ts`. No repo-wide error module.
- **Shared utilities:** **`packages/util/`** — shared across packages. **`packages/opencode/src/util/`** — opencode-internal only. App-specific helpers in **`packages/app/src/utils/`**.
- **Build / tooling / scripts:** Root **`script/`** for repo-wide (generate, publish, changelog, version). Package **`script/`** or **`scripts/`** per package (e.g. `packages/opencode/script/build.ts`, `packages/sdk/js/script/build.ts`, `packages/containers/script/build.ts`). **Turborepo** for task graph (typecheck, build, test). **Generate:** `./script/generate.ts` is the single entry for “regenerate SDK and openapi”; it delegates to `packages/sdk/js/script/build.ts` and `bun dev generate` from opencode. (source: script/generate.ts, AGENTS.md)
- **Tests:** **Unit:** Co-located in `packages/opencode/test/` (mirrors src) and `packages/app/src/**/*.test.ts`. **E2E:** `packages/app/e2e/` (Playwright by feature). **Spec 17** adds `test:unit` and stabilizes unit tests in app. Tests **mirror** source layout in opencode and app; e2e is feature-based. (source: specs/17-unit-test-foundation.md, packages/app/e2e/)

---

## 6) Ownership & change impact guide

| Area | If you change this… | Dependency direction | Risk |
|------|---------------------|----------------------|------|
| **packages/opencode/src/server/** | Regenerate SDK (`./script/generate.ts`); all SDK consumers (app, TUI, extensions) may need updates. | Server is authority; app/TUI/sdk depend on it | **High** |
| **packages/opencode/src/cli/cmd/** | CLI behavior and TUI; no direct impact on app except shared server API. | CLI/TUI → server, SDK | **Medium** |
| **packages/app/src/context/** | Global-sync and file context are hot (specs 12–13); changes can affect layout and session pages. | Pages → context; context → sdk/server | **High** |
| **packages/app/src/pages/** | Session/layout pages; may touch context and components. | Pages → layout/session modules, context | **High** |
| **packages/ui/** | Any package that imports `@opencode-ai/ui` (app, possibly desktop); theme and component contracts. | app/desktop → ui | **Medium** |
| **packages/sdk/js/** | Generated; prefer changing server and running `./script/generate.ts`. Hand-edits can be overwritten. | app, TUI, extensions → sdk → server | **High** (if edited manually) |
| **packages/util/** | All packages that depend on util; keep API stable. | Many packages → util | **Medium** |
| **infra/** | Deployment and env (Workers, secrets, domain); no impact on local dev unless deploying. | infra references packages/function, etc. | **High** (deploy) |
| **script/generate.ts** | SDK and OpenAPI output; run after server route changes. | Script → packages/sdk, packages/opencode | **Low** (orchestration only) |
| **specs/** | No code impact; guides work and workstream assignment. | — | **Low** |

---

## 7) Smells, inconsistencies, and risks

- **SDK path inconsistency:** AGENTS.md says “run `./packages/sdk/js/script/build.ts`”; CONTRIBUTING and packages/opencode/AGENTS.md say “run `./script/generate.ts`” for SDK regeneration. **Reality:** `./script/generate.ts` is the intended entry (it runs the SDK build and openapi export). (source: AGENTS.md, CONTRIBUTING.md, script/generate.ts)
- **Themes in three places:** Root **`themes/`** (deltarune, undertale); **`packages/ui/src/theme/themes/`** (many JSONs); **`packages/opencode/src/cli/cmd/tui/context/theme/`** (TUI-specific set). Unclear single source of truth; possible drift between TUI and app themes. (source: themes/, packages/ui/src/theme/themes/, packages/opencode/src/cli/cmd/tui/context/theme/)
- **Template READMEs:** Several package READMEs are generic (SolidStart, Mintlify, Starlight, bun init placeholder) and don’t describe the package’s role. (source: knowledge/overview.md)
- **Script location duality:** Repo-level scripts in **`script/`**; package-level in **`packages/<pkg>/script/`** or **`scripts/`** (e.g. console uses `script/`). Consistent naming but two conventions (singular `script` vs `scripts` in some docs). (source: packages/console/app build script)
- **Function package vs infra:** **`packages/function/`** contains the API worker handler; **`infra/app.ts`** references `packages/function/src/api.ts`. Clear ownership (function = implementation, infra = wiring) but the name “function” is generic; could be confused with “serverless function” in general. (source: infra/app.ts, packages/function/)
- **Parallel workstream overlap:** Spec 18’s file-ownership matrix lists “avoid editing” regions; overlapping boundaries (e.g. context/global-sync vs context/file) require coordination when changing both. (source: specs/18-parallel-workstream-map.md)

---

## 8) Suggested structural improvements (optional)

- **Problem:** New contributors may run `./packages/sdk/js/script/build.ts` directly and miss openapi export and format.  
  **Proposed change:** In AGENTS.md (and CONTRIBUTING if needed), state explicitly: “To regenerate the SDK after server changes, run **`./script/generate.ts`** from repo root (do not run only `packages/sdk/js/script/build.ts`).”  
  **Benefit:** Single, correct command. **Risk:** None.

- **Problem:** Themes duplicated across root, packages/ui, and TUI; risk of drift.  
  **Proposed change:** Document in knowledge or CONTRIBUTING: which folder is canonical for which consumer (e.g. app vs TUI), and whether root themes are legacy or shared. Optionally, add a short “themes” section to knowledge/overview.md.  
  **Benefit:** Clear ownership; fewer accidental inconsistencies. **Migration risk:** Low (doc-only first).

- **Problem:** Template READMEs in packages (web, docs, console/app, enterprise, opencode) confuse onboarding.  
  **Proposed change:** Replace or customize READMEs to one paragraph describing the package’s role and main commands (as in knowledge/overview.md).  
  **Benefit:** Clearer onboarding. **Migration risk:** Low.

---

*Citations and rigor: Paths and claims are tied to the repo layout, CONTRIBUTING.md, AGENTS.md, knowledge/overview.md, and specs. Inferences are labeled. Where something was unclear (e.g. exact theme canonical source), it is stated.*
