# Discord Bot Integration PRD

## Overview

Create an official Discord bot integration for opencode that allows users to interact with opencode AI agents directly through Discord channels and DMs. This provides an alternative interface to the current OpenTUI, enabling team collaboration and remote access through Discord's familiar chat interface.

## Goals

1. **Alternative Interface**: Provide Discord as a first-class interface alongside TUI and web
2. **Team Collaboration**: Enable teams to collaborate on coding tasks within Discord channels
3. **Remote Access**: Allow users to interact with opencode from anywhere via Discord mobile/desktop
4. **Slash Commands**: Support Discord-native slash commands for quick actions
5. **Thread Persistence**: Maintain conversation context across Discord threads

## Architecture

### Package Structure

```
packages/
  discord/
    src/
      index.ts          # Main bot entry point
      commands/         # Discord slash commands
        session.ts      # /session commands
        agent.ts        # /agent commands
        help.ts         # /help command
      handlers/         # Event handlers
        message.ts      # Message event handling
        interaction.ts  # Slash command interactions
      utils/            # Utilities
        format.ts       # Discord message formatting
        session.ts      # Session management helpers
    package.json
    .env.example
    README.md
```

### High-Level Flow

```
Discord Client (discord.js)
    ↓
Discord Gateway (WebSocket)
    ↓
Discord Bot (packages/discord)
    ↓
OpenCode SDK (@opencode-ai/sdk)
    ↓
OpenCode Server (local/remote)
```

## Features

### 1. Direct Message (DM) Support

Users can DM the bot for private, 1-on-1 interactions with opencode.

**Flow:**

- User sends DM to bot
- Bot creates/uses existing session tied to user's Discord ID
- Maintains persistent conversation history
- Supports all opencode features (tools, agents, etc.)

### 2. Channel Support

Bot can be invited to Discord channels for team collaboration.

**Flow:**

- Bot invited to channel
- Users mention bot or use slash commands
- Each thread maintains separate session context
- Channel admins can configure bot permissions

### 3. Slash Commands

Native Discord slash commands for quick actions:

| Command                     | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `/ask <question>`           | Quick question without thread                                              |
| `/session create`           | Create new opencode session (parity with TUI `/new`)                       |
| `/session list`             | List your active sessions (parity with TUI `/sessions`)                    |
| `/session attach <id>`      | Attach current channel/thread to existing session                          |
| `/session share`            | Get shareable link to current session                                      |
| `/session unshare`          | Revoke share link for current session (parity with TUI `/unshare`)         |
| `/session rename <name>`    | Rename current session (parity with TUI `/rename`)                         |
| `/session compact`          | Summarize/compact current session (parity with TUI `/compact`/`/summarize`) |
| `/session undo`             | Undo last user message and revert related file changes                     |
| `/session redo`             | Redo most recently undone message                                          |
| `/session export`           | Export current session as Markdown and upload as a file                    |
| `/session copy`             | Return full session transcript as text (e.g. DM or file attachment)       |
| `/session fork <message>`   | Start a new session from a specific message (e.g. via Discord message link) |
| `/agent list`               | List available agents                                                      |
| `/agent switch <name>`      | Switch active agent                                                        |
| `/model list`               | List available models (parity with TUI `/models`)                          |
| `/model switch <name>`      | Switch active model for the current session                                |
| `/mcp list`                 | List available MCP tools/integrations (parity with TUI `/mcps`)           |
| `/mcp toggle <name>`        | Enable or disable an MCP integration for the current session              |
| `/connect`                  | Start provider connect flow (link/instructions to add provider API keys)  |
| `/status`                   | Show opencode server and session status                                   |
| `/help`                     | Show available commands and usage help                                    |

### 4. Thread-Based Sessions

Discord threads map to OpenCode sessions:

- **Auto-threading**: Bot can create threads for complex queries
- **Session persistence**: Thread ID maps to OpenCode session ID
- **Shared context**: Thread participants share session context
- **Resume**: Can resume sessions via thread or `/session attach`

### 5. Rich Message Support

Leverage Discord's rich formatting:

- **Code blocks**: Syntax-highlighted code responses
- **Embeds**: Rich formatting for tool results, errors
- **Attachments**: File uploads/downloads
- **Buttons**: Quick action buttons (approve/reject, etc.)
- **Reactions**: Status indicators (thinking, done, error)

### 6. Tool Integration Display

Display opencode tool usage in Discord:

- Tool calls shown as embeds
- Progress indicators for long-running tools
- Collapsible results
- Link to open in web UI for detailed view

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
OPENCODE_SERVER_URL=auto  # Auto-start or specify URL
OPENCODE_CONFIG_PATH=~/.config/opencode/discord.json
```

### Session Management

```typescript
// Session key format: `discord:${guildId}:${channelId}:${threadId}`
// Or for DMs: `discord:dm:${userId}`

const sessions = new Map<
  string,
  {
    sessionId: string
    client: OpencodeClient
    server: OpencodeServer
    channelId: string
    threadId?: string
    userId: string
    lastActivity: Date
  }
>()
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

  // Send to opencode
  const result = await session.client.session.prompt({
    path: { id: session.sessionId },
    body: { parts: [{ type: "text", text: message.content }] },
  })

  // Format and send response
  await sendFormattedResponse(message.channel, result.data)
}
```

### Slash Command Registration

```typescript
const commands = [
  {
    name: "ask",
    description: "Ask opencode a question",
    options: [
      {
        name: "question",
        type: ApplicationCommandOptionType.String,
        description: "Your question",
        required: true,
      },
    ],
  },
  // ... more commands
]

// Register with Discord
const rest = new REST({ version: "10" }).setToken(token)
await rest.put(Routes.applicationCommands(clientId), { body: commands })
```

## User Experience

### Getting Started

1. **Invite Bot**: Admin invites bot to Discord server
2. **Grant Permissions**: Bot needs message read/send, thread manage, embed links
3. **Start Chatting**: Users can immediately DM bot or mention in channels

### Example Interactions

**Direct Message:**

```
User: Can you help me refactor this React component?
[Bot creates session, responds with questions]
User: [shares code]
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
/session create
[Bot creates new session, shares link]

/ask "Explain React hooks"
[Bot provides explanation in channel]
```

## Security Considerations

1. **Token Storage**: Bot token in environment variables only
2. **User Isolation**: Each user's sessions isolated by Discord user ID
3. **Rate Limiting**: Respect Discord API rate limits
4. **Permission Checks**: Verify user permissions before sensitive operations
5. **Content Filtering**: Optional content moderation for public servers

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
- [ ] Session persistence

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

## Files to Create

```
packages/discord/
├── src/
│   ├── index.ts              # Main bot entry
│   ├── commands/
│   │   ├── index.ts          # Command registration
│   │   ├── ask.ts            # /ask command
│   │   ├── session.ts        # /session commands
│   │   ├── agent.ts          # /agent commands
│   │   └── help.ts           # /help command
│   ├── handlers/
│   │   ├── message.ts        # Message event handler
│   │   ├── interaction.ts    # Slash command handler
│   │   └── ready.ts          # Bot ready event
│   ├── utils/
│   │   ├── format.ts         # Message formatting
│   │   ├── session.ts        # Session management
│   │   └── discord.ts        # Discord helpers
│   └── types/
│       └── index.ts          # TypeScript types
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## References

- **Slack Integration**: `packages/slack/src/index.ts` - Reference implementation
- **SDK Usage**: `@opencode-ai/sdk` - Client/server creation
- **Discord.js Docs**: https://discord.js.org/
- **Discord API**: https://discord.com/developers/docs
