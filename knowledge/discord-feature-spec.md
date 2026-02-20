# Discord Bot Integration PRD

## Overview

Create an official Discord bot integration for opencode that allows users to interact with opencode AI agents directly through Discord channels and DMs. This provides an alternative interface to the current OpenTUI, enabling team collaboration and remote access through Discord's familiar chat interface.

## Goals

1. **Alternative Interface**: Provide Discord as a first-class interface alongside TUI and web
2. **Team Collaboration**: Enable teams to collaborate on coding tasks within Discord channels
3. **Remote Access**: Allow users to interact with opencode from anywhere via Discord mobile/desktop
4. **Slash Commands**: Support Discord-native slash commands for quick actions
5. **Auto-Suggestions**: Display command autocomplete when typing `/` in Discord
6. **Thread Persistence**: Maintain conversation context across Discord threads

## Architecture

### Package Structure

```
packages/
  discord/
    src/
      index.ts          # Main bot entry point
      commands/         # Discord slash commands
        index.ts        # Command registration
        ask.ts          # /ask command
        session.ts      # /session commands
        agent.ts        # /agent commands
        model.ts        # /model commands
        mcp.ts          # /mcp commands
        connect.ts      # /connect command
        status.ts       # /status command
        help.ts         # /help command
      handlers/         # Event handlers
        message.ts      # Message event handling
        interaction.ts  # Slash command interactions
        ready.ts        # Bot ready event
      utils/            # Utilities
        format.ts       # Discord message formatting
        session.ts      # Session management helpers
        discord.ts      # Discord helpers
      types/            # TypeScript types
        index.ts
    package.json
    tsconfig.json
    .env.example
    README.md
```

### High-Level Flow

```
Discord Client (discord.js)
    |
    | WebSocket (Gateway)
    v
Discord Bot (packages/discord)
    |
    | HTTP / WebSocket
    v
OpenCode SDK (@opencode-ai/sdk)
    |
    v
OpenCode Server (auto-started, local)
    |
    v
SQLite Database (sessions, messages, parts)
```

### Session Mapping

Discord threads/channels map to OpenCode sessions:

```typescript
// Session key format: `discord:${guildId}:${channelId}:${threadId}`
// Or for DMs: `discord:dm:${userId}`

const sessions = new Map<
  string,
  {
    sessionId: string // OpenCode session ID
    client: OpencodeClient
    server: OpencodeServer
    channelId: string // Discord channel/thread ID
    userId: string // Discord user ID
    agent?: string // Selected agent name (local state)
    model?: {
      // Selected model (local state)
      providerID: string
      modelID: string
    }
    lastActivity: Date
  }
>()
```

**Note on persistence**: Sessions are stored in-memory (Map). Server-side sessions persist in SQLite. Users can reconnect to existing sessions via `/session attach <id>`.

## Features

### 1. Direct Message (DM) Support

Users can DM the bot for private, 1-on-1 interactions with opencode.

**Flow:**

- User sends DM to bot
- Bot creates/uses existing session tied to user's Discord ID
- Maintains persistent conversation history
- Supports all opencode features (tools, agents, file attachments)

### 2. Channel Support

Bot can be invited to Discord channels for team collaboration.

**Flow:**

- Bot invited to channel
- Users mention bot or use slash commands
- Each thread maintains separate session context
- Channel admins can configure bot permissions

### 3. Slash Commands

Native Discord slash commands for quick actions. When users type `/` in Discord, they see auto-suggestions of all available commands.

| Command                            | Options                                   | Description                                             |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| `/ask <question>`                  | `question` (required string)              | Quick question without thread                           |
| `/session create`                  | `title` (optional string)                 | Create new opencode session                             |
| `/session list`                    | -                                         | List your active sessions                               |
| `/session attach <id>`             | `id` (required string)                    | Attach current channel/thread to existing session       |
| `/session share`                   | -                                         | Get shareable link to current session                   |
| `/session unshare`                 | -                                         | Revoke share link for current session                   |
| `/session rename <name>`           | `name` (required string)                  | Rename current session                                  |
| `/session compact`                 | -                                         | Summarize/compact current session                       |
| `/session undo`                    | -                                         | Undo last user message and revert file changes          |
| `/session redo`                    | -                                         | Redo most recently undone message                       |
| `/session export`                  | -                                         | Export current session as Markdown file attachment      |
| `/session copy`                    | -                                         | Return full session transcript (as file if >2000 chars) |
| `/session fork <message>`          | `message_id` (required string)            | Start new session from a message                        |
| `/agent list`                      | -                                         | List available agents                                   |
| `/agent switch <name>`             | `name` (required string)                  | Switch active agent (local state)                       |
| `/model list`                      | -                                         | List available models                                   |
| `/model switch <provider> <model>` | `provider` (required), `model` (required) | Switch model for current session                        |
| `/mcp list`                        | -                                         | List available MCP tools/integrations                   |
| `/mcp toggle <name>`               | `name` (required string)                  | Enable/disable MCP integration                          |
| `/connect`                         | -                                         | Start provider connect flow (OAuth or instructions)     |
| `/status`                          | -                                         | Show opencode server and session status                 |
| `/help`                            | -                                         | Show available commands and usage help                  |

