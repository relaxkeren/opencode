# Discord Plugin Migration Plan

Migrate the standalone Discord bot to follow the OpenClaw channel plugin architecture for better configurability, security, and lifecycle management.

## Current State

The bot is a standalone application using discord.js directly. It creates opencode server instances per session, manages sessions in-memory, and uses environment variables for configuration. Key files:

- `src/index.ts` - Bot entry point
- `src/handlers/message.ts` - Message handling
- `src/handlers/interaction.ts` - Slash command routing
- `src/utils/session.ts` - Session management (in-memory)
- `src/commands/*.ts` - Slash command handlers

**Issues:**

- No configuration schema or persistence
- No DM security policies (open to all)
- Sessions are in-memory only (lost on restart)
- No health monitoring or status checks
- No multi-account support
- Environment variables only (no file config)

## Target Architecture

Follow the OpenClaw pattern with two main components:

1. **Plugin Definition** (`src/plugin.ts`) - Declarative channel plugin
2. **Runtime Provider** (`src/runtime.ts`) - Discord operations implementation

The plugin defines capabilities, config schema, security policies, and lifecycle hooks. The runtime provides actual Discord API interactions.

## Migration Phases

### Phase 1: Create Plugin SDK Types and Interfaces

Create type definitions matching the OpenClaw plugin SDK pattern.

**Files to create:**

- `src/types/plugin.ts` - Core plugin types
- `src/types/config.ts` - Configuration schema types
- `src/types/account.ts` - Account resolution types
- `src/types/index.ts` - Export all types

**Key interfaces needed:**

```typescript
// ChannelPlugin - Main plugin export
export interface ChannelPlugin<TAccount> {
  id: string
  meta: ChannelMeta
  onboarding?: OnboardingAdapter
  pairing?: PairingConfig
  capabilities: ChannelCapabilities
  streaming?: StreamingConfig
  reload?: ReloadConfig
  configSchema: z.ZodSchema
  config: ChannelConfig<TAccount>
  security: ChannelSecurity<TAccount>
  groups?: ChannelGroups
  mentions?: ChannelMentions
  threading?: ChannelThreading
  messaging?: ChannelMessaging
  directory?: ChannelDirectory
  resolver?: ChannelResolver
  actions?: ChannelMessageActionAdapter
  setup?: ChannelSetup
  outbound: ChannelOutbound
  status: ChannelStatus<TAccount>
  gateway: ChannelGateway<TAccount>
}

// Account resolution
export interface ResolvedDiscordAccount {
  accountId: string
  name?: string
  enabled: boolean
  token?: string
  tokenSource: "config" | "env" | "none"
  config: DiscordAccountConfig
}

// Config schema (Zod)
export const DiscordConfigSchema = z.object({
  enabled: z.boolean().default(true),
  token: z.string().optional(),
  dm: z
    .object({
      policy: z.enum(["pairing", "open", "allowlist", "disabled"]).default("pairing"),
      allowFrom: z.array(z.string()).default([]),
      enabled: z.boolean().default(true),
    })
    .default({}),
  guilds: z
    .record(
      z.object({
        channels: z
          .record(
            z.object({
              allow: z.boolean().default(true),
              requireMention: z.boolean().default(true),
            }),
          )
          .default({}),
      }),
    )
    .default({}),
  groupPolicy: z.enum(["allowlist", "open"]).default("allowlist"),
  commands: z
    .object({
      native: z.union([z.boolean(), z.literal("auto")]).default("auto"),
    })
    .default({}),
  mediaMaxMb: z.number().default(8),
  historyLimit: z.number().default(100),
})

// Capabilities
export interface ChannelCapabilities {
  chatTypes: ("direct" | "channel" | "thread")[]
  polls: boolean
  reactions: boolean
  threads: boolean
  media: boolean
  nativeCommands: boolean
}

// Security policies
export interface ChannelSecurity<TAccount> {
  resolveDmPolicy: (params: { cfg: Config; accountId: string; account: TAccount }) => DmPolicy
  collectWarnings: (params: { account: TAccount; cfg: Config }) => string[]
}

// Gateway lifecycle
export interface ChannelGateway<TAccount> {
  startAccount: (ctx: GatewayContext<TAccount>) => Promise<void>
  stopAccount?: (ctx: GatewayContext<TAccount>) => Promise<void>
}

export interface GatewayContext<TAccount> {
  account: TAccount
  cfg: Config
  runtime: any
  abortSignal: AbortSignal
  log?: Logger
  setStatus: (status: any) => void
}

// Outbound messaging
export interface ChannelOutbound {
  deliveryMode: "direct" | "queued"
  chunker: ChunkerConfig | null
  textChunkLimit: number
  pollMaxOptions: number
  sendText: (params: SendTextParams) => Promise<SendResult>
  sendMedia?: (params: SendMediaParams) => Promise<SendResult>
  sendPoll?: (params: SendPollParams) => Promise<SendResult>
}

// Status monitoring
export interface ChannelStatus<TAccount> {
  defaultRuntime: DefaultRuntimeState
  collectStatusIssues: (params: StatusParams<TAccount>) => StatusIssue[]
  buildChannelSummary: (params: SummaryParams) => ChannelSummary
  probeAccount: (params: ProbeParams<TAccount>) => Promise<ProbeResult>
  auditAccount?: (params: AuditParams<TAccount>) => Promise<AuditResult | undefined>
  buildAccountSnapshot: (params: SnapshotParams<TAccount>) => AccountSnapshot
}
```

