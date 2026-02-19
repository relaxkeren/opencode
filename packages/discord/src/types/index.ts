import type { OpencodeClient } from "@opencode-ai/sdk/v2"

export type ServerHandle = {
  url: string
  close(): void
}

export type SessionData = {
  sessionId: string
  client: OpencodeClient
  server: ServerHandle
  channelId: string
  userId: string
  agent?: string
  model?: {
    providerID: string
    modelID: string
  }
  lastActivity: Date
}

export type CommandContext = {
  session?: SessionData
  sessionKey: string
}

export * from "./plugin.js"
export * from "./config.js"
export * from "./account.js"
