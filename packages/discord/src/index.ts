#!/usr/bin/env bun
import { config } from "dotenv"
import { discordPlugin, getConfig, getPairing } from "./plugin.js"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

// Version is injected at build time
const BOT_VERSION = process.env.BOT_VERSION || "opencode-discord development"

// Handle CLI flags before anything else
if (process.argv.includes("--version")) {
  console.log(BOT_VERSION)
  process.exit(0)
}

const isDevMode = process.argv.includes("--dev")

// Load environment variables
config()

// Setup logging
const LOG_DIR = path.join(os.homedir(), ".local", "share", "opencode", "log")
const LOG_FILE = path.join(LOG_DIR, "discord-out.log")
const ERROR_LOG_FILE = path.join(LOG_DIR, "discord-err.log")

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
} catch (err) {
  console.error(`Failed to create log directory: ${LOG_DIR}`)
}

// Create write streams (append mode)
let outStream: fs.WriteStream | null = null
let errStream: fs.WriteStream | null = null

try {
  outStream = fs.createWriteStream(LOG_FILE, { flags: "a" })
  errStream = fs.createWriteStream(ERROR_LOG_FILE, { flags: "a" })
} catch (err) {
  console.error("Failed to open log files, logging to console only")
}

function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level}] ${message}\n`
}

function logToFile(level: string, message: string) {
  const formatted = formatMessage(level, message)
  if (outStream && level !== "ERROR") {
    outStream.write(formatted)
  }
  if (errStream && level === "ERROR") {
    errStream.write(formatted)
  }
}

// Logger with levels
const logger = {
  debug: (...args: unknown[]) => {
    const message = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")
    if (isDevMode) {
      console.log("[DEBUG]", ...args)
      logToFile("DEBUG", message)
    }
  },
  info: (...args: unknown[]) => {
    const message = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")
    console.log(...args)
    logToFile("INFO", message)
  },
  warn: (...args: unknown[]) => {
    const message = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")
    console.warn(...args)
    logToFile("WARN", message)
  },
  error: (...args: unknown[]) => {
    const message = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")
    console.error(...args)
    logToFile("ERROR", message)
  },
}

async function main() {
  // Bootstrap logging
  logger.info("=== Discord Bot Starting ===")
  logger.info(`Version: ${BOT_VERSION}`)
  logger.info(`Mode: ${isDevMode ? "debug" : "production"}`)
  logger.info(`User: ${os.homedir()}`)
  logger.info(`Config: ${path.join(os.homedir(), ".config", "opencode")}`)
  logger.info(`Database: ${path.join(os.homedir(), ".local", "share", "opencode", "opencode.db")}`)
  logger.info(`Log: ${LOG_FILE}`)
  logger.info("")

  // Load configuration
  const configManager = getConfig()
  await configManager.load()

  const pairingStore = getPairing()
  await pairingStore.load()

  // Check if enabled
  const cfg = configManager.get()
  if (!cfg.enabled) {
    logger.info("Discord plugin is disabled")
    process.exit(0)
  }

  // Get default account
  const defaultAccountId = discordPlugin.config.defaultAccountId()
  const account = discordPlugin.config.resolveAccount(defaultAccountId)

  if (!discordPlugin.config.isConfigured(account)) {
    logger.error("Discord is not configured. Set DISCORD_BOT_TOKEN or configure channels.discord.token")
    process.exit(1)
  }

  logger.info("🚀 Starting Discord plugin...")

  // Create abort controller for graceful shutdown
  const abortController = new AbortController()

  // Setup graceful shutdown
  process.on("SIGINT", () => {
    logger.info("👋 Shutting down...")
    outStream?.end()
    errStream?.end()
    abortController.abort()
  })

  process.on("SIGTERM", () => {
    logger.info("👋 Shutting down...")
    outStream?.end()
    errStream?.end()
    abortController.abort()
  })

  // Start gateway
  const log = {
    info: logger.info,
    warn: logger.warn,
    error: logger.error,
    debug: logger.debug,
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
        logger.info("✅ Discord bot is running")
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

  // Close log streams
  outStream?.end()
  errStream?.end()
}

main().catch((error) => {
  logger.error("❌ Failed to start:", error)
  outStream?.end()
  errStream?.end()
  process.exit(1)
})