### 4. Command Registry System

The command registry centralizes all command definitions, enabling:

- **Auto-suggestions**: Commands registered with Discord appear when typing `/`
- **Dynamic options**: Autocomplete for choices like session IDs, agent names, models
- **Extensibility**: Easy to add new commands

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Command Registry                          │
├─────────────────────────────────────────────────────────────┤
│  src/commands/registry.ts    → Command definitions         │
│  src/commands/index.ts       → Command builder exports     │
│  src/gateway/bot.ts          → Command registration on     │
│                                bot startup                   │
└─────────────────────────────────────────────────────────────┘
```

#### Command Definition Structure

```typescript
// types/command.ts
interface CommandDefinition {
  key: string // Unique identifier
  builder: SlashCommandBuilder // Discord.js command builder
  handle: (interaction: ChatInputCommandInteraction) => Promise<void>
  autocomplete?: {
    [argName: string]: (interaction: AutocompleteInteraction) => Promise<void>
  }
}
```

#### Command Registration Flow

1. **Startup**: Bot starts and logs in
2. **Collect**: Gather all command builders from registry
3. **Deploy**: Use Discord REST API to register commands
4. **Cache**: Store registered command IDs for updates

```typescript
// src/gateway/bot.ts - Command registration
async function registerCommands(client: Client, token: string, clientId: string) {
  const commands = getAllCommands() // Get from registry

  const rest = new REST({ version: "10" }).setToken(token)
  await rest.put(Routes.applicationCommands(clientId), { body: commands.map((cmd) => cmd.builder.toJSON()) })

  console.log(`Registered ${commands.length} slash commands`)
}
```

#### Dynamic Autocomplete

For commands with dynamic choices (like session list, agent list), implement autocomplete handlers:

```typescript
// Example: session list autocomplete
autocomplete: {
  id: async (interaction: AutocompleteInteraction) => {
    const sessions = await listUserSessions(interaction.user.id);
    const focused = interaction.options.getFocused();

    const choices = sessions
      .filter(s => s.id.includes(focused) || s.title?.includes(focused))
      .slice(0, 25)
      .map(s => ({ name: s.title || s.id, value: s.id }));

    await interaction.respond(choices);
  },
},
```

#### Commands Index

```typescript
// src/commands/index.ts
export const commands = [
  askCommand,
  sessionCommand,
  agentCommand,
  modelCommand,
  mcpCommand,
  connectCommand,
  statusCommand,
  helpCommand,
]