### Phase 2: Implement Configuration Layer

Add configuration schema and persistence.

**Files to modify:**

- `src/config/schema.ts` - Zod schema definitions
- `src/config/manager.ts` - Config loading/saving
- `src/config/paths.ts` - Config path resolution
- `src/config/migrate.ts` - Migration from env vars

**Implementation:**

```typescript
// src/config/schema.ts
import { z } from "zod"

export const DiscordAccountConfigSchema = z.object({
  enabled: z.boolean().default(true),
  name: z.string().optional(),
  token: z.string().optional(),
  dm: z
    .object({
      policy: z.enum(["pairing", "open", "allowlist", "disabled"]).default("pairing"),
      allowFrom: z.array(z.string()).default([]),
      enabled: z.boolean().default(true),
    })
    .optional(),
  guilds: z
    .record(
      z.object({
        name: z.string().optional(),
        channels: z
          .record(
            z.object({
              allow: z.boolean().default(true),
              requireMention: z.boolean().default(true),
            }),
          )
          .default({}),
      }),
    )
    .default({}),
  groupPolicy: z.enum(["allowlist", "open"]).default("allowlist"),
  commands: z
    .object({
      native: z.union([z.boolean(), z.literal("auto")]).default("auto"),
    })
    .default({}),
  mediaMaxMb: z.number().default(8),
  historyLimit: z.number().default(100),
})

export const DiscordConfigSchema = z.object({
  enabled: z.boolean().default(true),
  token: z.string().optional(),
  accounts: z.record(DiscordAccountConfigSchema).optional(),
  ...DiscordAccountConfigSchema.shape,
})

export type DiscordConfig = z.infer<typeof DiscordConfigSchema>

// Build full schema with account resolution
export function buildChannelConfigSchema(baseSchema: z.ZodSchema) {
  return z.object({
    channels: z
      .object({
        discord: baseSchema,
      })
      .optional(),
  })
}
```

**Config manager:**

```typescript
// src/config/manager.ts
import { existsSync } from "fs"
import { readFile, writeFile } from "fs/promises"
import { DiscordConfig, DiscordConfigSchema } from "./schema.js"

const CONFIG_FILE = "opencode.discord.json"

export class ConfigManager {
  private configPath: string
  private config: DiscordConfig | null = null

  constructor(stateDir?: string) {
    const baseDir = stateDir || process.env.OPENCODE_STATE_DIR || `${process.env.HOME}/.opencode`
    this.configPath = `${baseDir}/${CONFIG_FILE}`
  }

  async load(): Promise<DiscordConfig> {
    if (!existsSync(this.configPath)) {
      this.config = { enabled: false }
      return this.config
    }

    const content = await readFile(this.configPath, "utf-8")
    const parsed = JSON.parse(content)
    this.config = DiscordConfigSchema.parse(parsed)
    return this.config
  }

  async save(config: DiscordConfig): Promise<void> {
    await writeFile(this.configPath, JSON.stringify(config, null, 2))
    this.config = config
  }

  get(): DiscordConfig {
    if (!this.config) throw new Error("Config not loaded")
    return this.config
  }

  // Get default account ID
  resolveDefaultAccountId(): string {
    const cfg = this.get()
    const accounts = Object.keys(cfg.accounts || {})
    if (accounts.length === 0) return "default"
    return accounts[0]
  }

  // Resolve account by ID (handles default account from base config)
  resolveAccount(accountId: string): ResolvedDiscordAccount {
    const cfg = this.get()
    const isDefault = accountId === "default"

    if (isDefault || !cfg.accounts?.[accountId]) {
      // Use base config for default account
      return {
        accountId: "default",
        enabled: cfg.enabled ?? true,
        token: cfg.token,
        tokenSource: cfg.token ? "config" : process.env.DISCORD_BOT_TOKEN ? "env" : "none",
        config: {
          enabled: cfg.enabled ?? true,
          dm: cfg.dm,
          guilds: cfg.guilds,
          groupPolicy: cfg.groupPolicy,
          commands: cfg.commands,
          mediaMaxMb: cfg.mediaMaxMb,
          historyLimit: cfg.historyLimit,
        },
      }
    }

    const account = cfg.accounts[accountId]
    return {
      accountId,
      name: account.name,
      enabled: account.enabled ?? true,
      token: account.token,
      tokenSource: account.token ? "config" : "none",
      config: account,
    }
  }

  // List all account IDs
  listAccountIds(): string[] {
    const cfg = this.get()
    const ids = Object.keys(cfg.accounts || {})
    // Always include default
    if (!ids.includes("default")) ids.unshift("default")
    return ids
  }

  // Set account enabled state
  setAccountEnabled(accountId: string, enabled: boolean): void {
    const cfg = this.get()
    if (accountId === "default") {
      cfg.enabled = enabled
    } else if (cfg.accounts?.[accountId]) {
      cfg.accounts[accountId].enabled = enabled
    }
  }

  // Delete account
  deleteAccount(accountId: string): void {
    const cfg = this.get()
    if (cfg.accounts?.[accountId]) {
      delete cfg.accounts[accountId]
    }
  }
}
```

