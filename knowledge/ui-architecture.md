# TUI architecture: SolidJS + OpenTUI

This document explains how the **terminal UI (TUI)** in the OpenCode CLI is built: why the code looks like markup (`.tsx` with JSX), how it renders in the terminal, and where the main pieces live.

---

## 1. Overview

- The CLI’s interactive UI is a **terminal UI (TUI)**. It runs in the terminal (stdout/stdin) and is **not** a web app.
- The UI is implemented with **SolidJS** (reactive components, JSX) and **OpenTUI** (terminal rendering). You write Solid components with TSX; OpenTUI draws them in the terminal using a terminal renderer (e.g. ANSI, dimensions, raw keyboard input).
- **Packages**: `@opentui/core` (v0.1.77) and `@opentui/solid` (v0.1.77) in [`packages/opencode/package.json`](packages/opencode/package.json). Additional terminal UX: `opentui-spinner` (v0.0.6).
- **Entry**: The TUI is started by calling `tui()` from [`packages/opencode/src/cli/cmd/tui/app.tsx`](packages/opencode/src/cli/cmd/tui/app.tsx). That function is used from [`thread.ts`](packages/opencode/src/cli/cmd/tui/thread.ts) (normal run) and [`attach.ts`](packages/opencode/src/cli/cmd/tui/attach.ts) (attach to existing session).

---

## 2. Why it looks like “markup” (TSX)

- The TUI code lives in **`.tsx`** files because they use **SolidJS** and **JSX**: components, conditional rendering (`Show`, `Switch`, `Match`), effects (`createEffect`, `onMount`), and signals (`createSignal`, `createStore`).
- Solid is a **reactive UI framework** (similar in spirit to React, but with fine-grained reactivity). Components return a tree of “elements”; the difference is that **OpenTUI’s renderer** turns that tree into terminal output instead of DOM.
- So: **same component model and syntax as a typical JS framework; different rendering target** (terminal instead of browser).

---

## 3. Rendering pipeline

### 3.1 Bootstrap

1. **`tui(input)`** in [`app.tsx`](packages/opencode/src/cli/cmd/tui/app.tsx) is called with URL, args, directory, optional fetch/headers/events, and `onExit`.
2. It optionally detects terminal background (dark/light) for theming, then calls **`render()`** from `@opentui/solid`.
3. **`render(componentFn, options)`** is OpenTUI’s entry point: it runs the Solid component function and connects it to the terminal (dimensions, keyboard, redraw loop).

Example (simplified):

```ts
render(
  () => (
    <ErrorBoundary fallback={...}>
      <ArgsProvider {...input.args}>
        …
        <App />
      </ArgsProvider>
    </ErrorBoundary>
  ),
  {
    targetFps: 60,
    exitOnCtrlC: false,
    useKittyKeyboard: {},
    consoleOptions: { keyBindings: [...], onCopySelection: ... },
  }
)
```

The **second argument** configures the OpenTUI renderer (e.g. frame rate, Ctrl+C behavior, Kitty protocol, copy-selection callback). The **first argument** is a Solid root; the real app wraps `App` in many providers (Args, Exit, KV, Toast, Route, SDK, Sync, Theme, Local, Keybind, PromptStash, Dialog, Command, Frecency, PromptHistory, PromptRef).

### 3.2 Component tree and routes

- **`App`** in the same file uses `useRoute()`, `useTerminalDimensions()`, `useRenderer()`, and various context hooks. It renders either **Home** or **Session** based on `route.data.type`:
  - **Home**: [`routes/home.tsx`](packages/opencode/src/cli/cmd/tui/routes/home.tsx) — prompt input and tips.
  - **Session**: [`routes/session/index.tsx`](packages/opencode/src/cli/cmd/tui/routes/session/index.tsx) — session view with header, sidebar, prompt, and message list.
- **Routing** is in-memory only (no URL). Route shape is defined in [`context/route.tsx`](packages/opencode/src/cli/cmd/tui/context/route.tsx): `HomeRoute | SessionRoute` (`type: "home"` or `type: "session"` with `sessionID`). Initial route can be overridden via `OPENCODE_ROUTE` env.

### 3.3 What actually draws to the terminal

- **`@opentui/solid`** provides the Solid integration: it runs the reactive graph and, when the tree changes, tells **`@opentui/core`** what to draw.
- **`@opentui/core`** provides the **primitives** that describe terminal UI. The TUI code uses types and helpers from it; the OpenTUI renderer turns those into terminal I/O (cursor movement, colors, text, etc.). No DOM or browser APIs are involved.

---

## 4. Key OpenTUI APIs used in the codebase

### 4.1 From `@opentui/solid`