export function getAllCommands(): CommandDefinition[] {
  return commands
}
```

### 4. Thread-Based Sessions

Discord threads map to OpenCode sessions:

- **Auto-threading**: Bot creates threads for complex queries (optional)
- **Session persistence**: Thread ID maps to OpenCode session ID (in-memory)
- **Shared context**: Thread participants share session context
- **Resume**: Can resume sessions via thread or `/session attach`

### 5. Rich Message Support

Leverage Discord's rich formatting:

- **Code blocks**: Syntax-highlighted code responses
- **Embeds**: Rich formatting for tool results, errors
- **Attachments**: File uploads/downloads (including user file uploads)
- **Buttons**: Quick action buttons (approve/reject for permissions)
- **Reactions**: Status indicators (thinking ⏳, done ✅, error ❌)

### 6. Tool Integration Display

Display opencode tool usage in Discord:

- Tool calls shown as embeds
- Progress indicators for long-running tools
- Collapsible results
- Link to open in web UI for detailed view

### 7. File Attachments

Users can upload files to Discord for analysis:

- Bot downloads attachment and includes in prompt as `FilePartInput`
- Supports code files, images (for vision models), documents
- Files are sent as parts in `session.prompt()` calls

## Technical Implementation

### Dependencies

```json
{
  "dependencies": {
    "@opencode-ai/sdk": "workspace:*",
    "discord.js": "^14.14.0",
    "dotenv": "^16.3.0"
  }
}
```

### Configuration

Environment variables (`.env`):

```bash
# Required
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Optional
DISCORD_GUILD_ID=optional_guild_for_dev  # For dev command registration
OPENCODE_CONFIG_PATH=~/.config/opencode/discord.json
```

### Message Handling

```typescript
// Pseudo-code for message flow
async function handleMessage(message: Message) {
  // Skip bot messages
  if (message.author.bot) return

  // Get or create session
  const session = await getOrCreateSession(message)

  // Show "typing" indicator
  await message.channel.sendTyping()

  // Handle file attachments
  const parts: Array<TextPartInput | FilePartInput> = []

  if (message.content) {
    parts.push({ type: "text", text: message.content })
  }

  for (const attachment of message.attachments.values()) {
    const fileContent = await downloadAttachment(attachment)
    parts.push({
      type: "file",
      source: {
        type: "text",
        text: { content: fileContent },
      },
    })
  }

  // Send to opencode
  const result = await session.client.session.prompt({
    path: { id: session.sessionId },
    body: { parts },
  })

  // Format and send response
  await sendFormattedResponse(message.channel, result.data)
}
```

### Slash Command Registration (Updated)

Commands are now registered with Discord on bot startup to enable auto-suggestions:

```typescript
// src/gateway/bot.ts
async start(): Promise<void> {
  const token = this.account.token || process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("No Discord token available");
  }

  // Login first
  await this.client.login(token);

  // Then register commands
  await this.registerSlashCommands();
}

private async registerSlashCommands(): Promise<void> {
  const commands = getAllCommands();
  const clientId = this.client.application?.id;

  if (!clientId) {
    console.warn("Could not get application ID, skipping command registration");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(this.account.token);

  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(cmd => cmd.builder.toJSON()) }
    );
    console.log(`Registered ${commands.length} slash commands`);
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
}
```

**Key differences from original spec:**

- Commands registered via REST API after bot login
- Uses `getAllCommands()` from registry instead of inline definitions
- Includes error handling for deployment failures

### Agent Management

Agent listing uses `client.app.agents()`:

```typescript
const agents = await client.app.agents()
// Returns: [{ name: "build", mode: "primary", ... }, ...]
```

Agent switching is **local state** (like TUI's `local.agent`):

```typescript
// Store in session data
session.agent = selectedAgentName

// Apply when sending prompts (server resolves agent per-message based on session history)
```

### Model Management

Model listing uses `client.provider.list()`:

```typescript
const providers = await client.provider.list()
// Returns providers with available models
```

Model switching is **local state per session**:

```typescript
session.model = { providerID, modelID }
```

### Session Operations

| Operation       | SDK Method                                                             |
| --------------- | ---------------------------------------------------------------------- |
| Create          | `client.session.create({ body: { title } })`                           |
| List            | `client.session.list()`                                                |
| Get             | `client.session.get({ path: { sessionID } })`                          |
| Prompt          | `client.session.prompt({ path: { sessionID }, body: { parts } })`      |
| Share           | `client.session.share({ path: { sessionID } })`                        |
| Unshare         | `client.session.unshare({ path: { sessionID } })`                      |
| Fork            | `client.session.fork({ path: { sessionID }, body: { messageID } })`    |
| Summarize       | `client.session.summarize({ path: { sessionID } })`                    |
| Revert (Undo)   | `client.session.revert({ path: { sessionID } })`                       |
| Unrevert (Redo) | `client.session.unrevert({ path: { sessionID } })`                     |
| Export          | Build transcript from `client.session.messages()` + format as Markdown |

### MCP Operations

| Operation | SDK Method                                                                             |
| --------- | -------------------------------------------------------------------------------------- |
| List      | `client.mcp.status()`                                                                  |
| Toggle    | `client.mcp.connect({ body: { name } })` / `client.mcp.disconnect({ body: { name } })` |

### Provider Connect Flow

```typescript
// Get available auth methods
const auth = await client.provider.auth()
// Returns: { providerID: [{ type: "oauth" | "api", label }, ...] }

// For OAuth:
const authUrl = await client.provider.oauth.authorize({
  path: { providerID },
  body: { method: index },
})
// Send URL to user: "Click here to authorize: <url>"

