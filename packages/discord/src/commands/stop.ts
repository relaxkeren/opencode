import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { createSuccessEmbed, createErrorEmbed } from "../utils/discord.js"

export const stopCommand = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stop the Discord bot")

export async function handleStopCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  await interaction.deferReply()

  try {
    await interaction.editReply({
      embeds: [createSuccessEmbed("Stopping Bot", "The bot is shutting down...")],
    })

    // Wait a moment for the message to be sent, then exit
    setTimeout(() => {
      console.log("[stop] Shutting down bot...")
      process.exit(0)
    }, 1000)
  } catch (error) {
    console.error("Stop command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("Failed to stop the bot")],
    })
  }
}
