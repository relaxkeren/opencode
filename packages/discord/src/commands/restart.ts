import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { createSuccessEmbed, createErrorEmbed } from "../utils/discord.js"
import { spawn } from "node:child_process"

export const restartCommand = new SlashCommandBuilder()
  .setName("restart")
  .setDescription("Restart the Discord bot (Windows Service)")

export async function handleRestartCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  await interaction.deferReply()

  try {
    const serviceName = "OpenCodeDiscordBot"
    
    await interaction.editReply({
      embeds: [createSuccessEmbed("🔄 Restarting Bot", "The bot is restarting. This may take a few seconds...")],
    })

    // Spawn a detached PowerShell process to restart the service
    // This allows the bot to exit before the restart command runs
    const restartScript = `
      Start-Sleep -Seconds 2
      Restart-Service -Name "${serviceName}" -Force
    `
    
    console.log("[restart] Spawning service restart process...")
    
    const child = spawn("powershell.exe", ["-Command", restartScript], {
      detached: true,
      stdio: "ignore",
      windowsHide: true, // Hide the PowerShell window
    })
    
    child.unref() // Allow parent to exit independently
    
    // Exit the bot process - the service manager will restart it
    setTimeout(() => {
      console.log("[restart] Exiting bot process for restart...")
      process.exit(0)
    }, 1000)
    
  } catch (error) {
    console.error("Restart command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("Failed to restart the bot. Try restarting the service manually: Restart-Service OpenCodeDiscordBot")],
    })
  }
}
