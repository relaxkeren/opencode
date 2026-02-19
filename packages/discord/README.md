# OpenCode Discord Bot

Official Discord bot for [opencode](https://github.com/opencode-ai/opencode) - interact with AI agents directly in Discord.

## Features

- **Direct Messages**: Private 1-on-1 conversations with opencode
- **Channel Support**: Team collaboration in Discord channels
- **Slash Commands**: Quick access to all opencode features
- **Thread-Based Sessions**: Each conversation has its own context
- **File Attachments**: Share code files and documents for analysis
- **Rich Formatting**: Code blocks, embeds, and interactive buttons

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
- `/model list` - List available models
- `/model switch <provider> <model>` - Switch model

### MCP Tools

- `/mcp list` - List MCP integrations
- `/mcp toggle <name>` - Enable/disable MCP

### Providers

- `/connect` - Connect AI provider (OAuth or instructions)

## Architecture

The bot uses:

- **discord.js** for Discord API integration
- **@opencode-ai/sdk** to communicate with opencode
- Auto-started opencode server for each bot instance
- SQLite for persistent session storage

## Development

```bash
# Run in development mode
bun run dev

# Type check
bun run typecheck
```

## License

MIT
