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
  console.log("[log] Handling log command, lines:", lines)

  await interaction.deferReply()

  try {
    const possiblePaths = [
      // Actual user profile (where OpenCode daemon writes logs)
      path.join("C:\\Users\\Ke", ".local", "share", "opencode", "log", "discord-out.log"),
      // Windows Service user profile path (LocalSystem)
      path.join(process.env.USERPROFILE || os.homedir(), ".local", "share", "opencode", "log", "discord-out.log"),
      // Manual run path
      path.join(os.homedir(), ".local", "share", "opencode", "log", "discord-out.log"),
      // Legacy path relative to cwd
      path.join(process.cwd(), "logs", "service-out.log"),
    ]
    console.log("[log] USERPROFILE:", process.env.USERPROFILE)
    console.log("[log] homedir:", os.homedir())
    console.log("[log] cwd:", process.cwd())
    console.log("[log] checking paths:", possiblePaths)

    let logPath: string | null = null
    for (const p of possiblePaths) {
      console.log("[log] checking:", p, "exists:", fs.existsSync(p))
      if (fs.existsSync(p)) {
        logPath = p
        break
      }
    }

    if (!logPath) {
      console.log("[log] No log file found")
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            "Log file not found. The bot is not running as a Windows Service, or logs are in an unexpected location.",
          ),
        ],
      })
      return
    }

    console.log("[log] Found log at:", logPath)
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
