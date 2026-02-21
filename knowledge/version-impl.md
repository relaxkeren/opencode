# Version mechanism

Dynamic versioning system for opencode builds based on channel and environment

---

## Main entry point

Version computation lives in `@opencode-ai/script` package.

**File:** `packages/script/src/index.ts`

Lines 19-47 contain the core version logic.

---

## Environment variables

These override the default behavior:

| Variable           | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `OPENCODE_CHANNEL` | Force a specific channel (e.g., `latest`, `dev`)   |
| `OPENCODE_BUMP`    | Trigger a version bump (`major`, `minor`, `patch`) |
| `OPENCODE_VERSION` | Override version entirely                          |
| `OPENCODE_RELEASE` | Mark as release build                              |

---

## Channel detection

Lines 25-30 determine the channel:

```ts
const CHANNEL = await (async () => {
  if (env.OPENCODE_CHANNEL) return env.OPENCODE_CHANNEL
  if (env.OPENCODE_BUMP) return "latest"
  if (env.OPENCODE_VERSION && !env.OPENCODE_VERSION.startsWith("0.0.0-")) return "latest"
  return await $`git branch --show-current`.text().then((x) => x.trim())
})()
```

If not on `latest` channel, the build is considered a preview.

---

## Version computation

Lines 33-47 compute the final version string:

### Release builds (channel = `latest`)

Fetches current npm version and bumps according to `OPENCODE_BUMP`:

```ts
const version = await fetch("https://registry.npmjs.org/opencode-ai/latest")
  .then((res) => res.json())
  .then((data: any) => data.version)
const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
// ... bump logic
```

### Preview builds (any other channel)

Format: `0.0.0-{CHANNEL}-{COMMIT_HASH}`

**Implementation** (lines 35-38):

```ts
if (IS_PREVIEW) {
  const commit = await $`git rev-parse HEAD`.text().then((x) => x.trim().slice(0, 7))
  return `0.0.0-${CHANNEL}-${commit}`
}
```

Example output: `0.0.0-dev-abc1234`

---

## Usage

The `Script` object exports the computed values:

```ts
export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release() {
    return !!env.OPENCODE_RELEASE
  },
}
```

Consumed by:

- `packages/opencode/script/build.ts` (lines 179, 184, 198, 206, 217)
- `packages/opencode/script/publish.ts`
- `packages/desktop/scripts/prepare.ts`
- `script/version.ts` and `script/publish.ts`

---

## Local builds

When building locally without release flags, the version defaults to a preview format with timestamp. This is what `tools/build-and-install.ps1` and other local build scripts use.
