# Discord Bot Service Refactor Plan

## Overview
Clean, rebuild the Discord bot service infrastructure from scratch with proper versioning, unified build process, and clear separation of concerns.

---

## Phase 1: Cleanup

### 1.1 Delete Existing Scripts
Remove all files in `packages/discord/script/` **EXCEPT**:
- `build.ts` - Keep for building executables

**Scripts to delete:**
- [ ] `start.ps1`
- [ ] `stop.ps1`
- [ ] `install-service.ps1`
- [ ] `uninstall-service.ps1`
- [ ] `set-log-location.ps1`
- [ ] `fix-service-path.ps1`
- [ ] `check-service-config.ps1`
- [ ] `check-service-env.ps1`
- [ ] `debug-sessions.ps1`
- [ ] `debug-sessions.ts`

---

## Phase 2: Build System

### 2.1 Create `tools/build-and-install-discord-bot.ps1`

**Location:** `C:\project_management\tools\build-and-install-discord-bot.ps1`

**Behavior:**
1. Navigate to `packages/discord`
2. Run `bun run script/build.ts --single` (or detect platform)
3. Output: `packages/discord/dist/opencode-discord-<platform>-<arch>/bin/opencode-discord[.exe]`
4. Copy executable to `~/.local/bin/opencode-discord[.exe]`
5. Make executable (chmod +x on Unix)
6. Verify installation: `opencode-discord --version`

**Platform detection:**
- Windows: `opencode-discord-windows-x64.exe`
- macOS ARM: `opencode-discord-darwin-arm64`
- macOS Intel: `opencode-discord-darwin-x64`
- Linux ARM: `opencode-discord-linux-arm64`
- Linux x64: `opencode-discord-linux-x64`

### 2.2 Update `packages/discord/script/build.ts`

**Changes needed:**
1. Add version injection using git commit hash
2. Build should embed version into binary
3. Support `--version` flag in compiled executable

**Version format:**
```typescript
const { stdout: commitHash } = await $`git rev-parse --short HEAD`
const version = `${pkg.version}-${commitHash.trim()}`
```

---

## Phase 3: Version & Logging

### 3.1 Version in Binary

**Implementation:**
- Build process injects version as a constant
- Binary supports `--version` flag
- Version format: `<semver>-<git-short-hash>` (e.g., `1.0.0-abc1234`)

**Entry point modification (src/index.ts):**
```typescript
// At the very top, before imports
if (process.argv.includes('--version')) {
  console.log(BOT_VERSION) // Injected at build time
  process.exit(0)
}
```

### 3.2 Binary Logging (No NSSM Logging)

The binary handles ALL logging internally:
- Log file: `~/.local/share/opencode/log/discord-out.log`
- Error log: `~/.local/share/opencode/log/discord-err.log`
- Rotation: Handled by binary (10MB default)
- NSSM: NO log redirection (`AppStdout` and `AppStderr` empty)

**On startup, log:**
```
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] === Discord Bot Starting ===
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] Version: opencode-discord 1.0.0-abc1234
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] Mode: production (or debug if --dev)
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] User: C:\Users\Ke
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] Config: C:\Users\Ke\.config\opencode
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] Database: C:\Users\Ke\.local\share\opencode\opencode.db
[YYYY-MM-DDTHH:mm:ss.sssZ] [INFO] Log: C:\Users\Ke\.local\share\opencode\log\discord-out.log
```

---

## Phase 4: Service Scripts

### 4.1 Create `packages/discord/script/install-service.ps1`

**Prerequisites:**
- `opencode-discord` binary in `~/.local/bin` (or PATH)

**Actions:**
1. Check if running as Administrator
2. Check for NSSM (install if missing via Chocolatey or download)
3. Check if `opencode-discord` binary exists in PATH
4. Create log directory: `~/.local/share/opencode/log/`
5. Install Windows Service via NSSM:
   - Application: `opencode-discord` (from PATH)
   - Arguments: (none)
   - Working directory: `%USERPROFILE%`
   - Environment: Set USERPROFILE, HOMEDRIVE, HOMEPATH to actual user (not LocalSystem)
   - **NSSM Logging: DISABLED** (binary handles its own logging)

**Environment variables to set:**
```
USERPROFILE=C:\Users\Ke
HOMEDRIVE=C:
HOMEPATH=\Users\Ke
```

**NSSM Configuration (NO log redirection):**
```powershell
# Application settings
AppDirectory = "C:\Users\Ke"  # Working directory
AppEnvironmentExtra = "USERPROFILE=C:\Users\Ke;HOMEDRIVE=C:;HOMEPATH=\Users\Ke"

# Logging: DISABLED (binary handles logging internally)
AppStdout = ""  # Empty - no redirection
AppStderr = ""  # Empty - no redirection
```

### 4.2 Create `packages/discord/script/uninstall-service.ps1`

**Actions:**
1. Check if running as Administrator
2. Stop service if running
3. Remove service via NSSM
4. Optional: Keep or delete log files (param switch)