// For API keys (local setup only):
// "Please set YOUR_PROVIDER_API_KEY in your environment and restart the bot"
```

### Event Subscriptions

Listen to real-time updates:

```typescript
const events = await client.event.subscribe()
for await (const event of events.stream) {
  if (event.type === "message.part.updated") {
    // Handle streaming response updates
    const part = event.properties.part
    if (part.type === "tool") {
      // Show tool execution in Discord
    }
  }
  if (event.type === "permission.asked") {
    // Show permission request with approve/reject buttons
  }
}
```

## User Experience

### Getting Started

1. **Invite Bot**: Admin invites bot to Discord server
2. **Grant Permissions**: Bot needs message read/send, thread manage, embed links, attach files
3. **Start Chatting**: Users can immediately DM bot or mention in channels

### Example Interactions

**Direct Message:**

```
User: Can you help me refactor this React component?
[Bot creates session, responds with questions]
User: [shares code file]
Bot: [provides refactored code with explanations]
```

**Channel with Thread:**

```
User: @opencode help me debug this error
[Bot creates thread]
[Discussion continues in thread with full context]
```

**Slash Command:**

```
/session create title:"New Feature"
[Bot creates new session, shares link]

/ask "Explain React hooks"
[Bot provides explanation in channel]
```

**File Upload:**

```
User: [uploads main.ts]
User: Can you review this code?
Bot: [analyzes file and provides feedback]
```

## Security Considerations

1. **Token Storage**: Bot token in environment variables only
2. **User Isolation**: Each user's sessions isolated by Discord user ID
3. **Rate Limiting**: Respect Discord API rate limits (50 req/s global)
4. **Permission Checks**: Verify user permissions before sensitive operations
5. **Content Filtering**: Optional content moderation for public servers
6. **API Keys**: Never ask for API keys in Discord (use OAuth or local config)

## Deployment Options

### 1. Self-Hosted (Default)

Users run the bot themselves:

```bash
# Clone repo
git clone https://github.com/opencode-ai/opencode.git
cd opencode/packages/discord

# Install & configure
cp .env.example .env
# Edit .env with bot token

# Run
bun run src/index.ts
```

### 2. Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json .
RUN bun install
COPY . .
CMD ["bun", "run", "src/index.ts"]
```

### 3. Cloud Hosting (Future)

Managed bot service for teams (enterprise feature).

## Comparison: Discord vs Slack Integration

| Feature               | Discord                      | Slack             |
| --------------------- | ---------------------------- | ----------------- |
| **Target Audience**   | Developer communities, teams | Enterprise teams  |
| **Thread Model**      | Forum threads                | Slack threads     |
| **Rich UI**           | Embeds, buttons, reactions   | Block Kit         |
| **Voice**             | Stage channels, voice chat   | Huddles           |
| **Hosting Cost**      | Free tier generous           | Paid for features |
| **API Limits**        | 50 req/s global              | Tiered by plan    |
| **Mobile Experience** | Excellent                    | Good              |
| **Code Sharing**      | Syntax highlighting, files   | Snippets, files   |

## Future Enhancements

1. **Voice Channel Integration**: Voice-to-text for hands-free coding
2. **Forum Channel Support**: Dedicated forum channels for projects
3. **Scheduled Sessions**: Schedule opencode sessions in Discord events
4. **Role-Based Access**: Different agents/tools per Discord role
5. **Analytics**: Usage tracking per server/channel
6. **Custom Emojis**: Status indicators using custom emoji

## Success Metrics

- **Adoption**: Number of Discord servers with bot
- **Engagement**: Messages per session, session duration
- **Satisfaction**: User feedback, feature requests
- **Performance**: Response time, uptime

## Implementation Phases

### Phase 1: MVP (Weeks 1-2)

- [ ] Basic DM support
- [ ] Channel mention support
- [ ] Simple text responses
- [ ] Session persistence (in-memory)

### Phase 2: Core Features (Weeks 3-4)

- [ ] Slash commands (/ask, /session)
- [ ] Thread creation
- [ ] Rich embeds for code
- [ ] Tool call display

### Phase 3: Polish (Weeks 5-6)

- [ ] All slash commands
- [ ] Button interactions
- [ ] File attachments
- [ ] Error handling

### Phase 4: Advanced (Future)

- [ ] Voice integration
- [ ] Forum channels
- [ ] Role permissions
- [ ] Analytics

## References

- **Slack Integration**: `packages/slack/src/index.ts` - Reference implementation
- **SDK Usage**: `@opencode-ai/sdk` - Client/server creation
- **Architecture**: `knowledge/ui-architecture.md` - System overview
- **Discord.js Docs**: https://discord.js.org/
- **Discord API**: https://discord.com/developers/docs