### Phase 3: Implement Security Layer

Add DM policies, pairing system, and access controls.

**Files to create:**

- `src/security/dm-policy.ts` - DM policy resolution
- `src/security/pairing.ts` - Pairing system
- `src/security/allowlist.ts` - Allowlist management

**DM Policy Implementation:**

```typescript
// src/security/dm-policy.ts
import { ResolvedDiscordAccount } from "../types/account.js"
import { DiscordConfig } from "../config/schema.js"

export interface DmPolicy {
  policy: "pairing" | "open" | "allowlist" | "disabled"
  allowFrom: string[]
  allowFromPath: string
  approveHint: string
  normalizeEntry: (raw: string) => string
}

export function resolveDmPolicy(account: ResolvedDiscordAccount, cfg: DiscordConfig): DmPolicy {
  const dm = account.config.dm

  return {
    policy: dm?.policy ?? "pairing",
    allowFrom: dm?.allowFrom ?? [],
    allowFromPath: `channels.discord.${account.accountId === "default" ? "" : `accounts.${account.accountId}.`}dm.allowFrom`,
    approveHint: `Use "opencode pairing approve discord <code>" to approve`,
    normalizeEntry: (raw: string) => {
      return raw.replace(/^(discord|user):/i, "").replace(/^<@!?(\d+)>$/, "$1")
    },
  }
}

export function isDmAllowed(
  userId: string,
  policy: DmPolicy,
  pairedUsers: Set<string>,
): { allowed: boolean; reason?: string } {
  if (policy.policy === "disabled") {
    return { allowed: false, reason: "DMs are disabled" }
  }

  if (policy.policy === "open") {
    return { allowed: true }
  }

  const normalizedId = policy.normalizeEntry(userId)

  if (policy.policy === "allowlist") {
    const allowed = policy.allowFrom.some((entry) => policy.normalizeEntry(entry) === normalizedId)
    return allowed ? { allowed: true } : { allowed: false, reason: "User not in allowlist" }
  }

  // Pairing mode
  if (policy.allowFrom.includes(normalizedId) || pairedUsers.has(normalizedId)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `User not paired. ${policy.approveHint}`,
  }
}
```

**Pairing system:**

