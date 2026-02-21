# Discord Session Persistence

Enable users to access and continue previous opencode sessions from Discord across bot restarts.

---

## Problem

The Discord bot's `/session list` command only shows sessions created during the current bot runtime (stored in-memory). Sessions created in previous bot restarts are not visible, even though they exist in the opencode SQLite database.

---

## Solution

**Query opencode database directly for all sessions.**

Instead of persisting Discord channel-to-session mappings, we query the opencode database directly. Users can then attach to any session by ID.

### User Flow

1. **User runs `/session list`** → Bot queries opencode database and shows ALL sessions
2. **User runs `/session attach <session_id>`** → Bot spawns new opencode server attached to that session
3. **User continues conversation** → Messages go to the attached session

---

## Implementation

### Session Database Location

- **Windows:** `C:\Users\<username>\.local\share\opencode\opencode.db`
- **macOS:** `~/.local/share/opencode/opencode.db`
- **Linux:** `~/.local/share/opencode/opencode.db`

The database path is determined by the `USERPROFILE`/`HOME` environment variable.

### Environment Variable Handling (Critical for Windows Service)

When running as a Windows Service (LocalSystem), the service must have the correct environment variables to find the user's opencode database:

```powershell
USERPROFILE=C:\Users\Ke
HOMEDRIVE=C:
HOMEPATH=\Users\Ke
```

These are set via NSSM's `AppEnvironmentExtra` parameter during service installation.

### Enhanced `/session list` Command

The command spawns a temporary opencode server to query the database:

```typescript
// Create temporary opencode server
const tempServer = await createOpencodeServer({ port: 0, timeout: 10000 })

// Query all sessions
const result = await tempServer.client.session.list({
  roots: true,
  limit: 50,
})

// Show sessions to user
// Close temp server after query
```

### `/session attach <id>` Command

Attaches to an existing session by ID:

```typescript
const session = await getOrCreateSession(message, sessionId)
```

---

## Session Lifecycle

- **Discord bot restart:** All in-memory sessions are lost (expected)
- **Opencode sessions:** Persist in SQLite database at `~/.local/share/opencode/opencode.db`
- **User reconnection:** Use `/session attach` to reconnect to any previous session

---

## Bot Management Commands

### `/stop` Command

Stops the Discord bot gracefully from Discord chat.

**Implementation:**
- Sends confirmation message before stopping
- Closes log files
- Exits with code `0` after 1 second delay

### `/restart` Command

Restarts the Discord bot when running as a Windows Service.

**Usage:**
```
/restart
```

**How it works:**
1. Sends "Restarting..." confirmation to Discord
2. Exits the bot process
3. Windows Service Manager automatically restarts the service

**Requirements:**
- Bot must be running as a Windows Service

**Note:** If running manually (not as a service), this command will just stop the bot.

### `/log` Command

Shows recent log output from the bot.

**Usage:**
```
/log [lines]
```

---

## Windows Service

### Installation

The bot can run as a Windows Service for automatic startup.

**Install:**
```powershell
# As Administrator
powershell -ExecutionPolicy Bypass -File script\install-service.ps1
```

**What it does:**
1. Installs `opencode-discord` binary as a Windows Service via NSSM
2. Sets environment variables (USERPROFILE, HOMEDRIVE, HOMEPATH)
3. Configures auto-restart on failure
4. Does NOT configure NSSM log redirection (binary handles logging)

**Service Features:**
- **Auto-start:** Service starts automatically on Windows boot
- **Auto-restart:** Service restarts automatically if bot crashes
- **No console window:** Runs silently in background
- **Internal logging:** Binary writes logs directly to `~/.local/share/opencode/log/`

### File Locations

- **Service binary:** `opencode-discord` (from PATH, installed to `~/.local/bin`)
- **Log files:** `~/.local/share/opencode/log/discord-out.log`
- **Service config:** Windows Registry (via NSSM)
- **Database:** `~/.local/share/opencode/opencode.db`

### Environment Variables

Critical for Windows Service to access user's opencode database:

```powershell
USERPROFILE=C:\Users\Ke          # User home directory
HOMEDRIVE=C:                     # Drive letter
HOMEPATH=\Users\Ke               # Path from drive root
```

These ensure opencode uses the correct database location instead of LocalSystem's profile.

---

## Future Enhancements

- Add search/filter to `/session list` (by title, date range)
- Add pagination for users with many sessions
- Add `/session archive` to hide old sessions from list
