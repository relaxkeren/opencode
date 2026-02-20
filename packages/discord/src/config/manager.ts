import { existsSync } from "fs"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname } from "path"
import { homedir } from "os"
import { DiscordConfig, DiscordConfigSchema, ResolvedDiscordAccount } from "../types/index.js"

const CONFIG_FILE = "opencode.discord.json"

export class ConfigManager {
  private configPath: string
  private config: DiscordConfig | null = null

  constructor(stateDir?: string) {
    const baseDir = stateDir || process.env.OPENCODE_STATE_DIR || `${homedir()}/.opencode`
    this.configPath = `${baseDir}/${CONFIG_FILE}`
  }

  async load(): Promise<DiscordConfig> {
    if (!existsSync(this.configPath)) {
      // Check for env-based config
      const envToken = process.env.DISCORD_BOT_TOKEN
      this.config = {
        enabled: Boolean(envToken),
        token: envToken || undefined,
        guilds: {},
        groupPolicy: "allowlist",
        commands: { native: "auto" },
        mediaMaxMb: 8,
        historyLimit: 100,
        replyToMode: "off",
      }
      return this.config
    }

    const content = await readFile(this.configPath, "utf-8")
    const parsed = JSON.parse(content)
    this.config = DiscordConfigSchema.parse(parsed)
    return this.config
  }

  async save(config?: DiscordConfig): Promise<void> {
    const cfg = config || this.config
    if (!cfg) throw new Error("Config not loaded")

    // Ensure directory exists
    const dir = dirname(this.configPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(this.configPath, JSON.stringify(cfg, null, 2))
    this.config = cfg
  }

  get(): DiscordConfig {
    if (!this.config) throw new Error("Config not loaded")
    return this.config
  }

  getConfigPath(): string {
    return this.configPath
  }

  resolveDefaultAccountId(): string {
    const cfg = this.get()
    const accounts = Object.keys(cfg.accounts || {})
    if (accounts.length === 0) return "default"
    // Prefer "default" if it exists, otherwise first account
    if (accounts.includes("default")) return "default"
    return accounts[0]
  }

  resolveAccount(accountId: string): ResolvedDiscordAccount {
    const cfg = this.get()
    const isDefault = accountId === "default"

    if (isDefault || !cfg.accounts?.[accountId]) {
      // Use base config for default account
      const token = cfg.token || process.env.DISCORD_BOT_TOKEN
      return {
        accountId: "default",
        enabled: cfg.enabled ?? true,
        token,
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

  listAccountIds(): string[] {
    const cfg = this.get()
    const ids = Object.keys(cfg.accounts || {})
    // Always include default
    if (!ids.includes("default")) ids.unshift("default")
    return ids
  }

  setAccountEnabled(accountId: string, enabled: boolean): void {
    const cfg = this.get()
    if (accountId === "default") {
      cfg.enabled = enabled
    } else if (cfg.accounts?.[accountId]) {
      cfg.accounts[accountId].enabled = enabled
    }
  }

  deleteAccount(accountId: string): void {
    const cfg = this.get()
    if (cfg.accounts?.[accountId]) {
      delete cfg.accounts[accountId]
    }
  }

  applyAccountName(accountId: string, name?: string): void {
    const cfg = this.get()
    if (accountId === "default") {
      // Default account name goes in base
      if (name) {
        // We could store this somewhere, but for now it's just metadata
      }
    } else if (cfg.accounts?.[accountId]) {
      cfg.accounts[accountId].name = name
    }
  }
}

// Global instance
let globalConfigManager: ConfigManager | null = null

export function getConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager()
  }
  return globalConfigManager
}

export function setConfigManager(manager: ConfigManager): void {
  globalConfigManager = manager
}