```typescript
// src/security/pairing.ts
import { existsSync } from "fs"
import { readFile, writeFile } from "fs/promises"

interface PairingRequest {
  code: string
  userId: string
  accountId: string
  createdAt: number
}

const PAIRING_FILE = "discord-pairing.json"

export class PairingStore {
  private pairingPath: string
  private codes: Map<string, PairingRequest> = new Map()
  private pairedUsers: Set<string> = new Set()

  constructor(stateDir?: string) {
    const baseDir = stateDir || process.env.OPENCODE_STATE_DIR || `${process.env.HOME}/.opencode`
    this.pairingPath = `${baseDir}/${PAIRING_FILE}`
  }

  async load(): Promise<void> {
    if (!existsSync(this.pairingPath)) return

    const content = await readFile(this.pairingPath, "utf-8")
    const data = JSON.parse(content)

    this.codes = new Map(Object.entries(data.codes || {}))
    this.pairedUsers = new Set(data.pairedUsers || [])
  }

  async save(): Promise<void> {
    const data = {
      codes: Object.fromEntries(this.codes),
      pairedUsers: Array.from(this.pairedUsers),
    }
    await writeFile(this.pairingPath, JSON.stringify(data, null, 2))
  }

  generateCode(userId: string, accountId: string): string {
    // Generate 6-digit code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    this.codes.set(code, {
      code,
      userId,
      accountId,
      createdAt: Date.now(),
    })

    return code
  }

  approveCode(code: string): { success: boolean; userId?: string; error?: string } {
    const request = this.codes.get(code)
    if (!request) {
      return { success: false, error: "Invalid pairing code" }
    }

    // Check expiry (1 hour)
    if (Date.now() - request.createdAt > 60 * 60 * 1000) {
      this.codes.delete(code)
      return { success: false, error: "Pairing code expired" }
    }

    this.pairedUsers.add(request.userId)
    this.codes.delete(code)

    return { success: true, userId: request.userId }
  }

  isPaired(userId: string): boolean {
    return this.pairedUsers.has(userId)
  }

  removePairing(userId: string): void {
    this.pairedUsers.delete(userId)
  }

  listPairedUsers(): string[] {
    return Array.from(this.pairedUsers)
  }
}
```

### Phase 4: Implement Gateway Lifecycle

Create the gateway startup/shutdown logic.

**Files to create:**

- `src/gateway/bot.ts` - Discord.js client wrapper
- `src/gateway/monitor.ts` - Health monitoring
- `src/gateway/handler.ts` - Message/Interaction handlers

**Bot wrapper:**

```typescript
// src/gateway/bot.ts
import { Client, GatewayIntentBits, Partials, Events, Message, Interaction } from "discord.js"
import { ResolvedDiscordAccount } from "../types/account.js"
import { ConfigManager } from "../config/manager.js"
import { PairingStore } from "../security/pairing.js"

interface BotOptions {
  account: ResolvedDiscordAccount
  config: ConfigManager
  pairing: PairingStore
  onMessage: (message: Message) => Promise<void>
  onInteraction: (interaction: Interaction) => Promise<void>
}

export class DiscordBot {
  private client: Client
  private account: ResolvedDiscordAccount
  private config: ConfigManager
  private pairing: PairingStore
  private onMessage: (message: Message) => Promise<void>
  private onInteraction: (interaction: Interaction) => Promise<void>
  private running = false
  private startTime: Date | null = null

  constructor(options: BotOptions) {
    this.account = options.account
    this.config = options.config
    this.pairing = options.pairing
    this.onMessage = options.onMessage
    this.onInteraction = options.onInteraction

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.client.on(Events.ClientReady, () => {
      console.log(`[${this.account.accountId}] Bot ready: ${this.client.user?.tag}`)
      this.running = true
      this.startTime = new Date()
    })

    this.client.on(Events.MessageCreate, async (message) => {
      // Skip bot messages
      if (message.author.bot) return

      // Check DM policy
      if (message.channel.isDMBased()) {
        const policy = resolveDmPolicy(this.account, this.config.get())
        const check = isDmAllowed(message.author.id, policy, this.pairedUsers)

        if (!check.allowed) {
          if (policy.policy === "pairing") {
            // Generate pairing code
            const code = this.pairing.generateCode(message.author.id, this.account.accountId)
            await message.reply(
              `🔐 This bot requires pairing to use DMs.\n` +
                `Your pairing code: **${code}**\n` +
                `${policy.approveHint}`,
            )
          } else {
            await message.reply(`❌ ${check.reason}`)
          }
          return
        }
      }

      await this.onMessage(message)
    })

    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.onInteraction(interaction)
    })

    this.client.on(Events.Error, (error) => {
      console.error(`[${this.account.accountId}] Discord client error:`, error)
    })
  }

  get pairedUsers(): Set<string> {
    return new Set(this.pairing.listPairedUsers())
  }

  async start(): Promise<void> {
    const token = this.account.token || process.env.DISCORD_BOT_TOKEN
    if (!token) {
      throw new Error("No Discord token available")
    }

    await this.client.login(token)
  }

  async stop(): Promise<void> {
    this.running = false
    this.client.destroy()
  }

  isRunning(): boolean {
    return this.running && this.client.isReady()
  }

  getStartTime(): Date | null {
    return this.startTime
  }

  getClient(): Client {
    return this.client
  }
}
```

### Phase 5: Implement Outbound Messaging

Create the outbound messaging layer.

**Files to create:**

- `src/outbound/sender.ts` - Message sending
- `src/outbound/formatter.ts` - Message formatting
- `src/outbound/chunker.ts` - Message chunking

**Sender implementation:**

