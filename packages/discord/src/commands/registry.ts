import {
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type SlashCommandSubcommandsOnlyBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js"
import { askCommand, handleAskCommand } from "./ask.js"
import { sessionCommand, handleSessionCommand } from "./session.js"
import { agentCommand, handleAgentCommand } from "./agent.js"
import { modelCommand, handleModelCommand } from "./model.js"
import { mcpCommand, handleMcpCommand } from "./mcp.js"
import { connectCommand, handleConnectCommand } from "./connect.js"
import { statusCommand, handleStatusCommand } from "./status.js"
import { helpCommand, handleHelpCommand } from "./help.js"
import { stopCommand, handleStopCommand } from "./stop.js"
import { restartCommand, handleRestartCommand } from "./restart.js"
import { logCommand, handleLogCommand } from "./log.js"
import { listSessions } from "../utils/session.js"

export interface CommandDefinition {
  key: string
  builder: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder
  description: string
  handle: (interaction: ChatInputCommandInteraction) => Promise<void>
  autocomplete?: {
    [optionName: string]: (interaction: AutocompleteInteraction) => Promise<void>
  }
}

const commands: CommandDefinition[] = [
  {
    key: "ask",
    builder: askCommand,
    description: askCommand.description,
    handle: handleAskCommand,
  },
  {
    key: "session",
    builder: sessionCommand,
    description: sessionCommand.description,
    handle: handleSessionCommand,
    autocomplete: {
      id: async (interaction: AutocompleteInteraction) => {
        const userId = interaction.user.id
        const sessions = listSessions(userId)
        const focused = interaction.options.getFocused() as string

        const choices = sessions
          .filter((s) => s.sessionId.includes(focused))
          .slice(0, 25)
          .map((s) => ({
            name: s.sessionId.substring(0, 50),
            value: s.sessionId,
          }))

        await interaction.respond(choices.length > 0 ? choices : [{ name: "No sessions found", value: "" }])
      },
    },
  },
  {
    key: "agent",
    builder: agentCommand,
    description: agentCommand.description,
    handle: handleAgentCommand,
    autocomplete: {
      name: async (interaction: AutocompleteInteraction) => {
        const focused = interaction.options.getFocused() as string
        // TODO: Fetch actual agents from SDK when available
        const agents = [
          { name: "build", value: "build" },
          { name: "chat", value: "chat" },
          { name: "review", value: "review" },
        ]

        const choices = agents.filter((a) => a.name.includes(focused)).slice(0, 25)

        await interaction.respond(choices)
      },
    },
  },
  {
    key: "model",
    builder: modelCommand,
    description: modelCommand.description,
    handle: handleModelCommand,
  },
  {
    key: "mcp",
    builder: mcpCommand,
    description: mcpCommand.description,
    handle: handleMcpCommand,
    autocomplete: {
      name: async (interaction: AutocompleteInteraction) => {
        const focused = interaction.options.getFocused() as string
        // TODO: Fetch actual MCP servers from SDK when available
        const mcpServers = [
          { name: "filesystem", value: "filesystem" },
          { name: "github", value: "github" },
        ]

        const choices = mcpServers.filter((m) => m.name.includes(focused)).slice(0, 25)

        await interaction.respond(choices)
      },
    },
  },
  {
    key: "connect",
    builder: connectCommand,
    description: connectCommand.description,
    handle: handleConnectCommand,
  },
  {
    key: "status",
    builder: statusCommand,
    description: statusCommand.description,
    handle: handleStatusCommand,
  },
  {
    key: "help",
    builder: helpCommand,
    description: helpCommand.description,
    handle: handleHelpCommand,
  },
  {
    key: "stop",
    builder: stopCommand,
    description: stopCommand.description,
    handle: handleStopCommand,
  },
  {
    key: "restart",
    builder: restartCommand,
    description: restartCommand.description,
    handle: handleRestartCommand,
  },
  {
    key: "log",
    builder: logCommand,
    description: logCommand.description,
    handle: handleLogCommand,
  },
]

export function getAllCommands(): CommandDefinition[] {
  return commands
}

export function getCommandByKey(key: string): CommandDefinition | undefined {
  return commands.find((cmd) => cmd.key === key)
}

export function getCommandBuilders(): (
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder
)[] {
  const builders = commands.map((cmd) => cmd.builder)
  console.log(
    `[registry] getCommandBuilders returning ${builders.length} commands: ${builders.map((b) => b.name).join(", ")}`,
  )
  return builders
}

export { commands }
