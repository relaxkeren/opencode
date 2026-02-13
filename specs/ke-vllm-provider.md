## vLLM provider

Let OpenCode connect to and use a local (or remote) running vLLM server via its OpenAI-compatible API.

---

### Summary

vLLM exposes an OpenAI-compatible HTTP API when run with the default server (e.g. `python -m vllm.entrypoints.openai.api_server`). This spec adds a first-class **vLLM** provider so users can connect OpenCode to a running vLLM instance by specifying its base URL (e.g. `http://localhost:8000/v1`). No general gateway (e.g. LiteLLM) is introduced; the app will use the existing `@ai-sdk/openai-compatible` path with a vLLM-specific provider id, config, and optional model discovery.

---

### Goals

- Users can connect a "vLLM" provider from Connect provider (TUI and web) by supplying the vLLM server base URL (and optional API key if the server is protected).
- Once connected, vLLM-backed models appear in Switch model and can be used for chat/completion like any other provider.
- Use the existing OpenAI-compatible client path; no new HTTP client or gateway layer.
- Support the common case: local vLLM server at `http://localhost:8000/v1` with no auth, plus configurable URL and optional auth for remote or secured setups.

---

### Non-goals

- Running or managing the vLLM process from OpenCode (user runs vLLM separately).
- vLLM-specific features beyond the OpenAI-compatible API (e.g. vLLM-only parameters); keep to standard chat/completion semantics.
- Automatic discovery of vLLM on the network; user explicitly configures base URL.

---

### Current state

- OpenCode already supports generic OpenAI-compatible endpoints via `@ai-sdk/openai-compatible` and config/custom provider: users can add a custom provider with a base URL and model list (web: `DialogCustomProvider`; config shape in `packages/opencode/src/config/config.ts`).
- There is no dedicated "vLLM" provider id or UX; users must know to add a custom provider and set base URL and models manually.
- Provider state and auth flow are described in `knowledge/model-architecture.md`.

---

### Proposed approach

#### 1) Add vLLM to the model registry

- In the provider/model registry used by `ModelsDev` (or equivalent source that feeds `config.providers` / `provider.list`), add a provider entry for **vllm** (id: `vllm`):
  - `npm`: `@ai-sdk/openai-compatible`
  - `api`: default base URL `http://localhost:8000/v1` (or leave URL to config so it is required in config).
  - `name`: "vLLM" (or similar for UI).
  - `env`: optional env var for API key if needed (e.g. `VLLM_API_KEY`).
  - Models: either a static list of common vLLM model ids (e.g. the model name passed to the vLLM server, such as `meta-llama/Llama-2-7b-chat-hf`) or a placeholder entry that will be filled by discovery (see below).

#### 2) vLLM-specific loader / config handling

- In `packages/opencode/src/provider/provider.ts`, add a **CUSTOM_LOADER** (or equivalent) for provider id `vllm` that:
  - Reads base URL from config: `config.provider?.vllm?.options?.baseURL` (and optionally from env if defined).
  - Default base URL when not in config: `http://localhost:8000/v1`.
  - Passes through optional API key from Auth or config (so protected vLLM servers are supported).
  - Ensures the provider is merged into `providers` when either env or config (or auth) supplies the base URL (and key if required), so "Connect provider" and "Switch model" work without requiring a generic "custom provider" flow for vLLM.

#### 3) "Connect provider" UX for vLLM

- **Web**: Ensure vLLM appears in the provider list (from `provider_next.all` / model registry). When user selects vLLM, show a small form: base URL (default `http://localhost:8000/v1`), optional API key. Persist via existing config update and optional `auth.set` (same pattern as custom provider or opencode).
- **TUI**: Same: list vLLM in the provider list; on select, prompt for base URL (and optional API key) and persist via config + auth so that after dispose + bootstrap, vLLM appears as connected and its models show in Switch model.

#### 4) Model list for vLLM