```typescript
// src/outbound/sender.ts
import { TextChannel, ThreadChannel, DMChannel } from "discord.js"

interface SendMessageOptions {
  replyTo?: string
  accountId?: string
}

export interface SendResult {
  channel: string
  messageId?: string
  ok: boolean
  error?: string
}

export class MessageSender {
  private bots: Map<string, DiscordBot>

  constructor(bots: Map<string, DiscordBot>) {
    this.bots = bots
  }

  async sendText(to: string, text: string, options: SendMessageOptions = {}): Promise<SendResult> {
    try {
      const bot = options.accountId
        ? this.bots.get(options.accountId)
        : this.bots.get("default") || this.bots.values().next().value

      if (!bot) {
        return { channel: "discord", ok: false, error: "No bot available" }
      }

      const channel = await this.resolveChannel(bot, to)
      if (!channel) {
        return { channel: "discord", ok: false, error: "Channel not found" }
      }

      // Chunk if needed (2000 char limit)
      const chunks = this.chunkMessage(text, 2000)
      let lastMessageId: string | undefined

      for (const chunk of chunks) {
        const message =
          options.replyTo && lastMessageId
            ? await channel.send({ content: chunk, reply: { messageReference: options.replyTo } })
            : await channel.send(chunk)
        lastMessageId = message.id
      }

      return { channel: "discord", messageId: lastMessageId, ok: true }
    } catch (error) {
      return {
        channel: "discord",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async sendMedia(to: string, text: string, mediaUrl: string, options: SendMessageOptions = {}): Promise<SendResult> {
    try {
      const bot = options.accountId
        ? this.bots.get(options.accountId)
        : this.bots.get("default") || this.bots.values().next().value

      if (!bot) {
        return { channel: "discord", ok: false, error: "No bot available" }
      }

      const channel = await this.resolveChannel(bot, to)
      if (!channel) {
        return { channel: "discord", ok: false, error: "Channel not found" }
      }

      const message = await channel.send({
        content: text || undefined,
        files: [{ attachment: mediaUrl }],
        reply: options.replyTo ? { messageReference: options.replyTo } : undefined,
      })

      return { channel: "discord", messageId: message.id, ok: true }
    } catch (error) {
      return {
        channel: "discord",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async resolveChannel(
    bot: DiscordBot,
    target: string,
  ): Promise<TextChannel | ThreadChannel | DMChannel | null> {
    const client = bot.getClient()

    // Handle user:ID format
    if (target.startsWith("user:")) {
      const userId = target.slice(5)
      try {
        const user = await client.users.fetch(userId)
        return user.dmChannel || (await user.createDM())
      } catch {
        return null
      }
    }

    // Handle channel:ID format
    if (target.startsWith("channel:")) {
      const channelId = target.slice(8)
      try {
        const channel = await client.channels.fetch(channelId)
        if (channel?.isTextBased() && !channel.isVoiceBased()) {
          return channel as TextChannel | ThreadChannel
        }
      } catch {
        return null
      }
    }

    // Assume it's a channel ID
    try {
      const channel = await client.channels.fetch(target)
      if (channel?.isTextBased() && !channel.isVoiceBased()) {
        return channel as TextChannel | ThreadChannel
      }
    } catch {
      // Fall through
    }

    return null
  }

  private chunkMessage(text: string, limit: number): string[] {
    if (text.length <= limit) return [text]

    const chunks: string[] = []
    let current = ""

    for (const line of text.split("\n")) {
      if (current.length + line.length + 1 > limit) {
        if (current) chunks.push(current)
        current = line
      } else {
        current += (current ? "\n" : "") + line
      }
    }

    if (current) chunks.push(current)
    return chunks
  }
}
```

### Phase 6: Implement Status Monitoring

Add health probes and status tracking.

**Files to create:**

- `src/status/probe.ts` - Health probing
- `src/status/audit.ts` - Permission auditing
- `src/status/snapshot.ts` - Status snapshots

**Probe implementation:**

```typescript
// src/status/probe.ts
import { REST } from "discord.js"

export interface ProbeResult {
  ok: boolean
  bot?: {
    id: string
    username: string
    discriminator: string
  }
  application?: {
    id: string
    name: string
    description?: string
    intents?: {
      messageContent?: "enabled" | "disabled" | "limited"
    }
  }
  error?: string
  elapsedMs: number
}

export async function probeDiscord(token: string, timeoutMs: number = 5000): Promise<ProbeResult> {
  const startTime = Date.now()

  try {
    const rest = new REST({ version: "10" }).setToken(token)

    const [botUser, appInfo] = await Promise.all([
      rest.get("/users/@me") as Promise<any>,
      rest.get("/oauth2/applications/@me") as Promise<any>,
    ])

    const elapsedMs = Date.now() - startTime

    return {
      ok: true,
      bot: {
        id: botUser.id,
        username: botUser.username,
        discriminator: botUser.discriminator || "0",
      },
      application: {
        id: appInfo.id,
        name: appInfo.name,
        description: appInfo.description,
        intents: {
          messageContent: appInfo.flags & (1 << 19) ? "enabled" : "limited",
        },
      },
      elapsedMs,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startTime,
    }
  }
}
```

