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

The bot embeds an OpenCode server and uses the SDK to communicate with AI providers.

```
Discord User
    ↓ (message)
Discord Bot (discord.js)
    ↓ (handleMessage)
OpenCode SDK Client
    ↓ (session.prompt)
OpenCode Server (localhost)
    ↓ (process)
AI Provider (moonshotai, google, etc.)
```

### Session Management

Each user/channel combination gets its own session:

- **Session ID** - Unique identifier for the conversation
- **SDK Client** - OpenCode SDK instance
- **Server Handle** - Local OpenCode server process
- **Model Config** - Selected provider and model

Sessions are stored in memory and persist for the bot's lifetime.

### Message Flow

1. User sends message (mention bot or DM)
2. Bot extracts text and attachments
3. Get or create session for user/channel
4. Send prompt to OpenCode via SDK
5. Extract response from parts array
6. Reply to Discord

### Model Selection Priority

1. **Discord command** (`/model switch`) - highest priority
2. **Project config** (`.opencode/opencode.jsonc`)
3. **Global config** (`~/.config/opencode/opencode.json`)
4. **Server default** - first available provider

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