- **Option A (minimal):** Static model list in the registry (e.g. a single generic entry like `default` or a few common model ids). User can rely on vLLM’s behavior (same model id as loaded on the server) or add models via config overrides.
- **Option B (discovery):** When vLLM is connected, call `GET {baseURL}/models` (OpenAI-compatible models endpoint) and merge returned model ids into the provider’s model list so Switch model shows the actual models the server is serving. Discovery can be done at bootstrap time when building provider state (with caching and failure handling so offline vLLM doesn’t break the app).

Recommendation: start with **Option A** (static or config-driven list); add **Option B** in a follow-up if needed.

#### 5) Auth and "connected" semantics

- vLLM is "connected" when the server has config (and optionally auth) for provider id `vllm` (same as existing provider state logic). No API key is required for local unsecured vLLM; if base URL is present in config, treat as connected. Optional API key stored via `auth.set` for `vllm` when user supplies it.

---

### Phased implementation steps

1. **Model registry and provider entry**
   - Add `vllm` provider to the source that feeds `ModelsDev` / provider list (e.g. models snapshot or registry file) with `npm: @ai-sdk/openai-compatible`, default `api` URL, name, and a minimal static model list (e.g. one entry).

2. **Provider loader**
   - In `packages/opencode/src/provider/provider.ts`, add a CUSTOM_LOADER (or equivalent) for `vllm` that:
     - Reads `config.provider?.vllm?.options?.baseURL` (default `http://localhost:8000/v1`).
     - Merges provider into state when config (or env) has base URL; optionally merge API key from Auth.

3. **Web: Connect provider flow for vLLM**
   - Ensure vLLM appears in provider list; add or reuse a small form for base URL + optional API key and save via `globalSync.updateConfig` and optional `auth.set`, then `global.dispose` (or equivalent) so provider list refreshes.

4. **TUI: Connect provider flow for vLLM**
   - Ensure vLLM appears in provider list; on select, prompt for base URL (and optional API key), persist via config + auth, then `instance.dispose` + `sync.bootstrap` so Switch model shows vLLM models.

5. **Validation**
   - Manual: start a local vLLM server (e.g. on port 8000), connect vLLM provider in OpenCode (TUI and web), select a vLLM model in Switch model, and send a prompt; confirm completion/streaming works.

---

### Acceptance criteria

- User can select "vLLM" from Connect provider in both TUI and web.
- User can set base URL (default `http://localhost:8000/v1`) and optional API key.
- After connecting, vLLM appears as a connected provider and at least one vLLM model appears in Switch model.
- Sending a prompt with a vLLM model uses the configured base URL and returns completions from the vLLM server.
- No new gateway or proxy (LiteLLM, etc.); implementation uses `@ai-sdk/openai-compatible` and existing provider/auth/config flow.

---

### Validation plan

- Start a local vLLM server with OpenAI-compatible API (default port 8000).
- In OpenCode (web and TUI): Connect provider → vLLM → set base URL (or accept default) → connect.
- Open Switch model and select a vLLM model; submit a prompt and verify streaming/completion.
- Run existing provider/config tests if any; ensure no regressions in provider list or config schema.

---

### Risk and mitigations

- **Risk:** vLLM server not running or wrong URL breaks provider list or bootstrap.
  - **Mitigation:** Treat vLLM like other providers: if config is present, mark connected; do not block bootstrap on a failed health check. Optional: ping base URL at connect time and show a warning if unreachable.
- **Risk:** Model list mismatch (registry vs. what vLLM actually serves).
  - **Mitigation:** Start with static list; document that the model id must match what vLLM was started with. Option B (discovery) can be added later to improve UX.

---

### Open questions

- Exact location of the vLLM provider entry (models snapshot vs. separate registry file vs. config-only).
- Whether to add a health check or "Test connection" step when user enters base URL.
- Whether to support model discovery (GET /v1/models) in the first iteration or as a follow-up.
