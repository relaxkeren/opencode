# Local Development Guide

This guide covers how to set up, run, and work on OpenCode from the source repository.

## Prerequisites

- **Bun 1.3+** (required - this project uses Bun as the runtime, not Node.js)
- Git

## Initial Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/anomalyco/opencode.git
   cd opencode
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

## Running OpenCode Locally

The root `package.json` provides several development scripts:

### Basic TUI Development

```bash
# Run OpenCode TUI (defaults to packages/opencode directory)
bun dev

# Run against the current directory (repo root)
bun dev .

# Run against a specific directory
bun dev /path/to/project
```

### Running the API Server

```bash
# Start headless API server on default port 4096
bun dev serve

# Start on a custom port
bun dev serve --port 8080
```

The server provides a headless API that can be accessed at `http://localhost:<port>`.

### Running the Web App

For UI development, you need both the backend server and the web app dev server:

1. Start the backend (from repo root or packages/opencode):

   ```bash
   bun dev serve --port 4096
   ```

2. In another terminal, start the web app:

   ```bash
   bun run --cwd packages/app dev
   ```

   Or use the root shortcut:

   ```bash
   bun run dev:web
   ```

The web app will be available at `http://localhost:5173` (or similar port shown in output).

### Running the Desktop App

The desktop app is a Tauri application that wraps the web UI:

```bash
# Run with native window
bun run --cwd packages/desktop tauri dev

# Or use the root shortcut
bun run dev:desktop
```

This starts the web dev server on `http://localhost:1420` and opens the native window.

To build a production distribution:

```bash
bun run --cwd packages/desktop tauri build
```

> **Note:** Building the desktop app requires additional Tauri dependencies (Rust toolchain, platform-specific libraries). See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for setup instructions.

## Building a Standalone Executable

To compile a standalone "localcode" executable:

```bash
bun run packages/opencode/script/build.ts --single
```

The built binary will be at:

```
bun run packages/opencode/dist/opencode-<platform>/bin/opencode
```

Replace `<platform>` with your platform (e.g., `darwin-arm64`, `linux-x64`, `win32-x64`).

---

## Installing the Local Build

After building, you have several options to use the binary system-wide.

### Option 1: Direct execution

Run the binary directly from the dist folder:

```bash
./packages/opencode/dist/opencode-<platform>/bin/opencode --help
```

### Option 2: Set OPENCODE_BIN_PATH

Point the npm wrapper to your locally built binary:

```bash
export OPENCODE_BIN_PATH=$(pwd)/packages/opencode/dist/opencode-<platform>/bin/opencode
opencode --help
```

Add this to your shell profile (`.bashrc`, `.zshrc`) for persistence.

### Option 3: Create a symlink

Link the binary into a directory in your PATH:

```bash
# Create ~/.local/bin if it doesn't exist
mkdir -p ~/.local/bin

# Create the symlink
ln -s $(pwd)/packages/opencode/dist/opencode-<platform>/bin/opencode ~/.local/bin/opencode

# Verify
opencode --version
```

### Option 4: Copy to PATH

Copy the binary directly to a location in your PATH:

```bash
cp ./packages/opencode/dist/opencode-<platform>/bin/opencode ~/.local/bin/opencode
```

> **Note:** On Windows, copy `opencode.exe` to a directory in your PATH or add the dist bin folder to PATH.

## Testing

> **Important:** Tests cannot be run from the repository root. The root `package.json` intentionally prevents this with an error message. You must run tests from individual packages.

### Unit Tests

Run tests from specific packages using the `--cwd` flag:

```bash
# Run tests in the core opencode package
bun run --cwd packages/opencode test

# Run tests in the app package (includes happydom preload for DOM testing)
bun run --cwd packages/app test
# Or directly
bun run --cwd packages/app test:unit

# Run a specific test file within a package
bun run --cwd packages/opencode test test/tool/tool.test.ts
```

### Type Checking

```bash
# Typecheck all packages
bun run typecheck

# Or using turbo
bun turbo typecheck
```

