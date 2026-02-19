import { config } from "dotenv"
import { discordPlugin, getConfig, getPairing } from "./plugin.js"

// Load environment variables
config()

async function main() {
  // Load configuration
  const configManager = getConfig()
  await configManager.load()

  const pairingStore = getPairing()
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

  const runtime: {
    running: boolean
    lastStartAt: Date | null
    lastStopAt: Date | null
    lastError: string | null
    bot?: unknown
    application?: unknown
  } = {
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
  }

  await discordPlugin.gateway.startAccount({
    account,
    cfg,
    runtime,
    abortSignal: abortController.signal,
    log,
    setStatus: (status: unknown) => {
      Object.assign(runtime, status)
      const statusObj = status as { running?: boolean }
      if (statusObj.running) {
        console.log("✅ Discord bot is running")
      }
    },
  })

  // Keep alive
  await new Promise<void>((resolve) => {
    abortController.signal.addEventListener("abort", () => resolve())
  })

  // Stop on abort
  await discordPlugin.gateway.stopAccount?.({
    account,
    cfg,
    runtime,
    abortSignal: abortController.signal,
    log,
    setStatus: (status) => {
      Object.assign(runtime, status)
    },
  })
}

main().catch((error) => {
  console.error("❌ Failed to start:", error)
  process.exit(1)
})
