import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { getOrCreateSession } from "../utils/session.js"
import { createInfoEmbed, createErrorEmbed } from "../utils/discord.js"
import { sendTyping } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"
import { handleMessageWithAttachments } from "../utils/session.js"

export const askCommand = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Ask opencode a question")
  .addStringOption((option) => option.setName("question").setDescription("Your question").setRequired(true))

export async function handleAskCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const question = interaction.options.getString("question", true)
  const channel = interaction.channel

  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) {
    await interaction.reply({
      embeds: [createErrorEmbed("This command can only be used in text channels")],
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  try {
    // Show typing indicator
    await sendTyping(channel as TextChannel | ThreadChannel)

    // Get or create session
    const session = await getOrCreateSession({
      author: interaction.user,
      channel,
      content: question,
      attachments: new Map(),
    } as any)

    if (!session) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Failed to create session")],
      })
      return
    }

    // Send prompt
    const result = await session.client.session.prompt({
      path: { id: session.sessionId },
      body: {
        ...(session.model ? { model: session.model } : {}),
        parts: [{ type: "text", text: question }],
      },
    })

    if (result.error) {
      const errorMsg =
        typeof result.error === "object" && "message" in result.error
          ? String((result.error as any).message)
          : "Unknown error"
      await interaction.editReply({
        embeds: [createErrorEmbed(`Failed to get response: ${errorMsg}`)],
      })
      return
    }

    // Build response text - check both info.content and parts (matching Slack integration)
    const response = result.data
    const responseText =
      response.info?.content ||
      response.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") ||
      "No response received"

    // Truncate if too long for Discord
    if (responseText.length > 1900) {
      const buffer = Buffer.from(responseText, "utf-8")
      await interaction.editReply({
        content: "📄 Response:",
        files: [
          {
            attachment: buffer,
            name: "response.txt",
          },
        ],
      })
    } else {
      await interaction.editReply({
        content: responseText,
      })
    }
  } catch (error) {
    console.error("Ask command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing your question")],
    })
  }
}
