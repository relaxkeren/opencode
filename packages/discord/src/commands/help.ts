import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { createInfoEmbed } from "../utils/discord.js"

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show available commands and usage help")

export async function handleHelpCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const helpText = `
**OpenCode Discord Bot - Commands**

**General:**
• "/ask <question>" - Quick question without creating a thread
• "/help" - Show this help message
• "/status" - Check opencode server and session status
• "/connect" - Connect AI provider (OAuth or instructions)

**Session Management:**
• "/session create [title]" - Create a new session
• "/session list" - List your active sessions
• "/session attach <id>" - Attach to an existing session
• "/session share" - Get shareable link to current session
• "/session unshare" - Revoke share link
• "/session rename <name>" - Rename current session
• "/session compact" - Summarize session to reduce context
• "/session undo" - Undo last message and revert changes
• "/session redo" - Redo previously undone message
• "/session export" - Export session as Markdown file
• "/session copy" - Copy session transcript
• "/session fork <message_id>" - Start new session from message

**Agent & Model:**
• "/agent list" - List available agents
• "/agent switch <name>" - Switch active agent
• "/model list" - List connected provider models
• "/model list --all" - List all available models
• "/model switch <provider> <model>" - Switch model

**MCP Tools:**
• "/mcp list" - List MCP integrations
• "/mcp toggle <name>" - Enable/disable MCP

**Tips:**
• Use DMs for private conversations
• In channels, the bot creates threads for organization
• You can upload files for the AI to analyze
• Sessions persist across Discord restarts (stored on server)
`

  await interaction.reply({
    embeds: [createInfoEmbed("Help", helpText)],
    ephemeral: true,
  })
}
