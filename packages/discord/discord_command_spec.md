# Discord Command Specification

Explains how Discord text commands work and how they are now handled to execute directly without LLM.

---

## Architecture

The Discord bot uses two handlers working together:

### 1. Interaction Handler (`handleInteraction`)

Processes Discord slash commands (registered with Discord).

```
User types / and selects command
    ↓
Discord Client
    ↓
handleInteraction()
    ↓
handleSessionCommand() / handleAgentCommand() / etc.
    ↓
Execute directly (no LLM)
```

### 2. Message Handler (`handleMessage`)

Processes plain text messages (DMs and mentions). Now includes **text command parsing**.

```
User types /session list as text
    ↓
Discord Client
    ↓
handleMessage()
    ↓
handleTextCommand()  ← NEW: parses /command patterns
    ↓
Matched? → Execute command directly
    ↓
No match → Send to LLM as before
```

---

## How Text Commands Work

When you type `/session list` as plain text in a DM:

1. The bot receives the message via `handleMessage`
2. It calls `handleTextCommand(message)` to check if it's a known command
3. `parseTextCommand()` extracts: `{ command: "session", subcommand: "list", args: [] }`
4. If matched, the appropriate handler executes directly (e.g., `handleSessionTextCommand`)
5. Results are returned immediately without LLM involvement

**Supported text commands:**

- `/session create [title]`
- `/session list`
- `/session attach <id>`
- `/session share`
- `/session unshare`
- `/session rename <name>`
- `/session compact`
- `/session undo`
- `/session redo`
- `/session export`
- `/session copy`
- `/session fork <message_id>`
- `/agent list`
- `/agent switch <name>`
- `/model list`
- `/model switch <provider> <model>`
- `/mcp list`
- `/mcp toggle <name>`
- `/status`
- `/help`
- `/ask <question>`
- `/connect`

---

## Slash Commands vs Text Commands

| Feature        | Slash Commands      | Text Commands     |
| -------------- | ------------------- | ----------------- |
| Invocation     | Discord UI (`/`)    | Typing `/command` |
| Handler        | `handleInteraction` | `handleMessage`   |
| Goes to LLM    | No                  | No (now)          |
| Autocomplete   | Yes                 | No                |
| Error handling | Direct              | Direct            |

**Note:** Both slash commands and text commands now execute directly without LLM involvement. The text command feature was added to allow users to type commands naturally while getting the same fast response.

---

## Supported Slash Commands

The following are true Discord slash commands that execute directly:

### Session

- `/session create [title]` - Create new session
- `/session list` - List active sessions
- `/session attach <id>` - Attach to session
- `/session share` - Get shareable link
- `/session unshare` - Revoke share link
- `/session rename <name>` - Rename session
- `/session compact` - Summarize session
- `/session undo` - Undo last message
- `/session redo` - Redo message
- `/session export` - Export as Markdown
- `/session copy` - Copy transcript
- `/session fork <message_id>` - Fork from message

### Agent

- `/agent list` - List available agents
- `/agent switch <name>` - Switch agent

### Model

- `/model list` - List connected provider models
- `/model list --all` - List all available models
- `/model switch <provider> <model>` - Switch model

### MCP

- `/mcp list` - List MCP integrations
- `/mcp toggle <name>` - Enable/disable MCP

### Other

- `/ask <question>` - Quick question
- `/status` - Check server status
- `/connect` - Connect AI provider
- `/help` - Show help

---

## Recommendation

You can now use commands in two ways:

1. **Slash commands** - Type `/` in Discord and select from the autocomplete menu
2. **Text commands** - Type commands like `/session list` as plain text

Both methods execute commands directly without LLM involvement. Use whichever feels more natural to you!