---

## Phase 5: Documentation Updates

### 5.1 Update `packages/discord/README.md`

**New sections:**

#### Installation
```powershell
# 1. Build and install the binary
cd C:\project_management
tools\build-and-install-discord-bot.ps1

# 2. Install as Windows Service (optional)
cd packages/discord
powershell -ExecutionPolicy Bypass -File script\install-service.ps1
```

#### Management Commands (when running as service)
- `/stop` - Stop the bot gracefully
- `/restart` - Restart the bot (requires service)
- `/log [lines]` - Show recent logs
- `/session list` - List all sessions

#### Development
```powershell
# Run in development mode (not as service)
bun run dev

# Build executable
bun run script/build.ts --single

# Install globally
tools\build-and-install-discord-bot.ps1
```

### 5.2 Update `packages/discord/persistence.md`

Remove outdated sections about:
- Old PID-based scripts
- Legacy service configuration

Add:
- Binary-based architecture
- Service environment variables
- Session persistence via opencode database

---

## Phase 6: Testing Checklist

### 6.1 Build & Install Test
- [ ] `build-and-install-discord-bot.ps1` completes successfully
- [ ] Binary exists in `~/.local/bin/opencode-discord.exe`
- [ ] `opencode-discord --version` shows version with git hash

### 6.2 Manual Run Test
- [ ] `opencode-discord` starts successfully
- [ ] Log file shows version on startup
- [ ] `/session list` returns sessions from database
- [ ] `/log` shows recent log output
- [ ] `/stop` stops the bot gracefully

### 6.3 Service Test
- [ ] `install-service.ps1` completes successfully
- [ ] Service appears in Windows Services (services.msc)
- [ ] Service starts automatically
- [ ] Log file shows correct user paths (not LocalSystem)
- [ ] `/session list` returns sessions
- [ ] `/restart` restarts the service
- [ ] `uninstall-service.ps1` removes service cleanly

### 6.4 Version & Logging Test
- [ ] `opencode-discord --version` shows: `opencode-discord 1.0.0-abc1234`
- [ ] Bootstrap log shows version on startup
- [ ] Bootstrap log shows correct paths (User, Config, Database, Log)
- [ ] Binary creates log file at `~/.local/share/opencode/log/discord-out.log`
- [ ] `--dev` flag increases log verbosity (shows debug messages)
- [ ] NSSM has NO log redirection (AppStdout/AppStderr empty)
- [ ] Each session list query logs debug info

---

## File Structure After Refactor

```
packages/discord/
├── script/
│   ├── build.ts                 # Keep - builds executables
│   ├── install-service.ps1      # NEW - Install Windows Service
│   └── uninstall-service.ps1    # NEW - Remove Windows Service
├── src/
│   ├── commands/
│   │   ├── log.ts              # Keep - fixed path logic
│   │   ├── restart.ts          # Keep - updated for service
│   │   ├── session.ts          # Keep - with debug logging
│   │   └── stop.ts             # Keep
│   ├── utils/
│   │   ├── logger.ts           # Keep (if exists) or remove
│   │   └── session.ts          # Keep - with env vars fix
│   └── index.ts                # Update - add version logging
├── dist/                       # Build output (gitignored)
│   └── opencode-discord-<platform>-<arch>/
│       └── bin/
│           └── opencode-discord[.exe]
├── README.md                   # Update
└── persistence.md              # Update

tools/
├── build-and-install.ps1       # Existing
└── build-and-install-discord-bot.ps1  # NEW
```

---

## Decisions Made ✓

1. **Q1: Manual Development Scripts?**
   - ✅ **Option B** - Remove PID scripts. Use `bun run dev` (development) or `opencode-discord` binary (production)

2. **Q2: `--dev` Flag Purpose?**
   - ✅ **Clarified**: `--dev` flag controls **log level**, NOT file watching
   - `opencode-discord` → Production mode (log level: info/warn/error)
   - `opencode-discord --dev` → Debug mode (log level: debug/info/warn/error, more verbose)
   - Development workflow: `bun run dev` (has hot reload via Bun's native watching)
   - Production workflow: `opencode-discord` binary

3. **Q3: Build & Service Integration?**
   - ✅ **Option B** - Keep separate
   - `build-and-install-discord-bot.ps1` → builds & installs binary only
   - `install-service.ps1` → installs Windows Service (Windows only)
   - macOS/Linux users use binary directly or systemd

4. **Q4: Log Handling?**
   - ✅ **Binary handles ALL logging**
   - NSSM is ONLY for running as Windows Service (no log redirection)
   - Binary writes directly to: `~/.local/share/opencode/log/discord-out.log`
   - Binary handles rotation internally

5. **Q5: Version Format?**
   - ✅ **Option A**: `opencode-discord 1.0.0-abc1234`

---

## Next Steps

1. Review this plan
2. Answer the questions above
3. Finalize documentation updates
4. Begin implementation in order: Phase 1 → 2 → 3 → 4 → 5 → 6

