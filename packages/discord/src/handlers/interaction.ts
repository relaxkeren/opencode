import type { Interaction, CacheType } from "discord.js"
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
    const commands = getAllCommands()
    const command = commands.find((cmd) => cmd.key === commandName)

    if (!command) {
      console.log(`Unknown command: ${commandName}`)
      return
    }

    await command.handle(interaction)
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
