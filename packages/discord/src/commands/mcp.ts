import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { getSessionByKey } from "../utils/session.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"

export const mcpCommand = new SlashCommandBuilder()
  .setName("mcp")
  .setDescription("MCP tool management commands")
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List available MCP integrations"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("toggle")
      .setDescription("Enable or disable an MCP integration")
      .addStringOption((option) => option.setName("name").setDescription("MCP name").setRequired(true)),
  )

export async function handleMcpCommand(interaction: ChatInputCommandInteraction<CacheType>) {
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
        const result = await session.client.mcp.status()

        if (result.error || !result.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to list MCP integrations")],
          })
          return
        }

        const mcps = Object.entries(result.data)
          .map(([name, status]: [string, any]) => {
            const statusEmoji = status.status === "connected" ? "✅" : "❌"
            return `${statusEmoji} **${name}** - ${status.status}`
          })
          .join("\n")

        await interaction.editReply({
          embeds: [createInfoEmbed("MCP Integrations", mcps || "No MCP integrations found")],
        })
        break
      }

      case "toggle": {
        const mcpName = interaction.options.getString("name", true)

        // Get current status
        const statusResult = await session.client.mcp.status()

        if (statusResult.error || !statusResult.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to get MCP status")],
          })
          return
        }

        const mcpStatus = statusResult.data[mcpName]
        if (!mcpStatus) {
          await interaction.editReply({
            embeds: [createErrorEmbed(`MCP "${mcpName}" not found. Use /mcp list to see available integrations.`)],
          })
          return
        }

        // Toggle
        if (mcpStatus.status === "connected") {
          const result = await session.client.mcp.disconnect({ name: mcpName })
          if (result.error) {
            await interaction.editReply({
              embeds: [createErrorEmbed(`Failed to disable MCP: ${mcpName}`)],
            })
            return
          }
          await interaction.editReply({
            embeds: [createSuccessEmbed("MCP Disabled", `${mcpName} has been disabled`)],
          })
        } else {
          const result = await session.client.mcp.connect({ name: mcpName })
          if (result.error) {
            await interaction.editReply({
              embeds: [createErrorEmbed(`Failed to enable MCP: ${mcpName}`)],
            })
            return
          }
          await interaction.editReply({
            embeds: [createSuccessEmbed("MCP Enabled", `${mcpName} has been enabled`)],
          })
        }
        break
      }

      default:
        await interaction.editReply({
          embeds: [createErrorEmbed("Unknown subcommand")],
        })
    }
  } catch (error) {
    console.error("MCP command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
  }
}
