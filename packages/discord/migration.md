# Discord Plugin Migration Plan

**Status: ✅ COMPLETED**

Migrate the standalone Discord bot to follow the OpenClaw channel plugin architecture for better configurability, security, and lifecycle management.

## Implementation Summary

All 10 phases have been completed. The Discord bot now follows the OpenClaw channel plugin architecture with:

- ✅ Full type system with Zod schemas
- ✅ File-based configuration with environment variable fallback
- ✅ Security layer with DM policies (pairing, allowlist, open, disabled)
- ✅ Gateway lifecycle management with proper startup/shutdown
- ✅ Outbound messaging with chunking support
- ✅ Health monitoring and status probes
- ✅ CLI commands for pairing management
- ✅ Multi-account support
- ✅ Graceful shutdown handling

## New Architecture

```
src/
├── types/                    # TypeScript type definitions
│   ├── index.ts             # (updated) Combined exports
│   ├── plugin.ts            # Plugin SDK types
│   ├── config.ts            # Zod schemas
│   └── account.ts           # Account types
├── config/                  # Configuration management
│   └── manager.ts           # Config loading/saving
├── security/                # Security layer
│   ├── dm-policy.ts         # DM policy resolution
│   └── pairing.ts           # Pairing system
├── gateway/                 # Gateway layer
│   └── bot.ts               # Discord.js wrapper
├── outbound/                # Outbound messaging
│   └── sender.ts            # Message sender
├── status/                  # Status monitoring
│   └── probe.ts             # Health probes
├── handlers/                # Event handlers (existing, updated)
├── commands/                # Slash commands (existing)
├── utils/                   # Utilities (existing)
├── cli/                     # CLI commands
│   └── pairing.ts           # Pairing CLI
├── plugin.ts                # Main plugin definition
└── index.ts                 # Entry point (updated)
```

## Key Features Implemented

### 1. Configuration Layer

**ConfigManager** (`src/config/manager.ts`):

- Loads config from `~/.opencode/opencode.discord.json`
- Falls back to environment variables (`DISCORD_BOT_TOKEN`)
- Supports multi-account configuration
- Type-safe with Zod validation

**Example config** (`~/.opencode/opencode.discord.json`):

```json
{
  "enabled": true,
  "token": "your-bot-token",
  "dm": {
    "policy": "pairing",
    "allowFrom": [],
    "enabled": true
  },
  "guilds": {
    "123456789": {
      "channels": {
        "987654321": { "allow": true, "requireMention": true }
      }
    }
  },
  "groupPolicy": "allowlist",
  "mediaMaxMb": 8,
  "historyLimit": 100
}
```

### 2. Security Layer

**DM Policies** (`src/security/dm-policy.ts`):

- `pairing`: Users must pair before DMing (default)
- `allowlist`: Only listed users can DM
- `open`: Anyone can DM
- `disabled`: DMs are completely disabled

**Pairing System** (`src/security/pairing.ts`):

- Stores pairing requests and approved users in `~/.opencode/discord-pairing.json`
- 6-character pairing codes (1-hour expiry)
- CLI commands to approve/list/remove pairings

### 3. Gateway Layer

**DiscordBot** (`src/gateway/bot.ts`):

- Wraps discord.js Client with plugin lifecycle
- Handles DM policy enforcement
- Manages multiple bot instances (multi-account)
- Event-driven architecture with proper cleanup

### 4. Outbound Messaging

**MessageSender** (`src/outbound/sender.ts`):

- Sends text messages with chunking (2000 char limit)
- Supports media attachments
- Target resolution (channel:ID, user:ID formats)
- Reply threading support

### 5. Status Monitoring

**Health Probes** (`src/status/probe.ts`):

- Probes Discord API to verify token validity
- Returns bot info and application details
- Checks message content intent status
- Collects status issues (missing token, disabled account)

### 6. CLI Commands

**Pairing CLI** (`src/cli/pairing.ts`):

```bash
# Approve a pairing code
opencode-discord pairing approve <code>

# List paired users
opencode-discord pairing list

# Remove a paired user
opencode-discord pairing remove <userId>
```

## Plugin Interface

The main plugin is defined in `src/plugin.ts`:

```typescript
export const discordPlugin: ChannelPlugin<ResolvedDiscordAccount> = {
  id: "discord",
  meta: { name: "Discord", description: "Discord bot integration" },
  capabilities: {
    chatTypes: ["direct", "channel", "thread"],
    polls: false,
    reactions: true,
    threads: true,
    media: true,
    nativeCommands: true,
  },
  configSchema: DiscordConfigSchema,
  config: {
    /* account CRUD */
  },
  security: {
    /* DM policies */
  },
  outbound: {
    /* message sending */
  },
  status: {
    /* health monitoring */
  },
  gateway: {
    /* lifecycle management */
  },
}
```

## Usage

### Running the Bot

```bash
# Development
bun run dev

# With environment variables
DISCORD_BOT_TOKEN=your-token bun run src/index.ts
```

### Managing Pairing

When a user DMs the bot with `policy: "pairing"`:

