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

### 3. Configure

The Discord bot reads configuration from `~/.config/opencode/discord-bot.json`.

**Option A: Use the setup script (recommended)**
```powershell
cd packages/discord
powershell -ExecutionPolicy Bypass -File script\setup-config.ps1
```

**Option B: Manual configuration**
```powershell
# Create config directory
mkdir -Force "$env:USERPROFILE\.config\opencode"

# Copy example config
cp config.example.json "$env:USERPROFILE\.config\opencode\discord-bot.json"

# Edit the config file and add your bot token
notepad "$env:USERPROFILE\.config\opencode\discord-bot.json"
```

**Get your Discord Bot Token:**
1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to "Bot" section
4. Click "Reset Token" and copy it
5. Paste into the config file

---

## Installation

### Development Mode

For development with hot reload:

```bash
bun run dev
```

### Production Mode (Binary)

Build and install the executable:

```powershell
# From opencode repository root
tools\build-and-install-discord-bot.ps1

# Verify installation
opencode-discord --version
# Output: opencode-discord 1.0.0-abc1234
```

**Usage:**
```powershell
# Run in production mode (info/warn/error logs)
opencode-discord

# Run in debug mode (verbose logging)
opencode-discord --dev

# Show version
opencode-discord --version
```

### Windows Service (Production)

Install the bot as a Windows Service for automatic startup:

```powershell
# As Administrator
cd packages/discord
powershell -ExecutionPolicy Bypass -File script\install-service.ps1
```

**Features:**
- Auto-starts on Windows boot
- Automatic restart on failure
- Binary handles all logging internally
- No console window (runs in background)

**Manage Service:**
```powershell
# Check status
Get-Service OpenCodeDiscordBot

# Start/Stop/Restart
Start-Service OpenCodeDiscordBot
Stop-Service OpenCodeDiscordBot
Restart-Service OpenCodeDiscordBot

# View logs
Get-Content "$env:USERPROFILE\.local\share\opencode\log\discord-out.log" -Tail 50

# Remove service
powershell -ExecutionPolicy Bypass -File script\uninstall-service.ps1
```

---

## Commands

### General

- `/ask <question>` - Quick question without creating a thread
- `/help` - Show help and available commands
- `/status` - Check opencode server status

### Session Management

- `/session create [title]` - Create a new session
- `/session list` - List all your sessions from the database
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

### Bot Management (Windows Service)

- `/stop` - Stop the Discord bot (graceful shutdown)
- `/restart` - Restart the Discord bot (reloads code)
- `/log [lines]` - Show the Discord bot log (default: 50 lines)

---

## Logging

The bot handles all logging internally (no NSSM log redirection):

- **Output log:** `~/.local/share/opencode/log/discord-out.log`
- **Error log:** `~/.local\share\opencode\log\discord-err.log`
- **Rotation:** Automatic at 10MB
- **Log levels:**
  - Production: info, warn, error
  - Debug mode (`--dev`): debug, info, warn, error

**View logs:**
```powershell
# Recent output
Get-Content "$env:USERPROFILE\.local\share\opencode\log\discord-out.log" -Tail 50

# Recent errors
Get-Content "$env:USERPROFILE\.local\share\opencode\log\discord-err.log" -Tail 50

# Watch in real-time
Get-Content "$env:USERPROFILE\.local\share\opencode\log\discord-out.log" -Wait

# Search for errors
Get-Content "$env:USERPROFILE\.local\share\opencode\log\discord-err.log" | Select-String "ERROR" -Context 2
```

---

## Architecture

### Overview

The Discord bot runs as a standalone process that spawns OpenCode server instances for each user session.

```
Discord Bot Process (opencode-discord)
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

### Session Persistence

Sessions are stored in the OpenCode database:
- **Location:** `~/.local/share/opencode/opencode.db`
- **Access:** Via `/session list` and `/session attach <id>`
- **Persistence:** Survives bot restarts

The bot spawns temporary OpenCode servers to query the database when listing or attaching to sessions.

---

## Development

```bash
# Run in development mode (hot reload)
bun run dev

# Type check
bun run typecheck

# Run tests
bun test
```

### Building

```bash
# Build for current platform
bun run script/build.ts --single

# Build for all platforms
bun run script/build.ts
```

The compiled binary will be in:
```
dist/opencode-discord-<platform>-<arch>/bin/opencode-discord[.exe]
```

### Version

The binary includes the git commit hash:
```
opencode-discord 1.0.0-abc1234
```

---

## Troubleshooting

### "opencode-discord not found"

Make sure the binary is in your PATH:
```powershell
# Check if installed
Get-Command opencode-discord

# If not found, reinstall
tools\build-and-install-discord-bot.ps1
```

### "/session list shows no sessions"

1. Check that opencode is installed: `Get-Command opencode`
2. Check the logs for errors: `Get-Content "$env:USERPROFILE\.local\share\opencode\log\discord-out.log" -Tail 20`
3. If running as Windows Service, ensure the service has the correct PATH to find `opencode`

### Service won't start

1. Check Windows Event Log:
   ```powershell
   Get-WinEvent -FilterHashtable @{LogName='System'} -MaxEvents 20 | Where-Object { $_.Message -like "*OpenCodeDiscordBot*" }
   ```

2. Test running manually:
   ```powershell
   opencode-discord
   ```

3. Check NSSM configuration:
   ```powershell
   nssm dump OpenCodeDiscordBot
   ```

---

## License

MIT
