import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { getSessionByKey, updateSessionAgent } from "../utils/session.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"

export const agentCommand = new SlashCommandBuilder()
  .setName("agent")
  .setDescription("Agent management commands")
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List available agents"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("switch")
      .setDescription("Switch active agent")
      .addStringOption((option) => option.setName("name").setDescription("Agent name").setRequired(true)),
  )

export async function handleAgentCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const subcommand = interaction.options.getSubcommand()
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

    switch (subcommand) {
      case "list": {
        const result = await session.client.app.agents()

        if (result.error || !result.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to list agents")],
          })
          return
        }

        const agents = result.data
          .filter((a: any) => !a.hidden && a.mode !== "subagent")
          .map((a: any) => `• **${a.name}** - ${a.description || "No description"} (${a.mode})`)
          .join("\n")

        await interaction.editReply({
          embeds: [createInfoEmbed("Available Agents", agents || "No agents found")],
        })
        break
      }

      case "switch": {
        const agentName = interaction.options.getString("name", true)

        // Verify agent exists
        const result = await session.client.app.agents()

        if (result.error || !result.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to list agents")],
          })
          return
        }

        const agent = result.data.find((a: any) => a.name === agentName)
        if (!agent) {
          await interaction.editReply({
            embeds: [createErrorEmbed(`Agent "${agentName}" not found. Use /agent list to see available agents.`)],
          })
          return
        }

        // Update session agent (local state)
        updateSessionAgent(sessionKey, agentName)

        await interaction.editReply({
          embeds: [createSuccessEmbed("Agent Switched", `Active agent set to: ${agentName}`)],
        })
        break
      }

      default:
        await interaction.editReply({
          embeds: [createErrorEmbed("Unknown subcommand")],
        })
    }
  } catch (error) {
    console.error("Agent command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
  }
}
