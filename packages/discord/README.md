# OpenCode Discord Bot

Official Discord bot for [opencode](https://github.com/opencode-ai/opencode) - interact with AI agents directly in Discord.

---

## Quick Start

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Enable "Message Content Intent" under Privileged Gateway Intents
5. Copy the bot token (you'll need this)

### 2. Invite Bot to Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions
   - Use Slash Commands
4. Copy and open the generated URL

### 3. Configure & Run

```bash
# Clone the repository
git clone https://github.com/opencode-ai/opencode.git
cd opencode/packages/discord

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and add your bot token

# Run the bot
bun run dev
```

### Running with PID Tracking (PowerShell Scripts)

For long-running deployments, use the provided PowerShell scripts that track the process ID:

**Start the bot:**
```powershell
# From packages/discord directory
powershell -ExecutionPolicy Bypass -File script/start.ps1
```

This will:
- Check if the bot is already running (via PID file)
- Start the bot with `bun run src/index.ts`
- Save the PID to `script/opencode-discord.pid`
- Report the process ID

**Stop the bot:**
```powershell
# From packages/discord directory
powershell -ExecutionPolicy Bypass -File script/stop.ps1
```

This will:
- Read the PID from the PID file
- Kill the process
- Clean up the PID file

**Requirements for scripts:**
- `bun` must be in your PATH
- `opencode` must be in your PATH (the bot spawns OpenCode servers)

---

## Commands

### General

- `/ask <question>` - Quick question without creating a thread
- `/help` - Show help and available commands
- `/status` - Check opencode server status

### Session Management

- `/session create [title]` - Create a new session
- `/session list` - List your active sessions
- `/session attach <id>` - Attach to an existing session
- `/session share` - Get shareable link to current session
- `/session unshare` - Revoke share link
- `/session rename <name>` - Rename current session
- `/session compact` - Summarize session to reduce context
- `/session undo` - Undo last message and revert changes
- `/session redo` - Redo previously undone message
- `/session export` - Export session as Markdown file
- `/session copy` - Copy session transcript
- `/session fork <message_id>` - Start new session from message

### Agent & Model

- `/agent list` - List available agents
- `/agent switch <name>` - Switch active agent
- `/model list` - List connected provider models
- `/model list --all` - List all available models
- `/model current` - Show current active model
- `/model switch <provider> <model>` - Switch model

### MCP Tools

- `/mcp list` - List MCP integrations
- `/mcp toggle <name>` - Enable/disable MCP

### Providers

- `/connect` - Connect AI provider (OAuth or instructions)

---

## Architecture

### Overview

The Discord bot runs as a standalone process that spawns OpenCode server instances for each user session.

```
Discord Bot Process (bun run src/index.ts)
    │
    ├── Spawns ──► OpenCode Server #1 (localhost:xxxxx) ◄── User A's session
    │                  ├── API (for bot)
    │                  └── Web UI (localhost only)
    │
    ├── Spawns ──► OpenCode Server #2 (localhost:yyyyy) ◄── User B's session
    │                  ├── API (for bot)
    │                  └── Web UI (localhost only)
    │
    └── Connects to AI Providers (moonshotai, anthropic, etc.)
```

### Process Model

**When the Discord bot starts:**
1. Discord bot process starts (`bun run src/index.ts` or compiled binary)
2. Waits for Discord messages

**When a user sends a message:**
1. Bot spawns `opencode serve --hostname=127.0.0.1 --port=0`
2. OpenCode server picks a random available port
3. Bot connects via SDK to `http://127.0.0.1:<port>`
4. Session is created and stored in memory

**When the Discord bot stops:**
- All spawned OpenCode server processes are killed
- PID file is cleaned up (if using scripts)

### Viewing Active Processes

```powershell
# See Discord bot and OpenCode server processes
Get-Process | Where-Object { $_.Name -like "*opencode*" -or $_.Name -like "*bun*" }

# See network ports used by OpenCode servers
Get-NetTCPConnection -OwningProcess (Get-Process opencode).Id | Select-Object LocalAddress, LocalPort
```

### Session Management

Each user/channel combination gets its own session:

- **Session ID** - Unique identifier for the conversation
- **SDK Client** - OpenCode SDK instance connected to the server
- **Server Handle** - Local OpenCode server process
- **Model Config** - Selected provider and model

Sessions are stored in memory and persist for the bot's lifetime (or until timeout).

### Message Flow

1. User sends message (mention bot or DM)
2. Bot extracts text and attachments
3. Get or create session for user/channel
4. Send prompt to OpenCode via SDK
5. OpenCode processes with AI provider
6. Extract response from parts array
7. Reply to Discord

### Model Selection Priority

1. **Discord command** (`/model switch`) - highest priority
2. **Project config** (`.opencode/opencode.jsonc`)
3. **Global config** (`~/.config/opencode/opencode.json`)
4. **Server default** - first available provider

---

## Web Interface

### Status

Each spawned OpenCode server includes a **web interface**, but with limitations:

- ✅ **Running:** Web UI is active on each server
- ✅ **API:** Discord bot uses the API endpoints
- ❌ **Localhost Only:** Bound to `127.0.0.1` (not accessible from other devices)

### Accessing the Web UI

Since servers are bound to `127.0.0.1`, the web interface is only accessible from the **same machine** running the bot:

```
http://127.0.0.1:<port>/session/<session-id>
```

**Note:** Each user session has its own server on a different random port.

### Making Web UI Network-Accessible (Advanced)

**⚠️ Security Warning:** Exposing the web UI to your network allows anyone on the network to access sessions without authentication.

To bind to all interfaces (`0.0.0.0`), edit `src/utils/session.ts`:

```typescript
// Change this line:
`serve`, `--hostname=127.0.0.1`, `--port=${port}`

// To:
`serve`, `--hostname=0.0.0.0`, `--port=${port}`
```

Then rebuild and restart the bot.

### Checking Active Web Interfaces

```powershell
# List all OpenCode servers and their ports
$opencodeProcesses = Get-Process opencode -ErrorAction SilentlyContinue
foreach ($proc in $opencodeProcesses) {
    $connections = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | 
        Where-Object { $_.State -eq "Listen" }
    foreach ($conn in $connections) {
        Write-Host "PID $($proc.Id): http://$($conn.LocalAddress):$($conn.LocalPort)"
    }
}
```

---

## Configuration

### Global Config

Location: `~/.config/opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "moonshotai/kimi-k2.5"
}
```

### Auth Keys

Location: `~/.local/share/opencode/auth.json`

```json
{
  "moonshotai": {
    "type": "api",
    "key": "sk-..."
  }
}
```

### Project Config

Location: `.opencode/opencode.jsonc` (in project root)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "moonshotai/kimi-k2.5"
}
```

---

## Development

```bash
# Run in development mode
bun run dev

# Type check
bun run typecheck

# Run tests
bun test
```

### Building Standalone Binary

Compile the bot to a standalone executable:

```bash
# Build for current platform only
bun run script/build.ts --single

# Build for all platforms (linux, macos, windows)
bun run script/build.ts
```

The compiled binary will be in:
```
dist/opencode-discord-<platform>-<arch>/bin/opencode-discord[.exe]
```

**Note:** The compiled binary expects `opencode` to be available in your PATH. If not found, it will exit with an error.

### Testing Manually

```bash
# Start server manually
cd packages/opencode
bun run --conditions=browser src/index.ts serve --port 4096

# Test API
curl -X POST http://localhost:4096/session \
  -H "Content-Type: application/json" \
  -d '{"title": "test"}'
```

### Pairing Approval

When using DM policy `pairing` (default), users must be approved before they can interact with the bot in DMs. The bot will show a pairing code that the owner must approve.

```bash
# From the discord package directory
cd packages/discord

# Approve a pairing code (code is case-insensitive)
bun run src/cli/pairing.ts pairing approve <CODE>

# Example:
bun run src/cli/pairing.ts pairing approve ABC123
```

Or if you've linked the package globally:

```bash
opencode-discord pairing approve <CODE>
```

Other pairing commands:

```bash
# List paired users and pending codes
bun run src/cli/pairing.ts pairing list

# Remove a paired user
bun run src/cli/pairing.ts pairing remove <USER_ID>
```

---

## Troubleshooting

### Bot Already Running (PID File Exists)

**Error:** "Bot is already running with PID xxx"

**Cause:** The PID file from a previous run still exists.

**Fix:**
```powershell
# Check if process actually exists
Get-Process -Id <PID>  # If this fails, it's a stale PID file

# Remove stale PID file
Remove-Item script/opencode-discord.pid

# Or use the stop script
powershell -ExecutionPolicy Bypass -File script/stop.ps1
```

### Orphaned OpenCode Processes

**Issue:** OpenCode server processes left running after bot crashes.

**Symptom:** Multiple `opencode` processes in Task Manager.

**Fix:**
```powershell
# Kill all OpenCode server processes (keeps Discord bot)
Get-Process opencode | Stop-Process -Force

# Or kill everything including bot
Get-Process | Where-Object { $_.Name -like "*opencode*" -or $_.ProcessName -eq "bun" } | Stop-Process -Force
Remove-Item script/opencode-discord.pid -ErrorAction SilentlyContinue
```

### "'opencode' not found in PATH"

**Error:** Bot fails to start because it can't find the `opencode` binary.

**Cause:** The Discord bot spawns OpenCode servers as child processes.

**Fix:**
```powershell
# Add opencode to your PATH (adjust path as needed)
$env:PATH += ";C:\path\to\opencode\bin"

# Or create a symlink in a directory already in PATH
New-Item -ItemType SymbolicLink -Path "$env:LOCALAPPDATA\Microsoft\WindowsApps\opencode.exe" -Target "C:\path\to\opencode\bin\opencode.exe"
```

### Web UI Not Accessible

**Issue:** Can't access the web interface from another device.

**Cause:** Servers are bound to `127.0.0.1` (localhost only) for security.

**Status:** This is by design. The web UI is only meant for local debugging.

**Workaround:** See "Making Web UI Network-Accessible" in the Architecture section.

### "ProviderModelNotFoundError" for anthropic/claude

**Cause:** No model configured and no default set.

**Fix:** Set default model in `.opencode/opencode.jsonc`:

```json
{ "model": "moonshotai/kimi-k2.5" }
```

### No response received

**Cause:** Response format changed.

**Check:** The bot extracts text from `parts` array. Verify the provider returns text parts.

---

## File Structure

```
src/
├── handlers/
│   ├── message.ts      # Message handling with model passthrough
│   └── interaction.ts  # Slash commands
├── commands/
│   ├── ask.ts          # /ask command
│   ├── model.ts        # /model switch command
│   └── ...
├── utils/
│   └── session.ts      # Session management, server spawning
├── types/
│   └── index.ts        # Type definitions
└── index.ts            # Entry point
```

---

## License

MIT
