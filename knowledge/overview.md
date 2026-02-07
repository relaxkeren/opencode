# Repository knowledge map: OpenCode

This file is an **index + mental model** of the repo’s Markdown documentation: what exists, where it lives, and how it connects. (source: README.md#documentation)

## 1) Repository at-a-glance

- **What this repo is**: OpenCode is “the open source AI coding agent” distributed primarily as a CLI, with a strong focus on a terminal UI (TUI). (source: README.md#installation, README.md#faq)  
  Inference: The repo is a monorepo containing the CLI/server, UI(s), and integrations, because the contributing guide enumerates multiple `packages/*` with distinct roles. (source: CONTRIBUTING.md#developing-opencode)
- **Who it’s for**:
  - **End users** installing/running the CLI or desktop app. (source: README.md#installation, README.md#desktop-app-beta)
  - **Contributors** working on bugfixes/providers/LSPs/docs and following repo guardrails. (source: CONTRIBUTING.md)
  - **Operators** running “server mode” and needing to understand security boundaries. (source: SECURITY.md#server-mode, SECURITY.md#threat-model)
- **Primary entry points** (start here):
  - **Product + install**: `README.md` (plus translations `README.*.md`). (source: README.md)
  - **Contributing + dev workflow**: `CONTRIBUTING.md`. (source: CONTRIBUTING.md)
  - **Security model / reporting**: `SECURITY.md`. (source: SECURITY.md)
  - **Repo style guide**: `AGENTS.md`. (source: AGENTS.md)
  - **Specs/roadmaps** (engineering plans): `specs/`. (source: specs/perf-roadmap.md#objective, specs/parallel-agent-plan.md)
  - **Integrations**: ACP (`packages/opencode/src/acp/README.md`), GitHub Action (`github/README.md`), Slack (`packages/slack/README.md`), VS Code (`sdks/vscode/README.md`). (source: packages/opencode/src/acp/README.md, github/README.md, packages/slack/README.md, sdks/vscode/README.md)

## 2) Documentation inventory (table)

Notes on reading:
- **Title** is the first H1 when present; otherwise it is inferred (marked “inferred”). (source: README.md, AGENTS.md)
- **Purpose** and **Key topics** are described using the doc’s own framing as much as possible. (source: CONTRIBUTING.md, SECURITY.md)

| Path | Title | Purpose (1 line) | Key topics (3–8) | Dependencies / references | Confidence |
|---|---|---|---|---|---|
| `README.md` | OpenCode (inferred) | Product overview + install + pointers to docs/contributing. (source: README.md) | - Installation options (curl, npm, brew, nix, etc.) (source: README.md#installation)<br>- Desktop app downloads (BETA) (source: README.md#desktop-app-beta)<br>- Built-in agents (`build`, `plan`, `general`) (source: README.md#agents)<br>- TUI focus + client/server architecture (source: README.md#faq) | Links to translations `README.*.md` + `CONTRIBUTING.md`. (source: README.md#contributing) | High |
| `README.*.md` (translations) | OpenCode (translations) (inferred) | Non-English translations of the main README for installation/agents/FAQ. (source: README.md) | - Mirrors install options and desktop app notes (source: README.md#installation, README.md#desktop-app-beta)<br>- Mirrors built-in agent overview (source: README.md#agents)<br>- Mirrors positioning (TUI, provider-agnostic, client/server) (source: README.md#faq) | Linked from the language switcher in `README.md`; typically links `CONTRIBUTING.md`. (source: README.md, README.ar.md) | Med |
| `AGENTS.md` | Style Guide | Repo-wide agent/dev style guide (naming, control flow, testing). (source: AGENTS.md) | - Single-word naming preference (source: AGENTS.md#naming)<br>- Avoid `try/catch` + avoid `any` (source: AGENTS.md#general-principles)<br>- Prefer early returns over `else` (source: AGENTS.md#control-flow)<br>- Drizzle snake_case schema guidance (source: AGENTS.md#schema-definitions-drizzle)<br>- Testing guidance (avoid mocks) (source: AGENTS.md#testing) | Referenced from contributing guide. (source: CONTRIBUTING.md#developing-opencode) | High |
| `CONTRIBUTING.md` | Contributing to OpenCode | Contribution guardrails + dev workflow + PR expectations. (source: CONTRIBUTING.md) | - What kinds of PRs are likely accepted (source: CONTRIBUTING.md#contributing-to-opencode)<br>- Dev commands (`bun install`, `bun dev`) (source: CONTRIBUTING.md#developing-opencode)<br>- `bun dev` vs `opencode` equivalence (source: CONTRIBUTING.md#understanding-bun-dev-vs-opencode)<br>- Running server/web/desktop during development (source: CONTRIBUTING.md#running-the-api-server)<br>- Debugger setup guidance (source: CONTRIBUTING.md#setting-up-a-debugger)<br>- PR expectations + conventional commit-style titles (source: CONTRIBUTING.md#pull-request-expectations) | Links `./AGENTS.md`; references `.vscode/*example.json`. (source: CONTRIBUTING.md#developing-opencode, CONTRIBUTING.md#vscode-setup) | High |
| `SECURITY.md` | Security | Threat model, security boundaries, and reporting process. (source: SECURITY.md) | - “No sandbox” (permission prompts are UX, not isolation) (source: SECURITY.md#no-sandbox)<br>- Server mode + `OPENCODE_SERVER_PASSWORD` (source: SECURITY.md#server-mode)<br>- Explicit “out of scope” categories (source: SECURITY.md#out-of-scope)<br>- Vulnerability reporting via GitHub Security Advisory (source: SECURITY.md#reporting-security-issues) | References Docker/VM and GitHub advisory flow. (source: SECURITY.md#no-sandbox, SECURITY.md#reporting-security-issues) | High |
| `STATS.md` | Download Stats | Time-series download stats for GitHub/npm. (source: STATS.md) | - Historical counts by date (source: STATS.md)<br>- GitHub vs npm tracking (source: STATS.md)<br>- Totals aggregation (source: STATS.md) | None. (source: STATS.md) | High |
| `.github/pull_request_template.md` | Pull Request Template | PR template requesting description + verification; discourages “AI-generated” text walls. (source: .github/pull_request_template.md) | - What changed / why (source: .github/pull_request_template.md)<br>- How it was verified (source: .github/pull_request_template.md)<br>- Concise human-written PR descriptions (source: .github/pull_request_template.md) | None. (source: .github/pull_request_template.md) | High |
| `.opencode/agent/docs.md` | Documentation Agent | Agent guidance for writing docs with strict formatting/tone constraints. (source: .opencode/agent/docs.md) | - Short sections, imperative titles (source: .opencode/agent/docs.md)<br>- 2-sentence max paragraphs (source: .opencode/agent/docs.md)<br>- Code snippet + formatting rules (source: .opencode/agent/docs.md) | References `packages/web` docs index (mdx) path. (source: .opencode/agent/docs.md) | Med |
| `.opencode/agent/duplicate-pr.md` | Duplicate PR Detection Agent | Agent workflow to search for duplicate/related PRs. (source: .opencode/agent/duplicate-pr.md) | - GitHub PR search (source: .opencode/agent/duplicate-pr.md)<br>- Keyword-based matching (source: .opencode/agent/duplicate-pr.md)<br>- Concise reporting (source: .opencode/agent/duplicate-pr.md) | None. (source: .opencode/agent/duplicate-pr.md) | Med |
| `.opencode/agent/triage.md` | GitHub Triage Agent | Agent workflow for triaging GitHub issues (labels/assignment rules). (source: .opencode/agent/triage.md) | - Label taxonomy (source: .opencode/agent/triage.md)<br>- Assignment routing by category (source: .opencode/agent/triage.md)<br>- Automation/tooling expectations (source: .opencode/agent/triage.md) | None. (source: .opencode/agent/triage.md) | Med |
| `.opencode/command/ai-deps.md` | AI SDK Dependencies Update | Command doc for checking AI SDK dependency updates. (source: .opencode/command/ai-deps.md) | - What to update (minor/patch) (source: .opencode/command/ai-deps.md)<br>- Summarize changelogs (source: .opencode/command/ai-deps.md)<br>- Output/report expectations (source: .opencode/command/ai-deps.md) | Mentions `package.json` paths. (source: .opencode/command/ai-deps.md) | Med |
| `.opencode/command/commit.md` | Git Commit and Push | Command doc for committing/pushing with prefix conventions. (source: .opencode/command/commit.md) | - Prefix conventions (source: .opencode/command/commit.md)<br>- User-focused commit messages (source: .opencode/command/commit.md)<br>- Rebase/conflict handling expectations (source: .opencode/command/commit.md) | None. (source: .opencode/command/commit.md) | Med |
| `.opencode/command/issues.md` | GitHub Issues Search | Command doc for searching issues for duplicates. (source: .opencode/command/issues.md) | - Search strategies (title/body/errors) (source: .opencode/command/issues.md)<br>- Use gh CLI (source: .opencode/command/issues.md)<br>- Related functionality detection (source: .opencode/command/issues.md) | None. (source: .opencode/command/issues.md) | Med |
| `.opencode/command/learn.md` | Extract Learnings to AGENTS.md | Command doc for extracting non-obvious learnings into `AGENTS.md`. (source: .opencode/command/learn.md) | - What qualifies as a “learning” (source: .opencode/command/learn.md)<br>- Where to store learnings (directory `AGENTS.md`) (source: .opencode/command/learn.md)<br>- Keep it non-obvious / actionable (source: .opencode/command/learn.md) | References `AGENTS.md` pattern. (source: .opencode/command/learn.md) | Med |
| `.opencode/command/rmslop.md` | Remove AI Code Slop | Command doc for removing AI-ish artifacts inconsistent with style. (source: .opencode/command/rmslop.md) | - Remove unnecessary comments/defensiveness (source: .opencode/command/rmslop.md)<br>- Avoid emojis/noise (source: .opencode/command/rmslop.md)<br>- Align with repo conventions (source: .opencode/command/rmslop.md) | None. (source: .opencode/command/rmslop.md) | Med |
| `.opencode/command/spellcheck.md` | Spellcheck Markdown Changes | Command doc for spellchecking Markdown changes. (source: .opencode/command/spellcheck.md) | - Targets `.md`/`.mdx` (source: .opencode/command/spellcheck.md)<br>- Unstaged-only scope (source: .opencode/command/spellcheck.md)<br>- Spelling/grammar checks (source: .opencode/command/spellcheck.md) | None. (source: .opencode/command/spellcheck.md) | Med |
| `.opencode/skill/bun-file-io/SKILL.md` | Bun File I/O Skill | Preferred file I/O patterns using Bun APIs. (source: .opencode/skill/bun-file-io/SKILL.md) | - `Bun.file()` and lazy reads (source: .opencode/skill/bun-file-io/SKILL.md)<br>- `Bun.write()` for writes (source: .opencode/skill/bun-file-io/SKILL.md)<br>- `Bun.Glob` for scanning (source: .opencode/skill/bun-file-io/SKILL.md)<br>- When to use `node:fs/promises` (source: .opencode/skill/bun-file-io/SKILL.md) | None. (source: .opencode/skill/bun-file-io/SKILL.md) | High |
| `github/README.md` | opencode GitHub Action | GitHub Action that runs opencode tasks from issue/PR comments. (source: github/README.md) | - `/opencode explain` and `/opencode fix` flows (source: github/README.md#features)<br>- PR review + line-comment context handling (source: github/README.md#review-specific-code-lines)<br>- Install via `opencode github install` (source: github/README.md#installation)<br>- Manual workflow YAML + secrets (source: github/README.md#manual-setup)<br>- Local dev via `MOCK_EVENT` (source: github/README.md#development) | References `.github/workflows/opencode.yml` in target repos; uses `anomalyco/opencode/github@latest`. (source: github/README.md#manual-setup) | High |
| `packages/app/AGENTS.md` | App Agent Guidelines | App package dev guidance (debugging, local dev, SolidJS preferences). (source: packages/app/AGENTS.md) | - Don’t restart app/server while debugging (source: packages/app/AGENTS.md#debugging)<br>- Local dev: run backend + app dev servers separately (source: packages/app/AGENTS.md#local-dev)<br>- SolidJS: prefer `createStore` (source: packages/app/AGENTS.md#solidjs)<br>- Browser automation workflow (source: packages/app/AGENTS.md#browser-automation) | References backend command and local URL. (source: packages/app/AGENTS.md#local-dev) | High |
| `packages/app/README.md` | Usage | Starter-ish usage notes + E2E testing and env vars for Playwright runner. (source: packages/app/README.md) | - Mentions pnpm-managed template deps (source: packages/app/README.md#usage)<br>- E2E: `bun run test:e2e:local` + env vars (source: packages/app/README.md#e2e-testing)<br>- Deployment notes for `dist/` (source: packages/app/README.md#deployment) | None. (source: packages/app/README.md) | Med |
| `packages/app/e2e/AGENTS.md` | E2E Testing Guide (inferred) | Guide for writing/running e2e tests for `packages/app`. (source: packages/app/e2e/AGENTS.md) | - Playwright fixtures/helpers (source: packages/app/e2e/AGENTS.md)<br>- Selector conventions (source: packages/app/e2e/AGENTS.md)<br>- Test structure patterns (source: packages/app/e2e/AGENTS.md) | References test helper files by convention. (source: packages/app/e2e/AGENTS.md) | Med |
| `packages/console/app/README.md` | SolidStart | SolidStart template README for the console app package. (source: packages/console/app/README.md) | - SolidStart basics (source: packages/console/app/README.md)<br>- Dev/build commands (generic) (source: packages/console/app/README.md) | None. (source: packages/console/app/README.md) | Low |
| `packages/console/app/.opencode/agent/css.md` | CSS Styling Agent | Agent guidance for CSS conventions (data attributes hierarchy). (source: packages/console/app/.opencode/agent/css.md) | - CSS hierarchy (page/component/slot) (source: packages/console/app/.opencode/agent/css.md)<br>- `data-page`/`data-component`/`data-slot` (source: packages/console/app/.opencode/agent/css.md)<br>- State via data attrs (source: packages/console/app/.opencode/agent/css.md) | Links to `./src/routes/index.css` and `./src/routes/index.tsx`. (source: packages/console/app/.opencode/agent/css.md) | Med |
| `packages/containers/README.md` | CI containers | Prebuilt Docker images for speeding up GitHub Actions (Linux) jobs. (source: packages/containers/README.md) | - Image stack (`base`, `bun-node`, `rust`, `tauri-linux`, `publish`) (source: packages/containers/README.md)<br>- Build commands (with `--push`) (source: packages/containers/README.md#build)<br>- Workflow `job.container` example (source: packages/containers/README.md#workflow-usage)<br>- Notes: Linux-only, multi-arch buildx (source: packages/containers/README.md#notes) | References GHCR images. (source: packages/containers/README.md) | High |
| `packages/desktop/README.md` | OpenCode Desktop | Dev/build instructions for the Tauri v2 desktop app wrapper. (source: packages/desktop/README.md) | - Run `tauri dev` from repo root (source: packages/desktop/README.md#development)<br>- Build with `tauri build` (source: packages/desktop/README.md#build)<br>- Prerequisites: Rust + platform libs (source: packages/desktop/README.md#prerequisites) | Links Tauri prerequisites. (source: packages/desktop/README.md#prerequisites) | High |
| `packages/desktop/src-tauri/icons/README.md` | Tauri Icons | Notes/process for creating Tauri app icons. (source: packages/desktop/src-tauri/icons/README.md) | - Icon generation workflow (source: packages/desktop/src-tauri/icons/README.md)<br>- macOS icon constraints (source: packages/desktop/src-tauri/icons/README.md)<br>- Tooling mention (source: packages/desktop/src-tauri/icons/README.md) | None. (source: packages/desktop/src-tauri/icons/README.md) | Med |
| `packages/docs/README.md` | Mintlify Starter Kit | Mintlify starter kit README (template). (source: packages/docs/README.md) | - Use template / starter guide links (source: packages/docs/README.md)<br>- `mint dev` local preview (source: packages/docs/README.md#development)<br>- Publishing via Mintlify GitHub app (source: packages/docs/README.md#publishing-changes) | External Mintlify docs. (source: packages/docs/README.md) | Low |
| `packages/enterprise/README.md` | SolidStart | SolidStart template README (boilerplate). (source: packages/enterprise/README.md) | - Template “creating a project” (source: packages/enterprise/README.md#creating-a-project)<br>- Generic dev/build instructions (source: packages/enterprise/README.md#developing) | None. (source: packages/enterprise/README.md) | Low |
| `packages/opencode/AGENTS.md` | opencode agent guidelines | Core package dev commands + code style/architecture notes. (source: packages/opencode/AGENTS.md) | - Build/test commands using Bun (source: packages/opencode/AGENTS.md#buildtest-commands)<br>- Zod validation preference (source: packages/opencode/AGENTS.md#architecture)<br>- `@opencode-ai/sdk` regeneration via `./script/generate.ts` when changing server endpoints (source: packages/opencode/AGENTS.md#architecture) | References `packages/opencode/src/server/server.ts` and `./script/generate.ts`. (source: packages/opencode/AGENTS.md#architecture) | High |
| `packages/opencode/README.md` | js | Bun-init template README for a “js” package (appears placeholder). (source: packages/opencode/README.md) | - `bun install` (source: packages/opencode/README.md)<br>- `bun run index.ts` (source: packages/opencode/README.md)<br>- Mentions created via `bun init` (source: packages/opencode/README.md) | None. (source: packages/opencode/README.md) | Low |
| `packages/opencode/src/acp/README.md` | ACP (Agent Client Protocol) Implementation | ACP implementation details + usage + limitations + Zed integration. (source: packages/opencode/src/acp/README.md) | - Component roles (`agent.ts`, `client.ts`, `session.ts`, `server.ts`) (source: packages/opencode/src/acp/README.md#core-components)<br>- CLI usage `opencode acp` (source: packages/opencode/src/acp/README.md#command-line)<br>- Zed integration snippet (source: packages/opencode/src/acp/README.md#integration-with-zed)<br>- Current limitations (streaming, tool reporting, persistence, etc.) (source: packages/opencode/src/acp/README.md#current-limitations) | External ACP spec + TypeScript SDK links. (source: packages/opencode/src/acp/README.md#references) | High |
| `packages/opencode/src/provider/sdk/copilot/README.md` | GitHub Copilot Provider (inferred) | Warns the package is temporary and Copilot-only. (source: packages/opencode/src/provider/sdk/copilot/README.md) | - Copilot-only restriction (source: packages/opencode/src/provider/sdk/copilot/README.md)<br>- Avoid changes unless Copilot-specific (source: packages/opencode/src/provider/sdk/copilot/README.md) | None. (source: packages/opencode/src/provider/sdk/copilot/README.md) | High |
| `packages/opencode/test/config/fixtures/empty-frontmatter.md` | Empty Frontmatter Test Fixture (inferred) | Fixture for testing empty YAML frontmatter parsing. (source: packages/opencode/test/config/fixtures/empty-frontmatter.md) | - Empty frontmatter delimiter (source: packages/opencode/test/config/fixtures/empty-frontmatter.md)<br>- Minimal content after frontmatter (source: packages/opencode/test/config/fixtures/empty-frontmatter.md) | None. (source: packages/opencode/test/config/fixtures/empty-frontmatter.md) | High |
| `packages/opencode/test/config/fixtures/frontmatter.md` | Frontmatter Test Fixture (inferred) | Fixture for testing frontmatter parsing edge cases. (source: packages/opencode/test/config/fixtures/frontmatter.md) | - Quoted values / nested structures (source: packages/opencode/test/config/fixtures/frontmatter.md)<br>- Multi-line values (source: packages/opencode/test/config/fixtures/frontmatter.md)<br>- Content after frontmatter (source: packages/opencode/test/config/fixtures/frontmatter.md) | None. (source: packages/opencode/test/config/fixtures/frontmatter.md) | High |
| `packages/opencode/test/config/fixtures/markdown-header.md` | Markdown Header Test Fixture (inferred) | Fixture to test markdown header parsing/expectations. (source: packages/opencode/test/config/fixtures/markdown-header.md) | - Heading presence/format (source: packages/opencode/test/config/fixtures/markdown-header.md)<br>- Formatting constraints (source: packages/opencode/test/config/fixtures/markdown-header.md) | None. (source: packages/opencode/test/config/fixtures/markdown-header.md) | Med |
| `packages/opencode/test/config/fixtures/no-frontmatter.md` | No Frontmatter Test Fixture (inferred) | Fixture for markdown without YAML frontmatter. (source: packages/opencode/test/config/fixtures/no-frontmatter.md) | - No YAML section (source: packages/opencode/test/config/fixtures/no-frontmatter.md)<br>- Content-only parsing (source: packages/opencode/test/config/fixtures/no-frontmatter.md) | None. (source: packages/opencode/test/config/fixtures/no-frontmatter.md) | High |
| `packages/opencode/test/config/fixtures/weird-model-id.md` | Weird Model ID Test Fixture (inferred) | Fixture for model config parsing with unusual model identifier. (source: packages/opencode/test/config/fixtures/weird-model-id.md) | - Model id edge case (source: packages/opencode/test/config/fixtures/weird-model-id.md)<br>- Tool permissions in config (source: packages/opencode/test/config/fixtures/weird-model-id.md)<br>- Subagent config surface (source: packages/opencode/test/config/fixtures/weird-model-id.md) | None. (source: packages/opencode/test/config/fixtures/weird-model-id.md) | High |
| `packages/slack/README.md` | @opencode-ai/slack | Slack bot integration setup + environment variables. (source: packages/slack/README.md) | - Slack app creation + Socket Mode (source: packages/slack/README.md#setup)<br>- OAuth scopes list (source: packages/slack/README.md#setup)<br>- `.env` variables (`SLACK_BOT_TOKEN`, etc.) (source: packages/slack/README.md#setup)<br>- Thread-per-session behavior (source: packages/slack/README.md#usage) | Slack platform docs (external). (source: packages/slack/README.md#setup) | High |
| `packages/web/README.md` | Starlight Starter Kit: Basics | Starlight/Astro starter-kit README (template). (source: packages/web/README.md) | - Generic Astro/Starlight structure (source: packages/web/README.md#-project-structure)<br>- Generic `npm run dev/build/preview` commands (source: packages/web/README.md#-commands)<br>- Template links (StackBlitz/Netlify/Vercel) (source: packages/web/README.md) | External Astro/Starlight docs. (source: packages/web/README.md#-want-to-learn-more) | Low |
| `sdks/vscode/README.md` | opencode VS Code Extension | VS Code extension features + dev workflow. (source: sdks/vscode/README.md) | - Quick launch keybindings (source: sdks/vscode/README.md#features)<br>- Context awareness (selection/tab sharing) (source: sdks/vscode/README.md#features)<br>- File reference shortcuts (source: sdks/vscode/README.md#features)<br>- Dev: open `sdks/vscode` (not repo root), `F5` debug (source: sdks/vscode/README.md#development) | Requires opencode CLI installed. (source: sdks/vscode/README.md#prerequisites) | High |
| `specs/perf-roadmap.md` | Performance roadmap | Sequenced plan tying together the first five performance specs. (source: specs/perf-roadmap.md) | - Objective + phases (source: specs/perf-roadmap.md#objective)<br>- Flagging strategy (source: specs/perf-roadmap.md#phase-0--baseline--flags-prep)<br>- “Guardrails first” principle (source: specs/perf-roadmap.md#guiding-principles)<br>- Links to specs 01–05 (source: specs/perf-roadmap.md#objective) | References `specs/01`–`specs/05`. (source: specs/perf-roadmap.md#objective) | High |
| `specs/project.md` | project | API sketch for multi-project sessions/worktrees and endpoints. (source: specs/project.md) | - Project/session endpoints (source: specs/project.md#api)<br>- Message/file endpoints (source: specs/project.md#api)<br>- Notes on “awkward” endpoints (source: specs/project.md#api) | None. (source: specs/project.md) | Med |
| `specs/01-persist-payload-limits.md` | Payload limits (inferred) | Spec to bound persisted payload sizes and move large data to blob storage. (source: specs/01-persist-payload-limits.md) | - Persistence policies by key (source: specs/01-persist-payload-limits.md)<br>- Blob store abstraction (source: specs/01-persist-payload-limits.md)<br>- Image data URL migration (source: specs/01-persist-payload-limits.md) | Referenced by perf roadmap. (source: specs/perf-roadmap.md#objective) | Med |
| `specs/02-cache-eviction.md` | Cache eviction (inferred) | Spec to introduce LRU/TTL/size caps for in-memory caches. (source: specs/02-cache-eviction.md) | - Shared cache utility (source: specs/02-cache-eviction.md)<br>- Apply to file/global-sync/session caches (source: specs/02-cache-eviction.md)<br>- Dev stats tooling (source: specs/02-cache-eviction.md) | Referenced by perf roadmap. (source: specs/perf-roadmap.md#objective) | Med |
| `specs/03-request-throttling.md` | Request throttling (inferred) | Spec to debounce/cancel high-frequency requests. (source: specs/03-request-throttling.md) | - Debounced/latest-only helpers (source: specs/03-request-throttling.md)<br>- Apply to file search/LSP refresh (source: specs/03-request-throttling.md)<br>- Abort/stale result protection (source: specs/03-request-throttling.md) | Referenced by perf roadmap. (source: specs/perf-roadmap.md#objective) | Med |
| `specs/04-scroll-spy-optimization.md` | Spy acceleration (inferred) | Spec to replace O(N) scroll DOM scans with observer/indexed approach. (source: specs/04-scroll-spy-optimization.md) | - Extract scroll-spy module (source: specs/04-scroll-spy-optimization.md)<br>- IntersectionObserver tracking (source: specs/04-scroll-spy-optimization.md)<br>- Binary-search fallback + observers (source: specs/04-scroll-spy-optimization.md) | Referenced by perf roadmap. (source: specs/perf-roadmap.md#objective) | Med |
| `specs/05-modularize-and-dedupe.md` | Component modularity (inferred) | Spec to split mega-components and dedupe patterns/utilities. (source: specs/05-modularize-and-dedupe.md) | - Extract shared scoped-cache (source: specs/05-modularize-and-dedupe.md)<br>- Split large files into modules (source: specs/05-modularize-and-dedupe.md)<br>- Reduce duplication after confidence (source: specs/05-modularize-and-dedupe.md) | Referenced by perf roadmap. (source: specs/perf-roadmap.md#objective) | Med |
| `specs/06-app-i18n-audit.md` | App i18n Audit (inferred) | Audit of remaining hardcoded strings / locale formatting work in `packages/app`. (source: specs/06-app-i18n-audit.md) | - Remaining vs completed i18n work (source: specs/06-app-i18n-audit.md)<br>- Dictionary parity notes (source: specs/06-app-i18n-audit.md)<br>- Locale-sensitive formatting (source: specs/06-app-i18n-audit.md) | None. (source: specs/06-app-i18n-audit.md) | Med |
| `specs/07-ui-i18n-audit.md` | UI i18n Audit (inferred) | Audit/proposal for i18n architecture in shared UI package(s). (source: specs/07-ui-i18n-audit.md) | - UI-owned strings and namespaces (source: specs/07-ui-i18n-audit.md)<br>- Provider/hook design (source: specs/07-ui-i18n-audit.md)<br>- Component migration targets (source: specs/07-ui-i18n-audit.md) | None. (source: specs/07-ui-i18n-audit.md) | Med |
| `specs/08-app-e2e-smoke-suite.md` | App E2E Smoke Suite (CI) (inferred) | Add small, stable Playwright smoke tests to CI. (source: specs/08-app-e2e-smoke-suite.md) | - “High-signal, low-flake” tests (source: specs/08-app-e2e-smoke-suite.md)<br>- Avoid LLM-output-dependent assertions (source: specs/08-app-e2e-smoke-suite.md)<br>- CI-friendly runtime (source: specs/08-app-e2e-smoke-suite.md) | None. (source: specs/08-app-e2e-smoke-suite.md) | Med |
| `specs/09-session-page-decomposition.md` | Session page decomposition (inferred) | Split `pages/session.tsx` into focused modules without behavior change. (source: specs/09-session-page-decomposition.md) | - Extract review panel / timeline / tabs / terminal (source: specs/09-session-page-decomposition.md)<br>- Centralize session state/effects (source: specs/09-session-page-decomposition.md)<br>- Keep route entry thin (source: specs/09-session-page-decomposition.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/09-session-page-hot-paths.md` | Session hot paths (inferred) | Reduce render work and duplication in session page. (source: specs/09-session-page-hot-paths.md) | - Render heavy content only for active tab (source: specs/09-session-page-hot-paths.md)<br>- Deduplicate review panel wiring (source: specs/09-session-page-hot-paths.md)<br>- Reduce command registration churn (source: specs/09-session-page-hot-paths.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/10-layout-page-decomposition.md` | Layout page decomposition (inferred) | Split layout page into modular components/hooks. (source: specs/10-layout-page-decomposition.md) | - Extract sidebar/project/workspace items (source: specs/10-layout-page-decomposition.md)<br>- Deep link handling module (source: specs/10-layout-page-decomposition.md)<br>- Reduce layout.tsx to composition (source: specs/10-layout-page-decomposition.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/10-file-content-eviction-accounting.md` | File cache accounting (inferred) | Make eviction bookkeeping O(1) via incremental byte accounting. (source: specs/10-file-content-eviction-accounting.md) | - Track total bytes incrementally (source: specs/10-file-content-eviction-accounting.md)<br>- Update totals on insert/update/remove (source: specs/10-file-content-eviction-accounting.md)<br>- Avoid full-map reductions (source: specs/10-file-content-eviction-accounting.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/11-layout-view-tabs-reactivity.md` | Layout reactivity (inferred) | Reduce reactive overhead in `useLayout` by removing per-call effects. (source: specs/11-layout-view-tabs-reactivity.md) | - Avoid per-call `createEffect` allocations (source: specs/11-layout-view-tabs-reactivity.md)<br>- Preserve semantics (scroll seeding/touch) (source: specs/11-layout-view-tabs-reactivity.md)<br>- Performance focus (source: specs/11-layout-view-tabs-reactivity.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/11-prompt-input-and-optimistic-state.md` | Prompt input and optimistic-state consolidation (inferred) | Modularize prompt input and centralize optimistic message mutations. (source: specs/11-prompt-input-and-optimistic-state.md) | - Prompt input decomposition (source: specs/11-prompt-input-and-optimistic-state.md)<br>- Centralize optimistic add/remove behavior (source: specs/11-prompt-input-and-optimistic-state.md)<br>- Remove unsafe casts (source: specs/11-prompt-input-and-optimistic-state.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/12-global-sync-domain-split.md` | Global sync domain split (inferred) | Refactor global-sync context into domain modules while preserving API. (source: specs/12-global-sync-domain-split.md) | - Queue, bootstrap, reducer modules (source: specs/12-global-sync-domain-split.md)<br>- Session trimming helpers (source: specs/12-global-sync-domain-split.md)<br>- Preserve `useGlobalSync()` API (source: specs/12-global-sync-domain-split.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/12-session-context-metrics-shared.md` | Context metrics shared (inferred) | Centralize duplicated session usage/cost metrics computations. (source: specs/12-session-context-metrics-shared.md) | - Shared metrics helper (source: specs/12-session-context-metrics-shared.md)<br>- Memoization guard (source: specs/12-session-context-metrics-shared.md)<br>- Keep UI unchanged (source: specs/12-session-context-metrics-shared.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/13-file-context-domain-split.md` | File context domain split (inferred) | Refactor file context into modules while preserving `useFile()` API. (source: specs/13-file-context-domain-split.md) | - Path/content/view/tree/watcher modules (source: specs/13-file-context-domain-split.md)<br>- Provider composes modules (source: specs/13-file-context-domain-split.md)<br>- Preserve external API (source: specs/13-file-context-domain-split.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/13-file-tree-fetch-discipline.md` | File tree fetches (inferred) | Make directory listing triggers explicit and minimal. (source: specs/13-file-tree-fetch-discipline.md) | - Replace broad effect with explicit triggers (source: specs/13-file-tree-fetch-discipline.md)<br>- Guard redundant fetches (source: specs/13-file-tree-fetch-discipline.md)<br>- Preserve filter auto-expand (source: specs/13-file-tree-fetch-discipline.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/14-comments-aggregation-index.md` | Comments indexing (inferred) | Maintain indexed comment aggregates to avoid repeated flatten/sort. (source: specs/14-comments-aggregation-index.md) | - Keep `allComments` index (source: specs/14-comments-aggregation-index.md)<br>- Update mutators to maintain index (source: specs/14-comments-aggregation-index.md)<br>- Preserve ordering guarantees (source: specs/14-comments-aggregation-index.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/14-server-health-and-row-dedupe.md` | Server health and row dedupe (inferred) | Centralize server health checks and dedupe server-row UI logic. (source: specs/14-server-health-and-row-dedupe.md) | - Shared health checker (source: specs/14-server-health-and-row-dedupe.md)<br>- Consistent timeout/error semantics (source: specs/14-server-health-and-row-dedupe.md)<br>- Shared row component (source: specs/14-server-health-and-row-dedupe.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/15-prompt-input-modularization.md` | Prompt input split (inferred) | Extract prompt-input helpers into smaller modules/hooks/services. (source: specs/15-prompt-input-modularization.md) | - Editor DOM helpers module (source: specs/15-prompt-input-modularization.md)<br>- History/attachments/submit modules (source: specs/15-prompt-input-modularization.md)<br>- Keep PromptInput as integration shell (source: specs/15-prompt-input-modularization.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/15-runtime-adapter-type-safety.md` | Runtime adapter type safety (inferred) | Reduce unsafe casts by introducing typed adapters at boundaries. (source: specs/15-runtime-adapter-type-safety.md) | - Remove `as any`/unsafe casts (source: specs/15-runtime-adapter-type-safety.md)<br>- Narrow interfaces/guards (source: specs/15-runtime-adapter-type-safety.md)<br>- Preserve behavior (source: specs/15-runtime-adapter-type-safety.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/16-i18n-hardening-and-parity.md` | i18n hardening and parity (inferred) | Enforce dictionary key parity across locales and remove hardcoded strings. (source: specs/16-i18n-hardening-and-parity.md) | - Stricter parity (source: specs/16-i18n-hardening-and-parity.md)<br>- Remove English fallbacks (source: specs/16-i18n-hardening-and-parity.md)<br>- Localize scoped files (source: specs/16-i18n-hardening-and-parity.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/16-terminal-cache-key-clarity.md` | Terminal cache scope (inferred) | Clarify terminal cache semantics (workspace vs session). (source: specs/16-terminal-cache-key-clarity.md) | - Workspace-scoped cache semantics (source: specs/16-terminal-cache-key-clarity.md)<br>- Remove misleading session keying surface (source: specs/16-terminal-cache-key-clarity.md)<br>- No behavior changes (source: specs/16-terminal-cache-key-clarity.md) | Referenced by parallel plan. (source: specs/parallel-agent-plan.md) | Med |
| `specs/17-unit-test-foundation.md` | Unit test foundation (inferred) | Establish unit test baseline and dedicated unit test command. (source: specs/17-unit-test-foundation.md) | - Add `test:unit` with bun + happydom (source: specs/17-unit-test-foundation.md)<br>- Unskip/stabilize existing tests (source: specs/17-unit-test-foundation.md)<br>- Focus on pure logic (source: specs/17-unit-test-foundation.md) | Referenced by workstream map. (source: specs/18-parallel-workstream-map.md) | Med |
| `specs/18-parallel-workstream-map.md` | Parallel workstream map | File ownership boundaries for parallel spec execution. (source: specs/18-parallel-workstream-map.md) | - 9 parallel workstreams (source: specs/18-parallel-workstream-map.md)<br>- File ownership matrix (source: specs/18-parallel-workstream-map.md)<br>- Integration checkpoints (source: specs/18-parallel-workstream-map.md) | References multiple specs by path. (source: specs/18-parallel-workstream-map.md) | High |
| `specs/parallel-agent-plan.md` | Parallel agent plan | Batch plan for executing session-page improvement specs. (source: specs/parallel-agent-plan.md) | - Batch A sequential vs Batch B parallel (source: specs/parallel-agent-plan.md)<br>- Agent assignment guidance (source: specs/parallel-agent-plan.md)<br>- References related specs (source: specs/parallel-agent-plan.md) | Links various specs (09–16, 04–05). (source: specs/parallel-agent-plan.md) | High |

## 3) Knowledge structure (map)

### Product + user-facing features

**What you’ll learn here**: what OpenCode is, how it positions itself (TUI, provider-agnostic, client/server), and where official docs live. (source: README.md#faq, README.md#documentation)

- `README.md` (source: README.md)
- Translations: `README.*.md` (source: README.md)

### Installation & distribution

**What you’ll learn here**: how to install the CLI via multiple channels, and how to obtain the desktop app. (source: README.md#installation, README.md#desktop-app-beta)

- `README.md` (+ translations) (source: README.md#installation)

### Contributing & development workflow

**What you’ll learn here**: repo contribution guardrails, how to run OpenCode in development (`bun dev`), how to run server/web/desktop flows, and PR expectations. (source: CONTRIBUTING.md#developing-opencode, CONTRIBUTING.md#pull-request-expectations)

- `CONTRIBUTING.md` (source: CONTRIBUTING.md)
- `AGENTS.md` (style guide referenced by contributing) (source: CONTRIBUTING.md#developing-opencode)
- `packages/opencode/AGENTS.md` (core package dev guidance) (source: packages/opencode/AGENTS.md)
- `packages/app/AGENTS.md` (app package dev guidance) (source: packages/app/AGENTS.md)

### Security model & operations boundaries

**What you’ll learn here**: OpenCode’s threat model, why “permissions” aren’t a sandbox, and how to report vulnerabilities. (source: SECURITY.md#threat-model, SECURITY.md#no-sandbox)

- `SECURITY.md` (source: SECURITY.md)

### Integrations (editors, chat, CI)

**What you’ll learn here**: how OpenCode connects to external systems (ACP/Zed, VS Code, Slack, GitHub Actions) and the operational setup steps for each integration. (source: packages/opencode/src/acp/README.md#usage, sdks/vscode/README.md#features, packages/slack/README.md#setup, github/README.md#installation)

- ACP: `packages/opencode/src/acp/README.md` (source: packages/opencode/src/acp/README.md)
- VS Code: `sdks/vscode/README.md` (source: sdks/vscode/README.md)
- Slack: `packages/slack/README.md` (source: packages/slack/README.md)
- GitHub Action: `github/README.md` (source: github/README.md)

### Specs & engineering plans

**What you’ll learn here**: proposed/ongoing refactors and performance work (roadmaps, decomposition plans, i18n, tests), including parallel execution strategies. (source: specs/perf-roadmap.md#objective, specs/parallel-agent-plan.md)

- Roadmap: `specs/perf-roadmap.md` (source: specs/perf-roadmap.md)
- API sketch: `specs/project.md` (source: specs/project.md)
- Parallelization: `specs/parallel-agent-plan.md`, `specs/18-parallel-workstream-map.md` (source: specs/parallel-agent-plan.md, specs/18-parallel-workstream-map.md)
- Individual specs: `specs/01-*.md` through `specs/17-*.md` (source: specs/perf-roadmap.md#objective)

### Internal automation & agent/operator playbooks

**What you’ll learn here**: repo-specific “agent command” playbooks (commit conventions, issue search, spellcheck, etc.) and preferred Bun file I/O patterns. (source: .opencode/command/commit.md, .opencode/skill/bun-file-io/SKILL.md)

- `.opencode/agent/*.md` (source: .opencode/agent/docs.md)
- `.opencode/command/*.md` (source: .opencode/command/commit.md)
- `.opencode/skill/*/SKILL.md` (source: .opencode/skill/bun-file-io/SKILL.md)

### Meta / metrics

**What you’ll learn here**: download stats reporting. (source: STATS.md)

- `STATS.md` (source: STATS.md)

## 4) Cross-cutting concepts & glossary

Glossary items are taken from repeated terms across docs; when a definition is explicit, it is cited at the defining doc. (source: README.md#agents, SECURITY.md#no-sandbox, packages/opencode/src/acp/README.md)

| Term | Meaning | Where defined / used |
|---|---|---|
| OpenCode | “The open source AI coding agent.” | Defined/used in `README.md` (source: README.md) |
| TUI | Terminal UI focus is a core differentiator. | Used in `README.md` FAQ (source: README.md#faq) |
| Agents (`build`, `plan`, `general`) | Built-in agent modes; `plan` is read-only and denies file edits by default. | Defined in `README.md` (source: README.md#agents) |
| Server mode | Optional headless server mode; can be unauthenticated unless password is set. | Defined in `SECURITY.md` (source: SECURITY.md#server-mode) |
| “No sandbox” | Permission prompts are UX only and not security isolation. | Defined in `SECURITY.md` (source: SECURITY.md#no-sandbox) |
| Bun | Runtime/tooling used for dev commands in contributing guide and package guidelines. | Used in `CONTRIBUTING.md` and `packages/opencode/AGENTS.md` (source: CONTRIBUTING.md#developing-opencode, packages/opencode/AGENTS.md#buildtest-commands) |
| LSP | Language Server Protocol support is part of the product positioning. | Used in `README.md` (source: README.md#faq) |
| ACP | Agent Client Protocol implementation for editor integration; includes Zed config snippet. | Defined in `packages/opencode/src/acp/README.md` (source: packages/opencode/src/acp/README.md) |
| MCP | Mentioned as external servers; outside trust boundary in security model. | Used in `SECURITY.md` and ACP session notes (source: SECURITY.md#out-of-scope, packages/opencode/src/acp/README.md#core-components) |
| Tauri | Desktop app framework (v2) used for native desktop wrapper. | Defined in `packages/desktop/README.md` (source: packages/desktop/README.md) |
| Playwright | E2E testing framework used for UI smoke/e2e testing. | Used in `packages/app/README.md` (source: packages/app/README.md#e2e-testing) |

## 5) User journeys (from docs)

Journeys below are constrained to what is explicitly documented; each step links to the docs that describe it. (source: README.md#installation, CONTRIBUTING.md#developing-opencode)

### Journey A: “I want to run it locally”

- **Preconditions**: You have a shell and can install the CLI via one of the listed channels. (source: README.md#installation)
- **Steps**:
  1. Install OpenCode via script or a package manager. (source: README.md#installation)
  2. Run the CLI (entry-point commands are documented for dev vs prod). (source: CONTRIBUTING.md#understanding-bun-dev-vs-opencode)
- **Common pitfalls mentioned**:
  - Remove versions older than 0.1.x before installing. (source: README.md#installation)

### Journey B: “I want to contribute”

- **Preconditions**: Bun 1.3+ (and willingness to follow guardrails). (source: CONTRIBUTING.md#developing-opencode)
- **Steps**:
  1. Read contribution guardrails and PR expectations. (source: CONTRIBUTING.md#pull-request-expectations)
  2. Install deps and run dev server from repo root (`bun install`, `bun dev`). (source: CONTRIBUTING.md#developing-opencode)
  3. Follow the repo style guide. (source: CONTRIBUTING.md#developing-opencode, AGENTS.md)
- **Common pitfalls mentioned**:
  - UI/core product features require design review before implementation. (source: CONTRIBUTING.md#contributing-to-opencode)
  - PRs without an existing linked issue may be closed. (source: CONTRIBUTING.md#issue-first-policy)

### Journey C: “I want to run server/web/desktop in development”

- **Preconditions**: You can run Bun commands; desktop requires Tauri prerequisites. (source: CONTRIBUTING.md#running-the-desktop-app, packages/desktop/README.md#prerequisites)
- **Steps**:
  - Start headless API server (defaults to port 4096). (source: CONTRIBUTING.md#running-the-api-server)
  - Start the web UI dev server (packages/app). (source: CONTRIBUTING.md#running-the-web-app)
  - Start the desktop app (`tauri dev`). (source: CONTRIBUTING.md#running-the-desktop-app, packages/desktop/README.md#development)
- **Common pitfalls mentioned**:
  - Desktop app requires additional Tauri dependencies (Rust/toolchain + platform libs). (source: CONTRIBUTING.md#running-the-desktop-app)

### Journey D: “I want to use the VS Code extension”

- **Preconditions**: opencode CLI installed. (source: sdks/vscode/README.md#prerequisites)
- **Steps**:
  1. Use quick-launch shortcuts to open or create opencode sessions. (source: sdks/vscode/README.md#features)
  2. Use file reference shortcuts to insert `@File#Lx-y` style references. (source: sdks/vscode/README.md#features)
- **Common pitfalls mentioned**:
  - For extension development, open `sdks/vscode` directly (not repo root) and debug via `F5`. (source: sdks/vscode/README.md#development)

### Journey E: “I want to run opencode from GitHub issue/PR comments”

- **Preconditions**: A GitHub repo with Actions enabled, plus the required secrets for your chosen model provider. (source: github/README.md#manual-setup)
- **Steps**:
  1. Install via `opencode github install`, or follow manual setup. (source: github/README.md#installation)
  2. Add workflow triggers (issue comment / PR review comment) and ensure the comment contains `/oc` or `/opencode`. (source: github/README.md#manual-setup)
  3. Use `/opencode explain this issue` or `/opencode fix this`. (source: github/README.md#features)
- **Common pitfalls mentioned**:
  - This is “an early release” and feedback should go to GitHub issues. (source: github/README.md#support)

## 6) Gaps, conflicts, and TODOs

### Gaps (missing docs you might expect)

- **Missing: a first-party architecture overview doc** (beyond brief package bullet points in contributing), e.g. how client/server pieces connect, where “providers” live, and how data flows. (Inference: The contributing guide lists core pieces but doesn’t provide an end-to-end architecture narrative.) (source: CONTRIBUTING.md#developing-opencode)
- **Missing: a local deployment/operations guide** for running server mode safely beyond “set password / run in Docker/VM”, including recommended network exposure and reverse proxy patterns. (source: SECURITY.md#server-mode, SECURITY.md#no-sandbox)
- **Several package READMEs appear to be uncustomized starter templates**, which is likely confusing for onboarding. For example, `packages/web/README.md` explicitly says: “Seasoned astronaut? Delete this file.” (source: packages/web/README.md)  
  And `packages/opencode/README.md` appears to be a Bun-init placeholder (“This project was created using `bun init`…”). (source: packages/opencode/README.md)

### Conflicts / inconsistencies across docs

- **Local dev ports and commands differ between docs**:
  - `CONTRIBUTING.md` describes the web app dev server under `packages/app` using `bun run --cwd packages/app dev` and mentions a `localhost:5173` dev server. (source: CONTRIBUTING.md#running-the-web-app)
  - `packages/app/AGENTS.md` recommends running the app dev server with `bun dev -- --port 4444`. (source: packages/app/AGENTS.md#local-dev)
  - `packages/app/README.md` (template) references `http://localhost:3000`. (source: packages/app/README.md#available-scripts)

### Stale hints / TODOs suggested by docs themselves

- **Template READMEs should be replaced or removed** where they do not match repo reality (e.g. SolidStart/Mintlify/Starlight boilerplate). (source: packages/console/app/README.md, packages/docs/README.md, packages/web/README.md)
- **ACP limitations are documented** (streaming/tool reporting/persistence/etc.), implying future work areas; this is useful but also signals incomplete integration coverage. (source: packages/opencode/src/acp/README.md#current-limitations)

## 7) Suggested next docs to create (minimal set)

These are the smallest additions that would make the repo more “onboardable” while staying aligned to what the current docs already mention. (source: README.md#documentation, CONTRIBUTING.md#developing-opencode)

### 7.1 `docs/architecture.md`

- **Intent**: Provide an end-to-end mental model of OpenCode’s architecture (CLI/server, TUI, web UI, desktop wrapper, SDK regeneration), using the repo’s own terms. (source: CONTRIBUTING.md#developing-opencode, CONTRIBUTING.md#understanding-bun-dev-vs-opencode, packages/opencode/AGENTS.md#architecture)
- **Outline**:
  - What runs where (CLI vs server vs UI clients) (source: README.md#faq)
  - Monorepo package map (what each `packages/*` does) (source: CONTRIBUTING.md#developing-opencode)
  - Client/server interaction and why it matters (source: README.md#faq)
  - How SDK generation fits into endpoint changes (source: CONTRIBUTING.md#running-the-desktop-app, packages/opencode/AGENTS.md#architecture)
  - Where specs fit in the workflow (source: specs/perf-roadmap.md#objective)

### 7.2 `docs/development.md`

- **Intent**: Single authoritative “dev setup” doc that reconciles `bun dev` / server / app / desktop instructions and standardizes ports. (source: CONTRIBUTING.md#developing-opencode, packages/app/AGENTS.md#local-dev)
- **Outline**:
  - Prereqs (Bun 1.3+, Tauri prereqs when needed) (source: CONTRIBUTING.md#developing-opencode, packages/desktop/README.md#prerequisites)
  - Common workflows: TUI, server, web UI, desktop (source: CONTRIBUTING.md#understanding-bun-dev-vs-opencode)
  - Debugging guide (what works, caveats, VS Code examples) (source: CONTRIBUTING.md#setting-up-a-debugger)
  - Regenerating SDK when touching server endpoints (source: CONTRIBUTING.md#running-the-desktop-app)

### 7.3 `docs/security-operations.md`

- **Intent**: Convert `SECURITY.md`’s boundaries into practical “how to operate safely” guidance, without claiming sandboxing. (source: SECURITY.md#no-sandbox)
- **Outline**:
  - Threat model recap (source: SECURITY.md#threat-model)
  - Recommended isolation approaches (Docker/VM) (source: SECURITY.md#no-sandbox)
  - Server mode hardening checklist (password, exposure, warnings) (source: SECURITY.md#server-mode)
  - Guidance on MCP server trust boundary (source: SECURITY.md#out-of-scope)

### 7.4 `docs/integrations.md`

- **Intent**: One page that links to and summarizes integration docs: ACP, VS Code, Slack, GitHub Action. (source: packages/opencode/src/acp/README.md, sdks/vscode/README.md, packages/slack/README.md, github/README.md)
- **Outline**:
  - ACP: supported features and current limitations (source: packages/opencode/src/acp/README.md#current-limitations)
  - VS Code extension usage and keybindings (source: sdks/vscode/README.md#features)
  - Slack bot setup (env vars + scopes) (source: packages/slack/README.md#setup)
  - GitHub Action setup (install vs manual workflow) (source: github/README.md#installation, github/README.md#manual-setup)

