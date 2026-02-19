import { z } from "zod"
import {
  ChannelPlugin,
  ResolvedDiscordAccount,
  DiscordConfig,
  DiscordConfigSchema,
  AccountSnapshot,
  ChannelSummary,
  ProbeResult,
  Logger,
} from "./types/index.js"
import { ConfigManager, getConfigManager } from "./config/manager.js"
import { PairingStore, getPairingStore } from "./security/pairing.js"
import { resolveDmPolicy, isDmAllowed, collectSecurityWarnings } from "./security/dm-policy.js"
import { DiscordBot, registerBot, unregisterBot, getAllBots } from "./gateway/bot.js"
import { MessageSender } from "./outbound/sender.js"
import { probeDiscord, collectStatusIssues } from "./status/probe.js"
import { handleMessage } from "./handlers/message.js"
import { handleInteraction } from "./handlers/interaction.js"

const DEFAULT_ACCOUNT_ID = "default"

// Store runtime state
let configManager: ConfigManager | null = null
let pairingStore: PairingStore | null = null

function getConfig(): ConfigManager {
  if (!configManager) {
    configManager = getConfigManager()
  }
  return configManager
}

function getPairing(): PairingStore {
  if (!pairingStore) {
    pairingStore = getPairingStore()
  }
  return pairingStore
}

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

  configSchema: DiscordConfigSchema as z.ZodSchema,

  config: {
    listAccountIds: () => getConfig().listAccountIds(),

    resolveAccount: (accountId: string) => getConfig().resolveAccount(accountId),

    defaultAccountId: () => getConfig().resolveDefaultAccountId(),

    setAccountEnabled: (params: { accountId: string; enabled: boolean }) => {
      getConfig().setAccountEnabled(params.accountId, params.enabled)
    },

    deleteAccount: (params: { accountId: string }) => {
      getConfig().deleteAccount(params.accountId)
    },

    isConfigured: (account: ResolvedDiscordAccount) => Boolean(account.token?.trim()),

    describeAccount: (account: ResolvedDiscordAccount) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
    }),

    resolveAllowFrom: (params: { account: ResolvedDiscordAccount }) => {
      return params.account.config.dm?.allowFrom?.map(String) ?? []
    },

    formatAllowFrom: (params: { allowFrom: string[] }) => {
      return params.allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase())
    },
  },

  security: {
    resolveDmPolicy: (params: { cfg: DiscordConfig; accountId: string; account: ResolvedDiscordAccount }) => {
      return resolveDmPolicy(params.account, params.cfg)
    },

    collectWarnings: (params: { account: ResolvedDiscordAccount; cfg: DiscordConfig }) => {
      return collectSecurityWarnings(params.account, params.cfg)
    },
  },

  mentions: {
    stripPatterns: () => ["<@!?\\d+>"],
  },

  threading: {
    resolveReplyToMode: (params: { cfg: DiscordConfig }) => {
      return params.cfg.replyToMode ?? "off"
    },
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

    sendText: async (params: { to: string; text: string; accountId?: string; replyToId?: string }) => {
      const sender = new MessageSender()
      return await sender.sendText(params.to, params.text, {
        accountId: params.accountId ?? undefined,
        replyTo: params.replyToId ?? undefined,
      })
    },

    sendMedia: async (params: {
      to: string
      text?: string
      mediaUrl: string
      accountId?: string
      replyToId?: string
    }) => {
      const sender = new MessageSender()
      return await sender.sendMedia(params.to, params.text, params.mediaUrl, {
        accountId: params.accountId ?? undefined,
        replyTo: params.replyToId ?? undefined,
      })
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

    collectStatusIssues: (params: { account: ResolvedDiscordAccount }) => {
      return collectStatusIssues({ account: params.account })
    },

    buildChannelSummary: (params: { snapshot: AccountSnapshot }): ChannelSummary => ({
      configured: params.snapshot.configured ?? false,
      tokenSource: params.snapshot.tokenSource ?? "none",
      running: params.snapshot.running ?? false,
      lastStartAt: params.snapshot.lastStartAt ?? null,
      lastStopAt: params.snapshot.lastStopAt ?? null,
      lastError: params.snapshot.lastError ?? null,
    }),

    probeAccount: async (params: { account: ResolvedDiscordAccount; timeoutMs: number }): Promise<ProbeResult> => {
      const token = params.account.token
      if (!token) {
        return {
          ok: false,
          error: "No token available",
          elapsedMs: 0,
        }
      }
      return probeDiscord(token, params.timeoutMs)
    },

    buildAccountSnapshot: (params: {
      account: ResolvedDiscordAccount
      runtime: unknown
      probe?: ProbeResult
    }): AccountSnapshot => {
      const runtime = params.runtime as {
        running?: boolean
        lastStartAt?: Date | null
        lastStopAt?: Date | null
        lastError?: string | null
      }
      return {
        accountId: params.account.accountId,
        name: params.account.name,
        enabled: params.account.enabled,
        configured: Boolean(params.account.token?.trim()),
        tokenSource: params.account.tokenSource,
        running: runtime?.running ?? false,
        lastStartAt: runtime?.lastStartAt ?? null,
        lastStopAt: runtime?.lastStopAt ?? null,
        lastError: runtime?.lastError ?? null,
        application: params.probe?.application,
        bot: params.probe?.bot,
      }
    },
  },

  gateway: {
    startAccount: async (ctx: {
      account: ResolvedDiscordAccount
      cfg: DiscordConfig
      runtime: unknown
      abortSignal: AbortSignal
      log?: Logger
      setStatus: (status: unknown) => void
    }) => {
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
      const cfg = getConfig()
      const pairing = getPairing()

      const bot = new DiscordBot({
        account,
        config: cfg,
        pairing: pairing,
        onMessage: async (msg) => {
          // We'll handle this in the handlers
          await handleMessage(msg, cfg, pairing)
        },
        onInteraction: async (interaction) => {
          await handleInteraction(interaction, cfg, pairing)
        },
      })

      registerBot(account.accountId, bot)
      await bot.start()

      ctx.setStatus({
        running: true,
        lastStartAt: new Date(),
      })

      // Watch for abort signal
      if (ctx.abortSignal) {
        ctx.abortSignal.addEventListener("abort", () => {
          bot.stop()
          unregisterBot(account.accountId)
        })
      }
    },

    stopAccount: async (ctx: {
      account: ResolvedDiscordAccount
      cfg: DiscordConfig
      runtime: unknown
      abortSignal: AbortSignal
      log?: Logger
      setStatus: (status: unknown) => void
    }) => {
      const bot = getAllBots().get(ctx.account.accountId)
      if (bot) {
        ctx.log?.info(`[${ctx.account.accountId}] Stopping Discord bot`)
        await bot.stop()
        unregisterBot(ctx.account.accountId)
        ctx.setStatus({
          running: false,
          lastStopAt: new Date(),
        })
      }
    },
  },
}

// Export for use in other modules
export { getConfig, getPairing, getAllBots }
export { ConfigManager, PairingStore }
export { discordPlugin as default }
