import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { getSessionByKey } from "../utils/session.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import { createInfoEmbed, createErrorEmbed } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"

export const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show opencode server and session status")

export async function handleStatusCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const userId = interaction.user.id
  const channel = interaction.channel

  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) {
    await interaction.reply({
      embeds: [createErrorEmbed("This command can only be used in text channels")],
      ephemeral: true,
    })
    return
  }

  const sessionKey = channel.isDMBased()
    ? getDMSessionKey(userId)
    : getSessionKey(channel as TextChannel | ThreadChannel, userId)

  await interaction.deferReply()

  try {
    const session = await getSessionByKey(sessionKey)

    if (!session) {
      await interaction.editReply({
        embeds: [createInfoEmbed("Status", "No active session in this channel.\nServer: ✅ Online")],
      })
      return
    }

    // Get session status
    const statusResult = await session.client.session.status()

    if (statusResult.error || !statusResult.data) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Failed to get session status")],
      })
      return
    }

    const sessionStatus = statusResult.data[session.sessionId]

    let message = "**OpenCode Server:** ✅ Online\n\n"
    message += `**Current Session:**\n`
    message += `• ID: ${session.sessionId}\n`
    message += `• Status: ${sessionStatus || "idle"}\n`
    message += `• Last Activity: ${session.lastActivity.toLocaleString()}\n`
    if (session.agent) {
      message += `• Agent: ${session.agent}\n`
    }
    if (session.model) {
      message += `• Model: ${session.model.providerID}/${session.model.modelID}\n`
    }

    await interaction.editReply({
      embeds: [createInfoEmbed("Status", message)],
    })
  } catch (error) {
    console.error("Status command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
  }
}