1. User receives a pairing code (e.g., `A1B2C3`)
2. Admin approves the code:
   ```bash
   opencode-discord pairing approve A1B2C3
   ```
3. User can now DM the bot

### Configuration

Edit `~/.opencode/opencode.discord.json`:

```json
{
  "enabled": true,
  "token": "your-bot-token",
  "dm": {
    "policy": "pairing",
    "allowFrom": ["123456789"] // Pre-approved users
  },
  "guilds": {
    "guild-id": {
      "channels": {
        "channel-id": { "allow": true }
      }
    }
  }
}
```

## Migration from Old Architecture

The old standalone bot architecture is still functional. The new plugin:

1. **Maintains backward compatibility** - Still works with `DISCORD_BOT_TOKEN` env var
2. **Adds new capabilities** - Security, monitoring, multi-account
3. **Uses same handlers** - Existing message/interaction handlers are reused
4. **Improves structure** - Clean separation of concerns following OpenClaw pattern

## Comparison: Old vs New

| Feature          | Old           | New                 |
| ---------------- | ------------- | ------------------- |
| Configuration    | Env vars only | File + env vars     |
| Multi-account    | No            | Yes                 |
| DM Security      | None          | 4 policies          |
| Pairing          | None          | Full system         |
| Health checks    | None          | Probes + status     |
| Message chunking | Manual        | Automatic           |
| Plugin SDK       | No            | Full implementation |

## Files Created

- `src/types/plugin.ts` - Plugin SDK types
- `src/types/config.ts` - Zod schemas
- `src/types/account.ts` - Account types
- `src/config/manager.ts` - Config management
- `src/security/dm-policy.ts` - DM policies
- `src/security/pairing.ts` - Pairing system
- `src/gateway/bot.ts` - Discord.js wrapper
- `src/outbound/sender.ts` - Message sender
- `src/status/probe.ts` - Health probes
- `src/cli/pairing.ts` - CLI commands
- `src/plugin.ts` - Main plugin definition

## Files Modified

### Configuration & Dependencies

- `package.json` - Added zod dependency, bin entry for CLI

### Types

- `src/types/index.ts` - Added plugin type exports, updated SessionData type

### Security Layer

- `src/security/pairing.ts` - Fixed race conditions, added deleted codes tracking
- `src/security/dm-policy.ts` - DM policy resolution and enforcement

### Gateway Layer

- `src/gateway/bot.ts` - Added pairing store reload on DM check, save after code generation

### Handlers

- `src/handlers/message.ts` - Added config/pairing params, fixed SDK API call format
- `src/handlers/interaction.ts` - Added config/pairing params

### Entry Point

- `src/index.ts` - Uses plugin architecture with proper initialization

### Tests

- `src/security/pairing.test.ts` - Unit tests for pairing system (14 tests)
- `src/security/pairing.integration.test.ts` - Integration tests (3 tests)

## Bug Fixes

### Pairing System Race Conditions

Fixed critical concurrency issues in the pairing system:

1. **Codes not persisted** - Bot now saves pairing codes to disk immediately after generation
2. **Race condition between bot and CLI** - Save now reloads and merges with disk state before writing
3. **Deleted code tracking** - Added `deletedCodes` set to track which codes were removed during approval
4. **Stale state on DM check** - Bot reloads pairing store from disk before checking DM permissions

**Files modified:**

- `src/security/pairing.ts` - Fixed save/load race conditions
- `src/gateway/bot.ts` - Added `await this.pairing.load()` before DM checks

### SDK API Compatibility

Fixed message handler to use correct SDK API format for `session.prompt()`:

- Uses flat parameters: `{ sessionID, parts }` instead of nested `{ path: { id }, body: { parts } }`

**File modified:**

- `src/handlers/message.ts` - Reverted to original SDK call format

## Testing

Comprehensive test suite added with 17 tests (100% pass rate):

### Unit Tests (`src/security/pairing.test.ts`)

14 tests covering:

- Code generation (unique codes, correct format)
- Save/load persistence
- Code approval (valid, invalid, expired)
- Concurrent access scenarios
- Pairing removal
- Expired code cleanup

### Integration Tests (`src/security/pairing.integration.test.ts`)

3 tests covering:

- Complete workflow: bot generates → CLI approves → bot recognizes
- Multiple DMs while pending
- Concurrent access without data loss

### Running Tests

```bash
# Run all pairing tests
cd packages/discord
bun test src/security/

# Run specific test file
bun test src/security/pairing.test.ts
bun test src/security/pairing.integration.test.ts
```

### Type Checking

```bash
bun run typecheck
```

Type checking passes for all source files (test files excluded due to bun:test runtime types).

## Known Issues

1. **SDK Version Mismatch** - Types import from `@opencode-ai/sdk/v2` but runtime uses v1 SDK
   - Workaround: Client cast to `any` in session management
   - Impact: Type safety reduced, but runtime works correctly

2. **Message Chunking** - Discord's 2000 char limit handled but not optimized
   - Currently splits by newlines, may need smarter word-based chunking

3. **Test Types** - Test files use `bun:test` which isn't in TypeScript definitions
   - Tests run correctly with `bun test`
   - Type errors in test files can be ignored
