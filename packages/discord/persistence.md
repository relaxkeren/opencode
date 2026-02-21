# Discord Session Persistence

Enable users to access and continue previous opencode sessions from Discord across bot restarts.

---

## Problem

The Discord bot's `/session list` command only shows sessions created during the current bot runtime (stored in-memory). Sessions created in previous bot restarts are not visible, even though they exist in the opencode SQLite database.

---

## Solution

**Simplified Approach: No Channel Mapping Persistence**

Instead of persisting Discord channel-to-session mappings, we query the opencode database directly for all sessions. Users can then attach to any session by ID.

### User Flow

1. **User runs `/session list`** → Bot queries opencode database and shows ALL sessions
2. **User runs `/session attach <session_id>`** → Bot spawns new opencode server attached to that session
3. **User continues conversation** → Messages go to the attached session

---

## Implementation

### 1. Enhanced `/session list` Command

Query all sessions from the opencode database instead of just in-memory sessions:

```typescript
// Spawn temporary opencode server to query session list
const tempServer = await createOpencodeServer({ port: 0 })
const result = await tempServer.client.session.list({ limit: 50 })
// Show session ID, title, last updated time
// Close temp server after query
```

### 2. Verified `/session attach <id>` Command

Already implemented — attaches to existing session by ID:

```typescript
const session = await getOrCreateSession(message, sessionId)
```

### 3. Session Lifecycle

- **Discord bot restart**: All in-memory sessions are lost (expected)
- **Opencode sessions**: Persist in SQLite database at `~/.config/opencode/opencode.db`
- **User reconnection**: Use `/session attach` to reconnect to any previous session

---

## Changes Required

### `src/commands/session.ts`

Modify `case "list":` handler:

```typescript
case "list": {
  // Create temporary opencode server to query all sessions
  const tempServer = await createOpencodeServer({ port: 0 })
  
  try {
    const result = await tempServer.client.session.list({ 
      limit: 50,
      roots: true  // Only root sessions (not forks)
    })
    
    if (result.error || !result.data || result.data.length === 0) {
      await interaction.editReply({
        embeds: [createInfoEmbed("No Sessions", "No sessions found. Create one with `/session create`")],
      })
      return
    }
    
    const sessionList = result.data
      .map((s) => `• \`${s.id}\` - ${s.title} (Updated: <t:${Math.floor(s.time.updated / 1000)}:R>)`)
      .join("\n")
    
    await interaction.editReply({
      embeds: [createInfoEmbed("All Sessions", sessionList + "\n\nUse `/session attach <id>` to continue a session.")],
    })
  } finally {
    tempServer.server.close()
  }
  break
}
```

### `src/utils/session.ts`

Ensure `createOpencodeServer()` supports ephemeral servers for querying:

```typescript
// Already supports port: 0 for ephemeral ports
async function createOpencodeServer(options?: { 
  port?: number
  timeout?: number 
}) { ... }
```

---

## Benefits

1. **Simple**: No persistence files, no cleanup jobs, no recovery logic
2. **Reliable**: Single source of truth (opencode SQLite database)
3. **Flexible**: Users can attach any session to any channel/DM
4. **Privacy**: No session metadata stored in Discord bot

---

## Bot Management Commands

### `/stop` Command

Stops the Discord bot gracefully from Discord chat.

**Implementation:**
- Sends confirmation message before stopping
- Exits with code `0` after 1 second delay

**Files:**
- `src/commands/stop.ts` — Discord slash command handler

### `/restart` Command

Restarts the Discord bot when running as a Windows Service. This reloads the bot code without manual intervention.

**Usage:**
```
/restart
```

**How it works:**
1. Sends "Restarting..." confirmation to Discord
2. Spawns a detached PowerShell process
3. PowerShell waits 2 seconds, then runs `Restart-Service OpenCodeDiscordBot`
4. Bot process exits
5. Windows Service Manager restarts the service

**Requirements:**
- Bot must be running as a Windows Service
- Service name must be `OpenCodeDiscordBot` (default)

**Note:** If running manually (not as a service), this command will just stop the bot.

**Files:**
- `src/commands/restart.ts` — Discord slash command handler

---

## Windows Service Installation

For production deployments, install the Discord bot as a Windows Service to run automatically on startup.

### Prerequisites

- Windows 10/11 or Windows Server
- PowerShell running as Administrator
- Bun installed and in PATH
- OpenCode installed and in PATH

### Install Service

```powershell
cd packages/discord
.\script\install-service.ps1
```

**Options:**
```powershell
# Custom service name
.\script\install-service.ps1 -ServiceName "MyDiscordBot" -DisplayName "My Discord Bot"

# Manual start (not auto-start)
.\script\install-service.ps1 -AutoStart:$false

# Reinstall (force overwrite existing)
.\script\install-service.ps1 -Force
```

### Service Features

- **Auto-restart**: Service restarts automatically if bot crashes
- **Log rotation**: Logs rotate at 10MB (keeps history)
- **Graceful shutdown**: Handles Windows shutdown/restart signals
- **No console window**: Runs silently in background

### Manage Service

```powershell
# Check status
Get-Service OpenCodeDiscordBot

# Start/Stop/Restart
Start-Service OpenCodeDiscordBot
Stop-Service OpenCodeDiscordBot
Restart-Service OpenCodeDiscordBot

# View logs
Get-Content .\logs\service-out.log -Tail 50
Get-Content .\logs\service-err.log -Tail 50

# Windows GUI
services.msc
```

### Uninstall Service

```powershell
.\script\uninstall-service.ps1

# Keep log files
.\script\uninstall-service.ps1 -KeepLogs
```

### File Locations

- **Service binary**: Uses `bun run src/index.ts` from package directory
- **Log files**: `packages/discord/logs/service-{out,err}.log`
- **Service config**: Stored in Windows Registry (via NSSM)

---

## Future Enhancements

- Add search/filter to `/session list` (by title, date range)
- Add pagination for users with many sessions
- Add `/session archive` to hide old sessions from list
