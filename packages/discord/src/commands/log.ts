import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

export const logCommand = new SlashCommandBuilder()
  .setName("log")
  .setDescription("Show the Discord bot service log")
  .addIntegerOption((option) =>
    option
      .setName("lines")
      .setDescription("Number of lines to show (default: 50)")
      .setMinValue(1)
      .setMaxValue(500)
      .setRequired(false),
  )

export async function handleLogCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const lines = interaction.options.getInteger("lines") || 50

  await interaction.deferReply()

  try {
    const logPath = path.join(os.homedir(), ".local", "share", "opencode", "log", "discord-out.log")

    if (!fs.existsSync(logPath)) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Log file not found. Make sure the bot is running as a Windows Service.")],
      })
      return
    }

    const content = fs.readFileSync(logPath, "utf-8")
    const logLines = content.split("\n")
    const lastLines = logLines.slice(-lines).join("\n")

    if (lastLines.length > 1900) {
      const buffer = Buffer.from(lastLines, "utf-8")
      await interaction.editReply({
        content: `📜 Log (last ${lines} lines):`,
        files: [
          {
            attachment: buffer,
            name: "discord-out.log",
          },
        ],
      })
    } else {
      await interaction.editReply({
        embeds: [createInfoEmbed(`📜 Bot Log (last ${lines} lines)`)],
        content: `\`\`\`\n${lastLines}\n\`\`\``,
      })
    }
  } catch (error) {
    console.error("Log command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("Failed to read log file")],
    })
  }
}