- **`render(fn, options)`** — Renders the Solid root to the terminal; keeps the process alive until exit.
- **`useKeyboard()`** — Access to keyboard input (key events, focus).
- **`useRenderer()`** — Access to the terminal renderer (e.g. `setTerminalTitle`, `disableStdoutInterception`, `console.onCopySelection`, `clearSelection`).
- **`useTerminalDimensions()`** — Current terminal size (width/height); reactive.
- **`Portal`** — Render a subtree elsewhere (e.g. overlays); used in [`routes/session/permission.tsx`](packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx).
- **`JSX`** — Type for OpenTUI Solid elements.

### 4.2 From `@opentui/core`

- **Renderables / layout**: `Renderable`, `BoxRenderable`, `TextareaRenderable`, `ScrollBoxRenderable`, `InputRenderable` — building blocks for layout and input areas.
- **Text and styling**: `TextAttributes`, `RGBA`, `SyntaxStyle`, `TerminalColors` — colors and text styling for terminal output.
- **Helpers**: `t`, `dim`, `fg` (e.g. in [`component/prompt/index.tsx`](packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx)).
- **Events**: `MouseEvent`, `PasteEvent`, `KeyEvent`; types like `KeyBinding`, `ParsedKey` for key handling.
- **Renderer**: `CliRenderer` — used in [`util/editor.ts`](packages/opencode/src/cli/cmd/tui/util/editor.ts) for editor integration.
- **Other**: `ColorInput` (e.g. spinner in [`ui/spinner.ts`](packages/opencode/src/cli/cmd/tui/ui/spinner.ts)).

### 4.3 Spinner

- **`opentui-spinner`** (v0.0.6) is used for loading indicators; imported as `opentui-spinner/solid` in [`component/spinner.tsx`](packages/opencode/src/cli/cmd/tui/component/spinner.tsx) and [`component/prompt/index.tsx`](packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx).

---

## 5. Directory layout (TUI)

All paths below are under **`packages/opencode/src/cli/cmd/tui/`**.

| Path | Role |
|------|------|
| **`app.tsx`** | Entry: `tui()`, `render()`, root providers, `App` (route switch), error boundary. |
| **`attach.ts`** | Attach flow: starts TUI with existing session (calls `tui()`). |
| **`thread.ts`** | Normal run: starts server/thread and then calls `tui()`. |
| **`context/`** | Solid context providers and hooks: route, args, exit, KV, theme, local, keybind, sync, SDK, dialog (state), prompt ref, toast, etc. |
| **`routes/`** | Top-level screens: `home.tsx`, `session/index.tsx` (and session subcomponents: header, sidebar, footer, question, permission, dialogs for message/timeline/fork/subagent). |
| **`component/`** | Reusable TUI pieces: border, logo, spinner, prompt (with autocomplete, history, frecency, stash), dialogs (model, MCP, status, theme list, provider, command, agent, session list, tag, stash, session rename, etc.), tips, todo-item. |
| **`ui/`** | Shared UI building blocks: dialog (base), dialog-alert, dialog-confirm, dialog-prompt, dialog-select, dialog-export-options, dialog-help, link, toast, spinner helpers. |
| **`util/`** | Clipboard, editor (OpenTUI `CliRenderer`), terminal (e.g. color), transcript, signal helpers. |
| **`context/theme/`** | Theme JSON files (e.g. aura, dracula, tokyonight) and theme context. |
| **`event.ts`** | TUI event types. |

---

## 6. Communication with the server

- The TUI talks to the OpenCode server via **`@opencode-ai/sdk`** (workspace package). SDK is provided by **`SDKProvider`** in `app.tsx`; components use **`useSDK()`**.
- **`SyncProvider`** / **`useSync()`** bootstrap and cache server data (e.g. config, providers, sessions). So “Connect provider” and “Switch model” in the TUI use the same server APIs as the web app; see [model-architecture.md](model-architecture.md) for how provider/model state flows.

---

## 7. Summary

| Layer | Role |
|-------|------|
| **SolidJS** | Component model, reactivity (signals, stores, effects), JSX. |
| **OpenTUI (`@opentui/solid`)** | Renders the Solid tree to the terminal; provides `render()`, `useKeyboard`, `useRenderer`, `useTerminalDimensions`, `Portal`. |
| **OpenTUI (`@opentui/core`)** | Primitives: renderables, text attributes, colors, events, key bindings, `CliRenderer`. |
| **`.tsx`** | TypeScript + JSX for Solid components; they target the terminal via OpenTUI, not the DOM. |

The UI is “real” component-based UI code (Solid + TSX), but the **output** is the terminal. OpenTUI is the bridge that turns Solid components into terminal I/O.
