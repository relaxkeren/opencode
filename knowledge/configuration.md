# OpenCode configuration and data paths

Where OpenCode stores configuration, API keys, state, and cache on disk. Paths follow [XDG Base Directory](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) when available (via `xdg-basedir`).

## Paths overview

| Purpose | Path | Typical location (macOS/Linux) |
|--------|------|--------------------------------|
| **Data** (auth, storage, etc.) | `Global.Path.data` | `~/.local/share/opencode` |
| **Config** (user config files) | `Global.Path.config` | `~/.config/opencode` |
| **State** (UI state, history) | `Global.Path.state` | `~/.local/state/opencode` |
| **Cache** (models list, etc.) | `Global.Path.cache` | `~/.cache/opencode` |
| **Logs** | `Global.Path.log` | `~/.local/share/opencode/log` |
| **Binaries** (LSPs, tools) | `Global.Path.bin` | `~/.local/share/opencode/bin` |

Base directories come from: `xdgData`, `xdgConfig`, `xdgState`, `xdgCache` (see `packages/opencode/src/global/index.ts`). `Global.Path.home` can be overridden with `OPENCODE_TEST_HOME` (tests only).

---

## Model API keys and auth

### Primary: `auth.json` (stored keys)

- **File:** `{Global.Path.data}/auth.json` → e.g. **`~/.local/share/opencode/auth.json`**
- **Purpose:** Persisted API keys and OAuth tokens per provider. Written when you add a provider via the API key method (e.g. `opencode auth` flow).
- **Permissions:** File is created with mode `0o600` (user read/write only).
- **Format:** JSON object keyed by provider ID; values are auth objects (e.g. `{ type: "api", key: "..." }` or OAuth/wellknown). Loaded by `Auth.all()` and merged into provider config in `packages/opencode/src/provider/provider.ts`.

This is the main place where **model API keys are stored** for OpenCode on your machine.

### Config: provider `options.apiKey`

- **Location:** Any loaded config file under `Global.Path.config`: `config.json`, `opencode.json`, `opencode.jsonc`. Also project-level `.opencode/` and optional override dirs (see below).
- **Schema:** Under `provider.<providerID>.options.apiKey` (string, optional). If set, this value is used for that provider and can override env/auth for that provider.
- **Example:** `"provider": { "anthropic": { "options": { "apiKey": "sk-..." } } }`

### Environment variables

- Providers can also take keys from environment variables (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`). These are not stored by OpenCode; they come from the shell or process environment.
- Precedence (conceptually): config options → stored auth (`auth.json`) → env.

---

## Config loading order

Config is merged from multiple sources (see `packages/opencode/src/config/config.ts`). Later sources override earlier ones:

1. Managed config dir (system-wide)
2. `OPENCODE_CONFIG` (single file path)
3. Project config (e.g. `.opencode/`) unless disabled
4. `OPENCODE_CONFIG_DIR` (directory of config files)
5. `Global.Path.config`: `config.json`, `opencode.json`, `opencode.jsonc`, and legacy `config/` subdir
6. `OPENCODE_CONFIG_CONTENT` (inline JSON)

Provider options (including `apiKey`) can be set in any of these.

### Managed config directory

- **macOS:** `/Library/Application Support/opencode`
- **Windows:** `%ProgramData%\opencode`
- **Linux:** `/etc/xdg/opencode`
- **Override (tests):** `OPENCODE_TEST_MANAGED_CONFIG_DIR`
- Managed dir can contain `opencode.jsonc` / `opencode.json`; these are merged into the final config. Useful for org-wide defaults (including optional provider apiKey).

### Other env overrides

- **`OPENCODE_CONFIG`** – path to a single config file.
- **`OPENCODE_CONFIG_DIR`** – directory to load config from (e.g. for profile-specific config).
- **`OPENCODE_CONFIG_CONTENT`** – inline JSON config.
- **`OPENCODE_DISABLE_PROJECT_CONFIG`** – when set, project-level config (e.g. `.opencode/`) is skipped.

---

## State and cache (no API keys)

- **`{Global.Path.state}/model.json`** – UI state: recent/favorite models, variants. No secrets.
- **`{Global.Path.state}/prompt-history.jsonl`**, **`frecency.jsonl`**, **`prompt-stash.jsonl`**, **`kv.json`** – TUI state/history.
- **`{Global.Path.data}/storage/`** – general storage.
- **`{Global.Path.data}/snapshot/`**, **`plans/`**, **`worktree/`**, **`tool-output/`** – session/plan/tool data.
- **`{Global.Path.data}/mcp-auth.json`** – MCP auth (separate from model provider auth).
- **`{Global.Path.cache}/models.json`** – cached model list. No API keys.
- **`{Global.Path.cache}/version`** – cache version; when it changes, cache is cleared.

---

## Summary: where are model API keys?

| Location | Content |
|----------|--------|
| **`~/.local/share/opencode/auth.json`** | Stored model (and other) API keys and OAuth – **main key storage**. |
| **`~/.config/opencode/`** (config.json, opencode.json, opencode.jsonc) | Optional `provider.<id>.options.apiKey`. |
| **Environment variables** | e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`; not stored by OpenCode. |
| **Managed config** | `/Library/Application Support/opencode` (macOS) etc.; only if provider apiKey is set there. |

State and cache paths under `~/.local/state/opencode` and `~/.cache/opencode` do not contain API keys.
