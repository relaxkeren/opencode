import type { TextChannel, ThreadChannel, DMChannel } from "discord.js"
import { DiscordBot, getAllBots } from "../gateway/bot.js"
import { SendResult } from "../types/index.js"

export interface SendMessageOptions {
  replyTo?: string
  accountId?: string
}

export class MessageSender {
  private bots: Map<string, DiscordBot>

  constructor(bots?: Map<string, DiscordBot>) {
    this.bots = bots || getAllBots()
  }

  async sendText(to: string, text: string, options: SendMessageOptions = {}): Promise<SendResult> {
    try {
      const bot = this.resolveBot(options.accountId)

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
            ? await channel.send({
                content: chunk,
                reply: { messageReference: options.replyTo },
              })
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

  async sendMedia(
    to: string,
    text: string | undefined,
    mediaUrl: string,
    options: SendMessageOptions = {},
  ): Promise<SendResult> {
    try {
      const bot = this.resolveBot(options.accountId)

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

  private resolveBot(accountId?: string): DiscordBot | undefined {
    if (accountId) {
      return this.bots.get(accountId)
    }
    // Return default or first available
    return this.bots.get("default") || this.bots.values().next().value
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
