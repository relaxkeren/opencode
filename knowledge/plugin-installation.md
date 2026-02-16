# Plugin installation

Guide to installing and configuring plugins from various sources.

---

## Install from npm

Add package names to your config file. OpenCode installs them automatically using Bun.

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-helicone-session", "opencode-wakatime@1.2.0"]
}
```

Both regular and scoped packages work. Include version tags with `@` or omit for latest.

Packages install to `~/.cache/opencode/node_modules/` and load on next startup.

---

## Install from local files

Create plugin files directly in the plugins directory. No build step required.

**Project-level plugins:** `.opencode/plugins/`  
**Global plugins:** `~/.config/opencode/plugins/`

OpenCode loads all `.ts` and `.js` files from these folders automatically.

---

## Configure load order

Plugins load from multiple sources in this sequence:

1. Global config (`~/.config/opencode/opencode.json`)
2. Project config (`opencode.json`)
3. Global plugin directory
4. Project plugin directory

Later sources override earlier ones. Duplicate npm packages with identical names and versions load once only.

---

## Add dependencies

Local plugins can use npm packages. Add a `package.json` in your config directory.

```json title=".opencode/package.json"
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

OpenCode runs `bun install` at startup. Import packages normally in your plugin files.

---

## Verify installation

Check loaded plugins in the UI or review startup logs. Each plugin initializes in sequence and logs its status.

Use the `/plugin list` command to see available commands and hooks from installed plugins.