### Phase 7: Create the Plugin Definition

Combine everything into the plugin object.

**File: `src/plugin.ts`**

```typescript
import { ChannelPlugin, ResolvedDiscordAccount } from "./types/index.js"
import { DiscordConfigSchema } from "./config/schema.js"
import { ConfigManager } from "./config/manager.js"
import { PairingStore } from "./security/pairing.js"
import { resolveDmPolicy, isDmAllowed } from "./security/dm-policy.js"
import { DiscordBot } from "./gateway/bot.js"
import { MessageSender } from "./outbound/sender.js"
import { probeDiscord } from "./status/probe.js"
import { handleMessage } from "./handlers/message.js"
import { handleInteraction } from "./handlers/interaction.js"

const DEFAULT_ACCOUNT_ID = "default"

// Store runtime state
const bots = new Map<string, DiscordBot>()
const configManager = new ConfigManager()
const pairingStore = new PairingStore()

export const discordPlugin: ChannelPlugin<ResolvedDiscordAccount> = {
  id: "discord",
  meta: {
    name: "Discord",
    description: "Discord bot integration",
    icon: "discord",
  },

  capabilities: {
    chatTypes: ["direct", "channel", "thread"],
    polls: false,
    reactions: true,
    threads: true,
    media: true,
    nativeCommands: true,
  },

  streaming: {
    blockStreamingCoalesceDefaults: { minChars: 1500, idleMs: 1000 },
  },

  reload: { configPrefixes: ["channels.discord"] },

  configSchema: DiscordConfigSchema,

  config: {
    listAccountIds: () => configManager.listAccountIds(),

    resolveAccount: (accountId: string) => configManager.resolveAccount(accountId),

    defaultAccountId: () => configManager.resolveDefaultAccountId(),

    setAccountEnabled: ({ accountId, enabled }: { accountId: string; enabled: boolean }) => {
      configManager.setAccountEnabled(accountId, enabled)
    },

    deleteAccount: ({ accountId }: { accountId: string }) => {
      configManager.deleteAccount(accountId)
    },

    isConfigured: (account: ResolvedDiscordAccount) => Boolean(account.token?.trim()),

    describeAccount: (account: ResolvedDiscordAccount) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
    }),

    resolveAllowFrom: ({ account }: { account: ResolvedDiscordAccount }) => {
      return account.config.dm?.allowFrom?.map(String) ?? []
    },

    formatAllowFrom: ({ allowFrom }: { allowFrom: string[] }) => {
      return allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase())
    },
  },

  security: {
    resolveDmPolicy: ({ account }: { account: ResolvedDiscordAccount }) => {
      return resolveDmPolicy(account, configManager.get())
    },

    collectWarnings: ({ account }: { account: ResolvedDiscordAccount }) => {
      const warnings: string[] = []
      const groupPolicy = account.config.groupPolicy ?? "allowlist"
      const guildsConfigured = Object.keys(account.config.guilds ?? {}).length > 0

      if (groupPolicy === "open" && !guildsConfigured) {
        warnings.push(
          `Discord guilds: groupPolicy="open" with no guild allowlist; any channel can trigger (mention-gated). Set channels.discord.groupPolicy="allowlist" and configure channels.discord.guilds.`,
        )
      }

      return warnings
    },
  },

  mentions: {
    stripPatterns: () => ["<@!?\\d+>"],
  },

  messaging: {
    normalizeTarget: (target: string) => {
      if (target.startsWith("user:") || target.startsWith("channel:")) {
        return target
      }
      return `channel:${target}`
    },
    targetResolver: {
      looksLikeId: (id: string) => /^\d{17,20}$/.test(id),
      hint: "<channelId|user:ID|channel:ID>",
    },
  },

  outbound: {
    deliveryMode: "direct",
    chunker: null,
    textChunkLimit: 2000,
    pollMaxOptions: 10,

    sendText: async ({ to, text, accountId, replyToId }) => {
      const sender = new MessageSender(bots)
      const result = await sender.sendText(to, text, {
        accountId: accountId ?? undefined,
        replyTo: replyToId ?? undefined,
      })
      return { channel: "discord", ...result }
    },

    sendMedia: async ({ to, text, mediaUrl, accountId, replyToId }) => {
      const sender = new MessageSender(bots)
      const result = await sender.sendMedia(to, text, mediaUrl, {
        accountId: accountId ?? undefined,
        replyTo: replyToId ?? undefined,
      })
      return { channel: "discord", ...result }
    },
  },

  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },

    collectStatusIssues: ({ account }) => {
      const issues = []
      if (!account.token?.trim()) {
        issues.push({ level: "error", message: "Discord token not configured" })
      }
      return issues
    },

    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      tokenSource: snapshot.tokenSource ?? "none",
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
    }),

    probeAccount: async ({ account, timeoutMs }) => {
      return probeDiscord(account.token!, timeoutMs)
    },

    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      application: probe?.application,
      bot: probe?.bot,
    }),
  },

  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account
      const token = account.token?.trim() || process.env.DISCORD_BOT_TOKEN

      if (!token) {
        throw new Error("No Discord token available")
      }

      // Probe bot info
      let botLabel = ""
      try {
        const probe = await probeDiscord(token, 2500)
        if (probe.ok && probe.bot?.username) {
          botLabel = ` (@${probe.bot.username})`
          ctx.setStatus({ bot: probe.bot, application: probe.application })
        }
      } catch (err) {
        // Probe failed but continue anyway
      }

      ctx.log?.info(`[${account.accountId}] Starting Discord bot${botLabel}`)

      // Create bot instance
      const bot = new DiscordBot({
        account,
        config: configManager,
        pairing: pairingStore,
        onMessage: (msg) => handleMessage(msg, ctx),
        onInteraction: (interaction) => handleInteraction(interaction, ctx),
      })

      bots.set(account.accountId, bot)
      await bot.start()

      // Watch for abort signal
      if (ctx.abortSignal) {
        ctx.abortSignal.addEventListener("abort", () => {
          bot.stop()
          bots.delete(account.accountId)
        })
      }
    },

    stopAccount: async (ctx) => {
      const bot = bots.get(ctx.account.accountId)
      if (bot) {
        ctx.log?.info(`[${ctx.account.accountId}] Stopping Discord bot`)
        await bot.stop()
        bots.delete(ctx.account.accountId)
      }
    },
  },
}

// Export for use in handlers
export { configManager, pairingStore, bots }
```

