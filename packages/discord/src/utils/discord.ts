import type { TextChannel, ThreadChannel, Message } from "discord.js"
import { EmbedBuilder } from "discord.js"
import type { SessionData } from "../types/index.js"

export function getSessionKey(channel: TextChannel | ThreadChannel, userId: string): string {
  if (channel.isThread()) {
    return `discord:${channel.guildId}:${channel.parentId}:${channel.id}:${userId}`
  }
  return `discord:${channel.guildId}:${channel.id}:${userId}`
}

export function getDMSessionKey(userId: string): string {
  return `discord:dm:${userId}`
}

export async function sendTyping(channel: TextChannel | ThreadChannel) {
  try {
    await channel.sendTyping()
  } catch {
    // Ignore errors
  }
}

export function formatCodeBlock(content: string, language?: string): string {
  return `\`\`\`${language || ""}\n${content}\n\`\`\``
}

export function createErrorEmbed(error: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0xff0000).setTitle("❌ Error").setDescription(error)
}

export function createSuccessEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(0x00ff00).setTitle(`✅ ${title}`)

  if (description) {
    embed.setDescription(description)
  }

  return embed
}

export function createInfoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(0x0099ff).setTitle(title)

  if (description) {
    embed.setDescription(description)
  }

  return embed
}

export async function downloadAttachment(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`)
  }
  return response.text()
}

export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength - 3) + "..."
}
