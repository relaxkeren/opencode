import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { getSessionByKey } from "../utils/session.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"

export const connectCommand = new SlashCommandBuilder()
  .setName("connect")
  .setDescription("Connect AI provider (OAuth or instructions)")

export async function handleConnectCommand(interaction: ChatInputCommandInteraction<CacheType>) {
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
        embeds: [createErrorEmbed("No active session in this channel. Create one first with /session create")],
      })
      return
    }

    // Get available auth methods
    const authResult = await session.client.provider.auth()

    if (authResult.error || !authResult.data) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Failed to get provider auth methods")],
      })
      return
    }

    let message = "**Available Providers:**\n\n"

    for (const [providerID, methods] of Object.entries(authResult.data)) {
      message += `**${providerID}**\n`
      methods.forEach((method: any, index: number) => {
        message += `  ${index + 1}. ${method.label} (${method.type})\n`
      })
      message += "\n"
    }

    message += "\n**To connect a provider:**\n"
    message += "• For OAuth providers, I'll provide a link you can click\n"
    message += "• For API key providers, please set the API key in your environment and restart the bot\n\n"
    message += "Use `/connect <provider> <method>` to initiate OAuth flow (coming soon)"

    await interaction.editReply({
      embeds: [createInfoEmbed("Connect Provider", message)],
    })
  } catch (error) {
    console.error("Connect command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
  }
}