### Phase 8: Update Entry Point

Modify `src/index.ts` to use the plugin.

**File: `src/index.ts`**

```typescript
import { config } from "dotenv"
import { discordPlugin, configManager, pairingStore } from "./plugin.js"

// Load environment variables
config()

async function main() {
  // Load configuration
  await configManager.load()
  await pairingStore.load()

  // Check if enabled
  const cfg = configManager.get()
  if (!cfg.enabled) {
    console.log("Discord plugin is disabled")
    process.exit(0)
  }

  // Get default account
  const defaultAccountId = discordPlugin.config.defaultAccountId()
  const account = discordPlugin.config.resolveAccount(defaultAccountId)

  if (!discordPlugin.config.isConfigured(account)) {
    console.error("❌ Discord is not configured. Set DISCORD_BOT_TOKEN or configure channels.discord.token")
    process.exit(1)
  }

  console.log("🚀 Starting Discord plugin...")

  // Create abort controller for graceful shutdown
  const abortController = new AbortController()

  // Setup graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down...")
    abortController.abort()
  })

  process.on("SIGTERM", () => {
    console.log("\n👋 Shutting down...")
    abortController.abort()
  })

  // Start gateway
  const log = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }

  const runtime = {}

  await discordPlugin.gateway.startAccount({
    account,
    cfg,
    runtime,
    abortSignal: abortController.signal,
    log,
    setStatus: (status) => {
      console.log("Status update:", status)
    },
  })

  console.log("✅ Discord bot is running")

  // Keep alive
  await new Promise((resolve) => {
    abortController.signal.addEventListener("abort", resolve)
  })

  // Stop on abort
  await discordPlugin.gateway.stopAccount?.({
    account,
    cfg,
    runtime,
    abortSignal: abortController.signal,
    log,
    setStatus: () => {},
  })
}

main().catch((error) => {
  console.error("❌ Failed to start:", error)
  process.exit(1)
})
```

### Phase 9: Add CLI Commands

Create CLI commands for managing the plugin.

**File: `src/cli/pairing.ts`**

