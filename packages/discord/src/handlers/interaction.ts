import type { Interaction, CacheType } from "discord.js"
import { handleAskCommand } from "../commands/ask.js"
import { handleSessionCommand } from "../commands/session.js"
import { handleAgentCommand } from "../commands/agent.js"
import { handleModelCommand } from "../commands/model.js"
import { handleMcpCommand } from "../commands/mcp.js"
import { handleConnectCommand } from "../commands/connect.js"
import { handleStatusCommand } from "../commands/status.js"
import { handleHelpCommand } from "../commands/help.js"
import { handleStopCommand } from "../commands/stop.js"
import { handleRestartCommand } from "../commands/restart.js"
import { handleLogCommand } from "../commands/log.js"
import { getAllCommands } from "../commands/registry.js"
import { ConfigManager } from "../config/manager.js"
import { PairingStore } from "../security/pairing.js"

export async function handleInteraction(
  interaction: Interaction<CacheType>,
  _config?: ConfigManager,
  _pairing?: PairingStore,
) {
  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    const commands = getAllCommands()
    const command = commands.find((cmd) => cmd.builder.name === interaction.commandName)

    if (command?.autocomplete) {
      const focusedOption = interaction.options.getFocused(true)
      const autocompleteHandler = command.autocomplete[focusedOption.name]

      if (autocompleteHandler) {
        try {
          await autocompleteHandler(interaction)
        } catch (error) {
          console.error(`Autocomplete error for ${command.key}.${focusedOption.name}:`, error)
          await interaction.respond([])
        }
        return
      }
    }

    await interaction.respond([])
    return
  }

  // Handle slash commands
  if (!interaction.isChatInputCommand()) return

  console.log(`[interaction] Received command: ${interaction.commandName}`)
  const { commandName } = interaction

  try {
    switch (commandName) {
      case "ask":
        await handleAskCommand(interaction)
        break
      case "session":
        await handleSessionCommand(interaction)
        break
      case "agent":
        await handleAgentCommand(interaction)
        break
      case "model":
        await handleModelCommand(interaction)
        break
      case "mcp":
        await handleMcpCommand(interaction)
        break
      case "connect":
        await handleConnectCommand(interaction)
        break
      case "status":
        await handleStatusCommand(interaction)
        break
      case "help":
        await handleHelpCommand(interaction)
        break
      case "stop":
        await handleStopCommand(interaction)
        break
      case "restart":
        await handleRestartCommand(interaction)
        break
      case "log":
        await handleLogCommand(interaction)
        break
      default:
        console.log(`Unknown command: ${commandName}`)
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error)

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ An error occurred while processing the command.",
        ephemeral: true,
      })
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: "❌ An error occurred while processing the command.",
      })
    }
  }
}
