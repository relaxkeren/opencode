import type { DiscordAccountConfig } from "./config.js"

export interface ResolvedDiscordAccount {
  accountId: string
  name?: string
  enabled: boolean
  token?: string
  tokenSource: "config" | "env" | "none"
  config: DiscordAccountConfig
}
