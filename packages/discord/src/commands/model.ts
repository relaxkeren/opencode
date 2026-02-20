import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { getSessionByKey, updateSessionModel } from "../utils/session.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"

export const modelCommand = new SlashCommandBuilder()
  .setName("model")
  .setDescription("Model management commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("List available models")
      .addBooleanOption((option) =>
        option.setName("all").setDescription("Show all models (not just connected)").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("current").setDescription("Show current active model"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("switch")
      .setDescription("Switch active model")
      .addStringOption((option) =>
        option.setName("provider").setDescription("Provider ID (e.g., anthropic, openai)").setRequired(true),
      )
      .addStringOption((option) =>
        option.setName("model").setDescription("Model ID (e.g., claude-sonnet-4-20250514)").setRequired(true),
      ),
  )

export async function handleModelCommand(interaction: ChatInputCommandInteraction<CacheType>) {
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
        const allOption = interaction.options.get("all")
        const showAll = allOption ? allOption.value === true : false
        const result = await session.client.provider.list()

        if (result.error || !result.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to list models")],
          })
          return
        }

        const providers = showAll
          ? result.data.all
          : result.data.all.filter((p) => result.data.connected.includes(p.id))

        if (providers.length === 0) {
          const message = showAll
            ? "No providers available"
            : "No connected providers. Use `/connect` to connect a provider, or `/model list --all` to see all available models."
          await interaction.editReply({
            embeds: [createInfoEmbed("Available Models", message)],
          })
          return
        }

        let modelList = ""
        for (const provider of providers) {
          const models = Object.entries(provider.models)
            .map(([id, info]: [string, any]) => `  • ${id} - ${info.name || id}`)
            .join("\n")
          modelList += `**${provider.name}**\n${models}\n\n`
        }

        const title = showAll ? "All Available Models" : "Connected Models"

        // If too long, send as file
        if (modelList.length > 1900) {
          const buffer = Buffer.from(modelList, "utf-8")
          await interaction.editReply({
            content: `📄 ${title}:`,
            files: [
              {
                attachment: buffer,
                name: "models.txt",
              },
            ],
          })
        } else {
          await interaction.editReply({
            embeds: [createInfoEmbed(title, modelList || "No models found")],
          })
        }
        break
      }

      case "current": {
        const model = session.model
        if (model) {
          await interaction.editReply({
            embeds: [createInfoEmbed("Current Model", `**${model.providerID}/${model.modelID}**`)],
          })
        } else {
          const configResult = await session.client.config.get()
          const serverDefault = configResult.data?.model || "not configured"
          await interaction.editReply({
            embeds: [
              createInfoEmbed(
                "Current Model",
                `No explicit model set. Using priority: Discord command > Project config > Global config > Server default (${serverDefault})`,
              ),
            ],
          })
        }
        break
      }

      case "switch": {
        const providerID = interaction.options.getString("provider", true)
        const modelID = interaction.options.getString("model", true)

        // Verify provider and model exist
        const result = await session.client.provider.list()

        if (result.error || !result.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to list providers")],
          })
          return
        }

        const provider = result.data.all.find((p: any) => p.id === providerID)
        if (!provider) {
          await interaction.editReply({
            embeds: [createErrorEmbed(`Provider "${providerID}" not found`)],
          })
          return
        }

        if (!provider.models[modelID]) {
          await interaction.editReply({
            embeds: [createErrorEmbed(`Model "${modelID}" not found for provider "${providerID}"`)],
          })
          return
        }

        // Update session model (local state)
        updateSessionModel(sessionKey, { providerID, modelID })

        await interaction.editReply({
          embeds: [createSuccessEmbed("Model Switched", `Active model set to: ${providerID}/${modelID}`)],
        })
        break
      }

      default:
        await interaction.editReply({
          embeds: [createErrorEmbed("Unknown subcommand")],
        })
    }
  } catch (error) {
    console.error("Model command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
  }
}