```typescript
// CLI command to approve pairing codes
export function registerPairingCommands(program: any) {
  program
    .command("pairing approve discord <code>")
    .description("Approve a Discord pairing code")
    .action(async (code: string) => {
      const { pairingStore } = await import("../plugin.js")
      await pairingStore.load()

      const result = pairingStore.approveCode(code)

      if (result.success) {
        await pairingStore.save()
        console.log(`✅ Approved pairing for user ${result.userId}`)
      } else {
        console.error(`❌ ${result.error}`)
        process.exit(1)
      }
    })

  program
    .command("pairing list discord")
    .description("List paired Discord users")
    .action(async () => {
      const { pairingStore } = await import("../plugin.js")
      await pairingStore.load()

      const users = pairingStore.listPairedUsers()
      if (users.length === 0) {
        console.log("No paired users")
      } else {
        console.log("Paired users:")
        users.forEach((id) => console.log(`  - ${id}`))
      }
    })

  program
    .command("pairing remove discord <userId>")
    .description("Remove a paired Discord user")
    .action(async (userId: string) => {
      const { pairingStore } = await import("../plugin.js")
      await pairingStore.load()

      pairingStore.removePairing(userId)
      await pairingStore.save()
      console.log(`✅ Removed pairing for user ${userId}`)
    })
}
```

### Phase 10: Testing and Validation

**Test checklist:**

1. **Configuration tests**
   - [ ] Load config from file
   - [ ] Fallback to environment variables
   - [ ] Multi-account support
   - [ ] Config validation

2. **Security tests**
   - [ ] DM policy: open (allows all)
   - [ ] DM policy: allowlist (blocks non-allowed)
   - [ ] DM policy: pairing (generates code)
   - [ ] DM policy: disabled (rejects all)
   - [ ] Pairing code generation
   - [ ] Pairing code approval
   - [ ] Mention stripping in channels

3. **Gateway tests**
   - [ ] Bot starts successfully
   - [ ] Health probe returns correct info
   - [ ] Graceful shutdown
   - [ ] Multiple account startup

4. **Outbound tests**
   - [ ] Send text message
   - [ ] Send text with reply
   - [ ] Send media
   - [ ] Message chunking (2000 char limit)
   - [ ] Channel resolution (channel:ID, user:ID)

5. **Integration tests**
   - [ ] Message handling with session
   - [ ] Slash command handling
   - [ ] File attachments
   - [ ] Thread creation

## File Structure After Migration

```
packages/discord/
├── src/
│   ├── index.ts              # Entry point (updated)
│   ├── plugin.ts             # Main plugin definition (new)
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   ├── plugin.ts         # Plugin types
│   │   ├── config.ts         # Config types
│   │   └── account.ts        # Account types
│   ├── config/
│   │   ├── schema.ts         # Zod schemas
│   │   ├── manager.ts        # Config management
│   │   └── migrate.ts        # Env -> config migration
│   ├── security/
│   │   ├── dm-policy.ts      # DM policy logic
│   │   ├── pairing.ts        # Pairing store
│   │   └── allowlist.ts      # Allowlist helpers
│   ├── gateway/
│   │   ├── bot.ts            # Discord.js wrapper
│   │   ├── monitor.ts        # Health monitoring
│   │   └── handler.ts        # Event handlers
│   ├── outbound/
│   │   ├── sender.ts         # Message sender
│   │   ├── formatter.ts      # Message formatting
│   │   └── chunker.ts        # Message chunking
│   ├── status/
│   │   ├── probe.ts          # Health probes
│   │   ├── audit.ts          # Permission auditing
│   │   └── snapshot.ts       # Status snapshots
│   ├── handlers/
│   │   ├── message.ts        # Message handling (updated)
│   │   └── interaction.ts    # Slash command handling (updated)
│   ├── commands/
│   │   ├── ask.ts
│   │   ├── session.ts
│   │   ├── agent.ts
│   │   ├── model.ts
│   │   ├── mcp.ts
│   │   ├── connect.ts
│   │   ├── status.ts
│   │   └── help.ts
│   ├── utils/
│   │   ├── session.ts
│   │   └── discord.ts
│   ├── cli/
│   │   └── pairing.ts        # CLI commands
│   └── runtime.ts            # Runtime accessor
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Dependencies to Add

```json
{
  "dependencies": {
    "@opencode-ai/sdk": "workspace:*",
    "discord.js": "^14.17.0",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  }
}
```

## Migration Order

1. Create types and schemas (Phase 1-2)
2. Implement config layer (Phase 2)
3. Implement security layer (Phase 3)
4. Implement gateway layer (Phase 4)
5. Implement outbound layer (Phase 5)
6. Implement status layer (Phase 6)
7. Create plugin definition (Phase 7)
8. Update entry point (Phase 8)
9. Add CLI commands (Phase 9)
10. Test and validate (Phase 10)

Each phase should be independently testable. Don't move to the next phase until the current one is working.
