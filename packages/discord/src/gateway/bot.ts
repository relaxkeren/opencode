import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Message,
  Interaction,
  TextChannel,
  ThreadChannel,
} from "discord.js"
import { ResolvedDiscordAccount } from "../types/index.js"
import { ConfigManager } from "../config/manager.js"
import { PairingStore } from "../security/pairing.js"
import { resolveDmPolicy, isDmAllowed } from "../security/dm-policy.js"

export interface DiscordBotOptions {
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
  private lastError: string | null = null

  constructor(options: DiscordBotOptions) {
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
      this.lastError = null
    })

    this.client.on(Events.MessageCreate, async (message) => {
      // Skip bot messages
      if (message.author.bot) return

      // Check DM policy
      if (message.channel.isDMBased()) {
        // Reload pairing store to get latest approvals from disk
        await this.pairing.load()

        const cfg = this.config.get()
        const policy = resolveDmPolicy(this.account, cfg)
        const check = isDmAllowed(message.author.id, policy, this.getPairedUsers())

        if (!check.allowed) {
          if (policy.policy === "pairing") {
            // Generate pairing code and save it
            const code = this.pairing.generateCode(message.author.id, this.account.accountId)
            await this.pairing.save()
            await message.reply(
              `🔐 This bot requires pairing to use DMs.\n` +
                `Your pairing code: **${code}**\n` +
                `${policy.approveHint}\n\n` +
                `Run: opencode-discord pairing approve ${code}`,
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
      this.lastError = error instanceof Error ? error.message : String(error)
      console.error(`[${this.account.accountId}] Discord client error:`, error)
    })

    this.client.on(Events.ShardDisconnect, (event, id) => {
      console.log(`[${this.account.accountId}] Shard ${id} disconnected`)
    })

    this.client.on(Events.ShardReconnecting, (id) => {
      console.log(`[${this.account.accountId}] Shard ${id} reconnecting`)
    })
  }

  private getPairedUsers(): Set<string> {
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

  getLastError(): string | null {
    return this.lastError
  }

  getClient(): Client {
    return this.client
  }

  getAccountId(): string {
    return this.account.accountId
  }
}

// Store for all active bots
const bots = new Map<string, DiscordBot>()

export function registerBot(accountId: string, bot: DiscordBot): void {
  bots.set(accountId, bot)
}

export function unregisterBot(accountId: string): void {
  bots.delete(accountId)
}

export function getBot(accountId: string): DiscordBot | undefined {
  return bots.get(accountId)
}

export function listBots(): DiscordBot[] {
  return Array.from(bots.values())
}

export function getAllBots(): Map<string, DiscordBot> {
  return bots
}