### End-to-End Tests

For the web app:

```bash
bun run --cwd packages/app test:e2e
```

## Package Structure

The repository is organized as a monorepo with the following key packages:

| Package                              | Description                        |
| ------------------------------------ | ---------------------------------- |
| `packages/opencode`                  | Core business logic & server       |
| `packages/opencode/src/cli/cmd/tui/` | TUI code (SolidJS + OpenTUI)       |
| `packages/app`                       | Shared web UI components (SolidJS) |
| `packages/desktop`                   | Native desktop app (Tauri)         |
| `packages/plugin`                    | Source for `@opencode-ai/plugin`   |
| `packages/sdk/js`                    | JavaScript SDK                     |
| `packages/script`                    | Build and utility scripts          |
| `packages/ui`                        | UI component library               |
| `packages/util`                      | Shared utilities                   |

## Debugging

### Using the Inspector

The most reliable way to debug OpenCode is to run it manually with the inspect flag:

```bash
# Run with inspector
bun run --inspect=ws://localhost:6499/ --cwd packages/opencode --conditions=browser ./src/index.ts
```

Then attach your debugger via the WebSocket URL.

### VSCode Setup

Example configurations are provided in:

- `.vscode/settings.example.json`
- `.vscode/launch.example.json`

Copy these to `.vscode/settings.json` and `.vscode/launch.json` respectively.

### Debugging the Server

Since `bun dev` runs the server in a worker thread, breakpoints may not work. Use `bun dev spawn` instead, or debug the server separately:

```bash
# Debug server
bun run --inspect=ws://localhost:6499/ --cwd packages/opencode ./src/index.ts serve --port 4096

# Then attach TUI
opencode attach http://localhost:4096
```

### Environment Variable for Debugging

Set a default inspect URL:

```bash
export BUN_OPTIONS=--inspect=ws://localhost:6499/
```

## Configuration

OpenCode can be configured through several environment variables:

| Variable                          | Description                              |
| --------------------------------- | ---------------------------------------- |
| `OPENCODE_CONFIG`                 | Path to a single config file             |
| `OPENCODE_CONFIG_DIR`             | Directory to load config from            |
| `OPENCODE_CONFIG_CONTENT`         | Inline JSON config                       |
| `OPENCODE_DISABLE_PROJECT_CONFIG` | Skip project-level config (`.opencode/`) |

See `knowledge/configuration.md` for detailed information on config paths and API key storage.

## Code Style

Please follow the style guide in `AGENTS.md`. Key principles:

- Use Bun APIs (e.g., `Bun.file()`)
- Prefer `const` over `let`
- Avoid `try`/`catch` where possible
- Use early returns instead of `else`
- Prefer single-word variable names
- Use functional array methods over for loops
- Avoid the `any` type
- Use snake_case for database field names

## Regenerating the SDK

If you modify server endpoints in `packages/opencode/src/server/server.ts`, regenerate the SDK:

```bash
./packages/sdk/js/script/build.ts
```

## Default Branch

The default branch in this repository is `dev`, not `main`. Use `dev` or `origin/dev` for comparisons.

## Useful Commands Summary

```bash
# Development
bun dev                           # Run TUI (packages/opencode)
bun dev .                         # Run TUI (repo root)
bun dev serve                     # Start API server
bun run dev:web                   # Start web app dev server
bun run dev:desktop               # Start desktop app

# Building
./packages/opencode/script/build.ts --single  # Build standalone executable

# Testing (run from package directories, not root)
bun run --cwd packages/opencode test   # Run core tests
bun run --cwd packages/app test        # Run app tests
bun run typecheck                      # Type check all packages

# Git (default branch is dev)
git checkout dev
git pull origin dev
```

## Additional Resources

- [Contributing Guide](../CONTRIBUTING.md) - Detailed contribution guidelines
- [AGENTS.md](../AGENTS.md) - Code style and agent guidelines
- [Configuration](../knowledge/configuration.md) - Config paths and API keys
- [Architecture](../knowledge/overview.md) - System architecture overview
